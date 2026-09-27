import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { createStarSky } from '../stars'
import { createFairyRig, createSkyDancerAnimation } from '../fairy'
import { createTerrain, seededRandom } from '../terrain'
import { createSunShading } from '../sun-shading'
import { daylightAt, morningSpin, skyColor, skyProfile } from '../daylight'
import type { World } from '../worlds'
import {
  EARTH, EARTHSHINE, GROUND_FOG, HOME_EXTENT, MOON_RADIUS, OPTIONS, SIDEREAL_SECONDS, SOLAR_ORBIT_SECONDS, SUN_RADIUS,
  earthPosition, eclipseAt, moonOffset, moonPhase, skyAt, tidalFrame,
} from './model'
import type { MoonOption, Orbit } from './model'

export type View = 'system' | 'meadow' | 'moon' | 'eclipse'
export type StudySettings = {
  option: MoonOption; view: View; speed: number; inclination: number
  zones: boolean; fogFree: boolean; earthshine: boolean; moonlight: boolean
}

// A copy of `data` in src/worlds.ts: name, radius, orbit, angle, colour.
const PLANETS = [['Mercury', 95, 1400, 0.28, 0xb7a58d], ['Venus', 170, 2250, 1.18, 0xd5a36d], ['Mars', 145, 4500, 2.12, 0xd7a087]] as const
const EARTH_SEED = 0x20260926, MOON_SEED = 0x3004
const SPACE = new THREE.Color(0x02030f)
const TAU = Math.PI * 2

