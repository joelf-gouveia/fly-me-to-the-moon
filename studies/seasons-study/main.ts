import './style.css'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { LIVE, live, SEASON_CLIPS } from './clips'
import type { LivePlace } from './clips'
import {
  CLIPS, clipById, dayHours, DECISIONS, declination, directionOf, EARTH_TILT, FINDINGS, groundColour, latitudeLabel, MAGIC, magicAt,
  magicColour, monthAt, noonElevation, OPTIONS, PALETTE, PATTERNS, SEASON_NAMES, seasonAt, WORLD_NAMES, YEAR_SECONDS, yearOfDate,
} from './model'
import type { ClipId, Pattern, WorldId } from './model'
import studyUrl from '../../docs/seasons-study.md?url'
import studyText from '../../docs/seasons-study.md?raw'
import sharedStyle from '../feature-ideas-study/page.css?inline'
import pageStyle from './page.css?inline'

const root = document.querySelector<HTMLDivElement>('#seasons-study')!
const title = (text: string) => text[0].toUpperCase() + text.slice(1)

/** The capture page: the lab alone at the size of the window. seasons-study-capture.mjs asks for each frame. */
function startCapture() {
  document.body.classList.add('is-capture')
  root.innerHTML = '<div class="stage capture-stage" id="scene"></div>'
  const lab = createLab(root.querySelector<HTMLElement>('#scene')!)
  lab.capture(true)
  Object.defineProperty(window, '__capture', { value: {
    features: Object.keys(SEASON_CLIPS),
    load(id: ClipId) {
      lab.load(SEASON_CLIPS[id])
      const run = lab.run!
      return { duration: run.duration, still: run.still ?? run.duration * 0.6 }
    },
    frame(delta: number) { lab.step(delta); return { t: lab.time, playing: lab.playing } },
    cues: () => [],
    get lab() { return lab },
  } })
}

/**
 * The season map: the ground colour of each latitude through one year. Earth uses groundColour() of
 * model.ts. Blossom Haven uses magicColour() with the pattern "Rings from the cottage".
 */
function seasonMap(world: WorldId) {
  const columns = 96, rows = 60, width = 600, height = 300, left = 44, top = 8, bottom = 24
  const cell = { w: (width - left) / columns, h: (height - top - bottom) / rows }
  let cells = ''
  for (let row = 0; row < rows; row++) {
    const latitude = 90 - (row + 0.5) * 180 / rows
    for (let column = 0; column < columns; column++) {
      cells += `<rect x="${(left + column * cell.w).toFixed(1)}" y="${(top + row * cell.h).toFixed(1)}" width="${(cell.w + 0.6).toFixed(1)}" height="${(cell.h + 0.6).toFixed(1)}" fill="${world === 'earth' ? groundColour(latitude, column / columns) : magicColour('rings', directionOf(latitude), column / columns - 0.125)}"/>`
    }
  }
  const y = (latitude: number) => top + (90 - latitude) / 180 * (height - top - bottom)
  const marks = [60, 30, 0, -30, -60].map(latitude => `<text x="${left - 6}" y="${y(latitude) + 4}" text-anchor="end">${latitude === 0 ? '0°' : `${Math.abs(latitude)}° ${latitude > 0 ? 'N' : 'S'}`}</text>`).join('')
  const bands = world === 'earth' ? [24, 10, -10, -24].map(latitude => `<line class="band" x1="${left}" x2="${width}" y1="${y(latitude)}" y2="${y(latitude)}"/>`).join('') : ''
  const months = [0, 0.25, 0.5, 0.75].map((year, index) => `<text x="${left + year * (width - left) + 4}" y="${height - 7}">${world === 'earth' ? monthAt(year + 0.03) : MAGIC[index].name}</text>`).join('')
  return `<figure><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="The ground colour of ${WORLD_NAMES[world]} at each latitude through one year">${cells}${bands}${marks}${months}</svg>
    <figcaption><b>${WORLD_NAMES[world]}.</b> ${world === 'earth' ? 'Each column is one day of the year. Each row is one latitude, with the north at the top. The dashed lines are 10° and 24°.' : 'Each column is one moment of the magic year; the names are the seasons at the cottage. The cottage is at the bottom. A season starts there and goes up to the far side.'}</figcaption></figure>`
}

