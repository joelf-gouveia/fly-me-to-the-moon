import { stickerById } from './stickers'
import type { StickerId } from './stickers'
import { newWarmthNote, warmthMeter, warmthNoteStep } from './warmth'
import './warmth.css'

/**
 * The arrival moment of the picture thermometer (F16): a small note with the thermometer of the world
 * where the fairy arrives. It is in the place of the sticker note, and it never shows with that note
 * (warmthNoteStep() in src/warmth.ts has the rule). It is not a permanent part of the flight screen.
 */
export function createWarmthNote() {
  const note = document.createElement('div')
  note.id = 'warmth-note'
  note.setAttribute('role', 'status')
  note.hidden = true
  document.querySelector('.game-shell')!.append(note)
  const state = newWarmthNote()
  let drawn: StickerId | null = null

  return {
    /** Called on each frame, after the "near" test of the flight panel. */
    update(near: StickerId | null, delta: number, flying: boolean, busy: boolean) {
      warmthNoteStep(state, near, delta, flying, busy)
      if (state.shown !== drawn) {
        drawn = state.shown
        if (drawn) note.innerHTML = `${warmthMeter(drawn)}<small>${stickerById(drawn).name}</small>`
      }
      // The note waits behind Worlds, Settings, the menu and the pause, and its time waits too.
      note.hidden = !state.shown || !flying
      note.classList.toggle('is-leaving', state.left <= 0)
    },
    get state() { return { shown: state.shown, pending: state.pending, left: state.left } },
  }
}
