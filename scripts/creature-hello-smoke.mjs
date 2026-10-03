// Checks the creature hello (F3) in the real game: on Earth, the fairy flies low past an
// animal, and the animal hops on its ground and sends up hearts. The check also tests the
// chime with the sound on, the pause, the rest time, a fairytale creature on Blossom Haven
// at the end of the flower guide, and the phone (half the hearts, 390 px wide). Run against the dev server:
//   node scripts/creature-hello-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'creature-hello-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const folder = 'artifacts.local/creature-hello'
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
  const advance = seconds => evaluate(`advanceGame(${seconds})`)
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await mkdir(folder, { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${folder}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await send('Runtime.enable'); await send('Page.enable')
  // Simulation time is in the hands of the check. Only the last frame of each step draws.
  // The oscillators record their notes, so the check can hear the chime.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.gameFrame = callback; return 1; };
    window.notes = [];
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) { window.notes.push(this.frequency.value); return start.apply(this, args); };
    window.advanceGame = seconds => {
      window.testTime ??= performance.now();
      const gl = document.querySelector('#scene canvas').getContext('webgl2');
      const draw = gl.drawElements, instances = gl.drawElementsInstanced, arrays = gl.drawArrays;
      try {
        gl.drawElements = () => {}; gl.drawElementsInstanced = () => {}; gl.drawArrays = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60) - 1; i++) window.gameFrame(window.testTime += 1000 / 60);
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; gl.drawArrays = arrays; }
      window.gameFrame(window.testTime += 1000 / 60);
    };
  ` })
  async function load(mobile) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    } else {
      await send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
    }
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.gameFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")').catch(() => false)) return
      await delay(250)
    }
    throw new Error('The game did not load')
  }
  const population = (state, world) => state.wildlife.find(item => item.world === world)
  /** The visible creature nearest to the fairy, of the given kinds. */
  function nearest(state, world, kinds) {
    return population(state, world).visible.filter(model => kinds.some(kind => model.name.startsWith(`creature-${kind}-`)))
      .sort((a, b) => a.distance - b.distance)[0]?.name
  }
  /** Steps the game until the creature says hello, and keeps the largest hop and the heart count. */
  async function watchHello(world, name, seconds) {
    let seen = null, highest = 0, hearts = 0
    for (let t = 0; t < seconds; t += 0.1) {
      await advance(0.1)
      const state = await snapshot(), group = population(state, world)
      const hello = group.hellos.active.find(item => item.name === name)
      if (hello) {
        seen ??= state
        assert(hello.clearance > 0 && hello.clearance < 0.75, `${name} left its ground in the hello: ${hello.clearance}`)
        highest = Math.max(highest, hello.clearance)
        hearts = Math.max(hearts, group.hellos.hearts)
      } else if (seen) break
    }
    return { seen, highest, hearts }
  }
  /**
   * The picture of a hello: the fairy hovers near a creature, with the creature on her right.
   * The check waits for a young hello of that creature (it can rest from an earlier hello).
   * It returns the number of hearts in the picture.
   */
  async function picture(world, name, file) {
    for (let t = 0; t < 10; t += 0.1) {
      await evaluate(`__fairyTest.approach(${JSON.stringify(name)}, 2.6, 2.4, true, 1.6)`)
      await advance(0.1)
      const group = population(await snapshot(), world)
      const hello = group.hellos.active.find(item => item.name === name)
      if (hello && hello.age > 0.6 && hello.age < 1.1 && group.hellos.hearts > 0) { await capture(file); return group.hellos.hearts }
    }
    throw new Error(`No picture of the hello of ${name}`)
  }

  // ---- Earth: the fairy flies low past an animal ---------------------------------------------
  step('Earth')
  await load(false)
  await evaluate('document.querySelector("#begin-button").click()')
  await advance(1)
  let state = await snapshot()
  assert(state.hellos === 0 && population(state, 'Earth').hellos.count === 0, 'A hello came before the fairy was near')
  // The sound needs a real tap: the browser starts sound only after a user action.
  await evaluate('document.querySelector("#settings-toggle").click()')
  const box = await evaluate('(() => { const r = document.querySelector("#setting-sound + i").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()')
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  for (let i = 0; i < 20 && !(await snapshot()).sound; i++) await delay(100)
  await evaluate('document.querySelector("#close-settings").click()')
  const soundOn = (await snapshot()).sound
  const land = nearest(state, 'Earth', ['rabbit', 'sheep', 'cow'])
  assert(land, 'No land animal is near the start meadow')
  assert(await evaluate(`__fairyTest.approach(${JSON.stringify(land)}, 9, 2.4, false)`), 'The fairy could not fly to the animal')
  await evaluate('window.notes.length = 0')
  const pass = await watchHello('Earth', land, 3)
  assert(pass.seen, `${land} did not say hello when the fairy flew past`)
  assert(pass.highest > 0.25, `${land} did not hop: ${pass.highest}`)
  assert(pass.hearts >= 2 && pass.hearts <= 24, `Wrong heart count on Earth: ${pass.hearts}`)
  const chime = await evaluate('window.notes.filter(note => Math.abs(note - 1046.5) < 0.01 || Math.abs(note - 1318.51) < 0.01).length')
  if (soundOn) assert(chime >= 2, `No hello chime with the sound on: ${chime}`)

  // The picture: the fairy hovers near another animal, and the animal says hello.
  const animal = nearest(await snapshot(), 'Earth', ['rabbit', 'sheep', 'cow'].filter(kind => !land.startsWith(`creature-${kind}-`))) ?? land
  const earthHearts = await picture('Earth', animal, 'earth-hello')

  // Pause: the hop and the hearts hold still, and no hello starts.
  step('pause')
  await evaluate(`__fairyTest.approach(${JSON.stringify(land)}, 3.6, 2.4, true)`)
  await advance(0.2)
  const others = nearest(await snapshot(), 'Earth', ['rabbit', 'sheep', 'cow', 'duck'])
  await evaluate(`__fairyTest.approach(${JSON.stringify(others)}, 3.6, 2.4, true)`)
  await advance(0.3)
  const beforePause = population(await snapshot(), 'Earth')
  await evaluate('document.querySelector("#pause-toggle").click()')
  await advance(2)
  const inPause = population(await snapshot(), 'Earth')
  assert(inPause.hellos.count === beforePause.hellos.count, 'A hello started in the pause')
  assert(JSON.stringify(inPause.hellos.active.map(h => h.age)) === JSON.stringify(beforePause.hellos.active.map(h => h.age)), 'A hello went on in the pause')
  for (const hello of beforePause.hellos.active) {
    const before = beforePause.visible.find(model => model.name === hello.name), after = inPause.visible.find(model => model.name === hello.name)
    assert(before && after && JSON.stringify(before.position) === JSON.stringify(after.position), `${hello.name} moved in the pause`)
  }
  await evaluate('document.querySelector("#pause-toggle").click()')

  // Rest time: the first animal does not say hello again in 8 s, also with the fairy near it.
  step('rest time')
  let again = false
  for (let t = 0; t < 4; t += 0.5) {
    await evaluate(`__fairyTest.approach(${JSON.stringify(land)}, 2.5, 2.4, true)`)
    await advance(0.5)
    const hello = population(await snapshot(), 'Earth').hellos.active.find(item => item.name === land)
    if (hello && hello.age < 0.6) again = true
  }
  assert(!again, `${land} said hello again in its rest time`)
  const earth = population(await snapshot(), 'Earth').hellos.count

  // ---- Blossom Haven: follow the flower guide, then meet a fairytale creature ------------------
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
  await advance(1)
  state = await snapshot()
  const fairytale = nearest(state, 'Blossom Haven', ['rabbit', 'sheep', 'cow'])
  assert(fairytale, 'No fairytale creature near the cottage')
  const kind = population(state, 'Blossom Haven').visible.find(model => model.name === fairytale).fairytale
  assert(await evaluate(`__fairyTest.approach(${JSON.stringify(fairytale)}, 9, 2.4, false)`), 'The fairy could not fly to the creature')
  const haven = await watchHello('Blossom Haven', fairytale, 3)
  assert(haven.seen, `The ${kind} did not say hello`)
  assert(haven.highest > 0.25, `The ${kind} did not hop: ${haven.highest}`)
  // The picture: the home card has gone, and the creature is beside the fairy.
  await advance(4)
  const friend = nearest(await snapshot(), 'Blossom Haven', ['rabbit', 'sheep', 'cow'].filter(k => !fairytale.startsWith(`creature-${k}-`))) ?? fairytale
  const havenHearts = await picture('Blossom Haven', friend, 'blossom-hello')
  const havenState = await snapshot()
  await capture('blossom-hello')
  // A Frog Prince bobs on the water, lower than a hop.
  const frog = nearest(havenState, 'Blossom Haven', ['duck'])
  let bob = null
  if (frog) {
    await evaluate(`__fairyTest.approach(${JSON.stringify(frog)}, 3, 2.4, true)`)
    bob = await watchHello('Blossom Haven', frog, 2)
    if (bob.seen) assert(bob.highest < 0.25, `The Frog Prince hopped instead of a bob: ${bob.highest}`)
  }
  const blossom = population(await snapshot(), 'Blossom Haven').hellos.count

  // ---- Phone: half the hearts, and the layout at 390 px ----------------------------------------
  step('phone')
  await load(true)
  await evaluate('document.querySelector("#begin-button").click()')
  await advance(1)
  state = await snapshot()
  assert(state.graphics.mobile, 'The phone check does not run as a phone')
  const pet = nearest(state, 'Earth', ['rabbit', 'sheep', 'cow'])
  const phoneHearts = await picture('Earth', pet, 'phone-hello')
  // A hello now starts before the fairy arrives, so more than one creature can say hello at the same time.
  const phoneHellos = Math.max(1, population(await snapshot(), 'Earth').hellos.active.length)
  assert(phoneHearts >= 1 && phoneHearts <= 2 * phoneHellos, `A phone hello must show 1 or 2 hearts: ${phoneHearts} hearts for ${phoneHellos} hellos`)
  state = await snapshot()
  const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 0, `The page scrolls sideways on a phone: ${overflow}`)

  assert(!errors.length, JSON.stringify(errors))
  console.log(JSON.stringify({
    earth: { animal: land, hellos: earth, hop: +pass.highest.toFixed(2), hearts: pass.hearts, pictureHearts: earthHearts, sound: soundOn, chimeNotes: chime },
    blossom: { creature: kind, hellos: blossom, hop: +haven.highest.toFixed(2), pictureHearts: havenHearts, frogBob: bob?.seen ? +bob.highest.toFixed(2) : null },
    phone: { hearts: phoneHearts, calls: state.graphics.calls, overflow },
    pause: 'passed', rest: 'passed', screenshots: folder, runtimeExceptions: errors.length,
  }))
} finally { ws?.close(); browser.kill() }
