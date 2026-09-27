import './style.css'
import { createStarMapScene } from './scene'
import type { Selection } from './scene'
import { starPictures as figures, starNames, webbImages } from '../../src/star-data'
import type { SkyBand } from '../../src/star-data'
import { angleBetween, byHr, findStar, raDec, resolvedPictures as resolvedFigures, skyStars, starsBrighterThan, unitVector } from '../../src/star-map'
import { budget, shownFigures } from './model'
import type { StudySettings } from './model'
import studyUrl from '../../docs/star-map-study.md?url'

const bands: Record<SkyBand, string> = { north: 'Northern sky', middle: 'Around the middle', south: 'Southern sky' }
const constellations = figures.filter(figure => figure.kind === 'constellation').length
const chip = (attribute: string, id: string, text: string, extra = '') => `<button type="button" ${attribute}="${id}" aria-pressed="false"${extra}>${text}</button>`

document.querySelector<HTMLDivElement>('#star-map-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>06</b> / STAR MAP</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">MORE PICTURES IN THE SKY. REAL STARS BEHIND THEM.</p><h1>A sky full of <em>stories.</em></h1></div>
      <p>${figures.length} star pictures, ${skyStars.length.toLocaleString('en')} real stars, and ten views from the James Webb Space Telescope.<br>A proposal for the star map of the game. The game now uses it.</p></header>
    <section class="workspace" aria-label="Interactive star map study">
      <div class="preview-column">
        <div id="sky"><div id="labels" aria-hidden="true"></div>
          <div class="scene-top"><span class="tag">LIVE 3D · STAR SKY</span><span class="tag" id="mode-label">PROPOSED SKY</span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p><p class="credit" id="caption-credit" hidden></p></div>
          <span class="scene-help">Drag to look · scroll or pinch to zoom · select a picture</span></div>
        <div class="finder">
          ${(Object.keys(bands) as SkyBand[]).map(band => `<div class="finder-group"><p class="eyebrow">${bands[band].toUpperCase()}</p><div class="chips">${
            figures.filter(figure => figure.band === band).map(figure => chip('data-figure', figure.id, figure.name, figure.kind === 'asterism' ? ' class="asterism"' : '')).join('')}</div></div>`).join('')}
          <div class="finder-group"><p class="eyebrow">JAMES WEBB PICTURES</p><div class="chips">${webbImages.map(image => chip('data-webb', image.id, image.title, ' class="webb"')).join('')}</div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare</legend><div class="segmented"><button type="button" data-preset="today" aria-pressed="false">Before</button><button type="button" data-preset="proposal" aria-pressed="true">The proposal</button></div></fieldset>
        <p class="eyebrow section">01 / STAR PICTURES</p><h2>More to find in one sky.</h2>
        <p>Compare the three pictures from before the change with ${constellations} constellations and ${figures.length - constellations} helper shapes. The lines are simple, original outlines.</p>
        <fieldset><legend>Pictures</legend><div class="segmented"><button type="button" data-figures="today" aria-pressed="false">Before · 3</button><button type="button" data-figures="proposed" aria-pressed="true">Proposed · ${figures.length}</button></div></fieldset>
        <label class="check"><input id="asterisms" type="checkbox" checked /> Helper shapes (asterisms)</label>
        <label class="check"><input id="labels-toggle" type="checkbox" checked /> Names of pictures and bright stars</label>
        <p class="eyebrow section">02 / THE STARS BEHIND THE LINES</p>
        <fieldset><legend>Background stars</legend><div class="segmented"><button type="button" data-background="today" aria-pressed="false">Random · before</button><button type="button" data-background="real" aria-pressed="true">Real catalog</button></div></fieldset>
        <label class="range" for="limit">Faintest star <output id="limit-out"></output></label><input id="limit" type="range" min="3" max="5.5" step="0.1" value="5.5" />
        <label class="check"><input id="milky-way" type="checkbox" checked /> Milky Way glow</label>
        <p class="eyebrow section">03 / JAMES WEBB PICTURES</p>
        <label class="check"><input id="webb" type="checkbox" checked /> Show Webb pictures</label>
        <label for="placement">Placement</label><select id="placement"><option value="beside">Beside the lines, with a pointer</option><option value="true">At the true position</option></select>
        <label class="range" for="size">Picture size in the sky <output id="size-out"></output></label><input id="size" type="range" min="3" max="12" step="0.5" value="6" />
        <div class="budget"><p class="eyebrow">04 / COST IN THE GAME</p>
          <div class="meter-row"><span>Stars drawn</span><output id="b-stars"></output></div>
          <div class="meter-row"><span>Star pictures · lines</span><output id="b-figures"></output></div>
          <div class="meter-row"><span>Star data in the bundle</span><output id="b-data"></output></div>
          <div class="meter-row"><span>Webb pictures · GPU memory</span><output id="b-webb"></output></div>
          <div class="meter-row"><span>Sky draw calls</span><output id="b-calls"></output></div>
        </div>
      </aside>
    </section>
    <section class="chart-section"><div class="chart-title"><p class="eyebrow">05 / THE WHOLE SKY</p><h2>Both halves of the sky.</h2>
      <p>This flat map shows every picture. The ring shows the view in the 3D preview. Select a place on the map to turn there. A flat map stretches the areas near the poles.</p></div>
      <svg id="chart" viewBox="0 0 720 360" role="img" aria-label="Flat map of the whole sky with the proposed star pictures and the Webb picture positions."></svg></section>
    <section class="brief"><div class="brief-title"><p class="eyebrow">06 / IMPLEMENTATION STUDY</p><h2>Real stars first.<br>Then the pictures.</h2>
      <p>The game draws 3,000 random stars and 22 real stars. New pictures need their real stars. The catalog to magnitude 5.5 has 2,887 stars, so the star count stays almost the same.</p>
      <p><strong>A decision to make:</strong> the Webb pictures are tiny in the real sky. The game must enlarge them about 40 to 170 times. We recommend a place beside the lines, with a pointer to the true position.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>Replace the random stars with the catalog</h3><p>Generate one compact array from the NASA Bright Star Catalog. Draw it in one call, with the size and colour of each star from its catalog magnitude and colour.</p></div></article>
        <article><span>02</span><div><h3>Add the pictures as data</h3><p>Keep the current <code>starPictures</code> format. Add ${figures.length - 3} outlines, keyed by catalog numbers. A test proves that every line ends on a catalog star.</p></div></article>
        <article><span>03</span><div><h3>Show names when the child asks</h3><p>Keep the <b>Star pictures</b> button. Add names and a tap on a picture. Show one short caption at a time.</p></div></article>
        <article><span>04</span><div><h3>Add Webb pictures last</h3><p>Load ten small textures after the flight starts. Show the full credit and a link for each picture. Fade them with the stars inside atmospheres and in daylight.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">PROPOSED DEFAULT</p><h3>Real stars and ${figures.length} pictures</h3><p>The lines appear with the Star pictures button, as today. Names show for the lines and for the brightest stars.</p></article>
      <article><p class="eyebrow">WEBB PICTURES</p><h3>Enlarged, beside the lines</h3><p>A small ring marks the true position. The picture stays clear of the lines. Each picture keeps its full credit.</p></article>
      <article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>Phones and small hands</h3><p>Check the size of the lines, the labels and the tap targets on a phone. Check the Webb textures on the mobile graphics budget.</p></article></section>
    <section class="credits" id="credits"><p class="eyebrow">IMAGE AND DATA CREDITS</p>
      <p>James Webb Space Telescope pictures from <a href="https://esawebb.org/copyright/">ESA/Webb, CC BY 4.0</a>. This study shows 700-pixel previews with a soft oval edge, enlarged in the sky.</p>
      <ul>${webbImages.map(image => `<li><b>${image.title}</b> — ${image.credit} <a href="https://esawebb.org/images/${image.id}/">esawebb.org/images/${image.id} ↗</a></li>`).join('')}</ul>
      <p>Stars: Bright Star Catalog, 5th Revised Edition (Preliminary Version), Hoffleit, D. and Warren, Jr., W. H. (1991), from <a href="https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html">NASA HEASARC BSC5P</a>. Star names from the IAU Working Group on Star Names. Ring Nebula position from CDS Sesame.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 06</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const settings: StudySettings = {
  figures: 'proposed', asterisms: true, background: 'real', limit: 5.5,
  milkyWay: true, webb: true, placement: 'beside', postcardDegrees: 6, labels: true,
}
const presets: Record<'today' | 'proposal', Partial<StudySettings>> = {
  today: { figures: 'today', background: 'today', milkyWay: false, webb: false },
  proposal: { figures: 'proposed', background: 'real', milkyWay: true, webb: true, asterisms: true, labels: true, limit: 5.5 },
}
const matches = (preset: Partial<StudySettings>) => Object.entries(preset).every(([key, value]) => settings[key as keyof StudySettings] === value)
let selection: Selection = null
const sky = createStarMapScene(element('#sky'), element('#labels'))

function caption() {
  const kicker = element('#caption-kicker'), title = element('#caption-title'), note = element('#caption-note'), credit = element('#caption-credit')
  credit.hidden = true
  if (selection?.type === 'figure') {
    const figure = resolvedFigures.find(item => item.id === selection!.id)!
    const stars = [...new Set(figure.hrPaths.flat())]
    const named = Object.entries(starNames).filter(([key]) => stars.includes(findStar(key)!.hr)).map(([, name]) => name)
    kicker.textContent = `${figure.kind === 'asterism' ? 'HELPER SHAPE' : 'CONSTELLATION'} · ${bands[figure.band].toUpperCase()}`
    title.textContent = figure.name
    note.textContent = `${figure.picture}. ${stars.length} stars and ${figure.segments.length} lines.${named.length ? ` Bright stars: ${named.join(', ')}.` : ''}${figure.kind === 'asterism' ? ' A helper shape is a well-known pattern inside or across constellations.' : ''}`
  } else if (selection?.type === 'webb') {
    const image = webbImages.find(item => item.id === selection!.id)!
    kicker.textContent = 'JAMES WEBB SPACE TELESCOPE'
    title.textContent = image.title
    const scale = image.fieldArcmin ? ` The real picture is ${image.fieldArcmin} arcminutes wide; here it is about ${Math.round(settings.postcardDegrees * 60 / image.fieldArcmin)} times larger.` : ' The real picture is a few arcminutes wide; here it is enlarged.'
    note.textContent = `${image.about}${scale}`
    credit.hidden = false
    credit.innerHTML = `Credit: ${image.credit}. Resized with a soft oval edge. <a href="https://esawebb.org/images/${image.id}/">ESA/Webb, CC BY 4.0 ↗</a>`
  } else {
    kicker.textContent = settings.figures === 'today' ? 'BEFORE THE CHANGE' : 'PROPOSED SKY'
    title.textContent = settings.figures === 'today' ? 'Three pictures' : 'Find a picture'
    note.textContent = settings.figures === 'today'
      ? 'Orion, the Big Dipper and Cassiopeia, over 3,000 random stars. Most of the sky has no picture.'
      : 'Select a name below, or tap a line in the sky. Tap a Webb picture to learn what it shows.'
  }
}

function render() {
  sky.apply(settings)
  all<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => {
  Object.assign(settings, presets[button.dataset.preset as keyof typeof presets])
  if (button.dataset.preset === 'today') { selection = null; sky.select(null) }
  render()
}))
all<HTMLButtonElement>('[data-figures]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.figures === settings.figures)))
  all<HTMLButtonElement>('[data-background]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.background === settings.background)))
  all<HTMLButtonElement>('[data-figure]').forEach(button => button.setAttribute('aria-pressed', String(selection?.type === 'figure' && selection.id === button.dataset.figure)))
  all<HTMLButtonElement>('[data-webb]').forEach(button => button.setAttribute('aria-pressed', String(selection?.type === 'webb' && selection.id === button.dataset.webb)))
  element<HTMLInputElement>('#limit').disabled = settings.background === 'today'
  element('#limit-out').textContent = `${settings.limit.toFixed(1)} · ${starsBrighterThan(settings.limit).toLocaleString('en')} stars`
  element('#size-out').textContent = `${settings.postcardDegrees}°`
  all<HTMLButtonElement>('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(matches(presets[button.dataset.preset as keyof typeof presets]))))
  element('#mode-label').textContent = matches(presets.today) ? 'BEFORE THE CHANGE' : settings.figures === 'proposed' && settings.background === 'real' ? 'PROPOSED SKY' : 'MIXED COMPARISON'
  element<HTMLInputElement>('#asterisms').checked = settings.asterisms
  element<HTMLInputElement>('#labels-toggle').checked = settings.labels
  element<HTMLInputElement>('#milky-way').checked = settings.milkyWay
  element<HTMLInputElement>('#webb').checked = settings.webb
  element<HTMLInputElement>('#limit').value = String(settings.limit)
  const cost = budget(settings)
  element('#b-stars').textContent = cost.stars.toLocaleString('en')
  element('#b-figures').textContent = `${cost.figures} · ${cost.segments}`
  element('#b-data').textContent = `≈ ${cost.starDataKb} KB`
  element('#b-webb').textContent = cost.webbImages ? `${cost.webbImages} · ≈ ${cost.webbGpuMb} MB` : 'None'
  element('#b-calls').textContent = String(cost.drawCalls)
  caption()
  drawChart()
}

function select(next: Selection, turn = true) {
  selection = next
  if (next?.type === 'figure') {
    // The lines from before cannot highlight, so selection uses the proposal.
    settings.figures = 'proposed'
    if (figures.find(item => item.id === next.id)!.kind === 'asterism') settings.asterisms = true
  }
  if (next?.type === 'webb') settings.webb = true
  sky.select(next)
  render()
  if (turn) sky.lookAtSelection(next)
}

// Flat whole-sky chart: RA grows to the left, as on a real star chart.
const chart = element('#chart') as unknown as SVGSVGElement
const toChart = (ra: number, dec: number) => [(360 - ra) * 2, (90 - dec) * 2] as const
function arcPath(points: Array<readonly [number, number]>) {
  let d = ''
  points.forEach(([x, y], index) => { d += `${index && Math.abs(x - points[index - 1][0]) < 300 ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` })
  return d
}
function drawChart() {
  const grid = [...Array(11)].map((_, i) => `<path d="M${(i + 1) * 60} 0V360" />`).join('') + [...Array(5)].map((_, i) => `<path d="M0 ${(i + 1) * 60}H720" />`).join('')
  const stars = skyStars.filter(star => star.magnitude <= (settings.background === 'real' ? Math.min(settings.limit, 4.5) : 2.5))
    .map(star => { const [x, y] = toChart(star.ra, star.dec); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(0.5, 2.6 - star.magnitude * 0.45).toFixed(2)}" />` }).join('')
  const lines = shownFigures(settings).map(figure => {
    const d = figure.segments.map(([a, b]) => {
      const s = byHr.get(a)!, e = byHr.get(b)!, from = unitVector(s.ra, s.dec), to = unitVector(e.ra, e.dec)
      const points = [...Array(9)].map((_, i) => {
        const t = i / 8, v = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t] as const
        const p = raDec(v); return toChart(p.ra, p.dec)
      })
      return arcPath(points)
    }).join('')
    const [x, y] = toChart(raDec(figure.centre).ra, raDec(figure.centre).dec)
    const selected = selection?.type === 'figure' && selection.id === figure.id
    return `<g class="${figure.kind}${selected ? ' selected' : ''}"><path d="${d}" /><text x="${x.toFixed(1)}" y="${(y + (figure.band === 'north' ? 14 : -8)).toFixed(1)}">${figure.name}</text></g>`
  }).join('')
  const webb = settings.webb ? webbImages.map(image => {
    const [x, y] = toChart(image.ra, image.dec)
    return `<rect class="webb${selection?.type === 'webb' && selection.id === image.id ? ' selected' : ''}" x="${(x - 3.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="7" height="7" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"><title>${image.title}</title></rect>`
  }).join('') : ''
  chart.innerHTML = `<g class="grid">${grid}<path class="equator" d="M0 180H720" /></g><g class="stars">${stars}</g><g class="figures">${lines}</g>${webb}<circle id="view-ring" r="10" />
    <text class="axis" x="6" y="354">RA 24h ← east</text><text class="axis" x="714" y="354" text-anchor="end">west → 0h</text><text class="axis" x="6" y="12">+90° north</text><text class="axis" x="6" y="176">equator</text>`
  moveViewRing()
}
function moveViewRing() {
  const ring = chart.querySelector('#view-ring')
  if (!ring) return
  const { ra, dec, fov } = sky.view, [x, y] = toChart(ra, dec)
  ring.setAttribute('cx', x.toFixed(1)); ring.setAttribute('cy', y.toFixed(1)); ring.setAttribute('r', String(Math.max(6, fov)))
}
let ringFrame = 0
sky.onView = () => { if (++ringFrame % 3 === 0) moveViewRing() }
chart.addEventListener('click', event => {
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(chart.getScreenCTM()!.inverse())
  const ra = 360 - point.x / 2, dec = 90 - point.y / 2
  const near = settings.webb ? webbImages.find(image => { const [x, y] = toChart(image.ra, image.dec); return Math.hypot(x - point.x, y - point.y) < 7 }) : undefined
  if (near) return select({ type: 'webb', id: near.id })
  sky.lookAt(unitVector(ra, Math.max(-88, Math.min(88, dec))))
})

sky.onPick = next => select(next, false)
all<HTMLButtonElement>('[data-figure]').forEach(button => button.addEventListener('click', () => select({ type: 'figure', id: button.dataset.figure! })))
all<HTMLButtonElement>('[data-webb]').forEach(button => button.addEventListener('click', () => select({ type: 'webb', id: button.dataset.webb! })))
all<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => {
  Object.assign(settings, presets[button.dataset.preset as keyof typeof presets])
  if (button.dataset.preset === 'today') { selection = null; sky.select(null) }
  render()
}))
all<HTMLButtonElement>('[data-figures]').forEach(button => button.addEventListener('click', () => {
  settings.figures = button.dataset.figures as StudySettings['figures']
  if (settings.figures === 'today' && selection?.type === 'figure') { selection = null; sky.select(null) }
  render()
}))
all<HTMLButtonElement>('[data-background]').forEach(button => button.addEventListener('click', () => { settings.background = button.dataset.background as StudySettings['background']; render() }))
const onCheck = (selector: string, apply: (checked: boolean) => void) => element<HTMLInputElement>(selector).addEventListener('change', event => { apply((event.target as HTMLInputElement).checked); render() })
onCheck('#asterisms', checked => {
  settings.asterisms = checked
  if (!checked && selection?.type === 'figure' && figures.find(f => f.id === selection!.id)?.kind === 'asterism') { selection = null; sky.select(null) }
})
onCheck('#labels-toggle', checked => { settings.labels = checked })
onCheck('#milky-way', checked => { settings.milkyWay = checked })
onCheck('#webb', checked => { settings.webb = checked; if (!checked && selection?.type === 'webb') { selection = null; sky.select(null) } })
element<HTMLInputElement>('#limit').addEventListener('input', event => { settings.limit = Number((event.target as HTMLInputElement).value); render() })
element<HTMLInputElement>('#size').addEventListener('input', event => { settings.postcardDegrees = Number((event.target as HTMLInputElement).value); render() })
element<HTMLSelectElement>('#placement').addEventListener('change', event => { settings.placement = (event.target as HTMLSelectElement).value as StudySettings['placement']; render() })

element('#export').addEventListener('click', () => {
  const view = sky.view
  const payload = {
    study: 'star-map', version: 1, status: 'proposal-only', settings, selection,
    view: { ra: +view.ra.toFixed(2), dec: +view.dec.toFixed(2), fov: +view.fov.toFixed(1) },
    cost: budget(settings),
    figures: resolvedFigures.map(figure => ({ id: figure.id, name: figure.name, kind: figure.kind, hrPaths: figure.hrPaths })),
    webb: webbImages.map(image => ({ id: image.id, title: image.title, credit: image.credit, ra: image.ra, dec: image.dec })),
    implementation: 'Replace random filler stars with BSC5P V<=5.5 in one draw call; extend starPictures by HR number; add optional labels; lazy-load Webb textures with visible credits.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'star-map-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()
// Start facing Orion, the picture the game already has.
const orion = resolvedFigures.find(figure => figure.id === 'orion')!
sky.lookAt(orion.centre, Math.max(...orion.hrPaths.flat().map(hr => { const s = byHr.get(hr)!; return angleBetween(orion.centre, unitVector(s.ra, s.dec)) })) * 1.6)
