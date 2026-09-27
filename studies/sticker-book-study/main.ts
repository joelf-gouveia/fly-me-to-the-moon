import './style.css'
import {
  arrivalDistance, arrive, cost, emptyBook, find, GROUP_NAMES, LANGS, LINES, MILESTONE, OPTIONS, parseBook, place,
  progress, reachesMilestone, stickerById, stickerFact, stickerName, stickerTask, STICKERS, suggestNext, text,
} from './model'
import type { Book, BookOption, Earned, Lang, StickerId } from './model'
import studyUrl from '../../docs/sticker-book-study.md?url'

type Settings = { option: BookOption; world: StickerId; voice: boolean; chime: boolean; words: boolean; rate: 'slow' | 'normal'; speaker: string; lang: Lang }
const options = Object.keys(OPTIONS) as BookOption[]
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const about: Record<BookOption, { line: string; child: string; learn: string; game: string; work: string; risk: string }> = {
  stamps: {
    line: 'One sticker for each world, the first time the fairy arrives. Each sticker says one fact.',
    child: 'Fly to a world. A sticker and a voice come at once. The thirteen spaces show where to go next.',
    learn: 'The name of each world, its kind, and one thing to remember about it.',
    game: 'One save key, one arrival test in updateNearestWorld(), and one book screen.',
    work: 'Small: the book screen, the voice and the save.',
    risk: 'A child can fill the book in two or three sessions. After that, the book gives no new reason to fly.',
  },
  search: {
    line: 'The stickers of A, plus a shiny star for one search task on each world.',
    child: 'Arrive for the hello sticker. Then look for one thing on the world: the rings of Saturn, a duck on Earth, the salt spots of Ceres.',
    learn: 'To look closely. Each world has one thing that makes it different.',
    game: `${cost('search').newChecks} new checks in flight: ${Object.entries(cost('search').checks).map(([check, count]) => `${count} ${check}`).join(', ')}.`,
    work: 'Medium: A, plus one small check for each world.',
    risk: 'A small child can miss some things. Each task needs a hint, for example the fireflies of the flower guide.',
  },
  poster: {
    line: 'The stickers of A. The child then puts each sticker on its path around the Sun.',
    child: 'Pick a sticker, then tap a path. A wrong path gives a hint: “Try a bigger path.” The sticker stays in the tray.',
    learn: 'The order of the planets, and that the Sun is in the middle.',
    game: 'A second screen with the poster. No new checks in flight.',
    work: 'Medium: A, plus the poster and its hints.',
    risk: 'The poster is a small quiz. Some children do not like a wrong answer, even a gentle one. After two tries, the right path glows.',
  },
}

// Words of the child's view. The study controls around the book stay in English.
const UI: Record<Lang, {
  title: string; count: (earned: number, total: number) => string; onPoster: (placed: number) => string; next: (name: string) => string
  kicker: { hello: string; search: string; full: string }; earned: (name: string, star: boolean | null) => string; empty: (name: string) => string
  poster: string; middle: string; path: (path: number) => string; belt: string; tray: string; trayEmpty: string; trayDone: string
}> = {
  en: {
    title: 'My space stickers', count: (earned, total) => `${earned} of ${total} stickers`, onPoster: placed => ` · ${placed} on the poster`,
    next: name => `Next: <b>${name}</b> is waiting`, kicker: { hello: 'NEW STICKER', search: 'SHINY STAR', full: 'YOUR BOOK IS FULL' },
    earned: (name, star) => `${name} sticker${star === null ? '' : star ? ', with a shiny star' : ', no star yet'}. Tap to hear it.`, empty: name => `Empty space for ${name}`,
    poster: 'Space poster with the Sun and nine paths', middle: 'The middle, where the Sun is', path: path => `Path ${path}`, belt: 'Path 5, the asteroid belt',
    tray: 'Stickers to put on the poster', trayEmpty: 'Fly to a world to get a sticker for the poster.', trayDone: 'Every sticker is on the poster!',
  },
  pt: {
    title: 'Os meus autocolantes do espaço', count: (earned, total) => `${earned} de ${total} autocolantes`, onPoster: placed => ` · ${placed} no cartaz`,
    next: name => `A seguir: <b>${name}</b> está à espera`, kicker: { hello: 'NOVO AUTOCOLANTE', search: 'ESTRELA BRILHANTE', full: 'O TEU LIVRO ESTÁ CHEIO' },
    earned: (name, star) => `Autocolante: ${name}${star === null ? '' : star ? ', com estrela brilhante' : ', ainda sem estrela'}. Toca para ouvir.`, empty: name => `Espaço vazio: ${name}`,
    poster: 'Cartaz do espaço com o Sol e nove caminhos', middle: 'O meio, onde fica o Sol', path: path => `Caminho ${path}`, belt: 'Caminho 5, a cintura de asteroides',
    tray: 'Autocolantes para pôr no cartaz', trayEmpty: 'Voa até um mundo para ganhares um autocolante para o cartaz.', trayDone: 'Os autocolantes estão todos no cartaz!',
  },
}

