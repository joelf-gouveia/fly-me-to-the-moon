import * as THREE from 'three'
import type { World } from './worlds'
import { arrive, canFly, earnsSticker, emptyBook, nextDoor, parseBook, reachesMilestone, stickerById, STICKERS } from './stickers'
import type { Book, StickerId } from './stickers'
import './sticker-book.css'

type Actions = { chime: (milestone: boolean) => void }

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
  host.innerHTML = `<div id="sticker-toast" role="status" hidden><span class="sticker-toast-art"></span><div><small></small><h2></h2><p></p><p class="sticker-toast-next"></p></div></div>`
  document.querySelector('.game-shell')!.append(host)
  const toast = host.querySelector<HTMLElement>('#sticker-toast')!
  let toastTimer = 0

  function showToast(id: StickerId, milestone: boolean, full: boolean) {
    toast.querySelector('.sticker-toast-art')!.innerHTML = worldPicture(worlds, id)
    toast.querySelector('small')!.textContent = full ? 'YOUR BOOK IS FULL' : milestone ? `${book.arrived.length} STICKERS!` : 'NEW STICKER'
    toast.querySelector('h2')!.textContent = stickerById(id).name
    toast.querySelector('p')!.textContent = stickerById(id).fact
    // Each new sticker opens the next door. Earth is always open, so it needs no note.
    const next = nextDoor(book)
    toast.querySelector('.sticker-toast-next')!.textContent = next && next !== 'earth' ? 'A new world is waiting in Worlds!' : ''
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
    /** Starts a new, empty book, and closes the worlds again. Settings asks for a confirmation first. */
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
    get book() { return structuredClone(book) },
  }
}

export type StickerBook = ReturnType<typeof createStickerBook>
