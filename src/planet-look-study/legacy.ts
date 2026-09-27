import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { createTerrain, seededRandom } from '../terrain'
import type { World } from '../worlds'

/*
 * The planets before this study, for the "Before" option. Copies of the old code of src/worlds.ts:
 * buildGasDeck(), the ground colours of buildGround() with the full relief, the cloud puffs in the planet
 * colour, the thick air, and Saturn's five flat rings turned by π / 2.3. The planet has no tilt.
 */

/** The old buildGasDeck(): 30 stripes of the planet colour at 0.65 ± 0.15. */
function oldDeck(world: World) {
  const width = 512, height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(width, height)
  const noise = createNoise3D(seededRandom(world.seed))
  const color = new THREE.Color(), base = new THREE.Color(world.color)
  for (let y = 0; y < height; y++) {
    const lat = y / height * Math.PI
    for (let x = 0; x < width; x++) {
      const lon = x / width * Math.PI * 2
      const n = noise(Math.sin(lat) * Math.cos(lon) * 5, Math.cos(lat) * 5, Math.sin(lat) * Math.sin(lon) * 5)
      const band = Math.sin(lat * 30 + n * 2.5)
      color.copy(base).multiplyScalar(0.65 + band * 0.15 + n * 0.1).convertLinearToSRGB()
      const i = (y * width + x) * 4
      pixels.data[i] = color.r * 255; pixels.data[i + 1] = color.g * 255
      pixels.data[i + 2] = color.b * 255; pixels.data[i + 3] = 255
    }
  }
  ctx.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return new THREE.Mesh(new THREE.SphereGeometry(world.radius - 12, 128, 80), new THREE.MeshStandardMaterial({ map, roughness: 1 }))
}

/** The old ground: one colour, with the full relief of the terrain. */
function oldGround(world: World, today: THREE.Mesh) {
  const geometry = today.geometry.clone()
  const position = geometry.attributes.position, colors = geometry.attributes.color as THREE.BufferAttribute
  const sample = createTerrain(world.kind as 'mercury', world.seed)
  const direction = new THREE.Vector3(), color = new THREE.Color()
  const hex = world.kind === 'mars' ? 0xb87651 : world.kind === 'venus' ? 0xa28153 : 0x918c85
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize()
    const value = sample(direction.x, direction.y, direction.z)
    position.setXYZ(i, direction.x * (world.radius + value.height), direction.y * (world.radius + value.height), direction.z * (world.radius + value.height))
    color.setHex(hex).multiplyScalar(0.9 + value.detail * 0.2 + value.height * 0.025)
    colors.setXYZ(i, color.r, color.g, color.b)
  }
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }))
}

/** The old look of one planet, as a group for the planet group. */
export function buildBefore(world: World, air: THREE.Mesh | undefined) {
  const root = new THREE.Group()
  root.name = `${world.kind}-before`
  const ground = world.surface.children[0] as THREE.Mesh
  root.add(world.gas ? oldDeck(world) : oldGround(world, ground))
  const puffs = world.clouds.getObjectByName('cloud-puffs') as THREE.InstancedMesh | undefined
  if (puffs) {
    const material = new THREE.MeshStandardMaterial({ color: world.color, roughness: 1, transparent: true, opacity: world.kind === 'mars' ? 0.2 : 0.65, depthWrite: false })
    const mesh = new THREE.InstancedMesh(puffs.geometry, material, puffs.count)
    mesh.instanceMatrix.array.set(puffs.instanceMatrix.array)
    root.add(mesh)
  }
  if (air) {
    const material = (air.material as THREE.ShaderMaterial).clone()
    material.uniforms.tint.value = new THREE.Color(world.color)
    material.uniforms.haloFar = { value: 0 }
    material.uniforms.sunPosition = (air.material as THREE.ShaderMaterial).uniforms.sunPosition
    material.uniforms.center = (air.material as THREE.ShaderMaterial).uniforms.center
    const mesh = new THREE.Mesh(air.geometry, material)
    mesh.renderOrder = air.renderOrder
    root.add(mesh)
  }
  if (world.kind === 'saturn') {
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(world.radius * (1.3 + i * 0.15), world.radius * (1.42 + i * 0.15), 128),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9b896d : 0xdacaa2, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }))
      ring.rotation.x = Math.PI / 2.3
      root.add(ring)
    }
  }
  return root
}
