import '../../src/adventure.css'
import '../../src/sticker-book.css'
import './style.css'
import * as THREE from 'three'
import { MILESTONE, stickerById, STICKERS } from '../../src/stickers'
import type { StickerId } from '../../src/stickers'
import { PROPORTIONS } from '../../src/proportions'
import { MOON } from '../../src/moon'
import {
  BOOK_OPTIONS, BOOK_ORDER, canEarn, canFly, cardState, freeFlightPlan, gap, nameOf, nextDoor, nextDoorChain, OPTIONS, PLACES,
  revealed, sizeInView, spaceSeconds, summary,
} from './model'
import type { CardState, Leg, Option } from './model'
import studyUrl from '../../docs/world-book-study.md?url'
import uiStudyUrl from '../../docs/ui-simplify-study.md?url'

type Device = 'computer' | 'phone'
type Tab = 'worlds' | 'book'
const state = { option: 'nextdoor' as Option, device: 'computer' as Device, tab: 'worlds' as Tab, earned: [] as StickerId[], selected: null as StickerId | null, note: '', at: 'earth' as StickerId }
let toastTimer = 0

const km = (metres: number) => `${(metres / 1000).toLocaleString('en', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`
const seconds = (value: number) => `${Math.round(value)} s`
const degrees = (value: number) => `${value.toLocaleString('en', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}°`
const colour = (id: StickerId) => `#${new THREE.Color(stickerById(id).color).getHexString()}`
const picture = (id: StickerId, mystery = false) => mystery
  ? '<span class="planet-picture mystery-picture" aria-hidden="true">?</span>'
  : `<span class="planet-picture ${id}" style="--planet-color:${colour(id)}" aria-hidden="true">${id === 'fairy' ? '✿' : id === 'earth' ? '≈' : ''}</span>`
/** The Worlds order of the game: the world list of src/worlds.ts, with Blossom Haven moved first by CSS. */
const WORLDS_ORDER: StickerId[] = ['fairy', 'mercury', 'venus', 'earth', 'moon', 'mars', 'vesta', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune', 'sun']
const EARTH_NOTE = 'Fly out to space, then come back to Earth to get this sticker.'

const decisions = [
  { id: 'option', title: '1 / Which option?', why: 'A merges the two dialogs. B adds mystery worlds. C locks each world until the fairy finds it in free flight. D locks all but one: the next door.', options: ['A — One book', 'B — The map fills in', 'C — Earn the way', 'D — Next door (recommended)'] },
  { id: 'known', title: '2 / What does the map show at the start?', why: 'Earth is the start, and Blossom Haven is the goal of the flower guide. The Sun is the centre of the map, and it fills 13° of the sky of Earth.', options: ['Earth, Blossom Haven and the Sun (recommended)', 'Earth and Blossom Haven only', 'All names; hide only the pictures'] },
  { id: 'tap', title: '3 / One tap or two to fly?', why: 'Worlds flies on one tap today. The book shows a fact on one tap. One card cannot do both on the same tap.', options: ['Tap for the fact, then "Fly there" (recommended)', 'Tap to fly; a small "i" shows the fact'] },
  { id: 'reset', title: '4 / Does Reset sticker book lock the worlds again?', why: 'In C and D the stickers open the worlds. A reset that keeps the map open makes a book that disagrees with the map.', options: ['Yes: a new book, a new map (recommended)', 'No: the map stays open'] },
]
const STORE = 'fairy-world-book-study-v1'
const answers: Record<string, string> = {}
try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }

