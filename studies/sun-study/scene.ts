import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createWorlds, meadowNormal, surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { createStarSky } from '../../src/stars'
import { createSunShading } from '../../src/sun-shading'
import { createFairyRig, createSkyDancerAnimation } from '../../src/fairy'
import { daylightAt, morningSpin, skyColor, skyProfile, solarElevation } from '../../src/daylight'
import { updatePlanetLooks } from '../../src/planet-paint'
import { PROPORTIONS } from '../../src/proportions'
import { createSunLook, sunDirection, spinAngle } from '../../src/sun-paint'
import { buildBefore } from './legacy'
import type { SunLook } from '../../src/sun-paint'
import { apparentWidth, BLOOM, CAMERA_BOOST, LENS_FLARE, LOW_SUN_DIM, PROMINENCES, SUN_OPTIONS } from './model'
import type { SunHeight, SunOption, View } from './model'

export type StudySettings = { option: SunOption; view: View; height: SunHeight; split: boolean; motion: boolean; phone: boolean }

/** Sun elevation at the meadow for each choice, in degrees. */
export const HEIGHTS: Record<SunHeight, number> = { high: 50, morning: 25, low: 4 }

const SPACE = new THREE.Color(0x02030f)
const up = new THREE.Vector3(0, 1, 0)

