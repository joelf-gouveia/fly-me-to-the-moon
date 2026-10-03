import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import lookStyle from '../feature-ideas-study/page.css?inline'
import pageStyle from './page.css?inline'
import { DECISIONS, EARTH, FINDINGS, landmarkById, LANDMARKS, NOT_BUILT, patchTriangles, SIZES } from './model'
import type { LandmarkId, Photo } from './model'
import { prepareEarth } from './tours'
import type { Landscape } from './tours'
import studyUrl from '../../docs/earth-landmarks-study.md?url'
import studyText from '../../docs/earth-landmarks-study.md?raw'

type ViewId = LandmarkId | 'EARTH'

/** The study page: the clips, the real places next to the game, the findings and the decisions. */
export function startPage(root: HTMLElement) {
  // The dark look of the feature ideas study, then the rules of this page.
  for (const css of [lookStyle, pageStyle]) {
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
  }
  showErrors()
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/earth-landmarks/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (fromHash === 'EARTH' || LANDMARKS.some(landmark => landmark.id === fromHash) ? fromHash : 'EARTH') as ViewId, live: false }
  const STORE = 'fairy-earth-landmarks-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const credit = (photo: Photo) => `Photo: <a href="${photo.page}" target="_blank" rel="noopener">${esc(photo.artist)}</a>, ${photo.licenceUrl ? `<a href="${photo.licenceUrl}" target="_blank" rel="noopener">${photo.licence}</a>` : photo.licence}, Wikimedia Commons`
  const proposed = LANDMARKS.filter(landmark => landmark.proposed)

  root.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>17</b> / EARTH LANDMARKS</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">A MORE VARIED EARTH</p><h1>Twelve wonders, <em>on one small Earth.</em></h1></div>
      <p>Earth in the game has meadows, rivers, hills and snow. This study adds twelve famous places of the real Earth: a canyon, a volcano, dunes, sea towers, a coral ring, ice, a waterfall, red rock towers, stone columns, a fjord, a rainbow spring and striped hills.<br>Each clip comes from the engine of the game. A photo of the real place is next to it. These landmarks do not change the game. Pick the landmarks you want at the end of the page. <a href="#technical-title">Read the study ↓</a></p></header>

    <section class="workspace" aria-label="The landmarks in flight">
      <div class="stage-column">
        <div class="stage-bar">
          <div class="chips" role="group" aria-label="Landmark"><button type="button" data-pick="EARTH">Whole Earth</button>${LANDMARKS.map(landmark => `<button type="button" data-pick="${landmark.id}"><b>${landmark.id}</b> ${landmark.name}</button>`).join('')}</div>
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

    <section class="section-block" aria-labelledby="pairs-title">
      <p class="eyebrow">01 / THE REAL PLACE AND THE GAME</p>
      <h2 id="pairs-title">Twelve places, side by side</h2>
      <p class="section-note">Left: the real place. Right: the same place on the Earth of the game, from the study code. Select a card to see its clip.</p>
      <div class="pair-cards">${LANDMARKS.map(landmark => `<article class="pair-card">
        <button type="button" class="pair" data-pick="${landmark.id}" aria-label="${landmark.id} ${esc(landmark.name)}: see the clip">
          <img src="${media(`real/${landmark.id}.jpg`)}" alt="Photo of ${esc(landmark.real)}" loading="lazy">
          <img src="${media(`${landmark.id}.jpg`)}" alt="${esc(landmark.name)} in the game" loading="lazy" width="1280" height="720">
        </button>
        <div class="pair-text"><span class="idea-head"><b>${landmark.id}</b><strong>${landmark.name}</strong>${landmark.proposed ? '<span class="pill proposed">Proposed</span>' : ''}</span>
          <span class="idea-line">${landmark.line}</span>
          <span class="idea-meta"><span class="pill">Size ${landmark.size}</span><span class="pill">${landmark.parts}</span></span>
          <span class="small">${esc(landmark.real)}. ${credit(landmark.photo)}</span></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">02 / EARTH IN THE GAME TODAY</p>
      <h2 id="findings-title">Eight findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="section-block" aria-labelledby="method-title">
      <p class="eyebrow">03 / HOW A LANDMARK IS MADE</p>
      <h2 id="method-title">A patch of fine ground, at a place that a rule finds</h2>
      <div class="code-grid"><div>
        <p>Each landmark is a <b>patch</b>: a round piece of ground with a radius of 48 to 86 m. Inside the patch, a height rule and a colour rule of the landmark replace the terrain of the game. At the edge the two blend, so there is no seam.</p>
        <p>The patch has its own mesh with cells of 0.6 to 1.1 m. The ground of the game has cells of ${EARTH.groundCell} m, and it goes down under the patch. The flight and the camera read the same terrain rule, so the fairy cannot fly through a rock tower.</p>
        <p>Trees, columns, boats, penguins, waterfalls, steam and the lagoon water are objects on the patch. A search finds the place of each patch on the landscape: dry land, open sea, a coast, or the snow near a pole.</p>
      </div><pre class="snippet"><code>${esc(SNIPPET)}</code></pre></div>
      <div class="compare">
        <figure><img src="${media('L8-coarse.jpg')}" alt="Monument Valley with the mesh of the game: soft cones" loading="lazy" width="1280" height="720"><figcaption><b>Cells of ${EARTH.groundCell} m</b>, as the ground of the game today. The towers are soft cones, and the thin spires are gone.</figcaption></figure>
        <figure><img src="${media('L8.jpg')}" alt="Monument Valley with a fine patch: steep towers" loading="lazy" width="1280" height="720"><figcaption><b>Cells of 0.9 m</b>, the patch of the study: ${patchTriangles(landmarkById('L8')).toLocaleString('en')} triangles. The towers have steep walls.</figcaption></figure>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Landmark</th><th>Needs</th><th>Patch</th><th>Triangles</th><th>Parts</th><th>Size</th></tr></thead><tbody>${LANDMARKS.map(landmark => `<tr><th>${landmark.id} · ${landmark.name}</th><td>${GROUND_NAMES[landmark.ground]}</td><td>${landmark.radius} m radius, cells of ${landmark.cell} m</td><td>${patchTriangles(landmark).toLocaleString('en')}</td><td>${landmark.parts}</td><td>${landmark.size} · ${SIZES[landmark.size]}</td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="more-title">
      <p class="eyebrow">04 / MORE REAL PLACES</p>
      <h2 id="more-title">Ten places that the study did not build</h2>
      <p class="section-note">The same method can make each of them. Write the ones you want in the notes of decision 1.</p>
      <div class="table-wrap"><table><thead><tr><th>Place</th><th>Where</th><th>What it needs</th></tr></thead><tbody>${NOT_BUILT.map(([name, where, needs]) => `<tr><th>${name}</th><td>${where}</td><td>${needs}</td></tr>`).join('')}</tbody></table></div>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">05 / RECOMMENDATION</p><h2 id="brief-title">Build the patch first, then eight landmarks.</h2>
        <p>The proposed landmarks are ${proposed.map(landmark => landmark.id).join(', ')}. They look the most different from each other and from the Earth of today. The other four are good later: the sea towers look soft on a height mesh, the dunes need shadows, the stone columns are small from the air, and the fjord needs a coast.</p></div>
      <div class="steps">
        <article><span>1</span><div><h3>The patch, with three ground landmarks</h3><p>A new <code>src/landmarks.ts</code>: the place search, the terrain blend and the patch mesh. Start with L8, L1 and L12, which are ground only. This step proves the method on a phone.</p></div></article>
        <article><span>2</span><div><h3>Objects: Mount Fuji and the ice</h3><p>Add the instance helper for trees and penguins. The trees of the game already keep off steep and high ground; the landmark trees use the same rule.</p></div></article>
        <article><span>3</span><div><h3>Own water and motion: the atoll, the spring and Angel Falls</h3><p>Add the lagoon water, the steam and the waterfall. These are the first water above or apart from the one sea of the game.</p></div></article>
        <article><span>4</span><div><h3>Find them</h3><p>A landmark that a child cannot find is lost work. From space the red desert, the white cone and the ice show clearly. A later step can add a sticker or a search star for each landmark.</p></div></article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">06 / DECISIONS TO MAKE</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(decision => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="${decision.multi ? 'checkbox' : 'radio'}" name="${decision.id}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">07 / THE TECHNICAL STUDY</p><h2 id="technical-title">The terrain, the method, the cost and the photo credits</h2><p>The same text as <a href="${studyUrl}">docs/earth-landmarks-study.md</a>.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 17</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null, landscape: Landscape | null = null

  function renderDetail() {
    const landmark = state.id === 'EARTH' ? null : landmarkById(state.id)
    get('#detail').innerHTML = landmark ? `
      <p class="eyebrow">${landmark.id} · SIZE ${landmark.size} · ${SIZES[landmark.size].toUpperCase()}</p>
      <h2>${landmark.name}</h2>
      <p class="lead">${landmark.line}</p>
      ${landmark.proposed ? '<p class="pill proposed">Proposed for the first step</p>' : ''}
      <figure class="real"><img src="${media(`real/${landmark.id}.jpg`)}" alt="Photo of ${esc(landmark.real)}"><figcaption>${esc(landmark.real)}. ${credit(landmark.photo)}</figcaption></figure>
      <h3>The real place</h3><p>${landmark.iconic}</p>
      <h3>What the child sees</h3><p>${landmark.child}</p>
      <h3>How the study makes it</h3><p>${landmark.build}</p>
      <h3>Limit</h3><p>${landmark.limit}</p>` : `
      <p class="eyebrow">THE WHOLE EARTH · ${LANDMARKS.length} LANDMARKS</p>
      <h2>Earth from space</h2>
      <p class="lead">The red desert, the white cone and the ice show from far away.</p>
      <h3>What the clip shows</h3><p>The camera goes a third of the way around Earth. The twelve landmarks stand on one fixed landscape of the game, at places that a search finds: dry land, open sea, a coast, or the snow near a pole.</p>
      <h3>The size</h3><p>Earth has a radius of ${EARTH.radius} m. Each landmark is a patch of 96 to 172 m. Together the twelve patches cover about one fifth of Earth.</p>
      <h3>Next</h3><p>Select a landmark above. Each clip starts with a view from the air, then follows the fairy with the camera of the game.</p>`
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D. Free flight: W and S climb and descend, A and D turn, Shift boosts.' : ''
    get('#player-note').hidden = !state.live
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
      landscape ??= prepareEarth(lab)
      lab.load(landscape.features[state.id])
    } else {
      lab?.setPlaying(false)
      void clip.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: ViewId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    renderDetail()
    loadClip()
    if (state.live && lab && landscape) lab.load(landscape.features[id])
    if (scroll) get('.workspace').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick as ViewId, button.classList.contains('pair'))))
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
    const data = JSON.stringify({ study: 'earth-landmarks-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'earth-landmarks-study.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  })

  get('#technical').innerHTML = renderMarkdown(studyText)
  renderDetail()
  loadClip()
}

