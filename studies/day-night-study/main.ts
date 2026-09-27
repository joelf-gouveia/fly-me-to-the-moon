import './style.css'
import { createDayNightScene } from './scene'
import { advanceHour, presets, sampleHour } from './model'
import type { NightStyle } from './model'
import studyUrl from '../../docs/day-night-study.md?url'

document.querySelector<HTMLDivElement>('#day-night-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>04</b> / LIGHT & TIME</span><button id="export">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">A WORLD THAT TURNS. A SKY THAT CHANGES.</p><h1>When the world <em>turns.</em></h1></div><p>Peach mornings. Golden gardens. A little light to lead you home.<br>A day & night proposal for our rotating planets.</p></header>
    <section class="workspace" aria-label="Interactive lighting study">
      <div class="preview-column">
        <div id="garden"><div class="scene-top"><span class="tag">LIVE 3D · BLOSSOM HAVEN</span><span class="tag" id="mode-label">PROPOSED LIGHTING</span></div>
          <div class="scene-caption"><p class="eyebrow" id="phase-kicker">THE GOLDEN HOUR</p><h2 id="phase-title">Sunset in the garden</h2><p id="phase-note"></p></div>
          <span class="scene-help">Drag to look around · scroll to zoom</span></div>
        <div class="timeline"><div class="timeline-head"><button id="play" aria-pressed="false">▶ Play a day</button><label for="hour">LOCAL SOLAR TIME <output id="clock">17:30</output></label><label class="speed">Preview speed <select id="speed"><option value="48">48-second day</option><option value="300">5-minute day</option><option value="24">24-second day</option></select></label></div>
          <input id="hour" type="range" min="0" max="24" step="0.01" value="17.5" aria-label="Local solar time in hours" />
          <div class="ticks" aria-hidden="true"><span>Midnight</span><span>Dawn</span><span>Noon</span><span>Sunset</span><span>Midnight</span></div>
          <div class="presets">${presets.map(p => `<button data-hour="${p.hour}" aria-pressed="${p.name === 'Sunset'}"><i class="swatch ${p.name.toLowerCase()}"></i>${p.name}</button>`).join('')}</div>
        </div>
      </div>
      <aside class="controls"><p class="eyebrow">01 / ART DIRECTION</p><h2>Night, with a welcome.</h2><p>Let the world feel different after sunset while keeping the fairy and her surroundings readable.</p>
        <fieldset><legend>Night brightness</legend><div class="segmented"><button data-style="gentle" aria-pressed="true">Gentle night</button><button data-style="deep" aria-pressed="false">Deep night</button></div></fieldset>
        <p class="fine" id="style-note">Recommended starting point: soft lilac fill, visible paths, warm cottage windows.</p>
        <label class="check"><input id="compare" type="checkbox" /> Compare always-day lighting</label>
        <label for="view">Camera</label><select id="view"><option value="meadow">Across the garden</option><option value="home">At the cottage</option><option value="friends">Near the fairy & butterflies</option></select>
        <div class="mechanism"><p class="eyebrow">02 / WHY THE LIGHT CHANGES</p>
          <svg viewBox="0 0 300 150" role="img" aria-label="A surface location rotates from the bright side of a planet into its dark side. The Sun remains to the right."><defs><clipPath id="planet-disc"><circle cx="98" cy="70" r="40"/></clipPath></defs><path d="M165 48H235M165 70H235M165 92H235" stroke="#a37d42" stroke-width="1"/><circle cx="98" cy="70" r="52" fill="none" stroke="#3c4e64" stroke-dasharray="3 5"/><circle cx="98" cy="70" r="40" fill="#263755"/><path d="M98 30A40 40 0 0 1 98 110Z" fill="#90b9b5" clip-path="url(#planet-disc)"/><circle id="observer" r="6" fill="#fff0c4" stroke="#111c29" stroke-width="2"/><circle cx="260" cy="70" r="18" fill="#f4cf87"/><text x="245" y="110">SUN</text><text x="57" y="141">ROTATING PLANET</text></svg>
          <p>The dot is your location. Sun above your horizon: day. Sun below it: twilight, then night.</p>
          <div class="meter-row"><span>Sun elevation</span><output id="elevation"></output></div><div class="meter-row"><span>Direct sunlight</span><output id="sunlight"></output></div>
        </div>
      </aside>
    </section>
    <section class="brief"><div class="brief-title"><p class="eyebrow">03 / IMPLEMENTATION STUDY</p><h2>One Sun.<br>Every world responds.</h2><p>The preview is an equatorial garden concept. In the game, position and orientation determine the light, including when you fly around a planet.</p><p><strong>A detail to resolve:</strong> the actual cottage is at Blossom Haven’s south pole. Spin alone cannot give it a daily sunrise. A daily cycle there needs a new cottage latitude or an explicitly magical local cycle.</p><a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps"><article><span>01</span><div><h3>Connect light to the actual Sun</h3><p>The current light follows the fairy and the sky stays bright. Use the outward surface normal and the direction to the Sun to calculate solar elevation after each spin and orbit update.</p></div></article>
        <article><span>02</span><div><h3>Let the whole atmosphere follow</h3><p>Blend sky, fog, ambient light, and stars from that elevation. Shade the atmosphere shell per location, so the night side also looks dark from space. Keep twilight gradual.</p></div></article>
        <article><span>03</span><div><h3>Keep the garden easy to explore</h3><p>Retain a little cool fill light. Let the existing fairy glow and cottage windows stand out. A small local shadow map can add long sunset shadows after the basic cycle works.</p></div></article>
        <article><span>04</span><div><h3>Use the motion already in the game</h3><p>Earth spins in 4 minutes; Blossom Haven in 5. The orbit also changes the Sun’s bearing, so a solar day differs from a spin. Do not add a second gameplay clock.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">PROPOSED DEFAULT</p><h3>A gentle night</h3><p>Cool blue skies, readable candy colors, quiet stars, and a warm home. No new nighttime tasks or need to wait for morning.</p></article><article><p class="eyebrow">FIRST IMPLEMENTATION</p><h3>Light → sky → atmosphere</h3><p>Start with solar direction and twilight. Then match the orbital view. Review shadows and extra glow only after transitions feel right.</p></article><article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>Beyond this garden</h3><p>Check poles, airless worlds, gas giants, fast orbit speeds, and home relocation. This prototype shows a visual direction; it does not change gameplay.</p></article></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 04</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const scene = createDayNightScene(element('#garden'))
let hour = 17.5, style: NightStyle = 'gentle', playing = false, secondsPerDay = 48
let currentLighting = false, previous = performance.now()
const hourInput = element<HTMLInputElement>('#hour')
const play = element<HTMLButtonElement>('#play')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
scene.setPaused(true)

function setPlaying(value: boolean) {
  playing = value
  play.textContent = value ? 'Ⅱ Pause day' : '▶ Play a day'
  play.setAttribute('aria-pressed', String(value))
  scene.setPaused(!value || reducedMotion.matches)
}

function render() {
  const state = scene.update(hour, style, currentLighting)
  hourInput.value = String(hour)
  const minutes = Math.round(hour * 60) % 1440
  element('#clock').textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  hourInput.setAttribute('aria-valuetext', `${element('#clock').textContent} local solar time`)
  const preset = state.elevation < -6 ? presets[3] : state.elevation > 22 ? presets[1] : hour < 12 ? presets[0] : presets[2]
  element('#phase-title').textContent = currentLighting ? 'Always daytime' : `${preset.name} in the garden`
  element('#phase-kicker').textContent = currentLighting ? 'BASELINE COMPARISON' : preset.name === 'Sunset' ? 'THE GOLDEN HOUR' : 'A DIFFERENT KIND OF QUIET'
  element('#phase-note').textContent = currentLighting ? 'A representative fixed-light baseline: moving time does not darken the garden.' : preset.note
  element('#mode-label').textContent = currentLighting ? 'ALWAYS-DAY BASELINE' : 'PROPOSED LIGHTING'
  element('#elevation').textContent = `${state.elevation.toFixed(1)}°`
  element('#sunlight').textContent = currentLighting ? 'Fixed (baseline)' : `${Math.round(state.sunIntensity / 3 * 100)}%`
  element('#observer').setAttribute('cx', String(98 + Math.cos(state.angle) * 40))
  element('#observer').setAttribute('cy', String(70 + Math.sin(state.angle) * 40))
  document.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button => button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.hour) - hour) < 0.08)))
}

