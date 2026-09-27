import './style.css'
import { createElement, Palette, Pause, Settings, Sticker, Volume2, VolumeX } from 'lucide'
import { CONTROLS, computerButtons, OPTIONS, phoneMenuButtons, placeOf, savesSky, settingsFor, UI_OPTIONS, WORLD_SPEEDS } from './model'
import type { Area, Option, Place } from './model'
import studyUrl from '../../docs/ui-simplify-study.md?url'
import transitionUrl from '../../docs/planet-transition-study.md?url'

type Device = 'computer' | 'phone' | 'menu'
type Where = 'meadow' | 'space'
const state = { option: 'grownup' as Option, device: 'computer' as Device, where: 'meadow' as Where, ghosts: true, settings: false, stars: false, orbits: false, speed: 0, sound: false }

const icon = (shape: typeof Pause) => createElement(shape, { width: 18, height: 18, 'stroke-width': 1.6, 'aria-hidden': 'true' }).outerHTML
const AREA: Record<Area, string> = { adventure: 'Top-left row', toolbar: 'Toolbar', 'flight-panel': 'Flight panel', destination: 'World panel', worlds: 'Worlds dialog', hidden: 'Hidden in the page' }
const PLACE: Record<Place, string> = { screen: 'Stays', settings: 'Settings', removed: 'Removed' }

const decisions = [
  { id: 'option', title: '1 / Which option?', why: 'A does the request only. B also moves World speed and removes the dead and the debug parts. C also moves Sound and the keyboard help.', options: ['A — Two switches', 'B — Grown-up corner (recommended)', 'C — Four buttons'] },
  { id: 'save', title: '2 / Keep the settings after a reload?', why: 'Today, Star pictures, Orbit paths and World speed start again at each load. A grown-up who sets a switch in Settings expects it to stay.', options: ['Save the two switches; World speed starts at 1× (recommended)', 'Save all three', 'Save nothing, as today'] },
  { id: 'map', title: '3 / The paths on the Worlds map?', why: 'Today the Orbit paths button also hides the paths on the map. The map says "The planets follow their coloured paths", but the paths are off at the start.', options: ['Always show them on the map (recommended)', 'Follow the Settings switch, as today'] },
  { id: 'child', title: '4 / How does a child find the star pictures?', why: 'Settings says "For grown-ups". A child who liked the button loses it.', options: ['In Settings only (recommended)', 'Also a note the first time the fairy is in space', 'Also a small button that shows in space only'] },
]
const STORE = 'fairy-ui-study-v1'
const answers: Record<string, string> = {}
try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }

const findings = [
  ['Two toggles for space sit on the ground screen', 'Star pictures and Orbit paths are in the top-left row with Guide me home and Worlds. On the ground, Star pictures shows nothing: the labels need a sky visibility above 0.05 (<code>src/sky-labels.ts:63</code>). Orbit paths draws thin lines through the day sky and the clouds.'],
  ['The Worlds map hides its own paths', 'The map says "The planets follow their coloured paths". <code>src/adventure.ts:63</code> hides the paths at the start, and the Orbit paths button (line 86) is the only way to show them.'],
  ['Nothing is saved', 'Star pictures (<code>src/adventure.ts:55</code>), Orbit paths (line 82) and World speed (<code>src/main.ts:415</code>) start again at each load. The look, the home and the sticker book are saved.'],
  ['"1×" is a grown-up control with no name', `The computer toolbar shows only "1×". A click makes the worlds 8 times faster, then 16×, 32× and 64×. At 64× the carry of Earth jumps 922 m/s when the fairy leaves the air (<a href="${transitionUrl}">transition study</a>, Finding 8).`],
  ['A hidden picker still runs', '<code>src/adventure.css:18</code> hides <b>Follow a world</b>. <code>src/main.ts:164</code> still builds it, and lines 685 to 796 still write its status. Seven smoke scripts use it. Six of them wait for <code>#journey-world option</code> as the sign that the game loaded. The <b>Hide orbital paths</b> button of the Worlds markup is made and then removed (<code>src/adventure.ts:62</code>).'],
  ['A developer number shows to the child', 'On Earth the world panel says "Below the clouds · landscape 1" (<code>src/main.ts:724</code>). The number counts the visits.'],
  ['The keys are told in four places', 'The welcome card (<code>src/mobile-ui.ts:56</code>), the flight panel (<code>src/main.ts:90</code>, with the Ctrl note of line 199), the phone Menu (<code>src/mobile-ui.ts:14</code>) and the hidden picker. The flight panel shows the keys at all times on a computer.'],
  ['The phone Menu has eight buttons in three groups', 'Your fairy, Stickers, Settings, Sound and World speed, then Guide me home, then Star pictures and Orbit paths. Option B makes it five.'],
]

