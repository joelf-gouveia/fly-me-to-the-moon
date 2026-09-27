import * as THREE from 'three'
import { createStarSky } from '../stars'
import { createTerrain, seededRandom } from '../terrain'
import { BELT_BASE, sampleBeltPoint } from '../belt'
import { MOON, moonGroundColor, moonOffset, MOON_SIDEREAL_SECONDS } from '../moon'
import { layout, metrics } from './model'
import type { Body, Proportions } from './model'

export type View = 'system' | 'far' | 'pair' | 'ground'

const SPACE = new THREE.Color(0x02030f)

function softDisc(color: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, color); gradient.addColorStop(0.18, color); gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * A world whose ground heights stay in metres, as in the game. When the radius grows,
 * the same hills are a smaller part of the world.
 */
function reliefWorld(kind: 'earth' | 'moon', seed: number, segments: [number, number]) {
  const sample = createTerrain(kind, seed)
  const geometry = new THREE.SphereGeometry(1, ...segments)
  const position = geometry.attributes.position
  const directions = new Float32Array(position.count * 3), heights = new Float32Array(position.count), colors = new Float32Array(position.count * 3)
  const direction = new THREE.Vector3(), color = new THREE.Color()
  const grass = new THREE.Color(0x679a43), sand = new THREE.Color(0xd5c395), stone = new THREE.Color(0x85817a), snow = new THREE.Color(0xdfe7e5)
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize()
    const s = sample(direction.x, direction.y, direction.z)
    directions.set([direction.x, direction.y, direction.z], i * 3)
    heights[i] = kind === 'earth' ? Math.max(-1.3, s.height) : s.height
    if (kind === 'moon') moonGroundColor(direction, s, color)
    else {
      color.copy(s.height < 0.7 ? sand : s.height > 8.5 ? stone : grass)
      if (Math.abs(direction.y) > 0.9 || s.height > 12) color.copy(snow)
      if (s.height < 0) color.setHex(0x208dad)
      color.multiplyScalar(0.87 + s.detail * 0.22 + Math.max(0, s.height) * 0.014)
    }
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 })
  const mesh = new THREE.Mesh(geometry, material)
  return {
    mesh,
    resize(radius: number) {
      for (let i = 0; i < position.count; i++) {
        const r = radius + Math.max(0, heights[i])
        position.setXYZ(i, directions[i * 3] * r, directions[i * 3 + 1] * r, directions[i * 3 + 2] * r)
      }
      position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
    },
  }
}

