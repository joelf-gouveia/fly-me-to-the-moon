import '../feature-ideas-study/style.css'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { startCapture } from '../feature-ideas-study/capture'
import { seeded, seedRandom } from '../friend-book-study/features/seed'
import { FEATURES } from './features'
import { WORLD_OPTIONS } from '../../src/worlds'
import { startBench } from './bench'
import { BENCH, BENCH_OPTIONS, benchRow, clipById, CLIPS, DECISIONS, DEVICES, FINDINGS, GAMES, LIFE, optionById, OPTIONS, PLAN, SIZES, WIND_TABLE, WORLDS, worst } from './model'
import type { ClipId, Decision, OptionId } from './model'
import studyUrl from '../../docs/living-worlds-study.md?url'
import studyText from '../../docs/living-worlds-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import learnStyle from '../learn-and-play-study/page.css?inline'
import animalsStyle from '../animals-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the living worlds study: the real clouds of each world and the things that happen
 * there. The clips of today and of the three options on Jupiter, the clips of option B on Venus,
 * Mars, Neptune and the Moon, the measured cost, the worlds one by one with their sources, the
 * findings, the plan and the decisions. It has the look and the lab of the feature ideas study.
 */
const root = document.querySelector<HTMLDivElement>('#living-worlds-study')!
// The study shows the game of before, with the puffs: the living skies of src/skies/ came from it later.
WORLD_OPTIONS.living = false

