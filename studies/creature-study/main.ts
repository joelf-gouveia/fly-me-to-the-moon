import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createField, heightAt, populate, poseOnRoute, safeSegment, species } from '../../src/creatures/habitat'
import type { LivingWorld, Species } from '../../src/creatures/habitat'
import { createCreature } from '../../src/creatures/models'
import type { CreatureFeatures } from '../../src/creatures/models'
import { HOME_SEED, seededRandom } from '../../src/terrain'
import './style.css'

const kinds: Species[] = ['rabbit', 'sheep', 'duck', 'cow']
const perSpecies = 5
document.querySelector('#creature-study')!.innerHTML = `
  <header class="masthead"><a href="/">✧ &nbsp; Fly me to the moon</a><span>FIELD NOTES / 02</span><a href="/studies/fairy-flight-study.html">Fairy study ↗</a></header>
  <main>
    <section class="intro"><div><p class="eyebrow">A LITTLE COMPANY FOR THE JOURNEY</p><h1>Little lives.<br><em>A livelier world.</em></h1></div><div class="intro-copy"><p>A rabbit in the grass. A duck on the water.</p><p>Small, familiar creatures with just enough movement to make a place feel inhabited. Explore a living patch of Earth or Blossom Haven.</p><span class="study-badge">Now in the game · study controls are preview-only</span></div></section>
    <section class="workspace" aria-label="Creature design and habitat preview">
      <div class="landscape-column">
        <div class="scene-toolbar"><div class="segmented" aria-label="World"><button data-world="earth" aria-pressed="true">Earth</button><button data-world="fairy" aria-pressed="false">Blossom Haven</button></div><button id="regenerate" class="outline">↻ New terrain</button></div>
        <div id="habitat-view"><div class="scene-caption"><span class="live-dot"></span><span id="scene-label">EARTH / SHORELINE SURVEY</span></div><div class="scene-bottom"><span>Drag to orbit · scroll to zoom</span><button id="overview">Overview ↗</button></div></div>
        <div class="habitat-controls"><label><input type="checkbox" id="paths" checked> Show paths</label><button id="pause" aria-pressed="false">Pause life</button><button id="shuffle">Shuffle residents ↻</button><button id="focus-animal">Find a rabbit ↗</button></div>
        <div class="census" aria-live="polite"><div><strong id="land-count">0</strong><span>ON LAND</span></div><div><strong id="water-count">0</strong><span>ON WATER</span></div><div class="habitat-status"><span class="status-dot"></span><span id="habitat-status">Checking habitats</span></div><span id="seed-label"></span></div>
      </div>
      <aside class="inspector">
        <div class="inspector-title"><p class="eyebrow">MEET THE RESIDENTS</p><span id="species-index">01 / ${String(kinds.length).padStart(2, '0')}</span></div>
        <div class="species-picker">${kinds.map((kind, i) => `<button data-species="${kind}" aria-pressed="${i === 0}"><span class="species-dot" style="--swatch:${species[kind].color}"></span>${species[kind].name}</button>`).join('')}</div>
        <div id="creature-view"><span class="specimen-label">SIMPLE SHAPES / LIVE PREVIEW</span></div>
        <div class="specimen-heading"><h2 id="animal-name">Rabbit</h2><span id="habitat-badge">LAND ONLY</span></div>
        <p id="animal-note" class="animal-note"></p><p class="behavior" id="animal-behavior"></p>
        <fieldset><legend>Try a little detail</legend><label><span id="detail-label">Pink ear centers</span><input id="details" type="checkbox" checked></label><label><span>Little tail</span><input id="tails" type="checkbox" checked></label><label><span>Idle & movement animation</span><input id="motion" type="checkbox" checked></label></fieldset>
        <p class="feature-note">These details apply to this species in both worlds.</p>
      </aside>
    </section>
    <section class="principles"><div class="principles-heading"><p class="eyebrow">SMALL RULES, BELIEVABLE LIFE</p><h2>A place for every creature.</h2></div><article><span>01 / FIND A HOME</span><h3>Terrain first. Residents second.</h3><p>New terrain creates new habitat-aware positions. Shuffle residents to try another arrangement on the same landscape.</p></article><article><span>02 / STAY IN BOUNDS</span><h3>Shorelines are boundaries.</h3><p>Rabbits, sheep, and cows keep their whole bodies on dry, gentle ground. Ducks stay afloat, with a buffer from the bank.</p></article><article><span>03 / KEEP IT SMALL</span><h3>Wander. Rest. Repeat.</h3><p>Short paths, a little pause, then the same safe route back. No long migrations or complicated animal AI.</p></article></section>
    <section class="handoff"><div><h2>Keep the world small. Let it breathe.</h2><p>All four creatures now live on Earth and Blossom Haven in the flight game. Try their optional features here; these controls only change the study.</p><p class="home-note">Blossom Haven keeps its fixed home terrain in the game. New terrain here is for experimentation.</p></div><button id="export">Save study settings ↓</button><p id="export-status" role="status"></p></section>
    <footer><span>PROCEDURAL CREATURE STUDY · ORIGINAL GEOMETRY</span><a href="/">Back to the game ↗</a></footer>
  </main>`

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
let world: LivingWorld = 'earth', selected: Species = 'rabbit'
let seed = crypto.getRandomValues(new Uint32Array(1))[0], populationSeed = crypto.getRandomValues(new Uint32Array(1))[0]
let time = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches
const features: Record<Species, CreatureFeatures> = {
  cow: { details: true, tails: true, motion: true },
  rabbit: { details: true, tails: true, motion: true },
  sheep: { details: true, tails: true, motion: true },
  duck: { details: true, tails: true, motion: true },
}

