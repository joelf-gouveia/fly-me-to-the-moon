import * as THREE from 'three'
import type { World } from './worlds'
import { arrive, canFly, earnsSticker, emptyBook, find, nextDoor, parseBook, reachesMilestone, searching, stickerById, STICKERS } from './stickers'
import type { Book, StickerId } from './stickers'
import './sticker-book.css'

type Actions = { chime: (milestone: boolean) => void; searchChime: () => void }

const STORAGE_KEY = 'fairy-sticker-book'

/** A five-point star as an SVG path, in a 24 × 24 box. */
const starPath = `M${Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.9 : 11.2
  return `${(12 + Math.cos(angle) * r).toFixed(2)} ${(12.6 + Math.sin(angle) * r).toFixed(2)}`
}).join('L')}Z`
/** The search star on a sticker picture: gold when found, a dashed outline while the search waits. */
const BADGES = {
  found: `<svg viewBox="0 0 24 24"><path d="${starPath}" fill="#ffd24a" stroke="#c47a0c" stroke-width="1" stroke-linejoin="round"/></svg>`,
  waiting: `<svg viewBox="0 0 24 24"><path d="${starPath}" fill="#fff8" stroke="#c9779f" stroke-width="1.4" stroke-dasharray="2.2 1.6" stroke-linejoin="round"/></svg>`,
}
export type StarBadge = keyof typeof BADGES | null

/** The picture of a world, as in Worlds: Blossom Haven has its flower, Earth its sea. `star` adds the search star. */
export function worldPicture(worlds: World[], id: StickerId, star: StarBadge = null) {
  const colour = `#${new THREE.Color(worlds.find(world => world.kind === id)!.color).getHexString()}`
  const badge = star ? `<span class="search-badge is-${star}">${BADGES[star]}</span>` : ''
  return `<span class="planet-picture ${id}" style="--planet-color:${colour}" aria-hidden="true">${id === 'fairy' ? '✿' : id === 'earth' ? '≈' : ''}${badge}</span>`
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
  host.innerHTML = `<div id="sticker-toast" role="status" hidden><span class="sticker-toast-art"></span><div><small></small><h2></h2><p class="sticker-toast-fact"></p><p class="sticker-toast-task"></p><p class="sticker-toast-next"></p></div></div>`
  document.querySelector('.game-shell')!.append(host)
  const toast = host.querySelector<HTMLElement>('#sticker-toast')!
  let toastTimer = 0

  /** The note of a new sticker, with its search task, or of a search star, with its found line. */
  function showToast(id: StickerId, milestone: boolean, full: boolean, star = false) {
    const sticker = stickerById(id)
    toast.querySelector('.sticker-toast-art')!.innerHTML = worldPicture(worlds, id, star ? 'found' : null)
    toast.querySelector('small')!.textContent = star ? 'SEARCH STAR' : full ? 'YOUR BOOK IS FULL' : milestone ? `${book.arrived.length} STICKERS!` : 'NEW STICKER'
    toast.querySelector('h2')!.textContent = sticker.name
    toast.querySelector('.sticker-toast-fact')!.textContent = star ? sticker.search.found : sticker.fact
    // After the hello sticker, the note gives the search task of the world.
    toast.querySelector('.sticker-toast-task')!.innerHTML = star ? '' : `<span aria-hidden="true">☆</span> ${sticker.search.task}`
    // Each new sticker opens the next door. Earth is always open, so it needs no note. A search star opens nothing.
    const next = nextDoor(book)
    toast.querySelector('.sticker-toast-next')!.textContent = !star && next && next !== 'earth' ? 'A new world is waiting in Worlds!' : ''
    toast.classList.toggle('is-search', star)
    toast.hidden = false
    toast.classList.remove('is-leaving')
    clearTimeout(toastTimer)
    // Long enough for a parent to read the fact aloud.
    toastTimer = window.setTimeout(() => { toast.classList.add('is-leaving'); toastTimer = window.setTimeout(() => { toast.hidden = true }, 600) }, 6500)
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
      showToast(id, milestone, full)
      actions.chime(milestone || full)
      return true
    },
    /**
     * True while the world waits for its search star. A find also waits until the last note is
     * gone, so each note has its time, and the star never comes in the same moment as the hello.
     */
    searching: (id: StickerId) => searching(book, id) && toast.hidden,
    /** The fairy did the search task of the world: save the star, show the note and play the chime. */
    find(id: StickerId) {
      const result = find(book, id)
      if (!result.earned.length) return false
      book = result.book
      changed()
      showToast(id, false, false, true)
      actions.searchChime()
      return true
    },
    /** Starts a new, empty book, and closes the worlds again. The search stars go too. Settings asks for a confirmation first. */
    reset() {
      book = emptyBook()
      held = lastNear
      changed()
      clearTimeout(toastTimer)
      toast.hidden = true
    },
    /** Guided flights go only to the open worlds (canFly() in src/stickers.ts). */
    canFly: (id: StickerId) => canFly(book, id),
    /** Calls the listener after each new sticker and after a reset. */
    onChange(listener: () => void) { listeners.add(listener) },
    get count() { return book.arrived.length },
    get stars() { return book.found.length },
    get book() { return structuredClone(book) },
  }
}

export type StickerBook = ReturnType<typeof createStickerBook>
