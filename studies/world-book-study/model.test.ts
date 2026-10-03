import { describe, expect, it } from 'vitest'
import adventureSource from '../../src/adventure.ts?raw'
import orbitsSource from '../../src/orbits.ts?raw'
import mainSource from '../../src/main.ts?raw'
import stickerBookSource from '../../src/sticker-book.ts?raw'
import { BOOK_ORDER as GAME_BOOK_ORDER, canFly as gameCanFly, emptyBook, nextDoor as gameNextDoor, STICKERS } from '../../src/stickers'
import type { StickerId } from '../../src/stickers'
import { BOOK_OPTIONS, BOOK_ORDER, canEarn, canFly, cardState, freeFlightPlan, gap, nextDoor, nextDoorChain, sizeInView, summary } from './model'

const ids = STICKERS.map(sticker => sticker.id)
const open = (option: Parameters<typeof canFly>[0], earned: StickerId[] = []) => ids.filter(id => canFly(option, earned, id))

describe('the world book study', () => {
  it('matches the game, which now follows option D', () => {
    // One dialog: Worlds draws the cards of the book, and the sticker book has no dialog of its own.
    expect(adventureSource).toContain('class="book-cards"')
    expect(stickerBookSource).not.toContain('<dialog')
    expect(stickerBookSource).not.toContain('stickers-toggle')
    expect(mainSource).toContain('if (!stickerBook.canFly(world.kind)) return')
    // All worlds share one orbit period, so the gaps between them stay the same.
    expect(orbitsSource).toContain('const angle = orbit.phase + time / SOLAR_ORBIT_SECONDS * TAU')
    expect(BOOK_ORDER).toEqual(GAME_BOOK_ORDER)
    // The study and the game open the same next doors.
    const earned: StickerId[] = []
    for (let next = nextDoor(earned); next; next = nextDoor(earned)) {
      expect(gameNextDoor({ ...emptyBook(), arrived: [...earned] })).toBe(next)
      for (const id of ids) expect(gameCanFly({ ...emptyBook(), arrived: [...earned] }, id)).toBe(canFly('nextdoor', earned, id))
      earned.push(next)
    }
  })

  it('keeps every world open in Today, A and B', () => {
    for (const option of ['today', 'onebook', 'fillin'] as const) expect(open(option)).toHaveLength(13)
    expect(summary('onebook').mysteriesAtStart).toBe(0)
    expect(summary('fillin').mysteriesAtStart).toBe(10)
    expect(cardState('fillin', [], 'mars')).toBe('mystery-open')
  })

  it('opens only Earth and Blossom Haven at the start of C, then each world with its sticker', () => {
    expect(open('earn')).toEqual(['earth', 'fairy'])
    expect(cardState('earn', [], 'mars')).toBe('mystery-closed')
    expect(cardState('earn', [], 'sun')).toBe('closed')
    expect(open('earn', ['mars'])).toEqual(['earth', 'mars', 'fairy'])
    const plan = freeFlightPlan()
    expect(plan.map(leg => leg.to).toSorted()).toEqual(ids.filter(id => id !== 'earth' && id !== 'fairy').toSorted())
    // The dwarf worlds are the hardest to see: under 0.2° from Earth.
    expect(sizeInView('vesta', 'earth')).toBeLessThan(0.2)
    expect(sizeInView('ceres', 'earth')).toBeLessThan(0.2)
  })

  it('opens one mystery at a time in D, and reaches every world', () => {
    expect(open('nextdoor')).toEqual(['earth', 'moon', 'fairy'])
    expect(nextDoor(['moon'])).toBe('venus')
    const chain = nextDoorChain()
    expect(chain.map(leg => leg.to).toSorted()).toEqual(ids.filter(id => id !== 'fairy').toSorted())
    expect(chain.at(-1)!.to).toBe('earth')
    const earned: StickerId[] = []
    for (const leg of chain) {
      const mysteries = ids.filter(id => cardState('nextdoor', earned, id) === 'mystery-open')
      expect(mysteries.length).toBeLessThanOrEqual(1)
      expect(canFly('nextdoor', earned, leg.to)).toBe(true)
      earned.push(leg.to)
    }
  })

  it('needs a trip away before the Earth sticker', () => {
    expect(canEarn([], 'earth')).toBe(false)
    expect(canEarn(['moon'], 'earth')).toBe(true)
  })

  it('merges two dialogs and one toolbar button in every new option', () => {
    for (const option of BOOK_OPTIONS.slice(1)) expect(summary(option)).toMatchObject({ dialogs: 1, computerToolbar: 3, phoneMenu: 2 })
    expect(summary('earn')).toMatchObject({ freeFlights: 11, guidedFlights: 2 })
    expect(summary('earn').longestFreeFlight!.seconds).toBeLessThan(30)
    expect(gap('earth', 'moon')).toBeLessThan(1000)
  })
})
