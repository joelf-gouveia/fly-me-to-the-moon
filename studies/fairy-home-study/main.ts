import '../feature-ideas-study/style.css'
import * as THREE from 'three'
import { startCapture } from '../feature-ideas-study/capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { seeded, seedRandom } from '../friend-book-study/features/seed'
import { FEATURES, liveBuild } from './features/clips'
import { HOMES, SHEET } from './homes'
import { buildHome, buildPart, HOME_COLORS, homeStats, roofScale, MAX_TOP, OPTIONS, PART_IDS, PART_NAMES, ROOFS, TODAY, WALLS, YARD_REACH, YARD_START } from './parts'
import type { ColorId, HomeLook, PartId } from './parts'
import { CANDIDATES, CHANGES, clipById, CLIPS, DECISIONS, FINDINGS, SIZES_OF_WORK } from './model'
import type { ClipId, Decision } from './model'
import studyUrl from '../../docs/fairy-home-study.md?url'
import studyText from '../../docs/fairy-home-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import learnStyle from '../learn-and-play-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the fairy home study: a build mode in which the fairy changes the roof, the walls,
 * the door and the yard of her home, and gives each part a colour. Seven clips from the engine of
 * the game, a live build mode with the real worlds, the eight homes of stories, the parts that
 * make sense, each option, the fit of the parts, the findings, the plan and the decisions. It has
 * the look and the lab of the feature ideas study (studies/feature-ideas-study/).
 */
