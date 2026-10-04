import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain, HOME_SEED } from '../../src/terrain'
import type { TerrainSample } from '../../src/terrain'
import { DECISIONS, LEVERS, OPTIONS } from './model'
import { ALL_LEVERS, plan } from '../../src/foliage/planting'
import type { Site } from '../../src/foliage/planting'
import { findSpot } from './places'
import { SPECIES, speciesGeometry, speciesTriangles } from '../../src/foliage/species'
import type { SpeciesId } from '../../src/foliage/species'
import { HOME_RING, zoneAt, zonesOf } from '../../src/foliage/zones'
import type { Fields, OptionId } from '../../src/foliage/zones'

const earth: Site = { kind: 'earth', radius: 275, seed: 23, sample: createTerrain('earth', 23) }
const haven: Site = { kind: 'fairy', radius: 137.5, seed: HOME_SEED, sample: createTerrain('fairy', HOME_SEED) }
const land = (height: number): TerrainSample => ({ height, land: height, river: 0, detail: 0 })
/** Fields with one value each, so a test reads only the rule. */
const fields = (moist = 0.5, zone = 0): Fields => ({ zone: () => zone, moist: () => moist, wood: () => 0, jitter: () => 0 })
const zone = (option: OptionId, at: [number, number, number], height = 3, withFields = fields()) => zoneAt(option, ...at, land(height), withFields)?.id ?? null
/** A direction at a latitude, given as the y of the unit sphere. */
const atY = (y: number): [number, number, number] => [Math.sqrt(1 - y * y), y, 0]

