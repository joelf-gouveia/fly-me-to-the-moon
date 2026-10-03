import * as THREE from 'three'
import type { World } from './worlds'
import type { Daylight } from './daylight'
import { rainbow } from './weather'
import type { Weather } from './weather'

/**
 * The weather near the fairy on Earth (docs/weather-study.md): the rain, the mist, the rainbow, and
 * the weather at the camera for the fog, the light, the wind and the stars. The clouds, the ground,
 * the water and the plants read the weather map in their shaders (src/weather.ts).
 */
const TAU = Math.PI * 2
/** The half size of the box of the rain around the camera, in metres. */
const HALF = 22
/** The rainbow is a square at this distance from the camera. Its half width is 58° of the view. */
const BOW = { distance: 60, spread: Math.tan(58 * Math.PI / 180) }

const BOW_FRAGMENT = /* glsl */`
uniform float strength; uniform float spread;
varying vec2 vUv;
void main() {
  // The angle from the point opposite to the Sun, in degrees.
  float angle = degrees(atan(length(vUv - 0.5) * 2.0 * spread));
  float band = (angle - 40.2) / 2.2;
  vec3 colour = clamp(abs(mod(mix(0.78, 0.0, band) * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  float primary = smoothstep(0.0, 0.25, band) * (1.0 - smoothstep(0.75, 1.0, band));
  // The second bow is faint, and its colours go the other way.
  float outer = (angle - 50.0) / 3.2;
  vec3 second = clamp(abs(mod(mix(0.0, 0.78, outer) * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  float secondary = smoothstep(0.0, 0.3, outer) * (1.0 - smoothstep(0.7, 1.0, outer)) * 0.16;
  // The sky inside the bow is a little brighter.
  float inside = (1.0 - smoothstep(30.0, 40.2, angle)) * 0.05;
  gl_FragColor = vec4((colour * primary + second * secondary + inside) * strength, 1.0);
}`

function softDot() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export type WeatherAir = ReturnType<typeof createWeatherAir>

