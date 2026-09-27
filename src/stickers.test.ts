import { describe, expect, it } from 'vitest'
import { arrivalDistance, arrive, earnsSticker, emptyBook, parseBook, reachesMilestone, stickerById, STICKERS, suggestNext } from './stickers'

describe('sticker book', () => {
  it('has one sticker for each world, with the Moon after Earth, as in Worlds', () => {
    const ids = STICKERS.map(sticker => sticker.id)
    expect(ids).toEqual(['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'vesta', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune', 'fairy'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps every fact short and free of numbers, for a young reader', () => {
    for (const { fact } of STICKERS) {
      expect(fact).not.toMatch(/\d/)
      for (const sentence of fact.split(/(?<=[.!?])\s+/)) expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(12)
    }
  })

  it('earns a sticker at the "near" distance of the flight panel', () => {
    expect(arrivalDistance(stickerById('moon'))).toBe(85)
    expect(arrivalDistance(stickerById('jupiter'))).toBe(145 * 1.5)
  })

  it('earns each sticker once, and celebrates every fourth one', () => {
    const first = arrive(emptyBook(), 'earth')
    expect(first.earned).toEqual([{ id: 'earth', kind: 'hello' }])
    expect(arrive(first.book, 'earth').earned).toEqual([])
    expect(reachesMilestone(3, 4)).toBe(true)
    expect(reachesMilestone(4, 5)).toBe(false)
  })

  it('suggests the nearest empty space: the Moon after Earth', () => {
    const book = arrive(emptyBook(), 'earth').book
    expect(suggestNext(book, 'earth')!.id).toBe('moon')
  })

  it('gives the Earth sticker only after a return from space', () => {
    // The fairy starts on the first visit of Earth; a return from space makes visit 2.
    expect(earnsSticker('earth', 1)).toBe(false)
    expect(earnsSticker('earth', 2)).toBe(true)
    expect(earnsSticker('mars', 0)).toBe(true)
    expect(earnsSticker('fairy', 0)).toBe(true)
  })

  it('reads a saved book safely', () => {
    expect(parseBook('broken')).toEqual(emptyBook())
    expect(parseBook({ arrived: ['moon', 'moon', 'pluto'] }).arrived).toEqual(['moon'])
  })
})