describe('the foliage study', () => {
  it('has Before and three looks for each world, and proposes B for both', () => {
    expect(OPTIONS.map(option => option.id)).toEqual(['E0', 'E1', 'E2', 'E3', 'H0', 'H1', 'H2', 'H3'])
    expect(OPTIONS.filter(option => option.proposed).map(option => option.id)).toEqual(['E2', 'H2'])
    expect(DECISIONS[0].options[1]).toContain('recommended')
    expect(DECISIONS[1].options[1]).toContain('recommended')
    expect(DECISIONS[2].options).toEqual(LEVERS.map(lever => lever.name))
  })

  it('builds each plant as one geometry with a colour, a paint value and a sway for each vertex', () => {
    for (const id of Object.keys(SPECIES) as SpeciesId[]) {
      const geometry = speciesGeometry(id), count = geometry.attributes.position.count
      expect(geometry.index, id).not.toBeNull()
      for (const name of ['normal', 'color', 'aFoliage']) expect(geometry.attributes[name].count, `${id} ${name}`).toBe(count)
      expect(speciesTriangles(id), id).toBeLessThan(560)
      // The sway is zero at the ground and at most `flex` at the top.
      const sway = geometry.attributes.aFoliage
      for (let i = 0; i < count; i++) expect(sway.getZ(i)).toBeLessThanOrEqual(SPECIES[id].flex + 1e-6)
    }
  })

  it('gives each zone its trees and its small plants', () => {
    for (const option of OPTIONS) {
      const zones = zonesOf(option.id)
      expect(zones.length, option.id).toBe(option.label === 'Before' ? 0 : option.label === 'A' ? 1 : option.id === 'E2' ? 7 : 4)
      for (const item of zones) {
        expect(item.trees.length, item.id).toBeGreaterThan(0)
        expect(item.under.length, item.id).toBeGreaterThan(0)
        expect(item.wood).toBeGreaterThanOrEqual(item.open)
        for (const entry of [...item.trees, ...item.under]) { expect(SPECIES[entry.species], entry.species).toBeDefined(); expect(entry.weight).toBeGreaterThan(0) }
      }
    }
  })

  it('puts the climate belts of Earth in the order of the real planet', () => {
    expect(zone('E2', atY(0))).toBe('jungle')
    expect(zone('E2', atY(0), 3, fields(-0.1))).toBe('savanna')
    expect(zone('E2', atY(0), 3, fields(-0.5))).toBe('desert')
    expect(zone('E2', atY(0), 1.2)).toBe('beach')
    expect(zone('E2', atY(0.4))).toBe('temperate')
    expect(zone('E2', atY(-0.4))).toBe('temperate')
    expect(zone('E2', atY(0.65))).toBe('taiga')
    expect(zone('E2', atY(0.8))).toBe('tundra')
    expect(zone('E2', atY(0.9))).toBeNull()
    // High ground is colder: the leaf forest becomes a pine forest on a mountain.
    expect(zone('E2', atY(0.5), 7)).toBe('taiga')
  })

  it('puts the four seasons of Earth around the planet', () => {
    const around = (turn: number): [number, number, number] => [Math.cos((turn - 0.5) * Math.PI * 2), 0, Math.sin((turn - 0.5) * Math.PI * 2)]
    expect([0.1, 0.35, 0.6, 0.85].map(turn => zone('E3', around(turn)))).toEqual(['spring', 'summer', 'autumn', 'winter'])
    expect(zone('E3', atY(0.9))).toBeNull()
  })

  it('keeps the candy of today around the cottage of Blossom Haven', () => {
    const cottage: [number, number, number] = [HOME_RING * 0.6, -Math.sqrt(1 - (HOME_RING * 0.6) ** 2), 0]
    expect(zone('H2', cottage, 3, fields(0, 0.9))).toBe('grove')
    expect(zone('H2', cottage, 5.5, fields(0, -0.9))).toBe('grove')
    expect(zone('H3', cottage)).toBe('lane')
    // Away from the cottage, the garden field and the height give the garden.
    expect([zone('H2', atY(0), 3, fields(0, 0.9)), zone('H2', atY(0), 3, fields(0, -0.9)), zone('H2', atY(0), 3, fields(0, 0)), zone('H2', atY(0), 5)]).toEqual(['orchard', 'glade', 'grove', 'peaks'])
    expect([zone('H3', atY(0), 1.5), zone('H3', atY(0), 3), zone('H3', atY(0), 5)]).toEqual(['meadow', 'blossom', 'hills'])
  })

  it('makes the same plan each time, on dry land, with a free clearing at the cottage', () => {
    const first = plan('E2', earth), again = plan('E2', earth)
    expect(again.stats).toEqual(first.stats)
    expect(first.stats.trees).toBeGreaterThan(3500)
    const point = new THREE.Vector3()
    for (const batch of first.batches.filter(item => item.species !== 'reeds')) {
      for (let i = 0; i < batch.count; i += 7) {
        point.fromArray(batch.matrices, i * 16 + 12).normalize()
        const sample = earth.sample(point.x, point.y, point.z)
        expect(sample.height, batch.species).toBeGreaterThanOrEqual(0.9)
        expect(sample.river).toBeLessThanOrEqual(0.1)
      }
    }
    for (const batch of plan('H2', haven).batches) {
      for (let i = 0; i < batch.count; i++) {
        point.fromArray(batch.matrices, i * 16 + 12).normalize()
        expect(point.y < 0 && Math.hypot(point.x, point.z) < 0.18, batch.species).toBe(false)
      }
    }
  })

  it('gives a phone half the plants, and each lever changes only its own part', () => {
    const full = plan('E1', earth).stats, phone = plan('E1', { ...earth, mobile: true }).stats
    expect(phone.trees / full.trees).toBeGreaterThan(0.45)
    expect(phone.trees / full.trees).toBeLessThan(0.56)
    // With no variation, each kind has one colour.
    const plain = plan('E1', earth, { ...ALL_LEVERS, variation: false })
    for (const batch of plain.batches) for (let i = 3; i < batch.colours.length; i++) expect(batch.colours[i]).toBe(batch.colours[i % 3])
    // With no woods and glades, the number of trees stays near the number with them.
    const even = plan('E1', earth, { ...ALL_LEVERS, clusters: false }).stats
    expect(Math.abs(even.trees / full.trees - 1)).toBeLessThan(0.2)
  })

  it('finds a place for each cut of the clips, most of it in its zone', () => {
    const cuts: [Site, OptionId, string, boolean][] = [
      [earth, 'E2', 'jungle', true], [earth, 'E2', 'savanna', false], [earth, 'E2', 'temperate', true], [earth, 'E2', 'taiga', true],
      [earth, 'E3', 'spring', true], [earth, 'E3', 'summer', true], [earth, 'E3', 'autumn', true], [earth, 'E3', 'winter', true],
      [haven, 'H2', 'grove', true], [haven, 'H2', 'orchard', true], [haven, 'H2', 'glade', true], [haven, 'H2', 'peaks', false],
      [haven, 'H3', 'meadow', false], [haven, 'H3', 'blossom', true], [haven, 'H3', 'hills', true], [haven, 'H3', 'lane', false],
    ]
    for (const [site, option, id, wooded] of cuts) expect(findSpot(site, option, id, wooded).quality, `${option} ${id}`).toBeGreaterThanOrEqual(4)
  })

  it('has a clip and a picture for each look, the plant sheets, the lever pictures and the numbers', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/foliage/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    for (const option of OPTIONS) {
      expect(media).toContain(`${option.id}.webm`)
      expect(media).toContain(`${option.id}.jpg`)
    }
    for (const picture of ['SE', 'SH', 'L0', 'L1', 'L2']) expect(media).toContain(`${picture}.jpg`)
    const stats = import.meta.glob<Record<string, { trees: number }>>('../../public/studies/foliage/stats.json', { eager: true, import: 'default' })['../../public/studies/foliage/stats.json']
    expect(Object.keys(stats)).toEqual(OPTIONS.map(option => option.id))
    // The numbers of the page are the numbers of the plan.
    expect(stats.E2.trees).toBe(plan('E2', earth).stats.trees)
    expect(stats.H2.trees).toBe(plan('H2', haven).stats.trees)
  })
})
