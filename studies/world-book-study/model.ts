/**
 * One book of worlds: merge Worlds and the sticker book, and open the solar system
 * as the fairy discovers it. Options and findings: docs/world-book-study.md.
 */
import { SPACE_SPEED } from '../../src/flight'
import { moonOffset, MOON } from '../../src/moon'
import { PROPORTIONS } from '../../src/proportions'
import { stickerById, STICKERS, suggestNext } from '../../src/stickers'
import type { StickerId } from '../../src/stickers'
import { HOME_START_POSITION, WORLD_DATA } from '../../src/worlds'

export type Option = 'today' | 'onebook' | 'fillin' | 'earn' | 'nextdoor'
export const BOOK_OPTIONS: readonly Option[] = ['today', 'onebook', 'fillin', 'earn', 'nextdoor']
export const OPTIONS: Record<Option, { letter: string; name: string; line: string }> = {
  today: { letter: '—', name: 'Today', line: 'Two dialogs: Worlds and My space stickers. All 13 worlds are open from the start.' },
  onebook: { letter: 'A', name: 'One book', line: 'One dialog: the map, then one card for each world. A card with its sticker looks like a sticker. All worlds stay open.' },
  fillin: { letter: 'B', name: 'The map fills in', line: 'A, plus mystery worlds. The map and the book show a grey "?" until the fairy arrives. The guide still flies to a mystery.' },
  earn: { letter: 'C', name: 'Earn the way', line: 'B, plus a lock. "Fly here" works only for a world with its sticker, and for Earth and Blossom Haven. The fairy finds each new world in free flight.' },
  nextdoor: { letter: 'D', name: 'Next door', line: 'B, plus a gentle lock. "Fly here" works for a world with its sticker, for Earth and Blossom Haven, and for one mystery: the next door of the book.' },
}

/** Earth is the start. Blossom Haven is the goal, and it wanders. The Sun is the centre of the map. */
export const KNOWN_AT_START: readonly StickerId[] = ['earth', 'fairy', 'sun']
/** Always open to "Fly here": the way home to Earth, and the flower guide to Blossom Haven. */
export const ALWAYS_OPEN: readonly StickerId[] = ['earth', 'fairy']

export type Place = { id: StickerId; name: string; radius: number; x: number; y: number; z: number }

// Positions at time 0, in game metres. Every world goes around the Sun in the same hour
// (src/orbits.ts), so the distances between them do not change. The Moon goes around Earth,
// and Blossom Haven moves after five minutes of flight with no guide.
const worldPlaces: Place[] = WORLD_DATA.map(([name, kind, radius, orbit, angle]) => ({
  id: kind as StickerId, name, radius: radius * PROPORTIONS.size,
  x: Math.cos(angle) * orbit * PROPORTIONS.spacing, y: 0, z: Math.sin(angle) * orbit * PROPORTIONS.spacing,
}))
const earthPlace = worldPlaces.find(place => place.id === 'earth')!
const moonAt = moonOffset(0)
export const PLACES: Record<StickerId, Place> = Object.fromEntries([
  ...worldPlaces,
  { id: 'moon', name: 'Moon', radius: MOON.radius, x: earthPlace.x + moonAt.x, y: moonAt.y, z: earthPlace.z + moonAt.z },
  { id: 'fairy', name: 'Blossom Haven', radius: 110 * PROPORTIONS.size, x: HOME_START_POSITION[0], y: HOME_START_POSITION[1], z: HOME_START_POSITION[2] },
  { id: 'sun', name: 'Sun', radius: 600 * PROPORTIONS.sun, x: 0, y: 0, z: 0 },
].map(place => [place.id, place])) as Record<StickerId, Place>

/** Surface to surface, in metres. */
export function gap(a: StickerId, b: StickerId) {
  const p = PLACES[a], q = PLACES[b]
  return Math.max(0, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) - p.radius - q.radius)
}
/** The angle of a world in the view from another world, in degrees. */
export function sizeInView(target: StickerId, from: StickerId) {
  const p = PLACES[target], q = PLACES[from]
  return 2 * Math.atan(p.radius / Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)) * 180 / Math.PI
}
/** Seconds at the full space speed of src/flight.ts, without the climb out of the air. */
export const spaceSeconds = (metres: number) => metres / SPACE_SPEED

/** The book order of the merged dialog: Blossom Haven first, then the Sun and the worlds outward. */
export const BOOK_ORDER: readonly StickerId[] = ['fairy', ...STICKERS.map(sticker => sticker.id).filter(id => id !== 'fairy')]

