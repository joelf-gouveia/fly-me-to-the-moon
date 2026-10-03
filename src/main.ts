import './style.css'

import * as THREE from 'three'
import { createWorlds, regenerateWorld, surfaceRadius, homeCottagePosition, meadowNormal } from './worlds'
import { createStarSky } from './stars'
import { createSkyLabels } from './sky-labels'
import { createAdventure, createGuideFireflies } from './adventure'
import { createHomeGuide, homeApproachPoint, homeMarkerPosition, journeyHeading } from './journey'
import { createRelocationClock, createRelocationGlow, findHomePosition, HOME_CARRY_MARGIN, relocateHome } from './relocation'
import { createPlanetaryOrbits } from './orbits'
import { createAsteroidBelt } from './asteroid-belt'
import { createComet } from './comet-sky'
import { createShootingStars, shootingStarDark } from './shooting-stars'
import { CANDY_MIST, flossTime } from './cotton-candy'
import { foliageWind, zoneNameAt } from './foliage/build'
import { fallAt, leanEarth, seasonAt, setSeason, yearOf, yearOfDate } from './seasons'
import { createSeasonAir } from './season-air'
import { createWeatherAir } from './weather-air'
import { MAGIC_STEP, magicAt, setMagic, stepMagicYear } from './magic-seasons'
import { touchesBelt } from './belt'
import { earthshineAt, MOON, moonlightAt } from './moon'
import { PROPORTIONS } from './proportions'
import { daylightAt, morningSpin, skyColor, skyProfile, solarElevation } from './daylight'
import { createSunShading } from './sun-shading'
import { LOW_SUN_DIM } from './sun-look'
import { updatePlanetLooks } from './planet-paint'
import { visitTransition } from './terrain'
import { hoverFlight, nearestWorldAt, orientFlight, stepFlight, worldCarry } from './flight'
import type { World } from './worlds'
import { createFairyRig, createSkyDancerAnimation } from './fairy'
import { designById } from './fairy-wings/designs'
import { drawWingIcon } from './fairy-wings/icon'
import {
  dressOptions,
  hairColorOptions,
  hairOptions,
  isLookValue,
  lookColors,
  lookOptions,
  parseFairyLook,
  skinOptions,
  wingColorOptions,
  wingOptions,
} from './customization'
import type { FairyLook, LookPart } from './customization'
import { createElement, Palette, Pause, Play, X } from 'lucide'
import { createFlightInput } from './flight-input'
import { createMobileQuality } from './mobile-quality'
import { createMobileUI } from './mobile-ui'
import { createStickerBook } from './sticker-book'
import { createSettings } from './settings'
import { createPostcardCamera } from './postcard-camera'
import { createSparkleRings, RING, RING_CHIME, ringGlowTexture } from './rings'
import { view, watchView } from './viewport'

function colorSwatches(part: LookPart, label: string, options: readonly { id: string; label: string; color: number }[]) {
  return `
    <div class="swatch-grid" role="group" aria-label="${label}">
      ${options.map(({ id, label, color }) => `
        <button type="button" class="swatch" data-custom="${part}" data-value="${id}" aria-pressed="false" aria-label="${label}" title="${label}" style="--swatch:#${color.toString(16).padStart(6, '0')}">
          <i aria-hidden="true"></i>
        </button>`).join('')}
    </div>`
}

function startGame() {
const app = document.querySelector<HTMLDivElement>('#app')!
const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches
const mobileQuality = createMobileQuality()

app.innerHTML = `
  <main class="game-shell">
    <div id="scene" aria-label="A fairy flying from living landscapes into the solar system"></div>

    <header class="brand">
      <div class="brand-mark"><i></i><i></i><i></i></div>
      <div>
        <p class="eyebrow">A SMALL JOURNEY</p>
        <h1>Fly me to the moon</h1>
      </div>
    </header>

    <aside class="destination" aria-live="polite">
      <div class="destination-orbit"><span id="planet-dot"></span></div>
      <div>
        <p class="eyebrow">NEAREST WORLD</p>
        <h2 id="planet-name">Earth</h2>
        <p id="planet-distance">Over the meadows</p>
        <p id="flight-region">Below the clouds</p>
      </div>
    </aside>

    <section class="flight-panel">
      <div class="speed-row">
        <span class="speed-icon">✦</span>
        <div>
          <p class="eyebrow">GLIDE SPEED</p>
          <strong><span id="speed-value">12</span> <small>m/s</small></strong>
        </div>
      </div>
    </section>

    <div class="toolbar">
      <button id="customize-toggle" class="icon-button" type="button" aria-label="Customize your fairy" aria-expanded="false" aria-controls="customizer">
        <i data-icon="customize"></i>
      </button>
      <button id="pause-toggle" class="icon-button" type="button" aria-label="Pause flight">
        <i data-icon="pause"></i>
      </button>
    </div>

    <section id="customizer" class="customizer" aria-labelledby="customizer-title" aria-hidden="true">
      <div class="customizer-heading">
        <div>
          <p class="eyebrow">YOUR FAIRY</p>
          <h2 id="customizer-title">Make her yours</h2>
        </div>
        <button id="customizer-close" class="customizer-close" type="button" aria-label="Close customization">
          <i data-icon="close"></i>
        </button>
      </div>
      <fieldset class="customizer-group" data-custom-group="hair">
        <legend>Hair</legend>
        <div class="option-grid">
          ${hairOptions.map(({ id, label }) => `
            <button type="button" data-custom="hair" data-value="${id}" aria-pressed="false">
              <span class="hair-preview hair-preview--${id}" aria-hidden="true"><i></i><i></i></span>
              <span>${label}</span>
            </button>`).join('')}
        </div>
        ${colorSwatches('hairColor', 'Hair color', hairColorOptions)}
      </fieldset>
      <fieldset class="customizer-group" data-custom-group="dress">
        <legend>Dress</legend>
        ${colorSwatches('dress', 'Dress color', dressOptions)}
      </fieldset>
      <fieldset class="customizer-group" data-custom-group="wings">
        <legend>Wings</legend>
        <div class="option-grid">
          ${wingOptions.map(({ id, label }) => `
            <button type="button" data-custom="wings" data-value="${id}" aria-pressed="false">
              <canvas class="wing-preview" data-wing="${id}" width="88" height="68" aria-hidden="true"></canvas>
              <span>${label}</span>
            </button>`).join('')}
        </div>
        ${colorSwatches('wingColor', 'Wing color', wingColorOptions)}
      </fieldset>
      <fieldset class="customizer-group" data-custom-group="skin">
        <legend>Skin</legend>
        ${colorSwatches('skin', 'Skin tone', skinOptions)}
      </fieldset>
      <p class="customizer-note">Changes are saved automatically</p>
    </section>

    <section id="welcome" class="welcome-card">
      <div class="welcome-sparkle"><i></i><i></i><i></i></div>
      <p class="eyebrow">YOUR WINGS ARE READY</p>
      <h2>Drift beyond<br>the blue</h2>
      <p>Wander freely through rivers, clouds, and stars.<br>Or open Worlds and follow the flower home.</p>
      <button id="begin-button" type="button"><span>Begin your adventure</span><span>→</span></button>
      <button id="welcome-customize" class="welcome-customize" type="button"><span>Choose your look</span><span>✦</span></button>
      <small id="steering-hint">Use WASD or arrow keys to steer</small>
    </section>

    <div id="arrival-note" role="status"></div>
    <div id="pause-label" class="pause-label"><span>A moment of stillness</span><button id="resume-flight" type="button">▶ Keep flying</button></div>

    <nav class="touch-controls" aria-label="Flight controls">
      <button data-key="ArrowUp" aria-label="Fly up">↑</button>
      <button data-key="ArrowLeft" aria-label="Turn left">←</button>
      <button data-key="ArrowDown" aria-label="Fly down">↓</button>
      <button data-key="ArrowRight" aria-label="Turn right">→</button>
    </nav>
    <nav class="touch-actions" aria-label="Flight actions">
      <button type="button" data-key="ShiftLeft" aria-label="Hold to boost"><span aria-hidden="true">✦</span><span>Boost</span></button>
      <button type="button" id="hover-toggle" aria-pressed="false"><span aria-hidden="true">◉</span><span id="hover-label">Hover</span></button>
    </nav>

    <div class="vignette"></div>
  </main>
`

function mountIcon(target: Element | null, icon: typeof Pause) {
  if (!target) return
  target.replaceChildren(createElement(icon, { width: 18, height: 18, 'stroke-width': 1.6 }))
}

mountIcon(document.querySelector('[data-icon="pause"]'), Pause)
mountIcon(document.querySelector('[data-icon="customize"]'), Palette)
mountIcon(document.querySelector('[data-icon="close"]'), X)

const sceneHost = document.querySelector<HTMLDivElement>('#scene')!
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x02030f)