const findings: [string, string][] = [
  ['Two dialogs, one set of worlds', 'Worlds (<code>src/adventure.ts</code>) and <b>My space stickers</b> (<code>src/sticker-book.ts</code>) each draw the same 13 planet pictures with the same <code>.planet-picture</code> styles. Each one has its own travel button: "Fly here ↗" and "Fly there ↗".'],
  ['Each dialog reaches into the other', 'The sticker book writes a ★ on each Worlds picture that has its sticker (<code>render()</code> in <code>src/sticker-book.ts</code>). The book note offers a guided flight, as Worlds does.'],
  ['Two orders for the same worlds', 'Worlds starts with Blossom Haven and ends with the Sun. The book starts with the Sun and ends with Blossom Haven. A child sees the same planets in two orders.'],
  ['The book fills with taps', 'All 13 worlds are open from the start. A full book takes 13 guided flights and no exploration. The map also shows every world and name before the first flight.'],
  ['The gaps do not change', 'Every world goes around the Sun in the same hour (<code>src/orbits.ts</code>). The gap between two planets is always the same. Only the Moon moves around Earth, and Blossom Haven moves after five minutes of flight with no guide.'],
  ['Most worlds are easy to see', 'From Earth, Venus is 3.2° wide, Jupiter 3.1°, Saturn 2.8° and Mercury 2.8°. The Moon is 8.9° and the Sun 13.3°. A free flight in a straight line takes 5 to 36 s at space speed.'],
  ['Ceres and Vesta are nearly invisible', 'From Earth, Ceres and Vesta are 0.18° wide: less than half of the full Moon in a real sky. From Mars, the nearest planet, they are 0.38° and 0.59°. Blossom Haven is 0.57° wide from Earth, and it wanders. Without the guide, a child can miss them.'],
  ['Two worlds must stay open', 'Earth is the way home, and its sticker needs a return from space (<code>earnsSticker()</code>). Blossom Haven is the goal of the flower guide, and the Blossom Haven picture is now the only way to start the guide.'],
]