const art = (id: StickerId) => `<span class="art ${id}" style="--c:${hex(stickerById(id).color)}" aria-hidden="true">${id === 'fairy' ? '✿' : ''}</span>`

// Poster geometry: the Sun in the middle, nine paths out from it. Path 5 is the asteroid belt.
const pathRadius = (path: number) => path === 0 ? 24 : 40 + (path - 1) * 19
const posterAngle: Partial<Record<StickerId, number>> = { mercury: 200, venus: 320, earth: 55, moon: 72, mars: 150, vesta: 250, ceres: 15, jupiter: 105, saturn: 285, uranus: 195, neptune: 335 }
const artSize: Record<string, number> = { star: 0, rocky: 7, moon: 4, dwarf: 5, giant: 11 }

document.querySelector<HTMLDivElement>('#sticker-book-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="/">← Fly me to the moon</a><span>FIELD STUDY <b>08</b> / STICKER BOOK</span><button id="export" type="button">Save study ↓</button></nav>
    <header class="intro"><div><p class="eyebrow">AFTER THE HOME IS FOUND, THE GAME HAS NO GOAL.</p><h1>Every world, <em>a sticker.</em></h1></div>
      <p>Three ways to reward a young explorer for each world. Play the book as a child does: pretend to fly, collect stickers, and hear what each world says.<br>A proposal for the game. These controls do not change the game.</p></header>
    <section class="workspace" aria-label="Interactive sticker book study">
      <div class="preview-column">
        <div id="book" class="kid">
          <div class="scene-top"><span class="tag">CHILD’S VIEW</span><span class="tag" id="mode-label"></span></div>
          <header class="book-head"><h2 id="book-title"></h2>
            <div class="dots" id="dots" role="img"></div><p class="count" id="count"></p></header>
          <div id="book-page"></div>
          <button type="button" id="next-hint" class="next-hint"></button>
          <p class="book-caption" id="caption" aria-live="polite"></p>
          <div class="cheer" id="cheer" hidden><div class="cheer-card"><span id="cheer-art"></span><div><small id="cheer-kicker">NEW STICKER</small><h3 id="cheer-title"></h3></div></div>
            <div class="petals" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div></div>
        </div>
        <div class="finder">
          <div class="finder-group wide"><p class="eyebrow">PRETEND FLIGHT · CHOOSE A WORLD</p><div class="chips">${STICKERS.map(sticker => `<button type="button" data-world="${sticker.id}" aria-pressed="false">${sticker.name}</button>`).join('')}</div></div>
          <div class="finder-group"><p class="eyebrow">WHAT THE FAIRY DOES THERE</p><div class="chips actions"><button type="button" id="arrive">Arrive</button><button type="button" id="search"></button></div><p class="finder-note" id="finder-note"></p></div>
          <div class="finder-group"><p class="eyebrow">THE WHOLE BOOK</p><div class="chips"><button type="button" id="fill">Fill the book</button><button type="button" id="empty">Empty the book</button></div></div>
        </div>
      </div>
      <aside class="controls">
        <fieldset class="compare"><legend>Compare options</legend><div class="segmented options">${options.map(option => `<button type="button" data-option="${option}" aria-pressed="false"><b>${OPTIONS[option].letter}</b> ${OPTIONS[option].name}</button>`).join('')}</div></fieldset>
        <fieldset><legend>Language of the book</legend><div class="segmented">${(Object.keys(LANGS) as Lang[]).map(lang => `<button type="button" data-lang="${lang}" aria-pressed="false">${LANGS[lang].name}</button>`).join('')}</div></fieldset>
        <p class="eyebrow section">01 / THE BOOK</p><h2 id="option-title"></h2><p id="option-line"></p>
        <fieldset><legend>For children who cannot read yet</legend>
          <label class="check"><input id="voice" type="checkbox" /> Read aloud</label>
          <label class="check"><input id="chime" type="checkbox" /> Chime for a new sticker</label>
          <label class="check"><input id="words" type="checkbox" /> Show the words</label></fieldset>
        <label for="speaker">Voice</label><select id="speaker"><option value="browser">Browser voice · differs on each device</option></select>
        <label for="rate">Voice speed</label><select id="rate"><option value="slow">Slow · for young listeners</option><option value="normal">Normal</option></select>
        <p class="fine" id="voice-status"></p>
        <div class="budget"><p class="eyebrow">02 / COST IN THE GAME</p>
          <div class="meter-row"><span>Stickers to collect</span><output id="c-stickers"></output></div>
          <div class="meter-row"><span>Spoken lines to write and check</span><output id="c-lines"></output></div>
          <div class="meter-row"><span>New checks in flight</span><output id="c-checks"></output></div>
          <div class="meter-row"><span>Saved data, full book</span><output id="c-bytes"></output></div>
          <div class="meter-row"><span>New screens</span><output id="c-screens"></output></div>
          <p class="fine" id="save-status"></p>
        </div>
      </aside>
    </section>

    <section class="option-cards" aria-labelledby="options-title"><div class="section-title"><p class="eyebrow">03 / THREE OPTIONS</p><h2 id="options-title">Three ways to fill a book.</h2></div>
      <div class="cards">${options.map(option => `<article data-card="${option}"><p class="letter">${OPTIONS[option].letter}</p><h3>${OPTIONS[option].name}</h3><p class="line">${about[option].line}</p>
        <dl><dt>For the child</dt><dd>${about[option].child}</dd><dt>What the child learns</dt><dd>${about[option].learn}</dd><dt>In the game</dt><dd>${about[option].game}</dd><dt>Work</dt><dd>${about[option].work}</dd><dt>Risk</dt><dd>${about[option].risk}</dd></dl>
        <button type="button" data-show="${option}">Show option ${OPTIONS[option].letter}</button></article>`).join('')}</div>
      <div class="table-wrap"><table><caption>Cost of each option. “Checks” are new tests in the flight loop.</caption>
        <thead><tr><th scope="col">Measure</th>${options.map(option => `<th scope="col">${OPTIONS[option].letter} · ${OPTIONS[option].name}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Stickers to collect</th>${options.map(option => `<td>${cost(option).stickers}</td>`).join('')}</tr>
          <tr><th scope="row">Spoken lines</th>${options.map(option => `<td>${cost(option).spokenLines}</td>`).join('')}</tr>
          <tr><th scope="row">New checks in flight</th>${options.map(option => `<td>${cost(option).newChecks || 'None'}</td>`).join('')}</tr>
          <tr><th scope="row">Saved data, full book</th>${options.map(option => `<td>${cost(option).savedBytes} bytes</td>`).join('')}</tr>
          <tr><th scope="row">New screens</th>${options.map(option => `<td>${cost(option).screens}</td>`).join('')}</tr>
        </tbody></table></div>
    </section>

    <section class="words" aria-labelledby="words-title"><div class="section-title"><p class="eyebrow">04 / THE WORDS</p><h2 id="words-title">What each world says.</h2>
      <p>Each line has no numbers and a maximum of 12 words in a sentence. A test in <code>model.test.ts</code> checks this. Press a speaker button to hear the line.</p></div>
      <div class="table-wrap"><table class="word-table"><caption>The hello sticker says the fact. In option B, the search task earns a shiny star. The words follow <b>Language of the book</b>.</caption>
        <thead><tr><th scope="col">World</th><th scope="col">What the voice says</th><th scope="col">Search task · B</th><th scope="col">How the game checks it</th></tr></thead>
        <tbody id="word-rows"></tbody></table></div>
    </section>

    <section class="brief"><div class="brief-title"><p class="eyebrow">05 / WHAT EVERY OPTION NEEDS</p><h2>The book is small.<br>The voice is new.</h2>
      <p>The game saves two things today: the fairy look and the home discovery. It has no voice and no record of the worlds that the fairy visits. The flight panel already knows when a world is near.</p>
      <a href="${studyUrl}">Read the full technical study ↗</a></div>
      <div class="steps">
        <article><span>01</span><div><h3>Save the book</h3><p>Save <code>{ arrived, found, placed }</code> in <code>localStorage</code> as <code>fairy-sticker-book</code>, in a try/catch, as <code>fairy-look</code> does. Read it with <code>parseBook()</code>. Every player earns the Blossom Haven sticker with a visit, also a player who found the home before.</p></div></article>
        <article><span>02</span><div><h3>Earn a sticker on arrival</h3><p><code>updateNearestWorld()</code> in <code>src/main.ts</code> already finds when a world is near, for the flight panel. Call <code>arrive()</code> at the same place, in both play modes. The Sun counts too.</p></div></article>
        <article><span>03</span><div><h3>Add a voice</h3><p>Play the recorded lines from <code>public/voice/</code> after the first tap, as the game starts its sound. Use <code>speechSynthesis</code> only for a line with no recording. Speak only when the sound button is on. Stop the voice when the game pauses or the page hides.</p></div></article>
        <article><span>04</span><div><h3>Open the book</h3><p>Add a book button to the toolbar, beside the palette. Open it as the customizer opens: flight waits, and Escape closes it. In <b>Worlds</b>, show a small sticker on each picture that the child has.</p></div></article>
      </div></section>
    <section class="decisions"><article><p class="eyebrow">PROPOSED DEFAULT</p><h3>B, in two steps</h3><p>Ship A first: the book, the voice and the hello stickers. Then add the search stars, one world at a time. Each check can ship alone. C can come later, as a calm activity at the end of a session.</p></article>
      <article><p class="eyebrow">A DECISION TO MAKE</p><h3>Which recorded voice?</h3><p>Compare the recorded voices with <b>Voice</b>. They come from Kokoro, an open neural voice that runs on this computer, so they cost nothing and sound the same on all devices. B needs ${cost('search').spokenLines} short files. A change of text needs one command to record the line again.</p></article>
      <article><p class="eyebrow">REVIEW BEFORE SHIPPING</p><h3>Read every line aloud</h3><p>Ask a parent or a teacher to check the facts. The Blossom Haven line tells the child that it is a pretend world. The real worlds keep real facts, also where the game is stylized.</p></article></section>
    <section class="credits"><p class="eyebrow">SOURCES</p>
      <p>Facts from NASA Science, Solar System pages (science.nasa.gov/solar-system), and the NASA Dawn mission for Ceres and Vesta. Sizes and distances in the game are stylized. The game spins all worlds upright, so the book does not use the Uranus tilt fact. Recorded voices: Kokoro-82M v1.0 (hexgrad, Apache-2.0), made with <code>studies/sticker-book-study/sticker-voice.mjs</code>. Arrival distances use the “near” test of the flight panel: the larger of 85 m and 1.5 × the atmosphere.</p></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 08</span><span>Interactive concept · September 2026</span></footer>
  </main>`

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]

// The study saves its own book. The game key, fairy-sticker-book, stays untouched.
const storageKey = 'fairy-sticker-book-study-v1'
let storageAvailable = true
let book: Book = emptyBook()
try { book = parseBook(JSON.parse(localStorage.getItem(storageKey) ?? 'null')) } catch { storageAvailable = false }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(book)); storageAvailable = true } catch { storageAvailable = false }
}

