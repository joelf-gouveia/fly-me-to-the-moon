import * as THREE from 'three'
import { seededRandom } from './terrain'
import type { PlanetKind } from './terrain'
import { meadowNormal, surfaceRadius } from './worlds'
import type { World } from './worlds'

/**
 * F4 · Sparkle rings (docs/feature-ideas-study.md). Short lines of glowing rings float near the
 * ground. The fairy flies through a ring: a burst of sparkles, a two-note chime and a longer trail.
 * A taken ring fades and comes back after 30 s. There is no score, no fail and no counter.
 */
export const RING = {
  /** The radius of the torus, in metres. */
  radius: 2.4,
  tube: 0.17,
  /** The body of the fairy: a pass within radius + reach counts. */
  reach: 0.5,
  /** A fairy this near the plane of the ring is in the ring. */
  depth: 0.8,
  /** The height of a ring centre above the ground under it. */
  low: 5, high: 12,
  /** The distance between two rings along the ground. */
  spacing: 16,
  /** A taken ring comes back after this time of flight. */
  returnSeconds: 30,
  /** The longer, brighter trail after a ring. */
  trailSeconds: 4,
} as const

/** Candy colours: pink, lilac, mint, gold, sky blue and rose. */
export const RING_COLOURS = [0xff8fc8, 0xc59bff, 0x7fe3c4, 0xffd36e, 0x8fc9ff, 0xff9fb0] as const

/** The two notes of a ring: E5 and B5. */
export const RING_CHIME = [659.25, 987.77]

/** The number of ring lines on each world. The other worlds have no rings. */
export const RING_WORLDS: Partial<Record<PlanetKind, number>> = { earth: 5, fairy: 3, moon: 3 }

/** The most rings in one line. */
export const RING_LINE_MAX = 7

export type RingPlacement = {
  /** The centre of the ring, in the frame of the world group. */
  position: THREE.Vector3
  /** The axis of the ring: the direction of the line at the ring. */
  axis: THREE.Vector3
  colour: number
  line: number
}

/** A tall object on the ground: the direction from the world centre, its reach and its top (distance from the centre). */
export type RingObstacle = { normal: THREE.Vector3; radius: number; top: number }

const Z = new THREE.Vector3(0, 0, 1)

/** The distance from the world centre to the ground, for a direction in the frame of the world group. */
function groundRadius(world: World, local: THREE.Vector3) {
  return surfaceRadius(world, local.clone().applyQuaternion(world.group.quaternion))
}

/** Dry ground: no sea, no river and no shore. Worlds with no water are always dry. */
function dry(world: World, local: THREE.Vector3) {
  if (world.kind !== 'earth' && world.kind !== 'fairy') return true
  const sample = world.sample(local.x, local.y, local.z)
  return sample.height > 0.5 && sample.river < 0.1
}

/** The direction `distance` metres from `normal` along `heading` on a sphere of radius `radius`. */
function along(normal: THREE.Vector3, heading: THREE.Vector3, distance: number, radius: number) {
  return normal.clone().multiplyScalar(Math.cos(distance / radius)).addScaledVector(heading, Math.sin(distance / radius)).normalize()
}

/** A unit tangent at `normal`: the one nearest to `hint`, or any one. */
function tangentAt(normal: THREE.Vector3, hint = new THREE.Vector3(0, 1, 0)) {
  const tangent = hint.clone().addScaledVector(normal, -hint.dot(normal))
  if (tangent.lengthSq() < 1e-6) tangent.crossVectors(normal, Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))
  return tangent.normalize()
}

/**
 * The tall scenery of a world: trees, candy and the cottage, from the instanced meshes of
 * `world.surface`. Low objects (grass, trunks, gumdrop flowers) stay under the rings and are not
 * in the list. The soda bubbles rise over water; the dry margin of ringLine() keeps the rings away.
 */
