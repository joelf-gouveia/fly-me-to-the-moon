import * as THREE from 'three'
import { replacements } from './fairytale'
import { createFairytaleCreature } from './fairytale-models'
import type { Species } from './habitat'
import { createCreature } from './models'
import { CreatureObstacles, populateSphere, sampleResident, SphericalHabitat } from './spherical'

const everything = { details: true, tails: true, motion: true }
const allMagic = { details: true, magic: true, motion: true }

/** Earth keeps its animals. Blossom Haven gets the fairytale creature of the same slot. */
function createResident(kind: Species, fairy: boolean) {
  if (!fairy) {
    const model = createCreature(kind, false)
    return { root: model.root, animate: (time: number, moving: boolean) => model.animate(time, moving, everything), dispose: model.dispose }
  }
  const model = createFairytaleCreature(replacements[kind], { merge: true })
  model.root.userData.fairytale = replacements[kind]
  return { root: model.root, animate: (time: number, moving: boolean) => model.animate(time, moving, allMagic), dispose: model.dispose }
}

/** A world's residents survive camera movement; only terrain regeneration replaces them. */
export function createPopulation(
  parent: THREE.Group, groundGeometry: THREE.SphereGeometry, waterGeometry: THREE.SphereGeometry,
  radius: number, fairy: boolean, obstacles: CreatureObstacles, seed: number, anchor: THREE.Vector3, visibleLimit = 28,
) {
  const ground = new SphericalHabitat(groundGeometry, radius), water = new SphericalHabitat(waterGeometry, radius)
  // Earth gets a modest 25% increase; home keeps its original population.
  // Existing spacing, habitat rejection, and visible-model limits stay intact.
  const residents = populateSphere(ground, obstacles, seed, anchor, fairy ? 32 : 40)
  const group = new THREE.Group(); group.name = 'wildlife'; parent.add(group)
  const models = new Map<number, ReturnType<typeof createResident>>()
  const normal = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3()
  const localCamera = new THREE.Vector3(), basis = new THREE.Matrix4(), inverseParentRotation = new THREE.Quaternion()
  let time = 0, disposed = false
  const origins = residents.map(resident => resident.route[0].clone().multiplyScalar(radius))

  function update(delta: number, cameraPosition: THREE.Vector3) {
    if (disposed) return
    time += delta
    inverseParentRotation.copy(parent.quaternion).invert()
    localCamera.copy(cameraPosition).sub(parent.position).applyQuaternion(inverseParentRotation)
    const nearby = origins.map((origin, index) => ({ index, distance: origin.distanceToSquared(localCamera) }))
      .filter(item => item.distance < 97 * 97).sort((a, b) => a.distance - b.distance).slice(0, visibleLimit)
    for (const [index, model] of models) {
      model.root.visible = false
      if (origins[index].distanceToSquared(localCamera) > 180 * 180) {
        group.remove(model.root); model.dispose(); models.delete(index)
      }
    }
    for (const { index } of nearby) {
      const resident = residents[index]
      const moving = sampleResident(resident, time, normal, forward)
      const elevation = (resident.kind === 'duck' ? water : ground).radiusAt(normal)
      if (!Number.isFinite(elevation)) continue
      let model = models.get(index)
      if (!model) {
        model = createResident(resident.kind, fairy)
        model.root.name = `creature-${resident.kind}-${index}`
        model.root.userData.species = resident.kind
        model.root.scale.setScalar(resident.scale)
        models.set(index, model); group.add(model.root)
      }
      model.root.visible = true
      model.root.position.copy(normal).multiplyScalar(elevation + 0.025)
      right.crossVectors(normal, forward).normalize()
      basis.makeBasis(right, normal, forward)
      model.root.quaternion.setFromRotationMatrix(basis)
      model.animate(time + resident.phase, moving)
    }
  }
  function dispose() {
    disposed = true
    models.forEach(model => model.dispose()); models.clear()
    group.clear(); parent.remove(group)
  }
  return { residents, group, ground, water, obstacles, update, dispose }
}

export type CreaturePopulation = ReturnType<typeof createPopulation>
