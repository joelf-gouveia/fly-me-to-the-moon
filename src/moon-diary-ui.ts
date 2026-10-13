import { emptyDiary, isFull, loadDiary, lookStep, moonPlace, newLook, PLACE_LINES, saveDiary, see, shapeById, shapeIcon, SHAPES, shapeSeen } from './moon-diary'
import type { MoonPlace, MoonSight, ShapeId } from './moon-diary'
import './moon-diary.css'

type Actions = { chime: (full: boolean) => void }

/** The note of a new shape stays for this time of flight, as the note of a new sticker. */
const NOTE_SECONDS = 6.5

/**
 * F14 · The Moon shapes diary on the screen: the note of a new shape in the flight, and the diary
 * in Worlds, below the stickers. The rules and the saved diary are in src/moon-diary.ts.
 * Call it after createAdventure(), because the diary goes into the Worlds dialog.
 */
export function createMoonDiary(actions: Actions) {
  let diary = loadDiary()
  const look = newLook()
  // The shapes that wait for their note. A shape is saved at once, and its note comes when no other note shows.
  let waiting: ShapeId[] = [], noteTime = 0, chosen: ShapeId | null = null, current: ShapeId | null = null
  // The line of the diary says where the Moon is now.
  let place: MoonPlace = 'away'

  const host = document.createElement('div')
  host.className = 'moon-diary'
  host.innerHTML = `<div id="moon-toast" role="status" hidden><span class="moon-toast-art"></span><div><small></small><h2></h2><p></p></div></div>`
  document.querySelector('.game-shell')!.append(host)
  const toast = host.querySelector<HTMLElement>('#moon-toast')!
  const stickerToast = document.querySelector<HTMLElement>('#sticker-toast')

  // The diary in Worlds: a count next to the sticker count, and one place for each shape below the cards.
  const map = document.querySelector<HTMLDialogElement>('#world-map')!
  const count = document.createElement('p')
  count.id = 'moon-diary-count'
  map.querySelector('.sticker-progress')!.append(count)
  const book = document.createElement('section')
  book.className = 'moon-diary-book'
  book.setAttribute('aria-labelledby', 'moon-diary-title')
  book.innerHTML = `<h3 id="moon-diary-title">Moon diary</h3>
    <div class="moon-shapes">${SHAPES.map(shape => `<button type="button" class="moon-shape" data-shape="${shape.id}">${shapeIcon(shape.lit)}<strong>${shape.name}</strong></button>`).join('')}</div>
    <p id="moon-diary-line" aria-live="polite"></p>`
  map.querySelector('.book-cards')!.after(book)
  const places = [...book.querySelectorAll<HTMLButtonElement>('.moon-shape')]
  const line = book.querySelector<HTMLElement>('#moon-diary-line')!

  function render() {
    const seen = diary.seen.length
    count.innerHTML = `${shapeIcon(0.2)} ${seen} of ${SHAPES.length} Moon shapes`
    for (const place of places) {
      const shape = shapeById(place.dataset.shape as ShapeId), has = diary.seen.includes(shape.id)
      place.classList.toggle('is-seen', has)
      place.classList.toggle('is-chosen', shape.id === chosen)
      place.ariaLabel = `${shape.name}: ${has ? 'in your diary' : 'not seen yet'}`
    }
    // A tap on a place gives its line, or the hint of an empty place.
    const shape = chosen && shapeById(chosen)
    line.textContent = shape ? diary.seen.includes(shape.id) ? `${shape.name}. ${shape.line}` : shape.hint
      : isFull(diary) ? 'You saw every shape of the Moon!' : PLACE_LINES[place]
  }
  for (const place of places) place.onclick = () => { chosen = place.dataset.shape as ShapeId; render() }
  // Worlds opens with no place chosen.
  map.addEventListener('close', () => { chosen = null; render() })
  render()

  function hideNote() { toast.hidden = true; noteTime = 0 }
  function showNote(id: ShapeId) {
    const shape = shapeById(id), full = isFull(diary) && !waiting.length
    toast.querySelector('.moon-toast-art')!.innerHTML = shapeIcon(shape.lit)
    toast.querySelector('small')!.textContent = full ? 'YOUR MOON DIARY IS FULL' : 'NEW MOON SHAPE'
    toast.querySelector('h2')!.textContent = shape.name
    toast.querySelector('p')!.textContent = shape.line
    toast.classList.remove('is-leaving')
    toast.hidden = false
    noteTime = NOTE_SECONDS
    actions.chime(full)
  }

  return {
    /**
     * Called on each frame, after the camera moves. `delta` is the flight time of the frame, and `flying`
     * is false behind Worlds, Settings, the menu or the pause: a shape counts only in flight.
     */
    update(sight: MoonSight, delta: number, flying: boolean) {
      current = shapeSeen(sight)
      if (moonPlace(sight) !== place) { place = moonPlace(sight); render() }
      // The note of a new sticker comes first, and Worlds shows the diary itself.
      const other = !!stickerToast && !stickerToast.hidden
      if (!toast.hidden && (other || map.open)) hideNote()
      if (!flying) return
      const seen = lookStep(look, current, delta)
      if (seen) {
        const result = see(diary, seen)
        if (result.isNew) { diary = result.diary; saveDiary(diary); waiting.push(seen); render() }
      }
      if (!toast.hidden) {
        noteTime -= delta
        toast.classList.toggle('is-leaving', noteTime < 0.6)
        if (noteTime <= 0) hideNote()
      } else if (waiting.length && !other) showNote(waiting.shift()!)
    },
    /** An empty diary. Reset sticker book of Settings calls it. */
    reset() {
      diary = emptyDiary()
      saveDiary(diary)
      waiting = []; chosen = null
      Object.assign(look, newLook())
      hideNote()
      render()
    },
    /** True while the note of a new shape shows, or waits. The note of a search star waits for it. */
    get busy() { return !toast.hidden || waiting.length > 0 },
    get count() { return diary.seen.length },
    /** For the browser check. */
    get state() { return { seen: [...diary.seen], shape: current, look: look.time, note: toast.hidden ? null : toast.querySelector('h2')!.textContent, waiting: [...waiting] } },
  }
}

export type MoonDiary = ReturnType<typeof createMoonDiary>
