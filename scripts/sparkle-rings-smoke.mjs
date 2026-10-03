// Checks the sparkle rings in the real game: the ring lines on Earth, Blossom Haven and the Moon,
// a pass that takes a ring (the burst, the two-note chime and the longer trail), a pass at boost
// speed, the return of a taken ring after 30 s, the rings that move with Blossom Haven, a new line
// after a new Earth landscape, and the phone layout. Screenshots go to artifacts.local/sparkle-rings/.
// Run against the dev server on port 5174:
//   node scripts/sparkle-rings-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
// Optional second argument: the dev server origin, for example a server without file watching.
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'rings-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a ring error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      clearTimeout(handler?.timer)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 180000)
    pending.set(key, { resolve, reject, timer })
    ws.send(JSON.stringify({ id: key, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const rings = async () => (await snapshot()).rings
  const ringsOf = (state, name) => state.worlds.find(item => item.world === name)
  const started = Date.now(), step = text => process.stderr.write(`· ${text} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  // Control the time of the game. `draw: false` skips the draw calls, for long waits on a software GPU.
  // Each new oscillator counts: the ambience makes three, and each chime makes one for each note.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.oscillators = 0;
    const createOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { window.oscillators++; return createOscillator.call(this); };
    window.advanceFlight = (seconds, fps = 60, draw = true) => {
      window.testTime ??= performance.now();
      const gl = document.querySelector('canvas').getContext('webgl2');
      const saved = ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced'].map(name => [name, gl[name]]);
      if (!draw) saved.forEach(([name]) => { gl[name] = () => {}; });
      try {
        for (let i = 0; i < Math.ceil(seconds * fps); i++) { window.testTime += 1000 / fps; window.testFrame(window.testTime); }
      } finally { saved.forEach(([name, fn]) => { gl[name] = fn; }); }
      window.testTime += 1000 / fps; window.testFrame(window.testTime);
    };
  ` })
  async function load(mobile) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")')) break
      await delay(250)
    }
    assert(await evaluate('!!window.__fairyTest'), `The game did not start: ${JSON.stringify(errors).slice(0, 1500)}`)
  }
  await mkdir('artifacts.local/sparkle-rings', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/sparkle-rings/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const key = async (type, code, key) => send('Input.dispatchKeyEvent', { type, code, key })
  /** Fly through ring `index` of a world from `distance` m before it, to 1 m after it. Returns the state after the pass. */
  async function pass(kind, index, distance = 8, speed = 11) {
    const aimed = await evaluate(`__fairyTest.aimRing(${JSON.stringify(kind)}, ${index}, ${distance}, ${speed})`)
    assert(aimed, `No ring ${index} on ${kind}`)
    await evaluate(`advanceFlight(${(distance + 1) / speed})`)
    return { aimed, state: await snapshot() }
  }

  step('desktop'); await load(false)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  let state = await rings()
  const earth = ringsOf(state, 'Earth'), haven = ringsOf(state, 'Blossom Haven'), moon = ringsOf(state, 'Moon')
  assert(earth.lines === 5 && earth.count >= 25 && earth.count <= 35, `Earth rings: ${JSON.stringify(earth)}`)
  assert(haven.lines === 3 && haven.count >= 15 && moon.lines === 3 && moon.count >= 15, `Blossom Haven or Moon rings: ${JSON.stringify(state.worlds)}`)
  assert(state.worlds.length === 3 && state.worlds.every(item => item.taken.length === 0), `Rings on other worlds, or taken at the start: ${JSON.stringify(state.worlds)}`)
  assert(state.worlds.map(item => item.world).join() === 'Earth,Moon,Blossom Haven' && state.worlds.every(item => item.inGroup), `The rings are not in the world groups: ${JSON.stringify(state.worlds)}`)
  await screenshot('start')
  await evaluate('__fairyTest.aimRing("earth", 0, 16)'); await evaluate('advanceFlight(0.2)')
  await screenshot('earth-rings')

  step('sound on')
  await evaluate('document.querySelector("#settings-toggle").click()')
  const box = await evaluate('(() => { const r = document.querySelector("#setting-sound + i").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()')
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  for (let i = 0; i < 20 && !(await snapshot()).sound; i++) await delay(100)
  await evaluate('document.querySelector("#close-settings").click()')
  assert((await snapshot()).sound, 'The sound did not start')

  step('a pass on Earth')
  const before = await evaluate('window.oscillators')
  await pass('earth', 1, 8)
  state = await rings()
  assert(ringsOf(state, 'Earth').taken.join() === '1', `The pass did not take ring 1: ${JSON.stringify(ringsOf(state, 'Earth'))}`)
  const chime = await evaluate('window.oscillators') - before
  assert(chime === 2, `The ring did not play a two-note chime: ${chime} new oscillators`)
  assert(state.bursts > 0 && state.bursts <= state.burstSize && state.sparkle === 1 && state.trailSize > 0.3, `No burst or no bright trail: ${JSON.stringify(state)}`)
  await screenshot('earth-burst')
  // Hover, so the fairy does not fly on through the next ring of the line.
  await evaluate('document.querySelector("#hover-toggle").click()')
  await evaluate('advanceFlight(1.2)')
  state = await rings()
  assert(state.trailShown === 144, `The trail is not longer after a ring: ${state.trailShown}`)
  await evaluate('advanceFlight(3.2)')
  state = await rings()
  assert(state.sparkle === 0 && state.trailShown === 72 && state.bursts === 0, `The longer trail did not end after 4 s: ${JSON.stringify(state)}`)

  step('the return after 30 s')
  await evaluate('advanceFlight(23, 60, false)')
  assert(ringsOf(await rings(), 'Earth').taken.join() === '1', 'The ring came back before 30 s')
  await evaluate('advanceFlight(3, 60, false)')
  assert(ringsOf(await rings(), 'Earth').taken.length === 0, 'The ring did not come back after 30 s')
  // 8 m before ring 1: two rings are 12 m or more apart, so this start is after ring 0 and takes no ring.
  await evaluate('__fairyTest.aimRing("earth", 1, 8)'); await evaluate('advanceFlight(0.3)')
  await screenshot('earth-ring-back')

  step('a pass at boost speed, 20 frames a second')
  await key('keyDown', 'ShiftLeft', 'Shift')
  // The first ring of the fourth line: no ring of this line is taken yet.
  const boostRing = ringsOf(await rings(), 'Earth').lineStarts[3]
  await evaluate(`__fairyTest.aimRing("earth", ${boostRing}, 12, 26)`)
  await evaluate('advanceFlight(0.6, 20)')
  state = await snapshot()
  await key('keyUp', 'ShiftLeft', 'Shift')
  assert(state.boosted && ringsOf(state.rings, 'Earth').taken.join() === String(boostRing), `The boost pass did not take ring ${boostRing}: ${JSON.stringify(ringsOf(state.rings, 'Earth'))}`)

  step('Blossom Haven')
  await evaluate('__fairyTest.aimRing("fairy", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('haven-rings')
  let result = await pass('fairy', 1)
  assert(ringsOf(result.state.rings, 'Blossom Haven').taken.join() === '1', `The pass did not take a Haven ring: ${JSON.stringify(ringsOf(result.state.rings, 'Blossom Haven'))}`)
  // Five minutes of active play move Blossom Haven. The hovering fairy and the rings move with it.
  await evaluate('document.querySelector("#hover-toggle").click()')
  const home = (await snapshot()).home
  const centre = (await evaluate('__fairyTest.aimRing("fairy", 2, 8)')).centre
  await evaluate('document.querySelector("#hover-toggle").click()')
  for (let i = 0; i < 12 && (await snapshot()).moves === 0; i++) await evaluate('advanceFlight(30, 60, false)')
  state = await snapshot()
  assert(state.moves === 1, `Blossom Haven did not move: ${state.moves}`)
  const moved = (await evaluate('__fairyTest.aimRing("fairy", 2, 8)')).centre
  const shift = state.home.map((value, i) => value - home[i]), ringShift = moved.map((value, i) => value - centre[i])
  // The world also turns, so the ring moves with the world plus a turn; it stays on the world.
  const fromHome = (point, at) => Math.hypot(...point.map((value, i) => value - at[i]))
  assert(Math.hypot(...shift) > 1000 && Math.abs(fromHome(moved, state.home) - fromHome(centre, home)) < 1e-3 && Math.hypot(...ringShift) > 1000, `The rings did not move with Blossom Haven: ${JSON.stringify({ shift, ringShift })}`)
  await evaluate('advanceFlight(1)')
  assert(ringsOf(await rings(), 'Blossom Haven').taken.includes(2), 'No pass after the move of Blossom Haven')
  await screenshot('haven-after-move')

  step('the Moon')
  await evaluate('__fairyTest.aimRing("moon", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('moon-rings')
  result = await pass('moon', 1)
  assert(ringsOf(result.state.rings, 'Moon').taken.join() === '1', `The pass did not take a Moon ring: ${JSON.stringify(ringsOf(result.state.rings, 'Moon'))}`)

  step('a new Earth landscape')
  const oldEarth = ringsOf(await rings(), 'Earth')
  await evaluate('document.querySelector("#open-map").click(); document.querySelector("[data-world=earth]").click(); document.querySelector("#world-fly").click()')
  let renewed = false
  for (let i = 0; i < 60 && !renewed; i++) {
    await evaluate('advanceFlight(1, 60, false)')
    renewed = (await snapshot()).earthVisit > 1
  }
  assert(renewed, 'No new Earth landscape')
  const newEarth = ringsOf(await rings(), 'Earth')
  assert(newEarth.seed !== oldEarth.seed && JSON.stringify(newEarth.first) !== JSON.stringify(oldEarth.first) && newEarth.taken.length === 0, `No new rings for the new Earth: ${JSON.stringify({ oldEarth, newEarth })}`)
  assert(newEarth.lines >= 3 && newEarth.count >= 15, `Too few rings on the new Earth: ${JSON.stringify(newEarth)}`)
  result = await pass('earth', 0)
  assert(ringsOf(result.state.rings, 'Earth').taken.join() === '0', `No pass on the new Earth: ${JSON.stringify(ringsOf(result.state.rings, 'Earth'))}`)
  await evaluate('__fairyTest.aimRing("earth", 2, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('new-earth-rings')

  step('phone'); await load(true)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.graphics.mobile && state.rings.burstSize === 24 && ringsOf(state.rings, 'Earth').lines === 5, `Phone rings: ${JSON.stringify(state.rings)}`)
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')
  await evaluate('__fairyTest.aimRing("earth", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('phone-rings-390')
  result = await pass('earth', 0)
  assert(ringsOf((await rings()), 'Earth').taken.join() === '0', 'No pass on the phone')
  await screenshot('phone-burst-390')
  const calls = (await snapshot()).graphics.calls

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified sparkle rings: Earth ${earth.count} rings in ${earth.lines} lines, Blossom Haven ${haven.count} in ${haven.lines}, the Moon ${moon.count} in ${moon.lines}; a pass with a two-note chime, a burst and a trail of 144 points for 4 s; the return after 30 s; a pass at boost speed at 20 frames a second; the rings carried with Blossom Haven; new rings for a new Earth (seed ${oldEarth.seed} → ${newEarth.seed}, ${newEarth.count} rings); the 390 px phone layout with ${calls} draw calls. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
