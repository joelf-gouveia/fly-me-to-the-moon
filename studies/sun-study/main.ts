import './style.css'
import { createSunScene, HEIGHTS } from './scene'
import type { StudySettings } from './scene'
import {
  AIR_ALPHA, apparentWidth, BLOOM, budget, CAMERA_BOOST, coolerRatio, CORE, EARTH, edgeContrast, FLIGHT_FLOOR, fogOnSun, glowEdge, glowToday, GRANULE_LIFE, GRANULE_PART,
  LIMB_ALPHA, linear, luminance, megabytes, onScreen, OPTIONS, profile, PROMINENCES, REAL, relativeRate, rotationRate, SHELL_RADII, SPOTS, SUN_COLOR, SUN_OPTIONS, SUN_RADIUS,
  SUN_SPIN, sunlitCloud, toGame,
} from './model'
import type { SunHeight, SunOption, View } from './model'
import studyUrl from '../../docs/sun-study.md?url'

const viewNames: Record<View, string> = { space: 'From space', limb: 'At the edge', surface: 'In flight above it', meadow: 'From Earth’s meadow' }
const heightNames: Record<SunHeight, string> = { high: `High (${HEIGHTS.high}°)`, morning: `Morning (${HEIGHTS.morning}°)`, low: `Low (${HEIGHTS.low}°)` }
const number = (value: number, digits = 0) => value.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits })
const mb = (bytes: number) => bytes ? `${megabytes(bytes).toFixed(0)} MB` : 'None'
const percent = (value: number) => `${Math.round(value * 100)}%`

// Numbers for the findings.
const todayScreen = onScreen(linear(SUN_COLOR)), cloudScreen = onScreen(sunlitCloud())
const todayLuminance = luminance(linear(SUN_COLOR)), cloudLuminance = luminance(sunlitCloud())
const glowAtLimb = luminance(glowToday(1))
const fromEarth = EARTH.orbit - EARTH.radius
const width = { game: apparentWidth(fromEarth), real: apparentWidth(REAL.auKm, REAL.radiusKm) }
const umbra = coolerRatio(REAL.umbra), penumbra = coolerRatio(REAL.penumbra)
const days = { equator: 360 / rotationRate(0), poles: 360 / rotationRate(90) }
const limbAt = (r: number) => LIMB_ALPHA.map(alpha => Math.sqrt(1 - r * r) ** alpha)
const realEdgeRange = limbAt(0.99)
const PHONE_CANVAS = [780, 1688] as const

const about: Record<Exclude<SunOption, 'today'>, { far: string; near: string; earth: string; cost: string; work: string; risk: string }> = {
  retune: {
    far: 'A cream centre that goes gold at the edge, as in a picture with a solar filter. A glare that fades out with no edge.',
    near: 'Still one smooth surface. The fairy sees no detail and no motion under her.',
    earth: 'The Sun shows in the sky through the air, white by day and orange when it is low. The glare is the bright sky around it.',
    cost: 'One small shader and one glare shell. No texture. Two draw calls, as before.',
    work: 'Small: a material in src/worlds.ts, the glare in src/main.ts, two uniforms in updateEnvironment().',
    risk: 'The Sun is a clean star, not yet an interesting one.',
  },
  living: {
    far: 'The disc boils with granules. Sunspots with a dark core turn with the Sun. The corona has streamers; the edge has a thin red rim and prominences.',
    near: 'Granules 20 m wide under the fairy, a gold sky of corona, and prominence loops to fly under.',
    earth: 'As A. The corona and the prominences hide in the blue sky, as in the real sky.',
    cost: `Noise on the graphics card: ${budget('living').noise} cells or samples per pixel of the disc on a computer, ${budget('living', 0, 0, true).noise} on a phone. No texture, no download.`,
    work: 'Medium: the disc shader, the corona in the glare shell, one mesh of prominence loops, a phone version.',
    risk: 'When the Sun fills the screen, every pixel runs the noise. The phone version needs a test on a real phone.',
  },
  camera: {
    far: 'The Sun blooms into the frame, and coloured ghosts cross the screen when it is in view.',
    near: 'A strong bloom over the surface. The lens flare hides when the centre of the Sun is out of view.',
    earth: 'The bloom makes the Sun blinding in the sky. It also touches the brightest parts of the scene.',
    cost: `${mb(budget('camera').targets)} of render targets for a 1920 × 1080 canvas; ${budget('camera').passes} passes after the scene in every frame, also when the Sun is not in view.`,
    work: 'Large: an EffectComposer in src/main.ts, the tone mapping in the output pass, a new resize path.',
    risk: 'Every frame of the game pays for it. A lens flare is a fault of a camera, not a part of the Sun.',
  },
}