const camera = new THREE.PerspectiveCamera(58, view.width / view.height, 0.08, 80000)
let renderer: THREE.WebGLRenderer
try {
  renderer = new THREE.WebGLRenderer({ antialias: !touchDevice, powerPreference: 'high-performance' })
} catch {
  app.innerHTML = '<main class="graphics-message"><h1>Your wings need a little help</h1><p>This game needs WebGL 2 graphics. Try updating your browser and restarting it, or open the game on another device.</p><button type="button" id="retry-graphics">Try again</button></main>'
  document.getElementById('retry-graphics')!.onclick = () => location.reload()
  return
}
function renderRatio() { return touchDevice ? mobileQuality.ratio(view.width, view.height, devicePixelRatio) : Math.min(devicePixelRatio, 1.8) }
renderer.setPixelRatio(renderRatio())
renderer.setSize(view.width, view.height)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.domElement.tabIndex = 0
sceneHost.appendChild(renderer.domElement)

const ambient = new THREE.HemisphereLight(0xd9efff, 0x65794e, 2.1)
scene.add(ambient)
// The Sun lights every world from its real direction, so each planet has a day
// side and a night side. Decay 0 keeps the compressed solar system evenly bright.
const sunlight = new THREE.PointLight(0xffebcc, 2.4, 0, 0)
// A soft, cool fill keeps night landscapes readable. On Earth it is moonlight.
const nightFill = new THREE.DirectionalLight(0xc0b6f5, 0)
scene.add(nightFill, nightFill.target)
const fog = new THREE.FogExp2(0x83c5e8, 0)
scene.fog = fog
const spaceColor = new THREE.Color(0x02030f)
const sunColor = new THREE.Color(0xffebcc), lowSunColor = new THREE.Color(0xffa267), sunTint = new THREE.Color()
const dayAmbientSky = new THREE.Color(0xd9efff), nightAmbientSky = new THREE.Color(0xa8bced)
const dayAmbientGround = new THREE.Color(0x65794e), nightAmbientGround = new THREE.Color(0x3c3a5a)
const cloudWhite = new THREE.Color(0xf0f3ed), skyTint = new THREE.Color(), mistTint = new THREE.Color()
// The cotton candy clouds of Blossom Haven have a candy-pink mist.
const candyMist = new THREE.Color(CANDY_MIST)
const fillOffset = new THREE.Vector3(120, 0, -90), fillDirection = new THREE.Vector3()
const fillColor = new THREE.Color(0xc0b6f5), moonlightColor = new THREE.Color(0xdfe4f7)

function makeSoftDiscTexture(color: string, size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.18, color)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const stars = createStarSky(scene)
const skyLabels = createSkyLabels(document.querySelector<HTMLElement>('.game-shell')!, stars)

// The renderer paints the maps of the seven planets (src/planet-paint.ts).
const worlds = createWorlds(scene, touchDevice, renderer)
const orbits = createPlanetaryOrbits(scene, worlds)
const belt = createAsteroidBelt(scene, touchDevice)
// F8: a comet on a long orbit, and shooting stars in a dark sky inside the air.
const comet = createComet(scene, touchDevice)
const shootingStars = createShootingStars(scene)
// Gentle, deliberately storybook-speed axial turns (seconds per full rotation).
// The Moon has no period: src/orbits.ts keeps its near side toward Earth.
const axialSpinPeriods: Record<Exclude<World['kind'], 'sun' | 'moon'>, number> = {
  mercury: 250, venus: 300, earth: 240, mars: 260, ceres: 180, vesta: 150,
  jupiter: 180, saturn: 200, uranus: 220, neptune: 240, fairy: 300,
}
const earth = worlds.find((world) => world.kind === 'earth')!
const moon = worlds.find((world) => world.kind === 'moon')!
const home = worlds.find((world) => world.kind === 'fairy')!
const sun = worlds.find((world) => world.kind === 'sun')!
// The Sun has its own glare and corona (src/sun-paint.ts), so it needs no glow sprite.
sun.group.add(sunlight)
// The Sun shaders take about 0.5 s to compile. Compile them in the background now, so the first view of
// the Sun does not stall a frame. A failure here only means that the first frame compiles them.
renderer.compileAsync(sun.group, camera, scene).catch(() => {})
const sunShading = createSunShading(sun.group.position)
const skyProfiles = new Map(worlds.map(world => [world, skyProfile(world)]))
const fullDay = daylightAt(90)
let daylight = fullDay
const cottageWindow = (home.surface.getObjectByName('cottage-window') as THREE.Mesh).material as THREE.MeshStandardMaterial
// Sparkle rings over the meadows of Earth, Blossom Haven and the Moon (src/rings.ts).
const sparkleRings = createSparkleRings(worlds, { mobile: touchDevice, sparkle: makeSoftDiscTexture('rgba(255,255,255,1)'), glow: ringGlowTexture() })
// The longer, brighter trail after a ring ends at this time of active flight.
let sparkleUntil = -Infinity

function loadFairyLook(): FairyLook {
  try {
    return parseFairyLook(JSON.parse(localStorage.getItem('fairy-look') ?? 'null'))
  } catch {
    // Storage may be unavailable; the default look still works.
    return parseFairyLook(null)
  }
}

let fairyLook = loadFairyLook()

const fairyRig = createFairyRig({ withTrail: false })
const fairy = fairyRig.root
const fairyAnimation = createSkyDancerAnimation(fairyRig)
// Keep a little light in space, but no bright halo across the back and wings.
const fairyLight = new THREE.PointLight(0xffca8c, 0.6, 7, 2)
fairyLight.position.set(0, 1.5, 0.8)
fairy.add(fairyLight)

// Start over a temperate meadow in mid-morning light, with the camera looking
// along the horizon. Earth's spin then carries the meadow through the day.
const meadow = meadowNormal(earth)
// Earth leans 23.4°, and its year starts at the real date: in October the north is in autumn
// (docs/seasons-study.md). A browser check can give the year: ?test&year=0.875 is the coldest look of the north.
const testYear = import.meta.env.DEV ? new URLSearchParams(location.search).get('year') : null
leanEarth(earth, sun.group.position, testYear === null ? yearOfDate(new Date()) : Number(testYear))
const seasonAir = createSeasonAir(earth, touchDevice ? 260 : 520)
// The weather of Earth (docs/weather-study.md): the rain, the mist and the rainbow near the fairy.
// A browser check can give the whole planet one weather: ?test&weather=rain. This works on the dev server only.
const weatherAir = createWeatherAir(scene, earth, sun.group.position, touchDevice)
const SUN_LIGHT = sunlight.intensity
const TEST_WEATHER = {
  clear: { cover: 0, rain: 0, storm: 0, mist: 0 }, rain: { cover: 1, rain: 0.9, storm: 0, mist: 0 },
  storm: { cover: 1, rain: 1, storm: 1, mist: 0 }, mist: { cover: 0.1, rain: 0, storm: 0, mist: 1 },
} as const
const testWeather = import.meta.env.DEV ? TEST_WEATHER[new URLSearchParams(location.search).get('weather') as keyof typeof TEST_WEATHER] ?? null : null
let weatherClock = 0
// The magic seasons of Blossom Haven (src/magic-seasons.ts). A visit starts in Blossom time, and each
// hop of the planet brings the next season. A browser check can give the year: ?test&magic=0.5 is Lantern time.
const testMagic = import.meta.env.DEV ? new URLSearchParams(location.search).get('magic') : null
let magicTarget = testMagic === null ? 0 : Number(testMagic), magicYear = magicTarget
const magicAir = createSeasonAir(home, touchDevice ? 260 : 520)
earth.group.rotation.y = morningSpin(meadow, earth.group.position, sun.group.position, 25, earth.tilt!.lean)
earth.group.updateMatrixWorld()
const earthOutward = meadow.clone().applyQuaternion(earth.group.quaternion)
fairy.position.copy(earth.group.position).addScaledVector(earthOutward, surfaceRadius(earth, earthOutward) + 7)
// The heading is in the frame of Earth, as the first ring line of src/rings.ts: Earth leans, so its north is not the world Y axis.
const initialForward = new THREE.Vector3().crossVectors(meadow, new THREE.Vector3(0, 1, 0)).normalize().applyQuaternion(earth.group.quaternion)
orientFlight(fairy.quaternion, initialForward, earthOutward)
scene.add(fairy)