const GROUND_NAMES = { land: 'Dry land', sea: 'Open sea', coast: 'A coast', polar: 'Snow near a pole' }

const SNIPPET = `// src/landmarks.ts (new): the terrain of Earth, with the landmarks
export function withLandmarks(base: Sampler, sites: Site[]): Sampler {
  return (x, y, z) => {
    const sample = base(x, y, z)
    const site = sites.find(site => site.contains(x, y, z))
    if (!site) return sample
    const { u, v, r } = site.local(x, y, z)        // metres east and north of the centre
    const w = 1 - smoothstep(r, 0.66 * site.radius, 0.9 * site.radius)
    return { ...sample, height: lerp(sample.height, site.shape.height(u, v), w) }
  }
}

// src/worlds.ts, regenerateWorld(): Earth only
world.sample = worldTerrain(world.kind, world.seed)
if (world.kind === 'earth') {
  const sites = findPlaces(world.sample, world.radius)   // land, sea, coast or pole
  world.sample = withLandmarks(world.sample, sites)
  buildGround(world, sites)        // skips the trees and lowers the ground under each patch
  for (const site of sites) world.surface.add(patchMesh(world, site), ...site.objects(world))
}`

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
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => /^(https?:|#)/.test(href) ? `<a href="${href}">${label}</a>` : label)
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
