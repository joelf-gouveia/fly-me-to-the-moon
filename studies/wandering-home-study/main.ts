import '../feature-ideas-study/style.css'
import { startCapture } from '../feature-ideas-study/capture'
import { createLab } from '../feature-ideas-study/lab'
import type { Lab } from '../feature-ideas-study/lab'
import { playCue, setSoundOn, silence, soundOn } from '../feature-ideas-study/features/sound'
import type { Cue } from '../feature-ideas-study/features/sound'
import { seeded, seedRandom } from '../friend-book-study/features/seed'
import { FEATURES } from './features/clips'
import { startBench } from './bench'
import { CHANGES, clipById, CLIPS, COMPARE, DECISIONS, FINDINGS, OPTIONS, optionById, PARTS, SIZES_OF_WORK } from './model'
import type { ClipId, Decision, OptionId } from './model'
import { handTrips, homeAtSize, HOP_SECONDS, hopTimes, HOSTS, magicYearSeconds, moonSlot, moonSlotForStay, MOON_REFERENCE, moonSpeed, PLANETS, SIZES, sizeShares, TODAY_SECONDS } from './numbers'
import studyUrl from '../../docs/wandering-home-study.md?url'
import studyText from '../../docs/wandering-home-study.md?raw'
import pageStyle from '../feature-ideas-study/page.css?inline'
import learnStyle from '../learn-and-play-study/page.css?inline'
import ownStyle from './page.css?inline'

/**
 * The page of the wandering home study: a hop of Blossom Haven each 2 minutes, with a nova, a
 * place as a moon of a planet, and a new size. Three looks of the nova, each with a clip from the
 * engine of the game, then a moon of Saturn, the sizes and the hop with the fairy on board. The
 * page also has the moon table, the size bench, the two clocks, the findings, the plan and the
 * decisions. It has the look and the lab of the feature ideas study (studies/feature-ideas-study/).
 */
const root = document.querySelector<HTMLDivElement>('#wandering-home-study')!

