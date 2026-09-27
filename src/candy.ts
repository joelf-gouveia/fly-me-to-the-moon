import * as THREE from 'three'
import { createFairytaleCreature } from './creatures/fairytale-models'
import { seededRandom } from './terrain'
import type { World } from './worlds'
import { LIFE_SCALE } from './proportions'

/** The candy ecosystem is built once in planet-local coordinates, so it travels intact. */
export function buildCandyEcosystem(world: World) {
  const random = seededRandom(world.seed + 2026)
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  const dummy = new THREE.Object3D(), tint = new THREE.Color()
  const colors = [0xeb8cb3, 0xf4c67f, 0xb3a0d0, 0x92c8b4]
  const cream = new THREE.MeshStandardMaterial({ color: 0xffedcf, roughness: 0.75 })
  const candy = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  function batch(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.name = name
    world.surface.add(mesh)
    return mesh
  }
  // Counts grow with the planet's area (src/proportions.ts), so the candy keeps its base density.
  const scaled = (count: number) => Math.round(count * LIFE_SCALE)
  const treeCount = scaled(world.mobile ? 120 : 230), caneCount = scaled(world.mobile ? 75 : 145)
  const stoneCount = scaled(world.mobile ? 80 : 160), flowerCount = scaled(world.mobile ? 225 : 450)
  const sticks = batch('lollipop-stems', new THREE.CylinderGeometry(0.16, 0.22, 4.6, 7).translate(0, 2.3, 0), cream, treeCount)
  const discs = batch('lollipop-crowns', new THREE.CylinderGeometry(1.65, 1.65, 0.42, 24).rotateX(Math.PI / 2).translate(0, 5.4, 0), candy, treeCount)
  const spiralPoints = Array.from({ length: 75 }, (_, i) => {
    const t = i / 74, a = t * Math.PI * 5
    return new THREE.Vector3(Math.cos(a) * t * 1.4, 5.4 + Math.sin(a) * t * 1.4, 0.24)
  })
  const spiralGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), world.mobile ? 36 : 70, 0.1, 5, false)
  const spirals = batch('lollipop-spirals', spiralGeometry, cream, treeCount)
  const backs = batch('lollipop-spirals-back', spiralGeometry.clone().translate(0, 0, -0.48), cream, treeCount)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(), new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 3.8, 0),
    new THREE.Vector3(0.5, 4.5, 0), new THREE.Vector3(1.4, 4.5, 0),
    new THREE.Vector3(1.9, 3.9, 0), new THREE.Vector3(1.9, 3.4, 0),
  ])
  const caneGeometry = new THREE.TubeGeometry(curve, world.mobile ? 28 : 48, 0.25, 7, false)
  const uv = caneGeometry.attributes.uv, stripeColors = new Float32Array(uv.count * 3)
  for (let i = 0; i < uv.count; i++) {
    tint.setHex(Math.floor(uv.getX(i) * 18 + uv.getY(i)) % 2 ? 0xd87797 : 0xffefdb)
    stripeColors.set([tint.r, tint.g, tint.b], i * 3)
  }
  caneGeometry.setAttribute('color', new THREE.BufferAttribute(stripeColors, 3))
  const canes = batch('candy-canes', caneGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }), caneCount)
  const stones = batch('marshmallow-stones', new THREE.SphereGeometry(1, 10, 7).scale(1, 0.62, 0.8).translate(0, 0.5, 0), cream, stoneCount)
  const flowerGeo = new THREE.SphereGeometry(1, 8, 5).scale(0.55, 0.3, 0.55).translate(0, 0.35, 0)
  const flowers = batch('gumdrop-flowers', flowerGeo, candy, flowerCount)
  const counts = { tree: 0, cane: 0, stone: 0, flower: 0 }
  for (let attempt = 0; attempt < 15000 * LIFE_SCALE; attempt++) {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2
    normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    const sample = world.sample(normal.x, normal.y, normal.z)
    if (sample.height < 1 || sample.height > 6 || sample.river > 0.1 || (y < 0 && Math.hypot(normal.x, normal.z) < 0.18)) continue
    dummy.position.copy(normal).multiplyScalar(world.radius + sample.height)
    dummy.quaternion.setFromUnitVectors(up, normal)
    dummy.rotateY(random() * Math.PI * 2)
    dummy.scale.setScalar(0.65 + random() * 0.7)
    dummy.updateMatrix()
    const type = attempt % 5
    if (type < 2 && counts.tree < treeCount) {
      const i = counts.tree++
      for (const mesh of [sticks, discs, spirals, backs]) mesh.setMatrixAt(i, dummy.matrix)
      discs.setColorAt(i, tint.setHex(colors[i % colors.length]))
    } else if (type === 2 && counts.cane < caneCount) canes.setMatrixAt(counts.cane++, dummy.matrix)
    else if (type === 3 && counts.stone < stoneCount) stones.setMatrixAt(counts.stone++, dummy.matrix)
    else if (counts.flower < flowerCount) {
      flowers.setMatrixAt(counts.flower, dummy.matrix)
      flowers.setColorAt(counts.flower++, tint.setHex(colors[attempt % colors.length]))
    }
    if (counts.tree === treeCount && counts.cane === caneCount && counts.stone === stoneCount && counts.flower === flowerCount) break
  }
  sticks.count = discs.count = spirals.count = backs.count = counts.tree
  canes.count = counts.cane; stones.count = counts.stone; flowers.count = counts.flower

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
