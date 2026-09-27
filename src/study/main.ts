import * as THREE from 'three'
import { createStudyFairy, directions } from './rig'
import './style.css'

document.querySelector<HTMLDivElement>('#study')!.innerHTML = `
  <header class="masthead"><a href="/">✧ &nbsp; Fly me to the moon</a><span>CHARACTER STUDY / 01</span><a class="back" href="/">Back to the game ↗</a></header>
  <main>
    <section class="intro">
      <div><p class="eyebrow">A FAIRY, SEEN FROM BEHIND</p><h1>Let her silhouette<br><em>take flight.</em></h1></div>
      <div class="intro-copy"><p>How should she drift—and how should she dash?</p><p>Compare three animated directions from the camera that matters. Each uses the same simple fairy, with distinct poses for normal flight and boost.</p><span class="study-note">Sky Dancer is now in the game · study controls are preview-only</span></div>
    </section>

    <div class="directions" role="group" aria-label="Flight direction">
      ${directions.map((direction, i) => `<button data-direction="${i}" aria-pressed="${i === 1}"><span class="letter">${String.fromCharCode(65 + i)}</span><span><strong>${direction.name}</strong><small>${direction.mood}</small></span>${i === 1 ? '<b>IN GAME</b>' : ''}</button>`).join('')}
    </div>

    <div class="direction-caption"><p id="direction-description"></p><p id="tradeoff"></p></div>
    <section class="comparison" aria-label="Animated normal and boost comparison">
      <article class="pose-card">
        <header><div><span class="eyebrow">01 / NORMAL FLIGHT</span><h2>A gentle drift</h2></div><span class="state-dot">CRUISE</span></header>
        <div class="viewport" id="normal-view"><span class="view-caption">REAR CAMERA</span><span class="flight-arrow">FLIGHT DIRECTION: INTO THE SCENE ↗</span></div>
        <div class="pose-details"><p id="normal-note"></p><label for="normal-lean">Forward lean <output id="normal-value">18°</output></label><input id="normal-lean" type="range" min="0" max="85" value="18" aria-label="Normal flight lean from upright" /></div>
      </article>
      <article class="pose-card boost-card">
        <header><div><span class="eyebrow">02 / BOOST</span><h2>A little more purpose</h2></div><span class="state-dot">BOOST</span></header>
        <div class="viewport" id="boost-view"><span class="view-caption">REAR CAMERA</span><span class="flight-arrow">FLIGHT DIRECTION: INTO THE SCENE ↗</span></div>
        <div class="pose-details"><p id="boost-note"></p><label for="boost-lean">Forward lean <output id="boost-value">52°</output></label><input id="boost-lean" type="range" min="0" max="88" value="52" aria-label="Boost lean from upright" /></div>
      </article>
    </section>

    <section class="workbench" aria-label="Pose inspection controls">
      <div class="view-tools"><span class="eyebrow">INSPECT THE POSE</span><div class="segmented" role="group" aria-label="Camera angle"><button data-view="0" aria-pressed="true">Rear</button><button data-view="35" aria-pressed="false">¾ view</button><button data-view="90" aria-pressed="false">Side</button></div></div>
      <div class="height-control"><label for="elevation">Camera elevation <output id="elevation-value">18°</output></label><input id="elevation" type="range" min="5" max="45" value="18" /></div>
      <div class="switches"><label><input type="checkbox" id="silhouette" /> Silhouette</label><label><input type="checkbox" id="game-size" /> Gameplay size</label><label><input type="checkbox" id="slow" /> Slow motion</label><button id="play-toggle" aria-pressed="false">Pause motion</button></div>
      <div class="background-tools"><span>Backdrop</span><button data-background="space" aria-pressed="true">Space</button><button data-background="sky" aria-pressed="false">Sky</button><button data-background="forest" aria-pressed="false">Forest</button></div>
    </section>
    <p class="control-footnote">Lean is measured from upright (0°); 90° would be horizontal. Wingbeats are stylized animation rates. Gameplay size is an approximate readability check, not a live game capture.</p>

    <section class="decision">
      <div><span class="eyebrow">YOUR SELECTED DIRECTION</span><h2>Sky Dancer, with open arms<br>and a reaching boost.</h2><p>The game now uses B: a 32° cruise and a 66° boost. She eases into boost over 0.25 seconds and returns over 0.4 seconds, with translucent wings framing her back.</p></div>
      <div class="choice"><p id="choice-label" aria-live="polite">A · Petal glide / 18° → 52°</p><button id="save-choice">Save this direction ↓</button><button id="reset" class="text-button">Reset this pose</button><small id="save-status" aria-live="polite">Downloads your choice and camera settings as JSON.</small></div>
    </section>

    <section class="research">
      <div class="research-heading"><span class="eyebrow">REFERENCE NOTES</span><h2>What the research gives us.</h2><p>Fairies are fictional, so there is no single correct flight mechanic. These sources inform the visual language; the angles and motion below are original proposals for this game.</p></div>
      <div class="research-grid">
        <article><span>01 / FAIRY CONVENTIONS</span><h3>Fluttering & fast flight</h3><p>Disney explicitly describes Vidia as a fast-flying fairy. Dreamlight Valley’s wing-glider update uses a fluttering animation. These support distinct flight personalities, but do not prescribe a particular body angle.</p><p class="inference">Our choice: a buoyant cruise, then a more committed forward lean for boost.</p><a href="https://video.disney.com/watch/meet-vidia-4d75c7f6a3be681318c01c5f" target="_blank" rel="noreferrer">Disney · Meet Vidia ↗</a><a href="https://disneydreamlightvalley.com/news/update-oct-9-2024" target="_blank" rel="noreferrer">Dreamlight Valley · Wing gliders ↗</a></article>
        <article><span>02 / NATURAL INSPIRATION</span><h3>Wings that feel alive</h3><p>Lund’s butterfly research describes flexible wings cupping during the upstroke and a clap that produces forward thrust. That is a reference for a lively stroke, not evidence for humanoid fairy aerodynamics.</p><p class="inference">Our choice: offset the upper and lower wing phases and tighten the stroke during boost. This simple rig approximates the rhythm, not the biological mechanism.</p><a href="https://www.biology.lu.se/node/246" target="_blank" rel="noreferrer">Lund University · Butterfly flight ↗</a></article>
        <article><span>03 / ANIMATION CRAFT</span><h3>Design for the camera</h3><p>Animator Anthony Wong emphasizes silhouette, negative space and staging for the destination camera while keeping a pose convincing from other angles.</p><p class="inference">Our choice: upright normal flight, staggered legs, wings framing the torso, and restrained glow. Use the silhouette toggle and side view to judge the result.</p><a href="https://www.animationmentor.com/blog/tutorial-building-appealing-character-poses-for-animation/" target="_blank" rel="noreferrer">Animation Mentor · Pose clarity ↗</a></article>
      </div>
    </section>
    <footer><span>Original procedural pose study · No reference character assets used</span><span>Research checked 25 September 2026</span></footer>
  </main>
`

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const normalInput = get<HTMLInputElement>('normal-lean')
const boostInput = get<HTMLInputElement>('boost-lean')
const elevationInput = get<HTMLInputElement>('elevation')
let selected = 1, azimuth = 0, elevation = 18, gameplaySize = false
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches
let slowMotion = false, time = 0, lastTime = performance.now()
let background: 'space' | 'sky' | 'forest' = 'space'

