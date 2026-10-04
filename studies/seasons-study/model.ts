/**
 * The seasons of the study: the Sun through the year, the look of each latitude of Earth, the
 * magic seasons of Blossom Haven, the clips, the findings and the decisions. It has no 3D code:
 * the prototypes (seasons.ts, magic.ts) and the page (main.ts) read it.
 *
 * `year` is the part of one orbit, from 0 to 1. Year 0 is the March equinox, 0.25 is the June
 * solstice (summer in the north), 0.5 is the September equinox and 0.75 is the December solstice.
 * Latitudes and angles are in degrees. North is positive.
 */
const RAD = Math.PI / 180
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const smooth = (value: number, low: number, high: number) => { const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t) }
const frac = (value: number) => value - Math.floor(value)

/** The real tilt of Earth's axis. */
export const EARTH_TILT = 23.4
/** One orbit in the game at 1×: SOLAR_ORBIT_SECONDS of src/orbits.ts. */
export const YEAR_SECONDS = 3600
/** The land and the sea warm up slowly, so the look of a season comes after the Sun: one eighth of a year. */
export const LOOK_LAG = 0.125
/**
 * No season below 10°. The full season from 24°. Between them the season grows. The climate belts
 * of the game (src/foliage/zones.ts) are nearer the equator than on the real Earth: the leaf forest
 * is from 17° to 34°. So the bands and the snow line of the study are nearer the equator too.
 */
export const SEASON_BAND = { none: 10, full: 24 } as const
/** Each metre of height is this much colder, so mountains get snow first. */
export const SNOW_LAPSE = 0.012

export type WorldId = 'earth' | 'fairy'
export const WORLD_NAMES: Record<WorldId, string> = { earth: 'Earth', fairy: 'Blossom Haven' }
export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter'
export const SEASON_NAMES: SeasonName[] = ['spring', 'summer', 'autumn', 'winter']

// ---- The seasons of Earth -----------------------------------------------------------------------

/** The latitude of the place where the Sun is overhead at noon. */
export function declination(year: number, tilt = EARTH_TILT) {
  return Math.asin(Math.sin(tilt * RAD) * Math.sin(2 * Math.PI * year)) / RAD
}
/** The height of the Sun at noon. A negative value: the Sun does not rise that day. */
export function noonElevation(latitude: number, sun: number) { return 90 - Math.abs(latitude - sun) }
/** The sine of the noon height of the Sun: 1 with the Sun overhead, 0 with the Sun on the horizon. */
export function warmth(latitude: number, sun: number) { return Math.cos((latitude - sun) * RAD) }
/** The hours of daylight in a day of 24 hours. */
export function dayHours(latitude: number, sun: number) {
  const x = -Math.tan(clamp(latitude, -89.99, 89.99) * RAD) * Math.tan(sun * RAD)
  return x >= 1 ? 0 : x <= -1 ? 24 : 24 * Math.acos(x) / Math.PI
}
/** How much of the season shows at a latitude: 0 near the equator, 1 from 40°. */
export function seasonStrength(latitude: number) {
  return smooth(Math.abs(Math.sin(latitude * RAD)), Math.sin(SEASON_BAND.none * RAD), Math.sin(SEASON_BAND.full * RAD))
}
/** The year of a hemisphere: the south is half a year after the north. 0 is the start of spring. */
export function localYear(latitude: number, year: number) { return frac(year + (latitude < 0 ? 0.5 : 0)) }
/** The place in the colour ramp: 0 is the middle of spring, 0.25 the middle of summer. */
export function lookPhase(latitude: number, year: number) { return frac(localYear(latitude, year) - LOOK_LAG) }

/** The colours and the limits of the seasons of Earth. */
export const PALETTE = {
  /** The grass colour of the game today: `grass` in buildGround() of src/worlds.ts. */
  base: 0x679a43,
  /** The ground in the middle of spring, summer, autumn and winter. */
  ground: [0x86b84a, 0x5f9440, 0xb89a45, 0x8f8a62],
  snow: 0xe9eef0, ice: 0xdbe9ef,
  /** Snow starts below `low` warmth and is full below `high`. Sea ice the same. */
  snowLine: { low: 0.58, high: 0.66 }, iceLine: { low: 0.3, high: 0.36 },
  words: { spring: 'Fresh green and blossom', summer: 'Deep green', autumn: 'Gold and red leaves', winter: 'Bare trees and snow' } as Record<SeasonName, string>,
} as const

