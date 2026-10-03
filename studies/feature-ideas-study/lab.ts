import * as THREE from 'three'
import { createWorlds, homeCottagePosition, meadowNormal, surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { createStarSky } from '../../src/stars'
import { createSunShading } from '../../src/sun-shading'
import { createFairyRig, createSkyDancerAnimation } from '../../src/fairy'
import { daylightAt, morningSpin, skyColor, skyProfile, solarElevation } from '../../src/daylight'
import { updatePlanetLooks } from '../../src/planet-paint'
import { PROPORTIONS } from '../../src/proportions'
import { CANDY_MIST } from '../../src/cotton-candy'
import { LOW_SUN_DIM } from '../../src/sun-look'
import { earthshineAt } from '../../src/moon'
import { nearestWorldAt, orientFlight, stepFlight } from '../../src/flight'
import type { FlightInput, FlightState } from '../../src/flight'
import { setClock, silence } from './features/sound'

/**
 * The lab: the worlds, the sky, the fairy and the camera of the game, for one feature at a time.
 * The renderer, the camera and updateEnvironment() follow src/main.ts. The worlds stand still,
 * so each feature clip is the same at each run. A clip moves the fairy on a rail; free flight
 * uses stepFlight() of src/flight.ts with the keys.
 */
export type Kind = World['kind']
/** A point of a rail: a direction in the local frame of the world, and a height above its ground. */
export type RailPoint = { dir: THREE.Vector3; alt: number }
export type CameraShot = (camera: THREE.PerspectiveCamera, t: number) => void
export type FeatureRun = {
  /** The length of the clip in seconds. */
  duration: number
  /** The time of the picture of the feature. The default is 60% of the clip. */
  still?: number
  /** Called on each frame, in the clip and in free flight. `t` is the time from the start. */
  update(t: number, delta: number): void
  dispose(): void
}
export type Feature = { id: string; create(lab: Lab): FeatureRun }
export type Lab = ReturnType<typeof createLab>

const SPACE = new THREE.Color(0x02030f)

export function softDisc(color = 'rgba(255,255,255,1)', size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.18, color)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createLab(host: HTMLElement) {
  // preserveDrawingBuffer: the postcard (F5) and the clip capture read the canvas after the frame.
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of the fairy. In free flight, W and S climb and descend, A and D turn, Shift boosts.')
  host.prepend(renderer.domElement)
  const overlay = document.createElement('div')
  overlay.className = 'lab-overlay'
  host.append(overlay)
  // A strict page policy can refuse style attributes in HTML text. The style object of an element
  // is always allowed, so the overlay copies each style attribute to it.
  const copyStyles = (root: Element) => [root, ...root.querySelectorAll('[style]')].forEach(element => {
    const text = element.getAttribute('style')
    if (!text || !(element instanceof HTMLElement || element instanceof SVGElement)) return
    for (const rule of text.split(';')) {
      const at = rule.indexOf(':')
      if (at > 0) element.style.setProperty(rule.slice(0, at).trim(), rule.slice(at + 1).trim())
    }
  })
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) copyStyles(node) })))
    .observe(overlay, { childList: true, subtree: true })

  const scene = new THREE.Scene()
  scene.background = SPACE.clone()
  const fog = new THREE.FogExp2(0x83c5e8, 0)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.08, 80000)
  const ambient = new THREE.HemisphereLight(0xd9efff, 0x65794e, 1.1)
  scene.add(ambient)
  const stars = createStarSky(scene)
  const worlds = createWorlds(scene, false, renderer)
  const byKind = (kind: Kind) => worlds.find(world => world.kind === kind)!
  const sun = byKind('sun'), earth = byKind('earth'), home = byKind('fairy'), moon = byKind('moon')
  const sunlight = new THREE.PointLight(0xffebcc, 2.4, 0, 0)
  sun.group.add(sunlight)
  const sunShading = createSunShading(sun.group.position)
  const meadowLocal = meadowNormal(earth)
  const profiles = new Map(worlds.map(world => [world, skyProfile(world)]))
  const cottageWindow = (home.surface.getObjectByName('cottage-window') as THREE.Mesh | undefined)?.material as THREE.MeshStandardMaterial | undefined

  const rig = createFairyRig({ withTrail: false })
  const fairy = rig.root
  const animation = createSkyDancerAnimation(rig)
  const fairyLight = new THREE.PointLight(0xffca8c, 0.6, 7, 2)
  fairyLight.position.set(0, 1.5, 0.8)
  fairy.add(fairyLight)
  scene.add(fairy)

  // ---- The trail of src/main.ts --------------------------------------------------------------
  const trailCount = 72
  const trailPositions = new Float32Array(trailCount * 3), trailColors = new Float32Array(trailCount * 3)
  const trailColor = new THREE.Color()
  for (let i = 0; i < trailCount; i++) {
    trailColor.setHSL(0.1 + i / trailCount * 0.09, 0.75, 0.72)
    trailColors.set([trailColor.r, trailColor.g, trailColor.b], i * 3)
  }
  const trailGeometry = new THREE.BufferGeometry()
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
  const trailMaterial = new THREE.PointsMaterial({ size: 0.2, map: softDisc(), vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending })
  const trail = new THREE.Points(trailGeometry, trailMaterial)
  trail.frustumCulled = false
  scene.add(trail)
  let trailCursor = 0
  function resetTrail() {
    for (let i = 0; i < trailCount; i++) trailPositions.set([fairy.position.x, fairy.position.y, fairy.position.z], i * 3)
    trailGeometry.attributes.position.needsUpdate = true
  }
  function pushTrail(count: number) {
    for (let i = 0; i < count; i++) {
      const index = trailCursor++ % trailCount
      trailPositions[index * 3] = fairy.position.x + (Math.random() - 0.5) * 0.34
      trailPositions[index * 3 + 1] = fairy.position.y + (Math.random() - 0.5) * 0.34
      trailPositions[index * 3 + 2] = fairy.position.z + (Math.random() - 0.5) * 0.34
    }
    trailGeometry.attributes.position.needsUpdate = true
  }

  // ---- Places ----------------------------------------------------------------------------------
  /** The world position of a point at `alt` metres above the ground of `world`, in the direction `dir` (local). */
  function surfacePoint(world: World, dir: THREE.Vector3, alt: number) {
    const normal = dir.clone().normalize().applyQuaternion(world.group.quaternion)
    return world.group.position.clone().addScaledVector(normal, surfaceRadius(world, normal) + alt)
  }
  function upAt(world: World, position: THREE.Vector3) { return position.clone().sub(world.group.position).normalize() }
  /** A local direction `metres` away from `dir` on the ground, toward `toward` (local). */
  function stepAlong(world: World, dir: THREE.Vector3, toward: THREE.Vector3, metres: number) {
    const axis = new THREE.Vector3().crossVectors(dir, toward).normalize()
    return dir.clone().normalize().applyAxisAngle(axis, metres / world.radius)
  }
  /** Turns a world on its axis so that the local direction `dir` has the Sun at `elevation` degrees. */
  function setSunElevation(world: World, dir: THREE.Vector3, elevation: number) {
    world.group.rotation.y = morningSpin(dir, world.group.position, sun.group.position, elevation)
    world.group.updateMatrixWorld(true)
  }
  setSunElevation(earth, meadowLocal, 25)

  // ---- Rails and the camera ---------------------------------------------------------------------
  /** A rail: the fairy moves along `curve` from time `start` to time `end` of the clip. */
  type Rail = { world: World; curve: THREE.CatmullRomCurve3; start: number; end?: number }
  let rails: Rail[] = []
  function setRail(world: World, points: RailPoint[], start = 0, end?: number) {
    world.group.updateMatrixWorld(true)
    setRailPoints(world, points.map(point => surfacePoint(world, point.dir, point.alt)), start, end)
  }
  /** A rail through world positions. `world` gives the up direction of the fairy. */
  function setRailPoints(world: World, points: THREE.Vector3[], start = 0, end?: number) {
    rails = rails.filter(rail => rail.start !== start)
    rails.push({ world, curve: new THREE.CatmullRomCurve3(points, false, 'centripetal'), start, end })
    rails.sort((a, b) => a.start - b.start)
  }
  function railAt(time: number, duration: number) {
    const index = rails.findLastIndex(rail => rail.start <= time)
    const rail = rails[Math.max(0, index)]
    if (!rail) return null
    const end = rail.end ?? rails[index + 1]?.start ?? duration
    return { rail, u: THREE.MathUtils.clamp((time - rail.start) / Math.max(end - rail.start, 0.001), 0, 1) }
  }
  const heading = new THREE.Vector3(), normal = new THREE.Vector3(), lastPlace = new THREE.Vector3()
  let speed = 0
  function placeOnRail(time: number, duration: number) {
    const at = railAt(time, duration)
    if (!at) return false
    lastPlace.copy(fairy.position)
    at.rail.curve.getPointAt(at.u, fairy.position)
    at.rail.curve.getTangentAt(at.u, heading)
    normal.copy(fairy.position).sub(at.rail.world.group.position).normalize()
    orientFlight(fairy.quaternion, heading, normal)
    return true
  }
  /** Scripted keys for the clip, in place of a rail: the fairy flies with stepFlight(). */
  let script: ((t: number) => FlightInput) | null = null
  let scriptStart: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null

  let shot: CameraShot | null = null
  const cameraGoal = new THREE.Vector3(), cameraLook = new THREE.Vector3(), lookGoal = new THREE.Vector3(), cameraUpGoal = new THREE.Vector3()
  const cameraOffset = new THREE.Vector3(), previous = new THREE.Vector3(), forward = new THREE.Vector3()
  let followDistance = 8, followHeight = 2.8
  function snapCamera() {
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    previous.copy(fairy.position)
    camera.up.set(0, 1, 0).applyQuaternion(fairy.quaternion)
    camera.position.copy(fairy.position).add(cameraOffset.set(0, followHeight, followDistance).applyQuaternion(fairy.quaternion))
    cameraLook.copy(fairy.position).addScaledVector(forward, 12)
    camera.lookAt(cameraLook)
  }
  /** The camera of updateCamera() in src/main.ts. */
  function followCamera(delta: number, boost: boolean) {
    camera.position.add(fairy.position).sub(previous)
    cameraLook.add(fairy.position).sub(previous)
    previous.copy(fairy.position)
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    cameraGoal.copy(fairy.position).add(cameraOffset.set(0, followHeight, followDistance).applyQuaternion(fairy.quaternion))
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 6))
    const world = nearestWorldAt(camera.position, worlds)
    const up = camera.position.clone().sub(world.group.position).normalize()
    const safe = surfaceRadius(world, up) + 1.5
    if (camera.position.distanceTo(world.group.position) < safe) camera.position.copy(world.group.position).addScaledVector(up, safe)
    lookGoal.copy(fairy.position).addScaledVector(forward, 12)
    cameraLook.lerp(lookGoal, 1 - Math.exp(-delta * 6))
    cameraUpGoal.set(0, 1, 0).applyQuaternion(fairy.quaternion)
    camera.up.lerp(cameraUpGoal, 1 - Math.exp(-delta * 3)).normalize()
    camera.lookAt(cameraLook)
    camera.fov = THREE.MathUtils.lerp(camera.fov, boost ? 66 : 58, 1 - Math.exp(-delta * 2.5))
    camera.updateProjectionMatrix()
  }

  // ---- updateEnvironment() of src/main.ts --------------------------------------------------------
  const skyTint = new THREE.Color(), mistTint = new THREE.Color(), cloudWhite = new THREE.Color(0xf0f3ed), candyMist = new THREE.Color(CANDY_MIST)
  const sunColor = new THREE.Color(0xffebcc), lowSunColor = new THREE.Color(0xffa267), sunTint = new THREE.Color()
  const dayAmbientSky = new THREE.Color(0xd9efff), nightAmbientSky = new THREE.Color(0xa8bced)
  const dayAmbientGround = new THREE.Color(0x65794e), nightAmbientGround = new THREE.Color(0x3c3a5a)
  let skyVisibility = 1, light = daylightAt(90)
  function environment(time: number) {
    const world = nearestWorldAt(fairy.position, worlds)
    const altitude = camera.position.distanceTo(world.group.position) - world.radius
    const density = world.atmosphere ? 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08) : 0
    const cloudMist = world.cloudHeight ? Math.exp(-Math.pow((altitude - world.cloudHeight - 4) / 6, 2)) * density : 0
    const fogBase = (world.kind === 'venus' ? 0.018 : world.gas ? 0.009 : world.kind === 'mars' ? 0.002 : 0.0018) / PROPORTIONS.size
    light = world.kind === 'sun' ? daylightAt(90) : daylightAt(solarElevation(fairy.position, world.group.position, sun.group.position))
    const profile = profiles.get(world)!
    skyColor(profile, light, skyTint)
    mistTint.copy(world.kind === 'fairy' ? candyMist : cloudWhite).lerp(skyTint, light.night)
    fog.color.copy(skyTint).lerp(mistTint, cloudMist * 0.65)
    fog.density = fogBase * density + cloudMist * (world.kind === 'mars' ? 0.004 : 0.023)
    ;(scene.background as THREE.Color).copy(SPACE).lerp(skyTint, density * 0.78)
    skyVisibility = 1 - density * (1 - light.stars * profile.starClarity)
    stars.update(camera.position, skyVisibility, renderer.getPixelRatio())
    sunlight.color.copy(sunColor).lerp(lowSunColor, light.twilight * density)
    sunTint.setRGB(sunlight.color.r / sunColor.r, sunlight.color.g / sunColor.g, sunlight.color.b / sunColor.b)
      .multiplyScalar(THREE.MathUtils.lerp(1, LOW_SUN_DIM, light.twilight * density))
    sun.sunLook?.update({ time, air: density, tint: sunTint, boost: 1 })
    const up = fairy.position.clone().sub(world.group.position).normalize()
    const surfaceDay = THREE.MathUtils.lerp(1, light.day, density)
    ambient.position.copy(up)
    rig.wings.setDaylight(light.day)
    ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
    ambient.color.copy(nightAmbientSky).lerp(dayAmbientSky, surfaceDay)
    ambient.groundColor.copy(nightAmbientGround).lerp(dayAmbientGround, surfaceDay)
    if (moon.earthshine) moon.earthshine.value = earthshineAt(camera.position.distanceTo(moon.group.position) - moon.radius)
    if (cottageWindow) {
      const cottageDay = daylightAt(solarElevation(homeCottagePosition(home), home.group.position, sun.group.position)).day
      cottageWindow.emissiveIntensity = THREE.MathUtils.lerp(1.7, 0.9, cottageDay)
    }
  }

  // ---- Free flight ---------------------------------------------------------------------------------
  const keys = new Set<string>()
  const flightKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']
  renderer.domElement.addEventListener('keydown', event => {
    if (!flightKeys.includes(event.code)) return
    event.preventDefault()
    keys.add(event.code)
  })
  window.addEventListener('keyup', event => keys.delete(event.code))
  renderer.domElement.addEventListener('blur', () => keys.clear())
  /** Extra input, such as a game controller (F7). It adds to the keys. */
  let extraInput: (() => Partial<FlightInput>) | null = null
  function keyInput(): FlightInput {
    const extra = extraInput?.() ?? {}
    return {
      yaw: THREE.MathUtils.clamp(Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight')) + (extra.yaw ?? 0), -1, 1),
      pitch: THREE.MathUtils.clamp(Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')) + (extra.pitch ?? 0), -1, 1),
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight') || !!extra.boost,
    }
  }
  const flight: FlightState = { position: fairy.position, quaternion: fairy.quaternion, speed: 11 }

  // ---- The run ---------------------------------------------------------------------------------------
  let feature: FeatureRun | null = null
  let mode: 'clip' | 'free' = 'clip'
  let t = 0, playing = true, boostCue = false, frame = 0, before = performance.now(), external = false
  const listeners = new Set<(t: number) => void>()
  setClock(() => t)

  function step(delta: number) {
    if (playing) t += delta
    const active = playing ? delta : 0
    let boost = false
    const from = fairy.position.clone()
    if (mode === 'clip' && feature) {
      if (script) {
        const input = script(t)
        boost = input.boost
        if (active) stepFlight(flight, nearestWorldAt(fairy.position, worlds), active, input)
      } else {
        placeOnRail(Math.min(t, feature.duration), feature.duration)
        boost = boostCue
      }
      if (t >= feature.duration && playing) { playing = false; listeners.forEach(listener => listener(t)) }
    } else if (mode === 'free' && active) {
      const input = keyInput()
      boost = input.boost
      stepFlight(flight, nearestWorldAt(fairy.position, worlds), active, input)
    }
    if (active) { pushTrail(boost ? 3 : 1); speed = THREE.MathUtils.lerp(speed, from.distanceTo(fairy.position) / active, 0.2) }
    animation.update(active, boost)
    feature?.update(t, active)
    for (const world of worlds) {
      world.creatures?.update(active, camera.position)
      world.animate?.(t)
    }
    if (shot && mode === 'clip') shot(camera, t)
    else followCamera(Math.max(active, 0.0001), boost)
    scene.updateMatrixWorld()
    environment(t)
    trailMaterial.opacity = 0.56 + Math.sin(t * 3) * 0.12
    updatePlanetLooks(worlds, camera.position)
    sunShading.update(worlds)
    sunShading.track(scene)
    renderer.render(scene, camera)
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop)
    const delta = Math.min((now - before) / 1000, 0.05); before = now
    if (document.hidden || external) return
    step(delta)
  }
  frame = requestAnimationFrame(loop)

  function resize() {
    const width = host.clientWidth || 960, height = host.clientHeight || 540
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  function start() {
    if (script && scriptStart) { fairy.position.copy(scriptStart.position); fairy.quaternion.copy(scriptStart.quaternion); flight.speed = 11 }
    else placeOnRail(0, feature?.duration ?? 1)
    speed = 0
    snapCamera()
    resetTrail()
  }

  const lab = {
    renderer, scene, camera, overlay, host, worlds, trailMaterial, sun, earth, home, moon, fairy, rig, meadowLocal, stars,
    byKind, surfacePoint, upAt, stepAlong, setSunElevation, softDisc, homeCottagePosition,
    get time() { return t },
    get light() { return light },
    get skyVisibility() { return skyVisibility },
    get mode() { return mode },
    get run() { return feature },
    get playing() { return playing },
    /** Sets the rail of the clip. The fairy moves from `from` to `to` of the rail in the clip. */
    setRail, setRailPoints,
    /** Scripted keys from a start pose, in place of a rail. */
    setScript(input: (t: number) => FlightInput, position: THREE.Vector3, quaternion: THREE.Quaternion) {
      script = input; scriptStart = { position: position.clone(), quaternion: quaternion.clone() }
    },
    get speed() { return speed },
    get nearest() { return nearestWorldAt(fairy.position, worlds) },
    snapCamera,
    /** A fixed or moving camera for the clip. `null` uses the follow camera of the game. */
    setShot(next: CameraShot | null) { shot = next },
    setFollow(distance = 8, height = 2.8) { followDistance = distance; followHeight = height },
    setBoost(value: boolean) { boostCue = value },
    setExtraInput(input: (() => Partial<FlightInput>) | null) { extraInput = input },
    onEnd(listener: (t: number) => void) { listeners.add(listener); return () => listeners.delete(listener) },
    /** Starts a feature from the start of its clip. */
    load(next: Feature) {
      silence()
      feature?.dispose()
      overlay.replaceChildren()
      shot = null; rails = []; script = null; scriptStart = null; boostCue = false; extraInput = null
      followDistance = 8; followHeight = 2.8
      setSunElevation(earth, meadowLocal, 25)
      camera.fov = 58; camera.updateProjectionMatrix()
      t = 0; playing = true; mode = 'clip'
      feature = next.create(lab)
      start()
      resetTrail()
      step(0)
    },
    replay() { silence(); t = 0; playing = true; mode = 'clip'; start() },
    setPlaying(value: boolean) { playing = value; if (value && mode === 'clip' && feature && t >= feature.duration) lab.replay() },
    /** Free flight from where the fairy is now. The feature keeps its update. */
    fly() { mode = 'free'; playing = true; flight.speed = 11; renderer.domElement.focus() },
    /** The capture: the page stops its own frames, and the script asks for each frame. */
    capture(on: boolean) { external = on },
    step,
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); feature?.dispose(); renderer.dispose() },
  }
  return lab
}
