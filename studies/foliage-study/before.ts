import * as THREE from 'three'
import { seededRandom } from '../../src/terrain'
import type { World } from '../../src/worlds'
import { LIFE_SCALE } from '../../src/proportions'

/**
 * The plants of the game before the foliage study: the cone trees and the grass of Earth
 * (buildVegetation() of src/worlds.ts at commit b15d508) and the candy of Blossom Haven
 * (buildCandyEcosystem() of src/candy.ts at the same commit). The study shows them as "Before".
 * The meshes are in the order of the game before, and they have the name `before-<part>`.
 */
export function buildBefore(world: World): THREE.InstancedMesh[] {
  return world.kind === 'fairy' ? candyBefore(world) : vegetationBefore(world)
}

function vegetationBefore(world: World) {
  const random = seededRandom(world.seed + 42)
  const count = Math.round(3400 * LIFE_SCALE * (world.mobile ? 0.5 : 1))
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 3.8, 6), new THREE.MeshStandardMaterial({ color: 0x386d48, roughness: 1 }), count)
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.23, 1.4, 5), new THREE.MeshStandardMaterial({ color: 0x715c40, roughness: 1 }), count)
  const blades: number[] = []
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI / 3
    const x = Math.cos(angle) * 0.2, z = Math.sin(angle) * 0.2
    blades.push(-x, 0, -z, x, 0, z, x * 0.6, 0.7 - i * 0.1, z * 0.6)
  }
  const grassGeometry = new THREE.BufferGeometry()
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3))
  grassGeometry.computeVertexNormals()
  const grass = new THREE.InstancedMesh(grassGeometry, new THREE.MeshStandardMaterial({ color: 0x88aa50, roughness: 1, side: THREE.DoubleSide }), count * 4)
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  const dummy = new THREE.Object3D()
  let treeCount = 0, grassCount = 0
  for (let i = 0; i < 55000 * LIFE_SCALE && (treeCount < count || grassCount < count * 4); i++) {
    const y = random() * 1.7 - 0.85
    const angle = random() * Math.PI * 2
    normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    const sample = world.sample(normal.x, normal.y, normal.z)
    if (sample.height < 1.1 || sample.height > 8.5 || sample.river > 0.1) continue
    dummy.quaternion.setFromUnitVectors(up, normal)
    const scale = 0.7 + random() * 0.8
    dummy.scale.setScalar(scale)
    if (treeCount < count && random() > 0.62) {
      dummy.position.copy(normal).multiplyScalar(world.radius + sample.height + 2.4 * scale)
      dummy.updateMatrix(); trees.setMatrixAt(treeCount, dummy.matrix)
      dummy.position.copy(normal).multiplyScalar(world.radius + sample.height + 0.6 * scale)
      dummy.updateMatrix(); trunks.setMatrixAt(treeCount++, dummy.matrix)
    } else if (grassCount < count * 4) {
      dummy.position.copy(normal).multiplyScalar(world.radius + sample.height + 0.22)
      dummy.updateMatrix(); grass.setMatrixAt(grassCount++, dummy.matrix)
    }
  }
  trees.count = trunks.count = treeCount; grass.count = grassCount
  trees.name = 'before-trees'; trunks.name = 'before-trunks'; grass.name = 'before-grass'
  world.surface.add(trees, trunks, grass)
  return [trees, trunks, grass]
}

function candyBefore(world: World) {
  const random = seededRandom(world.seed + 2026)
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  const dummy = new THREE.Object3D(), tint = new THREE.Color()
  const colors = [0xeb8cb3, 0xf4c67f, 0xb3a0d0, 0x92c8b4]
  const cream = new THREE.MeshStandardMaterial({ color: 0xffedcf, roughness: 0.75 })
  const candy = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  const meshes: THREE.InstancedMesh[] = []
  function batch(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.name = `before-${name}`
    world.surface.add(mesh)
    meshes.push(mesh)
    return mesh
  }
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
  const flowers = batch('gumdrop-flowers', new THREE.SphereGeometry(1, 8, 5).scale(0.55, 0.3, 0.55).translate(0, 0.35, 0), candy, flowerCount)
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
  return meshes
}
