import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * The home of the fairy in four parts: the roof, the walls, the door and the yard. Each part has
 * options, and each part has one colour from the twelve colours of HOME_COLORS. The default look
 * (TODAY) is the flower cottage of the first game. The fairy home study chose the parts
 * (docs/fairy-home-study.md); build mode (src/home-build.ts) changes them, and src/worlds.ts
 * builds the look of homeLook() at each build of Blossom Haven.
 *
 * The parts fit together with one rule, the socket. The walls give the height and the radius of
 * their top (`topY`, `topRadius`) and the radius of their front at each height (`frontAt`). A
 * roof sits on the top and scales to its radius. A door sits on the front and leans with the
 * wall. The yard is a ring from 4.5 m to 11 m around the walls, on the round ground of the
 * clearing. Thus each roof fits each wall, and the game needs no table of pairs.
 *
 * The frame is the frame of the cottage group: the ground at y = 0, the door to +z, in metres.
 */

// ---- The colours ------------------------------------------------------------------------------
export const HOME_COLORS = [
  { id: 'cream', label: 'Cream', color: 0xffefd0 },
  { id: 'honey', label: 'Honey', color: 0xffdc8e },
  { id: 'apricot', label: 'Apricot', color: 0xf6a865 },
  { id: 'cherry', label: 'Cherry', color: 0xe0475c },
  { id: 'berry', label: 'Berry', color: 0xe66aa4 },
  { id: 'rose', label: 'Rose', color: 0xffa8cf },
  { id: 'lilac', label: 'Lilac', color: 0xc3a3e8 },
  { id: 'periwinkle', label: 'Periwinkle', color: 0x9fb0f0 },
  { id: 'sky', label: 'Sky', color: 0x8fcbef },
  { id: 'mint', label: 'Mint', color: 0x9ed8c0 },
  { id: 'fern', label: 'Fern', color: 0x7fae74 },
  { id: 'cocoa', label: 'Cocoa', color: 0x9b6a4b },
] as const
export type ColorId = typeof HOME_COLORS[number]['id']
export const colorOf = (id: ColorId) => HOME_COLORS.find(item => item.id === id)!.color

// ---- The options --------------------------------------------------------------------------------
export const PART_IDS = ['roof', 'walls', 'door', 'yard'] as const
export type PartId = typeof PART_IDS[number]

export const ROOFS = [
  { id: 'petals', label: 'Petal crown', color: 'rose' },
  { id: 'toadstool', label: 'Toadstool', color: 'cherry' },
  { id: 'acorn', label: 'Acorn cap', color: 'cocoa' },
  { id: 'spire', label: 'Star spire', color: 'periwinkle' },
  { id: 'frosting', label: 'Frosting swirl', color: 'rose' },
  { id: 'leaves', label: 'Leaf thatch', color: 'fern' },
] as const
export const WALLS = [
  { id: 'cottage', label: 'Flower cottage', color: 'cream' },
  { id: 'stump', label: 'Tree stump', color: 'cocoa' },
  { id: 'teapot', label: 'Teapot', color: 'sky' },
  { id: 'pumpkin', label: 'Pumpkin', color: 'apricot' },
  { id: 'tower', label: 'Pebble tower', color: 'lilac' },
  { id: 'hive', label: 'Honey hive', color: 'honey' },
] as const
export const DOORS = [
  { id: 'round', label: 'Round door', color: 'berry' },
  { id: 'arch', label: 'Plank arch', color: 'fern' },
  { id: 'heart', label: 'Heart door', color: 'berry' },
  { id: 'leaf', label: 'Leaf curtain', color: 'mint' },
  { id: 'star', label: 'Star door', color: 'periwinkle' },
] as const
export const YARDS = [
  { id: 'flowers', label: 'Flower ring', color: 'honey' },
  { id: 'fairyRing', label: 'Fairy ring', color: 'cherry' },
  { id: 'path', label: 'Path and fence', color: 'cream' },
  { id: 'lanterns', label: 'Lantern garden', color: 'honey' },
  { id: 'pond', label: 'Lily pond', color: 'rose' },
  { id: 'candy', label: 'Candy garden', color: 'berry' },
] as const
export const OPTIONS = { roof: ROOFS, walls: WALLS, door: DOORS, yard: YARDS } as const
export type OptionId<P extends PartId = PartId> = typeof OPTIONS[P][number]['id']
export const PART_NAMES: Record<PartId, string> = { roof: 'Roof', walls: 'Walls', door: 'Door', yard: 'Yard' }
export const optionOf = <P extends PartId>(part: P, id: string) => (OPTIONS[part] as readonly { id: string; label: string; color: ColorId }[]).find(item => item.id === id)!

export type HomeLook = {
  roof: OptionId<'roof'>; walls: OptionId<'walls'>; door: OptionId<'door'>; yard: OptionId<'yard'>
  colors: Record<PartId, ColorId>
}
/** The flower cottage of today. */
export const TODAY: HomeLook = { roof: 'petals', walls: 'cottage', door: 'round', yard: 'flowers', colors: { roof: 'rose', walls: 'cream', door: 'berry', yard: 'honey' } }

/** Reads a saved look, as parseFairyLook() in src/fairy.ts does: an unknown value gives the value of today. */
export function parseHomeLook(value: unknown): HomeLook {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const colors = (input.colors && typeof input.colors === 'object' ? input.colors : {}) as Record<string, unknown>
  const look = structuredClone(TODAY)
  for (const part of PART_IDS) {
    if (OPTIONS[part].some(option => option.id === input[part])) (look as Record<string, unknown>)[part] = input[part]
    if (HOME_COLORS.some(color => color.id === colors[part])) look.colors[part] = colors[part] as ColorId
  }
  return look
}

// ---- The limits --------------------------------------------------------------------------------
/** The flower of the guide marks a point 8 m over the cottage (homeMarkerPosition() in src/journey.ts). The home stays under it. */
export const MAX_TOP = 7.5
/** The creatures keep 12 m from the cottage (obstacles.add() in src/worlds.ts). The yard stays inside. */
export const YARD_REACH = 11
/** The yard starts here: the walls and the roof of each option stay inside this radius. */
export const YARD_START = 4.5

// ---- The pieces and the paints --------------------------------------------------------------------
/** The fixed paints of the details. `main` is the colour of the part. `window` is the window of the game. */
type Paint = 'main' | 'gold' | 'white' | 'cream' | 'dark' | 'leaf' | 'stone' | 'water' | 'shadow' | 'cherry' | 'window'
const FIXED: Record<Exclude<Paint, 'main' | 'window'>, THREE.MeshStandardMaterialParameters> = {
  gold: { color: 0xffdc8e, roughness: 0.7, emissive: 0xffb849, emissiveIntensity: 0.18 },
  white: { color: 0xfffaf2, roughness: 0.7 },
  cream: { color: 0xffefd0, roughness: 0.9 },
  dark: { color: 0x6b4a36, roughness: 0.9 },
  leaf: { color: 0x6fae6a, roughness: 0.8, side: THREE.DoubleSide },
  stone: { color: 0xd6cdc4, roughness: 0.95 },
  water: { color: 0x86d6ee, roughness: 0.18, metalness: 0.1 },
  shadow: { color: 0x2e2233, roughness: 1 },
  cherry: { color: 0xe0475c, roughness: 0.45 },
}
/** One material of each fixed paint for the whole home, so a change of a part makes no new material. */
const fixedMaterials = new Map<Paint, THREE.MeshStandardMaterial>()
const fixedMaterial = (paint: Exclude<Paint, 'main' | 'window'>) => {
  if (!fixedMaterials.has(paint)) fixedMaterials.set(paint, new THREE.MeshStandardMaterial(FIXED[paint]))
  return fixedMaterials.get(paint)!
}

