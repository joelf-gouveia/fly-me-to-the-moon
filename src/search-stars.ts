import * as THREE from 'three'
import { surfaceRadius } from './worlds'
import type { World } from './worlds'
import type { SearchProbe } from './stickers'

// F1 · Search stars (docs/feature-ideas-study.md). After the hello sticker of a world, one small
// search task. searchDone() in src/stickers.ts tests the task; this file measures the place of the
// fairy and shows the gold star in the world.

const offset = new THREE.Vector3(), point = new THREE.Vector3(), inverse = new THREE.Quaternion()

/** The name of a creature model: its fairytale on Blossom Haven, else its species. */
const creatureName = (model: THREE.Object3D): string | undefined => model.userData.fairytale ?? model.userData.species

/** Measures the place of the fairy over `world` for searchDone(). Only the creature models that show count. */
export function searchProbe(world: World, position: THREE.Vector3, near: boolean): SearchProbe {
  offset.copy(position).sub(world.group.position)
  const distance = offset.length()
  const normal = offset.normalize().clone()
  const up = offset.applyQuaternion(inverse.copy(world.group.quaternion).invert())
  const creatures: Record<string, number> = {}
  for (const model of world.creatures?.group.children ?? []) {
    const name = creatureName(model)
    if (!model.visible || !name) continue
    const gap = model.getWorldPosition(point).distanceTo(position)
    if (gap < (creatures[name] ?? Infinity)) creatures[name] = gap
  }
  return {
    near, altitude: distance - world.radius, clearance: distance - surfaceRadius(world, normal),
    radius: world.radius, cloudHeight: world.cloudHeight, up: { x: up.x, y: up.y, z: up.z },
    ground: world.sample(up.x, up.y, up.z), creatures,
  }
}

/** The nearest creature model of a kind that shows, for the star over it. */
export function nearestCreature(world: World, position: THREE.Vector3, name: string) {
  let best: THREE.Object3D | null = null, gap = Infinity
  for (const model of world.creatures?.group.children ?? []) {
    if (!model.visible || creatureName(model) !== name) continue
    const value = model.getWorldPosition(point).distanceTo(position)
    if (value < gap) { gap = value; best = model }
  }
  return best
}

/** The star shows as long as the note of src/sticker-book.ts, then it shrinks away. */
export const STAR_LIFE = 7.1
export const backOut = (k: number) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2)

/**
 * The gold star of a find: it pops up with a bounce, turns once, floats, and sparkles. It shows
 * over the creature of the task, or over the fairy for the other tasks, so it stays in view at
 * every speed. Three draw calls, only while it shows.
 */
export function createSearchStar(scene: THREE.Scene, glow: THREE.Texture, mobile: boolean) {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.24 : 0.56
    if (i) shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
    else shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 2 })
  geometry.center()
  // No fog: the star stays bright in the golden haze of Venus and in the clouds of the giants.
  const star = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffcf3f, emissive: 0xffa000, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.3, fog: false }))
  const haloMaterial = new THREE.SpriteMaterial({ map: glow, color: 0xffde82, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  const halo = new THREE.Sprite(haloMaterial)
  // Sparkles burst out of the star, then circle it and twinkle.
  const count = mobile ? 18 : 36
  const seeds = Array.from({ length: count }, () => ({ dir: new THREE.Vector3().randomDirection(), reach: 0.7 + Math.random() * 1.1, spin: 0.5 + Math.random() }))
  const positions = new Float32Array(count * 3)
  const sparkleGeometry = new THREE.BufferGeometry()
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const sparkleMaterial = new THREE.PointsMaterial({ size: 0.22, map: glow, color: 0xfff0b8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial)
  sparkles.frustumCulled = false
  const pivot = new THREE.Group()
  pivot.name = 'search-star'
  pivot.add(star, halo, sparkles)
  pivot.visible = false
  scene.add(pivot)

  let age = 0, world: World | null = null, creature: THREE.Object3D | null = null
  const spot = new THREE.Vector3(), normal = new THREE.Vector3(), ahead = new THREE.Vector3(), toCamera = new THREE.Vector3()
  return {
    /** Starts the star over `model`, or over the fairy when `model` is null. */
    pop(on: World, model: THREE.Object3D | null) {
      world = on; creature = model; age = 0
      pivot.visible = true
    },
    /** Hides the star at once, for example after a reset of the book. */
    clear() { world = null; pivot.visible = false },
    /** `delta` is 0 while the flight waits, so the star waits too. */
    update(delta: number, fairy: THREE.Object3D, camera: THREE.Camera, still: boolean) {
      if (!world) return
      age += delta
      if (age > STAR_LIFE) { world = null; pivot.visible = false; return }
      const rise = Math.min(age / 0.7, 1), bob = still ? 0 : Math.sin(age * 2.2) * 0.12
      if (creature?.parent) {
        // The star rises out of the creature and floats over it.
        creature.getWorldPosition(spot)
        normal.copy(spot).sub(world.group.position).normalize()
        pivot.position.copy(spot).addScaledVector(normal, 0.5 + 1.5 * rise + bob)
      } else {
        // Over the head of the fairy, a little ahead, where the camera looks.
        normal.copy(fairy.position).sub(world.group.position).normalize()
        ahead.set(0, 0, -1).applyQuaternion(fairy.quaternion)
        pivot.position.copy(fairy.position).addScaledVector(normal, 1.2 + 0.8 * rise + bob).addScaledVector(ahead, 2.4)
      }
      pivot.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, normal)
      // In with a bounce, out with a shrink in the last 0.6 s.
      const size = Math.max(0.01, backOut(rise)) * Math.min(1, (STAR_LIFE - age) / 0.6) * 1.4
      star.scale.setScalar(size)
      // The star turns once as it pops, then faces the camera with a soft rock.
      toCamera.copy(camera.position).sub(pivot.position).applyQuaternion(inverse.copy(pivot.quaternion).invert())
      const settle = still ? 1 : Math.min(age / 1.1, 1)
      star.rotation.y = Math.atan2(toCamera.x, toCamera.z) + (1 - settle) ** 2 * Math.PI * 2 + (still ? 0 : Math.sin(age * 1.7) * 0.45)
      halo.scale.setScalar((2.6 + (still ? 0 : Math.sin(age * 5) * 0.25)) * size / 1.4)
      haloMaterial.opacity = 0.5 * Math.min(age / 0.3, 1)
      for (const [i, seed] of seeds.entries()) {
        const reach = seed.reach * Math.min(age / 0.8, 1) ** 0.6 * size / 1.4
        const turn = still ? 0 : age * seed.spin
        const x = seed.dir.x * Math.cos(turn) - seed.dir.z * Math.sin(turn), z = seed.dir.x * Math.sin(turn) + seed.dir.z * Math.cos(turn)
        positions.set([x * reach, seed.dir.y * reach * 0.8, z * reach], i * 3)
      }
      sparkleGeometry.attributes.position.needsUpdate = true
      sparkleMaterial.size = 0.16 + (still ? 0.06 : Math.abs(Math.sin(age * 6)) * 0.12)
    },
    /** For the browser checks: the star shows, and where. */
    get state() { return { visible: pivot.visible, position: pivot.position.toArray(), over: creature?.parent ? creature.name : 'fairy' } },
  }
}