export function sceneryObstacles(world: World): RingObstacle[] {
  const obstacles: RingObstacle[] = []
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3()
  for (const object of world.surface.children) {
    if (object.name === 'flower-cottage') {
      // The cottage, its garden and the pegasus foals that circle 15 m from it.
      obstacles.push({ normal: object.position.clone().normalize(), radius: 24, top: object.position.length() + 14 })
      continue
    }
    if (!(object instanceof THREE.InstancedMesh) || object.name === 'soda-bubbles') continue
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
    const box = object.geometry.boundingBox!
    // Grass, trunks and gumdrop flowers: less than 1.2 m tall at the largest scale (1.5).
    if (box.max.y < 0.8) continue
    const reach = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z)
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix)
      matrix.decompose(position, rotation, scale)
      const size = Math.max(scale.x, scale.y, scale.z)
      obstacles.push({ normal: position.clone().normalize(), radius: reach * size, top: position.length() + box.max.y * size })
    }
  }
  return obstacles
}

/** A coarse grid of the obstacles, so a ring tests only the obstacles near it. */
class ObstacleGrid {
  private cells = new Map<string, RingObstacle[]>()
  // 30 m: the largest reach (the cottage, 24 m, and a ring) fits in the next cell.
  private size = 30
  private radius: number
  constructor(obstacles: RingObstacle[], radius: number) {
    this.radius = radius
    for (const obstacle of obstacles) {
      const key = this.key(obstacle.normal)
      const cell = this.cells.get(key) ?? []
      cell.push(obstacle); this.cells.set(key, cell)
    }
  }
  private key(normal: THREE.Vector3, dx = 0, dy = 0, dz = 0) {
    const s = this.radius / this.size
    return `${Math.floor(normal.x * s) + dx},${Math.floor(normal.y * s) + dy},${Math.floor(normal.z * s) + dz}`
  }
  /** True when an obstacle is in the disc of a ring with its centre at `centre` (frame of the world). */
  blocks(centre: THREE.Vector3) {
    const normal = centre.clone().normalize(), bottom = centre.length() - RING.radius
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      for (const obstacle of this.cells.get(this.key(normal, dx, dy, dz)) ?? []) {
        const apart = normal.angleTo(obstacle.normal) * this.radius
        if (apart < RING.radius + obstacle.radius + 1.5 && obstacle.top + 1.2 > bottom) return true
      }
    }
    return false
  }
}

/**
 * True when a ring with its centre at `centre` (frame of the world group) is safe: 5 to 12 m above
 * the ground under it, with the whole disc clear of the ground, over dry land with a margin to
 * the water, and clear of the tall scenery.
 */
export function ringClear(world: World, centre: THREE.Vector3, grid?: ObstacleGrid) {
  const normal = centre.clone().normalize(), height = centre.length()
  const above = height - groundRadius(world, normal)
  if (above < RING.low || above > RING.high) return false
  if (!dry(world, normal)) return false
  const east = tangentAt(normal), north = new THREE.Vector3().crossVectors(normal, east)
  const heading = new THREE.Vector3()
  for (let k = 0; k < 8; k++) {
    heading.copy(east).multiplyScalar(Math.cos(k * Math.PI / 4)).addScaledVector(north, Math.sin(k * Math.PI / 4))
    // The ground under the disc stays 1.2 m below the lowest point of the ring.
    if (groundRadius(world, along(normal, heading, RING.radius + 1, world.radius)) > height - RING.radius - 1.2) return false
    // Dry land under the whole disc and 1 m beyond: no shore, no soda bubbles.
    if (!dry(world, along(normal, heading, RING.radius + 1, world.radius))) return false
  }
  return !grid?.blocks(centre)
}

export type RingLineOptions = {
  /** The line starts near this direction (frame of the world group). Without it, anywhere. */
  anchor?: THREE.Vector3
  /** The first heading of the line at the anchor. */
  heading?: THREE.Vector3
  obstacles?: RingObstacle[]
  /** Ring centres of other lines. A new line keeps 40 m from them. */
  avoid?: THREE.Vector3[]
  line?: number
}

/**
 * One line of 5 to 7 rings on `world`, the same for the same seed. The line grows one ring at a
 * time along a smooth, gentle curve (at most 8° of turn at each ring), 7 to 11 m over the ground,
 * and it rises and falls slowly with the land. Each ring passes ringClear(), and the path between
 * two rings stays 3 m above the ground. Returns an empty list if no safe line is found.
 */
