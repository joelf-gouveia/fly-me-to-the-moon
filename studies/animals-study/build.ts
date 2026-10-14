import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCreature } from '../../src/creatures/models'
import { createFairytaleCreature } from '../../src/creatures/fairytale-models'
import type { Fairytale } from '../../src/creatures/fairytale'
import type { Species as EarthKind } from '../../src/creatures/habitat'
import { shapeOf } from './shapes'
import type { Code, Gait, Part, Shape } from './shapes'

/**
 * The three looks of a species, from one list of parts (shapes.ts) or from a model of the game:
 *
 * - `partsModel()`: one mesh for each part, moved by code on the CPU. This is how the animals of
 *   Earth are drawn today (src/creatures/models.ts): option A.
 * - `joinedGeometry('near')`: all the parts in one geometry with a colour and a rig value in each
 *   vertex. A shader (`rigMaterial()`) turns the legs, the head, the tail, the wings and the fins on
 *   the graphics card, so one InstancedMesh draws a whole herd in one draw call: options B and C.
 * - `joinedGeometry('far')`: the same parts with fewer faces and no small details, and no motion.
 */
export type Quality = 'near' | 'far' | 'parts'

const EARTH_KINDS = ['cow', 'sheep', 'rabbit', 'duck'] as const
const HAVEN_KINDS = ['unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus'] as const
export const isGameKind = (id: string): id is EarthKind | Fairytale => (EARTH_KINDS as readonly string[]).includes(id) || (HAVEN_KINDS as readonly string[]).includes(id)

const primitives = new Map<string, THREE.BufferGeometry>()
function primitive(shape: Part['shape'], quality: Quality) {
  const key = `${shape}-${quality}`
  let geometry = primitives.get(key)
  if (!geometry) {
    const [w, h] = quality === 'far' ? [6, 4] : quality === 'near' ? [10, 7] : [12, 8]
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

/** The joined geometry of a species. It is made once for each species and look, and shared. */
const joined = new Map<string, THREE.BufferGeometry>()
export function joinedGeometry(id: string, quality: 'near' | 'far') {
  const key = `${id}-${quality}`
  const known = joined.get(key)
  if (known) return known
  const pieces = isGameKind(id) ? gamePieces(id, quality) : shapePieces(shapeOf(id), quality)
  const geometry = mergeGeometries(pieces)
  pieces.forEach(p => p.dispose())
  geometry.computeBoundingSphere()
  joined.set(key, geometry)
  return geometry
}

const colour = new THREE.Color()
function shapePieces(shape: Shape, quality: 'near' | 'far') {
  const pieces: THREE.BufferGeometry[] = []
  for (const part of shape.parts) {
    // The far model leaves out the details and the very small parts.
    if (quality === 'far' && (part.detail || Math.max(...part.s) < 0.035)) continue
    const geometry = primitive(part.shape, quality).clone()
    matrix.compose(new THREE.Vector3(...part.p), quaternion.setFromEuler(euler.set(...part.r)), new THREE.Vector3(...part.s))
    geometry.applyMatrix4(matrix)
    pieces.push(piece(geometry, colour.setHex(part.colour), { code: part.code, pivot: part.pivot, side: part.side }, true))
  }
  return pieces
}

/**
 * The game models of today, baked as the friend of src/friend.ts bakes them: the parts of the full
 * model in the frame of the model. The legs and the head get a rig from where they are, so the
 * shader can move them as it moves the new species.
 */
const GAME_RIG: Record<string, { hip: number; head?: [y: number, z: number, minZ: number, minY: number]; tail?: [number, number, number] }> = {
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
function gameModel(id: EarthKind | Fairytale) {
  if ((EARTH_KINDS as readonly string[]).includes(id)) {
    const model = createCreature(id as EarthKind, false)
    model.animate(0, false, { details: true, tails: true, motion: false })
    return model
  }
  const model = createFairytaleCreature(id as Fairytale)
  model.animate(0, false, { details: true, magic: false, motion: false })
  return model
}
function gamePieces(id: EarthKind | Fairytale, quality: 'near' | 'far') {
  const model = gameModel(id)
  model.root.updateMatrixWorld(true)
  const rig = GAME_RIG[id], pieces: THREE.BufferGeometry[] = [], centre = new THREE.Vector3(), size = new THREE.Vector3()
  model.root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh)) return
    const material = object.material as THREE.MeshStandardMaterial
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

/** The gait of a species: the shape's gait, or a gait for a game model. */
export function gaitOf(id: string): Gait {
  if (!isGameKind(id)) return shapeOf(id).gait
  const walk = { leg: 0.3, nod: 0.3, wing: 0, tail: 0.18, rate: 5 }
  return id === 'cow' || id === 'unicorn' ? { ...walk, rate: 3.5 } : id === 'rabbit' || id === 'duck' || id === 'frogPrince' ? { ...walk, leg: 0, nod: 0 } : walk
}
export const flatOf = (id: string) => isGameKind(id) ? (EARTH_KINDS as readonly string[]).includes(id) : shapeOf(id).flat
export const shineOf = (id: string) => isGameKind(id) ? ((EARTH_KINDS as readonly string[]).includes(id) ? 0.92 : 0.72) : shapeOf(id).shine

// ---- The shader of the joined models ----------------------------------------------------------------

/** The clock of the rig of all the joined models, in seconds. The fauna sets it at each frame. */
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
/** The material of a joined model that moves on the graphics card. Use it with an InstancedMesh that has `aMove`. */
export function rigMaterial(id: string) {
  const gait = gaitOf(id), flat = flatOf(id)
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: shineOf(id), flatShading: flat })
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
  material.customProgramCacheKey = () => `animal-rig-${flat}`
  return material
}
/** The material of a far model: no motion. */
export function farMaterial(id: string) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: shineOf(id), flatShading: flatOf(id) })
}

