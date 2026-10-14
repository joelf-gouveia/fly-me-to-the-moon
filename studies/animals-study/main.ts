import '../feature-ideas-study/style.css'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { startCapture } from '../feature-ideas-study/capture'
import { playCue, setSoundOn, silence, soundOn } from '../feature-ideas-study/features/sound'
import type { Cue } from '../feature-ideas-study/features/sound'
import { EARTH_SEED, seeded, seedRandom } from '../friend-book-study/features/seed'
import { FEATURES } from './features'
import { cardPictures } from './cards'
import { startBench } from './bench'
import { SPECIES } from './catalog'
import type { OptionId, Species } from './catalog'
import { BENCH, BENCH_OPTIONS, benchRow, BOOK_RULES, catalogRow, clipById, CLIPS, COMPARE, DECISIONS, DEVICES, FINDINGS, FRIEND_RULES, optionById, OPTIONS, placesOf, PLAN, SCOPE, SIZES, worst } from './model'
import type { ClipId, Decision } from './model'
import studyUrl from '../../docs/animals-study.md?url'
import studyText from '../../docs/animals-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import learnStyle from '../learn-and-play-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the animals study: more animals for Earth and Blossom Haven, each one where the rules
 * of its kind allow. Three options, each with a clip from the engine of the game and its measured
 * cost, then the savanna, the sea, the gardens and Lantern time, the catalog, the book and the
 * friend, the plan and the decisions. It has the look and the lab of the feature ideas study.
 */
const root = document.querySelector<HTMLDivElement>('#animals-study')!