const settings: Settings = { option: 'search', world: 'earth', voice: true, chime: true, words: true, rate: 'slow', speaker: 'browser', lang: 'en' }
let selectedTray: StickerId | null = null, fresh: Earned[] = [], lastWorld: StickerId = 'earth'
const misses = new Map<StickerId, number>()
const messages: string[] = []

// Voice: recorded lines from studies/sticker-book-study/sticker-voice.mjs. The browser speech
// engine speaks a line that has no recording, or when no recording exists.
type Recording = { name: string; accent: string; lines: Record<string, string> }
type Manifest = { engine: string; languages: Partial<Record<Lang, { voices: Record<string, Recording> }>> }
let manifest: Manifest | null = null
const speech = 'speechSynthesis' in window ? window.speechSynthesis : null
// Neural and enhanced voices sound more natural than the basic system voices.
const naturalness = (voice: SpeechSynthesisVoice) => (/natural|neural|online|enhanced|premium/i.test(voice.name) ? 4 : 0) + (/google/i.test(voice.name) ? 2 : 0) + (voice.localService ? 0 : 1)
// For Portuguese, a voice from Portugal comes before a Brazilian voice.
const browserVoice = () => speech?.getVoices().filter(voice => voice.lang.startsWith(settings.lang))
  .sort((a, b) => naturalness(b) + Number(b.lang === LANGS[settings.lang].speech) * 8 - naturalness(a) - Number(a.lang === LANGS[settings.lang].speech) * 8)[0]
