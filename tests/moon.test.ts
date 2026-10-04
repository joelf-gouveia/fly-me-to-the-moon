import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { earthshineAt, MOON, MOON_SIDEREAL_SECONDS, MOON_YEAR_SECONDS, moonlightAt, moonOffset, tidalQuaternion, touchesMoonPath } from '../src/moon'
import { createPlanetaryOrbits, SOLAR_ORBIT_SECONDS } from '../src/orbits'
import { PROPORTIONS } from '../src/proportions'
import { clearHomePosition } from '../src/relocation'
import { createTerrain } from '../src/terrain'
import type { World } from '../src/worlds'

function fixture(kind: World['kind'], radius: number, position: THREE.Vector3, atmosphere = 0): World {
  const group = new THREE.Group(); group.position.copy(position)
  return { name: kind, kind, radius, atmosphere, cloudHeight: 0, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 1), seed: 1, visit: 1, armed: false, gas: false }
}
const earthStart = new THREE.Vector3(Math.cos(0.08) * 3300, 0, Math.sin(0.08) * 3300)

describe('the Moon', () => {
  it('orbits Earth, not the Sun, and wraps with the planets', () => {
    expect(MOON_YEAR_SECONDS).toBe(SOLAR_ORBIT_SECONDS)
    expect(MOON_SIDEREAL_SECONDS).toBeCloseTo(3600 / 11)
    const earth = fixture('earth', 220, earthStart, 78), moon = fixture('moon', MOON.radius, new THREE.Vector3())
    const worlds = [fixture('sun', 600, new THREE.Vector3()), earth, moon]
    const orbits = createPlanetaryOrbits(new THREE.Scene(), worlds)
    const start = new THREE.Vector3()
    for (const step of [0, 100, 1000, 2600]) {
      orbits.update(step)
      if (step === 0) start.copy(moon.group.position)
      expect(moon.group.position.distanceTo(earth.group.position)).toBeCloseTo(MOON.orbit, 3)
      // Tidal lock: the near side (+X) faces Earth.
      const nearSide = new THREE.Vector3(1, 0, 0).applyQuaternion(moon.group.quaternion)
      expect(nearSide.dot(earth.group.position.clone().sub(moon.group.position).normalize())).toBeCloseTo(1, 5)
    }
    // The steps add up to 3,700 s: 100 s past one game year. 3,500 s more closes the second year.
    orbits.update(3500)
    expect(orbits.elapsed).toBeCloseTo(0, 6)
    expect(moon.group.position.distanceTo(start)).toBeLessThan(0.01)
    expect(orbits.paths.getObjectByName('moon-orbit-path')).toBeDefined()
    expect(orbits.paths.getObjectByName('moon-solar-path')).toBeUndefined()
    const q = tidalQuaternion(0, new THREE.Quaternion())
    expect(q.length()).toBeCloseTo(1)
  })

  it('reaches 516 m above and below the orbit plane on its 28° orbit', () => {
    let highest = 0
    for (let time = 0; time < MOON_SIDEREAL_SECONDS; time += 1) highest = Math.max(highest, moonOffset(time).y)
    expect(highest).toBeCloseTo(MOON.orbit * Math.sin(MOON.inclination * Math.PI / 180), 0)
  })

  it('has more dark maria on the near side than on the far side, and gentle relief', () => {
    const sample = createTerrain('moon', MOON.seed), direction = new THREE.Vector3()
    let near = 0, far = 0, highest = 0
    for (let i = 0; i < 4000; i++) {
      const y = i / 4000 * 2 - 1, angle = i * 2.399963
      direction.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
      const point = sample(direction.x, direction.y, direction.z)
      if (direction.x > 0.3) near += point.mare ?? 0
      if (direction.x < -0.3) far += point.mare ?? 0
      highest = Math.max(highest, Math.abs(point.height))
    }
    expect(near).toBeGreaterThan(far * 3)
    expect(highest).toBeLessThan(6)
  })

  it('keeps Blossom Haven out of the whole Moon path', () => {
    // Earth at its orbit in the game (3,300 base units at the spacing of src/proportions.ts), clear of the comet.
    const earthOrbit = 3300 * PROPORTIONS.spacing, earthPlace = earthStart.clone().multiplyScalar(PROPORTIONS.spacing)
    const earth = fixture('earth', 220, earthPlace, 78), sun = fixture('sun', 600, new THREE.Vector3())
    const home = fixture('fairy', 110, new THREE.Vector3(10000, 1200, 9000).multiplyScalar(PROPORTIONS.spacing), 52)
    const moon = fixture('moon', MOON.radius, earthPlace.clone().add(new THREE.Vector3(0, 0, MOON.orbit)))
    // 1,200 m from Earth toward the Sun, far from the Moon now: clear without a Moon, but in its path.
    const place = earthPlace.clone().multiplyScalar(1 - 1200 / earthOrbit)
    const fairy = new THREE.Vector3(-9000, 0, 0)
    expect(clearHomePosition(place, home, [earth, sun, home], fairy, false)).toBe(true)
    expect(clearHomePosition(place, home, [earth, moon, sun, home], fairy, false)).toBe(false)
    expect(touchesMoonPath(place, earth.group.position, 204 + 250)).toBe(true)
    const outside = earthPlace.clone().multiplyScalar(1 - 1700 / earthOrbit)
    expect(clearHomePosition(outside, home, [earth, moon, sun, home], fairy, false)).toBe(true)
  })

  it('makes a moonlit night brighter than a night with no Moon, and never darker than 45%', () => {
    const ground = new THREE.Vector3(3520, 0, 0), up = new THREE.Vector3(1, 0, 0), sun = new THREE.Vector3()
    const full = moonlightAt(ground, up, new THREE.Vector3(3300 + 1100, 0, 0), sun)
    expect(full.illuminated).toBeGreaterThan(0.99)
    expect(full.strength).toBeGreaterThan(0.99)
    const set = moonlightAt(ground, up, new THREE.Vector3(3300 - 1100, 0, 0), sun)
    expect(set.above).toBe(0)
    expect(set.strength).toBeCloseTo(0.45)
    expect(earthshineAt(5)).toBeCloseTo(MOON.earthshineNear)
    expect(earthshineAt(900)).toBeCloseTo(MOON.earthshine)
  })
})