/** Option C: a soft ring and a soft hexagon for the ghosts of the lens flare. */
function flareTexture(kind: 'ring' | 'hexagon') {
  const size = 128, canvas = document.createElement('canvas'); canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.translate(size / 2, size / 2)
  if (kind === 'ring') {
    const gradient = ctx.createRadialGradient(0, 0, size * 0.28, 0, 0, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient; ctx.fillRect(-size / 2, -size / 2, size, size)
  } else {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * Math.PI / 3) * size * 0.42, Math.sin(i * Math.PI / 3) * size * 0.42)
    ctx.closePath()
    ctx.filter = 'blur(3px)'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createSunScene(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // The game renderer: src/main.ts.
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.info.autoReset = false
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of the Sun. Drag or use the arrow keys to look around. Scroll or use plus and minus to zoom.')
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

  // The worlds of the game: the Sun of option B, Earth for the meadow view, and the planets in the sky.
  const worlds = createWorlds(scene, false, renderer)
  const sun = worlds.find(world => world.kind === 'sun')!
  const earth = worlds.find(world => world.kind === 'earth')!
  const centre = sun.group.position
  const radius = sun.radius
  const sunlight = new THREE.PointLight(0xffebcc, 2.4, 0, 0)
  // Before: a copy of the old sphere of createWorlds() and the old glow sprite of src/main.ts.
  const before = buildBefore()
  before.visible = false
  sun.group.add(before, sunlight)
  const sunShading = createSunShading(centre)

  // The looks. Option B is the game Sun itself; the phone look of B is built when the phone switch is on.
  const looks = new Map<string, SunLook>([['living', sun.sunLook!]])
  function lookOf(living: boolean, phone: boolean) {
    const key = living ? `living${phone ? '-phone' : ''}` : 'retune'
    let look = looks.get(key)
    if (!look) {
      look = createSunLook(radius, centre, living, phone && living)
      look.root.visible = false
      sun.group.add(look.root)
      looks.set(key, look)
    }
    return look
  }
  lookOf(false, false)
  const living = lookOf(true, false)

  // Option C: lens flare ghosts on a screen overlay, and the bloom of the frame.
  // The Lensflare of three.js tests occlusion with a colour pattern that breaks in a half-float target.
  const ring = flareTexture('ring'), hexagon = flareTexture('hexagon')
  const flareScene = new THREE.Scene(), flareCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
  const flareColors = [0xffd7a0, 0xa9c8ff, 0xffb8e0, 0xc9ffd8]
  const ghosts = LENS_FLARE.map(([, place], i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? ring : hexagon, color: flareColors[i], blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, transparent: true }))
    sprite.userData.place = place
    flareScene.add(sprite)
    return sprite
  })
  const flarePoint = new THREE.Vector3(), flareRay = new THREE.Vector3(), flareTo = new THREE.Vector3()
  /** True when a world is between the camera and the centre of the Sun. */
  function sunBlocked() {
    flareRay.copy(centre).sub(camera.position)
    const length = flareRay.length()
    flareRay.divideScalar(length)
    return worlds.some(world => {
      if (world === sun) return false
      flareTo.copy(world.group.position).sub(camera.position)
      const along = flareTo.dot(flareRay)
      return along > 0 && along < length && flareTo.lengthSq() - along * along < world.radius * world.radius
    })
  }
  /** Places the ghosts on the line from the Sun through the middle of the view. Returns false when there is nothing to draw. */
  function placeFlare(aspect: number, height: number) {
    flarePoint.copy(centre).project(camera)
    const inView = flarePoint.z < 1 && Math.abs(flarePoint.x) < 1.05 && Math.abs(flarePoint.y) < 1.05
    if (!inView || sunBlocked()) return false
    flareCamera.left = -aspect; flareCamera.right = aspect
    flareCamera.updateProjectionMatrix()
    // Ghosts are strongest when the Sun is off the middle of the view, and fade in the air.
    const strength = THREE.MathUtils.smoothstep(Math.hypot(flarePoint.x, flarePoint.y), 0.05, 0.4) * (1 - air.density * 0.5)
    ghosts.forEach((ghost, i) => {
      const along = 1 - 2 * ghost.userData.place
      ghost.position.set(flarePoint.x * aspect * along, flarePoint.y * along, 0)
      ghost.scale.setScalar(LENS_FLARE[i][0] / height * 2)
      ghost.material.opacity = 0.55 * strength
    })
    return strength > 0
  }
  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold)
  composer.addPass(renderPass)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const rig = createFairyRig({ withTrail: false })
  const fairy = rig.root
  const animation = createSkyDancerAnimation(rig)
  const fairyLight = new THREE.PointLight(0xffca8c, 0.6, 7, 2)
  fairyLight.position.set(0, 1.5, 0.8)
  fairy.add(fairyLight)
  scene.add(fairy)

  // ---- The rules of updateEnvironment() in src/main.ts --------------------------------------------
  const skyTint = new THREE.Color(), mistTint = new THREE.Color(), cloudWhite = new THREE.Color(0xf0f3ed)
  const sunColor = new THREE.Color(0xffebcc), lowSunColor = new THREE.Color(0xffa267)
  const dayAmbientSky = new THREE.Color(0xd9efff), nightAmbientSky = new THREE.Color(0xa8bced)
  const dayAmbientGround = new THREE.Color(0x65794e), nightAmbientGround = new THREE.Color(0x3c3a5a)
  const earthProfile = skyProfile(earth), fullDay = daylightAt(90)
  const air = { density: 0, tint: new THREE.Color(1, 1, 1), elevation: 90 }
  function environment(world: World, anchor: THREE.Vector3) {
    const altitude = camera.position.distanceTo(world.group.position) - world.radius
    const density = world.atmosphere ? 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08) : 0
    const cloudMist = world.cloudHeight ? Math.exp(-Math.pow((altitude - world.cloudHeight - 4) / 6, 2)) * density : 0
    const light = world === sun ? fullDay : daylightAt(solarElevation(anchor, world.group.position, centre))
    const profile = world === earth ? earthProfile : skyProfile(world)
    skyColor(profile, light, skyTint)
    mistTint.copy(cloudWhite).lerp(skyTint, light.night)
    fog.color.copy(skyTint).lerp(mistTint, cloudMist * 0.65)
    fog.density = 0.0018 / PROPORTIONS.size * density + cloudMist * 0.023
    ;(scene.background as THREE.Color).copy(SPACE).lerp(skyTint, density * 0.78)
    stars.update(camera.position, 1 - density * (1 - light.stars * profile.starClarity), renderer.getPixelRatio())
    sunlight.color.copy(sunColor).lerp(lowSunColor, light.twilight * density)
    const normal = anchor.clone().sub(world.group.position).normalize()
    const surfaceDay = THREE.MathUtils.lerp(1, light.day, density)
    ambient.position.copy(normal)
    ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
    ambient.color.copy(nightAmbientSky).lerp(dayAmbientSky, surfaceDay)
    ambient.groundColor.copy(nightAmbientGround).lerp(dayAmbientGround, surfaceDay)
    // The proposal: the Sun seen through the air has the colour of the sunlight there.
    air.density = density
    air.elevation = light.elevation
    air.tint.setRGB(sunlight.color.r / sunColor.r, sunlight.color.g / sunColor.g, sunlight.color.b / sunColor.b)
    // The low Sun is also dimmer.
    air.tint.multiplyScalar(THREE.MathUtils.lerp(1, LOW_SUN_DIM, light.twilight * density))
  }

  // ---- Camera ------------------------------------------------------------------------------------
  const orbit = { yaw: 0, pitch: 0, zoom: 1 }
  let settings: StudySettings | null = null
  let dragging: { x: number; y: number } | null = null
  canvas.addEventListener('pointerdown', event => { dragging = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId) })
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return
    orbit.yaw -= (event.clientX - dragging.x) * 0.005
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (event.clientY - dragging.y) * 0.004, -1.1, 1.1)
    dragging = { x: event.clientX, y: event.clientY }
  })
  canvas.addEventListener('pointerup', () => { dragging = null })
  canvas.addEventListener('wheel', event => { event.preventDefault(); orbit.zoom = THREE.MathUtils.clamp(orbit.zoom * Math.exp(event.deltaY * 0.001), 0.5, 2.5) }, { passive: false })
  canvas.addEventListener('keydown', event => {
    const step: Record<string, () => void> = {
      ArrowLeft: () => { orbit.yaw += 0.1 }, ArrowRight: () => { orbit.yaw -= 0.1 },
      ArrowUp: () => { orbit.pitch = Math.min(1.1, orbit.pitch + 0.08) }, ArrowDown: () => { orbit.pitch = Math.max(-1.1, orbit.pitch - 0.08) },
      '+': () => { orbit.zoom = Math.max(0.5, orbit.zoom * 0.9) }, '=': () => { orbit.zoom = Math.max(0.5, orbit.zoom * 0.9) }, '-': () => { orbit.zoom = Math.min(2.5, orbit.zoom * 1.1) },
    }
    if (step[event.key]) { event.preventDefault(); step[event.key]() }
  })
  const resetView = () => { orbit.yaw = 0; orbit.pitch = 0; orbit.zoom = 1 }

  const loop = new THREE.Vector3(), axis = new THREE.Vector3(), across = new THREE.Vector3(), direction = new THREE.Vector3()
  const forward = new THREE.Vector3(), back = new THREE.Vector3(), right = new THREE.Vector3(), aim = new THREE.Vector3(), normal = new THREE.Vector3()
  const toSun = new THREE.Vector3(), basis = new THREE.Matrix4()
  const meadow = meadowNormal(earth)
  let meadowHeight: SunHeight | null = null

  /** The first prominence now: its direction from the centre, the line between its feet, and the direction across it. */
  function firstProminence(time: number) {
    const first = PROMINENCES[0], spin = spinAngle(time)
    sunDirection(first.latitude, first.longitude, loop).applyAxisAngle(up, spin)
    const east = new THREE.Vector3(0, 1, 0).cross(loop).normalize(), north = new THREE.Vector3().crossVectors(loop, east)
    const tilt = THREE.MathUtils.degToRad(first.tilt)
    axis.copy(east).multiplyScalar(Math.cos(tilt)).addScaledVector(north, Math.sin(tilt)).normalize()
    across.crossVectors(axis, loop).normalize()
  }

  /** Puts the fairy with the camera of the game behind her: (0, 2.8, 8), looking 12 m ahead. */
  function fly(position: THREE.Vector3, localUp: THREE.Vector3, heading: THREE.Vector3, lookUp = 0) {
    fairy.position.copy(position)
    forward.copy(heading).addScaledVector(localUp, -heading.dot(localUp)).normalize().applyAxisAngle(localUp, orbit.yaw)
    back.copy(forward).negate()
    right.crossVectors(localUp, back).normalize()
    fairy.quaternion.setFromRotationMatrix(basis.makeBasis(right, localUp, back))
    camera.up.copy(localUp)
    camera.position.copy(position).addScaledVector(localUp, 2.8 + orbit.pitch * 6).addScaledVector(back, 8 * orbit.zoom)
    aim.copy(position).addScaledVector(forward, 12).addScaledVector(localUp, 12 * Math.tan(lookUp))
    camera.lookAt(aim)
  }

  /** Puts the camera for the view. Returns the world that decides the light, and the anchor for its rules. */
  function place(view: View, time: number, height: SunHeight): { world: World; anchor: THREE.Vector3 } {
    fairy.visible = view === 'surface' || view === 'meadow'
    camera.up.copy(up)
    if (view === 'space') {
      // From the side of Earth, 4.4 radii from the centre: the whole disc, the corona and the limb.
      toSun.copy(earth.group.position).sub(centre).normalize()
      direction.copy(toSun).applyAxisAngle(up, 0.35 + orbit.yaw)
      const elevation = THREE.MathUtils.clamp(0.1 + orbit.pitch, -1.3, 1.3)
      direction.multiplyScalar(Math.cos(elevation)).addScaledVector(up, Math.sin(elevation)).normalize()
      camera.position.copy(centre).addScaledVector(direction, radius * 4.4 * orbit.zoom)
      camera.lookAt(centre)
      return { world: sun, anchor: camera.position }
    }
    firstProminence(time)
    if (view === 'limb') {
      // 1.5 radii from the centre. The first prominence stands on the limb; the limb is the horizon.
      const tangent = Math.acos(1 / 1.5)
      direction.copy(loop).multiplyScalar(Math.cos(tangent)).addScaledVector(across, Math.sin(tangent)).normalize()
      direction.applyAxisAngle(loop, orbit.yaw * 0.5)
      camera.position.copy(centre).addScaledVector(direction, radius * 1.5 * (1 + (orbit.zoom - 1) * 0.4))
      camera.up.copy(loop)
      aim.copy(centre).addScaledVector(loop, radius * (1.1 + orbit.pitch * 0.15))
      camera.lookAt(aim)
      return { world: sun, anchor: camera.position }
    }
    if (view === 'surface') {
      // In flight 40 m above the Sun, 0.33 radians before the first prominence, flying toward it.
      normal.copy(loop).applyAxisAngle(axis, -0.33)
      forward.copy(across).applyAxisAngle(axis, -0.33)
      fly(direction.copy(centre).addScaledVector(normal, radius + 40), normal.clone(), forward.clone(), 0.1)
      return { world: sun, anchor: fairy.position }
    }
    // The meadow of the game start, with the Sun at the chosen height. Earth turns so; the Sun and Earth do not move.
    if (meadowHeight !== height) {
      earth.group.rotation.y = morningSpin(meadow, earth.group.position, centre, HEIGHTS[height])
      earth.group.updateMatrixWorld()
      meadowHeight = height
    }
    normal.copy(meadow).applyQuaternion(earth.group.quaternion)
    const ground = earth.group.position.clone().addScaledVector(normal, surfaceRadius(earth, normal) + 7)
    toSun.copy(centre).sub(ground).normalize()
    const elevation = Math.asin(THREE.MathUtils.clamp(toSun.dot(normal), -1, 1))
    fly(ground, normal.clone(), toSun.clone(), THREE.MathUtils.clamp(elevation * 0.72, 0, 0.7) + orbit.pitch * 0.4)
    return { world: earth, anchor: fairy.position }
  }

  /** Shows one option. Returns the look, or null for today. */
  function applyLook(option: SunOption, phone: boolean) {
    const today = option === 'today'
    before.visible = today
    for (const look of looks.values()) look.root.visible = false
    if (today) return null
    const look = lookOf(option !== 'retune', phone)
    look.root.visible = true
    return look
  }

  // ---- Loop --------------------------------------------------------------------------------------
  let previous = performance.now(), frame = 0, time = 0
  let measured = { calls: 0, triangles: 0 }
  const size = new THREE.Vector2()
  function resize() {
    renderer.setSize(host.clientWidth || 800, host.clientHeight || 600, false)
    renderer.getDrawingBufferSize(size)
    composer.setPixelRatio(1)
    composer.setSize(size.x, size.y)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  /** Draws one frame of the settings: one option, or today and the option side by side. */
  function draw(current: StudySettings) {
    const { world, anchor } = place(current.view, time, current.height)
    animation.update(0.016, false)
    sunShading.track(scene)
    sunShading.update(worlds)
    renderer.getSize(size)
    const options: SunOption[] = current.split && current.option !== 'today' ? ['today', current.option] : [current.option]
    const width = size.x / options.length
    renderer.setScissorTest(options.length > 1)
    renderer.info.reset()
    options.forEach((option, index) => {
      const look = applyLook(option, current.phone)
      scene.updateMatrixWorld()
      environment(world, anchor)
      updatePlanetLooks(worlds, camera.position)
      look?.update({ time, air: air.density, tint: air.tint, boost: option === 'camera' ? CAMERA_BOOST : 1 })
      camera.aspect = width / size.y
      camera.updateProjectionMatrix()
      renderer.setViewport(width * index, 0, width, size.y)
      renderer.setScissor(width * index, 0, width, size.y)
      if (option === 'camera') {
        composer.render()
        if (placeFlare(camera.aspect, size.y)) {
          renderer.autoClear = false
          renderer.render(flareScene, flareCamera)
          renderer.autoClear = true
        }
      } else renderer.render(scene, camera)
    })
    measured = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }
  }

  function render(nowMs: number) {
    frame = requestAnimationFrame(render)
    const delta = Math.min((nowMs - previous) / 1000, 0.1); previous = nowMs
    if (document.hidden || !settings) return
    if (settings.motion) time += delta
    draw(settings)
  }
  frame = requestAnimationFrame(render)

  return {
    canvas,
    apply(next: StudySettings) {
      const viewChanged = !settings || settings.view !== next.view
      settings = { ...next }
      if (viewChanged) resetView()
      if (next.phone) lookOf(true, true)
    },
    resetView,
    /**
     * Frame time of each option in this view: `frames` frames after three frames to warm up.
     * A read of one pixel waits for the graphics card after the last frame.
     */
    measure(frames = 30) {
      if (!settings) return {}
      const gl = renderer.getContext(), pixel = new Uint8Array(4)
      const result: Partial<Record<SunOption, number>> = {}
      for (const option of SUN_OPTIONS) {
        const current = { ...settings, option, split: false }
        for (let i = 0; i < 3; i++) draw(current)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        const started = performance.now()
        for (let i = 0; i < frames; i++) draw(current)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        result[option] = (performance.now() - started) / frames
      }
      return result
    },
    /** Draws one frame and reads the pixel at the centre of the Sun. Null when the centre is out of view. */
    probe() {
      if (!settings) return null
      draw({ ...settings, split: false })
      const point = centre.clone().project(camera), buffer = new THREE.Vector2()
      if (Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || point.z > 1) return null
      renderer.getDrawingBufferSize(buffer)
      const gl = renderer.getContext(), pixel = new Uint8Array(4)
      gl.readPixels(Math.round((point.x + 1) / 2 * (buffer.x - 1)), Math.round((point.y + 1) / 2 * (buffer.y - 1)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
      return [pixel[0], pixel[1], pixel[2]]
    },
    get stats() {
      const distance = camera.position.distanceTo(centre)
      return {
        option: settings?.option, view: settings?.view, time: +time.toFixed(2),
        distance: +(distance / radius).toFixed(3), width: +apparentWidth(distance, radius).toFixed(2),
        elevation: +air.elevation.toFixed(1), air: +air.density.toFixed(3),
        canvas: [size.x, size.y],
        looks: [...looks.keys()],
        ...measured,
      }
    },
    /** The living look, for the tests: its prominence group. */
    living,
    dispose() {
      cancelAnimationFrame(frame); observer.disconnect()
      composer.dispose(); renderer.dispose(); canvas.remove()
    },
  }
}