const recordings = () => manifest?.languages[settings.lang]?.voices ?? {}
const recorded = () => recordings()[settings.speaker] ?? null
/** Lines whose text changed after the recording. */
const staleKeys = () => { const voice = recorded(); return voice ? Object.keys(LINES[settings.lang]).filter(key => voice.lines[key] !== LINES[settings.lang][key]) : [] }
function voiceStatus() {
  const voice = recorded(), stale = staleKeys().length, browser = browserVoice()
  element('#voice-status').textContent = voice
    ? stale ? `${stale} lines changed after the recording, so the browser voice says them. Run node studies/sticker-book-study/sticker-voice.mjs.`
      : settings.lang === 'pt' ? `Recorded neural voice: ${voice.name}, an English voice that says European Portuguese phonemes. An accent can remain.`
      : `Recorded neural voice: ${voice.name} (${voice.accent}). It sounds the same on all devices.`
    : !speech ? 'This browser has no voice. The words show on the page.'
    : browser ? `Browser voice: ${browser.name}. Each device has a different voice.` : `This browser has no ${LANGS[settings.lang].name} voice yet. The words show on the page.`
}
speech?.addEventListener?.('voiceschanged', voiceStatus)

// One audio element for all lines: mobile browsers allow it to play again after the first tap.
const player = new Audio()
const played: string[] = []
// Each say() starts a new turn. A clip from an old turn can fail when a new line
// stops it; that failure must not touch the new turn.
let queue: string[] = [], gapTimer = 0, turn = 0
function stopVoice() { turn++; queue = []; clearTimeout(gapTimer); player.pause(); speech?.cancel() }
function speakWithBrowser(line: string) {
  if (!speech) return
  const utterance = new SpeechSynthesisUtterance(line)
  utterance.rate = settings.rate === 'slow' ? 0.9 : 1
  utterance.lang = LANGS[settings.lang].speech
  const voice = browserVoice()
  if (voice) utterance.voice = voice
  speech.speak(utterance)
}
function playNext() {
  const key = queue.shift()
  if (!key) return
  played.push(key)
  player.src = `/voice/${settings.lang}/${settings.speaker}/${key}.mp3`
  player.playbackRate = settings.rate === 'slow' ? 1 : 1.12
  const current = turn
  player.play().catch((error: DOMException) => {
    if (current !== turn || error.name === 'AbortError') return
    // No recording to play: the browser voice says the rest of this turn.
    const rest = [key, ...queue]; queue = []; speakWithBrowser(text(settings.lang, ...rest))
  })
}
player.addEventListener('ended', () => { gapTimer = window.setTimeout(playNext, 160) })
/** Shows and says one to three lines of LINES in a row. */
function say(...keys: string[]) {
  const line = text(settings.lang, ...keys)
  messages.push(line)
  element('#caption').textContent = line
  stopVoice()
  if (!settings.voice) return
  const voice = recorded()
  if (voice && keys.every(key => voice.lines[key] === LINES[settings.lang][key])) { queue = [...keys]; playNext() }
  else speakWithBrowser(line)
}

