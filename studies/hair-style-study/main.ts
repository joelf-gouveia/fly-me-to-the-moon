import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { defaultFairyLook, hairColorOptions, lookColors, skinOptions, wingOptions } from '../../src/customization'
import type { FairyLook } from '../../src/customization'
import { classicWings, createFairyRig, createSkyDancerAnimation, skyDancer } from '../../src/fairy'
import { addStudyHair, areaFromBehind, candidateIds, measureStyle, motionLevels, studyStyles } from './styles'
import type { CandidateId, Measurement, Motion, StudyHair, StudyStyle } from './styles'
import './style.css'

type View = 'menu' | 'flight' | 'three' | 'side' | 'front'
type Backdrop = 'meadow' | 'sky' | 'night'
type Shot = 'close' | 'flight'
type Angle = 'rear' | 'side'

// The recommendation of the study: see docs/hair-style-study.md.
const recommended: CandidateId[] = ['spaceBuns', 'cloudCurls', 'ponytail', 'braid', 'twinBraids', 'longWaves']
const views: Record<View, { label: string; caption: string }> = {
  menu: { label: 'Menu view', caption: 'GAME CAMERA · MENU OPEN' },
  flight: { label: 'Flight view', caption: 'GAME CAMERA · IN FLIGHT' },
  three: { label: '¾', caption: 'THREE-QUARTER VIEW' },
  side: { label: 'Side', caption: 'SIDE VIEW' },
  front: { label: 'Front', caption: 'FRONT VIEW' },
}
const backdrops: Record<Backdrop, number> = { meadow: 0x79a462, sky: 0xa9d2e6, night: 0x1d2340 }
const infoOf = (id: StudyStyle) => studyStyles.find(style => style.id === id)!
const tag = (id: StudyStyle) => infoOf(id).inGame ? 'IN GAME' : infoOf(id).adopted ? 'ADDED' : 'NEW'
const icon = (id: StudyStyle) => `<span class="hair-icon hair-icon--${id}" aria-hidden="true"><i></i><i></i><i></i></span>`
const swatches = (part: 'hairColor' | 'skin', options: readonly { id: string; label: string; color: number }[]) =>
  `<div class="swatches" role="group" aria-label="${part === 'hairColor' ? 'Hair color' : 'Skin'}">${options.map(({ id, label, color }) =>
    `<button data-look="${part}" data-value="${id}" aria-label="${label}" title="${label}" style="--swatch:#${color.toString(16).padStart(6, '0')}"><i></i></button>`).join('')}</div>`

