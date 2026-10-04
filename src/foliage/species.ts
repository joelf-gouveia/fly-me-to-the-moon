import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * The plants of the foliage study. Each plant is one geometry: its parts are merged, so one
 * plant kind is one draw call for the whole planet. The colours are vertex colours.
 *
 * `aFoliage` gives three values for each vertex:
 * - x: 1 where the instance colour paints the part (leaves, candy), 0 where it does not (trunks).
 * - y: the glow of the part at night (Blossom Haven).
 * - z: the sway of the vertex in the wind, in metres.
 */
export type SpeciesId =
  | 'pine' | 'snowPine' | 'oak' | 'birch' | 'palm' | 'acacia' | 'cactus' | 'bareTree'
  | 'bush' | 'fern' | 'flowers' | 'grass' | 'reeds' | 'rock' | 'toadstool'
  | 'lollipop' | 'ballPop' | 'cane' | 'cottonTree' | 'iceCream' | 'blossomTree' | 'giantFlower'
  | 'gumdrops' | 'marshmallow' | 'crystal'

export type Species = {
  id: SpeciesId
  name: string
  /** A tree keeps a free space around it. A small plant does not. */
  tree: boolean
  /** Glossy candy, or a matt leaf. */
  gloss: boolean
  /** The smallest and the largest size of an instance. */
  scale: [number, number]
  /** The colours of the painted parts. A zone can give its own colours. */
  palette: number[]
  /** The sway of the top of the plant in the wind, in metres. */
  flex: number
  build(): THREE.BufferGeometry
}

type PartOptions = { tint?: number; glow?: number; top?: number; flat?: boolean }

/** One part of a plant: a geometry with a colour from the base to the top, and its paint and glow values. */
function part(geometry: THREE.BufferGeometry, colour: number | null, options: PartOptions = {}) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry
  result.deleteAttribute('uv')
  if (options.flat) result.computeVertexNormals()
  const position = result.attributes.position
  if (colour !== null) {
    result.computeBoundingBox()
    const { min, max } = result.boundingBox!
    const base = new THREE.Color(colour), top = new THREE.Color(options.top ?? colour), shade = new THREE.Color()
    const colours = new Float32Array(position.count * 3)
    for (let i = 0; i < position.count; i++) {
      shade.copy(base).lerp(top, (position.getY(i) - min.y) / (max.y - min.y || 1))
      colours.set([shade.r, shade.g, shade.b], i * 3)
    }
    result.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  }
  const foliage = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) foliage.set([options.tint ?? 0, options.glow ?? 0, 0], i * 3)
  result.setAttribute('aFoliage', new THREE.BufferAttribute(foliage, 3))
  return result
}

/** Joins the parts of a plant, and gives each vertex its sway: zero at the ground, `flex` at the top. */
function assemble(parts: THREE.BufferGeometry[], flex: number) {
  const geometry = mergeGeometries(parts)!
  geometry.computeBoundingBox()
  const height = geometry.boundingBox!.max.y || 1
  const foliage = geometry.attributes.aFoliage, position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const u = Math.max(0, position.getY(i)) / height
    foliage.setZ(i, flex * u * u)
  }
  parts.forEach(item => item.dispose())
  // An index joins the equal vertices of the smooth parts. The browser checks of the game also
  // skip the indexed draw calls when they advance the time, so the plants must have an index.
  const indexed = mergeVertices(geometry)
  geometry.dispose()
  return indexed
}

// ---- Shapes ---------------------------------------------------------------------------------------
const WHITE = 0xffffff, SHADE = 0xbdbdbd, SOFT_SHADE = 0xd9d9d9
const cyl = (top: number, bottom: number, height: number, sides: number, y = 0, open = true) =>
  new THREE.CylinderGeometry(top, bottom, height, sides, 1, open).translate(0, y + height / 2, 0)
const cone = (radius: number, height: number, sides: number, y: number) =>
  new THREE.ConeGeometry(radius, height, sides, 1, true).translate(0, y + height / 2, 0)
