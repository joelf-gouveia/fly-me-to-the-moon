import { DWARF_WORLDS } from './belt'
import { MOON } from './moon'
import type { PlanetKind } from './terrain'

// The sticker book: one sticker for each world, the first time the fairy arrives.
// Design and options: docs/sticker-book-study.md. The study adds search stars and a poster.
export type StickerId = PlanetKind | 'sun'
/** How the game can tell that a search task is done. */
export type SearchCheck = 'altitude' | 'place' | 'creature' | 'terrain'
export type Group = 'star' | 'rocky' | 'moon' | 'dwarf' | 'giant' | 'pretend'

export type Sticker = {
  id: StickerId
  name: string
  /** English says "the Sun" and "the Moon", but "Mars". */
  the?: boolean
  group: Group
  color: number
  /** Game atmosphere height from `data` in src/worlds.ts. */
  atmosphere: number
  /** 0 is the Sun, 1 to 9 are the poster paths out from it, null wanders. The Moon shares Earth's path. */
  path: number | null
  /** One spoken fact. Short, with no numbers. */
  fact: string
  search: { task: string; found: string; check: SearchCheck; rule: string }
}

// Colours and atmospheres are the game values from src/worlds.ts, src/belt.ts and src/moon.ts.
const dwarf = (id: 'ceres' | 'vesta') => DWARF_WORLDS.find(world => world.id === id)!.color

export const STICKERS: Sticker[] = [
  { id: 'sun', name: 'Sun', the: true, group: 'star', color: 0xffcf86, atmosphere: 0, path: 0,
    fact: 'The Sun is a star. It gives us light and keeps us warm.',
    search: { task: 'Fly close to feel the warm light.', found: 'You flew into the sunlight!', check: 'altitude', rule: 'Less than 40 m above the Sun' } },
  { id: 'mercury', name: 'Mercury', group: 'rocky', color: 0xb7a58d, atmosphere: 0, path: 1,
    fact: 'Mercury is the closest planet to the Sun. It has no air and lots of craters.',
    search: { task: 'Find a crater, a round dip in the ground.', found: 'You found a crater!', check: 'terrain', rule: 'Low over ground where the crater term of createTerrain() is deep' } },
  { id: 'venus', name: 'Venus', group: 'rocky', color: 0xd5a36d, atmosphere: 95, path: 2,
    fact: 'Venus is the hottest planet. Its thick clouds hold the heat in, like a blanket.',
    search: { task: 'Fly down under the golden clouds.', found: 'You flew under the golden clouds!', check: 'altitude', rule: 'Below cloudHeight (48 m)' } },
  { id: 'earth', name: 'Earth', group: 'rocky', color: 0x83c5e8, atmosphere: 78, path: 3,
    fact: 'Earth is our home. It is the only world we know with plants and animals.',
    search: { task: 'Find a duck on the water.', found: 'You found a duck!', check: 'creature', rule: 'Within 12 m of a duck in creatures.residents' } },
  // The Moon goes around Earth, so it comes after Earth, as in Worlds.
  { id: 'moon', name: 'Moon', the: true, group: 'moon', color: MOON.color, atmosphere: 0, path: 3,
    fact: 'The Moon goes around Earth. People have walked on it!',
    search: { task: 'Find the dark seas on the Moon.', found: 'You found the dark seas!', check: 'terrain', rule: 'Low over ground where TerrainSample.mare is above 0.5' } },
  { id: 'mars', name: 'Mars', group: 'rocky', color: 0xd7a087, atmosphere: 42, path: 4,
    fact: 'Mars is red because its dust is rusty, like an old nail.',
    search: { task: 'Fly low over the red dust.', found: 'You flew over the red dust!', check: 'altitude', rule: 'Less than 8 m above the ground' } },
  { id: 'vesta', name: 'Vesta', group: 'dwarf', color: dwarf('vesta'), atmosphere: 0, path: 5,
    fact: 'Vesta has a giant hole at the bottom. A big rock hit it long ago.',
    search: { task: 'Find the giant hole at the bottom.', found: 'You found the giant hole!', check: 'place', rule: 'Over the south pole (local y below -0.8)' } },
  { id: 'ceres', name: 'Ceres', group: 'dwarf', color: dwarf('ceres'), atmosphere: 0, path: 5,
    fact: 'Ceres is the biggest ball of rock in the asteroid belt. Its bright spots are salt.',
    search: { task: 'Find the bright white spots.', found: 'You found the salt spots!', check: 'place', rule: 'Within 0.12 rad of the Occator direction in buildGround()' } },
  { id: 'jupiter', name: 'Jupiter', group: 'giant', color: 0xd7bb9c, atmosphere: 145, path: 6,
    fact: 'Jupiter is the biggest planet. All the other planets could fit inside it.',
    search: { task: 'Dive into the stripy clouds.', found: 'You flew into the stripes!', check: 'altitude', rule: 'Below cloudHeight (38 m)' } },
  { id: 'saturn', name: 'Saturn', group: 'giant', color: 0xe1cb9e, atmosphere: 130, path: 7,
    fact: 'Saturn is very light for its size. It could float in a giant bath.',
    search: { task: 'Fly over the rings.', found: 'You flew over the rings!', check: 'place', rule: 'Near the ring plane, 1.3 to 2.02 radii from the centre' } },
  { id: 'uranus', name: 'Uranus', group: 'giant', color: 0x96d9df, atmosphere: 100, path: 8,
    fact: 'Uranus is the coldest planet of all, even colder than Neptune.',
    search: { task: 'Dive into the cold blue-green clouds.', found: 'You flew into the icy clouds!', check: 'altitude', rule: 'Below cloudHeight (28 m)' } },
  { id: 'neptune', name: 'Neptune', group: 'giant', color: 0x638ecb, atmosphere: 105, path: 9,
    fact: 'Neptune has the fastest winds of all the planets.',
    search: { task: 'Dive into the deep blue clouds.', found: 'You flew into the windy clouds!', check: 'altitude', rule: 'Below cloudHeight (32 m)' } },
  { id: 'fairy', name: 'Blossom Haven', group: 'pretend', color: 0xf3acd1, atmosphere: 52, path: null,
    fact: 'Blossom Haven is a pretend world. Unicorns live here, but only in stories.',
    search: { task: 'Say hello to a unicorn.', found: 'You found a unicorn!', check: 'creature', rule: 'Within 12 m of a unicorn in creatures.residents' } },
]

