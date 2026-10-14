import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCreature } from './models'
import { createFairytaleCreature } from './fairytale-models'
import type { Fairytale } from './fairytale'
import type { Species as FirstAnimal } from './habitat'
import { shapeOf, SHAPE_IDS } from './shapes'
import type { Code, Gait, Part, Shape } from './shapes'

/**
 * The two looks of a kind for the herds (docs/animals-study.md), from one list of parts
 * (src/creatures/shapes.ts) or from a model of the first game:
 *
 * - `joinedGeometry(id, 'near')`: all the parts in one geometry with a colour and a rig value in
 *   each vertex. A shader (`rigMaterial()`) turns the legs, the head, the tail, the wings and the
 *   fins on the graphics card, so one InstancedMesh draws a whole herd in one draw call.
 * - `joinedGeometry(id, 'far')`: the same parts with fewer faces and no small details, and no motion.
 */
export type Quality = 'near' | 'far'

const FIRST_EARTH = ['cow', 'sheep', 'rabbit', 'duck'] as const
const FIRST_HAVEN = ['unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus'] as const
/** The kinds of the first game: their models come from src/creatures/models.ts and src/creatures/fairytale-models.ts. */
export const isFirstKind = (id: string): id is FirstAnimal | Fairytale => (FIRST_EARTH as readonly string[]).includes(id) || (FIRST_HAVEN as readonly string[]).includes(id)
/** True when the game has a model for the kind. */
export const hasModel = (id: string) => isFirstKind(id) || SHAPE_IDS.includes(id)

const primitives = new Map<string, THREE.BufferGeometry>()
function primitive(shape: Part['shape'], quality: Quality) {
  const key = `${shape}-${quality}`
  let geometry = primitives.get(key)
  if (!geometry) {
    const [w, h] = quality === 'far' ? [6, 4] : [10, 7]
    geometry = shape === 'ball' ? new THREE.SphereGeometry(1, w, h) : shape === 'cone' ? new THREE.ConeGeometry(1, 1, w > 6 ? 8 : 5) : new THREE.CylinderGeometry(1, 1, 1, w > 6 ? 8 : 5)
    primitives.set(key, geometry)
  }
  return geometry
}

const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler()
/** The rig value of a vertex: the code of the moving part, its pivot and its side. */
type Rig = { code: Code; pivot: [number, number]; side: number }

/** One piece: a geometry in the frame of the model, with its colour and its rig in each vertex. */
function piece(geometry: THREE.BufferGeometry, colour: THREE.Color, rig: Rig, indexed: boolean) {
  const placed = indexed ? geometry : geometry.index ? geometry.toNonIndexed() : geometry
  for (const name of Object.keys(placed.attributes)) if (name !== 'position' && name !== 'normal') placed.deleteAttribute(name)
  const count = placed.attributes.position.count
  const colours = new Float32Array(count * 3), rigs = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    colours.set([colour.r, colour.g, colour.b], i * 3)
    rigs.set([rig.code, rig.pivot[0], rig.pivot[1], rig.side], i * 4)
  }
  placed.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  placed.setAttribute('aRig', new THREE.BufferAttribute(rigs, 4))
  return placed
}

/** The joined geometry of a kind. It is made once for each kind and look, and shared by each world. */
const joined = new Map<string, THREE.BufferGeometry>()
export function joinedGeometry(id: string, quality: Quality) {
  const key = `${id}-${quality}`
  const known = joined.get(key)
  if (known) return known
  const pieces = isFirstKind(id) ? firstPieces(id, quality) : shapePieces(shapeOf(id), quality)
  // The pieces of a model of the first game have no index; the parts of a shape have one.
  const geometry = mergeGeometries(pieces.some(p => !p.index) ? pieces.map(p => p.index ? p.toNonIndexed() : p) : pieces)
  pieces.forEach(p => p.dispose())
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()
  joined.set(key, geometry)
  return geometry
}

const colour = new THREE.Color()
function shapePieces(shape: Shape, quality: Quality) {
  const pieces: THREE.BufferGeometry[] = []
  // The far model leaves out the details and the very small parts: small for the size of the kind, so a bee keeps its body.
  const extent = Math.max(...shape.parts.map(part => Math.max(Math.abs(part.p[0]), Math.abs(part.p[1]), Math.abs(part.p[2])) + Math.max(...part.s)))
  const smallest = Math.min(0.035, extent * 0.12)
  for (const part of shape.parts) {
    if (quality === 'far' && (part.detail || Math.max(...part.s) < smallest)) continue
    const geometry = primitive(part.shape, quality).clone()
    matrix.compose(new THREE.Vector3(...part.p), quaternion.setFromEuler(euler.set(...part.r)), new THREE.Vector3(...part.s))
    geometry.applyMatrix4(matrix)
    pieces.push(piece(geometry, colour.setHex(part.colour), { code: part.code, pivot: part.pivot, side: part.side }, true))
  }
  return pieces
}

