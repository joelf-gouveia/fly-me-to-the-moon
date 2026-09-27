import './style.css'
import { createCloudScene, ELEVATION } from './scene'
import type { Flight, Light, StudySettings, View } from './scene'
import { budget, CLEAR_ANGLE, CLOUD_SPEED, HOME, MIST, OPTIONS, PALETTE, TODAY } from './model'
import type { CloudOption, Device } from './model'
import studyUrl from '../../docs/cotton-candy-cloud-study.md?url'

const options = Object.keys(OPTIONS) as CloudOption[]
const proposals = options.filter(option => option !== 'today')
const viewNames: Record<View, string> = { garden: 'From the garden', layer: 'In the cloud layer', planet: 'Whole planet' }
const lightNames: Record<Light, string> = { day: 'Day', golden: 'Golden hour', night: 'Night' }
const flightNames: Record<Flight, string> = { fly: `Fly · ${CLOUD_SPEED} m/s`, hover: 'Hover' }
const number = (value: number) => value.toLocaleString('en')
const hex = (value: number) => `#${value.toString(16).padStart(6, '0')}`
const cost = (option: CloudOption, device: Device = 'desktop') => budget(option, device)
const today = cost('today')

const about: Record<Exclude<CloudOption, 'today'>, { garden: string; layer: string; night: string; game: string; work: string; risk: string }> = {
  tint: {
    garden: 'The same flat, soft clouds, now in pink, blue and lilac. From the ground, each cluster has one color.',
    layer: 'The same see-through ellipsoids. The fairy flies through them as before.',
    night: 'The colors go lilac and grey with the rest of the sky. The light of the game does all the work.',
    game: 'One color for each instance in buildClouds(): setColorAt() and a white material. No new objects.',
    work: 'Very small: about ten lines in src/worlds.ts.',
    risk: 'The clouds look like colored clouds, not like cotton candy. The shape does not change, and from below the bases stay olive grey.',
  },
  puffs: {
    garden: 'Round, fluffy tufts with a blush at the base and bright tops. Fine strands turn around each puff.',
    layer: 'Tufts come out of the mist and go past. Inside a puff, the pink mist carries the feeling.',
    night: 'The same material as the terrain, so the tufts go into night with the garden. The planet shadow applies.',
    game: `One instanced mesh with the same ${TODAY.puffs} instances. A built-in material with an onBeforeCompile change, as for the water.`,
    work: 'Small to medium: a new cloud module for Blossom Haven only.',
    risk: `${number(cost('puffs').triangles)} triangles on a computer, ${number(cost('puffs', 'phone').triangles)} on a phone. The puffs are opaque, so they hide more of the sky.`,
  },
  cones: {
    garden: 'The tufts of B. Some tufts sit on striped paper cones, as at a fair. Sugar sparkles twinkle around them.',
    layer: 'The fairy flies past a cone of floss as tall as a house. Sparkles pass in the mist.',
    night: 'The cones and tufts go dark with the garden. The sparkles twinkle at night too.',
    game: `B, with ${cost('cones').cones} cones and ${number(cost('cones').sparkles)} sparkles: two more draw calls.`,
    work: 'Medium: B, a cone mesh and a sparkle layer.',
    risk: 'Cones in the sky are a large joke. Some players can find them silly. The sparkles ignore the planet shadow.',
  },
}

const chip = (attribute: string, id: string, text: string) => `<button type="button" ${attribute}="${id}" aria-pressed="false">${text}</button>`
const swatch = (color: number, name: string) => `<span class="swatch" style="--swatch:${hex(color)}"></span>${name}`