export const GROUP_NAMES: Record<Group, string> = { star: 'Star', rocky: 'Rocky planet', moon: 'Moon of Earth', dwarf: 'Dwarf planet', giant: 'Giant planet', pretend: 'Pretend world' }
export const stickerById = (id: StickerId) => STICKERS.find(sticker => sticker.id === id)!
const ids = new Set<string>(STICKERS.map(sticker => sticker.id))
export const isStickerId = (value: unknown): value is StickerId => typeof value === 'string' && ids.has(value)

/** Same test as the flight panel in updateNearestWorld() in src/main.ts: the world is "near". */
export const arrivalDistance = (sticker: Sticker) => Math.max(85, sticker.atmosphere * 1.5)

export type Book = { arrived: StickerId[]; found: StickerId[]; placed: StickerId[] }
export type Earned = { id: StickerId; kind: 'hello' | 'search' }
export const emptyBook = (): Book => ({ arrived: [], found: [], placed: [] })

/** The first arrival at a world earns its hello sticker. Later arrivals earn nothing. */
export function arrive(book: Book, id: StickerId): { book: Book; earned: Earned[] } {
  if (book.arrived.includes(id)) return { book, earned: [] }
  return { book: { ...book, arrived: [...book.arrived, id] }, earned: [{ id, kind: 'hello' }] }
}

/** A bigger celebration after every fourth sticker. */
export const MILESTONE = 4
export const reachesMilestone = (before: number, after: number) => Math.floor(after / MILESTONE) > Math.floor(before / MILESTONE)

/**
 * The empty space to suggest next: the nearest world on the poster that has no
 * hello sticker. Blossom Haven comes last, because it wanders.
 */
export function suggestNext(book: Book, from: StickerId = 'earth'): Sticker | null {
  const start = stickerById(from).path ?? 3
  const open = STICKERS.filter(sticker => !book.arrived.includes(sticker.id))
  if (!open.length) return null
  return open.toSorted((a, b) => (a.path === null ? 99 : Math.abs(a.path - start) * 2 + (a.path > start ? 1 : 0)) - (b.path === null ? 99 : Math.abs(b.path - start) * 2 + (b.path > start ? 1 : 0)))[0]!
}

/** Reads a saved book. Unknown or repeated ids are dropped; placed and found need an arrival. */
export function parseBook(value: unknown): Book {
  const book = emptyBook()
  if (!value || typeof value !== 'object') return book
  const list = (key: keyof Book) => {
    const raw = (value as Record<string, unknown>)[key]
    return Array.isArray(raw) ? [...new Set(raw.filter(isStickerId))] : []
  }
  book.arrived = list('arrived')
  book.found = list('found').filter(id => book.arrived.includes(id))
  book.placed = list('placed').filter(id => book.arrived.includes(id))
  return book
}

/**
 * The fairy starts on Earth, so the Earth sticker comes when she leaves for space
 * and comes back: a new visit, as for a new landscape (World.visit 2 or more).
 */
export const earnsSticker = (id: StickerId, visit: number) => id !== 'earth' || visit > 1

// The book of worlds (option D of docs/world-book-study.md): Worlds and the stickers in one
// dialog. The solar system opens as the fairy visits it, one "next door" at a time.

/** The order of the cards: Blossom Haven first, then the Sun and the worlds outward. */
export const BOOK_ORDER: readonly StickerId[] = ['fairy', ...STICKERS.map(sticker => sticker.id).filter(id => id !== 'fairy')]
/** Earth is the start, Blossom Haven the goal of the flower guide, and the Sun the centre of the map. */
export const KNOWN_AT_START: readonly StickerId[] = ['earth', 'fairy', 'sun']
/** Always open to "Fly there": the way home to Earth, and the flower guide to Blossom Haven, which wanders. */
export const ALWAYS_OPEN: readonly StickerId[] = ['earth', 'fairy']

/**
 * The empty space that the book opens next: the nearest world on the poster that has no
 * sticker. The fairy starts on Earth, so Earth comes last. Blossom Haven is always open,
 * so it is never the next door.
 */
export function nextDoor(book: Book): StickerId | null {
  const hasEarth = book.arrived.includes('earth')
  const assumed = [...book.arrived, ...(hasEarth ? [] : ['earth' as const]), ...(book.arrived.includes('fairy') ? [] : ['fairy' as const])]
  return suggestNext({ ...book, arrived: assumed }, book.arrived.at(-1) ?? 'earth')?.id ?? (hasEarth ? null : 'earth')
}

/** The map and the book show the name and the picture of a known world. The others are a grey "?". */
export const isKnown = (book: Book, id: StickerId) => KNOWN_AT_START.includes(id) || book.arrived.includes(id)

/** A guided flight goes to a world with its sticker, to Earth, to Blossom Haven, or to the next door. */
export const canFly = (book: Book, id: StickerId) => book.arrived.includes(id) || ALWAYS_OPEN.includes(id) || nextDoor(book) === id