function startPage() {
  const style = document.createElement('style')
  style.textContent = sharedStyle + pageStyle
  document.head.append(style)
  showErrors()
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/seasons/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'E1') as ClipId, live: false }
  const STORE = 'fairy-seasons-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const today = yearOfDate(new Date())
  const june = declination(0.25), december = declination(0.75)
  const sunRow = (latitude: number) => {
    const noon = (sun: number) => noonElevation(latitude, sun) < 0 ? 'No Sun' : `${Math.round(noonElevation(latitude, sun))}°`
    const season = seasonAt(latitude, 0.375)
    return `<tr><th>${latitudeLabel(latitude)}</th><td>${noon(june)}</td><td>${noon(december)}</td><td>${dayHours(latitude, june).toFixed(1)} h</td><td>${dayHours(latitude, december).toFixed(1)} h</td><td>${season.strength < 0.08 ? 'No season' : season.strength < 0.95 ? 'A weak season' : Math.abs(latitude) > 64 ? 'A long day and a long night' : 'Four seasons'}</td></tr>`
  }
  const picture = (file: string, alt: string, name: string, words: string) => `<figure><img src="${media(file)}" alt="${alt}" loading="lazy" width="1280" height="720"><figcaption><b>${name}</b>${words}</figcaption></figure>`
  const earthRow = `<p class="season-row-title">Earth, a leaf forest at 32° N: the four seasons of the real world</p><div class="season-row">${SEASON_NAMES.map((name, index) => picture(`E2-${index}.jpg`, `Earth at 32° N in ${name}`, title(name), PALETTE.words[name])).join('')}</div>`
  const magicRow = `<p class="season-row-title">Blossom Haven: four magic seasons, each with its own plants</p><div class="season-row">${MAGIC.map((season, index) => picture(`B2-${index}.jpg`, `Blossom Haven in ${season.name}`, season.name, `${season.line} ${season.plants}. ${season.air}.`)).join('')}</div>`

  root.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>19</b> / THE SEASONS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">TIME ON EARTH AND ON BLOSSOM HAVEN</p><h1>A year on <em>two worlds.</em></h1></div>
      <p>Earth gets the seasons of the real world. The place changes the season: the north has summer while the south has winter, and the equator has no season. Blossom Haven gets magic seasons of its own: Blossom time, Bubble time, Lantern time and Crystal time, each with its own plants. Each clip comes from the engine of the game, with the seasons added by study code. <b>Try it live</b> gives you the year and the place.<br>The study does not change the game. Your answers go at the end of the page. <a href="#technical-title">Read the study ↓</a></p></header>

    <section class="workspace" aria-label="The seasons in the engine of the game">
      <div class="stage-column">
        <div class="stage-bar"><div class="chips" role="group" aria-label="Clip">${CLIPS.map(clip => `<button type="button" data-pick="${clip.id}"><b>${clip.id}</b> ${clip.name}</button>`).join('')}</div></div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">Try it live</button></div>
          <p class="section-note" id="player-note"></p>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <section class="section-block" aria-labelledby="rule-title">
      <p class="eyebrow">01 / EARTH: WHY THE PLACE CHANGES THE SEASON</p>
      <h2 id="rule-title">One number for each place: how high the Sun gets at noon</h2>
      <p class="section-note">Earth leans 23.4° on its axis. For half of the year the north leans toward the Sun, and for the other half the south does. The study gives each place a warmth: the sine of the height of the noon Sun, <code>cos(latitude − Sun latitude)</code>. The colours, the snow line and the sea ice all come from that number and from the latitude. The climate belts of the game are nearer the equator than on the real Earth, so the bands of the study are nearer the equator too.</p>
      <div class="rules">
        <article><p class="eyebrow">0° TO 10°</p><h3>No season</h3><p>The noon Sun is high all year. The jungle, the savanna and the desert of the game keep their look. The day has 12 hours.</p></article>
        <article><p class="eyebrow">10° TO 52°</p><h3>Four seasons</h3><p>The season grows from 10° and is full from 24°, in the leaf forest and the pine forest of the game. The north and the south are half a year apart. In winter the snow line comes down to 28°.</p></article>
        <article><p class="eyebrow">52° TO THE POLE</p><h3>A long day and a long night</h3><p>The snow stays for most of the year. In summer the Sun does not set, and in winter it does not rise. The sea has ice for a part of the year.</p></article>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Place</th><th>Noon Sun in June</th><th>Noon Sun in December</th><th>Day in June</th><th>Day in December</th><th>Season</th></tr></thead><tbody>${[0, 23, 32, 45, 66, 90, -32].map(sunRow).join('')}</tbody></table></div>
      <p class="section-note">Today is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: ${seasonAt(32, today).name} at 32° N and ${seasonAt(-32, today).name} at 32° S. The game can start its year on the real date (decision 2).</p>
    </section>

    <section class="section-block" aria-labelledby="magic-title">
      <p class="eyebrow">02 / BLOSSOM HAVEN: MAGIC SEASONS</p>
      <h2 id="magic-title">Four seasons that Earth does not have</h2>
      <p class="section-note">Blossom Haven is a magic planet, so the Sun does not make its seasons and the planet does not lean. Each season has a colour, a thing in the air and plants of its own. The plants of a season grow from the ground when it comes and go back when it leaves. The lollipops and the candy canes stay all year. The place changes the season here too: a new season starts at the cottage and goes out in a ring, so the planet shows two or three seasons at one time.</p>
      <div class="rules magic-rules">${MAGIC.map((season, index) => `<article><p class="eyebrow">SEASON ${index + 1}</p><h3>${season.name}</h3><p>${season.line}<br><b>Plants:</b> ${season.plants}.<br><b>Air:</b> ${season.air}.</p></article>`).join('')}</div>
      <div class="map-grid">${seasonMap('earth')}${seasonMap('fairy')}</div>
      <div class="table-wrap"><table><thead><tr><th>Pattern</th><th>Which areas have which season</th></tr></thead><tbody>${PATTERNS.map(pattern => `<tr><th>${pattern.name}${pattern.id === 'rings' ? ' <span class="pill proposed">Proposed</span>' : ''}</th><td>${pattern.line}</td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="four-title">
      <p class="eyebrow">03 / FOUR SEASONS, ONE PLACE</p>
      <h2 id="four-title">The same view at the middle of each season</h2>
      <p class="section-note">These pictures are frames of clips E2 and B2: one tripod, each picture at noon.</p>
      <div class="season-rows">${earthRow}${magicRow}</div>
    </section>

    <section class="section-block" aria-labelledby="clips-title">
      <p class="eyebrow">04 / THE EIGHT CLIPS</p>
      <h2 id="clips-title">Pick one to see it</h2>
      <div class="idea-cards clips">${CLIPS.map(clip => `<button type="button" class="idea-card" data-pick="${clip.id}">
        <img src="${media(`${clip.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${clip.id}</b><strong>${clip.name}</strong></span>
        <span class="idea-line">${clip.line}</span></button>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">05 / WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([heading, text]) => `<li><h3>${heading}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">06 / EARTH: TWO WAYS TO MAKE A SEASON</p>
      <h2 id="options-title">Lean the world, or paint the year</h2>
      <p class="section-note">The look is the same in the two options: the same shader reads the latitude and the day of the year. The options differ in the Sun. Clip E4 shows them one after the other. Blossom Haven does not lean in the two options.</p>
      <div class="option-grid">${OPTIONS.map(option => `<article class="option-card"><h3><b>${option.id}</b>${option.name}</h3><p>${option.line}</p><h4>Good</h4><ul>${option.good.map(text => `<li>${text}</li>`).join('')}</ul><h4>Cost</h4><ul>${option.bad.map(text => `<li>${text}</li>`).join('')}</ul></article>`).join('')}</div>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">07 / RECOMMENDATION</p><h2 id="brief-title">Lean Earth. Give Blossom Haven its own magic.</h2>
        <p>Earth is the real world of the game, so it gets the real cause: a tilt of 23.4°. Blossom Haven is magic and it jumps, so it gets four magic seasons with plants of their own. Each hop of the planet brings the next season, and each season starts at the cottage.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>The model</h3><p>A new <code>src/seasons.ts</code> with the Sun latitude, the warmth of a place and the look phase, with unit tests. The numbers of this study are the start.</p></div></article>
        <article><span>2</span><div><h3>Earth leans</h3><p><code>createWorlds()</code> gives Earth a tilt of 23.4°, with the axis turned to the real date. <code>morningSpin()</code> takes the tilted axis. The start meadow moves to the leaf forest, 24° to 34° N.</p></div></article>
        <article><span>3</span><div><h3>The ground, the sea and the plants</h3><p>One shader change in <code>buildGround()</code> and in <code>foliageMaterial()</code> of <code>src/foliage/build.ts</code>, with three shared uniforms. No new mesh and no new texture.</p></div></article>
        <article><span>4</span><div><h3>Petals, leaves and snow</h3><p>One small cloud of points near the fairy, with the kind from her latitude.</p></div></article>
        <article><span>5</span><div><h3>Blossom Haven</h3><p>The four colours, the plants of each season as instances of <code>src/foliage/</code>, and the ring from the cottage. <code>moveHome()</code> steps the season. No tilt.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">08 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes for ${esc(decision.title)}">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">09 / THE TECHNICAL STUDY</p><h2 id="technical-title">The findings, the model and the change for each part</h2><p>The same text as <a href="${studyUrl}">docs/seasons-study.md</a>.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 19</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const video = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null

  const places: [LivePlace, string][] = [['space', 'From space'], [60, '60° N'], [45, '45° N'], [32, '32° N'], [0, 'Equator'], [-32, '32° S'], ['cottage', 'Pole']]
  const chips = (name: string, options: [string, string][], current: string) => `<div class="chips" role="group">${options.map(([value, label]) => `<button type="button" data-live="${name}" data-value="${value}" aria-pressed="${value === current}">${label}</button>`).join('')}</div>`
  function renderDetail() {
    const clip = clipById(state.id), magic = live.world === 'fairy'
    get('#detail').innerHTML = state.live ? `
      <p class="eyebrow">LIVE 3D</p>
      <h2>The year in your hands</h2>
      <div class="live-controls">
        <div class="field"><span>World</span>${chips('world', [['earth', 'Earth'], ['fairy', 'Blossom Haven']], live.world)}</div>
        <div class="field"><span>Place</span>${chips('place', places.map(([value, label]) => [String(value), value === 'cottage' && magic ? 'Cottage' : label]), String(live.place))}</div>
        <label class="field"><span>${magic ? 'Magic year' : 'Day of the year'} <b id="year-label"></b></span><input type="range" id="year" min="0" max="1" step="0.002" value="${live.year}"></label>
        <div class="chips"><button type="button" id="play-year" aria-pressed="${live.play}">${live.play ? '❚❚ Stop the year' : '▶ Play the year'}</button>${magic ? '' : '<button type="button" id="today">Today</button>'}</div>
        ${magic ? `<div class="field"><span>Seasons</span>${chips('model', [['A', 'Magic seasons'], ['today', 'Game of today']], live.model === 'today' ? 'today' : 'A')}</div>
        <div class="field"><span>How a season spreads</span>${chips('pattern', PATTERNS.map(pattern => [pattern.id, pattern.name]), live.pattern)}</div>`
        : `<div class="field"><span>Seasons</span>${chips('model', [['A', 'A · Real tilt'], ['B', 'B · Painted'], ['today', 'Game of today']], live.model)}</div>
        <label class="field"><span>Tilt <b id="tilt-label"></b></span><input type="range" id="tilt" min="0" max="40" step="0.1" value="${live.tilt}"></label>`}
        <label class="field"><span>Hour of the day <b id="hour-label"></b></span><input type="range" id="hour" min="0" max="24" step="0.25" value="${live.hour}"></label>
        <label class="check"><input type="checkbox" id="weather"${live.weather ? ' checked' : ''}> ${magic ? 'Petals, bubbles, fireflies and glitter' : 'Petals, leaves and snow'}</label>
        ${magic ? `<label class="check"><input type="checkbox" id="garden"${live.garden ? ' checked' : ''}> The garden of always blossom (cottage)</label>` : ''}
        <div class="chips"><button type="button" id="free" aria-pressed="${live.free}">${live.free ? 'Back to the tripod' : 'Free flight'}</button></div>
      </div>` : `
      <p class="eyebrow">${clip.id} · ${WORLD_NAMES[clip.world].toUpperCase()}</p>
      <h2>${clip.name}</h2>
      <p class="lead">${clip.line}</p>
      <h3>What to look at</h3><p>${clip.look}</p>
      <h3>What the clip does not show</h3><p>${clip.honest}</p>`
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id && !state.live)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#player-note').textContent = state.live ? (live.free ? 'Free flight: W and S climb and descend, A and D turn, Shift boosts. Fly north or south to change the season.' : 'Live 3D. The camera is on a tripod. Free flight gives the keys to you.') : ''
    if (state.live) { bindLive(); renderLabels() }
  }
  function renderLabels() {
    const set = (id: string, text: string) => { const element = document.getElementById(id); if (element) element.textContent = text }
    set('year-label', live.world === 'fairy' ? `${magicAt(live.pattern, { x: 0, y: -1, z: 0 }, live.year).season.name} at the cottage` : monthAt(live.year))
    set('tilt-label', `${live.tilt.toFixed(1)}°${Math.abs(live.tilt - EARTH_TILT) < 0.05 ? ' · Earth' : ''}`)
    set('hour-label', `${String(Math.floor(live.hour) % 24).padStart(2, '0')}:${String(Math.round(live.hour % 1 * 60)).padStart(2, '0')}`)
    const slider = document.querySelector<HTMLInputElement>('#year')
    if (slider && live.play && document.activeElement !== slider) slider.value = String(live.year)
  }
  function bindLive() {
    document.querySelectorAll<HTMLButtonElement>('[data-live]').forEach(button => button.addEventListener('click', () => {
      const { live: name, value } = button.dataset
      if (name === 'world') live.world = value as WorldId
      if (name === 'model') live.model = value as typeof live.model
      if (name === 'pattern') live.pattern = value as Pattern
      if (name === 'place') live.place = value === 'space' || value === 'cottage' ? value : Number(value)
      if (name === 'world' || name === 'place') leaveFlight()
      renderDetail()
    }))
    const range = (id: string, apply: (value: number) => void) => document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener('input', event => { apply(Number((event.target as HTMLInputElement).value)); renderLabels() })
    range('year', value => { live.year = value })
    range('tilt', value => { live.tilt = value })
    range('hour', value => { live.hour = value })
    get('#play-year').addEventListener('click', () => { live.play = !live.play; renderDetail() })
    document.querySelector('#today')?.addEventListener('click', () => { live.year = today; live.play = false; renderDetail() })
    get<HTMLInputElement>('#weather').addEventListener('change', event => { live.weather = (event.target as HTMLInputElement).checked })
    document.querySelector<HTMLInputElement>('#garden')?.addEventListener('change', event => { live.garden = (event.target as HTMLInputElement).checked })
    get('#free').addEventListener('click', () => {
      if (live.free) leaveFlight()
      else if (live.place !== 'space') { live.free = true; lab?.fly() }
      renderDetail()
    })
  }
  /** Back to the tripod: the live feature places the fairy and the camera again. */
  function leaveFlight() {
    if (!live.free) return
    live.free = false
    lab?.replay()
  }
  // The year label follows the year while it plays.
  setInterval(() => { if (state.live && live.play) renderLabels() }, 200)

  function loadClip() {
    video.poster = media(`${state.id}.jpg`)
    video.src = media(`${state.id}.webm`)
    if (!state.live) void video.play().catch(() => {})
  }
  function setLive(on: boolean) {
    state.live = on
    get('#live').hidden = !on
    video.hidden = on
    if (on) {
      video.pause()
      const clip = clipById(state.id)
      live.world = clip.world
      live.place = ['E1', 'B1', 'B3'].includes(state.id) ? 'space' : state.id === 'B4' ? 'cottage' : 32
      // The magic year starts in Blossom time. The year of Earth starts in August.
      live.year = clip.world === 'fairy' ? 0 : 0.375
      live.free = false
      lab ??= createLab(get('#live'))
      lab.load(LIVE)
    } else {
      lab?.setPlaying(false)
      void video.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: ClipId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    if (state.live) setLive(false)
    renderDetail()
    loadClip()
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick as ClipId, button.classList.contains('idea-card'))))
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).toUpperCase()
    if (id !== state.id && CLIPS.some(clip => clip.id === id)) pick(id as ClipId)
  })
  get('#mode-clip').addEventListener('click', () => setLive(false))
  get('#mode-live').addEventListener('click', () => setLive(true))

  // ---- The answers ------------------------------------------------------------------------------
  function readAnswers() {
    for (const decision of DECISIONS) {
      const chosen = [...document.querySelectorAll<HTMLInputElement>(`input[name="${decision.id}"]:checked`)].map(input => decision.options[Number(input.value)])
      answers[decision.id] = { choices: chosen, notes: get<HTMLTextAreaElement>(`#${decision.id}-notes`).value.trim() }
    }
    try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { /* The answers stay for this visit. */ }
  }
  get('#decisions').addEventListener('change', readAnswers)
  get('#decisions').addEventListener('input', readAnswers)
  const answerText = () => DECISIONS.map(decision => `${decision.title}\n${(answers[decision.id]?.choices ?? []).map(choice => `- ${choice}`).join('\n') || '- (no answer)'}${answers[decision.id]?.notes ? `\nNotes: ${answers[decision.id].notes}` : ''}`).join('\n\n')
  get('#copy-answers').addEventListener('click', async () => {
    readAnswers()
    try { await navigator.clipboard.writeText(answerText()); get('#save-note').textContent = 'Copied. Paste the answers in the chat with Claude.' }
    catch { get('#save-note').textContent = 'The browser did not allow a copy. Select the answers above, or use Save study.' }
  })
  get('#export').addEventListener('click', () => {
    readAnswers()
    const data = JSON.stringify({ study: 'seasons-study', clip: state.id, live: { ...live }, yearSeconds: YEAR_SECONDS, answers, savedAt: new Date().toISOString() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'seasons-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  loadClip()
}

/** Shows each error of the page in a small bar, so a person who sees a fault can report it. */
function showErrors() {
  const bar = document.createElement('p')
  bar.className = 'error-bar'
  bar.hidden = true
  document.body.append(bar)
  const show = (text: string) => { bar.hidden = false; bar.textContent = `Error: ${text}`.slice(0, 300) }
  window.addEventListener('error', event => show(event.message || String(event.error)))
  window.addEventListener('unhandledrejection', event => show(String(event.reason?.message ?? event.reason)))
}

/** A small Markdown reader for the technical study: headings, paragraphs, lists, tables, code and links. */
function renderMarkdown(text: string) {
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (value: string) => esc(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => /^(https?:|#)/.test(href) ? `<a href="${href}">${label}</a>` : label)
  const lines = text.replace(/\r/g, '').split('\n')
  const html: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    if (line.startsWith('```')) {
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i])
      html.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
    } else if (/^#{1,4} /.test(line)) {
      const level = Math.min(line.indexOf(' ') + 1, 4)
      html.push(`<h${level}>${inline(line.slice(line.indexOf(' ') + 1))}</h${level}>`)
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      for (; i < lines.length && lines[i].startsWith('|'); i++) if (!/^\|[\s:|-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map(cell => cell.trim()))
      i--
      html.push(`<div class="table-wrap"><table><thead><tr>${rows[0].map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
    } else if (/^(\d+\.|-) /.test(line)) {
      const ordered = /^\d+\./.test(line), items: string[] = []
      for (; i < lines.length && /^(\d+\.|-) /.test(lines[i]); i++) {
        let item = lines[i].replace(/^(\d+\.|-) /, '')
        while (i + 1 < lines.length && /^ {2,}\S/.test(lines[i + 1])) item += ' ' + lines[++i].trim()
        items.push(`<li>${inline(item)}</li>`)
      }
      i--
      html.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
    } else {
      const paragraph = [line]
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\||```|\d+\. |- )/.test(lines[i + 1])) paragraph.push(lines[++i])
      html.push(`<p>${inline(paragraph.join(' '))}</p>`)
    }
  }
  return html.join('\n')
}

if (new URLSearchParams(location.search).has('capture')) startCapture()
else startPage()