document.querySelector('#hair-study')!.innerHTML = `
  <header class="masthead"><a href="/">✧ &nbsp; Fly me to the moon</a><span>CHARACTER STUDY / 02 · HAIR</span><a href="/studies/fairy-flight-study.html">Flight pose study ↗</a></header>
  <main>
    <section class="intro">
      <div><p class="eyebrow">A FAIRY, SEEN FROM BEHIND</p><h1>Hair that<br><em>flies with her.</em></h1></div>
      <div class="intro-copy">
        <p>Which new hair styles should she have?</p>
        <p>The game had three hair styles. This study put eight new styles on the same fairy, to see each one from the game camera, in motion, and at flight distance. The game now has six of them.</p>
        <span class="study-badge">Six styles now in the game · study controls are preview-only</span>
      </div>
    </section>

    <section class="workspace">
      <div class="stage-column">
        <div class="toolbar">
          <div class="segmented" role="group" aria-label="Camera">${Object.entries(views).map(([id, { label }]) => `<button data-view="${id}" aria-pressed="${id === 'menu'}">${label}</button>`).join('')}</div>
          <div class="segmented" role="group" aria-label="Flight speed"><button data-boost="0" aria-pressed="true">Cruise</button><button data-boost="1" aria-pressed="false">Boost</button></div>
        </div>
        <div class="scene" id="hair-view">
          <span class="scene-caption"><span class="live-dot"></span><span id="view-caption">GAME CAMERA · MENU OPEN</span></span>
          <div class="scene-bottom"><span id="stage-label">PONYTAIL · ADDED</span><span class="drag-hint">Drag to turn · scroll to zoom</span></div>
        </div>
        <div class="stage-controls">
          <div class="control"><span>Hair motion</span><div class="segmented small" role="group" aria-label="Hair motion">${Object.keys(motionLevels).map(id => `<button data-motion="${id}" aria-pressed="${id === 'gentle'}">${id[0].toUpperCase() + id.slice(1)}</button>`).join('')}</div></div>
          <div class="control"><span>Backdrop</span><div class="segmented small" role="group" aria-label="Backdrop">${Object.keys(backdrops).map(id => `<button data-backdrop="${id}" aria-pressed="${id === 'meadow'}">${id[0].toUpperCase() + id.slice(1)}</button>`).join('')}</div></div>
          <label class="check"><input type="checkbox" id="silhouette"> Silhouette</label>
          <button id="pause" class="text-button" aria-pressed="false">Pause motion</button>
        </div>
      </div>

      <aside class="inspector" aria-label="Hair style">
        <div class="inspector-title"><p class="eyebrow">CHOOSE A STYLE</p><span id="style-index">4 / 11</span></div>
        <div class="style-picker" role="group" aria-label="Hair style">${studyStyles.map(({ id, label }) =>
          `<button data-style="${id}" aria-pressed="false">${icon(id)}<span>${label}</span><small>${tag(id)}</small></button>`).join('')}</div>
        <div class="style-heading"><h2 id="style-name">Ponytail</h2><span id="family-badge">UP</span></div>
        <p class="style-note" id="style-note"></p>
        <dl class="metrics">
          <div><dt>Seen from behind</dt><dd id="m-area">…</dd></div>
          <div><dt>Outside the cap</dt><dd id="m-beyond">…</dd></div>
          <div><dt>Wings</dt><dd id="m-wings">…</dd></div>
          <div><dt>Ears</dt><dd id="m-ears">…</dd></div>
          <div><dt>Motion</dt><dd id="m-motion">…</dd></div>
          <div><dt>Meshes</dt><dd id="m-meshes">…</dd></div>
        </dl>
        <label class="shortlist-toggle"><input type="checkbox" id="shortlist-current"> <span id="shortlist-text">Add to the shortlist</span></label>
        <fieldset><legend>Hair color</legend>${swatches('hairColor', hairColorOptions)}</fieldset>
        <fieldset><legend>Skin</legend>${swatches('skin', skinOptions)}</fieldset>
        <fieldset><legend>Wings</legend><div class="segmented small wide" role="group" aria-label="Wing shape">${wingOptions.map(({ id, label }) => `<button data-wings="${id}" aria-pressed="${id === defaultFairyLook.wings}">${label}</button>`).join('')}</div></fieldset>
      </aside>
    </section>

    <section class="lineup-section">
      <div class="section-heading">
        <div><p class="eyebrow">THE LINE-UP</p><h2>All eleven, side by side.</h2><p>Every style on its own fairy, with the same look and motion. <em>Flight distance</em> uses the flight camera of the game (2.8 m up, 8 m back, 58° view). Each fairy has the same size in pixels as in a 900 px tall game window.</p></div>
        <div class="toolbar-end">
          <div class="segmented" role="group" aria-label="Line-up distance"><button data-shot="close" aria-pressed="true">Close</button><button data-shot="flight" aria-pressed="false">Flight distance</button></div>
          <div class="segmented" role="group" aria-label="Line-up angle"><button data-angle="rear" aria-pressed="true">Rear</button><button data-angle="side" aria-pressed="false">Side</button></div>
        </div>
      </div>
      <div class="lineup" id="lineup-view">
        <ol class="lineup-cells">${studyStyles.map(({ id, label }) => `<li data-cell="${id}"><button data-pick="${id}" aria-label="Show ${label} in the close-up"><span>${label}</span><small>${tag(id)}</small></button></li>`).join('')}</ol>
      </div>
      <p class="footnote" id="lineup-label">CLOSE / REAR · the cruise pose, or the boost pose when Boost is on</p>
    </section>

    <section class="numbers-section">
      <div class="section-heading"><div><p class="eyebrow">MEASURED ON THE RIG</p><h2>What the numbers say.</h2><p>The page measures each style on the real fairy rig when it loads. <em>Seen from behind</em> is the hair area that the flight camera sees, where the bare cap is 100%. <em>Outside the cap</em> is the part of that area that is not over the cap. <em>Wings</em> samples each wing surface through a full wingbeat, in cruise and in boost, with lively hair motion.</p></div></div>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Style</th><th scope="col">Family</th><th scope="col">Seen from behind</th><th scope="col">Outside the cap</th><th scope="col">Wings</th><th scope="col">Ears</th><th scope="col">Motion</th><th scope="col">Meshes</th><th scope="col">Shortlist</th></tr></thead>
        <tbody>${studyStyles.map(({ id, label, family, inGame, moves }) => `<tr data-row="${id}"><th scope="row">${icon(id)}<span>${label}</span>${inGame || infoOf(id).adopted ? `<small>${tag(id)}</small>` : ''}</th><td>${family}</td><td data-metric="area">…</td><td data-metric="beyond">…</td><td data-metric="wings">…</td><td data-metric="ears">…</td><td>${moves ? 'Swings' : 'Still'}</td><td data-metric="meshes">…</td><td>${inGame ? '<span class="muted">In game</span>' : `<input type="checkbox" data-shortlist="${id}" aria-label="Shortlist ${label}">`}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="footnote" id="measure-status" role="status">Measuring the styles…</p>
    </section>

    <section class="menu-section">
      <div class="section-heading"><div><p class="eyebrow">IN THE GAME MENU</p><h2>How the menu would look.</h2><p>The <em>Make her yours</em> panel shows hair styles in rows of three. Each button is 68 px tall with a 7 px gap, so each new row makes the panel 75 px taller. The panel scrolls when it is taller than the screen.</p></div></div>
      <div class="menu-row">
        <div class="menu-mock" aria-label="Preview of the hair group in the game menu">
          <p class="mock-eyebrow">YOUR FAIRY</p><p class="mock-title">Make her yours</p>
          <p class="mock-legend">HAIR</p>
          <div class="mock-grid" id="mock-grid" role="list"></div>
          <div class="mock-swatches" aria-hidden="true">${hairColorOptions.map(({ color }) => `<i style="--swatch:#${color.toString(16).padStart(6, '0')}"></i>`).join('')}</div>
        </div>
        <div class="menu-facts">
          <div><strong id="menu-count">9</strong><span>HAIR STYLES</span></div>
          <div><strong id="menu-rows">3</strong><span>ROWS OF THREE</span></div>
          <div><strong id="menu-height">+150</strong><span>PX TALLER THAN BEFORE</span></div>
          <p id="menu-note"></p>
        </div>
      </div>
    </section>

    <section class="principles">
      <div class="principles-heading"><p class="eyebrow">WHAT THE STUDY SHOWS</p><h2>Four rules for new hair.</h2></div>
      <article><span>01 / THE BACK OF THE HEAD</span><h3>Design for the rear camera</h3><p>In flight, the camera is behind her and 19° above. A style that only changes the face or the top of the cap is hard to see. Pixie and Crown braid add the least outside the cap.</p></article>
      <article><span>02 / MOTION</span><h3>Let long hair move</h3><p>From behind, a ponytail covers the cap and adds little new shape. Its swing and its stream in boost make it clear. Motion also makes boost easier to feel.</p></article>
      <article><span>03 / THE WING LINE</span><h3>Stay inside x = ±0.19 below the ears</h3><p>Each wing starts at x = ±0.19 and only goes out from there. Hair inside that line cannot touch a wing. Tails and Bob cross it; they keep their first shape.</p></article>
      <article><span>04 / THE EARS</span><h3>Keep the pointed ears clear</h3><p>The pointed ears tell the player that she is a fairy. The test checks that the outer half of each ear stays outside every part of the hair.</p></article>
    </section>

    <section class="handoff">
      <div><p class="eyebrow">NOW IN THE GAME</p><h2>Space buns, Cloud curls, Ponytail, Long braid, Twin braids and Long waves.</h2><p>The game has nine hair styles in three rows, with the gentle hair motion. Pixie and Crown braid stay in the study.</p><p class="shortlist-line"><strong id="handoff-title">Your shortlist: six new styles.</strong> <span id="handoff-text"></span></p></div>
      <div class="handoff-actions"><button id="reset-shortlist" class="outline">Use the recommendation</button><button id="export">Save study settings ↓</button></div>
      <p id="export-status" role="status"></p>
    </section>
    <footer><span>Original procedural study · the same rig as the game · no reference assets</span><span>Study made 26 September 2026</span></footer>
  </main>
