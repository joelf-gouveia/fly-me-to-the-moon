import doc from '../../docs/fairy-home-study.md?raw'
import { describe, expect, it } from 'vitest'
import { MOMENTS, SHEETS } from './fairy-home-study-capture.mjs'
import { CANDIDATES, CHANGES, CLIPS, DECISIONS, FINDINGS } from './model'
import { HOMES, SHEET } from './homes'
import { OPTIONS, PART_IDS, TODAY } from './parts'
import { FEATURES } from './features/clips'

describe('the fairy home study page', () => {
  it('has a clip, three moments and a feature for each chip', () => {
    expect(CLIPS.map(clip => clip.id)).toEqual(Object.keys(MOMENTS))
    for (const clip of CLIPS) {
      expect(clip.moments.map(moment => moment.t)).toEqual(MOMENTS[clip.id])
      expect(FEATURES[clip.id], clip.id).toBeDefined()
      expect(clip.rules.length, clip.id).toBeGreaterThan(1)
    }
    for (const id of Object.keys(SHEETS)) expect(FEATURES[id], id).toBeDefined()
  })

  it('has one sheet picture for each option, in the order of the parts', () => {
    expect(SHEET).toHaveLength(SHEETS.P)
    expect(SHEET.map(item => `${item.part}:${item.option}`)).toEqual(PART_IDS.flatMap(part => OPTIONS[part].map(option => `${part}:${option.id}`)))
    expect(HOMES).toHaveLength(SHEETS.H)
    expect(HOMES[0].look).toEqual(TODAY)
  })

  it('makes each home of the stories from known options', () => {
    for (const home of HOMES) for (const part of PART_IDS) expect(OPTIONS[part].map(option => option.id), home.id).toContain(home.look[part])
  })

  it('recommends the first option of each decision and gives each a reason', () => {
    expect(new Set(DECISIONS.map(decision => decision.id)).size).toBe(DECISIONS.length)
    for (const decision of DECISIONS) {
      expect(decision.options.length, decision.id).toBeGreaterThanOrEqual(2)
      expect(decision.why.length, decision.id).toBeGreaterThan(20)
    }
    expect(CANDIDATES.filter(item => item.verdict === 'own').map(item => item.part)).toEqual(['Roof', 'Walls', 'Door', 'Yard', 'Colours'])
    expect(FINDINGS.length).toBe(8)
    expect(CHANGES.length).toBeGreaterThan(4)
  })

  it('names in the technical study each code place that the page names', () => {
    for (const name of ['buildFlowerCottage()', 'homeMarkerPosition()', 'flower-cottage', 'cottage-window', 'parseHomeLook()', 'MAX_TOP', 'relocateHome()']) expect(doc).toContain(name)
  })
})
