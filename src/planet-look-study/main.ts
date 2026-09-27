import './style.css'
import { createTerrain } from '../terrain'
import { HALO_THIN } from '../planet-look'
import { createPlanetScene } from './scene'
import type { StudySettings } from './scene'
import {
  BASE_PROPORTIONS, BAKE_SIZE, budget, dayNightContrast, inGame, farSideShadows, GAS_GIANTS, HEMISPHERE_IN_SPACE, LOOK_OPTIONS, megabytes, OPTIONS, PLANET_IDS, PLANETS,
  referenceMeasure, RELOCATION_RING_LIMIT, retuneMeasure, retuneRange, RING_SPAN, ROCKY_RELIEF, SPACE_LIGHT, todayMeasure, todayRange, todayRingTilt,
} from './model'
import type { LookOption, PlanetId, View } from './model'
import studyUrl from '../../docs/planet-look-study.md?url'

const viewNames: Record<View, string> = { portrait: 'Portrait', approach: 'Approach', flight: 'In flight' }
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`
const mb = (bytes: number) => `${megabytes(bytes).toFixed(1)} MB`
const number = (value: number) => value.toLocaleString('en')
const percent = (value: number) => `${Math.round(value * 100)}%`
/** Far-side shadows before the proportions change, and now. */
const shadows = { before: farSideShadows(BASE_PROPORTIONS), now: farSideShadows() }
const name = (id: string) => PLANETS[id as PlanetId]?.name ?? id[0].toUpperCase() + id.slice(1)

/** Largest relief of a rocky world in the game terrain, as a part of its radius. */
function relief(id: 'mercury' | 'mars') {
  const sample = createTerrain(id, 1)
  let high = -Infinity, low = Infinity
  for (let i = 0; i < 4000; i++) {
    const y = 1 - (i + 0.5) / 2000, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996
    const height = sample(r * Math.cos(a), y, r * Math.sin(a)).height
    high = Math.max(high, height); low = Math.min(low, height)
  }
  return { range: high - low, part: (high - low) / inGame(id).radius }
}
const reliefs = { mercury: relief('mercury'), mars: relief('mars') }

// Per option: what it shows from far away and close by, and its cost.
const about: Record<Exclude<LookOption, 'today'>, { far: string; near: string; cost: string; work: string; risk: string }> = {
  retune: {
    far: 'Clean discs with a dark night side, a thin air rim and no flakes. Two colours per giant. Saturn’s rings sit on its equator.',
    near: 'The same stripes as before, in better colours. Mercury and Mars still have one colour each.',
    cost: `The same as before: four ${512}×${256} decks made on the processor.`,
    work: 'Small: numbers in src/worlds.ts and src/main.ts, the shadow test, one flat deck for Venus.',
    risk: 'No Great Red Spot, no ice caps, no hexagon. The planets are cleaner, not yet interesting.',
  },
  paint: {
    far: 'Each planet has the features of its pictures: the Great Red Spot, Saturn’s hexagon and ring gaps, Mars ice caps, Neptune’s dark spot and white streaks.',
    near: `A ${BAKE_SIZE.desktop.join(' × ')} map is sharp to the limb. In the air the fog still decides the look.`,
    cost: `${mb(budget('paint').memory)} of textures on a computer, ${mb(budget('paint', true).memory)} on a phone. No download. The graphics card paints a map in milliseconds.`,
    work: 'Medium: one recipe per planet, a bake function, a ring texture, two vertex-colour painters.',
    risk: 'The recipes are hand-made. Each needs an art review against its pictures.',
  },
  photo: {
    far: 'The planets look like the spacecraft pictures, because they are made from them.',
    near: 'Real craters on Mercury and Mars that do not match the hills of the game terrain.',
    cost: `${mb(budget('photo').download)} to download and ${mb(budget('photo').memory)} of textures.`,
    work: 'Small: load seven maps, one ring map, and show the CC BY 4.0 credit.',
    risk: 'The same planet at each visit, a photo look beside a storybook Earth, and a licence credit to keep.',
  },
}

const retuneRow: Record<PlanetId, string> = {
  mercury: 'A cooler grey with more contrast. A rounder outline.',
  venus: 'A closed deck in one cream colour. No swirls.',
  mars: 'Rust red, not pink-brown. No dark regions, no ice caps.',
  jupiter: '22 bands in cream and orange. No Great Red Spot.',
  saturn: '26 soft bands. Rings on the equator, lit by the Sun, tilted 26.7°.',
  uranus: 'Six faint cyan bands. Tilted 98°.',
  neptune: 'Nine bands of azure and deep blue. No spots.',
}
const paintRow: Record<PlanetId, string> = {
  mercury: 'Dark blue-grey plains and four bright ray craters.',
  venus: 'A cream-gold deck with soft swirls and a sideways Y.',
  mars: 'Dark basalt regions, bright dust, ice caps and a long canyon.',
  jupiter: 'Zones and belts from the pictures, blue-grey festoons, white ovals and the Great Red Spot.',
  saturn: 'Butterscotch bands, the polar hexagon, rings with the Cassini gap, and the ring shadow on the planet.',
  uranus: 'Pale cyan with a bright polar cap and nine thin rings.',
  neptune: 'Azure bands, the Great Dark Spot and white streaks.',
}
const photoRow: Record<PlanetId, string> = {
  mercury: 'Real craters and rays, on hills that do not match them.',
  venus: 'Soft swirls in one colour.',
  mars: 'The real dark regions, volcanoes, canyon and caps.',
  jupiter: 'The real belts and the Great Red Spot.',
  saturn: 'Smooth bands. Rings from the ring map.',
  uranus: 'Almost plain cyan. Rings from option B.',
  neptune: 'Deep blue and the Great Dark Spot.',
}

document.querySelector<HTMLDivElement>('#planet-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>11</b> / THE PLANETS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">EARTH AND BLOSSOM HAVEN STAY AS THEY ARE</p><h1>Worlds worth <em>the trip.</em></h1></div>
      <p>Seven planets, four looks. Compare the planets from before this study with three ways to give them the colours and features of their pictures, from far away, close by and in flight.<br>The game now uses option B, with rounder rocky worlds. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive planet study">
      <div class="preview-column">
        <div id="planet-view"><div class="split-tags" aria-hidden="true"><span class="tag" id="tag-left"></span><span class="tag" id="tag-right"></span></div>
          <div class="scene-top"><span class="tag">LIVE 3D · THE GAME PLANETS</span><span class="tag" id="mode-label"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help">Drag to turn · scroll or pinch to zoom</span></div>
        <div class="finder">
          <div class="finder-group wide"><p class="eyebrow">PLANET</p><div class="chips">${PLANET_IDS.map(id => `<button type="button" data-planet="${id}" aria-pressed="false"><i class="dot" style="background:${hex(PLANETS[id].reference.mean)}"></i>${PLANETS[id].name}</button>`).join('')}</div></div>
          <div class="finder-group"><p class="eyebrow">VIEW</p><div class="chips">${(Object.keys(viewNames) as View[]).map(view => `<button type="button" data-view="${view}" aria-pressed="false">${viewNames[view]}</button>`).join('')}<button type="button" id="reset-view">Reset view</button></div></div>
          <div class="finder-group"><p class="eyebrow">COMPARE</p><div class="chips"><button type="button" id="split" aria-pressed="false">Side by side with before</button><button type="button" id="spin" aria-pressed="false">Turn the planet</button></div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${LOOK_OPTIONS.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p id="option-line"></p>
        <p class="eyebrow section">01 / THE PICTURES</p>
        <figure class="reference"><img id="reference-map" alt="" width="2048" height="1024" /><figcaption id="reference-caption"></figcaption></figure>
        <div class="strips" aria-label="Colours from the darkest to the lightest"><span>Before</span><i id="strip-today"></i><span>A</span><i id="strip-retune"></i><span>Pictures</span><i id="strip-reference"></i></div>
        <ul class="features" id="features"></ul>
        <div class="budget"><p class="eyebrow">02 / NUMBERS FOR THIS PLANET</p>
          <div class="meter-row"><span>Band contrast (lightness range) · before, A, pictures</span><output id="b-range"></output></div>
          <div class="meter-row"><span>Strongest colour (chroma) · before, A, pictures</span><output id="b-chroma"></output></div>
          <div class="meter-row"><span>Day side ÷ night side from far away</span><output id="b-contrast"></output></div>
          <div class="meter-row"><span>Axial tilt</span><output id="b-tilt"></output></div>
          <div class="meter-row"><span>Texture memory of this planet</span><output id="b-memory"></output></div>
          <div class="meter-row"><span>Time to build this look</span><output id="b-build"></output></div>
          <div class="meter-row measured"><span>This preview now · draw calls, triangles</span><output id="b-measured"></output></div>
        </div>
      </aside>
    </section>

    <section class="findings" aria-labelledby="findings-title"><div class="section-title"><p class="eyebrow">03 / WHY THE PLANETS LOOKED DULL</p><h2 id="findings-title">Six causes. Colour is only one.</h2></div>
      <div class="finding-grid">
        <article><span>01</span><h3>Half the contrast, one hue</h3><p><code>buildGasDeck()</code> makes 30 stripes of one hue at 0.5 to 0.8 of the planet colour. Jupiter’s bands have a lightness range of ${todayMeasure('jupiter').range.toFixed(2)}; its pictures have ${referenceMeasure('jupiter').range.toFixed(2)}, with white zones and orange belts. Neptune’s strongest chroma is ${todayMeasure('neptune').chroma.toFixed(3)}; its pictures have ${referenceMeasure('neptune').chroma.toFixed(3)}. Uranus shows almost no stripes in its pictures.</p></article>
        <article><span>02</span><h3>A lit night side</h3><p>In space the hemisphere light is ${HEMISPHERE_IN_SPACE} and the Sun is 2.4. The day side gets only ${dayNightContrast().toFixed(1)} times the light of the night side, so no planet has a real terminator. The night side also gets the olive ground colour of Earth’s meadows (<code>0x65794e</code>).</p></article>
        <article><span>03</span><h3>Flakes on every giant</h3><p>1,500 cloud puffs in the deck colour at 65% opacity sit at the cloud height of each giant and Venus. From far away they are flakes on the disc and outside its edge. Venus shows its brown ground between them.</p></article>
        <article><span>04</span><h3>A thick halo</h3><p>The air shell becomes almost opaque over two scale heights. Jupiter’s shell is ${inGame('jupiter').atmosphere} m on a radius of ${inGame('jupiter').radius} m, so a cream band surrounds the disc. The pictures show a thin rim.</p></article>
        <article><span>05</span><h3>Shadows from behind the Sun</h3><p><code>sunShadow()</code> tests the line to the Sun, not its length. With the old proportions, ${shadows.before.map(pair => `${name(pair.occluder)} shadowed ${name(pair.target)}`).join(' and ')} from the far side of the Sun, at all times. With the proportions of today ${shadows.now.length ? shadows.now.map(pair => `${name(pair.occluder)} shadows ${name(pair.target)}`).join(' and ') : 'no planet pair does'}, but Blossom Haven can after a move.</p></article>
        <article><span>06</span><h3>Rings off the equator, potato worlds</h3><p>Saturn’s rings were ${todayRingTilt().toFixed(1)}° off its equator and wobbled as it turned; the Sun did not light them. Mercury’s relief was ${reliefs.mercury.range.toFixed(0)} m on a radius of ${inGame('mercury').radius} m (${percent(reliefs.mercury.part)}), so its outline was lumpy.</p></article>
      </div>
    </section>

    <section class="option-cards" aria-labelledby="options-title"><div class="section-title"><p class="eyebrow">04 / THREE OPTIONS</p><h2 id="options-title">Retune, paint, or photograph.</h2></div>
      <div class="cards">${(['retune', 'paint', 'photo'] as const).map(option => `<article data-card="${option}"><p class="letter">${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3><p class="line">${OPTIONS[option].line}</p>
        <dl><dt>From far away</dt><dd>${about[option].far}</dd><dt>Close by</dt><dd>${about[option].near}</dd><dt>Cost</dt><dd>${about[option].cost}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        <button type="button" data-show="${option}">Show option ${OPTIONS[option].letter}</button></article>`).join('')}</div>
      <div class="table-wrap"><table><caption>What each planet shows. Options B and C include every fix of A.</caption>
        <thead><tr><th scope="col">Planet</th><th scope="col">Before</th><th scope="col">A · Retune</th><th scope="col">B · Storybook paint</th><th scope="col">C · Photo maps</th></tr></thead>
        <tbody>${PLANET_IDS.map(id => `<tr><th scope="row">${PLANETS[id].name}</th><td>${PLANETS[id].today}</td><td>${retuneRow[id]}</td><td>${paintRow[id]}</td><td>${photoRow[id]}</td></tr>`).join('')}</tbody></table></div>
      <div class="table-wrap"><table class="numbers"><caption>Cost of the seven planets. Texture memory counts mipmaps.</caption>
        <thead><tr><th scope="col">Measure</th>${LOOK_OPTIONS.map(option => `<th scope="col">${option === 'today' ? '' : `${OPTIONS[option].letter} · `}${OPTIONS[option].name}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Planets with a texture</th>${LOOK_OPTIONS.map(option => `<td>${budget(option).planets}</td>`).join('')}</tr>
          <tr><th scope="row">Texture size</th>${LOOK_OPTIONS.map(option => `<td>${budget(option).width} × ${budget(option).height}</td>`).join('')}</tr>
          <tr><th scope="row">Texture memory · computer</th>${LOOK_OPTIONS.map(option => `<td>${mb(budget(option).memory)}</td>`).join('')}</tr>
          <tr><th scope="row">Texture memory · phone</th>${LOOK_OPTIONS.map(option => `<td>${mb(budget(option, true).memory)}</td>`).join('')}</tr>
          <tr><th scope="row">Download</th>${LOOK_OPTIONS.map(option => `<td>${budget(option).download ? mb(budget(option).download) : 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Pixels made on the processor</th>${LOOK_OPTIONS.map(option => `<td>${number(budget(option).cpuPixels)}</td>`).join('')}</tr>
          <tr><th scope="row">Saturn ring draw calls</th>${LOOK_OPTIONS.map(option => `<td>${budget(option).ringCalls === 2 ? '1 (+1 Uranus)' : budget(option).ringCalls}</td>`).join('')}</tr>
        </tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">05 / IN THE GAME NOW</p><h2>The fixes of A,<br>then the paint of B.</h2>
      <p>The game now has option B and every fix of option A. Earth, the Moon, the dwarf worlds and Blossom Haven keep their look. The recipes and the light rules are in <code>src/planet-look.ts</code> and <code>src/planet-paint.ts</code>; this study uses the same code.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>No shadows from behind the Sun</h3><p><code>sunShadow()</code> skips an occluder when <code>along</code> is longer than the distance to the Sun.</p></div></article>
        <article><span>02</span><div><h3>A dark night side from far away</h3><p><code>updatePlanetLooks()</code> scales the hemisphere light on the planet materials to ${SPACE_LIGHT} in space and to 1 in the air. The day side gets ${dayNightContrast(SPACE_LIGHT).toFixed(0)} times the light of the night side.</p></div></article>
        <article><span>03</span><div><h3>A thin air rim, no flakes</h3><p>The air shader multiplies its depth by ${HALO_THIN} from far away. The cloud puffs of the seven planets show only inside their air. Inside the air the sky stays as before.</p></div></article>
        <article><span>04</span><div><h3>Real tilts, rings on the equator</h3><p>Each planet has its real axial tilt. Saturn’s rings sit in its equator plane with the gaps of the pictures (${RING_SPAN.inner} to ${RING_SPAN.outer} radii, inside the ${RELOCATION_RING_LIMIT} radii of relocation). Uranus has thin rings; relocation keeps them clear.</p></div></article>
        <article><span>05</span><div><h3>Painted maps and rounder worlds</h3><p>The graphics card paints the giants and the cloud deck of Venus: ${BAKE_SIZE.desktop.join(' × ')} on a computer, ${BAKE_SIZE.phone.join(' × ')} on a phone. Mars and Mercury get painted vertex colours and half their relief (×${ROCKY_RELIEF}), in flight too.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">IN THE GAME</p><h3>B, Storybook paint</h3><p>Every feature that a child knows from the pictures, in the storybook style of Earth and Blossom Haven. No download and no licence. A new visit to a giant gives new storms, as other worlds get a new landscape.</p></article>
      <article><p class="eyebrow">DECIDED</p><h3>Rounder rocky worlds</h3><p>Mercury and Mars have half their relief (×${ROCKY_RELIEF}). The flight ground uses the same terrain, so the hills are lower in flight too.</p></article>
      <article><p class="eyebrow">OUT OF SCOPE</p><h3>The sky in flight</h3><p>Inside the air the fog and the sky colour decide the look; the maps change it little. A study of the sky of each planet is a separate step.</p></article></section>
    <section class="credits"><p class="eyebrow">SOURCES</p>
      <p>Option C and the reference maps: <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> planet textures, based on NASA mission data, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. The measured band colours come from these maps. Ring radii and axial tilts: NASA planetary fact sheets. Noise for the painted maps: webgl-noise by Ian McEwan and Stefan Gustavson (Ashima Arts), MIT license. Chroma and lightness: the OKLab colour space of Björn Ottosson.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 11</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const settings: StudySettings = { planet: 'jupiter', option: 'paint', view: 'portrait', split: false, spin: !reducedMotion }
const view = createPlanetScene(element('#planet-view'), () => render())

function captionNote() {
  const planet = PLANETS[settings.planet]
  if (settings.view === 'flight') return `In flight ${planet.gas ? 'above the cloud puffs' : settings.planet === 'venus' ? 'under the cloud deck' : 'above the ground'}, with the Sun 33° high. Inside the air the fog decides most of the look. Drag to look around.`
  if (settings.option === 'today') return planet.today
  if (settings.option === 'retune') return `New numbers only: ${planet.retune.bands ? `${planet.retune.bands} bands in two colours, ` : ''}a dark night side, a thin rim of air and a tilt of ${planet.obliquity}°.`
  return `${settings.option === 'paint' ? 'Painted from the pictures' : 'The spacecraft map'}. ${planet.features.slice(0, 3).join(' · ')}.`
}

function render() {
  view.apply(settings)
  const planet = PLANETS[settings.planet], option = OPTIONS[settings.option]
  all<HTMLButtonElement>('[data-planet]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.planet === settings.planet)))
  all<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === settings.option)))
  all<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === settings.view)))
  all<HTMLElement>('[data-card]').forEach(card => card.classList.toggle('selected', card.dataset.card === settings.option))
  element('#split').setAttribute('aria-pressed', String(settings.split))
  element<HTMLButtonElement>('#split').disabled = settings.option === 'today'
  element('#spin').setAttribute('aria-pressed', String(settings.spin))
  const split = settings.split && settings.option !== 'today'
  element('.split-tags').classList.toggle('on', split)
  element('#tag-left').textContent = 'BEFORE'
  element('#tag-right').textContent = `${option.letter} · ${option.name.toUpperCase()}`
  element('#mode-label').textContent = settings.option === 'today' ? 'BEFORE' : `OPTION ${option.letter} · ${option.name.toUpperCase()}`
  element('#caption-kicker').textContent = `${planet.name.toUpperCase()} · ${viewNames[settings.view].toUpperCase()}`
  element('#caption-title').textContent = split ? `Before and ${option.name}` : settings.option === 'today' ? 'Before' : option.name
  element('#caption-note').textContent = captionNote()
  element('#option-line').textContent = option.line
  const map = element<HTMLImageElement>('#reference-map')
  if (!map.src.endsWith(planet.map)) { map.src = `/planets/ssc/${planet.map}`; map.alt = `Flat map of ${planet.name} from spacecraft pictures` }
  element('#reference-caption').textContent = `${planet.name}: Solar System Scope map, CC BY 4.0. The strip below shows its 18 measured bands, north to south.`
  const gradient = (colors: number[]) => `linear-gradient(90deg, ${colors.map(hex).join(', ')})`
  element('#strip-today').style.background = gradient(todayRange(settings.planet))
  element('#strip-retune').style.background = gradient(retuneRange(settings.planet))
  element('#strip-reference').style.background = `linear-gradient(90deg, ${planet.reference.bands.map(color => `${hex(color)}`).join(', ')})`
  element('#features').innerHTML = planet.features.map(feature => `<li>${feature}</li>`).join('')
  const measures = [todayMeasure(settings.planet), retuneMeasure(settings.planet), referenceMeasure(settings.planet)]
  element('#b-range').textContent = measures.map(value => value.range.toFixed(2)).join(' · ')
  element('#b-chroma').textContent = measures.map(value => value.chroma.toFixed(3)).join(' · ')
  element('#b-contrast').textContent = settings.option === 'today' ? `${dayNightContrast().toFixed(1)} ×` : `${dayNightContrast(SPACE_LIGHT).toFixed(1)} ×`
  element('#b-tilt').textContent = settings.option === 'today' ? `0° (real ${planet.obliquity}°)` : `${planet.obliquity}°`
  tick()
}

function tick() {
  const layer = view.layerStats(settings.planet, settings.option), stats = view.stats
  element('#b-memory').textContent = layer.ready ? (layer.textureBytes ? mb(layer.textureBytes) : 'None: vertex colours') : '…'
  element('#b-build').textContent = !layer.ready ? 'building…' : settings.option === 'paint' ? (layer.bakeMs ? `${Math.round(layer.bakeMs)} ms per map · game ${number(stats.gameBuildMs)} ms, all worlds` : 'vertex colours, in the game build') : `${Math.round(layer.bakeMs)} ms`
  element('#b-measured').textContent = `${stats.calls} · ${number(stats.triangles)}`
}
setInterval(tick, 500)

all<HTMLButtonElement>('[data-planet]').forEach(button => button.addEventListener('click', () => { settings.planet = button.dataset.planet as PlanetId; render() }))
all<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { settings.option = button.dataset.option as LookOption; render() }))
all<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { settings.view = button.dataset.view as View; render() }))
all<HTMLButtonElement>('[data-show]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.show as LookOption
  render()
  element('#planet-view').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
}))
element('#split').addEventListener('click', () => { settings.split = !settings.split; render() })
element('#spin').addEventListener('click', () => { settings.spin = !settings.spin; render() })
element('#reset-view').addEventListener('click', () => view.resetView())

element('#export').addEventListener('click', () => {
  const payload = {
    study: 'planet-look', version: 1, status: 'option-b-in-game', settings,
    light: { hemisphereInSpace: HEMISPHERE_IN_SPACE, proposedSpaceLight: SPACE_LIGHT, contrastToday: +dayNightContrast().toFixed(2), contrastProposed: +dayNightContrast(SPACE_LIGHT).toFixed(2), haloThin: HALO_THIN },
    farSideShadows: shadows, proportions: inGame('jupiter'), saturnRingTiltToday: +todayRingTilt().toFixed(2), rockyRelief: { scale: ROCKY_RELIEF, mercury: reliefs.mercury, mars: reliefs.mars },
    planets: Object.fromEntries(PLANET_IDS.map(id => [id, {
      reference: { mean: hex(PLANETS[id].reference.mean), measure: referenceMeasure(id) }, today: { range: todayRange(id).map(hex), measure: todayMeasure(id) },
      retune: { range: retuneRange(id).map(hex), measure: retuneMeasure(id) }, obliquity: PLANETS[id].obliquity,
      built: Object.fromEntries(LOOK_OPTIONS.map(option => [option, view.layerStats(id, option)])),
    }])),
    budgets: Object.fromEntries(LOOK_OPTIONS.map(option => [option, { computer: budget(option), phone: budget(option, true) }])),
    gasGiants: GAS_GIANTS,
    recommendation: 'Do the fixes of option A first (shadow test, space light, thin air, puffs inside the air only, tilts, rings). Then B, Storybook paint, one planet at a time.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'planet-look-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__planetStudy', { value: {
  settings: () => ({ ...settings }), stats: () => view.stats,
  layer: (id: PlanetId, option: LookOption) => view.layerStats(id, option),
  apply: (next: Partial<StudySettings>) => { Object.assign(settings, next); render() },
  shadows: () => shadows,
  radius: (id: PlanetId) => inGame(id).radius,
} })
