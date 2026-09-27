import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createField, heightAt, populate, poseOnRoute, safeSegment } from '../../src/creatures/habitat'
import type { Resident as Survey } from '../../src/creatures/habitat'
import { createCreature } from '../../src/creatures/models'
import { createFairyRig, createSkyDancerAnimation } from '../../src/fairy'
import { HOME_SEED, seededRandom } from '../../src/terrain'
import { fairytale, fairytaleOrder, habitatOf, replacements, residentInfo } from '../../src/creatures/fairytale'
import type { Fairytale, Resident } from '../../src/creatures/fairytale'
import { createFairytaleCreature, createRibbonButterfly } from '../../src/creatures/fairytale-models'
import type { FairytaleFeatures } from '../../src/creatures/fairytale-models'
import './style.css'

type Cast = 'before' | 'fairytale'
type Lighting = 'day' | 'night'
type Actor = { root: THREE.Object3D; animate(time: number, moving: boolean): void; dispose(): void }

const perSpecies = 5, flyerCount = 3
const slots: Resident[] = ['cow', 'sheep', 'rabbit', 'duck', 'butterfly']
const habitatLabel = { land: 'LAND ONLY', water: 'WATER ONLY', air: 'IN THE AIR' } as const
const residentCounts: Record<Resident, string> = { cow: 'Up to 32', sheep: 'Up to 32', rabbit: 'Up to 32', duck: 'Up to 32', butterfly: '5 by the cottage' }