function createViewport(id: string, boosted: boolean) {
  const host = get<HTMLDivElement>(id)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', boosted ? 'Animated fairy boost pose, viewed from behind' : 'Animated fairy normal flight pose, viewed from behind')
  host.prepend(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x191f2c)
  scene.add(new THREE.HemisphereLight(0xe5efff, 0x73637a, 2.1))
  const light = new THREE.DirectionalLight(0xffe0c1, 3)
  light.position.set(-3, 5, 6)
  scene.add(light)
  const rim = new THREE.DirectionalLight(0x97d8d9, 2)
  rim.position.set(4, 2, -3)
  scene.add(rim)
  const fairy = createStudyFairy()
  scene.add(fairy.root)
  const floor = new THREE.GridHelper(18, 24, 0x4d5665, 0x343d4c)
  floor.position.y = -1.5
  const gridMaterials = Array.isArray(floor.material) ? floor.material : [floor.material]
  gridMaterials.forEach(material => { material.transparent = true; material.opacity = 0.23 })
  scene.add(floor)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  const target = new THREE.Vector3(0, 0.2, 0)
  const observer = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight)
    camera.aspect = host.clientWidth / host.clientHeight
    camera.updateProjectionMatrix()
  })
  observer.observe(host)
  function render() {
    const colors = { space: 0x191f2c, sky: 0x8fbfcd, forest: 0x40554c }
    scene.background = new THREE.Color(colors[background])
    const radius = gameplaySize ? host.clientHeight * 2.7 / (2 * 110 * Math.tan(THREE.MathUtils.degToRad(19))) : 6.5
    const phi = THREE.MathUtils.degToRad(elevation)
    const theta = THREE.MathUtils.degToRad(azimuth)
    camera.position.set(Math.sin(theta) * Math.cos(phi) * radius, Math.sin(phi) * radius + target.y, Math.cos(theta) * Math.cos(phi) * radius)
    camera.lookAt(target)
    fairy.pose(directions[selected], boosted ? 1 : 0, time, Number(boosted ? boostInput.value : normalInput.value))
    renderer.render(scene, camera)
  }
  return { render, fairy, renderer }
}