/** Snow on the ground of Earth, from 0 to 1. `height` is metres above the sea. */
export function snowCover(latitude: number, year: number, tilt = EARTH_TILT, height = 0) {
  const { low, high } = PALETTE.snowLine
  return 1 - smooth(warmth(latitude, declination(year - LOOK_LAG, tilt)) - Math.max(0, height) * SNOW_LAPSE, low, high)
}
/** Ice on the sea of Earth, from 0 to 1. */
export function seaIce(latitude: number, year: number, tilt = EARTH_TILT) {
  const { low, high } = PALETTE.iceLine
  return 1 - smooth(warmth(latitude, declination(year - LOOK_LAG, tilt)), low, high)
}

export type SeasonAt = {
  /** `null` near the equator: the look is the same all year. */
  name: SeasonName | null
  strength: number
  sun: number
  noon: number
  hours: number
  snow: number
}
/** The season of a place of Earth on a day. The name follows the Sun: spring starts at the equinox. */
export function seasonAt(latitude: number, year: number, tilt = EARTH_TILT): SeasonAt {
  const sun = declination(year, tilt), strength = seasonStrength(latitude)
  return {
    name: strength < 0.08 ? null : SEASON_NAMES[Math.floor(localYear(latitude, year) * 4) % 4],
    strength, sun, noon: noonElevation(latitude, sun), hours: dayHours(latitude, sun),
    snow: snowCover(latitude, year, tilt),
  }
}