document.querySelector<HTMLDivElement>('#ui-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>14</b> / THE SCREEN</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">WHAT STAYS ON THE SCREEN</p><h1>Fewer buttons, <em>more sky.</em></h1></div>
      <p>The flight screen has ten buttons on a computer and eight in the phone Menu. This study moves Star pictures and Orbit paths to Settings, finds what else belongs there, and compares three options.<br>These controls do not change the game. <a href="${studyUrl}">Read the study ↗</a></p></header>
    <p class="status-line"><b>In the game:</b> option C, without Guide me home. The Blossom Haven picture in Worlds starts the flower guide. "Today" is the game before the change.</p>

    <section class="workspace" aria-label="Interactive screen study">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips" role="group" aria-label="Screen">${(['computer', 'phone', 'menu'] as Device[]).map(device => `<button type="button" data-device="${device}">${{ computer: 'Computer', phone: 'Phone', menu: 'Phone · Menu open' }[device]}</button>`).join('')}</div>
          <div class="chips" role="group" aria-label="Where the fairy is">${(['meadow', 'space'] as Where[]).map(where => `<button type="button" data-where="${where}">${where === 'meadow' ? 'On the meadow' : 'In space'}</button>`).join('')}</div>
        </div>
        <div class="stage" id="stage"><div class="mock-frame" id="frame"></div></div>
        <p class="stage-note">A drawing of the game screen with the labels, the order and the sizes of the game. The buttons of the drawing work: open Settings with the gear.</p>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="options">${UI_OPTIONS.map(option => `<button type="button" data-option="${option}"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p id="option-line"></p>
        <label class="check"><input type="checkbox" id="ghosts" checked> Show what moves</label>
        <div class="budget"><p class="eyebrow">THIS OPTION</p>
          <div class="meter-row"><span>Buttons on the computer screen</span><output id="r-computer"></output></div>
          <div class="meter-row"><span>Buttons in the phone Menu</span><output id="r-menu"></output></div>
          <div class="meter-row"><span>Sections in Settings</span><output id="r-sections"></output></div>
          <div class="meter-row"><span>Sky switches kept after a reload</span><output id="r-saved"></output></div>
        </div>
        <div class="budget"><p class="eyebrow">MOVES</p><ul id="moves"></ul></div>
        <button type="button" id="open-settings" class="wide">Open Settings ⚙</button>
      </aside>
    </section>

    <section class="section-block" aria-labelledby="inventory-title">
      <p class="eyebrow">01 / EVERY CONTROL, ONE ROW</p>
      <h2 id="inventory-title">Where each control goes</h2>
      <div class="table-wrap"><table id="inventory"></table></div>
      <p class="section-note">"Stays" is the place of today. A row with no button is text on the screen. The code column gives the line where the game makes the control.</p>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">02 / WHAT THE GAME DOES TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${findings.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">03 / RECOMMENDATION</p><h2 id="brief-title">Option B, the grown-up corner.</h2>
        <p>A does the request, but it leaves "1×" on the screen. The child can press it, and it makes the largest jumps of the transition study. B moves it with the two switches, and it cleans the dead and the debug parts with the same change. C also takes Sound off the screen, and a quick mute is useful in a shared room.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>A new "In the sky" section in Settings</h3><p>Star pictures and Orbit paths as switches, World speed as five steps. <code>src/settings.ts</code> gets the actions of <code>stars</code> and <code>orbits</code> from <code>createAdventure()</code> and a <code>speed</code> action from <code>src/main.ts</code>.</p></div></article>
        <article><span>2</span><div><h3>Remove the buttons from the screen</h3><p><code>#show-stars</code> and <code>#show-orbits</code> from <code>src/adventure.ts</code>, <code>#orbit-speed-toggle</code> from <code>src/main.ts</code> and from the Menu list of <code>src/mobile-ui.ts</code>.</p></div></article>
        <article><span>3</span><div><h3>Save the switches</h3><p>One <code>localStorage</code> key, <code>fairy-settings</code>, with the guarded read and write of the sticker book.</p></div></article>
        <article><span>4</span><div><h3>Clean up</h3><p>Always draw the paths on the Worlds map. Move the sky credits to Settings. Remove "· landscape N", the hidden picker and the dead <code>#toggle-orbits</code> markup. Update the seven smoke scripts that use the picker.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">04 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${decisions.map(decision => `<fieldset><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" value="${index}"${answers[decision.id] === choice ? ' checked' : ''}><span>${choice}</span></label>`).join('')}</fieldset>`).join('')}</form>
      <p class="section-note" id="save-note">The answers stay in this browser. <b>Save study</b> downloads them with the counts of each option.</p>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 14</span><span>Study only · the game does not change</span></footer>
  </main>`

const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const frame = get('#frame'), stage = get('#stage')
const place = (id: string) => placeOf(CONTROLS.find(control => control.id === id)!, state.option)

/** A control that the option moves: a dashed ghost with its new place, or nothing. */
function part(id: string, html: string) {
  const where = place(id)
  if (where === 'screen') return html
  if (!state.ghosts) return ''
  return `<span class="ghost" data-moved="${where}">${html}<span class="ghost-tag">${where === 'settings' ? '→ Settings' : '× Removed'}</span></span>`
}

function sky(width: number, height: number) {
  const space = state.where === 'space'
  const cx = width * .5, cy = height * (space ? .55 : -.9), scale = Math.max(width, height)
  const orbits = state.orbits ? [.28, .42, .6, .85, 1.15].map((r, i) => `<ellipse cx="${cx}" cy="${cy}" rx="${scale * r}" ry="${scale * r * (space ? .38 : .9)}" fill="none" stroke="${['#c9b18c', '#e2b36f', '#7fb3d9', '#d9826a', '#c9a77a'][i]}" stroke-opacity="${space ? .7 : .45}" stroke-width="${space ? 1.4 : 1}"/>`).join('') : ''
  const duration = 40 / WORLD_SPEEDS[state.speed]
  const planets = space ? [.28, .42, .6].map((r, i) => `<circle r="${4 + i}" fill="${['#e2b36f', '#7fb3d9', '#d9826a'][i]}"><animateMotion dur="${duration * (i + 1)}s" repeatCount="indefinite" path="M ${cx + scale * r} ${cy} a ${scale * r} ${scale * r * .38} 0 1 0 ${-2 * scale * r} 0 a ${scale * r} ${scale * r * .38} 0 1 0 ${2 * scale * r} 0"/></circle>`).join('') : ''
  const stars = space ? Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 137.5) % width}" cy="${(i * 89.3) % height}" r="${i % 7 ? .8 : 1.5}" fill="#fff" opacity="${.35 + (i % 5) / 8}"/>`).join('') : ''
  // Orion: the constellation lines and names show in space only, as in the game.
  const px = width * .68, py = height * .2, s = Math.min(width, height) / 9
  const orion = space && state.stars ? `<g class="constellation"><polyline points="${px},${py} ${px + s * .9},${py + s * .3} ${px + s * .7},${py + s * 1.4} ${px + s * .1},${py + s * 1.6} ${px - s * .1},${py + s * .6} ${px},${py}" /><line x1="${px + s * .15}" y1="${py + s * .95}" x2="${px + s * .65}" y2="${py + s * .85}"/><text x="${px + s * .2}" y="${py + s * 2}">Orion</text><text x="${px - s * .2}" y="${py - 8}" class="star-name">Betelgeuse</text></g>` : ''
  const ground = space ? '' : `<path d="M0 ${height * .7} Q ${width * .3} ${height * .58} ${width * .6} ${height * .68} T ${width} ${height * .62} V ${height} H 0 Z" fill="#6fa25a"/><path d="M0 ${height * .82} Q ${width * .4} ${height * .72} ${width} ${height * .84} V ${height} H 0 Z" fill="#5a8f4a"/><g fill="#e8eef0" opacity=".85"><ellipse cx="${width * .62}" cy="${height * .2}" rx="${width * .09}" ry="${height * .045}"/><ellipse cx="${width * .7}" cy="${height * .18}" rx="${width * .07}" ry="${height * .05}"/><ellipse cx="${width * .86}" cy="${height * .42}" rx="${width * .08}" ry="${height * .03}"/></g>`
  return `<svg class="sky ${space ? 'is-space' : 'is-meadow'}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${stars}${orbits}${planets}${orion}${ground}</svg><span class="fairy" aria-hidden="true">✦</span>`
}

const speedLabel = () => `${WORLD_SPEEDS[state.speed]}×`
const soundIcon = () => icon(state.sound ? Volume2 : VolumeX)
const destination = (compact = false) => `<div class="m-destination${compact ? ' compact' : ''}"><span class="orbit-dot"></span><div><p class="m-eyebrow">NEAREST WORLD</p><h4>Earth</h4><p>${state.where === 'space' ? 'Edge of space' : '7 m above surface'}</p><p class="m-region">${state.where === 'space' ? 'Among the stars' : 'Below the clouds'}${part('landscape-number', '<span> · landscape 1</span>')}</p></div></div>`
const keyHelp = `<div class="m-keys"><div class="keycaps"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><p>↑ / W climb · ↓ / S descend<br><span>← → turn · Shift boost · release to cruise · <kbd>Ctrl</kbd> toggles hover</span></p></div>`
const tool = (id: string, content: string, label: string, active = false) => part(id, `<button type="button" class="m-icon${active ? ' is-active' : ''}" data-act="${id}" aria-label="${label}" title="${label}">${content}</button>`)
const toolbar = () => [
  tool('customize-toggle', icon(Palette), 'Your fairy'), tool('stickers-toggle', icon(Sticker), 'Stickers'), tool('settings-toggle', icon(Settings), 'Settings', state.settings),
  tool('sound-toggle', soundIcon(), 'Sound', state.sound), tool('orbit-speed-toggle', `<span class="m-speed">${speedLabel()}</span>`, 'World speed', state.speed > 0), tool('pause-toggle', icon(Pause), 'Pause'),
].join('')
const skyButtons = () => part('show-stars', `<button type="button" class="m-chip${state.stars ? ' is-on' : ''}" data-act="show-stars">✧ Star pictures</button>`) + part('show-orbits', `<button type="button" class="m-chip${state.orbits ? ' is-on' : ''}" data-act="show-orbits">Orbit paths</button>`)

function settingsPanel() {
  const sections = settingsFor(state.option)
  const control = (setting: ReturnType<typeof settingsFor>[number]['settings'][number]) => {
    if (setting.kind === 'switch') {
      const on = setting.id === 'stars' ? state.stars : setting.id === 'orbits' ? state.orbits : state.sound
      return `<label class="m-switch"><span><b>${setting.title}</b><small>${setting.note}</small></span><input type="checkbox" role="switch" data-switch="${setting.id}"${on ? ' checked' : ''}><i aria-hidden="true"></i></label>`
    }
    if (setting.kind === 'steps') return `<div class="m-steps"><span><b>${setting.title}</b><small>${setting.note}</small></span><div role="radiogroup" aria-label="World speed">${WORLD_SPEEDS.map((speed, index) => `<button type="button" role="radio" aria-checked="${index === state.speed}" data-speed="${index}">${speed}×</button>`).join('')}</div></div>`
    if (setting.kind === 'reset') return `<div class="m-reset"><small>${setting.note}</small><button type="button" disabled>${setting.title}</button></div>`
    if (setting.kind === 'details') return `<details class="m-details"><summary>${setting.title}: credits</summary><small>${setting.note}</small></details>`
    return `<p class="m-text"><b>${setting.title}</b><small>${setting.note}</small></p>`
  }
  return `<div class="m-backdrop" data-act="close-settings"></div><div class="m-settings" role="dialog" aria-label="Settings, as the option proposes">
    <header><div><p class="m-eyebrow">FOR GROWN-UPS</p><h3>Settings</h3></div><button type="button" class="m-close" data-act="close-settings" aria-label="Close settings">×</button></header>
    ${sections.map(section => `<section class="m-section${section.id === 'book' ? '' : ' is-new'}"><h5>${section.title}${section.id === 'book' ? '' : '<span class="new">NEW</span>'}</h5>${section.settings.map(control).join('')}</section>`).join('')}
    ${savesSky(state.option) ? '<p class="m-saved">✓ The switches stay after a reload.</p>' : ''}</div>`
}

function computer() {
  return `<div class="mock computer" style="--w:960px;--h:600px">${sky(960, 600)}
    <header class="m-brand"><p class="m-eyebrow">A SMALL JOURNEY</p><h3>Fly me to the moon</h3></header>
    <nav class="m-adventure"><button type="button" class="m-home" data-act="follow-home"><span>✿</span> Guide me home</button><div class="m-row"><button type="button" class="m-chip" data-act="open-map">◉ Worlds</button>${skyButtons()}</div><p class="m-help">The flower knows the way to Blossom Haven.</p></nav>
    ${destination()}
    <section class="m-panel"><div class="m-speedo"><span>✦</span><div><p class="m-eyebrow">GLIDE SPEED</p><strong>11 <small>m/s</small></strong></div></div>${part('controls-copy', keyHelp)}</section>
    <div class="m-toolbar">${toolbar()}</div>
    ${state.settings ? settingsPanel() : ''}</div>`
}

function phone(menu: boolean) {
  const labelled = (id: string, content: string, label: string, active = false) => part(id, `<button type="button" class="m-action${active ? ' is-active' : ''}" data-act="${id}">${content}<span>${label}</span></button>`)
  const actions = [
    labelled('customize-toggle', icon(Palette), 'Your fairy'), labelled('stickers-toggle', icon(Sticker), 'Stickers'), labelled('settings-toggle', icon(Settings), 'Settings'),
    labelled('sound-toggle', soundIcon(), 'Sound', state.sound), labelled('orbit-speed-toggle', `<span class="m-speed">${speedLabel()}</span>`, 'World speed', state.speed > 0),
  ].join('')
  const flightMenu = `<div class="m-backdrop"></div><div class="m-menu" role="dialog" aria-label="Your flight"><header><h3>Your flight</h3><button type="button" class="m-close" data-act="close-menu" aria-label="Close menu">×</button></header>
    <div class="m-actions">${actions}</div>
    <div class="m-adventure-menu"><button type="button" class="m-home" data-act="follow-home"><span>✿</span> Guide me home</button><div class="m-row">${skyButtons()}</div></div>
    ${destination(true)}<div class="m-speedo boxed"><span>✦</span><div><p class="m-eyebrow">GLIDE SPEED</p><strong>11 <small>m/s</small></strong></div></div>
    <p class="m-touch-help">Hold the arrows to steer. Hold Boost to go faster. Tap Hover to stop.</p></div>`
  return `<div class="mock phone" style="--w:390px;--h:844px">${sky(390, 844)}
    <div class="m-top"><button type="button" class="m-pill" data-act="open-menu">☰ Menu</button><button type="button" class="m-pill" data-act="open-map">◉ Worlds</button><button type="button" class="m-round" data-act="pause-toggle" aria-label="Pause">${icon(Pause)}</button></div>
    <div class="m-arrows" aria-hidden="true"><span>↑</span><span>←</span><span>↓</span><span>→</span></div>
    <div class="m-thumbs" aria-hidden="true"><span>✦<small>Boost</small></span><span>◉<small>Hover</small></span></div>
    ${menu && !state.settings ? flightMenu : ''}${state.settings ? settingsPanel() : ''}</div>`
}

function fit() {
  const mock = frame.firstElementChild as HTMLElement | null
  if (!mock) return
  const width = parseFloat(mock.style.getPropertyValue('--w')), height = parseFloat(mock.style.getPropertyValue('--h'))
  const room = stage.clientWidth - 32, tall = Math.max(320, Math.min(state.device === 'computer' ? 560 : 640, innerHeight - 400))
  const scale = Math.min(1, room / width, tall / height)
  mock.style.transform = `scale(${scale})`
  frame.style.width = `${width * scale}px`; frame.style.height = `${height * scale}px`
}

function render() {
  frame.innerHTML = state.device === 'computer' ? computer() : phone(state.device === 'menu')
  fit()
  document.querySelectorAll<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === state.option)))
  document.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === state.device)))
  document.querySelectorAll<HTMLButtonElement>('[data-where]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.where === state.where)))
  get('#option-line').textContent = OPTIONS[state.option].line
  const today = { computer: computerButtons('today').length, menu: phoneMenuButtons('today').length }
  const now = { computer: computerButtons(state.option).length, menu: phoneMenuButtons(state.option).length }
  get('#r-computer').textContent = now.computer === today.computer ? String(now.computer) : `${now.computer} (today ${today.computer})`
  get('#r-menu').textContent = now.menu === today.menu ? String(now.menu) : `${now.menu} (today ${today.menu})`
  get('#r-sections').textContent = String(settingsFor(state.option).length)
  get('#r-saved').textContent = savesSky(state.option) ? 'Star pictures, Orbit paths' : 'None'
  const moved = CONTROLS.filter(control => placeOf(control, state.option) !== 'screen')
  get('#moves').innerHTML = moved.length ? moved.map(control => `<li><span>${control.label}</span><b data-place="${placeOf(control, state.option)}">${PLACE[placeOf(control, state.option)]}</b></li>`).join('') : '<li><span>Nothing moves.</span></li>'
}