const viewports = [createViewport('normal-view', false), createViewport('boost-view', true)]
function updateLabels() {
  const preset = directions[selected]
  get('normal-value').textContent = `${normalInput.value}°`
  get('boost-value').textContent = `${boostInput.value}°`
  get('elevation-value').textContent = `${elevation}°`
  get('choice-label').textContent = `${String.fromCharCode(65 + selected)} · ${preset.name} / ${normalInput.value}° → ${boostInput.value}°`
  get('save-status').textContent = 'Downloads your choice and camera settings as JSON.'
}

function selectDirection(index: number) {
  selected = index
  const preset = directions[index]
  normalInput.value = String(preset.normal)
  boostInput.value = String(preset.boost)
  get('direction-description').textContent = preset.description
  get('tradeoff').textContent = preset.tradeoff
  get('normal-note').textContent = preset.normalNote
  get('boost-note').textContent = preset.boostNote
  document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.direction) === selected)))
  updateLabels()
}
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.addEventListener('click', () => selectDirection(Number(button.dataset.direction))))
normalInput.addEventListener('input', updateLabels)
boostInput.addEventListener('input', updateLabels)
elevationInput.addEventListener('input', () => { elevation = Number(elevationInput.value); updateLabels() })
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  azimuth = Number(button.dataset.view)
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
  document.querySelectorAll('.view-caption').forEach(item => { item.textContent = `${button.textContent!.toUpperCase()} CAMERA` })
  viewports.forEach((viewport, i) => viewport.renderer.domElement.setAttribute('aria-label', `Animated fairy ${i ? 'boost' : 'normal'} pose, ${button.textContent} camera`))
}))
get<HTMLInputElement>('silhouette').addEventListener('change', (event) => {
  viewports.forEach(view => view.fairy.setSilhouette((event.target as HTMLInputElement).checked))
})
get<HTMLInputElement>('game-size').addEventListener('change', (event) => { gameplaySize = (event.target as HTMLInputElement).checked })
get<HTMLInputElement>('slow').addEventListener('change', (event) => { slowMotion = (event.target as HTMLInputElement).checked })
function updatePause() {
  get('play-toggle').textContent = paused ? 'Play motion' : 'Pause motion'
  get('play-toggle').setAttribute('aria-pressed', String(paused))
}
get('play-toggle').addEventListener('click', () => { paused = !paused; updatePause() })
document.querySelectorAll<HTMLButtonElement>('[data-background]').forEach(button => button.addEventListener('click', () => {
  background = button.dataset.background as typeof background
  document.querySelectorAll<HTMLElement>('.viewport').forEach(host => host.classList.toggle('light-background', background === 'sky'))
  document.querySelectorAll<HTMLButtonElement>('[data-background]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
}))
get('reset').addEventListener('click', () => selectDirection(selected))
get('save-choice').addEventListener('click', () => {
  const preset = directions[selected]
  const choice = {
    study: 'Fairy flight pose study', direction: preset.id, name: preset.name,
    normalLeanDegreesFromUpright: Number(normalInput.value), boostLeanDegreesFromUpright: Number(boostInput.value),
    cameraElevationDegrees: elevation, inspectionAzimuthDegrees: azimuth,
    normalWingCyclesPerSecond: preset.rate, boostWingCyclesPerSecond: preset.fastRate,
    note: 'Preview export only; downloading does not change the game. The game uses Sky Dancer at 32° / 66°.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(choice, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'fairy-flight-direction.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  get('save-status').textContent = 'Choice downloaded. You can also tell me the letter and your preferred angles.'
})

selectDirection(1)
updatePause()
function animate(now: number) {
  const delta = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  if (!paused && !document.hidden) time += delta * (slowMotion ? 0.2 : 1)
  viewports.forEach(view => view.render())
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