document.querySelector('#fairytale-study')!.innerHTML = `
  <header class="masthead"><a href="/">✧ &nbsp; Fly me to the moon</a><span>FAIRYTALE FIELD NOTES</span><a href="/studies/creature-study.html">Animal study ↗</a></header>
  <main>
    <section class="intro">
      <div><p class="eyebrow">BLOSSOM HAVEN · A NEW BESTIARY</p><h1>Once upon<br><em>a meadow.</em></h1></div>
      <div class="intro-copy"><p>A unicorn where the cow grazed. A frog prince where the duck paddled.</p><p>Blossom Haven is a fairytale home, so its residents come from fairytales too. Five soft, round creatures take the place of every creature on the planet, one for one. Each keeps the habitat, the size, and the path of the creature it replaces.</p><span class="study-badge">Now in the game · study controls are preview-only</span></div>
    </section>
    <section class="workspace" aria-label="Fairytale creatures in a Blossom Haven meadow">
      <div class="landscape-column">
        <div class="scene-toolbar">
          <div class="segmented" aria-label="Residents"><button data-cast="before" aria-pressed="false">Before</button><button data-cast="fairytale" aria-pressed="true">Fairytale</button></div>
          <div class="toolbar-end"><div class="segmented" aria-label="Light"><button data-light="day" aria-pressed="true">Day</button><button data-light="night" aria-pressed="false">Night</button></div><button id="shuffle" class="outline">↻ New residents</button></div>
        </div>
        <div id="meadow-view" class="scene"><div class="scene-caption"><span class="live-dot"></span><span id="scene-label">BLOSSOM HAVEN / FAIRYTALE RESIDENTS</span></div><div class="scene-bottom"><span>Drag to orbit · scroll to zoom</span><button id="overview">Overview ↗</button></div></div>
        <div class="habitat-controls"><label><input type="checkbox" id="paths"> Show paths</label><button id="pause" aria-pressed="false">Pause life</button><button id="focus">Find a unicorn ↗</button></div>
        <div class="census" aria-live="polite"><div><strong id="land-count">0</strong><span>ON LAND</span></div><div><strong id="water-count">0</strong><span>ON WATER</span></div><div><strong id="air-count">0</strong><span>IN THE AIR</span></div><div class="habitat-status"><span class="status-dot"></span><span id="habitat-status">Checking habitats</span></div></div>
      </div>
      <aside class="inspector">
        <div class="inspector-title"><p class="eyebrow">MEET THE RESIDENTS</p><span id="species-index">01 / 05</span></div>
        <div class="species-picker">${fairytaleOrder.map((kind, i) => `<button data-kind="${kind}" aria-pressed="${i === 0}"><span class="species-dot" style="--swatch:${fairytale[kind].color}"></span>${fairytale[kind].name}</button>`).join('')}</div>
        <div id="specimen-view" class="scene"><span class="specimen-label" id="specimen-label">CLOSE-UP / LIVE PREVIEW</span></div>
        <label class="compare"><input type="checkbox" id="compare"> Show the creature it replaces</label>
        <div class="specimen-heading"><h2 id="creature-name">Unicorn</h2><span id="habitat-badge">LAND ONLY</span></div>
        <p class="replaces" id="creature-replaces"></p>
        <p id="creature-note" class="creature-note"></p><p class="story" id="creature-story"></p><p class="behavior" id="creature-behavior"></p>
        <fieldset><legend>Try the magic</legend><label><span id="detail-label">Rainbow mane</span><input id="details" type="checkbox" checked></label><label><span id="magic-label">Glowing horn</span><input id="magic" type="checkbox" checked></label><label><span>Idle and movement animation</span><input id="motion" type="checkbox" checked></label></fieldset>
        <p class="feature-note">The choices apply to this creature in every view.</p>
      </aside>
    </section>
    <section class="lineup-section" aria-labelledby="lineup-title">
      <div class="section-heading"><div><p class="eyebrow">SCALE AND SILHOUETTE</p><h2 id="lineup-title">The whole cast, side by side.</h2><p>The fairy is at the left for scale. <strong>Flight distance</strong> shows the cast about 30 m from the game camera, at the same size in pixels as in a 900 px tall game window.</p></div><div class="segmented" aria-label="Line-up camera"><button data-shot="close" aria-pressed="true">Close</button><button data-shot="flight" aria-pressed="false">Flight distance</button></div></div>
      <div id="lineup-view" class="scene"><div class="scene-caption"><span class="live-dot"></span><span id="lineup-label">FAIRYTALE CAST / CLOSE</span></div></div>
      <ol class="lineup-names" id="lineup-names"></ol>
    </section>
    <section class="map-section" aria-labelledby="map-title">
      <div class="section-heading"><div><p class="eyebrow">ONE FOR ONE</p><h2 id="map-title">Every creature has a replacement.</h2><p>Each slot keeps its habitat, speed, and body footprint. Thus the habitat checks, obstacle checks, and routes of the game stay the same.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Before</th><th scope="col">Fairytale</th><th scope="col">Habitat</th><th scope="col">Footprint</th><th scope="col">Speed</th><th scope="col">In the game</th></tr></thead><tbody>
        ${slots.map(slot => {
          const info = residentInfo(slot), kind = replacements[slot]
          return `<tr><td>${info.name}</td><td><span class="species-dot" style="--swatch:${fairytale[kind].color}"></span> ${fairytale[kind].name}</td><td>${info.habitat}</td><td>${info.footprint} m</td><td>${info.speed ? `${info.speed} m/s` : 'hovers'}</td><td>${residentCounts[slot]}</td></tr>`
        }).join('')}
      </tbody></table></div>
    </section>
    <section class="principles"><div class="principles-heading"><p class="eyebrow">THREE SMALL RULES</p><h2>Soft, round, and a little magic.</h2></div>
      <article><span>01 / ONE FOR ONE</span><h3>Keep every slot.</h3><p>Each fairytale creature uses the habitat, footprint, speed, and count of the creature it replaces. No new habitat rules are necessary.</p></article>
      <article><span>02 / CUTE FIRST</span><h3>Big heads. Big eyes.</h3><p>Large heads, dark eyes with a white highlight, short legs, and pastel candy colors. The shapes stay readable at flight distance.</p></article>
      <article><span>03 / GENTLE MAGIC</span><h3>Glow that helps at night.</h3><p>Horns, crowns, and tail tips glow a little. Sparkles are small and few. At night the glow helps the fairy find the residents.</p></article>
    </section>
    <section class="handoff"><div><h2>Now at home on Blossom Haven.</h2><p>The game uses these creatures on Blossom Haven, with every detail and all the magic on. <code>createPopulation</code> builds them for the four ground and water slots, and five pegasus foals fly over the cottage garden. Earth keeps its animals. These controls change only the study.</p></div><button id="export">Save study settings ↓</button><p id="export-status" role="status"></p></section>
    <footer><span>FAIRYTALE CREATURE STUDY · ORIGINAL GEOMETRY</span><a href="/">Back to the game ↗</a></footer>
  </main>`

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
let cast: Cast = 'fairytale', lighting: Lighting = 'day', selected: Fairytale = 'unicorn', shot: 'close' | 'flight' = 'close'
let populationSeed = crypto.getRandomValues(new Uint32Array(1))[0]
let time = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches
const features = Object.fromEntries(fairytaleOrder.map(kind => [kind, { details: true, magic: true, motion: true }])) as Record<Fairytale, FairytaleFeatures>
const everything = { details: true, tails: true, motion: true }