const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(), scaleVector = new THREE.Vector3(), positionVector = new THREE.Vector3()
/** A place of a piece: the position, the turn (with the order of the turns) and the scale. The scale comes first. */
type Place = { p?: [number, number, number]; r?: [number, number, number]; o?: THREE.EulerOrder; s?: number | [number, number, number] }

/**
 * The pieces of one part. A piece is a geometry with a paint. At the end, the pieces of one paint
 * become one mesh: a part has one draw call for each paint, not one for each piece.
 */
class Pieces {
  private byPaint = new Map<Paint, THREE.BufferGeometry[]>()
  add(paint: Paint, geometry: THREE.BufferGeometry, place: Place = {}) {
    const s = place.s ?? 1
    matrix.compose(positionVector.set(...(place.p ?? [0, 0, 0])), quaternion.setFromEuler(euler.set(...(place.r ?? [0, 0, 0]), place.o ?? 'XYZ')),typeof s === 'number' ? scaleVector.setScalar(s) : scaleVector.set(...s))
    return this.addMatrix(paint, geometry, matrix)
  }
  addMatrix(paint: Paint, geometry: THREE.BufferGeometry, transform: THREE.Matrix4) {
    let piece = geometry.index ? geometry.toNonIndexed() : geometry.clone()
    if (piece !== geometry) geometry.dispose()
    for (const name of Object.keys(piece.attributes)) if (name !== 'position' && name !== 'normal') piece.deleteAttribute(name)
    piece.applyMatrix4(transform)
    // A mirror (a negative scale) turns the faces inside out; the normals of the geometry stay right after applyMatrix4().
    if (transform.determinant() < 0) piece = flipFaces(piece)
    if (!this.byPaint.has(paint)) this.byPaint.set(paint, [])
    this.byPaint.get(paint)!.push(piece)
    return this
  }
  build(name: string, main: THREE.MeshStandardMaterial, window: THREE.Material) {
    const group = new THREE.Group()
    group.name = name
    for (const [paint, geometries] of this.byPaint) {
      const merged = mergeGeometries(geometries, false)!
      geometries.forEach(geometry => geometry.dispose())
      merged.computeBoundingSphere()
      const mesh = new THREE.Mesh(merged, paint === 'main' ? main : paint === 'window' ? window : fixedMaterial(paint))
      // The windows keep the name that src/main.ts reads to light them after sunset.
      mesh.name = paint === 'window' ? 'cottage-window' : `${name}-${paint}`
      group.add(mesh)
    }
    return group
  }
}

function flipFaces(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position, normal = geometry.attributes.normal
  for (let i = 0; i < position.count; i += 3) {
    for (const attribute of [position, normal]) {
      const x = attribute.getX(i + 1), y = attribute.getY(i + 1), z = attribute.getZ(i + 1)
      attribute.setXYZ(i + 1, attribute.getX(i + 2), attribute.getY(i + 2), attribute.getZ(i + 2))
      attribute.setXYZ(i + 2, x, y, z)
    }
  }
  return geometry
}

/** A tube along `curve` with a radius that changes along it: `radius(u)` from u = 0 to 1. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, radius: (u: number) => number, tubular = 32, radial = 10) {
  const frames = curve.computeFrenetFrames(tubular, false)
  const positions: number[] = [], normals: number[] = [], indices: number[] = []
  const point = new THREE.Vector3(), normal = new THREE.Vector3()
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular
    curve.getPointAt(u, point)
    for (let j = 0; j <= radial; j++) {
      const angle = j / radial * Math.PI * 2
      normal.copy(frames.normals[i]).multiplyScalar(-Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle)).normalize()
      positions.push(point.x + normal.x * radius(u), point.y + normal.y * radius(u), point.z + normal.z * radius(u))
      normals.push(normal.x, normal.y, normal.z)
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  return geometry
}

/** A lathe from a profile of [radius, height] points, with `shape(angle, y)` as a factor on the radius. */
function lathe(profile: [number, number][], segments: number, shape?: (angle: number, y: number) => number) {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments)
  if (shape) {
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
      const factor = shape(Math.atan2(x, z), y)
      position.setXYZ(i, x * factor, y, z * factor)
    }
    geometry.computeVertexNormals()
  }
  return geometry
}

/** The radius of a profile at the height `y` (the profile goes up). */
function profileAt(profile: [number, number][], y: number) {
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]
    if (y <= y1 && y1 > y0) return r0 + (r1 - r0) * THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1)
  }
  return profile[profile.length - 1][0]
}

const sphere = (w = 16, h = 10) => new THREE.SphereGeometry(1, w, h)
/** A small random of its own, so a part has the same look at each build. */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function starShape(outer: number, inner: number, points = 5) {
  const shape = new THREE.Shape()
  for (let i = 0; i <= points * 2; i++) {
    const angle = i / (points * 2) * Math.PI * 2, r = i % 2 ? inner : outer
    const x = Math.sin(angle) * r, y = Math.cos(angle) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  return shape
}
const extrude = (shape: THREE.Shape, depth: number, bevel = 0.03) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 18 })

// ---- The walls ------------------------------------------------------------------------------------
export type Socket = {
  /** The height and the radius of the top: the roof sits there. */
  topY: number; topRadius: number
  /** The radius of the wall at the front (+z) at the height y: the door sits there. */
  frontAt(y: number): number
}
/**
 * The place of a flat piece (a window, a door) on a round wall: `radiusAt(y)` is the radius of
 * the wall at the height y, in the direction of the piece. The piece leans with the wall from
 * `from` to `to`. `base` is the distance of its plane from the middle at its bottom (y = from).
 * The front of the piece (`front` metres before its plane) is at least `clear` metres before
 * the wall at each height, so no part of the wall comes through it.
 */
export function onWall(radiusAt: (y: number) => number, from: number, to: number, front: number, clear = 0.03) {
  const lean = Math.atan2(radiusAt(to - 0.25) - radiusAt(from + 0.25), to - from - 0.5)
  let base = -Infinity
  for (let k = 0; k <= 64; k++) {
    const y = from + (to - from) * k / 64
    base = Math.max(base, radiusAt(y) - (y - from) * Math.tan(lean))
  }
  return { lean, base: base - front / Math.cos(lean) + clear }
}

