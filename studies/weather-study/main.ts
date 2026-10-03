import '../seasons-study/style.css'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { createTerrain, seededRandom } from '../../src/terrain'
import { createFields } from '../../src/foliage/zones'
import { seasonAt, yearOfDate } from '../../src/seasons'
import type { SeasonName } from '../../src/seasons'
import { LIVE, live, WEATHER_CLIPS } from './clips'
import type { LivePlace, LiveSky } from './clips'
import {
  BELT_ROWS, climate, clipById, CLIPS, CLOUD_KINDS, createWeatherModel, DECISIONS, FINDINGS, hourLabel, KIND_NAMES, latitudeLabel, monthAt, OPTIONS, rainBelt,
  PUFF_FAULTS, SEASON_WORDS, SEASON_YEARS, SYSTEMS, title, WEATHER,
} from './model'
import type { ClipId, Place } from './model'
import type { CloudLook, Mode } from './weather'
import studyUrl from '../../docs/weather-study.md?url'
import studyText from '../../docs/weather-study.md?raw'
import sharedStyle from '../feature-ideas-study/page.css?inline'
import seasonsStyle from '../seasons-study/page.css?inline'
import pageStyle from './page.css?inline'

const root = document.querySelector<HTMLDivElement>('#weather-study')!
const SEASONS: SeasonName[] = ['spring', 'summer', 'autumn', 'winter']

/** The capture page: the lab alone at the size of the window. weather-study-capture.mjs asks for each frame. */
function startCapture() {
  document.body.classList.add('is-capture')
  root.innerHTML = '<div class="stage capture-stage" id="scene"></div>'
  // The game makes a new Earth at each visit. The capture has one Earth, so each run gives the same clips.
  Math.random = seededRandom(Number(new URLSearchParams(location.search).get('seed') ?? 5))
  const lab = createLab(root.querySelector<HTMLElement>('#scene')!)
  lab.capture(true)
  Object.defineProperty(window, '__capture', { value: {
    features: Object.keys(WEATHER_CLIPS),
    load(id: ClipId) {
      lab.load(WEATHER_CLIPS[id])
      const run = lab.run!
      return { duration: run.duration, still: run.still ?? run.duration * 0.6 }
    },
    frame(delta: number) { lab.step(delta); return { t: lab.time, playing: lab.playing } },
    cues: () => [],
    get lab() { return lab },
  } })
}

const rgb = (from: number[], to: number[], t: number) => from.map((channel, i) => Math.round(channel + (to[i] - channel) * t))
/**
 * The rain calendar: the part of the places of each latitude with rain or snow at noon, through one
 * year. The tropics of the figure have the moisture of a wet savanna.
 */