function actor(slot: Resident, which: Cast, index: number): Actor {
  if (which === 'fairytale') {
    const kind = replacements[slot], model = createFairytaleCreature(kind)
    model.root.userData.kind = kind
    return { root: model.root, animate: (t, moving) => model.animate(t, moving, features[kind]), dispose: model.dispose }
  }
  if (slot === 'butterfly') {
    const model = createRibbonButterfly(index)
    return { root: model.root, animate: t => model.animate(t), dispose: model.dispose }
  }
  const model = createCreature(slot, true)
  return { root: model.root, animate: (t, moving) => model.animate(t, moving, everything), dispose: model.dispose }
}

type View = ReturnType<typeof viewport>
function viewport(id: string, label: string, fov = 38, onResize?: () => void) {
  const host = get(id), scene = new THREE.Scene()
  const sky = new THREE.HemisphereLight(0xfff5ee, 0xb77c98, 2.3), sun = new THREE.DirectionalLight(0xffedd6, 2.6)
  sun.position.set(-15, 30, 20); scene.add(sky, sun)
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 300)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', label)
  host.prepend(renderer.domElement)
  new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
    onResize?.()
  }).observe(host)
  return { scene, camera, renderer, sky, sun }
}
// Day uses the Blossom Haven sky; night uses the game's lilac night (src/daylight.ts).
function light(view: View, day: number, night: number) {
  const dark = lighting === 'night'
  view.scene.background = new THREE.Color(dark ? night : day)
  view.sky.color.setHex(dark ? 0xb9b0f0 : 0xfff5ee); view.sky.groundColor.setHex(dark ? 0x5b4a8c : 0xb77c98)
  view.sky.intensity = dark ? 1.7 : 2.3
  view.sun.color.setHex(dark ? 0xc3caff : 0xffedd6); view.sun.intensity = dark ? 0.8 : 2.6
}

const meadow = viewport('meadow-view', 'Blossom Haven meadow with fairytale creatures on land, a frog prince on the water, and pegasus foals in the air')
const specimen = viewport('specimen-view', 'Close-up of the selected fairytale creature')
const lineup = viewport('lineup-view', 'The fairy and the five fairytale creatures in a row, for scale', 30, () => frameLineup())
const orbit = new OrbitControls(meadow.camera, meadow.renderer.domElement)
orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.46; orbit.minDistance = 4; orbit.maxDistance = 90
function overview() { meadow.camera.position.set(30, 30, 37); orbit.target.set(0, 0, 0); orbit.update() }
overview()

// The survey patch is the real home terrain (HOME_SEED), flattened as in the creature study.
const field = createField('fairy', HOME_SEED)
let residents: Survey[] = [], flyers: { center: THREE.Vector3; phase: number }[] = []
let actors: Actor[] = [], flyerActors: Actor[] = []
const scenery = new THREE.Group(), routes = new THREE.Group(), cast3d = new THREE.Group()
meadow.scene.add(scenery, routes, cast3d)
const resources: { dispose(): void }[] = []

function buildTerrain() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const color = new THREE.Color(), half = (field.size - 1) / 2
  // The same sand, grass and stone colors as the game terrain in src/worlds.ts.
  for (let row = 0; row < field.size; row++) for (let col = 0; col < field.size; col++) {
    const h = field.heights[row * field.size + col]
    positions.push((col - half) * field.spacing, h, (row - half) * field.spacing)
    color.setHex(h < 0.7 ? 0xf6d6c1 : h > 5.5 ? 0xbca6d6 : 0xe7a0ba).multiplyScalar(0.92 + Math.min(6, Math.max(0, h)) * 0.014)
    colors.push(color.r, color.g, color.b)
    if (row < field.size - 1 && col < field.size - 1) {
      const a = row * field.size + col, b = a + 1, c = a + field.size, d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  meadow.scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })))
  const water = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ color: 0x73c4c8, roughness: 0.32, metalness: 0.12 }))
  water.rotation.x = -Math.PI / 2; meadow.scene.add(water)
}