// Chime: the same notes as the home discovery in src/main.ts.
let audio: AudioContext | null = null
function chime(notes: number[]) {
  if (!settings.chime) return
  try {
    audio ??= new AudioContext()
    void audio.resume()
    const now = audio.currentTime
    notes.forEach((frequency, index) => {
      const tone = audio!.createOscillator(), gain = audio!.createGain()
      tone.frequency.value = frequency
      gain.gain.setValueAtTime(0, now + index * 0.14)
      gain.gain.linearRampToValueAtTime(0.06, now + index * 0.14 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.9)
      tone.connect(gain).connect(audio!.destination)
      tone.start(now + index * 0.14); tone.stop(now + index * 0.14 + 1)
    })
  } catch { /* The book works without sound. */ }
}

let cheerTimer = 0
function cheer(earned: Earned[], before: number) {
  const after = progress(settings.option, book)
  const last = earned.at(-1)!, sticker = stickerById(last.id)
  const milestone = reachesMilestone(before, after.earned)
  element('#cheer-art').innerHTML = art(last.id)
  element('#cheer-art').classList.toggle('shiny', last.kind === 'search')
  const kicker = UI[settings.lang].kicker
  element('#cheer-kicker').textContent = after.earned === after.total && settings.option !== 'poster' ? kicker.full : last.kind === 'search' ? kicker.search : kicker.hello
  element('#cheer-title').textContent = stickerName(sticker.id, settings.lang)
  element('#cheer').hidden = false
  element('#cheer').classList.toggle('milestone', milestone)
  clearTimeout(cheerTimer)
  cheerTimer = window.setTimeout(() => { element('#cheer').hidden = true }, milestone ? 3600 : 2400)
  chime(milestone ? [523.25, 659.25, 783.99, 1046.5] : last.kind === 'search' ? [659.25, 783.99, 1046.5] : [523.25, 659.25])
  const keys = earned.map(item => `${item.kind === 'hello' ? 'hello' : 'found'}-${item.id}`)
  if (after.earned === after.total) keys.push(settings.option === 'poster' ? 'poster-ready' : 'book-full')
  else if (milestone) keys.push(after.earned % MILESTONE ? 'filling' : `count-${after.earned}`)
  say(...keys)
}

function earn(result: { book: Book; earned: Earned[] }) {
  const before = progress(settings.option, book).earned
  book = result.book
  lastWorld = settings.world
  fresh = result.earned
  save(); render()
  if (result.earned.length) cheer(result.earned, before)
  else say(`${settings.option === 'search' && book.found.includes(settings.world) ? 'both' : 'already'}-${settings.world}`)
  fresh = []
}

