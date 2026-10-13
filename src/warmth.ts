import type { StickerId } from './stickers'

// F16 · Picture thermometer: a level, a colour, a face and one word say if a world is hot or cold.
// It has no numbers. Design: docs/learn-and-play-study.md, part F16. The page parts are in src/warmth-note.ts.

/**
 * The level of each world, from 0 (the coldest) to 1 (the hottest): one level for each world, with no
 * day level and no night level. The order follows the real temperatures. Uranus is below Neptune, as
 * the fact of the Uranus sticker says. The Sun is the top of the scale.
 */
export const WARMTH: Record<StickerId, number> = {
  sun: 1, venus: 0.92, mercury: 0.8, earth: 0.55, fairy: 0.55, moon: 0.4, mars: 0.34, vesta: 0.26, ceres: 0.24,
  jupiter: 0.16, saturn: 0.12, neptune: 0.06, uranus: 0.04,
}

export type WarmthId = 'hot' | 'warm' | 'nice' | 'cool' | 'cold'
export type WarmthStep = { id: WarmthId; word: string; /** The step starts above this level. */ above: number; colour: string }

/**
 * The five steps, from the hottest. Each colour has a contrast of 3 or more with the dark panel of
 * Worlds and with the pink sticker card (tests/warmth.test.ts), and the dark lines of a face show on it.
 */
export const WARMTH_STEPS: readonly WarmthStep[] = [
  { id: 'hot', word: 'HOT', above: 0.75, colour: '#e0453a' },
  { id: 'warm', word: 'WARM', above: 0.62, colour: '#d16a12' },
  { id: 'nice', word: 'NICE', above: 0.42, colour: '#37974a' },
  { id: 'cool', word: 'COOL', above: 0.2, colour: '#1b90a1' },
  { id: 'cold', word: 'COLD', above: -1, colour: '#3d83e6' },
]

/** The step of a level: its word, its colour and its face. */
export const warmthStep = (level: number) => WARMTH_STEPS.find(step => level > step.above)!
/** The step of a world. */
export const warmthOf = (id: StickerId) => warmthStep(WARMTH[id])

const INK = '#2a1b3d'
const eyes = `<circle cx="18.5" cy="48" r="1.9" fill="${INK}"/><circle cx="29.5" cy="48" r="1.9" fill="${INK}"/>`
const cheeks = (colour: string, r: number) => `<circle cx="14.6" cy="53.4" r="${r}" fill="${colour}"/><circle cx="33.4" cy="53.4" r="${r}" fill="${colour}"/>`
const mouth = (d: string) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
/**
 * The five faces: drawings of the game, not emoji, because an emoji looks different on each device.
 * Each face is in the bulb of the thermometer (centre 24 51, radius 15). The parts next to the bulb
 * use the line colour of the place: a sweat drop for hot, a snowflake and shiver lines for cold.
 */
const FACES: Record<WarmthId, string> = {
  // Red cheeks, an open mouth and a sweat drop.
  hot: `${cheeks('#9c1f1c', 3.3)}${eyes}<ellipse cx="24" cy="56.6" rx="3.7" ry="2.9" fill="${INK}"/><path d="M41 31.5c2.6 4.2 4 6.4 4 8.6a4 4 0 0 1-8 0c0-2.2 1.4-4.4 4-8.6Z" fill="#8fd2ff" stroke="var(--warmth-line)" stroke-width="1.4" stroke-linejoin="round"/>`,
  // Small cheeks and a small smile.
  warm: `${cheeks('#f5b27a', 2.4)}${eyes}${mouth('M19.8 55.2q4.2 3.4 8.4 0')}`,
  // Happy eyes and a wide smile.
  nice: `${cheeks('#a8e0a0', 2.6)}${mouth('M15.9 48.8q2.6-3.4 5.2 0')}${mouth('M26.9 48.8q2.6-3.4 5.2 0')}${mouth('M17.4 54q6.6 7 13.2 0')}`,
  // A flat mouth.
  cool: `${eyes}${mouth('M20 56.6h8')}`,
  // A blue face with a mouth that shivers, a snowflake, and shiver lines on each side.
  cold: `${eyes}${mouth('M17.5 57.4l2.2-2.6 2.1 2.6 2.2-2.6 2.2 2.6 2.1-2.6 2.2 2.6')}<path d="M41 27.6v10M36.7 30.1l8.6 5M45.3 30.1l-8.6 5M5 46.5q-2 2.2 0 4.4t0 4.4M43 46.5q2 2.2 0 4.4t0 4.4" fill="none" stroke="var(--warmth-line)" stroke-width="1.5" stroke-linecap="round"/>`,
}