const hexToRgb = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
/** The ground colour of a place of Earth on a day, as the prototype paints it. For the season map of the page. */
export function groundColour(latitude: number, year: number, tilt = EARTH_TILT) {
  const x = lookPhase(latitude, year) * 4, index = Math.floor(x) % 4
  const from = hexToRgb(PALETTE.ground[index]), to = hexToRgb(PALETTE.ground[(index + 1) % 4]), blend = smooth(x - Math.floor(x), 0, 1)
  const base = hexToRgb(PALETTE.base), white = hexToRgb(PALETTE.snow)
  const strength = seasonStrength(latitude), snow = snowCover(latitude, year, tilt)
  const rgb = base.map((channel, i) => {
    const season = from[i] + (to[i] - from[i]) * blend
    const ground = channel + (season - channel) * strength
    return Math.round(ground + (white[i] - ground) * snow)
  })
  return `rgb(${rgb.join(',')})`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** The month of a year value. Year 0 is 20 March. */
export function monthAt(year: number) {
  return MONTHS[new Date(Date.UTC(2026, 2, 20) + frac(year) * 365.25 * 86400000).getUTCMonth()]
}
/** The year value of a real date: the season of the real world on that day. */
export function yearOfDate(date: Date) {
  const equinox = Date.UTC(date.getUTCFullYear(), 2, 20)
  return frac((date.getTime() - equinox) / (365.25 * 86400000))
}
export const latitudeLabel = (latitude: number) => latitude === 0 ? 'Equator' : `${Math.abs(latitude)}° ${latitude > 0 ? 'N' : 'S'}`

// ---- The magic seasons of Blossom Haven ---------------------------------------------------------
// They are not the seasons of Earth. The Sun does not make them, and the planet has no tilt.
// The magic year goes from 0 to 1: 0 is the middle of the first season, 0.25 of the second.

export type MagicId = 'blossom' | 'bubble' | 'lantern' | 'crystal'
export type MagicSeason = {
  id: MagicId; name: string
  /** One line for a child. */
  line: string
  /** The plants that come up in this season. */
  plants: string
  /** What is in the air. */
  air: string
  ground: number
}
/** The grass colour of Blossom Haven today: `grass` in buildGround() of src/worlds.ts. */
export const MAGIC_BASE = 0xe7a0ba
export const MAGIC: MagicSeason[] = [
  { id: 'blossom', name: 'Blossom time', line: 'The planet is pink, as it is today.', plants: 'Blossom trees and giant flowers', air: 'Petals fall', ground: 0xf0a3c4 },
  { id: 'bubble', name: 'Bubble time', line: 'The ground goes mint green, and bubbles go up.', plants: 'Bubble blooms: clear bubbles on thin stems', air: 'Bubbles rise', ground: 0x9fe3cf },
  { id: 'lantern', name: 'Lantern time', line: 'The ground goes violet, and the plants glow.', plants: 'Giant toadstools that glow', air: 'Fireflies drift', ground: 0x9577d6 },
  { id: 'crystal', name: 'Crystal time', line: 'The ground goes frost white, and sugar crystals grow.', plants: 'Sugar crystals: spires of rock candy', air: 'Glitter falls', ground: 0xe9e6fb },
]
/** With rings and patches, the last place gets a season this part of a year after the first place. */
export const MAGIC_SPREAD = 0.75
export type Pattern = 'halves' | 'rings' | 'patches' | 'whole'
/** How a season goes over the planet. The order is the value of the `seasonPattern` uniform. */
export const PATTERNS: { id: Pattern; name: string; line: string }[] = [
  { id: 'halves', name: 'Two halves', line: 'The half of the cottage gets each season first. The other half gets it two seasons later.' },
  { id: 'rings', name: 'Rings from the cottage', line: 'A new season starts at the cottage and goes out in a ring to the far side of the planet.' },
  { id: 'patches', name: 'Patches', line: 'Each region has its own time, so a short flight goes from one season to the next.' },
  { id: 'whole', name: 'The whole planet', line: 'Each place has the same season.' },
]
export type Direction = { x: number; y: number; z: number }
/** How much later a place gets a season, in parts of a magic year. The cottage is at y = -1. */
export function magicOffset(pattern: Pattern, d: Direction) {
  if (pattern === 'halves') return 0.5 * smooth(d.y, -0.12, 0.12)
  if (pattern === 'rings') return Math.acos(clamp(-d.y, -1, 1)) / Math.PI * MAGIC_SPREAD
  if (pattern === 'patches') return (0.5 + 0.5 * Math.sin(d.x * 3.1 + Math.sin(d.z * 2.3) * 1.7) * Math.sin(d.y * 2.7 + d.x * 1.3)) * MAGIC_SPREAD
  return 0
}
/** The magic season of a place: the season, and how full it is (1 in its middle, 0 at a change). */
export function magicAt(pattern: Pattern, d: Direction, year: number) {
  const x = frac(year - magicOffset(pattern, d)) * 4, index = Math.round(x) % 4
  return { season: MAGIC[index], index, full: 1 - Math.abs(x - Math.round(x)) * 2 }
}
/** The ground colour of a place of Blossom Haven, as the prototype paints it. */
export function magicColour(pattern: Pattern, d: Direction, year: number) {
  const x = frac(year - magicOffset(pattern, d)) * 4, index = Math.floor(x) % 4
  const from = hexToRgb(MAGIC[index].ground), to = hexToRgb(MAGIC[(index + 1) % 4].ground), blend = smooth(x - Math.floor(x), 0.3, 0.7)
  return `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * blend)).join(',')})`
}
export const directionOf = (latitude: number, longitude = 0): Direction => ({
  x: Math.cos(latitude * RAD) * Math.cos(longitude * RAD), y: Math.sin(latitude * RAD), z: Math.cos(latitude * RAD) * Math.sin(longitude * RAD),
})

// ---- The page -----------------------------------------------------------------------------------

export type ClipId = 'E1' | 'E2' | 'E3' | 'E4' | 'B1' | 'B2' | 'B3' | 'B4'
export type Clip = { id: ClipId; world: WorldId; name: string; line: string; look: string; honest: string }
export const CLIPS: Clip[] = [
  { id: 'E1', world: 'earth', name: 'Earth, one year', line: 'One year from space, in 12 seconds.',
    look: 'The snow comes down from one pole while it goes back at the other pole. The green belt at the equator does not change. The line between day and night leans one way, then the other.',
    honest: 'The camera stays between the Sun and Earth, so the axis seems to nod. Earth turns once in the clip. In the game it turns 16 times in a year.' },
  { id: 'E2', world: 'earth', name: 'One leaf forest, one year', line: 'A leaf forest at 32° N, each day at noon.',
    look: 'Spring blossom, deep summer green, gold and red leaves, then bare trees and snow. The pines stay green. The flowers are out in spring and summer only. Petals, leaves and snow fall in their season.',
    honest: 'Each frame is noon, so the day and the night do not flash. The plants are the plants of the foliage study: the broadleaf trees, the birches and the bushes change; the pines do not.' },
  { id: 'E3', world: 'earth', name: 'One day, four places', line: 'The same noon in August at 35° N, the equator, 35° S and 75° S.',
    look: 'Summer in the north, no season at the equator, snow in the south, and a noon with no Sun near the south pole. This is the main rule of Earth: the place changes the season.',
    honest: 'The study looks for a dry, flat place at each latitude. The game makes a new Earth at each visit, so the places differ.' },
  { id: 'E4', world: 'earth', name: 'Real tilt or painted', line: 'The Sun at noon through one year: option A, then option B.',
    look: 'With the real tilt the noon Sun climbs to 81° in June and drops to 35° in December at 32° N. With the painted year the land changes but the Sun stays at 58°.',
    honest: 'The view is 80° wide here, to keep the high Sun in the picture. The game view is 58°.' },
  { id: 'B1', world: 'fairy', name: 'Blossom Haven, one magic year', line: 'Four magic seasons from space.',
    look: 'Each season starts at the cottage, at the bottom of the planet, and goes out in a ring. The planet shows two or three seasons at one time: pink, mint, violet and frost white.',
    honest: 'The cotton candy clouds hide part of the ground. The clip uses the pattern "Rings from the cottage".' },
  { id: 'B2', world: 'fairy', name: 'One grove, four seasons', line: 'The plants of each season come up, then go back.',
    look: 'Blossom trees, giant flowers and petals. Then bubble blooms and bubbles. Then giant toadstools that glow, with fireflies. Then sugar crystals and glitter. The candy of the four gardens stays all year.',
    honest: 'Each season is 3 s in the clip. In the game a change can take 20 s. The creatures, the stones and the water do not change in the study.' },
  { id: 'B3', world: 'fairy', name: 'Three ways to spread', line: 'Two halves, rings from the cottage, and patches.',
    look: 'The same magic year with three patterns. The pattern sets which areas have which season. Decision 5 asks for one of them.',
    honest: 'This clip is a record of the second round of the study. The game has the rings from the cottage, so the live view has the rings only.' },
  { id: 'B4', world: 'fairy', name: 'A new season at the cottage', line: 'Blossom time ends, and Bubble time starts at the door.',
    look: 'The cottage is the first place of each season. The blossom trees and the giant flowers go into the ground, the ground goes mint green, and the bubble blooms come up.',
    honest: 'The planet has no tilt, so the cottage has the day and the night of today. The clip uses the pattern "Rings from the cottage".' },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

/** A finding in the game of today, with its evidence in the code. */
export const FINDINGS: [string, string][] = [
  ['Earth has no tilt', 'Only the seven painted planets get <code>group.rotation.x</code> in <code>createWorlds()</code> (<code>src/worlds.ts:501</code>). Earth and Blossom Haven turn about the straight Y axis, and each orbit is flat. The Sun is over the equator all year: 12 hours of day at each place, and no season.'],
  ['The snow is painted once', '<code>buildGround()</code> paints snow where <code>|y| &gt; 0.9</code> (above 64°) or the height is more than 12 m (<code>src/worlds.ts:296</code>). The colours are in the vertices, so a change of season needs a shader, not a new mesh.'],
  ['A year is 60 minutes', 'Each world makes one orbit in <code>SOLAR_ORBIT_SECONDS = 3600</code> (<code>src/orbits.ts:5</code>). Earth turns in 240 s, so a year has 16 days and a season has 4 days. World speed in Settings makes the year 7.5 minutes at 8× and 56 seconds at 64×.'],
  ['Each visit starts on the same day', 'The orbit clock starts at 0 at each load (<code>src/orbits.ts:18</code>). With a real tilt, each visit starts in the same season unless the game sets the start.'],
  ['The belts of the game are near the equator', 'The foliage study gave Earth climate belts (<code>src/foliage/zones.ts</code>): the leaf forest is from 17° to 34°, the pine forest to 48°, the snow line to 59°. So the season of the study is full from 24°, and the winter snow comes down to 28°. <code>meadowNormal()</code> picks the start between 27° S and 27° N: a part of these starts has a weak season.'],
  ['Blossom Haven jumps', 'The planet moves to a new place each 5 minutes (<code>HOME_MOVE_SECONDS</code>, <code>src/relocation.ts:7</code>). A season of Earth needs a steady orbit, so it does not fit this planet. A hop is a good clock for a magic season: four hops make a year of 20 minutes.'],
  ['The plants are built once', '<code>buildFoliage()</code> puts each plant on the planet as an instance (<code>src/foliage/build.ts</code>), and Blossom Haven keeps one landscape. So the plants of each season can be on the planet all the time, and a shader gives each one its size. The foliage study has the species for it: the blossom tree, the giant flower, the toadstool and the sugar crystal.'],
  ['The cottage is the heart of the planet', '<code>homeCottageNormal()</code> is <code>(0, -1, 0)</code> (<code>src/worlds.ts:112</code>), and the flower guide brings the fairy there. A season that starts at the cottage shows the child each change first.'],
]

export type Option = { id: 'A' | 'B'; name: string; line: string; good: string[]; bad: string[] }
export const OPTIONS: Option[] = [
  { id: 'A', name: 'Real tilt', line: 'The axis of Earth leans 23.4°. The orbit makes the year.',
    good: ['The cause is the real one. The Sun is high in summer and low in winter.', 'The days are long in summer and short in winter. The poles get a long day and a long night.', 'The day and night code needs no change: it reads the Sun from the geometry.'],
    bad: ['A year is one orbit: 60 minutes at 1×.', '<code>morningSpin()</code> and the start meadow need a change.'] },
  { id: 'B', name: 'Painted year', line: 'No tilt. A season clock paints each latitude.',
    good: ['The clock is free: a year can be 20 minutes.', 'The light of the game does not change.', 'It is the smaller change.'],
    bad: ['The Sun does not agree with the land: a winter noon has a summer Sun.', 'The days have the same length all year. No long day and no long night at a pole.'] },
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  { id: 'earth', title: '1 · What makes the seasons on Earth?',
    why: 'Clip E4 shows the two options at the same meadow.',
    options: ['A — Real tilt of 23.4° (recommended)', 'B — Painted year, no tilt'] },
  { id: 'year', title: '2 · When does the Earth year start, and how fast does it go?',
    why: 'A year is 60 minutes at 1×, and each visit starts on the same day today.',
    options: ['Start at the real date of the device; one orbit is one year (recommended)', 'Start at the real date; the year stands still in a visit, and the child changes the season by flight to another latitude', 'Start in the northern spring at each visit; one orbit is one year', 'A faster year: 20 minutes (needs option B)'] },
  { id: 'meadow', title: '3 · Where does the flight start on Earth?',
    why: 'The start meadow is between 27° S and 27° N. The season is weak below 24°.',
    options: ['Move the start to the leaf forest, 24° to 34° N, so the season shows at once (recommended)', 'Keep the start; the child finds the seasons by flight'] },
  { id: 'magic', title: '4 · Which magic seasons does Blossom Haven get?', multi: true,
    why: 'Clip B2 shows the four. Write other ideas in the notes: a rainbow time, a star time, a honey time.',
    options: MAGIC.map(season => `${season.name}: ${season.plants.toLowerCase()}`) },
  { id: 'pattern', title: '5 · How does a magic season go over the planet?',
    why: 'Clip B3 shows three patterns.',
    options: ['Rings from the cottage (recommended)', 'Two halves', 'Patches', 'The whole planet at one time'] },
  { id: 'clock', title: '6 · When does the magic season change?',
    why: 'The planet jumps each 5 minutes.',
    options: ['At each hop of the planet: a year is 20 minutes (recommended)', 'On a clock of its own', 'At each visit of the fairy to the planet'] },
  { id: 'cottage', title: '7 · What happens at the cottage?',
    why: 'Clip B4 shows a change of season at the cottage.',
    options: ['The cottage is the first place of each season (recommended)', 'The garden of the cottage keeps Blossom time all year'] },
  { id: 'next', title: '8 · What comes next?',
    why: 'The study code is a prototype. The game needs its own code and tests.',
    options: ['Earth first, then Blossom Haven (recommended)', 'Blossom Haven first', 'Both worlds together', 'More study of the magic plants first'] },
]
