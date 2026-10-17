import './style.css'

import * as THREE from 'three'
import { createWorlds, regenerateWorld, resizeHome, surfaceRadius, homeCottagePosition, meadowNormal } from './worlds'
import { createStarSky } from './stars'
import { createSkyLabels } from './sky-labels'
import { createAdventure, createGuideFireflies } from './adventure'
import { createHomeGuide, homeApproachPoint, homeMarkerPosition, journeyHeading } from './journey'
import { createRelocationClock, HOME_CARRY_MARGIN, HOME_MOVE_SECONDS, moonHomeOffset, planHop, relocateHome } from './relocation'
import type { HopPlan } from './relocation'
import { createHopNova, NOVA_PEAK } from './hop-nova'
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
import { rayCraters, updatePlanetLooks } from './planet-paint'
import { visitTransition } from './terrain'
import { hoverFlight, nearestWorldAt, orientFlight, stepFlight, worldCarry } from './flight'
import type { World } from './worlds'
import type { LifeState } from './creatures/population'
import { seasonFor } from './creatures/rules'
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
  trailOptions,
  wingOptions,
} from './customization'
import type { FairyLook, LookPart } from './customization'
import { createElement, Palette, Pause, Play, X } from 'lucide'
import { createFlightInput } from './flight-input'
import { createMobileQuality } from './mobile-quality'
import { createMobileUI } from './mobile-ui'
import { createStickerBook } from './sticker-book'
import { createWarmthNote } from './warmth-note'
import { createSkyNote, isSkyNoteKind } from './sky-note'
import { moonSight } from './moon-diary'
import { createMoonDiary } from './moon-diary-ui'
import { greetFoals, popSodaBubble } from './candy'
import { createSearchStar, nearestCreature, searchProbe } from './search-stars'
import { SEARCH_CREATURE, searchDone } from './stickers'
import { createSettings } from './settings'
import { createPostcardCamera } from './postcard-camera'
import { createSparkleRings, RING, RING_SHAPE_NAMES, ringDotsTexture, ringGlowTexture, ringNotes, ringShapeNotes, ringShapePoints } from './rings'
import type { RingTake } from './rings'
import { view, watchView } from './viewport'
import { createFairyTrail, drawTrailIcon } from './fairy-trail'
import { BOOK_KINDS, friendName, isBookKind } from './friend'
import { createFairyFriend } from './friend-ui'
import { createAnimalBook } from './animal-book-ui'
import { loadHomeLook, setHomeLook } from './home'
import { createHomeBuild } from './home-build'

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
      <fieldset class="customizer-group" data-custom-group="trail">
        <legend>Sparkle trail</legend>
        <div class="option-grid option-grid--two">
          ${trailOptions.map(({ id, label }) => `
            <button type="button" data-custom="trail" data-value="${id}" aria-pressed="false">
              <canvas class="wing-preview" data-trail="${id}" width="88" height="68" aria-hidden="true"></canvas>
              <span>${label}</span>
            </button>`).join('')}
        </div>
      </fieldset>
      <fieldset class="customizer-group" data-custom-group="skin">
        <legend>Skin</legend>
        ${colorSwatches('skin', 'Skin tone', skinOptions)}
      </fieldset>
      <p class="customizer-note">Changes are saved automatically</p>
    </section>

    <section id="home-builder" class="customizer home-builder" aria-labelledby="home-builder-title" aria-hidden="true">
      <div class="customizer-heading">
        <div>
          <p class="eyebrow">YOUR HOME</p>
          <h2 id="home-builder-title">Make it yours</h2>
        </div>
        <button id="home-builder-close" class="customizer-close" type="button" aria-label="Close build mode">
          <i data-icon="close"></i>
        </button>
      </div>
      <div data-home-content></div>
      <div class="home-tools">
        <button id="home-surprise" type="button"><span aria-hidden="true">✦</span> Surprise me</button>
        <button id="home-done" type="button">Done</button>
      </div>
      <p class="customizer-note">Changes are saved automatically</p>
    </section>
    <button id="build-home" class="build-home" type="button" hidden><span aria-hidden="true">✦</span> Build your home</button>

    <section id="welcome" class="welcome-card">
      <div class="welcome-sparkle"><i></i><i></i><i></i></div>
      <p class="eyebrow">YOUR WINGS ARE READY</p>
      <h2>Drift beyond<br>the blue</h2>
      <p>Wander freely through rivers, clouds, and stars.<br>Or open your book and follow the flower home.</p>
      <button id="begin-button" type="button"><span>Begin your adventure</span><span>→</span></button>
      <button id="welcome-customize" class="welcome-customize" type="button"><span>Choose your look</span><span>✦</span></button>
      <small id="steering-hint">Use WASD or arrow keys to steer</small>
    </section>

    <div id="arrival-note" role="status"></div>
    <div id="ring-count" role="status"><svg viewBox="-3.3 -3.3 6.6 6.6" aria-hidden="true"><polygon /></svg><b></b><span aria-hidden="true"></span></div>
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
    <div class="hop-flash" aria-hidden="true"></div>
  </main>
