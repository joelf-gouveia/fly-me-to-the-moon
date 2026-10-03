// Checks the sticker book in the real game, in Worlds: no sticker at the start, the book
// (flight waits), the next door and the locks, the mystery map, a guided trip that earns
// the Moon sticker and opens Venus, the Earth sticker after a return from space, the saved
// book, no sticker for an old home discovery, and the phone layout. Run against the dev server on port 5174:
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
  const count = selector => evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`)
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
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#open-map")').catch(() => false)) return
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

  // The book of worlds (option D of docs/world-book-study.md): flight waits, the count, the next door, and the notes.
  const has = (selector, name) => evaluate(`document.querySelector(${JSON.stringify(selector)}).classList.contains(${JSON.stringify(name)})`)
  const flyHidden = () => evaluate('document.querySelector("#world-fly").hidden')
  await click('#open-map')
  // The planets still orbit behind Worlds, so the flight clock shows the wait.
  const before = (await snapshot()).elapsed
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.mapOpen && await evaluate('document.querySelector("#world-map").open'), 'Worlds does not open')
  assert(state.elapsed === before, `The flight clock runs while Worlds is open: ${before} to ${state.elapsed}`)
  assert((await text('#sticker-count')) === '0 of 13 stickers' && (await text('#open-map .world-count')) === '0/13', `Wrong count: ${await text('#sticker-count')}`)
  assert(await count('.book-card') === 13 && !(await evaluate('!!document.querySelector("#stickers-toggle, #sticker-book")')), 'The book is not one dialog of 13 cards')
  assert(state.openWorlds.join() === 'earth,moon,fairy', `Wrong open worlds at the start: ${state.openWorlds}`)
  assert((await text('#world-note-text')).startsWith('Next: a mystery world is waiting.') && !(await flyHidden()), `Wrong Next note: ${await text('#world-note-text')}`)
  assert(await has('[data-world="moon"]', 'is-mystery-open') && await has('[data-world="mars"]', 'is-mystery-closed') && await has('[data-world="sun"]', 'is-closed'), 'Wrong card states at the start')
  assert((await text('[data-orbit-marker="mars"] text')) === '?' && await evaluate('document.querySelector(\'[data-orbit="mars"]\').classList.contains("is-mystery")'), 'The map names a mystery world')
  await screenshot('book')
  await click('[data-world="earth"]')
  assert((await text('#world-note-text')) === 'Fly out to space, then come back to Earth to get this sticker.' && await flyHidden(), `Wrong Earth note: ${await text('#world-note-text')}`)
  await click('[data-world="mars"]')
  assert((await text('#world-note-text')).startsWith('This world opens later.') && await flyHidden(), `Mars is open: ${await text('#world-note-text')}`)

  step('Fly there: the Moon')
  await click('[data-world="moon"]')
  await click('#world-fly')
  state = await snapshot()
  assert(!state.mapOpen && state.destination === 'Moon', '"Fly there" does not start the flight to the Moon')
  for (let tick = 0; tick < 300 && !state.stickers.includes('moon'); tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
    if (tick % 40 === 0) step(`${state.belt.nearest} · ${state.stickers.join(', ')}`)
  }
  assert(state.stickers.join() === 'moon', `The guided flight does not earn the Moon sticker alone: ${state.stickers}`)
  assert((await text('#sticker-toast h2')) === 'Moon' && (await text('#sticker-toast .sticker-toast-next')) === 'A new world is waiting in Worlds!', 'No note for the Moon sticker')
  assert(state.openWorlds.join() === 'venus,earth,moon,fairy', `The Moon does not open Venus: ${state.openWorlds}`)
  // The stubbed frame clock holds CSS animations at their start, so the screenshot skips the entry animation.
  await evaluate('document.querySelector("#sticker-toast").style.animation = "none"')
  await screenshot('moon-note')

  step('back to Earth')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  assert(await has('[data-world="moon"]', 'is-sticker') && await has('[data-world="venus"]', 'is-mystery-open') && (await text('[data-orbit-marker="moon"] text')) === 'Moon', 'The book and the map do not show the Moon')
  await screenshot('book-moon')
  await click('[data-world="earth"]')
  assert((await text('#world-note-text')) === 'Fly back home to Earth to get its sticker.' && !(await flyHidden()), `Wrong Earth note after the Moon: ${await text('#world-note-text')}`)
  await click('#world-fly')
  for (let tick = 0; tick < 300 && !state.stickers.includes('earth'); tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
  }
  assert(state.stickers.includes('earth'), `The return to Earth does not earn its sticker: ${state.stickers}`)
  assert((await text('#sticker-toast h2')) === 'Earth' && (await text('#sticker-toast p')).startsWith('Earth is our home.'), 'No note for the Earth sticker')
  await evaluate('document.querySelector("#sticker-toast").style.animation = "none"')
  await screenshot('earth-note')

  // The book is saved, and so are the open worlds. A home found before the book gives no sticker: every player visits.
  const saved = state.stickers
  await load(false)
  state = await snapshot()
  assert(JSON.stringify(state.stickers) === JSON.stringify(saved) && state.openWorlds.includes('venus') && !state.openWorlds.includes('mars'), `The book differs after a reload: ${state.stickers} / ${state.openWorlds}`)
  await evaluate('localStorage.removeItem("fairy-sticker-book"); localStorage.setItem("fairy-home-found", "true")')
  await load(false)
  state = await snapshot()
  assert(state.stickers.length === 0, `A found home gives a sticker without a visit: ${state.stickers}`)

  for (const width of [390, 320]) {
    step(`phone ${width}`); await load(true, width)
    await click('#begin-button')
    await evaluate('advanceFlight(1)')
    await click('#menu-toggle')
    assert(!(await evaluate('!!document.querySelector("#stickers-toggle")')), 'The phone menu still has a Stickers button')
    await click('#menu-close')
    assert((await text('.mobile-top #open-map .world-count')) === '0/13', 'The Worlds button at the top has no count')
    await click('#open-map')
    await evaluate('advanceFlight(0.2)')
    state = await snapshot()
    assert(state.mapOpen, 'Worlds does not open on a phone')
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
    assert(await evaluate('(() => { const d = document.querySelector("#world-map").getBoundingClientRect(); return d.left >= 0 && d.right <= innerWidth })()'), `Worlds is wider than the screen at ${width}px`)
    const smallest = await evaluate('Math.min(...[...document.querySelectorAll("#world-map button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(smallest >= 44, `A Worlds button is smaller than 44 px at ${width}px: ${smallest}`)
    await screenshot(`book-${width}`)
  }

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified no sticker at the start, the book in Worlds (flight waits, the count, the next door, the locks, the mystery map), "Fly there" and the Moon sticker that opens Venus, the Earth sticker after a return (${saved.join(', ')}), the saved book and open worlds, no sticker for an old home discovery, and the 390/320 px phone layout. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