// The trail shows its newest 72 points. After a sparkle ring it shows all 144: a trail twice as long.
const trailCount = 72
const trailCapacity = trailCount * 2
const trailPositions = new Float32Array(trailCapacity * 3)
const trailColors = new Float32Array(trailCapacity * 3)
const trailColor = new THREE.Color()
for (let i = 0; i < trailCapacity; i += 1) {
  trailPositions[i * 3] = fairy.position.x
  trailPositions[i * 3 + 1] = fairy.position.y
  trailPositions[i * 3 + 2] = fairy.position.z
  trailColor.setHSL(0.1 + i / trailCapacity * 0.09, 0.75, 0.72)
  trailColors.set([trailColor.r, trailColor.g, trailColor.b], i * 3)
}
const trailGeometry = new THREE.BufferGeometry()
trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
const trailMaterial = new THREE.PointsMaterial({
  size: 0.2,
  map: makeSoftDiscTexture('rgba(255,255,255,1)'),
  vertexColors: true,
  transparent: true,
  opacity: 0.78,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
const fairyTrail = new THREE.Points(trailGeometry, trailMaterial)
fairyTrail.frustumCulled = false
scene.add(fairyTrail)

// The wing buttons show each wing in the wing colour of the look. They paint again only when that colour changes.
let wingIconColor = ''
function drawWingIcons(look: FairyLook) {
  if (look.wingColor === wingIconColor) return
  wingIconColor = look.wingColor
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-wing]').forEach(canvas => drawWingIcon(canvas, designById(canvas.dataset.wing!)!, look))
}

function applyFairyLook(look: FairyLook, persist = true) {
  fairyLook = { ...look }
  fairyRig.applyLook(look)
  drawWingIcons(look)
  const { sparkle } = lookColors(look)
  fairyLight.color.setHex(sparkle).lerp(new THREE.Color(0xffffff), 0.35)
  for (let i = 0; i < trailCapacity; i++) {
    trailColor.setHex(sparkle).offsetHSL(0, 0, (i / trailCapacity - 0.5) * 0.12)
    trailColors.set([trailColor.r, trailColor.g, trailColor.b], i * 3)
  }
  trailGeometry.attributes.color.needsUpdate = true

  document.querySelectorAll<HTMLButtonElement>('[data-custom]').forEach((button) => {
    const selected = look[button.dataset.custom as keyof FairyLook] === button.dataset.value
    button.setAttribute('aria-pressed', String(selected))
  })

  if (persist) {
    try {
      localStorage.setItem('fairy-look', JSON.stringify(fairyLook))
    } catch {
      // The selected look remains active for this visit.
      document.querySelector('.customizer-note')!.textContent = 'Look applied for this visit'
    }
  }
}

applyFairyLook(fairyLook, false)

const customizer = document.querySelector<HTMLElement>('#customizer')!
const customizeButton = document.querySelector<HTMLButtonElement>('#customize-toggle')!
const closeCustomizerButton = document.querySelector<HTMLButtonElement>('#customizer-close')!
let customizing = false
let customizerOpener: HTMLElement = customizeButton

function setCustomizerOpen(open: boolean) {
  if (open && !customizing && document.activeElement instanceof HTMLElement) customizerOpener = document.activeElement
  customizing = open
  clearInput()
  document.querySelector('.game-shell')!.classList.toggle('is-customizing', open)
  customizer.classList.toggle('is-open', open)
  customizer.setAttribute('aria-hidden', String(!open))
  customizeButton.setAttribute('aria-expanded', String(open))
  customizeButton.classList.toggle('is-active', open)
  if (open) closeCustomizerButton.focus()
  else customizerOpener.focus()
}

customizeButton.addEventListener('click', () => setCustomizerOpen(!customizer.classList.contains('is-open')))
closeCustomizerButton.addEventListener('click', () => setCustomizerOpen(false))
document.querySelector<HTMLButtonElement>('#welcome-customize')!.addEventListener('click', () => setCustomizerOpen(true))

document.querySelectorAll<HTMLButtonElement>('[data-custom]').forEach((button) => {
  button.addEventListener('click', () => {
    const part = button.dataset.custom as LookPart
    const value = button.dataset.value
    if (Object.hasOwn(lookOptions, part) && isLookValue(part, value)) applyFairyLook({ ...fairyLook, [part]: value })
  })
})

const keys = createFlightInput()
function clearInput() {
  keys.clear(); boosted = false
  document.querySelectorAll('[data-key].is-held').forEach(button => button.classList.remove('is-held'))
}
let started = false
let paused = false
let hoverHeld = false
let boosted = false
// World speed of Settings: 1×, 8×, 16×, 32× or 64×. It starts at 1× at each visit.
let orbitSpeedFactor = 1
let soundOn = false
let audioContext: AudioContext | null = null
let audioGain: GainNode | null = null
let trailCursor = 0
let nearestWorld = earth
let nearestDistance = 0
const flight = { position: fairy.position, quaternion: fairy.quaternion, speed: 11 }
let destination: World | null = null
let arrivalUntil = 0
let mapOpen = false
let settingsOpen = false
let postcardOpen = false
let menuOpen = false
let contextLost = false
let homeFound = false
try { homeFound = localStorage.getItem('fairy-home-found') === 'true' } catch { /* Session-only discovery still works. */ }
const homeGuide = createHomeGuide()
const homeClock = createRelocationClock()
const teleportGlow = createRelocationGlow(scene, makeSoftDiscTexture('rgba(255,255,255,1)'))
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
let homeSuspended = false
const guideTarget = homeApproachPoint(home)
const updateFireflies = createGuideFireflies(scene, makeSoftDiscTexture('rgba(255,255,255,1)'))
function travelTo(world: World) {
  // The book opens the worlds one next door at a time (canFly() in src/stickers.ts).
  if (!stickerBook.canFly(world.kind)) return
  if (world === home) { followHome(); return }
  stopHome()
  destination = world
  if (!started) document.querySelector<HTMLButtonElement>('#begin-button')!.click()
  renderer.domElement.focus()
}
// One sticker for each world, the first time the fairy arrives. The stickers are in Worlds.
const stickerBook = createStickerBook(worlds, {
  chime: milestone => playChime(milestone ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 783.99]),
})
// Worlds: the map and the book of stickers. Flight waits while it is open.
const adventure = createAdventure(worlds, stickerBook, {
  home: followHome,
  stop: stopHome,
  travel: travelTo,
  map: open => { mapOpen = open; clearInput(); document.querySelector('.game-shell')!.classList.toggle('is-map-open', open) },
})
// Settings for grown-ups, beside the fairy button. Flight waits while it is open.
const settings = createSettings({
  open: open => { settingsOpen = open; clearInput(); document.querySelector('.game-shell')!.classList.toggle('is-settings-open', open) },
  stickers: stickerBook,
  sound: setSound,
  stars: show => stars.setConstellations(show),
  // The switch shows the paths in the sky only. The Worlds map always shows them.
  orbits: show => { orbits.paths.visible = show },
  speed: factor => { orbitSpeedFactor = factor },
})
// The postcard camera, beside the fairy button. Flight waits while the postcard is open.
const postcard = createPostcardCamera({
  open: open => { postcardOpen = open; clearInput(); document.querySelector('.game-shell')!.classList.toggle('is-postcard-open', open) },
  // The renderer clears its picture after each frame, so render a new frame for the camera to read at once.
  capture: () => { renderer.render(scene, camera); return renderer.domElement },
  world: () => nearestWorld,
  shutter: () => playChime([1318.51, 1975.53]),
})

