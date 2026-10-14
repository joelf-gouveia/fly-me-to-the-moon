import { describe, expect, it } from 'vitest'
import { ANIMAL_CARDS, BOOK_PAGES, BOOK_PLACES, bookCount, bookNote, cardLook, factIcon, heartsHtml } from '../src/animal-book'
import { BOOK_KINDS, parseFriend } from '../src/friend'
import { speciesById } from '../src/creatures/catalog'
import type { FriendState } from '../src/friend'

const before: FriendState = { hellos: 3, met: ['sheep', 'duck'], friend: null }
const after: FriendState = { hellos: 5, met: ['cow', 'sheep', 'pegasus', 'duck'], friend: 'pegasus' }

describe('animal book: the cards', () => {
  it('has a card for each of the 48 kinds, on one page for each world, with each kind in one row of its place', () => {
    expect(Object.keys(ANIMAL_CARDS).sort()).toEqual([...BOOK_KINDS].sort())
    expect(BOOK_PAGES.map(page => page.world)).toEqual(['earth', 'fairy'])
    for (const page of BOOK_PAGES) {
      const kinds = page.rows.flatMap(row => row.kinds)
      expect(kinds.sort()).toEqual(BOOK_KINDS.filter(kind => speciesById(kind).world === page.world).sort())
      for (const row of page.rows) for (const kind of row.kinds) {
        expect(ANIMAL_CARDS[kind].world, kind).toBe(page.world)
        expect(ANIMAL_CARDS[kind].place, kind).toEqual([row.icon, row.name])
      }
    }
    expect(BOOK_PAGES[0].rows.map(row => row.name)).toEqual(['Palm beach', 'Jungle', 'Savanna', 'Desert', 'Leaf forest', 'Pine forest', 'Snow line', 'The sea', 'The sky'])
    expect(BOOK_PAGES[1].rows.map(row => row.name)).toEqual(['Lollipop grove', 'Cotton candy orchard', 'Mushroom glade', 'Crystal peaks', 'Soda water', 'The sky'])
    for (const place of BOOK_PLACES) expect(factIcon(place.icon), place.id).toMatch(/^<svg/)
  })

  it('gives each card three picture facts with short words, and a place', () => {
    for (const kind of BOOK_KINDS) {
      const card = ANIMAL_CARDS[kind]
      expect(card.facts, kind).toHaveLength(3)
      for (const [icon, word] of [...card.facts, card.place]) {
        // A child of 5 reads little: one to four short words.
        expect(word.split(' ').length, `${kind}: ${word}`).toBeLessThanOrEqual(4)
        expect(factIcon(icon), `${kind}: ${icon}`).toMatch(/^<svg class="fact-icon" viewBox="0 0 24 24" aria-hidden="true"><(path|g|ellipse|circle|rect)/)
      }
      // The pictures are drawings: no emoji, which look different on each device.
      expect(JSON.stringify(card), kind).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('shows a met kind in colour, the friend with its ring, and the other kinds as shadows', () => {
    expect(cardLook(after, 'pegasus')).toBe('friend')
    expect(cardLook(after, 'cow')).toBe('met')
    expect(cardLook(after, 'unicorn')).toBe('unmet')
    expect(cardLook(before, 'sheep')).toBe('met')
    expect(BOOK_KINDS.map(kind => cardLook(parseFriend(null), kind)).every(look => look === 'unmet')).toBe(true)
    expect(bookCount(after)).toBe('4/48')
  })
})

describe('animal book: the note of the Animals page', () => {
  it('shows the five hearts and the empty bubble before the gift', () => {
    const note = bookNote(before, null)
    expect(note).toMatchObject({ kind: null, hearts: 3, fly: false, none: false, facts: [] })
    expect(bookNote(parseFriend(null), null).hearts).toBe(0)
    // A card that she tapped keeps the hearts, and has no "Fly with me" before the gift.
    expect(bookNote(before, 'sheep')).toMatchObject({ kind: 'sheep', hearts: 3, fly: false, none: false, name: 'Sheep' })
    expect(bookNote(before, 'sheep').facts).toHaveLength(3)
  })

  it('shows no hearts after the gift, and never a number', () => {
    for (const state of [after, { ...after, friend: null }]) for (const selected of [null, ...BOOK_KINDS]) {
      const note = bookNote(state, selected)
      expect(note.hearts).toBeNull()
      expect(`${note.label} ${note.name} ${note.facts.map(fact => fact[1]).join(' ')}`).not.toMatch(/\d/)
    }
    for (const selected of [null, ...BOOK_KINDS]) expect(bookNote(before, selected).label + bookNote(before, selected).name).not.toMatch(/\d/)
  })

  it('has "Fly with me" on a met card after the gift, and "No friend" on the card of the friend', () => {
    expect(bookNote(after, 'cow')).toMatchObject({ kind: 'cow', label: 'Real animal', fly: true, none: false })
    expect(bookNote(after, 'pegasus')).toMatchObject({ kind: 'pegasus', label: '✦ Flies with you', fly: false, none: true })
    expect(bookNote(after, null)).toMatchObject({ kind: 'pegasus', label: '✦ Flies with you', name: 'Pegasus foal', fly: false, none: false })
    // After "No friend" the note has the empty bubble; a met card brings a friend back.
    const none = { ...after, friend: null }
    expect(bookNote(none, null)).toMatchObject({ kind: null, label: 'No friend' })
    expect(bookNote(none, 'pegasus')).toMatchObject({ label: 'Story creature', fly: true, none: false })
  })

  it('shows a kind that she did not meet as a shadow with its world and its place', () => {
    expect(bookNote(after, 'frogPrince')).toMatchObject({ kind: 'frogPrince', shadow: true, world: 'fairy', facts: [['bubbles', 'Soda water']], fly: false, none: false })
    expect(bookNote(before, 'cow')).toMatchObject({ shadow: true, world: 'earth', facts: [['tree', 'Leaf forest']], hearts: 3 })
    // A kind of the far side of Earth: the row of its place.
    expect(bookNote(before, 'penguin')).toMatchObject({ shadow: true, world: 'earth', facts: [['snow', 'Snow line']] })
  })

  it('has no "Fly with me" for a school or a swarm: it is in the book, but it is no friend', () => {
    const swarm: FriendState = { ...after, met: [...after.met, 'butterfly'] }
    expect(bookNote(swarm, 'butterfly')).toMatchObject({ kind: 'butterfly', fly: false, none: false, label: 'Many little friends' })
    expect(bookNote(swarm, 'cow')).toMatchObject({ fly: true })
  })
})

describe('animal book: the hearts', () => {
  it('has five hearts, with the full ones pink and the heart of this hello that swells', () => {
    const html = heartsHtml(3, true)
    expect(html.match(/<i /g)).toHaveLength(5)
    expect(html.match(/is-full/g)).toHaveLength(3)
    expect(html.match(/is-new/g)).toHaveLength(1)
    expect(heartsHtml(0).match(/is-full|is-new/g)).toBeNull()
    expect(heartsHtml(9).match(/is-full/g)).toHaveLength(5)
  })
})
