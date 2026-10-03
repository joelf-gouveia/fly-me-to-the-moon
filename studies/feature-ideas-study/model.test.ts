import { describe, expect, it } from 'vitest'
import { STICKERS } from '../../src/stickers'
import { DECISIONS, IDEAS } from './model'
import { WORLD_CHORDS } from './features/f6-world-songs'

describe('the feature ideas study', () => {
  it('has ten ideas, F1 to F10, and proposes four of them', () => {
    expect(IDEAS.map(idea => idea.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'])
    expect(IDEAS.filter(idea => idea.proposed).map(idea => idea.id)).toEqual(['F1', 'F2', 'F3', 'F5'])
  })

  it('offers each idea in the first decision', () => {
    expect(DECISIONS[0].options).toHaveLength(IDEAS.length)
    IDEAS.forEach((idea, index) => expect(DECISIONS[0].options[index].startsWith(`${idea.id} — ${idea.name}`)).toBe(true))
  })

  it('gives each world a chord of three rising notes, and keeps the hum of today on Earth', () => {
    for (const sticker of STICKERS) {
      const chord = WORLD_CHORDS[sticker.id]
      expect(chord).toHaveLength(3)
      expect(chord[0]).toBeLessThan(chord[1])
      expect(chord[1]).toBeLessThan(chord[2])
    }
    expect(WORLD_CHORDS.earth).toEqual([110, 164.81, 220])
  })

  it('has a clip, a picture and a cue list for each idea', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/feature-ideas/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    const cueLists = import.meta.glob<{ t: number }[]>('../../public/studies/feature-ideas/*.cues.json', { eager: true, import: 'default' })
    for (const idea of IDEAS) {
      expect(media).toContain(`${idea.id}.webm`)
      expect(media).toContain(`${idea.id}.jpg`)
      const cues = cueLists[`../../public/studies/feature-ideas/${idea.id}.cues.json`]
      expect(cues, idea.id).toBeDefined()
      cues.forEach(cue => expect(cue.t).toBeGreaterThanOrEqual(0))
    }
  })
})
