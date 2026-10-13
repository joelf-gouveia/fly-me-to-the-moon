import { describe, expect, it } from 'vitest'
import { STICKERS } from '../../src/stickers'
import { BELTS } from '../../src/foliage/zones'
import { DECISIONS, IDEAS } from './model'
import { STUDIES, STUDY_QUESTIONS } from './studies'
import { ANIMAL_CARDS } from './features/f11-animal-book'
import { acrossCount, PAIRS } from './features/f13-size-lineup'
import { shapeAt, SHAPES } from './features/f14-moon-diary'
import { BELT_STAMPS } from './features/f15-nature-stamps'
import { WARMTH, warmthFace } from './features/f16-thermometer'
import { GARDEN } from './features/f17-cottage-garden'
import { GIFTS } from './features/f18-looks-to-earn'
import { ALBUM, ALBUM_LIMIT } from './features/f20-postcard-album'

describe('the learn and play study', () => {
  it('has ten ideas, F11 to F20: six to learn and four to play, and proposes four of them', () => {
    expect(IDEAS.map(idea => idea.id)).toEqual(['F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20'])
    expect(IDEAS.filter(idea => idea.group === 'Learn')).toHaveLength(6)
    expect(IDEAS.filter(idea => idea.group === 'Play')).toHaveLength(4)
    expect(IDEAS.filter(idea => idea.proposed).map(idea => idea.id)).toEqual(['F11', 'F12', 'F15', 'F17'])
  })

  it('offers each idea in the first decision', () => {
    expect(DECISIONS[0].options).toHaveLength(IDEAS.length)
    IDEAS.forEach((idea, index) => expect(DECISIONS[0].options[index].startsWith(`${idea.id} — ${idea.name}`)).toBe(true))
  })

  it('F11: has a card with three picture facts for each animal of Earth', () => {
    expect(Object.keys(ANIMAL_CARDS).sort()).toEqual(['cow', 'duck', 'rabbit', 'sheep'])
    Object.values(ANIMAL_CARDS).forEach(card => expect(card.icons).toHaveLength(3))
  })

  it('F13: counts the real proportions of the worlds', () => {
    expect(PAIRS.map(pair => acrossCount(pair.small, pair.large))).toEqual([4, 11, 10])
  })

  it('F14: gives each angle between the Moon and the Sun one of five shapes', () => {
    expect(SHAPES).toHaveLength(5)
    expect([0, 40, 90, 135, 180].map(angle => shapeAt(angle).id)).toEqual(['new', 'crescent', 'half', 'gibbous', 'full'])
    // The lit part grows from the new Moon to the full Moon.
    SHAPES.slice(1).forEach((shape, index) => expect(shape.lit).toBeGreaterThan(SHAPES[index].lit))
  })

  it('F15: has one stamp for each climate belt of Earth', () => {
    expect(BELT_STAMPS.map(stamp => stamp.id).sort()).toEqual(Object.keys(BELTS).sort())
  })

  it('F16: has a level for each world, with Venus the hottest planet and Uranus the coldest', () => {
    for (const sticker of STICKERS) expect(WARMTH[sticker.id]).toBeGreaterThanOrEqual(0)
    const planets = STICKERS.filter(sticker => sticker.group === 'rocky' || sticker.group === 'giant').map(sticker => sticker.id)
    expect(planets.reduce((a, b) => WARMTH[a] > WARMTH[b] ? a : b)).toBe('venus')
    expect(planets.reduce((a, b) => WARMTH[a] < WARMTH[b] ? a : b)).toBe('uranus')
    expect(warmthFace(WARMTH.venus).word).toBe('HOT')
    expect(warmthFace(WARMTH.uranus).word).toBe('COLD')
    expect(warmthFace(WARMTH.earth).word).toBe('NICE')
  })

  it('F17 and F18: use the worlds of the sticker book', () => {
    const ids = STICKERS.map(sticker => sticker.id)
    GARDEN.forEach(id => expect(ids).toContain(id))
    expect(GIFTS.map(gift => gift.world)).toEqual(STICKERS.map(sticker => sticker.name))
  })

  it('F20: has a place for each picture to find, and a limit', () => {
    expect(new Set(ALBUM.map(item => item.id)).size).toBe(ALBUM.length)
    expect(ALBUM_LIMIT).toBeGreaterThanOrEqual(ALBUM.length)
  })

  it('has a study for each idea: three moments with a picture, findings, decisions with a recommendation, steps and checks', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/learn-and-play/*.jpg')).map(path => path.split('/').at(-1))
    for (const idea of IDEAS) {
      const study = STUDIES[idea.id]
      expect(study.question.endsWith('?'), idea.id).toBe(true)
      study.moments.forEach((_, index) => expect(media).toContain(`${idea.id}-${index}.jpg`))
      expect(study.findings.length, idea.id).toBeGreaterThanOrEqual(3)
      expect(study.questions.length, idea.id).toBeGreaterThanOrEqual(3)
      for (const question of study.questions) {
        expect(question.id.startsWith(`${idea.id}-`)).toBe(true)
        expect(question.options[0].endsWith('(recommended)'), question.id).toBe(true)
        expect(question.options.filter(option => option.includes('(recommended)'))).toHaveLength(1)
      }
      expect(study.steps.length, idea.id).toBeGreaterThanOrEqual(3)
      expect(study.checks.length, idea.id).toBeGreaterThanOrEqual(2)
    }
    const ids = [...DECISIONS, ...STUDY_QUESTIONS].map(decision => decision.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has a clip, a picture and a cue list for each idea', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/learn-and-play/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    const cueLists = import.meta.glob<{ t: number }[]>('../../public/studies/learn-and-play/*.cues.json', { eager: true, import: 'default' })
    for (const idea of IDEAS) {
      expect(media).toContain(`${idea.id}.webm`)
      expect(media).toContain(`${idea.id}.jpg`)
      const cues = cueLists[`../../public/studies/learn-and-play/${idea.id}.cues.json`]
      expect(cues, idea.id).toBeDefined()
      cues.forEach(cue => expect(cue.t).toBeGreaterThanOrEqual(0))
    }
  })
})