function followHome() {
  if (!started) startFlight()
  if (customizing) setCustomizerOpen(false)
  homeGuide.start()
  destination = home
  homeSuspended = false
  renderer.domElement.focus()
}
function stopHome() {
  homeGuide.stop()
  if (destination === home) destination = null
  homeSuspended = false
}
function moveHome() {
  const carrying = !hoverHeld && fairy.position.distanceTo(home.group.position) <= home.radius + home.atmosphere + HOME_CARRY_MARGIN
  const next = findHomePosition(home, worlds, fairy.position, carrying)
  if (!next) return false
  const previous = home.group.position.clone()
  const result = relocateHome(home, next, fairy.position)
  if (result.carrying) {
    // Translate every world-space follower together: no stretched trail or camera sweep.
    camera.position.add(result.offset)
    cameraLook.add(result.offset)
    previousFlightPosition.add(result.offset)
    for (let i = 0; i < trailCapacity; i++) {
      trailPositions[i * 3] += result.offset.x
      trailPositions[i * 3 + 1] += result.offset.y
      trailPositions[i * 3 + 2] += result.offset.z
    }
    trailGeometry.attributes.position.needsUpdate = true
  }
  guideTarget.copy(homeApproachPoint(home))
  orbits.rebase(home)
  home.group.updateMatrixWorld(true)
  teleportGlow.begin(previous, next, home.radius)
  adventure.notifyMove(result.carrying)
  // The hop brings the next magic season. The look follows in about 20 s.
  magicTarget += MAGIC_STEP
  return true
}
function discoverHome() {
  if (homeFound) return
  homeFound = true
  adventure.celebrate()
  try { localStorage.setItem('fairy-home-found', 'true') } catch { /* Keep discovery for this visit. */ }
  playChime([523.25, 659.25, 783.99])
}
/** A soft two-note chime for a creature hello. Hellos close together share one chime. */
let lastHelloChime = -Infinity
function playHelloChime() {
  if (elapsed - lastHelloChime < 1) return
  lastHelloChime = elapsed
  playChime([1046.5, 1318.51], 0.03, 0.14)
}
/** A soft rising chime when the sound is on: the home discovery and each new sticker. */
function playChime(notes: number[], volume = 0.055, gap = 0.2) {
  if (!soundOn || !audioContext || !audioGain) return
  const now = audioContext.currentTime
  for (const [index, frequency] of notes.entries()) {
    const tone = audioContext.createOscillator(), gain = audioContext.createGain()
    tone.frequency.value = frequency
    gain.gain.setValueAtTime(0, now + index * gap)
    gain.gain.linearRampToValueAtTime(volume, now + index * gap + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * gap + 1.1)
    tone.connect(gain).connect(audioGain)
    tone.start(now + index * gap); tone.stop(now + index * gap + 1.2)
    tone.onended = () => { tone.disconnect(); gain.disconnect() }
  }
}

function setKey(code: string, down: boolean) {
  keys.setKey(code, down)
}

function toggleHover() {
  if (!started || paused || customizing || mapOpen || settingsOpen || postcardOpen || menuOpen) return
  hoverHeld = !hoverHeld
  clearInput()
  document.getElementById('hover-toggle')!.setAttribute('aria-pressed', String(hoverHeld))
  document.getElementById('hover-label')!.textContent = hoverHeld ? 'Fly' : 'Hover'
}
document.getElementById('hover-toggle')!.addEventListener('click', toggleHover)

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && customizer.classList.contains('is-open') && !postcardOpen) {
    setCustomizerOpen(false)
    return
  }
  if (customizing || mapOpen || settingsOpen || postcardOpen || menuOpen || event.target instanceof HTMLSelectElement) return
  if (!started || (paused && event.code !== 'Space')) return
  if (event.target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(event.code)) return
  // Q toggles hover. Ctrl did before, but Ctrl+W closes the tab and Ctrl+D or Ctrl+S opens a browser dialog.
  if (event.code === 'KeyQ' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) toggleHover()
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault()
  setKey(event.code, true)
  if (event.code === 'Space' && !event.repeat && !(event.target instanceof HTMLButtonElement)) togglePause()
})
window.addEventListener('keyup', (event) => {
  setKey(event.code, false)
})
window.addEventListener('blur', () => { clearInput(); if (started) setPaused(true) })

document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
  const code = button.dataset.key!
  const release = (event: PointerEvent) => { keys.release(event.pointerId); button.classList.toggle('is-held', keys.has(code)) }
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    if (!started || paused || customizing || mapOpen || settingsOpen || postcardOpen || menuOpen || contextLost) return
    button.setPointerCapture(event.pointerId)
    keys.press(event.pointerId, code)
    button.classList.add('is-held')
  })
  button.addEventListener('pointermove', event => {
    const rect = button.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) release(event)
  })
  button.addEventListener('pointerup', release)
  button.addEventListener('pointercancel', release)
  button.addEventListener('lostpointercapture', release)
  button.addEventListener('contextmenu', event => event.preventDefault())
})

const welcome = document.querySelector<HTMLElement>('#welcome')!
function startFlight() {
  started = true
  document.querySelector('.game-shell')!.classList.add('has-started')
  welcome.classList.add('is-hidden')
  renderer.domElement.focus()
}
document.querySelector<HTMLButtonElement>('#begin-button')!.addEventListener('click', startFlight)

const pauseButton = document.querySelector<HTMLButtonElement>('#pause-toggle')!
const pauseLabel = document.querySelector<HTMLElement>('#pause-label')!
function togglePause() {
  if (!started) return
  setPaused(!paused)
}
function setPaused(value: boolean) {
  if (!value && (document.hidden || contextLost)) return
  paused = value
  clearInput()
  document.querySelector('.game-shell')!.classList.toggle('is-paused', paused)
  pauseLabel.classList.toggle('is-visible', paused)
  pauseButton.classList.toggle('is-active', paused)
  pauseButton.ariaLabel = paused ? 'Resume flight' : 'Pause flight'
  mountIcon(pauseButton.querySelector('i'), paused ? Play : Pause)
  if (audioContext && audioGain) {
    audioGain.gain.cancelScheduledValues(audioContext.currentTime)
    audioGain.gain.setTargetAtTime(soundOn && !paused && !document.hidden ? 0.62 : 0, audioContext.currentTime, 0.05)
    if (!paused && soundOn) void audioContext.resume().catch(() => settings.soundNote('The sound stopped. Turn the switch off and on again.'))
  }
}
pauseButton.addEventListener('click', togglePause)
document.getElementById('resume-flight')!.addEventListener('click', () => setPaused(false))
document.addEventListener('visibilitychange', () => {
  clearInput()
  if (document.hidden) {
    if (started) setPaused(true)
    if (audioContext) void audioContext.suspend().catch(() => {})
  }
})

function createAmbience() {
  audioContext = new AudioContext()
  audioGain = audioContext.createGain()
  audioGain.gain.value = 0
  audioGain.connect(audioContext.destination)
  ;[110, 164.81, 220].forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    oscillator.type = index === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    gain.gain.value = 0.018 / (index + 1)
    oscillator.connect(gain).connect(audioGain!)
    oscillator.start()
  })
}

/** The Sound switch of Settings. The switch is a tap, so the browser lets the sound start. */
async function setSound(on: boolean) {
  try {
    if (!audioContext) createAmbience()
    await audioContext!.resume()
    soundOn = on
    audioGain!.gain.cancelScheduledValues(audioContext!.currentTime)
    audioGain!.gain.linearRampToValueAtTime(soundOn && !paused && !document.hidden ? 0.62 : 0, audioContext!.currentTime + 0.45)
  } catch {
    soundOn = false
    settings.soundNote('The browser does not allow sound now. Try the switch again.')
  }
  return soundOn
}

createMobileUI(open => { menuOpen = open }, clearInput)
const graphicsMessage = document.createElement('div')
graphicsMessage.className = 'graphics-message'; graphicsMessage.hidden = true
graphicsMessage.innerHTML = '<h2>Your flight is safe</h2><p>Waiting for the graphics to come back. If this takes a while, try reloading.</p><button type="button">Reload game</button>'
graphicsMessage.querySelector('button')!.onclick = () => location.reload()
app.append(graphicsMessage)
renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault(); contextLost = true; clearInput()
  if (started) setPaused(true)
  graphicsMessage.hidden = false
})
renderer.domElement.addEventListener('webglcontextrestored', () => { contextLost = false; graphicsMessage.hidden = true })

const planetName = document.querySelector<HTMLElement>('#planet-name')!
const planetDistance = document.querySelector<HTMLElement>('#planet-distance')!
const planetDot = document.querySelector<HTMLElement>('#planet-dot')!
const speedValue = document.querySelector<HTMLElement>('#speed-value')!

const regionLabel = document.querySelector<HTMLElement>('#flight-region')!
const arrivalNote = document.querySelector<HTMLElement>('#arrival-note')!

