import './style.css'
import { createProportionsScene } from './scene'
import type { View } from './scene'
import { checks, codeChanges, CAMERA_FAR, FLIGHT, ideal, layout, metrics, PRESETS, REAL_MOON, TARGETS, TODAY } from './model'
import type { Metrics, Proportions } from './model'
import studyUrl from '../../docs/proportions-study.md?url'

type Key = keyof Proportions
const sliders: Array<{ key: Key; label: string; min: number; max: number; step: number; unit: (value: number) => string }> = [
  { key: 'size', label: 'Planet size', min: 0.75, max: 2.5, step: 0.05, unit: v => `×${v.toFixed(2)} · Earth ${Math.round(220 * v)} m` },
  { key: 'spacing', label: 'Spacing between worlds', min: 0.75, max: 4, step: 0.05, unit: v => `×${v.toFixed(2)} · Earth ${(3.3 * v).toFixed(1)} km from the Sun` },
  { key: 'moonOrbit', label: 'Moon orbit', min: 2, max: 8, step: 0.1, unit: v => `${v.toFixed(1)} Earth radii` },
  { key: 'moonSize', label: 'Moon size', min: 0.15, max: 0.35, step: 0.005, unit: v => `${v.toFixed(3)} of Earth` },
  { key: 'speed', label: 'Flight speed in open space', min: 1, max: 4, step: 0.05, unit: v => `×${v.toFixed(2)} · ${Math.round(FLIGHT.space * v)} m/s` },
  { key: 'sun', label: 'Sun size', min: 0.5, max: 2.5, step: 0.05, unit: v => `×${v.toFixed(2)} · ${Math.round(600 * v)} m` },
]
const viewNames: Record<View, string> = { far: 'From far away', system: 'Whole system', pair: 'Earth and Moon', ground: 'From Earth’s ground' }
const number = (value: number) => Math.round(value).toLocaleString('en')
const percent = (value: number) => `${Math.round(value * 100)}%`
const todayMetrics = metrics(TODAY)
const idealSet = PRESETS.ideal.value()
const big = metrics({ ...TODAY, size: 1.5 }, false)
const closeSky = metrics({ ...TODAY, moonOrbit: 3.5, moonSize: 0.273 }, false).moonSky
const maxSpacing = Math.floor(CAMERA_FAR * 0.9 / todayMetrics.span * 10) / 10

