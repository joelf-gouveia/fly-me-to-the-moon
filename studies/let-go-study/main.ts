import '../feature-ideas-study/style.css'
import { startCapture } from '../feature-ideas-study/capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { seeded, seedRandom } from '../friend-book-study/features/seed'
import { FEATURES } from './features/clips'
import type { ClipId } from './features/clips'
import { ADDS, clipById, CLIPS, COMPARE, COMPUTER, CHANGES, DECISIONS, FINDINGS, OPTIONS, optionById, PHONE, SIZES_OF_WORK, SUBTRACTS } from './content'
import type { Decision, Effect } from './content'
import { OPTION_IDS, GLIDE_RATE, REST_DELAY } from './model'
import type { OptionId } from './model'
import { glideOf, runLeave, runTour, SPACE_SPEED, stopRows, TOUR_SECONDS, trips } from './numbers'
import studyUrl from '../../docs/let-go-study.md?url'
import studyText from '../../docs/let-go-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import learnStyle from '../learn-and-play-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the let go study: the fairy stops when no key is down, and the Hover button goes.
 * Four ways to do it (T is today), each with a clip of the same tour from the engine of the game,
 * and a clip of a trip to the Moon. The page also has what the change adds and subtracts, the
 * phone and the computer, the numbers of numbers.ts, the findings, the plan and the decisions.
 * It has the look and the lab of the feature ideas study (studies/feature-ideas-study/).
 */
const root = document.querySelector<HTMLDivElement>('#let-go-study')!

