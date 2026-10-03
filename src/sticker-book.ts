import * as THREE from 'three'
import type { World } from './worlds'
import { arrive, canFly, earnsSticker, emptyBook, nextDoor, parseBook, reachesMilestone, stickerById, STICKERS } from './stickers'
import type { Book, StickerId } from './stickers'
import { voiceDelay, voiceLine, wordAt, wordTimes } from './spoken-facts'
import type { SpokenFacts, WordTime } from './spoken-facts'
import './sticker-book.css'

type Voice = Pick<SpokenFacts, 'say' | 'stop' | 'line' | 'time' | 'duration'>
type Actions = { chime: (milestone: boolean) => void; voice: Voice }

const STORAGE_KEY = 'fairy-sticker-book'

/** The picture of a world, as in Worlds: Blossom Haven has its flower, Earth its sea. */
export function worldPicture(worlds: World[], id: StickerId) {
  const colour = `#${new THREE.Color(worlds.find(world => world.kind === id)!.color).getHexString()}`
  return `<span class="planet-picture ${id}" style="--planet-color:${colour}" aria-hidden="true">${id === 'fairy' ? '✿' : id === 'earth' ? '≈' : ''}</span>`
}

/**
 * The sticker book: the saved stickers, the new-sticker note, and the rule of the open
 * worlds. The book shows in the Worlds dialog (src/adventure.ts), as option D of
 * docs/world-book-study.md.
 */
