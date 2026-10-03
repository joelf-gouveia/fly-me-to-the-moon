import * as THREE from 'three'
import type { World } from '../../src/worlds'
import { addFoliage, siteOf } from '../../src/foliage/build'
import type { FoliageUniforms } from '../../src/foliage/build'
import type { SpeciesId } from '../../src/foliage/species'
import { plan } from '../../src/foliage/planting'
import type { Batch, Levers, PlanStats } from '../../src/foliage/planting'
import { createFields, groundColour } from '../../src/foliage/zones'
import type { OptionId } from '../../src/foliage/zones'
import { buildBefore } from './before'

/**
 * Puts a planting on a world of the lab, in place of the plants of the game. The game has
 * look B of the study on both worlds. "Before" in the study is the planting before that change
 * (before.ts), as the clips show it.
 */
export type Planting = { stats: PlanStats & { ms: number }; uniforms: FoliageUniforms; dispose(): void }
export { siteOf }

/** The plants of the game on a world: the instanced meshes of src/foliage/build.ts. */
function gamePlants(world: World) {
  return world.surface.children.filter((object): object is THREE.InstancedMesh => object instanceof THREE.InstancedMesh && object.name.startsWith('foliage-'))
}
const trianglesOf = (mesh: THREE.InstancedMesh) => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3 * mesh.count

function addBatches(world: World, batches: Batch[], uniforms: FoliageUniforms) {
  const meshes = addFoliage(world, batches, uniforms)
  // A study name, so the meshes are not hidden as plants of the game.
  meshes.forEach(mesh => { mesh.name = `study-${mesh.name}` })
  return () => {
    const materials = new Set(meshes.map(mesh => mesh.material as THREE.Material))
    for (const mesh of meshes) { world.surface.remove(mesh); mesh.dispose() }
    materials.forEach(material => material.dispose())
  }
}

/** Paints the grass of the ground with the colours of the zones. The sand, the stone and the snow stay. Returns the undo. */
function paintGround(world: World, option: OptionId) {
  const ground = world.surface.children[0] as THREE.Mesh
  const colours = ground.geometry.attributes.color as THREE.BufferAttribute, positions = ground.geometry.attributes.position
  const before = (colours.array as Float32Array).slice()
  const fields = createFields(world.seed), fairy = world.kind === 'fairy'
  const direction = new THREE.Vector3(), colour = new THREE.Color()
  for (let i = 0; i < positions.count; i++) {
    direction.fromBufferAttribute(positions, i).normalize()
    const sample = world.sample(direction.x, direction.y, direction.z)
    // The rules of buildGround() in src/worlds.ts: only the grass takes a new colour.
    if (sample.height < 0.7 || sample.height > (fairy ? 5.5 : 8.5)) continue
    if (!fairy && (Math.abs(direction.y) > 0.9 || sample.height > 12)) continue
    groundColour(option, direction.x, direction.y, direction.z, sample, fields, colour)
    colour.multiplyScalar(0.87 + sample.detail * 0.22 + Math.max(0, sample.height) * 0.014)
    colours.setXYZ(i, colour.r, colour.g, colour.b)
  }
  colours.needsUpdate = true
  return () => { (colours.array as Float32Array).set(before); colours.needsUpdate = true }
}

/** A planting of an option on a world. Option E0 or H0 shows the plants before look B came to the game. */
export function plant(world: World, option: OptionId, levers: Levers): Planting {
  const uniforms: FoliageUniforms = { wind: { value: new THREE.Vector2(0, levers.wind ? 1 : 0) }, glow: { value: 0 } }
  const game = gamePlants(world)
  game.forEach(mesh => { mesh.visible = false })
  const today = option === 'E0' || option === 'H0'
  // With the ground lever off, the grass has the one colour of the game before.
  const restoreGround = paintGround(world, today || !levers.ground ? (world.kind === 'fairy' ? 'H0' : 'E0') : option)
  const restore = () => { restoreGround(); game.forEach(mesh => { mesh.visible = true }) }
  if (today) {
    const before = buildBefore(world)
    const count = (index: number) => before[index]?.count ?? 0
    const earth = world.kind === 'earth'
    const stats = {
      // An Earth tree is two meshes (crown, trunk). A lollipop is four, then the canes, the stones and the gumdrops.
      trees: earth ? count(0) : count(0) + count(4), small: earth ? count(2) : count(5) + count(6), kinds: before.length,
      triangles: Math.round(before.reduce((sum, mesh) => sum + trianglesOf(mesh), 0)), zones: {}, ms: 0,
    }
    return { stats, uniforms, dispose() { for (const mesh of before) { world.surface.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); mesh.dispose() } restore() } }
  }
  const start = performance.now()
  const { batches, stats } = plan(option, siteOf(world), levers)
  const ms = Math.round(performance.now() - start)
  const removeBatches = addBatches(world, batches, uniforms)
  return { stats: { ...stats, ms }, uniforms, dispose() { removeBatches(); restore() } }
}

/** Single plants for the plant sheets. `position` is the planet-local point of the base of a plant, and `up` its local up direction. */
export function plantRow(world: World, items: { species: SpeciesId; position: THREE.Vector3; up: THREE.Vector3; size: number; colour: number }[]) {
  const uniforms: FoliageUniforms = { wind: { value: new THREE.Vector2(0, 1) }, glow: { value: 0 } }
  const axis = new THREE.Vector3(0, 1, 0), dummy = new THREE.Object3D()
  const batches: Batch[] = items.map(item => {
    dummy.position.copy(item.position)
    dummy.quaternion.setFromUnitVectors(axis, item.up)
    dummy.scale.setScalar(item.size)
    dummy.updateMatrix()
    const colour = new THREE.Color(item.colour)
    return { species: item.species, count: 1, matrices: new Float32Array(dummy.matrix.elements), colours: new Float32Array([colour.r, colour.g, colour.b]) }
  })
  const game = gamePlants(world)
  game.forEach(mesh => { mesh.visible = false })
  const removeBatches = addBatches(world, batches, uniforms)
  return { uniforms, dispose() { removeBatches(); game.forEach(mesh => { mesh.visible = true }) } }
}