/**
 * The models of the first game, baked as the friend of src/friend.ts bakes them: the parts of the
 * full model in the frame of the model. The legs and the head get a rig from where they are, so the
 * shader can move them as it moves the new kinds.
 */
const FIRST_RIG: Record<string, { hip: number; head?: [y: number, z: number, minZ: number, minY: number]; tail?: [number, number, number] }> = {
  cow: { hip: 0.55, head: [0.85, 0.5, 0.45, 0.6], tail: [0.88, -0.85, -0.75] },
  sheep: { hip: 0.4, head: [0.7, 0.4, 0.4, 0.5], tail: [0.6, -0.6, -0.6] },
  rabbit: { hip: 0 },
  duck: { hip: 0 },
  unicorn: { hip: 0.5, head: [0.9, 0.32, 0.3, 0.95], tail: [0.85, -0.58, -0.55] },
  dragonling: { hip: 0.28 },
  kitsune: { hip: 0.26 },
  frogPrince: { hip: 0 },
  pegasus: { hip: 0 },
}
function firstModel(id: FirstAnimal | Fairytale) {
  if ((FIRST_EARTH as readonly string[]).includes(id)) {
    const model = createCreature(id as FirstAnimal, false)
    model.animate(0, false, { details: true, tails: true, motion: false })
    return model
  }
  const model = createFairytaleCreature(id as Fairytale)
  model.animate(0, false, { details: true, magic: false, motion: false })
  return model
}
function firstPieces(id: FirstAnimal | Fairytale, quality: Quality) {
  const model = firstModel(id)
  model.root.updateMatrixWorld(true)
  const rig = FIRST_RIG[id], pieces: THREE.BufferGeometry[] = [], centre = new THREE.Vector3(), size = new THREE.Vector3()
  model.root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh)) return
    const material = object.material as THREE.MeshStandardMaterial
    // The magic particles are transparent: they are not part of the joined model.
    if (material.transparent) return
    object.getWorldPosition(centre)
    object.getWorldScale(size)
    if (quality === 'far' && Math.max(size.x, size.y, size.z) < 0.06) return
    let code: Code = 0, pivot: [number, number] = [0, 0]
    if (rig.hip && centre.y < rig.hip - 0.05 && Math.abs(centre.z) > 0.1) {
      code = (centre.x < 0) === (centre.z > 0) ? 1 : 2; pivot = [rig.hip, centre.z]
    } else if (rig.head && centre.z > rig.head[2] && centre.y > rig.head[3]) {
      code = 3; pivot = [rig.head[0], rig.head[1]]
    } else if (rig.tail && centre.z < rig.tail[2]) {
      code = 4; pivot = [rig.tail[0], rig.tail[1]]
    }
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld)
    pieces.push(piece(geometry, colour.copy(material.color), { code, pivot, side: 0 }, false))
  })
  model.dispose()
  return pieces
}

/** The gait of a kind: the shape's gait, or a gait for a model of the first game. */
export function gaitOf(id: string): Gait {
  if (!isFirstKind(id)) return shapeOf(id).gait
  const walk = { leg: 0.3, nod: 0.3, wing: 0, tail: 0.18, rate: 5 }
  return id === 'cow' || id === 'unicorn' ? { ...walk, rate: 3.5 } : id === 'rabbit' || id === 'duck' || id === 'frogPrince' ? { ...walk, leg: 0, nod: 0 } : walk
}
/** The Earth animals are faceted; the jelly and candy creatures of Blossom Haven are smooth. */
export const flatOf = (id: string) => isFirstKind(id) ? (FIRST_EARTH as readonly string[]).includes(id) : shapeOf(id).flat
export const shineOf = (id: string) => isFirstKind(id) ? ((FIRST_EARTH as readonly string[]).includes(id) ? 0.92 : 0.72) : shapeOf(id).shine
/** A kind with a soft light of its own: the phoenix chick, the lantern moth and the firefly glow. */
const GLOW: Record<string, number> = { phoenix: 0.45, lanternMoth: 0.5, firefly: 0.7 }

// ---- The shader of the joined models ----------------------------------------------------------------

