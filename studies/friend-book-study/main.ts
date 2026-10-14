import '../feature-ideas-study/style.css'
import { startCapture } from '../feature-ideas-study/capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { playCue, setSoundOn, silence, soundOn } from '../feature-ideas-study/features/sound'
import type { Cue } from '../feature-ideas-study/features/sound'
import { FEATURES } from './features'
import { EARTH_SEED, seeded, seedRandom } from './features/seed'
import { addGameStyle } from './features/kit'
import { CARDS, CHANGES, clipById, CLIPS, COMPARE, DECISIONS, FINDINGS, OPTIONS, optionById, PARTS, SAVE_EXAMPLE, SIZES } from './model'
import type { ClipId, Decision, OptionId } from './model'
import studyUrl from '../../docs/friend-book-study.md?url'
import studyText from '../../docs/friend-book-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import learnStyle from '../learn-and-play-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the friend book study: how the Animal book (F11) and the fairy friend (F19) become
 * one thing. Three options, each with a clip from the engine of the game, the swap of the friend,
 * the cards of the nine kinds, the phone layout, the saved data and the decisions. It has the
 * look and the lab of the feature ideas study (studies/feature-ideas-study/).
 */
const root = document.querySelector<HTMLDivElement>('#friend-book-study')!

function startPage() {
  // The page look loads only for the page, so the capture page keeps the look of the game.
  if (!document.querySelector('style[data-page-style]')) {
    const style = document.createElement('style')
    style.dataset.pageStyle = ''
    style.textContent = pageStyle + learnStyle + ownStyle
    document.head.append(style)
  }
  addGameStyle()
  showErrors()
  // A published copy is built with the base './'. It has no game page next to it.
  const published = import.meta.env.BASE_URL === './'
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/friend-book/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'A') as ClipId, live: false }
  const STORE = 'fairy-friend-book-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const isOption = (id: ClipId): id is OptionId => id === 'A' || id === 'B' || id === 'C'
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const recommended = OPTIONS.find(option => option.recommended)!

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>24</b> / ONE FRIEND BOOK</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">F11 ANIMAL BOOK + F19 FAIRY FRIEND · FOR A CHILD OF 5</p><h1>The animals she met, <em>and the one that flies with her.</em></h1></div>
      <p>How do the Animal book and the fairy friend become one thing, so the child sees the animals that she met and changes the animal that flies with her? Three options, each with a clip from the engine of the game: the real friend models, the real Worlds and Your fairy panels, and a real swap in the flight. Two more clips show the gift before the fifth hello and the phone.<br>The study does not change the game. <a href="#compare-title">The three options together ↓</a></p></header>

    <section class="workspace" aria-label="The options in flight">
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
      <h2 id="options-title">Where the book is, and where she changes her friend</h2>
      <div class="idea-cards option-cards">${OPTIONS.map(option => `<button type="button" class="idea-card" data-pick="${option.id}">
        <img src="${media(`${option.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${option.id}</b><strong>${option.name}</strong>${option.recommended ? '<span class="pill proposed">Recommended</span>' : ''}</span>
        <span class="idea-line">${option.line}</span>
        <span class="idea-meta"><span class="pill">Size ${option.size}</span>${option.breaks === 'None.' ? '<span class="pill">Follows each decision</span>' : '<span class="pill warn">Breaks a decision</span>'}</span></button>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th></th>${OPTIONS.map(option => `<th>${option.id} · ${option.name}</th>`).join('')}</tr></thead><tbody>${COMPARE.map(row => `<tr><th>${row.row}</th>${OPTIONS.map(option => `<td>${row.values[option.id]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="cards-title">
      <p class="eyebrow">THE NINE CARDS</p>
      <h2 id="cards-title">A picture, a name and three picture facts</h2>
      <p class="section-note">Each picture in the clips is a render of the joined friend model of the game (<code>createFriendModel()</code>), with a clear background. A kind that she did not meet is a soft shadow of the same model, with its world and its place. The emoji stand for the small pictures that the game needs (see the limits).</p>
      <div class="table-wrap"><table><thead><tr><th>Card</th><th>Group</th><th>Picture facts</th><th>The hint before she meets it</th><th>How it flies</th></tr></thead><tbody>${CARDS.map(card => `<tr><th>${card.name}</th><td>${card.group === 'real' ? 'Real animal' : 'Story creature'}</td><td>${card.facts.map(([icon, word]) => `<span class="fact">${icon} ${word}</span>`).join(' ')}</td><td>${card.world === 'earth' ? 'Earth' : 'Blossom Haven'} · ${card.home[0]} ${card.home[1]}</td><td>${card.flies ? 'With its wings' : 'In a soap bubble'}</td></tr>`).join('')}</tbody></table></div>
      <div class="mark-grid">
        <article><h3>The mark “✦ Flies with me”</h3><p>The card of the friend has a gold ring and the mark in place of its facts. The note at the top of the Animals page shows the friend: “✦ FLIES WITH YOU” and its name.</p></article>
        <article><h3>“No friend”</h3><p>A tap on the card of the friend shows a small “No friend” button in the note. After it the note shows an empty bubble. Any met card brings a friend back with “Fly with me”.</p></article>
        <article><h3>The note of a new card</h3><p>The first hello of a kind shows a note at the place of the friend note: the picture, “NEW IN YOUR ANIMAL BOOK”, the name and the three facts. Before the gift it has the five hearts. See the clip “The gift”.</p></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Six findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">Build ${recommended.id}, ${recommended.name.replace(/^The/, 'the')}.</h2>
        <p>A is the only option that follows each decision of 13 October 2026, and it keeps the flight screen calm. The card is the book and the choice. The swap plays in the flight, with a goodbye for the old friend and a loop for the new one. Take the five hearts of the gift from the gift clip, and the note that stays on top from the phone clip. C can come later as a test, if the child asks for a choice at the animal.</p></div>
      <div class="steps">${CHANGES.map(([title, text], index) => `<article><span>${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="save-title">
      <p class="eyebrow">THE SAVED DATA</p>
      <h2 id="save-title">One record for the book and the friend</h2>
      <div class="code-grid"><div><p>The record of F19 has the book already: <code>met</code> gets each kind at its first hello, also before the gift. So the recommendation keeps <code>fairy-friend</code> as it is. Old data loads with no change: <code>parseFriend()</code> reads it today. A missing or broken value gives an empty book and no friend.</p><p>The order of <code>met</code> is the order of the first hellos; the book shows the cards in its own order (real animals, then story creatures), so the order in the record is not used. Reset sticker book in Settings removes the book and the friend, as today.</p></div><pre class="snippet"><code id="save-code"></code></pre></div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips were made, and what the change needs</h2><p>The same text as ${published ? '<code>docs/friend-book-study.md</code>' : `<a href="${studyUrl}">docs/friend-book-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 24</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let cues: Cue[] = [], cueTime = 0
  get('#save-code').textContent = SAVE_EXAMPLE

  function renderDetail() {
    const id = state.id
    if (isOption(id)) {
      const option = optionById(id)
      get('#detail').innerHTML = `
        <p class="eyebrow">OPTION ${option.id} · SIZE ${option.size} · ${SIZES[option.size].toUpperCase()}</p>
        <h2>${option.name}</h2>
        <p class="lead">${option.line}</p>
        ${option.recommended ? '<p class="pill proposed">Recommended</p>' : ''}
        <h3>What the child sees</h3><p>${option.child}</p>
        <h3>The swap</h3><p>${option.swap}</p>`
    } else {
      const part = PARTS[id]
      get('#detail').innerHTML = `
        <p class="eyebrow">FOR EACH OPTION</p>
        <h2>${part.name}</h2>
        <p class="lead">${part.line}</p>
        <h3>What the child sees</h3><p>${part.child}</p>`
    }
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D, with a new Earth at each visit. Free flight: W and S climb and descend, A and D turn, Shift boosts.' : ''
    get('#player-note').hidden = !state.live
  }

  /** The study of the selected clip: its question, its three moments, and the parts of the option. */
  function renderStudy() {
    const id = state.id, item = clipById(id)
    const at = CLIPS.indexOf(item), previous = CLIPS[at - 1], next = CLIPS[at + 1]
    const body = isOption(id) ? (() => {
      const option = optionById(id)
      return `<section class="section-block"><p class="eyebrow">THE DECISIONS OF 13 OCTOBER 2026</p>
          <div class="plan"><div><h3>It follows</h3><p>${option.follows}</p></div><div><h3>It breaks</h3><p>${option.breaks}</p></div></div></section>
        <section class="section-block"><p class="eyebrow">FOR AND AGAINST</p>
          <div class="plan"><div><h3>Strong points</h3><ul>${option.strong.map(line => `<li>${line}</li>`).join('')}</ul></div><div><h3>Weak points</h3><ul>${option.weak.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>`
    })() : `<section class="section-block"><p class="eyebrow">THE DESIGN</p><div class="plan"><div><h3>What the child sees</h3><p>${PARTS[id].child}</p></div><div><h3>The rules</h3><ul>${PARTS[id].detail.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>`
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">${isOption(id) ? `OPTION ${id}` : 'FOR EACH OPTION'}</p><h2>${item.name}</h2><p class="study-question">${item.question}</p></header>
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
    const data = JSON.stringify({ study: 'friend-book-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'friend-book-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'friend-book-study.json'
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

// The start comes last, after each table and helper of this module has its value. The capture
// page has a fixed seed, so each clip is the same at each run (features/seed.ts).
if (new URLSearchParams(location.search).has('capture')) {
  seedRandom(EARTH_SEED)
  void startCapture(root, seeded(FEATURES))
} else startPage()
