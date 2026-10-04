import * as THREE from 'three'
import type { World } from '../../src/worlds'
import { setSeason } from '../../src/seasons'
import { EARTH_TILT } from './model'

/**
 * The study tools for the seasons: the lean of a world for a day of the year, and the things in the air.
 *
 * The seasons of Earth are in the game now (src/seasons.ts): the ground, the water and the plants
 * of Earth read the uniforms of `world.season`. The study sets these uniforms for its clips. The
 * first rounds of the study had the shader of Earth in this file.
 */
const RAD = Math.PI / 180
/**
 * Turns a world for a day of the year. The world stays in its place and its axis turns, which
 * gives the same Sun in the sky as an orbit with a fixed axis. `noonAt` (a local direction) keeps
 * that place at the hour `hour`; without it, `turn` is the spin angle.
 */
export function createPose(world: World, sunPosition: THREE.Vector3) {
  const up = new THREE.Vector3(0, 1, 0)
  const toSun = new THREE.Vector3(), north = new THREE.Vector3(), east = new THREE.Vector3(), axis = new THREE.Vector3()
  const lean = new THREE.Quaternion(), spin = new THREE.Quaternion(), sunLocal = new THREE.Vector3()
  return (year: number, tilt: number, noonAt?: THREE.Vector3, hour = 12, turn = 0) => {
    toSun.copy(sunPosition).sub(world.group.position).normalize()
    north.copy(up).addScaledVector(toSun, -up.dot(toSun)).normalize()
    east.crossVectors(north, toSun)
    const angle = year * Math.PI * 2
    axis.copy(north).multiplyScalar(Math.cos(tilt * RAD))
      .addScaledVector(toSun, Math.sin(tilt * RAD) * Math.sin(angle)).addScaledVector(east, Math.sin(tilt * RAD) * Math.cos(angle))
    lean.setFromUnitVectors(up, axis)
    if (noonAt) {
      sunLocal.copy(toSun).applyQuaternion(spin.copy(lean).invert())
      turn = Math.atan2(noonAt.z, noonAt.x) - Math.atan2(sunLocal.z, sunLocal.x) + (hour - 12) / 24 * Math.PI * 2
    }
    world.group.quaternion.copy(lean).multiply(spin.setFromAxisAngle(up, turn))
    world.group.updateMatrixWorld(true)
  }
}

export type Seasons = ReturnType<typeof createSeasons>

/** The seasons of Earth for a clip: the uniforms of the game, and the lean of the study. */
export function createSeasons(world: World, sunPosition: THREE.Vector3) {
  const uniforms = world.season!
  let on = 1
  return {
    world, uniforms,
    /** Option A leans the axis; option B and the look with no season keep it straight. */
    pose: createPose(world, sunPosition),
    /** The look of a day of the year. `tilt` sets how far the snow line moves. */
    setLook(year: number, tilt = EARTH_TILT) { setSeason(uniforms, year, tilt); uniforms.seasonOn.value = on },
    /** 0 is the look with no season, 1 is the seasons. */
    setOn(value: number) { on = value; uniforms.seasonOn.value = value },
  }
}

/** The things in the air. Snow, leaves and petals are of Earth; the others are of Blossom Haven. */
export type Fall = 'snow' | 'leaf' | 'petal' | 'bubble' | 'firefly' | 'glitter'
/** `speed` is in metres in each second toward the ground; a bubble and a firefly go up. */
const FALLS: Record<Fall, { colour: number; size: number; speed: number; sway: number }> = {
  snow: { colour: 0xffffff, size: 0.34, speed: 2.4, sway: 0.5 },
  leaf: { colour: 0xff9838, size: 0.5, speed: 1.5, sway: 1.6 },
  petal: { colour: 0xffc4dc, size: 0.42, speed: 1.1, sway: 1.2 },
  bubble: { colour: 0xd8fff6, size: 0.6, speed: -1.3, sway: 0.9 },
  firefly: { colour: 0xfff2a0, size: 0.36, speed: -0.25, sway: 2.2 },
  glitter: { colour: 0xe4f1ff, size: 0.26, speed: 1.2, sway: 0.7 },
}

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

/** Points in a box around the camera. The box is in the frame of the world, so it turns with it. */
export function createWeather(world: World, count = 520) {
  const map = flakeTexture()
  const half = 24
  const positions = new Float32Array(count * 3)
  const seeds = Array.from({ length: count }, () => new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(half * 2))
  const phases = seeds.map(() => Math.random() * 20)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ size: 0.2, map, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  world.group.add(points)
  const eye = new THREE.Vector3(), down = new THREE.Vector3(), side = new THREE.Vector3(), point = new THREE.Vector3(), inverse = new THREE.Quaternion()
  const wrap = (value: number, centre: number) => centre + ((((value - centre + half) % (half * 2)) + half * 2) % (half * 2)) - half
  let shown = 0
  return {
    points,
    update(time: number, delta: number, camera: THREE.Vector3, fall: Fall | null, amount: number) {
      shown = THREE.MathUtils.lerp(shown, fall ? amount : 0, 1 - Math.exp(-Math.max(delta, 0.016) * 3))
      material.opacity = shown * 0.9
      points.visible = shown > 0.01
      if (!points.visible) return
      const kind = FALLS[fall ?? 'snow']
      if (fall) { material.color.setHex(kind.colour); material.size = kind.size }
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
    dispose() { world.group.remove(points); geometry.dispose(); material.dispose(); map.dispose() },
  }
}
