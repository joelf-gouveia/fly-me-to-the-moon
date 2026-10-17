import * as THREE from 'three'
import type { World } from './worlds'
import { MOON_SIDEREAL_SECONDS, moonOffset, tidalQuaternion } from './moon'
import { MOON_HOME, moonHomeOffset } from './relocation'

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

  // Blossom Haven can be a moon of a planet after a hop (src/relocation.ts). Its path moves with the
  // planet, and its plane turns with the planet on its orbit (moonHomeOffset()).
  let moonHome: { world: World; host: World; distance: number; phase: number; line: THREE.LineLoop } | null = null
  const hostAngle = (host: World) => Math.atan2(host.group.position.z - center.z, host.group.position.x - center.x)
  function syncMoonHome() {
    if (!moonHome) return
    const { world, host, distance, phase, line } = moonHome
    const angle = phase + time / MOON_HOME.turnSeconds * TAU, turn = hostAngle(host)
    world.group.position.copy(moonHomeOffset(distance, angle, turn).add(host.group.position))
    line.position.copy(host.group.position)
    line.rotation.y = -turn
  }
  function clearMoonHome() {
    if (!moonHome) return
    paths.remove(moonHome.line)
    moonHome.line.geometry.dispose()
    ;(moonHome.line.material as THREE.Material).dispose()
    const orbit = orbits.find(item => item.world === moonHome!.world)
    if (orbit) orbit.line.visible = true
    moonHome = null
  }

  return {
    get elapsed() { return time },
    get paths() { return paths },
    /** The planet of a moon home, or null for a home on its own path around the Sun. */
    get homeHost() { return moonHome?.host ?? null },
    update(delta: number) {
      if (delta > 0) time = (time + delta) % SOLAR_ORBIT_SECONDS
      for (const orbit of orbits) if (orbit.world !== moonHome?.world) sync(orbit)
      syncMoon()
      syncMoonHome()
    },
    /**
     * Puts Blossom Haven on a moon path of `distance` around `host`, at `angle` of the path now.
     * Its path around the Sun waits until the next rebase().
     */
    moonOf(world: World, host: World, distance: number, angle: number) {
      clearMoonHome()
      const points = Array.from({ length: 256 }, (_, i) => moonHomeOffset(distance, i / 256 * TAU, 0))
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: world.color, transparent: true, opacity: 0.34, depthWrite: false, fog: false }))
      line.name = `${world.kind}-moon-path`
      line.renderOrder = 2
      paths.add(line)
      moonHome = { world, host, distance, phase: angle - time / MOON_HOME.turnSeconds * TAU, line }
      const orbit = orbits.find(item => item.world === world)
      if (orbit) orbit.line.visible = false
      syncMoonHome()
    },
    /** Rebase Blossom Haven's path at the instant of a magical relocation. */
    rebase(world: World) {
      if (moonHome?.world === world) clearMoonHome()
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