/**
 * The thermometer of a level as one small SVG: a tube with the level, and a bulb with the face. The
 * level and the colour are the CSS variables `--warmth-level` and `--warmth-colour`; the line and the
 * glass take `--warmth-line` and `--warmth-glass` from the place (src/warmth.css). The word is not
 * in the SVG, so each place can put it where it fits.
 */
export function thermometerAt(level: number) {
  const step = warmthStep(level)
  return `<svg class="thermometer is-${step.id}" viewBox="0 0 48 68" style="--warmth-level:${level};--warmth-colour:${step.colour}" aria-hidden="true" focusable="false"><rect x="17" y="2" width="14" height="40" rx="7" fill="var(--warmth-glass)" stroke="var(--warmth-line)" stroke-width="2"/><rect class="thermometer-level" x="20.5" y="6.5" width="7" height="30" rx="3" fill="var(--warmth-colour)"/><circle cx="24" cy="51" r="15" fill="var(--warmth-colour)" stroke="var(--warmth-line)" stroke-width="2"/>${FACES[step.id]}</svg>`
}

/** The thermometer of a world. */
export const thermometer = (id: StickerId) => thermometerAt(WARMTH[id])

/** The thermometer with its word, for a card of Worlds and for the arrival moment. */
export const warmthMeter = (id: StickerId) => `<span class="warmth-meter" data-warmth="${warmthOf(id).id}">${thermometer(id)}<b>${warmthOf(id).word}</b></span>`

/** The arrival moment shows for 5 s, and the same world shows again after 10 s away from it. */
export const WARMTH_NOTE = { show: 5, fade: 0.6, again: 10 } as const
export type WarmthNoteState = { at: StickerId | null; seen: StickerId | null; away: number; pending: StickerId | null; shown: StickerId | null; left: number }
/** The fairy starts on Earth, so the start is not an arrival. */
export const newWarmthNote = (): WarmthNoteState => ({ at: 'earth', seen: 'earth', away: 0, pending: null, shown: null, left: 0 })

/**
 * One step of the arrival moment. `near` is the world that the flight panel says is near, or null in
 * open space. `flying` is false behind Worlds, Settings, the menu and the pause. `busy` is true while
 * the sticker note or the search-star note shows: the thermometer waits for it, and leaves when it comes.
 * The step changes `state`; `state.shown` is the world to show, and it fades while `left` is below 0.
 */
export function warmthNoteStep(state: WarmthNoteState, near: StickerId | null, delta: number, flying: boolean, busy: boolean) {
  if (near !== state.at) {
    state.at = near
    // An arrival: a different world, or the same world after some time away. A short dip out of the near distance is no arrival.
    state.pending = near && (near !== state.seen || state.away >= WARMTH_NOTE.again) ? near : null
  }
  if (near === state.seen) state.away = 0
  else state.away += delta
  if (busy) state.shown = null
  else if (state.pending && flying) {
    state.shown = state.seen = state.pending
    state.pending = null
    state.away = 0
    state.left = WARMTH_NOTE.show
  } else if (state.shown) {
    state.left -= delta
    if (state.left <= -WARMTH_NOTE.fade) state.shown = null
  }
  return state
}