const root = document.querySelector<HTMLDivElement>('#fairy-home-study')!

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
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/fairy-home/${file}`
  const picture = (part: PartId, id: string) => media(`P-${SHEET.findIndex(item => item.part === part && item.option === id)}.jpg`)
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'B') as ClipId, live: false, tab: 'roof' as PartId }
  const STORE = 'fairy-home-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}${index === 0 ? ' <span class="pill proposed">Recommended</span>' : ''}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const verdicts = { own: ['A part', 'proposed'], inside: ['Inside a part', ''], later: ['Later', 'warn'], no: ['No', 'warn'] } as const
  const shapes = ROOFS.length * WALLS.length * OPTIONS.door.length * OPTIONS.yard.length

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>29</b> / THE FAIRY HOME</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">BLOSSOM HAVEN · THE COTTAGE</p><h1>A home that she builds, <em>part by part, in her colours.</em></h1></div>
      <p>The request: a simple build mode. The fairy changes the parts of her home, each part from a set of options, and gives each part a colour. This study looks at how fairy homes look, finds the parts that make sense, and builds them with the engine of the game. Seven clips show the build mode and each part. <b>Build it yourself</b> runs the build mode live, with the real worlds.<br>The study does not change the game. <a href="#homes-title">How fairy homes look ↓</a></p></header>

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
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">✦ Build it yourself</button></div>
          <p class="small" id="bar-note">The clips come from the engine of the game. The panel in the clip B has the classes of the fairy panel of the game.</p>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <article id="study" class="study" aria-live="polite"></article>

    <header class="together"><p class="eyebrow">THE LOOK</p><h2 id="homes-title">How fairy homes look</h2></header>
    <section class="section-block" aria-labelledby="homes-sub">
      <p class="eyebrow">EIGHT HOMES OF STORIES, GARDENS AND GAMES</p>
      <h2 id="homes-sub">Small, round, made of nature, with a door like a face</h2>
      <p class="section-note">The fairy homes of picture books, of garden crafts and of games have the same marks. They are small and round. They are made of things of nature or of the kitchen: a mushroom, a stump, a pumpkin, a teapot. They have one clear outline from far away: the roof. The door is low, round and bright, like a face. The windows glow at night. A ring of flowers, mushrooms, stones or lights goes around them. Each home below is made from the parts of this study. The pictures come from the engine of the game.</p>
      <div class="home-cards">${HOMES.map((home, index) => `<figure class="home-card"><img src="${media(`H-${index}.jpg`)}" alt="${home.name}: ${home.parts}" loading="lazy" width="1280" height="720"><figcaption><strong>${home.name}</strong><span>${home.from}</span><small>${home.parts}</small></figcaption></figure>`).join('')}</div>
      <div class="marks">
        <div><h3>The outline</h3><p>From the air, the roof makes the home: a cap, a crown, a hat. It is the part that differs most between the homes.</p></div>
        <div><h3>The materials</h3><p>Things of nature and of the kitchen at a big size: bark, a cap, a shell of a pumpkin, a teapot, straw, pebbles.</p></div>
        <div><h3>The face</h3><p>A low round door and two round windows. After sunset the windows glow: the home looks alive.</p></div>
        <div><h3>The ring</h3><p>A circle around the home: flowers, mushrooms (the fairy ring), a fence, lights or a pond. It marks the home on the ground.</p></div>
      </div>
    </section>

    <section class="section-block" aria-labelledby="parts-title">
      <p class="eyebrow">WHICH PARTS MAKE SENSE</p>
      <h2 id="parts-title">Four parts and four colours</h2>
      <div class="parts-grid">
        <figure class="parts-figure"><img src="${media('X-0.jpg')}" alt="The four parts of a home apart: the roof on top, the walls, the door in front and the yard on the ground" loading="lazy" width="1280" height="720"><figcaption>The parts apart. Each part sits on the walls: the walls give the height and the radius of their top and of their front.</figcaption></figure>
        <div class="table-wrap"><table class="candidates"><thead><tr><th>Part</th><th>Verdict</th><th>Why</th></tr></thead><tbody>${CANDIDATES.map(item => `<tr><th>${item.part}</th><td><span class="pill ${verdicts[item.verdict][1]}">${verdicts[item.verdict][0]}</span><small>${item.where}</small></td><td>${item.why}</td></tr>`).join('')}</tbody></table></div>
      </div>
    </section>

    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">EACH OPTION</p>
      <h2 id="options-title">${SHEET.length} options and 12 colours</h2>
      <p class="section-note">Each picture shows one option on the cottage of today. With 6 roofs, 6 walls, 5 doors and 6 yards, a child can make ${shapes.toLocaleString('en')} shapes of home before the colours. Each option has its own colour first; she can then give it any of the 12 colours.</p>
      ${PART_IDS.map(part => `<div class="sheet-row"><h3>${PART_NAMES[part]}<small>${OPTIONS[part].length} options</small></h3><div class="sheet">${(OPTIONS[part] as readonly { id: string; label: string; color: ColorId }[]).map(option => `<figure><img src="${picture(part, option.id)}" alt="" loading="lazy" width="1280" height="720"><figcaption>${option.label}${option.id === TODAY[part] ? ' <span class="pill">Today</span>' : ''}<i style="background:${hex(HOME_COLORS.find(color => color.id === option.color)!.color)}" title="${option.color}"></i></figcaption></figure>`).join('')}</div></div>`).join('')}
      <div class="palette">${HOME_COLORS.map(color => `<span><i style="background:${hex(color.color)}"></i>${color.label}</span>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="fit-title">
      <p class="eyebrow">THE SOCKET</p>
      <h2 id="fit-title">Each roof on each walls</h2>
      <p class="section-note">The height of the top of the home in metres, for each roof on each walls, built with <code>parts.ts</code> in this page. The flower of the guide is at 8 m; each home stays under ${MAX_TOP} m. A roof that would go higher gets lower, not narrower (marked ↓). The walls, the roofs and the doors stay inside ${YARD_START + 1.7} m; the yards stay from ${YARD_START} m to ${YARD_REACH} m.</p>
      <div class="table-wrap"><table class="fits"><thead><tr><th>Walls</th><th>Top of the walls</th>${ROOFS.map(roof => `<th>${roof.label}</th>`).join('')}</tr></thead><tbody id="fit-rows"></tbody></table></div>
      <div class="stats" id="fit-stats"></div>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">${FINDINGS.length} findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">Build a home of four parts and twelve colours, from a button at the cottage.</h2>
        <p>The roof, the walls, the door and the yard are the parts that make a fairy home, and each roof fits each walls with one rule. The windows go with the walls, and a topper goes with its roof. One colour for each part keeps the panel small. Build mode opens near the cottage, so the home becomes a reason to fly home. All options are open from the start.</p></div>
      <div class="steps">${CHANGES.map(([title, text, size], index) => `<article><span>${index + 1}</span><div><h3>${title}<span class="pill" title="${SIZES_OF_WORK[size]}">Size ${size}</span></h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the parts fit, how the clips were made, and what the change needs</h2><p>The same text as ${published ? '<code>docs/fairy-home-study.md</code>' : `<a href="${studyUrl}">docs/fairy-home-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 29</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null

  // ---- The fit of the parts, measured with parts.ts -------------------------------------------------
  function fitRows() {
    const window = new THREE.MeshStandardMaterial()
    const options = { groundRadius: 140.5, windowMaterial: window }
    const look = (change: Partial<HomeLook>): HomeLook => ({ ...structuredClone(TODAY), ...change })
    const stats = (part: PartId, value: HomeLook) => {
      const walls = buildPart('walls', value, null, options)
      const group = part === 'walls' ? walls.group : buildPart(part, value, walls.socket, options).group
      const result = { ...homeStats(new THREE.Group().add(group)), socket: walls.socket! }
      group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
      return result
    }
    get('#fit-rows').innerHTML = WALLS.map(walls => {
      const base = stats('walls', look({ walls: walls.id }))
      const cells = ROOFS.map(roof => {
        const value = look({ walls: walls.id, roof: roof.id })
        const top = stats('roof', value)
        const { s, sy } = roofScale(roof.id, base.socket)
        const squashed = sy < s - 1e-6
        return `<td class="${squashed ? 'low' : ''}">${top.top.toFixed(2)} m${squashed ? ' ↓' : ''}</td>`
      }).join('')
      return `<tr><th>${walls.label}</th><td>${base.socket.topY.toFixed(2)} m · r ${base.socket.topRadius.toFixed(2)} m</td>${cells}</tr>`
    }).join('')
    const most = (part: PartId, key: 'calls' | 'triangles') => Math.max(...OPTIONS[part].map(option => stats(part, look({ [part]: option.id } as Partial<HomeLook>))[key]))
    const today = homeStats(buildHome(TODAY, options).group)
    const calls = PART_IDS.reduce((sum, part) => sum + most(part, 'calls'), 0)
    const triangles = PART_IDS.reduce((sum, part) => sum + most(part, 'triangles'), 0)
    get('#fit-stats').innerHTML = `
      <div class="stat"><strong>${shapes.toLocaleString('en')}</strong><span>Shapes of home, before the colours: 6 × 6 × 5 × 6</span></div>
      <div class="stat"><strong>${today.calls} → ${calls}</strong><span>Draw calls: the cottage of today in parts, and the most for any home (the pieces of one paint are one mesh)</span></div>
      <div class="stat"><strong>${(triangles / 1000).toFixed(0)} k</strong><span>Triangles of the largest home: the largest option of each part together</span></div>
      <div class="stat"><strong>${MAX_TOP} m</strong><span>The highest top of any home. The cottage of today: ${today.top.toFixed(2)} m</span></div>`
  }
  fitRows()

  // ---- The player, the study of a clip and the live build mode --------------------------------------
  function renderDetail() {
    const item = clipById(state.id)
    if (state.live) renderBuildPanel()
    else get('#detail').innerHTML = `
      <p class="eyebrow">CLIP ${item.id}</p>
      <h2>${item.name.replace(/^[A-Z] · /, '')}</h2>
      <p class="lead">${item.line}</p>
      <h3>What the child sees</h3><p>${item.child}</p>`
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(!state.live && button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#player-note').textContent = state.live ? 'Live 3D with the worlds of the game. Drag to turn the camera; the wheel moves it nearer.' : ''
    get('#player-note').hidden = !state.live
  }

  /** The panel of the live build mode: the same parts as the panel of the clip B, in the look of the page. */
  function renderBuildPanel() {
    const look = liveBuild.changes?.builder.look ?? TODAY
    const part = state.tab
    get('#detail').innerHTML = `
      <p class="eyebrow">BUILD IT YOURSELF</p>
      <h2>Make it yours</h2>
      <div class="build-tabs" role="tablist" aria-label="Part">${PART_IDS.map(id => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === part}">${PART_NAMES[id]}</button>`).join('')}</div>
      <div class="build-options" role="group" aria-label="${PART_NAMES[part]}">${(OPTIONS[part] as readonly { id: string; label: string }[]).map(option => `<button type="button" data-option="${option.id}" aria-pressed="${look[part] === option.id}"><img src="${picture(part, option.id)}" alt=""><span>${option.label}</span></button>`).join('')}</div>
      <h3>Colour of the ${PART_NAMES[part].toLowerCase()}</h3>
      <div class="build-swatches" role="group" aria-label="Colour">${HOME_COLORS.map(color => `<button type="button" data-color="${color.id}" aria-pressed="${look.colors[part] === color.id}" aria-label="${color.label}" title="${color.label}"><i style="background:${hex(color.color)}"></i></button>`).join('')}</div>
      <div class="build-tools"><button type="button" id="surprise">✦ Surprise me</button><button type="button" id="today">The cottage of today</button></div>
      <p class="small">The study keeps no saved home: each visit starts with the cottage of today.</p>`
    const detail = get('#detail')
    detail.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.tab as PartId; renderBuildPanel(); detail.querySelector<HTMLElement>(`[data-tab="${state.tab}"]`)?.focus() }))
    detail.querySelectorAll<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { run({ set: [part, button.dataset.option!] }); renderBuildPanel(); detail.querySelector<HTMLElement>(`[data-option="${button.dataset.option}"]`)?.focus() }))
    detail.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button => button.addEventListener('click', () => { run({ paint: [part, button.dataset.color as ColorId] }); renderBuildPanel(); detail.querySelector<HTMLElement>(`[data-color="${button.dataset.color}"]`)?.focus() }))
    get('#surprise').addEventListener('click', () => {
      const home = HOMES[Math.floor(Math.random() * HOMES.length)]
      const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]
      // Half of the surprises are a home of the stories; the other half mix the parts and the colours.
      const mixed: HomeLook = { roof: pick(ROOFS).id, walls: pick(WALLS).id, door: pick(OPTIONS.door).id, yard: pick(OPTIONS.yard).id, colors: { roof: pick(HOME_COLORS).id, walls: pick(HOME_COLORS).id, door: pick(HOME_COLORS).id, yard: pick(HOME_COLORS).id } }
      run({ look: Math.random() < 0.5 ? home.look : mixed }); renderBuildPanel()
    })
    get('#today').addEventListener('click', () => { run({ look: TODAY }); renderBuildPanel() })
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  function run(step: Parameters<NonNullable<typeof liveBuild.changes>['run']>[0]) { liveBuild.changes?.run({ ...step, quiet: reducedMotion.matches }) }

  function renderStudy() {
    const id = state.id, item = clipById(id)
    const at = CLIPS.indexOf(item), previous = CLIPS[at - 1], next = CLIPS[at + 1]
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">CLIP ${id}</p><h2>${item.name}</h2><p class="study-question">${item.question}</p></header>
      <section class="section-block"><p class="eyebrow">THREE MOMENTS OF THE CLIP</p>
        <div class="moments">${item.moments.map((moment, index) => `<figure><img src="${media(`${id}-${index}.jpg`)}" alt="" loading="lazy" width="1280" height="720"><figcaption><b>${moment.t} s</b> ${moment.caption}</figcaption></figure>`).join('')}</div></section>
      <section class="section-block"><p class="eyebrow">THE DESIGN</p><div class="plan"><div><h3>What the child sees</h3><p>${item.child}</p></div><div><h3>The rules</h3><ul>${item.rules.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>
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
      lab.load(FEATURES.L)
    } else {
      lab?.setPlaying(false)
      void clip.play().catch(() => {})
    }
    renderDetail()
  }
  function pick(id: ClipId, scroll = false) {
    state.id = id
    try { history.replaceState(null, '', `#${id}`) } catch { /* A frame can refuse a change of its address. */ }
    if (state.live) setLive(false)
    renderDetail()
    loadClip()
    if (scroll) get('.workspace').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' })
  }
  document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.addEventListener('click', () => pick(button.dataset.pick as ClipId)))
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1).toUpperCase()
    if (id !== state.id && CLIPS.some(item => item.id === id)) pick(id as ClipId)
  })
  get('#mode-clip').addEventListener('click', () => setLive(false))
  get('#mode-live').addEventListener('click', () => setLive(true))

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
    const data = JSON.stringify({ study: 'fairy-home-study', selected: state.id, home: liveBuild.changes?.builder.look ?? null, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'fairy-home-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'fairy-home-study.json'
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
  seedRandom(27)
  void startCapture(root, seeded(FEATURES))
} else startPage()