/** A window on the wall: at `angle` from the front, at the height `y`, on a wall of radius `radiusAt(y)` there. */
function addWindow(pieces: Pieces, angle: number, y: number, radiusAt: (y: number) => number, frame?: Paint) {
  // The front of the window is 0.065 m before its middle; a frame comes 0.1 m out of it.
  const { lean, base } = onWall(radiusAt, y - 0.65, y + 0.65, 0.065)
  const r = base + 0.65 * Math.tan(lean)
  const at: [number, number, number] = [Math.sin(angle) * r, y, Math.cos(angle) * r]
  pieces.add('window', sphere(), { p: at, r: [lean, angle, 0], o: 'YXZ', s: [0.65, 0.65, 0.1] })
  if (frame) pieces.add(frame, new THREE.TorusGeometry(0.68, 0.1, 8, 28), { p: at, r: [lean, angle, 0], o: 'YXZ' })
}

const WALL_BUILDERS: Record<OptionId<'walls'>, (pieces: Pieces) => Socket> = {
  /** Today: a cream cylinder, 3.7 m at the ground and 3.1 m at the top. */
  cottage(pieces) {
    pieces.add('main', new THREE.CylinderGeometry(3.1, 3.7, 4.7, 32), { p: [0, 2.2, 0] })
    const frontAt = (y: number) => 3.7 - 0.6 * (y + 0.15) / 4.7
    for (const side of [-1, 1]) addWindow(pieces, side * 0.76, 2.7, frontAt)
    return { topY: 4.55, topRadius: 3.1, frontAt }
  },
  /** A stump with bark ridges and six roots. The windows are knots with a dark ring. */
  stump(pieces) {
    const body = new THREE.CylinderGeometry(3.0, 3.5, 4.5, 64, 6, true)
    const position = body.attributes.position
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i), angle = Math.atan2(x, z)
      // The bark is smooth at the door and at the two windows, so they sit flat on it.
      const smoothAt = Math.min(...[0, -0.8, 0.8].map(place => THREE.MathUtils.smoothstep(Math.abs(angle - place), 0.3, 0.55)))
      const ridge = 1 + smoothAt * (0.045 * Math.sin(9 * angle + 0.7 * Math.sin(3 * angle)) + 0.018 * Math.sin(23 * angle))
      position.setXYZ(i, x * ridge, position.getY(i), z * ridge)
    }
    body.computeVertexNormals()
    pieces.add('main', body, { p: [0, 2.1, 0] })
    pieces.add('cream', new THREE.CircleGeometry(3.0, 48), { p: [0, 4.35, 0], r: [-Math.PI / 2, 0, 0] })
    for (const angle of [0.75, 1.6, 2.5, 3.45, 4.35, 5.65]) {
      const r = 3.35
      pieces.add('main', sphere(14, 8), { p: [Math.sin(angle) * r, 0.18, Math.cos(angle) * r], r: [0, angle, 0], s: [0.55, 0.55, 1.5] })
    }
    const frontAt = (y: number) => 3.5 - 0.5 * (y + 0.15) / 4.5
    for (const side of [-1, 1]) addWindow(pieces, side * 0.8, 2.8, frontAt, 'dark')
    return { topY: 4.35, topRadius: 3.0, frontAt }
  },
  /** A round teapot with a gold rim, a spout to the right and a handle to the left. */
  teapot(pieces) {
    const profile: [number, number][] = [[0, -0.2], [3.25, -0.2], [3.6, 0.3], [3.85, 1.3], [3.85, 2.3], [3.5, 3.3], [2.9, 4.0], [2.55, 4.3], [2.6, 4.5], [0, 4.5]]
    pieces.add('main', lathe(profile, 48))
    pieces.add('gold', new THREE.TorusGeometry(2.6, 0.13, 10, 48), { p: [0, 4.42, 0], r: [Math.PI / 2, 0, 0] })
    pieces.add('gold', new THREE.TorusGeometry(3.28, 0.1, 8, 48), { p: [0, -0.1, 0], r: [Math.PI / 2, 0, 0] })
    const spout = new THREE.CatmullRomCurve3([new THREE.Vector3(3.2, 1.3, -0.9), new THREE.Vector3(4.4, 1.7, -0.9), new THREE.Vector3(5.1, 2.8, -0.9), new THREE.Vector3(5.7, 3.9, -0.9)])
    pieces.add('main', taperedTube(spout, u => 0.62 - u * 0.32, 24, 14))
    pieces.add('gold', new THREE.TorusGeometry(0.3, 0.06, 8, 20), { p: [5.7, 3.9, -0.9], r: [Math.PI / 2 - 0.5, 0, -0.5] })
    pieces.add('main', new THREE.TorusGeometry(1.25, 0.3, 12, 28, Math.PI * 1.15), { p: [-3.45, 2.2, -0.6], r: [0, 0, Math.PI / 2 - 0.08] })
    const frontAt = (y: number) => profileAt(profile, y)
    for (const side of [-1, 1]) addWindow(pieces, side * 0.78, 2.6, frontAt, 'gold')
    return { topY: 4.45, topRadius: 2.6, frontAt }
  },
  /** A squat pumpkin with eight ribs. The front of the door is a rib, so the door sits flat. */
  pumpkin(pieces) {
    const profile: [number, number][] = []
    for (let i = 0; i <= 24; i++) {
      const y = -0.2 + i / 24 * 4.6
      // A rounded box in profile (power 3): the low part stands nearly straight, so the door fits.
      const t = Math.min(1, Math.abs((y - 1.95) / 2.75))
      profile.push([3.95 * Math.pow(1 - Math.pow(t, 3), 1 / 3), y])
    }
    profile.unshift([0, -0.2])
    profile.push([0, 4.4])
    const rib = (angle: number) => 0.92 + 0.08 * Math.abs(Math.cos(4 * angle))
    pieces.add('main', lathe(profile, 72, rib))
    pieces.add('leaf', sphere(), { p: [-3.2, 0.25, 2.2], r: [0.2, -0.9, 0.3], s: [1.2, 0.08, 0.65] })
    pieces.add('leaf', sphere(), { p: [3.5, 0.2, -1.6], r: [-0.2, 2.1, 0.25], s: [1.1, 0.08, 0.6] })
    const vine = new THREE.CatmullRomCurve3([new THREE.Vector3(-3.0, 0.3, 2.1), new THREE.Vector3(-3.7, 1.0, 1.0), new THREE.Vector3(-3.5, 1.8, 0.2), new THREE.Vector3(-3.9, 2.5, -0.6)])
    pieces.add('leaf', taperedTube(vine, u => 0.09 - u * 0.05, 24, 6))
    const frontAt = (y: number) => profileAt(profile.slice(1, -1), y) * rib(0)
    for (const side of [-1, 1]) addWindow(pieces, side * 0.79, 2.4, y => profileAt(profile.slice(1, -1), y) * rib(side * 0.79))
    return { topY: 4.2, topRadius: profileAt(profile.slice(1, -1), 4.2) * 0.98, frontAt }
  },
  /** A narrow tower of round pebbles on a core, with the windows high up. */
  tower(pieces) {
    const R = 2.45
    pieces.add('stone', new THREE.CylinderGeometry(R, R + 0.1, 5.5, 32), { p: [0, 2.5, 0] })
    const pick = random(7)
    for (let row = 0; row < 9; row++) {
      const y = 0.15 + row * 0.6, count = 16, offset = row % 2 ? 0.5 : 0
      for (let k = 0; k < count; k++) {
        const angle = (k + offset + (pick() - 0.5) * 0.2) / count * Math.PI * 2
        const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle))
        // The door and the windows keep their places free.
        if (Math.abs(wrapped) < 0.42 && y < 3.0) continue
        if (Math.abs(Math.abs(wrapped) - 0.8) < 0.3 && Math.abs(y - 3.3) < 0.62) continue
        const size = 0.85 + pick() * 0.3
        pieces.add('main', sphere(10, 6), { p: [Math.sin(angle) * (R + 0.04), y, Math.cos(angle) * (R + 0.04)], r: [0, angle, (pick() - 0.5) * 0.4], s: [0.5 * size, 0.31 * size, 0.2] })
      }
    }
    // The pebbles come 0.24 m out of the core. The door and the windows stand before them.
    const frontAt = () => R + 0.26
    for (const side of [-1, 1]) addWindow(pieces, side * 0.8, 3.3, () => R + 0.35, 'main')
    return { topY: 5.25, topRadius: R + 0.15, frontAt }
  },
  /** A woven hive of eight straw rings, wide at the ground and narrow at the top. */
  hive(pieces) {
    const profile: [number, number][] = [[3.55, 0], [3.7, 1.2], [3.55, 2.4], [3.15, 3.5], [2.55, 4.4]]
    pieces.add('main', lathe([[0, -0.2], ...profile.map(([r, y]) => [r - 0.25, y] as [number, number]), [0, 4.5]], 40))
    for (let i = 0; i < 8; i++) {
      const y = 0.25 + i * 0.58
      pieces.add('main', new THREE.TorusGeometry(profileAt(profile, y), 0.34, 10, 56), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] })
    }
    // The front of the rings: the door and the windows stand before them.
    const frontAt = (y: number) => profileAt(profile, y) + 0.34
    for (const side of [-1, 1]) addWindow(pieces, side * 0.8, 2.8, frontAt, 'dark')
    return { topY: 4.55, topRadius: 2.75, frontAt }
  },
}