play.addEventListener('click', () => setPlaying(!playing))
hourInput.addEventListener('input', () => { hour = Number(hourInput.value); setPlaying(false); render() })
document.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button => button.addEventListener('click', () => {
  hour = Number(button.dataset.hour); setPlaying(false); render()
}))
document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button => button.addEventListener('click', () => {
  style = button.dataset.style as NightStyle
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(option => option.setAttribute('aria-pressed', String(option === button)))
  element('#style-note').textContent = style === 'gentle' ? 'Recommended starting point: soft lilac fill, visible paths, warm cottage windows.' : 'A darker alternative: more atmosphere, less terrain visibility. Compare at night before choosing.'
  render()
}))
element<HTMLSelectElement>('#speed').addEventListener('change', event => { secondsPerDay = Number((event.target as HTMLSelectElement).value) })
element<HTMLInputElement>('#compare').addEventListener('change', event => { currentLighting = (event.target as HTMLInputElement).checked; render() })
element<HTMLSelectElement>('#view').addEventListener('change', event => {
  scene.setView((event.target as HTMLSelectElement).value as 'meadow' | 'home' | 'friends'); render()
})
element('#export').addEventListener('click', () => {
  const payload = { study: 'day-night', version: 1, status: 'proposal-only', hour, nightStyle: style, comparison: currentLighting, previewSecondsPerDay: secondsPerDay, camera: element<HTMLSelectElement>('#view').value, lighting: sampleHour(hour, style), implementation: 'Derive solar elevation from world-space position and actual Sun; reuse existing rotation and orbit.' }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'day-night-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
document.addEventListener('visibilitychange', () => { previous = performance.now() })
function animate(now: number) {
  const delta = Math.min((now - previous) / 1000, 0.1); previous = now
  if (playing && !document.hidden) { hour = advanceHour(hour, delta, secondsPerDay); render() }
  requestAnimationFrame(animate)
}
render()
requestAnimationFrame(animate)