`

function mountIcon(target: Element | null, icon: typeof Pause) {
  if (!target) return
  target.replaceChildren(createElement(icon, { width: 18, height: 18, 'stroke-width': 1.6 }))
}

mountIcon(document.querySelector('[data-icon="pause"]'), Pause)
mountIcon(document.querySelector('[data-icon="customize"]'), Palette)
mountIcon(document.querySelector('[data-icon="close"]'), X)
mountIcon(document.querySelector('#home-builder-close [data-icon="close"]'), X)

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

// The home that the fairy built (src/home.ts), before the first build of Blossom Haven.
setHomeLook(loadHomeLook((() => { try { return localStorage } catch { return undefined } })()))
// The renderer paints the maps of the seven planets (src/planet-paint.ts).
const worlds = createWorlds(scene, touchDevice, renderer)
const orbits = createPlanetaryOrbits(scene, worlds)
// A browser check can give the time of the orbits in seconds: ?test&moon=190 starts with a full Moon (src/moon.ts).
const testMoon = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('moon')) : 0
if (testMoon > 0) orbits.update(testMoon)
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
// A hop to a new size builds a new cottage (resizeHome() in src/worlds.ts), so this is found again after it.
const findCottageWindow = () => (home.surface.getObjectByName('cottage-window') as THREE.Mesh).material as THREE.MeshStandardMaterial
let cottageWindow = findCottageWindow()
// Sparkle rings over the meadows of Earth, Blossom Haven and the Moon (src/rings.ts).
const sparkleRings = createSparkleRings(worlds, { mobile: touchDevice, sparkle: makeSoftDiscTexture('rgba(255,255,255,1)'), glow: ringGlowTexture(), dots: ringDotsTexture() })
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
  // Rain from a thin cloud: the Sun comes through, so a rainbow shows when the Sun is low.
  shower: { cover: 0.2, rain: 0.9, storm: 0, mist: 0 },
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

// The sparkle trail of the look (src/fairy-trail.ts). Its points stay with the world that carries her.
const fairyTrail = createFairyTrail(scene, fairy, fairyRig, camera, renderer)
// The place of the fairy before the world carries her and after it, and the state of the trail for a frame.
const trailFrom = new THREE.Vector3(), trailCarried = new THREE.Vector3()
const trailState = { frame: null as THREE.Object3D | null, velocity: new THREE.Vector3(), drift: new THREE.Vector3(), down: new THREE.Vector3(), boost: false, hover: false, bonus: 0, still: false, preview: false }
// The time of the trail. It continues in the look menu, where the time of the flight stops.
let trailClock = 0
// F19 · The fairy friend (src/friend.ts): after five hellos, a creature that she met flies at her side.
const fairyFriend = createFairyFriend({
  scene, renderer, sparkle: makeSoftDiscTexture('rgba(255,255,255,1)'),
  // A soft chime for a new card, a brighter one for the gift, and two high notes when a new friend comes after "Fly with me".
  chime: moment => playChime(moment === 'gift' ? [659.25, 880, 1046.5] : moment === 'card' ? [659.25, 783.99, 1046.5] : [880, 1174.66], moment === 'card' ? 0.035 : 0.045),
})
// The move that a world gives her in a frame, and the ground below the friend.
const friendCarry = new THREE.Vector3()
const friendGround = { centre: earth.group.position, radiusAt: (direction: THREE.Vector3) => surfaceRadius(nearestWorld, direction) }
// The hellos of a frame, as the kinds of the creatures.
const greeted: string[] = []

// The wing buttons show each wing in the wing colour of the look. They paint again only when that colour changes.
let wingIconColor = ''
function drawWingIcons(look: FairyLook) {
  if (look.wingColor === wingIconColor) return
  wingIconColor = look.wingColor
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-wing]').forEach(canvas => drawWingIcon(canvas, designById(canvas.dataset.wing!)!, look))
  // The trail buttons show each trail in the sparkle colour of the wing colour.
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-trail]').forEach(canvas => drawTrailIcon(canvas, canvas.dataset.trail as FairyLook['trail'], lookColors(look).sparkle))
}

function applyFairyLook(look: FairyLook, persist = true) {
  fairyLook = { ...look }
  fairyRig.applyLook(look)
  drawWingIcons(look)
  const { sparkle } = lookColors(look)
  fairyLight.color.setHex(sparkle).lerp(new THREE.Color(0xffffff), 0.35)
  fairyTrail.setDesign(look.trail)
  fairyTrail.setColour(sparkle)
  fairyFriend.setColour(sparkle)

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
  if (open && building) homeBuild.close()
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
// Build mode (src/home-build.ts): the flight waits while the fairy changes her home.
let building = false
let hoverHeld = false
let boosted = false
// World speed of Settings: 1×, 8×, 16×, 32× or 64×. It starts at 1× at each visit.
let orbitSpeedFactor = 1
let soundOn = false
let audioContext: AudioContext | null = null
let audioGain: GainNode | null = null
let nearestWorld = earth
let nearestDistance = 0
// True when the flight panel says that the fairy is near the nearest world (updateNearestWorld()).
let nearNearest = true
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
// The nova of a hop (look B of docs/wandering-home-study.md), and its soft light in the sky of the home.
const hopNova = createHopNova(scene, makeSoftDiscTexture('rgba(255,255,255,1)'))
const hopFlash = document.querySelector<HTMLElement>('.hop-flash')!
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const buildButton = document.querySelector<HTMLButtonElement>('#build-home')!
const homeBuild = createHomeBuild({
  panel: document.querySelector<HTMLElement>('#home-builder')!, button: buildButton, canvas: renderer.domElement,
  scene, home, sparkle: makeSoftDiscTexture('rgba(255,255,255,1)'), reducedMotion,
  chime: notes => playChime(notes, 0.035, 0.12),
  onOpen: open => {
    if (open && customizing) setCustomizerOpen(false)
    building = open
    clearInput()
    // The look of the fairy panel: the touch buttons, the welcome card and the notes hide.
    document.querySelector('.game-shell')!.classList.toggle('is-customizing', open)
    document.querySelector('.game-shell')!.classList.toggle('is-building', open)
    if (open) document.querySelector<HTMLElement>('#home-builder-close')!.focus()
    // The focus goes back to the Build button, which shows again near the cottage.
    else if (!buildButton.hidden) buildButton.focus()
    else renderer.domElement.focus()
  },
})
buildButton.addEventListener('click', () => homeBuild.openAt(fairy.position))
document.querySelector('#home-builder-close')!.addEventListener('click', () => homeBuild.close())
document.querySelector('#home-done')!.addEventListener('click', () => homeBuild.close())
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
  // A rising chime, brighter than the sticker chime: the search star.
  searchChime: () => playChime([783.99, 987.77, 1174.66, 1567.98]),
})
// The gold star of a find (F1). After a reset of the book, a star in the sky goes too.
const searchStar = createSearchStar(scene, makeSoftDiscTexture('rgba(255,255,255,1)'), touchDevice)
stickerBook.onChange(() => { if (!stickerBook.stars) searchStar.clear() })
// A new sticker or a search star makes the fairy friend happy.
stickerBook.onChange(() => { if (stickerBook.count) fairyFriend.cheer(reducedMotion.matches) })
// A person who wants to see each friend at once can give a hello of each kind: ?friend=all. The book is full,
// and the friend is there with no note. This works on the dev server only.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('friend') === 'all') fairyFriend.hello(BOOK_KINDS, false, true)
// F16 · Picture thermometer: a note for a moment at the arrival at a world. The thermometers are in Worlds.
const warmthNote = createWarmthNote()
// A true fact about the sky of a world, from the fairy friend (docs/living-worlds-study.md).
const skyNote = createSkyNote()
// The clock of the living skies (src/skies/): it runs in the flight, and it stops with reduced motion.
let skyClock = 0
// Worlds: the map and the book of stickers. Flight waits while it is open.
const adventure = createAdventure(worlds, stickerBook, {
  home: followHome,
  stop: stopHome,
  travel: travelTo,
  map: open => { mapOpen = open; clearInput(); document.querySelector('.game-shell')!.classList.toggle('is-map-open', open) },
})
// F14 · The Moon shapes diary: a place in Worlds for each shape of the Moon that she sees from Earth.
const moonDiary = createMoonDiary({ chime: full => playChime(full ? [587.33, 739.99, 880, 1174.66] : [587.33, 880], 0.045) })
// F19 · The animal book: the Animals page of Worlds, with "Fly with me" on each card that she met.
const animalBook = createAnimalBook({ worlds, friend: fairyFriend, still: () => reducedMotion.matches, here: () => nearestWorld.kind === 'fairy' ? 'fairy' : 'earth' })
// Settings for grown-ups, beside the fairy button. Flight waits while it is open.
const settings = createSettings({
  open: open => { settingsOpen = open; clearInput(); document.querySelector('.game-shell')!.classList.toggle('is-settings-open', open) },
  // Reset sticker book also removes the Moon diary and the fairy friend (F19).
  stickers: { get count() { return stickerBook.count }, get stars() { return stickerBook.stars }, get shapes() { return moonDiary.count }, get friend() { return fairyFriend.has }, reset: () => { stickerBook.reset(); moonDiary.reset(); fairyFriend.reset() } },
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
  if (building) homeBuild.close()
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
/**
 * A hop of Blossom Haven (docs/wandering-home-study.md): a new size, and a new place around the Sun or
 * as a moon of a planet. The clock plans the hop NOVA_PEAK s before it moves the home, so the two
 * novae start first and the home moves at the peak of the flash.
 */
let nextHop: HopPlan | null = null
type HopOptions = { size?: string; host?: string }
function planNextHop(options: HopOptions = {}) {
  const carrying = !hoverHeld && fairy.position.distanceTo(home.group.position) <= home.radius + home.atmosphere + HOME_CARRY_MARGIN
  const plan = planHop(home, worlds, fairy.position, carrying, Math.random, options)
  if (!plan) return null
  // A nova where the home leaves and a nova where it arrives: from far away, the second one shows where it went.
  hopNova.fire(home.group.position, home.radius, reducedMotion.matches)
  hopNova.fire(plan.position, plan.size.radius, reducedMotion.matches)
  if (Math.min(fairy.position.distanceTo(home.group.position), fairy.position.distanceTo(plan.position)) < 3000) playChime([523.25, 1046.5], 0.04)
  return plan
}
/** The words of the hop note: the new size and the planet of a moon home. */
function hopWords(plan: HopPlan) {
  const size = plan.size.id === 'today' ? 'Blossom Haven has its first size again' : `Blossom Haven is as big as ${plan.size.name} now`
  return `You and your home moved together! ${size}${plan.host ? `, a moon of ${plan.host.name}` : ''}.`
}
function moveHome(options: HopOptions = {}) {
  const plan = nextHop ?? planNextHop(options)
  nextHop = null
  if (!plan) return false
  // A moon home goes to its place on the path now: the planet moved a little since the plan.
  const next = plan.host
    ? moonHomeOffset(plan.distance, plan.angle, Math.atan2(plan.host.group.position.z, plan.host.group.position.x)).add(plan.host.group.position)
    : plan.position
  // At a new size the fairy keeps her direction from the middle and her height over the ground.
  const up = fairy.position.clone().sub(home.group.position).normalize()
  const height = fairy.position.distanceTo(home.group.position) - surfaceRadius(home, up)
  const resized = plan.size.radius !== home.radius
  const result = relocateHome(home, next, fairy.position)
  const shift = result.offset.clone()
  if (resized) {
    resizeHome(home, plan.size)
    cottageWindow = findCottageWindow()
    // A new landscape needs a new safe line of rings.
    sparkleRings.rebuild(home)
    if (result.carrying) {
      const place = home.group.position.clone().addScaledVector(up, surfaceRadius(home, up) + height)
      shift.add(place.clone().sub(fairy.position))
      fairy.position.copy(place)
    }
  }
  if (result.carrying) {
    // Translate every world-space follower together: no stretched trail or camera sweep.
    camera.position.add(shift)
    cameraLook.add(shift)
    previousFlightPosition.add(shift)
    fairyTrail.shift(shift)
  }
  if (plan.host) orbits.moonOf(home, plan.host, plan.distance, plan.angle)
  else orbits.rebase(home)
  home.group.updateMatrixWorld(true)
  guideTarget.copy(homeApproachPoint(home))
  homeSize = plan.size.id
  adventure.notifyMove(result.carrying, hopWords(plan))
  // The hop brings the next magic season. The look follows in about 20 s.
  magicTarget += MAGIC_STEP
  return true
}
let homeSize = 'today'
/**
 * The Moon has no fog, so it shows from Earth (src/moon.ts). The planet of a moon home gets the same
 * while the fairy is at the home: else the air of the home paints the planet in its colour.
 */
let foglessHost: World | null = null
let fogless: (THREE.Material & { fog: boolean })[] = []
function updateHostFog() {
  const host = nearestWorld === home ? orbits.homeHost : null
  if (host === foglessHost) return
  for (const material of fogless) { material.fog = true; material.needsUpdate = true }
  fogless = []
  foglessHost = host
  host?.group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    for (const material of (Array.isArray(object.material) ? object.material : [object.material]) as (THREE.Material & { fog?: boolean })[]) {
      if (!material.fog) continue
      material.fog = false
      material.needsUpdate = true
      fogless.push(material as THREE.Material & { fog: boolean })
    }
  })
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
  if (!started || paused || customizing || mapOpen || settingsOpen || postcardOpen || building || menuOpen) return
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
  if (event.code === 'Escape' && building && !postcardOpen) {
    homeBuild.close()
    return
  }
  if (customizing || mapOpen || settingsOpen || postcardOpen || building || menuOpen || event.target instanceof HTMLSelectElement) return
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
    if (!started || paused || customizing || mapOpen || settingsOpen || postcardOpen || building || menuOpen || contextLost) return
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
  nearNearest = near
  // The flight panel's "near" test earns the sticker (arrivalDistance() in src/stickers.ts).
  if (started) stickerBook.arrive(world, near)
  // F1 · Search stars: after the hello sticker, one small task on each world (searchDone() in src/stickers.ts).
  // A find counts only in flight, so the note never comes behind Worlds, Settings, the menu or the pause.
  const flying = started && !paused && !customizing && !mapOpen && !settingsOpen && !postcardOpen && !building && !menuOpen
  if (flying && !fairyFriend.noteShown && !moonDiary.busy && stickerBook.searching(world.kind) && searchDone(world.kind, searchProbe(world, fairy.position, near, { rainbow: weatherAir.bowShown, turn: sun.sunLook!.prominences?.rotation.y })) && stickerBook.find(world.kind)) {
    const creature = SEARCH_CREATURE[world.kind]
    searchStar.pop(world, creature ? nearestCreature(world, fairy.position, creature) : null)
  }
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
/** 1 for the 4 s after a sparkle ring, then 0. The last 0.75 s go down smoothly. */
function sparkleLevel() { return THREE.MathUtils.clamp((sparkleUntil - elapsed) / 0.75, 0, 1) }

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
}

function updateCamera(delta: number) {
  if (building) {
    // Build mode turns the camera around the home. The panel is at the side on a computer and at the bottom on a phone.
    homeBuild.cameraPose(camera, delta)
    camera.near = 0.08
    camera.fov = THREE.MathUtils.lerp(camera.fov, 58, 1 - Math.exp(-delta * 2.5))
    camera.setViewOffset(view.width, view.height, view.width > 720 ? view.width * 0.13 : 0, view.width > 720 ? 0 : view.height * 0.3, view.width, view.height)
    camera.updateProjectionMatrix()
    return
  }
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
  // The depth buffer has more precision with a far near plane. Without it, the water and the ground of a
  // flat shore flicker when seen from far away. Near the ground, the near plane stays close for the plants.
  const clearance = camera.position.distanceTo(nearestWorld.group.position) - safeRadius
  camera.near = customizing ? 0.08 : THREE.MathUtils.clamp(clearance / 500, 0.08, 2)
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
const lifeSun = new THREE.Vector3(), lifeTurn = new THREE.Quaternion()
// False while a bench measures the frame with no animals (the test hook wildlifeOn()).
let wildlifeOn = true
/**
 * The time of a world for its herds: the year and the tilt of Earth, the magic year of Blossom Haven,
 * the Sun in the frame of the world (the fireflies come at night), the camera for the culling, and reduced motion.
 */
function lifeOf(world: World): LifeState {
  lifeSun.copy(sun.group.position).sub(world.group.position).normalize().applyQuaternion(lifeTurn.copy(world.group.quaternion).invert())
  const still = reducedMotion.matches
  return world === home ? { magic: magicYear, sun: lifeSun, view: camera, still } : { year: earthYear, tilt: earth.tilt?.angle, sun: lifeSun, view: camera, still }
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
const ringCount = document.querySelector<HTMLElement>('#ring-count')!
// The time of flight at which the number of a ring goes away. 0: no number shows.
let ringCountUntil = 0
/**
 * Shows the number of a ring for a moment, large, with the same number of dots. A ring of a shape line
 * shows the picture of its shape and its name. The moment is time of flight, so a pause does not use it up.
 */
function showRingCount(take: RingTake) {
  const dots = take.shape ? 0 : take.number
  ringCount.classList.toggle('is-shape', !!take.shape)
  ringCount.querySelector('polygon')!.setAttribute('points', take.shape ? ringShapePoints(take.shape).map(([x, y]) => `${x.toFixed(2)},${(-y).toFixed(2)}`).join(' ') : '')
  ringCount.querySelector('b')!.textContent = take.shape ? RING_SHAPE_NAMES[take.shape] : String(take.number)
  ringCount.querySelector('span')!.replaceChildren(...Array.from({ length: dots }, () => document.createElement('i')))
  // The class goes off and on again, so the pop starts again for each ring.
  ringCount.classList.remove('is-visible')
  void ringCount.offsetWidth
  ringCount.classList.add('is-visible')
  ringCountUntil = elapsed + 1.3
}

let lastPaint = 0
function animate(timestamp?: number) {
  timer.update(timestamp)
  if (document.hidden || contextLost) { requestAnimationFrame(animate); return }
  const rawDelta = Math.min(timer.getDelta(), 0.05)
  const active = started && !paused && !customizing && !mapOpen && !settingsOpen && !postcardOpen && !building && !menuOpen
  if (touchDevice && mobileQuality.sample(timer.getDelta(), active)) renderer.setPixelRatio(renderRatio())
  const paintTime = timestamp ?? performance.now()
  if (!active && !customizing && !building && !mapOpen && paintTime - lastPaint < 100) { requestAnimationFrame(animate); return }
  lastPaint = paintTime
  const delta = active ? rawDelta : 0
  // Keep the orbit display gently moving behind the Worlds dialog.
  const orbitDelta = started && !paused && !customizing && !building && !menuOpen ? rawDelta : 0
  elapsed += delta
  const homeGuided = homeGuide.enabled || destination === home
  // The guide stops the clock: a planned hop goes, and the clock plans again when it runs.
  if (homeGuided) nextHop = null
  else if (delta > 0 && !nextHop && homeClock.elapsed + delta >= HOME_MOVE_SECONDS - NOVA_PEAK && homeClock.elapsed + delta < HOME_MOVE_SECONDS) nextHop = planNextHop()
  homeClock.update(delta, homeGuided, () => moveHome())
  magicYear = stepMagicYear(magicYear, magicTarget, delta)
  // Remember the fairy in the nearest planet's local frame while she is in its
  // atmosphere, or near the airless Moon, which moves fast around Earth.
  // The frame moves with axial spin, the solar orbit and the Moon's orbit.
  const nearbyWorld = nearestWorldAt(fairy.position, worlds)
  trailFrom.copy(fairy.position)
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
  trailCarried.copy(fairy.position)
  guideTarget.copy(homeApproachPoint(home))
  updateNearestWorld()
  // The thermometer of the world waits for the sticker note, the search-star note, the notes of the fairy home and the
  // note of the fairy friend. The thermometer and the Moon note use the same place: each one waits while the other shows.
  warmthNote.update(nearNearest ? nearestWorld.kind : null, delta, active, stickerBook.noteShown || adventure.noteShown || moonDiary.state.note !== null || fairyFriend.noteVisible || skyNote.visible)
  // The sky note: in the air of a world with a living sky (or low over the Moon and Mercury), after the
  // thermometer, and never with a different note.
  const skyWorld = nearestWorld.living && isSkyNoteKind(nearestWorld.kind) ? nearestWorld : null
  const skyHere = skyWorld && nearestDistance < (skyWorld.atmosphere || 80) ? skyWorld.kind as Parameters<typeof skyNote.update>[0] : null
  skyNote.update(skyHere, !skyWorld?.atmosphere && (skyWorld?.living?.stats().sparks ?? 0) > 0, delta, active,
    stickerBook.noteShown || adventure.noteShown || moonDiary.state.note !== null || fairyFriend.noteVisible || warmthNote.state.shown !== null,
    () => { const friend = fairyFriend.state.friend; return friend ? `${friendName(friend)} says` : nearestWorld.name })
  // A soda bubble of Blossom Haven pops when the fairy touches it, with a soft high note. The search star of
  // updateNearestWorld() reads the bubble first.
  if (delta > 0 && nearestWorld === home && popSodaBubble(home, fairy.position)) playChime([1567.98], 0.03)
  if (delta > 0) updateFairy(delta)
  // A ring that the fairy flies through gives a burst, a chime and a longer, brighter trail.
  const ringsTaken = sparkleRings.update(delta, elapsed, fairy.position, nearestWorld, !reducedMotion.matches)
  if (ringsTaken.length) {
    // The rings count with the child: the number of the ring, the same dots, and its note of the scale.
    // A ring of a shape line gives the picture and the name of its shape, and the note of that shape.
    const take = ringsTaken[ringsTaken.length - 1]
    const notes = take.shape ? ringShapeNotes(take.shape) : ringNotes(take.number)
    // The last ring of a line adds the high C.
    playChime(take.complete ? [...notes, 1046.5] : notes)
    showRingCount(take)
    sparkleUntil = elapsed + RING.trailSeconds
    fairyFriend.cheer(reducedMotion.matches)
  }
  // The number goes away after its time of flight, and at once behind a menu. A pause keeps it, as it keeps the flight.
  if (ringCountUntil && (elapsed >= ringCountUntil || customizing || mapOpen || settingsOpen || postcardOpen || building || menuOpen)) {
    ringCount.classList.remove('is-visible')
    ringCountUntil = 0
  }
  // The Build button shows near the cottage in flight; build mode turns the camera and plays the changes.
  homeBuild.update(rawDelta, fairy.position, started && !paused && nearestWorld === home && !customizing && !mapOpen && !settingsOpen && !postcardOpen && !menuOpen)
  updateCamera(rawDelta)
  // The fairy friend takes her whole move of this frame, also the move that a world gave her, and then comes to
  // its place at her side. The look menu stops the flight; the friend comes near there, so the child sees her choice.
  friendGround.centre = nearestWorld.group.position
  fairyFriend.update({
    fairy: fairy.position, heading: fairy.quaternion, delta: customizing ? rawDelta : delta,
    carry: friendCarry.copy(trailCarried).sub(trailFrom), ground: friendGround, camera: camera.position,
    aspect: view.width / view.height, menu: customizing, flying: active, still: reducedMotion.matches,
    fast: boosted || !nearNearest, light: nearNearest ? daylight.day : 1,
  })
  updateEnvironment()
  // The Moon diary reads the picture of this frame: the Moon in the view, above the horizon, in a clear sky.
  moonDiary.update(moonSight(fairy.position, camera, earth, moon, sun.group.position, nearestWorld === earth, weatherAir.here.cover), delta, active, warmthNote.state.shown !== null || fairyFriend.noteVisible || skyNote.visible)
  belt.update(orbits.elapsed, camera, fairy.position, reducedMotion.matches ? 0 : elapsed, renderer.domElement.height, skyVisibility)
  // The comet follows the orbit time, so World speed makes it faster. Reduced motion stills the tail.
  comet.update(orbits.elapsed, sun.group.position, camera, fairy.position, forward, reducedMotion.matches ? 0 : elapsed, delta,
    renderer.domElement.height, skyVisibility, reducedMotion.matches)
  if (comet.entered) playChime([783.99, 1174.66])
  shootingStars.update(elapsed, camera, nearestWorld.group.position, meteorDark)
  const homeHeading = journeyHeading(fairy.position, guideTarget, nearestWorld, nearestWorld === home)
  const homeMarker = homeMarkerPosition(home)
  adventure.update(camera, homeMarker, nearestWorld, delta, {
    started, following: homeGuide.enabled, suspended: homeSuspended, obscured: customizing || building || mapOpen || settingsOpen || postcardOpen, near: nearNearest,
  })
  updateFireflies(fairy.position, homeHeading, elapsed, homeGuide.enabled && !homeSuspended && !customizing && !mapOpen && !settingsOpen && !postcardOpen && !building && !menuOpen)
  skyClock += reducedMotion.matches ? 0 : delta
  for (const world of worlds) {
    // The clouds of Earth read the weather map at their place, and a living sky moves with the winds of its
    // world (src/skies/), so they do not turn.
    if (!world.weather && !world.living) world.clouds.rotation.y += delta * 0.001
    world.living?.update({ time: skyClock, camera, still: reducedMotion.matches })
    // The herds follow the season of their place on Earth and the magic season on Blossom Haven (src/creatures/population.ts).
    // A bench can turn the animals off (wildlifeOn() of the test hooks).
    if (wildlifeOn) world.creatures?.update(delta, camera.position, lifeOf(world))
    // After update(): the hop and the turn go over the place on the route.
    const hellos = wildlifeOn ? world.creatures?.greet(delta, fairy.position) : undefined
    if (hellos?.length) greeted.push(...hellos)
    world.animate?.(reducedMotion.matches ? 0 : elapsed)
  }
  // The pegasus foals say hello after world.animate(), which puts each foal on its circle.
  for (let foals = greetFoals(home, delta, fairy.position); foals > 0; foals--) greeted.push('pegasus')
  // The fairy friend counts the hellos and keeps the kinds that she met (F19). The friend itself is no resident, so it says no hello.
  if (greeted.length) {
    playHelloChime()
    fairyFriend.hello(greeted, reducedMotion.matches)
    greeted.length = 0
  }
  flossTime.value = reducedMotion.matches ? 0 : elapsed
  foliageWind.value.x = reducedMotion.matches ? 0 : elapsed
  // The strength of the wind in the plants comes from the weather of Earth. Away from Earth it is 1.
  foliageWind.value.y = weatherAir.here.wind
  hopNova.update(delta, camera, view.height)
  hopFlash.style.opacity = nearestWorld === home && nearestDistance < home.atmosphere + HOME_CARRY_MARGIN ? String((hopNova.flash * 0.4).toFixed(3)) : '0'
  updateHostFog()
  searchStar.update(delta, fairy, camera, reducedMotion.matches)
  // The points of the trail stay with the world that carries her. In open space they stay in the scene,
  // and they keep the velocity that the orbit of a world gives her.
  trailState.frame = attachedToWorld?.group ?? null
  if (attachedToWorld) trailState.down.copy(attachedToWorld.group.position).sub(fairy.position).normalize()
  else trailState.down.set(0, 0, 0)
  trailState.still = reducedMotion.matches
  if (delta > 0) {
    trailState.velocity.copy(fairy.position).sub(trailCarried).divideScalar(delta)
    trailState.drift.copy(trailCarried).sub(trailFrom).divideScalar(delta)
    trailState.boost = boosted
    trailState.hover = hoverHeld
    // A stronger trail after a sparkle ring, and in a comet tail for 4 s after it.
    trailState.bonus = THREE.MathUtils.clamp(Math.max(sparkleLevel(), comet.glow), 0, 1)
    trailState.preview = false
    trailClock += delta
    fairyTrail.update(trailClock, delta, trailState)
  } else if (customizing && rawDelta > 0) {
    // The look menu stops the flight. The trail of the look continues as in a cruise, and its
    // points move slowly behind her, so the player sees each trail.
    trailState.velocity.copy(forward).multiplyScalar(11)
    trailState.drift.copy(forward).multiplyScalar(-1.6)
    trailState.boost = trailState.hover = false
    trailState.bonus = 0
    trailState.preview = true
    trailClock += rawDelta
    fairyTrail.update(trailClock, rawDelta, trailState)
  }
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
  /**
   * A hop of Blossom Haven now, as the clock of src/relocation.ts makes each 2 minutes. A check can fix
   * the size (an id of HOME_SIZES) and the place (`host`: 'sun' or a planet of MOON_HOME.hosts).
   */
  hop: (options: HopOptions = {}) => moveHome(options),
  /** Puts the fairy at `position`, heading to `target`, with no guide. */
  place: (position: number[], target: number[]) => {
    destination = null
    fairy.position.fromArray(position)
    const heading = new THREE.Vector3().fromArray(target).sub(fairy.position).normalize()
    const up = Math.abs(heading.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    orientFlight(fairy.quaternion, heading, up.addScaledVector(heading, -up.dot(heading)).normalize())
    snapCamera()
  },
  /** The middles of the ray craters of Mercury, as local directions, for the search star check. */
  rayCraters: () => rayCraters(worlds.find(world => world.kind === 'mercury')!.seed).map(crater => crater.centre.toArray()),
  /** Turns the fairy to the Moon and holds her in a hover, for the Moon diary check. */
  faceMoon: () => {
    destination = null
    homeGuide.stop()
    if (!hoverHeld) toggleHover()
    orientFlight(fairy.quaternion, moon.group.position.clone().sub(fairy.position).normalize(), fairy.position.clone().sub(nearestWorld.group.position).normalize())
    snapCamera()
  },
  /** A world object, to read its terrain (`sample`) and its creatures in a browser check. */
  world: (kind: string) => worlds.find(world => world.kind === kind),
  /** Moves the fairy to `height` metres above the ground of a world, over a local direction. The camera moves with her. */
  placeOver: (kind: string, direction: [number, number, number], height: number) => {
    const world = worlds.find(item => item.kind === kind)!
    const normal = new THREE.Vector3(...direction).normalize().applyQuaternion(world.group.quaternion)
    fairy.position.copy(world.group.position).addScaledVector(normal, surfaceRadius(world, normal) + height)
    orientFlight(fairy.quaternion, new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), normal)
    snapCamera()
    destination = null; flight.speed = 11
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
    elapsed: homeClock.elapsed, moves: homeClock.moves, guided: homeGuide.enabled, homeSize, homeHost: orbits.homeHost?.kind ?? null, novae: hopNova.count,
    destination: destination?.name ?? null, orbitSpeed: orbitSpeedFactor, orbitPaths: orbits.paths.visible, sound: soundOn, earthVisit: earth.visit,
    homeBuild: { look: homeBuild.look, building, button: !buildButton.hidden, near: homeBuild.near },
    found: homeFound, paused, mapOpen, settingsOpen, postcardOpen, menuOpen, stickers: stickerBook.book.arrived, searchStars: stickerBook.book.found, searchStar: searchStar.state, warmth: warmthNote.state, skyNote: skyNote.state, skies: Object.fromEntries(worlds.filter(world => world.living).map(world => [world.kind, world.living!.stats()])), skyClock, openWorlds: worlds.map(world => world.kind).filter(id => stickerBook.canFly(id)), hoverHeld, boosted, seed: home.seed, visit: home.visit,
    input: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft'].filter(code => keys.has(code)),
    graphics: { mobile: touchDevice, pixelRatio: renderer.getPixelRatio(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
    postcard: postcard.state,
    // `aim` is the place of the Moon in the picture: x and y from -1 to 1, and z above 1 when the Moon is behind the camera.
    moonDiary: { ...moonDiary.state, sight: moonSight(fairy.position, camera, earth, moon, sun.group.position, nearestWorld === earth, weatherAir.here.cover), aim: moon.group.position.clone().project(camera).toArray(), altitude: nearestDistance },
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
      visible: comet.group.visible, trailBonus: fairyTrail.bonus, ...comet.stats,
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
    sodaPop: home.surface.getObjectByName('soda-pop')?.visible ?? false,
    candy: ['foliage-lollipop', 'foliage-cane', 'soda-bubbles', 'pegasus-foals'].map(name => home.surface.getObjectByName(name)?.name),
    clouds: { puffs: (home.clouds.getObjectByName('cotton-candy-clouds') as THREE.InstancedMesh | undefined)?.count ?? 0, mist: mistTint.getHexString(), fogDensity: fog.density },
    rings: { ...sparkleRings.stats(), sparkle: sparkleLevel(), trailBonus: fairyTrail.bonus },
    trail: { design: fairyTrail.design, frame: fairyTrail.frame, points: fairyTrail.points, bonus: fairyTrail.bonus },
    wildlife: worlds.filter(world => world.creatures).map(world => ({
      world: world.name, total: world.creatures!.residents.length, herds: world.creatures!.herds.length,
      kinds: [...new Set(world.creatures!.residents.map(resident => resident.kind))],
      // The animals and the draw calls of this frame (src/creatures/population.ts).
      stats: world.creatures!.stats(),
      visible: world.creatures!.group.children.filter(model => model.visible).map(model => ({
        name: model.name, position: model.position.toArray(), fairytale: model.userData.fairytale ?? null,
        distance: model.getWorldPosition(new THREE.Vector3()).distanceTo(fairy.position),
      })),
      hellos: world.creatures!.helloState(),
    })),
    hellos: worlds.reduce((sum, world) => sum + (world.creatures?.helloState().count ?? 0), 0),
    foalHellos: home.surface.getObjectByName('pegasus-foals')?.userData.helloState?.() ?? null,
    friend: fairyFriend.info(fairy.position, camera),
    animalBook: animalBook.state,
  }),
  /** The name of a kind of the book, as its card shows it. */
  kindName: (kind: string) => isBookKind(kind) ? friendName(kind) : null,
  /** F19: gives a hello of each kind in the list, as the creatures do. Five hellos bring the fairy friend. */
  meet: (...kinds: string[]) => fairyFriend.hello(kinds),
  /** F19: selects a friend that she met, or null for no friend, as "Fly with me" and "No friend" of the Animals page do. */
  chooseFriend: (kind: string | null) => fairyFriend.choose(kind as Parameters<typeof fairyFriend.choose>[0], reducedMotion.matches),
  /** F19: the draw calls of the view of this moment with no friend and with the friends (two in a swap). The two renders have the same scene. */
  friendCalls: () => {
    const shown = fairyFriend.group.visible
    const calls = (visible: boolean) => { fairyFriend.group.visible = visible; renderer.render(scene, camera); return renderer.info.render.calls }
    const result = { without: calls(false), with: calls(shown) }
    return result
  },
  /**
   * The draw calls of the view of this moment with no animals and with the animals (the herds, the
   * points of the small life and the hearts), and the time of the two renders. The two renders have the same scene.
   */
  wildlifeCalls: () => {
    const parts = worlds.flatMap(world => world.creatures?.parts ?? [])
    const shown = parts.map(part => part.visible)
    const calls = (visible: boolean) => {
      parts.forEach((part, i) => { part.visible = visible && shown[i] })
      renderer.render(scene, camera)
      return renderer.info.render.calls
    }
    const without = calls(false), all = calls(true)
    return { without, with: all, animals: all - without }
  },
  /** A bench measures the frame with no animals: false stops the update of the herds and hides them, true brings them back. */
  wildlifeOn: (on: boolean) => {
    wildlifeOn = on
    for (const world of worlds) for (const part of world.creatures?.parts ?? []) part.visible = on
  },
  /** The local directions of the centres of the herds of a kind (in a zone, when it is given), nearest to the fairy first, and true when the season shows the herd: a check flies to them. */
  herdPlaces: (kind: string, count = 5, zone?: string) => {
    const world = worlds.find(item => item.creatures?.herds.some(herd => herd.species.id === kind))
    if (!world) return []
    const here = fairy.position.clone().sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert()).normalize()
    return world.creatures!.herds.filter(herd => herd.species.id === kind && (!zone || herd.zone === zone)).sort((a, b) => a.route[0].angleTo(here) - b.route[0].angleTo(here))
      .slice(0, count).map(herd => ({ world: world.kind, direction: herd.route[0].toArray(), heading: herd.north.toArray(), zone: herd.zone, latitude: herd.latitude, shown: world.creatures!.shown(world.creatures!.herds.indexOf(herd)),
        season: world === home ? magicAt(herd.route[0].y, magicYear).season.id : seasonFor(herd.species.rule, herd.zone, herd.latitude, earthYear) }))
  },
  /** Each animal drawn on the nearest world, with the zone and the surface of its place, and true when its rule allows the place. */
  wildlifeAudit: () => nearestWorld.creatures?.audit() ?? [],
  /** F19: a happy loop of the friend. False when the last loop was less than 20 s before, and with reduced motion. */
  cheer: () => fairyFriend.cheer(reducedMotion.matches),
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
    fairyTrail.clear()
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
