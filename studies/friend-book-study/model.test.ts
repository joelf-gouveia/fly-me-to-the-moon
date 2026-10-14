import { describe, expect, it } from 'vitest'
import { FRIEND_KINDS, parseFriend } from '../../src/friend'
import { CARDS, CHANGES, CLIPS, COMPARE, DECISIONS, OPTIONS, PARTS, SAVE_EXAMPLE } from './model'
import { scopeCss } from './scope-css.mjs'
import captureScript from './friend-book-study-capture.mjs?raw'

describe('the friend book study', () => {
  it('has three options, A to C, and recommends one of them', () => {
    expect(OPTIONS.map(option => option.id)).toEqual(['A', 'B', 'C'])
    expect(OPTIONS.filter(option => option.recommended).map(option => option.id)).toEqual(['A'])
    for (const option of OPTIONS) {
      expect(option.strong.length, option.id).toBeGreaterThanOrEqual(2)
      expect(option.weak.length, option.id).toBeGreaterThanOrEqual(2)
      for (const row of COMPARE) expect(row.values[option.id], row.row).toBeTruthy()
    }
  })

  it('has decisions with exactly one recommended option each, the first one', () => {
    expect(DECISIONS.length).toBeGreaterThanOrEqual(5)
    for (const decision of DECISIONS) {
      expect(decision.options[0].endsWith('(recommended)'), decision.id).toBe(true)
      expect(decision.options.filter(option => option.includes('(recommended)')), decision.id).toHaveLength(1)
    }
    expect(new Set(DECISIONS.map(decision => decision.id)).size).toBe(DECISIONS.length)
    // The first decision offers each option.
    for (const option of OPTIONS) expect(DECISIONS[0].options.some(choice => choice.startsWith(`${option.id} · ${option.name}`)), option.id).toBe(true)
  })

  it('has a card for each kind that can be a friend: four real animals and five story creatures, each with three picture facts', () => {
    expect(CARDS.map(card => card.kind)).toEqual([...FRIEND_KINDS])
    expect(CARDS.filter(card => card.group === 'real').map(card => card.kind)).toEqual(['cow', 'rabbit', 'sheep', 'duck'])
    expect(CARDS.filter(card => card.group === 'story')).toHaveLength(5)
    for (const card of CARDS) {
      expect(card.facts, card.kind).toHaveLength(3)
      expect(card.world, card.kind).toBe(card.group === 'real' ? 'earth' : 'fairy')
      expect(card.home[0].length, card.kind).toBeGreaterThan(0)
    }
    expect(CARDS.filter(card => card.flies).map(card => card.kind)).toEqual(['duck', 'dragonling', 'pegasus'])
  })

  it('keeps the saved record of F19: the example loads with parseFriend()', () => {
    const json = SAVE_EXAMPLE.split('\n').filter(line => !line.trim().startsWith('//')).map(line => line.replace(/\s*\/\/.*$/, '')).join('\n')
    expect(parseFriend(JSON.parse(json))).toEqual({ hellos: 5, met: ['cow', 'sheep', 'pegasus', 'duck'], friend: 'pegasus' })
    expect(CHANGES.length).toBeGreaterThanOrEqual(6)
  })

  it('has a clip, a poster, a cue list and three moment pictures for each option and each shared part', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/friend-book/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    const cueLists = import.meta.glob<{ t: number }[]>('../../public/studies/friend-book/*.cues.json', { eager: true, import: 'default' })
    expect(CLIPS.map(clip => clip.id)).toEqual(['A', 'B', 'C', 'G', 'P'])
    expect(Object.keys(PARTS).sort()).toEqual(['G', 'P'])
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
      const cues = cueLists[`../../public/studies/friend-book/${clip.id}.cues.json`]
      expect(cues, clip.id).toBeDefined()
      cues.forEach(cue => expect(cue.t).toBeGreaterThanOrEqual(0))
      // The capture script takes the moment pictures at the same times.
      expect(captureScript, clip.id).toContain(`${clip.id}: [${clip.moments.map(moment => moment.t).join(', ')}]`)
    }
  })

  it('puts the game CSS under one class, with the narrow rules as container queries', () => {
    const css = scopeCss(':root { --a: 1 } html, body { margin: 0 } .card, #map > p { color: red } @media (max-width: 720px) { .card { width: 1px } } @media (prefers-reduced-motion: reduce) { .card { animation: none } } @keyframes spin { to { rotate: 1turn } }')
    expect(css).toContain('.fb-game {')
    expect(css).not.toMatch(/(^|[\s,])(html|body)[\s,{]/)
    expect(css).toContain('.fb-game .card, .fb-game #map > p {')
    expect(css).toContain('@container fb-view (max-width: 720px) {.fb-game .card {')
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {.fb-game .card {')
    expect(css).toContain('@keyframes spin {')
  })
})