// ---- The roofs ------------------------------------------------------------------------------------
/**
 * A roof is drawn for a top of radius 1: `height` is the height of its body, `lift` the height of
 * its topper (a star, a cherry, a stem) over the body. The roof scales to the socket: by `s`
 * across (the radius of the top) and by `sy` up. `sy` is smaller than `s` only when the roof
 * would go over MAX_TOP. A topper keeps its shape: it scales by `s`, and it goes to the top of
 * the body.
 */
type RoofScale = {
  s: number; sy: number
  /** The place of a piece of the body, with the roof scale. */
  body(place: Place): Place
  /** The place of a topper: at the height `y` of the body, plus `lift`, at `x` across, with the size `size`. */
  topper(y: number, lift: number, size: number, x?: number): Place
}
const ROOF_BUILDERS: Record<OptionId<'roof'>, { height: number; lift: number; build(pieces: Pieces, scale: RoofScale): void }> = {
  /** Today: seven petals and a gold heart, as buildFlowerCottage(). */
  petals: {
    height: 0.68, lift: 0,
    build(pieces, { body }) {
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2
        pieces.add('main', sphere(), body({ p: [Math.sin(angle) * 0.677, 0.08, Math.cos(angle) * 0.677], r: [0, angle, 0], s: [0.516, 0.21, 0.968] }))
      }
      pieces.add('gold', new THREE.SphereGeometry(1, 20, 12), body({ p: [0, 0.339, 0], s: [0.516, 0.336, 0.516] }))
    },
  },
  /** A red cap with white spots and cream gills under it. */
  toadstool: {
    height: 0.98, lift: 0,
    build(pieces, { s, sy, body }) {
      pieces.add('main', new THREE.SphereGeometry(1, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2), body({ p: [0, 0.04, 0], s: [1.22, 0.94, 1.22] }))
      pieces.add('main', new THREE.TorusGeometry(1.2, 0.06, 8, 48), body({ p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0] }))
      pieces.add('cream', new THREE.CircleGeometry(1.2, 48), body({ p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0] }))
      // The spots: a spiral over the cap. Each spot is a flat round disc that faces out of the scaled cap.
      const up = new THREE.Vector3(0, 1, 0)
      for (let i = 0; i < 15; i++) {
        const elevation = THREE.MathUtils.lerp(0.25, 1.32, Math.sqrt((i + 0.5) / 15)), angle = i * 2.4
        const n = new THREE.Vector3(Math.cos(elevation) * Math.sin(angle), Math.sin(elevation), Math.cos(elevation) * Math.cos(angle))
        const at = new THREE.Vector3(n.x * 1.22 * s, (n.y * 0.94 + 0.04) * sy, n.z * 1.22 * s)
        const normal = new THREE.Vector3(n.x / (1.22 * s), n.y / (0.94 * sy), n.z / (1.22 * s)).normalize()
        const size = (0.11 + (i % 3) * 0.04) * s
        pieces.addMatrix('white', new THREE.SphereGeometry(1, 12, 6), new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromUnitVectors(up, normal), new THREE.Vector3(size, 0.025 * s, size)))
      }
    },
  },
  /** An acorn cap: a low cup with rings of scales and a short stem. */
  acorn: {
    height: 0.64, lift: 0.26,
    build(pieces, { body, topper }) {
      const profile: [number, number][] = [[0, 0.02], [1.12, 0.02], [1.16, 0.12], [1.1, 0.3], [0.92, 0.46], [0.6, 0.58], [0.25, 0.63], [0, 0.64]]
      pieces.add('main', lathe(profile, 48, (angle, y) => 1 + 0.035 * Math.abs(Math.sin(y * Math.PI * 7)) + 0.012 * Math.sin(angle * 18 + y * 20)), body({}))
      pieces.add('main', new THREE.TorusGeometry(1.13, 0.07, 8, 48), body({ p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0] }))
      const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.14, 0), new THREE.Vector3(0.1, 0.26, 0)])
      pieces.add('dark', taperedTube(stem, u => 0.1 - u * 0.035, 12, 10), topper(0.6, 0, 1))
    },
  },
  /** A tall cone with a bent tip, two gold bands and a star. */
  spire: {
    height: 1.6, lift: 0.42,
    build(pieces, { body, topper }) {
      const cone = new THREE.ConeGeometry(1.1, 1.6, 40, 10, true)
      const position = cone.attributes.position
      for (let i = 0; i < position.count; i++) {
        const h = (position.getY(i) + 0.8) / 1.6
        position.setX(i, position.getX(i) + 0.2 * h * h * h)
      }
      cone.computeVertexNormals()
      pieces.add('main', cone, body({ p: [0, 0.8, 0] }))
      pieces.add('main', new THREE.TorusGeometry(1.08, 0.07, 8, 48), body({ p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0] }))
      for (const h of [0.25, 0.5]) pieces.add('gold', new THREE.TorusGeometry(1.1 * (1 - h) + 0.02, 0.035, 6, 40), body({ p: [0.2 * h * h * h, h * 1.6, 0], r: [Math.PI / 2, 0, 0] }))
      pieces.add('gold', extrude(starShape(0.2, 0.09), 0.05, 0.02), topper(1.6, 0.17, 1, 0.2))
    },
  },
  /** A soft swirl of frosting in three turns, with a cherry. */
  frosting: {
    height: 1.2, lift: 0.42,
    build(pieces, { body, topper }) {
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= 120; i++) {
        const u = i / 120, angle = u * Math.PI * 2 * 3.2
        const r = THREE.MathUtils.lerp(0.98, 0.08, Math.pow(u, 0.85))
        points.push(new THREE.Vector3(Math.sin(angle) * r, 0.2 + u * 0.88, Math.cos(angle) * r))
      }
      pieces.add('main', taperedTube(new THREE.CatmullRomCurve3(points), u => THREE.MathUtils.lerp(0.3, 0.12, u), 160, 14), body({}))
      // Round ends: an open end of the tube shows as a cut.
      pieces.add('main', sphere(), body({ p: points[0].toArray(), s: 0.3 }))
      pieces.add('main', sphere(), body({ p: points[points.length - 1].toArray(), s: 0.12 }))
      pieces.add('main', new THREE.CylinderGeometry(0.85, 1.0, 0.3, 40), body({ p: [0, 0.15, 0] }))
      pieces.add('cherry', new THREE.SphereGeometry(1, 20, 14), topper(1.15, 0.1, 0.15))
      const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.12, 0), new THREE.Vector3(0.1, 0.2, 0)])
      pieces.add('leaf', taperedTube(stem, () => 0.015, 10, 6), topper(1.15, 0.22, 1))
    },
  },
  /** Two rows of big leaves that hang over the walls, and a curled sprout on top. */
  leaves: {
    height: 0.9, lift: 0.2,
    build(pieces, { body, topper }) {
      pieces.add('main', new THREE.ConeGeometry(0.8, 0.9, 24), body({ p: [0, 0.45, 0] }))
      // Each leaf leans down from its middle: first the lean (about x), then the turn to its place (about y).
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * Math.PI * 2
        pieces.add('main', sphere(16, 8), { ...body({ p: [Math.sin(angle) * 0.72, 0.2, Math.cos(angle) * 0.72], s: [0.4, 0.07, 0.6] }), r: [0.42, angle, 0], o: 'YXZ' })
      }
      for (let i = 0; i < 7; i++) {
        const angle = (i + 0.5) / 7 * Math.PI * 2
        pieces.add('main', sphere(16, 8), { ...body({ p: [Math.sin(angle) * 0.38, 0.55, Math.cos(angle) * 0.38], s: [0.3, 0.07, 0.44] }), r: [0.55, angle, 0], o: 'YXZ' })
      }
      const sprout = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.12, 0), new THREE.Vector3(0.1, 0.2, 0), new THREE.Vector3(0.16, 0.16, 0), new THREE.Vector3(0.12, 0.11, 0)])
      pieces.add('leaf', taperedTube(sprout, u => 0.045 - u * 0.03, 20, 8), topper(0.88, 0, 1))
    },
  },
}