`

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const all = <T extends HTMLElement = HTMLButtonElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const press = (selector: string, active: (button: HTMLButtonElement) => boolean) => all(selector).forEach(button => button.setAttribute('aria-pressed', String(active(button))))

let selected: StudyStyle = 'ponytail'
let look: FairyLook = { ...defaultFairyLook }
let boosted = false, motion: Motion = 'gentle', view: View = 'menu', backdrop: Backdrop = 'meadow'
let shot: Shot = 'close', angle: Angle = 'rear', silhouette = false
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
let time = 0, lastFrame = 0
const shortlist = new Set<CandidateId>(recommended)
const measurements = new Map<StudyStyle, Measurement>()
let bareArea = 0

function lights(scene: THREE.Scene) {
  const sky = new THREE.HemisphereLight(0xe5efff, 0x73637a, 2.1)
  const key = new THREE.DirectionalLight(0xffe0c1, 3)
  key.position.set(-3, 5, 6)
  const rim = new THREE.DirectionalLight(0x97d8d9, 2)
  rim.position.set(4, 2, -3)
  scene.add(sky, key, rim)
  return (night: boolean) => {
    sky.color.setHex(night ? 0xb9a8ff : 0xe5efff)
    sky.intensity = night ? 1.1 : 2.1
    key.color.setHex(night ? 0xcfc4ff : 0xffe0c1)
    key.intensity = night ? 1.3 : 3
  }
}

function makeRenderer(host: HTMLElement, label: string) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', label)
  host.prepend(renderer.domElement)
  return renderer
}

type Fairy = { rig: ReturnType<typeof createFairyRig>; hair: StudyHair }
function makeFairy(): Fairy {
  const rig = createFairyRig({ withTrail: false })
  return { rig, hair: addStudyHair(rig) }
}

// The close-up: one fairy with the Sky Dancer animation of the game.
const stageHost = get('hair-view')
const stage = { renderer: makeRenderer(stageHost, 'Fairy with the Ponytail hair style, game camera with the menu open'), scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(58, 1, 0.05, 200) }
const stageLight = lights(stage.scene)
const hero = makeFairy()
const heroAnimation = createSkyDancerAnimation(hero.rig)
stage.scene.add(hero.rig.root)
const controls = new OrbitControls(stage.camera, stage.renderer.domElement)
controls.enablePan = false
controls.enableDamping = true
controls.minDistance = 1.2
controls.maxDistance = 14
new ResizeObserver(() => {
  stage.renderer.setSize(stageHost.clientWidth, stageHost.clientHeight)
  stage.camera.aspect = stageHost.clientWidth / Math.max(1, stageHost.clientHeight)
  stage.camera.updateProjectionMatrix()
}).observe(stageHost)

// The camera of the game follows at (0, 2.8, 3.4) with the menu open on a wide
// screen, and at (0, 2.8, 8) in flight, where it looks 12 m ahead (src/main.ts).
function placeCamera() {
  const { camera } = stage
  if (view === 'menu' || view === 'flight') {
    camera.fov = 58
    camera.position.set(0, 2.8, view === 'menu' ? 3.4 : 8)
    controls.target.set(0, 0, view === 'menu' ? 0 : -12)
  } else {
    const head = new THREE.Vector3(0, 0.8, -0.3)
    const azimuth = THREE.MathUtils.degToRad({ three: 40, side: 90, front: 180 }[view])
    const elevation = THREE.MathUtils.degToRad(12)
    camera.fov = 32
    camera.position.copy(head).add(new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)).multiplyScalar(3.4))
    controls.target.copy(head)
  }
  controls.enabled = view !== 'flight'
  camera.updateProjectionMatrix()
  controls.update()
  get('view-caption').textContent = views[view].caption
  get('hair-view').classList.toggle('is-locked', view === 'flight')
}

// The line-up: eleven fairies far apart on a diagonal, so that no fairy is
// behind another from the rear or the side. Each one is drawn into its own cell.
const lineupHost = get('lineup-view')
const lineup = { renderer: makeRenderer(lineupHost, 'Eleven fairies in a row, one for each hair style'), scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(30, 1, 0.05, 200) }
lineup.renderer.setScissorTest(true)
const lineupLight = lights(lineup.scene)
const cast = studyStyles.map(({ id }, i) => {
  const fairy = makeFairy()
  fairy.rig.root.position.set(i * 14, 0, i * 14)
  lineup.scene.add(fairy.rig.root)
  return { id, ...fairy }
})
new ResizeObserver(() => lineup.renderer.setSize(lineupHost.clientWidth, lineupHost.clientHeight)).observe(lineupHost)

const focus = new THREE.Vector3(), direction = new THREE.Vector3()
function renderLineup() {
  const host = lineupHost.getBoundingClientRect()
  const color = new THREE.Color(backdrops[backdrop])
  lineup.renderer.setScissor(0, 0, host.width, host.height)
  lineup.renderer.setClearColor(color.clone().lerp(new THREE.Color(0xffffff), backdrop === 'night' ? 0.04 : 0.18))
  lineup.renderer.clear()
  const azimuth = angle === 'rear' ? 0 : Math.PI / 2
  for (const member of cast) {
    const cell = lineupHost.querySelector<HTMLElement>(`[data-cell="${member.id}"]`)!.getBoundingClientRect()
    const x = cell.left - host.left, y = host.bottom - cell.bottom
    lineup.renderer.setViewport(x, y, cell.width, cell.height)
    lineup.renderer.setScissor(x, y, cell.width, cell.height)
    lineup.renderer.setClearColor(color)
    lineup.renderer.clear()
    const { camera } = lineup
    camera.aspect = cell.width / Math.max(1, cell.height)
    if (shot === 'close') {
      camera.fov = 30
      const body = member.rig.root.getObjectByName('fairy-body')!
      body.localToWorld(focus.set(0, angle === 'rear' ? 0.95 : 0.9, angle === 'rear' ? 0.1 : 0.15))
      const distance = 2.2 / Math.min(1, camera.aspect * 1.25)
      direction.set(Math.sin(azimuth), 0.25, Math.cos(azimuth)).normalize()
      camera.position.copy(focus).addScaledVector(direction, distance)
    } else {
      // The flight camera: 58° in a 900 px window, scaled to the height of the cell.
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(29)) * cell.height / 900))
      focus.copy(member.rig.root.position).add(new THREE.Vector3(0, 0.35, 0))
      direction.set(Math.sin(azimuth) * 8, 2.8, Math.cos(azimuth) * 8)
      camera.position.copy(focus).add(direction)
    }
    camera.lookAt(focus)
    camera.updateProjectionMatrix()
    lineup.renderer.render(lineup.scene, camera)
  }
}

function applyLookEverywhere() {
  hero.hair.show(selected, look)
  for (const member of cast) member.hair.show(member.id, look)
  const colors = lookColors(look)
  document.body.style.setProperty('--hair', `#${colors.hair.toString(16).padStart(6, '0')}`)
  document.body.style.setProperty('--skin', `#${colors.skin.toString(16).padStart(6, '0')}`)
  press('[data-look]', button => look[button.dataset.look as 'hairColor' | 'skin'] === button.dataset.value)
  press('[data-wings]', button => button.dataset.wings === look.wings)
}