function rainCalendar() {
  const model = createWeatherModel(21)
  const columns = 48, rows = 36, width = 600, height = 300, left = 44, top = 8, bottom = 24
  const cell = { w: (width - left) / columns, h: (height - top - bottom) / rows }
  const dry = [30, 38, 64], wet = [78, 156, 236], snow = [240, 245, 248]
  let cells = ''
  for (let row = 0; row < rows; row++) {
    const latitude = 90 - (row + 0.5) * 180 / rows
    for (let column = 0; column < columns; column++) {
      const average = climate(model, latitude, 0.05, column / columns, 60), all = average.rain + average.snow
      const colour = rgb(rgb(dry, wet, Math.min(1, all * 2.4)), snow, all > 0 ? average.snow / all * Math.min(1, all * 4) : 0)
      cells += `<rect x="${(left + column * cell.w).toFixed(1)}" y="${(top + row * cell.h).toFixed(1)}" width="${(cell.w + 0.6).toFixed(1)}" height="${(cell.h + 0.6).toFixed(1)}" fill="rgb(${colour.join(',')})"/>`
    }
  }
  const y = (latitude: number) => top + (90 - latitude) / 180 * (height - top - bottom)
  const marks = [60, 30, 0, -30, -60].map(latitude => `<text x="${left - 6}" y="${y(latitude) + 4}" text-anchor="end">${latitude === 0 ? '0°' : `${Math.abs(latitude)}° ${latitude > 0 ? 'N' : 'S'}`}</text>`).join('')
  const belt = Array.from({ length: columns + 1 }, (_, i) => `${i ? 'L' : 'M'}${(left + i * cell.w).toFixed(1)} ${y(rainBelt(i / columns)).toFixed(1)}`).join(' ')
  const months = [0, 0.25, 0.5, 0.75].map(year => `<text x="${left + year * (width - left) + 4}" y="${height - 7}">${monthAt(year + 0.03)}</text>`).join('')
  return `<figure><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="The part of the places with rain or snow at each latitude through one year">${cells}<path class="belt" d="${belt}"/>${marks}${months}</svg>
    <figcaption><b>The rain calendar.</b> Each column is one day of the year. Each row is one latitude, with the north at the top. Blue is rain, white is snow and dark is a dry sky. The tropics of the figure are a wet savanna. The dashed line is the middle of the rain belt of the tropics: it follows the Sun.</figcaption></figure>`
}
/** One moment of the weather map of one Earth: the land, the sea, the cloud, the rain and the snow. */
function weatherMoment(year: number) {
  const seed = 21, model = createWeatherModel(seed), terrain = createTerrain('earth', seed), fields = createFields(seed)
  const columns = 120, rows = 60, width = 600, height = 300
  const cell = { w: width / columns, h: height / rows }
  const sea = [24, 78, 112], land = [92, 140, 70], sand = [201, 184, 128], cloud = [244, 247, 250], rain = [70, 120, 200], snow = [255, 255, 255], ice = [222, 232, 238]
  let cells = ''
  for (let row = 0; row < rows; row++) {
    const latitude = (90 - (row + 0.5) * 180 / rows) * Math.PI / 180
    for (let column = 0; column < columns; column++) {
      const longitude = (column + 0.5) / columns * Math.PI * 2
      const x = Math.cos(latitude) * Math.cos(longitude), z = Math.cos(latitude) * Math.sin(longitude), sample = terrain(x, Math.sin(latitude), z)
      const place: Place = { x, y: Math.sin(latitude), z, height: sample.height, moist: fields.moist(x, Math.sin(latitude), z), river: sample.river }
      // Noon at the middle of the figure.
      const weather = model.at(place, { year, hour: 12 + (column / columns - 0.5) * 24, time: 400 })
      let colour = sample.height < 0 ? sea : rgb(sand, land, Math.min(1, Math.max(0, (place.moist + 0.3) * 2 + Math.abs(place.y) * 3 - 0.6)))
      // The snow of the seasons on the land, and the ice on the sea.
      if (sample.height >= 0 && weather.warm < 0.66) colour = rgb(colour, ice, Math.min(1, (0.66 - weather.warm) * 12))
      if (sample.height < 0 && weather.warm < 0.36) colour = rgb(colour, ice, Math.min(1, (0.36 - weather.warm) * 16))
      colour = rgb(colour, cloud, weather.cover * 0.82)
      if (weather.rain > 0.12) colour = rgb(colour, weather.snow > 0.5 ? snow : rain, 0.35 + weather.rain * 0.5)
      cells += `<rect x="${(column * cell.w).toFixed(1)}" y="${(row * cell.h).toFixed(1)}" width="${(cell.w + 0.5).toFixed(1)}" height="${(cell.h + 0.5).toFixed(1)}" fill="rgb(${colour.join(',')})"/>`
    }
  }
  return `<figure><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="The weather map of one Earth in ${monthAt(year)}">${cells}</svg>
    <figcaption><b>One moment of the weather map, in ${monthAt(year)}.</b> The whole planet, with the north at the top. White is cloud, blue is rain and bright white is snow. The pale land of the south has the snow of the winter there. The fronts are about 80 m across. The rain belt of the tropics is at ${latitudeLabel(rainBelt(year))}.</figcaption></figure>`
}
/** The average weather of each belt in each season, from the model. */
function climateTable() {
  const model = createWeatherModel(21)
  const cell = (latitude: number, moist: number, year: number) => {
    const average = climate(model, latitude, moist, year, 240), all = average.rain + average.snow
    const word = all < 0.04 ? 'Dry' : `${average.snow > average.rain ? 'Snow' : 'Rain'} at ${Math.round(all * 100)}% of the places`
    return `<td>${word}<br><span class="small">Cloud ${Math.round(average.cover * 100)}%</span></td>`
  }
  return `<div class="table-wrap"><table><thead><tr><th>Belt of the game</th>${SEASONS.map(name => `<th>${title(name)} in the north</th>`).join('')}</tr></thead><tbody>${BELT_ROWS.map(row =>
    `<tr><th>${row.name}<br><span class="small">${latitudeLabel(row.latitude)}</span></th>${SEASONS.map(name => cell(row.latitude, row.moist, SEASON_YEARS[name])).join('')}</tr>`).join('')}</tbody></table></div>`
}