/** The scale of a roof on a socket: the radius of the top across, and up to MAX_TOP. */
export function roofScale(roof: OptionId<'roof'>, socket: Socket) {
  const { height, lift } = ROOF_BUILDERS[roof]
  const s = socket.topRadius
  const sy = Math.min(s, (MAX_TOP - socket.topY - lift * s) / height)
  return { s, sy }
}

// ---- The doors ------------------------------------------------------------------------------------
/** A door: drawn with its bottom at y = 0 and its face to +z. The builder puts it on the front of the walls. */
const DOOR_BUILDERS: Record<OptionId<'door'>, { height: number; build(pieces: Pieces): void }> = {
  /** Today: a pink capsule with a gold knob. */
  round: {
    height: 2.85,
    build(pieces) {
      pieces.add('main', new THREE.CapsuleGeometry(0.8, 1.2, 4, 12), { p: [0, 1.42, 0], s: [1, 1, 0.13] })
      pieces.add('gold', sphere(8, 6), { p: [0.42, 1.42, 0.13], s: 0.13 })
    },
  },
  /** An arch of planks in a cream frame, with iron straps and a ring. */
  arch: {
    height: 2.5,
    build(pieces) {
      const shape = new THREE.Shape()
      shape.moveTo(-0.75, 0); shape.lineTo(0.75, 0); shape.lineTo(0.75, 1.6); shape.absarc(0, 1.6, 0.75, 0, Math.PI, false); shape.lineTo(-0.75, 0)
      pieces.add('main', extrude(shape, 0.12), { p: [0, 0, -0.08] })
      for (const x of [-0.37, 0, 0.37]) pieces.add('dark', new THREE.BoxGeometry(0.04, x === 0 ? 2.2 : 2.1, 0.03), { p: [x, x === 0 ? 1.1 : 1.05, 0.08] })
      for (const y of [0.5, 1.5]) pieces.add('dark', new THREE.BoxGeometry(1.3, 0.09, 0.04), { p: [0, y, 0.09] })
      pieces.add('cream', new THREE.TorusGeometry(0.85, 0.11, 8, 24, Math.PI), { p: [0, 1.6, 0] })
      for (const side of [-1, 1]) pieces.add('cream', new THREE.BoxGeometry(0.22, 1.6, 0.22), { p: [side * 0.85, 0.8, 0] })
      pieces.add('gold', new THREE.TorusGeometry(0.1, 0.025, 6, 16), { p: [0.45, 1.05, 0.12] })
    },
  },
  /** A heart with a gold knob and a small heart window. */
  heart: {
    height: 2.3,
    build(pieces) {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      shape.bezierCurveTo(-0.35, 0.45, -1.0, 0.9, -1.0, 1.55)
      shape.bezierCurveTo(-1.0, 2.05, -0.55, 2.3, -0.25, 2.3)
      shape.bezierCurveTo(-0.08, 2.3, 0, 2.15, 0, 2.05)
      shape.bezierCurveTo(0, 2.15, 0.08, 2.3, 0.25, 2.3)
      shape.bezierCurveTo(0.55, 2.3, 1.0, 2.05, 1.0, 1.55)
      shape.bezierCurveTo(1.0, 0.9, 0.35, 0.45, 0, 0)
      // The point of the heart is under the ground: the door stands on its lower part.
      pieces.add('main', extrude(shape, 0.12), { p: [0, -0.35, -0.08], s: [0.95, 1.12, 1] })
      pieces.add('gold', sphere(8, 6), { p: [0.4, 1.05, 0.12], s: 0.12 })
      pieces.add('window', extrude(heartWindow(), 0.04, 0.01),{ p: [0, 1.5, 0.08], s: 0.32 })
    },
  },
  /** Two big leaves like curtains over a dark doorway. */
  leaf: {
    height: 2.6,
    build(pieces) {
      const doorway = new THREE.Shape()
      doorway.moveTo(-0.7, 0); doorway.lineTo(0.7, 0); doorway.lineTo(0.7, 1.55); doorway.absarc(0, 1.55, 0.7, 0, Math.PI, false); doorway.lineTo(-0.7, 0)
      pieces.add('shadow', extrude(doorway, 0.05, 0), { p: [0, 0, -0.04] })
      const leaf = new THREE.Shape()
      leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.62, 0.9, 0.05, 2.55); leaf.quadraticCurveTo(-0.5, 1.2, 0, 0)
      for (const side of [-1, 1]) {
        pieces.add('main', extrude(leaf, 0.04, 0.015), { p: [side * 0.38, 0, 0.03 + (side > 0 ? 0.03 : 0)], r: [0, 0, side * 0.06], s: [side * 1.55, 1, 1] })
        pieces.add('leaf', new THREE.BoxGeometry(0.03, 2.2, 0.02), { p: [side * 0.3, 1.15, 0.1], r: [0, 0, side * 0.12] })
      }
    },
  },
  /** A smooth arch with a gold star and a round window of light. */
  star: {
    height: 2.4,
    build(pieces) {
      const shape = new THREE.Shape()
      shape.moveTo(-0.72, 0); shape.lineTo(0.72, 0); shape.lineTo(0.72, 1.65); shape.absarc(0, 1.65, 0.72, 0, Math.PI, false); shape.lineTo(-0.72, 0)
      pieces.add('main', extrude(shape, 0.12, 0.05), { p: [0, 0, -0.08] })
      pieces.add('gold', extrude(starShape(0.42, 0.18), 0.04, 0.02), { p: [0, 1.15, 0.09] })
      pieces.add('window', sphere(), { p: [0, 1.95, 0.08], s: [0.22, 0.22, 0.05] })
      pieces.add('gold', new THREE.TorusGeometry(0.24, 0.04, 6, 20), { p: [0, 1.95, 0.08] })
      pieces.add('gold', sphere(8, 6), { p: [0.48, 0.95, 0.1], s: 0.1 })
    },
  },
}
function heartWindow() {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.6)
  shape.bezierCurveTo(-0.3, -0.25, -0.8, 0, -0.8, 0.4)
  shape.bezierCurveTo(-0.8, 0.8, -0.25, 0.9, 0, 0.55)
  shape.bezierCurveTo(0.25, 0.9, 0.8, 0.8, 0.8, 0.4)
  shape.bezierCurveTo(0.8, 0, 0.3, -0.25, 0, -0.6)
  return shape
}

