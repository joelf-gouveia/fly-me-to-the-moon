import '../../src/adventure.css'
import '../../src/sticker-book.css'
import '../../src/settings.css'
import './style.css'
import { startCapture } from './capture'
import { createLab } from './lab'
import type { Lab } from './lab'
import { FEATURES } from './features'
import { WORLD_CHORD_INFO, WORLD_CHORDS } from './features/f6-world-songs'
import { playCue, setSoundOn, silence, soundOn } from './features/sound'
import type { Cue } from './features/sound'
import { DECISIONS, FINDINGS, IDEAS, ideaById, SIZES } from './model'
import type { FeatureId } from './model'
import studyUrl from '../../docs/feature-ideas-study.md?url'
import studyText from '../../docs/feature-ideas-study.md?raw'
import pageStyle from './page.css?inline'

const root = document.querySelector<HTMLDivElement>('#feature-ideas-study')!

function startPage() {
  // The page look loads only for the page, so the capture page keeps the look of the game.
  // A published copy has the same rules in its first style block (build-artifact.mjs).
  if (!document.querySelector('style[data-page-style]')) {
    const style = document.createElement('style')
    style.textContent = pageStyle
    document.head.append(style)
  }
  showErrors()
  // The published copy is built with the base './' (build-artifact.mjs). It has no game page next to it.
  const published = import.meta.env.BASE_URL === './'
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/feature-ideas/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (IDEAS.some(idea => idea.id === fromHash) ? fromHash : 'F1') as FeatureId, live: false }
  const STORE = 'fairy-feature-ideas-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>16</b> / TEN NEW IDEAS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">WHAT TO BUILD NEXT</p><h1>Ten ideas, <em>seen in flight.</em></h1></div>
      <p>Each idea has a clip from the engine of the game: the real worlds, the fairy and the screen of the game, with the idea added. Turn on the sound to hear the chimes, the voice and the songs with each clip. <b>Fly it live</b> runs the idea in 3D here.<br>These ideas do not change the game. Pick the ideas you want at the end of the page. <a href="#technical-title">Read the study ↓</a></p></header>

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

    <section class="section-block" aria-labelledby="code-title">
      <p class="eyebrow">01 / HOW IT WORKS</p>
      <h2 id="code-title"></h2>
      <div class="code-grid"><div id="code-where"></div><pre class="snippet"><code id="code-snippet"></code></pre></div>
    </section>

    <section class="section-block" aria-labelledby="ideas-title">
      <p class="eyebrow">02 / THE TEN IDEAS</p>
      <h2 id="ideas-title">Pick one to see it fly</h2>
      <div class="idea-cards">${IDEAS.map(idea => `<button type="button" class="idea-card" data-pick="${idea.id}">
        <img src="${media(`${idea.id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${idea.id}</b><strong>${idea.name}</strong>${idea.proposed ? '<span class="pill proposed">Proposed</span>' : ''}</span>
        <span class="idea-line">${idea.line}</span>
        <span class="idea-meta"><span class="pill">Size ${idea.size}</span>${idea.dependency ? '<span class="pill warn">New package</span>' : ''}</span></button>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>Idea</th><th>Size</th><th>Ready in the game</th><th>New package</th></tr></thead><tbody>${IDEAS.map(idea => `<tr><th>${idea.id} · ${idea.name}</th><td>${idea.size} · ${SIZES[idea.size]}</td><td>${idea.ready}</td><td>${idea.dependency ?? 'No'}</td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="songs-title">
      <p class="eyebrow">03 / LISTEN</p>
      <h2 id="songs-title">The chord of each world (F6)</h2>
      <p class="section-note">Today the game plays one hum on every world: 110, 164.81 and 220 Hz. Tap a world to hear its chord. The hum glides to the new chord in 1.5 s.</p>
      <div class="chord-grid" id="chords">${(Object.keys(WORLD_CHORDS) as (keyof typeof WORLD_CHORDS)[]).map(kind => `<button type="button" data-chord="${kind}"><strong>♪ ${CHORD_NAMES[kind] ?? kind}</strong><small>${WORLD_CHORD_INFO[kind].names.join(' · ')}</small><small>${WORLD_CHORD_INFO[kind].mood}</small></button>`).join('')}<button type="button" data-chord="" class="chord-stop">■ Stop</button></div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">04 / WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">05 / RECOMMENDATION</p><h2 id="brief-title">Start with F1, F2, F3 and F5.</h2>
        <p>These four give the most to a young player for the least new code. F1 and F2 have their data and their recordings in the repo, and the sticker book study designed them. F3 and F5 use parts that the game has. The others are good later: F6 and F9 are small, F7 is for a TV, F8 is large, and F10 needs a host.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>F1 · Search stars</h3><p>Add <code>searchDone()</code> and the gold star to the sticker toast. Ship the six altitude checks first; the place, creature and terrain checks follow, one world at a time.</p></div></article>
        <article><span>2</span><div><h3>F2 · Spoken facts</h3><p>Play the recorded hello line with the new-sticker note, only when Sound is on. Stop it at a pause and when the page hides.</p></div></article>
        <article><span>3</span><div><h3>F3 · Creature hello</h3><p>Add <code>greet()</code> to the population, with a hop, two hearts and a soft note. One hello for each creature in 8 s.</p></div></article>
        <article><span>4</span><div><h3>F5 · Postcard camera</h3><p>A fourth round button, a flash, and a framed picture with Save and Share. The picture stays on the device.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">06 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">07 / THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips were made, and what each idea needs</h2><p>The same text as ${published ? '<code>docs/feature-ideas-study.md</code>' : `<a href="${studyUrl}">docs/feature-ideas-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 16</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let cues: Cue[] = [], cueTime = 0

  function renderDetail() {
    const idea = ideaById(state.id)
    get('#detail').innerHTML = `
      <p class="eyebrow">${idea.id} · SIZE ${idea.size} · ${SIZES[idea.size].toUpperCase()}</p>
      <h2>${idea.name}</h2>
      <p class="lead">${idea.line}</p>
      ${idea.proposed ? '<p class="pill proposed">Proposed first</p>' : ''}
      <h3>What the child sees</h3><p>${idea.child}</p>
      <h3>Ready in the game</h3><p>${idea.ready}</p>
      <h3>Limit</h3><p>${idea.limit}</p>
      ${idea.dependency ? `<h3>New package</h3><p>${idea.dependency}</p>` : ''}`
    get('#code-title').textContent = `${idea.id} · ${idea.name}: where it goes`
    get('#code-where').innerHTML = `<p>${idea.where}</p><p class="small">The snippet shows the main idea of the change in the game code. The clip comes from the study code in <code>studies/feature-ideas-study/features/</code>.</p>`
    get('#code-snippet').textContent = idea.snippet
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D. Free flight: W and S climb and descend, A and D turn, Shift boosts. A game controller also works for F7.' : ''
    get('#player-note').hidden = !state.live
  }

  async function loadClip() {
    silence()
    cues = []; cueTime = 0
    clip.poster = media(`${state.id}.jpg`)
    clip.src = media(`${state.id}.webm`)
    if (!state.live) void clip.play().catch(() => {})
    try { cues = await (await fetch(media(`${state.id}.cues.json`))).json() } catch { cues = [] }
  }
  // The cues of the clip play in step with the video: the chimes, the voice and the hum.
  function followCues() {
    requestAnimationFrame(followCues)
    if (state.live || clip.paused || !soundOn()) { cueTime = clip.currentTime; return }
    const now = clip.currentTime
    if (now < cueTime) {
      silence()
      // After a jump back, the hum takes the last chord before the new time.
      const hum = cues.filter(cue => cue.type === 'hum' && cue.t <= now).at(-1)
      if (hum) playCue(hum)
    } else cues.filter(cue => cue.t > cueTime && cue.t <= now).forEach(playCue)
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
  document.querySelectorAll<HTMLButtonElement>('[data-chord]').forEach(button => button.addEventListener('click', async () => {
    const kind = button.dataset.chord!
    if (kind && !soundOn()) get<HTMLInputElement>('#sound').checked = await setSoundOn(true)
    playCue({ t: 0, type: 'hum', notes: kind ? WORLD_CHORDS[kind as keyof typeof WORLD_CHORDS] : null, glide: 1.5 })
    document.querySelectorAll<HTMLButtonElement>('[data-chord]').forEach(other => other.setAttribute('aria-pressed', String(other === button && !!kind)))
  }))

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
    const data = JSON.stringify({ study: 'feature-ideas-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'feature-ideas-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'feature-ideas-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })
  /** A published copy of the page also keeps the answers in its store, so Claude can read them. */
  async function saveToStore() {
    const db = await claudeUse('db') as { doc?: (path: string) => { set: (data: unknown) => Promise<unknown> } } | null
    if (!db?.doc) return
    for (const decision of DECISIONS) await db.doc(`answers/${decision.id}`).set({ ...answers[decision.id], updatedAt: new Date().toISOString() }).catch(() => {})
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

const CHORD_NAMES: Record<string, string> = { sun: 'Sun', mercury: 'Mercury', venus: 'Venus', earth: 'Earth', moon: 'Moon', mars: 'Mars', vesta: 'Vesta', ceres: 'Ceres', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', fairy: 'Blossom Haven' }

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
if (new URLSearchParams(location.search).has('capture')) void startCapture(root)
else startPage()