function formatWings(measurement: Measurement) {
  if (!measurement.wingContact.length) return 'Clear'
  if (measurement.wingContact.length === classicWings.length) return 'Touches all'
  return `Touches ${measurement.wingContact.map(id => id[0].toUpperCase() + id.slice(1)).join(', ')}`
}
const percent = (area: number) => `${Math.round(area / bareArea * 100)}%`

function showMetrics() {
  const info = infoOf(selected), measurement = measurements.get(selected)
  get('m-motion').textContent = info.moves ? 'Swings' : 'Still'
  get('m-area').textContent = measurement ? percent(measurement.hairArea) : '…'
  get('m-beyond').textContent = measurement ? `+${percent(measurement.beyondCap)}` : '…'
  get('m-wings').textContent = measurement ? formatWings(measurement) : '…'
  get('m-ears').textContent = measurement ? (measurement.earsVisible ? 'Visible' : 'Hidden') : '…'
  get('m-meshes').textContent = measurement ? String(measurement.meshes) : '…'
  get('m-wings').classList.toggle('warn', !!measurement?.wingContact.length)
}

function selectStyle(id: StudyStyle) {
  selected = id
  const info = infoOf(id), index = studyStyles.indexOf(info)
  hero.hair.show(id, look)
  press('[data-style]', button => button.dataset.style === id)
  all<HTMLElement>('[data-cell]').forEach(cell => cell.classList.toggle('is-selected', cell.dataset.cell === id))
  get('style-name').textContent = info.label
  get('family-badge').textContent = info.family.toUpperCase()
  get('style-note').textContent = info.note
  get('style-index').textContent = `${index + 1} / ${studyStyles.length}`
  get('stage-label').textContent = `${info.label.toUpperCase()} · ${tag(id)}`
  stage.renderer.domElement.setAttribute('aria-label', `Fairy with the ${info.label} hair style, ${views[view].caption.toLowerCase()}`)
  const toggle = get<HTMLInputElement>('shortlist-current')
  toggle.disabled = info.inGame
  toggle.checked = info.inGame || shortlist.has(id as CandidateId)
  get('shortlist-text').textContent = info.inGame ? 'Already in the game' : 'Add to the shortlist'
  showMetrics()
}

