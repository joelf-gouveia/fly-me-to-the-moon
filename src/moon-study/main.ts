import './style.css'
import { createMoonScene } from './scene'
import type { StudySettings, View } from './scene'
import {
  BOOST_SPEED, budget, CARRY_PROPOSED, CARRY_TODAY, clearances, eclipseSchedule, EARTH, EARTHSHINE, earthDiameterFromMoon, fogAmount,
  MOON_RADIUS, moonDiameterFromGround, moonPhase, moonSpeed, nextElongation, OCCLUDER_SLOTS, OPTIONS, phaseContrast, relocationRisk,
  SIDEREAL_SECONDS, SOLAR_ORBIT_SECONDS, sunDiameterFromGround, SYNODIC_SECONDS, tripSeconds,
} from './model'
import type { Eclipse, MoonOption } from './model'
import studyUrl from '../../docs/moon-study.md?url'

const options = Object.keys(OPTIONS) as MoonOption[]
const viewNames: Record<View, string> = { system: 'Earth and Moon', meadow: 'From the meadow', moon: 'On the Moon', eclipse: 'Eclipse' }
const speeds = [0, 1, 8, 32]
const budgets = Object.fromEntries(options.map(option => [option, budget(option)])) as Record<MoonOption, ReturnType<typeof budget>>
const cost = (option: MoonOption) => budgets[option]
const number = (value: number) => value.toLocaleString('en')
const percent = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`
const orbitOf = (option: MoonOption, inclination = OPTIONS[option].inclination) => ({ radius: OPTIONS[option].orbit, inclination })
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
const B = OPTIONS.close, C = OPTIONS.far

const about: Record<MoonOption, { line: string; far: string; near: string; game: string; work: string; risk: string }> = {
  sky: {
    line: 'A Moon in Earth’s sky with real phases. A picture, not a place.',
    far: 'Nothing. In space there is no Moon.',
    near: `From the ground: a Moon ${cost('sky').moonSize}° wide, with phases. It rises and sets. It never goes dark in an eclipse.`,
    game: 'One mesh that shows only inside Earth’s air. No change to flight, relocation or Worlds.',
    work: 'Small: one module.',
    risk: 'A child flies up to the Moon and never arrives. The game is called Fly me to the moon.',
  },
  close: {
    line: `A large Moon at ${number(B.orbit)} m. From the ground it has the same size as the Sun.`,
    far: 'A large grey companion beside Earth.',
    near: `From the ground: ${cost('close').moonSize}° wide, the size of the Sun. The game fog hides ${percent(cost('close').fog)} of it.`,
    game: 'A new world: landing, Worlds, day and night. In a solar eclipse the Moon covers the Sun, as in the real sky.',
    work: 'Medium: a new planet kind, the Moon orbit and five fixes.',
    risk: `Every full moon is dark in Earth’s shadow at any tilt up to 35°: ${cost('close').lunarEclipses} lunar and ${cost('close').solarEclipses} solar eclipses in each game year.`,
  },
  far: {
    line: `A smaller Moon at ${number(C.orbit)} m, on an orbit tilted ${C.inclination}°. A real journey from Earth.`,
    far: 'A small grey world on a tilted path around Earth.',
    near: `From the ground: ${cost('far').moonSize}° wide. The game fog hides ${percent(cost('far').fog)} of it, unless the Moon material ignores the fog.`,
    game: `The same new world as B. Eclipses come in two seasons: ${cost('far').solarEclipses} solar and ${cost('far').lunarEclipses} lunar in each game year.`,
    work: 'Medium: the same work as B.',
    risk: `The widest Moon path: ${percent(cost('far').relocation, 1)} of relocation moves put Blossom Haven in it. At 64× the Moon moves at ${number(cost('far').speed64)} m/s, faster than a boost.`,
  },
}

const chip = (attribute: string, id: string, text: string) => `<button type="button" ${attribute}="${id}" aria-pressed="false">${text}</button>`

document.querySelector<HTMLDivElement>('#moon-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>09</b> / THE MOON</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">THE GAME IS CALLED FLY ME TO THE MOON. IT HAS NO MOON.</p><h1>A moon for <em>the fairy.</em></h1></div>
      <p>Three ways to put a Moon around Earth. Compare them from space, from a meadow on Earth and from the Moon, through one game year.<br>A proposal only. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive Moon study">
      <div class="preview-column">
        <div id="moon"><div id="labels" aria-hidden="true"></div>
          <div class="scene-top"><span class="tag">LIVE 3D · EARTH AND MOON</span><span class="tag" id="mode-label"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help">Drag to turn · scroll or pinch to zoom</span></div>
        <div class="finder">
          <div class="finder-group"><p class="eyebrow">VIEW</p><div class="chips">${(Object.keys(viewNames) as View[]).map(view => chip('data-view', view, viewNames[view])).join('')}<button type="button" id="reset-view">Reset view</button></div></div>
          <div class="finder-group"><p class="eyebrow">TIME-LAPSE</p><div class="chips">${speeds.map(speed => chip('data-speed', String(speed), speed ? `${speed}×` : 'Stopped')).join('')}</div></div>
          <div class="finder-group wide"><p class="eyebrow">ONE GAME YEAR · <span id="clock"></span></p>
            <div class="timeline"><input id="time" type="range" min="0" max="${SOLAR_ORBIT_SECONDS}" step="1" aria-label="Time in the game year, in seconds" /><div id="ticks" aria-hidden="true"></div></div>
            <div class="chips"><button type="button" data-jump="full">Next full moon</button><button type="button" data-jump="solar">Next solar eclipse</button><button type="button" data-jump="lunar">Next lunar eclipse</button></div>
            <p class="legend"><i class="solar"></i> Solar eclipse <i class="lunar"></i> Lunar eclipse · <output id="phase-now"></output></p></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${options.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name} · ${number(OPTIONS[option].orbit)} m</button>`).join('')}</div></fieldset>
        <p class="eyebrow section">01 / THE LOOK</p><h2 id="option-title"></h2><p id="option-line"></p>
        <label class="range" for="inclination">Orbit tilt <output id="inclination-value"></output></label><input id="inclination" type="range" min="0" max="45" step="0.1" />
        <fieldset class="fixes"><legend>Proposed fixes</legend>
          <label class="check"><input id="fog-free" type="checkbox" /> The Moon ignores the fog</label>
          <label class="check"><input id="earthshine" type="checkbox" /> Dark night side (earthshine)</label>
          <label class="check"><input id="moonlight" type="checkbox" /> Moonlight at night · optional</label></fieldset>
        <label class="check"><input id="zones" type="checkbox" /> Relocation zones</label>
        <div class="budget"><p class="eyebrow">02 / NUMBERS FOR THIS OPTION</p>
          <div class="meter-row"><span>Moon size from the ground</span><output id="b-size"></output></div>
          <div class="meter-row"><span>Game fog on the Moon today</span><output id="b-fog"></output></div>
          <div class="meter-row"><span>Trip from the meadow · boost</span><output id="b-trip"></output></div>
          <div class="meter-row"><span>Moon speed at 1× · 64×</span><output id="b-speed"></output></div>
          <div class="meter-row"><span>Eclipses each game year</span><output id="b-eclipses"></output></div>
          <div class="meter-row"><span>Relocation moves into its path</span><output id="b-relocation"></output></div>
          <div class="meter-row"><span>Sun occluder slots</span><output id="b-occluders"></output></div>
          <div class="meter-row"><span>Worlds pictures</span><output id="b-pictures"></output></div>
          <div class="meter-row"><span>Moon triangles</span><output id="b-triangles"></output></div>
          <div class="meter-row measured"><span>This preview now · draw calls, whole scene</span><output id="b-measured"></output></div>
        </div>
      </aside>
    </section>

    <section class="option-cards" aria-labelledby="options-title"><div class="section-title"><p class="eyebrow">03 / THREE OPTIONS</p><h2 id="options-title">Three places for a Moon.</h2></div>
      <div class="cards">${options.map(option => `<article data-card="${option}"><p class="letter">${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3><p class="line">${about[option].line}</p>
        <dl><dt>From space</dt><dd>${about[option].far}</dd><dt>From the ground</dt><dd>${about[option].near}</dd><dt>In the game</dt><dd>${about[option].game}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        <button type="button" data-show="${option}">Show option ${OPTIONS[option].letter}</button></article>`).join('')}</div>
      <div class="table-wrap"><table><caption>Each option at its default tilt. Earth has radius ${EARTH.radius} m; the Moon has radius ${MOON_RADIUS} m, 0.273 of Earth, as in the real Solar System.</caption>
        <thead><tr><th scope="col">Measure</th>${options.map(option => `<th scope="col">${OPTIONS[option].letter} · ${OPTIONS[option].name}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Orbit radius · tilt</th>${options.map(option => `<td>${number(OPTIONS[option].orbit)} m · ${OPTIONS[option].inclination}°</td>`).join('')}</tr>
          <tr><th scope="row">Moon size from the ground (Sun: ${sunDiameterFromGround().toFixed(1)}°)</th>${options.map(option => `<td>${cost(option).moonSize}°</td>`).join('')}</tr>
          <tr><th scope="row">Earth size from the Moon</th>${options.map(option => `<td>${OPTIONS[option].world ? `${earthDiameterFromMoon(OPTIONS[option].orbit).toFixed(1)}°` : '—'}</td>`).join('')}</tr>
          <tr><th scope="row">Game fog on the Moon today</th>${options.map(option => `<td>${OPTIONS[option].world ? percent(cost(option).fog) : 'Off'}</td>`).join('')}</tr>
          <tr><th scope="row">Free space to Earth’s air</th>${options.map(option => `<td>${OPTIONS[option].world ? `${clearances(OPTIONS[option].orbit).earthAir} m` : '—'}</td>`).join('')}</tr>
          <tr><th scope="row">Free space to Mercury</th>${options.map(option => `<td>${OPTIONS[option].world ? `${number(clearances(OPTIONS[option].orbit).mercury)} m` : '—'}</td>`).join('')}</tr>
          <tr><th scope="row">Trip from the meadow · with boost</th>${options.map(option => `<td>${cost(option).trip === null ? 'No trip' : `${cost(option).trip} s · ${tripSeconds(OPTIONS[option].orbit, true)} s`}</td>`).join('')}</tr>
          <tr><th scope="row">Moon speed at 1× · 64×</th>${options.map(option => `<td>${cost(option).speed} · ${number(cost(option).speed64)} m/s</td>`).join('')}</tr>
          <tr><th scope="row">Solar · lunar eclipses each game year</th>${options.map(option => `<td>${OPTIONS[option].world ? `${cost(option).solarEclipses} · ${cost(option).lunarEclipses}` : 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Relocation moves into the Moon path</th>${options.map(option => `<td>${OPTIONS[option].world ? percent(cost(option).relocation, 2) : 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Sun occluder slots used</th>${options.map(option => `<td>${cost(option).occluders} of ${OCCLUDER_SLOTS}</td>`).join('')}</tr>
          <tr><th scope="row">Moon triangles · draw calls</th>${options.map(option => `<td>${number(cost(option).triangles)} · ${cost(option).drawCalls}</td>`).join('')}</tr>
        </tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">04 / WHAT A MOON WORLD NEEDS</p><h2>Earth has room.<br>The code needs five changes.</h2>
      <p>One lunar month is ${SYNODIC_SECONDS} s: twelve new moons in one game year of ${SOLAR_ORBIT_SECONDS / 60} minutes. The Moon turns in the direction of Earth’s spin, so it rises in the east and a waxing Moon shows in the evening. It keeps one face to Earth.</p>
      <p><strong>Two problems to fix first:</strong> relocation can put Blossom Haven in the Moon’s path, and the Moon can leave the fairy behind.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>Keep Blossom Haven out of the Moon’s path</h3><p><code>clearHomePosition()</code> checks where each world is now. The Moon moves around Earth, so a clear place can be in its path later. Add <code>touchesMoonPath()</code>: a sphere around Earth that holds the whole orbit. For C, ${percent(relocationRisk(C.orbit).perMove, 1)} of moves need it.</p></div></article>
        <article><span>02</span><div><h3>Carry the fairy near the Moon</h3><p>The game carries the fairy with a world only up to <code>max(atmosphere, ${CARRY_TODAY})</code> m above its ground. The Moon has no air. At 8× it moves at ${Math.round(moonSpeed(C.orbit, 8).around)} m/s; near the ground the fairy flies at 11 to 32 m/s. Carry her up to ${CARRY_PROPOSED} m, the height of the flight near zone.</p></div></article>
        <article><span>03</span><div><h3>Lock one face to Earth</h3><p>Move the Moon in <code>createPlanetaryOrbits().update()</code>, after Earth. Set its rotation from the orbit, not from <code>axialSpinPeriods</code>. Keep one seed, so the face with the dark maria stays the same.</p></div></article>
        <article><span>04</span><div><h3>Show the Moon from the ground</h3><p>Set <code>fog: false</code> on the Moon material. Scale the hemisphere light on the Moon to ${EARTHSHINE}. Today the lit side gets only ${phaseContrast(1.1).toFixed(1)} times the light of the dark side, so the phases are weak. With the fix it gets ${phaseContrast(1.1, EARTHSHINE).toFixed(0)} times.</p></div></article>
        <article><span>05</span><div><h3>Use the last shadow slot and fix the map</h3><p>The Moon is the ${OCCLUDER_SLOTS}th of ${OCCLUDER_SLOTS} sun occluders. The Worlds map draws each orbit around the Sun; draw the Moon’s path around Earth. Worlds grows to 13 pictures.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">PROPOSED DEFAULT</p><h3>C, the Journey Moon</h3><p>A real trip of about ${cost('far').trip} s, a Moon that looks like the Moon, and eclipses in two seasons. It needs the fog fix to show from the ground, and the relocation fix before it ships.</p></article>
      <article><p class="eyebrow">A DECISION TO MAKE</p><h3>How often an eclipse?</h3><p>Earth is ${EARTH.radius * 2} m wide: its shadow is wide compared with any orbit that fits. At the real tilt of 5.1° every full moon goes dark. The tilt slider shows the count for each tilt. Other choice: no eclipses at all.</p></article>
      <article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>A new Earth after each trip</h3><p>A trip to the Moon goes higher than ${Math.round(Math.max(70, EARTH.atmosphere * 1.5))} m above Earth, so Earth regenerates on return. Decide if this is a feature. At 64× the Moon of C is faster than a boost (${number(Math.round(BOOST_SPEED))} m/s).</p></article></section>
    <section class="credits"><p class="eyebrow">SOURCES</p>
      <p>Moon radius (0.273 of Earth), the synodic month (29.53 days), the sidereal month (27.32 days), the orbit tilt (5.1°), the tidal lock and the maria on the near side: NASA Solar System Exploration, “Earth’s Moon”. The game sizes and times are stylized, as for the planets: sidereal month ${SIDEREAL_SECONDS.toFixed(1)} s, synodic month ${SYNODIC_SECONDS} s.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 09</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const settings: StudySettings = {
  option: 'far', view: 'meadow', speed: reducedMotion ? 0 : 8, inclination: OPTIONS.far.inclination,
  zones: false, fogFree: true, earthshine: true, moonlight: false,
}
const moon = createMoonScene(element('#moon'), element('#labels'))
let schedule: Eclipse[] = []

function captionNote() {
  const data = OPTIONS[settings.option], stats = moon.stats
  const phase = moonPhase(moon.time, orbitOf(settings.option, settings.inclination))
  if (settings.view === 'system') return data.world
    ? `Earth and the Moon from space. The Moon keeps the same face to Earth. ${settings.zones ? 'Pink: where relocation keeps Blossom Haven out today. Gold: the space the Moon path needs.' : 'Turn on Relocation zones to see where Blossom Haven must not go.'}`
    : 'Option A has no Moon in space. It is a picture in Earth’s sky only.'
  if (settings.view === 'meadow') {
    const where = stats.moonElevation > 0 ? `${Math.round(stats.moonElevation)}° above the horizon` : 'below the horizon'
    const fogNote = data.world && !settings.fogFree ? ` The game fog hides ${percent(fogAmount(data.orbit - EARTH.radius))} of it.` : ''
    return `From a meadow on Earth: ${phase.name.toLowerCase()}, ${percent(phase.illuminated)} lit, ${where}. The Sun is ${Math.abs(Math.round(stats.sunElevation))}° ${stats.sunElevation >= 0 ? 'above' : 'below'} the horizon.${fogNote}`
  }
  if (settings.view === 'moon') return `On the Moon: Earth stays at the same place in the sky all month, ${earthDiameterFromMoon(data.orbit).toFixed(0)}° wide. It shows phases too.`
  return stats.eclipse === 'solar' ? 'A solar eclipse: the Moon’s shadow crosses Earth’s day side. The game shader treats the Sun as a point, so the shadow edge is sharp.'
    : stats.eclipse === 'lunar' ? 'A lunar eclipse: the Moon is in Earth’s shadow. The Sun is a point in the game, so the shadow is wider than Earth.'
    : 'No eclipse now. An eclipse needs the Sun, Earth and the Moon in a line. Use Next solar eclipse or Next lunar eclipse.'
}

function renderTicks() {
  schedule = OPTIONS[settings.option].world ? eclipseSchedule(orbitOf(settings.option, settings.inclination)) : []
  element('#ticks').innerHTML = schedule.map(event => `<i class="${event.type}" style="left:${(event.start + event.end) / 2 / SOLAR_ORBIT_SECONDS * 100}%"></i>`).join('')
  const solar = schedule.filter(event => event.type === 'solar').length, lunar = schedule.filter(event => event.type === 'lunar').length
  element('#b-eclipses').textContent = OPTIONS[settings.option].world ? `${solar} solar · ${lunar} lunar` : 'None'
}

function render() {
  if (settings.view === 'moon' && !OPTIONS[settings.option].world) settings.view = 'meadow'
  moon.apply(settings)
  const data = OPTIONS[settings.option], now = cost(settings.option)
  all<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === settings.option)))
  all<HTMLButtonElement>('[data-view]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.view === settings.view))
    button.disabled = button.dataset.view === 'moon' && !data.world
  })
  all<HTMLButtonElement>('[data-jump=solar], [data-jump=lunar]').forEach(button => { button.disabled = !data.world })
  all<HTMLButtonElement>('[data-speed]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === settings.speed)))
  all<HTMLElement>('[data-card]').forEach(card => card.classList.toggle('selected', card.dataset.card === settings.option))
  element('#mode-label').textContent = `OPTION ${data.letter} · ${data.name.toUpperCase()}`
  element('#caption-kicker').textContent = `OPTION ${data.letter} · ${viewNames[settings.view].toUpperCase()}`
  element('#caption-title').textContent = data.name
  element('#caption-note').textContent = captionNote()
  element('#option-title').textContent = `${data.letter} · ${data.name}`
  element('#option-line').textContent = about[settings.option].line
  element<HTMLInputElement>('#inclination').value = String(settings.inclination)
  element('#inclination-value').textContent = `${settings.inclination.toFixed(1)}°`
  element<HTMLInputElement>('#fog-free').checked = settings.fogFree
  element<HTMLInputElement>('#earthshine').checked = settings.earthshine
  element<HTMLInputElement>('#moonlight').checked = settings.moonlight
  element<HTMLInputElement>('#zones').checked = settings.zones
  element('#b-size').textContent = `${now.moonSize}° · Sun ${sunDiameterFromGround().toFixed(1)}°`
  element('#b-fog').textContent = data.world ? percent(now.fog) : 'Off'
  element('#b-trip').textContent = now.trip === null ? 'No trip' : `${now.trip} s · ${tripSeconds(data.orbit, true)} s`
  element('#b-speed').textContent = `${now.speed} · ${number(now.speed64)} m/s`
  element('#b-relocation').textContent = data.world ? percent(now.relocation, 2) : 'None'
  element('#b-occluders').textContent = `${now.occluders} of ${OCCLUDER_SLOTS}`
  element('#b-pictures').textContent = String(now.worldPictures)
  element('#b-triangles').textContent = number(now.triangles)
  renderTicks()
}

function tick() {
  const time = moon.time
  element<HTMLInputElement>('#time').value = String(Math.round(time))
  const phase = moonPhase(time, orbitOf(settings.option, settings.inclination))
  element('#clock').textContent = `${clock(time)} of ${clock(SOLAR_ORBIT_SECONDS)}`
  element('#phase-now').textContent = `${phase.name}, ${percent(phase.illuminated)} lit, ${clock(phase.day)} into a ${clock(SYNODIC_SECONDS)} month`
  element('#caption-note').textContent = captionNote()
  element('#b-measured').textContent = String(moon.stats.calls)
}
setInterval(tick, 300)

function jump(kind: string) {
  const orbit = orbitOf(settings.option, settings.inclination), time = moon.time
  if (kind === 'full') { moon.setTime(nextElongation(time, 180, orbit)); if (settings.view === 'eclipse') settings.view = 'meadow'; render(); tick(); return }
  const events = schedule.filter(event => event.type === kind)
  if (!events.length) return
  const next = events.find(event => (event.start + event.end) / 2 > time + 1) ?? events[0]
  moon.setTime((next.start + next.end) / 2)
  settings.speed = 0
  settings.view = 'eclipse'
  render(); tick()
}

all<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.option as MoonOption
  settings.inclination = OPTIONS[settings.option].inclination
  render()
}))
all<HTMLButtonElement>('[data-show]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.show as MoonOption
  settings.inclination = OPTIONS[settings.option].inclination
  render()
  element('#moon').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
}))
all<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => { settings.view = button.dataset.view as View; render() }))
all<HTMLButtonElement>('[data-speed]').forEach(button => button.addEventListener('click', () => { settings.speed = Number(button.dataset.speed); render() }))
all<HTMLButtonElement>('[data-jump]').forEach(button => button.addEventListener('click', () => jump(button.dataset.jump!)))
element('#reset-view').addEventListener('click', () => moon.resetView())
element<HTMLInputElement>('#time').addEventListener('input', event => { moon.setTime(Number((event.target as HTMLInputElement).value)); tick() })
element<HTMLInputElement>('#inclination').addEventListener('input', event => { settings.inclination = Number((event.target as HTMLInputElement).value); render() })
for (const [id, key] of [['#fog-free', 'fogFree'], ['#earthshine', 'earthshine'], ['#moonlight', 'moonlight'], ['#zones', 'zones']] as const) {
  element<HTMLInputElement>(id).addEventListener('change', event => { settings[key] = (event.target as HTMLInputElement).checked; render() })
}

element('#export').addEventListener('click', () => {
  const payload = {
    study: 'moon', version: 1, status: 'proposal-only', settings, time: +moon.time.toFixed(1),
    month: { synodicSeconds: SYNODIC_SECONDS, siderealSeconds: +SIDEREAL_SECONDS.toFixed(2), direction: 'with Earth’s spin', tidalLock: true },
    moon: { radius: MOON_RADIUS, earthshine: EARTHSHINE, carryToday: CARRY_TODAY, carryProposed: CARRY_PROPOSED },
    options: Object.fromEntries(options.map(option => [option, {
      ...OPTIONS[option], budget: cost(option), clearances: clearances(OPTIONS[option].orbit, OPTIONS[option].inclination),
      moonSizeFromGround: +moonDiameterFromGround(OPTIONS[option].orbit).toFixed(2),
    }])),
    eclipses: schedule.map(event => ({ ...event, start: +event.start.toFixed(1), end: +event.end.toFixed(1) })),
    recommendation: 'C, the Journey Moon (1,100 m, 28° tilt). Fix relocation and carry first; then fog, earthshine and the map.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'moon-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()
tick()

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__moonStudy', { value: {
  settings: () => ({ ...settings }), stats: () => moon.stats, schedule: () => schedule.map(event => ({ ...event })),
  setTime: (time: number) => { moon.setTime(time); tick() },
} })
