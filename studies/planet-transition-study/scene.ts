import * as THREE from 'three'
import { createWorlds, meadowNormal, regenerateWorld } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { createStarSky } from '../../src/stars'
import { createSunShading } from '../../src/sun-shading'
import { createFairyRig, createSkyDancerAnimation } from '../../src/fairy'
import { daylightAt, morningSpin, skyColor, skyProfile, solarElevation } from '../../src/daylight'
import { updatePlanetLooks } from '../../src/planet-paint'
import { PROPORTIONS } from '../../src/proportions'
import { altitudeForAngle, createPilot, levelCeiling, scenarioInput, scenarioStart, scenarioTarget, SCENARIOS, SKY_ANGLES, STEP, steerShell } from './model'
import type { Input, Option, Sample, ScenarioId } from './model'

export type Run = { option: Option; scenario: ScenarioId | 'free'; from: 'meadow' | 'above' }
export type SceneHandlers = { sample: (sample: Sample, largest: { turn: number; brake: number }) => void; rebuild: (milliseconds: number) => void; end: () => void }

const SPACE = new THREE.Color(0x02030f)

export function createTransitionScene(host: HTMLElement, handlers: SceneHandlers) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
  // The game renderer: src/main.ts.
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of the fairy and Earth. In free flight, W and S climb and descend, A and D turn, Shift boosts.')
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
  const worlds = createWorlds(scene, false, renderer)
  const sun = worlds.find(world => world.kind === 'sun')!
  const earth = worlds.find(world => world.kind === 'earth')!
  const sunlight = new THREE.PointLight(0xffebcc, 2.4, 0, 0)
  sun.group.add(sunlight)
  const sunShading = createSunShading(sun.group.position)
  // The game start: a meadow in mid-morning light (src/main.ts). The worlds stand still in this study.
  const meadowLocal = meadowNormal(earth)
  earth.group.rotation.y = morningSpin(meadowLocal, earth.group.position, sun.group.position)
  earth.group.updateMatrixWorld()
  const meadow = meadowLocal.clone().applyQuaternion(earth.group.quaternion)

  const rig = createFairyRig({ withTrail: false })
  const fairy = rig.root
  const animation = createSkyDancerAnimation(rig)
  const fairyLight = new THREE.PointLight(0xffca8c, 0.6, 7, 2)
  fairyLight.position.set(0, 1.5, 0.8)
  fairy.add(fairyLight)
  scene.add(fairy)

  // Faint shells where the rules change: the steering shell today and in A, the sky shell in B and C.
  const shellMaterial = new THREE.MeshBasicMaterial({ color: 0xf6d9aa, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false, fog: false })
  const shells = new THREE.Group()
  shells.visible = false
  earth.group.add(shells)
  function buildShells(option: Option) {
    shells.children.forEach(child => (child as THREE.Mesh).geometry.dispose())
    shells.clear()
    const heights = option === 'today' || option === 'retune' ? [steerShell(earth)] : [levelCeiling(earth), altitudeForAngle(earth, SKY_ANGLES[1])]
    for (const height of heights) shells.add(new THREE.Mesh(new THREE.IcosahedronGeometry(earth.radius + height, 6), shellMaterial))
  }

  // Option C: the cloud veil of the glide.
  const veil = document.createElement('div')
  veil.className = 'veil'
  host.append(veil)

  // ---- The rules of updateEnvironment() in src/main.ts, for Earth -------------------------------
  const skyTint = new THREE.Color(), mistTint = new THREE.Color(), cloudWhite = new THREE.Color(0xf0f3ed)
  const sunColor = new THREE.Color(0xffebcc), lowSunColor = new THREE.Color(0xffa267), sunTint = new THREE.Color()
  const dayAmbientSky = new THREE.Color(0xd9efff), nightAmbientSky = new THREE.Color(0xa8bced)
  const dayAmbientGround = new THREE.Color(0x65794e), nightAmbientGround = new THREE.Color(0x3c3a5a)
  const profile = skyProfile(earth)
  function environment(world: World, extraMist: number, time: number) {
    const altitude = camera.position.distanceTo(world.group.position) - world.radius
    const density = 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08)
    const cloudMist = Math.max(Math.exp(-Math.pow((altitude - world.cloudHeight - 4) / 6, 2)) * density, extraMist)
    const light = daylightAt(solarElevation(fairy.position, world.group.position, sun.group.position))
    skyColor(profile, light, skyTint)
    mistTint.copy(cloudWhite).lerp(skyTint, light.night)
    fog.color.copy(skyTint).lerp(mistTint, cloudMist * 0.65)
    fog.density = 0.0018 / PROPORTIONS.size * density + cloudMist * 0.023
    ;(scene.background as THREE.Color).copy(SPACE).lerp(skyTint, Math.max(density, extraMist) * 0.78)
    stars.update(camera.position, 1 - density * (1 - light.stars * profile.starClarity), renderer.getPixelRatio())
    sunlight.color.copy(sunColor).lerp(lowSunColor, light.twilight * density)
    sunTint.setRGB(sunlight.color.r / sunColor.r, sunlight.color.g / sunColor.g, sunlight.color.b / sunColor.b)
    sun.sunLook?.update({ time, air: density, tint: sunTint, boost: 1 })
    const normal = fairy.position.clone().sub(world.group.position).normalize()
    const surfaceDay = THREE.MathUtils.lerp(1, light.day, density)
    ambient.position.copy(normal)
    ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
    ambient.color.copy(nightAmbientSky).lerp(dayAmbientSky, surfaceDay)
    ambient.groundColor.copy(nightAmbientGround).lerp(dayAmbientGround, surfaceDay)
  }

  // ---- Flight -------------------------------------------------------------------------------------
  const keys = new Set<string>()
  const flightKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']
  canvas.addEventListener('keydown', event => {
    if (!flightKeys.includes(event.code)) return
    event.preventDefault()
    keys.add(event.code)
  })
  window.addEventListener('keyup', event => keys.delete(event.code))
  canvas.addEventListener('blur', () => keys.clear())
  function keyInput(): Input {
    return {
      yaw: Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight')),
      pitch: Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')),
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    }
  }

  let run: Run = { option: 'today', scenario: 'dive', from: 'above' }
  let pilot = createPilot('today', earth, scenarioStart(earth, 'dive', meadow))
  let last: Sample | null = null
  let memory = { released: false }
  let largest = { turn: 0, brake: 0 }
  let playing = true, rate = 1, rebuild = true, accumulator = 0, finished = false

  // ---- The camera of updateCamera() in src/main.ts ------------------------------------------------
  const cameraGoal = new THREE.Vector3(), cameraLook = new THREE.Vector3(), lookGoal = new THREE.Vector3()
  const cameraOffset = new THREE.Vector3(), previous = new THREE.Vector3(), cameraUpGoal = new THREE.Vector3(), forward = new THREE.Vector3()
  function resetCamera() {
    fairy.position.copy(pilot.state.position)
    fairy.quaternion.copy(pilot.state.quaternion)
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    previous.copy(fairy.position)
    camera.up.set(0, 1, 0).applyQuaternion(fairy.quaternion)
    camera.position.copy(fairy.position).add(cameraOffset.set(0, 2.8, 8).applyQuaternion(fairy.quaternion))
    cameraLook.copy(fairy.position).addScaledVector(forward, 12)
    camera.lookAt(cameraLook)
  }
  function updateCamera(delta: number, wide: number, boost: boolean) {
    camera.position.add(fairy.position).sub(previous)
    cameraLook.add(fairy.position).sub(previous)
    previous.copy(fairy.position)
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    // Option C pulls the camera back and up during the glide and the lift.
    cameraOffset.set(0, 2.8 + wide * 5, 8 + wide * 12).applyQuaternion(fairy.quaternion)
    cameraGoal.copy(fairy.position).add(cameraOffset)
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 6))
    const normal = camera.position.clone().sub(earth.group.position).normalize()
    const safe = earth.radius + 1.5
    if (camera.position.distanceTo(earth.group.position) < safe) camera.position.copy(earth.group.position).addScaledVector(normal, safe)
    lookGoal.copy(fairy.position).addScaledVector(forward, 12 * (1 - wide * 0.6))
    cameraLook.lerp(lookGoal, 1 - Math.exp(-delta * 6))
    cameraUpGoal.set(0, 1, 0).applyQuaternion(fairy.quaternion)
    camera.up.lerp(cameraUpGoal, 1 - Math.exp(-delta * 3)).normalize()
    camera.lookAt(cameraLook)
    camera.fov = THREE.MathUtils.lerp(camera.fov, boost ? 66 : 58, 1 - Math.exp(-delta * 2.5))
    camera.updateProjectionMatrix()
  }

  function load(next: Run) {
    run = next
    const id: ScenarioId = next.scenario === 'free' ? (next.from === 'meadow' ? 'leave-hold' : 'dive') : next.scenario
    const scenario = SCENARIOS[id]
    const start = scenarioStart(earth, id, meadow)
    if (next.scenario === 'free' && next.from === 'above') start.speed = Math.min(start.speed, 400)
    const guided = next.scenario !== 'free' && scenario.guided
    pilot = createPilot(next.option, earth, start, guided, next.scenario !== 'free' && scenario.target ? scenarioTarget(earth, meadow) : undefined)
    last = null; memory = { released: false }; largest = { turn: 0, brake: 0 }
    accumulator = 0; finished = false; playing = true; keys.clear()
    buildShells(next.option)
    resetCamera()
    if (next.scenario === 'free') canvas.focus()
  }

  function stepFlight(delta: number) {
    accumulator += delta * rate
    let wide = 0, mist = 0, boost = false
    while (accumulator >= STEP) {
      accumulator -= STEP
      const input = run.scenario === 'free' ? keyInput() : scenarioInput(run.scenario, last, memory)
      boost = input.boost
      last = pilot.step(STEP, input)
      largest.turn = Math.max(largest.turn, last.turn)
      largest.brake = Math.max(largest.brake, last.brake)
      if (last.events.includes('rebuild') && rebuild) {
        const begin = performance.now()
        regenerateWorld(earth)
        handlers.rebuild(performance.now() - begin)
      }
      if (run.scenario !== 'free' && last.t >= SCENARIOS[run.scenario].duration) { finished = true; playing = false; handlers.end(); break }
    }
    if (last) { wide = last.wide; mist = last.veil; handlers.sample(last, largest) }
    return { wide, mist, boost }
  }

  let before = performance.now(), frame = 0, time = 0
  const size = new THREE.Vector2()
  function resize() {
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 560, false)
    renderer.getSize(size)
    camera.aspect = size.x / size.y
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  resetCamera()

  function render(now: number) {
    frame = requestAnimationFrame(render)
    const delta = Math.min((now - before) / 1000, 0.05); before = now
    if (document.hidden) return
    const active = playing && !finished
    const { wide, mist, boost } = active ? stepFlight(delta) : { wide: last?.wide ?? 0, mist: last?.veil ?? 0, boost: false }
    time += active ? delta * rate : 0
    fairy.position.copy(pilot.state.position)
    fairy.quaternion.copy(pilot.state.quaternion)
    animation.update(active ? delta * rate : 0, boost)
    updateCamera(active ? delta * rate : 0.0001, wide, boost)
    veil.style.opacity = String(mist * 0.82)
    scene.updateMatrixWorld()
    environment(earth, mist, time)
    updatePlanetLooks(worlds, camera.position)
    sunShading.update(worlds)
    sunShading.track(scene)
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(render)

  return {
    earth, meadow, canvas,
    load,
    replay() { load(run) },
    get playing() { return playing && !finished },
    setPlaying(value: boolean) { if (finished && value) load(run); else playing = value },
    setRate(value: number) { rate = value },
    setRebuild(value: boolean) { rebuild = value },
    setShells(value: boolean) { shells.visible = value },
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose() },
  }
}