// ---- The yards ------------------------------------------------------------------------------------
/** A yard gets the height of the round ground at a distance r from the middle (`ground(r)`). */
const YARD_BUILDERS: Record<OptionId<'yard'>, (pieces: Pieces, ground: (r: number) => number) => void> = {
  /** Today: 32 gold puffs in three rings, from 7 m to 9.8 m. */
  flowers(pieces, ground) {
    for (let i = 0; i < 32; i++) {
      const angle = i / 32 * Math.PI * 2, r = 7 + (i % 3) * 1.4
      pieces.add('main', sphere(), { p: [Math.cos(angle) * r, ground(r) + 0.35, Math.sin(angle) * r], s: [0.55, 0.3, 0.55] })
    }
  },
  /** A ring of 24 mushrooms, as the fairy rings of the old stories. */
  fairyRing(pieces, ground) {
    const pick = random(11)
    for (let i = 0; i < 24; i++) {
      const angle = (i + (pick() - 0.5) * 0.5) / 24 * Math.PI * 2, r = 8.4 + (pick() - 0.5) * 0.8, s = 0.55 + pick() * 0.55
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r, y = ground(r)
      pieces.add('cream', new THREE.CylinderGeometry(0.11 * s, 0.16 * s, 0.6 * s, 10), { p: [x, y + 0.3 * s, z] })
      pieces.add('main', new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), { p: [x, y + 0.55 * s, z], r: [(pick() - 0.5) * 0.3, 0, (pick() - 0.5) * 0.3], s: [0.42 * s, 0.3 * s, 0.42 * s] })
    }
  },
  /** Stepping stones from the door, and a picket fence with a gate gap. */
  path(pieces, ground) {
    for (let i = 0; i < 6; i++) {
      const r = 4.6 + i * 1.0, x = Math.sin(i * 1.7) * 0.35
      pieces.add('stone', new THREE.CylinderGeometry(1, 1, 0.14, 14), { p: [x, ground(r) + 0.04, r], r: [0, i, 0], s: [0.5 + (i % 2) * 0.12, 1, 0.42 + (i % 3) * 0.06] })
    }
    const R = 10, gap = 0.12
    const posts = Math.round(Math.PI * 2 * R / 0.42)
    for (let k = 0; k < posts; k++) {
      const angle = k / posts * Math.PI * 2
      if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < gap) continue
      const x = Math.sin(angle) * R, z = Math.cos(angle) * R, y = ground(R)
      pieces.add('main', new THREE.BoxGeometry(0.2, 0.75, 0.05), { p: [x, y + 0.37, z], r: [0, angle, 0] })
      pieces.add('main', new THREE.ConeGeometry(0.14, 0.16, 4), { p: [x, y + 0.82, z], r: [0, angle + Math.PI / 4, 0] })
    }
    for (const h of [0.25, 0.58]) pieces.add('main', new THREE.TorusGeometry(R - 0.05, 0.035, 6, 160, Math.PI * 2 - gap * 2), { p: [0, ground(R) + h, 0], r: [Math.PI / 2, 0, Math.PI / 2 + gap] })
  },
  /** Eight lanterns on curved posts. They glow in the colour of the yard. */
  lanterns(pieces, ground) {
    for (let k = 0; k < 8; k++) {
      const angle = (k + 0.5) / 8 * Math.PI * 2, r = 7.2
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r, y = ground(r)
      const out = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle))
      const post = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 1.7, z), new THREE.Vector3(x - out.x * 0.25, y + 2.25, z - out.z * 0.25), new THREE.Vector3(x - out.x * 0.55, y + 2.05, z - out.z * 0.55)])
      pieces.add('dark', taperedTube(post, u => 0.07 - u * 0.03, 20, 6))
      const at: [number, number, number] = [x - out.x * 0.55, y + 1.72, z - out.z * 0.55]
      pieces.add('main', sphere(14, 10), { p: at, s: [0.32, 0.4, 0.32] })
      pieces.add('dark', new THREE.ConeGeometry(0.28, 0.2, 10), { p: [at[0], at[1] + 0.43, at[2]] })
    }
    // Small lights in the grass between the lanterns.
    const pick = random(5)
    for (let i = 0; i < 22; i++) {
      const angle = pick() * Math.PI * 2, r = 5.4 + pick() * 4.8
      pieces.add('main', sphere(6, 4), { p: [Math.sin(angle) * r, ground(r) + 0.35 + pick() * 1.1, Math.cos(angle) * r], s: 0.07 })
    }
  },
  /** A pond with lily pads, two lotus flowers, reeds and a ring of stones. */
  pond(pieces, ground) {
    const angle = -0.95, r = 7.8
    const cx = Math.sin(angle) * r, cz = Math.cos(angle) * r, y = ground(r)
    pieces.add('water', new THREE.CircleGeometry(1, 40), { p: [cx, y + 0.06, cz], r: [-Math.PI / 2, 0, angle], s: [2.6, 1.9, 1] })
    for (let k = 0; k < 18; k++) {
      const a = k / 18 * Math.PI * 2
      const local = new THREE.Vector2(Math.cos(a) * 2.75, Math.sin(a) * 2.05).rotateAround(new THREE.Vector2(), -angle)
      pieces.add('stone', sphere(10, 6), { p: [cx + local.x, y + 0.08, cz + local.y], r: [0, a, 0], s: [0.34, 0.2, 0.28] })
    }
    const pads: [number, number, number][] = [[-0.9, 0.4, 0.55], [0.7, -0.5, 0.48], [0.2, 0.9, 0.4], [1.2, 0.5, 0.36], [-0.4, -0.8, 0.42]]
    for (const [dx, dz, size] of pads) pieces.add('leaf', new THREE.CircleGeometry(1, 20, 0.3, Math.PI * 2 - 0.6), { p: [cx + dx, y + 0.09, cz + dz], r: [-Math.PI / 2, 0, dx * 3], s: size })
    for (const [dx, dz] of [[-0.9, 0.4], [0.7, -0.5]] as const) {
      for (let p = 0; p < 7; p++) {
        const a = p / 7 * Math.PI * 2
        pieces.add('main', sphere(10, 6), { p: [cx + dx + Math.sin(a) * 0.14, y + 0.24, cz + dz + Math.cos(a) * 0.14], r: [0.5, a, 0], s: [0.1, 0.06, 0.2] })
      }
      pieces.add('gold', sphere(8, 6), { p: [cx + dx, y + 0.28, cz + dz], s: 0.08 })
    }
    for (let k = 0; k < 6; k++) {
      const a = -0.6 + k * 0.22
      const local = new THREE.Vector2(Math.cos(a) * 2.9, Math.sin(a) * 2.2).rotateAround(new THREE.Vector2(), -angle)
      const h = 1.1 + (k % 3) * 0.25
      pieces.add('leaf', new THREE.CylinderGeometry(0.025, 0.035, h, 5), { p: [cx + local.x, y + h / 2, cz + local.y] })
      pieces.add('dark', new THREE.CapsuleGeometry(0.06, 0.22, 2, 6), { p: [cx + local.x, y + h - 0.1, cz + local.y] })
    }
  },
  /** Lollipops and gumdrops, as the candy of Blossom Haven. */
  candy(pieces, ground) {
    for (let k = 0; k < 7; k++) {
      const angle = (k + 0.5) / 7 * Math.PI * 2, r = 7.6 + (k % 2) * 1.2
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r, y = ground(r)
      const h = 1.2 + (k % 3) * 0.3
      pieces.add('white', new THREE.CylinderGeometry(0.05, 0.05, h, 8), { p: [x, y + h / 2, z] })
      pieces.add('main', new THREE.CylinderGeometry(0.48, 0.48, 0.12, 28), { p: [x, y + h + 0.4, z], r: [Math.PI / 2, angle, 0] })
      for (const side of [-1, 1]) pieces.add('white', new THREE.TorusGeometry(0.27, 0.045, 6, 24), { p: [x + side * Math.sin(angle) * 0.065, y + h + 0.4, z + side * Math.cos(angle) * 0.065], r: [0, angle, 0] })
    }
    const pick = random(3)
    for (let i = 0; i < 16; i++) {
      const angle = pick() * Math.PI * 2, r = 5.3 + pick() * 5.2, s = 0.22 + pick() * 0.14
      pieces.add(i % 3 ? 'main' : 'white', new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { p: [Math.sin(angle) * r, ground(r), Math.cos(angle) * r], s: [s, s * 1.15, s] })
    }
  },
}

