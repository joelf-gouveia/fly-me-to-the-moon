import * as THREE from 'three'
import { replacements } from './fairytale'
import { createFairytaleCreature } from './fairytale-models'
import type { Species } from './habitat'
import { canSayHello, createHeartPool, heartCount, heartPool, heartPose, helloLength, helloLift, helloTurn } from './hello'
import type { HeartPose } from './hello'
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

/** The top of a model over its feet, before its scale. It is measured once for each model. */
function topOf(root: THREE.Object3D): number {
  if (root.userData.helloTop === undefined) {
    root.updateWorldMatrix(true, true)
    const inverse = root.matrixWorld.clone().invert(), relative = new THREE.Matrix4()
    const box = new THREE.Box3(), part = new THREE.Box3()
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
      box.union(part.copy(object.geometry.boundingBox!).applyMatrix4(relative.multiplyMatrices(inverse, object.matrixWorld)))
    })
    root.userData.helloTop = box.isEmpty() ? 1 : box.max.y
  }
  return root.userData.helloTop
}

/** A world's residents survive camera movement; only terrain regeneration replaces them. */
export function createPopulation(
  parent: THREE.Group, groundGeometry: THREE.SphereGeometry, waterGeometry: THREE.SphereGeometry,
  radius: number, fairy: boolean, obstacles: CreatureObstacles, seed: number, anchor: THREE.Vector3, visibleLimit = 28,
  mobile = false,
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
  // The hellos. The hearts are children of the world, so they turn and move with it.
  const hearts = createHeartPool(heartPool(mobile)); parent.add(hearts.points)
  const hellos = new Map<number, { at: number; hearts: number; side: THREE.Vector3 }>()
  const lastHello = new Map<number, number>()
  const localFairy = new THREE.Vector3(), toFairy = new THREE.Vector3(), side = new THREE.Vector3()
  const feet = new THREE.Vector3(), point = new THREE.Vector3()
  const facing = new THREE.Quaternion(), pose: HeartPose = { rise: 0, sway: 0, size: 0, alpha: 0, spin: 0 }
  let helloCount = 0

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
  /**
   * The creatures near the fairy say hello. Call it after update(), because update() puts
   * each model back on its route. A delta of 0 (pause) starts no hello and holds each pose.
   * It returns the number of new hellos.
   */
  function greet(delta: number, fairyPosition: THREE.Vector3) {
    if (disposed) return 0
    inverseParentRotation.copy(parent.quaternion).invert()
    localFairy.copy(fairyPosition).sub(parent.position).applyQuaternion(inverseParentRotation)
    let started = 0
    if (delta > 0) {
      for (const [index, model] of models) {
        if (!model.root.visible || hellos.has(index)) continue
        if (!canSayHello(model.root.position.distanceTo(localFairy), time, lastHello.get(index))) continue
        lastHello.set(index, time)
        // The hearts sway at right angles to the line from the creature to the fairy.
        normal.copy(model.root.position).normalize()
        side.crossVectors(normal, toFairy.copy(localFairy).sub(model.root.position))
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0).applyQuaternion(model.root.quaternion)
        hellos.set(index, { at: time, hearts: heartCount(helloCount, mobile), side: side.clone().normalize() })
        helloCount++; started++
      }
    }
    hearts.begin()
    for (const [index, hello] of hellos) {
      const model = models.get(index), age = time - hello.at
      if (!model || !model.root.visible || age > helloLength(hello.hearts)) { hellos.delete(index); continue }
      const root = model.root
      normal.copy(root.position).normalize()
      // Turn toward the fairy on the ground, and back to the route after the hello.
      const turn = helloTurn(age)
      toFairy.copy(localFairy).sub(root.position)
      toFairy.addScaledVector(normal, -toFairy.dot(normal))
      if (turn > 0 && toFairy.lengthSq() > 0.01) {
        forward.copy(toFairy).normalize()
        right.crossVectors(normal, forward).normalize()
        basis.makeBasis(right, normal, forward)
        facing.setFromRotationMatrix(basis)
        root.quaternion.slerp(facing, turn)
      }
      // The hearts start over the head, and the hop goes along the ground normal.
      const top = topOf(root) * root.scale.y
      feet.copy(root.position)
      root.position.addScaledVector(normal, helloLift(age, residents[index].kind === 'duck') * root.scale.y)
      for (let k = 0; k < hello.hearts; k++) {
        if (!heartPose(age, k, pose)) continue
        const spread = (k - (hello.hearts - 1) / 2) * 0.42 + pose.sway
        if (!hearts.add(point.copy(feet).addScaledVector(normal, top + pose.rise).addScaledVector(hello.side, spread), pose)) break
      }
    }
    hearts.end()
    return started
  }
  /** The state of the hellos, for the browser checks. */
  function helloState() {
    return {
      count: helloCount,
      hearts: hearts.count,
      active: [...hellos].flatMap(([index, hello]) => {
        const model = models.get(index)
        if (!model) return []
        normal.copy(model.root.position).normalize()
        const elevation = (residents[index].kind === 'duck' ? water : ground).radiusAt(normal)
        return [{ name: model.root.name, age: time - hello.at, clearance: model.root.position.length() - elevation }]
      }),
    }
  }
  function dispose() {
    disposed = true
    hellos.clear(); hearts.dispose()
    models.forEach(model => model.dispose()); models.clear()
    group.clear(); parent.remove(group)
  }
  return { residents, group, ground, water, obstacles, update, greet, helloState, dispose }
}

export type CreaturePopulation = ReturnType<typeof createPopulation>
