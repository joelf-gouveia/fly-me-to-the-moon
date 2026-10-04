// Checks the search stars (F1) in the real game: no star before the hello sticker, the task line in
// the note of a new sticker, the task as the hint in Worlds, a find on twelve worlds (the dark seas of
// the Moon, a rainbow on Earth, the canyon of Mars, the south pole of Vesta, the rings of Saturn and of
// Uranus, a ray crater on Mercury, a soda bubble on Blossom Haven, a loop of fire of the Sun, a lap of
// Venus, and the storms of Jupiter and Neptune), the gold star in the world and on the sticker, the
// saved book, the reset in Settings, and the phone layout. Test moves put the fairy at each place.
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
    // The direction of the Sun in the local frame of a world.
    window.sunOver = kind => {
      const world = __fairyTest.world(kind)
      return __fairyTest.world('sun').group.position.clone().sub(world.group.position).normalize().applyQuaternion(world.group.quaternion.clone().invert())
    };
    // A local direction on Earth where the Sun is 'elevation' degrees above the horizon.
    window.sunAt = elevation => {
      const sun = sunOver('earth'), side = sun.clone().cross(sun.clone().set(0, 1, 0)).normalize(), angle = (90 - elevation) * Math.PI / 180
      return sun.multiplyScalar(Math.cos(angle)).addScaledVector(side, Math.sin(angle)).toArray()
    };
    // A soda bubble 3 to 6 m above the base radius of Blossom Haven: its local direction and its distance from the centre.
    window.sodaBubble = () => {
      const world = __fairyTest.world('fairy'), bubbles = world.surface.getObjectByName('soda-bubbles'), places = bubbles.instanceMatrix.array
      for (let i = 0; i < bubbles.count; i++) {
        const place = [places[i * 16 + 12], places[i * 16 + 13], places[i * 16 + 14]], distance = Math.hypot(...place)
        if (distance - world.radius > 3 && distance - world.radius < 6) return { direction: place.map(value => value / distance), distance, index: i }
      }
      return null
    };
    // The paint of the ground of a rocky world at a local direction: the colour of the nearest vertex, as [r, g, b].
    window.groundPaint = (kind, direction) => {
      const world = __fairyTest.world(kind)
      const ground = world.surface.children.find(child => child.isMesh && child.geometry.attributes.color && !child.isInstancedMesh)
      const places = ground.geometry.attributes.position, colours = ground.geometry.attributes.color
      const length = Math.hypot(...direction), [x, y, z] = direction.map(value => value / length)
      let best = 0, most = -Infinity
      for (let i = 0; i < places.count; i++) {
        const dot = (places.getX(i) * x + places.getY(i) * y + places.getZ(i) * z) / Math.hypot(places.getX(i), places.getY(i), places.getZ(i))
        if (dot > most) { most = dot; best = i }
      }
      return [colours.getX(best), colours.getY(best), colours.getZ(best)]
    };
    // A view from 'height' m above a place, straight down, for a screenshot of the scenery.
    window.lookDown = (kind, direction, height) => {
      const world = __fairyTest.world(kind)
      const normal = world.group.position.clone().set(...direction).normalize().applyQuaternion(world.group.quaternion)
      __fairyTest.place(world.group.position.clone().addScaledVector(normal, world.radius + height).toArray(), world.group.position.toArray())
    };
  ` })
  async function load(mobile, width = 390) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    // Rain from a thin cloud on the whole of Earth: a rainbow shows where the Sun is low.
    await send('Page.navigate', { url: `${origin}/?test&weather=shower` })
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
  const place = (kind, direction, height) => evaluate(`__fairyTest.placeOver(${JSON.stringify(kind)}, ${JSON.stringify(direction)}, ${height})`)
  /** A picture of a place from above. The view is high over the place, so it gives no star. */
  const pictureFromAbove = async (name, kind, direction, height) => {
    await evaluate(`lookDown(${JSON.stringify(kind)}, ${JSON.stringify(direction)}, ${height})`)
    await evaluate('advanceFlight(0.05)')
    await screenshot(name)
  }
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
  /** No star: the fairy is at a place that is not the place of the task. */
  async function notFound(kind, why) {
    await evaluate('advanceFlight(0.3)')
    assert(!(await snapshot()).searchStars.includes(kind), `${kind} gives a star ${why}`)
  }
  /** A find: the star in the book, the note, the gold star on the picture and in the world. */
  async function found(kind, line, seconds = 0.3) {
    await evaluate(`advanceFlight(${seconds})`)
    const state = await snapshot()
    assert(state.searchStars.includes(kind), `No search star at ${kind}: ${state.searchStars}`)
    assert((await text('#sticker-toast small')) === 'SEARCH STAR' && (await text('#sticker-toast .sticker-toast-fact')) === line, `Wrong note at ${kind}: ${await text('#sticker-toast')}`)
    assert(await has('#sticker-toast .search-badge.is-found') && (await text('#sticker-toast .sticker-toast-task')) === '', 'No gold star on the sticker picture')
    assert(state.searchStar.visible && state.searchStar.over === 'fairy', `No gold star in the world at ${kind}: ${JSON.stringify(state.searchStar)}`)
    return state
  }
  const pressQ = () => evaluate('window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ" })); window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyQ" }))')
  const RADIANS = Math.PI / 180
  /** A direction on the ground paint of a rocky world: its longitude is atan2(z, x). */
  const onGround = (latitude, longitude) => [Math.cos(latitude * RADIANS) * Math.cos(longitude * RADIANS), Math.sin(latitude * RADIANS), Math.cos(latitude * RADIANS) * Math.sin(longitude * RADIANS)]
  /** A direction on the painted map of a giant: its longitude is atan2(z, -x). */
  const onMap = (latitude, longitude) => [-Math.cos(latitude * RADIANS) * Math.cos(longitude * RADIANS), Math.sin(latitude * RADIANS), Math.cos(latitude * RADIANS) * Math.sin(longitude * RADIANS)]

  step('desktop'); await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  await click('#begin-button')
  await evaluate('advanceFlight(1)')
  // Hover keeps the fairy at each place.
  await pressQ()
  let state = await snapshot()
  assert(state.hoverHeld && state.searchStars.length === 0 && !state.searchStar.visible, 'A new player has search stars')

  // A rainbow on Earth before the Earth sticker gives no star: the fairy starts on Earth, with no sticker.
  step('Earth before the hello')
  await place('earth', await evaluate('sunAt(20)'), 20)
  await evaluate('advanceFlight(1.5)')
  state = await snapshot()
  assert(state.weather.rainbow > 0.5, `The shower gives no rainbow with a low Sun: ${JSON.stringify(state.weather)}`)
  assert(!state.stickers.includes('earth') && state.searchStars.length === 0 && !state.searchStar.visible, `A rainbow before the Earth sticker gives a star: ${state.searchStars}`)

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

  step('Earth: a rainbow')
  // The fairy leaves Earth and comes back at noon: the Sun is high, so the rain gives no rainbow.
  await place('earth', [0, 1, 0], 320)
  await evaluate('advanceFlight(0.1)')
  const noon = await evaluate('sunOver("earth").toArray()')
  state = await hello('earth', noon, 20, 'Find a rainbow.')
  assert(state.earthVisit === 2, `No new visit of Earth: ${state.earthVisit}`)
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  await click('[data-world="earth"]')
  assert(await has('[data-world="earth"] .search-badge.is-waiting') && (await text('#world-note-text')).endsWith('☆ Find a rainbow.'), `The Earth card does not give the task: ${await text('#world-note-text')}`)
  await showCard('earth')
  await screenshot('book-earth-task')
  await click('#close-map')
  await waitForNote()
  await evaluate('advanceFlight(1.5)')
  state = await snapshot()
  assert(state.weather.rainbow < 0.05 && !state.searchStars.includes('earth'), `Earth gives a star at noon: ${JSON.stringify(state.weather)}`)
  await place('earth', await evaluate('sunAt(20)'), 20)
  state = await found('earth', 'You found a rainbow!', 1.5)
  assert(state.weather.rainbow > 0.25, `The star comes with no rainbow: ${state.weather.rainbow}`)
  await screenshot('star-rainbow')

  step('Mars: the canyon')
  await hello('mars', [0.5, 0.3, 0.8], 30, 'Fly along the long canyon.')
  await waitForNote()
  await place('mars', [0.5, 0.3, 0.8], 5)
  await notFound('mars', 'low over the red dust, away from the canyon')
  // The middle of the canyon: longitude 120°, latitude -9° + 2.5° × sin(120 × 0.09) (CANYON in src/search-places.ts).
  const canyon = onGround(-9 + 2.5 * Math.sin(120 * 0.09), 120)
  // The paint agrees with the task: the ground is dark in the canyon, and it is the red dust 6° to the north.
  const paint = (kind, direction) => evaluate(`groundPaint(${JSON.stringify(kind)}, ${JSON.stringify(direction)})`)
  const dark = await paint('mars', canyon), dust = await paint('mars', onGround(-9 + 2.5 * Math.sin(120 * 0.09) + 6, 120))
  assert(dark[0] < dust[0] * 0.75, `The canyon is not dark at its place: ${dark} and ${dust}`)
  await pictureFromAbove('place-canyon', 'mars', canyon, 160)
  await place('mars', canyon, 40)
  await notFound('mars', '40 m above the canyon')
  await place('mars', canyon, 8)
  await found('mars', 'You flew along the long canyon!')
  await screenshot('star-mars')

  step('Vesta: the south pole')
  // The fairy arrives over the pole. The star comes when the note of the hello is gone.
  await hello('vesta', [0.2, -1, 0.1], 25, 'Find the giant hole at the bottom.')
  await waitForNote()
  await found('vesta', 'You found the giant hole!')

  step('Saturn: the rings')
  await hello('saturn', [1, 0.02, 0], 50, 'Fly over the rings.')
  await waitForNote()
  await notFound('saturn', 'inside the rings')
  await place('saturn', [1, 0.02, 0], await evaluate('__fairyTest.world("saturn").radius * 0.6 + 12'))
  await found('saturn', 'You flew over the rings!')
  await screenshot('star-saturn')

  step('Uranus: the thin rings')
  await hello('uranus', [1, 0.02, 0], 50, 'Find the thin rings of the planet that lies on its side.')
  await waitForNote()
  // Saturn has rings at 1.4 radii from the centre. Uranus has none there.
  await place('uranus', [1, 0.02, 0], await evaluate('__fairyTest.world("uranus").radius * 0.4 + 12'))
  await notFound('uranus', 'between the planet and its rings')
  await place('uranus', [1, 0.02, 0], await evaluate('__fairyTest.world("uranus").radius * 0.8 + 12'))
  await found('uranus', 'You found the thin rings!')
  await screenshot('star-uranus')

  step('Mercury: a crater with bright rays')
  await hello('mercury', [0, 0.3, 1], 25, 'Find a crater with bright rays.')
  await waitForNote()
  // Mercury has a new landscape after the arrival, so the search reads the craters now.
  const craters = await evaluate('__fairyTest.rayCraters()')
  assert(craters.length === 4, `Mercury has ${craters.length} ray craters`)
  // The paint agrees with the task: the middle of each ray crater is almost white.
  for (const crater of craters) {
    const middle = await paint('mercury', crater)
    assert(Math.min(...middle) > 0.6, `A ray crater is not bright at its middle: ${middle}`)
  }
  await pictureFromAbove('place-ray-crater', 'mercury', craters[0], 110)
  assert(JSON.stringify(await evaluate('__fairyTest.rayCraters()')) === JSON.stringify(craters), 'The ray craters change during a visit')
  await place('mercury', craters[0], 40)
  await notFound('mercury', '40 m above a ray crater')
  await place('mercury', craters[0], 8)
  await found('mercury', 'You found a crater with bright rays!')
  await screenshot('star-mercury')

  step('the Sun: a loop of fire')
  // The first loop of PROMINENCES: latitude 12°, longitude 0°, 0.12 radii high. The loops turn with the Sun.
  const turn = (await snapshot()).sun.turn
  const loop = [Math.cos(12 * RADIANS) * Math.cos(turn), Math.sin(12 * RADIANS), -Math.cos(12 * RADIANS) * Math.sin(turn)]
  const sunRadius = await evaluate('__fairyTest.world("sun").radius')
  await hello('sun', [0, -1, 0], 60, 'Fly through a loop of fire.')
  await waitForNote()
  await notFound('sun', 'low over the Sun, away from the loops')
  await place('sun', loop, sunRadius * 0.2)
  await notFound('sun', 'above the top of a loop')
  await place('sun', loop, sunRadius * 0.06)
  await found('sun', 'You flew through a loop of fire!')
  await screenshot('star-sun')

  step('Venus: a lap')
  await hello('venus', [1, 0, 0], 60, 'Fly all the way around Venus.')
  await waitForNote()
  // 40 places around the equator, 9° apart. The lap is complete near its start.
  for (let i = 1; i <= 40; i++) {
    await place('venus', [Math.cos(i * 9 * RADIANS), 0, Math.sin(i * 9 * RADIANS)], 60)
    await evaluate('advanceFlight(0.05)')
    if (i === 30) assert(!(await snapshot()).searchStars.includes('venus'), 'Venus gives a star after three quarters of a lap')
  }
  await found('venus', 'You flew all the way around Venus!')
  await screenshot('star-venus')

  for (const [kind, name, latitude, longitude, task, line] of [
    ['jupiter', 'the big red storm', -22, 150, 'Find the big red storm.', 'You found the big red storm!'],
    ['neptune', 'the dark storm', -21, 200, 'Find the dark storm and its white cloud.', 'You found the dark storm!'],
  ]) {
    step(`${kind}: ${name}`)
    const storm = onMap(latitude, longitude)
    await hello(kind, onMap(40, longitude + 120), 20, task)
    await waitForNote()
    await notFound(kind, 'in the clouds, away from the storm')
    await pictureFromAbove(`place-${kind}-storm`, kind, storm, 420)
    await place(kind, storm, 100)
    await notFound(kind, 'above the clouds of the storm')
    await place(kind, storm, 20)
    await found(kind, line)
    await screenshot(`star-${kind}`)
  }

  step('Blossom Haven: a soda bubble')
  await hello('fairy', [0, -1, -0.2], 30, 'Pop a soda bubble.')
  await waitForNote()
  await notFound('fairy', '30 m above the garden')
  const bubble = await evaluate('sodaBubble()')
  assert(bubble, 'Blossom Haven has no soda bubble 3 to 6 m up')
  // The test move puts the fairy over the ground or the soda: its distance from the centre gives the height of the bubble.
  await place('fairy', bubble.direction, 0)
  const centre = await evaluate('(() => { const s = __fairyTest.snapshot(); return Math.hypot(s.fairy[0] - s.home[0], s.fairy[1] - s.home[1], s.fairy[2] - s.home[2]) })()')
  await place('fairy', bubble.direction, bubble.distance - centre)
  await found('fairy', 'You popped a soda bubble!', 0.1)
  // The bubble pops: it has no size until its next rise, and its drops fly out.
  assert((await snapshot()).sodaPop, 'No drops show after the pop')
  assert(await evaluate(`__fairyTest.world('fairy').surface.getObjectByName('soda-bubbles').instanceMatrix.array[${bubble.index} * 16]`) === 0, 'The soda bubble shows after the pop')
  await evaluate('advanceFlight(0.5)')
  assert(!(await snapshot()).sodaPop, 'The drops of the pop stay')
  await screenshot('star-bubble')
  state = await snapshot()
  const saved = state.searchStars
  assert(saved.length === 12, `Wrong stars: ${saved}`)

  step('saved book')
  await load(false)
  state = await snapshot()
  assert(JSON.stringify(state.searchStars) === JSON.stringify(saved), `The stars differ after a reload: ${state.searchStars}`)
  assert(JSON.parse(await evaluate('localStorage.getItem("fairy-sticker-book")')).found.length === 12, 'The saved book has no stars')
  await click('#begin-button')
  await evaluate('advanceFlight(0.5)')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  assert(await evaluate('document.querySelectorAll(".book-card .search-badge.is-found").length') === 12, 'The book does not show 12 gold stars')
  assert((await text('#sticker-count')) === '12 of 13 stickers · 12 search stars', `Wrong count: ${await text('#sticker-count')}`)
  await showCard('moon')
  await screenshot('book-saved')
  await click('#close-map')

  step('reset')
  await click('#settings-toggle')
  assert((await text('#sticker-summary')) === 'The book has 12 of 13 stickers and 12 search stars.', `Wrong summary: ${await text('#sticker-summary')}`)
  await click('#reset-stickers')
  assert((await text('#reset-question')) === 'Remove all 12 stickers and 12 search stars?', `Wrong question: ${await text('#reset-question')}`)
  await click('#reset-yes')
  state = await snapshot()
  assert(state.stickers.length === 0 && state.searchStars.length === 0, `The reset keeps stars: ${state.searchStars}`)
  assert(JSON.parse(await evaluate('localStorage.getItem("fairy-sticker-book")')).found.length === 0, 'The saved book keeps stars')
  assert((await text('#reset-status')).startsWith('12 stickers and 12 search stars removed.'), `Wrong status: ${await text('#reset-status')}`)
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
    // The longest task line.
    await hello('uranus', [1, 0.02, 0], 50, 'Find the thin rings of the planet that lies on its side.')
    assert(await fits(), `The note with the longest task does not fit at ${width}px`)
    await screenshot(`hello-long-task-${width}`)
    await waitForNote()
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
  console.log(`Verified the search stars: no star before the hello sticker, the task in the note and in Worlds, a find that waits for the note, twelve finds (${saved.join(', ')}) with the note, the gold star on the sticker and in the world, the saved book, the reset in Settings, and the 390/320 px phone layout (${phoneCalls.join(', ')}). No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