// ---- The build ------------------------------------------------------------------------------------
export type HomeParts = Record<PartId, THREE.Group>
export type BuildOptions = {
  /** The radius of the round ground of the clearing: the radius of the world plus HOME_CLEARING_HEIGHT. */
  groundRadius: number
  /** The window material. The game keeps one for the life of the home: src/main.ts lights it after sunset. */
  windowMaterial?: THREE.Material
}
const DEFAULT_WINDOW = () => new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffc25a, emissiveIntensity: 0.05 })

/** The material of a part: its colour, with a glow for the lanterns and the flower ring of today. */
function mainMaterial(part: PartId, option: string, color: ColorId) {
  const material = new THREE.MeshStandardMaterial({ color: colorOf(color), roughness: part === 'door' ? 0.8 : 0.85 })
  if (part === 'roof') material.side = THREE.DoubleSide
  if (part === 'yard' && (option === 'flowers' || option === 'lanterns')) {
    material.emissive.setHex(colorOf(color))
    material.emissiveIntensity = option === 'lanterns' ? 0.85 : 0.14
  }
  return material
}

export function buildPart(part: PartId, look: HomeLook, socket: Socket | null, options: BuildOptions & { windowMaterial: THREE.Material }) {
  const pieces = new Pieces()
  const main = mainMaterial(part, look[part], look.colors[part])
  let result: Socket | null = null
  if (part === 'walls') result = WALL_BUILDERS[look.walls](pieces)
  else if (part === 'roof') {
    const { s, sy } = roofScale(look.roof, socket!)
    const body = (place: Place): Place => {
      const [x, y, z] = place.p ?? [0, 0, 0]
      const scale = place.s ?? 1
      const [a, b, c] = typeof scale === 'number' ? [scale, scale, scale] : scale
      return { p: [x * s, y * sy, z * s], r: place.r, o: place.o, s: [a * s, b * sy, c * s] }
    }
    const topper = (y: number, lift: number, size: number, x = 0): Place => ({ p: [x * s, y * sy + lift * s, 0], s: size * s })
    ROOF_BUILDERS[look.roof].build(pieces, { s, sy, body, topper })
  } else if (part === 'door') DOOR_BUILDERS[look.door].build(pieces)
  else YARD_BUILDERS[look.yard](pieces, groundAt(options.groundRadius))
  const group = pieces.build(`home-${part}`, main, options.windowMaterial)
  if (part === 'roof') group.position.y = socket!.topY - 0.05
  if (part === 'door') {
    // The door stands on the ground before the wall and leans with it. No part of the wall comes through it.
    // The front of the door is the front of its leaf (the main paint): a knob or a star stands out of it.
    const box = new THREE.Box3().setFromObject(group)
    const leaf = new THREE.Box3().setFromObject(group.getObjectByName('home-door-main')!)
    const { lean, base } = onWall(socket!.frontAt, 0, box.max.y, leaf.max.z)
    group.position.set(0, 0.02, base)
    group.rotation.x = lean
  }
  group.userData.main = main
  return { group, socket: result }
}

/** The height of the round ground of the clearing at a distance r from the middle, from its top. */
export const groundAt = (radius: number) => (r: number) => Math.sqrt(radius * radius - r * r) - radius

/** Builds the four parts of a look in a group. The group has the name of the cottage of today. */
export function buildHome(look: HomeLook, options: BuildOptions) {
  const windowMaterial = options.windowMaterial ?? DEFAULT_WINDOW()
  const full = { ...options, windowMaterial }
  const group = new THREE.Group()
  group.name = 'flower-cottage'
  const walls = buildPart('walls', look, null, full)
  const socket = walls.socket!
  const parts = { walls: walls.group, roof: buildPart('roof', look, socket, full).group, door: buildPart('door', look, socket, full).group, yard: buildPart('yard', look, socket, full).group } as HomeParts
  for (const part of PART_IDS) group.add(parts[part])
  return { group, parts, socket, windowMaterial }
}