export function ringLine(world: World, seed: number, options: RingLineOptions = {}): RingPlacement[] {
  const random = seededRandom(seed)
  const grid = options.obstacles ? new ObstacleGrid(options.obstacles, world.radius) : undefined
  const spacing = Math.min(RING.spacing, world.radius * 0.17)
  const line = options.line ?? 0
  const free = (centre: THREE.Vector3) => ringClear(world, centre, grid) && !options.avoid?.some(other => centre.distanceTo(other) < 40)
  for (let attempt = 0; attempt < 600; attempt++) {
    const count = 5 + Math.floor(random() * 3)
    let normal: THREE.Vector3, heading: THREE.Vector3
    if (options.anchor && attempt < 300) {
      // Start just ahead of the anchor first, then slowly try wider turns and farther away.
      const spread = Math.min(Math.PI, 0.35 + attempt * 0.01)
      const side = tangentAt(options.anchor, options.heading).applyAxisAngle(options.anchor, (random() * 2 - 1) * spread)
      normal = along(options.anchor, side, 20 + random() * (25 + attempt * 0.3), world.radius)
      heading = tangentAt(normal, side.applyAxisAngle(options.anchor, (random() * 2 - 1) * 0.3))
    } else {
      // Anywhere but the poles: the snow of Earth and the cottage of Blossom Haven.
      const y = random() * 1.5 - 0.75, angle = random() * Math.PI * 2
      normal = new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
      heading = tangentAt(normal, new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5))
    }
    // Blossom Haven flies higher, over the candy canes and most lollipops.
    const height = world.kind === 'fairy' ? 9 + random() * 2 : 7 + random() * 2.5
    let turn = (random() * 2 - 1) * 0.14
    const centres = [normal.clone().multiplyScalar(groundRadius(world, normal) + height)]
    if (!free(centres[0])) continue
    while (centres.length < count) {
      const previous = centres[centres.length - 1]
      let next: THREE.Vector3 | null = null
      // Twenty tries for the next ring: the same turn and step first, then small changes.
      for (let k = 0; k < 20 && !next; k++) {
        const bend = k === 0 ? turn : THREE.MathUtils.clamp(turn + (random() * 2 - 1) * 0.12, -0.14, 0.14)
        const step = (k === 0 ? spacing : spacing * (0.75 + random() * 0.5)) / world.radius
        const axis = new THREE.Vector3().crossVectors(normal, heading).normalize()
        const n = normal.clone().applyAxisAngle(axis, step).normalize()
        const h = heading.clone().applyAxisAngle(axis, step).applyAxisAngle(n, bend)
        h.addScaledVector(n, -h.dot(n)).normalize()
        // Half way to the new target height, and never more than 2.5 m up or down.
        const level = previous.length()
        const radius = THREE.MathUtils.clamp((level + groundRadius(world, n) + height) / 2, level - 2.5, level + 2.5)
        const centre = n.clone().multiplyScalar(radius)
        const middle = centre.clone().add(previous).multiplyScalar(0.5)
        if (!free(centre) || middle.length() - groundRadius(world, middle.clone().normalize()) < 3) continue
        next = centre; normal = n; heading = h; turn = bend
      }
      if (!next) break
      centres.push(next)
    }
    if (centres.length < 5) continue
    return centres.map((position, i) => ({
      position,
      axis: centres[Math.min(i + 1, centres.length - 1)].clone().sub(centres[Math.max(i - 1, 0)]).normalize(),
      colour: RING_COLOURS[(i + line) % RING_COLOURS.length],
      line,
    }))
  }
  return []
}

/**
 * All the ring lines of a world, the same for the same seed and scenery. The first line starts
 * where the child arrives: ahead of the fairy at the Earth meadow, behind the cottage of
 * Blossom Haven, and on the near side of the Moon, which a trip from Earth reaches.
 */
export function ringLines(world: World, seed = world.seed, obstacles = sceneryObstacles(world)): RingPlacement[] {
  const lines = RING_WORLDS[world.kind as PlanetKind] ?? 0
  const placements: RingPlacement[] = []
  for (let line = 0; line < lines; line++) {
    const options: RingLineOptions = { obstacles, line, avoid: placements.map(ring => ring.position) }
    if (line === 0 && world.kind === 'earth') {
      // The fairy starts 7 m over this meadow and flies along the heading of src/main.ts.
      const meadow = meadowNormal(world)
      Object.assign(options, { anchor: meadow, heading: new THREE.Vector3().crossVectors(meadow, new THREE.Vector3(0, 1, 0)) })
    } else if (line === 0 && world.kind === 'fairy') {
      // The flower guide ends 26 m before the cottage and faces it; this line is behind the cottage.
      options.anchor = new THREE.Vector3(0, -1, 0.42).normalize()
      options.heading = new THREE.Vector3(1, 0, 0)
    } else if (line === 0 && world.kind === 'moon') {
      // +X faces Earth (src/moon.ts).
      options.anchor = new THREE.Vector3(1, 0.15, 0.2).normalize()
    }
    placements.push(...ringLine(world, (seed ^ 0x5a17) + line * 7919, options))
  }
  return placements
}