function lollipop(parent: THREE.Object3D, color: number, x: number, y: number, z: number, scale: number) {
  const group = new THREE.Group(), cream = new THREE.MeshStandardMaterial({ color: 0xffedcf, roughness: 0.75 })
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.6, 7).translate(0, 2.3, 0), cream)
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.42, 24).rotateX(Math.PI / 2).translate(0, 5.4, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }))
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 5, 30).translate(0, 5.4, 0.23), cream)
  group.add(stem, disc, swirl); group.position.set(x, y, z); group.scale.setScalar(scale); group.rotation.y = x
  parent.add(group)
  resources.push({ dispose: () => group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } }) })
}

function buildScenery() {
  resources.forEach(resource => resource.dispose()); resources.length = 0
  scenery.clear()
  const random = seededRandom(populationSeed + 90), colors = [0xeb8cb3, 0xf4c67f, 0xb3a0d0, 0x92c8b4]
  const gumdrop = new THREE.SphereGeometry(1, 8, 5).scale(0.55, 0.3, 0.55).translate(0, 0.35, 0)
  const stone = new THREE.SphereGeometry(1, 10, 7).scale(1, 0.62, 0.8).translate(0, 0.5, 0)
  const cream = new THREE.MeshStandardMaterial({ color: 0xffedcf, roughness: 0.75 })
  const drops = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.5 }))
  resources.push(gumdrop, stone, cream, ...drops)
  let trees = 0
  for (let i = 0; i < 160; i++) {
    const x = random() * 44 - 22, z = random() * 44 - 22
    if (!safeSegment(field, 'sheep', { x, z }, { x, z })) continue
    const clear = (gap: number) => !residents.some(r => r.route.some(p => Math.hypot(p.x - x, p.z - z) < gap))
      && !flyers.some(f => Math.hypot(f.center.x - x, f.center.z - z) < gap)
    const y = heightAt(field, x, z), pick = random()
    if (pick < 0.12 && trees < 9 && clear(6)) { lollipop(scenery, colors[trees % 4], x, y, z, 0.5 + random() * 0.3); trees++ }
    else if (pick < 0.3 && clear(3.5)) {
      const mesh = new THREE.Mesh(stone, cream); mesh.position.set(x, y, z); mesh.scale.setScalar(0.4 + random() * 0.4); scenery.add(mesh)
    } else if (clear(2.2)) {
      const mesh = new THREE.Mesh(gumdrop, drops[i % 4]); mesh.position.set(x, y, z); mesh.scale.setScalar(0.5 + random() * 0.5); scenery.add(mesh)
    }
  }
}

function placeFlyers() {
  const random = seededRandom(populationSeed ^ 0xf1e5)
  flyers = []
  for (let attempt = 0; attempt < 400 && flyers.length < flyerCount; attempt++) {
    const x = random() * 30 - 15, z = random() * 30 - 15
    if (!safeSegment(field, 'cow', { x, z }, { x, z }) || flyers.some(f => Math.hypot(f.center.x - x, f.center.z - z) < 8)) continue
    flyers.push({ center: new THREE.Vector3(x, heightAt(field, x, z) + 2.6, z), phase: random() * 10 })
  }
}

function buildCast() {
  actors.forEach(a => a.dispose()); flyerActors.forEach(a => a.dispose())
  cast3d.clear()
  actors = residents.map((resident, i) => actor(resident.kind, cast, i))
  flyerActors = flyers.map((_, i) => actor('butterfly', cast, i))
  for (const a of [...actors, ...flyerActors]) cast3d.add(a.root)
  residents.forEach((resident, i) => actors[i].root.scale.setScalar(resident.scale))
  get('scene-label').textContent = `BLOSSOM HAVEN / ${cast === 'before' ? 'BEFORE: ANIMALS' : 'FAIRYTALE RESIDENTS'}`
  updateCast()
}

