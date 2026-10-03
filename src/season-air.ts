import * as THREE from 'three'
import type { World } from './worlds'
import type { Fall } from './seasons'

/**
 * Petals, leaves and snow in the air of a world, near the camera (docs/seasons-study.md). The
 * points are in a box in the frame of the world, so they turn with it. One draw call.
 */
const FALLS: Record<Fall, { colour: number; size: number; speed: number; sway: number }> = {
  snow: { colour: 0xffffff, size: 0.34, speed: 2.4, sway: 0.5 },
  leaf: { colour: 0xff9838, size: 0.5, speed: 1.5, sway: 1.6 },
  petal: { colour: 0xffc4dc, size: 0.42, speed: 1.1, sway: 1.2 },
}
/** The half size of the box, in metres. */
const HALF = 24

/** A soft white dot. Its edge fades to clear white, so it has no dark ring on a bright sky. */
function flakeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createSeasonAir(world: World, count = 520) {
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(HALF * 2))
  const phases = seeds.map(() => Math.random() * 20)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ size: 0.3, map: flakeTexture(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  const points = new THREE.Points(geometry, material)
  points.name = 'season-air'
  points.frustumCulled = false
  points.visible = false
  // The group of the world stays when the land is made again, so the points stay too.
  world.group.add(points)
  const eye = new THREE.Vector3(), down = new THREE.Vector3(), side = new THREE.Vector3(), point = new THREE.Vector3(), inverse = new THREE.Quaternion()
  const wrap = (value: number, centre: number) => centre + ((((value - centre + HALF) % (HALF * 2)) + HALF * 2) % (HALF * 2)) - HALF
  let shown = 0, kind = FALLS.snow
  return {
    points,
    get shown() { return shown },
    /** `time` moves the points; reduced motion gives a fixed time. `amount` is from 0 to 1. */
    update(time: number, delta: number, camera: THREE.Vector3, fall: Fall | null, amount: number) {
      shown = THREE.MathUtils.lerp(shown, fall ? amount : 0, 1 - Math.exp(-Math.max(delta, 0.016) * 3))
      material.opacity = shown * 0.9
      points.visible = shown > 0.01
      if (!points.visible) return
      if (fall) { kind = FALLS[fall]; material.color.setHex(kind.colour); material.size = kind.size }
      eye.copy(camera).sub(world.group.position).applyQuaternion(inverse.copy(world.group.quaternion).invert())
      down.copy(eye).normalize().negate()
      // Near a pole `down` is the Y axis, so the sway takes the X axis.
      if (side.set(down.z, 0, -down.x).lengthSq() < 0.01) side.set(1, 0, 0)
      side.normalize()
      for (let i = 0; i < count; i++) {
        point.copy(seeds[i]).addScaledVector(down, time * kind.speed * (0.7 + (i % 7) * 0.08))
          .addScaledVector(side, Math.sin(time * 1.3 + phases[i]) * kind.sway)
        point.set(wrap(point.x, eye.x), wrap(point.y, eye.y), wrap(point.z, eye.z))
        // A point less than 4 m from the camera is a large blob in the picture, so it goes out of view.
        if (point.distanceToSquared(eye) < 16) point.addScaledVector(down, -1000)
        positions[i * 3] = point.x; positions[i * 3 + 1] = point.y; positions[i * 3 + 2] = point.z
      }
      geometry.attributes.position.needsUpdate = true
    },
  }
}
