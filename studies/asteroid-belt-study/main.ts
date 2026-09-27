import './style.css'
import { createBeltScene } from './scene'
import type { Flight, StudySettings, View } from './scene'
import { auToGame, BELT, budget, clearances, DWARF_WORLDS, KIRKWOOD_GAPS, OPTIONS, relocationRisk, SPACE_SPEED } from './model'
import type { BeltOption, Device } from './model'
import studyUrl from '../../docs/asteroid-belt-study.md?url'

const options = Object.keys(OPTIONS) as BeltOption[]
const viewNames: Record<View, string> = { system: 'Whole system', mars: 'Leaving Mars', inside: 'Inside the belt', ceres: 'Ceres · C only' }
const flightNames: Record<Flight, string> = { hover: 'Hover', cruise: `Fly · ${SPACE_SPEED} m/s`, boost: 'Boost' }
const gap = clearances(), risk = relocationRisk()
const cost = (option: BeltOption, device: Device = 'desktop') => budget(option, device)
const number = (value: number) => value.toLocaleString('en')
const spacingText = (option: BeltOption, device: Device = 'desktop') => Number.isFinite(cost(option, device).rockSpacing) && cost(option, device).rockSpacing ? `≈ ${cost(option, device).rockSpacing} m` : 'No rocks'

const about: Record<BeltOption, { line: string; far: string; near: string; game: string; work: string; risk: string }> = {
  ribbon: {
    line: 'Soft dust and a faint glow. A picture of the belt, not a place.',
    far: 'A thin, grainy ring of light. Zoom in to see the Kirkwood gaps as dark lines.',
    near: 'Dust sparkles fly past. There are no rocks.',
    game: 'Two new objects in the scene. No flight or relocation logic sees the belt, except the new safe zone.',
    work: 'Small: one new module, one change in relocation.',
    risk: 'Children can find the belt “empty” up close.',
  },
  ring: {
    line: 'Real rocks all around the Sun, placed once at the start.',
    far: 'Rocks show as fine grains near Mars and Jupiter. The ring has no glow.',
    near: `One rock about every ${cost('ring').rockSpacing} m. At ${SPACE_SPEED} m/s a rock goes past a few times each second, most of them far away.`,
    game: 'Five new objects. The rocks never move, so the frame cost is zero after the start.',
    work: 'Small to medium: the same module with rock shapes.',
    risk: `${number(cost('ring').triangles)} extra triangles on a computer. The fairy flies through the rocks.`,
  },
  living: {
    line: 'The far glow of A, rocks near the fairy, and two small worlds to visit.',
    far: 'The same ring of light as A, with Ceres and Vesta.',
    near: `One rock about every ${cost('living').rockSpacing} m, only in a small box around the fairy. The rocks turn slowly and fade in at the edge.`,
    game: 'Ceres and Vesta are new worlds: in Worlds, with landing, day and night, and orbit paths.',
    work: 'Largest: a near-field module and two new planet kinds.',
    risk: `${number(cost('living').matrixUpdates)} rock updates per frame. The Worlds dialog grows from 10 to 12 pictures.`,
  },
}

const chip = (attribute: string, id: string, text: string) => `<button type="button" ${attribute}="${id}" aria-pressed="false">${text}</button>`