/**
 * The next empty space of the book, as the "Next" note of src/sticker-book.ts gives it.
 * The fairy starts on Earth, so Earth comes last. Blossom Haven is always open, so it is never the next door.
 */
export function nextDoor(earned: readonly StickerId[]): StickerId | null {
  const hasEarth = earned.includes('earth')
  const book = { arrived: [...earned, ...(hasEarth ? [] : ['earth' as const]), 'fairy' as const], found: [], placed: [] }
  return suggestNext(book, earned.at(-1) ?? 'earth')?.id ?? (hasEarth ? null : 'earth')
}

export const revealed = (option: Option, earned: readonly StickerId[], id: StickerId) =>
  option === 'today' || option === 'onebook' || KNOWN_AT_START.includes(id) || earned.includes(id)

export function canFly(option: Option, earned: readonly StickerId[], id: StickerId) {
  if (option === 'today' || option === 'onebook' || option === 'fillin') return true
  if (earned.includes(id) || ALWAYS_OPEN.includes(id)) return true
  return option === 'nextdoor' && nextDoor(earned) === id
}

export type CardState = 'sticker' | 'open' | 'closed' | 'mystery-open' | 'mystery-closed'
export function cardState(option: Option, earned: readonly StickerId[], id: StickerId): CardState {
  if (earned.includes(id)) return 'sticker'
  const fly = canFly(option, earned, id)
  if (revealed(option, earned, id)) return fly ? 'open' : 'closed'
  return fly ? 'mystery-open' : 'mystery-closed'
}

/** The Earth sticker needs a return from space (earnsSticker() in src/stickers.ts). */
export const canEarn = (earned: readonly StickerId[], id: StickerId) => id !== 'earth' || earned.some(other => other !== 'earth')

/** One flight: the gap, the time at space speed, and the size of the target in the view at the start. */
export type Leg = { from: StickerId; to: StickerId; metres: number; seconds: number; degrees: number }
const leg = (from: StickerId, to: StickerId): Leg => ({ from, to, metres: gap(from, to), seconds: spaceSeconds(gap(from, to)), degrees: sizeInView(to, from) })

/**
 * Option C: each world without a sticker needs a free flight. The shortest plan starts each
 * free flight at the nearest open world, because the guide flies there first. Blossom Haven
 * wanders, so no plan starts there.
 */
export function freeFlightPlan(): Leg[] {
  const open: StickerId[] = ['earth']
  const todo = STICKERS.map(sticker => sticker.id).filter(id => !ALWAYS_OPEN.includes(id))
  const legs: Leg[] = []
  while (todo.length) {
    let best: Leg | null = null
    for (const to of todo) for (const from of open) {
      if (!best || gap(from, to) < best.metres) best = leg(from, to)
    }
    legs.push(best!)
    open.push(best!.to)
    todo.splice(todo.indexOf(best!.to), 1)
  }
  return legs
}

/** Option D: the guided chain of next doors, from Earth, until only Earth is left. */
export function nextDoorChain(): Leg[] {
  const earned: StickerId[] = [], legs: Leg[] = []
  let at: StickerId = 'earth'
  for (let next = nextDoor(earned); next; next = nextDoor(earned)) {
    legs.push(leg(at, next))
    earned.push(next)
    at = next
  }
  return legs
}

export type Summary = {
  openAtStart: number
  mysteriesAtStart: number
  guidedFlights: number
  freeFlights: number
  longestFreeFlight: Leg | null
  dialogs: number
  computerToolbar: number
  phoneMenu: number
}

/** The numbers of the comparison table. Toolbar and Menu counts start from option C of docs/ui-simplify-study.md. */
export function summary(option: Option): Summary {
  const ids = STICKERS.map(sticker => sticker.id)
  const plan = option === 'earn' ? freeFlightPlan() : []
  const merged = option !== 'today'
  return {
    openAtStart: ids.filter(id => canFly(option, [], id)).length,
    mysteriesAtStart: ids.filter(id => !revealed(option, [], id)).length,
    guidedFlights: ids.length - plan.length,
    freeFlights: plan.length,
    longestFreeFlight: plan.toSorted((a, b) => b.metres - a.metres)[0] ?? null,
    dialogs: merged ? 1 : 2,
    computerToolbar: merged ? 3 : 4,
    phoneMenu: merged ? 2 : 3,
  }
}

export const nameOf = (id: StickerId) => (stickerById(id).the ? 'the ' : '') + stickerById(id).name