function slots() {
  return `<div class="sticker-grid">${STICKERS.map((sticker, index) => {
    const earned = book.arrived.includes(sticker.id), found = book.found.includes(sticker.id)
    const isNew = fresh.some(item => item.id === sticker.id)
    const name = stickerName(sticker.id, settings.lang)
    const label = earned ? UI[settings.lang].earned(name, settings.option === 'search' ? found : null) : UI[settings.lang].empty(name)
    return `<button type="button" class="slot ${earned ? 'earned' : 'empty'} ${isNew ? 'new' : ''} ${found && settings.option === 'search' ? 'shiny' : ''}" data-slot="${sticker.id}" style="--tilt:${(index * 37 % 9) - 4}deg" aria-label="${label}">
      ${art(sticker.id)}<span class="name">${name}</span>${settings.option === 'search' ? `<span class="star ${found ? 'on' : ''}" aria-hidden="true">${found ? '★' : '☆'}</span>` : ''}</button>`
  }).join('')}</div>`
}

function poster() {
  const placed = (id: StickerId) => book.placed.includes(id)
  const dots = STICKERS.filter(sticker => sticker.path !== null && sticker.path > 0 && placed(sticker.id)).map(sticker => {
    const angle = posterAngle[sticker.id]! * Math.PI / 180, radius = pathRadius(sticker.path!)
    const x = 200 + Math.cos(angle) * radius, y = 200 - Math.sin(angle) * radius
    return `<g class="placed ${fresh.some(item => item.id === sticker.id) ? 'new' : ''}"><circle cx="${x}" cy="${y}" r="${artSize[sticker.group]}" fill="${hex(sticker.color)}"/>${sticker.id === 'saturn' ? `<ellipse cx="${x}" cy="${y}" rx="17" ry="5" transform="rotate(-20 ${x} ${y})" class="poster-ring"/>` : ''}<text x="${x}" y="${y + artSize[sticker.group] + 11}">${stickerName(sticker.id, settings.lang)}</text></g>`
  }).join('')
  const paths = Array.from({ length: 10 }, (_, path) => path).map(path => {
    const hint = selectedTray && (misses.get(selectedTray) ?? 0) >= 2 && stickerById(selectedTray).path === path
    const name = path === 0 ? UI[settings.lang].middle : path === 5 ? UI[settings.lang].belt : UI[settings.lang].path(path)
    return path === 0
      ? `<circle class="sun-spot ${placed('sun') ? 'lit' : ''} ${hint ? 'hint' : ''}" cx="200" cy="200" r="${pathRadius(0)}" data-path="0" role="button" tabindex="0" aria-label="${name}"/>`
      : `<circle class="path-line ${path === 5 ? 'belt' : ''} ${hint ? 'hint' : ''}" cx="200" cy="200" r="${pathRadius(path)}"/><circle class="path-hit" cx="200" cy="200" r="${pathRadius(path)}" data-path="${path}" role="button" tabindex="0" aria-label="${name}"/>`
  }).join('')
  const tray = STICKERS.filter(sticker => book.arrived.includes(sticker.id) && !placed(sticker.id))
  return `<div class="poster"><svg viewBox="0 0 400 400" aria-label="${UI[settings.lang].poster}">${paths}${dots}
      ${placed('fairy') ? '<g class="placed wander"><circle cx="360" cy="42" r="10" fill="#f3acd1"/><text x="360" y="64">' + stickerName('fairy', settings.lang) + '</text></g>' : ''}</svg>
    <div class="tray" aria-label="${UI[settings.lang].tray}">${tray.length ? tray.map(sticker => `<button type="button" data-tray="${sticker.id}" aria-pressed="${selectedTray === sticker.id}" class="${fresh.some(item => item.id === sticker.id) ? 'new' : ''}">${art(sticker.id)}<span>${stickerName(sticker.id, settings.lang)}</span></button>`).join('')
      : `<p>${book.placed.length === STICKERS.length ? UI[settings.lang].trayDone : UI[settings.lang].trayEmpty}</p>`}</div></div>`
}