function viewport(id: string, background: number) {
  const host = get(id), scene = new THREE.Scene()
  scene.background = new THREE.Color(background)
  scene.add(new THREE.HemisphereLight(0xfff8e6, 0x71856f, 2.3))
  const sun = new THREE.DirectionalLight(0xffedcb, 2.8)
  sun.position.set(-15, 30, 20); scene.add(sun)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 250)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', id === 'habitat-view' ? 'Procedural habitat with land animals, ducks, and their walking routes' : 'Close-up of selected creature and its optional features')
  host.prepend(renderer.domElement)
  new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
  }).observe(host)
  return { scene, camera, renderer }
}
const habitat = viewport('habitat-view', 0xe3e7dc), specimen = viewport('creature-view', 0xebece3)
const orbit = new OrbitControls(habitat.camera, habitat.renderer.domElement)
orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.46; orbit.minDistance = 5; orbit.maxDistance = 110
function overview() { habitat.camera.position.set(39, 40, 49); orbit.target.set(0, 0, 0); orbit.update() }
overview()
specimen.camera.position.set(2.3, 1.65, 3.1); specimen.camera.lookAt(0, 0.58, 0)
let field = createField(world, seed), residents = populate(field, populationSeed, perSpecies)
let meshes: ReturnType<typeof createCreature>[] = [], preview = createCreature(selected, false)
specimen.scene.add(preview.root)
const scenery = new THREE.Group(), routes = new THREE.Group()
habitat.scene.add(scenery, routes)
const terrainResources: { dispose(): void }[] = []

