import { describe, expect, it } from 'vitest'
import { arrivalDistance, arrive, BOOK_ORDER, canFly, earnsSticker, emptyBook, isKnown, nextDoor, parseBook, reachesMilestone, stickerById, STICKERS, suggestNext } from '../src/stickers'
import type { StickerId } from '../src/stickers'

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

  it('opens the worlds one next door at a time, from the Moon to Earth', () => {
    expect(BOOK_ORDER[0]).toBe('fairy')
    expect(new Set(BOOK_ORDER).size).toBe(13)
    const book = emptyBook()
    const open = () => STICKERS.map(sticker => sticker.id).filter(id => canFly(book, id))
    expect(open()).toEqual(['earth', 'moon', 'fairy'])
    expect(isKnown(book, 'sun') && isKnown(book, 'earth') && isKnown(book, 'fairy') && !isKnown(book, 'mars')).toBe(true)
    const chain: StickerId[] = []
    for (let next = nextDoor(book); next; next = nextDoor(book)) {
      // Never more than one world is open with no sticker, other than Earth and Blossom Haven.
      expect(open().filter(id => !book.arrived.includes(id) && id !== 'earth' && id !== 'fairy').length).toBeLessThanOrEqual(1)
      chain.push(next)
      book.arrived.push(next)
    }
    expect(chain).toEqual(['moon', 'venus', 'mercury', 'sun', 'mars', 'vesta', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune', 'earth'])
  })

  it('keeps a world open after its sticker, even one found in free flight', () => {
    const book = { ...emptyBook(), arrived: ['neptune' as const] }
    expect(canFly(book, 'neptune')).toBe(true)
    expect(canFly(book, 'mars')).toBe(false)
    expect(isKnown(book, 'neptune')).toBe(true)
  })
})
