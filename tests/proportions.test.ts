import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { BELT, DWARF_WORLDS, dwarfPosition, insideDwarfWorld } from '../src/belt'
import { SPACE_SPEED } from '../src/flight'
import { MOON } from '../src/moon'
import { LIFE_SCALE, PROPORTIONS } from '../src/proportions'
import { findHomePosition } from '../src/relocation'
import { createTerrain, seededRandom } from '../src/terrain'
import { HOME_START_POSITION } from '../src/worlds'
import type { World } from '../src/worlds'
import { layout, PRESETS } from '../studies/proportions-study/model'

describe('game proportions', () => {
  it('uses the recommended set of the proportions study, with the Sun at ×1.6', () => {
    const study = PRESETS.ideal.value()
    expect(PROPORTIONS).toMatchObject({ size: study.size, spacing: study.spacing, speed: study.speed, sun: 1.6 })
    const planned = layout({ ...study, sun: PROPORTIONS.sun })
    expect(MOON.orbit).toBeCloseTo(planned.moon.orbit)
    expect(MOON.radius).toBe(Math.round(planned.moon.radius))
    expect(BELT.inner).toBeCloseTo(planned.belt.inner)
    expect(BELT.outer).toBeCloseTo(planned.belt.outer)
    expect([...HOME_START_POSITION]).toEqual([planned.home.position.x, planned.home.position.y, planned.home.position.z])
    expect(SPACE_SPEED).toBeCloseTo(430 * study.speed)
    expect(planned.sunRadius).toBe(960)
  })

  it('keeps the base density of trees: counts grow with the area', () => {
    expect(LIFE_SCALE).toBeCloseTo(1.5625)
    expect(Math.round(3400 * LIFE_SCALE)).toBe(5313)
  })

  it('places Ceres and Vesta inside the larger belt, and rocks stay out of them', () => {
    for (const world of DWARF_WORLDS) {
      const centre = dwarfPosition(world), r = Math.hypot(centre.x, centre.z)
      expect(r - world.radius * PROPORTIONS.size).toBeGreaterThan(BELT.inner)
      expect(r + world.radius * PROPORTIONS.size).toBeLessThan(BELT.outer)
      expect(insideDwarfWorld(centre, 0)).toBe(true)
      expect(insideDwarfWorld({ x: centre.x + world.radius * PROPORTIONS.size + 1, y: 0, z: centre.z })).toBe(false)
    }
  })

  it('moves Blossom Haven across the whole larger system', () => {
    const fixture = (kind: World['kind'], radius: number, position: number[], atmosphere = 0) => {
      const group = new THREE.Group(); group.position.set(position[0], position[1], position[2])
      return { name: kind, kind, radius, atmosphere, cloudHeight: 0, color: 0, sky: new THREE.Color(), group, surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain(kind === 'sun' ? 'mercury' : kind, 1), seed: 1, visit: 1, armed: false, gas: false } as World
    }
    const home = fixture('fairy', 110 * PROPORTIONS.size, [...HOME_START_POSITION], 52 * PROPORTIONS.size)
    const worlds = [home, fixture('sun', 960, [0, 0, 0])], random = seededRandom(9), radii: number[] = []
    for (let i = 0; i < 200; i++) {
      const next = findHomePosition(home, worlds, new THREE.Vector3(-1e6, 0, 0), true, random)!
      radii.push(Math.hypot(next.x, next.z))
      home.group.position.copy(next)
    }
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(1100 * PROPORTIONS.spacing)
    expect(Math.max(...radii)).toBeGreaterThan(13000 * PROPORTIONS.spacing)
  })
})