function refreshShortlist() {
  all<HTMLInputElement>('[data-shortlist]').forEach(input => { input.checked = shortlist.has(input.dataset.shortlist as CandidateId) })
  const current = get<HTMLInputElement>('shortlist-current')
  if (!current.disabled) current.checked = shortlist.has(selected as CandidateId)
  all<HTMLElement>('[data-cell]').forEach(cell => cell.classList.toggle('is-shortlisted', shortlist.has(cell.dataset.cell as CandidateId)))
  const menu = studyStyles.filter(style => style.inGame || shortlist.has(style.id as CandidateId))
  const rows = Math.ceil(menu.length / 3)
  get('mock-grid').innerHTML = menu.map(({ id, label, inGame }) => `<span role="listitem" class="${inGame ? '' : 'is-new'}">${icon(id)}<span>${label}</span></span>`).join('')
  get('menu-count').textContent = String(menu.length)
  get('menu-rows').textContent = String(rows)
  get('menu-height').textContent = `+${(rows - 1) * 75}`
  get('menu-note').textContent = menu.length % 3
    ? `The last row has ${menu.length % 3} of 3 buttons. Choose ${3 - menu.length % 3} more or ${menu.length % 3} fewer to fill the rows.`
    : 'Every row is full.'
  const picks = [...shortlist].map(id => infoOf(id).label)
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']
  get('handoff-title').textContent = `Your shortlist: ${words[picks.length]} new style${picks.length === 1 ? '' : 's'}.`
  get('handoff-text').textContent = picks.length
    ? `${picks.join(', ')}. The menu would have ${menu.length} hair styles in ${rows} rows.`
    : 'Tick styles in the table or in the close-up to make a shortlist.'
}