/** `world` is Earth, with `world.weather`. A phone gets half the rain lines. */
export function createWeatherAir(scene: THREE.Scene, world: World, sun: THREE.Vector3, mobile = false) {
  const clearSky = world.sky.clone(), greySky = new THREE.Color(0x9fb0c0), grey = new THREE.Color(), white = new THREE.Color(0xe9eef2), mistTint = new THREE.Color()
  /** The weather at the camera, with slow changes: a cloud edge does not make the light jump. */
  const here = { cover: 0, rain: 0, snow: 0, storm: 0, mist: 0, wind: 1, sunshine: 1, bolt: 0 }
  let current: Weather | null = null, rainAhead = 0
  const sunLocal = new THREE.Vector3(), cameraLocal = new THREE.Vector3(), inverse = new THREE.Quaternion()
  const towardSun = new THREE.Vector3(), ring = new THREE.Vector3(), stormAt = new THREE.Vector3(), local = new THREE.Vector3(), point = new THREE.Vector3()
  const localOf = (position: THREE.Vector3, out: THREE.Vector3) => out.copy(position).sub(world.group.position).applyQuaternion(inverse.copy(world.group.quaternion).invert()).normalize()

  // ---- The rain: short lines in a box around the camera, in the frame of the world ----------------
  const drops = mobile ? 1300 : 2600
  const seeds = Array.from({ length: drops }, () => new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(HALF * 2))
  const dropPositions = new Float32Array(drops * 6)
  const rainGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3))
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0xd6e2ee, transparent: true, opacity: 0, depthWrite: false })
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial)
  rain.name = 'weather-rain'
  rain.frustumCulled = false
  rain.visible = false
  // The group of the world stays when the land is made again, so the rain stays too.
  world.group.add(rain)
  const eye = new THREE.Vector3(), down = new THREE.Vector3(), side = new THREE.Vector3(), fall = new THREE.Vector3()
  const wrap = (value: number, centre: number) => centre + ((((value - centre + HALF) % (HALF * 2)) + HALF * 2) % (HALF * 2)) - HALF
  let rainShown = 0
  function updateRain(time: number, delta: number, camera: THREE.Vector3, amount: number) {
    rainShown = THREE.MathUtils.lerp(rainShown, amount, 1 - Math.exp(-Math.max(delta, 0.016) * 3))
    rainMaterial.opacity = Math.min(0.5, rainShown * 0.55)
    rain.visible = rainShown > 0.02
    if (!rain.visible) return
    eye.copy(camera).sub(world.group.position).applyQuaternion(inverse.copy(world.group.quaternion).invert())
    down.copy(eye).normalize().negate()
    if (side.set(down.z, 0, -down.x).lengthSq() < 0.01) side.set(1, 0, 0)
    side.normalize()
    // The wind leans the rain.
    fall.copy(down).addScaledVector(side, Math.min(0.5, (here.wind - 0.75) * 0.2)).normalize()
    // A light rain has fewer drops.
    const shown = Math.round(drops * THREE.MathUtils.clamp(0.25 + rainShown * 0.9, 0, 1))
    rainGeometry.setDrawRange(0, shown * 2)
    for (let i = 0; i < shown; i++) {
      point.copy(seeds[i]).addScaledVector(fall, time * (19 + (i % 5) * 1.6))
      point.set(wrap(point.x, eye.x), wrap(point.y, eye.y), wrap(point.z, eye.z))
      if (point.distanceToSquared(eye) < 9) point.addScaledVector(down, -1000)
      const length = 0.75 + (i % 3) * 0.2
      dropPositions[i * 6] = point.x; dropPositions[i * 6 + 1] = point.y; dropPositions[i * 6 + 2] = point.z
      dropPositions[i * 6 + 3] = point.x - fall.x * length; dropPositions[i * 6 + 4] = point.y - fall.y * length; dropPositions[i * 6 + 5] = point.z - fall.z * length
    }
    rainGeometry.attributes.position.needsUpdate = true
  }

  // ---- The mist: soft discs on the low ground near the camera -------------------------------------
  const MIST = mobile ? 80 : 150
  const mistPositions = new Float32Array(MIST * 3)
  const mistGeometry = new THREE.BufferGeometry()
  mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))
  const mistMaterial = new THREE.PointsMaterial({ size: 30, map: softDot(), transparent: true, opacity: 0, depthWrite: false, fog: false, color: 0xe6edf2 })
  const mist = new THREE.Points(mistGeometry, mistMaterial)
  mist.name = 'weather-mist'
  mist.frustumCulled = false
  mist.visible = false
  world.group.add(mist)
  const mistCentre = new THREE.Vector3()
  let mistSeed = -1
  /** Puts the mist on the low ground around a place. The discs do not move. */
  function placeMist(centre: THREE.Vector3) {
    if (mistSeed === world.seed && mistCentre.distanceToSquared(centre) < 0.01) return
    mistCentre.copy(centre); mistSeed = world.seed
    const random = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v) }
    const east = new THREE.Vector3(0, 1, 0).cross(centre)
    if (east.lengthSq() < 0.0001) east.set(1, 0, 0)
    east.normalize()
    const north = new THREE.Vector3().crossVectors(centre, east)
    let placed = 0
    for (let i = 0; placed < MIST && i < MIST * 12; i++) {
      const angle = random(i, 1) * TAU, distance = 14 + Math.sqrt(random(i, 2)) * 110
      point.copy(centre).addScaledVector(east, Math.cos(angle) * distance / world.radius).addScaledVector(north, Math.sin(angle) * distance / world.radius).normalize()
      const sample = world.sample(point.x, point.y, point.z)
      // Mist lies on the low ground and on the water.
      if (sample.height > 1.8 && i < MIST * 9) continue
      point.multiplyScalar(world.radius + Math.max(0, sample.height) + 1 + random(i, 3) * 2.6)
      mistPositions.set([point.x, point.y, point.z], placed++ * 3)
    }
    mistGeometry.setDrawRange(0, placed)
    mistGeometry.attributes.position.needsUpdate = true
  }

  // ---- The rainbow -----------------------------------------------------------------------------------
  const bowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fragmentShader: BOW_FRAGMENT,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    uniforms: { strength: { value: 0 }, spread: { value: BOW.spread } },
  })
  const bow = new THREE.Mesh(new THREE.PlaneGeometry(2 * BOW.distance * BOW.spread, 2 * BOW.distance * BOW.spread), bowMaterial)
  bow.name = 'weather-rainbow'
  bow.frustumCulled = false
  bow.renderOrder = 4
  bow.visible = false
  scene.add(bow)
  const away = new THREE.Vector3(), up = new THREE.Vector3(), ahead = new THREE.Vector3()
  let bowShown = 0

  return {
    here, rain, mist, bow,
    /** The weather at the camera on the last frame, or null away from Earth. */
    get current() { return current },
    get bowShown() { return bowShown },
    get rainShown() { return rainShown },
    /**
     * Called on each frame, before the sky colour of the frame. It calculates a part of the weather
     * map, reads the weather at the camera and moves the rain. `time` is the clock of the fronts.
     * `near`: Earth is the world of the fairy. Reduced motion gives `still`: the rain does not move
     * and the thunder does not flash.
     */
    update(time: number, delta: number, year: number, camera: THREE.Vector3, near: boolean, still: boolean) {
      const map = world.weather
      if (!map) return here
      localOf(sun, sunLocal)
      map.update(year, sunLocal, time, delta)
      if (world.weatherSky) world.weatherSky.time.value = still ? 0 : time
      localOf(camera, cameraLocal)
      const altitude = camera.distanceTo(world.group.position) - world.radius
      const air = near ? 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08) : 0
      const below = air * (1 - THREE.MathUtils.smoothstep(altitude, world.cloudHeight - 6, world.cloudHeight + 6))
      const ease = 1 - Math.exp(-Math.max(delta, 0.016) * 2.5)
      const lerp = THREE.MathUtils.lerp
      if (air <= 0) {
        // Away from the air of Earth: no weather at the camera.
        current = null
        here.cover = lerp(here.cover, 0, ease); here.rain = lerp(here.rain, 0, ease); here.mist = lerp(here.mist, 0, ease)
        here.storm = lerp(here.storm, 0, ease); here.wind = lerp(here.wind, 1, ease); here.sunshine = lerp(here.sunshine, 1, ease)
        here.bolt = 0; rainAhead = 0
      } else {
        const weather = current = map.weatherAt(cameraLocal)
        towardSun.copy(sunLocal).addScaledVector(cameraLocal, -sunLocal.dot(cameraLocal)).normalize()
        // The Sun comes through where the sky toward it is clear.
        const sunshine = 1 - map.weatherAt(local.copy(cameraLocal).addScaledVector(towardSun, 0.12).normalize()).cover * 0.85
        // Thunder is far away: the strongest storm on a ring around the camera, about 120 m away.
        let storm = 0
        for (let i = 0; i < 8; i++) {
          ring.copy(towardSun).applyAxisAngle(cameraLocal, i / 8 * TAU).multiplyScalar(0.45).add(cameraLocal).normalize()
          const there = map.weatherAt(ring).storm
          if (there > storm) { storm = there; stormAt.copy(ring) }
        }
        // The rain in front of the eye, away from the Sun: the most of three places, to 120 m. For the rainbow.
        rainAhead = weather.rain
        for (const metres of [40, 80, 120]) rainAhead = Math.max(rainAhead, map.weatherAt(local.copy(cameraLocal).addScaledVector(towardSun, -metres / world.radius).normalize()).rain)
        here.cover = lerp(here.cover, weather.cover * below, ease)
        here.rain = lerp(here.rain, weather.rain * below, ease)
        here.storm = lerp(here.storm, storm * air, ease)
        here.mist = lerp(here.mist, weather.mist * below, ease)
        here.wind = lerp(here.wind, weather.wind, ease)
        here.sunshine = lerp(here.sunshine, lerp(1, sunshine, below), ease)
        here.snow = weather.snow
        // Thunder: a short glow in the cloud far away, three times in each 5 seconds.
        const beat = time % 5
        here.bolt = here.storm > 0.05 && !still
          ? Math.max(Math.exp(-(((beat - 1.2) / 0.07) ** 2)), 0.7 * Math.exp(-(((beat - 1.42) / 0.05) ** 2)), 0.85 * Math.exp(-(((beat - 3.6) / 0.08) ** 2))) * Math.min(1, here.storm * 2) : 0
      }
      world.weatherSky?.flash.set(stormAt.x, stormAt.y, stormAt.z, here.bolt * 0.34)
      // The sky of Earth is one colour for the air shell and for the fog: it goes grey under a cloud.
      world.sky.copy(clearSky).lerp(greySky, here.cover * 0.8)
      updateRain(still ? 0 : time, delta, camera, here.rain * (1 - here.snow))
      if (here.mist > 0.02) placeMist(cameraLocal)
      return here
    },
    /** Called after the frame has its fog and its light: the weather changes them. Returns the part of the stars that shows. */
    apply(fog: THREE.FogExp2, background: THREE.Color, ambient: THREE.HemisphereLight, sunlight: THREE.PointLight, sunBase: number, light: Daylight, camera: THREE.Vector3) {
      const day = light.day
      grey.copy(greySky).multiplyScalar(0.12 + 0.88 * day)
      mistTint.copy(white).multiplyScalar(0.2 + 0.8 * day)
      fog.color.lerp(grey, here.cover * 0.5).lerp(mistTint, here.mist * 0.7)
      fog.density += here.rain * (0.004 + here.snow * 0.006) + here.mist * 0.03
      background.lerp(fog.color, Math.min(1, here.cover * 0.75 + Math.min(1, here.rain * 0.5 + here.mist * 0.85) * 0.6))
      world.weatherSky?.haze.copy(fog.color)
      sunlight.intensity = sunBase * (1 - 0.72 * (1 - here.sunshine)) * (1 - here.mist * 0.35)
      ambient.intensity = ambient.intensity * (1 - here.cover * 0.16) + here.bolt * 0.12
      mistMaterial.opacity = here.mist * 0.42 * (0.25 + 0.75 * day)
      mistMaterial.color.copy(white).multiplyScalar(0.25 + 0.75 * day)
      mist.visible = here.mist > 0.02
      // The rainbow: a circle of 42° around the point opposite to the Sun, in the rain in front of the eye.
      const strength = rainbow(light.elevation, rainAhead * (1 - here.snow), THREE.MathUtils.smoothstep(here.sunshine, 0.35, 0.9))
      bowShown = THREE.MathUtils.lerp(bowShown, strength, 0.08)
      bow.visible = bowShown > 0.01
      if (bow.visible) {
        bowMaterial.uniforms.strength.value = bowShown * 0.52
        away.copy(camera).sub(sun).normalize()
        up.copy(camera).sub(world.group.position).normalize()
        ahead.copy(camera).addScaledVector(away, BOW.distance)
        bow.position.copy(ahead)
        bow.up.copy(up)
        bow.lookAt(camera)
      }
      return 1 - here.cover * 0.92
    },
  }
}
