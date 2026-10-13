// Checks the fairy friend (F19) in the real game: five hellos on Earth give the friend and its
// note, the friend is no creature of the world, a reload keeps it, the look menu selects a
// different friend and "No friend", the friend stays near her in a climb from the meadow to open
// space and back, each of the nine kinds shows, a pegasus foal of Blossom Haven says hello, the
// reset in Settings removes the friend, and a phone at 390 px shows it. The check also reads the
// draw calls with and without the friend. Run against the dev server:
//   node scripts/friend-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'friend-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const folder = 'artifacts.local/friend'
const KINDS = ['cow', 'rabbit', 'sheep', 'duck', 'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus']
const NAMES = { cow: 'Cow', rabbit: 'Rabbit', sheep: 'Sheep', duck: 'Duck', unicorn: 'Unicorn', dragonling: 'Dragonling', kitsune: 'Kitsune kit', frogPrince: 'Frog Prince', pegasus: 'Pegasus foal' }
// The friend is never farther than this from the fairy, in metres (FRIEND.limit in src/friend.ts).
const LIMIT = 4
let ws
try {
  let tabs
  for (let i = 0; i < 80; i++) {
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
  const advance = (seconds, drawAll = false) => evaluate(`advanceGame(${seconds}, ${drawAll})`)
  /** True when a picture shows a thing: it has many colours. */
  const painted = selector => evaluate(`(() => { const image = document.querySelector(${JSON.stringify(selector)}), canvas = document.createElement('canvas'); canvas.width = canvas.height = 48; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 48, 48); const data = context.getImageData(0, 0, 48, 48).data, colours = new Set(); for (let i = 0; i < data.length; i += 4) colours.add((data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | data[i + 2] >> 3); return colours.size })()`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const key = (code, down) => evaluate(`window.dispatchEvent(new KeyboardEvent(${JSON.stringify(down ? 'keydown' : 'keyup')}, { code: ${JSON.stringify(code)} }))`)
  const choose = kind => evaluate(`__fairyTest.chooseFriend(${JSON.stringify(kind)})`)
  const saved = () => evaluate('JSON.parse(localStorage.getItem("fairy-friend"))')
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await mkdir(folder, { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${folder}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await send('Runtime.enable'); await send('Page.enable')
  // Simulation time is in the hands of the check. Only the last frame of each step draws.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.gameFrame = callback; return 1; };
    window.advanceGame = (seconds, drawAll) => {
      window.testTime ??= performance.now();
      // A picture of a friend is a render in the frame of its hello, so the frames of a hello draw.
      if (drawAll) { for (let i = 0; i < Math.ceil(seconds * 60); i++) window.gameFrame(window.testTime += 1000 / 60); return; }
      const gl = document.querySelector('#scene canvas').getContext('webgl2');
      const draw = gl.drawElements, instances = gl.drawElementsInstanced, arrays = gl.drawArrays;
      try {
        gl.drawElements = () => {}; gl.drawElementsInstanced = () => {}; gl.drawArrays = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60) - 1; i++) window.gameFrame(window.testTime += 1000 / 60);
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; gl.drawArrays = arrays; }
      window.gameFrame(window.testTime += 1000 / 60);
    };
  ` })
  async function load(mobile, query = '?test&weather=clear') {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    } else {
      await send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
    }
    await send('Page.navigate', { url: `${origin}/${query}` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.gameFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  const population = (state, world) => state.wildlife.find(item => item.world === world)
  /** The local direction of the fairy on a world, for placeOver(). */
  const directionOn = kind => evaluate(`(() => { const world = __fairyTest.world(${JSON.stringify(kind)}); return world.group.position.clone().fromArray(__fairyTest.snapshot().fairy).sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert()).normalize().toArray() })()`)
  /** Puts the fairy `height` m over the place where she is, and makes her hover or fly. */
  async function over(kind, height, hover = true) {
    await evaluate(`__fairyTest.placeOver(${JSON.stringify(kind)}, ${JSON.stringify(await directionOn(kind))}, ${height})`)
    if ((await snapshot()).hoverHeld !== hover) await click('#hover-toggle')
  }
  /** True when the friend is in the picture: its middle is inside the view. */
  const inView = friend => Math.abs(friend.screen[0]) < 0.96 && Math.abs(friend.screen[1]) < 0.96 && friend.screen[2] < 1
  /** The draw calls of a frame with the friend and with no friend, at the same place. The fairy hovers, so the view stays. */
  async function drawCalls(kind) {
    const read = async value => { await choose(value); await advance(0.5); return (await snapshot()).graphics.calls }
    let best = null
    for (let i = 0; i < 4; i++) {
      const without = await read(null), friend = await read(kind), again = await read(null)
      best = { with: friend, without }
      // The view did not change between the two reads with no friend: the difference is the friend.
      if (without === again) break
    }
    await choose(kind)
    return best
  }

  // ---- Earth: five hellos give the friend and the note -----------------------------------------
  step('five hellos')
  await load(false)
  await click('#begin-button')
  await advance(1)
  let state = await snapshot()
  assert(!state.friend.gift || state.friend.hellos === 5, `Wrong start: ${JSON.stringify(state.friend)}`)
  const totalBefore = population(state, 'Earth').total
  let gift = null, tries = 0
  const used = new Set()
  while (!gift && tries++ < 40) {
    state = await snapshot()
    const next = population(state, 'Earth').visible.filter(model => /^creature-(rabbit|sheep|cow)-/.test(model.name) && !used.has(model.name)).sort((a, b) => a.distance - b.distance)[0]
    if (!next) { used.clear(); await advance(8); continue }
    used.add(next.name)
    assert(await evaluate(`__fairyTest.approach(${JSON.stringify(next.name)}, 9, 2.4, false)`), 'The fairy could not fly to the animal')
    for (let t = 0; t < 2.5 && !gift; t += 0.1) {
      await advance(0.1, true)
      const friend = (await snapshot()).friend
      if (friend.hellos < 5) assert(!friend.shown && !friend.row && !friend.note && !friend.gift, `The friend came before five hellos: ${JSON.stringify(friend)}`)
      else gift = friend
    }
  }
  assert(gift, `No friend after ${tries} passes: ${JSON.stringify((await snapshot()).friend)}`)
  assert(gift.gift && gift.shown && gift.friend && gift.met.includes(gift.friend) && gift.kind === gift.friend, `The fifth hello gave no friend: ${JSON.stringify(gift)}`)
  await advance(0.3)
  state = await snapshot()
  assert(state.friend.note && state.friend.noteName === NAMES[state.friend.friend], `No note of the new friend: ${JSON.stringify(state.friend)}`)
  assert(await evaluate('document.querySelector("#friend-note p").textContent') === 'A friend flies with you now', 'Wrong text in the note')
  assert(await evaluate('getComputedStyle(document.querySelector("#friend-note")).visibility') === 'visible', 'The note does not show in the flight')
  assert(await painted('#friend-note img') > 20, 'The note has no picture of the friend')
  // No count shows: the child sees only the gift.
  assert(!(await evaluate('document.querySelector("#friend-note").textContent')).match(/\d/), 'The note shows a number')
  await capture('gift')
  const first = state.friend.friend, met = state.friend.met
  assert(JSON.stringify(await saved()) === JSON.stringify({ hellos: 5, met, friend: first }), `Wrong saved state: ${JSON.stringify(await saved())}`)

  // The friend is no creature of the world: the count of the residents stays, and the friend says no hello.
  step('the friend is no resident')
  await over('earth', 30)
  await advance(10)
  state = await snapshot()
  assert(population(state, 'Earth').total === totalBefore, 'The friend changed the number of the residents')
  assert(!state.wildlife.some(item => item.visible.some(model => /friend/.test(model.name))), 'The friend is in the list of the creatures')
  const quiet = state.hellos
  await advance(10)
  state = await snapshot()
  assert(state.hellos === quiet && state.friend.hellos === 5, `A hello started with no creature near: ${state.hellos} after ${quiet}`)
  // The note goes after 6 s of real time, as the sticker note does.
  for (let i = 0; i < 80 && (await snapshot()).friend.note; i++) await delay(100)
  assert(!(await snapshot()).friend.note, 'The note did not go')
  assert(state.friend.farthest < LIMIT && inView(state.friend), `The friend is not at her side in a hover: ${JSON.stringify(state.friend)}`)

  // A happy loop, and not a second loop in the next 20 s.
  step('happy loop')
  await advance(12)
  assert(await evaluate('__fairyTest.cheer()'), 'No happy loop after 20 s')
  let looped = 0
  for (let t = 0; t < 1.6; t += 0.1) { await advance(0.1); looped = Math.max(looped, (await snapshot()).friend.loop) }
  assert(looped > 3, `The friend did not go around her: ${looped}`)
  assert(!(await evaluate('__fairyTest.cheer()')), 'A second loop started at once')
  await advance(1)
  state = await snapshot()
  assert(state.friend.loop === 0 && state.friend.farthest < LIMIT, `The loop took the friend too far: ${state.friend.farthest}`)

  // ---- The look menu: a different friend, and "No friend" --------------------------------------
  step('look menu')
  // The row needs two friends: give a duck when all the hellos came from one kind.
  if (met.length < 2) { await evaluate('__fairyTest.meet("duck")'); await advance(0.1, true) }
  state = await snapshot()
  const other = state.friend.met.find(kind => kind !== first)
  await click('#customize-toggle')
  await advance(1.5)
  state = await snapshot()
  assert(state.friend.row && JSON.stringify(state.friend.buttons) === JSON.stringify([...KINDS.filter(kind => state.friend.met.includes(kind)), 'none']), `Wrong Friend row: ${JSON.stringify(state.friend.buttons)}`)
  assert(state.friend.more, 'The row does not say that she can meet more friends')
  assert(await evaluate(`document.querySelector('[data-friend="${first}"]').getAttribute('aria-pressed')`) === 'true', 'The row does not mark her friend')
  for (const kind of state.friend.met) assert(await painted(`[data-friend="${kind}"] img`) > 20, `The button of the ${kind} has no picture`)
  assert(await evaluate('getComputedStyle(document.querySelector("#friend-note")).visibility') !== 'visible' || !state.friend.note, 'The note covers the look menu')
  await click(`[data-friend="${other}"]`)
  await advance(1.5)
  state = await snapshot()
  assert(state.friend.kind === other && state.friend.shown, `The row did not select the ${other}: ${JSON.stringify(state.friend)}`)
  assert(await evaluate(`document.querySelector('[data-friend="${other}"]').getAttribute('aria-pressed')`) === 'true', 'The row does not mark the new friend')
  // The friend shows in the menu, at the left of the panel.
  const panel = await evaluate('document.querySelector("#customizer").getBoundingClientRect().left')
  const friendX = (state.friend.screen[0] + 1) / 2 * 1280
  assert(inView(state.friend) && friendX < panel - 30, `The friend is not in the view of the look menu: ${friendX} px, panel at ${panel} px`)
  await capture('menu-friend')
  await click('[data-friend="none"]')
  await advance(0.5)
  state = await snapshot()
  assert(!state.friend.shown && state.friend.friend === null && state.friend.gift, `"No friend" did not hide the friend: ${JSON.stringify(state.friend)}`)
  await capture('menu-no-friend')
  await click('#customizer-close')

  // ---- A reload keeps the choice -----------------------------------------------------------------
  step('reload')
  await load(false)
  state = await snapshot()
  assert(state.friend.gift && !state.friend.shown && state.friend.friend === null && state.friend.row, `A reload did not keep "No friend": ${JSON.stringify(state.friend)}`)
  await choose(other)
  await load(false)
  state = await snapshot()
  assert(state.friend.shown && state.friend.kind === other && state.friend.hellos === 5, `A reload did not keep the friend: ${JSON.stringify(state.friend)}`)
  // The friend is at her side on the welcome screen, before the flight starts.
  await advance(0.2)
  state = await snapshot()
  assert(state.friend.scale > 0.9 && state.friend.distance < LIMIT && inView(state.friend), `The friend of the saved game does not show at the start: ${JSON.stringify(state.friend)}`)
  await capture('reload-welcome')
  // A broken saved value gives a game with no friend, and no error.
  await evaluate('localStorage.setItem("fairy-friend", "{not json")')
  await load(false)
  state = await snapshot()
  assert(!state.friend.gift && !state.friend.shown && state.friend.hellos === 0, `A broken saved value gave a friend: ${JSON.stringify(state.friend)}`)

  // ---- Each kind as a friend, and the draw calls on a computer -----------------------------------
  step('nine friends')
  await evaluate(`__fairyTest.meet(${KINDS.map(kind => JSON.stringify(kind)).join(', ')})`)
  await click('#begin-button')
  await advance(1)
  state = await snapshot()
  assert(state.friend.friend === 'unicorn' && state.friend.met.length === 9 && !state.friend.more, `Wrong friend after a hello of each kind: ${JSON.stringify(state.friend)}`)
  await over('earth', 9)
  await advance(7)
  const models = {}
  for (const kind of KINDS) {
    assert(await choose(kind), `Could not select the ${kind}`)
    await advance(1.2)
    state = await snapshot()
    assert(state.friend.kind === kind && state.friend.calls === 3, `The ${kind} is not three draw calls: ${state.friend.calls}`)
    assert(inView(state.friend) && state.friend.screen[0] > 0.1 && state.friend.distance < LIMIT, `The ${kind} is not at her right side: ${JSON.stringify(state.friend.screen)}`)
    models[kind] = state.friend.flies ? 'wings' : 'bubble'
    await capture(`earth-${kind}`)
  }
  const computer = await drawCalls('cow')
  assert(computer.with - computer.without <= 3 && computer.with > computer.without, `Wrong draw calls of the friend on a computer: ${JSON.stringify(computer)}`)

  // A low flight over the ground: the friend stays out of the ground and near her.
  step('low flight')
  await over('earth', 2.4, false)
  let lowest = Infinity
  for (let t = 0; t < 8; t += 0.5) {
    if (t === 2) await key('KeyA', true)
    if (t === 5) { await key('KeyA', false); await key('KeyD', true) }
    await advance(0.5)
    const height = await evaluate(`(() => { const world = __fairyTest.world('earth'), friend = __fairyTest.snapshot().friend; const at = world.group.position.clone().fromArray(friend.position).sub(world.group.position); const local = at.clone().applyQuaternion(world.group.quaternion.clone().invert()).normalize(); return at.length() - world.radius - Math.max(0, world.sample(local.x, local.y, local.z).height) })()`)
    lowest = Math.min(lowest, height)
    if (t === 3.5) await capture('earth-low-turn')
  }
  await key('KeyD', false)
  state = await snapshot()
  assert(lowest > 0.9, `The friend went into the ground: ${lowest} m over it`)
  assert(state.friend.farthest < LIMIT, `The friend left her in the low flight: ${state.friend.farthest}`)

  // ---- The climb from the meadow to open space, and back -----------------------------------------
  step('climb to open space')
  const climb = { near: 0, space: 0, boost: 0, back: 0, speed: 0 }
  await key('KeyW', true)
  for (let t = 0; t < 60; t += 0.5) {
    await advance(0.5)
    state = await snapshot()
    climb.near = Math.max(climb.near, state.friend.farthest)
    if (state.belt.region === 'Open space') break
  }
  await key('KeyW', false)
  assert(state.belt.region === 'Open space', `The fairy did not reach open space: ${state.belt.region}`)
  for (let t = 0; t < 8; t += 0.5) {
    await advance(0.5)
    state = await snapshot()
    climb.space = Math.max(climb.space, state.friend.farthest)
    climb.speed = Math.max(climb.speed, Number(await evaluate('document.querySelector("#speed-value").textContent')))
  }
  assert(inView(state.friend), 'The friend is not in the view in open space')
  await capture('space-cow')
  await choose('pegasus')
  await key('ShiftLeft', true)
  for (let t = 0; t < 5; t += 0.5) {
    if (t === 2) await key('KeyA', true)
    await advance(0.5)
    state = await snapshot()
    climb.boost = Math.max(climb.boost, state.friend.farthest)
    climb.speed = Math.max(climb.speed, Number(await evaluate('document.querySelector("#speed-value").textContent')))
  }
  assert(state.boosted && inView(state.friend), 'The friend is not in the view in a boost')
  await capture('space-pegasus-boost')
  await key('KeyA', false); await key('ShiftLeft', false)
  assert(climb.speed > 2000, `The fairy did not reach the boost speed of open space: ${climb.speed} m/s`)
  // Back to Earth with a guided flight.
  await evaluate('document.querySelector("[data-world=earth]").click(); document.querySelector("#world-fly").click()')
  let landed = false
  for (let t = 0; t < 240 && !landed; t += 0.5) {
    await advance(0.5)
    state = await snapshot()
    climb.back = Math.max(climb.back, state.friend.farthest)
    landed = state.belt.nearest === 'Earth' && state.destination === null && /m above/.test(await evaluate('document.querySelector("#planet-distance").textContent'))
  }
  assert(landed, `The fairy did not come back to Earth: ${state.belt.nearest}, ${state.belt.region}`)
  await advance(3)
  state = await snapshot()
  climb.back = Math.max(climb.back, state.friend.farthest)
  for (const [part, distance] of Object.entries(climb)) if (part !== 'speed') assert(distance > 0.5 && distance < LIMIT, `The friend was ${distance} m from her in the part "${part}"`)
  assert(state.friend.shown && inView(state.friend), 'The friend is not with her after the return')
  await capture('earth-return')

  // ---- Reduced motion: no loop ----------------------------------------------------------------------
  step('reduced motion')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await advance(25)
  assert(!(await evaluate('__fairyTest.cheer()')), 'A loop started with reduced motion')
  await advance(0.5)
  const stillA = (await snapshot()).friend
  await advance(0.7)
  const stillB = (await snapshot()).friend
  assert(stillA.loop === 0 && Math.abs(stillA.distance - stillB.distance) < 0.02, `The friend bobs with reduced motion: ${stillA.distance}, ${stillB.distance}`)
  await send('Emulation.setEmulatedMedia', { features: [] })

  // ---- The reset in Settings removes the friend ----------------------------------------------------
  step('reset')
  await click('#settings-toggle')
  assert(!(await evaluate('document.querySelector("#reset-stickers").disabled')), 'The reset is not ready with a friend in the game')
  await click('#reset-stickers')
  assert((await evaluate('document.querySelector("#reset-detail").textContent')).includes('fairy friend'), 'The reset does not say that the friend goes')
  await click('#reset-yes')
  await click('#close-settings')
  await advance(0.5)
  state = await snapshot()
  assert(!state.friend.shown && !state.friend.gift && state.friend.hellos === 0 && !state.friend.met.length && !state.friend.row, `The reset kept the friend: ${JSON.stringify(state.friend)}`)
  assert(JSON.stringify(await saved()) === JSON.stringify({ hellos: 0, met: [], friend: null }), 'The reset did not save the empty state')

  // ---- Blossom Haven: a pegasus foal says hello ------------------------------------------------------
  step('Blossom Haven')
  await load(false)
  await evaluate('document.querySelector("#begin-button").click(); document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click()')
  // The guided flight is long, so a test hook puts the fairy at the end of the flower guide.
  await advance(1)
  await evaluate('__fairyTest.arriveHome()')
  for (let i = 0; i < 10; i++) {
    await advance(0.5)
    state = await snapshot()
    if (state.found && !state.guided) break
  }
  assert(state.found, 'The fairy did not reach Blossom Haven')
  assert(state.foalHellos && state.foalHellos.count === 0 && !state.friend.met.includes('pegasus'), `A foal said hello before the fairy came: ${JSON.stringify(state.foalHellos)}`)
  // She flies to a foal over the cottage garden, from 9 m away at its height.
  await evaluate(`(() => {
    const world = __fairyTest.world('fairy'), foal = world.surface.getObjectByName('pegasus-foal-0')
    const at = foal.getWorldPosition(foal.position.clone()), up = at.clone().sub(world.group.position).normalize()
    const side = up.clone().cross(up.clone().set(0.3, 0.2, 0.9).normalize()).normalize()
    __fairyTest.place(at.clone().addScaledVector(side, 9).toArray(), at.toArray())
  })()`)
  let foal = null
  for (let t = 0; t < 3 && !foal; t += 0.1) {
    await advance(0.1)
    state = await snapshot()
    if (state.foalHellos.count > 0) foal = state
  }
  assert(foal, 'No pegasus foal said hello')
  assert(foal.friend.met.includes('pegasus') && foal.friend.hellos >= 1, `The hello of the foal did not count: ${JSON.stringify(foal.friend)}`)
  // The picture: she hovers, so the camera comes level, and the hearts are over the foal.
  await click('#hover-toggle')
  await advance(1.1)
  await capture('haven-foal-hello')
  // Each kind that lives here: a unicorn, a pegasus foal and a guest from Earth over the candy gardens.
  await evaluate(`__fairyTest.meet(${KINDS.map(kind => JSON.stringify(kind)).join(', ')})`)
  await over('fairy', 9)
  await advance(8)
  for (const kind of ['pegasus', 'unicorn', 'frogPrince', 'sheep']) {
    await choose(kind)
    await advance(1.2)
    state = await snapshot()
    assert(state.friend.kind === kind && inView(state.friend) && state.friend.distance < LIMIT, `The ${kind} is not at her side over Blossom Haven`)
    await capture(`haven-${kind}`)
  }
  // A hop of Blossom Haven carries the fairy far in one frame. The friend goes with her at once.
  await over('fairy', 9, false)
  await advance(1)
  await snapshot()
  const beforeHop = (await snapshot()).home
  assert(await evaluate('__fairyTest.hop()'), 'Blossom Haven did not hop')
  await advance(0.1)
  state = await snapshot()
  const hop = Math.hypot(...state.home.map((value, index) => value - beforeHop[index]))
  assert(hop > 500 && state.friend.farthest < LIMIT && state.friend.distance < LIMIT, `The friend stayed behind at the hop of ${hop} m: ${state.friend.farthest}`)

  // ---- Phone: the friend in the view at 390 px, and the draw calls ----------------------------------
  step('phone')
  await load(true)
  await click('#begin-button')
  await advance(1)
  state = await snapshot()
  assert(state.graphics.mobile, 'The phone check does not run as a phone')
  assert(state.friend.shown && state.friend.kind === 'sheep', `The phone did not load the friend: ${JSON.stringify(state.friend)}`)
  await over('earth', 9)
  await advance(7)
  for (const kind of ['cow', 'duck', 'frogPrince', 'pegasus']) {
    await choose(kind)
    await advance(1.2)
    state = await snapshot()
    assert(state.friend.kind === kind && state.friend.calls === 3, `The ${kind} is not three draw calls on a phone: ${state.friend.calls}`)
    assert(inView(state.friend) && state.friend.screen[0] > 0.1 && state.friend.distance < LIMIT, `The ${kind} is not in the view of a phone: ${JSON.stringify(state.friend.screen)}`)
    await capture(`phone-${kind}`)
  }
  const phone = await drawCalls('cow')
  assert(phone.with - phone.without <= 3 && phone.with > phone.without, `Wrong draw calls of the friend on a phone: ${JSON.stringify(phone)}`)
  await click('#customize-toggle')
  await advance(1.5)
  state = await snapshot()
  // On a phone the panel of the look menu covers the view, so the marked button shows her choice.
  assert(state.friend.row && await evaluate(`document.querySelector('[data-friend="cow"]').getAttribute('aria-pressed')`) === 'true', 'The look menu of a phone does not mark her friend')
  await capture('phone-menu')
  await click('#customizer-close')
  const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 0, `The page scrolls sideways on a phone: ${overflow}`)

  assert(!errors.length, JSON.stringify(errors))
  const metres = value => +value.toFixed(2)
  console.log(JSON.stringify({
    gift: { friend: first, met, passes: tries },
    menu: { selected: other, noFriend: 'passed', reload: 'passed', brokenValue: 'passed' },
    models,
    farthest: { lowTurn: 'below 4', climb: metres(climb.near), openSpace: metres(climb.space), boost: metres(climb.boost), guidedReturn: metres(climb.back), topSpeed: climb.speed, hop: Math.round(hop) },
    lowestOverGround: metres(lowest),
    drawCalls: { computer, phone },
    foalHello: 'passed', reset: 'passed', reducedMotion: 'passed', loop: metres(looped),
    screenshots: folder, runtimeExceptions: errors.length,
  }))
} finally { ws?.close(); browser.kill() }