function render() {
  const option = settings.option, now = progress(option, book)
  const letter = OPTIONS[option].letter, name = OPTIONS[option].name
  all<HTMLButtonElement>('[data-option]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === option)))
  all<HTMLButtonElement>('[data-world]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.world === settings.world))
    button.classList.toggle('has', book.arrived.includes(button.dataset.world as StickerId))
  })
  all<HTMLElement>('[data-card]').forEach(card => card.classList.toggle('selected', card.dataset.card === option))
  element('#mode-label').textContent = `OPTION ${letter} · ${name.toUpperCase()}`
  element('#option-title').textContent = `${letter} · ${name}`
  element('#option-line').textContent = about[option].line
  const world = stickerById(settings.world)
  element('#arrive').textContent = `Arrive at ${world.name}`
  element('#search').textContent = world.search.task.replace(/\.$/, '')
  element<HTMLButtonElement>('#search').hidden = option !== 'search'
  element('#finder-note').textContent = option === 'search' ? 'In the game, flight earns these. A search also counts as an arrival.' : 'In the game, the arrival comes from flight. No button is needed.'

  element('#dots').innerHTML = Array.from({ length: now.total }, (_, i) => `<i class="${i < now.earned ? 'on' : ''} ${option === 'poster' && i < now.placed ? 'placed' : ''} ${(i + 1) % MILESTONE === 0 ? 'milestone' : ''}"></i>`).join('')
  const ui = UI[settings.lang]
  all<HTMLButtonElement>('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === settings.lang)))
  element('#book').lang = LANGS[settings.lang].speech
  element('#book-title').textContent = ui.title
  element('#dots').setAttribute('aria-label', ui.count(now.earned, now.total))
  element('#count').textContent = `${ui.count(now.earned, now.total)}${option === 'poster' ? ui.onPoster(now.placed) : ''}`
  element('#book-page').innerHTML = option === 'poster' ? poster() : slots()
  element('#book').classList.toggle('no-words', !settings.words)
  element('#word-rows').innerHTML = STICKERS.map(sticker => `<tr><th scope="row">${art(sticker.id)}<span><b>${stickerName(sticker.id, settings.lang)}</b><small>${GROUP_NAMES[sticker.group]} · arrive within ${arrivalDistance(sticker)} m</small></span></th>
    <td><button type="button" class="hear" data-hear="${sticker.id}" aria-label="Hear the ${sticker.name} fact">🔈</button> ${stickerFact(sticker.id, settings.lang)}</td><td>${stickerTask(sticker.id, settings.lang)}</td><td><span class="check-tag ${sticker.search.check}">${sticker.search.check}</span> ${sticker.search.rule}</td></tr>`).join('')
  const next = suggestNext(book, lastWorld)
  element<HTMLButtonElement>('#next-hint').hidden = !next
  if (next) {
    element('#next-hint').innerHTML = `${art(next.id)}<span>${ui.next(stickerName(next.id, settings.lang))}</span>`
    element('#next-hint').dataset.next = next.id
  }

  element<HTMLInputElement>('#voice').checked = settings.voice
  element<HTMLInputElement>('#chime').checked = settings.chime
  element<HTMLInputElement>('#words').checked = settings.words
  element<HTMLSelectElement>('#rate').value = settings.rate
  const price = cost(option)
  element('#c-stickers').textContent = String(price.stickers)
  element('#c-lines').textContent = String(price.spokenLines)
  element('#c-checks').textContent = price.newChecks ? String(price.newChecks) : 'None'
  element('#c-bytes').textContent = `${price.savedBytes} bytes`
  element('#c-screens').textContent = String(price.screens)
  element('#save-status').textContent = storageAvailable ? 'This study saves its book in this browser, apart from the game.' : 'Browser storage is unavailable. The book resets when you leave.'
}

// The book page is rebuilt on each render, so one listener handles its buttons.
element('#book').addEventListener('click', event => {
  const target = event.target as Element
  const slot = target.closest<HTMLElement>('[data-slot]'), tray = target.closest<HTMLElement>('[data-tray]'), path = target.closest<SVGElement>('[data-path]')
  if (slot) {
    const sticker = stickerById(slot.dataset.slot as StickerId)
    if (book.arrived.includes(sticker.id)) say(`hello-${sticker.id}`, ...(settings.option === 'search' && !book.found.includes(sticker.id) ? [`task-${sticker.id}`] : []))
    else { settings.world = sticker.id; render(); say(`fly-${sticker.id}`) }
  } else if (tray) {
    selectedTray = tray.dataset.tray as StickerId
    render()
    say(`where-${selectedTray}`)
  } else if (path) {
    if (!selectedTray) { say('pick-first'); return }
    const id = selectedTray, result = place(book, id, Number(path.dataset.path))
    if (result.result === 'placed' || result.result === 'anywhere') {
      book = result.book; selectedTray = null; misses.delete(id); save()
      fresh = [{ id, kind: 'hello' }]; render(); fresh = []
      chime(progress('poster', book).complete ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 783.99])
      say(`placed-${id}`, ...(progress('poster', book).complete ? ['poster-full'] : []))
    } else {
      misses.set(id, (misses.get(id) ?? 0) + 1)
      render()
      say(`${result.result}-${id}`)
    }
  } else if (target.closest('#next-hint')) {
    const next = stickerById(element('#next-hint').dataset.next as StickerId)
    settings.world = next.id; render()
    say(`waiting-${next.id}`)
  }
})
element('#book').addEventListener('keydown', event => {
  const path = (event.target as Element).closest?.('[data-path]')
  if (path && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); path.dispatchEvent(new MouseEvent('click', { bubbles: true })) }
})

