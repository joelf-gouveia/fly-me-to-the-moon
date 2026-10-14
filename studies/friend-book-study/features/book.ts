import * as THREE from 'three'
import type { World } from '../../../src/worlds'
import { worldPicture } from '../../../src/sticker-book'
import { BOOK_ORDER, stickerById, STICKERS } from '../../../src/stickers'
import type { StickerId } from '../../../src/stickers'
import { FRIEND_KINDS } from '../../../src/friend'
import type { FriendKind } from '../../../src/friend'
import { hairOptions } from '../../../src/customization'
import { CARDS, cardOf, GROUPS } from '../model'
import { heartsHtml, setHearts } from './kit'

/**
 * The proposed Animal book as DOM with the classes of the game: the Worlds dialog of
 * src/adventure.ts with two tabs (Worlds and Animals), the cards of the nine kinds, and the
 * grown Friend row of Your fairy (option B). The pictures are `img[data-picture]`, which
 * fillPictures() fills from the friend models.
 */
export type BookState = {
  met: readonly FriendKind[]
  friend: FriendKind | null
  /** The count of the hellos to five. */
  hellos: number
  /** The card that she tapped, or null. */
  selected: FriendKind | null
}

const facts = (kind: FriendKind) => cardOf(kind).facts.map(([icon]) => `<i>${icon}</i>`).join('')

/** One card of the book. A kind that she did not meet is a shadow with its world and its place. */
function cardHtml(kind: FriendKind, worlds: World[]) {
  const card = cardOf(kind)
  return `<button type="button" class="book-card fb-card is-${card.world}" data-kind="${kind}">
    <span class="fb-pic"><img alt="" data-picture="${kind}" class="fb-colour"><img alt="" data-picture="${kind}:shadow" class="fb-shadow"></span>
    <strong class="fb-name">${card.name}</strong><strong class="fb-unknown">?</strong>
    <span class="fb-facts">${facts(kind)}</span>
    <span class="fb-home">${worldPicture(worlds, card.world)}<i>${card.home[0]}</i></span>
    <small class="map-location fb-mark">✦ Flies with me</small>
  </button>`
}

/** The Worlds page of today, in short: the count, the note and the cards. The map is left out. */
function worldsPageHtml(worlds: World[], arrived: StickerId[]) {
  return `<div class="fb-page fb-page-worlds">
    <div class="sticker-progress"><div class="sticker-dots">${STICKERS.map((_, i) => `<i class="${i < arrived.length ? 'on' : ''}"></i>`).join('')}</div><p id="sticker-count">${arrived.length} of ${STICKERS.length} stickers</p></div>
    <div class="world-note"><p>Next: Mars is waiting. Fly there to get its sticker.</p><button type="button" id="world-fly">Fly there ↗</button></div>
    <div class="book-cards">${BOOK_ORDER.map((id, index) => {
      const sticker = arrived.includes(id), known = sticker || id === 'mars'
      const html = known ? `${worldPicture(worlds, id, sticker ? 'waiting' : null)}<strong>${stickerById(id).name}</strong><small class="map-location">${sticker ? '★ Your sticker' : 'Fly here ↗'}</small>`
        : '<span class="planet-picture mystery-picture" aria-hidden="true">?</span><strong>Mystery world</strong><small class="map-location">Opens later</small>'
      return `<button type="button" class="book-card is-${sticker ? 'sticker' : known ? 'open' : 'mystery-closed'}" data-tilt="${(index * 37 % 9) - 4}">${html}</button>`
    }).join('')}</div>
  </div>`
}

/**
 * The Worlds dialog with its two tabs. `arrived` are the stickers of the clip. The dialog is a
 * `div#world-map`: the game shows it as a modal dialog, and the clip needs it in the layer.
 */
