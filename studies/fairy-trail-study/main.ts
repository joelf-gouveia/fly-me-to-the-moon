import './style.css'
import { startCapture } from './capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { liveFeature, view } from './shots'
import type { CameraView, Manoeuvre, TrailStats } from './shots'
import { ALL, BEFORE, CAP, DECISIONS, FINDINGS, FINDING_SHOTS, OPTIONS, RECOMMENDED, RULES, SELECTED, TODAY, numberOf, optionById, todayAngle, todayGap, todayLength } from './model'
import { SPACE_SPEED } from '../../src/flight'
import { wingColorOptions } from '../../src/customization'
import type { FairyLook } from '../../src/customization'
import studyUrl from '../../docs/fairy-trail-study.md?url'
import studyText from '../../docs/fairy-trail-study.md?raw'
import basePageStyle from '../feature-ideas-study/page.css?inline'
import pageStyle from './page.css?inline'

const root = document.querySelector<HTMLDivElement>('#fairy-trail-study')!
const IDS = ALL.map(option => option.id)
type Captured = TrailStats & { drawn: { calls: number; triangles: number } }
type Speeds = { spin: number; orbit: number }

function startPage() {
  // The page look loads only for the page, so the capture page has no page styles.
  const style = document.createElement('style')
  style.textContent = basePageStyle + pageStyle
  document.head.append(style)
  showErrors()
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/fairy-trail/${file}`
  const fromHash = location.hash.slice(1)
  const state = { id: IDS.includes(fromHash) ? fromHash : RECOMMENDED, live: false }
  const STORE = 'fairy-trail-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`
  const labelOf = (id: string) => id === BEFORE.id ? 'Today' : numberOf(id)
  const pills = (id: string) => {
    const option = optionById(id)!
    return [
      SELECTED.includes(id) ? '<span class="pill proposed">In the game</span>' : '',
      id === RECOMMENDED ? '<span class="pill">Recommended</span>' : '',
      `<span class="pill">${option.family}</span>`,
      option.frame === 'None' ? '' : `<span class="pill${option.frame === 'Space' ? ' warn' : ''}">Stays with: ${option.frame.toLowerCase()}</span>`,
    ].join('')
  }
  const card = (id: string) => `<button type="button" class="idea-card" data-pick="${id}">
      <img src="${media(`${id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
      <span class="idea-head"><b>${labelOf(id)}</b><strong>${optionById(id)!.name}</strong></span>
      <span class="idea-line">${optionById(id)!.line}</span><span class="idea-meta">${pills(id)}</span></button>`
  const figure = (file: string, title: string, text: string) =>
    `<figure><img src="${media(file)}" alt="${title} ${text}" loading="lazy" width="1280" height="720"><figcaption><b>${title}</b> ${text}</figcaption></figure>`
  const chips = (name: string, label: string, items: [string, string][]) =>
    `<div class="chips" role="group" aria-label="${label}">${items.map(([value, text]) => `<button type="button" data-${name}="${value}">${text}</button>`).join('')}</div>`

  root.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>22</b> / THE FAIRY TRAIL</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">ONE FAULT, THREE RULES AND FIFTEEN OPTIONS</p><h1>A trail that <em>stays behind her.</em></h1></div>
      <p><b>The game now has four trails of this study: 03, 07, 08 and 14. The player selects one in the look menu.</b> Before, the trail went off at an angle because the world moves and the dots did not: the study shows that trail as <b>The trail of today</b>. Near a world, the game carries the fairy with the spin and the orbit of that world. The dots of her trail stay in space, so the world moves away from them. This study gives three rules that correct the trail, and <b>fifteen options</b> for its look. Option 01 removes the trail. Each clip shows the same flight of 14 s from the engine of the game: a cruise, two turns, a boost, a hover, and the 4 s after a sparkle ring. <b>See it live</b> runs an option in 3D here.<br>The controls of the study do not change the game. <a href="#technical-title">Read the study ↓</a></p></header>

    <section class="workspace" aria-label="The trails in flight">
      <div class="stage-column">
        <div class="stage-bar">
          <span class="bar-label">TODAY</span><div class="chips"><button type="button" data-pick="${BEFORE.id}">The trail of today</button></div>
          <span class="bar-label">OPTIONS</span><div class="chips" role="group" aria-label="The fifteen options of the study">${OPTIONS.map(option => `<button type="button" data-pick="${option.id}" title="${option.name}" aria-label="${numberOf(option.id)} ${option.name}">${numberOf(option.id)}</button>`).join('')}</div>
        </div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">See it live</button></div>
          <div class="chips"><button type="button" id="previous" aria-label="The option before this one">←</button><button type="button" id="next" aria-label="The next option">→</button></div>
        </div>
        <div class="live-tools" id="live-tools" hidden>
          ${chips('manoeuvre', 'Flight', [['tour', 'The flight of the clip'], ['cruise', 'Cruise'], ['turns', 'Turns'], ['boost', 'Boost'], ['hover', 'Hover']])}
          ${chips('camera', 'Camera', [['game', 'Game camera'], ['side', 'From one side'], ['above', 'From above']])}
          ${chips('night', 'Time of the day', [['0', 'Day'], ['1', 'Night']])}
          <div class="swatches" role="group" aria-label="Wing colour">${wingColorOptions.map(({ id, label, sparkle }) => `<button type="button" data-colour="${id}" aria-label="${label}" title="${label}" style="--swatch:${hex(sparkle)}"></button>`).join('')}</div>
          <div class="levers">
            <label class="check"><input type="checkbox" id="motion" checked> The world moves</label>
            <label class="check"><input type="checkbox" id="bonus"> After a sparkle ring</label>
            <label class="check"><input type="checkbox" id="still"> Reduced motion</label>
          </div>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">01 / THE FIFTEEN OPTIONS</p>
      <h2 id="options-title">Select one to see it fly</h2>
      <p class="section-note">Each picture is from the same flight, with the wing colour Dewdrop of the menu and its sparkle colour. Option 11 flies over Blossom Haven. <b>Stays with</b> gives the thing that holds the points of the trail: the world below her, or the fairy.</p>
      <div class="idea-cards">${OPTIONS.map(option => card(option.id)).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>Option</th><th>Family</th><th>Stays with</th><th>Points at most</th><th>Draw calls of the trail</th></tr></thead><tbody id="cost-rows"></tbody></table></div>
      <p class="section-note">The numbers are from the capture of the clips, on a computer. A ribbon counts its corner points. Each option is small: the trail of today has ${TODAY.bonusPoints} points and one draw call.</p>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">02 / WHAT IS WRONG TODAY</p>
      <h2 id="findings-title">One trail and eight findings</h2>
      <p class="section-note" id="numbers"></p>
      <div class="shots lead">${figure('G-game.jpg', 'The game of today.', 'The real game, 3 s after the start. She flies away from the camera, and her trail goes up to a corner of the sky.')}</div>
      <div class="shots">${FINDING_SHOTS.map(finding => figure(`${finding.id}.jpg`, finding.title, finding.text)).join('')}</div>
      <div class="idea-cards before">${card(BEFORE.id)}</div>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="rules-title">
      <div class="brief-title"><p class="eyebrow">03 / THE RULES</p><h2 id="rules-title">Three rules correct the trail. Two more make it sparkle.</h2>
        <p>Options 02 to 15 follow these rules. Rules 1 to 3 give a trail that is the same on each screen, at each speed and on each world. Rules 4 and 5 give the sparkle. Option 02 uses rules 1 to 4 on the dots of today, so you can see the correction alone.</p></div>
      <div class="steps">${RULES.map(([title, text], index) => `<article><span>${index + 1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">04 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p><div class="choices">${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}</div><textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes for: ${esc(decision.title)}">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">05 / THE TECHNICAL STUDY</p><h2 id="technical-title">The cause, the rules and the cost</h2><p>The same text as <a href="${studyUrl}">docs/fairy-trail-study.md</a>.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 22</span><span>The game has the four selected trails</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const all = <T extends HTMLElement = HTMLButtonElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let captured: Record<string, Captured> = {}

  function renderDetail() {
    const option = optionById(state.id)!, cost = captured[state.id]
    get('#detail').innerHTML = `
      <p class="eyebrow">${state.id === BEFORE.id ? 'THE GAME OF TODAY' : `${option.family.toUpperCase()} · ${numberOf(state.id)} OF ${OPTIONS.length}`}</p>
      <h2>${option.name}</h2>
      <p class="lead">${option.line}</p>
      <p class="pills">${pills(state.id)}</p>
      <h3>What the child sees</h3><p>${option.child}</p>
      ${cost ? `<h3>Cost</h3><dl class="cost"><div><dt>Points at most</dt><dd>${cost.points}</dd></div><div><dt>Draw calls</dt><dd>${cost.calls}</dd></div></dl>` : ''}
      <h3>Limit</h3><p>${option.limit}</p>`
    all('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    all('[data-manoeuvre]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.manoeuvre === view.manoeuvre)))
    all('[data-camera]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.camera === view.camera)))
    all('[data-night]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.night === '1') === view.night)))
    all('[data-colour]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.colour === view.wingColor)))
  }
  function renderCosts() {
    get('#cost-rows').innerHTML = IDS.map(id => {
      const cost = captured[id], option = optionById(id)!
      return `<tr><th>${labelOf(id)} · ${option.name}</th><td>${option.family}</td><td>${option.frame}</td>${cost ? `<td>${cost.points}</td><td>${cost.calls}</td>` : '<td colspan="2">Not measured</td>'}</tr>`
    }).join('')
  }
  /** The numbers of the fault, from the speeds that the capture measured. */
  function renderNumbers(worlds?: Record<'earth' | 'fairy', Speeds>) {
    const today = captured[BEFORE.id]
    if (!worlds || !today) return
    const metres = (value: number) => value < 10 ? value.toFixed(1) : String(Math.round(value))
    get('#numbers').innerHTML = `In the clip, the fairy flies at <b>${metres(today.cruise)} m</b> in each second, and Earth carries her at <b>${metres(today.carry)} m</b> in each second: ${metres(worlds.earth.orbit)} m from the orbit and up to ${metres(worlds.earth.spin)} m from the spin. The dots stay behind in space, so the trail can be <b>${Math.round(todayAngle(today.cruise, today.carry))}°</b> off her path. Blossom Haven is farther from the Sun: its orbit carries her at ${metres(worlds.fairy.orbit)} m in each second. At 60 frames in each second the trail is ${metres(todayLength(today.cruise, 60))} m long; at 120 it is ${metres(todayLength(today.cruise, 120))} m. In open space the gap between two dots is ${metres(todayGap(SPACE_SPEED, 60))} m. With the rules, no dot moves away from her faster than ${CAP} m in each second.`
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
      lab.load(liveFeature(state.id))
    } else {
      lab?.setPlaying(false)
      void clip.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: string, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    loadClip()
    if (state.live && lab) lab.load(liveFeature(id))
    renderDetail()
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  all('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick!, button.classList.contains('idea-card'))))
  const step = (by: number) => pick(IDS[(IDS.indexOf(state.id) + by + IDS.length) % IDS.length])
  get('#previous').addEventListener('click', () => step(-1))
  get('#next').addEventListener('click', () => step(1))
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1)
    if (id !== state.id && IDS.includes(id)) pick(id)
  })
  get('#mode-clip').addEventListener('click', () => setLive(false))
  get('#mode-live').addEventListener('click', () => setLive(true))

  // ---- The controls of the live view ------------------------------------------------------------
  all('[data-manoeuvre]').forEach(button => button.addEventListener('click', () => { view.manoeuvre = button.dataset.manoeuvre as Manoeuvre; renderDetail() }))
  all('[data-camera]').forEach(button => button.addEventListener('click', () => { view.camera = button.dataset.camera as CameraView; renderDetail() }))
  // Night turns the world, so the flight starts again.
  all('[data-night]').forEach(button => button.addEventListener('click', () => { view.night = button.dataset.night === '1'; lab?.load(liveFeature(state.id)); renderDetail() }))
  all('[data-colour]').forEach(button => button.addEventListener('click', () => { view.wingColor = button.dataset.colour as FairyLook['wingColor']; renderDetail() }))
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  view.still = get<HTMLInputElement>('#still').checked = motion.matches
  get<HTMLInputElement>('#motion').addEventListener('change', event => { view.motion = (event.target as HTMLInputElement).checked })
  get<HTMLInputElement>('#bonus').addEventListener('change', event => { view.bonus = (event.target as HTMLInputElement).checked })
  get<HTMLInputElement>('#still').addEventListener('change', event => { view.still = (event.target as HTMLInputElement).checked })

  // ---- The answers ------------------------------------------------------------------------------
  function readAnswers() {
    for (const decision of DECISIONS) {
      const chosen = all<HTMLInputElement>(`input[name="${decision.id}"]:checked`).map(input => decision.options[Number(input.value)])
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
    const data = JSON.stringify({ study: 'fairy-trail-study', selected: state.id, view, recommended: RECOMMENDED, inTheGame: SELECTED, answers, savedAt: new Date().toISOString() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'fairy-trail-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  renderCosts()
  loadClip()
  // The numbers of each trail and of the worlds, from the capture of the clips.
  void fetch(media('stats.json')).then(response => response.json()).then((stats: Record<string, Captured> & { worlds?: Record<'earth' | 'fairy', Speeds> }) => {
    captured = stats
    renderDetail(); renderCosts(); renderNumbers(stats.worlds)
  }).catch(() => {})
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

// The start comes last, after each table and helper of this module has its value.
if (new URLSearchParams(location.search).has('capture')) startCapture(root)
else startPage()
