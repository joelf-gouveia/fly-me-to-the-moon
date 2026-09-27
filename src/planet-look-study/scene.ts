import * as THREE from 'three'
import { createWorlds } from '../worlds'
import type { World } from '../worlds'
import { createStarSky } from '../stars'
import { createSunShading } from '../sun-shading'
import { createFairyRig, createSkyDancerAnimation } from '../fairy'
import { daylightAt, skyColor, skyProfile, solarElevation } from '../daylight'
import type { SkyProfile } from '../daylight'
import { BAKE_SIZE, haloFarAt, puffsVisibleAt, RING_SPAN, spaceLightAt, URANUS_RING_SPAN } from '../planet-look'
import { bakePlanetMap, ringGeometry, ringTexture, updatePlanetLooks, withSpaceLight } from '../planet-paint'
import { inGame, PLANETS } from './model'
import type { LookOption, PlanetId, View } from './model'
import { retuneDeckTexture } from './paint'
import { buildBefore } from './legacy'

export type StudySettings = { planet: PlanetId; option: LookOption; view: View; split: boolean; spin: boolean }

type Layer = {
  root: THREE.Group
  clouds: THREE.Object3D | null
  /** The cloud puffs of before show from space too. */
  cloudsFromSpace: boolean
  profile: SkyProfile
  tilt: number
  light: THREE.IUniform<number>
  haloFar: THREE.IUniform<number>
  bakeMs: number
  textureBytes: number
  update?: (altitude: number) => void
}

const SPACE = new THREE.Color(0x02030f)
const TAU = Math.PI * 2
const up = new THREE.Vector3(0, 1, 0)
const mapBytes = (width: number, height: number) => width * height * 4 * 4 / 3

/** Fairy height above the ground in the flight view: above the cloud puffs on the giants, under the clouds of Venus. */
function flightAltitude(id: PlanetId) {
  const planet = PLANETS[id]
  if (planet.gas) return inGame(id).cloudHeight + 16
  return id === 'venus' ? 30 : id === 'mars' ? 34 : 18
}

