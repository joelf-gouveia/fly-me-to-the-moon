import * as THREE from 'three'
import { chooseFriend, createFriend, emptyFriend, friendFlies, friendName, friendPicture, friendPlace, friendSize, hasFriendGift, helloNotes, parseFriend } from './friend'
import type { FriendGround, FriendKind, FriendNote, FriendState, PictureLook } from './friend'
import { ANIMAL_CARDS, factIcon, heartsHtml } from './animal-book'
import './friend.css'

const STORAGE_KEY = 'fairy-friend'

/** The chimes of the friend: the note of a new card, the gift note, and a new friend at its place after "Fly with me". */
export type FriendMoment = 'card' | 'gift' | 'arrive'

type Options = {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  /** The soft disc of the fairy dust. */
  sparkle: THREE.Texture
  chime: (moment: FriendMoment) => void
}

export type FriendUpdate = {
  fairy: THREE.Vector3
  heading: THREE.Quaternion
  /** The time of this frame for the friend: the time of the flight, or the real time while the look menu is open. 0 holds the friend. */
  delta: number
  carry: THREE.Vector3 | null
  ground: FriendGround | null
  camera: THREE.Vector3
  /** The width of the view divided by its height. */
  aspect: number
  /** The look menu is open. */
  menu: boolean
  /** The fairy flies: no dialog and no pause. The notes show only then, and their time runs only then. */
  flying: boolean
  /** Reduced motion. */
  still: boolean
  fast: boolean
  light: number
}

/** The note of a new card stays for this time of flight, and the gift note for this time. The last 0.6 s is the fade. */
const NOTE_SECONDS = { card: 4, gift: 6 }
const FADE = 0.6
/** The size of a picture of a card or of a note, in pixels: a card shows it at about 56 px, on a screen with two pixels for each point. */
const PICTURE = 128
/** The other notes of the flight: the new sticker and the search star, the home card, a new landscape, the Moon note and the thermometer note. */
const OTHER_NOTES = ['sticker-toast', 'home-celebration', 'moon-toast', 'warmth-note']

/**
 * The fairy friend in the game (F19, with the animal book of docs/friend-book-study.md): the saved
 * state, the friend in the scene, the notes of the flight, and the swap of a friend. The rules are
 * in src/friend.ts. The Animals page of Worlds is in src/animal-book-ui.ts.
 */
