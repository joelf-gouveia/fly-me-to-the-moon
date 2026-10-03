// Checks the search stars (F1) in the real game: no star before the hello sticker, the task line in
// the note of a new sticker, the task as the hint in Worlds, a find on seven worlds (the dark seas of
// the Moon, a duck on Earth, the red dust of Mars, the south pole of Vesta, the rings of Saturn, a
// crater on Mercury and a unicorn on Blossom Haven), the gold star in the world and on the sticker,
// the saved book, the reset in Settings, and the phone layout. Test moves put the fairy at each place.
// Run against the dev server on port 5174:
//   node scripts/search-stars-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'search-stars-browser-'))
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
  const has = selector => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    // The note of a sticker shows for 6.5 s of page time, and slow software frames take seconds. The page
    // holds each long timer until the test lets the note go (releaseNote()), so each check sees the note.
    const pageTimeout = window.setTimeout.bind(window), held = new Map();
    window.setTimeout = (callback, ms, ...rest) => {
      if (ms < 6000) return pageTimeout(callback, ms, ...rest);
      const id = pageTimeout(() => {}, 0); held.set(id, () => callback(...rest)); return id;
    };
    const pageClear = window.clearTimeout.bind(window);
    window.clearTimeout = id => { held.delete(id); pageClear(id) };
    window.releaseNote = () => { const calls = [...held.values()]; held.clear(); calls.forEach(call => call()); return calls.length };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
    // A local direction over a world where test(sample) is true, from an even spread of points.
    window.findGround = (kind, test) => {
      const world = __fairyTest.world(kind), count = 6000
      for (let i = 0; i < count; i++) {
        const y = 1 - 2 * (i + 0.5) / count, r = Math.sqrt(1 - y * y), angle = i * 2.399963
        const direction = [r * Math.cos(angle), y, r * Math.sin(angle)]
        if (test(world.sample(...direction))) return direction
      }
      return null
    };
    // The local direction and the distance to the fairy of the nearest model of a creature that shows.
    window.nearestModel = name => {
      const fairy = __fairyTest.snapshot().fairy, world = __fairyTest.world(__fairyTest.snapshot().belt.nearest === 'Blossom Haven' ? 'fairy' : 'earth')
      let best = null
      for (const model of world.creatures.group.children) {
        if (!model.visible || (model.userData.fairytale ?? model.userData.species) !== name) continue
        const point = model.getWorldPosition(model.position.clone())
        const gap = Math.hypot(point.x - fairy[0], point.y - fairy[1], point.z - fairy[2])
        if (!best || gap < best.gap) {
          const local = point.clone().sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert())
          best = { gap, name: model.name, direction: local.normalize().toArray() }
        }
      }
      return best
    };
  ` })
  async function load(mobile, width = 390) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#open-map")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir('artifacts.local/search-stars', { recursive: true })
  // The stubbed frame clock holds CSS animations at their start, so the checks and the screenshots skip the entry
  // animations and the fade of the note.
  const settle = () => evaluate('document.querySelectorAll("#sticker-toast, #sticker-toast .search-badge").forEach(element => { element.style.animation = "none"; element.style.transition = "none" })')
  const screenshot = async name => {
    await settle()
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/search-stars/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  // The cards of the book are under the map: show the card of a world in the screenshot.
  const showCard = kind => evaluate(`document.querySelector('[data-world="${kind}"]').scrollIntoView({ block: 'center' })`)
  const place = (kind, direction, height) => evaluate(`__fairyTest.place(${JSON.stringify(kind)}, ${JSON.stringify(direction)}, ${height})`)
  // A find waits until the note of the last sticker is gone.
  const waitForNote = async () => {
    await evaluate('releaseNote()')
    for (let i = 0; i < 60 && !(await evaluate('document.querySelector("#sticker-toast").hidden')); i++) await delay(250)
    assert(await evaluate('document.querySelector("#sticker-toast").hidden'), 'The note does not go away')
  }
  /** The hello sticker of a world, then its search task in the note. */
  async function hello(kind, direction, height, task) {
    await place(kind, direction, height)
    await evaluate('advanceFlight(0.3)')
    const state = await snapshot()
    assert(state.stickers.includes(kind), `No hello sticker at ${kind}: ${state.stickers}`)
    // The note of the hello shows, so no star comes yet, also at the place of the task.
    assert(!state.searchStars.includes(kind) && !(await evaluate('document.querySelector("#sticker-toast").hidden')), `A search star comes with the hello at ${kind}`)
    const line = await text('#sticker-toast .sticker-toast-task')
    assert(line === `☆ ${task}`, `Wrong task line at ${kind}: ${line}`)
    return state
  }
  /** A find: the star in the book, the note, the gold star on the picture and in the world. */
  async function found(kind, line, over = 'fairy') {
    await evaluate('advanceFlight(0.3)')
    const state = await snapshot()
    assert(state.searchStars.includes(kind), `No search star at ${kind}: ${state.searchStars}`)
    assert((await text('#sticker-toast small')) === 'SEARCH STAR' && (await text('#sticker-toast .sticker-toast-fact')) === line, `Wrong note at ${kind}: ${await text('#sticker-toast')}`)
    assert(await has('#sticker-toast .search-badge.is-found') && (await text('#sticker-toast .sticker-toast-task')) === '', 'No gold star on the sticker picture')
    assert(state.searchStar.visible && state.searchStar.over.startsWith(over), `No gold star in the world at ${kind}: ${JSON.stringify(state.searchStar)}`)
    return state
  }
  const pressQ = () => evaluate('window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ" })); window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyQ" }))')

  step('desktop'); await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  await click('#begin-button')
  await evaluate('advanceFlight(1)')
  // Hover keeps the fairy at each place.
  await pressQ()
  let state = await snapshot()
  assert(state.hoverHeld && state.searchStars.length === 0 && !state.searchStar.visible, 'A new player has search stars')

  // A duck on Earth before the Earth sticker gives no star: the fairy starts on Earth, with no sticker.
  step('Earth before the hello')
  async function nearCreature(kind, species, name) {
    const resident = await evaluate(`(() => { const r = __fairyTest.world(${JSON.stringify(kind)}).creatures.residents.find(item => item.kind === ${JSON.stringify(species)}); return r && r.route[0].toArray() })()`)
    assert(resident, `${kind} has no ${species}`)
    await place(kind, resident, 25)
    await evaluate('advanceFlight(0.2)')
    let model = await evaluate(`nearestModel(${JSON.stringify(name)})`)
    assert(model, `No ${name} model shows near its home`)
    await place(kind, model.direction, 4)
    await evaluate('advanceFlight(0.05)')
    model = await evaluate(`nearestModel(${JSON.stringify(name)})`)
    assert(model.gap < 12, `The fairy is not near the ${name}: ${model.gap}`)
    return model
  }
  await nearCreature('earth', 'duck', 'duck')
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(!state.stickers.includes('earth') && state.searchStars.length === 0 && !state.searchStar.visible, `A duck before the Earth sticker gives a star: ${state.searchStars}`)

  step('the Moon: the dark seas')
  // The fairy arrives low over a dark sea. The find waits until the note of the hello sticker is gone.
  const sea = await evaluate('findGround("moon", sample => sample.mare > 0.9)')
  assert(sea, 'The Moon has no dark sea')
  await hello('moon', sea, 6, 'Find the dark seas on the Moon.')
  await screenshot('hello-task')
  await waitForNote()
  state = await found('moon', 'You found the dark seas!')
  await screenshot('star-moon')

  // Worlds: the gold star on the card, the count, and the found line in the note.
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  assert(await has('[data-world="moon"] .search-badge.is-found') && !(await has('[data-world="earth"] .search-badge')), 'The book cards do not show the stars')
  assert((await text('#sticker-count')) === '1 of 13 stickers · 1 search star', `Wrong count: ${await text('#sticker-count')}`)
  await click('[data-world="moon"]')
  assert((await text('#world-note-text')).endsWith('★ You found the dark seas!'), `Wrong Moon note: ${await text('#world-note-text')}`)
  await showCard('moon')
  await screenshot('book-moon')
  await click('#close-map')

  step('Earth: a duck')
  await place('earth', [0, 1, 0], 320)
  await evaluate('advanceFlight(0.1)')
  await place('earth', [0.3, 0.2, 0.9], 20)
  await evaluate('advanceFlight(0.1)')
  state = await hello('earth', [0.3, 0.2, 0.9], 20, 'Find a duck on the water.')
  assert(state.earthVisit === 2, `No new visit of Earth: ${state.earthVisit}`)
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  await click('[data-world="earth"]')
  assert(await has('[data-world="earth"] .search-badge.is-waiting') && (await text('#world-note-text')).endsWith('☆ Find a duck on the water.'), `The Earth card does not give the task: ${await text('#world-note-text')}`)
  await showCard('earth')
  await screenshot('book-earth-task')
  await click('#close-map')
  await waitForNote()
  await nearCreature('earth', 'duck', 'duck')
  state = await found('earth', 'You found a duck!', 'creature-duck')
  await evaluate('advanceFlight(0.5)')
  await screenshot('star-duck')

  step('Mars: the red dust')
  await hello('mars', [0.5, 0.3, 0.8], 30, 'Fly low over the red dust.')
  await waitForNote()
  await place('mars', [0.5, 0.3, 0.8], 12)
  await evaluate('advanceFlight(0.3)')
  assert(!(await snapshot()).searchStars.includes('mars'), 'Mars gives a star at 12 m')
  await place('mars', [0.5, 0.3, 0.8], 5)
  await found('mars', 'You flew over the red dust!')
  await screenshot('star-mars')

  step('Vesta: the south pole')
  // The fairy arrives over the pole. The star comes when the note of the hello is gone.
  await hello('vesta', [0.2, -1, 0.1], 25, 'Find the giant hole at the bottom.')
  await waitForNote()
  await found('vesta', 'You found the giant hole!')

  step('Saturn: the rings')
  await hello('saturn', [1, 0.02, 0], 50, 'Fly over the rings.')
  await waitForNote()
  await evaluate('advanceFlight(0.3)')
  assert(!(await snapshot()).searchStars.includes('saturn'), 'Saturn gives a star inside the rings')
  const ring = await evaluate('__fairyTest.world("saturn").radius * 0.6 + 12')
  await place('saturn', [1, 0.02, 0], ring)
  await found('saturn', 'You flew over the rings!')
  await screenshot('star-saturn')

  step('Mercury: a crater')
  await hello('mercury', [0, 0.3, 1], 25, 'Find a crater, a round dip in the ground.')
  await waitForNote()
  // Mercury has a new landscape after the arrival, so the search reads the terrain now.
  const crater = await evaluate('findGround("mercury", sample => sample.crater > 0.8)')
  assert(crater, 'Mercury has no deep crater')
  await place('mercury', crater, 8)
  await found('mercury', 'You found a crater!')

  step('Blossom Haven: a unicorn')
  await hello('fairy', [0, -1, -0.2], 30, 'Say hello to a unicorn.')
  await waitForNote()
  await nearCreature('fairy', 'cow', 'unicorn')
  await found('fairy', 'You found a unicorn!', 'creature-cow')
  await evaluate('advanceFlight(0.5)')
  await screenshot('star-unicorn')
  state = await snapshot()
  const saved = state.searchStars
  assert(saved.length === 7, `Wrong stars: ${saved}`)

  step('saved book')
  await load(false)
  state = await snapshot()
  assert(JSON.stringify(state.searchStars) === JSON.stringify(saved), `The stars differ after a reload: ${state.searchStars}`)
  assert(JSON.parse(await evaluate('localStorage.getItem("fairy-sticker-book")')).found.length === 7, 'The saved book has no stars')
  await click('#begin-button')
  await evaluate('advanceFlight(0.5)')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  assert(await evaluate('document.querySelectorAll(".book-card .search-badge.is-found").length') === 7, 'The book does not show 7 gold stars')
  assert((await text('#sticker-count')) === '7 of 13 stickers · 7 search stars', `Wrong count: ${await text('#sticker-count')}`)
  await showCard('moon')
  await screenshot('book-saved')
  await click('#close-map')

  step('reset')
  await click('#settings-toggle')
  assert((await text('#sticker-summary')) === 'The book has 7 of 13 stickers and 7 search stars.', `Wrong summary: ${await text('#sticker-summary')}`)
  await click('#reset-stickers')
  assert((await text('#reset-question')) === 'Remove all 7 stickers and 7 search stars?', `Wrong question: ${await text('#reset-question')}`)
  await click('#reset-yes')
  state = await snapshot()
  assert(state.stickers.length === 0 && state.searchStars.length === 0, `The reset keeps stars: ${state.searchStars}`)
  assert(JSON.parse(await evaluate('localStorage.getItem("fairy-sticker-book")')).found.length === 0, 'The saved book keeps stars')
  assert((await text('#reset-status')).startsWith('7 stickers and 7 search stars removed.'), `Wrong status: ${await text('#reset-status')}`)
  await click('#close-settings')

  const phoneCalls = []
  for (const width of [390, 320]) {
    step(`phone ${width}`)
    await load(true, width)
    await evaluate('localStorage.removeItem("fairy-sticker-book")')
    await load(true, width)
    await click('#begin-button')
    await evaluate('advanceFlight(0.5)')
    await click('#hover-toggle')
    const fits = async () => (await settle(), evaluate('(() => { const r = document.querySelector("#sticker-toast").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })()'))
    await hello('moon', [0.2, 0.9, 0.3], 40, 'Find the dark seas on the Moon.')
    assert(await fits(), `The note with the task does not fit at ${width}px`)
    await screenshot(`hello-task-${width}`)
    await waitForNote()
    await place('moon', await evaluate('findGround("moon", sample => sample.mare > 0.9)'), 6)
    await found('moon', 'You found the dark seas!')
    assert(await fits(), `The search note does not fit at ${width}px`)
    // The gold star is three draw calls: the star, its glow and its sparkles.
    phoneCalls.push(`${width} px: ${(await snapshot()).graphics.calls} draw calls with the star`)
    await screenshot(`star-${width}`)
    await click('#open-map')
    await evaluate('advanceFlight(0.2)')
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
    assert(await has('[data-world="moon"] .search-badge.is-found'), 'No gold star on the phone book')
    await showCard('moon')
    await screenshot(`book-${width}`)
  }

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified the search stars: no star before the hello sticker, the task in the note and in Worlds, a find that waits for the note, seven finds (${saved.join(', ')}) with the note, the gold star on the sticker and in the world, the saved book, the reset in Settings, and the 390/320 px phone layout (${phoneCalls.join(', ')}). No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
