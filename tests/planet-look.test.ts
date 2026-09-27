import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain } from '../src/terrain'
import { haloFarAt, PLANET_LOOKS, puffsVisibleAt, RING_SPAN, ringOpacity, ROCKY_RELIEF, SPACE_LIGHT, spaceLightAt, URANUS_RING_SPAN } from '../src/planet-look'
import { MAX_SUN_OCCLUDERS } from '../src/sun-shading'
import sunShadingSource from '../src/sun-shading.ts?raw'
import { worldTerrain } from '../src/worlds'
import type { World } from '../src/worlds'
import { occupiedRadius } from '../src/relocation'

const directions = Array.from({ length: 600 }, (_, i) => {
  const y = 1 - (i + 0.5) / 300, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996
  return [r * Math.cos(a), y, r * Math.sin(a)] as const
})

describe('planet look', () => {
  it('covers the seven planets and leaves Earth, the Moon and Blossom Haven alone', () => {
    expect(Object.keys(PLANET_LOOKS).sort()).toEqual(['jupiter', 'mars', 'mercury', 'neptune', 'saturn', 'uranus', 'venus'])
    for (const kind of ['earth', 'moon', 'fairy', 'ceres', 'vesta'] as const) {
      const plain = createTerrain(kind, 7), world = worldTerrain(kind, 7)
      for (const [x, y, z] of directions.slice(0, 50)) expect(world(x, y, z).height).toBe(plain(x, y, z).height)
    }
  })

  it('halves the relief of Mercury and Mars in one field for the ground and the collision', () => {
    for (const kind of ['mercury', 'mars'] as const) {
      const plain = createTerrain(kind, 7), world = worldTerrain(kind, 7)
      for (const [x, y, z] of directions) expect(world(x, y, z).height).toBeCloseTo(plain(x, y, z).height * ROCKY_RELIEF[kind]!, 10)
    }
  })

  it('darkens the night side from far away, and shows the puffs and the full air only close by', () => {
    const planet = { radius: 587.5, atmosphere: 181.25 }
    expect(spaceLightAt(0, planet)).toBe(1)
    expect(spaceLightAt(planet.radius * 3, planet)).toBeCloseTo(SPACE_LIGHT)
    expect(haloFarAt(planet.atmosphere, planet.atmosphere)).toBe(0)
    expect(haloFarAt(planet.atmosphere * 3, planet.atmosphere)).toBe(1)
    expect(puffsVisibleAt(planet.atmosphere, planet.atmosphere)).toBe(true)
    expect(puffsVisibleAt(planet.atmosphere * 2, planet.atmosphere)).toBe(false)
  })

  it('keeps the rings inside the space that relocation keeps clear', () => {
    const world = (kind: string) => ({ kind, radius: 100, atmosphere: 30 }) as World
    expect(occupiedRadius(world('saturn'))).toBeGreaterThan(100 * RING_SPAN.outer)
    expect(occupiedRadius(world('uranus'))).toBeGreaterThan(100 * URANUS_RING_SPAN.outer)
    expect(ringOpacity(RING_SPAN.outer + 0.01)).toBe(0)
  })

  it('casts no shadow from a world on the far side of the Sun', () => {
    expect(sunShadingSource).toContain('if ( along > sunDistance ) continue;')
    expect(MAX_SUN_OCCLUDERS).toBeGreaterThan(0)
    // The same test in plain numbers: a point at +X, the Sun at 0, an occluder at −X.
    const point = new THREE.Vector3(10, 0, 0), occluder = new THREE.Vector3(-5, 0, 0)
    const toSun = point.clone().negate().normalize()
    expect(occluder.clone().sub(point).dot(toSun)).toBeGreaterThan(point.length())
  })
})