export function createProportionsScene(host: HTMLElement, labelHost: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of the solar system at the chosen proportions. Drag or use the arrow keys to turn. Scroll or use plus and minus to zoom.')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = SPACE.clone()
  const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 400000)
  // The game lights in open space.
  scene.add(new THREE.HemisphereLight(0xd9efff, 0x65794e, 1.1))
  const stars = createStarSky(scene)

  const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshBasicMaterial({ color: 0xffd78d }))
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('rgba(255,185,90,1)'), color: 0xffbf70, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.setScalar(2450 / 600)
  sun.add(glow)
  scene.add(sun, new THREE.PointLight(0xffebcc, 2.4, 0, 0))

  const earth = reliefWorld('earth', 0x20260926, [256, 128])
  const moon = reliefWorld('moon', MOON.seed, [128, 96])
  earth.mesh.name = 'Earth'; moon.mesh.name = 'Moon'
  scene.add(earth.mesh, moon.mesh)

  const start = layout({ size: 1, sun: 1, spacing: 1, moonOrbit: 5, moonSize: 0.273, speed: 1 })
  const bodies = new Map<string, THREE.Mesh>()
  for (const body of [...start.planets, ...start.dwarfs, start.home]) {
    if (body.kind === 'earth') { bodies.set(body.name, earth.mesh); continue }
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ color: body.color, roughness: 1 }))
    mesh.name = body.name
    if (body.kind === 'saturn') for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.3 + i * 0.15, 1.42 + i * 0.15, 128),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9b896d : 0xdacaa2, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }))
      ring.rotation.x = Math.PI / 2.3
      mesh.add(ring)
    }
    scene.add(mesh)
    bodies.set(body.name, mesh)
  }

  // Orbit lines: circles around the Sun, and the Moon's tilted path around Earth.
  const lines = new THREE.Group()
  scene.add(lines)
  const circle = (radius: number) => Array.from({ length: 257 }, (_, i) => new THREE.Vector3(Math.cos(i / 256 * Math.PI * 2) * radius, 0, Math.sin(i / 256 * Math.PI * 2) * radius))
  for (const body of start.planets) {
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle(1)), new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.3, depthWrite: false }))
    line.name = `${body.name}-path`
    lines.add(line)
  }
  const moonPath = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.6, depthWrite: false }))
  scene.add(moonPath)

  // The asteroid belt as dust. Built once at today's spacing; the group scales with spacing.
  const random = seededRandom(0xd057), dust = new Float32Array(5000 * 3)
  for (let i = 0; i < 5000; i++) { const p = sampleBeltPoint(random, 1, BELT_BASE); dust.set([p.x, p.y, p.z], i * 3) }
  const beltGeometry = new THREE.BufferGeometry()
  beltGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3))
  const belt = new THREE.Points(beltGeometry, new THREE.PointsMaterial({ color: 0xcdbb9c, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }))
  belt.frustumCulled = false
  scene.add(belt)

  type Label = { element: HTMLSpanElement; target: THREE.Object3D; show: () => boolean }
  const labels: Label[] = []
  let view: View = 'far', settings: Proportions = { size: 1, sun: 1, spacing: 1, moonOrbit: 5, moonSize: 0.273, speed: 1 }
  function label(text: string, target: THREE.Object3D, show: () => boolean, kind = '') {
    const element = document.createElement('span')
    element.className = `size-label ${kind}`
    element.textContent = text
    labelHost.append(element)
    labels.push({ element, target, show })
  }
  label('Sun', sun, () => view !== 'ground')
  for (const [name, mesh] of bodies) label(name, mesh, () => view === 'system' || view === 'far' || (view === 'pair' && name === 'Earth'), name === 'Earth' ? 'earth' : '')
  label('Moon', moon.mesh, () => true, 'moon')

  const orbit = { yaw: 0, pitch: 0, distance: 1 }
  let current = start
  const reach = () => ({
    system: current.planets[7].orbit * 2.3, far: metrics(settings, false).nearestDistance * 0.95,
    pair: current.moon.orbit * 2.6, ground: 1,
  })[view]
  function resetView() {
    orbit.yaw = { system: 0.4, far: 0, pair: 0.3, ground: 0 }[view]
    orbit.pitch = { system: 0.9, far: 0.18, pair: 0.25, ground: 0 }[view]
    orbit.distance = reach()
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
      const [a, b] = [...pointers.values()], gap = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch) zoom(pinch / gap)
      pinch = gap
      return
    }
    orbit.yaw -= (event.clientX - last.x) * 0.005
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (event.clientY - last.y) * 0.005, -1.4, 1.45)
  })
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); if (pointers.size < 2) pinch = 0 }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  function zoom(factor: number) {
    if (view === 'ground') return
    orbit.distance = THREE.MathUtils.clamp(orbit.distance * factor, reach() * 0.15, reach() * 3)
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

  const setBody = (mesh: THREE.Object3D, body: Body) => { mesh.position.set(body.position.x, body.position.y, body.position.z); if (mesh !== earth.mesh) mesh.scale.setScalar(body.radius) }
  let lastSize = -1, lastMoon = -1, first = true
  function apply(next: Proportions, nextView: View) {
    const viewChanged = first || nextView !== view
    first = false
    settings = { ...next }; view = nextView
    current = layout(settings)
    sun.scale.setScalar(current.sunRadius)
    if (settings.size !== lastSize) { earth.resize(current.earth.radius); lastSize = settings.size }
    if (current.moon.radius !== lastMoon) { moon.resize(current.moon.radius); lastMoon = current.moon.radius }
    for (const body of [...current.planets, ...current.dwarfs, current.home]) setBody(bodies.get(body.name)!, body)
    moon.mesh.position.set(current.moon.position.x, current.moon.position.y, current.moon.position.z)
    // Tidal lock: the near side (+X) faces Earth.
    moon.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), earth.mesh.position.clone().sub(moon.mesh.position).normalize())
    lines.children.forEach((line, i) => line.scale.setScalar(current.planets[i].orbit))
    const points = Array.from({ length: 256 }, (_, i) => { const p = moonOffset(i / 256 * MOON_SIDEREAL_SECONDS, { radius: current.moon.orbit, inclination: MOON.inclination }); return new THREE.Vector3(p.x, p.y, p.z) })
    moonPath.geometry.dispose()
    moonPath.geometry = new THREE.BufferGeometry().setFromPoints(points)
    moonPath.position.copy(earth.mesh.position)
    belt.scale.setScalar(settings.spacing)
    if (viewChanged) resetView()
    else orbit.distance = THREE.MathUtils.clamp(orbit.distance, reach() * 0.15, reach() * 3)
  }
  function refit() { resetView() }

  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  const up = new THREE.Vector3(0, 1, 0), pivot = new THREE.Vector3(), back = new THREE.Vector3(), side = new THREE.Vector3(), offset = new THREE.Vector3(), projected = new THREE.Vector3()
  let frame = 0, measured = { calls: 0, triangles: 0 }
  function render() {
    frame = requestAnimationFrame(render)
    if (document.hidden) return
    camera.up.copy(up)
    if (view === 'ground') {
      // Stand on Earth 50° from the point below the Moon: the Moon is about 40° above the horizon.
      const toMoon = moon.mesh.position.clone().sub(earth.mesh.position).normalize()
      const axis = new THREE.Vector3().crossVectors(toMoon, up).normalize()
      const normal = toMoon.clone().applyAxisAngle(axis, THREE.MathUtils.degToRad(50))
      camera.position.copy(earth.mesh.position).addScaledVector(normal, current.earth.radius + 20)
      camera.up.copy(normal)
      const look = moon.mesh.position.clone()
      const turn = new THREE.Quaternion().setFromAxisAngle(normal, orbit.yaw)
      camera.lookAt(look.sub(camera.position).applyQuaternion(turn).add(camera.position).addScaledVector(normal, orbit.pitch * 400))
    } else {
      if (view === 'system') { pivot.set(0, 0, 0); back.set(0.5, 0, 0.87) }
      else if (view === 'far') {
        // From open space beyond Earth, toward the Sun: where the Moon looked like a planet.
        pivot.copy(earth.mesh.position); back.copy(earth.mesh.position).normalize()
      } else { pivot.copy(earth.mesh.position); back.copy(moon.mesh.position).sub(earth.mesh.position).setY(0).normalize().applyAxisAngle(up, Math.PI / 2) }
      side.crossVectors(up, back).normalize()
      offset.copy(back).multiplyScalar(Math.cos(orbit.yaw)).addScaledVector(side, Math.sin(orbit.yaw))
        .multiplyScalar(Math.cos(orbit.pitch)).addScaledVector(up, Math.sin(orbit.pitch)).multiplyScalar(orbit.distance)
      camera.position.copy(pivot).add(offset)
      camera.lookAt(pivot)
    }
    stars.update(camera.position, 1, renderer.getPixelRatio())
    const width = canvas.clientWidth, height = canvas.clientHeight
    for (const item of labels) {
      item.target.getWorldPosition(projected)
      const radius = item.target === sun ? current.sunRadius : item.target === earth.mesh ? current.earth.radius : item.target === moon.mesh ? current.moon.radius : item.target.scale.x
      projected.addScaledVector(camera.up, radius * 1.3)
      const gap = projected.distanceTo(camera.position)
      projected.project(camera)
      const visible = item.show() && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && gap > 2
      item.element.hidden = !visible
      if (visible) item.element.style.transform = `translate(${(projected.x + 1) / 2 * width}px, ${(1 - projected.y) / 2 * height}px)`
    }
    lines.visible = moonPath.visible = view !== 'ground'
    renderer.render(scene, camera)
    measured = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }
  }
  frame = requestAnimationFrame(render)

  return {
    apply, refit,
    /** Values in this preview, for the smoke test. */
    get stats() {
      return {
        earthRadius: current.earth.radius, earthMesh: +(earth.mesh.geometry.boundingSphere?.radius ?? 0).toFixed(1),
        moonOrbit: +moon.mesh.position.distanceTo(earth.mesh.position).toFixed(1),
        earthOrbit: +earth.mesh.position.length().toFixed(1),
        beltScale: belt.scale.x, view, ...measured,
      }
    },
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose(); canvas.remove() },
  }
}