function buildRoutes() {
  routes.traverse(o => { if (o instanceof THREE.Line) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
  routes.clear()
  for (const resident of residents) {
    const points: THREE.Vector3[] = []
    for (let i = 1; i < resident.route.length; i++) {
      const a = resident.route[i - 1], b = resident.route[i]
      for (let step = 0; step <= 30; step++) {
        const t = step / 30, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t
        points.push(new THREE.Vector3(x, resident.kind === 'duck' ? 0.05 : heightAt(field, x, z) + 0.05, z))
      }
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: resident.kind === 'duck' ? 0xffffff : 0xfff1c9, dashSize: 0.25, gapSize: 0.15 }))
    line.computeLineDistances(); routes.add(line)
  }
  routes.visible = get<HTMLInputElement>('paths').checked
}

function shuffle() {
  residents = populate(field, populationSeed, perSpecies)
  placeFlyers(); buildScenery(); buildRoutes(); buildCast()
  const land = residents.filter(r => r.kind !== 'duck').length
  get('land-count').textContent = String(land)
  get('water-count').textContent = String(residents.length - land)
  get('air-count').textContent = String(flyers.length)
  get('habitat-status').textContent = `${residents.length} safe routes · ${4 * perSpecies - residents.length} skipped`
  updateFocus()
}

const normal = new THREE.Vector3()
function updateCast() {
  residents.forEach((resident, i) => {
    const pose = poseOnRoute(resident, time), model = actors[i]
    model.root.position.set(pose.x, resident.kind === 'duck' ? 0.01 : heightAt(field, pose.x, pose.z) + 0.025, pose.z)
    model.root.rotation.y = pose.yaw
    model.animate(time + resident.phase, pose.moving)
  })
  flyers.forEach((flyer, i) => {
    // A slow circle over the meadow. In the game, five foals circle over the cottage garden.
    const angle = (time + flyer.phase) * 0.35, model = flyerActors[i]
    model.root.position.set(flyer.center.x + Math.cos(angle) * 1.6, flyer.center.y + Math.sin(time * 0.8 + i) * 0.35, flyer.center.z + Math.sin(angle) * 1.6)
    normal.set(-Math.sin(angle), 0, Math.cos(angle))
    model.root.rotation.y = Math.atan2(normal.x, normal.z)
    model.animate(time + flyer.phase, true)
  })
}

// Close-up: the selected creature, and on request the creature it replaces.
let preview: Actor | undefined, previous: Actor | undefined
const pedestal = new THREE.Group(); specimen.scene.add(pedestal)
const frames: Record<Fairytale, { height: number; distance: number }> = {
  unicorn: { height: 0.95, distance: 4.4 }, dragonling: { height: 0.62, distance: 3.4 }, kitsune: { height: 0.5, distance: 2.6 },
  frogPrince: { height: 0.36, distance: 2.6 }, pegasus: { height: 0.85, distance: 3.2 },
}
function buildPedestal() {
  pedestal.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
  pedestal.clear()
  const wet = selected === 'frogPrince'
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.1, 48), new THREE.MeshStandardMaterial({ color: wet ? 0x73c4c8 : 0xe7a0ba, roughness: wet ? 0.3 : 0.95 }))
  disc.position.y = -0.05; pedestal.add(disc)
}
function selectKind(kind: Fairytale) {
  selected = kind
  preview?.dispose(); previous?.dispose()
  specimen.scene.remove(...[preview?.root, previous?.root].filter((o): o is THREE.Object3D => !!o))
  const slot = fairytale[kind].replaces
  preview = actor(slot, 'fairytale', 0); specimen.scene.add(preview.root)
  previous = actor(slot, 'before', 1); specimen.scene.add(previous.root)
  buildPedestal(); frameSpecimen()
  const info = fairytale[kind], habitat = habitatOf(kind)
  get('creature-name').textContent = info.name
  get('habitat-badge').textContent = habitatLabel[habitat]
  get('creature-replaces').textContent = `Replaces the ${residentInfo(slot).name.toLowerCase()}`
  get('creature-note').textContent = info.note
  get('creature-story').textContent = info.story
  get('creature-behavior').textContent = info.behavior
  get('detail-label').textContent = info.detail
  get('magic-label').textContent = info.magic
  get('species-index').textContent = `${String(fairytaleOrder.indexOf(kind) + 1).padStart(2, '0')} / 05`
  for (const key of ['details', 'magic', 'motion'] as const) get<HTMLInputElement>(key).checked = features[kind][key]
  document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.kind === kind)))
  updateFocus()
}
function frameSpecimen() {
  const compare = get<HTMLInputElement>('compare').checked, frame = frames[selected], hover = selected === 'pegasus' ? 0.75 : 0
  preview!.root.position.set(compare ? 0.75 * frame.distance / 3 : 0, hover, 0)
  preview!.root.rotation.y = -0.45
  previous!.root.visible = compare
  previous!.root.position.set(-0.75 * frame.distance / 3, selected === 'pegasus' ? 1.1 : 0, -0.2)
  previous!.root.rotation.y = -0.45
  const distance = frame.distance * (compare ? 1.35 : 1)
  specimen.camera.position.set(distance * 0.55, frame.height + distance * 0.32, distance * 0.83)
  specimen.camera.lookAt(0, frame.height, 0)
  get('specimen-label').textContent = compare ? `LEFT: ${residentInfo(fairytale[selected].replaces).name.toUpperCase()} (BEFORE) · RIGHT: ${fairytale[selected].name.toUpperCase()}` : 'CLOSE-UP / LIVE PREVIEW'
}

