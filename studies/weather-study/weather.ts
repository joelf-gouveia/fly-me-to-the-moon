import * as THREE from 'three'
import { createFields } from '../../src/foliage/zones'
import { foliageWind } from '../../src/foliage/build'
import { createSeasonAir } from '../../src/season-air'
import type { Fall } from '../../src/seasons'
import type { Lab } from '../feature-ideas-study/lab'
import { createClouds } from './clouds'
import { createWeatherModel, groundAfter, kindOf, latitudeOf, placeAt, rainbow } from './model'
import type { Place, Weather } from './model'

/**
 * The prototype of the weather of Earth (docs/weather-study.md). One small texture, the weather
 * map, holds the cloud, the rain, the snow and the wet ground of each place. The clouds, the
 * ground, the water and the plants read it in their shaders. The rain, the fog, the light, the
 * wind and the stars read the weather at the camera.
 *
 * It changes the Earth of the lab only: the game has no weather.
 */
const TAU = Math.PI * 2
const MAP = { width: 128, height: 64 }

/** A weather that a clip puts over a place. Its edge is soft. */
export type Stamp = { at: THREE.Vector3; radius: number; cover: number; rain: number; storm?: number; mist?: number }
export type CloudLook = 'new' | 'puffs'
/** map: the weather map. one: one sky for the whole planet. off: the game of today. */
export type Mode = 'map' | 'one' | 'off'

const COMMON = /* glsl */`
uniform sampler2D weatherMap; uniform float weatherOn;
vec2 weatherUv(vec3 d) { return vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5); }`

type Change = { key: string; vertex: string; fragment: string; roughness?: string }
/** Adds a weather change to a built-in material. It keeps each shader change that the material has. */
function patch(material: THREE.Material, uniforms: Record<string, THREE.IUniform>, change: Change) {
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON}\nvarying vec3 vWeatherDir;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${change.vertex}`)
    // The change goes before the roughness, so it comes after the colours of the season.
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}\nvarying vec3 vWeatherDir;`)
      .replace('#include <roughnessmap_fragment>', `vec4 weather = texture2D(weatherMap, weatherUv(normalize(vWeatherDir)));\n${change.fragment}\n#include <roughnessmap_fragment>\n${change.roughness ?? ''}`)
  }
  material.customProgramCacheKey = () => `${previousKey}|weather-${change.key}`
  material.needsUpdate = true
}

const DECK_VERTEX = /* glsl */`
varying vec3 vDir; varying vec3 vWorld;
void main() {
  vDir = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`