document.querySelector<HTMLDivElement>('#world-book-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>15</b> / ONE BOOK OF WORLDS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">WORLDS AND STICKERS, TOGETHER</p><h1>Every world, <em>one book.</em></h1></div>
      <p>Worlds and the sticker book show the same 13 worlds with the same pictures. This study merges them into one book. It also compares three ways to open the solar system as the fairy discovers it, with a lock on "Fly here" in two of them.<br>These controls do not change the game. <a href="${studyUrl}">Read the study ↗</a></p></header>

    <section class="workspace" aria-label="Interactive book study">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips" role="group" aria-label="Screen">${(['computer', 'phone'] as Device[]).map(device => `<button type="button" data-device="${device}">${device === 'computer' ? 'Computer' : 'Phone'}</button>`).join('')}</div>
          <div class="chips" id="tabs" role="group" aria-label="Dialog of today">${(['worlds', 'book'] as Tab[]).map(tab => `<button type="button" data-tab="${tab}">${tab === 'worlds' ? 'Worlds' : 'My space stickers'}</button>`).join('')}</div>
        </div>
        <div class="stage" id="stage"><div id="drawing"></div><div id="study-toast" role="status" hidden></div></div>
        <p class="stage-note">A drawing of the dialog, with the pictures and the styles of the game. "Fly here" and "Fly there" act as a pretend guided flight: the fairy arrives at once and gets the sticker.</p>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="options">${BOOK_OPTIONS.map(option => `<button type="button" data-option="${option}"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p id="option-line"></p>
        <div class="budget"><p class="eyebrow">THIS BOOK</p>
          <div class="meter-row"><span>Stickers</span><output id="r-stickers"></output></div>
          <div class="meter-row"><span>Open to "Fly here" now</span><output id="r-open"></output></div>
          <div class="meter-row"><span>Mystery worlds on the map</span><output id="r-mystery"></output></div>
          <div class="meter-row"><span>Next door</span><output id="r-next"></output></div>
        </div>
        <div class="budget"><p class="eyebrow">PRETEND FREE FLIGHT</p><p class="small">Find a world with no guide. Each chip starts at the nearest open world, as the plan of option C does.</p><div class="chips" id="free"></div></div>
        <div class="row-buttons"><button type="button" id="restart">Start again</button><button type="button" id="fill">Fill the book</button></div>
      </aside>
    </section>

    <section class="section-block" aria-labelledby="compare-title">
      <p class="eyebrow">01 / THE SAME BOOK, FIVE WAYS</p>
      <h2 id="compare-title">What each option asks of the child</h2>
      <div class="table-wrap"><table id="compare"></table></div>
      <p class="section-note">A guided flight is one tap on "Fly here" or "Fly there". A free flight is a flight with the keys or the arrows and no guide. The toolbar and Menu counts start from the game of today: four toolbar buttons and three Menu buttons (<a href="${uiStudyUrl}">screen study</a>).</p>
    </section>

    <section class="section-block" aria-labelledby="far-title">
      <p class="eyebrow">02 / HOW FAR, HOW BIG</p>
      <h2 id="far-title">Can a child find a world with no guide?</h2>
      <div class="tables">
        <figure><figcaption>From Earth</figcaption><div class="table-wrap"><table id="from-earth"></table></div></figure>
        <figure><figcaption>Option C: the shortest set of free flights</figcaption><div class="table-wrap"><table id="plan"></table></div></figure>
        <figure><figcaption>Option D: the chain of next doors (guided)</figcaption><div class="table-wrap"><table id="chain"></table></div></figure>
      </div>
      <p class="section-note">Gaps are surface to surface at the places of the game at time 0. Times are at the full space speed of <code>src/flight.ts</code> (968 m/s), without the climb out of the air and without the brake. Size is the angle of the world in the view at the start of the flight. The Moon at 0.5° is the size of the full Moon in a real sky.</p>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">03 / WHAT THE GAME DOES TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${findings.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">04 / RECOMMENDATION</p><h2 id="brief-title">Option D, next door.</h2>
        <p>A removes a button and a second set of pictures, but the book still fills with taps. B adds the surprise, but nothing asks the child to explore. C asks for eleven free flights, and two of its targets are smaller than the full Moon in the view. D keeps the surprise and a path that is always open, and a free flight still gets any sticker early.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>One dialog</h3><p>The Worlds dialog of <code>src/adventure.ts</code> takes the progress dots, the note and the stickers of <code>src/sticker-book.ts</code>. The Stickers toolbar button goes away; the Worlds button shows "3 / 13".</p></div></article>
        <article><span>2</span><div><h3>Mystery worlds</h3><p>A world with no sticker, other than Earth, Blossom Haven and the Sun, shows a grey "?" on the map and in the book. The map draws its path after the arrival.</p></div></article>
        <article><span>3</span><div><h3>One open door</h3><p><code>canFly()</code> in <code>src/stickers.ts</code>: a sticker, Earth, Blossom Haven, or the next door of <code>suggestNext()</code>. The new-sticker note says what opened: "Next: Venus is waiting."</p></div></article>
        <article><span>4</span><div><h3>Tests</h3><p>Four smoke scripts fly to a world that D keeps closed. A test flag opens every world for them.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">05 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${decisions.map(decision => `<fieldset><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" value="${index}"${answers[decision.id] === choice ? ' checked' : ''}><span>${choice}</span></label>`).join('')}</fieldset>`).join('')}</form>
      <p class="section-note" id="save-note">The answers stay in this browser. <b>Save study</b> downloads them with the numbers of each option.</p>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 15</span><span>Study only · the game does not change</span></footer>
  </main>`

const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!

/** The solar map of the Worlds dialog: the same scale as src/adventure.ts. A mystery is a grey "?" with no path. */
const MAP_REACH = 14500 * PROPORTIONS.spacing, MOON_RING = Math.max(12, MOON.orbit / MAP_REACH * 216)
function solarMap() {
  const point = (id: StickerId) => ({ x: 300 + PLACES[id].x / MAP_REACH * 216, y: 250 - PLACES[id].z / MAP_REACH * 216 })
  const earth = point('earth')
  const worlds = STICKERS.map(sticker => sticker.id).filter(id => id !== 'sun').map(id => {
    const shown = revealed(state.option, state.earned, id)
    let { x, y } = point(id)
    const moon = id === 'moon'
    if (moon) { const dx = x - earth.x, dy = y - earth.y, length = Math.hypot(dx, dy) || 1; x = earth.x + dx / length * MOON_RING; y = earth.y + dy / length * MOON_RING }
    const radius = moon ? MOON_RING : Math.hypot(x - 300, y - 250)
    const path = shown ? `<circle class="solar-orbit" cx="${moon ? earth.x : 300}" cy="${moon ? earth.y : 250}" r="${radius}" stroke="${colour(id)}"/>` : ''
    const selected = state.selected === id ? ' is-selected' : ''
    return `${path}<g class="map-world${shown ? '' : ' is-mystery'}${selected}" data-orbit-marker="${id}" transform="translate(${x} ${y})"><circle class="solar-planet" r="${moon ? 4 : 6}" fill="${shown ? colour(id) : '#59607a'}"/><text y="${moon ? -9 : 18}">${shown ? stickerById(id).name : '?'}</text></g>`
  }).join('')
  return `<section class="solar-map"><p><span aria-hidden="true">◎</span> ${state.option === 'today' || state.option === 'onebook' ? 'The planets follow their coloured paths. One full lap takes about an hour.' : 'Each new world you visit comes onto the map.'}</p><svg viewBox="0 0 600 500" role="img" aria-label="Map of the worlds"><circle class="solar-sun" cx="300" cy="250" r="13"/><text class="solar-sun-label" x="300" y="280">SUN</text>${worlds}</svg></section>`
}

const STATUS: Record<CardState, (id: StickerId) => string> = {
  sticker: () => '★ Your sticker',
  open: id => id === 'fairy' ? 'Follow the flower' : 'Fly here ↗',
  closed: () => 'Find it in the sky',
  'mystery-open': () => 'A mystery · fly to it ↗',
  'mystery-closed': () => state.option === 'nextdoor' ? 'Opens later' : 'Find it in the sky',
}
function card(id: StickerId, index: number) {
  const cardFor = cardState(state.option, state.earned, id)
  const mystery = cardFor.startsWith('mystery')
  const name = mystery ? 'Mystery world' : stickerById(id).name
  return `<button type="button" class="book-card is-${cardFor}${state.selected === id ? ' is-selected' : ''}" data-card="${id}" style="--tilt:${(index * 37 % 9) - 4}deg">${picture(id, mystery)}<strong>${name}</strong><small>${STATUS[cardFor](id)}</small></button>`
}

function progress() {
  const earned = state.earned.length
  return `<div class="sticker-progress"><div class="sticker-dots" role="img" aria-label="${earned} of 13 stickers">${STICKERS.map((_, i) => `<i class="${i < earned ? 'on' : ''} ${(i + 1) % MILESTONE === 0 ? 'milestone' : ''}"></i>`).join('')}</div><p id="sticker-count">${earned} of ${STICKERS.length} stickers</p></div>`
}
function noteRow() {
  const id = state.selected
  // No flight to the world where the fairy is.
  const fly = id && id !== state.at && canFly(state.option, state.earned, id)
  return `<div class="sticker-note" aria-live="polite"><p>${state.note}</p>${fly ? `<button type="button" id="note-fly" data-fly="${id}">Fly there ↗</button>` : ''}</div>`
}

function mergedBook() {
  return `<div class="book-dialog">
    <header><div><p class="eyebrow">A LITTLE BOOK OF WORLDS</p><h3>Where shall we fly?</h3></div><span class="fake-close" aria-hidden="true">×</span></header>
    ${progress()}${noteRow()}${solarMap()}
    <div class="book-cards">${BOOK_ORDER.map(card).join('')}</div>
    <p class="map-footnote">Blossom Haven wanders every five minutes. Choose its flower to keep it still while we fly there.</p></div>`
}
function todayDialogs() {
  if (state.tab === 'worlds') return `<div class="book-dialog">
    <header><div><p class="eyebrow">A LITTLE BOOK OF WORLDS</p><h3>Where shall we fly?</h3></div><span class="fake-close" aria-hidden="true">×</span></header>
    <p class="map-caption">Choose a picture and we’ll fly there together.</p>${solarMap()}
    <div class="picture-worlds">${WORLDS_ORDER.map(id => `<button type="button" data-fly="${id}" class="world-picture ${id === 'fairy' ? 'home-picture' : ''} ${state.earned.includes(id) ? 'has-sticker' : ''}" style="--planet-color:${colour(id)}">${picture(id)}<strong>${stickerById(id).name}</strong><small class="map-location">Fly here ↗</small></button>`).join('')}</div></div>`
  return `<div class="book-dialog">
    <header><div><p class="eyebrow">YOUR STICKERS</p><h3>My space stickers</h3></div><span class="fake-close" aria-hidden="true">×</span></header>
    ${progress()}${noteRow()}
    <div class="sticker-grid">${STICKERS.map((sticker, index) => `<button type="button" class="sticker-slot ${state.earned.includes(sticker.id) ? 'is-earned' : ''}" data-card="${sticker.id}" style="--tilt:${(index * 37 % 9) - 4}deg">${picture(sticker.id)}<span>${sticker.name}</span></button>`).join('')}</div></div>`
}

function select(id: StickerId) {
  state.selected = id
  const cardFor = cardState(state.option, state.earned, id)
  if (cardFor === 'sticker') state.note = stickerById(id).fact
  else if (id === 'earth') state.note = canEarn(state.earned, 'earth') ? 'Fly back home to Earth to get its sticker.' : EARTH_NOTE
  else if (id === 'fairy') state.note = 'Follow the flower to Blossom Haven, your fairy home.'
  else if (cardFor === 'open') state.note = `Fly to ${nameOf(id)} to get this sticker.`
  else if (cardFor === 'mystery-open') state.note = state.option === 'nextdoor' ? 'The next world is waiting. Fly to it and find out what it is!' : 'A mystery world. Fly to it and find out what it is!'
  else if (state.option === 'nextdoor') state.note = `This world opens later. Or find it in the sky with no guide!`
  else state.note = 'Find this world in the sky with no guide. The map shows where it is.'
}
function arrive(id: StickerId) {
  state.at = id
  if (state.earned.includes(id)) { state.note = `You are at ${nameOf(id)}. ${stickerById(id).fact}`; return }
  if (!canEarn(state.earned, id)) { state.note = EARTH_NOTE; return }
  state.earned.push(id)
  state.selected = id
  const next = state.option === 'nextdoor' ? nextDoor(state.earned) : null
  state.note = stickerById(id).fact + (next && next !== 'earth' ? ' Next: a new world is waiting!' : '')
  showToast(id, next)
}
function showToast(id: StickerId, next: StickerId | null) {
  const toast = get('#study-toast')
  toast.innerHTML = `${picture(id)}<div><small>NEW STICKER</small><h4>${stickerById(id).name}</h4>${next && next !== 'earth' && state.option === 'nextdoor' ? '<p>Next: a new world is waiting!</p>' : ''}</div>`
  toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.hidden = true }, 2600)
}

/** The nearest open world, where a free flight to this world starts. Blossom Haven wanders, so it is never a start. */
function freeLeg(id: StickerId): Leg {
  const starts = STICKERS.map(sticker => sticker.id).filter(from => from !== 'fairy' && from !== id && canFly(state.option, state.earned, from))
  const from = starts.toSorted((a, b) => gap(a, id) - gap(b, id))[0] ?? 'earth'
  return { from, to: id, metres: gap(from, id), seconds: spaceSeconds(gap(from, id)), degrees: sizeInView(id, from) }
}

function render() {
  const merged = state.option !== 'today'
  get('#drawing').className = `drawing ${state.device}`
  get('#drawing').innerHTML = merged ? mergedBook() : todayDialogs()
  get('#tabs').hidden = merged
  for (const [attribute, value] of [['option', state.option], ['device', state.device], ['tab', state.tab]] as const) {
    document.querySelectorAll<HTMLButtonElement>(`[data-${attribute}]`).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[attribute] === value)))
  }
  get('#option-line').textContent = OPTIONS[state.option].line
  const ids = STICKERS.map(sticker => sticker.id)
  get('#r-stickers').textContent = `${state.earned.length} of 13`
  get('#r-open').textContent = String(ids.filter(id => canFly(state.option, state.earned, id)).length)
  get('#r-mystery').textContent = String(ids.filter(id => !revealed(state.option, state.earned, id)).length)
  const next = nextDoor(state.earned)
  get('#r-next').textContent = state.option === 'nextdoor' ? next ? stickerById(next).name : 'None: the book is full' : 'Not in this option'
  get('#free').innerHTML = ids.filter(id => !state.earned.includes(id) && id !== 'fairy' && id !== 'earth').map(id => {
    const leg = freeLeg(id)
    return `<button type="button" data-free="${id}" title="From ${stickerById(leg.from).name}: ${km(leg.metres)}, ${degrees(leg.degrees)} wide">${stickerById(id).name} <small>${km(leg.metres)} · ${degrees(leg.degrees)}</small></button>`
  }).join('') || '<p class="small">Every world has its sticker.</p>'
}

function renderTables() {
  const rows: [string, (option: Option) => string][] = [
    ['Dialogs', option => String(summary(option).dialogs)],
    ['Computer toolbar buttons', option => String(summary(option).computerToolbar)],
    ['Phone Menu buttons', option => String(summary(option).phoneMenu)],
    ['Worlds open to "Fly here" at the start', option => String(summary(option).openAtStart)],
    ['Mystery worlds at the start', option => String(summary(option).mysteriesAtStart)],
    ['Guided flights to fill the book', option => String(summary(option).guidedFlights)],
    ['Free flights needed', option => String(summary(option).freeFlights)],
    ['Longest free flight needed', option => { const leg = summary(option).longestFreeFlight; return leg ? `${km(leg.metres)}, ${seconds(leg.seconds)}` : '—' }],
    ['Can a child get stuck?', option => option === 'earn' ? 'Yes, at a world that she cannot find' : 'No'],
  ]
  get('#compare').innerHTML = `<thead><tr><th scope="col"></th>${BOOK_OPTIONS.map(option => `<th scope="col">${option === 'today' ? 'Today' : `${OPTIONS[option].letter} · ${OPTIONS[option].name}`}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${BOOK_OPTIONS.map(option => `<td>${value(option)}</td>`).join('')}</tr>`).join('')}</tbody>`
  const fromEarth = STICKERS.map(sticker => sticker.id).filter(id => id !== 'earth').toSorted((a, b) => gap('earth', a) - gap('earth', b))
  get('#from-earth').innerHTML = `<thead><tr><th scope="col">World</th><th scope="col">Gap</th><th scope="col">Time</th><th scope="col">Size</th></tr></thead>
    <tbody>${fromEarth.map(id => `<tr${sizeInView(id, 'earth') < 0.6 ? ' class="hard"' : ''}><th scope="row">${stickerById(id).name}</th><td>${km(gap('earth', id))}</td><td>${seconds(spaceSeconds(gap('earth', id)))}</td><td>${degrees(sizeInView(id, 'earth'))}</td></tr>`).join('')}</tbody>`
  const legs = (list: Leg[]) => `<thead><tr><th scope="col">Flight</th><th scope="col">Gap</th><th scope="col">Time</th><th scope="col">Size</th></tr></thead>
    <tbody>${list.map(leg => `<tr${leg.degrees < 0.6 ? ' class="hard"' : ''}><th scope="row">${stickerById(leg.from).name} → ${stickerById(leg.to).name}</th><td>${km(leg.metres)}</td><td>${seconds(leg.seconds)}</td><td>${degrees(leg.degrees)}</td></tr>`).join('')}</tbody>`
  get('#plan').innerHTML = legs(freeFlightPlan())
  get('#chain').innerHTML = legs(nextDoorChain())
}

get('#drawing').addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-fly], [data-card]')
  if (!target) return
  const fly = target.dataset.fly as StickerId | undefined, id = target.dataset.card as StickerId | undefined
  if (fly) arrive(fly)
  else if (id) select(id)
  render()
})
get('#free').addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-free]')
  if (!target) return
  arrive(target.dataset.free as StickerId)
  render()
})
document.querySelectorAll<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { state.option = button.dataset.option as Option; state.selected = null; state.note = ''; render() }))
document.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => button.addEventListener('click', () => { state.device = button.dataset.device as Device; render() }))
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.tab as Tab; render() }))
get('#restart').addEventListener('click', () => { state.earned = []; state.at = 'earth'; state.selected = null; state.note = ''; render() })
get('#fill').addEventListener('click', () => { state.earned = [...BOOK_ORDER.filter(id => id !== 'earth'), 'earth']; state.selected = null; state.note = 'Your book is full! You are a space explorer!'; render() })

get('#decisions').addEventListener('change', event => {
  const input = event.target as HTMLInputElement
  const decision = decisions.find(item => item.id === input.name)!
  answers[decision.id] = decision.options[Number(input.value)]
  try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { get('#save-note').textContent = 'The browser does not keep the answers. Use Save study before you leave.' }
})
get('#export').addEventListener('click', () => {
  const data = {
    study: 'world-book-study', exported: new Date().toISOString(), answers,
    options: Object.fromEntries(BOOK_OPTIONS.map(option => [option, summary(option)])),
    fromEarth: Object.fromEntries(STICKERS.map(sticker => sticker.id).filter(id => id !== 'earth').map(id => [id, { metres: Math.round(gap('earth', id)), degrees: +sizeInView(id, 'earth').toFixed(2) }])),
    freeFlightPlan: freeFlightPlan(), nextDoorChain: nextDoorChain(),
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  link.download = 'world-book-study.json'
  link.click()
  URL.revokeObjectURL(link.href)
})

renderTables()
render()
