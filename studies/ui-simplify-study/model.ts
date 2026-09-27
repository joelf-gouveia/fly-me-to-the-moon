/** The controls of the game screen today, and where each option of docs/ui-simplify-study.md puts them. */

export type Option = 'today' | 'two' | 'grownup' | 'four'
export const UI_OPTIONS: readonly Option[] = ['today', 'two', 'grownup', 'four']
export const OPTIONS: Record<Option, { letter: string; name: string; line: string }> = {
  today: { letter: '—', name: 'Today', line: 'The game as it is on 27 September 2026.' },
  two: { letter: 'A', name: 'Two switches', line: 'Star pictures and Orbit paths move to Settings. Nothing else changes.' },
  grownup: { letter: 'B', name: 'Grown-up corner', line: 'A, plus World speed and the sky credits move to Settings. The dead and the debug parts go away. Settings saves the sky switches.' },
  four: { letter: 'C', name: 'Four buttons', line: 'B, plus Sound and the keyboard help move to Settings. The computer toolbar keeps four buttons.' },
}

/** Where a control is: on the game screen (as today), in Settings, or removed. */
export type Place = 'screen' | 'settings' | 'removed'
/** Where the control is today. "hidden" is in the page but never visible. */
export type Area = 'adventure' | 'toolbar' | 'flight-panel' | 'destination' | 'worlds' | 'hidden'
export type Who = 'child' | 'grown-up' | 'both'

export type Control = {
  id: string
  label: string
  /** A button that the player presses. The other rows are text. */
  button: boolean
  area: Area
  who: Who
  code: string
  why: string
  /** The first option that moves the control. The later options keep the move. */
  from?: Exclude<Option, 'today'>
  to?: Exclude<Place, 'screen'>
}

export const CONTROLS: readonly Control[] = [
  { id: 'follow-home', label: 'Guide me home', button: true, area: 'adventure', who: 'child', code: 'src/adventure.ts:20',
    why: 'The main goal of the game. It stays large and first.' },
  { id: 'open-map', label: 'Worlds', button: true, area: 'adventure', who: 'child', code: 'src/adventure.ts:21',
    why: 'The child picks a world here. It stays.' },
  { id: 'show-stars', label: 'Star pictures', button: true, area: 'adventure', who: 'both', code: 'src/adventure.ts:77', from: 'two', to: 'settings',
    why: 'It changes a display, not the flight. On the ground it shows nothing: the labels need sky visibility above 0.05 (src/sky-labels.ts:63).' },
  { id: 'show-orbits', label: 'Orbit paths', button: true, area: 'adventure', who: 'both', code: 'src/adventure.ts:56', from: 'two', to: 'settings',
    why: 'It changes a display, not the flight. On the ground it draws thin lines through the day sky and the clouds.' },
  { id: 'customize-toggle', label: 'Your fairy', button: true, area: 'toolbar', who: 'child', code: 'src/main.ts:97',
    why: 'Play for the child. It stays.' },
  { id: 'stickers-toggle', label: 'Stickers', button: true, area: 'toolbar', who: 'child', code: 'src/sticker-book.ts:24',
    why: 'The reward of the game. It stays.' },
  { id: 'settings-toggle', label: 'Settings', button: true, area: 'toolbar', who: 'grown-up', code: 'src/settings.ts:12',
    why: 'The door to the grown-up controls. It stays.' },
  { id: 'sound-toggle', label: 'Sound', button: true, area: 'toolbar', who: 'both', code: 'src/main.ts:100', from: 'four', to: 'settings',
    why: 'A quick mute is useful in a shared room. Option C moves it; A and B keep it.' },
  { id: 'orbit-speed-toggle', label: 'World speed', button: true, area: 'toolbar', who: 'grown-up', code: 'src/main.ts:103', from: 'grownup', to: 'settings',
    why: 'The button shows only "1×". One click makes the planets 8 times faster, and at 64× the carry of Earth jumps 922 m/s (docs/planet-transition-study.md, Finding 8).' },
  { id: 'pause-toggle', label: 'Pause', button: true, area: 'toolbar', who: 'both', code: 'src/main.ts:106',
    why: 'The Space key also pauses. A child needs it on the screen. It stays.' },
  { id: 'controls-copy', label: 'Keyboard help', button: false, area: 'flight-panel', who: 'grown-up', code: 'src/main.ts:90', from: 'four', to: 'settings',
    why: 'It shows all the time on a computer. The welcome card says the same keys (src/mobile-ui.ts:56).' },
  { id: 'landscape-number', label: '"· landscape 1" in the panel', button: false, area: 'destination', who: 'grown-up', code: 'src/main.ts:724', from: 'grownup', to: 'removed',
    why: 'A number for a developer. A child cannot use it.' },
  { id: 'sky-credits', label: 'Pictures in the sky: credits', button: false, area: 'worlds', who: 'grown-up', code: 'src/adventure.ts:37', from: 'grownup', to: 'settings',
    why: 'It credits the star pictures and the Webb pictures. It belongs beside the Star pictures switch.' },
  { id: 'journey-picker', label: 'Follow a world (select + Set course)', button: true, area: 'hidden', who: 'grown-up', code: 'src/main.ts:164', from: 'grownup', to: 'removed',
    why: 'src/adventure.css:18 hides it, but src/main.ts builds it and lines 685 to 796 update it. Seven smoke scripts use it as a hook.' },
  { id: 'toggle-orbits', label: 'Hide orbital paths (in Worlds)', button: true, area: 'hidden', who: 'grown-up', code: 'src/adventure.ts:28', from: 'grownup', to: 'removed',
    why: 'The markup makes it, then line 62 removes it. The Orbit paths button replaces it.' },
]