function startPage() {
  if (!document.querySelector('style[data-page-style]')) {
    const style = document.createElement('style')
    style.dataset.pageStyle = ''
    style.textContent = pageStyle + learnStyle + ownStyle
    document.head.append(style)
  }
  showErrors()
  // A published copy is built with the base './'. It has no game page next to it.
  const published = import.meta.env.BASE_URL === './'
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/animals/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'B') as ClipId, live: false }
  const STORE = 'fairy-animals-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const isOption = (id: ClipId): id is OptionId => id === 'A' || id === 'B' || id === 'C'
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const recommended = OPTIONS.find(option => option.recommended)!
  const card = (species: Species, look: 'met' | 'shadow' = 'met') => species.prototype
    ? `<img src="${media(`cards/${species.id}.jpg`)}" alt="" loading="lazy" width="192" height="192" class="${look === 'shadow' ? 'is-shadow' : ''}">`
    : `<span class="no-model${look === 'shadow' ? ' is-shadow' : ''}" style="background:${species.colour}" aria-hidden="true"></span>`
  const pills = (species: Species) => species.options.map(id => `<span class="pill">${id}</span>`).join(' ')
  const catalogTable = (world: 'earth' | 'fairy') => placesOf(world).map(place => `<tr class="place-row"><th colspan="7">${place.name}</th></tr>${place.species.map(species => {
    const row = catalogRow(species)
    return `<tr><td class="cat-pic">${card(species)}</td><th>${species.name}${species.existing ? ' <span class="pill">today</span>' : ''}${species.prototype ? '' : ' <span class="pill warn">no model yet</span>'}</th><td>${row.ruleText}</td><td>${species.herd[0] === species.herd[1] ? species.herd[0] : `${species.herd[0]} to ${species.herd[1]}`}</td><td>${species.behaviour}<br><span class="small">Hello: ${species.hello}</span></td><td>${species.why}</td><td>${species.size} m · ${row.reads} (${row.range} m)<br>${pills(species)}</td></tr>`
  }).join('')}`).join('')
  const benchTable = () => `<table><thead><tr><th>View</th><th>Device</th>${BENCH_OPTIONS.map(option => `<th>${option === 'today' ? 'Today' : option}</th>`).join('')}</tr></thead><tbody>${BENCH.desktop.views.map(view => DEVICES.map((device, d) => `<tr>${d === 0 ? `<th rowspan="3">${view.name}</th>` : ''}<td>${device.name}</td>${BENCH_OPTIONS.map(option => { const row = benchRow(device.id, view.id, option); return `<td><b>${row.animalCalls}</b> calls · ${row.ms} ms<br><span class="small">${row.shown ? `${row.shown} animals` : option === 'today' ? 'the animals of today' : ''}</span></td>` }).join('')}</tr>`).join('')).join('')}</tbody></table>`
  const book = (world: 'earth' | 'fairy') => {
    const list = SPECIES.filter(species => species.world === world && species.options.includes(recommended.id))
    let index = 0
    return `<article class="book-page"><h3>${world === 'earth' ? 'Earth' : 'Blossom Haven'} <span class="pill">${list.length} cards</span></h3>${placesOf(world, list).map(place => `<div class="book-row"><span class="book-place">${place.name}</span><div class="book-cards">${place.species.map(species => { const shadow = index++ % 3 === 2; return `<span class="book-card">${card(species, shadow ? 'shadow' : 'met')}<small>${shadow ? '?' : species.name}</small></span>` }).join('')}</div></div>`).join('')}</article>`
  }
  const gpuName = BENCH.desktop.gpu.replace(/^ANGLE \(([^,]+), ([^(]+?) \(.*$/, '$2')

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>25</b> / MORE ANIMALS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">A LIVING EARTH AND A MAGIC BLOSSOM HAVEN · FOR A CHILD OF 5</p><h1>Zebras on the savanna, <em>gummy bears in the grove.</em></h1></div>
      <p>How can Earth and Blossom Haven get many more animals, each one in the place where it belongs, inside the budget of a phone? Three options with clips from the engine of the game on the real worlds, the draw calls and the frame time measured with the real renderer, a catalog of ${SCOPE.C.earth} kinds for Earth and ${SCOPE.C.fairy} for Blossom Haven, and the book and the friend for them.<br>The study does not change the game. <a href="#compare-title">The three options together ↓</a></p></header>

    <section class="workspace" aria-label="The clips">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips" role="group" aria-label="Clip">${CLIPS.map(clip => `<button type="button" data-pick="${clip.id}"><b>${clip.id}</b> ${clip.name.replace(/^[ABC] · /, '')}</button>`).join('')}</div>
        </div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
          <p class="player-note" id="player-note"></p>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">Fly it live</button></div>
          <div class="chips" id="live-tools" hidden><button type="button" id="replay">Play again</button><button type="button" id="free">Free flight</button></div>
          <label class="check"><input type="checkbox" id="sound" role="switch"> Sound</label>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <article id="study" class="study" aria-live="polite"></article>

    <header class="together"><p class="eyebrow">THE THREE OPTIONS</p><h2 id="compare-title">The three options together</h2></header>
    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">PICK ONE TO SEE ITS CLIP</p>
      <h2 id="options-title">How many kinds, and how the renderer draws them</h2>
      <div class="idea-cards option-cards">${OPTIONS.map(option => `<button type="button" class="idea-card" data-pick="${option.id}">
        <img src="${media(`${option.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${option.id}</b><strong>${option.name}</strong>${option.recommended ? '<span class="pill proposed">Recommended</span>' : ''}</span>
        <span class="idea-line">${option.line}</span>
        <span class="idea-meta"><span class="pill">Size ${option.size}</span><span class="pill">${worst('desktop', option.id).animalCalls} / ${worst('phone', option.id).animalCalls} draw calls</span></span></button>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th></th>${OPTIONS.map(option => `<th>${option.id} · ${option.name}</th>`).join('')}</tr></thead><tbody>${COMPARE.map(row => `<tr><th>${row.row}</th>${OPTIONS.map(option => `<td>${row.values[option.id]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="bench-title">
      <p class="eyebrow">MEASURED WITH THE RENDERER OF THE GAME · ${BENCH.date}</p>
      <h2 id="bench-title">The phone budget</h2>
      <p class="section-note">Four views of the real worlds, each with no animals, the animals of today, and the fauna of A, B and C. A cell gives the draw calls of the animals (<code>renderer.info.render.calls</code> with the animals, less the calls with no animals) and the median frame time of ${BENCH.frames} frames: the update of the animals, the render, and a read of one pixel that waits for the graphics card. The graphics card is the ${esc(gpuName)} of the study computer, in headless Chrome. The phone page has 390 × 844 CSS pixels, a device scale of 3, touch, the phone worlds of the game and a pixel ratio of 1.25 (${BENCH.phone.width} × ${BENCH.phone.height} pixels). The third row of each view also makes the CPU of the page 4 times slower. None of the rows is a real phone.</p>
      <div class="table-wrap bench-table">${benchTable()}</div>
      <div class="phones">${(['today', 'A', 'B', 'C'] as const).map(option => `<figure><img src="${media(`P-${option}.jpg`)}" alt="" loading="lazy" width="1170" height="2532"><figcaption><b>${option === 'today' ? 'Today' : option}</b> ${benchRow('phone', 'savanna', option).animalCalls} draw calls for the animals on the phone page</figcaption></figure>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="catalog-title">
      <p class="eyebrow">THE CATALOG · ${SCOPE.C.earth} + ${SCOPE.C.fairy} KINDS IN THE LARGEST OPTION</p>
      <h2 id="catalog-title">Each kind and its place</h2>
      <p class="section-note">A rule reads only values of the code: the zone of <code>zoneAt()</code> (the climate belts of Earth and the gardens of Blossom Haven), the surface (land, shore, river, sea, deep sea), the half of the planet, the season and the magic season. Each picture is a render of the joined model of the study. "Reads" is the distance up to which the animal is 16 px tall in a 720 px view of the game camera; past it a child does not know the shape.</p>
      <h3 class="block-title">Earth</h3>
      <div class="table-wrap catalog"><table><thead><tr><th></th><th>Kind</th><th>Where it lives (the rule)</th><th>Group</th><th>What it does</th><th>Why for a child of 5</th><th>Size · reads · options</th></tr></thead><tbody>${catalogTable('earth')}</tbody></table></div>
      <h3 class="block-title">Blossom Haven</h3>
      <div class="table-wrap catalog"><table><thead><tr><th></th><th>Kind</th><th>Where it lives (the rule)</th><th>Group</th><th>What it does</th><th>Why for a child of 5</th><th>Size · reads · options</th></tr></thead><tbody>${catalogTable('fairy')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="book-title">
      <p class="eyebrow">THE ANIMAL BOOK AND THE FRIEND</p>
      <h2 id="book-title">${SCOPE.B.earth + SCOPE.B.fairy} cards that a child of 5 can read</h2>
      <p class="section-note">A sketch of the Animals tab with the kinds of B: one page for each world and a row for each place. Every third card shows as a shadow, as a kind that she did not meet. A kind with no model of the study is a coloured circle.</p>
      <div class="book">${book('earth')}${book('fairy')}</div>
      <div class="mark-grid">${BOOK_RULES.map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
      <div class="mark-grid">${FRIEND_RULES.map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">Build ${recommended.id}, herds, then the living layer of C.</h2>
        <p>B puts ${SCOPE.B.earth} kinds on Earth and ${SCOPE.B.fairy} on Blossom Haven for at most ${worst('desktop', 'B').animalCalls} draw calls on a computer and ${worst('phone', 'B').animalCalls} on the phone page, where A needs ${worst('desktop', 'A').animalCalls} and ${worst('phone', 'A').animalCalls}. The herds read from far, as the real ones do. The cost to watch is the code that moves the animals: update the far herds less often. Add the points of C for the small life as a second change.</p></div>
      <div class="steps">${PLAN.map(([title, text], index) => `<article><span>${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips and the numbers were made</h2><p>The same text as ${published ? '<code>docs/animals-study.md</code>' : `<a href="${studyUrl}">docs/animals-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 25</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let cues: Cue[] = [], cueTime = 0

  function renderDetail() {
    const id = state.id, item = clipById(id), option = optionById(item.option)
    get('#detail').innerHTML = isOption(id) ? `
        <p class="eyebrow">OPTION ${option.id} · SIZE ${option.size} · ${SIZES[option.size].toUpperCase()}</p>
        <h2>${option.name}</h2>
        <p class="lead">${option.line}</p>
        ${option.recommended ? '<p class="pill proposed">Recommended</p>' : ''}
        <h3>How it draws</h3><p>${option.drawing}</p>
        <h3>What the child sees</h3><p>${option.child}</p>` : `
        <p class="eyebrow">WITH OPTION ${option.id}</p>
        <h2>${item.name}</h2>
        <p class="lead">${item.question}</p>
        <h3>The option of the clip</h3><p>${option.id} · ${option.name}: ${option.drawing}</p>`
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D, with a new Earth at each visit. Free flight: W and S climb and descend, A and D turn, Shift boosts.' : ''
    get('#player-note').hidden = !state.live
  }

  function renderStudy() {
    const id = state.id, item = clipById(id)
    const at = CLIPS.indexOf(item), previous = CLIPS[at - 1], next = CLIPS[at + 1]
    const option = optionById(item.option)
    const body = isOption(id) ? `<section class="section-block"><p class="eyebrow">FOR AND AGAINST</p>
          <div class="plan"><div><h3>Strong points</h3><ul>${option.strong.map(line => `<li>${line}</li>`).join('')}</ul></div><div><h3>Weak points</h3><ul>${option.weak.map(line => `<li>${line}</li>`).join('')}</ul></div></div>
          <div class="plan"><div><h3>The book</h3><p>${option.book}</p><h3>The friend</h3><p>${option.friend}</p></div><div><h3>Risks</h3><ul>${option.risks.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>
        <section class="section-block"><p class="eyebrow">THE PICTURES OF THE BENCH · SAVANNA VIEW</p>
          <div class="pair"><figure><img src="${media(`D-${id}.jpg`)}" alt="" loading="lazy" width="1280" height="720"><figcaption>Computer: ${benchRow('desktop', 'savanna', id).animalCalls} draw calls for the animals, ${benchRow('desktop', 'savanna', id).ms} ms.</figcaption></figure><figure class="phone-pic"><img src="${media(`P-${id}.jpg`)}" alt="" loading="lazy" width="1170" height="2532"><figcaption>Phone page: ${benchRow('phone', 'savanna', id).animalCalls} draw calls, ${benchRow('phone', 'savanna', id).ms} ms; with the CPU 4 × slower ${benchRow('phoneSlow', 'savanna', id).ms} ms.</figcaption></figure></div></section>` : ''
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">${isOption(id) ? `OPTION ${id}` : `WITH OPTION ${item.option}`}</p><h2>${item.name}</h2><p class="study-question">${item.question}</p></header>
      <section class="section-block"><p class="eyebrow">THREE MOMENTS OF THE CLIP</p>
        <div class="moments">${item.moments.map((moment, index) => `<figure><img src="${media(`${id}-${index}.jpg`)}" alt="" loading="lazy" width="1280" height="720"><figcaption><b>${moment.t} s</b> ${moment.caption}</figcaption></figure>`).join('')}</div></section>
      ${body}
      <nav class="study-nav" aria-label="Clips">${previous ? `<button type="button" data-go="${previous.id}">← ${previous.name}</button>` : '<span></span>'}${next ? `<button type="button" data-go="${next.id}">${next.name} →</button>` : '<span></span>'}</nav>`
    get('#study').querySelectorAll<HTMLButtonElement>('[data-go]').forEach(button => button.addEventListener('click', () => pick(button.dataset.go as ClipId, true)))
  }

  async function loadClip() {
    silence()
    cues = []; cueTime = 0
    clip.poster = media(`${state.id}.jpg`)
    clip.src = media(`${state.id}.webm`)
    if (!state.live) void clip.play().catch(() => {})
    try { cues = await (await fetch(media(`${state.id}.cues.json`))).json() } catch { cues = [] }
  }
  function followCues() {
    requestAnimationFrame(followCues)
    if (state.live || clip.paused || !soundOn()) { cueTime = clip.currentTime; return }
    const now = clip.currentTime
    if (now < cueTime) silence()
    else cues.filter(cue => cue.t > cueTime && cue.t <= now).forEach(playCue)
    cueTime = now
  }
  requestAnimationFrame(followCues)

  function setLive(live: boolean) {
    state.live = live
    get('#live').hidden = !live
    clip.hidden = live
    if (live) {
      clip.pause(); silence()
      lab ??= createLab(get('#live'))
      lab.load(FEATURES[state.id])
    } else {
      lab?.setPlaying(false)
      silence()
      void clip.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: ClipId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    renderDetail()
    void loadClip()
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
  get<HTMLInputElement>('#sound').addEventListener('change', async event => {
    const input = event.target as HTMLInputElement
    input.checked = await setSoundOn(input.checked)
    if (input.checked && !state.live) { clip.currentTime = 0; cueTime = 0; void clip.play().catch(() => {}) }
  })

  // ---- The answers ------------------------------------------------------------------------------
  function readAnswers() {
    for (const decision of DECISIONS) {
      const chosen = [...document.querySelectorAll<HTMLInputElement>(`input[name="${decision.id}"]:checked`)].map(input => decision.options[Number(input.value)])
      answers[decision.id] = { choices: chosen, notes: get<HTMLTextAreaElement>(`#${decision.id}-notes`).value.trim() }
    }
    try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { /* The answers stay for this visit. */ }
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
    const data = JSON.stringify({ study: 'animals-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'animals-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'animals-study.json'
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
  void loadClip()
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

// The start comes last. The capture page and the bench have a fixed seed, so each run is the same.
const params = new URLSearchParams(location.search)
if (params.has('cards')) {
  root.style.cssText = 'width:1280px;height:720px;position:relative'
  const lab = createLab(root)
  lab.capture(true)
  Object.defineProperty(window, '__cards', { value: () => cardPictures(lab) })
} else if (params.has('bench')) {
  seedRandom(EARTH_SEED)
  startBench(root, params.has('phone'))
} else if (params.has('capture')) {
  seedRandom(EARTH_SEED)
  void startCapture(root, seeded(FEATURES))
} else startPage()