// ---- Option A: one mesh for each part ----------------------------------------------------------------

export type PartsModel = { root: THREE.Object3D; meshes: number; animate(time: number, moving: number, phase: number): void; dispose(): void }

/** A model as the game draws the animals today: one mesh for each part, and the moving parts in groups. */
export function partsModel(id: string): PartsModel {
  if (isGameKind(id)) {
    if ((EARTH_KINDS as readonly string[]).includes(id)) {
      const model = createCreature(id as EarthKind, false)
      return { root: model.root, meshes: count(model.root), animate: (time, moving) => model.animate(time, moving > 0.5, { details: true, tails: true, motion: true }), dispose: model.dispose }
    }
    const model = createFairytaleCreature(id as Fairytale, { merge: true })
    return { root: model.root, meshes: count(model.root), animate: (time, moving) => model.animate(time, moving > 0.5, { details: true, magic: true, motion: true }), dispose: model.dispose }
  }
  const shape = shapeOf(id), root = new THREE.Group()
  const materials = new Map<number, THREE.MeshStandardMaterial>()
  const groups = new Map<string, { group: THREE.Group; part: Part }>()
  for (const part of shape.parts) {
    let material = materials.get(part.colour)
    if (!material) { material = new THREE.MeshStandardMaterial({ color: part.colour, roughness: shape.shine, flatShading: shape.flat }); materials.set(part.colour, material) }
    const key = `${part.code}|${part.pivot.join(',')}|${part.side}`
    let holder = groups.get(key)
    if (!holder) {
      const group = new THREE.Group()
      if (part.code === 5) group.position.set(part.side * part.pivot[1], part.pivot[0], 0)
      else if (part.code) group.position.set(0, part.pivot[0], part.pivot[1])
      root.add(group)
      holder = { group, part }; groups.set(key, holder)
    }
    const mesh = new THREE.Mesh(primitive(part.shape, 'parts'), material)
    mesh.position.set(...part.p).sub(holder.group.position)
    mesh.rotation.set(...part.r)
    mesh.scale.set(...part.s)
    holder.group.add(mesh)
  }
  const { gait } = shape
  return {
    root, meshes: shape.parts.length,
    animate(time, moving, phase) {
      const t = time * gait.rate + phase
      for (const { group, part } of groups.values()) {
        if (part.code === 1 || part.code === 2) group.rotation.x = Math.sin(t + (part.code === 2 ? Math.PI : 0)) * gait.leg * moving
        else if (part.code === 3) group.rotation.x = (1 - moving) * gait.nod * (0.8 + 0.2 * Math.sin(time * 1.7 + phase))
        else if (part.code === 4) group.rotation.y = Math.sin(time * 2.3 + phase) * gait.tail
        else if (part.code === 5) group.rotation.z = part.side * Math.sin(t) * gait.wing * (0.35 + 0.65 * moving)
        else if (part.code === 6) group.rotation.y = Math.sin(t) * 0.35
      }
    },
    dispose() { materials.forEach(material => material.dispose()) },
  }
}
const count = (root: THREE.Object3D) => { let meshes = 0; root.traverse(object => { if (object instanceof THREE.Mesh) meshes++ }); return meshes }
