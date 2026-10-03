import * as THREE from 'three'
import { createFairytaleCreature } from './creatures/fairytale-models'
import { seededRandom } from './terrain'
import type { World } from './worlds'

/**
 * The soda bubbles and the pegasus foals of Blossom Haven, built once in planet-local coordinates,
 * so they travel intact. The candy plants are in src/foliage/build.ts.
 */
export function buildCandyEcosystem(world: World) {
  const random = seededRandom(world.seed + 2026)
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  const dummy = new THREE.Object3D()
  function batch(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.name = name
    world.surface.add(mesh)
    return mesh
  }

  const bubbleMaterial = new THREE.MeshStandardMaterial({ color: 0xe5ffff, transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.18 })
  const bubbleCount = world.mobile ? 90 : 180
  const bubbles = batch('soda-bubbles', new THREE.SphereGeometry(1, 7, 5), bubbleMaterial, bubbleCount)
  const bubbleSeeds: { normal: THREE.Vector3; phase: number; size: number }[] = []
  for (let attempt = 0; attempt < 4000 && bubbleSeeds.length < bubbleCount; attempt++) {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2
    normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    if (world.sample(normal.x, normal.y, normal.z).height > -0.4) continue
    bubbleSeeds.push({ normal: normal.clone(), phase: random() * 8, size: 0.2 + random() * 0.35 })
  }
  bubbles.count = bubbleSeeds.length
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  bubbles.frustumCulled = false
  // Five pegasus foals hover over the cottage garden, where the ribbon butterflies were.
  const foals = new THREE.Group()
  foals.name = 'pegasus-foals'
  world.surface.add(foals)
  const flyers: { model: ReturnType<typeof createFairytaleCreature>; base: THREE.Vector3; normal: THREE.Vector3; east: THREE.Vector3; north: THREE.Vector3 }[] = []
  for (let i = 0; i < 5; i++) {
    const n = new THREE.Vector3(Math.sin(i * 1.6) * 0.11, -1, Math.cos(i * 1.6) * 0.11).normalize()
    const sample = world.sample(n.x, n.y, n.z)
    const base = n.clone().multiplyScalar(world.radius + Math.max(0, sample.height) + 2.8)
    const east = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.95 ? up : new THREE.Vector3(1, 0, 0)).normalize()
    const model = createFairytaleCreature('pegasus', { merge: true })
    model.root.name = `pegasus-foal-${i}`
    foals.add(model.root); flyers.push({ model, base, normal: n, east, north: new THREE.Vector3().crossVectors(n, east) })
  }
  const allMagic = { details: true, magic: true, motion: true }
  const forward = new THREE.Vector3(), right = new THREE.Vector3(), basis = new THREE.Matrix4()
  const update = (time: number) => {
    bubbleSeeds.forEach((seed, i) => {
      const progress = (time * 0.4 + seed.phase) % 8
      dummy.position.copy(seed.normal).multiplyScalar(world.radius + 0.3 + progress)
      dummy.quaternion.identity(); dummy.scale.setScalar(seed.size * (1 - progress / 10)); dummy.updateMatrix()
      bubbles.setMatrixAt(i, dummy.matrix)
    })
    bubbles.instanceMatrix.needsUpdate = true
    flyers.forEach(({ model, base, normal: n, east, north }, i) => {
      // A slow 1.2 m circle; the foal faces along its path, with its back to the sky.
      const angle = time * 0.35 + i * 1.3
      model.root.position.copy(base).addScaledVector(n, Math.sin(time * 0.8 + i) * 0.35)
        .addScaledVector(east, Math.cos(angle) * 1.2).addScaledVector(north, Math.sin(angle) * 1.2)
      forward.copy(east).multiplyScalar(-Math.sin(angle)).addScaledVector(north, Math.cos(angle))
      right.crossVectors(n, forward).normalize()
      model.root.quaternion.setFromRotationMatrix(basis.makeBasis(right, n, forward))
      model.animate(time + i, true, allMagic)
    })
  }
  update(0)
  return update
}