export function createFairyFriend({ scene, renderer, sparkle, chime }: Options) {
  let state: FriendState = emptyFriend()
  try { state = parseFriend(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) } catch { /* A friend for this visit still works. */ }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* Keep the friend for this visit. */ } }
  const listeners = new Set<() => void>()
  const changed = () => { save(); listeners.forEach(listener => listener()) }
  const friend = createFriend(scene, sparkle)
  const place = new THREE.Vector3(), onScreen = new THREE.Vector3()
  // The largest distance from the friend to the fairy since the last info(), for the browser checks.
  let farthest = 0
  const pictures = new Map<string, string>()
  /** A picture of a kind from its model (friendPicture()). Each picture renders once, when the game needs it. */
  const picture = (kind: FriendKind, look: PictureLook = 'clear') => {
    const key = `${kind}:${look}`
    if (!pictures.has(key)) pictures.set(key, friendPicture(renderer, kind, PICTURE, look))
    return pictures.get(key)!
  }

  // The note of a new card and the gift note, in the look of the new-sticker note: a picture, the name, and the hearts before the gift.
  const note = document.createElement('div')
  note.id = 'friend-note'
  note.setAttribute('role', 'status')
  note.hidden = true
  note.innerHTML = '<img alt=""><div><small></small><h2></h2><span class="friend-note-facts"></span><p></p><span class="friend-hearts" role="img"></span></div>'
  document.querySelector('.game-shell')!.append(note)
  const hearts = note.querySelector<HTMLElement>('.friend-hearts')!
  // The notes wait for each other: one shows, and the others wait in the order of their hellos.
  let queue: FriendNote[] = [], shown: FriendNote | null = null, left = 0
  // The arrival of the first friend comes with the gift note and its chime, so it has no chime of its own.
  let quietArrival = false

  function showNote(next: FriendNote, still: boolean) {
    shown = next
    left = next.gift ? NOTE_SECONDS.gift : NOTE_SECONDS.card
    const card = ANIMAL_CARDS[next.kind]
    note.querySelector('img')!.src = picture(next.kind)
    note.classList.toggle('is-story', card.world === 'fairy')
    note.classList.toggle('is-gift', next.gift)
    note.querySelector('small')!.textContent = next.gift ? 'A NEW FRIEND' : 'NEW IN YOUR ANIMAL BOOK'
    note.querySelector('h2')!.textContent = friendName(next.kind)
    note.querySelector('.friend-note-facts')!.innerHTML = next.gift ? '' : card.facts.map(([icon]) => factIcon(icon)).join('')
    note.querySelector('p')!.textContent = next.gift ? 'A friend flies with you now' : ''
    // The hearts count the hellos to the gift. The heart of this hello swells.
    hearts.hidden = next.hearts === null
    hearts.innerHTML = next.hearts === null ? '' : heartsHtml(next.hearts, true)
    hearts.ariaLabel = next.hearts === null ? null : `${next.hearts} of 5 hearts`
    note.classList.remove('is-leaving')
    note.hidden = false
    // The first friend comes out of the sky with its note.
    if (next.gift) {
      if (still) friend.setKind(state.friend, false)
      else quietArrival = friend.swap(state.friend)
    }
    chime(next.gift ? 'gift' : 'card')
  }
  function hideNote() {
    queue = []; shown = null
    note.hidden = true
  }
  /** True while a different note shows. The note of a new landscape shows at the place of this note. */
  function otherNote() {
    return OTHER_NOTES.some(id => { const element = document.getElementById(id); return Boolean(element) && !element!.hidden })
      || Boolean(document.getElementById('arrival-note')?.classList.contains('is-visible'))
  }

  /**
   * Selects a friend that she met, or null for no friend. The old friend waves and flies home, and
   * the new one comes out of the sky. With reduced motion the change is at once.
   */
  function choose(kind: FriendKind | null, still = false) {
    const next = chooseFriend(state, kind)
    if (next === state || next.friend === state.friend) return false
    state = next
    changed()
    if (still) friend.setKind(state.friend, false)
    else { friend.swap(state.friend); quietArrival = false }
    return true
  }

  friend.setKind(hasFriendGift(state) ? state.friend : null, false)

  return {
    /**
     * The kinds of the creatures that said hello in this frame. The first hello of a kind puts its
     * card in the book and shows its note; the fifth hello brings the friend. `quiet` (the dev
     * address ?friend=all) shows no note, and the friend is there at once.
     */
    hello(kinds: readonly unknown[], still = false, quiet = false) {
      const result = helloNotes(state, kinds)
      if (result.state.hellos === state.hellos && result.state.met.length === state.met.length) {
        // A hello makes the friend happy.
        friend.cheer(still)
        return
      }
      state = result.state
      changed()
      if (quiet) { hideNote(); friend.setKind(hasFriendGift(state) ? state.friend : null, false); return }
      queue.push(...result.notes)
      friend.cheer(still)
    },
    /** A happy loop, for a sparkle ring or a new sticker. Not more often than each 20 s. */
    cheer: (still: boolean) => friend.cheer(still),
    /** The bubble and the dust take the sparkle colour of the look. */
    setColour: (colour: number) => friend.setColour(colour),
    choose,
    /** A picture of a kind for a card or a note: 'clear' or 'shadow'. */
    picture,
    /** True when the picture is ready, with no render. */
    hasPicture: (kind: FriendKind, look: PictureLook = 'clear') => pictures.has(`${kind}:${look}`),
    /** Calls the listener after each change of the book or of the friend, and after a reset. */
    onChange(listener: () => void) { listeners.add(listener) },
    get state(): FriendState { return { ...state, met: [...state.met] } },
    /** Removes the friend, the kinds that she met and the count of the hellos. Settings calls it with the reset of the sticker book. */
    reset() {
      state = emptyFriend()
      changed()
      hideNote()
      friend.setKind(null)
    },
    update(frame: FriendUpdate) {
      // A note waits for the flight and for the end of a different note, and its time runs only then.
      const other = otherNote()
      if (shown) {
        note.hidden = other
        if (frame.flying && !other) {
          left -= frame.delta
          note.classList.toggle('is-leaving', left < FADE)
          if (left <= 0) { shown = null; note.hidden = true }
        }
      }
      if (!shown && queue.length && frame.flying && !other) showNote(queue.shift()!, frame.still)
      // A delta of 0 (a pause, or Worlds, where the worlds still move) holds the pose of the friend and keeps it with her.
      friendPlace(frame.aspect, frame.menu, place)
      if (friend.update({ ...frame, place, size: friendSize(frame.aspect, frame.menu) })) {
        if (!quietArrival) chime('arrive')
        quietArrival = false
      }
      // A friend that comes from the sky is far on purpose, so it does not count.
      if (friend.kind && friend.holder.visible && !friend.swapping) farthest = Math.max(farthest, friend.holder.position.distanceTo(frame.fairy))
    },
    /** The friends in the scene. A browser check hides them to count their draw calls. */
    group: friend.group,
    /** True when the game has a friend, a met kind or a counted hello: Settings can remove it. */
    get has() { return state.hellos > 0 },
    /** True while a note of the friend shows or waits. A search star waits for it. */
    get noteShown() { return !note.hidden || shown !== null || queue.length > 0 },
    /** True while a note of the friend is on the screen. The Moon note and the thermometer note wait for it. */
    get noteVisible() { return !note.hidden },
    /** The state, for the browser checks. */
    info(fairy: THREE.Vector3, camera: THREE.Camera) {
      const far = farthest
      farthest = 0
      return {
        farthest: far, screen: onScreen.copy(friend.holder.position).project(camera).toArray(),
        hellos: state.hellos, met: [...state.met], friend: state.friend, gift: hasFriendGift(state),
        shown: friend.holder.visible, kind: friend.kind, leaving: friend.leaving, swapping: friend.swapping,
        flies: friend.kind ? friendFlies(friend.kind) : null, calls: friend.calls,
        position: friend.holder.position.toArray(), distance: friend.holder.position.distanceTo(fairy), scale: friend.holder.scale.x,
        loop: friend.follow.loop, note: !note.hidden, noteName: note.querySelector('h2')!.textContent,
        noteLabel: note.querySelector('small')!.textContent, noteHearts: hearts.hidden ? null : hearts.querySelectorAll('.is-full').length,
        waiting: queue.map(item => `${item.gift ? 'gift' : 'card'}:${item.kind}`),
        // True while a note shows, waits behind a different note, or waits in the queue: a search star waits for it.
        busy: !note.hidden || shown !== null || queue.length > 0,
      }
    },
  }
}

export type FairyFriend = ReturnType<typeof createFairyFriend>