const crossing = new THREE.Vector3(), offset = new THREE.Vector3()
/**
 * True when the fairy passes through a ring between two frames: the segment from `from` to `to`
 * crosses the plane of the ring inside its disc, or ends near the plane inside the disc. The test
 * uses the segment, so a fast fairy (boost, a slow frame) cannot skip a ring.
 */
export function ringPass(from: THREE.Vector3, to: THREE.Vector3, centre: THREE.Vector3, axis: THREE.Vector3, radius: number = RING.radius + RING.reach, depth: number = RING.depth) {
  const a = offset.subVectors(from, centre).dot(axis)
  const b = offset.subVectors(to, centre).dot(axis)
  let t: number
  if (a * b < 0) t = a / (a - b)
  else if (Math.abs(b) <= depth) t = 1
  else return false
  crossing.lerpVectors(from, to, t).sub(centre)
  crossing.addScaledVector(axis, -crossing.dot(axis))
  return crossing.length() < radius
}

/** A soft, glowing band for the glow behind each ring. Browser only. */
export function ringGlowTexture(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const outer = RING.radius + 1.1
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop((RING.radius - 1) / outer, 'rgba(255,255,255,0)')
  gradient.addColorStop(RING.radius / outer, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Multiply the alpha of each ring by its own fade (0 to 1), from an instanced attribute. */
function fadeShader(material: THREE.Material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float ringFade;\nvarying float vRingFade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRingFade = ringFade;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vRingFade;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vRingFade;')
  }
  material.customProgramCacheKey = () => 'sparkle-ring-fade'
  return material
}

/** A view of `base` that shares its vertex data, with the fade of one world. */
function geometryView(base: THREE.BufferGeometry, fade: THREE.InstancedBufferAttribute) {
  const view = new THREE.BufferGeometry()
  view.setIndex(base.index)
  for (const [name, attribute] of Object.entries(base.attributes)) view.setAttribute(name, attribute)
  view.setAttribute('ringFade', fade)
  return view
}

type WorldRings = {
  world: World
  placements: RingPlacement[]
  takenAt: number[]
  rings: THREE.InstancedMesh
  glow: THREE.InstancedMesh
  fade: THREE.InstancedBufferAttribute
}

export type SparkleRings = ReturnType<typeof createSparkleRings>

/**
 * The rings of the game. The rings of a world are children of its group, so they turn and move
 * with it (also when Blossom Haven moves). One torus geometry, one glow quad and three materials
 * serve all worlds. Each world has one draw call for its rings and one for their glow. A small pool
 * of burst sparkles follows the world of the last ring. A phone gets half the sparkles.
 */
export function createSparkleRings(worlds: World[], options: { mobile: boolean; sparkle: THREE.Texture; glow: THREE.Texture }) {
  const torus = new THREE.TorusGeometry(RING.radius, RING.tube, options.mobile ? 8 : 10, options.mobile ? 32 : 48)
  const quad = new THREE.PlaneGeometry((RING.radius + 1.1) * 2, (RING.radius + 1.1) * 2)
  // Candy colours stay bright by day and glow at night: no light, no tone mapping.
  const ringMaterial = fadeShader(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }))
  const glowMaterial = fadeShader(new THREE.MeshBasicMaterial({
    map: options.glow, color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }))
  const tint = new THREE.Color(), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), size = new THREE.Vector3()

  const sets: WorldRings[] = []
  for (const world of worlds) {
    const lines = RING_WORLDS[world.kind as PlanetKind]
    if (!lines) continue
    const capacity = lines * RING_LINE_MAX
    const fade = new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1), 1)
    fade.setUsage(THREE.DynamicDrawUsage)
    const rings = new THREE.InstancedMesh(geometryView(torus, fade), ringMaterial, capacity)
    const glow = new THREE.InstancedMesh(geometryView(quad, fade), glowMaterial, capacity)
    rings.name = 'sparkle-rings'; glow.name = 'sparkle-ring-glow'
    // The glow uses the matrices and the colours of the rings.
    glow.instanceMatrix = rings.instanceMatrix
    rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    rings.setColorAt(0, tint.setHex(RING_COLOURS[0]))
    glow.instanceColor = rings.instanceColor
    world.group.add(rings, glow)
    const set: WorldRings = { world, placements: [], takenAt: [], rings, glow, fade }
    sets.push(set)
    build(set)
  }

  function place(set: WorldRings, index: number, scale: number) {
    const ring = set.placements[index]
    rotation.setFromUnitVectors(Z, ring.axis)
    set.rings.setMatrixAt(index, matrix.compose(ring.position, rotation, size.setScalar(scale)))
  }

  function build(set: WorldRings) {
    set.placements = ringLines(set.world)
    set.takenAt = set.placements.map(() => -Infinity)
    set.rings.count = set.glow.count = set.placements.length
    set.placements.forEach((ring, index) => {
      place(set, index, 1)
      set.rings.setColorAt(index, tint.setHex(ring.colour))
      set.fade.setX(index, 1)
    })
    set.rings.instanceMatrix.needsUpdate = true
    set.rings.instanceColor!.needsUpdate = true
    set.fade.needsUpdate = true
    for (const mesh of [set.rings, set.glow]) {
      mesh.computeBoundingSphere()
      // Room for the pulse and the growth of a taken ring.
      mesh.boundingSphere!.radius += RING.radius + 2
    }
  }

  // The burst: a small pool of sparkles in the frame of one world group.
  const burstSize = options.mobile ? 24 : 48
  const pool = burstSize * 4
  const burstPositions = new Float32Array(pool * 3), burstColours = new Float32Array(pool * 3)
  const velocities = new Float32Array(pool * 3), ages = new Float32Array(pool).fill(Infinity), bases = new Float32Array(pool * 3)
  const burstGeometry = new THREE.BufferGeometry()
  burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3).setUsage(THREE.DynamicDrawUsage))
  burstGeometry.setAttribute('color', new THREE.BufferAttribute(burstColours, 3).setUsage(THREE.DynamicDrawUsage))
  const bursts = new THREE.Points(burstGeometry, new THREE.PointsMaterial({
    size: 0.42, map: options.sparkle, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }))
  bursts.name = 'sparkle-ring-bursts'
  bursts.frustumCulled = false
  bursts.visible = false
  let cursor = 0, alive = 0
  const BURST_LIFE = 1.4
  const side = new THREE.Vector3(), up = new THREE.Vector3(), direction = new THREE.Vector3()

  function burst(set: WorldRings, ring: RingPlacement) {
    if (bursts.parent !== set.world.group) {
      // The sparkles move to the world of this ring. Old sparkles end.
      set.world.group.add(bursts)
      ages.fill(Infinity)
    }
    side.copy(tangentAt(ring.axis)); up.crossVectors(ring.axis, side)
    tint.setHex(ring.colour)
    for (let k = 0; k < burstSize; k++) {
      const i = cursor++ % pool
      // Half of the sparkles fly out from the ring in its plane; the others fly in all directions.
      if (k % 2) direction.randomDirection()
      else {
        const angle = (k / burstSize) * Math.PI * 2
        direction.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle))
      }
      const start = k % 2 ? 0.3 : RING.radius
      burstPositions[i * 3] = ring.position.x + direction.x * start
      burstPositions[i * 3 + 1] = ring.position.y + direction.y * start
      burstPositions[i * 3 + 2] = ring.position.z + direction.z * start
      const speed = 3 + Math.random() * 4
      velocities.set([direction.x * speed, direction.y * speed, direction.z * speed], i * 3)
      // Each sparkle is the ring colour, some of them nearly white.
      const white = Math.random() * 0.6
      bases.set([tint.r + (1 - tint.r) * white, tint.g + (1 - tint.g) * white, tint.b + (1 - tint.b) * white], i * 3)
      ages[i] = 0
    }
  }

  const fairyLocal = new THREE.Vector3(), previousLocal = new THREE.Vector3(), inverse = new THREE.Quaternion()
  let previousWorld: World | null = null
  let now = 0

  return {
    /** A new landscape needs a new safe line. Call it after regenerateWorld(). */
    rebuild(world: World) {
      const set = sets.find(item => item.world === world)
      if (!set) return
      build(set)
      if (previousWorld === world) previousWorld = null
    },
    /** Forget the last fairy position, after a jump that is not a flight. */
    reset() { previousWorld = null },
    /**
     * Test the rings of the nearest world, then animate all rings and the sparkles.
     * `time` is the time of active flight. Returns the rings that the fairy took in this frame.
     */
    update(delta: number, time: number, fairy: THREE.Vector3, nearest: World, motion: boolean) {
      const taken: RingPlacement[] = []
      now = time
      const set = sets.find(item => item.world === nearest)
      if (set && delta > 0) {
        // The fairy in the frame of the world group: the turn and the orbit of the world do not move her there.
        inverse.copy(nearest.group.quaternion).invert()
        fairyLocal.copy(fairy).sub(nearest.group.position).applyQuaternion(inverse)
        if (previousWorld === nearest) {
          set.placements.forEach((ring, index) => {
            if (time - set.takenAt[index] < RING.returnSeconds) return
            if (!ringPass(previousLocal, fairyLocal, ring.position, ring.axis)) return
            set.takenAt[index] = time
            taken.push(ring)
            burst(set, ring)
          })
        }
        previousLocal.copy(fairyLocal)
        previousWorld = nearest
      } else if (!set) previousWorld = null

      for (const item of sets) {
        let changed = false
        item.placements.forEach((_, index) => {
          const age = time - item.takenAt[index]
          let fade = 1, scale = motion ? 1 + Math.sin(time * 2.4 + index) * 0.04 : 1
          if (age < 0.45) { fade = 1 - age / 0.45; scale = 1 + age * 0.9 }
          else if (age < RING.returnSeconds) fade = 0
          else if (age < RING.returnSeconds + 1) { fade = age - RING.returnSeconds; scale *= 0.7 + fade * 0.3 }
          if (item.fade.getX(index) !== fade) { item.fade.setX(index, fade); changed = true }
          if (motion || age < RING.returnSeconds + 1) { place(item, index, scale); item.rings.instanceMatrix.needsUpdate = true }
        })
        if (changed) item.fade.needsUpdate = true
      }

      alive = 0
      if (delta > 0 || bursts.visible) {
        const drag = Math.exp(-delta * 1.8)
        for (let i = 0; i < pool; i++) {
          if (ages[i] >= BURST_LIFE) { burstColours[i * 3] = burstColours[i * 3 + 1] = burstColours[i * 3 + 2] = 0; continue }
          ages[i] += delta
          alive++
          for (let axis = 0; axis < 3; axis++) {
            burstPositions[i * 3 + axis] += velocities[i * 3 + axis] * delta
            velocities[i * 3 + axis] *= drag
          }
          const light = Math.max(0, 1 - ages[i] / BURST_LIFE) ** 2
          for (let axis = 0; axis < 3; axis++) burstColours[i * 3 + axis] = bases[i * 3 + axis] * light
        }
        burstGeometry.attributes.position.needsUpdate = true
        burstGeometry.attributes.color.needsUpdate = true
        bursts.visible = alive > 0
      }
      return taken
    },
    /** The rings of a world, for the test hook. */
    placements(world: World) { return sets.find(item => item.world === world)?.placements ?? [] },
    stats() {
      return {
        worlds: sets.map(item => ({
          world: item.world.name, seed: item.world.seed, count: item.placements.length,
          lines: new Set(item.placements.map(ring => ring.line)).size,
          /** The index of the first ring of each line. */
          lineStarts: item.placements.flatMap((ring, index) => index === 0 || item.placements[index - 1].line !== ring.line ? [index] : []),
          taken: item.takenAt.flatMap((at, index) => now - at < RING.returnSeconds ? [index] : []),
          first: item.placements[0]?.position.toArray() ?? null,
          inGroup: item.rings.parent === item.world.group && item.glow.parent === item.world.group,
        })),
        bursts: alive, burstPool: pool, burstSize,
      }
    },
  }
}