const DECK_FRAGMENT = /* glsl */`
${COMMON}
uniform float time; uniform vec3 sunPosition; uniform vec3 centre; uniform vec3 haze; uniform vec4 flash;
varying vec3 vDir; varying vec3 vWorld;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main() {
  vec3 d = normalize(vDir);
  vec4 weather = texture2D(weatherMap, weatherUv(d));
  vec3 p = d * 22.0 + vec3(time * 0.03, 0.0, time * 0.02);
  float detail = noise(p) * 0.55 + noise(p * 2.1) * 0.3 + noise(p * 4.3) * 0.15;
  // Large lumps break the edge of a front. A thick cloud stays closed.
  float lumps = noise(d * 6.5 + vec3(0.0, time * 0.008, 0.0)) * 0.6 + noise(d * 13.0 - vec3(time * 0.012, 0.0, 0.0)) * 0.4;
  float cover = smoothstep(0.45, 0.82, weather.r + ((detail - 0.5) * 0.5 + (lumps - 0.5) * 0.7) * (1.0 - 0.55 * weather.r)) * weatherOn;
  float day = smoothstep(-0.1, 0.24, dot(normalize(vWorld - centre), normalize(sunPosition - centre)));
  vec3 colour; float alpha;
  if (gl_FrontFacing) {
    // From above and from space: white in the Sun, dark at night.
    colour = mix(vec3(0.035, 0.045, 0.08), vec3(0.97, 0.98, 1.0), day) * (0.84 + detail * 0.2);
    alpha = cover * 0.95;
  } else {
    // From below: a rain cloud is thick and grey. Far away it goes into the haze of the air.
    colour = mix(vec3(0.74, 0.78, 0.83), vec3(0.25, 0.28, 0.34), smoothstep(0.05, 0.75, weather.g + (weather.r - 0.75) * 0.8)) * (0.86 + detail * 0.22);
    colour *= mix(0.1, 1.0, day);
    colour = mix(colour, haze, (1.0 - exp(-length(vWorld - cameraPosition) * 0.0045)) * 0.62);
    alpha = cover * 0.93;
  }
  colour += vec3(0.62, 0.66, 0.95) * flash.w * smoothstep(0.984, 1.0, dot(d, flash.xyz)) * (0.25 + detail * detail * 1.6);
  gl_FragColor = vec4(colour, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

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

function softDot(inner: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(inner, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export type WeatherKit = ReturnType<typeof createWeatherKit>

export function createWeatherKit(lab: Lab) {
  const world = lab.earth, sun = lab.sun.group.position
  const model = createWeatherModel(world.seed)
  const fields = createFields(world.seed)
  /**
   * `fall`: the leaves or the petals of the season, for a clip. `bowScale` 0 hides the rainbow.
   * `clouds`: the new clouds of clouds.ts, or the puffs of the game with a size from the map.
   */
  const state = { mode: 'map' as Mode, time: 0, year: 0, stamps: [] as Stamp[], fall: null as Fall | null, bowScale: 1, clouds: 'new' as CloudLook }

  // ---- The weather map ---------------------------------------------------------------------------
  const count = MAP.width * MAP.height
  const places: Place[] = [], longitudes = new Float32Array(count)
  for (let row = 0; row < MAP.height; row++) for (let column = 0; column < MAP.width; column++) {
    const longitude = ((column + 0.5) / MAP.width - 0.5) * TAU, latitude = ((row + 0.5) / MAP.height - 0.5) * Math.PI
    const x = Math.cos(latitude) * Math.cos(longitude), y = Math.sin(latitude), z = Math.cos(latitude) * Math.sin(longitude)
    const sample = world.sample(x, y, z)
    longitudes[places.length] = longitude
    places.push({ x, y, z, height: sample.height, moist: fields.moist(x, y, z), river: sample.river })
  }
  const data = new Uint8Array(count * 4), ground = new Float32Array(count)
  const texture = new THREE.DataTexture(data, MAP.width, MAP.height, THREE.RGBAFormat)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.wrapS = THREE.RepeatWrapping
  const uniforms = { weatherMap: { value: texture }, weatherOn: { value: 1 } }

  const sunLocal = new THREE.Vector3(), inverse = new THREE.Quaternion(), local = new THREE.Vector3()
  /** The direction of a world position in the frame of Earth. */
  function localOf(position: THREE.Vector3, out = new THREE.Vector3()) {
    return out.copy(position).sub(world.group.position).applyQuaternion(inverse.copy(world.group.quaternion).invert()).normalize()
  }
  /** The local hour of a longitude: noon is where the Sun is. */
  function hourAt(longitude: number) {
    const sunLongitude = Math.atan2(sunLocal.z, sunLocal.x)
    return ((12 + (sunLongitude - longitude) / TAU * 24) % 24 + 24) % 24
  }
  function placeOf(direction: THREE.Vector3): Place {
    const sample = world.sample(direction.x, direction.y, direction.z)
    return { x: direction.x, y: direction.y, z: direction.z, height: sample.height, moist: fields.moist(direction.x, direction.y, direction.z), river: sample.river }
  }
  /** The weather of the model with the stamps of the clip over it. */
  function stamped(place: Place, weather: Weather): Weather {
    if (!state.stamps.length) return weather
    let { cover, rain, storm, mist } = weather
    for (const stamp of state.stamps) {
      const angle = Math.acos(THREE.MathUtils.clamp(place.x * stamp.at.x + place.y * stamp.at.y + place.z * stamp.at.z, -1, 1))
      const part = 1 - THREE.MathUtils.smoothstep(angle, stamp.radius * 0.55, stamp.radius)
      if (part <= 0) continue
      cover = THREE.MathUtils.lerp(cover, stamp.cover, part); rain = THREE.MathUtils.lerp(rain, stamp.rain, part)
      storm = THREE.MathUtils.lerp(storm, stamp.storm ?? 0, part)
      if (stamp.mist !== undefined) mist = THREE.MathUtils.lerp(mist, stamp.mist, part)
    }
    const wind = weather.wind + (cover - weather.cover) * 0.45 + (rain - weather.rain) * 0.9
    return { ...weather, cover, rain, storm, mist, wind, kind: kindOf({ cover, rain, storm, mist, snow: weather.snow }) }
  }
  /** With one sky, each place has the cloud and the rain of one fixed place: a leaf forest at 30° N. */
  const ONE = placeAt(30, 20)
  let one: Weather | null = null
  /** The weather of a place from the model. With one sky, the place gives only the warmth: rain or snow. */
  function modelAt(place: Place, hour: number): Weather {
    const weather = model.at(place, { year: state.year, hour, time: state.time })
    if (state.mode !== 'one') return weather
    one ??= model.at(ONE, { year: state.year, hour: 12, time: state.time })
    return { ...weather, cover: one.cover, rain: one.rain, storm: one.storm, mist: 0, wind: one.wind, kind: kindOf({ ...one, snow: weather.snow, mist: 0 }) }
  }
  /** The weather of a place now. */
  function weatherAt(direction: THREE.Vector3): Weather {
    const place = placeOf(direction)
    return stamped(place, modelAt(place, hourAt(Math.atan2(direction.z, direction.x))))
  }
  /**
   * Calculates the map. `delta` is the time for the wet ground, in seconds of the game. With
   * `slices` more than 1, each call calculates one part of the map, and the parts take turns.
   */
  let slice = 0
  function updateMap(delta: number, slices = 1) {
    localOf(sun, sunLocal)
    one = null
    slice = (slice + 1) % slices
    delta *= slices
    for (let i = slice; i < count; i += slices) {
      const place = places[i]
      const weather = stamped(place, modelAt(place, hourAt(longitudes[i])))
      ground[i] = groundAfter(ground[i], weather.rain, weather.snow, delta)
      data[i * 4] = weather.cover * 255; data[i * 4 + 1] = weather.rain * 255; data[i * 4 + 2] = weather.snow * 255; data[i * 4 + 3] = ground[i] * 255
    }
    texture.needsUpdate = true
  }

  // ---- The clouds ---------------------------------------------------------------------------------
  const haze = new THREE.Color(0xbfd0de), flash = new THREE.Vector4(0, 1, 0, 0)
  const deckMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: DECK_VERTEX, fragmentShader: DECK_FRAGMENT,
    uniforms: { ...uniforms, time: { value: 0 }, sunPosition: { value: sun }, centre: { value: world.group.position }, haze: { value: haze }, flash: { value: flash } },
  })
  const deck = new THREE.Mesh(new THREE.SphereGeometry(world.radius + world.cloudHeight + 4, 128, 80), deckMaterial)
  deck.name = 'weather-deck'
  // After the stars, the air and the Sun, and before the other clear things.
  deck.renderOrder = -0.5
  world.group.add(deck)
  // A puff of the game shows only where the map has cloud.
  const puffs = world.clouds.children.find(child => child instanceof THREE.InstancedMesh) as THREE.InstancedMesh | undefined
  if (puffs) patch(puffs.material as THREE.Material, uniforms, {
    key: 'puff',
    vertex: /* glsl */`vWeatherDir = normalize(instanceMatrix[3].xyz);
      transformed *= mix(1.0, smoothstep(0.12, 0.6, texture2D(weatherMap, weatherUv(vWeatherDir)).r) * 1.3, weatherOn);`,
    fragment: '',
  })
  const clouds = createClouds(world, uniforms, sun)

  // ---- The ground, the water and the plants -------------------------------------------------------
  const groundMesh = world.surface.children[0] as THREE.Mesh, waterMesh = world.surface.children[1] as THREE.Mesh
  patch(groundMesh.material as THREE.Material, uniforms, {
    key: 'ground',
    vertex: 'vWeatherDir = normalize(position);',
    // A shadow under the cloud. Wet ground is darker. Fresh snow is white.
    fragment: /* glsl */`{
      float on = weatherOn, snowy = weather.b;
      diffuseColor.rgb *= 1.0 - on * weather.r * 0.34;
      diffuseColor.rgb *= 1.0 - on * weather.a * (1.0 - snowy) * 0.3;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.93) * (1.0 - weather.r * 0.2), on * smoothstep(0.15, 0.8, weather.a) * snowy * 0.92);
    }`,
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.4, weatherOn * weather.a * (1.0 - weather.b) * 0.7);',
  })
  patch(waterMesh.material as THREE.Material, uniforms, {
    key: 'water',
    vertex: 'vWeatherDir = normalize(position);',
    fragment: 'diffuseColor.rgb *= 1.0 - weatherOn * weather.r * 0.3;',
    // Rain breaks the mirror of the water.
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.8, weatherOn * weather.g);',
  })
  const plantMaterials = new Set<THREE.Material>()
  for (const child of world.surface.children) if (child instanceof THREE.InstancedMesh && child.name.startsWith('foliage-')) plantMaterials.add(child.material as THREE.Material)
  for (const material of plantMaterials) patch(material, uniforms, {
    key: 'plant',
    vertex: /* glsl */`
      #ifdef USE_INSTANCING
        vWeatherDir = normalize(instanceMatrix[3].xyz);
      #else
        vWeatherDir = normalize(position);
      #endif`,
    fragment: /* glsl */`diffuseColor.rgb *= 1.0 - weatherOn * weather.r * 0.3;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.93), weatherOn * smoothstep(0.3, 0.9, weather.a) * weather.b * 0.45);`,
  })

  // ---- The rain, the snow, the leaves and the petals ----------------------------------------------
  const DROPS = 2600, HALF = 22
  const dropSeeds = Array.from({ length: DROPS }, () => new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(HALF * 2))
  const dropPositions = new Float32Array(DROPS * 6)
  const rainGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3))
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0xd6e2ee, transparent: true, opacity: 0, depthWrite: false })
  const rainLines = new THREE.LineSegments(rainGeometry, rainMaterial)
  rainLines.name = 'weather-rain'
  rainLines.frustumCulled = false
  rainLines.visible = false
  world.group.add(rainLines)
  const airPoints = createSeasonAir(world, 900)
  const eye = new THREE.Vector3(), down = new THREE.Vector3(), side = new THREE.Vector3(), fall = new THREE.Vector3(), point = new THREE.Vector3()
  const wrap = (value: number, centre: number) => centre + ((((value - centre + HALF) % (HALF * 2)) + HALF * 2) % (HALF * 2)) - HALF
  let rainShown = 0
  function updateRain(time: number, delta: number, amount: number, wind: number) {
    rainShown = snap ? amount : THREE.MathUtils.lerp(rainShown, amount, 1 - Math.exp(-Math.max(delta, 0.016) * 3))
    rainMaterial.opacity = Math.min(0.5, rainShown * 0.55)
    rainLines.visible = rainShown > 0.02
    if (!rainLines.visible) return
    eye.copy(lab.camera.position).sub(world.group.position).applyQuaternion(inverse.copy(world.group.quaternion).invert())
    down.copy(eye).normalize().negate()
    if (side.set(down.z, 0, -down.x).lengthSq() < 0.01) side.set(1, 0, 0)
    side.normalize()
    // The wind leans the rain.
    fall.copy(down).addScaledVector(side, Math.min(0.5, (wind - 0.75) * 0.2)).normalize()
    // A light rain has fewer drops.
    const shown = Math.round(DROPS * THREE.MathUtils.clamp(0.25 + rainShown * 0.9, 0, 1))
    rainGeometry.setDrawRange(0, shown * 2)
    for (let i = 0; i < shown; i++) {
      point.copy(dropSeeds[i]).addScaledVector(fall, time * (19 + (i % 5) * 1.6))
      point.set(wrap(point.x, eye.x), wrap(point.y, eye.y), wrap(point.z, eye.z))
      if (point.distanceToSquared(eye) < 9) point.addScaledVector(down, -1000)
      const length = 0.75 + (i % 3) * 0.2
      dropPositions[i * 6] = point.x; dropPositions[i * 6 + 1] = point.y; dropPositions[i * 6 + 2] = point.z
      dropPositions[i * 6 + 3] = point.x - fall.x * length; dropPositions[i * 6 + 4] = point.y - fall.y * length; dropPositions[i * 6 + 5] = point.z - fall.z * length
    }
    rainGeometry.attributes.position.needsUpdate = true
  }

  // ---- The mist -------------------------------------------------------------------------------------
  const MIST = 150
  const mistPositions = new Float32Array(MIST * 3)
  const mistGeometry = new THREE.BufferGeometry()
  mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))
  const mistMaterial = new THREE.PointsMaterial({ size: 30, map: softDot(0.35), transparent: true, opacity: 0, depthWrite: false, fog: false, color: 0xe6edf2 })
  const mistPoints = new THREE.Points(mistGeometry, mistMaterial)
  mistPoints.name = 'weather-mist'
  mistPoints.frustumCulled = false
  mistPoints.visible = false
  world.group.add(mistPoints)
  const mistCentre = new THREE.Vector3(0, 0, 0)
  /** Puts the mist on the low ground around a place. The discs do not move. */
  function placeMist(centre: THREE.Vector3) {
    if (mistCentre.distanceToSquared(centre) < 0.0004) return
    mistCentre.copy(centre)
    const random = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v) }
    const east = new THREE.Vector3(0, 1, 0).cross(centre).normalize(), north = new THREE.Vector3().crossVectors(centre, east)
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

  // ---- The rainbow ----------------------------------------------------------------------------------
  const BOW = { distance: 60, spread: Math.tan(58 * Math.PI / 180) }
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
  lab.scene.add(bow)
  const away = new THREE.Vector3(), up = new THREE.Vector3(), ahead = new THREE.Vector3()
  let bowShown = 0

  // ---- The fog, the light and the stars ---------------------------------------------------------------
  const ambient = lab.scene.children.find(child => child instanceof THREE.HemisphereLight) as THREE.HemisphereLight
  const sunlight = lab.sun.group.children.find(child => child instanceof THREE.PointLight) as THREE.PointLight
  const sunBase = sunlight.intensity
  const clearSky = world.sky.clone(), greySky = new THREE.Color(0x9fb0c0), grey = new THREE.Color(), white = new THREE.Color(0xe9eef2)
  const fog = lab.scene.fog as THREE.FogExp2
  /** The weather at the camera, with slow changes: a cloud edge does not make the light jump. */
  const here = { cover: 0, rain: 0, snow: 0, storm: 0, mist: 0, wind: 1, sunshine: 1 }
  let current: Weather | null = null, bolt = 0
  /** The next frame takes the weather at the camera with no slow change: the first frame of a clip, or a cut. */
  let snap = true, snapBow = true
  const cameraLocal = new THREE.Vector3(), towardSun = new THREE.Vector3(), stormAt = new THREE.Vector3(), ring = new THREE.Vector3()

  /**
   * Called on each frame of a clip, before the lab sets the sky. `clock` moves the rain and the snow.
   * `weatherTime` is the time of the fronts, and `groundDelta` is the time for the wet ground: a
   * clip can run them faster than the clock. `slices` is for the live view: a part of the map on each frame.
   */
  function update(clock: number, delta: number, year: number, weatherTime: number, groundDelta = delta, slices = 1) {
    state.year = year; state.time = weatherTime
    const on = state.mode === 'off' ? 0 : 1
    uniforms.weatherOn.value = on
    deck.visible = on > 0
    updateMap(groundDelta, slices)
    deckMaterial.uniforms.time.value = weatherTime
    // The new clouds take the place of the puffs. The game of today keeps its puffs.
    const fresh = on > 0 && state.clouds === 'new'
    clouds.update(weatherTime, fresh)
    if (puffs) puffs.visible = !fresh
    localOf(lab.camera.position, cameraLocal)
    const weather = weatherAt(cameraLocal)
    current = weather
    const altitude = lab.camera.position.distanceTo(world.group.position) - world.radius
    const air = lab.nearest === world ? 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08) : 0
    const below = air * on * (1 - THREE.MathUtils.smoothstep(altitude, world.cloudHeight - 6, world.cloudHeight + 6))
    const ease = snap ? 1 : 1 - Math.exp(-Math.max(delta, 0.016) * 2.5)
    towardSun.copy(sunLocal).addScaledVector(cameraLocal, -sunLocal.dot(cameraLocal)).normalize()
    // The Sun comes through where the sky toward it is clear.
    local.copy(cameraLocal).addScaledVector(towardSun, 0.12).normalize()
    const sunshine = 1 - weatherAt(local).cover * 0.85
    here.cover = THREE.MathUtils.lerp(here.cover, weather.cover * below, ease)
    here.rain = THREE.MathUtils.lerp(here.rain, weather.rain * below, ease)
    // Thunder is far away: the strongest storm on a ring around the camera, about 120 m away.
    let storm = 0
    for (let i = 0; i < 8; i++) {
      ring.copy(towardSun).applyAxisAngle(cameraLocal, i / 8 * TAU).multiplyScalar(0.45).add(cameraLocal).normalize()
      const there = weatherAt(ring).storm
      if (there > storm) { storm = there; stormAt.copy(ring) }
    }
    here.storm = THREE.MathUtils.lerp(here.storm, storm * air * on, ease)
    here.mist = THREE.MathUtils.lerp(here.mist, weather.mist * below, ease)
    here.wind = THREE.MathUtils.lerp(here.wind, on ? weather.wind : 1, ease)
    here.sunshine = THREE.MathUtils.lerp(here.sunshine, THREE.MathUtils.lerp(1, sunshine, below), ease)
    here.snow = weather.snow
    // The sky of Earth is one colour for the air shell and for the fog: it goes grey under a cloud.
    world.sky.copy(clearSky).lerp(greySky, here.cover * 0.8)
    foliageWind.value.y = here.wind
    // Rain or snow from the cloud. A clip can add the leaves or the petals of the season.
    const snowing = here.rain * here.snow, raining = here.rain * (1 - here.snow)
    updateRain(clock, delta, raining, here.wind)
    let kind: Fall | null = state.fall, amount = state.fall ? Math.min(1, 0.45 + here.wind * 0.25) : 0
    if (snowing > 0.04) { kind = 'snow'; amount = Math.min(1, snowing * 1.6) }
    else if (raining > 0.3) amount *= 0.4
    airPoints.update(clock, snap ? 10 : delta, lab.camera.position, on ? kind : null, amount)
    placeMist(cameraLocal)
    // Thunder: a short glow in the cloud far away, two times in each 5 seconds.
    const beat = clock % 5
    bolt = here.storm > 0.05 ? Math.max(0, Math.exp(-(((beat - 1.2) / 0.07) ** 2)), 0.7 * Math.exp(-(((beat - 1.42) / 0.05) ** 2)), 0.85 * Math.exp(-(((beat - 3.6) / 0.08) ** 2))) * Math.min(1, here.storm * 2) : 0
    flash.set(stormAt.x, stormAt.y, stormAt.z, bolt * 0.34)
    snap = false
  }

  /** Called by the renderer after the lab sets the fog and the light of the frame. */
  function afterEnvironment() {
    if (state.mode === 'off') { sunlight.intensity = sunBase; mistPoints.visible = false; bow.visible = false; return }
    const day = lab.light.day
    grey.copy(greySky).multiplyScalar(0.12 + 0.88 * day)
    const veil = Math.min(1, here.rain * 0.5 + here.mist * 0.85)
    fog.color.lerp(grey, here.cover * 0.5).lerp(white.clone().multiplyScalar(0.2 + 0.8 * day), here.mist * 0.7)
    fog.density += here.rain * (0.004 + here.snow * 0.006) + here.mist * 0.03
    ;(lab.scene.background as THREE.Color).lerp(fog.color, Math.min(1, here.cover * 0.75 + veil * 0.6))
    haze.copy(fog.color)
    sunlight.intensity = sunBase * (1 - 0.72 * (1 - here.sunshine)) * (1 - here.mist * 0.35)
    ambient.intensity *= 1 - here.cover * 0.16
    ambient.intensity += bolt * 0.12
    mistMaterial.opacity = here.mist * 0.42 * (0.25 + 0.75 * day)
    mistMaterial.color.copy(white).multiplyScalar(0.25 + 0.75 * day)
    mistPoints.visible = here.mist > 0.02
    lab.stars.update(lab.camera.position, lab.skyVisibility * (1 - here.cover * 0.92), lab.renderer.getPixelRatio())
    // The rainbow: a circle of 42° around the point opposite to the Sun, in the rain in front of the eye.
    away.copy(lab.camera.position).sub(sun).normalize()
    up.copy(lab.camera.position).sub(world.group.position).normalize()
    ahead.copy(away).addScaledVector(up, -away.dot(up)).normalize()
    // The rain in front of the eye: the most of three places, to 120 m.
    let rainAhead = here.rain
    for (const metres of [40, 80, 120]) rainAhead = Math.max(rainAhead, weatherAt(localOf(local.copy(lab.camera.position).addScaledVector(ahead, metres), point)).rain)
    const strength = rainbow(lab.light.elevation, rainAhead * (1 - here.snow), THREE.MathUtils.smoothstep(here.sunshine, 0.35, 0.9)) * state.bowScale
    bowShown = snapBow ? strength : THREE.MathUtils.lerp(bowShown, strength, 0.08)
    snapBow = false
    bow.visible = bowShown > 0.01
    bowMaterial.uniforms.strength.value = bowShown * 0.52
    bow.position.copy(lab.camera.position).addScaledVector(away, BOW.distance)
    bow.up.copy(up)
    bow.lookAt(lab.camera.position)
  }
  lab.scene.onBeforeRender = afterEnvironment

  return {
    model, state, here, deck, clouds,
    update, weatherAt, localOf, placeOf,
    /** The weather at the camera on the last frame. */
    get current() { return current },
    get bow() { return bowShown },
    /** The local hour of a place of Earth now. */
    hourOf(direction: THREE.Vector3) { localOf(sun, sunLocal); return hourAt(Math.atan2(direction.z, direction.x)) },
    /** Dries the ground of the whole planet. */
    dry() { ground.fill(0) },
    /** The next frame takes the weather at the camera with no slow change: the first frame of a clip, or a cut. */
    cut() { snap = snapBow = true },
    latitude: () => latitudeOf(cameraLocal),
  }
}
