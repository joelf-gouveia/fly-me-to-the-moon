import './style.css'
import { startCapture } from './capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { liveFeature, view } from './shots'
import type { WingRun } from './shots'
import { DESIGNS, designById, numberOf } from './designs'
import { BEFORE_OPTIONS, DECISIONS, FINDINGS, FROM_PICTURE, LEVERS, SELECTED } from './model'
import type { Levers, WingStats } from '../../src/fairy-wings/wings'
import { wingColorOptions } from '../../src/customization'
import type { FairyLook } from '../../src/customization'
import studyUrl from '../../docs/fairy-wing-study.md?url'
import studyText from '../../docs/fairy-wing-study.md?raw'
import basePageStyle from '../feature-ideas-study/page.css?inline'
import pageStyle from './page.css?inline'

const root = document.querySelector<HTMLDivElement>('#fairy-wing-study')!
const IDS = [...BEFORE_OPTIONS.map(option => option.id), ...DESIGNS.map(design => design.id)]

function startPage() {
  // The page look loads only for the page, so the capture page has no page styles.
  const style = document.createElement('style')
  style.textContent = basePageStyle + pageStyle
  document.head.append(style)
  showErrors()
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/fairy-wings/${file}`
  const fromHash = location.hash.slice(1)
  const state = { id: IDS.includes(fromHash) ? fromHash : 'glitter', live: false }
  const STORE = 'fairy-wing-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`
  const before = (id: string) => BEFORE_OPTIONS.find(option => option.id === id)
  const labelOf = (id: string) => before(id) ? 'Before' : numberOf(id)
  const nameOf = (id: string) => before(id)?.name ?? designById(id)!.name
  const lineOf = (id: string) => before(id)?.line ?? designById(id)!.line
  const pills = (id: string) => [
    SELECTED.includes(id) ? '<span class="pill proposed">In the game</span>' : '',
    FROM_PICTURE[id] ? `<span class="pill">Your picture ${FROM_PICTURE[id]}</span>` : '',
    designById(id) ? `<span class="pill">${designById(id)!.colour}</span>` : '<span class="pill">Before</span>',
  ].join('')
  const card = (id: string) => `<button type="button" class="idea-card" data-pick="${id}">
      <img src="${media(`${id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
      <span class="idea-head"><b>${labelOf(id)}</b><strong>${nameOf(id)}</strong></span>
      <span class="idea-line">${lineOf(id)}</span><span class="idea-meta">${pills(id)}</span></button>`
  const figure = (file: string, alt: string, title: string, text: string) =>
    `<figure><img src="${media(file)}" alt="${alt}" loading="lazy" width="1280" height="720"><figcaption><b>${title}</b> ${text}</figcaption></figure>`

  root.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>20</b> / FAIRY WINGS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">TWENTY WINGS, AND A NEW WAY TO DRAW THEM</p><h1>Wings that <em>catch the light.</em></h1></div>
      <p><b>The game now has twelve wings of this study, with the new rendering.</b> Before, the game had three wings: Petal, Luna and Flutter. Each one was a flat shape of one pale colour; the study shows that game as <b>Before</b>. This study shows <b>twenty new wings</b> and <b>six changes to how the game draws a wing</b>. Five wings start from the ideas in your pictures; no picture is used. Each clip comes from the engine of the game: the fairy, the wing beat, the Earth and the light of the game, with the new wings added by study code. <b>See it live</b> runs a wing in 3D here.<br>The controls of the study do not change the game. <a href="#technical-title">Read the study ↓</a></p></header>

    <section class="workspace" aria-label="The wings in flight">
      <div class="stage-column">
        <div class="stage-bar">
          <span class="bar-label">BEFORE</span><div class="chips" role="group" aria-label="The wings of the game of before">${BEFORE_OPTIONS.map(option => `<button type="button" data-pick="${option.id}">${option.name}</button>`).join('')}</div>
          <span class="bar-label">NEW</span><div class="chips" role="group" aria-label="The twenty wings of the study">${DESIGNS.map(design => `<button type="button" data-pick="${design.id}" title="${design.name}" aria-label="${numberOf(design.id)} ${design.name}">${numberOf(design.id)}</button>`).join('')}</div>
        </div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
          <p class="player-note" id="player-note" hidden>Live 3D. Drag the picture to look at the wings from the side.</p>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">See it live</button></div>
          <div class="chips"><button type="button" id="previous" aria-label="The wing before this one">←</button><button type="button" id="next" aria-label="The next wing">→</button></div>
        </div>
        <div class="live-tools" id="live-tools" hidden>
          <div class="chips" role="group" aria-label="Camera"><button type="button" data-camera="close">Close</button><button type="button" data-camera="flight">Flight distance</button></div>
          <div class="chips" role="group" aria-label="Speed"><button type="button" data-boost="0">Cruise</button><button type="button" data-boost="1">Boost</button></div>
          <div class="chips" role="group" aria-label="Time of the day"><button type="button" data-night="0">Day</button><button type="button" data-night="1">Night</button></div>
          <div class="swatches" role="group" aria-label="Wing colour">${wingColorOptions.map(({ id, label, color }) => `<button type="button" data-colour="${id}" aria-label="${label}" title="${label}" style="--swatch:${hex(color)}"></button>`).join('')}</div>
          <div class="levers">${LEVERS.map(lever => `<label class="check"><input type="checkbox" data-lever="${lever.id}" checked> ${lever.name}</label>`).join('')}</div>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <section class="section-block" aria-labelledby="wings-title">
      <p class="eyebrow">01 / THE TWENTY WINGS</p>
      <h2 id="wings-title">Select one to see it fly</h2>
      <p class="section-note">Each picture is the fairy of the game from behind, with the wing colour Dewdrop of the menu. <b>Wing colour</b> means that the wing takes the colour that the player selects. <b>Own colours</b> means that the wing has fixed colours.</p>
      <div class="idea-cards">${DESIGNS.map(design => card(design.id)).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>Wing</th><th>Family</th><th>Colour</th><th>Panels for each side</th><th>Draw calls</th><th>Picture memory</th><th>Time to paint</th></tr></thead><tbody id="cost-rows"></tbody></table></div>
      <p class="section-note">The numbers are from the capture of the clips, on a computer. The game paints the pictures of a wing one time, when the player selects it.</p>
    </section>

    <section class="section-block" aria-labelledby="levers-title">
      <p class="eyebrow">02 / THE RENDERING</p>
      <h2 id="levers-title">Six changes to how the game draws a wing</h2>
      <p class="section-note">The six pictures show the wing Glitter vein with the wing colour Blush. Each picture adds one change. In <b>See it live</b>, each change has a switch.</p>
      <div class="shots">
        ${figure('L0.jpg', 'Wings of one flat pale colour', 'The game of before.', 'One flat colour with an opacity of 0.57.')}
        ${figure('L1.jpg', 'The same wings with a deeper colour at the back and a pale colour at the tips', '+ Painted membrane.', 'A deeper colour, and a change from the back to the tips.')}
        ${figure('L2.jpg', 'The same wings with veins, dots and an edge line', '+ Veins, spots and edges.', 'Drawn with a real width.')}
        ${figure('L3.jpg', 'The same wings with a small shift of colour', '+ Colour shift.', 'The colour moves with the view angle.')}
        ${figure('L4.jpg', 'The same wings with bright points on the veins', '+ Glitter.', 'Points that flash on the veins and the dots.')}
        ${figure('L5.jpg', 'The same wings, brighter, with light that comes through them', '+ Light through the wing, soft beat.', 'All six changes.')}
      </div>
      <ul class="lever-list">${LEVERS.map(lever => `<li><h3>${lever.name}</h3><p>${lever.text}</p></li>`).join('')}</ul>
    </section>

    <section class="section-block" aria-labelledby="night-title">
      <p class="eyebrow">03 / AT NIGHT</p>
      <h2 id="night-title">Three wings give their own light</h2>
      <p class="section-note">The same place with the Sun 16° below the horizon. The first picture is Petal of the game of before.</p>
      <div class="shots four">
        ${figure('N-B1.jpg', 'The Petal wings at night, grey and hard to see', 'Petal, before.', 'Grey at night.')}
        ${figure('N-moth.jpg', 'The Moon moth wings at night with a soft light', '10 Moon moth.', 'A soft light on all the wing.')}
        ${figure('N-star.jpg', 'The Starlight wings at night with bright stars', '14 Starlight.', 'The stars and the edge shine.')}
        ${figure('N-aurora.jpg', 'The Aurora wings at night as curtains of light', '20 Aurora.', 'The brightest wing at night.')}
      </div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">04 / WHAT THE GAME HAD BEFORE</p>
      <h2 id="findings-title">Three wings and eight findings</h2>
      <div class="idea-cards before">${BEFORE_OPTIONS.map(option => card(option.id)).join('')}</div>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">05 / NOW IN THE GAME</p><h2 id="brief-title">The new rendering, and the twelve wings that you selected.</h2>
        <p>The rendering gives more than a new shape gives: it makes the wing colour visible, and it makes the wing move with the light. You selected twelve wings on 3 October 2026: ${SELECTED.map(id => designById(id)!.name).join(', ')}. They fill four rows of three in the menu. Autumn leaf has fixed colours; each other wing takes the wing colour of the menu.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>One module for the wings</h3><p>The panels, the painter and the shader are in <code>src/fairy-wings/</code>. <code>createFairyRig()</code> uses it in place of its own wing loop. The wing beat of <code>pose()</code> did not change.</p></div></article>
        <article><span>2</span><div><h3>Petal, Luna and Flutter are gone from the menu</h3><p>A saved look with Petal gets Dew glass, which is the Petal shape. Luna gets Glitter vein, and Flutter gets Swirl and gems.</p></div></article>
        <article><span>3</span><div><h3>Twelve wings in the menu</h3><p><code>wingOptions</code> has the twelve wings. Each button of the menu shows a small picture of its wing in the wing colour of the look.</p></div></article>
        <article><span>4</span><div><h3>Not done: the cost on a phone</h3><p>Measure the time to paint on a phone. If it is slow, paint at 256 pixels. The menu also does not show that the wing colour has no effect on Autumn leaf.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">06 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p><div class="choices">${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}</div><textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">07 / THE TECHNICAL STUDY</p><h2 id="technical-title">The panels, the pictures and the shader</h2><p>The same text as <a href="${studyUrl}">docs/fairy-wing-study.md</a>.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 20</span><span>The game has the twelve selected wings</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const all = <T extends HTMLElement = HTMLButtonElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let captured: Record<string, WingStats> = {}
  const run = () => lab?.run as WingRun | undefined
  const costOf = (id: string) => state.live && id === state.id ? run()?.stats() ?? captured[id] : captured[id]

  function renderDetail() {
    const design = designById(state.id), cost = costOf(state.id)
    get('#detail').innerHTML = `
      <p class="eyebrow">${design ? `${design.family.toUpperCase()} · ${numberOf(state.id)} OF 20` : 'THE GAME OF BEFORE'}</p>
      <h2>${nameOf(state.id)}</h2>
      <p class="lead">${lineOf(state.id)}</p>
      <p class="pills">${pills(state.id)}</p>
      ${design ? `<h3>What the child sees</h3><p>${design.child}</p>` : '<h3>What the child sees</h3><p>A clear wing of one pale colour, with a thin line at its edge. This wing is no longer in the game. See the findings in section 04.</p>'}
      ${cost ? `<h3>Cost</h3><dl class="cost"><div><dt>Panels for each side</dt><dd>${cost.panels}</dd></div><div><dt>Draw calls</dt><dd>${cost.drawCalls}</dd></div><div><dt>Picture memory</dt><dd>${cost.megabytes} MB</dd></div><div><dt>Time to paint</dt><dd>${cost.ms} ms</dd></div></dl>` : ''}
      ${design ? `<h3>Limit</h3><p>${design.limit}</p>` : ''}`
    all('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = get('#player-note').hidden = !state.live
    all('[data-camera]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.camera === view.camera)))
    all('[data-boost]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.boost === '1') === view.boost)))
    all('[data-night]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.night === '1') === view.night)))
    all('[data-colour]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.colour === view.wingColor)))
  }
  function renderCosts() {
    get('#cost-rows').innerHTML = IDS.map(id => {
      const cost = captured[id], design = designById(id)
      return `<tr><th>${labelOf(id)} · ${nameOf(id)}</th><td>${design?.family ?? 'In the game'}</td><td>${design?.colour ?? 'Wing colour'}</td>${cost ? `<td>${cost.panels}</td><td>${cost.drawCalls}</td><td>${cost.megabytes ? `${cost.megabytes} MB` : 'No picture'}</td><td>${cost.ms ? `${cost.ms} ms` : '—'}</td>` : '<td colspan="4">Not measured</td>'}</tr>`
    }).join('')
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
  all('[data-camera]').forEach(button => button.addEventListener('click', () => { view.camera = button.dataset.camera as typeof view.camera; renderDetail() }))
  all('[data-boost]').forEach(button => button.addEventListener('click', () => { view.boost = button.dataset.boost === '1'; renderDetail() }))
  // Night turns the planet, so the flight starts again. The other controls paint the wing again in place.
  all('[data-night]').forEach(button => button.addEventListener('click', () => { view.night = button.dataset.night === '1'; lab?.load(liveFeature(state.id)); renderDetail() }))
  all('[data-colour]').forEach(button => button.addEventListener('click', () => { view.wingColor = button.dataset.colour as FairyLook['wingColor']; run()?.repaint(); renderDetail() }))
  all<HTMLInputElement>('[data-lever]').forEach(input => input.addEventListener('change', () => {
    view.levers[input.dataset.lever as keyof Levers] = input.checked
    run()?.repaint()
    renderDetail()
  }))
  // A drag on the picture turns the close camera around the fairy.
  const stage = get('#live')
  let dragFrom: number | null = null
  stage.addEventListener('pointerdown', event => { dragFrom = event.clientX; stage.setPointerCapture(event.pointerId) })
  stage.addEventListener('pointermove', event => {
    if (dragFrom === null) return
    view.turn = Math.max(-3.1, Math.min(3.1, view.turn - (event.clientX - dragFrom) * 0.008))
    dragFrom = event.clientX
  })
  for (const end of ['pointerup', 'pointercancel'] as const) stage.addEventListener(end, () => { dragFrom = null })

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
    const data = JSON.stringify({ study: 'fairy-wing-study', selected: state.id, view, selectedWings: SELECTED, answers, savedAt: new Date().toISOString() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'fairy-wing-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  renderCosts()
  loadClip()
  // The numbers of each wing, from the capture of the clips.
  void fetch(media('stats.json')).then(response => response.json()).then((stats: Record<string, WingStats>) => { captured = stats; renderDetail(); renderCosts() }).catch(() => {})
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
