import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// The living Sun in the game (docs/sun-study.md, option B): the look, the Sun in the sky of Earth, the motion,
// a guided trip to the Sun, and the phone shader. The default is the graphics card; add --swiftshader for software rendering.
const args = process.argv.slice(2)
const software = args.includes('--swiftshader')
const [browserPath, origin = 'http://127.0.0.1:5174'] = args.filter(arg => arg !== '--swiftshader')
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const debugPort = 9345
const profile = await mkdtemp(join(tmpdir(), 'sun-browser-'))
const browser = spawn(browserPath, [
  '--headless', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
  ...(software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a Sun error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    // three.js reports shader compile errors on the console.
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' ').slice(0, 800))
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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 90000)
      pending.set(key, { resolve, reject, timer })
      ws.send(JSON.stringify({ id: key, method, params }))
    })
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const key = (code, down) => evaluate(`window.dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { code: '${code}' }))`)
  const started = Date.now(), step = text => process.stderr.write(`· ${text} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  const sub = (a, b) => a.map((value, i) => value - b[i])
  const length = a => Math.hypot(...a)
  const cosine = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0) / length(a) / length(b)

  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  async function load(mobile) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")`)) break
      await delay(250)
    }
    assert(await evaluate('!!window.__fairyTest'), `The game did not start: ${JSON.stringify(errors).slice(0, 1500)}`)
  }
  await mkdir('artifacts.local/sun', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/sun/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  step('desktop'); await load(false)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  let state = await snapshot()
  assert(state.sun.look === 'sun-living', `The game Sun is not the living Sun: ${JSON.stringify(state.sun)}`)
  // Mid-morning on the meadow: the Sun is about 25° high, so it has the white of the day.
  assert(state.sun.tint === 'ffffff', `The morning Sun has a tint: ${JSON.stringify(state.sun)}`)

  step('turn toward the Sun')
  // The heading of the view against the direction of the Sun, both in the horizontal plane of the meadow.
  const flat = (vector, up) => { const along = vector.reduce((sum, value, i) => sum + value * up[i], 0); return vector.map((value, i) => value - along * up[i]) }
  const facing = now => {
    const up = sub(now.fairy, now.moon.earth).map((value, _, all) => value / length(all))
    return cosine(flat(sub(now.fairy, now.camera), up), flat(sub(now.sun.position, now.fairy), up))
  }
  let best = -1
  await key('ArrowLeft', true)
  for (let tick = 0; tick < 150; tick++) {
    await evaluate('advanceFlight(0.1)')
    state = await snapshot()
    best = Math.max(best, facing(state))
    if (facing(state) > 0.97) break
  }
  await key('ArrowLeft', false)
  assert(facing(state) > 0.97, `The fairy did not turn toward the Sun: best ${best.toFixed(2)}`)
  await evaluate('advanceFlight(0.3)')
  // Climb, so the camera looks up at the Sun.
  await key('ArrowUp', true)
  await evaluate('advanceFlight(1.2)')
  await key('ArrowUp', false)
  await screenshot('meadow-sun')

  // Motion: the Sun turns with the game time.
  const turn = (await snapshot()).sun.turn
  await evaluate('advanceFlight(3)')
  assert((await snapshot()).sun.turn > turn, 'The Sun does not turn')

  step('to the Sun')
  await evaluate('document.querySelector("#open-map").click()')
  await evaluate('document.querySelector("[data-world=sun]").click()')
  let altitude = Infinity
  for (let tick = 0; tick < 400; tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
    altitude = length(sub(state.fairy, state.sun.position)) - 960
    if (tick % 20 === 0) step(`${state.belt.nearest} · ${state.belt.region} · ${Math.round(altitude)} m`)
    if (state.belt.nearest === 'Sun' && altitude < 120) break
  }
  assert(state.belt.nearest === 'Sun' && altitude < 120, `Did not reach the Sun: ${JSON.stringify(state.belt)} ${Math.round(altitude)} m`)
  assert(state.sun.tint === 'ffffff', `The Sun has a tint in space: ${state.sun.tint}`)
  await evaluate('advanceFlight(2)')
  await screenshot('sun-arrival')
  await evaluate('advanceFlight(6)')
  await screenshot('sun-cruise')

  step('phone'); await load(true)
  state = await snapshot()
  assert(state.sun.look === 'sun-living-phone', `The phone does not use the phone shader: ${state.sun.look}`)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  await screenshot('phone')

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors).slice(0, 2000)}`)
  console.log('Verified the living Sun in the game: the look, the white morning Sun from the meadow, the motion, a guided trip to the Sun, and the phone shader. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