function startPage() {
  if (!document.querySelector('style[data-page-style]')) {
    const style = document.createElement('style')
    style.dataset.pageStyle = ''
    style.textContent = pageStyle + learnStyle + animalsStyle + ownStyle
    document.head.append(style)
  }
  showErrors()
  // A published copy is built with the base './'. It has no game page next to it.
  const published = import.meta.env.BASE_URL === './'
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/living-worlds/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'B') as ClipId, live: false }
  const STORE = 'fairy-living-worlds-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const isOption = (id: ClipId): id is OptionId => id === 'A' || id === 'B' || id === 'C'
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const recommended = OPTIONS.find(option => option.recommended)!
  const link = (source: { label: string; url: string }) => `<a href="${source.url}" target="_blank" rel="noopener">${esc(source.label)}</a>`
  const gpuName = BENCH.desktop.gpu.replace(/^ANGLE \(([^,]+), ([^(]+?) \(.*$/, '$2')
  const cell = (device: (typeof DEVICES)[number]['id'], view: string, option: string) => {
    const row = benchRow(device, view, option)
    if (!row) return '<td class="small">—</td>'
    return `<td><b>${row.ms}</b> ms · ${row.calls} calls<br><span class="small">${option === 'today' ? `${Math.round(row.triangles / 1000)}k triangles` : `${row.extraCalls >= 0 ? '+' : ''}${row.extraCalls} calls · ${Math.round(row.triangles / 1000)}k triangles`}</span></td>`
  }
  const benchTable = () => `<table><thead><tr><th>View</th><th>Device</th>${BENCH_OPTIONS.map(option => `<th>${option === 'today' ? 'Today' : option}</th>`).join('')}</tr></thead><tbody>${BENCH.desktop.views.map(view => DEVICES.map((device, d) => `<tr>${d === 0 ? `<th rowspan="3">${view.name}</th>` : ''}<td>${device.name}</td>${BENCH_OPTIONS.map(option => cell(device.id, view.id, option)).join('')}</tr>`).join('')).join('')}</tbody></table>`
  const worldCard = (world: (typeof WORLDS)[number]) => `<article class="world" id="world-${world.id}">
      <div><h3>${world.name}</h3><dl>
        <dt>Today</dt><dd>${world.today}</dd>
        <dt>Real clouds</dt><dd>${world.real}</dd>
        <dt>What happens</dt><dd>${world.events}</dd>
        <dt>The sky</dt><dd>${world.sky}</dd>
        <dt>The proposal</dt><dd>${world.proposal}</dd></dl>
        <div class="facts">${world.facts.map(fact => `<p>${fact}</p>`).join('')}</div>
        <p class="sources">Sources: ${world.sources.map(link).join(' · ')}</p></div>
      <div class="world-pics">${world.pictures ? world.pictures.map((file, index) => `<figure><img src="${media(file)}" alt="" loading="lazy" width="1280" height="720"><figcaption>${index === 0 ? 'Today' : 'The proposal'}</figcaption></figure>`).join('') : '<div class="none">No air: the sky stays black and clear, as today.</div>'}</div>
    </article>`

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>27</b> / LIVING WORLDS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">REAL SKIES AND THINGS THAT HAPPEN · FOR A CHILD OF 5</p><h1>Bands on Jupiter, <em>dust devils on Mars.</em></h1></div>
      <p>Each world with air has the same white puffs today. How can each planet get the clouds that it really has, and real things that move and happen, inside the budget of a phone? First: the airless worlds already have no clouds. The problem is the six worlds with air. Three options with clips from the engine of the game, the cost measured with the real renderer, and each world with its sources.<br>The study does not change the game. <a href="#compare-title">The three options together ↓</a></p></header>

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
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <article id="study" class="study" aria-live="polite"></article>

    <header class="together"><p class="eyebrow">THE THREE OPTIONS</p><h2 id="compare-title">The three options together</h2></header>
    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">PICK ONE TO SEE ITS CLIP</p>
      <h2 id="options-title">Real clouds, real weather, imagined life</h2>
      <div class="idea-cards option-cards">${OPTIONS.map(option => `<button type="button" class="idea-card" data-pick="${option.id}">
        <img src="${media(`${option.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${option.id}</b><strong>${option.name}</strong>${option.recommended ? '<span class="pill proposed">Recommended</span>' : ''}</span>
        <span class="idea-line">${option.line}</span>
        <span class="idea-meta"><span class="pill">Size ${option.size}</span><span class="pill">+${worst('desktop', option.id).extraCalls} / +${worst('phone', option.id).extraCalls} draw calls</span></span></button>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="bench-title">
      <p class="eyebrow">MEASURED WITH THE RENDERER OF THE GAME · ${BENCH.date}</p>
      <h2 id="bench-title">The phone budget</h2>
      <p class="section-note">Five places of the clips, each today and with each option. A cell gives the median frame time of ${BENCH.frames} frames (the update of the skies, the render, and a read of one pixel that waits for the graphics card), the draw calls of the frame (<code>renderer.info.render.calls</code>), and the change from today. The graphics card is the ${esc(gpuName)} of the study computer, in headless Chrome. The phone page has 390 × 844 CSS pixels, a device scale of 3, touch, the phone worlds of the game and a pixel ratio of 1.25 (${BENCH.phone.width} × ${BENCH.phone.height} pixels), and the skies use half the tufts. The third row also makes the CPU 4 times slower. None of the rows is a real phone.</p>
      <div class="table-wrap bench-table">${benchTable()}</div>
    </section>

    <section class="section-block" aria-labelledby="worlds-title">
      <p class="eyebrow">EACH WORLD · WHAT IS REAL · WHAT THE STUDY PROPOSES</p>
      <h2 id="worlds-title">The worlds one by one</h2>
      <p class="section-note">The real clouds, the real events and the sky of each world, with a true fact for a child of 5 and the sources. The pictures are from the clips: today on the left, the proposal on the right. Earth and Blossom Haven are not here: Earth has its real weather (field study 21), and Blossom Haven has its cotton candy clouds.</p>
      <div class="worlds">${WORLDS.map(worldCard).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="wind-title">
      <p class="eyebrow">THE REAL JETS · m/s</p>
      <h2 id="wind-title">The winds that move the bands</h2>
      <p class="section-note">The east wind at some latitudes: the real speed, and the speed of the clouds in the clips. A negative wind blows to the west, against the spin of the world.</p>
      <div class="wind-grid">${WIND_TABLE.map(item => `<div class="table-wrap"><table><thead><tr><th colspan="3">${item.kind[0].toUpperCase() + item.kind.slice(1)}</th></tr><tr><th>Lat.</th><th>Real</th><th>Game</th></tr></thead><tbody>${item.rows.map(row => `<tr><td>${row.lat}°</td><td>${row.real}</td><td>${row.game}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="section-block" aria-labelledby="research-title">
      <p class="eyebrow">THE RESEARCH</p>
      <h2 id="research-title">Life in the clouds, and how other games do it</h2>
      <div class="life">${LIFE.map(item => `<article><span class="year">${item.year}</span><h3>${item.title}</h3><p>${item.text}</p>${link(item.source)}</article>`).join('')}</div>
      <div class="mark-grid">${GAMES.map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">Build ${recommended.id}: the real clouds, then one real event for each world.</h2>
        <p>B replaces the one puff of today with the clouds of each world, and gives each world a thing to find. On the computer page the largest change is +${worst('desktop', 'B').extraCalls} draw calls; on the phone page +${worst('phone', 'B').extraCalls}. Leave C out: the planets stay real, and Blossom Haven keeps the magic.</p></div>
      <div class="steps">${PLAN.map(([title, text], index) => `<article><span>${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips and the numbers were made</h2><p>The same text as ${published ? '<code>docs/living-worlds-study.md</code>' : `<a href="${studyUrl}">docs/living-worlds-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 27</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null

  function renderDetail() {
    const id = state.id, item = clipById(id)
    const option = isOption(id) ? optionById(id) : item.option === 'today' ? null : optionById(item.option)
    get('#detail').innerHTML = isOption(id) ? `
        <p class="eyebrow">OPTION ${option!.id} · SIZE ${option!.size} · ${SIZES[option!.size].toUpperCase()}</p>
        <h2>${option!.name}</h2>
        <p class="lead">${option!.line}</p>
        ${option!.recommended ? '<p class="pill proposed">Recommended</p>' : ''}
        <h3>How it draws</h3><p>${option!.drawing}</p>
        <h3>What the child sees</h3><p>${option!.child}</p>` : `
        <p class="eyebrow">${option ? `OPTION ${option.id} ON ${item.world.toUpperCase()}` : 'TODAY'}</p>
        <h2>${item.name}</h2>
        <p class="lead">${item.question}</p>
        ${option ? `<h3>The option of the clip</h3><p>${option.id} · ${option.name}</p>` : '<h3>What the game does</h3><p>buildClouds() in src/worlds.ts gives the world the same puffs as the other worlds with air.</p>'}`
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D. Free flight: W and S climb and descend, A and D turn, Shift boosts.' : ''
    get('#player-note').hidden = !state.live
  }

  function renderStudy() {
    const id = state.id, item = clipById(id)
    const at = CLIPS.indexOf(item), previous = CLIPS[at - 1], next = CLIPS[at + 1]
    const world = WORLDS.find(row => row.name === item.world)
    const body = isOption(id) ? (() => {
      const option = optionById(id)
      return `<section class="section-block"><p class="eyebrow">FOR AND AGAINST</p>
          <div class="plan"><div><h3>Strong points</h3><ul>${option.strong.map(line => `<li>${line}</li>`).join('')}</ul></div><div><h3>Weak points</h3><ul>${option.weak.map(line => `<li>${line}</li>`).join('')}</ul></div></div>
          <div class="plan"><div><h3>Risks</h3><ul>${option.risks.map(line => `<li>${line}</li>`).join('')}</ul></div><div><h3>Today on the same route</h3><img src="${media('T.jpg')}" alt="" loading="lazy" width="1280" height="720" style="width:100%;height:auto;border-radius:10px"></div></div></section>`
    })() : item.today && world?.pictures ? `<section class="section-block"><p class="eyebrow">TODAY AND THE PROPOSAL, ON THE SAME ROUTE</p>
          <div class="world-pics">${world.pictures.map((file, index) => `<figure><img src="${media(file)}" alt="" loading="lazy" width="1280" height="720"><figcaption>${index === 0 ? 'Today' : item.name}</figcaption></figure>`).join('')}</div>
          <p class="section-note">${world.events} <a href="#world-${world.id}">The world and its sources ↓</a></p></section>` : ''
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">${isOption(id) ? `OPTION ${id}` : item.option === 'today' ? 'TODAY' : `WITH OPTION ${item.option}`}</p><h2>${item.name}</h2><p class="study-question">${item.question}</p></header>
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
    const data = JSON.stringify({ study: 'living-worlds-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'living-worlds-study.json', data }).catch(() => {}); return }
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    anchor.download = 'living-worlds-study.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000)
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
if (params.has('bench')) {
  seedRandom(27)
  startBench(root, params.has('phone'))
} else if (params.has('capture')) {
  seedRandom(27)
  void startCapture(root, seeded(FEATURES))
} else startPage()