/** Frees the geometries and the part materials of a group. The fixed paints and the window stay. */
export function disposePart(group: THREE.Object3D) {
  group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
  ;(group.userData.main as THREE.Material | undefined)?.dispose()
}

/** The draw calls, the triangles and the top and the reach of a built home. */
export function homeStats(group: THREE.Object3D) {
  let calls = 0, triangles = 0
  group.updateMatrixWorld(true)
  const box = new THREE.Box3()
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    calls++
    triangles += object.geometry.attributes.position.count / 3
  })
  const local = new THREE.Box3()
  const inverse = group.matrixWorld.clone().invert()
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.computeBoundingBox()
    local.copy(object.geometry.boundingBox!).applyMatrix4(object.matrixWorld).applyMatrix4(inverse)
    box.union(local)
  })
  return { calls, triangles, top: box.max.y, reach: Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z), box }
}

/**
 * The live home of a world: it swaps one part, or paints one part, in place. A new walls part
 * builds the roof and the door again, because they sit on the walls. A new colour changes only
 * the colour of the material: nothing builds again.
 */
export function createHomeBuilder(surface: THREE.Object3D, groundRadius: number, look: HomeLook = TODAY) {
  const old = surface.getObjectByName('flower-cottage')!
  const windowMesh = old.getObjectByName('cottage-window') as THREE.Mesh | undefined
  const windowMaterial = (windowMesh?.material as THREE.Material | undefined) ?? DEFAULT_WINDOW()
  const current: HomeLook = structuredClone(look)
  const built = buildHome(current, { groundRadius, windowMaterial })
  built.group.position.copy(old.position)
  built.group.quaternion.copy(old.quaternion)
  surface.remove(old)
  const fixed = new Set<THREE.Material>(fixedMaterials.values())
  old.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    if (object.material !== windowMaterial && !fixed.has(object.material)) (object.material as THREE.Material).dispose()
  })
  surface.add(built.group)
  const parts = built.parts
  let socket = built.socket
  const options = { groundRadius, windowMaterial }
  function rebuild(part: PartId) {
    const next = buildPart(part, current, socket, options)
    if (next.socket) socket = next.socket
    built.group.remove(parts[part])
    disposePart(parts[part])
    parts[part] = next.group
    built.group.add(next.group)
    return next.group
  }
  return {
    group: built.group,
    parts,
    get look() { return structuredClone(current) },
    get socket() { return socket },
    /** Swaps one part. A new shape comes in its own colour, unless `keepColor`. Returns the groups that changed. */
    set(part: PartId, option: string, keepColor = false) {
      ;(current as Record<string, unknown>)[part] = option
      if (!keepColor) current.colors[part] = optionOf(part, option).color
      const changed = [rebuild(part)]
      if (part === 'walls') changed.push(rebuild('roof'), rebuild('door'))
      return changed
    },
    paint(part: PartId, color: ColorId) {
      current.colors[part] = color
      const main = parts[part].userData.main as THREE.MeshStandardMaterial
      main.color.setHex(colorOf(color))
      if (main.emissiveIntensity > 0.01) main.emissive.setHex(colorOf(color))
    },
    apply(next: HomeLook) {
      Object.assign(current, structuredClone(next))
      for (const part of PART_IDS) rebuild(part)
    },
  }
}

// ---- The home of the game ----------------------------------------------------------------------------
/** The eight homes of the study (docs/fairy-home-study.md), as whole looks. The Surprise button picks from them. */
export const HOME_PRESETS: Record<string, HomeLook> = {
  flower: TODAY,
  toadstool: { roof: 'toadstool', walls: 'cottage', door: 'arch', yard: 'fairyRing', colors: { roof: 'cherry', walls: 'cream', door: 'fern', yard: 'cherry' } },
  stump: { roof: 'leaves', walls: 'stump', door: 'arch', yard: 'path', colors: { roof: 'fern', walls: 'cocoa', door: 'apricot', yard: 'cream' } },
  teapot: { roof: 'acorn', walls: 'teapot', door: 'star', yard: 'lanterns', colors: { roof: 'cream', walls: 'sky', door: 'periwinkle', yard: 'honey' } },
  pumpkin: { roof: 'leaves', walls: 'pumpkin', door: 'round', yard: 'path', colors: { roof: 'fern', walls: 'apricot', door: 'cocoa', yard: 'cocoa' } },
  tower: { roof: 'spire', walls: 'tower', door: 'star', yard: 'lanterns', colors: { roof: 'periwinkle', walls: 'lilac', door: 'periwinkle', yard: 'honey' } },
  hive: { roof: 'petals', walls: 'hive', door: 'round', yard: 'flowers', colors: { roof: 'apricot', walls: 'honey', door: 'cocoa', yard: 'rose' } },
  candy: { roof: 'frosting', walls: 'cottage', door: 'heart', yard: 'candy', colors: { roof: 'rose', walls: 'mint', door: 'berry', yard: 'berry' } },
}

/** The look of the home of this game. src/worlds.ts builds it at each build of Blossom Haven (a new size too). */
let current: HomeLook = structuredClone(TODAY)
export const homeLook = () => structuredClone(current)
export function setHomeLook(look: HomeLook) { current = parseHomeLook(look) }

/** The key of the saved home, as `fairy-look` is the key of the saved fairy. */
export const HOME_STORAGE_KEY = 'fairy-home'
type Store = Pick<Storage, 'getItem' | 'setItem'>
/** Reads the saved home. Storage can be absent or refuse: then the home is the cottage of today. */
export function loadHomeLook(store: Store | undefined): HomeLook {
  try { return parseHomeLook(JSON.parse(store?.getItem(HOME_STORAGE_KEY) ?? 'null')) } catch { return structuredClone(TODAY) }
}
/** Saves the home. Returns false when the storage refuses it: the home then stays for this visit. */
export function saveHomeLook(look: HomeLook, store: Store | undefined) {
  try { store?.setItem(HOME_STORAGE_KEY, JSON.stringify(look)); return !!store } catch { return false }
}

/**
 * A surprise: a whole new home. Half of the surprises are a home of the stories (HOME_PRESETS);
 * the other half take each part and each colour at random. A surprise is never the home of now.
 */
export function surpriseLook(random: () => number, now: HomeLook): HomeLook {
  const pick = <T>(list: readonly T[]) => list[Math.min(list.length - 1, Math.floor(random() * list.length))]
  for (let tries = 0; tries < 20; tries++) {
    const look: HomeLook = random() < 0.5 ? structuredClone(pick(Object.values(HOME_PRESETS)))
      : { roof: pick(ROOFS).id, walls: pick(WALLS).id, door: pick(DOORS).id, yard: pick(YARDS).id, colors: { roof: pick(HOME_COLORS).id, walls: pick(HOME_COLORS).id, door: pick(HOME_COLORS).id, yard: pick(HOME_COLORS).id } }
    if (JSON.stringify(look) !== JSON.stringify(now)) return look
  }
  return structuredClone(HOME_PRESETS.candy)
}
