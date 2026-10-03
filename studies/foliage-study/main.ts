import './style.css'
import { startCapture } from './capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { FEATURES, levers } from './shots'
import type { FoliageRun } from './shots'
import { DECISIONS, FINDINGS, LEVERS, OPTIONS, optionById, WORLDS } from './model'
import type { WorldId } from './model'
import { SPECIES } from '../../src/foliage/species'
import { zonesOf } from '../../src/foliage/zones'
import type { OptionId, Zone } from '../../src/foliage/zones'
import type { PlanStats } from '../../src/foliage/planting'
import studyUrl from '../../docs/foliage-study.md?url'
import studyText from '../../docs/foliage-study.md?raw'
import basePageStyle from '../feature-ideas-study/page.css?inline'
import pageStyle from './page.css?inline'

const root = document.querySelector<HTMLDivElement>('#foliage-study')!
type Stats = PlanStats & { ms: number }

function startPage() {
  // The page look loads only for the page, so the capture page has no page styles.
  const style = document.createElement('style')
  style.textContent = basePageStyle + pageStyle
  document.head.append(style)
  showErrors()
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/foliage/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const first = OPTIONS.some(option => option.id === fromHash) ? fromHash as OptionId : 'E2'
  const state = { id: first, live: false }
  const STORE = 'fairy-foliage-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const hex = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`
  const card = (id: OptionId) => {
    const option = optionById(id)
    return `<button type="button" class="idea-card" data-pick="${id}">
      <img src="${media(`${id}.jpg`)}" alt="" loading="lazy" width="1280" height="720">
      <span class="idea-head"><b>${WORLDS[option.world]} · ${option.label}</b><strong>${option.name}</strong>${option.proposed ? '<span class="pill proposed">In the game</span>' : ''}</span>
      <span class="idea-line">${option.line}</span></button>`
  }
  const worldOptions = (world: WorldId) => OPTIONS.filter(option => option.world === world)

  root.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>18</b> / FOLIAGE AND TREES</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">EARTH AND BLOSSOM HAVEN</p><h1>Each plant, <em>a place to grow.</em></h1></div>
      <p><b>The game now has look B on both worlds.</b> Before, Earth had one tree, and Blossom Haven had one mix of candy; the study shows that game as <b>Before</b>. This study shows three new looks for each world, with more kinds of plants and with themes for the parts of each world. Each clip comes from the engine of the game: the real terrain, the fairy and the light of the game, with the new plants added by study code. <b>Fly it live</b> runs a look in 3D here.<br>The controls of the study do not change the game. <a href="#technical-title">Read the study ↓</a></p></header>

    <section class="workspace" aria-label="The looks in flight">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips world-switch" role="group" aria-label="World">${(Object.keys(WORLDS) as WorldId[]).map(world => `<button type="button" data-world="${world}">${WORLDS[world]}</button>`).join('')}</div>
          <div class="chips" id="option-chips" role="group" aria-label="Look"></div>
        </div>
        <div class="player" id="player">
          <video id="clip" playsinline muted loop preload="metadata"></video>
          <div class="stage live-stage" id="live" hidden></div>
          <p class="player-note" id="player-note"></p>
        </div>
        <div class="player-bar">
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">Fly it live</button></div>
          <div class="chips" id="live-tools" hidden><button type="button" id="replay">Play again</button><button type="button" id="free">Free flight</button></div>
          <div class="levers" id="lever-tools" hidden>
            <label class="check"><input type="checkbox" data-lever="clusters" checked> Woods and glades</label>
            <label class="check"><input type="checkbox" data-lever="variation" checked> Size and colour</label>
            <label class="check"><input type="checkbox" data-lever="wind" checked> Wind</label>
            <label class="check"><input type="checkbox" data-lever="ground" checked> Ground colours</label>
            <label class="check"><input type="checkbox" data-lever="night"> Night</label>
          </div>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <section class="section-block" aria-labelledby="plants-title">
      <p class="eyebrow">01 / THE PLANTS</p>
      <h2 id="plants-title">${Object.keys(SPECIES).length} kinds of plants, each one draw call</h2>
      <p class="section-note">Each plant is one low-polygon geometry with vertex colours. The game draws all the plants of one kind on a planet in one draw call. The fairy shows the size. A zone can give its own colours to a plant: the broadleaf tree is green in summer, pink in spring and red in autumn.</p>
      <div class="sheets">
        <figure><img src="${media('SE.jpg')}" alt="The fifteen plants of Earth in two rows, with their names" loading="lazy" width="1280" height="720"><figcaption><b>Earth.</b> Eight trees and seven small plants. Today the game has the cone tree and the grass tuft.</figcaption></figure>
        <figure><img src="${media('SH.jpg')}" alt="The plants of Blossom Haven in two rows, with their names" loading="lazy" width="1280" height="720"><figcaption><b>Blossom Haven.</b> Nine tall plants and five small ones. Today the game has the spiral lollipop, the candy cane, the marshmallow and the gumdrop.</figcaption></figure>
      </div>
    </section>

    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">02 / THE LOOKS</p>
      <h2 id="options-title">Pick one to see it fly</h2>
      <div class="idea-cards options">${worldOptions('earth').map(option => card(option.id)).join('')}${worldOptions('haven').map(option => card(option.id)).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>Look</th><th>Trees</th><th>Small plants</th><th>Kinds (draw calls)</th><th>Triangles</th><th>Time to plant</th></tr></thead><tbody id="cost-rows"></tbody></table></div>
      <p class="section-note">The numbers are for a computer, from the capture of the clips. A phone gets half the plants. Today, each plant is drawn for the whole planet; section 07 gives a way to draw only the near side.</p>
    </section>

    <section class="section-block" aria-labelledby="levers-title">
      <p class="eyebrow">03 / THE LEVERS</p>
      <h2 id="levers-title">Five changes that work with each look</h2>
      <p class="section-note">The three pictures show the same leaf forest of Earth from above, with the plants of look A. Each picture adds one lever. In <b>Fly it live</b>, each lever has a switch.</p>
      <div class="lever-shots">
        <figure><img src="${media('L0.jpg')}" alt="Trees of one size and one colour for each kind, spread evenly" loading="lazy" width="1280" height="720"><figcaption><b>New plants only.</b> An even spread, one size and one colour for each kind.</figcaption></figure>
        <figure><img src="${media('L1.jpg')}" alt="The same trees with different sizes and greens" loading="lazy" width="1280" height="720"><figcaption><b>+ Size and colour.</b> Each plant has its own size, lean and colour.</figcaption></figure>
        <figure><img src="${media('L2.jpg')}" alt="The trees stand in dense woods with open glades between them" loading="lazy" width="1280" height="720"><figcaption><b>+ Woods and glades.</b> The trees stand in woods, and flowers fill the glades.</figcaption></figure>
      </div>
      <ul class="lever-list">${LEVERS.map(lever => `<li><h3>${lever.name}</h3><p>${lever.text}</p></li>`).join('')}</ul>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">04 / WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">05 / RECOMMENDATION</p><h2 id="brief-title">Climate belts for Earth, four gardens for Blossom Haven.</h2>
        <p>Both looks give each part of a world its own theme, so a flight to a new place shows new plants. Earth stays true to the real planet. Blossom Haven keeps its candy and gets three more gardens. All five levers come with both.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>One module for the plants</h3><p>Move the plants and the zones to <code>src/foliage.ts</code>. <code>buildVegetation()</code> and <code>buildCandyEcosystem()</code> call it in place of their own loops. The terrain, the water and the creatures do not change.</p></div></article>
        <article><span>2</span><div><h3>Earth first</h3><p>Earth is the first world of the player. Add the seven belts and the ground colours, with the footprints of the new trees for the creatures.</p></div></article>
        <article><span>3</span><div><h3>Then Blossom Haven</h3><p>Keep the candy of today as the lollipop grove. Add the orchard, the glade and the peaks. Add the night glow to <code>updateEnvironment()</code>.</p></div></article>
        <article><span>4</span><div><h3>Then the cost</h3><p>Measure a phone. If it is slow, split each kind of plant into sectors of the planet, so the game draws only the near side.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">06 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">07 / THE TECHNICAL STUDY</p><h2 id="technical-title">The plants, the zones and the cost</h2><p>The same text as <a href="${studyUrl}">docs/foliage-study.md</a>.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 18</span><span>The game has look B on both worlds</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let captured: Record<string, Stats> = {}
  const number = (value: number) => value.toLocaleString('en-GB')
  const run = () => lab?.run as FoliageRun | undefined

  function zoneLine(zone: Zone) {
    const names = [...zone.trees, ...zone.under].map(entry => entry.size && entry.size > 2 ? `giant ${SPECIES[entry.species].name.toLowerCase()}` : SPECIES[entry.species].name.toLowerCase())
    return `<li><i style="background:${hex(zone.ground)}"></i><span><b>${zone.name}</b> · ${[...new Set(names)].join(', ')}</span></li>`
  }
  function costOf(id: OptionId): Stats | undefined { return state.live && id === state.id ? run()?.stats() ?? captured[id] : captured[id] }

  function renderDetail() {
    const option = optionById(state.id), zones = zonesOf(state.id), cost = costOf(state.id)
    get('#option-chips').innerHTML = worldOptions(option.world).map(item => `<button type="button" data-pick="${item.id}"><b>${item.label}</b> ${item.name}</button>`).join('')
    get('#detail').innerHTML = `
      <p class="eyebrow">${WORLDS[option.world].toUpperCase()} · ${option.label.toUpperCase()}</p>
      <h2>${option.name}</h2>
      <p class="lead">${option.line}</p>
      ${option.proposed ? '<p class="pill proposed">In the game</p>' : ''}
      <h3>What the child sees</h3><p>${option.child}</p>
      ${zones.length ? `<h3>${zones.length === 1 ? 'The plants' : 'The zones'}</h3><ul class="zone-list">${zones.map(zoneLine).join('')}</ul>` : ''}
      ${cost ? `<h3>Cost on a computer</h3><dl class="cost"><div><dt>Trees</dt><dd>${number(cost.trees)}</dd></div><div><dt>Small plants</dt><dd>${number(cost.small)}</dd></div><div><dt>Draw calls</dt><dd>${cost.kinds}</dd></div><div><dt>Triangles</dt><dd>${number(cost.triangles)}</dd></div></dl>` : ''}
      <h3>Limit</h3><p>${option.limit}</p>`
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    document.querySelectorAll<HTMLButtonElement>('[data-world]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.world === option.world)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = get('#lever-tools').hidden = !state.live
    get('#player-note').textContent = 'Live 3D. Free flight: W and S climb and descend, A and D turn, Shift boosts.'
    get('#player-note').hidden = !state.live
  }
  function renderCosts() {
    get('#cost-rows').innerHTML = OPTIONS.map(option => {
      const cost = captured[option.id]
      return `<tr><th>${WORLDS[option.world]} · ${option.label} · ${option.name}</th>${cost ? `<td>${number(cost.trees)}</td><td>${number(cost.small)}</td><td>${cost.kinds}</td><td>${number(cost.triangles)}</td><td>${cost.ms ? `${cost.ms} ms` : '—'}</td>` : '<td colspan="5">Not measured</td>'}</tr>`
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
      lab.load(FEATURES[state.id])
    } else {
      lab?.setPlaying(false)
      void clip.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: OptionId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    loadClip()
    if (state.live && lab) lab.load(FEATURES[id])
    renderDetail()
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  // The chips of the looks change with the world, so one listener on the page takes each click.
  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-pick], [data-world]')
    if (!button) return
    if (button.dataset.pick) pick(button.dataset.pick as OptionId, button.classList.contains('idea-card'))
    // A change of world keeps the label: from Earth B to Blossom Haven B.
    else pick(worldOptions(button.dataset.world as WorldId).find(option => option.label === optionById(state.id).label)!.id)
  })
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).toUpperCase()
    if (id !== state.id && OPTIONS.some(option => option.id === id)) pick(id as OptionId)
  })
  get('#mode-clip').addEventListener('click', () => setLive(false))
  get('#mode-live').addEventListener('click', () => setLive(true))
  get('#replay').addEventListener('click', () => lab?.replay())
  get('#free').addEventListener('click', () => lab?.fly())
  document.querySelectorAll<HTMLInputElement>('[data-lever]').forEach(input => input.addEventListener('change', () => {
    const lever = input.dataset.lever as keyof typeof levers
    levers[lever] = input.checked
    // Night turns the planet, so the clip starts again. The other levers plant again in place.
    if (lever === 'night') lab?.load(FEATURES[state.id])
    else run()?.replant()
    renderDetail()
  }))

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
    const data = JSON.stringify({ study: 'foliage-study', selected: state.id, levers, answers, savedAt: new Date().toISOString() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'foliage-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  renderCosts()
  loadClip()
  // The numbers of each look, from the capture of the clips.
  void fetch(media('stats.json')).then(response => response.json()).then((stats: Record<string, Stats>) => { captured = stats; renderDetail(); renderCosts() }).catch(() => {})
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