export function createStickerBook(worlds: World[], actions: Actions) {
  let book: Book = emptyBook()
  try { book = parseBook(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) } catch { /* A session-only book still works. */ }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(book)) } catch { /* Keep the book for this visit. */ } }
  const listeners = new Set<() => void>()
  const changed = () => { save(); listeners.forEach(listener => listener()) }

  const host = document.createElement('div')
  host.className = 'sticker-book'
  // The speaker mark shows only while the voice says the fact (F2, src/spoken-facts.ts).
  host.innerHTML = `<div id="sticker-toast" role="status" hidden><span class="sticker-toast-art"></span><div><div class="sticker-toast-head"><small></small>`
    + `<span class="sticker-voice" aria-hidden="true" hidden><svg viewBox="0 0 12 12"><path d="M1 4h2.4L6.6 1.4v9.2L3.4 8H1z" fill="currentColor"/></svg><i></i><i></i><i></i><i></i></span></div>`
    + `<h2></h2><p class="sticker-toast-fact"></p><p class="sticker-toast-next"></p></div></div>`
  document.querySelector('.game-shell')!.append(host)
  const toast = host.querySelector<HTMLElement>('#sticker-toast')!
  const speaker = host.querySelector<HTMLElement>('.sticker-voice')!
  let toastTimer = 0
  // The note that the voice reads: its line, its words, and the time of each word.
  let spoken: { line: string; name: string; fact: string[]; groups: HTMLElement[][]; times: WordTime[] | null; lit: number; said: number } | null = null

  /** The words of a text, one span for each word. The text stays the same for a reader. */
  function fillWords(target: Element, text: string) {
    target.replaceChildren(...text.split(' ').flatMap((word, index) => {
      const span = document.createElement('span')
      span.className = 'sticker-word'
      span.textContent = word
      return index ? [' ', span] : [span]
    }))
    return [...target.querySelectorAll<HTMLElement>('.sticker-word')]
  }

  /** Ends the reading: all the words show as usual, and the speaker mark goes. */
  function endReading() {
    spoken?.groups.flat().forEach(word => word.classList.remove('is-now', 'is-later'))
    spoken = null
    toast.classList.remove('is-speaking')
    speaker.hidden = true
    speaker.classList.remove('is-talking')
  }

  function hideToast() {
    clearTimeout(toastTimer)
    toast.classList.add('is-leaving')
    toastTimer = window.setTimeout(() => { toast.hidden = true }, 600)
  }

  function showToast(id: StickerId, milestone: boolean, full: boolean, speaking: boolean) {
    const sticker = stickerById(id)
    endReading()
    toast.querySelector('.sticker-toast-art')!.innerHTML = worldPicture(worlds, id)
    toast.querySelector('small')!.textContent = full ? 'YOUR BOOK IS FULL' : milestone ? `${book.arrived.length} STICKERS!` : 'NEW STICKER'
    const words = [...fillWords(toast.querySelector('h2')!, sticker.name), ...fillWords(toast.querySelector('.sticker-toast-fact')!, sticker.fact)]
    // Each new sticker opens the next door. Earth is always open, so it needs no note.
    const next = nextDoor(book)
    toast.querySelector('.sticker-toast-next')!.textContent = next && next !== 'earth' ? 'A new world is waiting in Worlds!' : ''
    if (speaking) {
      // The voice says the name as one part, so all the words of the name light up together.
      const nameWords = sticker.name.split(' ').length
      spoken = { line: voiceLine(id), name: sticker.name, fact: sticker.fact.split(' '), groups: [words.slice(0, nameWords), ...words.slice(nameWords).map(word => [word])], times: null, lit: -1, said: -1 }
      words.forEach(word => word.classList.add('is-later'))
      toast.classList.add('is-speaking')
      speaker.hidden = false
    }
    toast.hidden = false
    toast.classList.remove('is-leaving')
    clearTimeout(toastTimer)
    // Long enough for a parent to read the fact aloud. The note stays while the voice reads it.
    const leave = () => { if (spoken && actions.voice.line === spoken.line) toastTimer = window.setTimeout(leave, 1500); else hideToast() }
    toastTimer = window.setTimeout(leave, 6500)
  }

  // After a reset, the world where the fairy is gives no sticker until she leaves it.
  let lastNear: StickerId | null = null, held: StickerId | null = null

  return {
    /**
     * Called on each frame with the flight panel's "near" test. The first arrival
     * at a world earns its sticker and opens it. Earth needs a return from space.
     */
    arrive(world: World, near: boolean) {
      const id = world.kind
      if (!near) { if (held === id) held = null; if (lastNear === id) lastNear = null; return false }
      lastNear = id
      if (held === id || !earnsSticker(id, world.visit)) return false
      const before = book.arrived.length, result = arrive(book, id)
      if (!result.earned.length) return false
      book = result.book
      changed()
      const milestone = reachesMilestone(before, book.arrived.length), full = book.arrived.length === STICKERS.length
      actions.chime(milestone || full)
      // The voice comes a moment after the chime. With the sound off, the note shows only the words.
      showToast(id, milestone, full, actions.voice.say(id, voiceDelay(milestone || full)))
      return true
    },
    /** Starts a new, empty book, and closes the worlds again. Settings asks for a confirmation first. */
    reset() {
      book = emptyBook()
      held = lastNear
      changed()
      clearTimeout(toastTimer)
      actions.voice.stop()
      endReading()
      toast.hidden = true
    },
    /**
     * Called on each frame. While the voice reads the note, the word that it says lights up.
     * A pause, a hidden page or the Sound switch stops the voice; then the note shows as usual.
     */
    update() {
      if (!spoken) return
      const voice = actions.voice
      if (voice.line !== spoken.line) { endReading(); return }
      if (!spoken.times && voice.duration > 0) spoken.times = wordTimes(spoken.name, spoken.fact, voice.duration)
      const times = spoken.times, time = times ? voice.time : -1
      const lit = times ? wordAt(times, time) : -1
      // The last word that the voice started: the words after it are still to come.
      const said = times ? times.findLastIndex(word => time >= word.start) : -1
      if (lit === spoken.lit && said === spoken.said) return
      spoken.lit = lit; spoken.said = said
      spoken.groups.forEach((group, index) => group.forEach(word => {
        word.classList.toggle('is-now', index === lit)
        word.classList.toggle('is-later', index > said)
      }))
      // The speaker mark moves while the voice says a word.
      speaker.classList.toggle('is-talking', lit >= 0)
    },
    /** Guided flights go only to the open worlds (canFly() in src/stickers.ts). */
    canFly: (id: StickerId) => canFly(book, id),
    /** Calls the listener after each new sticker and after a reset. */
    onChange(listener: () => void) { listeners.add(listener) },
    get count() { return book.arrived.length },
    get book() { return structuredClone(book) },
  }
}

export type StickerBook = ReturnType<typeof createStickerBook>