const viewRows: Record<View, Record<SunOption, string>> = {
  space: {
    today: 'A flat pale-beige disc and an orange glow with an edge at 2 radii.',
    retune: 'Cream centre, gold edge; a glare with no edge.',
    living: 'Granules, sunspots, corona streamers, a red rim and prominences at the edge.',
    camera: 'B, with bloom and lens flare ghosts.',
  },
  limb: {
    today: 'A curve of one colour against a flat glow.',
    retune: 'A curve that goes darker and redder at the edge.',
    living: 'A prominence loop on the edge, the red rim, the corona behind.',
    camera: 'B, with the bloom over the edge.',
  },
  surface: {
    today: 'A flat orange floor. No sense of height or speed.',
    retune: 'A smooth floor, darker toward the horizon.',
    living: 'Boiling granules, a gold sky and a prominence ahead.',
    camera: 'B, with a strong bloom.',
  },
  meadow: {
    today: 'No Sun. The fog and the air hide it.',
    retune: 'A white Sun in a blue sky; an orange Sun when it is low.',
    living: 'As A; granules show at close range only.',
    camera: 'A blinding Sun with bloom and ghosts.',
  },
}

document.querySelector<HTMLDivElement>('#sun-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>12</b> / THE SUN</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">THE STAR IN THE MIDDLE OF EVERY JOURNEY</p><h1>Here comes <em>the Sun.</em></h1></div>
      <p>The planets look like their pictures, but the Sun was one flat colour. Compare the Sun from before this study with three ways to make it look like our star: from space, at its edge, in flight above it and from Earth’s meadow.<br>The game now uses option B, the Living Sun. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive Sun study">
      <div class="preview-column">
        <div id="sun-view"><div class="split-tags" aria-hidden="true"><span class="tag" id="tag-left"></span><span class="tag" id="tag-right"></span></div>
          <div class="scene-top"><span class="tag">LIVE 3D · THE GAME WORLDS</span><span class="tag" id="mode-label"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help">Drag to look around · scroll to zoom</span></div>
        <div class="finder">
          <div class="finder-group wide"><p class="eyebrow">VIEW</p><div class="chips">${(Object.keys(viewNames) as View[]).map(view => `<button type="button" data-view="${view}" aria-pressed="false">${viewNames[view]}</button>`).join('')}<button type="button" id="reset-view">Reset view</button></div></div>
          <div class="finder-group"><p class="eyebrow">SUN HEIGHT AT THE MEADOW</p><div class="chips">${(Object.keys(heightNames) as SunHeight[]).map(height => `<button type="button" data-height="${height}" aria-pressed="false">${heightNames[height]}</button>`).join('')}</div></div>
          <div class="finder-group"><p class="eyebrow">COMPARE</p><div class="chips"><button type="button" id="split" aria-pressed="false">Side by side with before</button><button type="button" id="motion" aria-pressed="false">Motion</button><button type="button" id="phone" aria-pressed="false">Phone shader</button></div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${SUN_OPTIONS.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p id="option-line"></p>
        <p class="eyebrow section">01 / THE REAL SUN</p>
        <div class="strips" aria-label="Colours from the centre of the disc to 3 radii">
          <span>Before</span><i id="strip-today"></i><span>A · B</span><i id="strip-retune"></i><span>C</span><i id="strip-camera"></i><span>Real</span><i id="strip-real"></i>
        </div>
        <p class="strip-note">Each strip goes from the centre of the disc (left) to 3 radii (right). The limb is at one third. Real: a photograph with a solar filter.</p>
        <ul class="features">
          <li>The edge has ${percent(realEdgeRange[2])} to ${percent(realEdgeRange[0])} of the brightness of the centre, and it is redder.</li>
          <li>Granules ${number(REAL.granuleKm)} km wide live for several minutes.</li>
          <li>A sunspot core (${number(REAL.umbra)} K) has ${percent(umbra[1])} of the green light of the surface.</li>
          <li>Prominences are ${number(REAL.prominenceKm[0])} to ${number(REAL.prominenceKm[1])} km high.</li>
          <li>The equator turns in ${number(days.equator, 1)} days, the poles in ${number(days.poles, 1)}.</li>
          <li>The corona is a million times fainter than the disc. Only an eclipse shows it to the eye.</li>
        </ul>
        <div class="budget"><p class="eyebrow">02 / NUMBERS</p>
          <div class="meter-row"><span>Disc centre on the screen · before, A</span><output id="b-centre"></output></div>
          <div class="meter-row"><span>Edge ÷ centre on the screen · before, A</span><output>${percent(edgeContrast('today'))} · ${percent(edgeContrast('retune'))}</output></div>
          <div class="meter-row"><span>Sun ÷ sunlit cloud, before tone mapping · before, A</span><output>${(todayLuminance / cloudLuminance).toFixed(2)} · ${(luminance(CORE) / cloudLuminance).toFixed(2)}</output></div>
          <div class="meter-row"><span>Width from Earth · game, real</span><output>${width.game.toFixed(1)}° · ${width.real.toFixed(2)}°</output></div>
          <div class="meter-row"><span>This view · width of the Sun, distance</span><output id="b-view"></output></div>
          <div class="meter-row measured"><span>This preview now · draw calls, triangles</span><output id="b-measured"></output></div>
          <div class="meter-row"><span>Frame time in this view, ms</span><output id="b-frame">not measured</output></div>
          <button type="button" id="measure">Measure the four options</button>
        </div>
      </aside>
    </section>

    <section class="findings" aria-labelledby="findings-title"><div class="section-title"><p class="eyebrow">03 / WHY THE SUN LOOKED FLAT</p><h2 id="findings-title">Six causes. Colour is not one of them.</h2></div>
      <div class="finding-grid">
        <article><span>01</span><h3>One colour, edge to edge</h3><p>The Sun was a <code>MeshBasicMaterial</code> of <code>0x${SUN_COLOR.toString(16)}</code>. Each pixel of the disc got the same colour, ${todayScreen} on the screen. A real disc is darker and redder at the edge: ${percent(realEdgeRange[0])} of the red light and ${percent(realEdgeRange[2])} of the blue light of the centre. Without this, a sphere looks like a flat circle.</p></article>
        <article><span>02</span><h3>Dimmer than a cloud</h3><p>Before tone mapping the disc had a luminance of ${todayLuminance.toFixed(2)}. A white cloud in full sunlight has ${cloudLuminance.toFixed(2)}. On the screen the Sun was ${todayScreen}, the cloud ${cloudScreen}. The Sun was not the brightest thing in its own sky.</p></article>
        <article><span>03</span><h3>A glow with an edge</h3><p>The glow was one sprite that faded in a straight line and stopped at ${glowEdge().toFixed(2)} radii. At the limb it added only ${glowAtLimb.toFixed(2)} of light, mostly red. The end of the fade showed as a soft ring. Real glare falls off as a power of the distance and has no edge.</p></article>
        <article><span>04</span><h3>Hidden from the meadow</h3><p>From the meadow the Sun is ${number(fromEarth)} m away. The fog replaced ${percent(fogOnSun())} of its colour, and the air shell of Earth covered it with up to ${percent(AIR_ALPHA)} of sky. The Sun that made the day was not in the day sky. The Moon study found the same.</p></article>
        <article><span>05</span><h3>Nothing moves</h3><p>Every planet turns. The Sun did not turn and had no surface detail, no sunspots, no corona and no prominences. It was the only still body in a moving Solar System.</p></article>
        <article><span>06</span><h3>A flat floor up close</h3><p>The fairy can fly ${FLIGHT_FLOOR} m above the Sun. Its ${number(SUN_RADIUS)} m radius makes a real granule ${toGame(REAL.granuleKm).toFixed(1)} m wide, but the surface had none. With one colour under her, the player saw no height and no speed.</p></article>
      </div>
    </section>

    <section class="option-cards" aria-labelledby="options-title"><div class="section-title"><p class="eyebrow">04 / THREE OPTIONS</p><h2 id="options-title">Retune, bring to life, or film it.</h2></div>
      <div class="cards">${(['retune', 'living', 'camera'] as const).map(option => `<article data-card="${option}"><p class="letter">${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3><p class="line">${OPTIONS[option].line}</p>
        <dl><dt>From far away</dt><dd>${about[option].far}</dd><dt>Close by</dt><dd>${about[option].near}</dd><dt>From Earth</dt><dd>${about[option].earth}</dd><dt>Cost</dt><dd>${about[option].cost}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        <button type="button" data-show="${option}">Show option ${OPTIONS[option].letter}</button></article>`).join('')}</div>
      <div class="table-wrap"><table><caption>What each view shows. B includes A; C includes B.</caption>
        <thead><tr><th scope="col">View</th>${SUN_OPTIONS.map(option => `<th scope="col">${option === 'today' ? 'Before' : `${OPTIONS[option].letter} · ${OPTIONS[option].name}`}</th>`).join('')}</tr></thead>
        <tbody>${(Object.keys(viewNames) as View[]).map(view => `<tr><th scope="row">${viewNames[view]}</th>${SUN_OPTIONS.map(option => `<td>${viewRows[view][option]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="table-wrap"><table class="numbers"><caption>Cost of the Sun. A computer canvas of 1920 × 1080, a phone canvas of ${PHONE_CANVAS.join(' × ')} device pixels.</caption>
        <thead><tr><th scope="col">Measure</th>${SUN_OPTIONS.map(option => `<th scope="col">${option === 'today' ? 'Before' : `${OPTIONS[option].letter} · ${OPTIONS[option].name}`}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Draw calls of the Sun</th>${SUN_OPTIONS.map(option => `<td>${budget(option).calls}</td>`).join('')}</tr>
          <tr><th scope="row">Triangles</th>${SUN_OPTIONS.map(option => `<td>${number(budget(option).triangles)}</td>`).join('')}</tr>
          <tr><th scope="row">Noise per disc pixel · computer, phone</th>${SUN_OPTIONS.map(option => `<td>${budget(option).noise ? `${budget(option).noise} · ${budget(option, 0, 0, true).noise}` : 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Passes after the scene</th>${SUN_OPTIONS.map(option => `<td>${budget(option).passes || 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Render targets · computer</th>${SUN_OPTIONS.map(option => `<td>${mb(budget(option).targets)}</td>`).join('')}</tr>
          <tr><th scope="row">Render targets · phone</th>${SUN_OPTIONS.map(option => `<td>${mb(budget(option, ...PHONE_CANVAS, true).targets)}</td>`).join('')}</tr>
          <tr><th scope="row">Textures</th>${SUN_OPTIONS.map(option => `<td>${budget(option).textures || 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Frame time, this view (measured)</th>${SUN_OPTIONS.map(option => `<td data-frame="${option}">–</td>`).join('')}</tr>
        </tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">05 / IN THE GAME NOW</p><h2>B, the<br>Living Sun.</h2>
      <p>The game now has option B, with every part of A. A fixes four of the six causes at no cost; B gives the Sun the life of the other worlds, with no texture and no download. C is not in the game: it costs every frame for an effect of a camera. The look is in <code>src/sun-look.ts</code> and <code>src/sun-paint.ts</code>; this study uses the same code.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>Real light on the disc</h3><p>A shader on the Sun sphere: ${CORE.join(', ')} in linear light at the centre, times μ to the power ${LIMB_ALPHA.map(alpha => alpha.toFixed(2)).join(', ')} for red, green and blue.</p></div></article>
        <article><span>02</span><div><h3>A glare with no edge</h3><p>A shell of ${SHELL_RADII} radii replaces the sprite. It finds the nearest point of each view ray to the Sun, and adds a tight halo and a power law.</p></div></article>
        <article><span>03</span><div><h3>The Sun in the sky of Earth</h3><p>No fog on the Sun, and the Sun draws after the air shells. <code>updateEnvironment()</code> gives it the colour of the sunlight there; the corona and the prominences fade in the air.</p></div></article>
        <article><span>04</span><div><h3>A living surface</h3><p>Granules of 1/${Math.round(1 / GRANULE_PART)} radius that form again every ${GRANULE_LIFE} s, ${SPOTS.length} sunspots in the belts of activity, faculae near the limb, and a turn of ${SUN_SPIN} s at the equator and ${Math.round(SUN_SPIN / relativeRate(90))} s at the poles.</p></div></article>
        <article><span>05</span><div><h3>Corona and prominences</h3><p>Streamers near the equator and plumes at the poles in the glare shell. ${PROMINENCES.length} prominence loops, ${Math.round(toGame(REAL.prominenceKm[0]))} to ${Math.round(Math.max(...PROMINENCES.map(loop => loop.height)) * SUN_RADIUS)} m high, in one mesh. The fairy can fly through them.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">DECISION</p><h3>How large from Earth?</h3><p>The Sun is ${width.game.toFixed(1)}° wide from the meadow; the real Sun is ${width.real.toFixed(2)}°. The proportions study chose this size. This study does not change it.</p></article>
      <article><p class="eyebrow">DECISION</p><h3>A corona in an eclipse?</h3><p>From Earth the blue sky hides the corona. When the Moon covers the Sun, the game could show it, as the real sky does. This is a later step.</p></article>
      <article><p class="eyebrow">OUT OF SCOPE</p><h3>Flares and eruptions</h3><p>Flares and mass ejections are events, not a look. They need a design for play first.</p></article></section>
    <section class="credits"><p class="eyebrow">SOURCES</p>
      <p>Radius, temperature, rotation and chromosphere: <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html">NASA Sun fact sheet</a>. Limb darkening: D. Hestroffer and C. Magnan, <a href="https://www.physics.hmc.edu/faculty/esin/a101/limbdarkening.pdf">Wavelength dependency of the Solar limb darkening</a>, A&amp;A 333 (1998), from the data of Pierce and Slaughter (1977) and Neckel and Labs (1994). Granules: <a href="https://lco.global/spacebook/solar-system/sun/">Las Cumbres Observatory</a>. Sunspot temperatures: <a href="https://solar.physics.montana.edu/YPOP/Spotlight/SunInfo/Sunspots.html">Montana State University</a>. Prominences: <a href="https://en.wikipedia.org/wiki/Solar_prominence">Solar prominence</a>. Corona: <a href="https://www.britannica.com/place/Sun/Corona">Britannica</a>. Pictures of the Sun today: <a href="https://sdo.gsfc.nasa.gov/data/">NASA Solar Dynamics Observatory</a>. Noise: webgl-noise by Ian McEwan and Stefan Gustavson (Ashima Arts), MIT license; hash by Dave Hoskins, MIT license.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 12</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const settings: StudySettings = { option: 'living', view: 'space', height: 'morning', split: false, motion: !reducedMotion, phone: false }
const view = createSunScene(element('#sun-view'))
let frameTimes: Partial<Record<SunOption, number>> & { view?: View } = {}

function captionNote() {
  if (settings.view === 'meadow') return settings.option === 'today'
    ? 'Before this study, the fog and the air of Earth hid the Sun. The day had light, but no Sun in the sky.'
    : `The Sun ${HEIGHTS[settings.height]}° high, through the air of Earth. ${settings.height === 'low' ? 'A low Sun is orange and dimmer.' : 'The blue sky hides the corona, as in the real sky.'}`
  if (settings.view === 'surface') return `The fairy 40 m above the Sun, flying toward a prominence. ${settings.option === 'today' ? 'Before this study, the surface was one colour.' : settings.option === 'retune' ? 'The edge is darker, but the floor is smooth.' : 'Each cell is a granule, about 20 m wide.'}`
  if (settings.view === 'limb') return 'The limb, 1.5 radii from the centre. A real limb is darker and redder, with a thin red chromosphere and prominences.'
  return `4.4 radii from the centre, from the side of Earth. ${OPTIONS[settings.option].line}`
}

function render() {
  view.apply(settings)
  const option = OPTIONS[settings.option]
  all<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === settings.option)))
  all<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === settings.view)))
  all<HTMLButtonElement>('[data-height]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.height === settings.height))
    button.disabled = settings.view !== 'meadow'
  })
  all<HTMLElement>('[data-card]').forEach(card => card.classList.toggle('selected', card.dataset.card === settings.option))
  element('#split').setAttribute('aria-pressed', String(settings.split))
  element<HTMLButtonElement>('#split').disabled = settings.option === 'today'
  element('#motion').setAttribute('aria-pressed', String(settings.motion))
  element('#phone').setAttribute('aria-pressed', String(settings.phone))
  const split = settings.split && settings.option !== 'today'
  element('.split-tags').classList.toggle('on', split)
  element('#tag-left').textContent = 'BEFORE'
  element('#tag-right').textContent = `${option.letter} · ${option.name.toUpperCase()}`
  element('#mode-label').textContent = settings.option === 'today' ? 'BEFORE' : `OPTION ${option.letter} · ${option.name.toUpperCase()}${settings.phone && settings.option !== 'retune' ? ' · PHONE' : ''}`
  element('#caption-kicker').textContent = `THE SUN · ${viewNames[settings.view].toUpperCase()}`
  element('#caption-title').textContent = split ? `Before and ${option.name}` : option.name
  element('#caption-note').textContent = captionNote()
  element('#option-line').textContent = option.line
  const gradient = (colors: string[]) => `linear-gradient(90deg, ${colors.join(', ')})`
  element('#strip-today').style.background = gradient(profile('today'))
  element('#strip-retune').style.background = gradient(profile('retune'))
  element('#strip-camera').style.background = gradient(profile('camera'))
  element('#strip-real').style.background = gradient(profile('real'))
  element('#b-centre').innerHTML = `<i class="swatch" style="background:${todayScreen}"></i>${todayScreen} · <i class="swatch" style="background:${onScreen(CORE)}"></i>${onScreen(CORE)}`
  tick()
}

function tick() {
  const stats = view.stats
  element('#b-view').textContent = `${stats.width}° · ${stats.distance} radii`
  element('#b-measured').textContent = `${stats.calls} · ${number(stats.triangles)}`
  const measured = frameTimes.view === settings.view ? frameTimes[settings.option] : undefined
  element('#b-frame').textContent = measured === undefined ? 'not measured' : `${measured.toFixed(1)} ms at ${stats.canvas.join(' × ')}`
}
setInterval(tick, 500)

function measure() {
  const button = element<HTMLButtonElement>('#measure')
  button.disabled = true
  button.textContent = 'Measuring…'
  // Let the page paint the label first: the measure blocks the page for about a second.
  setTimeout(() => {
    frameTimes = { ...view.measure(30), view: settings.view }
    for (const option of SUN_OPTIONS) element(`[data-frame="${option}"]`).textContent = `${frameTimes[option]!.toFixed(1)} ms · ${viewNames[settings.view]}`
    button.disabled = false
    button.textContent = 'Measure the four options'
    tick()
  }, 50)
}

all<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { settings.option = button.dataset.option as SunOption; render() }))
all<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { settings.view = button.dataset.view as View; render() }))
all<HTMLButtonElement>('[data-height]').forEach(button => button.addEventListener('click', () => { settings.height = button.dataset.height as SunHeight; render() }))
all<HTMLButtonElement>('[data-show]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.show as SunOption
  render()
  element('#sun-view').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
}))
element('#split').addEventListener('click', () => { settings.split = !settings.split; render() })
element('#motion').addEventListener('click', () => { settings.motion = !settings.motion; render() })
element('#phone').addEventListener('click', () => { settings.phone = !settings.phone; render() })
element('#reset-view').addEventListener('click', () => view.resetView())
element('#measure').addEventListener('click', measure)