// Line-up: the fairy for scale, then one of each slot, in catalog order.
let lineupActors: Actor[] = []
const fairyRig = createFairyRig({ withTrail: false }), fairyFlight = createSkyDancerAnimation(fairyRig)
fairyRig.root.position.set(-6.2, 1.1, 0); fairyRig.root.rotation.y = 0.5
lineup.scene.add(fairyRig.root)
const lineupGround = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0xe7a0ba, roughness: 0.95 }))
lineupGround.rotation.x = -Math.PI / 2; lineup.scene.add(lineupGround)
const pond = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshStandardMaterial({ color: 0x73c4c8, roughness: 0.3 }))
pond.rotation.x = -Math.PI / 2; pond.position.set(3.3, 0.01, 0); lineup.scene.add(pond)
const lineupX = [-3.8, -1.2, 1, 3.3, 5.6]
function buildLineup() {
  lineupActors.forEach(a => { lineup.scene.remove(a.root); a.dispose() })
  lineupActors = slots.map((slot, i) => {
    const model = actor(slot, cast, i)
    model.root.position.set(lineupX[i], slot === 'butterfly' ? 1.3 : 0.01, 0)
    model.root.rotation.y = 0.5
    lineup.scene.add(model.root)
    return model
  })
  get('lineup-names').innerHTML = [`<li><span>Fairy</span><small>for scale</small></li>`, ...slots.map(slot => cast === 'fairytale'
    ? `<li><span>${fairytale[replacements[slot]].name}</span><small>was the ${residentInfo(slot).name.toLowerCase()}</small></li>`
    : `<li><span>${residentInfo(slot).name}</span><small>becomes the ${fairytale[replacements[slot]].name}</small></li>`)].join('')
  frameLineup()
}
function frameLineup() {
  if (shot === 'close') {
    // Keep the whole row (about 14 m) in view on a narrow phone panel.
    const distance = Math.max(10, 7.6 / (Math.tan(THREE.MathUtils.degToRad(15)) * lineup.camera.aspect))
    lineup.camera.fov = 30; lineup.camera.position.set(-0.3, 0.75 + distance * 0.19, distance); lineup.camera.lookAt(-0.3, 0.75, 0)
  }
  else {
    // The game camera has a 58° vertical view. Scale it to this panel, so each creature has
    // the same size in pixels as in a 900 px tall game window.
    const height = get('lineup-view').clientHeight || 320
    lineup.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(29)) * height / 900))
    lineup.camera.position.set(-0.3, 11, 28); lineup.camera.lookAt(-0.3, 0.6, 0)
  }
  lineup.camera.updateProjectionMatrix()
  get('lineup-label').textContent = `${cast === 'fairytale' ? 'FAIRYTALE CAST' : 'BEFORE'} / ${shot === 'close' ? 'CLOSE' : 'FLIGHT DISTANCE'}`
}

