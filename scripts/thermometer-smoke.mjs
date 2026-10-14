// Checks the picture thermometer (F16) in the real game: no thermometer at the start, the
// thermometers in the cards of Worlds (none in a mystery card), the order of the levels, the
// arrival note after the sticker note, its time and its rule, and the phone layout.
// Run against the dev server on port 5174:
//   node scripts/thermometer-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'thermometer-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a game error.
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
  async function load(mobile, width = 390, desktop = [960, 600]) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough for a guided flight.
    } else await send('Emulation.setDeviceMetricsOverride', { width: desktop[0], height: desktop[1], deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#open-map")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir('artifacts.local/thermometer', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/thermometer/${name}.png`, Buffer.from(shot.data, 'base64'))
  }


  const ALL = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'vesta', 'ceres', 'jupiter', 'saturn', 'uranus', 'neptune', 'fairy']
  const fullBook = JSON.stringify({ arrived: ALL, found: ['venus'], placed: [] })
  const rect = selector => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null })()`)
  /** The thermometer in the card of a world, or null. */
  const meter = id => evaluate(`(() => {
    const card = document.querySelector('[data-world="${id}"]'), meter = card.querySelector('.warmth-meter')
    if (!meter) return null
    const c = card.getBoundingClientRect(), m = meter.getBoundingClientRect(), svg = meter.querySelector('svg'), s = svg.getBoundingClientRect()
    return { step: meter.dataset.warmth, word: meter.querySelector('b').textContent, level: Number(svg.style.getPropertyValue('--warmth-level')),
      height: meter.querySelector('.thermometer-level').getBoundingClientRect().height, bulb: s.width * 30 / 48,
      inside: m.left >= c.left && m.right <= c.right && m.top >= c.top && m.bottom <= c.bottom && s.left >= c.left && s.right <= c.right,
      line: getComputedStyle(svg).getPropertyValue('--warmth-line').trim(), colour: svg.style.getPropertyValue('--warmth-colour') }
  })()`)
  /** A close picture of one card of Worlds. */
  const cardShot = async (id, name) => {
    await evaluate(`document.querySelector('[data-world="${id}"]').scrollIntoView({ block: 'center' })`)
    const r = await rect(`[data-world="${id}"]`)
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: r.left - 8, y: r.top - 8, width: r.width + 16, height: r.height + 16, scale: 3 } })
    await writeFile(`artifacts.local/thermometer/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  /** The arrival note, and the parts of the screen that it covers. */
  const note = () => evaluate(`(() => {
    const note = document.querySelector('#warmth-note'), r = note.getBoundingClientRect()
    const hit = (selector, always = false) => [...document.querySelectorAll(selector)].some(element => { const b = element.getBoundingClientRect(); return b.width > 0 && (always || getComputedStyle(element).visibility !== 'hidden' && Number(getComputedStyle(element).opacity) > 0) && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top })
    return { hidden: note.hidden, leaving: note.classList.contains('is-leaving'), text: note.textContent, word: note.querySelector('b')?.textContent ?? null, step: note.querySelector('.warmth-meter')?.dataset.warmth ?? null,
      inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, width: r.width,
      // The "A new world to explore" note fades in and out, so its place counts also while it does not show.
      covers: ['.toolbar', '.flight-panel', '.mobile-top', '.touch-controls', '.touch-actions', '#sticker-toast', '#home-celebration', '#home-move-note', '.adventure-tools', '.destination'].filter(hit).concat(hit('#arrival-note', true) ? ['#arrival-note'] : []),
      rise: note.querySelector('.thermometer-level') ? getComputedStyle(note.querySelector('.thermometer-level')).animationName : null }
  })()`)
  const toastHidden = () => evaluate('document.querySelector("#sticker-toast").hidden')
  /** The sticker note uses the real clock: wait until it is gone. */
  const waitForToast = async () => { for (let i = 0; i < 48 && !(await toastHidden()); i++) await delay(250); assert(await toastHidden(), 'The sticker note does not go') }
  // The stubbed frame clock holds CSS animations and transitions at their start, so a screenshot skips them.
  const still = () => evaluate('document.querySelectorAll("#warmth-note, #warmth-note .thermometer-level, #sticker-toast").forEach(element => { element.style.animation = "none" }); document.querySelector("#arrival-note").style.transition = "none"')
  const openSpace = async () => {
    // A point far above the plane of the planets, away from each world.
    const sun = (await snapshot()).sun.position
    await evaluate(`__fairyTest.place([${sun[0]}, ${sun[1] + 9000}, ${sun[2]}], [${sun[0]}, ${sun[1] + 20000}, ${sun[2]}])`)
  }

  step('desktop: the start'); await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  await click('#begin-button')
  await evaluate('advanceFlight(2)')
  let state = await snapshot(), shown = await note()
  // The fairy starts on Earth: the start is no arrival, and the flight screen has no thermometer.
  assert(state.warmth.shown === null && state.warmth.pending === null && shown.hidden, `A thermometer shows at the start: ${JSON.stringify(state.warmth)}`)
  assert(await count('.game-shell .thermometer') === await count('#world-map .thermometer'), 'A thermometer is on the flight screen at the start')

  // Worlds with a new book: the known worlds have a thermometer, and a mystery has none.
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  assert(await count('#world-map .warmth-meter') === 3, `A new book does not have 3 thermometers: ${await count('#world-map .warmth-meter')}`)
  assert(await count('.is-mystery-open .thermometer, .is-mystery-closed .thermometer') === 0, 'A mystery world shows its thermometer')
  assert((await meter('moon')) === null && (await meter('mars')) === null && (await meter('venus')) === null, 'A closed mystery card shows its thermometer')
  const earth = await meter('earth'), sun = await meter('sun'), home = await meter('fairy')
  assert(earth.word === 'NICE' && home.word === 'NICE' && sun.word === 'HOT' && sun.step === 'hot', `Wrong words at the start: ${earth.word}, ${home.word}, ${sun.word}`)
  assert(sun.height > earth.height && sun.line !== '#603449', 'The Sun is not above Earth, or a dark card has the lines of a sticker card')
  await evaluate('document.querySelector(".book-cards").scrollIntoView({ block: "center" })')
  await screenshot('worlds-new-book')
  await cardShot('sun', 'card-sun-closed')
  await cardShot('moon', 'card-mystery')
  await cardShot('mars', 'card-mystery-closed')
  await click('#close-map')

  step('arrival at Venus: after the sticker note')
  await evaluate('__fairyTest.placeOver("venus", [0, 1, 0], 40)')
  await evaluate('advanceFlight(0.5)')
  state = await snapshot(); shown = await note()
  assert(state.stickers.includes('venus') && !(await toastHidden()), `No sticker note at Venus: ${state.stickers}`)
  assert(shown.hidden && state.warmth.shown === null && state.warmth.pending === 'venus', `The thermometer does not wait for the sticker note: ${JSON.stringify(state.warmth)}`)
  await still()
  await screenshot('arrival-venus-1-sticker-note')
  await waitForToast()
  await evaluate('advanceFlight(0.1)')
  state = await snapshot(); shown = await note()
  assert(state.warmth.shown === 'venus' && !shown.hidden && shown.word === 'HOT' && shown.step === 'hot' && shown.text.includes('Venus'), `No thermometer after the sticker note: ${JSON.stringify(shown)}`)
  assert(shown.inView && shown.covers.length === 0, `The note at Venus is over a part of the screen: ${shown.covers}`)
  assert(shown.rise === 'warmth-rise', `The level does not rise: ${shown.rise}`)
  // With reduced motion the level does not move.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  assert((await note()).rise === 'none' && await evaluate('getComputedStyle(document.querySelector("#warmth-note")).animationName') === 'none', 'The level moves with reduced motion')
  await send('Emulation.setEmulatedMedia', { features: [] })
  await still()
  await screenshot('arrival-venus-2-thermometer')
  // Flight waits behind Worlds, and so does the note: it is hidden, and its time does not run.
  const left = state.warmth.left
  await click('#open-map')
  await evaluate('advanceFlight(2)')
  state = await snapshot(); shown = await note()
  assert(shown.hidden && state.warmth.shown === 'venus' && state.warmth.left === left, `The note does not wait behind Worlds: ${JSON.stringify(state.warmth)}`)
  const venus = await meter('venus')
  assert(venus.word === 'HOT' && venus.line === '#603449', `The Venus card has no thermometer with dark lines: ${JSON.stringify(venus)}`)
  await click('#close-map')
  await evaluate('advanceFlight(0.1)')
  assert(!(await note()).hidden, 'The note does not come back after Worlds')
  // 5 s, then a fade of 0.6 s.
  await evaluate('advanceFlight(4.6)')
  shown = await note()
  assert(!shown.hidden && !shown.leaving, 'The note goes before 5 s')
  await evaluate('advanceFlight(0.5)')
  shown = await note()
  assert(!shown.hidden && shown.leaving, 'The note does not fade after 5 s')
  await evaluate('advanceFlight(0.7)')
  assert((await note()).hidden && (await snapshot()).warmth.shown === null, 'The note does not go after its fade')
  await evaluate('advanceFlight(8)')
  assert((await note()).hidden, 'The note comes back while the fairy stays at Venus')

  step('a short dip out, and a new arrival')
  await openSpace()
  await evaluate('advanceFlight(3)')
  assert((await snapshot()).belt.region === 'Open space' && (await note()).hidden, 'The test point is not in open space, or a note shows there')
  await evaluate('__fairyTest.placeOver("venus", [0, 1, 0], 40)')
  await evaluate('advanceFlight(0.5)')
  assert((await note()).hidden, 'The same world shows again after 3 s away')
  await openSpace()
  await evaluate('advanceFlight(11)')
  await evaluate('__fairyTest.placeOver("venus", [0, 1, 0], 40)')
  await evaluate('advanceFlight(0.2)')
  shown = await note()
  // Venus has its sticker now, so no sticker note comes: the thermometer shows at once.
  assert(!shown.hidden && shown.word === 'HOT' && await toastHidden(), `A later arrival at Venus shows no thermometer: ${JSON.stringify(shown)}`)

  step('arrival at the Moon')
  await evaluate('__fairyTest.placeOver("moon", [0, 1, 0], 30)')
  await evaluate('advanceFlight(0.5)')
  state = await snapshot()
  assert(state.stickers.includes('moon') && (await note()).hidden && state.warmth.pending === 'moon', `The Moon sticker note and the thermometer show together: ${JSON.stringify(state.warmth)}`)
  await waitForToast()
  await evaluate('advanceFlight(0.1)')
  shown = await note()
  assert(!shown.hidden && shown.word === 'COOL' && shown.text.includes('Moon') && shown.covers.length === 0, `Wrong note at the Moon: ${JSON.stringify(shown)}`)
  await still()
  await screenshot('arrival-moon')

  step('desktop: a full book')
  await evaluate(`localStorage.setItem('fairy-sticker-book', ${JSON.stringify(fullBook)})`)
  await load(false, 0, [1280, 800])
  await click('#begin-button')
  await evaluate('advanceFlight(1)')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  assert(await count('#world-map .warmth-meter') === 13, 'A full book does not have 13 thermometers')
  const meters = {}
  for (const id of ALL) meters[id] = await meter(id)
  const order = ALL.filter(id => id !== 'fairy').toSorted((a, b) => meters[b].height - meters[a].height)
  assert(order.join() === 'sun,venus,mercury,earth,moon,mars,vesta,ceres,jupiter,saturn,neptune,uranus', `The levels in the cards are not in the order of the temperatures: ${order}`)
  assert(ALL.every(id => meters[id].inside), `A thermometer is outside its card: ${ALL.filter(id => !meters[id].inside)}`)
  assert(ALL.every(id => meters[id].bulb >= 28), `A face is smaller than 28 px: ${meters.venus.bulb}`)
  assert(meters.venus.word === 'HOT' && meters.earth.word === 'NICE' && meters.fairy.word === 'NICE' && meters.uranus.word === 'COLD' && meters.uranus.height < meters.neptune.height, 'Wrong words in a full book')
  assert(new Set([meters.venus.colour, meters.earth.colour, meters.mars.colour, meters.uranus.colour]).size === 4, 'The steps do not have their own colours')
  await evaluate('document.querySelector(".book-cards").scrollIntoView({ block: "center" })')
  await screenshot('worlds-full-book')
  for (const id of ['venus', 'earth', 'uranus', 'sun', 'moon', 'mars']) await cardShot(id, `card-${id}`)
  await click('#close-map')
  // A big screen: the two arrival notes.
  for (const [id, height] of [['venus', 40], ['moon', 30]]) {
    await evaluate(`__fairyTest.placeOver("${id}", [0, 1, 0], ${height})`)
    await evaluate('advanceFlight(0.2)')
    shown = await note()
    assert(!shown.hidden && shown.covers.length === 0 && shown.inView, `Wrong note at ${id} on a big screen: ${JSON.stringify(shown)}`)
    await still()
    await screenshot(`arrival-${id}-1280`)
  }

  for (const width of [390, 320]) {
    step(`phone ${width}`); await load(true, width)
    await click('#begin-button')
    await evaluate('advanceFlight(1)')
    assert((await note()).hidden, 'A thermometer shows at the start on a phone')
    await click('#open-map')
    await evaluate('advanceFlight(0.2)')
    for (const id of ALL) {
      const item = await meter(id)
      assert(item && item.inside && item.bulb >= 28, `The thermometer of ${id} is not inside its card at ${width}px: ${JSON.stringify(item)}`)
    }
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
    assert(await evaluate('(() => { const d = document.querySelector("#world-map"); return d.scrollWidth <= d.clientWidth })()'), `Worlds scrolls sideways at ${width}px`)
    await evaluate('document.querySelector(".book-cards").scrollIntoView({ block: "start" })')
    await screenshot(`worlds-${width}`)
    for (const id of ['venus', 'uranus']) await cardShot(id, `card-${id}-${width}`)
    await click('#close-map')
    // On a phone the nearest-world panel is in Menu. The note is on the flight screen, under the top buttons.
    for (const [id, height, word] of [['venus', 40, 'HOT'], ['moon', 30, 'COOL']]) {
      await evaluate(`__fairyTest.placeOver("${id}", [0, 1, 0], ${height})`)
      await evaluate('advanceFlight(0.2)')
      shown = await note()
      assert(!shown.hidden && shown.word === word && shown.inView && shown.covers.length === 0, `Wrong note at ${id} at ${width}px: ${JSON.stringify(shown)}`)
      await still()
      await screenshot(`arrival-${id}-${width}`)
    }
    // The note waits behind Menu.
    await click('#menu-toggle')
    await evaluate('advanceFlight(0.2)')
    assert((await note()).hidden, `The note shows over Menu at ${width}px`)
    await click('#menu-close')
  }

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified the picture thermometer: none at the start and none on the flight screen, 3 thermometers in a new book and none in a mystery card, 13 in a full book in the order of the temperatures (Venus HOT, Earth and Blossom Haven NICE, Uranus COLD and below Neptune), the dark lines on a sticker card, the arrival note after the sticker note at Venus and at the Moon (5 s and a fade, hidden behind Worlds and Menu, no part of the screen under it, no rise with reduced motion), no note after a short dip out and a note after 10 s away, and the 390/320 px phone layout. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