function updateNearestWorld() {
  nearestWorld = nearestWorldAt(fairy.position, worlds)
  const world = nearestWorld
  const normal = fairy.position.clone().sub(world.group.position).normalize()
  nearestDistance = fairy.position.distanceTo(world.group.position) - world.radius
  const clearance = fairy.position.distanceTo(world.group.position) - surfaceRadius(world, normal)
  planetName.textContent = world.name
  const worldColor = `#${new THREE.Color(world.color).getHexString()}`
  planetDot.style.backgroundColor = worldColor
  planetDot.style.boxShadow = `0 0 15px ${worldColor}`
  const near = nearestDistance < Math.max(85, world.atmosphere * 1.5)
  // The flight panel's "near" test earns the sticker (arrivalDistance() in src/stickers.ts).
  if (started) stickerBook.arrive(world, near)
  planetDistance.textContent = near
    ? `${Math.round(Math.max(0, clearance))} m above ${world.gas ? 'deep clouds' : 'surface'}`
    : `${(nearestDistance / 1000).toFixed(1)} km away`
  regionLabel.textContent = comet.inTail ? 'Comet tail'
    : !near ? touchesBelt(fairy.position) ? 'Asteroid belt' : 'Open space'
    : world.kind === 'mercury' ? 'Airless rocky landscape'
    : world.kind === 'ceres' ? 'Dwarf planet · bright salt spots'
    : world.kind === 'vesta' ? 'Airless · giant south-pole crater'
    : world.kind === 'moon' ? 'Airless · grey dust and dark seas'
    : world.kind === 'sun' ? 'In the sunlight'
    : nearestDistance > world.atmosphere ? 'Edge of space'
    : world.cloudHeight && nearestDistance > world.cloudHeight + 12 ? 'Above the clouds'
    : world.cloudHeight && Math.abs(nearestDistance - world.cloudHeight - 4) < 9 ? 'Through the clouds'
    // The climate belt of Earth or the garden of Blossom Haven below the fairy (src/foliage/zones.ts).
    // The magic season and the garden below the fairy.
    : world.kind === 'fairy' ? `${magicAt(homeHeight(), magicYear).season.name} · ${zoneNameAt(world, fairy.position) ?? 'Candy gardens'}`
    : world.kind === 'earth' ? zoneNameAt(world, fairy.position) ?? 'Below the clouds'
    : world.kind === 'mars' ? 'Thin, dusty air'
    : world.kind === 'venus' ? 'Dense golden haze' : 'Drifting through cloud bands'

  for (const candidate of worlds) {
    // Blossom Haven and the Moon keep one landscape.
    if (candidate.kind === 'sun' || candidate.kind === 'fairy' || candidate.kind === 'moon') continue
    const altitude = fairy.position.distanceTo(candidate.group.position) - candidate.radius
    const transition = visitTransition(candidate.armed, altitude, candidate.atmosphere)
    candidate.armed = transition.armed
    if (transition.regenerate) {
      regenerateWorld(candidate)
      // A new landscape needs a new safe line of rings.
      sparkleRings.rebuild(candidate)
      arrivalNote.textContent = `A new ${candidate.name} to explore`
      arrivalUntil = performance.now() + 4000
    }
  }
  arrivalNote.classList.toggle('is-visible', performance.now() < arrivalUntil)
  if (started && world === home && nearestDistance < 60) discoverHome()
}

const timer = new THREE.Timer()
timer.connect(document)
const forward = new THREE.Vector3()
const cameraGoal = new THREE.Vector3()
const lookGoal = new THREE.Vector3()
const cameraLook = fairy.position.clone()
const cameraUpGoal = new THREE.Vector3()
const cameraOffset = new THREE.Vector3()
const previousFlightPosition = fairy.position.clone()
const cameraTranslation = new THREE.Vector3()
const steeringMatrix = new THREE.Matrix4()
const steeringRotation = new THREE.Quaternion()
const planetLocalOffset = new THREE.Vector3()
const carryFrom = new THREE.Vector3(), carryShift = new THREE.Vector3()
const planetLocalOrientation = new THREE.Quaternion()
const inversePlanetOrientation = new THREE.Quaternion()
let elapsed = 0
let trailShown = trailCount
/** 1 for the 4 s after a sparkle ring, then 0. The last 0.75 s go down smoothly. */
function sparkleLevel() { return THREE.MathUtils.clamp((sparkleUntil - elapsed) / 0.75, 0, 1) }

/** Hide the points older than the length of the trail now: far away, out of the view. */
function trimTrail() {
  trailShown = Math.round(THREE.MathUtils.lerp(trailCount, trailCapacity, sparkleLevel()))
  for (let age = trailShown; age < trailCapacity; age++) {
    const index = ((trailCursor - 1 - age) % trailCapacity + trailCapacity) % trailCapacity
    trailPositions[index * 3] = trailPositions[index * 3 + 1] = trailPositions[index * 3 + 2] = 1e6
  }
  trailGeometry.attributes.position.needsUpdate = true
}

function updateFairy(delta: number) {
  const yaw = Number(keys.has('KeyA') || keys.has('ArrowLeft')) - Number(keys.has('KeyD') || keys.has('ArrowRight'))
  const pitch = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
  if (hoverHeld) {
    // Steering turns the fairy in place so the player can look around.
    boosted = false
    hoverFlight(flight, nearestWorld, delta, { yaw, pitch })
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    speedValue.textContent = '0'
    fairyAnimation.update(delta, false)
    trimTrail()
    return
  }
  boosted = keys.has('ShiftLeft') || keys.has('ShiftRight')
  const guidingHome = homeGuide.update(delta, Boolean(yaw || pitch))
  homeSuspended = homeGuide.enabled && !guidingHome
  if (yaw || pitch) destination = null
  if (guidingHome) destination = home
  if (destination) {
    const target = destination === home ? guideTarget : destination.group.position
    const targetNormal = fairy.position.clone().sub(destination.group.position).normalize()
    const targetClearance = fairy.position.distanceTo(destination.group.position) - surfaceRadius(destination, targetNormal)
    const arrived = destination === home
      ? fairy.position.distanceTo(guideTarget) < 16 && targetClearance < 35
      : targetClearance < (destination.gas ? 40 : 12)
    if (arrived) {
      // The cottage is ahead as the guided journey becomes a gentle meadow cruise.
      const heading = destination === home
        ? homeCottagePosition(home).sub(fairy.position)
        : new THREE.Vector3().crossVectors(targetNormal, new THREE.Vector3(0, 1, 0))
      heading.addScaledVector(targetNormal, -heading.dot(targetNormal)).normalize()
      if (heading.lengthSq() < 0.01) heading.set(1, 0, 0)
      orientFlight(fairy.quaternion, heading, targetNormal)
      if (destination === home) { discoverHome(); homeGuide.stop() }
      destination = null
    } else {
      const heading = journeyHeading(fairy.position, target, nearestWorld, destination === nearestWorld)
      const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(fairy.quaternion)
      steeringMatrix.lookAt(new THREE.Vector3(), heading, cameraUp)
      steeringRotation.setFromRotationMatrix(steeringMatrix)
      fairy.quaternion.slerp(steeringRotation, 1 - Math.exp(-delta * 1.5))
    }
  }
  stepFlight(flight, nearestWorld, delta, { yaw, pitch: destination ? 0.00001 : pitch, boost: boosted })
  forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
  speedValue.textContent = String(Math.round(flight.speed))

  fairyAnimation.update(delta, boosted)
  for (let i = 0; i < (boosted ? 3 : 1); i++) {
    const index = trailCursor % trailCapacity
    trailPositions[index * 3] = fairy.position.x + (Math.random() - 0.5) * 0.34
    trailPositions[index * 3 + 1] = fairy.position.y + (Math.random() - 0.5) * 0.34
    trailPositions[index * 3 + 2] = fairy.position.z + (Math.random() - 0.5) * 0.34
    trailCursor++
  }
  trimTrail()
}

function updateCamera(delta: number) {
  // Follow translation immediately; smooth the view direction without letting
  // high space speeds leave the fairy far ahead of the camera.
  cameraTranslation.copy(fairy.position).sub(previousFlightPosition)
  camera.position.add(cameraTranslation)
  cameraLook.add(cameraTranslation)
  previousFlightPosition.copy(fairy.position)
  cameraOffset.set(0, 2.8, customizing ? (view.width > 720 ? 3.4 : 5.8) : 8).applyQuaternion(fairy.quaternion)
  cameraGoal.copy(fairy.position).add(cameraOffset)
  camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 6))
  // Hills can rise between the fairy and camera; never put the view underground.
  const normal = camera.position.clone().sub(nearestWorld.group.position).normalize()
  const safeRadius = surfaceRadius(nearestWorld, normal) + 1.5
  if (camera.position.distanceTo(nearestWorld.group.position) < safeRadius) {
    camera.position.copy(nearestWorld.group.position).addScaledVector(normal, safeRadius)
  }
  lookGoal.copy(fairy.position).addScaledVector(forward, customizing ? 0 : 12)
  cameraLook.lerp(lookGoal, 1 - Math.exp(-delta * 6))
  cameraUpGoal.set(0, 1, 0).applyQuaternion(fairy.quaternion)
  camera.up.lerp(cameraUpGoal, 1 - Math.exp(-delta * 3)).normalize()
  camera.lookAt(cameraLook)
  camera.fov = THREE.MathUtils.lerp(camera.fov, boosted ? 66 : 58, 1 - Math.exp(-delta * 2.5))
  if (customizing) {
    camera.setViewOffset(view.width, view.height, view.width > 720 ? view.width * 0.13 : 0,
      view.width > 720 ? 0 : view.height * 0.26, view.width, view.height)
  } else if (camera.view?.enabled) camera.clearViewOffset()
  camera.updateProjectionMatrix()
}

