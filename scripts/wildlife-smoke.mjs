// Checks the animals in the real game (docs/animals-study.md): the herds of both worlds, the motion,
// the pause, the creatures of Blossom Haven and the pegasus foals, and in five views (the start, low
// over a savanna herd, 30 m over the savanna, low over a herd of the leaf forest, and the lollipop
// grove of Blossom Haven) at 1280 px and on a phone of 390 px:
// - the draw calls of the animals (the herds, the points of the small life and the hearts): at most
//   40 on a computer and 20 on a phone (TODO item 4),
// - at most 260 animals drawn on a computer and 130 on a phone,
// - each animal drawn is in a zone and on a surface of its rule: no land animal on the water, no
//   swimmer on the land, no animal of one belt in another belt.
// It also checks the seasons: the storks are in the leaf forest in the summer of the north and in the
// savanna in its winter, and the honey-drop bees fly only in Blossom time.
// Run against the dev server: FAIRY_TEST_URL=http://127.0.0.1:5174 node scripts/wildlife-smoke.mjs "path/to/chrome.exe"
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const origin = process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'
const profile = await mkdtemp(join(tmpdir(), 'wildlife-game-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
// The limits of the animals (HERD_LIMITS in src/creatures/population.ts, and TODO item 4).
const LIMITS = { computer: { calls: 40, cap: 260 }, phone: { calls: 20, cap: 130 } }
let ws
try {
  let tabs
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); if (tabs.length) break } catch {}
    await delay(250)
  }
  if (!tabs?.length) throw new Error('Browser did not start')
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails)
    if (msg.id) {
      const handler = pending.get(msg.id); pending.delete(msg.id)
      if (msg.error) handler.reject(msg.error); else handler.resolve(msg.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable')
  // Simulation time is in the hands of the check. Only the last frame of each step draws.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.gameFrame = callback; return 1; };
    window.advanceGame = seconds => {
      window.testTime ??= performance.now();
      const gl = document.querySelector('#scene canvas').getContext('webgl2');
      const draw = gl.drawElements, instances = gl.drawElementsInstanced, arrays = gl.drawArrays;
      // A picture of a card renders into a frame buffer in any frame: those draws stay, so the picture of a note is never empty.
      if (!gl.boundFrame) { const bind = gl.bindFramebuffer; gl.boundFrame = { on: null }; gl.bindFramebuffer = function (target, frame) { if (target !== gl.READ_FRAMEBUFFER) gl.boundFrame.on = frame; return bind.call(this, target, frame) } }
      const keep = original => function (...parts) { if (gl.boundFrame.on) return original.apply(this, parts) };
      try {
        gl.drawElements = keep(draw); gl.drawElementsInstanced = keep(instances); gl.drawArrays = keep(arrays);
        for (let i = 0; i < Math.ceil(seconds * 60); i++) window.gameFrame(window.testTime += 1000 / 60);
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; gl.drawArrays = arrays; }
      window.gameFrame(window.testTime += 1000 / 60);
    };
  ` })
  async function load({ mobile = false, query = '?test&weather=clear', width = mobile ? 390 : 1280, height = mobile ? 844 : 800 } = {}) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 })
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile })
    await send('Page.navigate', { url: `${origin}/${query}` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.__fairyTest && !!window.gameFrame && !!document.querySelector("#begin-button")').catch(() => false)) return
      await delay(250)
    }
    throw new Error('The game did not load')
  }
  const snapshot = () => evaluate('window.__fairyTest.snapshot()')
  const advance = seconds => evaluate(`advanceGame(${seconds})`)
  await mkdir('artifacts.local/wildlife', { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/wildlife/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const worldName = kind => kind === 'earth' ? 'Earth' : 'Blossom Haven'
  /** The colours of a picture, in steps of 8: an empty picture (one plain disc) has very few. -1 when the picture has no address. */
  const painted = selector => evaluate(`(async () => { const image = document.querySelector(${JSON.stringify(selector)}); if (!image || !image.getAttribute('src')) return -1; await image.decode().catch(() => {}); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 48; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 48, 48); const data = context.getImageData(0, 0, 48, 48).data, colours = new Set(); for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 120) colours.add((data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | data[i + 2] >> 3); return colours.size })()`)
  /** Clicks Begin, and waits for the welcome card: it fades in 0.7 s of real time (src/style.css), while the game time of the check runs at once. */
  async function begin() {
    await evaluate('document.querySelector("#begin-button").click()')
    await delay(900)
  }
  /** Flies over the nearest herd of a kind (in a zone), then to one of its animals, `up` m over the ground, and hovers. */
  async function visit(kind, up = 3, zone) {
    const [place] = await evaluate(`__fairyTest.herdPlaces(${JSON.stringify(kind)}, 1, ${zone ? JSON.stringify(zone) : 'undefined'})`)
    assert(place, `No herd of ${kind}`)
    await evaluate(`__fairyTest.placeOver(${JSON.stringify(place.world)}, ${JSON.stringify(place.direction)}, ${Math.max(up, 25)})`)
    if (!(await snapshot()).hoverHeld) await evaluate('document.querySelector("#hover-toggle").click()')
    await advance(0.1)
    if (up < 25) {
      const name = await evaluate(`(() => { const w = __fairyTest.snapshot().wildlife.find(w => w.world === ${JSON.stringify(worldName(place.world))}); const m = w.visible.filter(m => m.name.startsWith('creature-${kind}-')).sort((a, b) => a.distance - b.distance)[0]; return m ? m.name : null })()`)
      assert(name, `No ${kind} near its herd`)
      await evaluate(`__fairyTest.approach(${JSON.stringify(name)}, 12, ${up}, true, 2.5)`)
    }
    await advance(1.5)
    return place
  }
  /** The draw calls, the animals and the audit of the view of this moment, against the limits of the device. */
  async function view(name, world, device) {
    const calls = await evaluate('__fairyTest.wildlifeCalls()')
    const stats = (await snapshot()).wildlife.find(item => item.world === world).stats
    const audit = await evaluate('__fairyTest.wildlifeAudit()')
    const wrong = audit.filter(item => !item.ok)
    await capture(`${device}-${name}`)
    assert(calls.animals <= LIMITS[device].calls, `${name} on a ${device}: ${calls.animals} draw calls for the animals, more than ${LIMITS[device].calls}`)
    assert(stats.drawn <= LIMITS[device].cap, `${name} on a ${device}: ${stats.drawn} animals, more than ${LIMITS[device].cap}`)
    assert(!wrong.length, `${name} on a ${device}: animals out of their place: ${JSON.stringify(wrong.slice(0, 4))}`)
    return { calls: calls.animals, frame: calls.with, drawn: stats.drawn, kinds: stats.kinds.length, audited: audit.length }
  }
  /** The five views of a device. */
  async function views(device) {
    const mobile = device === 'phone', result = {}
    await load({ mobile })
    await begin()
    await advance(1)
    assert((await snapshot()).graphics.mobile === mobile, `The ${device} check does not run as a ${device}`)
    result.start = await view('start', 'Earth', device)
    await visit('zebra', 4, 'savanna')
    result.savanna = await view('savanna', 'Earth', device)
    await visit('zebra', 30, 'savanna')
    result.over = await view('savanna-30m', 'Earth', device)
    await visit('cow', 4)
    result.meadow = await view('leaf-forest', 'Earth', device)
    await evaluate('document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click()')
    await advance(1)
    await evaluate('__fairyTest.arriveHome()')
    for (let i = 0; i < 10 && !(await snapshot()).found; i++) await advance(0.5)
    await visit('gummyBear', 4)
    result.grove = await view('grove', 'Blossom Haven', device)
    return result
  }

  // ---- The herds, the motion and the pause ----------------------------------------------------------
  step('herds')
  await load({ width: 1440, height: 900 })
  const initial = await snapshot()
  if (initial.wildlife.length !== 2) throw new Error('Wildlife must exist on exactly Earth and Blossom Haven')
  for (const population of initial.wildlife) {
    // The catalog has 31 kinds of Earth and 17 of Blossom Haven (src/creatures/catalog.ts); a kind with no place on this Earth can be missing.
    if (population.kinds.length < (population.world === 'Earth' ? 25 : 10) || population.total < 150) throw new Error(`Missing kinds on ${population.world}: ${population.kinds.length} kinds, ${population.total} animals`)
  }
  const earth = initial.wildlife.find(w => w.world === 'Earth')
  if (!earth.visible.length) throw new Error('No wildlife near the initial meadow')
  // A herd rests 2 to 5 s between two walks: the check waits up to 9 s for a move.
  await evaluate('document.querySelector("#begin-button").click()')
  let changed = false
  for (let i = 0; i < 3 && !changed; i++) {
    await advance(3)
    const moving = (await snapshot()).wildlife.find(w => w.world === 'Earth')
    changed = moving.visible.some(m => earth.visible.some(a => a.name === m.name && JSON.stringify(a.position) !== JSON.stringify(m.position)))
  }
  if (!changed) throw new Error('Creatures did not move during flight')
  await evaluate('document.querySelector("#pause-toggle").click(); advanceGame(0.5)')
  const beforePause = (await snapshot()).wildlife.find(w => w.world === 'Earth')
  await evaluate('advanceGame(2)')
  const afterPause = (await snapshot()).wildlife.find(w => w.world === 'Earth')
  for (const model of afterPause.visible) {
    const before = beforePause.visible.find(m => m.name === model.name)
    if (before && JSON.stringify(before.position) !== JSON.stringify(model.position)) throw new Error('Creature moved while paused')
  }
  await capture('wildlife-in-game')
  if (earth.visible.some(model => model.fairytale)) throw new Error('Earth must keep its animals')

  // ---- Blossom Haven: follow the flower guide home, then the creatures and the pegasus foals ----------
  step('Blossom Haven')
  await load({ width: 1440, height: 900 })
  await evaluate('document.querySelector("#begin-button").click(); document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceGame(0.05)')
  let home
  for (let i = 0; i < 150; i++) {
    await evaluate('advanceGame(2)')
    home = await snapshot()
    if (home.found && !home.guided) break
  }
  if (!home.found) throw new Error('The fairy did not reach Blossom Haven')
  await evaluate('advanceGame(1)')
  home = await snapshot()
  const haven = home.wildlife.find(w => w.world === 'Blossom Haven')
  const cast = [...new Set(haven.visible.map(model => model.fairytale))]
  if (!haven.visible.length || cast.includes(null)) throw new Error(`Blossom Haven must show only its own creatures: ${JSON.stringify(cast)}`)
  if (!home.candy.includes('pegasus-foals')) throw new Error('The pegasus foals are missing')
  await capture('wildlife-blossom-fairytale')

  // ---- The seasons: the storks travel, and the bees fly only in Blossom time --------------------------
  step('seasons')
  // Each stork herd shows when the season of its place allows it: spring and summer in the leaf forest,
  // autumn and winter in the savanna. Near the equator a savanna follows the season of its half (seasonFor() of
  // src/creatures/rules.ts). On each Earth some herds show and some do not, in each half of the year.
  const storks = {}
  for (const [name, year] of [['summer', 0.3], ['winter', 0.8]]) {
    await load({ query: `?test&weather=clear&year=${year}` })
    await evaluate('document.querySelector("#begin-button").click()')
    await advance(1)
    const places = await evaluate(`__fairyTest.herdPlaces('stork', 200)`)
    const wanted = place => (place.zone === 'temperate' ? ['spring', 'summer'] : ['autumn', 'winter']).includes(place.season)
    const north = places.filter(place => place.latitude > 0 && place.zone === 'temperate')
    storks[name] = { herds: places.length, shown: places.filter(place => place.shown).length, wrong: places.filter(place => place.shown !== wanted(place)).length, northLeafForest: north.filter(place => place.shown).length }
  }
  assert(storks.summer.herds && !storks.summer.wrong && !storks.winter.wrong, `The storks do not follow the seasons of their places: ${JSON.stringify(storks)}`)
  assert(storks.summer.northLeafForest > 0 && storks.winter.northLeafForest === 0, `The storks of the north are not in the leaf forest in summer only: ${JSON.stringify(storks)}`)
  const bees = {}
  for (const [name, magic] of [['blossom', 0], ['bubble', 0.25]]) {
    await load({ query: `?test&weather=clear&magic=${magic}` })
    await advance(1)
    // A season starts at the cottage and goes out over the planet in a ring: each herd has the magic season of its place.
    const places = await evaluate(`__fairyTest.herdPlaces('honeyBee', 200)`)
    bees[name] = { out: places.filter(place => place.shown).length, wrong: places.filter(place => place.shown !== (place.season === 'blossom')).length, total: places.length }
  }
  // A herd shows only in Blossom time at its place; on some loads no bee herd is in the ring of Blossom time.
  assert(bees.blossom.total && !bees.blossom.wrong && !bees.bubble.wrong && bees.blossom.out + bees.bubble.out > 0 && bees.blossom.out < bees.blossom.total, `The bees do not follow Blossom time: ${JSON.stringify(bees)}`)

  // ---- The pictures: the note of a new card, the gift note, and each card of the book ----------------
  step('pictures')
  // The earlier steps saved their hellos: the friend starts again with no hello.
  await evaluate('localStorage.removeItem("fairy-friend")')
  await load()
  await begin()
  // The fairy goes 30 m up at once, where no animal says hello: the check gives each hello.
  await evaluate(`(() => { const world = __fairyTest.world('earth'); const here = world.group.position.clone().fromArray(__fairyTest.snapshot().fairy).sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert()).normalize(); __fairyTest.placeOver('earth', here.toArray(), 30) })()`)
  if (!(await snapshot()).hoverHeld) await evaluate('document.querySelector("#hover-toggle").click()')
  await advance(0.5)
  const notes = {}
  /** Waits for a note (of a kind, or of any kind with null), and reads the colours of its picture. */
  async function notePicture(kind, label) {
    for (let t = 0; t < 30; t += 0.25) {
      if (await evaluate(`!document.querySelector('#friend-note').hidden && (${JSON.stringify(kind)} === null || document.querySelector('#friend-note h2').textContent === ${JSON.stringify(kind)}) && document.querySelector('#friend-note small').textContent === ${JSON.stringify(label)}`)) {
        kind ??= await evaluate(`document.querySelector('#friend-note h2').textContent`)
        notes[`${label}: ${kind}`] = await painted('#friend-note img')
        // The note pops in for 0.6 s of real time (src/friend.css): the picture of the check waits for it.
        await delay(700)
        await capture(`note-${kind}`)
        return notes[`${label}: ${kind}`]
      }
      await advance(0.25)
    }
    throw new Error(`No note "${label}" for the ${kind}`)
  }
  // A hello of the camel, then the hellos that are missing to five hearts: the camel note, then the gift note.
  const before = (await snapshot()).friend.hellos
  assert(before < 4, `Too many hellos before the camel: ${before}`)
  await evaluate('__fairyTest.meet("camel")')
  assert(await notePicture('Camel', 'NEW IN YOUR ANIMAL BOOK') > 20, `The note of a new card has an empty picture: ${JSON.stringify(notes)}`)
  await evaluate(`__fairyTest.meet(${JSON.stringify(['zebra', 'whale', 'penguin', 'owlet'].slice(0, 4 - before)).slice(1, -1)})`)
  assert(await notePicture(null, 'A NEW FRIEND') > 20, `The gift note has an empty picture: ${JSON.stringify(notes)}`)
  // Each card of the book, on both pages: a picture of its model.
  await load({ query: '?test&weather=clear&friend=all' })
  await begin()
  await advance(0.5)
  await evaluate('document.querySelector("#open-map").click(); document.querySelector("#tab-animals").click()')
  const empty = []
  let cards = 0
  for (const world of ['earth', 'fairy']) {
    await evaluate(`document.querySelector('.animal-world[data-book-world="${world}"]').click()`)
    for (let i = 0; i < 300 && !(await evaluate('[...document.querySelectorAll(".animal-book-page:not([hidden]) .animal-card img")].every(image => image.getAttribute("src") && image.complete)')); i++) await delay(50)
    const kinds = await evaluate('[...document.querySelectorAll(".animal-book-page:not([hidden]) .animal-card")].map(card => card.dataset.animal)')
    for (const kind of kinds) {
      cards++
      const colours = await painted(`[data-animal="${kind}"] img`)
      if (colours <= 20) empty.push(`${kind}: ${colours}`)
    }
    await capture(`book-${world}`)
  }
  assert(cards === 48 && !empty.length, `Cards with an empty picture (${cards} cards): ${empty.join(', ')}`)

  // ---- The limits of the draw calls and the places of the animals, on a computer and on a phone --------
  step('computer views')
  const computer = await views('computer')
  step('phone views')
  const phone = await views('phone')
  const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 0, `The page scrolls sideways on a phone: ${overflow}`)

  if (errors.length) throw new Error(JSON.stringify(errors))
  console.log(JSON.stringify({
    populations: initial.wildlife.map(({ world, total, herds, kinds }) => ({ world, total, herds, kinds: kinds.length })),
    visibleAtStart: earth.visible.length, blossomCast: cast, movement: 'passed', pause: 'passed', storks, bees, pictures: { notes, cards },
    computer, phone, runtimeExceptions: errors.length,
  }))
} finally { ws?.close(); browser.kill() }