document.querySelector<HTMLDivElement>('#cotton-candy-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>·</b> COTTON CANDY SKY</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">THE CLOUDS OF BLOSSOM HAVEN WERE PALE PINK.</p><h1>Spun-sugar <em>skies.</em></h1></div>
      <p>Three ways to make the clouds of the fairy world into cotton candy. Compare them over the real Blossom Haven terrain: from the garden, in the cloud layer, and from space. In Australia, cotton candy is still called <em>fairy floss</em>.<br>A proposal for the game. The game now uses option B. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive cotton candy cloud study">
      <div class="preview-column">
        <div id="sky">
          <div class="scene-top"><span class="tag">LIVE 3D · BLOSSOM HAVEN</span><span class="tag" id="mode-label"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help" id="scene-help">Drag to turn · scroll or pinch to zoom</span></div>
        <div class="finder">
          <div class="finder-group"><p class="eyebrow">VIEW</p><div class="chips">${(Object.keys(viewNames) as View[]).map(view => chip('data-view', view, viewNames[view])).join('')}<button type="button" id="reset-view">Reset view</button></div></div>
          <div class="finder-group"><p class="eyebrow">LIGHT</p><div class="chips">${(Object.keys(lightNames) as Light[]).map(light => chip('data-light', light, lightNames[light])).join('')}</div></div>
          <div class="finder-group"><p class="eyebrow">THE FAIRY IN THE CLOUD LAYER</p><div class="chips">${(Object.keys(flightNames) as Flight[]).map(flight => chip('data-flight', flight, flightNames[flight])).join('')}</div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${options.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p class="eyebrow section">01 / THE LOOK</p><h2 id="option-title"></h2><p id="option-line"></p>
        <fieldset><legend>Device</legend><div class="segmented"><button type="button" data-device="desktop" aria-pressed="true">Computer</button><button type="button" data-device="phone" aria-pressed="false">Phone · half</button></div></fieldset>
        <label class="check"><input id="mist" type="checkbox" /> Pink mist in the cloud layer</label>
        <p class="hint">The game mist is white on every world. Fly through the layer to see the difference.</p>
        <div class="budget"><p class="eyebrow">02 / COST IN THE GAME</p>
          <div class="meter-row"><span>Cloud puffs</span><output id="b-puffs"></output></div>
          <div class="meter-row"><span>Tufts or clusters</span><output id="b-tufts"></output></div>
          <div class="meter-row"><span>Paper cones</span><output id="b-cones"></output></div>
          <div class="meter-row"><span>Sugar sparkles</span><output id="b-sparkles"></output></div>
          <div class="meter-row"><span>Cloud draw calls</span><output id="b-calls"></output></div>
          <div class="meter-row"><span>Cloud triangles</span><output id="b-triangles"></output></div>
          <div class="meter-row"><span>See-through (overdraw)</span><output id="b-transparent"></output></div>
          <div class="meter-row"><span>Work per frame</span><output id="b-frame"></output></div>
          <div class="meter-row"><span>Puffs over the cottage</span><output id="b-cottage"></output></div>
          <div class="meter-row measured"><span>This preview now · draw calls, whole scene</span><output id="b-measured"></output></div>
        </div>
      </aside>
    </section>

    <section class="option-cards" aria-labelledby="options-title"><div class="section-title"><p class="eyebrow">03 / THREE OPTIONS</p><h2 id="options-title">Three ways to spin the sky.</h2></div>
      <div class="cards">${proposals.map(option => `<article data-card="${option}"><p class="letter">${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3><p class="line">${OPTIONS[option].line}</p>
        <dl><dt>From the garden</dt><dd>${about[option].garden}</dd><dt>In the cloud layer</dt><dd>${about[option].layer}</dd><dt>At night</dt><dd>${about[option].night}</dd><dt>In the game</dt><dd>${about[option].game}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        <button type="button" data-show="${option}">Show option ${OPTIONS[option].letter}</button></article>`).join('')}</div>
      <div class="table-wrap"><table><caption>Cost of the Blossom Haven clouds on a computer. A phone draws half of the puffs.</caption>
        <thead><tr><th scope="col">Measure</th>${options.map(option => `<th scope="col">${OPTIONS[option].letter === '—' ? '' : `${OPTIONS[option].letter} · `}${OPTIONS[option].name}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Cloud puffs</th>${options.map(option => `<td>${number(cost(option).puffs)}</td>`).join('')}</tr>
          <tr><th scope="row">Paper cones · sparkles</th>${options.map(option => `<td>${cost(option).cones} · ${number(cost(option).sparkles)}</td>`).join('')}</tr>
          <tr><th scope="row">Draw calls</th>${options.map(option => `<td>${cost(option).drawCalls}</td>`).join('')}</tr>
          <tr><th scope="row">Triangles · computer</th>${options.map(option => `<td>${number(cost(option).triangles)}</td>`).join('')}</tr>
          <tr><th scope="row">Triangles · phone</th>${options.map(option => `<td>${number(cost(option, 'phone').triangles)}</td>`).join('')}</tr>
          <tr><th scope="row">See-through</th>${options.map(option => `<td>${cost(option).transparent ? 'Yes' : 'No'}</td>`).join('')}</tr>
          <tr><th scope="row">Instance data</th>${options.map(option => `<td>${cost(option).instanceKb} KB</td>`).join('')}</tr>
          <tr><th scope="row">Puffs over the cottage</th>${options.map(option => `<td>${cost(option).overCottage}</td>`).join('')}</tr>
        </tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">04 / WHAT EVERY OPTION NEEDS</p><h2>Candy colors are easy.<br>The light is not.</h2>
      <p>Before option B, Blossom Haven had ${TODAY.puffs} cloud puffs, ${HOME.cloudHeight} to ${HOME.cloudHeight + 8} m above sea level: one instanced mesh, pale pink (<code>${hex(TODAY.color)}</code>) and ${TODAY.opacity * 100}% opaque. The palette of option B:</p>
      <p class="palette">${swatch(PALETTE.pink, 'Pink')}${swatch(PALETTE.blue, 'Blue')}${swatch(PALETTE.lilac, 'Lilac')}${swatch(PALETTE.cream, 'Cream')}${swatch(MIST.candy, 'Mist')}</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>Keep the planet shadow</h3><p><code>createSunShading()</code> in <code>src/sun-shading.ts</code> patches only built-in lit materials. A <code>ShaderMaterial</code> cloud stays bright on the night side and in an eclipse. Change a <code>MeshStandardMaterial</code> in <code>onBeforeCompile</code>, as the water ripples do.</p></div></article>
        <article><span>02</span><div><h3>Give the mist the cloud color</h3><p><code>cloudWhite</code> in <code>src/main.ts</code> tints the mist of every world. Give Blossom Haven its own mist color (<code>${hex(MIST.candy)}</code>). Earth keeps white.</p></div></article>
        <article><span>03</span><div><h3>Keep the way home clear</h3><p>Before, ${today.overCottage} puffs came within ${CLEAR_ANGLE} rad (20 m at cloud height) of the cottage. Opaque tufts can hide the flower. B and C keep that column empty.</p></div></article>
        <article><span>04</span><div><h3>Fit the phone budget</h3><p>Use half of the puffs when <code>world.mobile</code> is true, as before, and a coarser sphere. B on a phone has about the triangles of the old clouds on a computer.</p></div></article>
        <article><span>05</span><div><h3>Change Blossom Haven only</h3><p><code>buildClouds()</code> serves every world. Add a branch for <code>world.kind === 'fairy'</code> that calls a new <code>src/cotton-candy.ts</code>, as <code>buildCandyEcosystem()</code> does for the ground.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">NOW IN THE GAME</p><h3>B, with the pink mist</h3><p>The game uses B and the pink mist on Blossom Haven. B makes the clouds look like cotton candy with one draw call and the same number of instances. A is a fallback if the frame rate on a phone is too low.</p></article>
      <article><p class="eyebrow">A DECISION TO MAKE</p><h3>Cones in the sky?</h3><p>The ground already has literal candy: lollipops, candy canes and marshmallow stones. C puts the same joke in the sky. Add C as a second step only if the children like it.</p></article>
      <article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>Flight through an opaque puff</h3><p>In B and C, the camera sees nothing of a puff from inside it. The mist is at its thickest there. Check on a phone that the change from puff to mist is gentle.</p></article></section>
    <section class="credits"><p class="eyebrow">NOTES</p>
      <p>The preview uses the game code: the terrain, candy, creatures and cottage from <code>regenerateWorld()</code>, the sun shading from <code>createSunShading()</code>, and the light, sky and mist formulas of <code>updateEnvironment()</code>. The sun is at ${ELEVATION.day}°, ${ELEVATION.golden}° and ${ELEVATION.night}° above the garden. The preview has no atmosphere shell, so the sky from space is black.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE · COTTON CANDY SKY</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const settings: StudySettings = { option: 'puffs', device: 'desktop', view: 'garden', light: 'day', flight: reducedMotion ? 'hover' : 'fly', mist: true }
const sky = createCloudScene(element('#sky'))

const captions: Record<View, (option: CloudOption) => string> = {
  garden: option => option === 'today' ? 'From the cottage garden, the clouds are thin pale ellipsoids. Some are over the cottage.'
    : option === 'tint' ? 'The same clouds in cotton candy colors. Each cluster has one color.'
    : option === 'puffs' ? 'Round tufts of pink and blue floss. The sky over the cottage stays open.'
    : 'Tufts of floss, some on striped paper cones, with sugar sparkles.',
  layer: () => settings.mist ? 'The fairy flies through the cloud layer at 28 m. The mist is candy pink.' : 'The fairy flies through the cloud layer at 28 m. The mist is white, as in the game before option B.',
  planet: option => option === 'today' || option === 'tint' ? 'From space, the clouds are a thin, even layer.' : 'From space, the tufts are round spots of pink and blue.',
}

function render() {
  sky.apply(settings)
  const { letter, name } = OPTIONS[settings.option]
  const label = letter === '—' ? name.toUpperCase() : `OPTION ${letter} · ${name.toUpperCase()}`
  all<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === settings.option)))
  all<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === settings.view)))
  all<HTMLButtonElement>('[data-light]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.light === settings.light)))
  all<HTMLButtonElement>('[data-flight]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.flight === settings.flight))
    button.disabled = settings.view !== 'layer'
  })
  all<HTMLButtonElement>('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === settings.device)))
  all<HTMLElement>('[data-card]').forEach(card => card.classList.toggle('selected', card.dataset.card === settings.option))
  element('#mode-label').textContent = label
  element('#caption-kicker').textContent = `${label} · ${viewNames[settings.view].toUpperCase()} · ${lightNames[settings.light].toUpperCase()}`
  element('#caption-title').textContent = name
  element('#caption-note').textContent = captions[settings.view](settings.option)
  element('#scene-help').textContent = settings.view === 'layer' && settings.flight === 'fly' ? 'Choose Hover to look around' : 'Drag to turn · scroll or pinch to zoom'
  element('#option-title').textContent = letter === '—' ? name : `${letter} · ${name}`
  element('#option-line').textContent = OPTIONS[settings.option].line
  element<HTMLInputElement>('#mist').checked = settings.mist
  const now = budget(settings.option, settings.device)
  element('#b-puffs').textContent = number(now.puffs)
  element('#b-tufts').textContent = number(now.tufts)
  element('#b-cones').textContent = now.cones ? String(now.cones) : 'None'
  element('#b-sparkles').textContent = now.sparkles ? number(now.sparkles) : 'None'
  element('#b-calls').textContent = String(now.drawCalls)
  element('#b-triangles').textContent = number(now.triangles)
  element('#b-transparent').textContent = now.transparent ? 'Yes' : 'No'
  element('#b-frame').textContent = now.perFrame
  element('#b-cottage').textContent = String(now.overCottage)
}
setInterval(() => { element('#b-measured').textContent = String(sky.stats.calls) }, 500)

all<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { settings.option = button.dataset.option as CloudOption; render() }))
all<HTMLButtonElement>('[data-show]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.show as CloudOption; render()
  element('#sky').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
}))
all<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { settings.view = button.dataset.view as View; render() }))
all<HTMLButtonElement>('[data-light]').forEach(button => button.addEventListener('click', () => { settings.light = button.dataset.light as Light; render() }))
all<HTMLButtonElement>('[data-flight]').forEach(button => button.addEventListener('click', () => { settings.flight = button.dataset.flight as Flight; render() }))
all<HTMLButtonElement>('[data-device]').forEach(button => button.addEventListener('click', () => { settings.device = button.dataset.device as Device; render() }))
element('#reset-view').addEventListener('click', () => sky.resetView())
element<HTMLInputElement>('#mist').addEventListener('change', event => { settings.mist = (event.target as HTMLInputElement).checked; render() })

element('#export').addEventListener('click', () => {
  const payload = {
    study: 'cotton-candy-clouds', version: 1, status: 'proposal-only', settings,
    home: HOME, today: TODAY, palette: Object.fromEntries(Object.entries(PALETTE).map(([key, value]) => [key, hex(value)])),
    mist: { today: hex(MIST.today), candy: hex(MIST.candy) }, clearAngle: CLEAR_ANGLE,
    options: Object.fromEntries(options.map(option => [option, { ...OPTIONS[option], desktop: budget(option, 'desktop'), phone: budget(option, 'phone') }])),
    recommendation: 'B with the pink mist. Keep the column above the cottage clear. Decide on the cones of C after a test with children.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'cotton-candy-cloud-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__cloudStudy', { value: { settings: () => ({ ...settings }), stats: () => ({ ...sky.stats }) } })
