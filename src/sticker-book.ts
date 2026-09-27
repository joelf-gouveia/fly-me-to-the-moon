import * as THREE from 'three'
import { createElement, Sticker } from 'lucide'
import type { World } from './worlds'
import { arrive, earnsSticker, emptyBook, MILESTONE, parseBook, reachesMilestone, stickerById, STICKERS, suggestNext } from './stickers'
import type { Book, StickerId } from './stickers'
import './sticker-book.css'

type Actions = { open: (open: boolean) => void; travel: (world: World) => void; chime: (milestone: boolean) => void }

const STORAGE_KEY = 'fairy-sticker-book'
/** English says "the Sun" and "the Moon", but "Mars". */
const EARTH_NOTE = 'Fly out to space, then come back to Earth to get this sticker.'
const called = (id: StickerId) => stickerById(id).the ? `the ${stickerById(id).name}` : stickerById(id).name

/** The toolbar button, the book dialog and the new-sticker note. Option A of docs/sticker-book-study.md. */
export function createStickerBook(worlds: World[], actions: Actions) {
  let book: Book = emptyBook()
  try { book = parseBook(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) } catch { /* A session-only book still works. */ }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(book)) } catch { /* Keep the book for this visit. */ } }
  const worldOf = (id: StickerId) => worlds.find(world => world.kind === id)!
  const colour = (id: StickerId) => `#${new THREE.Color(worldOf(id).color).getHexString()}`
  const picture = (id: StickerId) => `<span class="planet-picture ${id}" style="--planet-color:${colour(id)}" aria-hidden="true">${id === 'fairy' ? '✿' : id === 'earth' ? '≈' : ''}</span>`

  const button = document.createElement('button')
  Object.assign(button, { id: 'stickers-toggle', type: 'button', className: 'icon-button' })
  button.setAttribute('aria-haspopup', 'dialog')
  button.append(createElement(Sticker))
  document.querySelector('#customize-toggle')!.after(button)

  const host = document.createElement('div')
  host.className = 'sticker-book'
  host.innerHTML = `
    <dialog id="sticker-book" aria-labelledby="sticker-book-title">
      <header><div><p class="eyebrow">YOUR STICKERS</p><h2 id="sticker-book-title">My space stickers</h2></div><button id="close-stickers" type="button" aria-label="Close sticker book">×</button></header>
      <div class="sticker-progress"><div class="sticker-dots" role="img"></div><p id="sticker-count"></p></div>
      <div class="sticker-note" aria-live="polite"><p id="sticker-note-text"></p><button id="sticker-fly" type="button" hidden>Fly there ↗</button></div>
      <div class="sticker-grid">${STICKERS.map((sticker, index) => `<button type="button" class="sticker-slot" data-sticker="${sticker.id}" style="--tilt:${(index * 37 % 9) - 4}deg">${picture(sticker.id)}<span>${sticker.name}</span></button>`).join('')}</div>
    </dialog>
    <div id="sticker-toast" role="status" hidden><span class="sticker-toast-art"></span><div><small></small><h2></h2><p></p></div></div>`
  document.querySelector('.game-shell')!.append(host)
  const get = <T extends HTMLElement>(id: string) => host.querySelector<T>(`#${id}`)!
  const dialog = get<HTMLDialogElement>('sticker-book'), toast = get('sticker-toast'), fly = get<HTMLButtonElement>('sticker-fly')
  let flyTo: StickerId | null = null, toastTimer = 0

  function note(text: string, target: StickerId | null) {
    get('sticker-note-text').textContent = text
    flyTo = target
    fly.hidden = !target
  }
  /** The nearest empty space. The fairy starts on Earth, so Earth comes last. */
  function suggestion() {
    const hasEarth = book.arrived.includes('earth')
    return suggestNext(hasEarth ? book : { ...book, arrived: [...book.arrived, 'earth'] }, book.arrived.at(-1) ?? 'earth') ?? (hasEarth ? null : stickerById('earth'))
  }
  function nextNote() {
    const next = suggestion()
    if (!next) note('Your book is full! You are a space explorer!', null)
    else if (next.id === 'earth') note(EARTH_NOTE, null)
    else note(`Next: ${called(next.id)} is waiting. Fly there to get its sticker.`, next.id)
  }
  function render() {
    const earned = book.arrived.length, total = STICKERS.length
    host.querySelector('.sticker-dots')!.innerHTML = STICKERS.map((_, i) => `<i class="${i < earned ? 'on' : ''} ${(i + 1) % MILESTONE === 0 ? 'milestone' : ''}"></i>`).join('')
    host.querySelector('.sticker-dots')!.setAttribute('aria-label', `${earned} of ${total} stickers`)
    get('sticker-count').textContent = `${earned} of ${total} stickers`
    host.querySelectorAll<HTMLButtonElement>('[data-sticker]').forEach(slot => {
      const id = slot.dataset.sticker as StickerId, has = book.arrived.includes(id)
      slot.classList.toggle('is-earned', has)
      slot.setAttribute('aria-label', has ? `${stickerById(id).name} sticker. Show its fact.` : `Empty space for ${stickerById(id).name}`)
    })
    button.ariaLabel = `Open your sticker book: ${earned} of ${total} stickers`
    button.title = `Stickers: ${earned} of ${total}`
    // The Worlds dialog marks each world that has a sticker.
    document.querySelectorAll<HTMLElement>('.world-picture[data-world]').forEach(picture => {
      const has = book.arrived.includes(picture.dataset.world as StickerId)
      picture.classList.toggle('has-sticker', has)
      if (has) picture.setAttribute('aria-description', 'You have its sticker')
      else picture.removeAttribute('aria-description')
    })
  }

  // The dialog fires "close" later, as a task, so a close from the book tells the game at once.
  // The "close" event still covers Escape.
  let shown = false
  function closed() {
    if (!shown) return
    shown = false
    button.classList.remove('is-active')
    actions.open(false)
  }
  function setOpen(open: boolean) {
    if (open === dialog.open) return
    if (open) {
      render(); nextNote(); dialog.showModal(); get('close-stickers').focus()
      shown = true
      button.classList.add('is-active')
      actions.open(true)
    } else { dialog.close(); closed() }
  }
  dialog.addEventListener('close', closed)
  button.addEventListener('click', () => setOpen(true))
  get('close-stickers').addEventListener('click', () => setOpen(false))
  // A press that starts and ends outside the book closes it, as the flight menu does.
  let backdropPress = false
  const outside = (event: MouseEvent) => { const box = dialog.getBoundingClientRect(); return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom }
  dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog && outside(event) })
  dialog.addEventListener('click', event => {
    const slot = (event.target as Element).closest<HTMLElement>('[data-sticker]')
    if (slot) {
      const id = slot.dataset.sticker as StickerId
      if (book.arrived.includes(id)) note(stickerById(id).fact, null)
      else if (id === 'earth') note(EARTH_NOTE, null)
      else note(`Fly to ${called(id)} to get this sticker.`, id)
    } else if (event.target === dialog && backdropPress && outside(event)) setOpen(false)
    backdropPress = false
  })
  fly.addEventListener('click', () => {
    if (!flyTo) return
    const world = worldOf(flyTo)
    setOpen(false)
    actions.travel(world)
  })

  function showToast(id: StickerId, milestone: boolean, full: boolean) {
    toast.querySelector('.sticker-toast-art')!.innerHTML = picture(id)
    toast.querySelector('small')!.textContent = full ? 'YOUR BOOK IS FULL' : milestone ? `${book.arrived.length} STICKERS!` : 'NEW STICKER'
    toast.querySelector('h2')!.textContent = stickerById(id).name
    toast.querySelector('p')!.textContent = stickerById(id).fact
    toast.hidden = false
    toast.classList.remove('is-leaving')
    clearTimeout(toastTimer)
    // Long enough for a parent to read the fact aloud.
    toastTimer = window.setTimeout(() => { toast.classList.add('is-leaving'); toastTimer = window.setTimeout(() => { toast.hidden = true }, 600) }, 6500)
  }

  // After a reset, the world where the fairy is gives no sticker until she leaves it.
  let lastNear: StickerId | null = null, held: StickerId | null = null

  render()
  return {
    /**
     * Called on each frame with the flight panel's "near" test. The first arrival
     * at a world earns its sticker. Earth needs a return from space.
     */
    arrive(world: World, near: boolean) {
      const id = world.kind
      if (!near) { if (held === id) held = null; if (lastNear === id) lastNear = null; return false }
      lastNear = id
      if (held === id || !earnsSticker(id, world.visit)) return false
      const before = book.arrived.length, result = arrive(book, id)
      if (!result.earned.length) return false
      book = result.book
      save(); render()
      const milestone = reachesMilestone(before, book.arrived.length), full = book.arrived.length === STICKERS.length
      showToast(id, milestone, full)
      actions.chime(milestone || full)
      return true
    },
    /** Starts a new, empty book. Settings asks for a confirmation first. */
    reset() {
      book = emptyBook()
      held = lastNear
      save(); render()
      clearTimeout(toastTimer)
      toast.hidden = true
    },
    get count() { return book.arrived.length },
    close: () => setOpen(false),
    get isOpen() { return dialog.open },
    get book() { return structuredClone(book) },
  }
}