function startPage() {
  // The page look loads only for the page, so the capture page keeps the look of the game.
  if (!document.querySelector('style[data-page-style]')) {
    const style = document.createElement('style')
    style.dataset.pageStyle = ''
    style.textContent = pageStyle + learnStyle + ownStyle
    document.head.append(style)
  }
  showErrors()
  // A published copy is built with the base './'. It has no game page next to it.
  const published = import.meta.env.BASE_URL === './'
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/let-go/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'B') as ClipId, live: false }
  const STORE = 'fairy-let-go-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const isOption = (id: ClipId): id is OptionId => id !== 'S'
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}${index === 0 ? ' <span class="pill proposed">Recommended</span>' : ''}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const recommended = OPTIONS.find(option => option.recommended)!
  const sec = (value: number | null) => value === null ? '—' : `${value.toFixed(1)} s`
  const metres = (value: number | null) => value === null ? '—' : value >= 1000 ? `${(value / 1000).toFixed(1)} km` : value >= 10 ? `${Math.round(value)} m` : `${value.toFixed(1)} m`
  const pills = (ids: OptionId[]) => ids.map(id => `<span class="pill opt-${id}">${id}</span>`).join('')
  const effect = (item: Effect) => `<li><h3>${item.title}<span class="effect-pills">${pills(item.options)}</span></h3><p>${item.text}</p></li>`

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>28</b> / LET GO TO STOP</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">FLIGHT · THE KEYS · THE HOVER BUTTON</p><h1>Let go, and <em>she waits.</em></h1></div>
      <p>The request: the fairy stops when the child presses no key, and the Hover button goes. What does that change on a phone and on a computer, and what does the game get and lose? Today she always flies, and there is no key to fly forward. So a stop on release needs a new rule for the straight flight. The study compares three rules with the game of today, with a clip of the same tour from the engine of the game for each, and measures them with the flight code of the game.<br>The study does not change the game. <a href="#effects-title">What it adds and subtracts ↓</a></p></header>

    <section class="workspace" aria-label="The clips">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips" role="group" aria-label="Clip">${CLIPS.map(clip => `<button type="button" data-pick="${clip.id}"><b>${clip.id}</b> ${clip.name.replace(/^[A-Z] · /, '')}</button>`).join('')}</div>
        </div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
          <p class="player-note" id="player-note"></p>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">Play it live</button></div>
          <div class="chips" id="live-tools" hidden><button type="button" id="replay">Play again</button><button type="button" id="free">Free flight</button></div>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <article id="study" class="study" aria-live="polite"></article>

    <header class="together"><p class="eyebrow">THE FOUR WAYS</p><h2 id="compare-title">Today and the three rules together</h2></header>
    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">PICK ONE TO SEE ITS CLIP</p>
      <h2 id="options-title">The same tour, four sets of keys</h2>
      <div class="idea-cards option-cards">${OPTIONS.map(option => `<button type="button" class="idea-card" data-pick="${option.id}">
        <img src="${media(`${option.id}-1.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${option.id}</b><strong>${option.name}</strong>${option.recommended ? '<span class="pill proposed">Recommended</span>' : ''}</span>
        <span class="idea-line">${option.line}</span></button>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th></th>${OPTIONS.map(option => `<th>${option.id} · ${option.name}</th>`).join('')}</tr></thead><tbody>${COMPARE.map(row => `<tr><th>${row.row}</th>${OPTION_IDS.map(id => `<td>${row.values[id]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="effects-title">
      <p class="eyebrow">THE EXPERIENCE</p>
      <h2 id="effects-title">What a stop on release adds, and what it subtracts</h2>
      <p class="section-note">The letters show the options that have each effect. The numbers come from the runs below.</p>
      <div class="effects"><div><h3 class="block-title">It adds</h3><ul class="effect-list adds">${ADDS.map(effect).join('')}</ul></div>
        <div><h3 class="block-title">It subtracts</h3><ul class="effect-list subtracts">${SUBTRACTS.map(effect).join('')}</ul></div></div>
    </section>

    <section class="section-block" aria-labelledby="devices-title">
      <p class="eyebrow">MOBILE AND WEB</p>
      <h2 id="devices-title">On a phone and on a computer</h2>
      <div class="phones">${OPTION_IDS.map(id => phoneDiagram(id)).join('')}</div>
      <div class="effects"><div><h3 class="block-title">On a phone</h3><ul class="plain-list">${PHONE.map(line => `<li>${line}</li>`).join('')}</ul></div>
        <div><h3 class="block-title">On a computer</h3><ul class="plain-list">${COMPUTER.map(line => `<li>${line}</li>`).join('')}</ul></div></div>
    </section>

    <section class="section-block" aria-labelledby="numbers-title">
      <p class="eyebrow">MEASURED WITH THE FLIGHT CODE OF THE GAME</p>
      <h2 id="numbers-title">The numbers</h2>
      <p class="section-note">Each run uses <code>stepFlight()</code> and <code>hoverFlight()</code> of <code>src/flight.ts</code> through the control models of <code>studies/let-go-study/model.ts</code>, at 30 frames in each second, over the terrain of Earth (seed 1234). The glide falls by ${GLIDE_RATE} in each second; option C rests after ${REST_DELAY} s.</p>
      <h3 class="block-title">The tour of the clips (${TOUR_SECONDS} s)</h3>
      <div class="table-wrap"><table><thead><tr><th></th><th>Hands on the controls</th><th>Two thumbs</th><th>Presses</th><th>The stop: way</th><th>The stop: time</th><th>The look: turn</th><th>The look: way</th><th>The whole tour</th></tr></thead><tbody id="tour-rows"></tbody></table></div>
      <h3 class="block-title">The way to the stop, and 10 s with no key</h3>
      <div class="table-wrap"><table><thead><tr><th>Where</th><th>Speed</th>${OPTION_IDS.map(id => `<th>${id}: stop</th>`).join('')}${OPTION_IDS.map(id => `<th>${id}: 10 s, no key</th>`).join('')}</tr></thead><tbody id="stop-rows"></tbody></table></div>
      <h3 class="block-title">From the meadow up to open space (1,000 m)</h3>
      <div class="table-wrap"><table><thead><tr><th></th><th>Keys</th><th>Time</th><th>Hands on the controls</th><th>Presses</th></tr></thead><tbody id="leave-rows"></tbody></table></div>
      <h3 class="block-title">Trips from Earth in open space</h3>
      <div class="table-wrap"><table><thead><tr><th>Trip</th><th>Ground to ground</th><th>Time with the flight of today</th><th>T: held key</th><th>A: Boost held</th><th>B: Fly held</th><th>C: taps</th></tr></thead><tbody id="trip-rows"></tbody></table></div>
      <p class="section-note">A trip starts 10 m above the steering shell of Earth and ends at the steering shell of the target, on a straight line. The worlds stand still. The first time is the nearest place of the two orbits; the second adds the extra way of the farthest place at ${Math.floor(SPACE_SPEED)} m/s. Guided trips from the Worlds map need no key with each option.</p>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">${FINDINGS.length} findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">If the stop on release comes, build ${recommended.id}: ${recommended.name.toLowerCase()}.</h2>
        <p>B is the only rule that stops her where the child lets go and keeps both the look around in place and the straight flight. It does not remove the button: Fly takes the place of Hover. A and C remove the button, but A has no straight flight at the normal speed and C does not stop where the child lets go. The cost of B is hands on the controls: two thumbs on a phone to steer in flight, and a held key on a long trip. A Settings switch for Fly by tap keeps the flight of today for players who cannot hold a button. The guided trips stay with no keys.</p></div>
      <div class="steps">${CHANGES.map(([title, text, size], index) => `<article><span>${index + 1}</span><div><h3>${title}<span class="pill">Size ${size}</span></h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips and the numbers were made, and what the change needs</h2><p>The same text as ${published ? '<code>docs/let-go-study.md</code>' : `<a href="${studyUrl}">docs/let-go-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 28</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null

  // ---- The numbers: each table runs after the page shows, one table at a time ----------------------------
  const later = () => new Promise(resolve => setTimeout(resolve, 0))
  async function numbers() {
    await later()
    get('#tour-rows').innerHTML = OPTION_IDS.map(id => {
      const run = runTour(id)
      return `<tr><th>${id} · ${optionById(id).name}</th><td>${sec(run.handsSeconds)}</td><td>${sec(run.twoFingerSeconds)}</td><td>${run.presses}</td><td>${run.stopMetres === null ? 'No stop before the look' : metres(run.stopMetres)}</td><td>${run.stopSeconds === null ? '—' : run.stopSeconds < 0.05 ? 'At once' : sec(run.stopSeconds)}</td><td>${Math.round(run.lookTurn)}°</td><td>${metres(run.lookMetres)}</td><td>${metres(run.metres)}</td></tr>`
    }).join('')
    await later()
    get('#stop-rows').innerHTML = stopRows().map(row => `<tr><th>${row.name}</th><td>${Math.round(row.speed).toLocaleString('en')} m/s</td>${OPTION_IDS.map(id => `<td>${row.rows[id].metres < 0.05 ? 'At once' : `${metres(row.rows[id].metres)} · ${sec(row.rows[id].seconds)}`}</td>`).join('')}${OPTION_IDS.map(id => `<td>${metres(row.idle[id])}</td>`).join('')}</tr>`).join('')
    await later()
    get('#leave-rows').innerHTML = OPTION_IDS.map(id => {
      const run = runLeave(id)
      return `<tr><th>${id} · ${optionById(id).name}</th><td>${run.keys}</td><td>${sec(run.seconds)}</td><td>${sec(run.handsSeconds)}</td><td>${run.presses}</td></tr>`
    }).join('')
    await later()
    const range = (a: number, b: number) => Math.abs(a - b) < 0.05 ? sec(a) : `${a.toFixed(1)} to ${b.toFixed(1)} s`
    get('#trip-rows').innerHTML = trips().map(trip => `<tr><th>${trip.name}</th><td>${trip.near === trip.far ? metres(trip.near) : `${metres(trip.near)} to ${metres(trip.far)}`}</td><td>${range(trip.seconds, trip.farSeconds)}</td><td>None</td><td>${range(trip.boostSeconds, trip.farBoostSeconds)}</td><td>${range(trip.seconds, trip.farSeconds)}</td><td>${Math.floor(trip.seconds / REST_DELAY) === Math.floor(trip.farSeconds / REST_DELAY) ? Math.floor(trip.seconds / REST_DELAY) : `${Math.floor(trip.seconds / REST_DELAY)} to ${Math.floor(trip.farSeconds / REST_DELAY)}`}</td></tr>`).join('')
  }
  void numbers()

  // ---- The player and the study of a clip --------------------------------------------------------------
  const LIVE_KEYS: Record<OptionId, string> = {
    T: 'W and S climb and descend, A and D turn, Shift boosts. Q turns the hover on and off.',
    A: 'W and S climb and descend, A and D turn, Shift boosts. Each of them moves her; let go to stop.',
    B: 'Hold Space to fly. W and S climb and descend, A and D turn. Shift flies fast. With Space up, the keys turn her in place.',
    C: 'W and S climb and descend, A and D turn, Shift boosts. After 3 s with no key she rests.',
  }
  function renderDetail() {
    const id = state.id
    const option = optionById(isOption(id) ? id : 'B')
    get('#detail').innerHTML = isOption(id) ? `
        <p class="eyebrow">${id === 'T' ? 'THE GAME TODAY' : `OPTION ${option.id} · SIZE ${option.size} · ${SIZES_OF_WORK[option.size!].toUpperCase()}`}</p>
        <h2>${option.name}</h2>
        <p class="lead">${option.line}</p>
        ${option.recommended ? '<p class="pill proposed">Recommended</p>' : ''}
        <h3>What the child does</h3><p>${option.child}</p>` : `
        <p class="eyebrow">OPTION B · IN OPEN SPACE</p>
        <h2>To the Moon</h2>
        <p class="lead">From Earth to the Moon with B: hold Fly, let go, wait and look around, then fly on.</p>
        <h3>What the child does</h3><p>The child holds Fly for each second of the trip. Today the child aims at the Moon and lets go. A guided trip from the Worlds map needs no key with each option.</p>`
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? `Live 3D with the worlds of the game. Free flight: ${LIVE_KEYS[isOption(id) ? id : 'B']}` : ''
    get('#player-note').hidden = !state.live
  }

  function renderStudy() {
    const id = state.id, item = clipById(id)
    const at = CLIPS.indexOf(item), previous = CLIPS[at - 1], next = CLIPS[at + 1]
    const body = isOption(id) ? (() => {
      const option = optionById(id)
      return `<section class="section-block"><p class="eyebrow">FOR AND AGAINST</p>
          <div class="plan"><div><h3>Strong points</h3><ul>${option.strong.map(line => `<li>${line}</li>`).join('')}</ul></div><div><h3>Weak points</h3><ul>${option.weak.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>`
    })() : `<section class="section-block"><p class="eyebrow">THE TRIP</p><div class="plan"><div><h3>What the clip shows</h3><p>B in open space. At about 100 m/s the glide is about 30 m (${metres(glideOf(100).metres)} in the closed form of the glide). At the full speed of open space it is ${metres(glideOf(SPACE_SPEED).metres)}.</p></div><div><h3>Today</h3><ul><li>The child aims and lets go. She flies on with no keys.</li><li>A tap of Hover stops her at once, also at ${Math.floor(SPACE_SPEED)} m/s.</li></ul></div></div></section>`
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">${id === 'T' ? 'THE GAME TODAY' : isOption(id) ? `OPTION ${id}` : 'OPTION B IN OPEN SPACE'}</p><h2>${item.name}</h2><p class="study-question">${item.question}</p></header>
      <section class="section-block"><p class="eyebrow">THREE MOMENTS OF THE CLIP</p>
        <div class="moments">${item.moments.map((moment, index) => `<figure><img src="${media(`${id}-${index}.jpg`)}" alt="" loading="lazy" width="1280" height="720"><figcaption><b>${moment.t} s</b> ${moment.caption}</figcaption></figure>`).join('')}</div></section>
      ${body}
      <nav class="study-nav" aria-label="Clips">${previous ? `<button type="button" data-go="${previous.id}">← ${previous.name}</button>` : '<span></span>'}${next ? `<button type="button" data-go="${next.id}">${next.name} →</button>` : '<span></span>'}</nav>`
    get('#study').querySelectorAll<HTMLButtonElement>('[data-go]').forEach(button => button.addEventListener('click', () => pick(button.dataset.go as ClipId, true)))
  }

  function loadClip() {
    clip.poster = media(`${state.id}.jpg`)
    clip.src = media(`${state.id}.webm`)
    if (!state.live) void clip.play().catch(() => {})
  }
  function setLive(live: boolean) {
    state.live = live
    get('#live').hidden = !live
    clip.hidden = live
    if (live) {
      clip.pause()
      lab ??= createLab(get('#live'))
      // A browser check of the page reads the lab of the live view.
      if (import.meta.env.DEV) Object.assign(window, { __letGoLab: lab })
      lab.load(FEATURES[state.id])
    } else {
      lab?.setPlaying(false)
      void clip.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: ClipId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    renderDetail()
    loadClip()
    if (state.live && lab) lab.load(FEATURES[id])
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick as ClipId, button.classList.contains('idea-card'))))
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).toUpperCase()
    if (id !== state.id && CLIPS.some(item => item.id === id)) pick(id as ClipId)
  })
  get('#mode-clip').addEventListener('click', () => setLive(false))
  get('#mode-live').addEventListener('click', () => setLive(true))
  get('#replay').addEventListener('click', () => lab?.replay())
  get('#free').addEventListener('click', () => lab?.fly())

  // ---- The answers ------------------------------------------------------------------------------
  function readAnswers() {
    for (const decision of DECISIONS) {
      const chosen = [...document.querySelectorAll<HTMLInputElement>(`input[name="${decision.id}"]:checked`)].map(input => decision.options[Number(input.value)])
      answers[decision.id] = { choices: chosen, notes: get<HTMLTextAreaElement>(`#${decision.id}-notes`).value.trim() }
    }
    try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { /* The answers stay for this visit. */ }
    // One write to the store after the typing stops.
    clearTimeout(storeTimer)
    storeTimer = window.setTimeout(() => void saveToStore(), 900)
  }
  let storeTimer = 0
  get('#decisions').addEventListener('change', readAnswers)
  get('#decisions').addEventListener('input', readAnswers)
  const answerText = () => DECISIONS.map(decision => `${decision.title}\n${(answers[decision.id]?.choices ?? []).map(choice => `- ${choice}`).join('\n') || '- (no answer)'}${answers[decision.id]?.notes ? `\nNotes: ${answers[decision.id].notes}` : ''}`).join('\n\n')
  get('#copy-answers').addEventListener('click', async () => {
    readAnswers()
    try { await navigator.clipboard.writeText(answerText()); get('#save-note').textContent = 'Copied. Paste the answers in the chat with Claude.' }
    catch { get('#save-note').textContent = 'The browser did not allow a copy. Select the answers above, or use Save study.' }
  })
  get('#export').addEventListener('click', async () => {
    readAnswers()
    const data = JSON.stringify({ study: 'let-go-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'let-go-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'let-go-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })
  /** A published copy of the page also keeps the answers in its store, so Claude can read them. */
  async function saveToStore() {
    const db = await claudeUse('db') as { doc?: (path: string) => { set: (data: unknown) => Promise<unknown> } } | null
    if (!db?.doc) return
    for (const decision of DECISIONS) if (answers[decision.id]) await db.doc(`answers/${decision.id}`).set({ ...answers[decision.id], updatedAt: new Date().toISOString() }).catch(() => {})
  }

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  loadClip()
}

/**
 * A phone in landscape with the touch controls of an option, in the layout of src/mobile.css:
 * four arrows at the bottom left, the action buttons at the bottom right. The held buttons of
 * a straight flight are gold.
 */
function phoneDiagram(id: OptionId) {
  const right: Record<OptionId, { label: string; held: boolean }[]> = {
    T: [{ label: '✦ Boost', held: false }, { label: '◉ Hover', held: false }],
    A: [{ label: '✦ Boost', held: true }],
    B: [{ label: '✦ Fast', held: false }, { label: '➤ Fly', held: true }],
    C: [{ label: '✦ Boost', held: false }],
  }
  const buttons = right[id]
  const arrow = (x: number, y: number, label: string) => `<rect class="key" x="${x}" y="${y}" width="22" height="22" rx="6"/><text x="${x + 11}" y="${y + 15.5}" text-anchor="middle">${label}</text>`
  const action = (index: number, item: { label: string; held: boolean }) => {
    const y = 128 - (buttons.length - index) * 30
    return `<rect class="key${item.held ? ' held' : ''}" x="214" y="${y}" width="60" height="25" rx="8"/><text class="${item.held ? 'held' : ''}" x="244" y="${y + 16.5}" text-anchor="middle">${item.label}</text>`
  }
  const note: Record<OptionId, string> = {
    T: 'Fly straight: no thumb. Stop: tap Hover.',
    A: 'Fly straight: hold Boost (fast). Stop: let go.',
    B: 'Fly straight: hold Fly. Steer: Fly and an arrow.',
    C: 'Fly straight: no thumb. Stop: 3 s after the last press.',
  }
  return `<figure class="phone"><svg viewBox="0 0 300 150" role="img" aria-label="${id}: the touch controls on a phone"><title>${id} · ${optionById(id).name}</title>
    <rect class="body" x="4" y="4" width="292" height="142" rx="22"/><rect class="screen" x="16" y="14" width="268" height="122" rx="12"/>
    <circle class="fairy" cx="150" cy="70" r="7"/><path class="fairy" d="M150 62 l-10 -8 M150 62 l10 -8"/>
    ${arrow(52, 78, '↑')}${arrow(26, 104, '←')}${arrow(52, 104, '↓')}${arrow(78, 104, '→')}
    ${buttons.map((item, index) => action(index, item)).join('')}
  </svg><figcaption><b>${id}</b> ${optionById(id).name}<span>${note[id]}</span></figcaption></figure>`
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

/** The runtime of a published claude.ai page, when there is one. On the dev server it is absent. */
async function claudeUse(name: string): Promise<unknown> {
  const runtime = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude
  try { return runtime?.use ? await runtime.use(name) : null } catch { return null }
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

// The start comes last, after each table and helper of this module has its value. The capture
// page has a fixed seed, so each clip is the same at each run (features/seed.ts of the friend book study).
const params = new URLSearchParams(location.search)
if (params.has('capture')) {
  seedRandom(28)
  void startCapture(root, seeded(FEATURES))
} else startPage()