/** A leaf clump with 36 flat faces. */
const clump = (radius: number, scale: [number, number, number], at: [number, number, number]) =>
  new THREE.DodecahedronGeometry(radius, 0).scale(...scale).translate(...at)
/** A soft round puff. */
const puff = (radius: number, scale: [number, number, number], at: [number, number, number]) =>
  new THREE.IcosahedronGeometry(radius, 1).scale(...scale).translate(...at)
const ball = (radius: number, at: [number, number, number], width = 12, height = 8) =>
  new THREE.SphereGeometry(radius, width, height).translate(...at)
const tube = (points: [number, number, number][], radius: number, sides: number, segments = 6) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), segments, radius, sides, false)

/** A long leaf from the origin toward +x. It is wide near the base, and it bends down toward the tip. */
function frond(length: number, width: number, droop: number, segments = 4) {
  const half = (u: number) => width / 2 * (u < 0.25 ? 0.35 + 2.6 * u : (1 - u) * 1.33)
  const point = (u: number, side: number) => [length * u, -droop * u * u, half(u) * side]
  const vertices: number[] = []
  for (let k = 0; k < segments; k++) {
    const a = k / segments, b = (k + 1) / segments
    vertices.push(...point(a, -1), ...point(a, 1), ...point(b, 1), ...point(a, -1), ...point(b, 1), ...point(b, -1))
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return geometry
}
function fronds(count: number, length: number, width: number, droop: number, rise: number, at: [number, number, number]) {
  return Array.from({ length: count }, (_, i) =>
    frond(length * (0.85 + (i % 3) * 0.1), width, droop).rotateZ(rise + (i % 2) * 0.18).rotateY(i / count * Math.PI * 2 + 0.3).translate(...at))
}
/** Thin blades in a ring: a tuft of grass, or reeds. */
function blades(count: number, height: number, width: number, spread: number) {
  const vertices: number[] = []
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2 + i * 0.7, reach = spread * (0.4 + (i % 3) * 0.3)
    const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach
    const sideX = -Math.sin(angle) * width / 2, sideZ = Math.cos(angle) * width / 2
    const tall = height * (0.7 + (i % 4) * 0.1)
    vertices.push(x - sideX, 0, z - sideZ, x + sideX, 0, z + sideZ, x * 2.1, tall, z * 2.1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  return geometry
}

// ---- The plants -----------------------------------------------------------------------------------
const LEAF = [0x3c7f45, 0x4d9150, 0x356f44]
const BARK = 0x6f563c
/** The candy colours of the game (src/candy.ts). */
const CANDY = [0xeb8cb3, 0xf4c67f, 0xb3a0d0, 0x92c8b4]
const CREAM = 0xffedcf

function pineParts(leaf: number, tip: number, tint: number) {
  return [
    part(cyl(0.13, 0.2, 1.3, 5), BARK),
    part(cone(1.3, 2, 7, 0.9), leaf, { top: tip, tint, flat: true }),
    part(cone(1.02, 1.8, 7, 2), leaf, { top: tip, tint, flat: true }),
    part(cone(0.72, 1.6, 7, 3.1), leaf, { top: tip, tint, flat: true }),
  ]
}

function toadstoolParts() {
  const parts = [
    part(cyl(0.26, 0.38, 1.5, 8), 0xfff0d8),
    part(new THREE.SphereGeometry(1.2, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 1.4, 0), SOFT_SHADE, { top: WHITE, tint: 1, glow: 1 }),
    part(new THREE.CircleGeometry(1.2, 10).rotateX(Math.PI / 2).translate(0, 1.4, 0), 0xfff0d8),
  ]
  // Five flat white dots, each one against the cap.
  const outward = new THREE.Vector3(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4, lift = 0.35 + (i % 3) * 0.32
    outward.set(Math.cos(angle) * Math.cos(lift), Math.sin(lift), Math.sin(angle) * Math.cos(lift))
    parts.push(part(new THREE.SphereGeometry(0.2, 6, 3).scale(1, 0.35, 1).applyQuaternion(turn.setFromUnitVectors(up, outward))
      .translate(outward.x * 1.2, 1.4 + outward.y * 0.84, outward.z * 1.2), WHITE, { glow: 1 }))
  }
  return parts
}

function lollipopParts() {
  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40, angle = t * Math.PI * 5
    return new THREE.Vector3(Math.cos(angle) * t * 1.4, 5.4 + Math.sin(angle) * t * 1.4, 0.24)
  })
  const spiral = () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.1, 3, false)
  return [
    part(cyl(0.15, 0.21, 4.6, 7), CREAM),
    part(new THREE.CylinderGeometry(1.65, 1.65, 0.42, 20).rotateX(Math.PI / 2).translate(0, 5.4, 0), WHITE, { tint: 1 }),
    part(spiral(), CREAM),
    part(spiral().translate(0, 0, -0.48), CREAM),
  ]
}

