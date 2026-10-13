import '../../src/adventure.css'
import '../../src/sticker-book.css'
import '../feature-ideas-study/style.css'
import { startCapture } from '../feature-ideas-study/capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { playCue, setSoundOn, silence, soundOn } from '../feature-ideas-study/features/sound'
import type { Cue } from '../feature-ideas-study/features/sound'
import { FEATURES } from './features'
import { DECISIONS, FINDINGS, IDEAS, ideaById, SIZES } from './model'
import type { Decision, FeatureId } from './model'
import { STUDIES, STUDY_QUESTIONS } from './studies'
import studyUrl from '../../docs/learn-and-play-study.md?url'
import studyText from '../../docs/learn-and-play-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the learn and play study: ten ideas (F11 to F20) that teach a child of 5 or that
 * give a reason to come back, with one study for each idea (studies.ts). It has the look and the
 * lab of the feature ideas study (studies/feature-ideas-study/): a clip of each idea from the
 * engine, the same idea in live 3D, and the decisions.
 */
const root = document.querySelector<HTMLDivElement>('#learn-and-play-study')!

function startPage() {
  // The page look loads only for the page, so the capture page keeps the look of the game.
  if (!document.querySelector('style[data-page-style]')) {
    const style = document.createElement('style')
    style.textContent = pageStyle + ownStyle
    document.head.append(style)
  }
  showErrors()
  // A published copy is built with the base './'. It has no game page next to it.
  const published = import.meta.env.BASE_URL === './'
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/learn-and-play/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (IDEAS.some(idea => idea.id === fromHash) ? fromHash : 'F11') as FeatureId, live: false }
  const STORE = 'fairy-learn-and-play-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const pill = (idea: typeof IDEAS[number]) => `<span class="pill group-${idea.group.toLowerCase()}">${idea.group}</span>`
  const proposed = IDEAS.filter(idea => idea.proposed)
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const ALL_DECISIONS: Decision[] = [...DECISIONS, ...STUDY_QUESTIONS]

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>23</b> / LEARN AND PLAY</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">FOR A CHILD OF 5 AND UP · TEN STUDIES</p><h1>Ten ideas to <em>learn and to come back.</em></h1></div>
      <p>Six ideas teach: animals, numbers, sizes, the Moon, the climate and hot and cold. Four ideas give a reason to come back: a garden, gifts, a friend and an album. Each idea has its own study: a clip from the engine of the game, three moments of the clip, what the game has today, the decisions, and the build plan.<br>Select a study with the buttons below. These studies do not change the game. <a href="#together-title">The ten together ↓</a></p></header>

    <section class="workspace" aria-label="The ideas in flight">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips" role="group" aria-label="Idea">${IDEAS.map(idea => `<button type="button" data-pick="${idea.id}"><b>${idea.id}</b> ${idea.name}</button>`).join('')}</div>
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

    <header class="together"><p class="eyebrow">ALL TEN STUDIES</p><h2 id="together-title">The ten together</h2></header>

    <section class="section-block" aria-labelledby="ideas-title">
      <p class="eyebrow">THE TEN IDEAS</p>
      <h2 id="ideas-title">Pick one to open its study</h2>
      <div class="idea-cards">${IDEAS.map(idea => `<button type="button" class="idea-card" data-pick="${idea.id}">
        <img src="${media(`${idea.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${idea.id}</b><strong>${idea.name}</strong>${idea.proposed ? '<span class="pill proposed">Proposed</span>' : ''}</span>
        <span class="idea-line">${idea.line}</span>
        <span class="idea-meta">${pill(idea)}<span class="pill">Size ${idea.size}</span></span></button>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>Idea</th><th>Kind</th><th>Size</th><th>What the child gets</th><th>Ready in the game</th></tr></thead><tbody>${IDEAS.map(idea => `<tr><th>${idea.id} · ${idea.name}</th><td>${idea.group}</td><td>${idea.size} · ${SIZES[idea.size]}</td><td>${idea.gain}</td><td>${idea.ready}</td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">Start with ${proposed.slice(0, -1).map(idea => idea.id).join(', ')} and ${proposed.at(-1)!.id}.</h2>
        <p>These four use parts that the game has: the rings, the belt names, the creature hello and the cottage. Each one gives the child a thing to keep, and none needs a new model. F13 and F16 are small and can follow. F14 needs a rule for the new Moon. F18 needs thirteen new looks, F19 adds draw calls on a phone, and F20 needs a picture store.</p></div>
      <div class="steps">${proposed.map((idea, index) => `<article><span>${index + 1}</span><div><h3>${idea.id} · ${idea.name}</h3><p>${idea.line} ${idea.where}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS FOR THE TEN</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips were made, and what each idea needs</h2><p>The same text as ${published ? '<code>docs/learn-and-play-study.md</code>' : `<a href="${studyUrl}">docs/learn-and-play-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 23</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let cues: Cue[] = [], cueTime = 0

  function renderDetail() {
    const idea = ideaById(state.id)
    get('#detail').innerHTML = `
      <p class="eyebrow">${idea.id} · ${idea.group.toUpperCase()} · SIZE ${idea.size} · ${SIZES[idea.size].toUpperCase()}</p>
      <h2>${idea.name}</h2>
      <p class="lead">${idea.line}</p>
      ${idea.proposed ? '<p class="pill proposed">Proposed first</p>' : ''}
      <h3>What the child sees</h3><p>${idea.child}</p>
      <h3>${idea.group === 'Learn' ? 'What the child learns' : 'Why the child comes back'}</h3><p>${idea.gain}</p>
      <h3>Ready in the game</h3><p>${idea.ready}</p>
      <h3>Limit</h3><p>${idea.limit}</p>`
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D. Free flight: W and S climb and descend, A and D turn, Shift boosts.' : ''
    get('#player-note').hidden = !state.live
  }

  /** The study of the selected idea: its moments, the code place, the findings, the decisions and the plan. */
  function renderStudy() {
    const idea = ideaById(state.id), study = STUDIES[state.id]
    const at = IDEAS.indexOf(idea), previous = IDEAS[at - 1], next = IDEAS[at + 1]
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">STUDY ${idea.id} · ${idea.group.toUpperCase()} · SIZE ${idea.size}</p><h2>${idea.name}</h2><p class="study-question">${study.question}</p></header>
      <section class="section-block"><p class="eyebrow">THREE MOMENTS OF THE CLIP</p>
        <div class="moments">${study.moments.map((moment, index) => `<figure><img src="${media(`${idea.id}-${index}.jpg`)}" alt="" loading="lazy" width="1280" height="720"><figcaption><b>${moment.t} s</b> ${moment.caption}</figcaption></figure>`).join('')}</div></section>
      <section class="section-block"><p class="eyebrow">WHAT THE GAME HAS TODAY</p>
        <ol class="findings">${study.findings.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol></section>
      <section class="section-block"><p class="eyebrow">WHERE IT GOES IN THE CODE</p>
        <div class="code-grid"><div><p>${idea.where}</p><p class="small">The snippet shows the main idea of the change in the game code. The clip comes from the study code in <code>studies/learn-and-play-study/features/</code>.</p></div><pre class="snippet"><code id="code-snippet"></code></pre></div></section>
      <section class="section-block"><p class="eyebrow">DECISIONS FOR ${idea.id}</p><h3 class="block-title">Your answers for ${idea.name}</h3>
        <form class="decisions study-decisions">${study.questions.map(fieldset).join('')}</form></section>
      <section class="section-block"><p class="eyebrow">THE BUILD PLAN</p>
        <div class="plan"><div><h3>Steps</h3><ol>${study.steps.map(step => `<li>${step}</li>`).join('')}</ol></div><div><h3>Checks</h3><ul>${study.checks.map(check => `<li>${check}</li>`).join('')}</ul><h3>Limit</h3><p>${idea.limit}</p></div></div></section>
      <nav class="study-nav" aria-label="Studies">${previous ? `<button type="button" data-go="${previous.id}">← ${previous.id} ${previous.name}</button>` : '<span></span>'}${next ? `<button type="button" data-go="${next.id}">${next.id} ${next.name} →</button>` : '<span></span>'}</nav>`
    get('#code-snippet').textContent = idea.snippet
    get('#study').querySelectorAll<HTMLButtonElement>('[data-go]').forEach(button => button.addEventListener('click', () => pick(button.dataset.go as FeatureId, true)))
  }

  async function loadClip() {
    silence()
    cues = []; cueTime = 0
    clip.poster = media(`${state.id}.jpg`)
    clip.src = media(`${state.id}.webm`)
    if (!state.live) void clip.play().catch(() => {})
    try { cues = await (await fetch(media(`${state.id}.cues.json`))).json() } catch { cues = [] }
  }
  // The cues of the clip play in step with the video: the chimes.
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
  function pick(id: FeatureId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    renderDetail()
    void loadClip()
    if (state.live && lab) lab.load(FEATURES[id])
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick as FeatureId, button.classList.contains('idea-card'))))
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).toUpperCase()
    if (id !== state.id && IDEAS.some(idea => idea.id === id)) pick(id as FeatureId)
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
    for (const decision of ALL_DECISIONS) {
      const notes = document.querySelector<HTMLTextAreaElement>(`#${decision.id}-notes`)
      // Only the decisions on the page now: the study of a different idea keeps its saved answers.
      if (!notes) continue
      const chosen = [...document.querySelectorAll<HTMLInputElement>(`input[name="${decision.id}"]:checked`)].map(input => decision.options[Number(input.value)])
      answers[decision.id] = { choices: chosen, notes: notes.value.trim() }
    }
    try { localStorage.setItem(STORE, JSON.stringify(answers)) } catch { /* The answers stay for this visit. */ }
    // One write to the store after the typing stops.
    clearTimeout(storeTimer)
    storeTimer = window.setTimeout(() => void saveToStore(), 900)
  }
  let storeTimer = 0
  for (const form of [get('#decisions'), get('#study')]) {
    form.addEventListener('change', readAnswers)
    form.addEventListener('input', readAnswers)
  }
  const answerText = () => ALL_DECISIONS.filter(decision => DECISIONS.includes(decision) || answers[decision.id]?.choices.length || answers[decision.id]?.notes).map(decision => `${decision.title}\n${(answers[decision.id]?.choices ?? []).map(choice => `- ${choice}`).join('\n') || '- (no answer)'}${answers[decision.id]?.notes ? `\nNotes: ${answers[decision.id].notes}` : ''}`).join('\n\n')
  get('#copy-answers').addEventListener('click', async () => {
    readAnswers()
    try { await navigator.clipboard.writeText(answerText()); get('#save-note').textContent = 'Copied. Paste the answers in the chat with Claude.' }
    catch { get('#save-note').textContent = 'The browser did not allow a copy. Select the answers above, or use Save study.' }
  })
  get('#export').addEventListener('click', async () => {
    readAnswers()
    const data = JSON.stringify({ study: 'learn-and-play-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'learn-and-play-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'learn-and-play-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })
  /** A published copy of the page also keeps the answers in its store, so Claude can read them. */
  async function saveToStore() {
    const db = await claudeUse('db') as { doc?: (path: string) => { set: (data: unknown) => Promise<unknown> } } | null
    if (!db?.doc) return
    for (const decision of ALL_DECISIONS) if (answers[decision.id]) await db.doc(`answers/${decision.id}`).set({ ...answers[decision.id], updatedAt: new Date().toISOString() }).catch(() => {})
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

// The start comes last, after each table and helper of this module has its value.
if (new URLSearchParams(location.search).has('capture')) void startCapture(root, FEATURES)
else startPage()
