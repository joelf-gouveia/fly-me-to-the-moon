import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
const profile = await mkdtemp(join(tmpdir(), 'sticker-book-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      clearTimeout(handler?.timer)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const key = ++id
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 20000)
      pending.set(key, { resolve, reject, timer })
      ws.send(JSON.stringify({ id: key, method, params }))
    })
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).textContent`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const book = () => evaluate('window.__stickerStudy.book()')
  // The line that the page shows and says, with the recorded or the browser voice.
  const lastSpoken = () => evaluate('window.__stickerStudy.messages().at(-1) ?? ""')
  const played = () => evaluate('window.__stickerStudy.played()')
  const voiceCount = () => evaluate('window.__spoken.length + window.__stickerStudy.played().length')
  async function waitFor(expression, message, ms = 15000) {
    for (let waited = 0; waited < ms; waited += 250) { if (await evaluate(expression)) return; await delay(250) }
    throw new Error(message)
  }
  // Record what the browser voice says: headless browsers have no voices.
  const stubVoice = () => evaluate('window.__spoken = []; window.__spokenLang = []; speechSynthesis.speak = line => { window.__spoken.push(line.text); window.__spokenLang.push(line.lang) }; true')
  async function open() {
    await send('Page.navigate', { url: `${origin}/studies/sticker-book-study.html` })
    for (let i = 0; i < 80; i++) {
      if (await evaluate('!!window.__stickerStudy').catch(() => false)) break
      await delay(250)
    }
    await evaluate('window.__stickerStudy.ready()')
    await stubVoice()
  }
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await open()
  await evaluate('localStorage.removeItem("fairy-sticker-book-study-v1")')
  await open()
  await mkdir('artifacts.local/sticker-book-study', { recursive: true })
  async function capture(name, wait = 500) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/sticker-book-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  // Option B is the default: 12 hello stickers and 12 search stars.
  assert(await evaluate('window.__stickerStudy.settings().option') === 'search', 'Option B is not the default')
  assert((await text('#count')).startsWith('0 of 26'), `Empty book count is wrong: ${await text('#count')}`)
  assert(await evaluate('document.querySelectorAll(".slot.empty").length') === 13, 'The book does not have thirteen empty spaces')
  await capture('book-empty')

  // Recorded voices: in each language, every voice has every line, and each file is audio.
  const manifest = await evaluate('fetch("/voice/manifest.json").then(r => r.ok ? r.json() : null)')
  const langs = ['en', 'pt']
  const chooseVoice = voice => evaluate(`(() => { const s = document.querySelector('#speaker'); s.value = ${JSON.stringify(voice)}; s.dispatchEvent(new Event('change')); return true })()`)
  const chooseLang = lang => click(`[data-lang="${lang}"]`)
  let recordings = 0
  for (const lang of langs) {
    const voices = Object.keys(manifest?.languages?.[lang]?.voices ?? {})
    assert(voices.length, `No recorded ${lang} voice. Run node studies/sticker-book-study/sticker-voice.mjs`)
    await chooseLang(lang)
    assert(await evaluate('window.__stickerStudy.settings().speaker') === (voices.includes('af_heart') ? 'af_heart' : voices[0]), `The ${lang} book does not start with the recorded voice`)
    for (const voice of voices) {
      await chooseVoice(voice)
      const stale = await evaluate('window.__stickerStudy.stale()')
      assert(stale.length === 0, `${lang}/${voice} has ${stale.length} lines to record again, for example ${stale.slice(0, 3)}`)
      const clip = await evaluate(`(async () => { const r = await fetch('/voice/${lang}/${voice}/hello-mars.mp3'); const b = await new AudioContext().decodeAudioData(await r.arrayBuffer()); return { type: r.headers.get('content-type'), seconds: b.duration } })()`)
      assert(clip.type.includes('audio/mpeg') && clip.seconds > 2 && clip.seconds < 9, `${lang}/${voice} Mars clip is not valid: ${JSON.stringify(clip)}`)
      // A missing file comes back as the HTML page, so the type shows it.
      const missing = await evaluate(`(async () => { const out = []; for (const k of window.__stickerStudy.lines()) { const r = await fetch('/voice/${lang}/${voice}/' + k + '.mp3', { method: 'HEAD' }); if (!(r.headers.get('content-type') || '').includes('audio')) out.push(k) } return out })()`)
      assert(missing.length === 0, `Missing ${lang}/${voice} recordings: ${missing.slice(0, 5)}`)
      recordings++
    }
  }
  await chooseLang('en')
  const defaultVoice = await evaluate('window.__stickerStudy.settings().speaker')
  await stubVoice()
  await evaluate('document.querySelector("#empty").click()')

  await click('[data-world="mars"]'); await click('#arrive')
  assert((await book()).arrived.includes('mars'), 'Arrival does not earn the Mars sticker')
  assert((await lastSpoken()).includes('rusty'), `The voice does not say the Mars fact: ${await lastSpoken()}`)
  assert((await played()).at(-1) === 'hello-mars', 'The recorded Mars line does not play')
  assert(await evaluate('!document.querySelector("#cheer").hidden && document.querySelector(".slot[data-slot=mars]").classList.contains("earned")'), 'No celebration for the new sticker')
  await capture('book-cheer', 250)
  await click('#arrive')
  assert((await text('#caption')).includes('already have'), 'A second arrival earns again')

  await click('[data-world="ceres"]'); await click('#search')
  const afterSearch = await book()
  assert(afterSearch.arrived.includes('ceres') && afterSearch.found.includes('ceres'), 'A search does not earn the hello sticker and the star')
  assert((await lastSpoken()).includes('salt spots'), 'The voice does not say the search result')
  assert(await evaluate('document.querySelector(".slot[data-slot=ceres] .star.on") !== null'), 'The Ceres star does not show')
  // Two recorded lines play one after the other.
  await waitFor('window.__stickerStudy.played().at(-1) === "found-ceres"', 'The second recorded line does not play after the first')
    .catch(async error => { throw new Error(`${error.message}: ${JSON.stringify(await evaluate('({ played: window.__stickerStudy.played().slice(-3), spoken: window.__spoken, player: window.__stickerStudy.player() })'))}`) })
  assert((await played()).slice(-2).join() === 'hello-ceres,found-ceres', `Wrong order: ${(await played()).slice(-2)}`)
  // A clip that a new line stops must not send the new line to the browser voice.
  assert(await evaluate('window.__spoken.length') === 0, `The browser voice spoke while recordings exist: ${await evaluate('window.__spoken')}`)
  await click('[data-world="venus"]'); await click('#arrive')
  assert(await evaluate('document.querySelector("#cheer").classList.contains("milestone")'), 'The fourth sticker has no milestone celebration')
  assert((await lastSpoken()).includes('Four stickers'), 'The milestone is not spoken')
  await capture('book-milestone', 400)

  // An empty space tells the child where to fly, and selects that world.
  await click('.slot[data-slot="saturn"]')
  assert((await text('#caption')).includes('Fly to Saturn') && await evaluate('window.__stickerStudy.settings().world') === 'saturn', 'An empty space does not point to its world')
  await click('#next-hint')
  assert((await text('#caption')).includes('is waiting'), 'The Next hint does not speak')

  await click('[data-option="stamps"]')
  assert(await evaluate('document.querySelector("#search").hidden'), 'Option A shows the search button')
  assert((await text('#count')).startsWith('3 of 13'), `Option A count is wrong: ${await text('#count')}`)

  // Option C: a wrong path gives a hint. The sticker stays in the tray.
  await click('[data-option="poster"]')
  assert(await evaluate('document.querySelectorAll("[data-tray]").length') === 3, 'The tray does not hold the three stickers')
  await click('[data-tray="mars"]')
  await evaluate('document.querySelector("[data-path=\'7\']").dispatchEvent(new MouseEvent("click", { bubbles: true }))')
  assert((await lastSpoken()).includes('closer to the Sun'), `No hint for a path too far out: ${await lastSpoken()}`)
  await evaluate('document.querySelector("[data-path=\'2\']").dispatchEvent(new MouseEvent("click", { bubbles: true }))')
  assert((await lastSpoken()).includes('further from the Sun'), 'No hint for a path too far in')
  assert(await evaluate('document.querySelector(".path-line.hint") !== null'), 'The correct path does not glow after two tries')
  assert(await evaluate('document.querySelector("[data-tray=mars]") !== null'), 'A wrong path takes the sticker away')
  await capture('poster-hint', 300)
  await evaluate('document.querySelector("[data-path=\'4\']").dispatchEvent(new MouseEvent("click", { bubbles: true }))')
  assert((await lastSpoken()).includes('fourth planet') && (await book()).placed.includes('mars'), 'Mars is not placed on path 4')
  // The Moon shares Earth's path.
  await click('[data-world="moon"]'); await click('#arrive')
  assert((await lastSpoken()).includes('People have walked on it'), `The Moon fact is wrong: ${await lastSpoken()}`)
  await click('[data-tray="moon"]')
  await evaluate('document.querySelector("[data-path=\'3\']").dispatchEvent(new MouseEvent("click", { bubbles: true }))')
  assert((await lastSpoken()).startsWith('Yes! The Moon goes around Earth.') && (await book()).placed.includes('moon'), 'The Moon is not placed on the path of Earth')
  await click('[data-world="fairy"]'); await click('#arrive')
  await click('[data-tray="fairy"]')
  await evaluate('document.querySelector("[data-path=\'1\']").dispatchEvent(new MouseEvent("click", { bubbles: true }))')
  assert((await lastSpoken()).includes('wanders'), 'Blossom Haven does not go anywhere')
  await evaluate('document.querySelector("[data-tray]").focus(); document.querySelector("[data-tray]").click(); document.querySelector("[data-path=\'0\']").focus()')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  assert((await text('#caption')).length > 0 && await voiceCount() > 0, 'The keyboard does not reach the poster paths')
  await capture('poster', 700)

  // Voice off: the words still show. Words off: the book works by voice only.
  const before = await voiceCount()
  await evaluate('document.querySelector("#voice").click()')
  await evaluate('document.querySelector("[data-hear=neptune]").click()')
  assert(await voiceCount() === before && (await text('#caption')).includes('fastest winds'), 'Voice off does not stop the voice, or hides the words')
  await evaluate('document.querySelector("#voice").click()')
  await evaluate('document.querySelector("[data-hear=neptune]").click()')
  assert((await played()).at(-1) === 'hello-neptune', 'The speaker button in the table does not speak')
  // The browser voice speaks when it is selected.
  await chooseVoice('browser')
  await evaluate('document.querySelector("[data-hear=jupiter]").click()')
  assert((await evaluate('window.__spoken.at(-1)') ?? '').includes('biggest planet'), 'The browser voice does not speak')
  await chooseVoice(defaultVoice)
  await evaluate('document.querySelector("#words").click()')
  assert(await evaluate('document.querySelector("#book").classList.contains("no-words")'), 'Show the words does not hide the words')
  await evaluate('document.querySelector("#words").click()')

  // The book survives a reload.
  const saved = await book()
  await open()
  const reloaded = await book()
  assert(JSON.stringify(saved) === JSON.stringify(reloaded), `The book differs after a reload: ${JSON.stringify(reloaded)}`)

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && exported.stickers.length === 13 && Object.keys(exported.options).length === 3 && exported.book.arrived.length === reloaded.arrived.length, 'Export differs from the book')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Occator"); })()')
  assert(docWorks, 'Technical study link unavailable')

  // European Portuguese: the child's view, the recorded lines and the browser voice.
  await chooseLang('pt')
  assert(await text('#book-title') === 'Os meus autocolantes do espaço' && await evaluate('document.querySelector("#book").lang') === 'pt-PT', 'The book is not in Portuguese')
  assert((await text('#count')).includes('autocolantes') && (await text('.slot[data-slot="uranus"] .name')) === 'Úrano', 'The Portuguese names or count do not show')
  await click('#empty')
  await click('[data-world="earth"]'); await click('#arrive')
  assert((await lastSpoken()).startsWith('Terra! A Terra é a nossa casa.'), `The Portuguese Earth line is wrong: ${await lastSpoken()}`)
  assert(await evaluate('window.__stickerStudy.player().src.includes("/voice/pt/af_heart/hello-earth.mp3")'), 'The Portuguese recording does not play')
  assert(await text('#cheer-kicker') === 'NOVO AUTOCOLANTE', 'The celebration is not in Portuguese')
  await capture('pt-cheer', 300)
  await click('.slot[data-slot="sun"]')
  assert((await lastSpoken()) === 'Voa até ao Sol para ganhares este autocolante.', `Wrong contraction: ${await lastSpoken()}`)
  await evaluate('document.querySelector("[data-hear=uranus]").click()')
  assert((await text('#word-rows')).includes('Úrano é o planeta mais frio de todos.'), 'The words table is not in Portuguese')
  await chooseVoice('browser')
  await evaluate('document.querySelector("[data-hear=jupiter]").click()')
  assert((await evaluate('window.__spoken.at(-1)') ?? '').startsWith('Júpiter!') && await evaluate('window.__spokenLang.at(-1)') === 'pt-PT', 'The browser voice does not speak European Portuguese')
  await chooseVoice('af_heart')
  await click('[data-option="poster"]')
  await click('[data-tray="earth"]')
  await evaluate('document.querySelector("[data-path=\'5\']").dispatchEvent(new MouseEvent("click", { bubbles: true }))')
  assert((await lastSpoken()) === 'A Terra vive mais perto do Sol. Experimenta um caminho mais pequeno.', `Wrong Portuguese hint: ${await lastSpoken()}`)
  await click('#fill')
  await capture('pt-poster', 800)
  await click('[data-option="search"]'); await click('#fill')
  await capture('pt-full-search', 800)
  await chooseLang('en')
  assert(await text('#book-title') === 'My space stickers', 'The book does not return to English')

  await click('#fill')
  await capture('full-search', 800)
  await click('[data-option="poster"]'); await click('#fill')
  await capture('full-poster', 800)
  await evaluate('document.querySelector(".words").scrollIntoView()')
  await capture('words', 400)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await click('[data-option="search"]')
    await evaluate('window.scrollTo(0, 0)')
    await capture(`mobile-${width}`, 600)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
    const small = await evaluate('Math.min(...[...document.querySelectorAll("#book button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(small >= 36, `A book button is smaller than 36 px at ${width}px: ${small}`)
  }
  await evaluate('localStorage.removeItem("fairy-sticker-book-study-v1")')
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified ${recordings} recordings in English and European Portuguese (every line, audio type, order), the Portuguese book, contractions and hints, browser voice, arrival and search stickers, voice lines, milestone, empty-space and Next hints, option A, poster hints, glow, placement and keyboard, voice and words toggles, reload, export, study link, and 390/320px layouts. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