all<HTMLButtonElement>('[data-option]').forEach(button => button.addEventListener('click', () => { settings.option = button.dataset.option as BookOption; selectedTray = null; render() }))
all<HTMLButtonElement>('[data-show]').forEach(button => button.addEventListener('click', () => {
  settings.option = button.dataset.show as BookOption; selectedTray = null; render()
  element('#book').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
}))
all<HTMLButtonElement>('[data-world]').forEach(button => button.addEventListener('click', () => { settings.world = button.dataset.world as StickerId; render() }))
// The words table is rebuilt on each render, so one listener handles its speaker buttons.
element('#word-rows').addEventListener('click', event => { const button = (event.target as Element).closest<HTMLElement>('[data-hear]'); if (button) say(`hello-${button.dataset.hear}`) })
all<HTMLButtonElement>('[data-lang]').forEach(button => button.addEventListener('click', () => {
  settings.lang = button.dataset.lang as Lang
  stopVoice(); speakerOptions(); render(); voiceStatus(); say('start')
}))
element('#arrive').addEventListener('click', () => earn(arrive(book, settings.world)))
element('#search').addEventListener('click', () => earn(find(book, settings.world, settings.option)))
element('#fill').addEventListener('click', () => {
  const every = STICKERS.map(sticker => sticker.id)
  book = { arrived: every, found: every, placed: settings.option === 'poster' ? every.filter((_, i) => i % 2 === 0) : book.placed }
  selectedTray = null; save(); render(); say('review')
})
element('#empty').addEventListener('click', () => { book = emptyBook(); selectedTray = null; misses.clear(); lastWorld = 'earth'; save(); render(); say('empty') })
element<HTMLInputElement>('#voice').addEventListener('change', event => { settings.voice = (event.target as HTMLInputElement).checked; if (!settings.voice) stopVoice(); render() })
element<HTMLInputElement>('#chime').addEventListener('change', event => { settings.chime = (event.target as HTMLInputElement).checked; render() })
element<HTMLInputElement>('#words').addEventListener('change', event => { settings.words = (event.target as HTMLInputElement).checked; render() })
element<HTMLSelectElement>('#rate').addEventListener('change', event => { settings.rate = (event.target as HTMLSelectElement).value as Settings['rate']; render() })
element<HTMLSelectElement>('#speaker').addEventListener('change', event => { settings.speaker = (event.target as HTMLSelectElement).value; stopVoice(); voiceStatus(); say(`hello-${settings.world}`) })
document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice() })

// The recordings are optional: without them, the browser voice speaks.
/** The recorded voices of the book language, then the browser voice. */
function speakerOptions() {
  const voices = recordings(), ids = Object.keys(voices)
  if (!ids.includes(settings.speaker)) settings.speaker = ids.includes('af_heart') ? 'af_heart' : ids[0] ?? 'browser'
  element('#speaker').innerHTML = [...ids.map(id => `<option value="${id}">Recorded · ${voices[id]!.name} (${voices[id]!.accent})</option>`), '<option value="browser">Browser voice · differs on each device</option>'].join('')
  element<HTMLSelectElement>('#speaker').value = settings.speaker
}
const voicesReady = fetch('/voice/manifest.json').then(response => response.ok ? response.json() as Promise<Manifest> : null).catch(() => null).then(data => {
  manifest = data
  speakerOptions()
  voiceStatus()
})

element('#export').addEventListener('click', () => {
  const payload = {
    study: 'sticker-book', version: 1, status: 'proposal-only', settings, book, progress: progress(settings.option, book),
    options: Object.fromEntries(options.map(option => [option, { ...OPTIONS[option], ...cost(option) }])),
    stickers: STICKERS.map(sticker => ({ ...sticker, color: hex(sticker.color), arrivalDistance: arrivalDistance(sticker) })),
    recommendation: 'B in two steps: A (book, voice, hello stickers), then the search stars one world at a time. C later, as a calm activity.',
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'sticker-book-study.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

render()
voiceStatus()
// Browsers speak only after a tap, so the first line is a caption only.
element('#caption').textContent = text(settings.lang, 'start')

// Read-only diagnostics for the smoke test.
Object.defineProperty(window, '__stickerStudy', { value: { settings: () => ({ ...settings }), book: () => structuredClone(book), messages: () => [...messages], played: () => [...played], stale: staleKeys, lines: () => Object.keys(LINES[settings.lang]), player: () => ({ src: player.src, paused: player.paused, ended: player.ended, time: player.currentTime, duration: player.duration, error: player.error?.code ?? null, queue: [...queue] }), ready: () => voicesReady.then(() => true) } })