// Stars, the asteroid belt and the comet fade together inside an atmosphere and in daylight.
let skyVisibility = 1
// Shooting stars come only in a dark sky inside the air (src/shooting-stars.ts).
let meteorDark = 0
// The year of Earth, from 0 to 1 (src/seasons.ts), and the latitude of the fairy on Earth in degrees.
let earthYear = 0
const earthLocal = new THREE.Vector3(), earthTurn = new THREE.Quaternion()
/** The height of the fairy over Blossom Haven as a part of its radius: -1 at the cottage, 1 on the far side. */
function homeHeight() {
  return earthLocal.copy(fairy.position).sub(home.group.position).normalize().applyQuaternion(earthTurn.copy(home.group.quaternion).invert()).y
}
function earthLatitude() {
  earthLocal.copy(fairy.position).sub(earth.group.position).normalize().applyQuaternion(earthTurn.copy(earth.group.quaternion).invert())
  return THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(earthLocal.y, -1, 1)))
}
function updateEnvironment() {
  const world = nearestWorld
  const altitude = camera.position.distanceTo(world.group.position) - world.radius
  const density = world.atmosphere ? 1 - THREE.MathUtils.smoothstep(altitude, world.atmosphere * 0.25, world.atmosphere * 1.08) : 0
  const cloudMist = world.cloudHeight ? Math.exp(-Math.pow((altitude - world.cloudHeight - 4) / 6, 2)) * density : 0
  // Air grows with the planets (src/proportions.ts); thinner fog keeps the same look.
  const fogBase = (world.kind === 'venus' ? 0.018 : world.gas ? 0.009 : world.kind === 'mars' ? 0.002 : 0.0018) / PROPORTIONS.size
  // The weather of Earth: a part of the weather map on each frame, and the weather at the camera.
  // It sets the sky colour of Earth before the sky of the frame.
  earthYear = yearOf(earth, sun.group.position)
  if (testWeather) earth.weather!.force(testWeather)
  const weather = weatherAir.update(elapsed, Math.max(0, elapsed - weatherClock), earthYear, camera.position, world === earth, reducedMotion.matches)
  weatherClock = elapsed
  // Solar elevation at the fairy. Spin, orbit, flight and relocation all change it,
  // so there is no separate day clock.
  const light = world.kind === 'sun' ? fullDay : daylightAt(solarElevation(fairy.position, world.group.position, sun.group.position))
  daylight = light
  fairyRig.wings.setDaylight(light.day)
  const profile = skyProfiles.get(world)!
  skyColor(profile, light, skyTint)
  mistTint.copy(world.kind === 'fairy' ? candyMist : cloudWhite).lerp(skyTint, light.night)
  fog.color.copy(skyTint).lerp(mistTint, cloudMist * 0.65)
  fog.density = fogBase * density + cloudMist * (world.kind === 'mars' ? 0.004 : 0.023)
  ;(scene.background as THREE.Color).copy(spaceColor).lerp(skyTint, density * 0.78)
  // The stars show only where the sky is clear.
  skyVisibility = (1 - density * (1 - light.stars * profile.starClarity)) * (1 - weather.cover * 0.92)
  stars.update(camera.position, skyVisibility, renderer.getPixelRatio())
  meteorDark = shootingStarDark({
    air: world.atmosphere, altitude, night: light.stars, visibility: skyVisibility,
    clarity: profile.starClarity, reducedMotion: reducedMotion.matches,
  })
  sunlight.color.copy(sunColor).lerp(lowSunColor, light.twilight * density)
  // Through the air the Sun has the colour of its light there, and a low Sun is dimmer (docs/sun-study.md).
  // The corona and the prominences fade in the air, as in the real sky.
  sunTint.setRGB(sunlight.color.r / sunColor.r, sunlight.color.g / sunColor.g, sunlight.color.b / sunColor.b)
    .multiplyScalar(THREE.MathUtils.lerp(1, LOW_SUN_DIM, light.twilight * density))
  sun.sunLook!.update({ time: reducedMotion.matches ? 0 : elapsed, air: density, tint: sunTint, boost: 1 })
  // Sky light comes from the local up. A gentle night keeps the landscape readable.
  const normal = fairy.position.clone().sub(world.group.position).normalize()
  const surfaceDay = THREE.MathUtils.lerp(1, light.day, density)
  ambient.position.copy(normal)
  ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)
  ambient.color.copy(nightAmbientSky).lerp(dayAmbientSky, surfaceDay)
  ambient.groundColor.copy(nightAmbientGround).lerp(dayAmbientGround, surfaceDay)
  // Under a cloud the light is soft. Rain and mist make the view shorter. A rainbow stands opposite to a low Sun.
  weatherAir.apply(fog, scene.background as THREE.Color, ambient, sunlight, SUN_LIGHT, light, camera.position)
  // On Earth the night fill comes from the Moon and follows its phase. A night with
  // no Moon keeps 45% of it, so nights stay gentle.
  const moonlight = world === earth ? moonlightAt(fairy.position, normal, moon.group.position, sun.group.position) : null
  nightFill.intensity = 0.45 * light.night * density * (moonlight?.strength ?? 1)
  nightFill.target.position.copy(fairy.position)
  // The season of Earth comes from its place on its orbit. Petals, leaves or snow fall near the fairy.
  setSeason(earth.season!, earthYear)
  let falls = world === earth && altitude < 60 ? fallAt(earthLatitude(), earthYear) : { fall: null, amount: 0 }
  // Snow falls only under a snow cloud. Leaves and petals fall more in the wind, and less in the rain.
  const snowfall = weather.rain * weather.snow
  if (snowfall > 0.04) falls = { fall: 'snow', amount: Math.min(1, snowfall * 1.6) }
  else if (falls.fall === 'snow') falls = { fall: null, amount: 0 }
  else falls = { fall: falls.fall, amount: falls.amount * Math.min(1, 0.45 + weather.wind * 0.25) * (weather.rain > 0.3 ? 0.4 : 1) }
  seasonAir.update(reducedMotion.matches ? 0 : elapsed, timer.getDelta(), camera.position, falls.fall, falls.amount)
  // The magic season of Blossom Haven: the ground, the season plants, and the thing in the air near the fairy.
  setMagic(home.magic!, magicYear)
  const magic = magicAt(homeHeight(), magicYear)
  magicAir.update(reducedMotion.matches ? 0 : elapsed, timer.getDelta(), camera.position, world === home && altitude < 60 ? magic.season.air : null, Math.min(1, magic.full * 1.8))
  // The toadstools of Lantern time glow softly by day and fully at night.
  home.magic!.glow.value = Math.max(0.35, world === home ? light.night * 1.5 : 0)
  // The toadstools, the crystals and the flowers of Blossom Haven glow at night.
  if (home.foliage) home.foliage.glow.value = world === home ? light.night * 1.5 : 0
  fillDirection.copy(normal).multiplyScalar(300).add(fillOffset).normalize()
  if (moonlight) fillDirection.lerp(moonlight.direction, moonlight.above).normalize()
  nightFill.position.copy(fairy.position).addScaledVector(fillDirection, 300)
  nightFill.color.copy(fillColor).lerp(moonlightColor, moonlight?.above ?? 0)
  // Earthshine: a dark night side from far away, readable ground close by.
  moon.earthshine!.value = earthshineAt(camera.position.distanceTo(moon.group.position) - moon.radius)
  const cottage = homeCottagePosition(home)
  const cottageDay = daylightAt(solarElevation(cottage, home.group.position, sun.group.position)).day
  // The cottage is always home: its windows glow brighter after local sunset.
  cottageWindow.emissiveIntensity = THREE.MathUtils.lerp(1.7, 0.9, cottageDay)
  world.surface.visible = true
}

forward.copy(initialForward)
camera.up.copy(earthOutward)
camera.position.copy(fairy.position).add(new THREE.Vector3(0, 2.8, 8).applyQuaternion(fairy.quaternion))
cameraLook.copy(fairy.position).addScaledVector(forward, 12)
camera.lookAt(cameraLook)