function toggleShortlist(id: CandidateId, on: boolean) {
  if (on) shortlist.add(id)
  else shortlist.delete(id)
  refreshShortlist()
}

// Measure one style for each task, so the page stays responsive while it loads.
function measureAll() {
  const probe = makeFairy()
  probe.rig.pose(skyDancer, 0, 0)
  probe.rig.root.updateMatrixWorld(true)
  bareArea = areaFromBehind(probe.rig.root.getObjectByName('fairy-body')!, []).hairArea
  const queue = [...studyStyles]
  const next = () => {
    const style = queue.shift()
    if (!style) {
      get('measure-status').textContent = `Measured ${studyStyles.length} styles on the rig with the default look. The bare cap is ${bareArea.toFixed(3)} square units from behind.`
      document.body.dataset.measured = 'true'
      return
    }
    const measurement = measureStyle(probe.rig, probe.hair, style.id, defaultFairyLook)
    measurements.set(style.id, measurement)
    const row = document.querySelector(`[data-row="${style.id}"]`)!
    row.querySelector('[data-metric="area"]')!.textContent = percent(measurement.hairArea)
    row.querySelector('[data-metric="beyond"]')!.textContent = `+${percent(measurement.beyondCap)}`
    const wings = row.querySelector('[data-metric="wings"]')!
    wings.textContent = formatWings(measurement)
    wings.classList.toggle('warn', measurement.wingContact.length > 0)
    row.querySelector('[data-metric="ears"]')!.textContent = measurement.earsVisible ? 'Visible' : 'Hidden'
    row.querySelector('[data-metric="meshes"]')!.textContent = String(measurement.meshes)
    if (style.id === selected) showMetrics()
    setTimeout(next, 0)
  }
  setTimeout(next, 0)
}