const RANK: Record<Option, number> = { today: 0, two: 1, grownup: 2, four: 3 }
export function placeOf(control: Control, option: Option): Place {
  return control.from && control.to && RANK[option] >= RANK[control.from] ? control.to : 'screen'
}

/** The buttons that a player can see on the screen during a flight on a computer. */
export function computerButtons(option: Option) {
  return CONTROLS.filter(control => control.button && control.area !== 'hidden' && control.area !== 'worlds' && placeOf(control, option) === 'screen')
}

/** On a touch screen, Menu, Worlds and Pause stay at the top. Menu holds the other buttons of the toolbar and the adventure row. */
const PHONE_TOP = ['open-map', 'pause-toggle']
export function phoneMenuButtons(option: Option) {
  return computerButtons(option).filter(control => !PHONE_TOP.includes(control.id))
}

export type Setting = { id: string; title: string; kind: 'switch' | 'steps' | 'text' | 'reset' | 'details'; note: string }
export type Section = { id: string; title: string; settings: Setting[] }

export const WORLD_SPEEDS = [1, 8, 16, 32, 64] as const

/** The sections of the Settings dialog for each option. Today it has the sticker book only (src/settings.ts). */
export function settingsFor(option: Option): Section[] {
  const has = (id: string) => placeOf(CONTROLS.find(control => control.id === id)!, option) === 'settings'
  const sections: Section[] = []
  if (has('sound-toggle')) sections.push({ id: 'sound', title: 'Sound', settings: [
    { id: 'sound', title: 'Music and chimes', kind: 'switch', note: 'The chime of a new sticker plays only with the sound on.' },
  ] })
  const sky: Setting[] = []
  if (has('show-stars')) sky.push({ id: 'stars', title: 'Star pictures', kind: 'switch', note: 'Lines and names of the constellations, and the Webb pictures. They show in space, above the air.' })
  if (has('show-orbits')) sky.push({ id: 'orbits', title: 'Orbit paths', kind: 'switch', note: 'A coloured line for the path of each world. The lines also show in the day sky.' })
  if (has('orbit-speed-toggle')) sky.push({ id: 'speed', title: 'World speed', kind: 'steps', note: 'How fast the worlds go around the Sun. At 1×, one lap of Earth takes about an hour.' })
  if (sky.length) sections.push({ id: 'sky', title: 'In the sky', settings: sky })
  if (has('controls-copy')) sections.push({ id: 'help', title: 'How to fly', settings: [
    { id: 'keys', title: 'Keys', kind: 'text', note: '↑ / W climb · ↓ / S descend · ← → / A D turn · Shift boost · Ctrl hover · Space pause. Let go to cruise.' },
  ] })
  sections.push({ id: 'book', title: 'Sticker book', settings: [
    { id: 'reset', title: 'Reset sticker book', kind: 'reset', note: 'The book has 3 of 13 stickers.' },
  ] })
  if (has('sky-credits')) sections.push({ id: 'credits', title: 'Credits', settings: [
    { id: 'credits', title: 'Pictures in the sky', kind: 'details', note: 'Bright Star Catalog (NASA HEASARC), IAU star names, and ESA/Webb pictures under CC BY 4.0.' },
  ] })
  return sections
}

/** Settings that option B and option C keep in localStorage. Today, and in A, all three start again at each load. */
export function savesSky(option: Option) { return RANK[option] >= RANK.grownup }
