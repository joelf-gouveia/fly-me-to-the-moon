import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { defaultFairyLook, dressOptions, hairColorOptions, hairOptions, skinOptions, wingOptions } from '../customization'
import type { FairyLook } from '../customization'
import { createSkyDancerAnimation, skyDancer } from '../fairy'
import { bodies, bodyIds, bones, createBodyFairy, measureBody, openBelow } from './bodies'
import type { BodyFairy, BodyId, BodyMeasurement } from './bodies'
import './style.css'

type View = 'menu' | 'flight' | 'three' | 'side' | 'front'
type Backdrop = 'meadow' | 'sky' | 'night'
type Shot = 'close' | 'flight'
type Angle = 'rear' | 'side' | 'front'

// The recommendation of the study: see docs/fairy-body-study.md.
const recommended: BodyId = 'storybook'
const views: Record<View, { label: string; caption: string }> = {
  menu: { label: 'Menu view', caption: 'GAME CAMERA · MENU OPEN' },
  flight: { label: 'Flight view', caption: 'GAME CAMERA · IN FLIGHT' },
  three: { label: '¾', caption: 'THREE-QUARTER VIEW' },
  side: { label: 'Side', caption: 'SIDE VIEW' },
  front: { label: 'Front', caption: 'FRONT VIEW' },
}
const backdrops: Record<Backdrop, number> = { meadow: 0x79a462, sky: 0xa9d2e6, night: 0x1d2340 }
const jointRows = ['neck base', 'neck top', 'shoulder', 'elbow', 'wrist', 'knee', 'ankle'] as const
const infoOf = (id: BodyId) => bodies.find(body => body.id === id)!
const name = (letter: string, label: string) => letter === '–' ? label : `${letter} · ${label}`
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`
const swatches = (part: 'hairColor' | 'dress' | 'skin', label: string, options: readonly { id: string; label: string; color: number }[]) =>
  `<fieldset><legend>${label}</legend><div class="swatches" role="group" aria-label="${label}">${options.map(({ id, label, color }) =>
    `<button data-look="${part}" data-value="${id}" aria-label="${label}" title="${label}" style="--swatch:${hex(color)}"><i></i></button>`).join('')}</div></fieldset>`

document.querySelector('#body-study')!.innerHTML = `
  <header class="masthead"><a href="/">✧ &nbsp; Fly me to the moon</a><span>CHARACTER STUDY / 03 · BODY</span><a href="/hair-style-study.html">Hair study ↗</a></header>
  <main>
    <section class="intro">
      <div><p class="eyebrow">A FAIRY IN ONE PIECE</p><h1>Joined at<br><em>every joint.</em></h1></div>
      <div class="intro-copy">
        <p>How can the fairy look less like a set of shapes, and more like a fairy?</p>
        <p>Before this study she was 26 separate shapes. Her shoulders stood away from her body, her limbs stretched, and her wings floated behind her back. This study put three new bodies on the same head, hair, wings and flight pose, and measured each joint. The game now has C.</p>
        <span class="study-badge">C is now in the game · study controls are preview-only</span>
      </div>
    </section>

    <section class="workspace">
      <div class="stage-column">
        <div class="toolbar">
          <div class="segmented" role="group" aria-label="Camera">${Object.entries(views).map(([id, { label }]) => `<button data-view="${id}" aria-pressed="${id === 'three'}">${label}</button>`).join('')}</div>
          <div class="segmented" role="group" aria-label="Flight speed"><button data-boost="0" aria-pressed="true">Cruise</button><button data-boost="1" aria-pressed="false">Boost</button></div>
        </div>
        <div class="scene" id="body-view">
          <span class="scene-caption"><span class="live-dot"></span><span id="view-caption">THREE-QUARTER VIEW</span></span>
          <span class="compare-tag" id="compare-tag" hidden>TODAY</span>
          <div class="scene-bottom"><span id="stage-label">C · STORYBOOK FAIRY</span><span class="drag-hint">Drag to turn · scroll to zoom</span></div>
        </div>
        <div class="stage-controls">
          <label class="check"><input type="checkbox" id="skeleton"> Show the joints</label>
          <label class="check"><input type="checkbox" id="compare"> Beside Today</label>
          <div class="control"><span>Backdrop</span><div class="segmented small" role="group" aria-label="Backdrop">${Object.keys(backdrops).map(id => `<button data-backdrop="${id}" aria-pressed="${id === 'meadow'}">${id[0].toUpperCase() + id.slice(1)}</button>`).join('')}</div></div>
          <label class="check"><input type="checkbox" id="silhouette"> Silhouette</label>
          <button id="pause" class="text-button" aria-pressed="false">Pause motion</button>
        </div>
        <p class="footnote" id="joint-key"><span class="dot ok"></span> joint closed &nbsp; <span class="dot open"></span> joint open (less than ${openBelow * 100}% filled) &nbsp; · lines are the bones</p>
      </div>

      <aside class="inspector" aria-label="Body">
        <div class="inspector-title"><p class="eyebrow">CHOOSE A BODY</p><span id="body-index">4 / 4</span></div>
        <div class="body-picker" role="group" aria-label="Body">${bodies.map(({ id, letter, label }) =>
          `<button data-body="${id}" aria-pressed="false"><b>${letter}</b><span>${label}</span></button>`).join('')}</div>
        <div class="style-heading"><h2 id="body-name">Storybook fairy</h2><span id="letter-badge">C</span></div>
        <p class="style-note" id="body-note"></p>
        <ul class="changes" id="body-changes"></ul>
        <dl class="metrics">
          <div><dt>Open joints</dt><dd id="m-open">…</dd></div>
          <div><dt>Bone stretch</dt><dd id="m-stretch">…</dd></div>
          <div><dt>Wing roots</dt><dd id="m-wings">…</dd></div>
          <div><dt>Face below the flight line</dt><dd id="m-face">…</dd></div>
          <div><dt>Hand motion in cruise</dt><dd id="m-hands">…</dd></div>
          <div><dt>Joints that turn</dt><dd id="m-turning">…</dd></div>
          <div><dt>Meshes · triangles</dt><dd id="m-cost">…</dd></div>
        </dl>
        <fieldset><legend>Hair style</legend><select id="hair-style" aria-label="Hair style">${hairOptions.map(({ id, label }) => `<option value="${id}">${label}</option>`).join('')}</select></fieldset>
        ${swatches('hairColor', 'Hair color', hairColorOptions)}
        ${swatches('dress', 'Dress', dressOptions)}
        ${swatches('skin', 'Skin', skinOptions)}
        <fieldset><legend>Wings</legend><div class="segmented small wide" role="group" aria-label="Wing shape">${wingOptions.map(({ id, label }) => `<button data-wings="${id}" aria-pressed="${id === 'petal'}">${label}</button>`).join('')}</div></fieldset>
      </aside>
    </section>

    <section class="lineup-section">
      <div class="section-heading">
        <div><p class="eyebrow">THE LINE-UP</p><h2>Four bodies, side by side.</h2><p>Every body with the same look and motion. <em>Flight distance</em> uses the flight camera of the game (2.8 m up, 8 m back, 58° view). Each fairy has the same size in pixels as in a 900 px tall game window.</p></div>
        <div class="toolbar-end">
          <div class="segmented" role="group" aria-label="Line-up distance"><button data-shot="close" aria-pressed="true">Close</button><button data-shot="flight" aria-pressed="false">Flight distance</button></div>
          <div class="segmented" role="group" aria-label="Line-up angle"><button data-angle="rear" aria-pressed="true">Rear</button><button data-angle="side" aria-pressed="false">Side</button><button data-angle="front" aria-pressed="false">Front</button></div>
        </div>
      </div>
      <div class="lineup" id="lineup-view">
        <ol class="lineup-cells">${bodies.map(({ id, letter, label }) => `<li data-cell="${id}"><button data-pick="${id}" aria-label="Show ${label} in the close-up"><span>${name(letter, label)}</span></button></li>`).join('')}</ol>
      </div>
      <p class="footnote" id="lineup-label">CLOSE / REAR · the cruise pose, or the boost pose when Boost is on</p>
    </section>

    <section class="numbers-section">
      <div class="section-heading"><div><p class="eyebrow">MEASURED ON THE RIG</p><h2>What the numbers say.</h2><p>The page measures each body when it loads, through one wingbeat in cruise and one in boost. <em>Filled</em> is the smallest part of a small ball at the joint that is inside the body. A joint with less than ${openBelow * 100}% is open. <em>Bone stretch</em> is the largest change of a bone length. <em>Wing roots</em> is the distance from the root of each upper wing to the body. <em>Hand motion</em> is the largest distance that the hand moves on the body in 4 s of cruise.</p></div></div>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Body</th><th scope="col">Open joints</th><th scope="col">Bone stretch</th><th scope="col">Wing roots</th><th scope="col">Face in cruise</th><th scope="col">Face in boost</th><th scope="col">Hand motion</th><th scope="col">Joints that turn</th><th scope="col">Meshes</th><th scope="col">Triangles</th></tr></thead>
        <tbody>${bodies.map(({ id, letter, label }) => `<tr data-row="${id}"><th scope="row"><span class="row-name"><b class="letter">${letter}</b><span>${label}</span></span></th>${['open', 'stretch', 'wings', 'faceCruise', 'faceBoost', 'hands', 'turning', 'meshes', 'triangles'].map(key => `<td data-metric="${key}">…</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div class="table-wrap joints-table"><table>
        <thead><tr><th scope="col">Joint · filled</th>${bodies.map(({ letter, label }) => `<th scope="col">${name(letter, label)}</th>`).join('')}</tr></thead>
        <tbody>${jointRows.map(row => `<tr><th scope="row">${row[0].toUpperCase() + row.slice(1)}${row.startsWith('neck') ? '' : 's'}</th>${bodyIds.map(id => `<td data-fill="${id}|${row}">…</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="footnote" id="measure-status" role="status">Measuring the bodies…</p>
    </section>

    <section class="principles">
      <div class="principles-heading"><p class="eyebrow">WHAT THE STUDY SHOWS</p><h2>Five reasons she looks loose.</h2></div>
      <article><span>01 / SHOULDERS</span><h3>The arms start outside the body</h3><p>The shoulder points are 0.23 from the middle. The torso is only 0.16 wide at that height, so the flat end of each arm stands in the air. A ball or a sleeve closes the gap.</p></article>
      <article><span>02 / FLAT ENDS</span><h3>Cylinders open at a bend</h3><p>Two cut cylinders meet at one point. When the joint bends, a wedge opens on the outer side. Capsules with the same radius at the joint have no seam at any angle.</p></article>
      <article><span>03 / BONES</span><h3>The limbs stretch</h3><p>The pose moves the joints, not the bones. A forearm can grow by more than half of its length between cruise and boost. A two-bone solve keeps each bone at one length and reaches the same hands and feet.</p></article>
      <article><span>04 / WINGS</span><h3>The wings float behind her</h3><p>The wing roots are almost 0.1 behind the back. A petal bow between the roots holds the wings, and it gives the rear camera a clear centre.</p></article>
      <article><span>05 / FAIRY</span><h3>She looks at the ground, with still arms</h3><p>The head leans with the body: 32° down in cruise, 66° in boost. In cruise the hands do not move on the body. A head that lifts to look ahead, arms that float, soft wrists, pointed toes and petals that move with the wings make her feel light.</p></article>
    </section>

    <section class="handoff">
      <div><p class="eyebrow">NOW IN THE GAME</p><h2>C · Storybook fairy.</h2><p>The game has the Storybook body: every joint closed, fixed bones, floating arms and a head that looks ahead. The head, the hair, the wings and the customization stay the same. <em>Today</em> is the body of the game before this change.</p><p class="shortlist-line"><strong id="pick-title">Your pick: C · Storybook fairy.</strong> <span id="pick-text">Choose a body in the close-up to change the pick.</span></p></div>
      <div class="handoff-actions"><button id="reset-pick" class="outline">Use the recommendation</button><button id="export">Save study settings ↓</button></div>
      <p id="export-status" role="status"></p>
    </section>
    <footer><span>Original procedural study · the same head, hair and wings as the game · no reference assets</span><span>Study made 27 September 2026</span></footer>
  </main>
`

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const all = <T extends HTMLElement = HTMLButtonElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const press = (selector: string, active: (button: HTMLButtonElement) => boolean) => all(selector).forEach(button => button.setAttribute('aria-pressed', String(active(button))))

let selected: BodyId = recommended
let pick: BodyId = recommended
let look: FairyLook = { ...defaultFairyLook }
let boosted = false, view: View = 'three', backdrop: Backdrop = 'meadow'
let shot: Shot = 'close', angle: Angle = 'rear', silhouette = false, skeleton = false, compare = false
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
let time = 0, lastFrame = 0
const measurements = new Map<BodyId, BodyMeasurement>()

function lights(scene: THREE.Scene) {
  const sky = new THREE.HemisphereLight(0xe5efff, 0x73637a, 2.1)
  const key = new THREE.DirectionalLight(0xffe0c1, 3)
  key.position.set(-3, 5, 6)
  const rim = new THREE.DirectionalLight(0x97d8d9, 2)
  rim.position.set(4, 2, -3)
  const front = new THREE.DirectionalLight(0xfff2e6, 1.2)
  front.position.set(1, 2, -6)
  scene.add(sky, key, rim, front)
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

// The close-up: one fairy of each body in its own scene, with the Sky Dancer
// animation of the game. Only the selected body is drawn; Beside Today draws Today on the left.
const stageHost = get('body-view')
const stage = { renderer: makeRenderer(stageHost, 'Fairy with the Storybook body'), camera: new THREE.PerspectiveCamera(58, 1, 0.05, 200) }
stage.renderer.setScissorTest(true)
const stages = Object.fromEntries(bodyIds.map(id => {
  const scene = new THREE.Scene()
  const fairy = createBodyFairy(id)
  scene.add(fairy.root)
  return [id, { scene, fairy, light: lights(scene), animation: createSkyDancerAnimation(fairy) }]
})) as Record<BodyId, { scene: THREE.Scene; fairy: BodyFairy; light: (night: boolean) => void; animation: ReturnType<typeof createSkyDancerAnimation> }>
const controls = new OrbitControls(stage.camera, stage.renderer.domElement)
controls.enablePan = false
controls.enableDamping = true
controls.minDistance = 1.2
controls.maxDistance = 14
new ResizeObserver(() => stage.renderer.setSize(stageHost.clientWidth, stageHost.clientHeight)).observe(stageHost)

// The joints: bone lines and one dot for each joint, drawn over the body.
const overlay = new THREE.Group()
overlay.renderOrder = 10
const boneGeometry = new THREE.BufferGeometry()
boneGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bones.length * 6), 3))
overlay.add(new THREE.LineSegments(boneGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 })))
const dotGeometry = new THREE.SphereGeometry(0.025, 10, 8)
const okMaterial = new THREE.MeshBasicMaterial({ color: 0x3fcf8e, depthTest: false })
const openMaterial = new THREE.MeshBasicMaterial({ color: 0xff5a5f, depthTest: false })
const dots = new Map<string, THREE.Mesh>()
overlay.children.forEach(child => { child.renderOrder = 10 })

function updateOverlay(fairy: BodyFairy, id: BodyId) {
  const samples = fairy.jointSamples()
  const at = new Map(samples.map(sample => [sample.name, sample.world]))
  const fills = new Map(measurements.get(id)?.joints.map(joint => [joint.name, joint.fill]))
  for (const sample of samples) {
    let dot = dots.get(sample.name)
    if (!dot) {
      dot = new THREE.Mesh(dotGeometry, okMaterial)
      dot.renderOrder = 11
      overlay.add(dot)
      dots.set(sample.name, dot)
    }
    dot.position.copy(sample.world)
    dot.material = (fills.get(sample.name) ?? 1) < openBelow ? openMaterial : okMaterial
    dot.visible = !sample.hidden
  }
  const positions = boneGeometry.getAttribute('position') as THREE.BufferAttribute
  bones.forEach(([a, b], i) => {
    positions.setXYZ(i * 2, at.get(a)!.x, at.get(a)!.y, at.get(a)!.z)
    positions.setXYZ(i * 2 + 1, at.get(b)!.x, at.get(b)!.y, at.get(b)!.z)
  })
  positions.needsUpdate = true
}

// The camera of the game follows at (0, 2.8, 3.4) with the menu open on a wide
// screen, and at (0, 2.8, 8) in flight, where it looks 12 m ahead (src/main.ts).
function placeCamera() {
  const { camera } = stage
  if (view === 'menu' || view === 'flight') {
    camera.fov = 58
    camera.position.set(0, 2.8, view === 'menu' ? 3.4 : 8)
    controls.target.set(0, 0, view === 'menu' ? 0 : -12)
  } else {
    const center = new THREE.Vector3(0, 0.45, -0.1)
    const azimuth = THREE.MathUtils.degToRad({ three: 40, side: 90, front: 180 }[view])
    const elevation = THREE.MathUtils.degToRad(view === 'front' ? 18 : 12)
    camera.fov = 32
    camera.position.copy(center).add(new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)).multiplyScalar(5.2))
    controls.target.copy(center)
  }
  controls.enabled = view !== 'flight'
  camera.updateProjectionMatrix()
  controls.update()
  get('view-caption').textContent = views[view].caption
  stageHost.classList.toggle('is-locked', view === 'flight')
}

// The line-up: the four bodies far apart on a diagonal, each drawn into its own cell.
const lineupHost = get('lineup-view')
const lineup = { renderer: makeRenderer(lineupHost, 'Four fairies in a row, one for each body'), scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(30, 1, 0.05, 200) }
lineup.renderer.setScissorTest(true)
const lineupLight = lights(lineup.scene)
const cast = bodyIds.map((id, i) => {
  const fairy = createBodyFairy(id)
  fairy.root.position.set(i * 14, 0, i * 14)
  lineup.scene.add(fairy.root)
  return { id, fairy }
})
new ResizeObserver(() => lineup.renderer.setSize(lineupHost.clientWidth, lineupHost.clientHeight)).observe(lineupHost)

const focus = new THREE.Vector3(), offset = new THREE.Vector3()
function renderLineup() {
  const host = lineupHost.getBoundingClientRect()
  const color = new THREE.Color(backdrops[backdrop])
  lineup.renderer.setScissor(0, 0, host.width, host.height)
  lineup.renderer.setClearColor(color.clone().lerp(new THREE.Color(0xffffff), backdrop === 'night' ? 0.04 : 0.18))
  lineup.renderer.clear()
  const azimuth = { rear: 0, side: Math.PI / 2, front: Math.PI }[angle]
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
      focus.copy(member.fairy.root.position).add(new THREE.Vector3(0, 0.4, 0))
      const distance = 5.4 / Math.min(1, camera.aspect * 1.6)
      offset.set(Math.sin(azimuth), 0.22, Math.cos(azimuth)).normalize()
      camera.position.copy(focus).addScaledVector(offset, distance)
    } else {
      // The flight camera: 58° in a 900 px window, scaled to the height of the cell.
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(29)) * cell.height / 900))
      focus.copy(member.fairy.root.position).add(new THREE.Vector3(0, 0.35, 0))
      camera.position.copy(focus).add(offset.set(Math.sin(azimuth) * 8, 2.8, Math.cos(azimuth) * 8))
    }
    camera.lookAt(focus)
    camera.updateProjectionMatrix()
    lineup.renderer.render(lineup.scene, camera)
  }
}

function applyLookEverywhere() {
  for (const id of bodyIds) stages[id].fairy.applyLook(look)
  for (const member of cast) member.fairy.applyLook(look)
  press('[data-look]', button => look[button.dataset.look as 'hairColor' | 'dress' | 'skin'] === button.dataset.value)
  press('[data-wings]', button => button.dataset.wings === look.wings)
  get<HTMLSelectElement>('hair-style').value = look.hair
}

const percent = (value: number) => `${Math.round(value * 100)}%`
const degrees = (value: number) => `${Math.round(value)}°`
const formatGap = (gap: number) => gap < 0.004 ? 'Attached' : `${gap.toFixed(2)} away`
const formatTravel = (travel: number) => travel < 0.001 ? 'Still' : travel.toFixed(2)

function showMetrics() {
  const info = infoOf(selected), measurement = measurements.get(selected)
  get('m-turning').textContent = String(info.turning.length)
  get('m-open').textContent = measurement ? (measurement.openJoints ? `${measurement.openJoints} of 12` : 'None') : '…'
  get('m-stretch').textContent = measurement ? percent(measurement.stretch) : '…'
  get('m-wings').textContent = measurement ? formatGap(measurement.wingGap) : '…'
  get('m-face').textContent = measurement ? `${degrees(measurement.faceCruise)} · ${degrees(measurement.faceBoost)} boost` : '…'
  get('m-hands').textContent = measurement ? formatTravel(measurement.handTravel) : '…'
  get('m-hands').classList.toggle('warn', !!measurement && measurement.handTravel < 0.001)
  get('m-cost').textContent = measurement ? `${measurement.meshes} · ${measurement.triangles.toLocaleString('en')}` : '…'
  get('m-open').classList.toggle('warn', !!measurement?.openJoints)
  get('m-stretch').classList.toggle('warn', (measurement?.stretch ?? 0) > 0.01)
  get('m-wings').classList.toggle('warn', (measurement?.wingGap ?? 0) >= 0.004)
}

function selectBody(id: BodyId) {
  selected = id
  pick = id
  const info = infoOf(id), index = bodyIds.indexOf(id)
  press('[data-body]', button => button.dataset.body === id)
  all<HTMLElement>('[data-cell]').forEach(cell => cell.classList.toggle('is-selected', cell.dataset.cell === id))
  get('body-name').textContent = info.label
  get('letter-badge').textContent = info.letter === '–' ? 'GAME' : info.letter
  get('body-note').textContent = info.note
  get('body-changes').innerHTML = info.changes.map(change => `<li>${change}</li>`).join('')
  get('body-index').textContent = `${index + 1} / ${bodyIds.length}`
  get('stage-label').textContent = name(info.letter, info.label).toUpperCase()
  stage.renderer.domElement.setAttribute('aria-label', `Fairy with the ${info.label} body, ${views[view].caption.toLowerCase()}`)
  get('pick-title').textContent = `Your pick: ${info.letter === '–' ? 'keep Today' : name(info.letter, info.label)}.`
  get('pick-text').textContent = id === recommended ? 'This is the recommendation.' : `The recommendation is C · Storybook fairy.`
  showMetrics()
  showCompare()
}

// Beside Today splits the close-up only when the selected body is not Today.
function showCompare() {
  const split = compare && selected !== 'today'
  stageHost.classList.toggle('is-compared', split)
  get('compare-tag').hidden = !split
}

// Measure one body for each task, so the page stays responsive while it loads.
function measureAll() {
  const queue = [...bodyIds]
  const next = () => {
    const id = queue.shift()
    if (!id) {
      get('measure-status').textContent = `Measured ${bodyIds.length} bodies with the Petal wings, through 8 steps of a cruise wingbeat and 8 steps of a boost wingbeat. Hips are under the skirt in every body and are not measured.`
      document.body.dataset.measured = 'true'
      return
    }
    const measurement = measureBody(createBodyFairy(id))
    measurements.set(id, measurement)
    const info = infoOf(id)
    const row = document.querySelector(`[data-row="${id}"]`)!
    const cell = (key: string, text: string, warn = false) => {
      const element = row.querySelector(`[data-metric="${key}"]`)!
      element.textContent = text
      element.classList.toggle('warn', warn)
    }
    cell('open', measurement.openJoints ? `${measurement.openJoints} of 12` : 'None', measurement.openJoints > 0)
    cell('stretch', percent(measurement.stretch), measurement.stretch > 0.01)
    cell('wings', formatGap(measurement.wingGap), measurement.wingGap >= 0.004)
    cell('faceCruise', degrees(measurement.faceCruise))
    cell('faceBoost', degrees(measurement.faceBoost))
    cell('hands', formatTravel(measurement.handTravel), measurement.handTravel < 0.001)
    cell('turning', String(info.turning.length))
    cell('meshes', String(measurement.meshes))
    cell('triangles', measurement.triangles.toLocaleString('en'))
    for (const joint of jointRows) {
      const fills = measurement.joints.filter(item => item.name === joint || item.name.startsWith(`${joint} `)).map(item => item.fill)
      const worst = Math.min(...fills)
      const element = document.querySelector(`[data-fill="${id}|${joint}"]`)!
      element.textContent = percent(worst)
      element.classList.toggle('warn', worst < openBelow)
    }
    if (id === selected) showMetrics()
    setTimeout(next, 0)
  }
  setTimeout(next, 0)
}

all('[data-body]').forEach(button => button.addEventListener('click', () => selectBody(button.dataset.body as BodyId)))
all('[data-pick]').forEach(button => button.addEventListener('click', () => {
  selectBody(button.dataset.pick as BodyId)
  stageHost.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
}))
all('[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view as View
  press('[data-view]', item => item === button)
  placeCamera()
  selectBody(selected)
}))
all('[data-boost]').forEach(button => button.addEventListener('click', () => {
  boosted = button.dataset.boost === '1'
  press('[data-boost]', item => item === button)
}))
all('[data-backdrop]').forEach(button => button.addEventListener('click', () => {
  backdrop = button.dataset.backdrop as Backdrop
  press('[data-backdrop]', item => item === button)
  for (const id of bodyIds) stages[id].light(backdrop === 'night')
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
}
all('[data-look]').forEach(button => button.addEventListener('click', () => {
  look = { ...look, [button.dataset.look!]: button.dataset.value }
  applyLookEverywhere()
}))
all('[data-wings]').forEach(button => button.addEventListener('click', () => {
  look = { ...look, wings: button.dataset.wings as FairyLook['wings'] }
  applyLookEverywhere()
}))
get<HTMLSelectElement>('hair-style').addEventListener('change', event => {
  look = { ...look, hair: (event.target as HTMLSelectElement).value as FairyLook['hair'] }
  applyLookEverywhere()
})
get<HTMLInputElement>('silhouette').addEventListener('change', event => {
  silhouette = (event.target as HTMLInputElement).checked
  for (const fairy of [...bodyIds.map(id => stages[id].fairy), ...cast.map(member => member.fairy)]) fairy.setSilhouette(silhouette)
})
get<HTMLInputElement>('skeleton').addEventListener('change', event => {
  skeleton = (event.target as HTMLInputElement).checked
  document.body.classList.toggle('show-joints', skeleton)
})
get<HTMLInputElement>('compare').addEventListener('change', event => {
  compare = (event.target as HTMLInputElement).checked
  showCompare()
})
function updatePause() {
  get('pause').textContent = paused ? 'Resume motion' : 'Pause motion'
  get('pause').setAttribute('aria-pressed', String(paused))
}
get('pause').addEventListener('click', () => { paused = !paused; updatePause() })
get('reset-pick').addEventListener('click', () => selectBody(recommended))
get('export').addEventListener('click', () => {
  const payload = {
    study: 'fairy-body',
    savedAt: new Date().toISOString(),
    pick,
    recommended,
    bodies: bodies.map(({ id, label, changes, turning }) => ({ id, label, changes, turning })),
    preview: { body: selected, look, boosted, view, backdrop, lineup: { shot, angle }, silhouette, joints: skeleton, besideToday: compare },
    measurements: Object.fromEntries(measurements),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'fairy-body-study.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  get('export-status').textContent = `Saved the pick (${infoOf(pick).label}), the preview settings and the measurements.`
})

function renderStage() {
  const { renderer, camera } = stage
  const width = stageHost.clientWidth, height = stageHost.clientHeight
  const panes: { id: BodyId; x: number; w: number }[] = compare && selected !== 'today'
    ? [{ id: 'today', x: 0, w: width / 2 }, { id: selected, x: width / 2, w: width / 2 }]
    : [{ id: selected, x: 0, w: width }]
  for (const pane of panes) {
    const { scene, fairy } = stages[pane.id]
    scene.background = new THREE.Color(backdrops[backdrop])
    renderer.setViewport(pane.x, 0, pane.w, height)
    renderer.setScissor(pane.x, 0, pane.w, height)
    camera.aspect = pane.w / Math.max(1, height)
    camera.updateProjectionMatrix()
    if (skeleton) {
      updateOverlay(fairy, pane.id)
      scene.add(overlay)
    }
    renderer.render(scene, camera)
    scene.remove(overlay)
  }
}

function animate(now: number) {
  const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0
  lastFrame = now
  if (!paused) {
    time += delta
    for (const id of bodyIds) stages[id].animation.update(delta, boosted)
  }
  const boost = stages.today.animation.boost
  for (const member of cast) member.fairy.pose(skyDancer, boost, time)
  // Draw a canvas only while part of it is on screen.
  const onScreen = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < innerHeight
  }
  if (onScreen(stageHost)) {
    controls.update()
    renderStage()
  }
  if (onScreen(lineupHost)) renderLineup()
  requestAnimationFrame(animate)
}

applyLookEverywhere()
placeCamera()
selectBody(selected)
updatePause()
updateLineupLabel()
requestAnimationFrame(animate)
measureAll()