export function createWorldsDialog(shell: HTMLElement, worlds: World[], arrived: StickerId[]) {
  const backdrop = document.createElement('div')
  backdrop.className = 'fb-backdrop'
  const dialog = document.createElement('div')
  dialog.id = 'world-map'
  dialog.className = 'fb-dialog'
  dialog.innerHTML = `
    <header><div><p class="eyebrow">A LITTLE BOOK OF WORLDS</p><h2 id="map-title">Where shall we fly?</h2></div><button id="close-map" type="button" aria-label="Close world map">×</button></header>
    <div class="fb-tabs" role="tablist"><button type="button" role="tab" data-tab="worlds"><span aria-hidden="true">◉</span> Worlds <span class="world-count">${arrived.length}/${STICKERS.length}</span></button><button type="button" role="tab" data-tab="animals"><span aria-hidden="true">🐾</span> Animals <span class="world-count fb-met-count"></span></button></div>
    ${worldsPageHtml(worlds, arrived)}
    <div class="fb-page fb-page-animals">
      <div class="world-note fb-note">
        <span class="fb-note-pic"><img alt="" class="fb-note-img"><span class="friend-preview friend-preview--none fb-note-empty" aria-hidden="true"></span></span>
        <div class="fb-note-body"><small class="fb-note-label"></small><b class="fb-note-name"></b><span class="fb-note-facts"></span>${heartsHtml()}</div>
        <button type="button" id="world-fly" class="fb-fly">Fly with me ↗</button><button type="button" class="fb-none">No friend</button>
      </div>
      ${GROUPS.map(group => `<p class="fb-group"><b>${group.title}</b> ${group.where}</p><div class="book-cards fb-cards">${CARDS.filter(card => card.group === group.id).map(card => cardHtml(card.kind, worlds)).join('')}</div>`).join('')}
    </div>`
  dialog.querySelectorAll<HTMLElement>('[data-tilt]').forEach(card => card.style.setProperty('--tilt', `${card.dataset.tilt}deg`))
  shell.append(backdrop, dialog)
  const get = <T extends HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!
  const imgSrc = new Map<FriendKind, string>()

  return {
    dialog, backdrop,
    /** The centre of an element of the dialog, in the coordinates of the screen. */
    centre(selector: string, screen: HTMLElement) {
      const box = get(selector).getBoundingClientRect(), frame = screen.getBoundingClientRect()
      const scale = frame.width / screen.offsetWidth
      return { x: (box.left + box.width / 2 - frame.left) / scale, y: (box.top + box.height / 2 - frame.top) / scale }
    },
    setTab(tab: 'worlds' | 'animals') {
      dialog.querySelectorAll<HTMLElement>('[data-tab]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.tab === tab)))
      get('.fb-page-worlds').hidden = tab !== 'worlds'
      get('.fb-page-animals').hidden = tab !== 'animals'
      get('#map-title').textContent = tab === 'worlds' ? 'Where shall we fly?' : 'Your animal friends'
    },
    /** Draws the Animals page for a state of the book. `colour` gives the picture of a kind. */
    setBook(state: BookState, colour: (kind: FriendKind) => string) {
      const gift = state.hellos >= 5
      get('.fb-met-count').textContent = `${state.met.length}/${FRIEND_KINDS.length}`
      dialog.querySelectorAll<HTMLElement>('.fb-card').forEach(card => {
        const kind = card.dataset.kind as FriendKind, met = state.met.includes(kind)
        card.classList.toggle('is-sticker', met)
        card.classList.toggle('is-unmet', !met)
        card.classList.toggle('is-mystery-closed', !met)
        card.classList.toggle('is-friend', met && kind === state.friend)
        card.classList.toggle('is-selected', kind === state.selected)
        card.style.setProperty('--tilt', met ? `${(FRIEND_KINDS.indexOf(kind) * 37 % 7) - 3}deg` : '0deg')
      })
      // The note: the friend, or the tapped card with its facts and "Fly with me". Before the gift: the five hearts.
      const kind = state.selected ?? state.friend
      const note = get('.fb-note'), img = get<HTMLImageElement>('.fb-note-img')
      note.classList.toggle('is-gift', gift)
      note.classList.toggle('is-card', Boolean(state.selected))
      if (kind && img.dataset.kind !== kind) { if (!imgSrc.has(kind)) imgSrc.set(kind, colour(kind)); img.src = imgSrc.get(kind)!; img.dataset.kind = kind }
      img.hidden = !kind
      get('.fb-note-empty').hidden = Boolean(kind)
      const isFriend = Boolean(kind) && kind === state.friend
      get('.fb-note-label').textContent = !gift && !state.selected ? 'A FRIEND COMES AFTER FIVE HELLOS' : isFriend ? '✦ FLIES WITH YOU' : state.selected ? (cardOf(kind!).group === 'real' ? 'REAL ANIMAL' : 'STORY CREATURE') : 'NO FRIEND'
      get('.fb-note-name').textContent = kind ? cardOf(kind).name : ''
      get('.fb-note-facts').innerHTML = state.selected ? cardOf(state.selected).facts.map(([icon, word]) => `<span class="fb-fact"><i>${icon}</i>${word}</span>`).join('') : ''
      get('.fb-hearts').hidden = gift
      setHearts(note, state.hellos)
      get('.fb-fly').hidden = !gift || !state.selected || state.selected === state.friend
      get('.fb-none').hidden = !gift || !isFriend || !state.selected
    },
  }
}
export type WorldsDialog = ReturnType<typeof createWorldsDialog>

/**
 * Your fairy (the look menu of src/main.ts) for option B: its first row grows into the Animal
 * book. The rows of the look below it are the rows of the game, in short.
 */
export function createLookMenu(shell: HTMLElement) {
  const menu = document.createElement('section')
  menu.className = 'customizer is-open fb-customizer'
  menu.innerHTML = `
    <div class="customizer-heading"><div><p class="eyebrow">YOUR FAIRY</p><h2 id="customizer-title">Make her yours</h2></div><button class="customizer-close" type="button" aria-label="Close customization">×</button></div>
    <fieldset class="customizer-group fb-book-row"><legend>Animal friends · <span class="fb-met-count"></span></legend>
      ${GROUPS.map(group => `<div class="fb-mini">${CARDS.filter(card => card.group === group.id).map(card => `<button type="button" class="fb-mini-kind is-${card.world}" data-kind="${card.kind}" aria-pressed="false"><span class="fb-pic"><img alt="" data-picture="${card.kind}" class="fb-colour"><img alt="" data-picture="${card.kind}:shadow" class="fb-shadow"></span></button>`).join('')}</div>`).join('')}
      <div class="fb-mini-note"><span class="fb-mini-facts"></span><button type="button" class="fb-mini-none" aria-pressed="false"><span class="friend-preview friend-preview--none" aria-hidden="true"></span>No friend</button></div>
    </fieldset>
    <fieldset class="customizer-group"><legend>Hair</legend><div class="option-grid">${hairOptions.slice(0, 6).map(({ id, label }) => `<button type="button" aria-pressed="${id === hairOptions[0].id}"><span class="hair-preview hair-preview--${id}" aria-hidden="true"><i></i><i></i></span><span>${label}</span></button>`).join('')}</div></fieldset>`
  shell.append(menu)
  return {
    menu,
    setBook(state: BookState) {
      menu.querySelector('.fb-met-count')!.textContent = `${state.met.length} of ${FRIEND_KINDS.length}`
      menu.querySelectorAll<HTMLElement>('.fb-mini-kind').forEach(button => {
        const kind = button.dataset.kind as FriendKind, met = state.met.includes(kind)
        button.classList.toggle('is-unmet', !met)
        button.setAttribute('aria-pressed', String(kind === state.friend))
      })
      menu.querySelector('.fb-mini-none')!.setAttribute('aria-pressed', String(state.friend === null))
      const kind = state.selected ?? state.friend
      menu.querySelector('.fb-mini-facts')!.innerHTML = kind ? `<b>${cardOf(kind).name}</b> ${cardOf(kind).facts.map(([icon]) => `<i>${icon}</i>`).join('')}` : ''
    },
    centre(selector: string, screen: HTMLElement) {
      const box = menu.querySelector(selector)!.getBoundingClientRect(), frame = screen.getBoundingClientRect()
      const scale = frame.width / screen.offsetWidth
      return { x: (box.left + box.width / 2 - frame.left) / scale, y: (box.top + box.height / 2 - frame.top) / scale }
    },
  }
}

/** The colour of a world on the map of Worlds, for a small dot. */
export const worldColour = (world: World) => `#${new THREE.Color(world.color).getHexString()}`
