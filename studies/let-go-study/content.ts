import type { OptionId } from './model'
import type { ClipId } from './features/clips'

/**
 * The text of the let go study: the clips, the four options, what each one adds and subtracts,
 * the phone and the computer, the findings, the plan and the decisions. The page (main.ts) shows
 * it with the numbers of numbers.ts. The first choice of each decision is the recommendation.
 */
export type Size = 'S' | 'M' | 'L'
export const SIZES_OF_WORK: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

export type Moment = { t: number; caption: string }
export type Clip = { id: ClipId; name: string; question: string; moments: [Moment, Moment, Moment] }

/** The moments are the times of MOMENTS in let-go-study-capture.mjs. */
export const CLIPS: Clip[] = [
  {
    id: 'T', name: 'T · Today', question: 'How does the tour fly with the cruise and the Hover button of today?',
    moments: [
      { t: 1.5, caption: 'Fly straight: no keys. No hands on the controls.' },
      { t: 6.6, caption: 'One tap of Hover stopped her at once. The button now says Fly.' },
      { t: 10.4, caption: 'In the hover, → turns her in place.' },
    ],
  },
  {
    id: 'A', name: 'A · Any key flies', question: 'What if an arrow or Boost moves her, and no key stops her?',
    moments: [
      { t: 1.5, caption: 'Only Boost goes straight, so the straight part is at 2.3 times the speed.' },
      { t: 6.6, caption: 'Let go: she glided 2.5 m and waits.' },
      { t: 10.4, caption: '→ turns her, but it also moves her: she flies a circle.' },
    ],
  },
  {
    id: 'B', name: 'B · Hold to fly', question: 'What if a held Fly button moves her, and the arrows only steer?',
    moments: [
      { t: 1.5, caption: 'Hold Fly: she flies straight at the speed of today.' },
      { t: 6.6, caption: 'Let go of Fly: she glided 2.5 m and waits.' },
      { t: 10.4, caption: '→ with no Fly turns her in place, as in a hover today.' },
    ],
  },
  {
    id: 'C', name: 'C · Rest after a pause', question: 'What if she flies on as today, and rests after 3 s with no key?',
    moments: [
      { t: 1.5, caption: 'Fly straight: no keys, as today.' },
      { t: 6.6, caption: 'The child let go at 5 s. She flies on; the rest starts at 8 s.' },
      { t: 10.4, caption: '→ starts her again, in a circle. She did not stop where the child let go.' },
    ],
  },
  {
    id: 'S', name: 'S · To the Moon', question: 'What does a trip in open space need with B?',
    moments: [
      { t: 2.8, caption: 'Hold Fly: she leaves Earth at about 100 m/s.' },
      { t: 9.1, caption: 'She waits between Earth and the Moon. ← turns her in place, and Earth goes by.' },
      { t: 16.5, caption: 'Fly again: she comes near the Moon. Today no key is necessary for this part.' },
    ],
  },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

// ---- The four options -------------------------------------------------------------------------------

export type Option = {
  id: OptionId
  name: string
  line: string
  /** What the child does. */
  child: string
  strong: string[]
  weak: string[]
  size: Size | null
  recommended: boolean
}

export const OPTIONS: Option[] = [
  {
    id: 'T', name: 'Today', recommended: false, size: null,
    line: 'She flies with no keys. Hover stops her at once, and the arrows then turn her in place. Fly starts her again.',
    child: 'The child steers a fairy that always flies. To stop, the child must find Hover (Q on a computer), and later Fly.',
    strong: ['No hands are necessary to fly. The tour needs 4.8 s of hands on the controls in 14 s.', 'A phone works with one thumb at a time.', 'The look around in place is there.', 'Long trips need no held key.'],
    weak: ['A stop is a mode: one button with a label that changes from Hover to Fly.', 'A child who lets go loses her: 113 m in 10 s over the meadow, 9.7 km in open space.', 'Hover stops her in one frame, also at 967 m/s.'],
  },
  {
    id: 'A', name: 'Any key flies', recommended: false, size: 'S',
    line: 'An arrow or Boost moves her. With no key she glides to a stop in about 1 s. The Hover button and Q go.',
    child: 'The child holds an arrow to go. When the child lets go, she stops. There is one button less.',
    strong: ['The request as it is: no key, no flight. The Hover button goes.', 'She stops 2.5 m after the child lets go.', 'One thumb is enough on a phone.'],
    weak: ['No key flies straight at the normal speed. Only Boost goes straight, at 2.3 times the speed.', 'No look around in place: each turn moves her (19 m in the look of the tour).', 'Hold W for long, and she loops back to the ground. To leave Earth, the child must change to Boost at the right height.', 'Hands on the controls for 10.5 s of the 14 s tour.'],
  },
  {
    id: 'B', name: 'Hold to fly', recommended: true, size: 'M',
    line: 'A held Fly button (Space on a computer) moves her, and the arrows steer. Let go and she glides to a stop; the arrows then turn her in place. Fly takes the place of Hover. Boost becomes Fast, a second Fly button.',
    child: 'The child holds Fly to go, and lets go to stop. The arrows steer in flight and look around in a stop.',
    strong: ['She stops 2.5 m after the child lets go, with no mode.', 'The look around in place stays: → alone turns her.', 'Straight flight at the normal speed stays: hold Fly.', 'The layout of most phone games: steer on the left, go on the right.'],
    weak: ['Two thumbs to steer in flight on a phone (2.0 s in the tour).', 'Hands on the controls for 10.5 s of the 14 s tour, and for each second of a long trip.', 'Space is the pause key today. Pause must move to a different key.', 'The Hover button does not go: the Fly button takes its place.'],
  },
  {
    id: 'C', name: 'Rest after a pause', recommended: false, size: 'S',
    line: 'She flies with no keys, as today. After 3 s with no key she glides to a stop. An arrow or Boost starts her again. The Hover button and Q go.',
    child: 'The child steers as today. When nothing is pressed for a moment, she rests.',
    strong: ['The calm cruise stays for 3 s at a time.', 'The Hover button and Q go, with no new key.', 'Hands on the controls for 4.5 s of the tour: less than today.'],
    weak: ['She does not stop where the child lets go: 36 m later over the meadow, and 3.2 km later in open space.', 'No look around in place: an arrow starts her again.', 'A long trip needs a tap each 3 s, and each tap turns her a little.', 'A rest that comes late can look like a fault to the child.'],
  },
]
export const optionById = (id: OptionId) => OPTIONS.find(option => option.id === id)!

/** The comparison table. One fact in each cell. */
export const COMPARE: { row: string; values: Record<OptionId, string> }[] = [
  { row: 'What moves her', values: { T: 'Nothing: she always flies', A: 'An arrow or Boost', B: 'Fly (or Fast)', C: 'Nothing for 3 s, then an arrow or Boost' } },
  { row: 'How she stops', values: { T: 'Tap Hover: at once', A: 'Let go: a glide of about 1 s', B: 'Let go: a glide of about 1 s', C: 'Let go: 3 s, then a glide' } },
  { row: 'Look around in place', values: { T: 'Yes, in a hover', A: 'No', B: 'Yes, when Fly is up', C: 'No' } },
  { row: 'Straight at the normal speed', values: { T: 'Yes, no keys', A: 'No, only fast with Boost', B: 'Yes, hold Fly', C: 'Yes, no keys' } },
  { row: 'Buttons on the right of a phone', values: { T: 'Boost, Hover', A: 'Boost', B: 'Fast, Fly', C: 'Boost' } },
  { row: 'Keys on a computer', values: { T: 'WASD / arrows, Shift, Q, Space', A: 'WASD / arrows, Shift, Space', B: 'WASD / arrows, Shift, Space (Fly), P', C: 'WASD / arrows, Shift, Space' } },
  { row: 'Size of the work', values: { T: '—', A: 'S', B: 'M', C: 'S' } },
]

// ---- What the change adds and subtracts --------------------------------------------------------------

export type Effect = { title: string; text: string; options: OptionId[] }
export const ADDS: Effect[] = [
  { title: 'A stop with no mode', text: 'Let go, and she waits. There is no Hover button to find and no label that changes to Fly.', options: ['A', 'B', 'C'] },
  { title: 'She is where the child left her', text: 'In 10 s with no key she moves 2.9 m over the meadow (today 113 m), and 261 m in open space (today 9.7 km).', options: ['A', 'B'] },
  { title: 'A stop near a thing to see', text: 'She stops 2.5 m after the child lets go: near an animal, a sparkle ring, the friend or a view for a postcard.', options: ['A', 'B'] },
  { title: 'A soft stop in open space', text: 'A glide of 2.3 s from 967 m/s. Today Hover stops her in one frame.', options: ['A', 'B', 'C'] },
  { title: 'One button less on a phone, one key less on a computer', text: 'The Hover button and Q go. B keeps the number of buttons: Fly takes the place of Hover.', options: ['A', 'C'] },
  { title: 'A good match for a game controller', text: 'Stick to move, let go to stop: the usual rule of a controller (idea F7 of the feature ideas study).', options: ['A', 'B'] },
  { title: 'Simpler browser checks', text: 'Eight checks turn the hover on and off with 25 lines. With the change a check lets go of the keys.', options: ['A', 'B', 'C'] },
]
export const SUBTRACTS: Effect[] = [
  { title: 'The drift', text: 'The flight with no hands: the slow cruise over the meadow, and the planets that go by in open space. The welcome card says "Drift beyond the blue".', options: ['A', 'B'] },
  { title: 'Hands free most of the time', text: 'The tour of 14 s needs 10.5 s of hands on the controls (today 4.8 s).', options: ['A', 'B'] },
  { title: 'One thumb at a time on a phone', text: 'To steer in flight, one thumb holds Fly and one thumb holds an arrow. A child who holds the phone in one hand and taps with the other cannot steer in flight.', options: ['B'] },
  { title: 'The look around in place', text: 'An arrow moves her. In the look of the tour she moves 19 m in A and 20 m in C. T and B turn 110° and stay.', options: ['A', 'C'] },
  { title: 'Straight flight at the normal speed', text: 'No key goes straight but Boost, at 2.3 times the speed.', options: ['A'] },
  { title: 'Long trips with no hands', text: 'A trip from Earth to Neptune is 31 to 48 s of a held key in B (14 to 22 s of Boost in A). C needs a tap each 3 s.', options: ['A', 'B', 'C'] },
  { title: 'A way to play with no held button', text: 'Some children cannot hold a button for long. The Game Accessibility Guidelines and the Xbox Accessibility Guidelines (XAG 107) ask for an alternative to held buttons, such as a choice of hold or toggle. Today the cruise is that alternative.', options: ['A', 'B', 'C'] },
]

// ---- The phone and the computer ------------------------------------------------------------------------

export const PHONE: string[] = [
  'Today the right thumb rests most of the time. The tour needs a finger for 4.8 s of 14 s, and never two.',
  'With B the right thumb holds Fly for each second of flight, and the left thumb steers: two thumbs for 2.0 s of the tour. Both bottom corners of the screen are under a thumb for longer.',
  'With A one thumb is enough, but the thumb is on an arrow or on Boost for 10.5 s of 14 s, and the straight parts are at Boost speed.',
  'Today a thumb that slides off a button lets go of it (the pointermove handler of the touch buttons in src/main.ts). With B that stops the fairy. The Fly button must keep the press until the thumb lifts.',
  'The Fly button is the button that the thumb holds most. It must be large: 92 × 56 px today for Boost and Hover; Fly needs at least the same.',
  'Guided trips (a world on the Worlds map, "Follow the flower") must fly with no keys, as today. A phone player uses them for the long trips.',
]
export const COMPUTER: string[] = [
  'A computer player holds keys with no effort. Two hands are on the keyboard in most games: WASD with the left hand, or the arrows with the right hand and Space with the left thumb.',
  'B needs a Fly key. Space is the usual key to go in a game, but Space pauses today (the keydown handler of src/main.ts). Pause can move to P and stay on the pause button.',
  'Some keyboards do not see a third or fourth key that is held at the same time (Space, Shift and two arrows). The study did not measure this. Test it on a cheap keyboard.',
  'A takes the look in place away from the computer player too: an arrow alone moves her.',
  'When a panel opens (Worlds, Settings, the postcard, the menu), the flight stops and the game clears the keys (clearInput()). When the panel closes, today she flies on. With A and B she waits until the next press.',
  'The Q key goes in A, B and C. It moved from Ctrl to Q on 27 September 2026, because Ctrl+W closed the tab.',
]

// ---- What the game has today -----------------------------------------------------------------------------

/** References are to commit 8a426c7. */
export const FINDINGS: [string, string][] = [
  ['No key flies forward', 'W and S climb and descend, A and D turn (updateFairy() in src/main.ts). With a stop on release, a straight flight needs a key: A uses Boost, B adds Fly.'],
  ['The stop is a mode', 'One button with a label that changes from Hover to Fly (toggleHover() in src/main.ts). On a computer the key is Q.'],
  ['Let go, and she flies on', 'In 10 s with no key she flies 113 m over the meadow, 166 m at 30 m above the ground and 9.7 km in open space.'],
  ['Hover stops her in one frame', 'hoverFlight() in src/flight.ts sets the speed to 0. In open space that is a stop from 967 m/s in one frame.'],
  ['A hover keeps the flight pose', 'In a hover the fairy plays the cruise pose (fairyAnimation.update(delta, false)), with no motion. With a stop on release she is in this pose much more often.'],
  ['A hover changes the hop of the home', 'Near Blossom Haven, a fairy in a hover stays behind at a hop (moveHome(): carrying = !hoverHeld && …). With a stop on release, each stop does the same.'],
  ['Guided trips need no keys', 'A trip from the Worlds map or "Follow the flower" flies with no keys. An arrow ends the trip (destination = null in updateFairy()).'],
  ['A thumb that slides off lets go', 'The touch buttons let go of a press when the finger leaves the button. Today that ends a turn. With B it stops the fairy.'],
]

// ---- The plan for B --------------------------------------------------------------------------------------

export const CHANGES: [string, string, Size][] = [
  ['The glide and the Fly state', 'Add glideFlight() to src/flight.ts (model.ts has a version). In updateFairy(), Fly or Fast held: stepFlight(); else the glide, then hoverFlight().', 'S'],
  ['The Fly key and the Fly button', 'Space flies; Pause moves to P and stays on the pause button. The Hover button becomes a held Fly button. Boost becomes Fast: it flies fast with no Fly.', 'S'],
  ['Remove the hover', 'Remove hoverHeld, toggleHover() and Q. A waiting fairy takes its place in moveHome(), the trail and the test hooks approach() and faceMoon().', 'S'],
  ['The guided trips', 'They fly with no keys, as today. Fly and Fast do not end them; an arrow ends them.', 'S'],
  ['The thumb on the Fly button', 'The Fly button keeps the press until the finger lifts, also when it slides off. Make it at least as large as Hover today.', 'S'],
  ['A wait pose', 'An upright pose with slow wings in src/fairy.ts, with a soft change to and from the flight pose.', 'M'],
  ['Fly by hold or by tap', 'A Settings switch for players who cannot hold a button. Tap mode is the flight of today: a tap of Fly starts the cruise, a second tap stops her.', 'S'],
  ['The texts and the checks', 'The welcome hint, the touch help, How to play in Settings and the README. Eight browser checks (25 lines) and mobile-play-smoke.mjs.', 'M'],
]

// ---- The decisions ---------------------------------------------------------------------------------------

export type Decision = { id: string; title: string; why: string; options: string[] }
export const DECISIONS: Decision[] = [
  { id: 'model', title: 'The control model', why: 'Only B stops her where the child lets go and keeps the look around in place. A and C remove the Hover button, but each one loses the look in place.', options: ['B · Hold to fly', 'A · Any key flies', 'C · Rest after a pause', 'Keep today (T)'] },
  { id: 'key', title: 'The Fly key on a computer (B)', why: 'Space is the usual key to go, but Space pauses today.', options: ['Space; pause moves to P and stays on the pause button', 'F', 'E'] },
  { id: 'fast', title: 'Fast flight on a phone (B)', why: 'One thumb cannot hold Fly and Boost at the same time.', options: ['Two held buttons: Fly and Fast', 'One Fly button; she goes faster after 2 s of Fly', 'No fast flight on a phone'] },
  { id: 'glide', title: 'The stop', why: 'A glide of about 1 s is 2.5 m over the meadow and 261 m in open space. A stop at once is the hover of today.', options: ['A glide of about 1 s', 'A stop at once, as Hover today', 'A long glide of about 3 s'] },
  { id: 'guided', title: 'Guided trips', why: 'Trips from the Worlds map and "Follow the flower" fly with no keys today. They are the long trips of a phone player.', options: ['They fly with no keys, as today', 'They also need the Fly key'] },
  { id: 'tap', title: 'A way to play with no held button', why: 'Some children cannot hold a button for long. Tap mode is the flight of today.', options: ['A Settings switch: Fly by hold or by tap', 'No switch'] },
  { id: 'pose', title: 'The pose in a wait', why: 'She waits much more often, and today she waits in the flight pose.', options: ['Add a wait pose: upright, with slow wings', 'Keep the flight pose'] },
  { id: 'slide', title: 'A thumb that slides off Fly', why: 'Today a slide off a button lets go of it. With B the fairy would stop.', options: ['Fly stays down until the thumb lifts', 'Let go, as the arrows do today'] },
  { id: 'hop', title: 'A hop of the home while she waits near it', why: 'Today a fairy in a hover stays behind. With a stop on release, each stop near the home is a wait.', options: ['The home takes her with it', 'She stays behind, as in a hover today'] },
  { id: 'start', title: 'The start of a flight', why: 'Today she flies at 11 m/s from the first frame. With B she waits until the first press.', options: ['She waits; the hint says "Hold Fly to fly"', 'She glides a short way at the start, then waits'] },
]
