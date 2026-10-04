import { describe, expect, it } from 'vitest'
import {
  arrivalDistance, arrive, cost, emptyBook, find, LINES, parseBook, place, placementWords,
  progress, reachesMilestone, sentences, STICKERS, suggestNext, text, wordCount,
} from './model'
import type { Book } from './model'

describe('sticker book study', () => {
  it('has one sticker for each world of the study, in order out from the Sun', () => {
    expect(STICKERS.map(sticker => sticker.id)).toEqual(['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'vesta', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune', 'fairy'])
    const paths = STICKERS.flatMap(sticker => sticker.path === null ? [] : [sticker.path])
    expect(paths).toEqual(paths.toSorted((a, b) => a - b))
    expect(STICKERS.filter(sticker => sticker.path === null).map(sticker => sticker.id)).toEqual(['fairy'])
  })

  it('keeps every spoken line short and free of numbers, for a five-year-old', () => {
    for (const sticker of STICKERS) {
      for (const line of [sticker.fact, sticker.search.task, sticker.search.found]) {
        expect(line).not.toMatch(/\d/)
        expect(wordCount(line)).toBeLessThanOrEqual(16)
        for (const sentence of sentences(line)) expect(wordCount(sentence)).toBeLessThanOrEqual(12)
      }
      expect(sentences(sticker.fact).length).toBeLessThanOrEqual(2)
    }
    for (const line of [...Object.values(LINES.en), ...Object.values(LINES.pt)]) {
      expect(line).not.toMatch(/\d/)
      for (const sentence of sentences(line)) expect(wordCount(sentence)).toBeLessThanOrEqual(12)
    }
  })

  it('has one recorded line for every thing that the book can say', () => {
    expect(Object.keys(LINES.en)).toHaveLength(153)
    for (const key of Object.keys(LINES.en)) expect(key).toMatch(/^[a-z]+(-[a-z0-9]+)?$/)
    expect(text('en', 'hello-mars')).toBe('Mars! Mars is red because its dust is rusty, like an old nail.')
    expect(text('en', 'found-ceres', 'count-4')).toBe('You found the salt spots! A shiny star for Ceres. Four stickers! Your book is filling up.')
    // Every hint that place() can give has a line.
    for (const sticker of STICKERS) for (let path = 0; path <= 9; path++) {
      const book = arrive(emptyBook(), sticker.id).book, { result } = place(book, sticker.id, path)
      expect(LINES.en[`${result === 'anywhere' ? 'placed' : result}-${sticker.id}`]).toBeDefined()
    }
  })

  it('earns a sticker at the same distance as the flight panel says "near"', () => {
    expect(arrivalDistance(STICKERS.find(s => s.id === 'mercury')!)).toBe(85)
    expect(arrivalDistance(STICKERS.find(s => s.id === 'jupiter')!)).toBe(217.5)
    for (const sticker of STICKERS) expect(arrivalDistance(sticker)).toBeGreaterThanOrEqual(sticker.atmosphere)
  })

  it('gives one hello sticker per world, and a search sticker only in option B', () => {
    let book = emptyBook()
    const first = arrive(book, 'mars')
    expect(first.earned).toEqual([{ id: 'mars', kind: 'hello' }])
    book = first.book
    expect(arrive(book, 'mars').earned).toEqual([])
    // A search at a new world also counts as the arrival.
    const search = find(book, 'ceres', 'search')
    expect(search.earned).toEqual([{ id: 'ceres', kind: 'hello' }, { id: 'ceres', kind: 'search' }])
    expect(find(search.book, 'ceres', 'search').earned).toEqual([])
    expect(find(book, 'ceres', 'stamps').earned).toEqual([{ id: 'ceres', kind: 'hello' }])
    expect(progress('search', search.book)).toMatchObject({ earned: 3, total: 26 })
    expect(progress('stamps', search.book)).toMatchObject({ earned: 2, total: 13 })
  })

  it('gives a gentle hint for a wrong poster path, and never takes a sticker away', () => {
    const book = arrive(arrive(emptyBook(), 'mars').book, 'fairy').book
    expect(place(book, 'mars', 7)).toEqual({ book, result: 'closer' })
    expect(place(book, 'mars', 2)).toEqual({ book, result: 'further' })
    expect(place(book, 'saturn', 7).result).toBe('not-earned')
    const placed = place(book, 'mars', 4)
    expect(placed.result).toBe('placed')
    expect(placed.book.placed).toEqual(['mars'])
    expect(place(placed.book, 'fairy', 1).result).toBe('anywhere')
    expect(placementWords('mars', 'placed')).toBe('Yes! Mars is the fourth planet from the Sun.')
    expect(placementWords('jupiter', 'placed')).toContain('fifth planet')
    expect(placementWords('neptune', 'placed')).toContain('eighth planet')
    expect(placementWords('vesta', 'placed')).toContain('asteroid belt')
    // The Moon shares Earth's path. English says "the Sun" and "the Moon".
    const moon = place(arrive(emptyBook(), 'moon').book, 'moon', 3)
    expect(moon.result).toBe('placed')
    expect(placementWords('moon', 'placed')).toBe('Yes! The Moon goes around Earth. They go around the Sun together.')
    expect(placementWords('moon', 'not-earned')).toBe('Fly to the Moon to get this sticker.')
    expect(placementWords('moon', 'further')).toBe('The Moon lives further from the Sun. Try a bigger path.')
    expect(placementWords('sun', 'closer')).toBe('The Sun is in the middle. Tap the middle.')
    expect(text('en', 'waiting-sun')).toBe('The Sun is waiting. Fly there to get its sticker.')
  })

  it('completes option C only when every sticker is on the poster', () => {
    const all: Book = { arrived: STICKERS.map(s => s.id), found: [], placed: [] }
    expect(progress('stamps', all).complete).toBe(true)
    expect(progress('poster', all).complete).toBe(false)
    expect(progress('poster', { ...all, placed: all.arrived }).complete).toBe(true)
  })

  it('celebrates every fourth sticker', () => {
    expect(reachesMilestone(3, 4)).toBe(true)
    expect(reachesMilestone(4, 5)).toBe(false)
    expect(reachesMilestone(6, 8)).toBe(true)
  })

  it('suggests the nearest empty space, and Blossom Haven last', () => {
    expect(suggestNext(emptyBook(), 'earth')!.id).toBe('earth')
    const book = arrive(emptyBook(), 'earth').book
    expect(suggestNext(book, 'earth')!.id).toBe('moon')
    expect(suggestNext(arrive(book, 'moon').book, 'earth')!.id).toBe('venus')
    const almost: Book = { arrived: STICKERS.filter(s => s.id !== 'fairy' && s.id !== 'neptune').map(s => s.id), found: [], placed: [] }
    expect(suggestNext(almost, 'mercury')!.id).toBe('neptune')
    expect(suggestNext({ ...almost, arrived: [...almost.arrived, 'neptune'] })!.id).toBe('fairy')
    expect(suggestNext({ arrived: STICKERS.map(s => s.id), found: [], placed: [] })).toBeNull()
  })

  it('says every line in European Portuguese too, with the right contractions', () => {
    expect(Object.keys(LINES.pt)).toEqual(Object.keys(LINES.en))
    expect(text('pt', 'fly-sun')).toBe('Voa até ao Sol para ganhares este autocolante.')
    expect(text('pt', 'fly-earth')).toBe('Voa até à Terra para ganhares este autocolante.')
    expect(text('pt', 'fly-mars')).toBe('Voa até Marte para ganhares este autocolante.')
    expect(text('pt', 'already-earth')).toBe('Já tens o autocolante da Terra.')
    expect(text('pt', 'both-sun')).toBe('Já tens os dois autocolantes do Sol.')
    expect(text('pt', 'placed-neptune')).toBe('Boa! Neptuno é o oitavo planeta a contar do Sol.')
    expect(text('pt', 'fly-moon')).toBe('Voa até à Lua para ganhares este autocolante.')
    expect(text('pt', 'closer-sun')).toBe('O Sol fica no meio. Toca no meio.')
    expect(text('pt', 'waiting-fairy')).toBe('O Refúgio das Flores está à tua espera. Voa até lá para ganhares o autocolante.')
    // European, not Brazilian, spelling and words.
    const all = Object.values(LINES.pt).join(' ')
    for (const word of ['Vénus', 'Úrano', 'Neptuno', 'Dezasseis', 'autocolante']) expect(all).toContain(word)
    for (const word of ['Vênus', 'Netuno', 'Dezesseis', 'figurinha', 'você']) expect(all).not.toContain(word)
  })

  it('reads saved books safely', () => {
    expect(parseBook(null)).toEqual(emptyBook())
    expect(parseBook('text')).toEqual(emptyBook())
    expect(parseBook({ arrived: ['mars', 'mars', 'pluto', 4], found: ['mars', 'earth'], placed: ['earth'] }))
      .toEqual({ arrived: ['mars'], found: ['mars'], placed: [] })
  })

  it('reports a small cost per option', () => {
    expect(cost('stamps')).toMatchObject({ stickers: 13, spokenLines: 57, newChecks: 0, screens: 1 })
    expect(cost('search')).toMatchObject({ stickers: 26, spokenLines: 100, newChecks: 13, checks: { altitude: 0, place: 8, creature: 0, terrain: 1, through: 2, lap: 1, weather: 1 } })
    expect(cost('poster')).toMatchObject({ stickers: 13, spokenLines: 107, screens: 2 })
    for (const option of ['stamps', 'search', 'poster'] as const) expect(cost(option).savedBytes).toBeLessThan(600)
  })
})
