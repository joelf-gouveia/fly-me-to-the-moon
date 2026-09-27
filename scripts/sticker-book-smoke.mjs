// Checks the sticker book in the real game: no sticker at the start, the book
// (flight waits), the empty-space notes and "Fly there", a guided trip that earns
// the Mars sticker, the Earth sticker after a return from space, the marks in
// Worlds, the saved book, no sticker for an old home discovery, and the phone menu. Run against the dev server on port 5174:
//   node scripts/sticker-book-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'sticker-book-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try {
      const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]
      tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break
    } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a book error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  async function load(mobile, width = 390) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough for a guided flight.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#stickers-toggle")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir('artifacts.local/sticker-book', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/sticker-book/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  step('desktop'); await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  let state = await snapshot()
  assert(state.stickers.length === 0, `A new player already has stickers: ${state.stickers}`)
  // The fairy starts on Earth: no sticker until she flies out to space and comes back.
  await click('#begin-button')
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.stickers.length === 0 && await evaluate('document.querySelector("#sticker-toast").hidden'), `The start gives a sticker: ${state.stickers}`)

  // The book: flight waits, the next empty space, and the notes.
  await click('#stickers-toggle')
  // The planets still orbit behind the book, as behind Worlds, so the flight clock shows the wait.
  const before = (await snapshot()).elapsed
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.bookOpen && await evaluate('document.querySelector("#sticker-book").open'), 'The book does not open')
  assert(state.elapsed === before, `The flight clock runs while the book is open: ${before} to ${state.elapsed}`)
  assert((await text('#sticker-count')) === '0 of 13 stickers', `Wrong count: ${await text('#sticker-count')}`)
  assert((await text('#sticker-note-text')).startsWith('Next: the Moon is waiting.') && await evaluate('!document.querySelector("#sticker-fly").hidden'), `Wrong Next note: ${await text('#sticker-note-text')}`)
  await screenshot('book')
  await click('[data-sticker="earth"]')
  assert((await text('#sticker-note-text')) === 'Fly out to space, then come back to Earth to get this sticker.' && await evaluate('document.querySelector("#sticker-fly").hidden'), `Wrong Earth note: ${await text('#sticker-note-text')}`)
  await click('[data-sticker="mars"]')
  assert((await text('#sticker-note-text')) === 'Fly to Mars to get this sticker.', `Wrong empty-space note: ${await text('#sticker-note-text')}`)

  step('Fly there: Mars')
  await click('#sticker-fly')
  state = await snapshot()
  assert(!state.bookOpen && !(await evaluate('document.querySelector("#sticker-book").open')), '"Fly there" does not close the book')
  for (let tick = 0; tick < 300 && !state.stickers.includes('mars'); tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
    if (tick % 40 === 0) step(`${state.belt.nearest} · ${state.stickers.join(', ')}`)
  }
  assert(state.stickers.includes('mars') && !state.stickers.includes('earth'), `The guided flight does not earn the Mars sticker alone: ${state.stickers}`)
  assert((await text('#sticker-toast h2')) === 'Mars', 'No note for the Mars sticker')
  // The stubbed frame clock holds CSS animations at their start, so the screenshot skips the entry animation.
  await evaluate('document.querySelector("#sticker-toast").style.animation = "none"')
  await screenshot('mars-note')

  step('back to Earth')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  await click('[data-world="earth"]')
  for (let tick = 0; tick < 300 && !state.stickers.includes('earth'); tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
  }
  assert(state.stickers.includes('earth'), `The return to Earth does not earn its sticker: ${state.stickers}`)
  assert((await text('#sticker-toast h2')) === 'Earth' && (await text('#sticker-toast p')).startsWith('Earth is our home.'), 'No note for the Earth sticker')
  await evaluate('document.querySelector("#sticker-toast").style.animation = "none"')
  await screenshot('earth-note')

  // Worlds marks each world that has a sticker.
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  const marks = await evaluate('[...document.querySelectorAll(".world-picture.has-sticker")].map(b => b.dataset.world)')
  assert(marks.includes('earth') && marks.includes('mars') && !marks.includes('saturn'), `Wrong marks in Worlds: ${marks}`)
  await screenshot('worlds-marks')
  await click('#close-map')

  // The book is saved. A home found before the book gives no sticker: every player visits.
  const saved = state.stickers
  await load(false)
  state = await snapshot()
  assert(JSON.stringify(state.stickers) === JSON.stringify(saved), `The book differs after a reload: ${state.stickers}`)
  await evaluate('localStorage.removeItem("fairy-sticker-book"); localStorage.setItem("fairy-home-found", "true")')
  await load(false)
  state = await snapshot()
  assert(state.stickers.length === 0, `A found home gives a sticker without a visit: ${state.stickers}`)

  for (const width of [390, 320]) {
    step(`phone ${width}`); await load(true, width)
    await click('#begin-button')
    await evaluate('advanceFlight(1)')
    await click('#menu-toggle')
    assert(await evaluate('!!document.querySelector(".menu-actions #stickers-toggle")') && (await text('#stickers-toggle .mobile-action-label')) === 'Stickers', 'The phone menu has no Stickers button')
    await click('#stickers-toggle')
    await evaluate('advanceFlight(0.2)')
    state = await snapshot()
    assert(state.bookOpen && !state.menuOpen, 'The Stickers button does not swap the menu for the book')
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
    assert(await evaluate('(() => { const d = document.querySelector("#sticker-book").getBoundingClientRect(); return d.left >= 0 && d.right <= innerWidth })()'), `The book is wider than the screen at ${width}px`)
    const smallest = await evaluate('Math.min(...[...document.querySelectorAll("#sticker-book button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(smallest >= 44, `A book button is smaller than 44 px at ${width}px: ${smallest}`)
    await screenshot(`book-${width}`)
  }

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified no sticker at the start, the book (flight waits, counts, notes), "Fly there" and the Mars sticker, the Earth sticker after a return (${saved.join(', ')}), the marks in Worlds, the saved book, no sticker for an old home discovery, and the 390/320 px phone menu. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