export function createPlanetScene(host: HTMLElement, onLayer: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // The game renderer: src/main.ts.
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of a planet. Drag or use the arrow keys to turn. Scroll or use plus and minus to zoom.')
  host.prepend(renderer.domElement)
  const canvas = renderer.domElement

  const scene = new THREE.Scene()
  scene.background = SPACE.clone()
  const fog = new THREE.FogExp2(0x83c5e8, 0)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 80000)
  const ambient = new THREE.HemisphereLight(0xd9efff, 0x65794e, 1.1)
  scene.add(ambient)
  const stars = createStarSky(scene)

  // The planets of the game, built by the game code with the painted maps. They are option B.
  const buildStarted = performance.now()
  const worlds = createWorlds(scene, false, renderer)
  const gameBuildMs = performance.now() - buildStarted
  const sun = worlds.find(world => world.kind === 'sun')!
  const sunlight = new THREE.PointLight(0xffebcc, 2.4, 0, 0)
  // The game Sun has its own glare and corona (src/sun-paint.ts), so it needs no glow sprite.
  sun.group.add(sunlight)
  const sunShading = createSunShading(sun.group.position)
  const worldOf = (id: PlanetId) => worlds.find(world => world.kind === id)!

  /** Parts of the game look that are direct children of the planet group: the air shell and the rings. */
  const gameParts = new Map<PlanetId, THREE.Object3D[]>()
  for (const id of Object.keys(PLANETS) as PlanetId[]) {
    const world = worldOf(id)
    gameParts.set(id, world.group.children.filter(child => child !== world.surface && child !== world.clouds))
  }
  const gameProfiles = new Map(worlds.map(world => [world.kind, skyProfile(world)]))
  const gameAir = (id: PlanetId) => gameParts.get(id)!.find(part => part instanceof THREE.Mesh && part.material instanceof THREE.ShaderMaterial) as THREE.Mesh | undefined

  // Build time of option B: one more bake of each painted map, as the game does at the start and on each visit.
  const paintMs = new Map<PlanetId, number>()
  function measurePaint(id: PlanetId) {
    if (paintMs.has(id)) return
    if (!PLANETS[id].gas && id !== 'venus') { paintMs.set(id, 0); return }
    const { texture, milliseconds } = bakePlanetMap(renderer, id, ...BAKE_SIZE.desktop, worldOf(id).seed)
    texture.dispose()
    paintMs.set(id, milliseconds)
  }

  const rig = createFairyRig({ withTrail: false })
  const fairy = rig.root
  const animation = createSkyDancerAnimation(rig)
  const fairyLight = new THREE.PointLight(0xffca8c, 0.6, 7, 2)
  fairyLight.position.set(0, 1.5, 0.8)
  fairy.add(fairyLight)
  scene.add(fairy)

  const photoLoader = new THREE.TextureLoader()
  const loadPhoto = async (file: string) => {
    const texture = await photoLoader.loadAsync(`/planets/ssc/${file}`)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    return texture
  }

  const layers = new Map<string, Layer | 'loading'>()

  /** The look of before, from src/planet-look-study/legacy.ts: no tilt, full light, flakes, thick air. */
  function buildBeforeLayer(id: PlanetId): Layer {
    const world = worldOf(id), started = performance.now()
    const root = buildBefore(world, gameAir(id))
    root.visible = false
    world.group.add(root)
    return {
      root, clouds: null, cloudsFromSpace: true, profile: skyProfile({ kind: id, sky: new THREE.Color(world.color) }),
      tilt: 0, light: { value: 1 }, haloFar: { value: 0 }, bakeMs: performance.now() - started,
      textureBytes: PLANETS[id].gas ? mapBytes(512, 256) : 0,
    }
  }

  /** Builds option A or C on one planet. It is added to the planet group and hidden until chosen. */
  async function buildLayer(id: PlanetId, option: 'retune' | 'photo'): Promise<Layer> {
    const world = worldOf(id), planet = PLANETS[id], palette = planet.retune
    const started = performance.now()
    const root = new THREE.Group()
    root.name = `${id}-${option}`
    root.visible = false
    const light = { value: 1 }
    const haloFar = { value: 0 }
    let textureBytes = 0
    const lit = (material: THREE.MeshStandardMaterial) => withSpaceLight(material, light, `${id}-${option}`)

    // The ground or the gas deck.
    if (planet.gas) {
      const map = option === 'retune' ? retuneDeckTexture(id, world.seed) : await loadPhoto(planet.map)
      textureBytes += option === 'retune' ? mapBytes(512, 256) : mapBytes(2048, 1024)
      root.add(new THREE.Mesh(new THREE.SphereGeometry(world.radius - 12, 128, 80), lit(new THREE.MeshStandardMaterial({ map, roughness: 1 }))))
    } else {
      // The game ground already has the rounder relief of Mercury and Mars; the options change only its colour.
      const game = world.surface.children[0] as THREE.Mesh
      const geometry = game.geometry.clone()
      const position = geometry.attributes.position, colors = geometry.attributes.color as THREE.BufferAttribute
      const direction = new THREE.Vector3(), color = new THREE.Color(), zone = new THREE.Color(palette.zone)
      let map: THREE.Texture | null = null
      if (option === 'photo' && id !== 'venus') { map = await loadPhoto(planet.map); textureBytes += mapBytes(2048, 1024) }
      if (id !== 'venus' || option === 'retune') {
        for (let i = 0; i < position.count; i++) {
          direction.fromBufferAttribute(position, i).normalize()
          const sample = world.sample(direction.x, direction.y, direction.z)
          // Photo maps: the map gives the colour; the vertex colour keeps the relief detail.
          if (map) color.setScalar(0.9 + sample.detail * 0.2 + sample.height * 0.02)
          else color.copy(id === 'venus' ? new THREE.Color(palette.belt) : zone).multiplyScalar(1 - palette.contrast / 2 + sample.detail * palette.contrast + sample.height * 0.025)
          colors.setXYZ(i, color.r, color.g, color.b)
        }
      }
      root.add(new THREE.Mesh(geometry, lit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, map }))))
    }

    // The air: the game shell with this option's own uniforms.
    const air = gameAir(id)
    if (air) {
      const material = (air.material as THREE.ShaderMaterial).clone()
      material.uniforms.haloFar = haloFar
      material.uniforms.tint.value = new THREE.Color(palette.sky)
      material.uniforms.sunPosition.value = sun.group.position
      material.uniforms.center.value = world.group.position
      const mesh = new THREE.Mesh(air.geometry, material)
      mesh.renderOrder = air.renderOrder
      root.add(mesh)
    }

    // Cloud puffs: the same places as in the game, in the new cloud colour.
    let clouds: THREE.Object3D | null = null
    const puffs = world.clouds.getObjectByName('cloud-puffs') as THREE.InstancedMesh | undefined
    if (puffs) {
      const material = lit(new THREE.MeshStandardMaterial({ color: palette.cloud, roughness: 1, transparent: true, opacity: id === 'venus' ? 0.8 : id === 'mars' ? 0.25 : 0.5, depthWrite: false }))
      const mesh = new THREE.InstancedMesh(puffs.geometry, material, puffs.count)
      mesh.instanceMatrix.array.set(puffs.instanceMatrix.array)
      clouds = mesh
      root.add(mesh)
    }

    let update: Layer['update']
    // Venus: a closed cloud deck. Option A gives it one flat colour; C uses the photo map.
    if (id === 'venus') {
      const map = option === 'retune' ? null : await loadPhoto(planet.map)
      if (map) textureBytes += mapBytes(2048, 1024)
      const deckHeight = world.cloudHeight * 1.2
      const material = lit(new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : palette.cloud, roughness: 1, transparent: true, side: THREE.DoubleSide, emissiveMap: map, emissive: 0x000000 }))
      root.add(new THREE.Mesh(new THREE.SphereGeometry(world.radius + deckHeight, 128, 80), material))
      update = altitude => {
        const above = altitude - deckHeight
        material.opacity = above > world.cloudHeight * 0.35 ? 1 : above > -world.cloudHeight * 0.17 ? 0.3 : 0.88
        material.depthWrite = material.opacity > 0.99
        if (map) material.emissive.setScalar(above < -world.cloudHeight * 0.17 ? 0.35 : 0)
        else material.emissive.setHex(above < -world.cloudHeight * 0.17 ? palette.cloud : 0).multiplyScalar(0.35)
      }
    }

    // Rings: in the equator plane (local XZ), so they tilt with the planet.
    if (id === 'saturn') {
      if (option === 'retune') {
        for (let i = 0; i < 5; i++) {
          const geometry = new THREE.RingGeometry(world.radius * (1.3 + i * 0.15), world.radius * (1.42 + i * 0.15), 128).rotateX(-Math.PI / 2)
          root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: i % 2 ? 0x9b896d : 0xdacaa2, roughness: 0.9, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })))
        }
      } else {
        const map = await loadPhoto('2k_saturn_ring_alpha.png')
        root.add(new THREE.Mesh(ringGeometry(world.radius * RING_SPAN.inner, world.radius * RING_SPAN.outer), new THREE.MeshStandardMaterial({ map, roughness: 0.85, transparent: true, side: THREE.DoubleSide, depthWrite: false, emissive: 0x262626, emissiveMap: map })))
      }
    }
    if (id === 'uranus' && option === 'photo') {
      root.add(new THREE.Mesh(ringGeometry(world.radius * URANUS_RING_SPAN.inner, world.radius * URANUS_RING_SPAN.outer), new THREE.MeshStandardMaterial({ map: ringTexture('uranus'), roughness: 0.9, transparent: true, side: THREE.DoubleSide, depthWrite: false, emissive: 0x1a2426 })))
    }

    world.group.add(root)
    const profile = skyProfile({ kind: id, sky: new THREE.Color(palette.sky) })
    return {
      root, clouds, cloudsFromSpace: false, profile, light, haloFar, update,
      tilt: THREE.MathUtils.degToRad(planet.obliquity), bakeMs: performance.now() - started, textureBytes,
    }
  }

  /** The layer of an option, or null for option B (the game planet itself) or while it builds. */
  function layerOf(id: PlanetId, option: LookOption) {
    if (option === 'paint') { measurePaint(id); return null }
    const key = `${id}-${option}`
    const layer = layers.get(key)
    if (layer === 'loading') return null
    if (layer) return layer
    if (option === 'today') { const built = buildBeforeLayer(id); layers.set(key, built); return built }
    layers.set(key, 'loading')
    buildLayer(id, option).then(built => { layers.set(key, built); onLayer() }).catch(error => { layers.delete(key); console.error(error) })
    return null
  }

  /** Shows one option on the chosen planet. Returns the sky profile of that option. */
  function applyLook(id: PlanetId, option: LookOption, altitude: number) {
    const world = worldOf(id)
    const layer = layerOf(id, option)
    for (const [key, other] of layers) if (other !== 'loading' && key.startsWith(`${id}-`)) other.root.visible = false
    const game = option === 'paint' || !layer
    world.surface.visible = world.clouds.visible = game
    for (const part of gameParts.get(id)!) part.visible = game
    world.group.rotation.x = layer ? layer.tilt : THREE.MathUtils.degToRad(PLANETS[id].obliquity)
    if (!layer) {
      // Option B is the game: its own frame update sets the light, the air rim, the puffs and the deck.
      updatePlanetLooks([world], camera.position)
      return { profile: gameProfiles.get(id)!, ready: option === 'paint' }
    }
    layer.root.visible = true
    const size = inGame(id)
    layer.light.value = layer.cloudsFromSpace ? 1 : spaceLightAt(altitude, size)
    layer.haloFar.value = layer.cloudsFromSpace ? 0 : haloFarAt(altitude, size.atmosphere)
    if (layer.clouds) layer.clouds.visible = layer.cloudsFromSpace || puffsVisibleAt(altitude, size.atmosphere)
    layer.update?.(altitude)
    return { profile: layer.profile, ready: true }
  }

  // ---- The rules of updateEnvironment() in src/main.ts --------------------------------------------
  const skyTint = new THREE.Color(), mistTint = new THREE.Color(), cloudWhite = new THREE.Color(0xf0f3ed)
  const sunColor = new THREE.Color(0xffebcc), lowSunColor = new THREE.Color(0xffa267)
  const dayAmbientSky = new THREE.Color(0xd9efff), nightAmbientSky = new THREE.Color(0xa8bced)
  const dayAmbientGround = new THREE.Color(0x65794e), nightAmbientGround = new THREE.Color(0x3c3a5a)
  function environment(world: World, profile: SkyProfile, anchor: THREE.Vector3) {
    const altitude = camera.position.distanceTo(world.group.position) - world.radius
    const density = world.atmosphere ? 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08) : 0
    const cloudMist = world.cloudHeight ? Math.exp(-Math.pow((altitude - world.cloudHeight - 4) / 6, 2)) * density : 0
    const fogBase = world.kind === 'venus' ? 0.018 : world.gas ? 0.009 : world.kind === 'mars' ? 0.002 : 0.0018
    const light = daylightAt(solarElevation(anchor, world.group.position, sun.group.position))
    skyColor(profile, light, skyTint)
    mistTint.copy(cloudWhite).lerp(skyTint, light.night)
    fog.color.copy(skyTint).lerp(mistTint, cloudMist * 0.65)
    fog.density = fogBase * density + cloudMist * (world.kind === 'mars' ? 0.004 : 0.023)
    ;(scene.background as THREE.Color).copy(SPACE).lerp(skyTint, density * 0.78)
    stars.update(camera.position, 1 - density * (1 - light.stars * profile.starClarity), renderer.getPixelRatio())
    sunlight.color.copy(sunColor).lerp(lowSunColor, light.twilight * density)
    const normal = anchor.clone().sub(world.group.position).normalize()
    const surfaceDay = THREE.MathUtils.lerp(1, light.day, density)
    ambient.position.copy(normal)
    ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
    ambient.color.copy(nightAmbientSky).lerp(dayAmbientSky, surfaceDay)
    ambient.groundColor.copy(nightAmbientGround).lerp(dayAmbientGround, surfaceDay)
  }

  // ---- Camera ------------------------------------------------------------------------------------
  const orbit = { yaw: 0, pitch: 0, zoom: 1 }
  let settings: StudySettings | null = null
  let dragging: { x: number; y: number } | null = null
  canvas.addEventListener('pointerdown', event => { dragging = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId) })
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return
    orbit.yaw -= (event.clientX - dragging.x) * 0.006
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (event.clientY - dragging.y) * 0.004, -1.2, 1.2)
    dragging = { x: event.clientX, y: event.clientY }
  })
  canvas.addEventListener('pointerup', () => { dragging = null })
  canvas.addEventListener('wheel', event => { event.preventDefault(); orbit.zoom = THREE.MathUtils.clamp(orbit.zoom * Math.exp(event.deltaY * 0.001), 0.45, 2.5) }, { passive: false })
  canvas.addEventListener('keydown', event => {
    const step: Record<string, () => void> = {
      ArrowLeft: () => { orbit.yaw += 0.12 }, ArrowRight: () => { orbit.yaw -= 0.12 },
      ArrowUp: () => { orbit.pitch = Math.min(1.2, orbit.pitch + 0.08) }, ArrowDown: () => { orbit.pitch = Math.max(-1.2, orbit.pitch - 0.08) },
      '+': () => { orbit.zoom = Math.max(0.45, orbit.zoom * 0.9) }, '=': () => { orbit.zoom = Math.max(0.45, orbit.zoom * 0.9) }, '-': () => { orbit.zoom = Math.min(2.5, orbit.zoom * 1.1) },
    }
    if (step[event.key]) { event.preventDefault(); step[event.key]() }
  })
  const resetView = () => { orbit.yaw = 0; orbit.pitch = 0; orbit.zoom = 1 }

  const toSun = new THREE.Vector3(), horizontal = new THREE.Vector3(), direction = new THREE.Vector3(), normal = new THREE.Vector3()
  const forward = new THREE.Vector3(), back = new THREE.Vector3(), right = new THREE.Vector3(), look = new THREE.Vector3()
  const basis = new THREE.Matrix4()
  /** Puts the camera for the view. Returns the anchor for the light rules: the fairy, or the camera. */
  function place(id: PlanetId, view: View) {
    const world = worldOf(id), radius = world.radius, centre = world.group.position
    toSun.copy(sun.group.position).sub(centre).normalize()
    horizontal.set(toSun.x, 0, toSun.z).normalize()
    camera.up.copy(up)
    fairy.visible = view === 'flight'
    if (view !== 'flight') {
      // Portrait: the lit side, as in most pictures. Approach: near the terminator, the limb against space.
      const ringed = id === 'saturn' ? 4.6 : id === 'uranus' && settings?.option !== 'today' && settings?.option !== 'retune' ? 4 : 3.3
      const [yaw, pitch, distance] = view === 'portrait' ? [0.55, 0.24, radius * ringed] : [1.25, 0.1, radius * 1.62]
      direction.copy(horizontal).applyAxisAngle(up, yaw + orbit.yaw)
      const elevation = THREE.MathUtils.clamp(pitch + orbit.pitch, -1.35, 1.35)
      direction.multiplyScalar(Math.cos(elevation)).addScaledVector(up, Math.sin(elevation))
      camera.position.copy(centre).addScaledVector(direction, distance * orbit.zoom)
      look.copy(centre)
      if (view === 'approach') look.addScaledVector(up, -radius * 0.25)
      camera.lookAt(look)
      return camera.position
    }
    // Flight: the fairy flies with the Sun 33° high on her side, as in the game camera (0, 2.8, 8).
    normal.copy(horizontal).applyAxisAngle(up, 1.0).multiplyScalar(Math.cos(0.18)).addScaledVector(up, Math.sin(0.18)).normalize()
    fairy.position.copy(centre).addScaledVector(normal, radius + flightAltitude(id))
    forward.crossVectors(normal, toSun).normalize().applyAxisAngle(normal, orbit.yaw)
    back.copy(forward).negate()
    right.crossVectors(normal, back).normalize()
    fairy.quaternion.setFromRotationMatrix(basis.makeBasis(right, normal, back))
    camera.up.copy(normal)
    camera.position.copy(fairy.position).addScaledVector(normal, 2.8 + orbit.pitch * 6).addScaledVector(back, 8 * orbit.zoom)
    look.copy(fairy.position).addScaledVector(forward, 12)
    camera.lookAt(look)
    return fairy.position
  }

  // ---- Loop --------------------------------------------------------------------------------------
  let previous = performance.now(), frame = 0
  let measured = { calls: 0, triangles: 0 }
  const size = new THREE.Vector2()
  const observer = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight, false)
  })
  observer.observe(host)
  renderer.setSize(host.clientWidth || 800, host.clientHeight || 600, false)

  function render(nowMs: number) {
    frame = requestAnimationFrame(render)
    const delta = Math.min((nowMs - previous) / 1000, 0.1); previous = nowMs
    if (document.hidden || !settings) return
    const id = settings.planet, world = worldOf(id)
    if (settings.spin) world.group.rotation.y = (world.group.rotation.y + delta * TAU / PLANETS[id].spin) % TAU
    for (const other of Object.keys(PLANETS) as PlanetId[]) if (other !== id) worldOf(other).group.rotation.x = 0
    const anchor = place(id, settings.view)
    animation.update(delta, false)
    sunShading.track(scene)
    sunShading.update(worlds)
    renderer.getSize(size)
    const options: LookOption[] = settings.split && settings.option !== 'today' ? ['today', settings.option] : [settings.option]
    const width = size.x / options.length
    renderer.setScissorTest(options.length > 1)
    let calls = 0, triangles = 0
    options.forEach((option, index) => {
      const altitude = camera.position.distanceTo(world.group.position) - world.radius
      const { profile } = applyLook(id, option, altitude)
      // Light rules first, then the frame: the tilt changes the planet only, not the camera.
      scene.updateMatrixWorld()
      environment(world, profile, anchor)
      camera.aspect = width / size.y
      camera.updateProjectionMatrix()
      renderer.setViewport(width * index, 0, width, size.y)
      renderer.setScissor(width * index, 0, width, size.y)
      renderer.render(scene, camera)
      calls += renderer.info.render.calls; triangles += renderer.info.render.triangles
    })
    measured = { calls, triangles }
  }
  frame = requestAnimationFrame(render)

  return {
    canvas,
    apply(next: StudySettings) {
      const viewChanged = !settings || settings.view !== next.view || settings.planet !== next.planet
      settings = { ...next }
      if (viewChanged) resetView()
      layerOf(next.planet, next.option)
      if (next.split) layerOf(next.planet, next.option)
    },
    resetView,
    /** Builds every option of a planet now, for the budget panel. */
    prepare(id: PlanetId) { for (const option of ['retune', 'paint', 'photo'] as const) layerOf(id, option) },
    layerStats(id: PlanetId, option: LookOption) {
      if (option === 'paint') {
        const painted = PLANETS[id].gas || id === 'venus'
        return { ready: paintMs.has(id), bakeMs: paintMs.get(id) ?? 0, textureBytes: painted ? mapBytes(...BAKE_SIZE.desktop) : 0 }
      }
      const layer = layers.get(`${id}-${option}`)
      if (!layer || layer === 'loading') return { ready: false, bakeMs: 0, textureBytes: 0 }
      return { ready: true, bakeMs: layer.bakeMs, textureBytes: layer.textureBytes }
    },
    get stats() {
      const id = settings?.planet ?? 'jupiter', world = worldOf(id)
      return {
        planet: id, option: settings?.option, view: settings?.view,
        tilt: +THREE.MathUtils.radToDeg(world.group.rotation.x).toFixed(1),
        altitude: +(camera.position.distanceTo(world.group.position) - world.radius).toFixed(1),
        layers: [...layers].filter(([, layer]) => layer !== 'loading').map(([key]) => key),
        gameBuildMs: Math.round(gameBuildMs),
        ...measured,
      }
    },
    dispose() {
      cancelAnimationFrame(frame); observer.disconnect()
      renderer.dispose(); canvas.remove()
    },
  }
}