all('[data-style]').forEach(button => button.addEventListener('click', () => selectStyle(button.dataset.style as StudyStyle)))
all('[data-pick]').forEach(button => button.addEventListener('click', () => {
  selectStyle(button.dataset.pick as StudyStyle)
  get('hair-view').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
}))
all('[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view as View
  press('[data-view]', item => item === button)
  placeCamera()
  selectStyle(selected)
}))
all('[data-boost]').forEach(button => button.addEventListener('click', () => {
  boosted = button.dataset.boost === '1'
  press('[data-boost]', item => item === button)
}))
all('[data-motion]').forEach(button => button.addEventListener('click', () => {
  motion = button.dataset.motion as Motion
  press('[data-motion]', item => item === button)
}))
all('[data-backdrop]').forEach(button => button.addEventListener('click', () => {
  backdrop = button.dataset.backdrop as Backdrop
  press('[data-backdrop]', item => item === button)
  stageLight(backdrop === 'night')
  lineupLight(backdrop === 'night')
}))
all('[data-shot]').forEach(button => button.addEventListener('click', () => {
  shot = button.dataset.shot as Shot
  press('[data-shot]', item => item === button)
  updateLineupLabel()
}))
all('[data-angle]').forEach(button => button.addEventListener('click', () => {
  angle = button.dataset.angle as Angle
  press('[data-angle]', item => item === button)
  updateLineupLabel()
}))
function updateLineupLabel() {
  get('lineup-label').textContent = `${shot === 'close' ? 'CLOSE' : 'FLIGHT DISTANCE'} / ${angle.toUpperCase()} · the cruise pose, or the boost pose when Boost is on`
  lineupHost.dataset.shot = shot
}
all('[data-look]').forEach(button => button.addEventListener('click', () => {
  look = { ...look, [button.dataset.look!]: button.dataset.value }
  applyLookEverywhere()
}))
all('[data-wings]').forEach(button => button.addEventListener('click', () => {
  look = { ...look, wings: button.dataset.wings as FairyLook['wings'] }
  applyLookEverywhere()
}))
get<HTMLInputElement>('silhouette').addEventListener('change', event => {
  silhouette = (event.target as HTMLInputElement).checked
  for (const fairy of [hero, ...cast]) fairy.hair.setSilhouette(silhouette)
})
function updatePause() {
  get('pause').textContent = paused ? 'Resume motion' : 'Pause motion'
  get('pause').setAttribute('aria-pressed', String(paused))
}
get('pause').addEventListener('click', () => { paused = !paused; updatePause() })
get<HTMLInputElement>('shortlist-current').addEventListener('change', event => toggleShortlist(selected as CandidateId, (event.target as HTMLInputElement).checked))
all<HTMLInputElement>('[data-shortlist]').forEach(input => input.addEventListener('change', () => toggleShortlist(input.dataset.shortlist as CandidateId, input.checked)))
get('reset-shortlist').addEventListener('click', () => {
  shortlist.clear()
  recommended.forEach(id => shortlist.add(id))
  refreshShortlist()
})
get('export').addEventListener('click', () => {
  const menu = studyStyles.filter(style => style.inGame || shortlist.has(style.id as CandidateId)).map(style => style.id)
  const payload = {
    study: 'fairy-hair-styles',
    savedAt: new Date().toISOString(),
    gameStyles: studyStyles.filter(style => style.inGame).map(style => style.id),
    shortlist: candidateIds.filter(id => shortlist.has(id)),
    recommended,
    menu: { styles: menu, rows: Math.ceil(menu.length / 3) },
    preview: { style: selected, look, motion, boosted, view, backdrop, lineup: { shot, angle }, silhouette },
    measurements: Object.fromEntries([...measurements].map(([id, value]) => [id, { ...value, seenFromBehind: value.hairArea / bareArea, outsideCap: value.beyondCap / bareArea }])),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'fairy-hair-study.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  get('export-status').textContent = `Saved the shortlist (${payload.shortlist.length}), the preview settings and the measurements.`
})

function animate(now: number) {
  const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0
  lastFrame = now
  if (!paused) {
    time += delta
    heroAnimation.update(delta, boosted)
  }
  hero.hair.animate(time, heroAnimation.boost, motion)
  for (const member of cast) {
    member.rig.pose(skyDancer, heroAnimation.boost, time)
    member.hair.animate(time, heroAnimation.boost, motion)
  }
  // Draw a canvas only while part of it is on screen: the line-up draws eleven views.
  const onScreen = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < innerHeight
  }
  if (onScreen(stageHost)) {
    stage.scene.background = new THREE.Color(backdrops[backdrop])
    controls.update()
    stage.renderer.render(stage.scene, stage.camera)
  }
  if (onScreen(lineupHost)) renderLineup()
  requestAnimationFrame(animate)
}

applyLookEverywhere()
placeCamera()
selectStyle(selected)
refreshShortlist()
updatePause()
updateLineupLabel()
requestAnimationFrame(animate)
measureAll()
