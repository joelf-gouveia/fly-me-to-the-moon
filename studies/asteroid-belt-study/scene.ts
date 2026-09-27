import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { createStarSky } from '../../src/stars'
import { createFairyRig, createSkyDancerAnimation } from '../../src/fairy'
import { createTerrain, seededRandom } from '../../src/terrain'
import { HOME_START_BASE as HOME_START_POSITION } from '../../src/worlds'
import {
  auToGame, BELT, BOOST_SPEED, budget, CELL, cellRocks, dwarfPosition, DWARF_WORLDS, HOME_EXTENT, JUPITER,
  KIRKWOOD_GAPS, MARS, NEAR_RANGE, nearCellsAround, OPTIONS, ringRocks, ROCK_VARIANTS, sampleBeltPoint, SPACE_SPEED,
  beltDensity, gameToAu,
} from './model'
import type { BeltOption, Device, Rock } from './model'

export type View = 'system' | 'mars' | 'inside' | 'ceres'
export type Flight = 'hover' | 'cruise' | 'boost'
export type StudySettings = { option: BeltOption; device: Device; view: View; clearances: boolean; orbitSpeed: number; flight: Flight }

// A copy of `data` in src/worlds.ts: name, radius, orbit, angle, colour.
const PLANETS = [
  ['Mercury', 95, 1400, 0.28, 0xb7a58d], ['Venus', 170, 2250, 1.18, 0xd5a36d], ['Earth', 220, 3300, 0.08, 0x83c5e8],
  ['Mars', MARS.radius, MARS.orbit, MARS.angle, 0xd7a087], ['Jupiter', JUPITER.radius, JUPITER.orbit, JUPITER.angle, 0xd7bb9c],
  ['Saturn', 390, 8500, 5.18, 0xe1cb9e], ['Uranus', 285, 10900, 3.05, 0x96d9df], ['Neptune', 275, 13600, 5.82, 0x638ecb],
] as const
const SOLAR_ORBIT_SECONDS = 3600
const PATH_RADIUS = 5180, PATH_HEIGHT = 10
const ROCK_COLORS = [0x6f6861, 0xa08c72, 0x8f9398, 0x9b8fa8].map(hex => new THREE.Color(hex))

function softDisc(color: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, color); gradient.addColorStop(0.18, color); gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A lumpy rock: an icosahedron pushed in and out by noise. Faces stay flat. */
function rockGeometry(variant: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const noise = createNoise3D(seededRandom(700 + variant)), position = geometry.attributes.position
  const stretch = [[1, 0.72, 0.86], [1.15, 0.8, 0.7], [0.9, 0.9, 0.95], [1.3, 0.62, 0.78]][variant]
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    // Displacement from the position alone, so shared corners stay joined.
    const bump = 1 + noise(v.x * 1.7, v.y * 1.7, v.z * 1.7) * 0.28
    position.setXYZ(i, v.x * bump * stretch[0], v.y * bump * stretch[1], v.z * bump * stretch[2])
  }
  geometry.computeVertexNormals()
  return geometry
}

