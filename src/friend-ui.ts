import * as THREE from 'three'
import { chooseFriend, createFriend, emptyFriend, FRIEND_KINDS, friendFlies, friendName, friendPicture, friendPlace, friendSize, hasFriendGift, isFriendKind, parseFriend, sayHello } from './friend'
import type { FriendGround, FriendKind, FriendState } from './friend'
import './friend.css'

const STORAGE_KEY = 'fairy-friend'

type Options = {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  /** The soft disc of the fairy dust. */
  sparkle: THREE.Texture
  /** The Friend row of the look menu: a fieldset that this file fills. */
  row: HTMLElement
  /** The chime of the moment when the friend comes. */
  chime: () => void
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
  /** The fairy flies: no dialog and no pause. The note of the new friend comes only then. */
  flying: boolean
  /** Reduced motion. */
  still: boolean
  fast: boolean
  light: number
}

/**
 * The fairy friend in the game (F19): the saved state, the friend in the scene, the note of the
 * new friend, and the Friend row of the look menu. The rules are in src/friend.ts.
 */
export function createFairyFriend({ scene, renderer, sparkle, row, chime }: Options) {
  let state: FriendState = emptyFriend()
  try { state = parseFriend(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) } catch { /* A friend for this visit still works. */ }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* Keep the friend for this visit. */ } }
  const friend = createFriend(scene, sparkle)
  const place = new THREE.Vector3(), onScreen = new THREE.Vector3()
  // The largest distance from the friend to the fairy since the last info(), for the browser checks.
  let farthest = 0
  const pictures = new Map<FriendKind, string>()
  const picture = (kind: FriendKind) => {
    if (!pictures.has(kind)) pictures.set(kind, friendPicture(renderer, kind))
    return pictures.get(kind)!
  }

  // The note of the new friend, in the look of the new-sticker note. It has a picture, the name and one short line.
  const note = document.createElement('div')
  note.id = 'friend-note'
  note.setAttribute('role', 'status')
  note.hidden = true
  note.innerHTML = '<img alt=""><div><small>A NEW FRIEND</small><h2></h2><p>A friend flies with you now</p></div>'
  document.querySelector('.game-shell')!.append(note)
  let noteTimer = 0, pending: FriendKind | null = null
  function showNote(kind: FriendKind) {
    note.querySelector('img')!.src = picture(kind)
    note.querySelector('h2')!.textContent = friendName(kind)
    note.hidden = false
    note.classList.remove('is-leaving')
    clearTimeout(noteTimer)
    noteTimer = window.setTimeout(() => { note.classList.add('is-leaving'); noteTimer = window.setTimeout(() => { note.hidden = true }, 600) }, 6000)
  }
  /** True while a different note shows: a new sticker, the home card, or the note of a new landscape. The last two are at the place of this note. */
  function otherNote() {
    const shown = (id: string) => { const element = document.getElementById(id); return Boolean(element) && !element!.hidden }
    return shown('sticker-toast') || shown('home-celebration') || Boolean(document.getElementById('arrival-note')?.classList.contains('is-visible'))
  }
  function hideNote() {
    pending = null
    clearTimeout(noteTimer)
    note.hidden = true
  }

  // The Friend row: one picture button for each kind that she met, and "No friend". It shows after the friend came.
  row.innerHTML = '<legend>Friend</legend><div class="option-grid friend-grid"></div>'
  const grid = row.querySelector<HTMLElement>('.friend-grid')!
  function markRow() {
    grid.querySelectorAll<HTMLButtonElement>('[data-friend]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.friend === (state.friend ?? 'none')))
    })
  }
  function renderRow() {
    row.hidden = !hasFriendGift(state)
    if (row.hidden) { grid.replaceChildren(); return }
    const met = FRIEND_KINDS.filter(kind => state.met.includes(kind))
    grid.innerHTML = met.map(kind => `
      <button type="button" data-friend="${kind}" aria-pressed="false">
        <img class="friend-preview" src="${picture(kind)}" alt="">
        <span>${friendName(kind)}</span>
      </button>`).join('') + `
      <button type="button" data-friend="none" aria-pressed="false">
        <span class="friend-preview friend-preview--none" aria-hidden="true"></span>
        <span>No friend</span>
      </button>` + (met.length < FRIEND_KINDS.length ? `
      <div class="friend-more" title="Say hello to a new creature to meet a new friend">
        <span class="friend-preview friend-preview--more" aria-hidden="true">?</span>
        <span>Say hello</span>
      </div>` : '')
    markRow()
  }
  function choose(kind: FriendKind | null) {
    const next = chooseFriend(state, kind)
    if (next === state) return false
    state = next
    save()
    friend.setKind(state.friend)
    markRow()
    return true
  }
  grid.addEventListener('click', event => {
    const value = (event.target as Element).closest<HTMLButtonElement>('[data-friend]')?.dataset.friend
    if (value === 'none') choose(null)
    else if (isFriendKind(value)) choose(value)
  })

  friend.setKind(hasFriendGift(state) ? state.friend : null, false)
  renderRow()

  return {
    /** The kinds of the creatures that said hello in this frame. The fifth hello brings the friend. */
    hello(kinds: readonly unknown[], still = false) {
      const result = sayHello(state, kinds)
      if (result.state.hellos === state.hellos && !result.fresh.length) {
        // A hello makes the friend happy.
        friend.cheer(still)
        return
      }
      state = result.state
      save()
      renderRow()
      if (result.gift) {
        pending = result.gift
        friend.setKind(state.friend)
        friend.cheer(still, true)
        chime()
      } else friend.cheer(still)
    },
    /** A happy loop, for a sparkle ring or a new sticker. Not more often than each 20 s. */
    cheer: (still: boolean) => friend.cheer(still),
    /** The bubble and the dust take the sparkle colour of the look. */
    setColour: (colour: number) => friend.setColour(colour),
    /** Selects a friend that she met, or null for no friend. */
    choose,
    /** Removes the friend, the kinds that she met and the count of the hellos. Settings calls it with the reset of the sticker book. */
    reset() {
      state = emptyFriend()
      save()
      hideNote()
      friend.setKind(null)
      renderRow()
    },
    update(frame: FriendUpdate) {
      // The note waits for the flight and for the end of a different note, so each note has its time.
      if (pending && frame.flying && !otherNote()) { showNote(pending); pending = null }
      // A delta of 0 (a pause, or Worlds, where the worlds still move) holds the pose of the friend and keeps it with her.
      friendPlace(frame.aspect, frame.menu, place)
      friend.update({ ...frame, place, size: friendSize(frame.aspect, frame.menu) })
      if (friend.kind) farthest = Math.max(farthest, friend.holder.position.distanceTo(frame.fairy))
    },
    /** The friend in the scene. A browser check hides it to count its draw calls. */
    holder: friend.holder,
    /** True when the game has a friend, a met kind or a counted hello: Settings can remove it. */
    get has() { return state.hellos > 0 },
    /** True while the note of the new friend shows or waits. A search star waits for it. */
    get noteShown() { return !note.hidden || pending !== null },
    /** The state, for the browser checks. */
    info(fairy: THREE.Vector3, camera: THREE.Camera) {
      const far = farthest
      farthest = 0
      return {
        farthest: far, screen: onScreen.copy(friend.holder.position).project(camera).toArray(),
        hellos: state.hellos, met: [...state.met], friend: state.friend, gift: hasFriendGift(state),
        shown: friend.holder.visible, kind: friend.kind, flies: friend.kind ? friendFlies(friend.kind) : null, calls: friend.calls,
        position: friend.holder.position.toArray(), distance: friend.holder.position.distanceTo(fairy), scale: friend.holder.scale.x,
        loop: friend.follow.loop, note: !note.hidden, noteName: note.querySelector('h2')!.textContent,
        row: !row.hidden, buttons: [...grid.querySelectorAll<HTMLElement>('[data-friend]')].map(button => button.dataset.friend),
        more: Boolean(grid.querySelector('.friend-more')),
      }
    },
  }
}

export type FairyFriend = ReturnType<typeof createFairyFriend>
