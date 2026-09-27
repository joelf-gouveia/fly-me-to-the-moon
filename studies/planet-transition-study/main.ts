import './style.css'
import * as THREE from 'three'
import { createTransitionScene } from './scene'
import type { Run } from './scene'
import { legend, renderChart } from './charts'
import type { Metric } from './charts'
import {
  altitudeForAngle, BRAKE, boundariesOneSky, boundariesToday, DOOR, levelCeiling, OPTIONS, orbitSpeed, RELEASE_AT, runScenario,
  SCENARIO_IDS, SCENARIOS, SKY_ANGLES, steerShell, TRANSITION_OPTIONS,
} from './model'
import type { Boundary, Option, Sample, ScenarioId, Summary, Trace } from './model'
import { SPACE_SPEED } from '../../src/flight'
import { PROPORTIONS } from '../../src/proportions'
import studyUrl from '../../docs/planet-transition-study.md?url'

const number = (value: number, digits = 0) => value.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits })
const seconds = (value: number | null) => value === null ? '—' : `${number(value, 1)} s`
const letter = (option: Option) => OPTIONS[option].letter === '—' ? 'Today' : `${OPTIONS[option].letter} · ${OPTIONS[option].name}`

/** Measured on 27 September 2026: regenerateWorld() in a desktop browser (20 cores), CPU time only. */
const BUILD_MS = { Earth: [100, 111], Mars: [25, 26], Mercury: [25, 27], Jupiter: [21, 21], Venus: [17, 18], Ceres: [3, 3] } as const

const about: Record<Exclude<Option, 'today'>, { changes: string[]; stays: string; work: string; risk: string }> = {
  retune: {
    changes: [
      'At the steering shell, the roll of the fairy turns to the up of the world in about one second, not in one frame.',
      'The pitch limit of 77° eases the fairy back. A straight dive takes its heading from the head of the fairy, not from an arbitrary axis.',
      '"Release to cruise" levels the fairy inside the air only. Above the air, she keeps her climb or her dive.',
      `The speed falls on a curve. A straight dive brakes at ${BRAKE} m/s² or less.`,
      'The guide flies a 25° glide into the air. At the arrival it keeps its heading, and "release to cruise" levels the fairy.',
      'The fairy pulls up before the ground.',
      'The landscape build runs in slices of a few milliseconds over many frames. The study builds it in one frame.',
    ],
    stays: 'W and S keep two meanings. In space, holding W or S still turns a loop.',
    work: 'Small. turnFlight() and stepFlight() in src/flight.ts, the arrival in updateFairy() in src/main.ts, and a sliced regenerateWorld() in src/worlds.ts.',
    risk: 'Low. The loop in space stays. A child who holds W to leave Earth still comes back.',
  },
  onesky: {
    changes: [
      'One rule everywhere: W and S set the angle of the climb or the dive (77° or less), A and D turn. Nothing turns a loop.',
      `The up of the sky is the plane of the orbits far away. It turns to the up of the world between a half angle of ${SKY_ANGLES[0]}° and ${SKY_ANGLES[1]}° in the view.`,
      'The turn of the sky takes seconds, not one frame. The fairy rolls with it, so the world becomes the floor under her.',
      '"Release to cruise" levels the fairy below the clouds + 12 m. Above that, she keeps her climb or her dive.',
      'The world carries the fairy on its orbit in the same part as it is the sky. The carry fades over hundreds of metres, not in one frame.',
      'It includes the brake curve, the glide, the pull-up and the sliced build of A.',
    ],
    stays: 'Free flight stays free. The fairy steers at every moment.',
    work: 'Medium. A new turnFlight() with a sky-up state, a part carry in animate() of src/main.ts, and new tests in tests/flight.test.ts.',
    risk: 'The fairy cannot point straight up or straight down in space. Near Earth and the Moon, the sky blends between two worlds: this needs a test in the game.',
  },
  door: {
    changes: [
      `It is B, plus two short scenes. Down: below the steering shell with a dive of 10° or more, a ${DOOR.down} s glide takes the fairy to ${DOOR.landing} m above the ground.`,
      'The camera pulls back, and a cloud veil fills the view. The new landscape builds inside the veil, so no stop and no change of the ground shows.',
      `Up: above the clouds + 12 m with a climb of 20° or more, a ${DOOR.up} s lift takes her to ${DOOR.liftHeight} times the height of the air. Then B continues.`,
      'During a scene, only Shift acts. It makes the scene faster.',
    ],
    stays: 'The fairy steers outside the two scenes, as in B.',
    work: 'Large. B, plus a scene state, a camera pull, a veil overlay, and the guide and the sticker at the end of the glide.',
    risk: `The child loses the steering for ${DOOR.up} to ${DOOR.down} s at each crossing. A fairy that flies up and down at the edge of the air sees the scenes again and again.`,
  },
}