function dwarfGeometry(world: typeof DWARF_WORLDS[number]) {
  const geometry = new THREE.SphereGeometry(1, 96, 64)
  const sample = createTerrain('mercury', world.id === 'ceres' ? 11 : 23)
  const position = geometry.attributes.position, colors = new Float32Array(position.count * 3)
  const direction = new THREE.Vector3(), color = new THREE.Color(), base = new THREE.Color(world.color)
  // Ceres has bright salt spots in Occator crater. Vesta has a large south-pole basin.
  const spot = new THREE.Vector3(0.35, 0.45, 0.82).normalize()
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize()
    const s = sample(direction.x, direction.y, direction.z)
    // Ceres is round enough to be a dwarf planet; Vesta is lumpier.
    let height = s.height * (world.id === 'ceres' ? 0.13 : 0.26)
    if (world.id === 'vesta') height -= Math.max(0, -direction.y - 0.6) * 9
    position.setXYZ(i, direction.x * (world.radius + height), direction.y * (world.radius + height), direction.z * (world.radius + height))
    color.copy(base).multiplyScalar(0.85 + s.detail * 0.18 + height * 0.02)
    if (world.id === 'ceres' && direction.angleTo(spot) < 0.07) color.setHex(0xf1eee4)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createBeltScene(host: HTMLElement, labelHost: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', 'Live 3D view of the asteroid belt. Drag or use the arrow keys to turn. Scroll or use plus and minus to zoom.')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x02030f)
  const camera = new THREE.PerspectiveCamera(58, 1, 0.2, 60000)

  // The same light as the game in open space.
  scene.add(new THREE.HemisphereLight(0xd9efff, 0x65794e, 1.1))
  const stars = createStarSky(scene)

  // Every world orbits in the same hour, so the system turns as one piece.
  const system = new THREE.Group()
  scene.add(system)
  const sun = new THREE.Mesh(new THREE.SphereGeometry(600, 64, 40), new THREE.MeshBasicMaterial({ color: 0xffd78d }))
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('rgba(255,185,90,1)'), color: 0xffbf70, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.setScalar(2450)
  sun.add(glow, new THREE.PointLight(0xffebcc, 2.4, 0, 0))
  system.add(sun)

  const planets = new Map<string, THREE.Mesh>()
  const orbitLines = new THREE.Group()
  function orbitLine(radius: number, color: number, opacity = 0.34, y = 0) {
    const points = Array.from({ length: 257 }, (_, i) => new THREE.Vector3(Math.cos(i / 256 * Math.PI * 2) * radius, y, Math.sin(i / 256 * Math.PI * 2) * radius))
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
  }
  for (const [name, radius, orbit, angle, color] of PLANETS) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), new THREE.MeshStandardMaterial({ color, roughness: 1 }))
    mesh.position.set(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit)
    if (name === 'Saturn') for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius * (1.3 + i * 0.15), radius * (1.42 + i * 0.15), 128),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9b896d : 0xdacaa2, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }))
      ring.rotation.x = Math.PI / 2.3
      mesh.add(ring)
    }
    system.add(mesh)
    planets.set(name, mesh)
    orbitLines.add(orbitLine(orbit, color))
  }
  const home = new THREE.Mesh(new THREE.SphereGeometry(110, 48, 32), new THREE.MeshStandardMaterial({ color: 0xf3acd1, roughness: 1 }))
  home.position.set(...HOME_START_POSITION)
  system.add(home, orbitLines)

  // Safety zones: the space that Mars, Jupiter and a relocated Blossom Haven need.
  const zones = new THREE.Group()
  function band(inner: number, outer: number, color: number, opacity: number) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }))
    mesh.rotation.x = -Math.PI / 2
    return mesh
  }
  const marsOccupied = MARS.radius + MARS.atmosphere, jupiterOccupied = JUPITER.radius + JUPITER.atmosphere
  zones.add(band(MARS.orbit - marsOccupied, MARS.orbit + marsOccupied, 0xd7a087, 0.16))
  zones.add(band(JUPITER.orbit - jupiterOccupied, JUPITER.orbit + jupiterOccupied, 0xd7bb9c, 0.13))
  zones.add(band(BELT.inner - HOME_EXTENT, BELT.inner, 0xf3acd1, 0.12), band(BELT.outer, BELT.outer + HOME_EXTENT, 0xf3acd1, 0.12))
  zones.add(orbitLine(BELT.inner, 0xefc88a, 0.8), orbitLine(BELT.outer, 0xefc88a, 0.8))
  for (const gap of KIRKWOOD_GAPS) zones.add(orbitLine(auToGame(gap.au), 0x9fb6d8, 0.35))
  system.add(zones)

  // Far layer: dust points. The first N points are a fair sample, so a phone draws a prefix.
  const dustMax = Math.max(...Object.values(OPTIONS).map(option => option.desktop.dust))
  const random = seededRandom(0xd057), dustPositions = new Float32Array(dustMax * 3), dustColors = new Float32Array(dustMax * 3)
  const dustTint = [new THREE.Color(0xe8d7b8), new THREE.Color(0xcfc3d8), new THREE.Color(0xf2c894)]
  for (let i = 0; i < dustMax; i++) {
    const p = sampleBeltPoint(random)
    dustPositions.set([p.x, p.y, p.z], i * 3)
    const c = dustTint[Math.floor(random() * 3)].clone().multiplyScalar(0.55 + random() * 0.45)
    dustColors.set([c.r, c.g, c.b], i * 3)
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3))
  const dustMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 600 }, uSize: { value: 14 } },
    vertexShader: `attribute vec3 color; varying vec3 vColor; uniform float uScale; uniform float uSize;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * uScale / -mv.z, 1.2, 5.0);
      }`,
    fragmentShader: `varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vColor, pow(max(0.0, 1.0 - d), 1.6) * 0.9);
        #include <colorspace_fragment>
      }`,
  })
  const dust = new THREE.Points(dustGeometry, dustMaterial)
  dust.name = 'belt-dust'
  dust.frustumCulled = false
  system.add(dust)

  // Far layer: a faint flat glow whose brightness follows the real belt, with its gaps.
  const densityData = new Uint8Array(512 * 4)
  for (let i = 0; i < 512; i++) densityData.set([255, 255, 255, Math.round(beltDensity(gameToAu(BELT.inner + i / 511 * (BELT.outer - BELT.inner))) * 255)], i * 4)
  const densityTexture = new THREE.DataTexture(densityData, 512, 1)
  densityTexture.magFilter = densityTexture.minFilter = THREE.LinearFilter
  densityTexture.needsUpdate = true
  const haze = new THREE.Mesh(new THREE.RingGeometry(BELT.inner, BELT.outer, 256, 4), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uDensity: { value: densityTexture }, uInner: { value: BELT.inner }, uOuter: { value: BELT.outer } },
    vertexShader: `varying vec2 vPlane; varying float vDistance;
      void main() {
        vPlane = position.xy;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDistance = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    // Inside the belt the glow fades out: near the fairy it would look like a grey floor.
    fragmentShader: `varying vec2 vPlane; varying float vDistance; uniform sampler2D uDensity; uniform float uInner; uniform float uOuter;
      void main() {
        float t = (length(vPlane) - uInner) / (uOuter - uInner);
        float density = texture2D(uDensity, vec2(t, 0.5)).a * smoothstep(600.0, 3500.0, vDistance);
        gl_FragColor = vec4(vec3(0.93, 0.8, 0.62) * density * 0.16, 1.0);
        #include <colorspace_fragment>
      }`,
  }))
  haze.name = 'belt-haze'
  haze.rotation.x = -Math.PI / 2
  system.add(haze)

  const geometries = Array.from({ length: ROCK_VARIANTS }, (_, variant) => rockGeometry(variant))
  const rockMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05, flatShading: true })
  const dummy = new THREE.Object3D(), tint = new THREE.Color()
  const rockColor = (rock: Rock) => tint.copy(ROCK_COLORS[Math.floor(rock.tint * 4) % 4]).multiplyScalar(0.8 + (rock.tint * 7 % 1) * 0.35)

  // Option B: the whole ring, placed once. A phone draws the first half of the list.
  const ringList = ringRocks(Math.max(...Object.values(OPTIONS).map(option => option.desktop.ring)))
  const ringMeshes = geometries.map((geometry, variant) => {
    const rocks = ringList.map((rock, index) => ({ rock, index })).filter(item => item.rock.variant === variant)
    const mesh = new THREE.InstancedMesh(geometry, rockMaterial, rocks.length)
    mesh.name = `ring-rocks-${variant}`
    rocks.forEach(({ rock }, i) => {
      dummy.position.set(rock.x, rock.y, rock.z)
      dummy.quaternion.setFromAxisAngle(new THREE.Vector3(rock.axis.x, rock.axis.y, rock.axis.z), rock.phase)
      dummy.scale.setScalar(rock.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, rockColor(rock))
    })
    mesh.computeBoundingSphere()
    system.add(mesh)
    return { mesh, order: rocks.map(item => item.index) }
  })

  // Option C: rocks in the cells around the camera. They tumble and fade at the edge.
  const nearCapacity = budget('living', 'desktop').nearRocksMax
  const nearMeshes = geometries.map((geometry, variant) => {
    const mesh = new THREE.InstancedMesh(geometry, rockMaterial, nearCapacity)
    mesh.name = `near-rocks-${variant}`
    mesh.frustumCulled = false
    mesh.count = 0
    mesh.setColorAt(0, tint.set(0xffffff))
    system.add(mesh)
    return mesh
  })
  const cellCache = new Map<string, Rock[]>()
  let nearRocks: Rock[] = [], nearKey = '', nearPerCell = 0, nearShown = 0
  const axis = new THREE.Vector3(), local = new THREE.Vector3(), fairyLocal = new THREE.Vector3()
  function updateNear(time: number) {
    if (!nearPerCell) { nearMeshes.forEach(mesh => { mesh.count = 0 }); nearShown = 0; return }
    local.copy(camera.position); system.worldToLocal(local)
    const key = `${Math.floor(local.x / CELL)},${Math.floor(local.y / CELL)},${Math.floor(local.z / CELL)},${nearPerCell}`
    if (key !== nearKey) {
      nearKey = key
      nearRocks = nearCellsAround(local).flatMap(([ix, iy, iz]) => {
        const id = `${ix},${iy},${iz},${nearPerCell}`
        if (!cellCache.has(id)) cellCache.set(id, cellRocks(ix, iy, iz, nearPerCell))
        return cellCache.get(id)!
      })
      if (cellCache.size > 600) cellCache.clear()
    }
    const counts = new Array(ROCK_VARIANTS).fill(0)
    const edge = CELL * NEAR_RANGE.across
    nearShown = 0
    for (const rock of nearRocks) {
      const distance = Math.hypot(rock.x - local.x, rock.y - local.y, rock.z - local.z)
      const clearFairy = Math.hypot(rock.x - fairyLocal.x, rock.y - fairyLocal.y, rock.z - fairyLocal.z) - rock.size
      // Fade in at the edge of the field; keep the camera and the fairy out of the rocks.
      const scale = THREE.MathUtils.smoothstep(edge - distance, 0, edge * 0.3) * THREE.MathUtils.smoothstep(distance - rock.size, 1, 4) * THREE.MathUtils.smoothstep(clearFairy, 1, 3)
      if (scale <= 0.001) continue
      const mesh = nearMeshes[rock.variant], i = counts[rock.variant]++
      dummy.position.set(rock.x, rock.y, rock.z)
      dummy.quaternion.setFromAxisAngle(axis.set(rock.axis.x, rock.axis.y, rock.axis.z), rock.phase + time * rock.spin)
      dummy.scale.setScalar(rock.size * scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, rockColor(rock))
      nearShown++
    }
    nearMeshes.forEach((mesh, variant) => {
      mesh.count = counts[variant]
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  }

  // Option C: Ceres and Vesta, at their real distances.
  const dwarfs = DWARF_WORLDS.map(world => {
    const mesh = new THREE.Mesh(dwarfGeometry(world), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }))
    const centre = dwarfPosition(world)
    mesh.position.set(centre.x, centre.y, centre.z)
    mesh.name = world.id
    system.add(mesh)
    return { world, mesh }
  })

  // The fairy flies once around the belt, inside it, for scale.
  const rig = createFairyRig({ withTrail: false })
  const animation = createSkyDancerAnimation(rig)
  const fairy = rig.root
  fairy.add(new THREE.PointLight(0xffca8c, 0.6, 7, 2))
  system.add(fairy)
  let fairyAngle = DWARF_WORLDS[0].angle - 0.16
  const basis = new THREE.Matrix4(), origin = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), heading = new THREE.Vector3()
  function placeFairy() {
    fairy.position.set(Math.cos(fairyAngle) * PATH_RADIUS, PATH_HEIGHT, Math.sin(fairyAngle) * PATH_RADIUS)
    heading.set(-Math.sin(fairyAngle), 0, Math.cos(fairyAngle))
    basis.lookAt(origin, heading, up)
    fairy.quaternion.setFromRotationMatrix(basis)
    fairyLocal.copy(fairy.position)
  }
  placeFairy()

  // Labels are HTML, so they stay sharp at every zoom.
  type Label = { element: HTMLSpanElement; target: THREE.Object3D | THREE.Vector3; lift: number; show: () => boolean }
  const labels: Label[] = []
  function label(text: string, target: Label['target'], lift: number, show: () => boolean, kind = '') {
    const element = document.createElement('span')
    element.className = `belt-label ${kind}`
    element.textContent = text
    labelHost.append(element)
    labels.push({ element, target, lift, show })
  }
  let settings: StudySettings | null = null
  for (const [name] of PLANETS) if (['Earth', 'Mars', 'Jupiter', 'Saturn'].includes(name)) label(name, planets.get(name)!, 1.3, () => true)
  label('Sun', sun, 1.2, () => true)
  for (const { world, mesh } of dwarfs) label(world.name, mesh, 1.3, () => settings?.option === 'living', 'dwarf')
  for (const gap of KIRKWOOD_GAPS) {
    // Spread along the ring beside the default view, so the four labels do not overlap.
    const radius = auToGame(gap.au), angle = -0.75 + KIRKWOOD_GAPS.indexOf(gap) * 0.14
    label(`${gap.resonance} gap`, new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius), 0, () => settings?.view === 'system' && !!settings?.clearances, 'gap')
  }
  label('You', fairy, 1.6, () => settings?.view === 'inside' || settings?.view === 'ceres', 'you')

  // Camera: each view orbits a pivot. Drag turns, the wheel zooms.
  const views: Record<View, { pivot: () => THREE.Vector3; back: () => THREE.Vector3; side: () => THREE.Vector3; distance: number; pitch: number; ahead: number; min: number; max: number }> = {
    system: { pivot: () => new THREE.Vector3(0, 0, 0), back: () => new THREE.Vector3(0.5, 0, 0.87), side: () => new THREE.Vector3(0.87, 0, -0.5), distance: 14500, pitch: 0.75, ahead: 0, min: 5000, max: 30000 },
    mars: { pivot: () => world(planets.get('Mars')!), back: () => radial(planets.get('Mars')!).negate(), side: () => tangent(planets.get('Mars')!), distance: 760, pitch: 0.16, ahead: 520, min: 300, max: 3000 },
    inside: { pivot: () => world(fairy), back: () => tangent(fairy).negate(), side: () => radial(fairy), distance: 9, pitch: 0.33, ahead: 0, min: 4, max: 400 },
    ceres: { pivot: () => world(dwarfs[0].mesh), back: () => radial(dwarfs[0].mesh).negate(), side: () => tangent(dwarfs[0].mesh), distance: 95, pitch: 0.28, ahead: 0, min: 40, max: 600 },
  }
  function world(object: THREE.Object3D) { return object.getWorldPosition(new THREE.Vector3()) }
  function radial(object: THREE.Object3D) { const p = world(object); return p.setY(0).normalize() }
  function tangent(object: THREE.Object3D) { const r = radial(object); return new THREE.Vector3(-r.z, 0, r.x) }
  const orbit = { yaw: 0, pitch: 0, distance: 1 }
  function resetView(view: View) {
    orbit.yaw = view === 'mars' ? -0.25 : 0
    orbit.pitch = views[view].pitch
    orbit.distance = views[view].distance
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
    const view = views[settings.view]
    orbit.distance = THREE.MathUtils.clamp(orbit.distance * factor, view.min, view.max)
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

  function apply(next: StudySettings) {
    const viewChanged = settings?.view !== next.view
    settings = { ...next }
    const layer = OPTIONS[next.option][next.device]
    dust.geometry.setDrawRange(0, layer.dust)
    haze.visible = layer.haze
    ringMeshes.forEach(({ mesh, order }) => {
      mesh.count = order.filter(index => index < layer.ring).length
      mesh.visible = mesh.count > 0
    })
    nearPerCell = layer.nearPerCell
    nearKey = ''
    dwarfs.forEach(({ mesh }) => { mesh.visible = layer.worlds > 0 })
    zones.visible = next.clearances
    if (viewChanged) resetView(next.view)
  }

  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
    dustMaterial.uniforms.uScale.value = height * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  let orbitTime = 0, rockTime = 0, previous = performance.now(), frame = 0
  let measured = { calls: 0, triangles: 0 }
  const pivot = new THREE.Vector3(), offset = new THREE.Vector3(), look = new THREE.Vector3(), projected = new THREE.Vector3()
  function render(now: number) {
    frame = requestAnimationFrame(render)
    const delta = Math.min((now - previous) / 1000, 0.1); previous = now
    if (document.hidden || !settings) return
    orbitTime = (orbitTime + delta * settings.orbitSpeed) % SOLAR_ORBIT_SECONDS
    system.rotation.y = -orbitTime / SOLAR_ORBIT_SECONDS * Math.PI * 2
    rockTime += delta
    const speed = settings.flight === 'hover' ? 0 : settings.flight === 'boost' ? BOOST_SPEED : SPACE_SPEED
    fairyAngle += speed * delta / PATH_RADIUS
    placeFairy()
    animation.update(delta, settings.flight === 'boost')
    dwarfs.forEach(({ world, mesh }) => { mesh.rotation.y += delta * Math.PI * 2 / world.spin })
    system.updateMatrixWorld()

    const view = views[settings.view]
    pivot.copy(view.pivot())
    const back = view.back(), side = view.side()
    offset.copy(back).multiplyScalar(Math.cos(orbit.yaw)).addScaledVector(side, Math.sin(orbit.yaw))
      .multiplyScalar(Math.cos(orbit.pitch)).addScaledVector(up, Math.sin(orbit.pitch)).multiplyScalar(orbit.distance)
    camera.position.copy(pivot).add(offset)
    look.copy(pivot).addScaledVector(back, -view.ahead)
    camera.up.copy(up)
    camera.lookAt(look)
    updateNear(rockTime)
    stars.update(camera.position, 1, renderer.getPixelRatio())

    const width = canvas.clientWidth, height = canvas.clientHeight
    for (const item of labels) {
      if (item.target instanceof THREE.Object3D) {
        item.target.getWorldPosition(projected)
        const radius = item.target instanceof THREE.Mesh ? (item.target.geometry.boundingSphere ?? (item.target.geometry.computeBoundingSphere(), item.target.geometry.boundingSphere!)).radius : 1
        projected.y += radius * item.lift
      } else projected.copy(item.target).applyMatrix4(system.matrixWorld)
      const distance = projected.distanceTo(camera.position)
      projected.project(camera)
      const visible = item.show() && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && distance > 2
      item.element.hidden = !visible
      if (visible) item.element.style.transform = `translate(${(projected.x + 1) / 2 * width}px, ${(1 - projected.y) / 2 * height}px)`
    }
    renderer.render(scene, camera)
    measured = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }
  }
  frame = requestAnimationFrame(render)

  return {
    canvas, apply,
    resetView: () => settings && resetView(settings.view),
    /** Counts in this preview, for the smoke test and the budget panel. */
    get stats() {
      return {
        dust: dust.geometry.drawRange.count === Infinity ? dustMax : dust.geometry.drawRange.count,
        ringRocks: ringMeshes.reduce((total, { mesh }) => total + (mesh.visible ? mesh.count : 0), 0),
        nearRocks: nearShown,
        worlds: dwarfs.filter(({ mesh }) => mesh.visible).length,
        haze: haze.visible,
        fairyAu: +gameToAu(PATH_RADIUS).toFixed(2),
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