document.querySelector<HTMLDivElement>('#asteroid-belt-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>07</b> / ASTEROID BELT</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">THE SPACE BETWEEN MARS AND JUPITER IS EMPTY TODAY.</p><h1>Rocks between <em>the worlds.</em></h1></div>
      <p>Three ways to add the asteroid belt to the game. Compare them in the same solar system, from far away and from inside the belt.<br>A proposal for the game. The game now uses option C. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive asteroid belt study">
      <div class="preview-column">
        <div id="belt"><div id="labels" aria-hidden="true"></div>
          <div class="scene-top"><span class="tag">LIVE 3D · SOLAR SYSTEM</span><span class="tag" id="mode-label"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help">Drag to turn · scroll or pinch to zoom</span></div>
        <div class="finder">
          <div class="finder-group"><p class="eyebrow">VIEW</p><div class="chips">${(Object.keys(viewNames) as View[]).map(view => chip('data-view', view, viewNames[view])).join('')}<button type="button" id="reset-view">Reset view</button></div></div>
          <div class="finder-group"><p class="eyebrow">THE FAIRY IN THE BELT</p><div class="chips">${(Object.keys(flightNames) as Flight[]).map(flight => chip('data-flight', flight, flightNames[flight])).join('')}</div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${options.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p class="eyebrow section">01 / THE LOOK</p><h2 id="option-title"></h2><p id="option-line"></p>
        <fieldset><legend>Device</legend><div class="segmented"><button type="button" data-device="desktop" aria-pressed="true">Computer</button><button type="button" data-device="phone" aria-pressed="false">Phone · half</button></div></fieldset>
        <label for="orbit-speed">Orbital speed</label><select id="orbit-speed"><option value="1">1× · one orbit each hour, as in the game</option><option value="8">8×</option><option value="64">64×</option><option value="0">Stopped</option></select>
        <label class="check"><input id="zones" type="checkbox" /> Safe zones and Kirkwood gaps</label>
        <div class="budget"><p class="eyebrow">02 / COST IN THE GAME</p>
          <div class="meter-row"><span>Dust points</span><output id="b-dust"></output></div>
          <div class="meter-row"><span>Rocks drawn at one time</span><output id="b-rocks"></output></div>
          <div class="meter-row"><span>Rock spacing near the fairy</span><output id="b-spacing"></output></div>
          <div class="meter-row"><span>New worlds to visit</span><output id="b-worlds"></output></div>
          <div class="meter-row"><span>Belt draw calls</span><output id="b-calls"></output></div>
          <div class="meter-row"><span>Belt triangles</span><output id="b-triangles"></output></div>
          <div class="meter-row"><span>Rock updates per frame</span><output id="b-updates"></output></div>
          <div class="meter-row measured"><span>This preview now · draw calls, whole scene</span><output id="b-measured"></output></div>
        </div>
      </aside>
    </section>

    <section class="option-cards" aria-labelledby="options-title"><div class="section-title"><p class="eyebrow">03 / THREE OPTIONS</p><h2 id="options-title">Three ways to fill the gap.</h2></div>
      <div class="cards">${options.map(option => `<article data-card="${option}"><p class="letter">${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3><p class="line">${about[option].line}</p>
        <dl><dt>From far away</dt><dd>${about[option].far}</dd><dt>Up close</dt><dd>${about[option].near}</dd><dt>In the game</dt><dd>${about[option].game}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        <button type="button" data-show="${option}">Show option ${OPTIONS[option].letter}</button></article>`).join('')}</div>
      <div class="table-wrap"><table><caption>Cost on a computer. A phone draws half of the dust and rocks.</caption>
        <thead><tr><th scope="col">Measure</th>${options.map(option => `<th scope="col">${OPTIONS[option].letter} · ${OPTIONS[option].name}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Dust points</th>${options.map(option => `<td>${number(cost(option).dust)}</td>`).join('')}</tr>
          <tr><th scope="row">Rocks drawn at one time</th>${options.map(option => `<td>${number(cost(option).rocks)}</td>`).join('')}</tr>
          <tr><th scope="row">Rock spacing near the fairy</th>${options.map(option => `<td>${spacingText(option)}</td>`).join('')}</tr>
          <tr><th scope="row">Draw calls</th>${options.map(option => `<td>${cost(option).drawCalls}</td>`).join('')}</tr>
          <tr><th scope="row">Triangles</th>${options.map(option => `<td>${number(cost(option).triangles)}</td>`).join('')}</tr>
          <tr><th scope="row">Rock updates per frame</th>${options.map(option => `<td>${number(cost(option).matrixUpdates)}</td>`).join('')}</tr>
          <tr><th scope="row">Memory for belt data</th>${options.map(option => `<td>≈ ${cost(option).memoryKb} KB</td>`).join('')}</tr>
          <tr><th scope="row">New places in Worlds</th>${options.map(option => `<td>${cost(option).worlds || 'None'}</td>`).join('')}</tr>
        </tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">04 / WHAT EVERY OPTION NEEDS</p><h2>The gap is clear.<br>Relocation is not.</h2>
      <p>The belt fills ${number(BELT.inner)} m to ${number(BELT.outer)} m from the Sun. This is 2.1 to 3.3 AU in the real Solar System. The largest rock stays ${gap.mars} m clear of Mars and its air, and ${gap.jupiter} m clear of Jupiter and its air.</p>
      <p><strong>A problem to fix first:</strong> the five-minute relocation can put Blossom Haven into the belt. About ${(risk * 100).toFixed(1)}% of the candidate places touch it, or about one move in ${Math.round(1 / risk)}.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>Keep Blossom Haven out of the belt</h3><p>Add a belt test to <code>clearHomePosition()</code> in <code>src/relocation.ts</code>. Use the same margin as for Saturn's rings. Add a test with a fixed seed.</p></div></article>
        <article><span>02</span><div><h3>Turn the belt with the planets</h3><p>All worlds finish one orbit in <code>SOLAR_ORBIT_SECONDS</code>. Turn the belt group by the same angle in <code>createPlanetaryOrbits().update()</code>. The belt then never moves into a planet.</p></div></article>
        <article><span>03</span><div><h3>Keep the belt out of <code>World</code></h3><p>The belt is scenery. <code>nearestWorldAt()</code>, landing and regeneration do not see it. The fairy flies through it at space speed. Only Ceres and Vesta in option C are worlds.</p></div></article>
        <article><span>04</span><div><h3>Fit the phone budget</h3><p>Use half of the dust and rocks when <code>touchDevice</code> is true, as the game does for clouds and trees. Check the frame rate with <code>scripts/mobile-play-smoke.mjs</code>.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">PROPOSED DEFAULT</p><h3>C, in three steps</h3><p>Ship A first: its dust and glow are also the far layer of C. Then add the rocks near the fairy. Then add Ceres and Vesta to Worlds. Each step can ship alone.</p></article>
      <article><p class="eyebrow">A DECISION TO MAKE</p><h3>A real belt or a storybook belt?</h3><p>The real belt is almost empty: NASA puts the mean distance between asteroids at about 1 million km. C makes the belt dense only near the fairy, so it stays true from far away and fun up close.</p></article>
      <article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>Rocks through the fairy</h3><p>No option has collisions. In B the fairy flies through rocks. In C, rocks fade out when they come near the fairy or the camera. Check that this looks gentle on a phone.</p></article></section>
    <section class="credits"><p class="eyebrow">SOURCES</p>
      <p>Belt edges, Kirkwood gaps (${KIRKWOOD_GAPS.map(item => `${item.resonance} at ${item.au} AU`).join(', ')}) and dwarf world distances (${DWARF_WORLDS.map(world => `${world.name} ${world.au} AU → ${number(Math.round(auToGame(world.au)))} m`).join(', ')}) are standard values from NASA Solar System Exploration and the NASA Dawn mission. Game sizes are stylized, as for the planets.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 07</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const settings: StudySettings = { option: 'living', device: 'desktop', view: 'inside', clearances: false, orbitSpeed: 1, flight: reducedMotion ? 'hover' : 'cruise' }
const belt = createBeltScene(element('#belt'), element('#labels'))

const captions: Record<View, (option: BeltOption) => string> = {
  system: option => option === 'ring'
    ? 'From far away the rocks are too small to see one by one. The ring is a fine grey line between Mars and Jupiter.'
    : 'A ring of light between Mars and Jupiter. Zoom in to find the Kirkwood gaps: thin dark lines where Jupiter clears the orbits.',
  mars: option => option === 'ring'
    ? 'Just past Mars, the rocks show as grains in the sunlight, the way a child first meets the belt.'
    : option === 'living' ? 'Just past Mars, the belt is a band of dust. The rocks appear when the fairy flies in.' : 'Just past Mars, the belt is a band of dust in the sunlight.',
  inside: option => option === 'ribbon' ? 'Inside the belt: dust sparkles go past. There are no rocks.'
    : option === 'ring' ? `Inside the belt: one rock about every ${cost('ring', settings.device).rockSpacing} m. Most of the time, no rock is near.`
    : `Inside the belt: one rock about every ${cost('living', settings.device).rockSpacing} m near the fairy. The rocks turn slowly and fade in at the edge.`,
  ceres: () => 'Ceres, the largest body in the belt, with the bright salt spots of Occator crater. Vesta is closer to the Sun.',
}

function render() {
  if (settings.view === 'ceres' && settings.option !== 'living') settings.view = 'inside'
  belt.apply(settings)
  const letter = OPTIONS[settings.option].letter, name = OPTIONS[settings.option].name
  all<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === settings.option)))
  all<HTMLButtonElement>('[data-view]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.view === settings.view))
    button.disabled = button.dataset.view === 'ceres' && settings.option !== 'living'
  })
  all<HTMLButtonElement>('[data-flight]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.flight === settings.flight)))
  all<HTMLButtonElement>('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === settings.device)))
  all<HTMLElement>('[data-card]').forEach(card => card.classList.toggle('selected', card.dataset.card === settings.option))
  element('#mode-label').textContent = `OPTION ${letter} · ${name.toUpperCase()}`
  element('#caption-kicker').textContent = `OPTION ${letter} · ${viewNames[settings.view].toUpperCase()}`
  element('#caption-title').textContent = name
  element('#caption-note').textContent = captions[settings.view](settings.option)
  element('#option-title').textContent = `${letter} · ${name}`
  element('#option-line').textContent = about[settings.option].line
  element<HTMLInputElement>('#zones').checked = settings.clearances
  element<HTMLSelectElement>('#orbit-speed').value = String(settings.orbitSpeed)
  const now = budget(settings.option, settings.device)
  element('#b-dust').textContent = number(now.dust)
  element('#b-rocks').textContent = now.rocks ? `${now.nearRocksMax ? 'up to ' : ''}${number(now.rocks)}` : 'None'
  element('#b-spacing').textContent = spacingText(settings.option, settings.device)
  element('#b-worlds').textContent = now.worlds ? DWARF_WORLDS.map(world => world.name).join(', ') : 'None'
  element('#b-calls').textContent = String(now.drawCalls)
  element('#b-triangles').textContent = number(now.triangles)
  element('#b-updates').textContent = number(now.matrixUpdates)
}
setInterval(() => { element('#b-measured').textContent = String(belt.stats.calls) }, 500)

all<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { settings.option = button.dataset.option as BeltOption; render() }))
all<HTMLButtonElement>('[data-show]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.show as BeltOption; render()
  element('#belt').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
}))
all<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { settings.view = button.dataset.view as View; render() }))
all<HTMLButtonElement>('[data-flight]').forEach(button => button.addEventListener('click', () => { settings.flight = button.dataset.flight as Flight; render() }))
all<HTMLButtonElement>('[data-device]').forEach(button => button.addEventListener('click', () => { settings.device = button.dataset.device as Device; render() }))
element('#reset-view').addEventListener('click', () => belt.resetView())
element<HTMLInputElement>('#zones').addEventListener('change', event => { settings.clearances = (event.target as HTMLInputElement).checked; render() })
element<HTMLSelectElement>('#orbit-speed').addEventListener('change', event => { settings.orbitSpeed = Number((event.target as HTMLSelectElement).value); render() })

element('#export').addEventListener('click', () => {
  const payload = {
    study: 'asteroid-belt', version: 1, status: 'proposal-only', settings,
    belt: { ...BELT, gaps: KIRKWOOD_GAPS.map(item => ({ ...item, radius: Math.round(auToGame(item.au)) })) },
    clearances: gap, relocationRisk: +risk.toFixed(4),
    options: Object.fromEntries(options.map(option => [option, { ...OPTIONS[option], desktop: budget(option, 'desktop'), phone: budget(option, 'phone') }])),
    dwarfWorlds: DWARF_WORLDS.map(world => ({ ...world, radiusFromSun: Math.round(auToGame(world.au)) })),
    recommendation: 'C in three steps: A (dust + glow), then the near field of rocks, then Ceres and Vesta as worlds. Fix relocation first.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'asteroid-belt-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__beltStudy', { value: { settings: () => ({ ...settings }), stats: () => belt.stats } })
