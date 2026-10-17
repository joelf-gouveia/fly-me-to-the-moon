import './sky-note.css'

/**
 * The sky note (option B of the living worlds study, docs/living-worlds-study.md): a true fact about
 * the weather or the event of a world, from the fairy friend. It shows once in each visit, after
 * 4 s in the air of the world, or at the first spark on an airless world. It is in the place of the
 * thermometer note and never shows with a different note. A fact that science is not sure of says so.
 */
export type SkyNoteKind = 'mercury' | 'venus' | 'moon' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'

/** One fact for each world with a living sky. Short, with no numbers, as the facts of the stickers. */
export const SKY_FACTS: Record<SkyNoteKind, string> = {
  mercury: 'A spark! With no air to stop them, tiny space pebbles hit Mercury and flash.',
  venus: 'These clouds race all the way around Venus in a few days. Flashes of lightning? Scientists are not sure.',
  moon: 'A spark! Tiny space pebbles hit the Moon and make little flashes of light.',
  mars: 'Look, dust devils! They are spinning towers of dust, some taller than mountains.',
  jupiter: 'The big red storm is bigger than Earth and has spun for hundreds of years. Lightning flashes in the tall clouds!',
  saturn: 'Saturn has storms with lightning too, deep under its soft, hazy clouds.',
  uranus: 'The clouds of Uranus blow backwards around the middle of the planet.',
  neptune: 'Neptune has the fastest winds of all the planets. Its dark storm is as big as Earth!',
}
export const isSkyNoteKind = (kind: string): kind is SkyNoteKind => kind in SKY_FACTS

export const SKY_NOTE = {
  /** Seconds in the air of a world before its note. */
  wait: 4,
  /** Seconds that the note shows, and the fade after them. */
  show: 7, fade: 0.6,
  /** Seconds away from a world before a new visit can show its note again. */
  again: 10,
} as const

export type SkyNoteState = { at: SkyNoteKind | null; inside: number; away: number; done: SkyNoteKind | null; pending: SkyNoteKind | null; shown: SkyNoteKind | null; left: number }
export const newSkyNote = (): SkyNoteState => ({ at: null, inside: 0, away: 0, done: null, pending: null, shown: null, left: 0 })

/**
 * One step of the sky note. `here` is the world with a living sky where the fairy is in the air (or low
 * over an airless world), or null. `spark` is true when a spark shows on an airless world now. `flying`
 * is false behind Worlds, Settings, the menu and the pause. `busy` is true while a different note shows:
 * the sky note waits for it, and leaves when it comes. The step changes `state`.
 */
export function skyNoteStep(state: SkyNoteState, here: SkyNoteKind | null, spark: boolean, delta: number, flying: boolean, busy: boolean) {
  if (here !== state.at) { state.at = here; state.inside = 0 }
  if (here) {
    state.away = 0
    if (flying) state.inside += delta
    const airless = here === 'moon' || here === 'mercury'
    if (here !== state.done && !state.pending && (airless ? spark : state.inside >= SKY_NOTE.wait)) state.pending = here
  } else {
    state.away += delta
    // A new visit: after some time away, the same world can show its note again.
    if (state.away >= SKY_NOTE.again) state.done = null
    state.pending = null
  }
  if (busy) {
    // A different note comes: the sky note leaves, and it does not come back in this visit.
    state.shown = null
  } else if (state.pending && flying) {
    state.shown = state.done = state.pending
    state.pending = null
    state.left = SKY_NOTE.show
  } else if (state.shown && flying) {
    state.left -= delta
    if (state.left <= -SKY_NOTE.fade) state.shown = null
  }
  return state
}

/** The note of the game: the name of the friend (or of the world) and the fact. */
export function createSkyNote() {
  const note = document.createElement('div')
  note.id = 'sky-note'
  note.setAttribute('role', 'status')
  note.hidden = true
  note.innerHTML = '<small></small><p></p>'
  document.querySelector('.game-shell')!.append(note)
  const state = newSkyNote()
  let drawn: SkyNoteKind | null = null
  return {
    /** Called on each frame. `speaker` is the name of the fairy friend, or the name of the world. */
    update(here: SkyNoteKind | null, spark: boolean, delta: number, flying: boolean, busy: boolean, speaker: () => string) {
      skyNoteStep(state, here, spark, delta, flying, busy)
      if (state.shown !== drawn) {
        drawn = state.shown
        if (drawn) {
          note.querySelector('small')!.textContent = speaker()
          note.querySelector('p')!.textContent = SKY_FACTS[drawn]
        }
      }
      note.hidden = !state.shown || !flying
      note.classList.toggle('is-leaving', state.left <= 0)
    },
    /** True while the note is on the screen. The thermometer and the Moon note wait for it. */
    get visible() { return !note.hidden },
    get state() { return { shown: state.shown, pending: state.pending, done: state.done, inside: state.inside, left: state.left, text: note.hidden ? null : note.textContent } },
  }
}