function applyLight() {
  light(meadow, 0xefd6e9, 0x2b2452); light(specimen, 0xf7ecf1, 0x322a5c); light(lineup, 0xefd6e9, 0x2b2452)
  lineupGround.material.color.setHex(lighting === 'night' ? 0x9c6f93 : 0xe7a0ba)
  document.body.dataset.light = lighting
}

function updateFocus() {
  const slot = fairytale[selected].replaces, name = cast === 'fairytale' ? fairytale[selected].name.toLowerCase() : residentInfo(slot).name.toLowerCase()
  get('focus').textContent = `Find a ${name} ↗`
  get('focus').toggleAttribute('disabled', slot === 'butterfly' ? !flyers.length : !residents.some(r => r.kind === slot))
}

const press = (selector: string, active: HTMLElement) => document.querySelectorAll(selector).forEach(item => item.setAttribute('aria-pressed', String(item === active)))
document.querySelectorAll<HTMLButtonElement>('[data-cast]').forEach(button => button.addEventListener('click', () => {
  cast = button.dataset.cast as Cast; press('[data-cast]', button); buildCast(); buildLineup(); updateFocus()
}))
document.querySelectorAll<HTMLButtonElement>('[data-light]').forEach(button => button.addEventListener('click', () => {
  lighting = button.dataset.light as Lighting; press('[data-light]', button); applyLight()
}))
document.querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(button => button.addEventListener('click', () => {
  shot = button.dataset.shot as 'close' | 'flight'; press('[data-shot]', button); frameLineup()
}))
document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(button => button.addEventListener('click', () => selectKind(button.dataset.kind as Fairytale)))
for (const key of ['details', 'magic', 'motion'] as const) get<HTMLInputElement>(key).addEventListener('change', event => {
  features[selected][key] = (event.target as HTMLInputElement).checked
})
get('compare').addEventListener('change', frameSpecimen)
get('shuffle').addEventListener('click', () => { populationSeed = crypto.getRandomValues(new Uint32Array(1))[0]; time = 0; shuffle(); overview() })
get('overview').addEventListener('click', overview)
get('paths').addEventListener('change', () => { routes.visible = get<HTMLInputElement>('paths').checked })
function updatePause() { get('pause').textContent = paused ? 'Resume life' : 'Pause life'; get('pause').setAttribute('aria-pressed', String(paused)) }
get('pause').addEventListener('click', () => { paused = !paused; updatePause() })
get('focus').addEventListener('click', () => {
  const slot = fairytale[selected].replaces
  const target = slot === 'butterfly' ? flyerActors[0]?.root : actors[residents.findIndex(r => r.kind === slot)]?.root
  if (!target) return
  orbit.target.copy(target.position)
  meadow.camera.position.copy(orbit.target).add(new THREE.Vector3(4.5, 3.5, 6)); orbit.update()
})
get('export').addEventListener('click', () => {
  const payload = {
    version: 1, artifact: 'fairytale-creature-study', replacements, cast, lighting, features, populationSeed,
    footprints: Object.fromEntries(slots.map(slot => [replacements[slot], residentInfo(slot).footprint])),
    speeds: Object.fromEntries(slots.map(slot => [replacements[slot], residentInfo(slot).speed])),
    note: 'Design handoff. Habitat rules, footprints and speeds stay those of the replaced species.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'fairytale-creature-study.json'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  get('export-status').textContent = 'Saved the replacements, your magic choices, and the light.'
})

buildTerrain(); shuffle(); selectKind(selected); buildLineup(); applyLight(); updatePause()
let last = performance.now()
function animate(now: number) {
  const delta = Math.min((now - last) / 1000, 0.05); last = now
  if (!paused) time += delta
  updateCast()
  const moving = Math.floor(time / 4) % 2 === 0
  preview?.animate(time, moving); previous?.animate(time, moving)
  lineupActors.forEach((model, i) => model.animate(time + i, false))
  if (!paused) fairyFlight.update(delta, false)
  orbit.update()
  meadow.renderer.render(meadow.scene, meadow.camera)
  specimen.renderer.render(specimen.scene, specimen.camera)
  lineup.renderer.render(lineup.scene, lineup.camera)
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