let lastPaint = 0
function animate(timestamp?: number) {
  timer.update(timestamp)
  if (document.hidden || contextLost) { requestAnimationFrame(animate); return }
  const rawDelta = Math.min(timer.getDelta(), 0.05)
  const active = started && !paused && !customizing && !mapOpen && !settingsOpen && !postcardOpen && !menuOpen
  if (touchDevice && mobileQuality.sample(timer.getDelta(), active)) renderer.setPixelRatio(renderRatio())
  const paintTime = timestamp ?? performance.now()
  if (!active && !customizing && !mapOpen && paintTime - lastPaint < 100) { requestAnimationFrame(animate); return }
  lastPaint = paintTime
  const delta = active ? rawDelta : 0
  // Keep the orbit display gently moving behind the Worlds dialog.
  const orbitDelta = started && !paused && !customizing && !menuOpen ? rawDelta : 0
  elapsed += delta
  homeClock.update(delta, homeGuide.enabled || destination === home, moveHome)
  magicYear = stepMagicYear(magicYear, magicTarget, delta)
  // Remember the fairy in the nearest planet's local frame while she is in its
  // atmosphere, or near the airless Moon, which moves fast around Earth.
  // The frame moves with axial spin, the solar orbit and the Moon's orbit.
  const nearbyWorld = nearestWorldAt(fairy.position, worlds)
  let attachedToWorld: World | null = null
  if (nearbyWorld.kind !== 'sun') {
    const normal = fairy.position.clone().sub(nearbyWorld.group.position).normalize()
    const clearance = fairy.position.distanceTo(nearbyWorld.group.position) - surfaceRadius(nearbyWorld, normal)
    if (clearance <= (nearbyWorld.kind === 'moon' ? MOON.carry : Math.max(nearbyWorld.atmosphere, 6))) {
      attachedToWorld = nearbyWorld
      inversePlanetOrientation.copy(nearbyWorld.group.quaternion).invert()
      planetLocalOffset.copy(fairy.position).sub(nearbyWorld.group.position).applyQuaternion(inversePlanetOrientation)
      planetLocalOrientation.copy(inversePlanetOrientation).multiply(fairy.quaternion)
    }
  }
  // Higher up, the world still carries her along its orbit (not its spin), so she can catch a
  // world that moves faster than she flies near it (worldCarry() in src/flight.ts).
  const carry = attachedToWorld || nearbyWorld.kind === 'sun' ? 0 : worldCarry(fairy.position.distanceTo(nearbyWorld.group.position) - nearbyWorld.radius)
  if (carry > 0) carryFrom.copy(nearbyWorld.group.position)
  for (const world of worlds) {
    if (delta > 0 && world.kind !== 'sun' && world.kind !== 'moon') world.group.rotation.y = (world.group.rotation.y + delta * Math.PI * 2 / axialSpinPeriods[world.kind]) % (Math.PI * 2)
  }
  orbits.update(orbitDelta * orbitSpeedFactor)
  if (attachedToWorld) {
    fairy.position.copy(planetLocalOffset).applyQuaternion(attachedToWorld.group.quaternion).add(attachedToWorld.group.position)
    fairy.quaternion.copy(attachedToWorld.group.quaternion).multiply(planetLocalOrientation)
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
  } else if (carry > 0) fairy.position.addScaledVector(carryShift.copy(nearbyWorld.group.position).sub(carryFrom), carry)
  guideTarget.copy(homeApproachPoint(home))
  updateNearestWorld()
  if (delta > 0) updateFairy(delta)
  // A ring that the fairy flies through gives a burst, a chime and a longer, brighter trail.
  const ringsTaken = sparkleRings.update(delta, elapsed, fairy.position, nearestWorld, !reducedMotion.matches)
  if (ringsTaken.length) {
    playChime(RING_CHIME)
    sparkleUntil = elapsed + RING.trailSeconds
  }
  updateCamera(rawDelta)
  updateEnvironment()
  belt.update(orbits.elapsed, camera, fairy.position, reducedMotion.matches ? 0 : elapsed, renderer.domElement.height, skyVisibility)
  // The comet follows the orbit time, so World speed makes it faster. Reduced motion stills the tail.
  comet.update(orbits.elapsed, sun.group.position, camera, fairy.position, forward, reducedMotion.matches ? 0 : elapsed, delta,
    renderer.domElement.height, skyVisibility, reducedMotion.matches)
  if (comet.entered) playChime([783.99, 1174.66])
  shootingStars.update(elapsed, camera, nearestWorld.group.position, meteorDark)
  const homeHeading = journeyHeading(fairy.position, guideTarget, nearestWorld, nearestWorld === home)
  const homeMarker = homeMarkerPosition(home)
  adventure.update(camera, homeMarker, nearestWorld, delta, {
    started, following: homeGuide.enabled, suspended: homeSuspended, obscured: customizing || mapOpen || settingsOpen || postcardOpen,
  })
  updateFireflies(fairy.position, homeHeading, elapsed, homeGuide.enabled && !homeSuspended && !customizing && !mapOpen && !settingsOpen && !postcardOpen && !menuOpen)
  for (const world of worlds) {
    // The clouds of Earth read the weather map at their place, so they do not turn.
    if (!world.weather) world.clouds.rotation.y += delta * 0.001
    world.creatures?.update(delta, camera.position)
    // After update(): the hop and the turn go over the place on the route.
    if (world.creatures?.greet(delta, fairy.position)) playHelloChime()
    world.animate?.(reducedMotion.matches ? 0 : elapsed)
  }
  flossTime.value = reducedMotion.matches ? 0 : elapsed
  foliageWind.value.x = reducedMotion.matches ? 0 : elapsed
  // The strength of the wind in the plants comes from the weather of Earth. Away from Earth it is 1.
  foliageWind.value.y = weatherAir.here.wind
  teleportGlow.update(delta, reducedMotion.matches)
  const sparkle = sparkleLevel()
  trailMaterial.opacity = 0.56 + Math.sin(elapsed * 3) * 0.12 + sparkle * 0.22
  // A longer, brighter trail after a sparkle ring, and in a comet tail for 4 s after it.
  trailMaterial.size = 0.2 + Math.max(sparkle * 0.16, comet.glow * 0.18)
  // Space light, air rim, cloud puffs, the deck of Venus and Saturn's ring plane, from the camera.
  updatePlanetLooks(worlds, camera.position)
  sunShading.update(worlds)
  sunShading.track(scene)
  renderer.render(scene, camera)
  skyLabels.update(camera, view.width, view.height)
  requestAnimationFrame(animate)
}

animate()

/**
 * Test only: put the fairy `distance` m before ring `index` of a world, on its axis and facing along
 * it, at `speed` m/s. The real flight and the real ring test then take the ring.
 */
function aimRing(kind: string, index = 0, distance = 8, speed = 11) {
  const world = worlds.find(item => item.kind === kind)
  const ring = world ? sparkleRings.placements(world)[index] : undefined
  if (!world || !ring) return null
  stopHome()
  destination = null
  if (hoverHeld) toggleHover()
  const axis = ring.axis.clone().applyQuaternion(world.group.quaternion)
  fairy.position.copy(ring.position).addScaledVector(ring.axis, -distance).applyQuaternion(world.group.quaternion).add(world.group.position)
  const up = fairy.position.clone().sub(world.group.position).normalize()
  orientFlight(fairy.quaternion, axis, up)
  forward.copy(axis)
  flight.speed = speed
  camera.up.copy(up)
  camera.position.copy(fairy.position).add(new THREE.Vector3(0, 2.8, 8).applyQuaternion(fairy.quaternion))
  previousFlightPosition.copy(fairy.position)
  cameraLook.copy(fairy.position).addScaledVector(forward, 12)
  // A jump is not a flight: the next ring test starts here.
  sparkleRings.reset()
  return { world: world.name, index, centre: ring.position.clone().applyQuaternion(world.group.quaternion).add(world.group.position).toArray() }
}