/** The clock of the rig of all the joined models, in seconds. src/creatures/population.ts sets it at each frame. */
export const RIG_TIME = { value: 0 }
const RIG_GLSL = /* glsl */`
attribute vec4 aRig;
attribute vec4 aMove;
uniform float uTime;
uniform vec4 uGait;
mat3 rigTurn; vec3 rigPivot;
mat3 rigX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rigY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rigZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
// aRig: x the moving part (1 and 2 legs, 3 head, 4 tail, 5 wing, 6 fin), y and z its pivot, w the side.
// aMove: x the phase of the animal, y how much it walks (0 to 1), z the speed of its gait.
void rig() {
  float code = aRig.x, t = uTime * aMove.z + aMove.x, moving = aMove.y;
  rigTurn = mat3(1.0); rigPivot = vec3(0.0);
  if (code > 0.5 && code < 2.5) {
    rigTurn = rigX(sin(t + (code > 1.5 ? 3.14159 : 0.0)) * uGait.x * moving);
    rigPivot = vec3(0.0, aRig.y, aRig.z);
  } else if (code < 3.5 && code > 2.5) {
    rigTurn = rigX((1.0 - moving) * uGait.y * (0.8 + 0.2 * sin(uTime * 1.7 + aMove.x)));
    rigPivot = vec3(0.0, aRig.y, aRig.z);
  } else if (code < 4.5 && code > 3.5) {
    rigTurn = rigY(sin(uTime * 2.3 + aMove.x) * uGait.w);
    rigPivot = vec3(0.0, aRig.y, aRig.z);
  } else if (code < 5.5 && code > 4.5) {
    rigTurn = rigZ(aRig.w * sin(t) * uGait.z * (0.35 + 0.65 * moving));
    rigPivot = vec3(aRig.w * aRig.z, aRig.y, 0.0);
  } else if (code > 5.5) {
    rigTurn = rigY(sin(t) * 0.35);
    rigPivot = vec3(0.0, aRig.y, aRig.z);
  }
}
`
/**
 * The material of a joined model that moves on the graphics card. Use it with an InstancedMesh that
 * has `aMove`. With reduced motion the population stops RIG_TIME, so the legs stand still.
 */
export function rigMaterial(id: string) {
  const gait = gaitOf(id), flat = flatOf(id)
  const material = baseMaterial(id)
  const uGait = { value: new THREE.Vector4(gait.leg, gait.nod, gait.wing, gait.tail) }
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = RIG_TIME
    shader.uniforms.uGait = uGait
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${RIG_GLSL}`)
      .replace('void main() {', 'void main() {\n  rig();')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  objectNormal = rigTurn * objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = rigTurn * (transformed - rigPivot) + rigPivot;')
  }
  material.customProgramCacheKey = () => `animal-rig-${flat}-${GLOW[id] ? 'glow' : 'plain'}`
  return material
}
/** The material of a far model: no motion. */
export function farMaterial(id: string) {
  return baseMaterial(id)
}
function baseMaterial(id: string) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: shineOf(id), flatShading: flatOf(id) })
  if (GLOW[id]) { material.emissive.set(0xffb347); material.emissiveIntensity = GLOW[id] }
  return material
}

/**
 * The parts of a joined model for the friend of src/friend.ts: the body, and the wings (the parts
 * with the code of a wing). The geometries have no index, a colour in each vertex and no rig.
 * `wings` is null for a kind with no wing parts. Each wing turns up by `wingRest` radians about its
 * root, as the wings of the first friends stand.
 */
export function friendParts(id: string, wingRest = 0) {
  const source = joinedGeometry(id, 'near')
  const flat = source.index ? source.toNonIndexed() : source.clone()
  const position = flat.attributes.position, normal = flat.attributes.normal, colours = flat.attributes.color, rig = flat.attributes.aRig
  const body: number[][] = [[], [], []], wing: number[][] = [[], [], []], pivots: number[] = []
  const p = new THREE.Vector3(), n = new THREE.Vector3(), turn = new THREE.Matrix4(), pivot = new THREE.Vector3()
  for (let i = 0; i < position.count; i += 3) {
    const isWing = rig.getX(i) > 4.5 && rig.getX(i) < 5.5
    const target = isWing ? wing : body
    if (isWing) pivots.push(rig.getY(i))
    // A wing turns about the z axis at its root: [side * root x, root y].
    const side = rig.getW(i)
    if (isWing) turn.makeRotationZ(side * wingRest)
    for (let k = i; k < i + 3; k++) {
      p.fromBufferAttribute(position, k); n.fromBufferAttribute(normal, k)
      if (isWing && wingRest) {
        pivot.set(side * rig.getZ(k), rig.getY(k), 0)
        p.sub(pivot).applyMatrix4(turn).add(pivot)
        n.applyMatrix4(turn)
      }
      target[0].push(p.x, p.y, p.z)
      target[1].push(n.x, n.y, n.z)
      target[2].push(colours.getX(k), colours.getY(k), colours.getZ(k))
    }
  }
  flat.dispose()
  const build = ([p, n, c]: number[][]) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(c, 3))
    return geometry
  }
  return { body: build(body), wings: wing[0].length ? build(wing) : null, wingHeight: pivots.length ? pivots.reduce((a, b) => a + b, 0) / pivots.length : 0, flat: flatOf(id) }
}