type BenchRow = { size: string; radius: number; build: number; upload: number; instances: number; meshes: number; animals: number; herds: number; space: { ms: number; triangles: number; calls: number }; ground: { ms: number; triangles: number; calls: number } }
type Bench = { date: string; devices: Record<'desktop' | 'phone' | 'phoneSlow', { gpu: string; rows: BenchRow[] }> }

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
  const media = (file: string) => `${import.meta.env.BASE_URL}studies/wandering-home/${file}`
  const fromHash = location.hash.slice(1).toUpperCase()
  const state = { id: (CLIPS.some(clip => clip.id === fromHash) ? fromHash : 'A') as ClipId, live: false }
  const STORE = 'fairy-wandering-home-study-v1'
  type Answers = Record<string, { choices: string[]; notes: string }>
  const answers: Answers = {}
  try { Object.assign(answers, JSON.parse(localStorage.getItem(STORE) ?? '{}')) } catch { /* The answers stay for this visit. */ }
  const esc = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const isOption = (id: ClipId): id is OptionId => id === 'A' || id === 'B' || id === 'C'
  const fieldset = (decision: Decision) => `<fieldset data-decision="${decision.id}"><legend>${decision.title}</legend><p>${decision.why}</p>${decision.options.map((choice, index) => `<label><input type="radio" name="${decision.id}" id="${decision.id}-${index}" value="${index}"${answers[decision.id]?.choices.includes(choice) ? ' checked' : ''}><span>${esc(choice)}${index === 0 ? ' <span class="pill proposed">Recommended</span>' : ''}</span></label>`).join('')}<textarea name="${decision.id}-notes" id="${decision.id}-notes" rows="2" placeholder="Notes" aria-label="Notes">${esc(answers[decision.id]?.notes ?? '')}</textarea></fieldset>`
  const recommended = OPTIONS.find(option => option.recommended)!
  const metres = (value: number) => `${Math.round(value).toLocaleString('en')} m`
  const trips = handTrips()
  const walk = sizeShares('steps')

  root.innerHTML = `
  <main>
    <nav class="masthead">${published ? '<span class="masthead-home">Fly me to the moon</span>' : '<a href="/">← Fly me to the moon</a>'}<span>FIELD STUDY <b>26</b> / THE WANDERING HOME</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">BLOSSOM HAVEN · THE HOP OF THE HOME</p><h1>Every two minutes, <em>a nova, a new sky, a new size.</em></h1></div>
      <p>The request: Blossom Haven hops each 2 minutes in place of each 5. Each hop makes a small nova that the child can see. At a hop the home can become a moon of a planet, and it can grow or shrink, from the size of Ceres to the size of Jupiter. Six clips from the engine of the game show three looks of the nova, a moon of Saturn, the sizes and a hop with the fairy on board. A bench measures each size with the real build of the home.<br>The study does not change the game. <a href="#compare-title">The three looks together ↓</a></p></header>

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
          <div class="chips"><button type="button" id="mode-clip">▶ Clip</button><button type="button" id="mode-live">Play it live</button></div>
          <div class="chips" id="live-tools" hidden><button type="button" id="replay">Play again</button><button type="button" id="free">Free flight</button></div>
          <label class="check"><input type="checkbox" id="sound" role="switch"> Sound</label>
        </div>
      </div>
      <aside class="controls" id="detail" aria-live="polite"></aside>
    </section>

    <article id="study" class="study" aria-live="polite"></article>

    <header class="together"><p class="eyebrow">THE THREE LOOKS</p><h2 id="compare-title">The three looks of the nova together</h2></header>
    <section class="section-block" aria-labelledby="options-title">
      <p class="eyebrow">PICK ONE TO SEE ITS CLIP</p>
      <h2 id="options-title">The same hop, three novae</h2>
      <div class="idea-cards option-cards">${OPTIONS.map(option => `<button type="button" class="idea-card" data-pick="${option.id}">
        <img src="${media(`${option.id}-1.jpg`)}" alt="" loading="lazy" width="1280" height="720">
        <span class="idea-head"><b>${option.id}</b><strong>${option.name}</strong>${option.recommended ? '<span class="pill proposed">Recommended</span>' : ''}</span>
        <span class="idea-line">${option.line}</span></button>`).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th></th>${OPTIONS.map(option => `<th>${option.id} · ${option.name}</th>`).join('')}</tr></thead><tbody>${COMPARE.map(row => `<tr><th>${row.row}</th>${OPTIONS.map(option => `<td>${row.values[option.id]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </section>

    <section class="section-block" aria-labelledby="clock-title">
      <p class="eyebrow">THE CLOCK</p>
      <h2 id="clock-title">Five minutes and two minutes</h2>
      <p class="section-note">Twelve minutes of play with the clock of today and the new clock. Each dot is a hop. The bands are the magic seasons: today a hop gives the next season; the plan gives one at each second hop.</p>
      <div class="clock-grid"><div id="timeline"></div>
        <div class="stats">
          <div class="stat"><strong>${Math.round(trips.mean)} s</strong><span>A straight trip by hand from a planet to the home, on average (${trips.trips.toLocaleString('en')} trips with the hop rule of the game)</span></div>
          <div class="stat"><strong>${Math.round(trips.longest)} s</strong><span>The longest straight trip, at the space speed of ${trips.speed} m/s</span></div>
          <div class="stat"><strong>${Math.round(trips.lostToday * 100)}% → ${Math.round(trips.lostNew * 100)}%</strong><span>Trips that end with the home gone: clock of ${TODAY_SECONDS / 60} minutes → ${HOP_SECONDS / 60} minutes</span></div>
          <div class="stat"><strong>${magicYearSeconds(TODAY_SECONDS) / 60} → ${magicYearSeconds(HOP_SECONDS) / 60} min</strong><span>The magic year with a season at each hop. With a season at each second hop: ${magicYearSeconds(HOP_SECONDS, 2) / 60} min</span></div>
        </div></div>
    </section>

    <section class="section-block" aria-labelledby="moon-title">
      <p class="eyebrow">A MOON OF A PLANET</p>
      <h2 id="moon-title">Where Blossom Haven has room to be a moon</h2>
      <p class="section-note">Each cell is the nearest clear path for a home of that size, from the middle of the planet. The tests are the tests of the hop rule of today (<code>clearHomePosition()</code> in <code>src/relocation.ts</code>), for each point of the path: the planet, its air and its rings, the Moon, the Sun, the belt, the comet and the circles of the other planets, with a margin of 250 m. A turn of ${metres(moonSlot('saturn', 110).distance)} around Saturn in 4 minutes is ${Math.round(moonSpeed(moonSlot('saturn', 110).distance, 240))} m/s; the Moon goes at ${Math.round(MOON_REFERENCE.speed)} m/s.</p>
      <div class="table-wrap"><table class="moon-table"><thead><tr><th>Size of the home</th>${HOSTS.map(host => `<th>${PLANETS.find(planet => planet.kind === host)!.name}</th>`).join('')}</tr></thead><tbody id="moon-rows"><tr><td colspan="9">Measuring the paths…</td></tr></tbody></table></div>
      <p class="legend"><span class="fits">Room with the rule of the whole path</span><span class="stay">Room only with the rule for the stay: the part of the hops</span><span class="none">No room: the first problem</span><span class="big">The home is bigger than the planet</span></p>
    </section>

    <section class="section-block" aria-labelledby="sizes-title">
      <p class="eyebrow">THE TEN SIZES</p>
      <h2 id="sizes-title">Each size, built with the code of the game</h2>
      <p class="section-note">The bench builds Blossom Haven at each size with <code>regenerateWorld()</code> (three builds, the median), and renders 60 frames from space and on the ground. "Computer" is a page of 1280 × 720. "Slow phone" is a page of 390 × 844 with the phone budget of the game and a CPU 4 times slower. Neither is a real phone. <span id="bench-gpu"></span></p>
      <div class="table-wrap"><table><thead><tr><th>As big as</th><th>Radius</th><th>Air · clouds</th><th>A lap at 11 m/s</th><th>Hops at this size</th><th>Plants and candy</th><th>Animals</th><th>Build: computer</th><th>Build: slow phone</th><th>Triangles from space</th></tr></thead><tbody id="size-rows"></tbody></table></div>
      <p class="section-note size-note">The plants and the triangles are the computer page; a phone has about half of the plants. "Hops at this size" is the size walk of the plan over 20,000 hops: two hops of three get a new size (${Math.round(walk.changed * 100)}%).</p>
    </section>

    <section class="section-block" aria-labelledby="findings-title">
      <p class="eyebrow">WHAT THE GAME HAS TODAY</p>
      <h2 id="findings-title">${FINDINGS.length} findings</h2>
      <ol class="findings">${FINDINGS.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>
    </section>

    <section class="brief" aria-labelledby="brief-title">
      <div class="brief-title"><p class="eyebrow">RECOMMENDATION</p><h2 id="brief-title">Build the hop of 2 minutes with ${recommended.id}, the ${recommended.name.toLowerCase()}.</h2>
        <p>A is magic and it shows from far away: the nova at the new place tells the child where her home went. Make the home a moon in one hop of two, around Earth, Saturn, Uranus or Neptune, with the rule of the whole path. Change the size by one or two of the ten steps. Build the new home before the hop, in parts, so the flight does not stop. Give a magic season at each second hop, and let the hop wait while she is near.</p></div>
      <div class="steps">${CHANGES.map(([title, text, size], index) => `<article><span>${index + 1}</span><div><h3>${title}<span class="pill">Size ${size}</span></h3><p>${text}</p></div></article>`).join('')}</div>
    </section>

    <section class="section-block" aria-labelledby="decisions-title">
      <p class="eyebrow">DECISIONS</p>
      <h2 id="decisions-title">Your answers</h2>
      <form id="decisions" class="decisions">${DECISIONS.map(fieldset).join('')}</form>
      <div class="row-buttons answers-bar"><button type="button" id="copy-answers">Copy answers</button><p class="section-note" id="save-note">The answers stay in this browser. <b>Copy answers</b> copies them for the chat with Claude; <b>Save study</b> downloads them.</p></div>
    </section>

    <section class="technical" aria-labelledby="technical-title">
      <div class="technical-head"><p class="eyebrow">THE TECHNICAL STUDY</p><h2 id="technical-title">How the clips and the numbers were made, and what the change needs</h2><p>The same text as ${published ? '<code>docs/wandering-home-study.md</code>' : `<a href="${studyUrl}">docs/wandering-home-study.md</a>`}.</p></div>
      <div class="technical-body" id="technical"></div>
    </section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 26</span><span>Study only · the game does not change</span></footer>
  </main>`

  const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
  const clip = get<HTMLVideoElement>('#clip')
  let lab: Lab | null = null
  let cues: Cue[] = [], cueTime = 0

  // ---- The two clocks --------------------------------------------------------------------------------
  function timeline() {
    const minutes = 12, width = 640, left = 118, right = 16, span = width - left - right
    const x = (seconds: number) => left + seconds / (minutes * 60) * span
    const row = (y: number, label: string, hop: number, hopsForSeason: number) => {
      const hops = hopTimes(hop, minutes)
      // The season bands: a new season at each hop (today), or at each second hop (the plan).
      const changes = [0, ...hops.filter((_, index) => (index + 1) % hopsForSeason === 0), minutes * 60]
      const bands = changes.slice(0, -1).map((from, index) => `<rect class="season-${index % 4}" x="${x(from)}" y="${y + 22}" width="${x(changes[index + 1]) - x(from)}" height="6" opacity=".8"/>`).join('')
      return `<text class="label" x="0" y="${y + 4}">${label}</text><line class="axis" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}"/>${bands}${hops.map(t => `<circle class="hop-ring" cx="${x(t)}" cy="${y}" r="9"/><circle class="hop" cx="${x(t)}" cy="${y}" r="4.5"/>`).join('')}`
    }
    const ticks = Array.from({ length: minutes + 1 }, (_, m) => `<line class="tick" x1="${x(m * 60)}" x2="${x(m * 60)}" y1="14" y2="136"/><text x="${x(m * 60)}" y="154" text-anchor="middle">${m}</text>`).join('')
    get('#timeline').innerHTML = `<svg class="timeline" viewBox="0 0 ${width} 176" role="img" aria-label="Hops in 12 minutes: 2 with the clock of today, 6 with the new clock"><title>Hops in 12 minutes</title>${ticks}${row(40, 'Today · 5 min', TODAY_SECONDS, 1)}${row(100, 'Plan · 2 min', HOP_SECONDS, 2)}<text x="${width - right}" y="172" text-anchor="end">minutes of play</text></svg>`
  }
  timeline()

  // ---- The moon table: the whole path first, then the rule for the stay in idle time --------------------
  async function moonRows() {
    const rows: string[] = []
    for (const size of SIZES) {
      const home = homeAtSize(size.base)
      const cells: string[] = []
      for (const host of HOSTS) {
        const whole = moonSlot(host, size.base)
        if (whole.fits) { cells.push(`<td class="fits${whole.bigger ? ' big' : ''}">${metres(whole.distance)}<small>${whole.radii.toFixed(1)} radii</small></td>`); continue }
        await new Promise(resolve => setTimeout(resolve, 0))
        const stay = moonSlotForStay(host, size.base, 80)
        const bigger = home.radius >= PLANETS.find(planet => planet.kind === host)!.radius
        cells.push(stay.fits ? `<td class="stay${bigger ? ' big' : ''}">${metres(stay.distance)}<small>${Math.round(stay.share * 100)}% of the hops</small></td>` : `<td class="none">—<small>${stay.reason && stay.reason !== 'the comet' ? stay.reason : whole.reason}</small></td>`)
      }
      rows.push(`<tr><th>${size.id === 'today' ? 'Today' : size.name.replace(/^the /, 'The ')}<small> · ${Math.round(home.radius)} m</small></th>${cells.join('')}</tr>`)
      get('#moon-rows').innerHTML = rows.join('') + (rows.length < SIZES.length ? '<tr><td colspan="9">Measuring the paths…</td></tr>' : '')
    }
  }
  void moonRows()

  // ---- The sizes and the bench ---------------------------------------------------------------------------
  async function sizeRows() {
    let bench: Bench | null = null
    try { bench = await (await fetch(media('bench.json'))).json() } catch { bench = null }
    const row = (device: keyof Bench['devices'], id: string) => bench?.devices[device]?.rows.find(item => item.size === id)
    if (bench) get('#bench-gpu').textContent = `Measured on ${bench.date}, ${bench.devices.desktop.gpu.replace(/^ANGLE \(([^,]+), ([^(]+?) \(.*$/, '$2')}.`
    get('#size-rows').innerHTML = SIZES.map((size, index) => {
      const home = homeAtSize(size.base), computer = row('desktop', size.id), slow = row('phoneSlow', size.id)
      const lap = home.lapSeconds < 90 ? `${Math.round(home.lapSeconds)} s` : `${(home.lapSeconds / 60).toFixed(1)} min`
      return `<tr><th>${size.id === 'today' ? 'Today' : size.name.replace(/^the /, 'The ')}</th><td>${metres(home.radius)}</td><td>${metres(home.atmosphere)} · ${metres(home.cloudHeight)}</td><td>${lap}</td><td>${Math.round(walk.shares[index] * 100)}%</td><td>${computer ? computer.instances.toLocaleString('en') : '—'}</td><td>${computer?.animals ?? '—'}</td><td>${computer ? `${computer.build} ms` : '—'}</td><td>${slow ? `${slow.build} ms` : '—'}</td><td>${computer ? `${(computer.space.triangles / 1e6).toFixed(1)} M` : '—'}</td></tr>`
    }).join('')
  }
  void sizeRows()

  // ---- The player and the study of a clip --------------------------------------------------------------
  function renderDetail() {
    const id = state.id
    if (isOption(id)) {
      const option = optionById(id)
      get('#detail').innerHTML = `
        <p class="eyebrow">LOOK ${option.id} · SIZE ${option.size} · ${SIZES_OF_WORK[option.size].toUpperCase()}</p>
        <h2>${option.name}</h2>
        <p class="lead">${option.line}</p>
        ${option.recommended ? '<p class="pill proposed">Recommended</p>' : ''}
        <h3>What the child sees</h3><p>${option.child}</p>`
    } else {
      const part = PARTS[id]
      get('#detail').innerHTML = `
        <p class="eyebrow">WITH EACH LOOK</p>
        <h2>${part.name}</h2>
        <p class="lead">${part.line}</p>
        <h3>What the child sees</h3><p>${part.child}</p>`
    }
    renderStudy()
    document.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === state.id)))
    get('#mode-clip').setAttribute('aria-pressed', String(!state.live))
    get('#mode-live').setAttribute('aria-pressed', String(state.live))
    get('#live-tools').hidden = !state.live
    get('#player-note').textContent = state.live ? 'Live 3D with the worlds of the game. Free flight: W and S climb and descend, A and D turn, Shift boosts.' : ''
    get('#player-note').hidden = !state.live
  }

  function renderStudy() {
    const id = state.id, item = clipById(id)
    const at = CLIPS.indexOf(item), previous = CLIPS[at - 1], next = CLIPS[at + 1]
    const body = isOption(id) ? (() => {
      const option = optionById(id)
      return `<section class="section-block"><p class="eyebrow">FOR AND AGAINST</p>
          <div class="plan"><div><h3>Strong points</h3><ul>${option.strong.map(line => `<li>${line}</li>`).join('')}</ul></div><div><h3>Weak points</h3><ul>${option.weak.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>`
    })() : `<section class="section-block"><p class="eyebrow">THE DESIGN</p><div class="plan"><div><h3>What the child sees</h3><p>${PARTS[id].child}</p></div><div><h3>The rules</h3><ul>${PARTS[id].detail.map(line => `<li>${line}</li>`).join('')}</ul></div></div></section>`
    get('#study').innerHTML = `
      <header class="study-head"><p class="eyebrow">${isOption(id) ? `LOOK ${id}` : 'WITH EACH LOOK'}</p><h2>${item.name}</h2><p class="study-question">${item.question}</p></header>
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
  // The cues of the clip play in step with the video: the chimes of the nova.
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
    const data = JSON.stringify({ study: 'wandering-home-study', selected: state.id, answers, savedAt: new Date().toISOString() }, null, 2)
    // A published copy of the page offers the file through the viewer; the dev server uses a link.
    const downloads = await claudeUse('downloads') as { save?: (file: { filename: string; data: string }) => Promise<unknown> } | null
    if (downloads?.save) { await downloads.save({ filename: 'wandering-home-study.json', data }).catch(() => {}); return }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    link.download = 'wandering-home-study.json'
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
// page has a fixed seed, so each clip is the same at each run (features/seed.ts of the friend book study).
const params = new URLSearchParams(location.search)
if (params.has('capture')) {
  seedRandom(26)
  void startCapture(root, seeded(FEATURES))
} else if (params.has('bench')) startBench(root, params.has('phone'))
else startPage()