// Diagnostics and test hooks (aimRing, place, spin) for repeatable browser tests; absent from production builds.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('test')) {
  // Test hooks: put the camera behind the fairy at once, as at the start.
  const snapCamera = () => {
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    camera.up.set(0, 1, 0).applyQuaternion(fairy.quaternion)
    camera.position.copy(fairy.position).add(new THREE.Vector3(0, 2.8, 8).applyQuaternion(fairy.quaternion))
    cameraLook.copy(fairy.position).addScaledVector(forward, 12)
    previousFlightPosition.copy(fairy.position)
    camera.lookAt(cameraLook)
  }
  Object.defineProperty(window, '__fairyTest', { value: {
  aimRing,
  /** A hop of Blossom Haven now, as the clock of src/relocation.ts makes each 5 minutes. */
  hop: () => moveHome(),
  /** Puts the fairy at `position`, heading to `target`, with no guide. */
  place: (position: number[], target: number[]) => {
    destination = null
    fairy.position.fromArray(position)
    const heading = new THREE.Vector3().fromArray(target).sub(fairy.position).normalize()
    const up = Math.abs(heading.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    orientFlight(fairy.quaternion, heading, up.addScaledVector(heading, -up.dot(heading)).normalize())
    snapCamera()
  },
  /** Turns the nearest world by `seconds` of its spin and carries the fairy with it: a later time of day. */
  spin: (seconds: number) => {
    const world = nearestWorld
    if (world.kind === 'sun' || world.kind === 'moon') return
    const inverse = world.group.quaternion.clone().invert()
    const offset = fairy.position.clone().sub(world.group.position).applyQuaternion(inverse)
    const turn = inverse.multiply(fairy.quaternion)
    world.group.rotation.y += seconds * Math.PI * 2 / axialSpinPeriods[world.kind]
    world.group.updateMatrixWorld()
    fairy.position.copy(offset).applyQuaternion(world.group.quaternion).add(world.group.position)
    fairy.quaternion.copy(world.group.quaternion).multiply(turn)
    snapCamera()
  },
  snapshot: () => ({
    home: home.group.position.toArray(), radius: home.radius, atmosphere: home.atmosphere,
    fairy: fairy.position.toArray(), camera: camera.position.toArray(), target: guideTarget.toArray(),
    elapsed: homeClock.elapsed, moves: homeClock.moves, guided: homeGuide.enabled,
    destination: destination?.name ?? null, orbitSpeed: orbitSpeedFactor, orbitPaths: orbits.paths.visible, sound: soundOn, earthVisit: earth.visit,
    found: homeFound, paused, mapOpen, settingsOpen, postcardOpen, menuOpen, stickers: stickerBook.book.arrived, openWorlds: worlds.map(world => world.kind).filter(id => stickerBook.canFly(id)), hoverHeld, boosted, seed: home.seed, visit: home.visit,
    input: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft'].filter(code => keys.has(code)),
    graphics: { mobile: touchDevice, pixelRatio: renderer.getPixelRatio(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
    postcard: postcard.state,
    belt: { ...belt.stats, region: regionLabel.textContent, nearest: nearestWorld.name },
    moon: {
      position: moon.group.position.toArray(), earth: earth.group.position.toArray(), orbitTime: orbits.elapsed,
      earthshine: moon.earthshine!.value, fillIntensity: nightFill.intensity, visit: moon.visit,
      fog: ((moon.surface.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).fog,
    },
    daylight: { world: nearestWorld.name, elevation: daylight.elevation, day: daylight.day, stars: daylight.stars },
    comet: {
      position: [comet.state.position.x, comet.state.position.y, comet.state.position.z],
      away: [comet.state.away.x, comet.state.away.y, comet.state.away.z], distance: comet.state.distance,
      dustLength: comet.state.dust.length, ionLength: comet.state.ion.length, inTail: comet.inTail, glow: comet.glow,
      visible: comet.group.visible, trailSize: trailMaterial.size, ...comet.stats,
    },
    shootingStars: { ...shootingStars.stats, dark: meteorDark },
    magic: {
      year: magicYear, target: magicTarget, on: home.magic!.magicOn.value, glow: home.magic!.glow.value,
      season: magicAt(homeHeight(), magicYear).season.id, cottage: magicAt(-1, magicYear).season.id, farSide: magicAt(1, magicYear).season.id,
      air: magicAir.shown, airVisible: magicAir.points.visible,
      plants: Object.fromEntries(home.surface.children.filter(mesh => mesh.name.startsWith('magic-')).map(mesh => [mesh.name, (mesh as THREE.InstancedMesh).count])),
    },
    season: {
      year: earthYear, on: earth.season!.seasonOn.value, tilt: earth.tilt!.angle, latitude: earthLatitude(), name: seasonAt(earthLatitude(), earthYear),
      air: seasonAir.shown, airVisible: seasonAir.points.visible,
    },
    weather: {
      kind: weatherAir.current?.kind ?? null, ...weatherAir.here, rain: weatherAir.here.rain, rainLines: weatherAir.rain.visible, mistDiscs: weatherAir.mist.visible,
      rainbow: weatherAir.bowShown, wind: foliageWind.value.y, map: earth.weather!.texture.image.width,
      clouds: earth.clouds.children.map(child => child.name), fog: fog.density, sunlight: sunlight.intensity,
      mapCover: (() => { let sum = 0; const data = earth.weather!.data; for (let i = 0; i < data.length; i += 4) sum += data[i]; return sum / (data.length / 4) / 255 })(),
    },
    sun: { look: sun.sunLook!.root.name, tint: sunTint.getHexString(), turn: sun.sunLook!.prominences?.rotation.y ?? 0, position: sun.group.position.toArray() },
    sky: {
      visibility: stars.visibility, pictures: stars.picturesShown,
      labels: [...document.querySelectorAll<HTMLElement>('.sky-labels:not([hidden]) .sky-label')].filter(label => !label.hidden).map(label => label.textContent),
      webb: stars.placements.map(({ image }) => ({ id: image.id, loaded: !!stars.group.getObjectByName(image.id)?.visible })),
      caption: document.querySelector<HTMLElement>('.sky-caption:not([hidden]) h2')?.textContent ?? null,
    },
    candy: ['foliage-lollipop', 'foliage-cane', 'soda-bubbles', 'pegasus-foals'].map(name => home.surface.getObjectByName(name)?.name),
    clouds: { puffs: (home.clouds.getObjectByName('cotton-candy-clouds') as THREE.InstancedMesh | undefined)?.count ?? 0, mist: mistTint.getHexString(), fogDensity: fog.density },
    rings: { ...sparkleRings.stats(), sparkle: sparkleLevel(), trailShown, trailSize: trailMaterial.size },
    wildlife: worlds.filter(world => world.creatures).map(world => ({
      world: world.name, total: world.creatures!.residents.length,
      kinds: [...new Set(world.creatures!.residents.map(resident => resident.kind))],
      visible: world.creatures!.group.children.filter(model => model.visible).map(model => ({
        name: model.name, position: model.position.toArray(), fairytale: model.userData.fairytale ?? null,
        distance: model.getWorldPosition(new THREE.Vector3()).distanceTo(fairy.position),
      })),
      hellos: world.creatures!.helloState(),
    })),
    hellos: worlds.reduce((sum, world) => sum + (world.creatures?.helloState().count ?? 0), 0),
  }),
  /**
   * Puts the fairy low over the ground near a creature, for the hello check. She flies toward
   * the creature from `back` metres away, `altitude` metres over the ground. The creature is
   * `side` metres to her right. Hover holds her still.
   */
  approach: (name: string, back = 10, altitude = 2.4, hover = false, side = 0) => {
    const world = worlds.find(item => item.creatures?.group.getObjectByName(name))
    const model = world?.creatures!.group.getObjectByName(name)
    if (!world || !model) return false
    const at = model.getWorldPosition(new THREE.Vector3())
    const up = at.clone().sub(world.group.position).normalize()
    const heading = forward.clone().addScaledVector(up, -forward.dot(up))
    if (heading.lengthSq() < 0.01) heading.crossVectors(up, new THREE.Vector3(1, 0, 0))
    heading.normalize()
    const start = at.addScaledVector(heading, -back).addScaledVector(new THREE.Vector3().crossVectors(heading, up), -side)
    const normal = start.clone().sub(world.group.position).normalize()
    destination = null
    homeGuide.stop()
    if (hoverHeld !== hover) toggleHover()
    placeFairy(world.group.position.clone().addScaledVector(normal, surfaceRadius(world, normal) + altitude), heading, normal)
    return true
  },
  /** Puts the fairy at the end of the flower guide. The guide arrives on the next frame. */
  arriveHome: () => {
    const normal = guideTarget.clone().sub(home.group.position).normalize()
    const heading = homeCottagePosition(home).sub(guideTarget)
    placeFairy(guideTarget.clone(), heading.addScaledVector(normal, -heading.dot(normal)).normalize(), normal)
  },
} })
  /** Moves the fairy, the camera and the trail together, with no sweep of the camera. */
  function placeFairy(position: THREE.Vector3, heading: THREE.Vector3, up: THREE.Vector3) {
    fairy.position.copy(position)
    orientFlight(fairy.quaternion, heading, up)
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    camera.position.copy(fairy.position).add(new THREE.Vector3(0, 2.8, 8).applyQuaternion(fairy.quaternion))
    cameraLook.copy(fairy.position).addScaledVector(forward, 12)
    previousFlightPosition.copy(fairy.position)
    for (let i = 0; i < trailCount; i++) trailPositions.set(fairy.position.toArray(), i * 3)
    trailGeometry.attributes.position.needsUpdate = true
  }
}

watchView(() => {
  clearInput()
  camera.aspect = view.width / view.height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(renderRatio())
  renderer.setSize(view.width, view.height)
})
}

startGame()
