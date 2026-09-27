import * as THREE from 'three'
import type { World } from './worlds'
import { MOON_SIDEREAL_SECONDS, moonOffset, tidalQuaternion } from './moon'

export const SOLAR_ORBIT_SECONDS = 60 * 60
const TAU = Math.PI * 2

type Orbit = { world: World; radius: number; height: number; phase: number; line: THREE.LineLoop }

/** A small storybook solar system: every world completes a visible orbit in one hour. */
export function createPlanetaryOrbits(scene: THREE.Scene, worlds: World[]) {
  const sun = worlds.find(world => world.kind === 'sun')!
  const center = sun.group.position.clone()
  const paths = new THREE.Group()
  paths.name = 'planetary-orbit-paths'
  paths.visible = false
  scene.add(paths)
  let time = 0
  const orbits: Orbit[] = []

  function createPath(world: World, radius: number) {
    const points = Array.from({ length: 257 }, (_, i) => {
      const angle = i / 256 * TAU
      return new THREE.Vector3(center.x + Math.cos(angle) * radius, world.group.position.y, center.z + Math.sin(angle) * radius)
    })
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color: world.color, transparent: true, opacity: 0.34, depthWrite: false, fog: false })
    const line = new THREE.LineLoop(geometry, material)
    line.name = `${world.kind}-orbit-path`
    line.renderOrder = 2
    paths.add(line)
    return line
  }

  for (const world of worlds) {
    if (world.kind === 'sun' || world.kind === 'moon') continue
    const relative = world.group.position.clone().sub(center)
    const radius = Math.hypot(relative.x, relative.z)
    orbits.push({
      world, radius, height: relative.y,
      phase: Math.atan2(relative.z, relative.x),
      line: createPath(world, radius),
    })
  }

  // The Moon orbits Earth. Its path is drawn around Earth and moves with it.
  const earth = worlds.find(world => world.kind === 'earth')
  const moon = worlds.find(world => world.kind === 'moon')
  const moonPath = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 256 }, (_, i) => {
      const offset = moonOffset(i / 256 * MOON_SIDEREAL_SECONDS)
      return new THREE.Vector3(offset.x, offset.y, offset.z)
    })),
    new THREE.LineBasicMaterial({ color: moon?.color ?? 0xffffff, transparent: true, opacity: 0.34, depthWrite: false, fog: false }),
  )
  moonPath.name = 'moon-orbit-path'
  moonPath.renderOrder = 2
  if (earth && moon) paths.add(moonPath)

  function syncMoon() {
    if (!earth || !moon) return
    const offset = moonOffset(time)
    moon.group.position.set(earth.group.position.x + offset.x, earth.group.position.y + offset.y, earth.group.position.z + offset.z)
    tidalQuaternion(time, moon.group.quaternion)
    moonPath.position.copy(earth.group.position)
  }

  function sync(orbit: Orbit) {
    const angle = orbit.phase + time / SOLAR_ORBIT_SECONDS * TAU
    orbit.world.group.position.set(
      center.x + Math.cos(angle) * orbit.radius,
      center.y + orbit.height,
      center.z + Math.sin(angle) * orbit.radius,
    )
  }

  return {
    get elapsed() { return time },
    get paths() { return paths },
    update(delta: number) {
      if (delta > 0) time = (time + delta) % SOLAR_ORBIT_SECONDS
      for (const orbit of orbits) sync(orbit)
      syncMoon()
    },
    /** Rebase Blossom Haven's path at the instant of a magical relocation. */
    rebase(world: World) {
      const orbit = orbits.find(item => item.world === world)
      if (!orbit) return
      const relative = world.group.position.clone().sub(center)
      orbit.radius = Math.hypot(relative.x, relative.z)
      orbit.height = relative.y
      orbit.phase = Math.atan2(relative.z, relative.x) - time / SOLAR_ORBIT_SECONDS * TAU
      const positions = orbit.line.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i <= 256; i++) {
        const angle = i / 256 * TAU
        positions.setXYZ(i, center.x + Math.cos(angle) * orbit.radius, center.y + orbit.height, center.z + Math.sin(angle) * orbit.radius)
      }
      positions.needsUpdate = true
      orbit.line.geometry.computeBoundingSphere()
      sync(orbit)
    },
  }
}
