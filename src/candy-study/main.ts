import { createCandyScene } from './scene'
import type { StudyView } from './scene'
import { createLocationPreview, dimensions, ecosystem, locationOptions } from './model'
import type { LocationMode, VisitorState } from './model'
import './style.css'

document.querySelector<HTMLDivElement>('#candy-study')!.innerHTML = `
  <header class="masthead"><a href="/">✧ &nbsp; Fly me to the moon</a><span>WORLD STUDY / 02</span><a href="/fairy-flight-study.html">Fairy flight study ↗</a></header>
  <main>
    <section class="intro">
      <div><p class="eyebrow">A LITTLE PLANET. A VERY SWEET HOME.</p><h1>Somewhere<br><em>the rivers fizz.</em></h1></div>
      <div class="intro-note"><span class="specimen">✿</span><h2>Blossom Haven</h2><p>Half Earth’s diameter. Soda-water rivers, lollipop groves, and a flower cottage. The game now uses this candy-world direction with five-minute teleporting; this page preserves the original location studies.</p><a class="study-badge" href="/">Play the selected candy world ↗</a></div>
    </section>

    <section class="landscape" aria-label="Interactive candy ecosystem concept">
      <div class="scene-heading"><div><span class="eyebrow">FIELD VISIT / LIVE 3D</span><h2 id="view-title">A meadow made for wandering.</h2></div><button id="pause-scene" type="button" aria-pressed="false">Pause motion</button></div>
      <div class="scene-layout">
        <div class="scene" id="candy-view"><div class="scene-chips"><span>PROCEDURAL CONCEPT</span><span>✿ HOME WORLD</span></div><div class="scene-instructions">Drag to look around · scroll or pinch to zoom</div></div>
        <aside class="field-note" aria-live="polite"><p class="eyebrow" id="detail-subtitle"></p><h3 id="detail-title"></h3><p id="detail-role"></p><div class="note-rule"><span>WHAT SHE COULD DO</span><p id="detail-response"></p></div><div class="note-rule"><span>KEEP IT KIND</span><p id="detail-guardrail"></p></div><p class="concept-disclaimer">The scene previews the look. These fly-by reactions are proposed game behaviors, not interactions in this study.</p></aside>
      </div>
      <div class="scene-controls"><div class="view-buttons" role="group" aria-label="Scene view"><button data-view="meadow" aria-pressed="true">Meadow</button><button data-view="overview" aria-pressed="false">Whole planet</button><button data-view="home" aria-pressed="false">Flower cottage</button></div><div class="scene-toggles"><label><input id="show-bubbles" type="checkbox" checked /> Soda bubbles</label><label><input id="show-clouds" type="checkbox" checked /> Clouds</label></div></div>
    </section>

    <section class="scale-strip" aria-label="Exact relative planet diameter comparison"><div><span class="eyebrow">SMALL ENOUGH TO KNOW BY HEART</span><h2>Half the diameter.<br>A whole world to love.</h2><p>Interpreting “half the size” as diameter, not volume.<br>These are game dimensions, not astronomical scale.</p></div><div class="scale-planets"><div><span class="scale-earth"></span><strong>Earth</strong><small>440 m diameter</small></div><div><span class="scale-home">✿</span><strong>Blossom Haven</strong><small>220 m diameter</small></div></div><div class="scale-facts"><strong>110 <small>m radius</small></strong><p>¼ the surface area<br>⅛ the volume</p><span>Roughly a minute around at 11 m/s near the ground; terrain and altitude change the time.</span></div></section>

    <section class="ecosystem-section">
      <div class="section-heading"><div><span class="eyebrow">THE ECOSYSTEM / SEVEN CONNECTED PIECES</span><h2>More than a pink coat of paint.</h2></div><p>A make-believe living system, not a biology lesson. Choose a field note to inspect its corner of the world above.</p></div>
      <div class="ecosystem-grid">${ecosystem.map(item => `<button class="eco-card" data-ecosystem="${item.id}" style="--swatch:${item.color}" aria-pressed="${item.id === 'water'}"><span class="eco-top"><small>${item.number}</small><span aria-hidden="true">${item.symbol}</span></span><strong>${item.title}</strong><span>${item.subtitle}</span><p>${item.link}</p><small class="inspect">Inspect in 3D ↗</small></button>`).join('')}</div>
      <div class="ecosystem-cycle"><span>◌ Soda mist</span><i>→</i><span>☁ Cotton-candy clouds</span><i>→</i><span>✧ Gentle dew</span><i>→</i><span>◎ Blossoming groves</span><i>→</i><span>⋈ Butterfly friends</span></div>
      <p class="quiet-note">Candy is scenery, not a currency or food reward. No harvesting, hunger, depleted resources, or chores. The friendly world keeps looking after itself.</p>
    </section>

    <section class="location-section">
      <div class="section-heading"><div><span class="eyebrow">WHERE DOES HOME BELONG?</span><h2>Far away should feel magical.<br>Not hard to get back to.</h2></div><p>Compare a fixed outer-rim planet with your 20-minute teleport idea. The flower symbol always means the same thing: home.</p></div>
      <div class="location-options" role="group" aria-label="Home location concept">${(Object.entries(locationOptions) as [LocationMode, typeof locationOptions[LocationMode]][]).map(([id, item]) => `<button data-location="${id}" aria-pressed="${id === 'doorway'}"><small>${item.tag}</small><strong>${item.name}</strong></button>`).join('')}</div>
      <div class="location-workbench"><div class="map-preview">
        <svg viewBox="0 0 650 380" role="img" aria-labelledby="orbit-title orbit-desc"><title id="orbit-title">Illustrated solar-system location comparison</title><desc id="orbit-desc">Earth is near the Sun. The pink fairy home is beyond Neptune. A flower doorway offers a short magical trip. This diagram is not to scale.</desc>
          <defs><radialGradient id="sun-gradient"><stop stop-color="#fff0b5"/><stop offset="1" stop-color="#e7b971"/></radialGradient></defs>
          <g class="orbit-lines"><ellipse cx="160" cy="200" rx="72" ry="52"/><ellipse cx="160" cy="200" rx="128" ry="88"/><ellipse cx="220" cy="200" rx="190" ry="140"/><ellipse cx="270" cy="200" rx="240" ry="168"/></g>
          <circle cx="160" cy="200" r="26" fill="url(#sun-gradient)"/><text x="160" y="244" text-anchor="middle">SUN</text>
          <circle cx="225" cy="166" r="13" fill="#80bcb9"/><text x="225" y="143" text-anchor="middle">EARTH</text>
          <circle cx="370" cy="133" r="18" fill="#cda898"/><ellipse cx="370" cy="133" rx="31" ry="9" stroke="#e2c59e" stroke-width="5" fill="none" transform="rotate(-20 370 133)"/><text x="370" y="106" text-anchor="middle">SATURN</text>
          <circle cx="468" cy="295" r="14" fill="#8c9bc9"/><text x="466" y="326" text-anchor="middle">NEPTUNE</text>
          <path id="map-route" d="M245,167 Q400,260 559,106" fill="none" stroke="#e3a0c4" stroke-width="2" stroke-dasharray="5 8"/>
          <g id="map-door"><circle cx="258" cy="184" r="20" fill="#d984aa"/><text x="258" y="192" text-anchor="middle" class="map-flower">✿</text><text x="259" y="220" text-anchor="middle">DOORWAY</text></g>
          <g id="map-home" transform="translate(565 93)"><circle r="29" fill="#e9b4cf"/><text y="10" text-anchor="middle" class="map-home-flower">✿</text><text y="51" text-anchor="middle">HOME</text></g>
          <text x="32" y="35" class="map-overline">STORYBOOK SPACE</text><text x="32" y="360">Illustrative positions · not astronomical scale</text>
        </svg>
        <p id="map-status" role="status"></p>
      </div><div class="location-detail"><span class="eyebrow" id="location-tag"></span><h3 id="location-name"></h3><p id="location-detail"></p><blockquote id="location-child"></blockquote><div class="note-rule"><span>THE TRADEOFF</span><p id="location-risk"></p></div><p id="location-timing"></p></div></div>
      <div class="teleport-lab"><div><span class="eyebrow">ADULT PREVIEW / TRY THE EDGE CASE</span><p>What if 20 minutes pass while she is finding home?</p></div><div class="lab-controls"><label for="visitor-state">The fairy is…</label><select id="visitor-state"><option value="away">Exploring elsewhere</option><option value="travelling">On her way home</option><option value="home">Already at home</option></select><button id="simulate-teleport" type="button">Simulate +20 minutes</button></div></div>
      <p class="quiet-note">This button simulates time only in the diagram. The study never teleports the game’s planet. There is no actual 20-minute wait.</p>
    </section>

    <section class="child-section"><div><span class="eyebrow">DESIGNED WITH A FOUR-YEAR-OLD IN MIND</span><h2>Wonder, without worry.</h2><p>The child-facing game should need pictures and a little curiosity—not reading, accurate aiming, or remembering a schedule. This study is for an adult to review; its written controls are not the proposed child interface.</p></div><div class="child-rules"><article><b>01</b><h3>One dependable invitation</h3><p>A large flower means “take me home.” Keep the same shape on the sky clue, map, doorway, and cottage. Do not rely on pink alone.</p></article><article><b>02</b><h3>Arriving is enough</h3><p>A broad garden triggers the welcome. No locks, objectives to finish first, points, countdown, or required landing. Free flight continues.</p></article><article><b>03</b><h3>Magic that doesn’t abandon her</h3><p>If roaming is enabled, freeze home while she approaches or visits. Move once after she leaves; keep the seed, cottage, flower marker, and route intact.</p></article><article><b>04</b><h3>Room to feel calm</h3><p>Quiet effects, optional sound, a pause control, and no flashes. A few moving friends are enough. The fairy should remain easier to see than the scenery.</p></article></div></section>

    <section class="decision"><div><span class="eyebrow">ORIGINAL STUDY RECOMMENDATION</span><h2>A faraway candy home.<br>A doorway that always knows the way.</h2><p>Build the small world, soda river, two candy-tree silhouettes, three butterflies, and one flower cottage. Keep home fixed beyond Neptune. Save the wandering planet as an optional later setting, not the default for a first visit.</p><p class="decision-scope">Selected for the game: this half-diameter candy world, relocating every five active minutes to a clear spot. Guided navigation pauses relocation; manual approach does not. Visiting fairies travel with their home. The options above preserve the original study.</p></div><div class="save-panel"><span>YOUR CURRENT STUDY CHOICE</span><strong id="choice-name"></strong><button id="save-study" type="button">Save study direction ↓</button><small id="save-status" role="status">Downloads a JSON design brief; does not change the game.</small></div></section>

    <section class="research"><div><span class="eyebrow">RESEARCH → DESIGN INTERPRETATION</span><h2>A starting point, not a child-tested promise.</h2><p>NAEYC’s early-childhood guidance values choice, wonder, and delight in play, along with understandable routines and environments that avoid excessive stimulation. Those are classroom principles, not evidence that a particular video-game feature suits every four-year-old.</p><p>Our interpretation: preserve a familiar home, make assistance optional, and let the world respond without adding pressure. The timing, palette, planet size, and teleport safeguards are design proposals.</p><a href="https://www.naeyc.org/node/3796" target="_blank" rel="noreferrer">NAEYC · Principles of child development and learning ↗</a><a href="https://www.naeyc.org/resources/position-statements/dap/creating-community" target="_blank" rel="noreferrer">NAEYC · Predictable, caring environments ↗</a></div><div class="playtest"><span class="eyebrow">A SHORT, ADULT-SUPPORTED PLAYTEST</span><ol><li>Can the child find the flower button after one demonstration?</li><li>Do they choose to wander, follow, or pause without seeming stuck?</li><li>After leaving, can they get home again without reading?</li><li>Do the bubbles and friends delight them or distract from flying?</li><li>Only then try roaming: do they understand that home is still available?</li></ol><p>If home feels lost, remove roaming. If the scene feels busy, reduce effects. No score or pass/fail for the child.</p></div></section>
    <footer><span>Original code-built 3D concept · all candy-world ecology is imaginary</span><span>Study · 25 September 2026</span></footer>
  </main>
`

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const scene = createCandyScene(get('candy-view'))
const preview = createLocationPreview()
let selectedEcosystem = 'water', selectedView: StudyView = 'meadow'
function setView(view: StudyView) {
  selectedView = view; scene.setView(view)
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)))
  const titles: Record<StudyView, string> = { meadow: 'A meadow made for wandering.', overview: 'Small planet. Big imagination.', water: 'A river with a little sparkle.', grove: 'The sweetest sort of forest.', clouds: 'Soft skies, no storms.', friends: 'A few friendly neighbors.', home: 'Somewhere she belongs.' }
  get('view-title').textContent = titles[view]
}
function setEcosystem(id: string, focus = true) {
  const item = ecosystem.find(item => item.id === id)!
  selectedEcosystem = id
  get('detail-subtitle').textContent = `${item.number} / ${item.subtitle}`
  get('detail-title').textContent = item.title
  get('detail-role').textContent = item.role
  get('detail-response').textContent = item.response
  get('detail-guardrail').textContent = item.guardrail
  document.querySelectorAll<HTMLButtonElement>('[data-ecosystem]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ecosystem === id)))
  if (focus) { setView(item.view); get('candy-view').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }) }
}
document.querySelectorAll<HTMLButtonElement>('[data-ecosystem]').forEach(button => { button.onclick = () => setEcosystem(button.dataset.ecosystem!) })
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => { button.onclick = () => { setView(button.dataset.view as StudyView); if (button.dataset.view === 'home') setEcosystem('home', false) } })
function updatePause() { get('pause-scene').textContent = scene.paused ? 'Play motion' : 'Pause motion'; get('pause-scene').setAttribute('aria-pressed', String(scene.paused)) }
get('pause-scene').onclick = () => { scene.setPaused(!scene.paused); updatePause() }
get<HTMLInputElement>('show-bubbles').onchange = event => scene.setBubbles((event.target as HTMLInputElement).checked)
get<HTMLInputElement>('show-clouds').onchange = event => scene.setClouds((event.target as HTMLInputElement).checked)
function renderLocation(message?: string) {
  const state = preview.state, option = locationOptions[state.mode]
  get('location-tag').textContent = option.tag
  get('location-name').textContent = option.name
  get('location-detail').textContent = option.detail
  get('location-child').textContent = option.child
  get('location-risk').textContent = option.risk
  get('location-timing').textContent = option.timing
  get('choice-name').textContent = option.name
  const positions = [[565, 93], [575, 263], [389, 45]]
  const [x, y] = positions[state.location]
  get('map-home').setAttribute('transform', `translate(${x} ${y})`)
  get('map-route').setAttribute('d', `M245,167 Q400,260 ${x - 10},${y + 10}`)
  get('map-door').style.display = state.mode === 'doorway' ? '' : 'none'
  get('orbit-desc').textContent = `Illustrated Earth, Saturn and Neptune; fairy home at outer-system location ${state.location + 1}. ${state.mode === 'doorway' ? 'A flower doorway near Earth leads home.' : state.mode === 'roaming' ? 'Home can move only while the fairy is away.' : 'Home stays fixed.'} Diagram not to scale.`
  get('map-status').textContent = state.pending ? '✿ Move deferred. Home stays right here until she has left.' : message ?? (state.mode === 'doorway' ? '✿ A faraway world. A familiar doorway. Always available.' : state.mode === 'rim' ? '✿ One fixed home, beyond Neptune. Follow the flower whenever you like.' : `✿ Home location ${state.location + 1}. It never moves while she approaches or visits.`)
  document.querySelectorAll<HTMLButtonElement>('[data-location]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.location === state.mode)))
}
document.querySelectorAll<HTMLButtonElement>('[data-location]').forEach(button => { button.onclick = () => { preview.setMode(button.dataset.location as LocationMode); renderLocation(); get('save-status').textContent = 'Downloads a JSON design brief; does not change the game.' } })
get<HTMLSelectElement>('visitor-state').onchange = event => { preview.setVisitor((event.target as HTMLSelectElement).value as VisitorState); renderLocation() }
get('simulate-teleport').onclick = () => {
  const previous = preview.state.location
  preview.advance(1200)
  renderLocation(preview.state.mode !== 'roaming' ? '✿ Twenty minutes later: home is still in the same place.' : preview.state.location !== previous ? '✿ Home moved. Its flower marker and route followed; the cottage stayed the same.' : undefined)
}
get('save-study').onclick = () => {
  const brief = { study: 'Blossom Haven candy ecosystem', status: 'Study export only. Live game uses the candy ecosystem with five-minute unguided relocation; this export does not override it.', dimensions: { ...dimensions, interpretation: 'Half Earth diameter' }, location: preview.state.mode, homeStableSeed: true, relocateEveryActiveMinutes: preview.state.mode === 'roaming' ? 20 : null, deferRelocationWhile: ['travelling', 'home'], ecosystem: ecosystem.map(({ id, title, build, guardrail }) => ({ id, title, build, guardrail })), selectedEcosystem, selectedView, recommendation: 'Fixed beyond Neptune with a reliable flower doorway; roaming optional later' }
  const url = URL.createObjectURL(new Blob([JSON.stringify(brief, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'blossom-haven-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  get('save-status').textContent = 'Study saved. Your game has not been changed.'
}
setEcosystem('water', false); renderLocation(); updatePause()
window.addEventListener('pagehide', () => scene.dispose(), { once: true })