function caneParts() {
  const geometry = tube([[0, 0, 0], [0, 2.6, 0], [0, 3.8, 0], [0.5, 4.5, 0], [1.4, 4.5, 0], [1.9, 3.9, 0], [1.9, 3.4, 0]], 0.25, 7, 32)
  const uv = geometry.attributes.uv, stripes = new Float32Array(uv.count * 3), stripe = new THREE.Color()
  for (let i = 0; i < uv.count; i++) {
    stripe.setHex(Math.floor(uv.getX(i) * 18 + uv.getY(i)) % 2 ? 0xd87797 : 0xffefdb)
    stripes.set([stripe.r, stripe.g, stripe.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(stripes, 3))
  return [part(geometry, null)]
}

function crystalParts() {
  const prism = (height: number, radius: number) => [
    new THREE.CylinderGeometry(radius * 0.8, radius, height, 6, 1, true).translate(0, height / 2, 0),
    new THREE.ConeGeometry(radius * 0.8, radius * 1.4, 6, 1, true).translate(0, height + radius * 0.7, 0),
  ]
  const parts = prism(2.6, 0.5)
  for (let i = 0; i < 3; i++) parts.push(...prism(1.4 + i * 0.25, 0.34).map(item => item.rotateZ(0.5).rotateY(i * 2.1 + 0.4).translate(0, 0.1, 0)))
  return parts.map(item => part(item, 0xb4b4b4, { top: WHITE, tint: 1, glow: 0.55, flat: true }))
}

function giantFlowerParts() {
  const head = (geometry: THREE.BufferGeometry) => geometry.rotateX(0.45).translate(0, 3.25, 0)
  const parts = [
    part(tube([[0, 0, 0], [0.12, 1.6, 0], [0, 3.2, 0]], 0.09, 5), 0x6fb88c),
    part(ball(0.5, [0, 0, 0], 8, 5).scale(1, 0.12, 0.42).rotateZ(0.5).translate(0.5, 1.25, 0), 0x86cf9f),
    part(ball(0.5, [0, 0, 0], 8, 5).scale(1, 0.12, 0.42).rotateZ(-0.5).translate(-0.42, 1.75, 0), 0x86cf9f),
    part(head(ball(0.42, [0, 0, 0], 8, 5).scale(1, 0.6, 1)), 0xffd772, { glow: 0.6 }),
  ]
  for (let i = 0; i < 8; i++) {
    parts.push(part(head(ball(0.5, [0, 0, 0], 6, 4).scale(1, 0.16, 0.48).translate(0.8, 0, 0).rotateZ(0.42).rotateY(i / 8 * Math.PI * 2)), WHITE, { tint: 1 }))
  }
  return parts
}

function flowerParts() {
  const places: [number, number, number][] = [[0, 0, 0.5], [0.36, 0.1, 0.42], [-0.3, 0.26, 0.55], [0.1, -0.38, 0.38], [-0.22, -0.2, 0.46], [0.44, -0.3, 0.52]]
  return places.flatMap(([x, z, height]) => [
    part(cyl(0.018, 0.018, height, 3).translate(x, 0, z), 0x5a9a4a),
    part(new THREE.OctahedronGeometry(0.15, 0).scale(1.15, 0.65, 1.15).translate(x, height, z), WHITE, { tint: 1, flat: true }),
  ])
}

export const SPECIES: Record<SpeciesId, Species> = {
  // ---- Earth ----
  pine: { id: 'pine', name: 'Pine', tree: true, gloss: false, scale: [0.8, 1.35], palette: [0x2f6b47, 0x3a7a4c, 0x2a5f4f], flex: 0.16,
    build() { return assemble(pineParts(SHADE, WHITE, 1), this.flex) } },
  snowPine: { id: 'snowPine', name: 'Snow pine', tree: true, gloss: false, scale: [0.75, 1.25], palette: [WHITE], flex: 0.12,
    build() { return assemble(pineParts(0x2c5f4a, 0xf4f8f6, 0), this.flex) } },
  oak: { id: 'oak', name: 'Broadleaf tree', tree: true, gloss: false, scale: [0.85, 1.4], palette: LEAF, flex: 0.2,
    build() {
      return assemble([
        part(cyl(0.2, 0.32, 2, 6), BARK),
        part(clump(1.5, [1.1, 0.9, 1.1], [0, 3, 0]), SHADE, { top: WHITE, tint: 1, flat: true }),
        part(clump(1, [1, 0.9, 1], [1.05, 2.45, 0.3]), SHADE, { top: WHITE, tint: 1, flat: true }),
        part(clump(0.95, [1, 0.9, 1], [-0.85, 2.7, -0.5]), SHADE, { top: WHITE, tint: 1, flat: true }),
      ], this.flex)
    } },
  birch: { id: 'birch', name: 'Birch', tree: true, gloss: false, scale: [0.85, 1.3], palette: [0x8fbf4f, 0xa8cc55, 0x7fb04a], flex: 0.26,
    build() {
      return assemble([
        part(cyl(0.09, 0.13, 3.4, 5), 0xe6e2d6),
        part(clump(0.95, [0.9, 1.35, 0.9], [0, 3.7, 0]), SHADE, { top: WHITE, tint: 1, flat: true }),
        part(clump(0.6, [1, 1.1, 1], [0.45, 2.7, 0.15]), SHADE, { top: WHITE, tint: 1, flat: true }),
      ], this.flex)
    } },
  palm: { id: 'palm', name: 'Palm', tree: true, gloss: false, scale: [0.9, 1.4], palette: [0x4f9a4a, 0x5aa850, 0x468c4e], flex: 0.3,
    build() {
      return assemble([
        part(tube([[0, 0, 0], [0.3, 2, 0], [0.9, 4.2, 0]], 0.16, 5), 0x8a6a48),
        ...fronds(7, 2.3, 0.7, 1.1, 0.45, [0.9, 4.2, 0]).map(item => part(item, SHADE, { top: WHITE, tint: 1 })),
        ...[0, 2.1, 4.2].map(angle => part(clump(0.16, [1, 1, 1], [0.9 + Math.cos(angle) * 0.2, 4.05, Math.sin(angle) * 0.2]), 0x5d4630)),
      ], this.flex)
    } },
  acacia: { id: 'acacia', name: 'Acacia', tree: true, gloss: false, scale: [0.9, 1.4], palette: [0x7d9a48, 0x8aa350, 0x6f8d45], flex: 0.12,
    build() {
      return assemble([
        part(cyl(0.13, 0.24, 2.7, 5), 0x7a6248),
        part(clump(2, [1.2, 0.3, 1.2], [0, 3, 0]), SHADE, { top: WHITE, tint: 1, flat: true }),
        part(clump(1.2, [1.1, 0.28, 1.1], [0.9, 3.45, 0.5]), SHADE, { top: WHITE, tint: 1, flat: true }),
      ], this.flex)
    } },
  cactus: { id: 'cactus', name: 'Cactus', tree: true, gloss: false, scale: [0.8, 1.5], palette: [WHITE], flex: 0.02,
    build() {
      const arm = (x: number, y: number) => [
        part(new THREE.CapsuleGeometry(0.17, 0.55, 3, 6).translate(x, y + 0.3, 0), 0x5c9463, { top: 0x74ab70 }),
        part(new THREE.CylinderGeometry(0.15, 0.15, Math.abs(x), 6).rotateZ(Math.PI / 2).translate(x / 2, y, 0), 0x5c9463),
      ]
      return assemble([
        part(new THREE.CapsuleGeometry(0.3, 1.5, 3, 7).translate(0, 1.05, 0), 0x5c9463, { top: 0x74ab70 }),
        ...arm(0.58, 1.15), ...arm(-0.52, 1.5),
        part(clump(0.12, [1, 0.8, 1], [0, 2.14, 0]), 0xf28ab0),
      ], this.flex)
    } },
  bareTree: { id: 'bareTree', name: 'Winter tree', tree: true, gloss: false, scale: [0.85, 1.3], palette: [WHITE], flex: 0.1,
    build() {
      const parts = [part(cyl(0.14, 0.28, 2.8, 5), 0x6a5a4c)]
      for (let i = 0; i < 4; i++) {
        const lean = 0.65 + (i % 2) * 0.2, turn = i * 1.7, length = 1.7 - i * 0.15
        parts.push(part(cyl(0.04, 0.1, length, 4).rotateZ(lean).rotateY(turn).translate(0, 1.7 + i * 0.3, 0), 0x6a5a4c))
        parts.push(part(clump(0.3, [1.2, 0.5, 1.2], [-Math.sin(lean) * length, Math.cos(lean) * length, 0]).rotateY(turn).translate(0, 1.75 + i * 0.3, 0), 0xf4f8f6, { flat: true }))
      }
      parts.push(part(clump(0.28, [1.2, 0.5, 1.2], [0, 2.85, 0]), 0xf4f8f6, { flat: true }))
      return assemble(parts, this.flex)
    } },
  bush: { id: 'bush', name: 'Bush', tree: false, gloss: false, scale: [0.7, 1.4], palette: [0x4f8a45, 0x5d9a4a, 0x47803f], flex: 0.05,
    build() {
      return assemble([
        part(clump(0.75, [1.1, 0.8, 1.1], [0, 0.5, 0]), SHADE, { top: WHITE, tint: 1, flat: true }),
        part(clump(0.5, [1, 0.85, 1], [0.6, 0.38, 0.2]), SHADE, { top: WHITE, tint: 1, flat: true }),
      ], this.flex)
    } },
  fern: { id: 'fern', name: 'Fern', tree: false, gloss: false, scale: [0.8, 1.6], palette: [0x3f8f46, 0x4a9a4c, 0x37823f], flex: 0.08,
    build() { return assemble(fronds(7, 1.1, 0.36, 0.55, 0.75, [0, 0.05, 0]).map(item => part(item, SHADE, { top: WHITE, tint: 1 })), this.flex) } },
  flowers: { id: 'flowers', name: 'Flower patch', tree: false, gloss: false, scale: [0.9, 1.6], palette: [0xffffff, 0xffd84a, 0xe8503a, 0x9a6ae0, 0xf58ab8], flex: 0.08,
    build() { return assemble(flowerParts(), this.flex) } },
  grass: { id: 'grass', name: 'Grass tuft', tree: false, gloss: false, scale: [0.8, 1.6], palette: [0x88aa50, 0x7da048, 0x94b458], flex: 0.12,
    build() { return assemble([part(blades(7, 0.75, 0.12, 0.13), 0xa8a8a8, { top: WHITE, tint: 1 })], this.flex) } },
  reeds: { id: 'reeds', name: 'Reeds', tree: false, gloss: false, scale: [0.8, 1.3], palette: [WHITE], flex: 0.2,
    build() {
      return assemble([
        part(blades(6, 1.6, 0.07, 0.07), 0x6f9650, { top: 0xa9bf6a }),
        ...[[0.06, 1.3], [-0.05, 1.55]].flatMap(([x, height]) => [
          part(cyl(0.018, 0.018, height, 3).translate(x, 0, x), 0x7fa35a),
          part(cyl(0.055, 0.055, 0.3, 4, height - 0.05, false).translate(x, 0, x), 0x6b4a32),
        ]),
      ], this.flex)
    } },
  rock: { id: 'rock', name: 'Rock', tree: false, gloss: false, scale: [0.6, 1.8], palette: [0x8d8a84, 0x9a958c, 0x7f7d7a], flex: 0,
    build() {
      return assemble([
        part(clump(0.8, [1.25, 0.7, 0.95], [0, 0.35, 0]), 0xc4c4c4, { top: WHITE, tint: 1, flat: true }),
        part(clump(0.45, [1, 0.7, 1], [0.75, 0.2, 0.3]), 0xc4c4c4, { top: WHITE, tint: 1, flat: true }),
      ], this.flex)
    } },
  toadstool: { id: 'toadstool', name: 'Toadstool', tree: false, gloss: false, scale: [0.25, 0.5], palette: [0xe9558a, 0xb07ae8, 0x5fc8d8], flex: 0.03,
    build() { return assemble(toadstoolParts(), this.flex) } },
  // ---- Blossom Haven ----
  lollipop: { id: 'lollipop', name: 'Spiral lollipop', tree: true, gloss: true, scale: [0.65, 1.35], palette: CANDY, flex: 0.1,
    build() { return assemble(lollipopParts(), this.flex) } },
  ballPop: { id: 'ballPop', name: 'Ball lollipop', tree: true, gloss: true, scale: [0.7, 1.3], palette: [0xf27aa5, 0x7fc8e8, 0xf6c453, 0xb79ae6], flex: 0.1,
    build() {
      const band = (turn: number) => new THREE.TorusGeometry(1.07, 0.09, 4, 14).rotateX(Math.PI / 2 + turn).translate(0, 4.2, 0)
      return assemble([
        part(cyl(0.12, 0.17, 3.4, 6), CREAM),
        part(ball(1.05, [0, 4.2, 0]), SOFT_SHADE, { top: WHITE, tint: 1 }),
        part(band(0.45), CREAM), part(band(-0.45), CREAM),
      ], this.flex)
    } },
  cane: { id: 'cane', name: 'Candy cane', tree: true, gloss: true, scale: [0.65, 1.35], palette: [WHITE], flex: 0.05,
    build() { return assemble(caneParts(), this.flex) } },
  cottonTree: { id: 'cottonTree', name: 'Cotton candy tree', tree: true, gloss: false, scale: [0.8, 1.4], palette: [0xf7a8cc, 0xa9d4f5, 0xcdb2f0, 0xa8e6cf], flex: 0.14,
    build() {
      const places: [number, [number, number, number]][] = [[1.25, [0, 3.9, 0]], [0.78, [0.98, 3.4, 0.3]], [0.75, [-0.9, 3.5, -0.35]], [0.72, [0.15, 3.35, 1]], [0.7, [-0.2, 3.45, -1]], [0.7, [0.1, 4.9, 0]]]
      return assemble([
        part(cyl(0.1, 0.3, 2.9, 7), 0xfff3e0),
        ...places.map(([radius, at]) => part(puff(radius, [1.1, 0.95, 1.1], at), 0xcfcfcf, { top: WHITE, tint: 1 })),
      ], this.flex)
    } },
  iceCream: { id: 'iceCream', name: 'Ice cream tree', tree: true, gloss: true, scale: [0.8, 1.5], palette: [0xf59ac0, 0x9adbc5, 0xf7d27a, 0xc3a6ee], flex: 0.04,
    build() {
      return assemble([
        part(new THREE.ConeGeometry(0.8, 2.4, 10, 1, false).rotateX(Math.PI).translate(0, 1.2, 0), 0xcf9550, { top: 0xe8b878 }),
        part(ball(0.92, [0, 2.75, 0]), SOFT_SHADE, { top: WHITE, tint: 1 }),
        part(ball(0.74, [0, 3.85, 0]), 0xfff3dc),
        part(ball(0.2, [0.08, 4.68, 0], 8, 6), 0xd8324e),
      ], this.flex)
    } },
  blossomTree: { id: 'blossomTree', name: 'Blossom tree', tree: true, gloss: false, scale: [0.85, 1.45], palette: [0xffb4d8, 0xffc9e2, 0xf79ac4, 0xffe3ee], flex: 0.18,
    build() {
      const places: [number, [number, number, number]][] = [[1.3, [0, 3.5, 0]], [0.95, [1.15, 3, 0.3]], [0.9, [-1, 3.1, -0.4]], [0.8, [0.2, 3.1, 1]], [0.75, [0.1, 4.4, 0.1]]]
      return assemble([
        part(tube([[0, 0, 0], [0.15, 1.2, 0], [-0.1, 2.5, 0.1]], 0.2, 6), 0x8a5f7a),
        part(cyl(0.06, 0.12, 1.3, 4).rotateZ(-0.8).translate(0.1, 1.5, 0), 0x8a5f7a),
        part(cyl(0.06, 0.12, 1.2, 4).rotateZ(0.8).translate(0, 1.7, -0.1), 0x8a5f7a),
        ...places.map(([radius, at]) => part(puff(radius, [1.15, 0.95, 1.15], at), 0xdcdcdc, { top: WHITE, tint: 1 })),
      ], this.flex)
    } },
  giantFlower: { id: 'giantFlower', name: 'Giant flower', tree: true, gloss: false, scale: [0.8, 1.5], palette: [0xff9ec7, 0xfff2f7, 0xc9a8f5, 0xffc46b, 0x9fd8f2], flex: 0.22,
    build() { return assemble(giantFlowerParts(), this.flex) } },
  gumdrops: { id: 'gumdrops', name: 'Gumdrops', tree: false, gloss: true, scale: [0.7, 1.4], palette: CANDY, flex: 0,
    build() {
      const drop = (size: number, x: number, z: number) => new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.55 * size, 0.62 * size, 0.55 * size).translate(x, 0, z)
      return assemble([drop(1, 0, 0), drop(0.8, 0.85, 0.3), drop(0.65, -0.5, 0.65)].map(item => part(item, SOFT_SHADE, { top: WHITE, tint: 1 })), this.flex)
    } },
  marshmallow: { id: 'marshmallow', name: 'Marshmallows', tree: false, gloss: false, scale: [0.7, 1.6], palette: [0xfff6ea, 0xffd9e6, 0xffe9c9], flex: 0,
    build() {
      return assemble([
        part(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 9).translate(0, 0.3, 0), SOFT_SHADE, { top: WHITE, tint: 1 }),
        part(new THREE.CylinderGeometry(0.4, 0.4, 0.45, 9).rotateZ(0.3).translate(0.2, 0.84, 0.1), SOFT_SHADE, { top: WHITE, tint: 1 }),
      ], this.flex)
    } },
  crystal: { id: 'crystal', name: 'Sugar crystal', tree: true, gloss: true, scale: [0.7, 1.7], palette: [0xf7b6d8, 0xa8e4ee, 0xcdb8f6], flex: 0,
    build() { return assemble(crystalParts(), this.flex) } },
}

const built = new Map<SpeciesId, THREE.BufferGeometry>()
/** The geometry of a plant. It is built one time, and each planting shares it. */
export function speciesGeometry(id: SpeciesId) {
  let geometry = built.get(id)
  if (!geometry) { geometry = SPECIES[id].build(); built.set(id, geometry) }
  return geometry
}
export function speciesTriangles(id: SpeciesId) { return speciesGeometry(id).index!.count / 3 }
