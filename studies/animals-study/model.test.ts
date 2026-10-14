import { describe, expect, it } from 'vitest'
import { BELTS, GARDENS } from '../../src/foliage/zones'
import { MAGIC_SEASONS } from '../../src/magic-seasons'
import { species as gameSpecies } from '../../src/creatures/habitat'
import { fairytaleOrder } from '../../src/creatures/fairytale'
import { readRange, readsFrom, SPECIES, speciesOf } from './catalog'
import { fits, placeAt, ruleText } from './rules'
import type { Place } from './rules'
import { SHAPE_IDS } from './shapes'
import { BENCH, BENCH_OPTIONS, benchRow, CLIPS, COMPARE, DECISIONS, OPTIONS, placesOf, PLAN, SCOPE, worst } from './model'
import captureScript from './animals-study-capture.mjs?raw'

const SURFACES = ['land', 'shore', 'river', 'sea', 'deep']
const SEASONS = ['spring', 'summer', 'autumn', 'winter']

describe('the catalog of the animals study', () => {
  it('has 20 to 31 kinds of Earth and 12 to 20 of Blossom Haven in the largest option, and fewer in A', () => {
    expect(SCOPE.C.earth).toBeGreaterThanOrEqual(20)
    expect(SCOPE.C.earth).toBeLessThanOrEqual(31)
    expect(SCOPE.C.fairy).toBeGreaterThanOrEqual(12)
    expect(SCOPE.C.fairy).toBeLessThanOrEqual(20)
    expect(SCOPE.A.earth).toBeLessThan(SCOPE.B.earth)
    expect(SCOPE.B.earth).toBeLessThanOrEqual(SCOPE.C.earth)
    expect(new Set(SPECIES.map(s => s.id)).size).toBe(SPECIES.length)
  })

  it('gives each kind a rule with the zones, the surfaces and the seasons of the code', () => {
    const earthZones = [...Object.keys(BELTS), 'polar'], havenZones = Object.keys(GARDENS)
    const magic = MAGIC_SEASONS.map(season => season.id) as string[]
    for (const s of SPECIES) {
      expect(s.rule.world, s.id).toBe(s.world)
      for (const zone of s.rule.zones) expect(s.world === 'earth' ? earthZones : havenZones, s.id).toContain(zone)
      expect(s.rule.surfaces.length, s.id).toBeGreaterThan(0)
      for (const surface of s.rule.surfaces) expect(SURFACES, s.id).toContain(surface)
      for (const season of s.rule.seasons ?? []) expect(SEASONS, s.id).toContain(season)
      for (const id of s.rule.magic ?? []) expect(magic, s.id).toContain(id)
      if (s.rule.magic) expect(s.world, s.id).toBe('fairy')
      if (s.rule.seasons) expect(s.world, s.id).toBe('earth')
      expect(s.herd[0], s.id).toBeGreaterThanOrEqual(1)
      expect(s.herd[1], s.id).toBeGreaterThanOrEqual(s.herd[0])
      expect(s.options.length, s.id).toBeGreaterThan(0)
      expect(ruleText(s.rule).length, s.id).toBeGreaterThan(5)
      for (const text of [s.behaviour, s.hello, s.why]) expect(text.length, s.id).toBeGreaterThan(5)
    }
  })

  it('keeps the animals and the creatures of today, and gives Blossom Haven no copy of an Earth kind', () => {
    for (const kind of Object.keys(gameSpecies)) expect(SPECIES.find(s => s.id === kind)?.existing, kind).toBe(true)
    for (const kind of fairytaleOrder) expect(SPECIES.find(s => s.id === kind)?.world, kind).toBe('fairy')
    const earthNames = SPECIES.filter(s => s.world === 'earth').map(s => s.name.toLowerCase())
    const earthWords = new Set(earthNames.flatMap(name => name.split(/[\s-]+/)).filter(word => word.length > 3 && !['brown', 'silver', 'arctic'].includes(word)))
    for (const s of SPECIES.filter(item => item.world === 'fairy')) {
      expect(earthNames, s.id).not.toContain(s.name.toLowerCase())
      // A magic kind may share a word only with a sweet or a story: no Earth animal word is its only word.
      const words = s.name.toLowerCase().split(/[\s-]+/)
      expect(words.every(word => earthWords.has(word.replace(/s$/, '')) || earthWords.has(word)), s.id).toBe(false)
    }
  })

  it('has a model for each kind that it marks as a prototype', () => {
    for (const s of SPECIES.filter(item => item.prototype && !item.existing)) expect(SHAPE_IDS, s.id).toContain(s.id)
    for (const s of SPECIES.filter(item => !item.prototype)) expect(s.options, s.id).not.toContain('A')
  })

  it('reads a rule against a place, with the season and the half of the planet', () => {
    const place = (more: Partial<Place>): Place => ({ zone: 'savanna', surface: 'land', height: 2, south: false, home: false, ...more })
    const zebra = SPECIES.find(s => s.id === 'zebra')!, penguin = SPECIES.find(s => s.id === 'penguin')!, butterfly = SPECIES.find(s => s.id === 'butterfly')!
    expect(fits(zebra.rule, place({}))).toBe(true)
    expect(fits(zebra.rule, place({ zone: 'tundra' }))).toBe(false)
    expect(fits(zebra.rule, place({ surface: 'sea' }))).toBe(false)
    expect(fits(penguin.rule, place({ zone: 'tundra', surface: 'shore', south: true }))).toBe(true)
    expect(fits(penguin.rule, place({ zone: 'tundra', surface: 'shore', south: false }))).toBe(false)
    expect(fits(butterfly.rule, place({ zone: 'temperate' }), { earth: 'winter' })).toBe(false)
    expect(fits(butterfly.rule, place({ zone: 'temperate' }), { earth: 'summer' })).toBe(true)
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

  it('puts each kind in exactly one place of the book', () => {
    for (const world of ['earth', 'fairy'] as const) {
      const places = placesOf(world)
      const ids = places.flatMap(place => place.species.map(s => s.id))
      expect(ids.sort()).toEqual(SPECIES.filter(s => s.world === world).map(s => s.id).sort())
    }
  })

  it('computes how far a kind reads from its size', () => {
    expect(readRange(1)).toBe(41)
    expect(readsFrom(3.2)).toBe('far')
    expect(readsFrom(1.25)).toBe('middle')
    expect(readsFrom(0.45)).toBe('near')
  })
})

describe('the options, the bench and the decisions', () => {
  it('has three options, A to C, and recommends B', () => {
    expect(OPTIONS.map(option => option.id)).toEqual(['A', 'B', 'C'])
    expect(OPTIONS.filter(option => option.recommended).map(option => option.id)).toEqual(['B'])
    for (const option of OPTIONS) {
      expect(option.strong.length, option.id).toBeGreaterThanOrEqual(2)
      expect(option.weak.length, option.id).toBeGreaterThanOrEqual(2)
      expect(option.risks.length, option.id).toBeGreaterThanOrEqual(1)
      for (const row of COMPARE) expect(row.values[option.id], row.row).toBeTruthy()
      expect(speciesOf(option.id, 'earth').length).toBe(SCOPE[option.id].earth)
    }
    expect(PLAN.length).toBeGreaterThanOrEqual(6)
  })

  it('has a measured row for each view, device and option, and B costs fewer draw calls than A', () => {
    for (const device of ['desktop', 'phone', 'phoneSlow'] as const) {
      expect(BENCH[device].views).toHaveLength(4)
      for (const view of BENCH[device].views) for (const option of ['none', ...BENCH_OPTIONS]) {
        const row = benchRow(device, view.id, option)
        expect(row, `${device} ${view.id} ${option}`).toBeDefined()
        expect(row.calls).toBeGreaterThan(0)
        expect(row.ms).toBeGreaterThan(0)
      }
      expect(worst(device, 'B').animalCalls).toBeLessThan(worst(device, 'A').animalCalls)
    }
    expect(BENCH.phone.pixelRatio).toBe(1.25)
    expect(BENCH.phoneSlow.throttle).toBe(4)
  })

  it('has decisions with exactly one recommended option each, the first one', () => {
    expect(DECISIONS.length).toBeGreaterThanOrEqual(5)
    for (const decision of DECISIONS) {
      expect(decision.options[0].endsWith('(recommended)'), decision.id).toBe(true)
      expect(decision.options.filter(option => option.includes('(recommended)')), decision.id).toHaveLength(1)
    }
    expect(new Set(DECISIONS.map(decision => decision.id)).size).toBe(DECISIONS.length)
    for (const option of OPTIONS) expect(DECISIONS[0].options.some(choice => choice.startsWith(`${option.id} · ${option.name}`)), option.id).toBe(true)
  })

  it('has a clip, a poster, a cue list and three moment pictures for each clip, and a bench picture for each option', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/animals/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    const cards = Object.keys(import.meta.glob('../../public/studies/animals/cards/*.jpg')).map(path => path.split('/').at(-1))
    const cueLists = import.meta.glob<{ t: number }[]>('../../public/studies/animals/*.cues.json', { eager: true, import: 'default' })
    expect(CLIPS.map(clip => clip.id)).toEqual(['A', 'B', 'C', 'S', 'W', 'H', 'L'])
    for (const clip of CLIPS) {
      expect(media).toContain(`${clip.id}.webm`)
      expect(media).toContain(`${clip.id}.jpg`)
      clip.moments.forEach((moment, index) => {
        expect(media).toContain(`${clip.id}-${index}.jpg`)
        expect(moment.t, clip.id).toBeLessThan(clip.length)
      })
      expect(clip.length, clip.id).toBeGreaterThanOrEqual(9)
      expect(clip.length, clip.id).toBeLessThanOrEqual(14)
      expect(clip.question.endsWith('?'), clip.id).toBe(true)
      const cues = cueLists[`../../public/studies/animals/${clip.id}.cues.json`]
      expect(cues, clip.id).toBeDefined()
      cues.forEach(cue => expect(cue.t).toBeGreaterThanOrEqual(0))
      // The capture script takes the moment pictures at the same times.
      expect(captureScript, clip.id).toContain(`${clip.id}: [${clip.moments.map(moment => moment.t).join(', ')}]`)
    }
    for (const option of ['today', 'A', 'B', 'C']) {
      expect(media).toContain(`P-${option}.jpg`)
      expect(media).toContain(`D-${option}.jpg`)
    }
    for (const s of SPECIES.filter(item => item.prototype)) expect(cards, s.id).toContain(`${s.id}.jpg`)
  })
})