document.querySelector<HTMLDivElement>('#transition-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>13</b> / ARRIVALS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">THE MOMENT BETWEEN THE AIR AND THE STARS</p><h1>Into the air, <em>out to the stars.</em></h1></div>
      <p>The flight into a world and out of it has snaps, a hard brake and keys that change their meaning. This study measures the flight code of the game. It compares three ways to fix it on the real Earth of the game, with the same six moments for each option.<br>Parked on 27 September 2026 with no decision. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive transition study">
      <div class="preview-column">
        <div id="transition-view">
          <div class="scene-top"><span class="tag">LIVE 3D · THE GAME EARTH AND FAIRY</span><span class="tag" id="mode-label"></span></div>
          <div class="scene-caption" aria-live="polite"><p class="eyebrow" id="caption-kicker"></p><h2 id="caption-title"></h2><p id="caption-note"></p></div>
          <span class="scene-help" id="scene-help"></span>
        </div>
        <div class="finder">
          <div class="finder-group wide"><p class="eyebrow">MOMENT</p><div class="chips">${SCENARIO_IDS.map(id => `<button type="button" data-scenario="${id}" aria-pressed="false">${SCENARIOS[id].name}</button>`).join('')}</div></div>
          <div class="finder-group"><p class="eyebrow">FLY IT YOURSELF · W S A D · SHIFT</p><div class="chips"><button type="button" data-free="meadow" aria-pressed="false">From the meadow</button><button type="button" data-free="above" aria-pressed="false">From space</button></div></div>
          <div class="finder-group"><p class="eyebrow">PLAY</p><div class="chips"><button type="button" id="replay">↺ Again</button><button type="button" id="pause" aria-pressed="false">Pause</button><button type="button" id="slow" aria-pressed="false">Half speed</button><button type="button" id="rebuild" aria-pressed="true">Build the new landscape</button><button type="button" id="shells" aria-pressed="false">Show the shells</button></div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${TRANSITION_OPTIONS.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <p id="option-line"></p>
        <div class="budget"><p class="eyebrow">NOW</p>
          <div class="meter-row"><span>Altitude above sea level</span><output id="r-altitude"></output></div>
          <div class="meter-row"><span>Speed</span><output id="r-speed"></output></div>
          <div class="meter-row"><span>Angle of flight to the horizon</span><output id="r-pitch"></output></div>
          <div class="meter-row"><span>Region</span><output id="r-mode"></output></div>
        </div>
        <div class="budget"><p class="eyebrow">THIS RUN</p>
          <div class="meter-row"><span>Largest turn in one frame</span><output id="r-turn"></output></div>
          <div class="meter-row"><span>Hardest brake</span><output id="r-brake"></output></div>
          <div class="meter-row"><span>Last landscape build (one frame)</span><output id="r-build">—</output></div>
        </div>
        <p class="note">A turn of more than about 2° in one frame shows as a snap. The steering keys of the game turn the fairy 0.75° in one frame at 60 frames each second.</p>
      </aside>
    </section>

    <section class="section-block" aria-labelledby="charts-title">
      <p class="eyebrow">01 / THE SAME MOMENT, FOUR WAYS</p>
      <div class="section-head"><h2 id="charts-title"></h2><div class="legend" aria-label="Legend">${legend(TRANSITION_OPTIONS)}</div></div>
      <p class="section-note" id="charts-note"></p>
      <div class="charts">
        <figure><figcaption>Altitude above sea level (m), 0 to 400 m</figcaption><div id="chart-altitude" class="chart"></div></figure>
        <figure><figcaption>Largest turn of the fairy in one frame (°)</figcaption><div id="chart-turn" class="chart"></div></figure>
        <figure><figcaption>Speed (m/s)</figcaption><div id="chart-speed" class="chart"></div></figure>
      </div>
      <div class="table-wrap"><table id="score" aria-label="Results of each moment for each option"></table></div>
      <p class="section-note">Each cell: the largest turn in one frame, then the result. The model runs 60 steps each second on the Earth of the game (radius ${number(275)} m, air ${number(97.5, 1)} m, clouds ${number(42.5, 1)} m). Earth stands still in this study.</p>
    </section>

    <section class="section-block" aria-labelledby="today-title">
      <p class="eyebrow">02 / WHAT THE CODE DOES TODAY</p>
      <h2 id="today-title">Nine findings</h2>
      <ol class="findings" id="findings"></ol>
    </section>

    <section class="section-block" aria-labelledby="heights-title">
      <p class="eyebrow">03 / WHERE THE RULES CHANGE</p>
      <h2 id="heights-title">Ten heights today, four in option B</h2>
      <div class="heights" id="heights"></div>
      <div class="table-wrap"><table id="carry" aria-label="The jump in speed when the carry of Earth stops"></table></div>
    </section>

    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">04 / THE OPTIONS</p>
      <h2 id="options-title">Three ways to fix it</h2>
      <div class="cards">${(['retune', 'onesky', 'door'] as const).map(option => `
        <article class="card" style="--series:${OPTIONS[option].color}">
          <p class="eyebrow"><i></i>OPTION ${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3>
          <p>${OPTIONS[option].line}</p>
          <ul>${about[option].changes.map(change => `<li>${change}</li>`).join('')}</ul>
          <dl><dt>What stays</dt><dd>${about[option].stays}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        </article>`).join('')}
      </div>
    </section>

    <section class="brief" aria-labelledby="recommendation-title">
      <div class="brief-title"><p class="eyebrow">05 / RECOMMENDATION</p><h2 id="recommendation-title">Option B, One sky</h2>
        <p>The cause is two steering rules and ten heights that do not agree. Option A removes the snaps, but a child who holds W in space still turns a loop and comes back. Option B removes the cause with a medium change. Option C adds a gift, but it takes the steering away at each crossing.</p>
        <a href="${studyUrl}">Read the full study →</a></div>
      <div class="steps">
        <article><span>1</span><div><h3>Build B in src/flight.ts</h3><p>Replace the two branches of turnFlight() with the sky-up rule. Keep the turn rates of today.</p></div></article>
        <article><span>2</span><div><h3>Add the brake curve and the glide</h3><p>The speed curve in stepFlight(), the 25° glide in journeyHeading(), and no heading snap at the arrival in updateFairy().</p></div></article>
        <article><span>3</span><div><h3>Make the carry a part carry</h3><p>The planet frame in animate() of src/main.ts carries the fairy by the sky weight, not all or nothing at the top of the air.</p></div></article>
        <article><span>4</span><div><h3>Slice the landscape build</h3><p>Build the new landscape over many frames after the fairy leaves, and swap it in at the top of the air.</p></div></article>
        <article><span>5</span><div><h3>Play C here, then decide</h3><p>If the glide feels like a gift and not like a loss of control, add only the down scene to B.</p></div></article>
      </div>
    </section>

    <section class="decisions" aria-label="Decisions to make">
      <article><p class="eyebrow">DECISION 1</p><h3>What is up in space?</h3><p>B uses the plane of the orbits. The other choice is the up of the last world. That keeps the view of the start, but it differs after each visit.</p></article>
      <article><p class="eyebrow">DECISION 2</p><h3>Keep loops in space?</h3><p>B removes them. A keeps them. A loop can be a trick on a separate key, not the result of a held W.</p></article>
      <article><p class="eyebrow">DECISION 3</p><h3>A scene at the clouds?</h3><p>C in both directions, only the glide down, or none. Only the glide down hides the landscape build.</p></article>
    </section>
    <footer class="foot"><p>The model is in <code>studies/planet-transition-study/model.ts</code>. <em>Today</em> runs <code>stepFlight()</code> and <code>journeyHeading()</code> of the game without changes.</p></footer>
  </main>`

const scene = createTransitionScene(document.querySelector<HTMLElement>('#transition-view')!, {
  sample: (sample, largest) => showSample(sample, largest),
  rebuild: milliseconds => { document.querySelector('#r-build')!.textContent = `${number(milliseconds)} ms` },
  end: () => { pause.setAttribute('aria-pressed', 'false'); pause.textContent = 'Pause'; kicker.textContent = 'END OF THE MOMENT · PRESS ↺ AGAIN' },
})

// The charts fly on a copy of Earth with the first landscape, so a new landscape in the live view does not change them.
const chartWorld = { ...scene.earth, group: new THREE.Group() }
chartWorld.group.position.copy(scene.earth.group.position)
chartWorld.group.quaternion.copy(scene.earth.group.quaternion)
chartWorld.group.updateMatrixWorld()
const traces = new Map<string, Trace>()
const trace = (option: Option, id: ScenarioId) => {
  const key = `${option}:${id}`
  if (!traces.has(key)) traces.set(key, runScenario(option, id, chartWorld, scene.meadow))
  return traces.get(key)!
}
const summary = (option: Option, id: ScenarioId) => trace(option, id).summary

let run: Run = { option: 'onesky', scenario: 'dive', from: 'above' }
const kicker = document.querySelector<HTMLElement>('#caption-kicker')!
const pause = document.querySelector<HTMLButtonElement>('#pause')!
const out = (id: string) => document.querySelector<HTMLOutputElement>(`#r-${id}`)!
const regions: Record<Sample['mode'], string> = { ground: 'Near the ground', air: 'In the air', edge: 'Edge of space', space: 'Open space', door: 'Cloud door (C)' }

function showSample(sample: Sample, largest: { turn: number; brake: number }) {
  out('altitude').textContent = `${number(sample.altitude)} m`
  out('speed').textContent = `${number(sample.speed)} m/s`
  out('pitch').textContent = `${number(sample.pitch)}°`
  out('mode').textContent = regions[sample.mode] + (sample.guided ? ' · guided' : '')
  out('turn').textContent = `${number(largest.turn, 1)}°`
  out('turn').classList.toggle('alert', largest.turn > 2.5)
  out('brake').textContent = `${number(largest.brake)} m/s²`
  out('brake').classList.toggle('alert', largest.brake > BRAKE * 1.2)
}

function result(summary: Summary, id: ScenarioId) {
  if (id === 'leave-release' || id === 'leave-hold' || id === 'guided-out') return summary.spaceAt !== null ? `space (1,000 m) at ${seconds(summary.spaceAt)}` : `stays at ${number(summary.endAltitude)} m`
  if (id === 'space-down') return summary.airAt !== null ? `into the air at ${seconds(summary.airAt)}` : `never below ${number(summary.lowest)} m`
  if (summary.airAt === null) return `stays at ${number(summary.endAltitude)} m, above the air`
  return `into the air at ${seconds(summary.airAt)}, ends at ${number(summary.endAltitude)} m`
}

function renderCharts(id: ScenarioId) {
  const all = TRANSITION_OPTIONS.map(option => trace(option, id))
  const duration = SCENARIOS[id].duration
  const earth = chartWorld
  const altitude: Metric = { key: 'altitude', title: 'Altitude', unit: 'm', max: 400, lines: [
    { value: steerShell(earth), label: `Steering shell ${number(steerShell(earth))} m` },
    { value: earth.atmosphere, label: `Top of the air ${number(earth.atmosphere, 1)} m` },
    { value: levelCeiling(earth), label: `B: release to cruise below ${number(levelCeiling(earth), 1)} m` },
  ] }
  renderChart(document.querySelector('#chart-altitude')!, altitude, all, duration)
  renderChart(document.querySelector('#chart-turn')!, { key: 'turn', title: 'Largest turn in one frame', unit: '°' }, all, duration)
  renderChart(document.querySelector('#chart-speed')!, { key: 'speed', title: 'Speed', unit: 'm/s' }, all, duration)
  document.querySelector('#charts-title')!.textContent = SCENARIOS[id].name
  document.querySelector('#charts-note')!.textContent = `${SCENARIOS[id].note} ${TRANSITION_OPTIONS.map(option => `${letter(option)}: ${result(summary(option, id), id)}.`).join(' ')}`
}

function renderScore() {
  const rows = SCENARIO_IDS.map(id => `<tr><th scope="row">${SCENARIOS[id].name}</th>${TRANSITION_OPTIONS.map(option => {
    const s = summary(option, id)
    return `<td class="${s.maxTurn > 2.5 ? 'bad' : ''}"><b>${number(s.maxTurn, 1)}°</b> ${result(s, id)}</td>`
  }).join('')}</tr>`).join('')
  document.querySelector('#score')!.innerHTML = `<thead><tr><th scope="col">Moment</th>${TRANSITION_OPTIONS.map(option => `<th scope="col"><i class="${option === 'today' ? 'today' : ''}" style="--series:${OPTIONS[option].color}"></i>${letter(option)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`
}

function renderFindings() {
  const earth = chartWorld
  const hold = summary('today', 'leave-hold'), release = summary('today', 'leave-release'), dive = summary('today', 'dive')
  const down = summary('today', 'space-down'), guided = summary('today', 'guided-in')
  const guidedTurn = Math.max(...trace('today', 'guided-in').samples.filter(sample => sample.events.includes('arrive')).map(sample => sample.turn), 0)
  const items = [
    ['W and S have two meanings', `Below the steering shell (${number(steerShell(earth))} m on Earth), W and S set an angle of climb. Above it, they turn the fairy over. A fairy that holds W from the meadow goes up to ${number(hold.highest)} m, turns a loop and comes back upside down: a turn of ${number(hold.maxTurn)}° in one frame. A fairy that holds S above Earth turns away from it and never comes lower than ${number(down.lowest)} m.`],
    ['Let go above the clouds, and you stay', `"Release to cruise" levels the fairy at every height below the steering shell. A fairy that lets go at ${RELEASE_AT} m cruises at ${number(release.endAltitude)} m, above the air, with no end. To leave Earth, a child must hold W for about 7 s and let go above ${number(steerShell(earth))} m.`],
    ['No keys, no landing', `A fairy that flies straight at Earth levels out at ${number(dive.lowest)} m. The air starts at ${number(earth.atmosphere, 1)} m. She never comes into the air.`],
    ['Snaps at the steering shell', `At ${number(steerShell(earth))} m the up of the fairy changes to the up of Earth in one frame: 90° in every approach test, and up to 170°. A steep dive also turns ${number(dive.maxTurn, 1)}° in one frame at the pitch limit. A straight dive gets an arbitrary heading from a fallback axis in turnFlight().`],
    ['A hard brake', `The speed follows the altitude with no limit. It falls from ${number(SPACE_SPEED)} m/s to about 32 m/s in the last 900 m above the air. The peak is ${number(dive.peakBrake)} m/s², about ${number(dive.peakBrake / 9.81)} g. No picture tells the child about it.`],
    ['The guided arrival snaps', `The guide aims at the centre of Earth. The pitch limit holds the fairy at −77° for about 5 s. Then, at 12 m, her heading turns ${number(guidedTurn)}° in one frame to an east–west heading. The largest turn of the run is ${number(guided.maxTurn)}°.`],
    ['Ten heights that do not agree', `Section 03 shows them. Between ${number(earth.atmosphere, 1)} m and ${number(steerShell(earth))} m, the fairy steers as near Earth, but Earth does not carry her.`],
    ['The carry of Earth stops in one frame', `Earth carries the fairy on its orbit inside the air only. At the top of the air, she loses the speed of Earth in one frame: ${number(orbitSpeed(3300 * PROPORTIONS.spacing, 1))} m/s at 1×, and ${number(orbitSpeed(3300 * PROPORTIONS.spacing, 64))} m/s at 64×. Earth jumps away, or it jumps under her.`],
    ['The new landscape stops a frame', `regenerateWorld() builds all of Earth in one frame at ${number(Math.max(30, earth.atmosphere * 0.82))} m: ${BUILD_MS.Earth[0]}–${BUILD_MS.Earth[1]} ms on a desktop with 20 cores, CPU time only. That is 6 to 7 frames. Mars and Mercury take ${BUILD_MS.Mars[0]}–${BUILD_MS.Mercury[1]} ms, Venus and Jupiter ${BUILD_MS.Venus[0]}–${BUILD_MS.Jupiter[1]} ms. A phone takes longer: this study did not measure it.`],
  ]
  document.querySelector('#findings')!.innerHTML = items.map(([title, body]) => `<li><h3>${title}</h3><p>${body}</p></li>`).join('')
  document.querySelector('#findings')!.insertAdjacentHTML('afterend', '<p class="section-note aside-note"><b>Also found, outside the transition.</b> Ctrl turned hover on and off. Ctrl+W closes the browser tab, and a browser cannot block it. Ctrl+D and Ctrl+S open browser dialogs, and the game pauses. Fixed on 27 September 2026: Q turns hover on and off now.</p>')
}

function renderHeights() {
  const earth = chartWorld
  const column = (title: string, list: Boundary[]) => `<div class="height-column"><h3>${title}</h3><ol class="ladder">${[...list].sort((a, b) => b.altitude - a.altitude).map(boundary => `
    <li class="${boundary.kind}"><span>${number(boundary.altitude, boundary.altitude < 100 ? 1 : 0)} m</span><b>${boundary.name}</b><code>${boundary.code}</code></li>`).join('')}</ol></div>`
  document.querySelector('#heights')!.innerHTML = column('Today', boundariesToday(earth)) + column('Option B', boundariesOneSky(earth))
    + `<p class="section-note">Heights above sea level on Earth, from the highest to the lowest. Steering rules: gold. Looks: blue. The landscape: pink. Seven heights of today are between ${number(Math.max(30, earth.atmosphere * 0.82))} m and ${number(steerShell(earth))} m. For B, the sky turns between ${number(altitudeForAngle(earth, SKY_ANGLES[1]))} m and ${number(altitudeForAngle(earth, SKY_ANGLES[0]))} m.</p>`
  const orbit = 3300 * PROPORTIONS.spacing
  document.querySelector('#carry')!.innerHTML = `<thead><tr><th scope="col">Orbital speed of the game</th><th scope="col">Speed of Earth on its orbit</th><th scope="col">Today: the jump at the top of the air</th><th scope="col">B: the change over the sky shell</th></tr></thead><tbody>${[1, 8, 16, 32, 64].map(factor => `<tr><th scope="row">${factor}×</th><td>${number(orbitSpeed(orbit, factor))} m/s</td><td>${number(orbitSpeed(orbit, factor))} m/s in one frame</td><td>${number(orbitSpeed(orbit, factor))} m/s over ${number(altitudeForAngle(earth, SKY_ANGLES[0]) - altitudeForAngle(earth, SKY_ANGLES[1]))} m</td></tr>`).join('')}</tbody>`
}

function setPressed(selector: string, test: (button: HTMLButtonElement) => boolean) {
  document.querySelectorAll<HTMLButtonElement>(selector).forEach(button => button.setAttribute('aria-pressed', String(test(button))))
}

function apply() {
  setPressed('[data-option]', button => button.dataset.option === run.option)
  setPressed('[data-scenario]', button => run.scenario !== 'free' && button.dataset.scenario === run.scenario)
  setPressed('[data-free]', button => run.scenario === 'free' && button.dataset.free === run.from)
  document.querySelector('#option-line')!.textContent = OPTIONS[run.option].line
  document.querySelector('#mode-label')!.textContent = letter(run.option).toUpperCase()
  const free = run.scenario === 'free'
  kicker.textContent = free ? 'FREE FLIGHT · CLICK THE VIEW, THEN FLY' : `MOMENT ${SCENARIO_IDS.indexOf(run.scenario as ScenarioId) + 1} OF ${SCENARIO_IDS.length}`
  document.querySelector('#caption-title')!.textContent = free ? (run.from === 'meadow' ? 'From the meadow' : 'From space') : SCENARIOS[run.scenario as ScenarioId].name
  document.querySelector('#caption-note')!.textContent = free
    ? 'W / ↑ climb · S / ↓ descend · A D / ← → turn · Shift boost. Try to leave Earth, then come back.'
    : SCENARIOS[run.scenario as ScenarioId].note
  document.querySelector('#scene-help')!.textContent = free ? 'The view must have the focus for the keys' : 'The keys are scripted in a moment'
  pause.setAttribute('aria-pressed', 'false'); pause.textContent = 'Pause'
  document.querySelectorAll('.controls output').forEach(output => { output.textContent = '—'; output.classList.remove('alert') })
  scene.load(run)
  if (!free) renderCharts(run.scenario as ScenarioId)
}

document.querySelectorAll<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { run = { ...run, option: button.dataset.option as Option }; apply() }))
document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => button.addEventListener('click', () => { run = { ...run, scenario: button.dataset.scenario as ScenarioId }; apply() }))
document.querySelectorAll<HTMLButtonElement>('[data-free]').forEach(button => button.addEventListener('click', () => { run = { ...run, scenario: 'free', from: button.dataset.free as Run['from'] }; apply() }))
document.querySelector('#replay')!.addEventListener('click', () => apply())
pause.addEventListener('click', () => {
  const pausing = scene.playing
  scene.setPlaying(!pausing)
  pause.setAttribute('aria-pressed', String(pausing))
  pause.textContent = pausing ? 'Play' : 'Pause'
})
const toggle = (id: string, action: (on: boolean) => void) => {
  const button = document.querySelector<HTMLButtonElement>(`#${id}`)!
  button.addEventListener('click', () => { const on = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(on)); action(on) })
}
toggle('slow', on => scene.setRate(on ? 0.5 : 1))
toggle('rebuild', on => scene.setRebuild(on))
toggle('shells', on => scene.setShells(on))

document.querySelector('#export')!.addEventListener('click', () => {
  const data = {
    study: 'planet-transition-study', exported: new Date().toISOString(), selected: run,
    constants: { brake: BRAKE, skyAngles: SKY_ANGLES, door: DOOR, steerShell: steerShell(chartWorld), levelCeiling: levelCeiling(chartWorld) },
    results: Object.fromEntries(SCENARIO_IDS.map(id => [id, Object.fromEntries(TRANSITION_OPTIONS.map(option => [option, summary(option, id)]))])),
    build: BUILD_MS,
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  link.download = 'planet-transition-study.json'
  link.click()
  URL.revokeObjectURL(link.href)
})

renderScore()
renderFindings()
renderHeights()
apply()