document.querySelector<HTMLDivElement>('#proportions-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>10</b> / PROPORTIONS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">FROM FAR AWAY, THE MOON LOOKS LIKE ONE MORE PLANET.</p><h1>How big is <em>a world?</em></h1></div>
      <p>Change the size of the worlds, the space between them and the Moon. See the result from far away, from Earth’s ground and at the Moon. Twelve targets show what works.<br>The game now uses <b>Planets ×1.25</b>, with the Sun at ×1.6. <i>Today</i> is the game before that change. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive proportions study">
      <div class="preview-column">
        <div id="sizes"><div id="labels" aria-hidden="true"></div>
          <div class="scene-top"><span class="tag">LIVE 3D · SOLAR SYSTEM</span><span class="tag" id="score-tag"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help">Drag to turn · scroll or pinch to zoom</span></div>
        <div class="finder">
          <div class="finder-group"><p class="eyebrow">VIEW</p><div class="chips">${(Object.keys(viewNames) as View[]).map(view => `<button type="button" data-view="${view}" aria-pressed="false">${viewNames[view]}</button>`).join('')}<button type="button" id="reset-view">Reset view</button></div></div>
          <div class="finder-group"><p class="eyebrow">START FROM</p><div class="chips">${(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(id => `<button type="button" data-preset="${id}" title="${PRESETS[id].line}">${PRESETS[id].name}</button>`).join('')}</div></div>
        </div>
      </div>
      <aside class="controls">
        <p class="eyebrow">01 / PROPORTIONS</p>
        ${sliders.map(slider => `<label class="range" for="s-${slider.key}">${slider.label} <output id="o-${slider.key}"></output></label><input id="s-${slider.key}" data-key="${slider.key}" type="range" min="${slider.min}" max="${slider.max}" step="${slider.step}" />`).join('')}
        <button id="find" type="button" class="wide-button">Find the smallest change for this planet size</button>
        <p id="find-note" class="note" role="status"></p>
        <div class="budget"><p class="eyebrow">02 / TARGETS · <span id="score"></span></p><ul id="targets" class="targets"></ul></div>
      </aside>
    </section>

    <section class="neighbourhood" aria-labelledby="hood-title"><div class="section-title"><p class="eyebrow">03 / EARTH’S NEIGHBOURHOOD</p><h2 id="hood-title">A companion, or one more planet?</h2>
      <p>Each line is drawn to its own scale: from Earth to the nearest other world. The ring is the Moon’s orbit. The eye sees a pair when the ring is small compared with the line.</p></div>
      <div id="hood"></div></section>

    <section class="option-cards"><div class="section-title"><p class="eyebrow">04 / TODAY AND THIS SETTING</p><h2>What changes.</h2></div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Measure</th><th scope="col">Today</th><th scope="col">This setting</th></tr></thead><tbody id="compare"></tbody></table></div>
      <div class="table-wrap"><table><caption>The game constants for this setting. Tests with these values also need changes.</caption><thead><tr><th scope="col">File</th><th scope="col">Constant</th><th scope="col">Today</th><th scope="col">This setting</th></tr></thead><tbody id="code"></tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">05 / WHAT THE NUMBERS SAY</p><h2>Planets can grow a little.<br>Space must grow more.</h2>
      <p>Today the Moon’s orbit is ${percent(todayMetrics.pairing)} of the distance from Earth to Mercury. The real Moon’s orbit is about 1% of the distance to the nearest planet. That is why the Moon looks like a planet from far away.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>The pair comes from the spacing</h3><p>The Moon reads as a companion when its orbit is small compared with the gap to other worlds. Larger spacing does this. Larger planets alone do not, because the Moon’s orbit grows with Earth.</p></div></article>
        <article><span>02</span><div><h3>Close and small do not go together</h3><p>A Moon close to Earth looks large from the ground. At 3.5 Earth radii a Moon of real size (0.273 of Earth) is ${closeSky.toFixed(1)}° wide. To stay under 14° closer than that, the Moon must be smaller than its real size.</p></div></article>
        <article><span>03</span><div><h3>Planet size has a ceiling of about 1.4</h3><p>Terrain heights, trees and animals do not grow with the planet. At 1.5 times the size, Earth has ${percent(big.lifeDensity)} of today’s trees on each hectare, and a trip around it near the ground takes ${big.aroundEarth} s. No setting in the search passes every target above 1.4.</p></div></article>
        <article><span>04</span><div><h3>More space needs more speed</h3><p>At ${idealSet.spacing} times the spacing, the flight speed in open space must be ${idealSet.speed} times today (${number(FLIGHT.space * idealSet.speed)} m/s) to keep the trips as short as today.</p></div></article>
        <article><span>05</span><div><h3>The camera and the Sun set limits</h3><p>The camera draws to ${number(CAMERA_FAR)} m. With a 10% margin, the system can be ${maxSpacing} times as wide as today. With more spacing the Sun looks smaller from Earth; the Sun slider can keep it large.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">PROPOSED DEFAULT</p><h3>Planets ×1.25, spacing ×${idealSet.spacing}</h3><p>A Moon at ${idealSet.moonOrbit} Earth radii with its real size, and flight in open space ${idealSet.speed} times as fast. Every target passes.</p></article>
      <article><p class="eyebrow">A DECISION TO MAKE</p><h3>Which targets matter?</h3><p>The targets are design choices, not physics. If sparse life on a big Earth is acceptable, more trees can fill it, at a cost in draw time.</p></article>
      <article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>Everything uses these numbers</h3><p>The belt, Ceres and Vesta, Blossom Haven’s start and moves, the Worlds map and many tests use distances from the Sun. Change them together.</p></article></section>
    <section class="credits"><p class="eyebrow">SOURCES</p>
      <p>The Moon’s mean distance (${REAL_MOON.orbit} Earth radii) and radius (${REAL_MOON.size} of Earth): NASA Solar System Exploration, “Earth’s Moon”. Game sizes, the flight speeds and the trip times come from the game code (src/worlds.ts, src/flight.ts). Trip times are straight-line flights with the game’s speed rules.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 10</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
let settings: Proportions = { ...idealSet }
let view: View = 'far'
const preview = createProportionsScene(element('#sizes'), element('#labels'))

function hood(p: Proportions, name: string) {
  const m = metrics(p, false), world = layout(p), scale = 520 / m.nearestDistance
  const nearest = [...world.planets, ...world.dwarfs, world.home].find(body => body.name === m.nearest)!
  // The orbit is an ellipse, as seen at an angle, so a large orbit stays inside the drawing.
  const earthR = Math.max(1.5, world.earth.radius * scale), ring = m.moonOrbit * scale, ringY = Math.min(ring * 0.22, 60), moonR = Math.max(1, world.moon.radius * scale)
  return `<figure><figcaption><b>${name}</b> · Moon orbit ${percent(m.pairing)} of the way to ${m.nearest}</figcaption>
    <svg viewBox="-70 -80 700 160" role="img" aria-label="${name}: Earth, the Moon’s orbit and ${m.nearest}, to scale">
      <line x1="0" y1="0" x2="520" y2="0" class="gap"/>
      <ellipse cx="0" cy="0" rx="${ring}" ry="${ringY}" class="ring"/><circle cx="0" cy="0" r="${earthR}" class="earth"/><circle cx="${ring}" cy="0" r="${moonR}" class="moon"/>
      <circle cx="520" cy="0" r="${Math.max(1.5, nearest.radius * scale)}" class="other"/>
      <text x="0" y="${-Math.max(ringY, earthR) - 8}">Earth and Moon</text><text x="520" y="${-Math.max(6, nearest.radius * scale) - 8}">${m.nearest}</text>
      <text x="260" y="22" class="small">${number(m.nearestDistance)} m</text></svg></figure>`
}

function render() {
  preview.apply(settings, view)
  const m = metrics(settings), results = checks(m), passed = results.filter(item => item.pass).length
  for (const slider of sliders) {
    element<HTMLInputElement>(`#s-${slider.key}`).value = String(settings[slider.key])
    element(`#o-${slider.key}`).textContent = slider.unit(settings[slider.key])
  }
  element('#score').textContent = `${passed} OF ${TARGETS.length} PASS`
  element('#score-tag').textContent = `${passed} OF ${TARGETS.length} TARGETS`
  element('#targets').innerHTML = results.map(item => `<li class="${item.pass ? 'pass' : 'fail'}" data-target="${item.id}"><span class="mark" aria-hidden="true">${item.pass ? '✓' : '✗'}</span><span><b>${item.label}</b><small>${item.goal}</small></span><output>${item.value}<span class="sr">${item.pass ? ', passes' : ', fails'}</span></output></li>`).join('')
  all<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)))
  element('#caption-kicker').textContent = viewNames[view].toUpperCase()
  element('#caption-title').textContent = `Moon orbit: ${percent(m.pairing)} of the gap`
  element('#caption-note').textContent = ({
    far: `From open space beyond Earth. The nearest other world is ${m.nearest}, ${(m.nearestDistance / 1000).toFixed(1)} km from Earth. The Moon orbits ${number(m.moonOrbit)} m from Earth.`,
    system: `The whole system is ${(m.span / 1000).toFixed(1)} km wide. The camera of the game draws to ${CAMERA_FAR / 1000} km.`,
    pair: `Earth has radius ${number(m.earthRadius)} m; the Moon has radius ${number(m.moonRadius)} m, at ${(m.moonOrbit / m.earthRadius).toFixed(1)} Earth radii. Earth is ${m.earthFromMoon.toFixed(0)}° wide in the Moon’s sky.`,
    ground: `From Earth’s ground the Moon is ${m.moonSky.toFixed(1)}° wide, and the Sun ${m.sunSky.toFixed(1)}°. The real Moon is 0.5° wide.`,
  } as Record<View, string>)[view]
  element('#hood').innerHTML = hood(TODAY, 'Today') + hood(settings, 'This setting')
  const rows: Array<[string, (x: Metrics) => string]> = [
    ['Earth radius · Moon radius', x => `${number(x.earthRadius)} · ${number(x.moonRadius)} m`],
    ['Moon orbit', x => `${number(x.moonOrbit)} m · ${(x.moonOrbit / x.earthRadius).toFixed(1)} Earth radii`],
    ['Moon orbit, as a part of the gap to the nearest world', x => `${percent(x.pairing)} (${x.nearest})`],
    ['Moon from Earth’s ground · Sun', x => `${x.moonSky.toFixed(1)}° · ${x.sunSky.toFixed(1)}°`],
    ['Earth from the Moon', x => `${x.earthFromMoon.toFixed(1)}°`],
    ['Trip to the Moon · Mars · Neptune', x => `${x.trips.moon} · ${x.trips.mars} · ${x.trips.neptune} s`],
    ['Trip to Blossom Haven’s start', x => `${x.trips.home} s`],
    ['Once around Earth near the ground', x => `${x.aroundEarth} s`],
    ['Trees and animals per hectare on Earth', x => percent(x.lifeDensity)],
    ['Trees for today’s density', x => number(x.treesForToday)],
    ['Hills and mountains, compared with the planet', x => percent(x.relief)],
    ['Belt to Mars · to Jupiter', x => `${x.belt.mars} · ${x.belt.jupiter} m`],
    ['Solar · lunar eclipses each game year', x => `${x.eclipses!.solar} · ${x.eclipses!.lunar}`],
    ['Width of the whole system', x => `${(x.span / 1000).toFixed(1)} km`],
  ]
  element('#compare').innerHTML = rows.map(([name, value]) => `<tr><th scope="row">${name}</th><td>${value(todayMetrics)}</td><td>${value(m)}</td></tr>`).join('')
  element('#code').innerHTML = codeChanges(settings).map(row => `<tr><td><code>${row.file}</code></td><th scope="row">${row.name.replace(/`([^`]+)`/g, '<code>$1</code>')}</th><td>${row.today}</td><td>${row.next}</td></tr>`).join('')
}

let queued = false
const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render() }) } }
all<HTMLInputElement>('[data-key]').forEach(input => input.addEventListener('input', () => {
  settings = { ...settings, [input.dataset.key as Key]: Number(input.value) }
  element('#find-note').textContent = ''
  schedule()
}))
all<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view as View; render() }))
all<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => {
  settings = PRESETS[button.dataset.preset as keyof typeof PRESETS].value()
  element('#find-note').textContent = PRESETS[button.dataset.preset as keyof typeof PRESETS].line
  render(); preview.refit()
}))
element('#reset-view').addEventListener('click', () => preview.refit())
element('#find').addEventListener('click', () => {
  const found = ideal(settings.size, settings.sun)
  if (found) { settings = found; element('#find-note').textContent = `Found: spacing ×${found.spacing}, Moon at ${found.moonOrbit} Earth radii and ${found.moonSize} of Earth, speed ×${found.speed}.` }
  else element('#find-note').textContent = `No setting in the search meets every target with planets ×${settings.size.toFixed(2)}. Try 1.4 or less.`
  render(); preview.refit()
})
element('#export').addEventListener('click', () => {
  const m = metrics(settings)
  const payload = {
    study: 'proportions', version: 1, status: 'proposal-only', settings, view,
    metrics: m, targets: checks(m), today: { settings: TODAY, metrics: todayMetrics },
    code: codeChanges(settings), recommendation: { settings: idealSet, note: 'Planets ×1.25 and the smallest other change that meets every target.' },
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'proportions-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__sizeStudy', { value: { settings: () => ({ ...settings }), stats: () => preview.stats, metrics: () => metrics(settings) } })