element('#export').addEventListener('click', () => {
  const payload = {
    study: 'sun', version: 1, status: 'option-b-in-game', settings,
    today: { color: `#${SUN_COLOR.toString(16)}`, onScreen: todayScreen, luminance: +todayLuminance.toFixed(3), glowEdgeRadii: +glowEdge().toFixed(2), glowAtLimb: +glowAtLimb.toFixed(3), fogFromMeadow: +fogOnSun().toFixed(4), airAlpha: AIR_ALPHA },
    sunlitCloud: { onScreen: cloudScreen, luminance: +cloudLuminance.toFixed(3) },
    real: { ...REAL, limbExponents: LIMB_ALPHA.map(alpha => +alpha.toFixed(3)), edgeAt099: realEdgeRange.map(value => +value.toFixed(3)), umbra: umbra.map(value => +value.toFixed(3)), penumbra: penumbra.map(value => +value.toFixed(3)), rotationDays: { equator: +days.equator.toFixed(2), poles: +days.poles.toFixed(2) } },
    widthFromEarth: { game: +width.game.toFixed(2), real: +width.real.toFixed(3) },
    proposal: { core: CORE, cameraBoost: CAMERA_BOOST, bloom: BLOOM, spin: SUN_SPIN, granulePart: GRANULE_PART, granuleLife: GRANULE_LIFE, spots: SPOTS, prominences: PROMINENCES },
    budgets: Object.fromEntries(SUN_OPTIONS.map(option => [option, { computer: budget(option), phone: budget(option, ...PHONE_CANVAS, true) }])),
    frameTimes, stats: view.stats,
    recommendation: 'Option A (limb darkening, a brighter core, a glare with no edge, the Sun in the sky of Earth), then option B with its phone shader. Keep option C out of the game. The game now uses option B.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'sun-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__sunStudy', { value: {
  settings: () => ({ ...settings }), stats: () => view.stats,
  apply: (next: Partial<StudySettings>) => { Object.assign(settings, next); render() },
  probe: () => view.probe(),
  measure: (frames = 20) => { frameTimes = { ...view.measure(frames), view: settings.view }; return frameTimes },
} })