function renderInventory() {
  const cell = (place: Place) => `<td><span class="pill" data-place="${place}">${PLACE[place]}</span></td>`
  get('#inventory').innerHTML = `<thead><tr><th scope="col">Control</th><th scope="col">Today</th><th scope="col">Used by</th>${UI_OPTIONS.slice(1).map(option => `<th scope="col">${OPTIONS[option].letter} · ${OPTIONS[option].name}</th>`).join('')}<th scope="col">Code</th></tr></thead>
    <tbody>${CONTROLS.map(control => `<tr><th scope="row">${control.label}${control.button ? '' : ' <small>(text)</small>'}<p>${control.why}</p></th><td>${AREA[control.area]}</td><td>${control.who}</td>${UI_OPTIONS.slice(1).map(option => cell(placeOf(control, option))).join('')}<td><code>${control.code}</code></td></tr>`).join('')}</tbody>`
}

// The drawing: the buttons act as the game does, and the Settings switches share the same state.
frame.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act], [data-speed]')
  if (!target) return
  if (target.dataset.speed) state.speed = Number(target.dataset.speed)
  switch (target.dataset.act) {
    case 'settings-toggle': state.settings = true; break
    case 'close-settings': state.settings = false; break
    case 'open-menu': state.device = 'menu'; break
    case 'close-menu': state.device = 'phone'; break
    case 'show-stars': state.stars = !state.stars; break
    case 'show-orbits': state.orbits = !state.orbits; break
    case 'sound-toggle': state.sound = !state.sound; break
    case 'orbit-speed-toggle': state.speed = (state.speed + 1) % WORLD_SPEEDS.length; break
    default: if (!target.dataset.speed) return
  }
  render()
})
frame.addEventListener('change', event => {
  const input = event.target as HTMLInputElement
  if (input.dataset.switch === 'stars') state.stars = input.checked
  if (input.dataset.switch === 'orbits') state.orbits = input.checked
  if (input.dataset.switch === 'sound') state.sound = input.checked
  render()
})
document.querySelectorAll<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { state.option = button.dataset.option as Option; render() }))
document.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => button.addEventListener('click', () => { state.device = button.dataset.device as Device; state.settings = false; render() }))
document.querySelectorAll<HTMLButtonElement>('[data-where]').forEach(button => button.addEventListener('click', () => { state.where = button.dataset.where as Where; render() }))
get<HTMLInputElement>('#ghosts').addEventListener('change', event => { state.ghosts = (event.target as HTMLInputElement).checked; render() })
get('#open-settings').addEventListener('click', () => { state.settings = true; render(); frame.querySelector<HTMLElement>('.m-close')?.focus() })
new ResizeObserver(fit).observe(stage)

get('#decisions').addEventListener('change', event => {
  const input = event.target as HTMLInputElement
  const decision = decisions.find(item => item.id === input.name)!
  answers[decision.id] = decision.options[Number(input.value)]
  try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { get('#save-note').textContent = 'The browser does not keep the answers. Use Save study before you leave.' }
})
get('#export').addEventListener('click', () => {
  const data = {
    study: 'ui-simplify-study', exported: new Date().toISOString(), answers,
    options: Object.fromEntries(UI_OPTIONS.map(option => [option, { computerButtons: computerButtons(option).map(control => control.label), phoneMenuButtons: phoneMenuButtons(option).map(control => control.label), settings: settingsFor(option).map(section => ({ title: section.title, rows: section.settings.map(setting => setting.title) })), savesSky: savesSky(option) }])),
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  link.download = 'ui-simplify-study.json'
  link.click()
  URL.revokeObjectURL(link.href)
})

renderInventory()
render()
