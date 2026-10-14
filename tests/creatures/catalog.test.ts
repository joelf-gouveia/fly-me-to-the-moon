import { describe, expect, it } from 'vitest'
import { BELTS, GARDENS } from '../../src/foliage/zones'
import { MAGIC_SEASONS } from '../../src/magic-seasons'
import { species as firstAnimals } from '../../src/creatures/habitat'
import { fairytaleOrder } from '../../src/creatures/fairytale'
import { FRIEND_KIND_IDS, HERD_KINDS, KIND_IDS, kindsOf, readRange, SPECIES, speciesById } from '../../src/creatures/catalog'
import { fits, magicFits, placeAt, seasonFor, SURFACES } from '../../src/creatures/rules'
import type { Place } from '../../src/creatures/rules'

const SEASONS = ['spring', 'summer', 'autumn', 'winter']

describe('the catalog of the animals', () => {
  it('has 31 kinds on Earth and 17 on Blossom Haven, each with its own id', () => {
    expect(kindsOf('earth')).toHaveLength(31)
    expect(kindsOf('fairy')).toHaveLength(17)
    expect(SPECIES.map(s => s.id).sort()).toEqual([...KIND_IDS].sort())
    expect(new Set(KIND_IDS).size).toBe(KIND_IDS.length)
    expect(HERD_KINDS.map(s => s.id)).not.toContain('pegasus')
  })

  it('gives each kind a rule with the zones of BELTS or GARDENS, valid surfaces and valid seasons', () => {
    const earthZones = [...Object.keys(BELTS), 'polar'], havenZones = Object.keys(GARDENS)
    const magic = MAGIC_SEASONS.map(season => season.id) as string[]
    for (const s of SPECIES) {
      expect(s.rule.world, s.id).toBe(s.world)
      for (const zone of s.rule.zones) expect(s.world === 'earth' ? earthZones : havenZones, s.id).toContain(zone)
      expect(s.rule.surfaces.length, s.id).toBeGreaterThan(0)
      for (const surface of s.rule.surfaces) expect(SURFACES, s.id).toContain(surface)
      for (const season of [...s.rule.seasons ?? [], ...Object.values(s.rule.seasonsIn ?? {}).flat()]) expect(SEASONS, s.id).toContain(season)
      for (const zone of Object.keys(s.rule.seasonsIn ?? {})) expect(s.rule.zones, s.id).toContain(zone)
      for (const id of s.rule.magic ?? []) expect(magic, s.id).toContain(id)
      if (s.rule.magic) expect(s.world, s.id).toBe('fairy')
      if (s.rule.seasons || s.rule.seasonsIn || s.rule.night) expect(s.world, s.id).toBe('earth')
      if (s.move === 'fly') expect(s.rule.air, s.id).toBeDefined()
      expect(s.herd[0], s.id).toBeGreaterThanOrEqual(1)
      expect(s.herd[1], s.id).toBeGreaterThanOrEqual(s.herd[0])
      expect(s.size, s.id).toBeGreaterThan(0)
    }
  })

  it('moves the four animals of the first game to the leaf forest and the duck to its rivers', () => {
    for (const kind of Object.keys(firstAnimals) as ('cow' | 'sheep' | 'rabbit' | 'duck')[]) expect(speciesById(kind).rule.zones).toEqual(['temperate'])
    expect(speciesById('duck').rule.surfaces).toEqual(['river'])
    for (const kind of fairytaleOrder) expect(speciesById(kind).world, kind).toBe('fairy')
  })

  it('gives Blossom Haven no copy of an Earth animal', () => {
    const earthNames = kindsOf('earth').map(s => s.name.toLowerCase())
    const earthWords = new Set(earthNames.flatMap(name => name.split(/[\s-]+/)).filter(word => word.length > 3 && !['brown', 'silver', 'arctic'].includes(word)))
    for (const s of kindsOf('fairy')) {
      expect(earthNames, s.id).not.toContain(s.name.toLowerCase())
      // A magic kind may share a word only with a sweet or a story: no Earth animal word is its only word.
      const words = s.name.toLowerCase().split(/[\s-]+/)
      expect(words.every(word => earthWords.has(word.replace(/s$/, '')) || earthWords.has(word)), s.id).toBe(false)
    }
  })

  it('has one creature for each magic season, and lets each kind that is no school or swarm be a friend', () => {
    for (const season of MAGIC_SEASONS) expect(SPECIES.filter(s => s.rule.magic?.includes(season.id)).map(s => s.id), season.id).toHaveLength(1)
    expect(SPECIES.filter(s => s.group).map(s => s.id).sort()).toEqual(['butterfly', 'firefly', 'fish', 'honeyBee'])
    expect(FRIEND_KIND_IDS).toHaveLength(44)
  })

  it('reads a rule against a place, with the season and the half of the planet', () => {
    const place = (more: Partial<Place>): Place => ({ zone: 'savanna', surface: 'land', height: 2, south: false, home: false, ...more })
    const zebra = speciesById('zebra'), penguin = speciesById('penguin'), butterfly = speciesById('butterfly'), stork = speciesById('stork')
    expect(fits(zebra.rule, place({}))).toBe(true)
    expect(fits(zebra.rule, place({ zone: 'tundra' }))).toBe(false)
    expect(fits(zebra.rule, place({ surface: 'sea' }))).toBe(false)
    expect(fits(penguin.rule, place({ zone: 'tundra', surface: 'shore', south: true }))).toBe(true)
    expect(fits(penguin.rule, place({ zone: 'tundra', surface: 'shore', south: false }))).toBe(false)
    expect(fits(butterfly.rule, place({ zone: 'temperate' }), { earth: 'winter' })).toBe(false)
    expect(fits(butterfly.rule, place({ zone: 'temperate' }), { earth: 'summer' })).toBe(true)
    // The stork: summer in the leaf forest, winter in the savanna.
    expect(fits(stork.rule, place({ zone: 'temperate' }), { earth: 'summer' })).toBe(true)
    expect(fits(stork.rule, place({ zone: 'temperate' }), { earth: 'winter' })).toBe(false)
    expect(fits(stork.rule, place({ zone: 'savanna' }), { earth: 'winter' })).toBe(true)
    expect(fits(stork.rule, place({ zone: 'savanna' }), { earth: 'summer' })).toBe(false)
  })

  it('gives a savanna near the equator the season of its half for a kind that travels', () => {
    const stork = speciesById('stork'), zebra = speciesById('zebra')
    // Year 0.8 is the winter of the north.
    expect(seasonFor(zebra.rule, 'savanna', 5, 0.8)).toBeNull()
    expect(seasonFor(stork.rule, 'savanna', 5, 0.8)).toBe('winter')
    expect(seasonFor(stork.rule, 'savanna', -5, 0.8)).toBe('summer')
    expect(seasonFor(stork.rule, 'temperate', 40, 0.3)).toBe('summer')
  })

  it('shows a magic kind only in its magic season', () => {
    const bees = speciesById('honeyBee')
    // The cottage (y = -1) has Blossom time at year 0, Bubble time at 0.25.
    expect(magicFits(bees.rule, -1, 0)).toBe(true)
    expect(magicFits(bees.rule, -1, 0.25)).toBe(false)
    expect(magicFits(speciesById('unicorn').rule, -1, 0.25)).toBe(true)
  })

  it('finds the place of a direction from the terrain and the zones of the game', () => {
    const flat = (height: number, river = 0) => () => ({ height, land: height, river, detail: 0 })
    const fields = { zone: () => 0, moist: () => 0, wood: () => 0, jitter: () => 0 }
    expect(placeAt('earth', 0, 0.1, 0.995, flat(3), fields, 275)).toMatchObject({ surface: 'land', zone: 'savanna' })
    expect(placeAt('earth', 0, 0.45, 0.89, flat(3), fields, 275).zone).toBe('temperate')
    expect(placeAt('earth', 0, 0.95, 0.31, flat(3), fields, 275).zone).toBe('polar')
    expect(placeAt('earth', 0, 0.1, 0.995, flat(-2, 1), fields, 275).surface).toBe('river')
    expect(placeAt('earth', 0, 0.1, 0.995, flat(-6), fields, 275).surface).toBe('deep')
    expect(placeAt('fairy', 0, 0.1, 0.995, flat(5), fields, 137.5).zone).toBe('peaks')
  })

  it('computes how far a kind reads from its size', () => {
    expect(readRange(1)).toBe(41)
    expect(readRange(9)).toBeGreaterThan(170)
  })
})