function buildLandscape() {
  meshes.forEach(model => { habitat.scene.remove(model.root); model.dispose() })
  terrainResources.forEach(resource => resource.dispose()); terrainResources.length = 0
  scenery.clear(); routes.clear()
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const color = new THREE.Color(), half = (field.size - 1) / 2
  for (let row = 0; row < field.size; row++) for (let col = 0; col < field.size; col++) {
    const h = field.heights[row * field.size + col]
    positions.push((col - half) * field.spacing, h, (row - half) * field.spacing)
    color.setHex(h < 0.55 ? 0xd6c5a0 : world === 'fairy' ? 0xc2a9bc : 0x88a574)
    color.multiplyScalar(0.95 + Math.min(6, Math.max(0, h)) * 0.018)
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
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
  scenery.add(new THREE.Mesh(geometry, material)); terrainResources.push(geometry, material)
  const waterGeometry = new THREE.PlaneGeometry(48, 48)
  const waterMaterial = new THREE.MeshStandardMaterial({ color: world === 'fairy' ? 0x9daed0 : 0x7bb5bd, metalness: 0.08, roughness: 0.34 })
  const water = new THREE.Mesh(waterGeometry, waterMaterial); water.rotation.x = -Math.PI / 2
  scenery.add(water); terrainResources.push(waterGeometry, waterMaterial)
  const random = seededRandom(seed + 90), rockGeo = new THREE.IcosahedronGeometry(1, 0)
  const rockMat = new THREE.MeshStandardMaterial({ color: world === 'fairy' ? 0xa894ac : 0x929883, roughness: 1 })
  terrainResources.push(rockGeo, rockMat)
  for (let i = 0; i < 65; i++) {
    const x = random() * 44 - 22, z = random() * 44 - 22
    if (!safeSegment(field, 'sheep', { x, z }, { x, z })) continue
    // Keep decorations outside the animals' entire route corridors.
    if (residents.some(r => r.route.some(p => Math.hypot(p.x - x, p.z - z) < 4.8))) continue
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set(x, heightAt(field, x, z), z)
    rock.scale.set(0.3 + random() * 0.6, 0.2 + random() * 0.6, 0.3 + random() * 0.6)
    scenery.add(rock)
  }
  meshes = residents.map(resident => {
    const model = createCreature(resident.kind, world === 'fairy')
    model.root.scale.setScalar(resident.scale)
    habitat.scene.add(model.root)
    const points: THREE.Vector3[] = []
    for (let i = 1; i < resident.route.length; i++) {
      const a = resident.route[i - 1], b = resident.route[i]
      for (let step = 0; step <= 30; step++) {
        const t = step / 30, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t
        points.push(new THREE.Vector3(x, resident.kind === 'duck' ? 0.05 : heightAt(field, x, z) + 0.05, z))
      }
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const lineMaterial = new THREE.LineDashedMaterial({ color: resident.kind === 'duck' ? 0xf9fcf7 : 0xf9e6a9, dashSize: 0.25, gapSize: 0.15 })
    const line = new THREE.Line(lineGeometry, lineMaterial); line.computeLineDistances()
    routes.add(line); terrainResources.push(lineGeometry, lineMaterial)
    return model
  })
  routes.visible = get<HTMLInputElement>('paths').checked
  get('land-count').textContent = String(residents.filter(r => r.kind !== 'duck').length)
  get('water-count').textContent = String(residents.filter(r => r.kind === 'duck').length)
  get('habitat-status').textContent = `${residents.length} safe routes · ${kinds.length * perSpecies - residents.length} skipped`
  get('seed-label').textContent = `SEED ${seed}`
  get('scene-label').textContent = `${world === 'earth' ? 'EARTH' : 'BLOSSOM HAVEN'} / SHORELINE SURVEY`
  get('focus-animal').toggleAttribute('disabled', !residents.some(r => r.kind === selected))
  updateResidents()
}

function updateResidents() {
  residents.forEach((resident, index) => {
    const position = poseOnRoute(resident, time), model = meshes[index]
    model.root.position.set(position.x, resident.kind === 'duck' ? 0.01 : heightAt(field, position.x, position.z) + 0.025, position.z)
    model.root.rotation.y = position.yaw
    model.animate(time + resident.phase, position.moving, features[resident.kind])
  })
}

function selectSpecies(kind: Species) {
  selected = kind
  specimen.scene.remove(preview.root); preview.dispose()
  preview = createCreature(kind, world === 'fairy'); specimen.scene.add(preview.root)
  preview.root.rotation.y = -0.3
  get('animal-name').textContent = species[kind].name
  get('animal-note').textContent = species[kind].note
  get('animal-behavior').textContent = species[kind].behavior
  get('detail-label').textContent = species[kind].feature
  get('habitat-badge').textContent = kind === 'duck' ? 'WATER ONLY' : 'LAND ONLY'
  get('species-index').textContent = `${String(kinds.indexOf(kind) + 1).padStart(2, '0')} / ${String(kinds.length).padStart(2, '0')}`
  get('focus-animal').textContent = `Find a ${kind} ↗`
  get('focus-animal').toggleAttribute('disabled', !residents.some(r => r.kind === kind))
  for (const key of ['details', 'tails', 'motion'] as const) get<HTMLInputElement>(key).checked = features[kind][key]
  document.querySelectorAll<HTMLButtonElement>('[data-species]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.species === kind)))
}
function regenerate(newTerrain: boolean) {
  if (newTerrain) { seed = crypto.getRandomValues(new Uint32Array(1))[0]; field = createField(world, seed) }
  populationSeed = crypto.getRandomValues(new Uint32Array(1))[0]
  residents = populate(field, populationSeed, perSpecies); time = 0
  buildLandscape(); overview()
}
document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => button.addEventListener('click', () => {
  world = button.dataset.world as LivingWorld
  seed = world === 'fairy' ? HOME_SEED : crypto.getRandomValues(new Uint32Array(1))[0]
  field = createField(world, seed)
  document.querySelectorAll('[data-world]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
  regenerate(false); selectSpecies(selected)
}))
document.querySelectorAll<HTMLButtonElement>('[data-species]').forEach(button => button.addEventListener('click', () => selectSpecies(button.dataset.species as Species)))
for (const key of ['details', 'tails', 'motion'] as const) get<HTMLInputElement>(key).addEventListener('change', event => {
  features[selected][key] = (event.target as HTMLInputElement).checked
})
get('regenerate').addEventListener('click', () => regenerate(true))
get('shuffle').addEventListener('click', () => regenerate(false))
get('overview').addEventListener('click', overview)
get('paths').addEventListener('change', () => { routes.visible = get<HTMLInputElement>('paths').checked })
function updatePause() { get('pause').textContent = paused ? 'Resume life' : 'Pause life'; get('pause').setAttribute('aria-pressed', String(paused)) }
get('pause').addEventListener('click', () => { paused = !paused; updatePause() })
get('focus-animal').addEventListener('click', () => {
  const index = residents.findIndex(r => r.kind === selected)
  if (index < 0) return
  orbit.target.copy(meshes[index].root.position)
  habitat.camera.position.copy(orbit.target).add(new THREE.Vector3(7, 8, 10)); orbit.update()
})
get('export').addEventListener('click', () => {
  const payload = { version: 1, artifact: 'creature-study', world, terrainSeed: seed, populationSeed, features, residents, note: 'Local terrain survey; not world-space spawn coordinates.' }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'creature-study.json'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  get('export-status').textContent = 'Saved your features, terrain seed, and creature paths.'
})
buildLandscape(); selectSpecies(selected); updatePause()
let last = performance.now()
function animate(now: number) {
  const delta = Math.min((now - last) / 1000, 0.05); last = now
  if (!paused) time += delta
  updateResidents(); preview.animate(time, Math.floor(time / 4) % 2 === 0, features[selected])
  orbit.update()
  habitat.renderer.render(habitat.scene, habitat.camera)
  specimen.renderer.render(specimen.scene, specimen.camera)
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
