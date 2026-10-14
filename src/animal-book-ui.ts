import type { World } from './worlds'
import { worldPicture } from './sticker-book'
import { BOOK_KINDS, friendName } from './friend'
import type { FriendKind } from './friend'
import type { FairyFriend } from './friend-ui'
import { ANIMAL_CARDS, BOOK_PAGES, bookCount, bookNote, cardLook, factIcon, heartsHtml, worldName } from './animal-book'
import './animal-book.css'

type BookWorld = 'earth' | 'fairy'
type Options = {
  worlds: World[]
  friend: FairyFriend
  /** Reduced motion: "Fly with me" and "No friend" change the friend at once. */
  still: () => boolean
  /** The world where the fairy is: the book opens at its page. */
  here: () => BookWorld
}

/**
 * The Animals page of Worlds (design A of docs/friend-book-study.md, with the pages of
 * docs/animals-study.md): the note at the top, then one page for each world with a row for each
 * place and its picture, and a card for each kind. A tap on a card shows it in the note. After the
 * gift, a met card has "Fly with me" and the card of the friend has "No friend": the tap closes
 * Worlds, and the swap plays in the flight. Call it after createAdventure(), because the page is
 * the second tab of the Worlds dialog.
 */
export function createAnimalBook({ worlds, friend, still, here }: Options) {
  const map = document.querySelector<HTMLDialogElement>('#world-map')!
  const page = map.querySelector<HTMLElement>('#animals-page')!
  const count = map.querySelector<HTMLElement>('#tab-animals .world-count')!
  page.innerHTML = `
    <div class="world-note animal-note" aria-live="polite">
      <span class="animal-note-picture"><img alt=""><span class="friend-preview friend-preview--none" aria-hidden="true"></span></span>
      <div class="animal-note-text"><small></small><strong></strong><span class="animal-note-facts"></span><span class="friend-hearts" role="img"></span></div>
      <div class="animal-note-buttons"><button id="animal-fly" type="button" hidden>Fly with me ↗</button><button id="animal-none" type="button" hidden>No friend</button></div>
    </div>
    <div class="animal-worlds" role="group" aria-label="The pages of the book">
      ${BOOK_PAGES.map(book => `<button type="button" class="animal-world" data-book-world="${book.world}" aria-controls="animal-page-${book.world}">${worldPicture(worlds, book.world)}<span><b>${worldName(book.world)}</b><small class="animal-world-count"></small></span></button>`).join('')}
    </div>
    ${BOOK_PAGES.map(book => `<section class="animal-book-page is-${book.world}" id="animal-page-${book.world}" data-book-world="${book.world}" aria-label="${book.title} on ${worldName(book.world)}">
      ${book.rows.map(row => `<div class="animal-row is-${row.id}">
        <h3 id="animal-row-${row.world}-${row.id}">${factIcon(row.icon)}<b>${row.name}</b></h3>
        <div class="animal-cards" role="group" aria-labelledby="animal-row-${row.world}-${row.id}">${row.kinds.map(kind => `<button type="button" class="animal-card is-${book.world}" data-animal="${kind}"></button>`).join('')}</div>
      </div>`).join('')}
    </section>`).join('')}`
  const note = page.querySelector<HTMLElement>('.animal-note')!
  const get = <T extends HTMLElement>(selector: string) => note.querySelector<T>(selector)!
  const cards = [...page.querySelectorAll<HTMLButtonElement>('.animal-card')]
  const pages = [...page.querySelectorAll<HTMLElement>('.animal-book-page')]
  const switches = [...page.querySelectorAll<HTMLButtonElement>('.animal-world')]
  // The card that she tapped, and the page that shows. Worlds opens with no card chosen, at the page of the world where she is.
  let selected: FriendKind | null = null, current: BookWorld = here()
  const drawn = new Map<HTMLElement, string>()
  // The pictures of the cards render one at a time, so the page opens at once. A card waits with an empty circle.
  const waiting = new Map<string, [FriendKind, 'clear' | 'shadow']>()
  let timer = 0
  function pictureOf(kind: FriendKind, look: 'clear' | 'shadow') {
    if (friend.hasPicture(kind, look)) return friend.picture(kind, look)
    waiting.set(`${kind}:${look}`, [kind, look])
    if (!timer) timer = window.setTimeout(drawNext, 0)
    return ''
  }
  function drawNext() {
    timer = 0
    const [key, [kind, look]] = waiting.entries().next().value ?? ['', [null, 'clear']]
    if (!kind) return
    waiting.delete(key)
    friend.picture(kind, look)
    render()
  }

  /** The inside of a card: the picture, the name and the facts; the mark of the friend; or the shadow with its world and its place. */
  function cardHtml(kind: FriendKind) {
    const card = ANIMAL_CARDS[kind], look = cardLook(friend.state, kind)
    if (look === 'unmet') {
      return `<span class="animal-picture"><img alt="" src="${pictureOf(kind, 'shadow')}"></span><strong class="animal-unknown">?</strong>`
        + `<span class="animal-place">${worldPicture(worlds, card.world)}${factIcon(card.place[0])}</span>`
    }
    return `<span class="animal-picture"><img alt="" src="${pictureOf(kind, 'clear')}"></span><strong>${friendName(kind)}</strong>`
      + (look === 'friend' ? '<small class="animal-mark">✦ Flies with me</small>' : `<span class="animal-facts">${card.facts.map(([icon]) => factIcon(icon)).join('')}</span>`)
  }
  function label(kind: FriendKind) {
    const card = ANIMAL_CARDS[kind], look = cardLook(friend.state, kind)
    if (look === 'unmet') return `A mystery animal: ${worldName(card.world)}, ${card.place[1].toLowerCase()}`
    return look === 'friend' ? `${friendName(kind)}, flies with you` : friendName(kind)
  }

  function renderNote() {
    const shown = bookNote(friend.state, selected)
    const img = get<HTMLImageElement>('.animal-note-picture img'), box = get('.animal-note-picture')
    img.hidden = !shown.kind
    get('.friend-preview--none').hidden = Boolean(shown.kind)
    if (shown.kind) img.src = friend.picture(shown.kind, shown.shadow ? 'shadow' : 'clear')
    box.className = `animal-note-picture${shown.kind ? ` is-${ANIMAL_CARDS[shown.kind].world}` : ''}${shown.shadow ? ' is-shadow' : ''}`
    get('small').textContent = shown.label
    get('strong').textContent = shown.name
    get('.animal-note-facts').innerHTML = (shown.world ? `<span class="animal-fact">${worldPicture(worlds, shown.world)}${worldName(shown.world)}</span>` : '')
      + shown.facts.map(([icon, word]) => `<span class="animal-fact">${factIcon(icon)}${word}</span>`).join('')
    const hearts = get('.friend-hearts')
    hearts.hidden = shown.hearts === null
    hearts.innerHTML = shown.hearts === null ? '' : heartsHtml(shown.hearts)
    hearts.ariaLabel = shown.hearts === null ? null : `${shown.hearts} of 5 hearts`
    get('#animal-fly').hidden = !shown.fly
    get('#animal-none').hidden = !shown.none
    note.classList.toggle('is-chosen', selected !== null)
  }

  /** Draws the page. The pictures render only for the page of the world that shows, so a game that never opens it renders none. */
  function render() {
    count.textContent = bookCount(friend.state)
    for (const button of switches) {
      const world = button.dataset.bookWorld as BookWorld, kinds = BOOK_KINDS.filter(kind => ANIMAL_CARDS[kind].world === world)
      button.setAttribute('aria-pressed', String(world === current))
      button.querySelector('.animal-world-count')!.textContent = `${kinds.filter(kind => friend.state.met.includes(kind)).length}/${kinds.length}`
    }
    for (const book of pages) book.hidden = book.dataset.bookWorld !== current
    if (page.hidden) return
    for (const card of cards) {
      const kind = card.dataset.animal as FriendKind, look = cardLook(friend.state, kind)
      if (ANIMAL_CARDS[kind].world !== current) continue
      const html = cardHtml(kind)
      // The browser writes the SVG of the facts in its own way, so the page keeps the HTML that it gave.
      if (drawn.get(card) !== html) { card.innerHTML = html; drawn.set(card, html) }
      card.className = `animal-card is-${ANIMAL_CARDS[kind].world} is-${look}${kind === selected ? ' is-selected' : ''}`
      card.ariaLabel = label(kind)
      // A met card is a sticker, a little tilted as the sticker cards of the worlds.
      card.style.setProperty('--tilt', look === 'unmet' ? '0deg' : `${(BOOK_KINDS.indexOf(kind) * 37 % 7) - 3}deg`)
    }
    renderNote()
  }

  for (const card of cards) card.onclick = () => { selected = card.dataset.animal as FriendKind; render() }
  for (const button of switches) button.onclick = () => { current = button.dataset.bookWorld as BookWorld; render() }
  // "Fly with me" and "No friend" close Worlds, so the swap plays in the flight.
  get('#animal-fly').onclick = () => { if (selected && friend.choose(selected, still())) map.close() }
  get('#animal-none').onclick = () => { if (friend.choose(null, still())) map.close() }
  map.addEventListener('tabchange', event => { if ((event as CustomEvent<string>).detail === 'animals') render() })
  // The next visit of Worlds opens at the page of the world where she is.
  map.addEventListener('close', () => { selected = null; current = here(); render() })
  friend.onChange(render)
  render()

  return {
    /** For the browser checks: the card that she tapped, the page that shows, and the look of each card. */
    get state() { return { selected, page: current, cards: Object.fromEntries(BOOK_KINDS.map(kind => [kind, cardLook(friend.state, kind)])) } },
  }
}