function startPage() {
  const style = document.createElement('style')
  style.textContent = sharedStyle + seasonsStyle + pageStyle
  document.head.append(style)
  showErrors()
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/weather/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'W4') as ClipId, live: false }
  const STORE = 'fairy-weather-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const today = yearOfDate(new Date())
  const picture = (file: string, alt: string, name: string, words: string) => `<figure><img src="${media(file)}" alt="${alt}" loading="lazy" width="1280" height="720"><figcaption><b>${name}</b>${words}</figcaption></figure>`

  root.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>21</b> / THE WEATHER</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">THE SKY OF EARTH</p><h1>A sky that <em>changes.</em></h1></div>
      <p>Earth gets the weather of the real world: rain, snow, wind, mist, a rainbow and thunder far away, with new clouds for each weather. The place, the season and the hour make the weather: warm rain in the jungle, a dry sky over the desert, showers in spring and snow in winter. The weather then changes the clouds, the light, the ground, the water, the plants and the stars. Each clip comes from the engine of the game, with the weather added by study code. <b>Try it live</b> gives you the place, the day and the sky.<br>The study does not change the game, and it does not include Blossom Haven. Your answers go at the end of the page. <a href="#technical-title">Read the study ↓</a></p></header>

    <section class="workspace" aria-label="The weather in the engine of the game">
      <div class="stage-column">
        <div class="stage-bar"><div class="chips" role="group" aria-label="Clip">${CLIPS.map(clip => `<button type="button" data-pick="${clip.id}"><b>${clip.id}</b> ${clip.name}</button>`).join('')}</div></div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">Try it live</button></div>
          <p class="section-note" id="player-note"></p>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <section class="section-block" aria-labelledby="rule-title">
      <p class="eyebrow">01 / WHAT MAKES THE WEATHER</p>
      <h2 id="rule-title">Four things: the place, the season, the hour and the fronts</h2>
      <p class="section-note">The model gives each place a number for each moment. Cloud starts above ${WEATHER.cloud.low}, rain above ${WEATHER.rain.low} and thunder above ${WEATHER.storm.low}. Four things go into the number. Each one comes from a system that the game has: the climate belts of the foliage study, the year and the warmth of the seasons study, and the Sun of the day and night study.</p>
      <div class="rules magic-rules">
        <article><p class="eyebrow">1 · THE PLACE</p><h3>The belt decides how wet the air is</h3><p>The game has a moisture field that puts the jungle, the savanna and the desert on the planet. The weather reads the same field. The middle latitudes have rain in each season. The cold air of the poles holds little water.</p></article>
        <article><p class="eyebrow">2 · THE SEASON</p><h3>The rain follows the Sun</h3><p>The rain belt of the tropics goes north in June and south in December, so the savanna has a wet season and a dry season. The warmth of the season decides rain or snow. Autumn has the most wind and mist.</p></article>
        <article><p class="eyebrow">3 · THE HOUR</p><h3>Mist at dawn, heat showers in the afternoon</h3><p>Mist lies on low, wet ground at dawn and goes away when the Sun warms the air. A warm, wet afternoon makes heat showers, with thunder far away. A rainbow needs a Sun that is lower than 42°.</p></article>
        <article><p class="eyebrow">4 · THE FRONTS</p><h3>The weather moves</h3><p>Fields of cloud go around the planet in ${WEATHER.frontRound / 60} minutes: from the west to the east in the middle latitudes, and from the east to the west in the tropics, as on the real Earth. Each new Earth has new fronts.</p></article>
      </div>
      ${climateTable()}
      <p class="section-note">The table gives the average of the model at noon. Today is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: ${seasonAt(32, today) ?? 'no season'} at 32° N. The game starts its year on the real date, so the weather of the first view follows the real season.</p>
    </section>

    <section class="section-block" aria-labelledby="map-title">
      <p class="eyebrow">02 / THE WEATHER MAP</p>
      <h2 id="map-title">One small map that each system reads</h2>
      <p class="section-note">The weather is a place. A map of 128 × 64 points holds four numbers for each place of the planet: the cloud, the rain, the part of the rain that is snow, and the water or the fresh snow on the ground. The clouds, the ground, the water and the plants read the map in their shaders. The rain, the fog, the light, the wind and the stars read the weather at the camera. So each system agrees with the others, and the fairy can see a shower from far away.</p>
      <div class="map-grid">${rainCalendar()}${weatherMoment(SEASON_YEARS.summer)}</div>
    </section>

    <section class="section-block" aria-labelledby="clouds-title">
      <p class="eyebrow">03 / THE CLOUDS</p>
      <h2 id="clouds-title">New clouds that follow the weather</h2>
      <p class="section-note">The weather needs better clouds than the puffs of the game. The study has new clouds for Earth, and each kind reads the weather map. These pictures are frames of clip W9: the same view with the puffs of today, then with the new clouds in three kinds of weather.</p>
      <div class="season-rows"><div class="season-row">${[['Before', 'The puffs of the game'], ['Fair weather', 'Small heap clouds and high wisps'], ['A front', 'Rain clouds and the grey layer'], ['The low Sun', 'The warm colours of dusk']].map(([name, words], index) => picture(`W9-${index}.jpg`, `${name}: ${words}`, name, words)).join('')}</div></div>
      <div class="cloud-grid">
        <div><h3>The puffs of today</h3><ul>${PUFF_FAULTS.map(text => `<li>${text}</li>`).join('')}</ul></div>
        <div class="table-wrap"><table><thead><tr><th>New cloud</th><th>Where it shows</th><th>Its look</th></tr></thead><tbody>${CLOUD_KINDS.map(kind => `<tr><th>${kind.name}</th><td>${kind.where}</td><td>${kind.look}</td></tr>`).join('')}</tbody></table></div>
      </div>
    </section>

    <section class="section-block" aria-labelledby="four-title">
      <p class="eyebrow">04 / FOUR SEASONS, ONE PLACE</p>
      <h2 id="four-title">The weather of each season at 32° N</h2>
      <p class="section-note">These pictures are frames of clip W2: one tripod in the leaf forest. The seasons of the game give the colours of the land. The weather gives the sky, the light and the things in the air.</p>
      <div class="season-rows"><div class="season-row">${SEASONS.map((name, index) => picture(`W2-${index}.jpg`, `The weather of ${name} at 32° N`, title(name), SEASON_WORDS[name])).join('')}</div></div>
    </section>

    <section class="section-block" aria-labelledby="clips-title">
      <p class="eyebrow">05 / THE TEN CLIPS</p>
      <h2 id="clips-title">Pick one to see it</h2>
      <div class="idea-cards clips">${CLIPS.map(clip => `<button type="button" class="idea-card" data-pick="${clip.id}">
        <img src="${media(`${clip.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${clip.id}</b><strong>${clip.name}</strong></span>
        <span class="idea-line">${clip.line}</span></button>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="systems-title">
      <p class="eyebrow">06 / WHAT THE WEATHER AND THE SEASON CHANGE</p>
      <h2 id="systems-title">Fourteen systems of the game</h2>
      <p class="section-note">The season changes the weather, and the two together can change other systems. <b>First</b>: in the prototype of this study, and in the first change to the game. <b>Later</b>: a good second step, not in the prototype. <b>Open</b>: the study gives no proposal. Decision 7 asks for your selection.</p>
      <div class="table-wrap"><table><thead><tr><th>System</th><th>With the weather</th><th>With the season</th><th>In the clips</th><th>Proposal</th></tr></thead><tbody>${SYSTEMS.map(row =>
        `<tr><th>${row.name}</th><td>${row.weather}</td><td>${row.season}</td><td>${row.shown}</td><td><span class="pill${row.when === 'First' ? ' proposed' : ''}">${row.when}</span></td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">07 / WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([heading, text]) => `<li><h3>${heading}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">08 / TWO WAYS TO MAKE THE WEATHER</p>
      <h2 id="options-title">A weather map, or one sky</h2>
      <p class="section-note">The look of the rain, the snow and the mist is the same in the two options. The options differ in where the weather is. The live view has a switch for them: look at the planet from space.</p>
      <div class="option-grid">${OPTIONS.map(option => `<article class="option-card"><h3><b>${option.id}</b>${option.name}</h3><p>${option.line}</p><h4>Good</h4><ul>${option.good.map(text => `<li>${text}</li>`).join('')}</ul><h4>Cost</h4><ul>${option.bad.map(text => `<li>${text}</li>`).join('')}</ul></article>`).join('')}</div>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">09 / RECOMMENDATION</p><h2 id="brief-title">A weather map that follows the place and the season.</h2>
        <p>Earth is the real world of the game, so its weather follows the rules of the real world. The rules use the landscape of each visit, so a new Earth has new weather. The weather stays calm: a soft grey sky, a glow for the thunder, and no danger.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>The model and the map</h3><p>A new <code>src/weather.ts</code> with the model of this study and its unit tests. It makes the weather map: a texture of 128 × 64, with one eighth of the map on each frame.</p></div></article>
        <article><span>2</span><div><h3>The clouds</h3><p><code>buildClouds()</code> makes the new clouds of Earth in place of the puffs: the heap clouds, the high wisps, the grey layer and the rain curtains. Each one reads the map.</p></div></article>
        <article><span>3</span><div><h3>Rain and snow</h3><p>One draw call of rain lines near the fairy. <code>fallAt()</code> of <code>src/seasons.ts</code> gives snow only under a snow cloud. Half the drops on a phone, and no motion with reduced motion.</p></div></article>
        <article><span>4</span><div><h3>The sky, the light and the ground</h3><p>A weather term in <code>updateEnvironment()</code> for the fog, the sky, the light, the stars and the wind of the plants. A shader change in the ground, the water and the plants, as the seasons have. The rainbow and the mist.</p></div></article>
        <article><span>5</span><div><h3>The words, the sound and the life</h3><p>The name of the weather in the flight panel. Then the sound, the creatures and the sticker tasks, each as its own small change.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">10 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes for ${esc(decision.title)}">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">11 / THE TECHNICAL STUDY</p><h2 id="technical-title">The findings, the model and the change for each part</h2><p>The same text as <a href="${studyUrl}">docs/weather-study.md</a>.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 21</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const video = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null

  const places: [LivePlace, string][] = [['space', 'From space'], [50, '50° N'], [32, '32° N'], [4, 'Equator'], [-32, '32° S'], [-50, '50° S']]
  const skies: [LiveSky, string][] = [['map', 'From the map'], ['clear', 'Clear'], ['fair', 'A few clouds'], ['rain', 'Rain or snow'], ['storm', 'Thunder far away'], ['mist', 'Mist']]
  const cloudLooks: [CloudLook, string][] = [['new', 'New clouds'], ['puffs', 'Puffs of the game']]
  const modes: [Mode, string][] = [['map', 'A · Weather map'], ['one', 'B · One sky'], ['off', 'Game of today']]
  const chips = (name: string, options: [string, string][], current: string) => `<div class="chips" role="group">${options.map(([value, label]) => `<button type="button" data-live="${name}" data-value="${value}" aria-pressed="${value === current}">${label}</button>`).join('')}</div>`
  function renderDetail() {
    const clip = clipById(state.id)
    get('#detail').innerHTML = state.live ? `
      <p class="eyebrow">LIVE 3D</p>
      <h2>The sky in your hands</h2>
      <div class="live-controls">
        <div class="field"><span>Place</span>${chips('place', places.map(([value, label]) => [String(value), label]), String(live.place))}</div>
        <label class="field"><span>Day of the year <b id="year-label"></b></span><input type="range" id="year" min="0" max="1" step="0.002" value="${live.year}"></label>
        <div class="chips">${SEASONS.map(name => `<button type="button" data-season="${name}">${title(name)}</button>`).join('')}<button type="button" id="today">Today</button></div>
        <label class="field"><span>Hour of the day <b id="hour-label"></b></span><input type="range" id="hour" min="0" max="24" step="0.25" value="${live.hour}"></label>
        <div class="field"><span>Weather</span>${chips('mode', modes, live.mode)}</div>
        <div class="field"><span>Sky over the fairy</span>${chips('sky', skies, live.sky)}</div>
        <div class="field"><span>Clouds</span>${chips('clouds', cloudLooks, live.clouds)}</div>
        <div class="chips"><button type="button" id="play-weather" aria-pressed="${live.play}">${live.play ? '❚❚ Stop the fronts' : '▶ Move the fronts'}</button><button type="button" id="free" aria-pressed="${live.free}">${live.free ? 'Back to the tripod' : 'Free flight'}</button></div>
        <p class="small">Rain becomes snow where the place is cold: try 50° N in winter. The fronts move 10 times faster than the proposal here.</p>
      </div>` : `
      <p class="eyebrow">${clip.id} · EARTH</p>
      <h2>${clip.name}</h2>
      <p class="lead">${clip.line}</p>
      <h3>What to look at</h3><p>${clip.look}</p>
      <h3>What the clip does not show</h3><p>${clip.honest}</p>`
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id && !state.live)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#player-note').textContent = state.live ? (live.free ? 'Free flight: W and S climb and descend, A and D turn, Shift boosts. Fly to a cloud to find the rain.' : 'Live 3D. The camera is on a tripod. Free flight gives the keys to you.') : ''
    if (state.live) { bindLive(); renderLabels() }
  }
  function renderLabels() {
    const set = (id: string, text: string) => { const element = document.getElementById(id); if (element) element.textContent = text }
    set('year-label', monthAt(live.year))
    set('hour-label', hourLabel(live.hour))
  }
  function bindLive() {
    document.querySelectorAll<HTMLButtonElement>('[data-live]').forEach(button => button.addEventListener('click', () => {
      const { live: name, value } = button.dataset
      if (name === 'mode') live.mode = value as Mode
      if (name === 'sky') live.sky = value as LiveSky
      if (name === 'clouds') live.clouds = value as CloudLook
      if (name === 'place') { live.place = value === 'space' ? value : Number(value); leaveFlight() }
      renderDetail()
    }))
    document.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(button => button.addEventListener('click', () => { live.year = SEASON_YEARS[button.dataset.season as SeasonName]; renderDetail() }))
    const range = (id: string, apply: (value: number) => void) => document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener('input', event => { apply(Number((event.target as HTMLInputElement).value)); renderLabels() })
    range('year', value => { live.year = value })
    range('hour', value => { live.hour = value })
    get('#play-weather').addEventListener('click', () => { live.play = !live.play; renderDetail() })
    get('#today').addEventListener('click', () => { live.year = today; renderDetail() })
    get('#free').addEventListener('click', () => {
      if (live.free) leaveFlight()
      else if (live.place !== 'space') { live.free = true; lab?.fly() }
      renderDetail()
    })
  }
  /** Back to the tripod: the live feature places the fairy and the camera again. */
  function leaveFlight() {
    if (!live.free) return
    live.free = false
    lab?.replay()
  }

  function loadClip() {
    video.poster = media(`${state.id}.jpg`)
    video.src = media(`${state.id}.webm`)
    if (!state.live) void video.play().catch(() => {})
  }
  function setLive(on: boolean) {
    state.live = on
    get('#live').hidden = !on
    video.hidden = on
    if (on) {
      video.pause()
      live.place = state.id === 'W1' ? 'space' : 32
      live.clouds = 'new'
      live.free = false
      lab ??= createLab(get('#live'))
      lab.load(LIVE)
    } else {
      lab?.setPlaying(false)
      void video.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: ClipId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    if (state.live) setLive(false)
    renderDetail()
    loadClip()
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick as ClipId, button.classList.contains('idea-card'))))
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).toUpperCase()
    if (id !== state.id && CLIPS.some(clip => clip.id === id)) pick(id as ClipId)
  })
  get('#mode-clip').addEventListener('click', () => setLive(false))
  get('#mode-live').addEventListener('click', () => setLive(true))

  // ---- The answers ------------------------------------------------------------------------------
  function readAnswers() {
    for (const decision of DECISIONS) {
      const chosen = [...document.querySelectorAll<HTMLInputElement>(`input[name="${decision.id}"]:checked`)].map(input => decision.options[Number(input.value)])
      answers[decision.id] = { choices: chosen, notes: get<HTMLTextAreaElement>(`#${decision.id}-notes`).value.trim() }
    }
    try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { /* The answers stay for this visit. */ }
  }
  get('#decisions').addEventListener('change', readAnswers)
  get('#decisions').addEventListener('input', readAnswers)
  const answerText = () => DECISIONS.map(decision => `${decision.title}\n${(answers[decision.id]?.choices ?? []).map(choice => `- ${choice}`).join('\n') || '- (no answer)'}${answers[decision.id]?.notes ? `\nNotes: ${answers[decision.id].notes}` : ''}`).join('\n\n')
  get('#copy-answers').addEventListener('click', async () => {
    readAnswers()
    try { await navigator.clipboard.writeText(answerText()); get('#save-note').textContent = 'Copied. Paste the answers in the chat with Claude.' }
    catch { get('#save-note').textContent = 'The browser did not allow a copy. Select the answers above, or use Save study.' }
  })
  get('#export').addEventListener('click', () => {
    readAnswers()
    const data = JSON.stringify({ study: 'weather-study', clip: state.id, live: { ...live }, kinds: KIND_NAMES, answers, savedAt: new Date().toISOString() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'weather-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  loadClip()
}

/** Shows each error of the page in a small bar, so a person who sees a fault can report it. */
function showErrors() {
  const bar = document.createElement('p')
  bar.className = 'error-bar'
  bar.hidden = true
  document.body.append(bar)
  const show = (text: string) => { bar.hidden = false; bar.textContent = `Error: ${text}`.slice(0, 300) }
  window.addEventListener('error', event => show(event.message || String(event.error)))
  window.addEventListener('unhandledrejection', event => show(String(event.reason?.message ?? event.reason)))
}

/** A small Markdown reader for the technical study: headings, paragraphs, lists, tables, code and links. */
function renderMarkdown(text: string) {
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (value: string) => esc(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => /^(https?:|#)/.test(href) ? `<a href="${href}">${label}</a>` : label)
  const lines = text.replace(/\r/g, '').split('\n')
  const html: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    if (line.startsWith('```')) {
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i])
      html.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
    } else if (/^#{1,4} /.test(line)) {
      const level = Math.min(line.indexOf(' ') + 1, 4)
      html.push(`<h${level}>${inline(line.slice(line.indexOf(' ') + 1))}</h${level}>`)
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      for (; i < lines.length && lines[i].startsWith('|'); i++) if (!/^\|[\s:|-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map(cell => cell.trim()))
      i--
      html.push(`<div class="table-wrap"><table><thead><tr>${rows[0].map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
    } else if (/^(\d+\.|-) /.test(line)) {
      const ordered = /^\d+\./.test(line), items: string[] = []
      for (; i < lines.length && /^(\d+\.|-) /.test(lines[i]); i++) {
        let item = lines[i].replace(/^(\d+\.|-) /, '')
        while (i + 1 < lines.length && /^ {2,}\S/.test(lines[i + 1])) item += ' ' + lines[++i].trim()
        items.push(`<li>${inline(item)}</li>`)
      }
      i--
      html.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`)
    } else {
      const paragraph = [line]
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\||```|\d+\. |- )/.test(lines[i + 1])) paragraph.push(lines[++i])
      html.push(`<p>${inline(paragraph.join(' '))}</p>`)
    }
  }
  return html.join('\n')
}

if (new URLSearchParams(location.search).has('capture')) startCapture()
else startPage()