function softDisc(color: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, color); gradient.addColorStop(0.18, color); gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Earth ground with the colours of buildGround() in src/worlds.ts, at a lower resolution. */
function earthGeometry(sample: ReturnType<typeof createTerrain>) {
  const geometry = new THREE.SphereGeometry(1, 256, 128)
  const position = geometry.attributes.position, colors = new Float32Array(position.count * 3)
  const direction = new THREE.Vector3(), color = new THREE.Color()
  const grass = new THREE.Color(0x679a43), sand = new THREE.Color(0xd5c395), stone = new THREE.Color(0x85817a), snow = new THREE.Color(0xdfe7e5)
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize()
    const s = sample(direction.x, direction.y, direction.z)
    position.setXYZ(i, direction.x * (EARTH.radius + s.height), direction.y * (EARTH.radius + s.height), direction.z * (EARTH.radius + s.height))
    color.copy(s.height < 0.7 ? sand : s.height > 8.5 ? stone : grass)
    if (Math.abs(direction.y) > 0.9 || s.height > 12) color.copy(snow)
    color.multiplyScalar(0.87 + s.detail * 0.22 + Math.max(0, s.height) * 0.014)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

/**
 * The Moon's ground. The near side is local +X, so the tidal lock turns it to Earth.
 * Dark maria sit mostly on the near side, as on the real Moon; Tycho has bright rays.
 */
function moonSurface() {
  const sample = createTerrain('mercury', MOON_SEED)
  const plains = createNoise3D(seededRandom(MOON_SEED + 1))
  const tycho = new THREE.Vector3(0.66, -0.6, 0.45).normalize()
  const east = new THREE.Vector3().crossVectors(tycho, new THREE.Vector3(0, 1, 0)).normalize()
  const north = new THREE.Vector3().crossVectors(east, tycho)
  const flat = new THREE.Vector3()
  function at(direction: THREE.Vector3) {
    const s = sample(direction.x, direction.y, direction.z)
    const mare = THREE.MathUtils.smoothstep(plains(direction.x * 1.7, direction.y * 1.7, direction.z * 1.7) * 0.6 + direction.x * 0.3 - 0.36, 0, 0.1)
    const height = THREE.MathUtils.lerp(s.height * 0.3, -1.1 + s.detail * 0.1, mare * 0.85)
    const angle = direction.angleTo(tycho)
    flat.copy(direction).addScaledVector(tycho, -direction.dot(tycho))
    const ray = THREE.MathUtils.smoothstep(Math.cos(Math.atan2(flat.dot(north), flat.dot(east)) * 11 + s.detail * 2), 0.9, 1) * Math.max(0, 1 - angle / 0.95)
    return { height, mare, detail: s.detail, crater: angle < 0.06, ray }
  }
  function geometry(width: number, heightSegments: number) {
    const shape = new THREE.SphereGeometry(1, width, heightSegments)
    const position = shape.attributes.position, colors = new Float32Array(position.count * 3)
    const direction = new THREE.Vector3(), color = new THREE.Color()
    const highland = new THREE.Color(0xbdb8ae), maria = new THREE.Color(0x7c7d82), bright = new THREE.Color(0xf1eee6)
    for (let i = 0; i < position.count; i++) {
      direction.fromBufferAttribute(position, i).normalize()
      const point = at(direction), radius = MOON_RADIUS + point.height
      position.setXYZ(i, direction.x * radius, direction.y * radius, direction.z * radius)
      color.copy(highland).lerp(maria, point.mare).multiplyScalar(0.88 + point.detail * 0.16)
      if (point.crater) color.copy(bright)
      else color.lerp(bright, point.ray * 0.3)
      colors.set([color.r, color.g, color.b], i * 3)
    }
    shape.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    shape.computeVertexNormals()
    return shape
  }
  return { at, geometry }
}

export function createMoonScene(host: HTMLElement, labelHost: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of Earth and the Moon. Drag or use the arrow keys to turn. Scroll or use plus and minus to zoom.')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = SPACE.clone()
  const fog = new THREE.FogExp2(0x83c5e8, 0)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(58, 1, 0.2, 60000)

  // The game lights: a hemisphere light, the Sun as a point light, and a lilac night fill.
  const ambient = new THREE.HemisphereLight(0xd9efff, 0x65794e, 1.1)
  const nightFill = new THREE.DirectionalLight(0xc0b6f5, 0)
  scene.add(ambient, nightFill, nightFill.target)
  const stars = createStarSky(scene)

  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 64, 40), new THREE.MeshBasicMaterial({ color: 0xffd78d }))
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('rgba(255,185,90,1)'), color: 0xffbf70, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.setScalar(2450)
  sun.add(glow, new THREE.PointLight(0xffebcc, 2.4, 0, 0))
  scene.add(sun)

  const planets = PLANETS.map(([name, radius, orbit, angle, color]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshStandardMaterial({ color, roughness: 1 }))
    mesh.name = name
    scene.add(mesh)
    return { mesh, orbit, angle }
  })

  // Earth turns about +Y, as world.group.rotation.y does in the game.
  const earthSample = createTerrain('earth', EARTH_SEED)
  const earth = new THREE.Group()
  earth.name = 'Earth'
  earth.add(
    new THREE.Mesh(earthGeometry(earthSample), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 })),
    new THREE.Mesh(new THREE.SphereGeometry(EARTH.radius, 128, 64), new THREE.MeshStandardMaterial({ color: 0x208dad, roughness: 0.32, metalness: 0.12 })),
  )
  scene.add(earth)
  // The air seen from the ground: a flat veil of sky colour, not the game's atmosphere shader.
  const veil = new THREE.Mesh(new THREE.SphereGeometry(EARTH.radius + EARTH.atmosphere, 64, 32), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false, fog: false }))
  scene.add(veil)

  // A meadow on the equator, in mid-morning light at time 0, as at the game start.
  const meadow = new THREE.Vector3(1, 0, 0)
  for (let i = 0; i < 720; i++) {
    const angle = i / 720 * TAU, s = earthSample(Math.cos(angle), 0, Math.sin(angle))
    if (s.height > 1.5 && s.height < 5 && s.river < 0.1) { meadow.set(Math.cos(angle), 0, Math.sin(angle)); break }
  }
  const meadowGround = EARTH.radius + Math.max(0, earthSample(meadow.x, meadow.y, meadow.z).height)
  const start = earthPosition(0)
  const spinStart = morningSpin(meadow, new THREE.Vector3(start.x, start.y, start.z), new THREE.Vector3())
  const earthSpin = (time: number) => spinStart + time / EARTH.spin * TAU

  // The Moon: the proposed look for a World moon. Earthshine scales the hemisphere light on it.
  const surface = moonSurface()
  const earthshine = { value: 1 }
  const moonMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 })
  moonMaterial.onBeforeCompile = shader => {
    shader.uniforms.earthshine = earthshine
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float earthshine;')
      .replace('#include <lights_fragment_end>', '#if defined( RE_IndirectDiffuse )\n\tirradiance *= earthshine;\n#endif\n#include <lights_fragment_end>')
  }
  moonMaterial.customProgramCacheKey = () => 'moon-earthshine'
  const moonMeshes = new Map<MoonOption, THREE.Mesh>()
  for (const option of Object.keys(OPTIONS) as MoonOption[]) {
    const mesh = new THREE.Mesh(surface.geometry(...OPTIONS[option].segments), moonMaterial)
    mesh.name = 'Moon'
    mesh.visible = false
    moonMeshes.set(option, mesh)
  }
  const moon = new THREE.Group()
  moon.add(...moonMeshes.values())
  scene.add(moon)

  // Earth-centred helpers that do not spin: the Moon's path and the relocation zones.
  const centre = new THREE.Group()
  scene.add(centre)
  const pathMaterial = new THREE.LineBasicMaterial({ color: 0xcfd6e6, transparent: true, opacity: 0.45, depthWrite: false, fog: false })
  const path = new THREE.LineLoop(new THREE.BufferGeometry(), pathMaterial)
  centre.add(path)
  const zoneMaterial = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, fog: false })
  const zoneToday = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), zoneMaterial(0xf3acd1))
  const zoneNeeded = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), zoneMaterial(0xefc88a))
  const zones = new THREE.Group()
  zones.add(zoneToday, zoneNeeded)
  centre.add(zones)

  // The fairy on the Moon, where Earth stands low above the horizon.
  const rig = createFairyRig({ withTrail: false })
  const animation = createSkyDancerAnimation(rig)
  const fairy = rig.root
  fairy.add(new THREE.PointLight(0xffca8c, 0.6, 7, 2))
  scene.add(fairy)
  const fairySpot = new THREE.Vector3(Math.cos(1.25), 0, Math.sin(1.25))
  const fairyHeight = MOON_RADIUS + surface.at(fairySpot).height + 3

  // The game's own planet shadow, so eclipses look as they would in the game.
  const sunShading = createSunShading(new THREE.Vector3())
  const stub = (kind: World['kind'], radius: number, group: THREE.Object3D) => ({ kind, radius, gas: false, group }) as unknown as World
  const earthOccluder = stub('earth', EARTH.radius, earth), moonOccluder = stub('earth', MOON_RADIUS, moon)
  const planetOccluders = planets.map(({ mesh }) => stub('mercury', (mesh.geometry as THREE.SphereGeometry).parameters.radius, mesh))
  sunShading.track(scene)

  type Label = { element: HTMLSpanElement; target: THREE.Object3D; lift: number; show: () => boolean }
  const labels: Label[] = []
  let settings: StudySettings | null = null
  function label(text: string, target: THREE.Object3D, lift: number, show: () => boolean, kind = '') {
    const element = document.createElement('span')
    element.className = `moon-label ${kind}`
    element.textContent = text
    labelHost.append(element)
    labels.push({ element, target, lift, show })
  }
  const space = () => settings?.view !== 'meadow'
  label('Earth', earth, 1.25, () => settings?.view === 'system' || settings?.view === 'eclipse')
  label('Moon', moon, 1.5, () => !!settings && (settings.view === 'meadow' || OPTIONS[settings.option].world), 'moon')
  label('Sun', sun, 1.15, space)
  for (const { mesh } of planets) label(mesh.name, mesh, 1.3, () => settings?.view === 'system')
  label('You', fairy, 1.6, () => settings?.view === 'moon', 'you')

  // Camera: each view orbits a pivot, except the meadow, where the person looks around.
  const orbit = { yaw: 0, pitch: 0, distance: 1 }
  const limits: Record<View, [number, number]> = { system: [700, 16000], meadow: [1, 1], moon: [4, 200], eclipse: [300, 6000] }
  function resetView(view: View) {
    const radius = settings ? OPTIONS[settings.option].orbit : 1000
    orbit.yaw = view === 'system' ? 0.5 : 0
    orbit.pitch = { system: 0.78, meadow: 0, moon: 0.2, eclipse: 0.18 }[view]
    orbit.distance = { system: radius * 3.4, meadow: 1, moon: 10, eclipse: radius * 1.9 }[view]
  }

  const pointers = new Map<number, { x: number; y: number }>()
  let pinch = 0
  const canvas = renderer.domElement
  canvas.addEventListener('pointerdown', event => { canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }) })
  canvas.addEventListener('pointermove', event => {
    const last = pointers.get(event.pointerId)
    if (!last) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch) zoom(pinch / distance)
      pinch = distance
      return
    }
    orbit.yaw -= (event.clientX - last.x) * 0.005
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (event.clientY - last.y) * 0.005, -1.4, 1.45)
  })
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); if (pointers.size < 2) pinch = 0 }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  function zoom(factor: number) {
    if (!settings) return
    const [min, max] = limits[settings.view]
    orbit.distance = THREE.MathUtils.clamp(orbit.distance * factor, min, max)
  }
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(event.deltaY * 0.001)) }, { passive: false })
  canvas.addEventListener('keydown', event => {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => { orbit.yaw += 0.08 }, ArrowRight: () => { orbit.yaw -= 0.08 },
      ArrowUp: () => { orbit.pitch = Math.min(1.45, orbit.pitch + 0.06) }, ArrowDown: () => { orbit.pitch = Math.max(-1.4, orbit.pitch - 0.06) },
      '+': () => zoom(1 / 1.15), '=': () => zoom(1 / 1.15), '-': () => zoom(1.15),
    }
    if (moves[event.key]) { event.preventDefault(); moves[event.key]() }
  })

  let currentOrbit: Orbit = { radius: 1000, inclination: 0 }
  function apply(next: StudySettings) {
    const viewChanged = settings?.view !== next.view || settings?.option !== next.option
    settings = { ...next }
    const data = OPTIONS[next.option]
    currentOrbit = { radius: data.orbit, inclination: next.inclination }
    moonMeshes.forEach((mesh, option) => { mesh.visible = option === next.option })
    const points = Array.from({ length: 256 }, (_, i) => {
      const p = moonOffset(i / 256 * SIDEREAL_SECONDS, currentOrbit)
      return new THREE.Vector3(p.x, p.y, p.z)
    })
    path.geometry.dispose()
    path.geometry = new THREE.BufferGeometry().setFromPoints(points)
    zoneToday.scale.setScalar(EARTH.radius + EARTH.atmosphere + HOME_EXTENT + 250)
    zoneNeeded.scale.setScalar(data.orbit + MOON_RADIUS + HOME_EXTENT + 250)
    earthshine.value = next.earthshine ? EARTHSHINE : 1
    if (moonMaterial.fog === next.fogFree) { moonMaterial.fog = !next.fogFree; moonMaterial.needsUpdate = true }
    if (viewChanged) resetView(next.view)
  }

  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  const profile = skyProfile({ kind: 'earth', sky: new THREE.Color(0x83c5e8) })
  const skyTint = new THREE.Color(), moonlightColor = new THREE.Color(0xdfe4f7), fillColor = new THREE.Color(0xc0b6f5)
  let time = 0, previous = performance.now(), frame = 0
  let measured = { calls: 0, triangles: 0 }, moonElevation = 0, sunElevation = 0
  const up = new THREE.Vector3(0, 1, 0), pivot = new THREE.Vector3(), offset = new THREE.Vector3(), look = new THREE.Vector3()
  const back = new THREE.Vector3(), side = new THREE.Vector3(), heading = new THREE.Vector3(), localUp = new THREE.Vector3()
  const basis = new THREE.Matrix4(), origin = new THREE.Vector3(), projected = new THREE.Vector3(), toEarth = new THREE.Vector3()
  const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3()

  function place(now: number) {
    const e = earthPosition(now)
    earth.position.set(e.x, e.y, e.z)
    earth.rotation.y = earthSpin(now)
    centre.position.copy(earth.position)
    veil.position.copy(earth.position)
    const m = moonOffset(now, currentOrbit)
    moon.position.set(e.x + m.x, e.y + m.y, e.z + m.z)
    // Tidal lock: local +X always faces Earth, local +Y is the orbit normal.
    const frameNow = tidalFrame(now, currentOrbit)
    x.set(frameNow.toEarth.x, frameNow.toEarth.y, frameNow.toEarth.z)
    y.set(frameNow.normal.x, frameNow.normal.y, frameNow.normal.z)
    z.crossVectors(x, y)
    moon.quaternion.setFromRotationMatrix(basis.makeBasis(x, y, z))
    for (const planet of planets) {
      const angle = planet.angle + now / SOLAR_ORBIT_SECONDS * TAU
      planet.mesh.position.set(Math.cos(angle) * planet.orbit, 0, Math.sin(angle) * planet.orbit)
    }
    scene.updateMatrixWorld()
  }

  function render(nowMs: number) {
    frame = requestAnimationFrame(render)
    const delta = Math.min((nowMs - previous) / 1000, 0.1); previous = nowMs
    if (document.hidden || !settings) return
    time = THREE.MathUtils.euclideanModulo(time + delta * settings.speed, SOLAR_ORBIT_SECONDS)
    place(time)
    const data = OPTIONS[settings.option]
    const meadowView = settings.view === 'meadow'
    // Option A is a picture in Earth's sky: it shows from the ground only and casts no shadow.
    moon.visible = data.world || meadowView
    const occluders = [earthOccluder, ...planetOccluders]
    if (data.world) occluders.push(moonOccluder)
    sunShading.update(occluders)
    const sky = skyAt(time, currentOrbit, meadow, earthSpin(time))
    moonElevation = sky.moon; sunElevation = sky.sun

    // Fairy on the Moon, facing Earth.
    localUp.copy(fairySpot).applyQuaternion(moon.quaternion)
    fairy.position.copy(moon.position).addScaledVector(localUp, fairyHeight)
    toEarth.copy(earth.position).sub(fairy.position)
    heading.copy(toEarth).addScaledVector(localUp, -toEarth.dot(localUp)).normalize()
    basis.lookAt(origin, heading, localUp)
    fairy.quaternion.setFromRotationMatrix(basis)
    fairy.visible = settings.view === 'moon' && data.world
    animation.update(delta, false)

    // Light and sky: the rules of updateEnvironment() in src/main.ts.
    const light = daylightAt(meadowView ? sunElevation : 90)
    const density = meadowView ? 1 : 0
    skyColor(profile, light, skyTint)
    ;(scene.background as THREE.Color).copy(SPACE).lerp(skyTint, density * 0.78)
    fog.color.copy(skyTint)
    fog.density = GROUND_FOG * density
    veil.visible = meadowView
    ;(veil.material as THREE.MeshBasicMaterial).color.copy(skyTint)
    stars.update(camera.position, 1 - density * (1 - light.stars * profile.starClarity), renderer.getPixelRatio())
    ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
    const phase = moonPhase(time, currentOrbit)
    const moonUp = THREE.MathUtils.smoothstep(moonElevation, -4, 8)
    // Proposal: the night fill comes from the Moon and follows its phase; new-moon nights keep a floor.
    const moonlight = settings.moonlight ? (0.45 + 0.55 * phase.illuminated * moonUp) : 1
    nightFill.intensity = 0.45 * light.night * density * moonlight
    nightFill.color.copy(settings.moonlight ? moonlightColor : fillColor)
    nightFill.target.position.set(sky.ground.x, sky.ground.y, sky.ground.z)
    if (settings.moonlight && moonUp > 0) nightFill.position.copy(moon.position)
    else nightFill.position.set(sky.ground.x + sky.up.x * 300 + 60, sky.ground.y + sky.up.y * 300 + 90, sky.ground.z + sky.up.z * 300 + 40)

    const view = settings.view
    camera.up.copy(up)
    if (view === 'meadow') {
      // Stand in the meadow and look toward the Moon; drag to look around.
      localUp.set(sky.up.x, sky.up.y, sky.up.z)
      camera.position.copy(earth.position).addScaledVector(localUp, meadowGround + 7)
      ambient.position.copy(localUp)
      toEarth.copy(moon.position).sub(camera.position)
      heading.copy(toEarth).addScaledVector(localUp, -toEarth.dot(localUp))
      if (heading.lengthSq() < 1) heading.set(1, 0, 0).addScaledVector(localUp, -localUp.x)
      heading.normalize().applyAxisAngle(localUp, orbit.yaw)
      const pitch = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(THREE.MathUtils.clamp(moonElevation, 6, 50)) + orbit.pitch, -0.3, 1.45)
      look.copy(camera.position).addScaledVector(heading, Math.cos(pitch) * 100).addScaledVector(localUp, Math.sin(pitch) * 100)
      camera.up.copy(localUp)
      camera.lookAt(look)
    } else {
      ambient.position.set(0, 1, 0)
      if (view === 'system') {
        // From the sunlit side, so that the day sides of Earth and the Moon show.
        pivot.copy(earth.position)
        back.copy(earth.position).negate().normalize().applyAxisAngle(up, 0.8)
        side.set(-back.z, 0, back.x)
      } else if (view === 'moon') {
        pivot.copy(fairy.position)
        back.copy(heading).negate()
        side.crossVectors(localUp, back).normalize()
        camera.up.copy(localUp)
      } else {
        // Eclipse view: a solar eclipse is on Earth's day side; a lunar eclipse is at the Moon.
        const next = eclipseAt(time, currentOrbit)
        const lunar = next?.type === 'lunar' || (!next && moonPhase(time, currentOrbit).elongation > 90 && moonPhase(time, currentOrbit).elongation < 270)
        pivot.copy(lunar ? moon.position : earth.position)
        back.copy(earth.position).negate().normalize()
        back.applyAxisAngle(up, lunar ? 1.2 : 0.9)
        side.set(-back.z, 0, back.x)
        if (lunar && orbit.distance > 900) orbit.distance = 420
      }
      const cameraUp = view === 'moon' ? localUp : up
      offset.copy(back).multiplyScalar(Math.cos(orbit.yaw)).addScaledVector(side, Math.sin(orbit.yaw))
        .multiplyScalar(Math.cos(orbit.pitch)).addScaledVector(cameraUp, Math.sin(orbit.pitch)).multiplyScalar(orbit.distance)
      camera.position.copy(pivot).add(offset)
      look.copy(pivot)
      if (view === 'moon') look.addScaledVector(heading, 20).addScaledVector(localUp, -3)
      camera.lookAt(look)
    }

    const width = canvas.clientWidth, height = canvas.clientHeight
    for (const item of labels) {
      item.target.getWorldPosition(projected)
      const radius = item.target === earth ? EARTH.radius : item.target === moon ? MOON_RADIUS : item.target === sun ? SUN_RADIUS
        : item.target === fairy ? 1 : (item.target as THREE.Mesh).geometry?.boundingSphere?.radius ?? 100
      projected.addScaledVector(camera.up, radius * item.lift)
      const distance = projected.distanceTo(camera.position)
      projected.project(camera)
      const visible = item.show() && item.target.visible && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && distance > 2
        && !(meadowView && item.target === moon && moonElevation < -1)
      item.element.hidden = !visible
      if (visible) item.element.style.transform = `translate(${(projected.x + 1) / 2 * width}px, ${(1 - projected.y) / 2 * height}px)`
    }
    zones.visible = settings.zones && view === 'system' && data.world
    path.visible = (view === 'system' || view === 'eclipse') && data.world
    sunShading.track(scene)
    renderer.render(scene, camera)
    measured = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }
  }
  frame = requestAnimationFrame(render)

  return {
    canvas, apply,
    resetView: () => settings && resetView(settings.view),
    get time() { return time },
    setTime(next: number) { time = THREE.MathUtils.euclideanModulo(next, SOLAR_ORBIT_SECONDS) },
    /** Values in this preview, for the smoke test and the panels. */
    get stats() {
      const current = OPTIONS[settings?.option ?? 'far']
      return {
        time: +time.toFixed(1),
        moonVisible: moon.visible,
        moonOccluder: current.world,
        moonFog: moonMaterial.fog,
        earthshine: earthshine.value,
        moonElevation: +moonElevation.toFixed(1),
        sunElevation: +sunElevation.toFixed(1),
        eclipse: eclipseAt(time, currentOrbit)?.type ?? null,
        phase: moonPhase(time, currentOrbit).name,
        orbitRadius: +moon.position.distanceTo(earth.position).toFixed(1),
        ...measured,
      }
    },
    dispose() {
      cancelAnimationFrame(frame); observer.disconnect()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose()
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
        }
      })
      renderer.dispose(); canvas.remove()
    },
  }
}
