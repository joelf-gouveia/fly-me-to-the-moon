// Checks the comet and the shooting stars in the real game: the comet from space, both tails
// away from the Sun, a pass through the tail (the region label, the sparkles and the longer
// trail), shooting stars on Earth at night and none by day or in open space, no shooting stars
// with reduced motion, and the phone budget at 390 px. Run against the dev server on port 5174:
// node scripts/comet-smoke.mjs "path/to/chrome.exe"
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
// Optional second argument: the dev server origin, for a server without file watching.
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'comet-browser-'))
const browser = spawn(browserPath, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 120; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a comet error.
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
  const key = (code, down) => evaluate(`window.dispatchEvent(new KeyboardEvent('${down ? 'keydown' : 'keyup'}', { code: '${code}' }))`)
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const started = Date.now(), step = text => process.stderr.write(`· ${text} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  const add = (a, b, scale = 1) => a.map((value, i) => value + b[i] * scale)
  const length = a => Math.hypot(...a)
  const unit = a => a.map(value => value / length(a))
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0)
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  async function load(mobile, reduced = false) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] })
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    // A clear sky on all of Earth: the weather of Earth can hide the stars and the shooting stars at night.
    await send('Page.navigate', { url: `${origin}/?test&weather=clear` })
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")`)) break
      await delay(250)
    }
    assert(await evaluate('!!window.__fairyTest'), `The game did not start: ${JSON.stringify(errors).slice(0, 1500)}`)
    await evaluate('document.querySelector("#begin-button").click()')
    await evaluate('advanceFlight(1)')
  }
  await mkdir('artifacts.local/comet', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/comet/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  /** A place beside the tail: `along` of the dust tail from the head, `across` metres to the side. */
  const besideTail = (state, along, across) => {
    const side = unit(cross(state.comet.away, [0, 1, 0]))
    const axis = add(state.comet.position, state.comet.away, along * state.comet.dustLength)
    return { axis, side, place: add(axis, side, across) }
  }

  step('desktop'); await load(false)
  let state = await snapshot()
  assert(state.comet.dust === 5200 && state.comet.ion === 2200, `Desktop tail particles are wrong: ${JSON.stringify(state.comet)}`)
  // The meadow in the morning: the blue sky hides the comet.
  assert(state.shootingStars.launched === 0 && state.shootingStars.dark === 0, `Shooting stars at the start: ${JSON.stringify(state.shootingStars)}`)

  step('the comet from space')
  // Away from the Sun, the tail points along the line from the Sun through the head.
  const fromSun = unit(add(state.comet.position, state.sun.position, -1))
  assert(dot(state.comet.away, fromSun) > 0.9999, `The tail does not point away from the Sun: ${JSON.stringify(state.comet)}`)
  // A view from the side of the tail, with the head and most of the tail in the frame.
  let view = besideTail(state, 0.35, state.comet.dustLength * 1.6)
  await evaluate(`__fairyTest.place(${JSON.stringify(view.place)}, ${JSON.stringify(view.axis)})`)
  await key('KeyQ', true); await key('KeyQ', false)
  await evaluate('advanceFlight(0.6)')
  state = await snapshot()
  assert(state.hoverHeld, 'Hover did not start')
  assert(state.comet.visible && !state.comet.inTail, `The comet is not visible from space: ${JSON.stringify(state.comet)}`)
  assert(state.belt.region === 'Open space', `Region beside the tail: ${state.belt.region}`)
  assert(dot(state.comet.away, unit(add(state.comet.position, state.sun.position, -1))) > 0.9999, 'The tail turned toward the Sun')
  await screenshot('comet-space')
  // A wide view with the Sun: the tail points away from it.
  const sunDistance = length(add(state.comet.position, state.sun.position, -1))
  const wide = besideTail(state, 0, sunDistance * 1.1)
  await evaluate(`__fairyTest.place(${JSON.stringify(wide.place)}, ${JSON.stringify(add(state.comet.position, state.comet.away, -sunDistance * 0.45))})`)
  await evaluate('advanceFlight(0.6)')
  await screenshot('comet-and-sun')
  const shootingInSpace = (await snapshot()).shootingStars

  step('through the tail')
  state = await snapshot()
  view = besideTail(state, 0.3, 700)
  await evaluate(`__fairyTest.place(${JSON.stringify(view.place)}, ${JSON.stringify(view.axis)})`)
  await key('KeyQ', true); await key('KeyQ', false)
  let inside = 0, labelled = false, mostSparkles = 0, biggestTrail = 0, shot = false
  for (let frame = 0; frame < 400; frame++) {
    await evaluate('advanceFlight(1 / 60)')
    state = await snapshot()
    if (state.comet.inTail) inside++
    if (state.belt.region === 'Comet tail') labelled = true
    mostSparkles = Math.max(mostSparkles, state.comet.sparkles)
    biggestTrail = Math.max(biggestTrail, state.comet.trailBonus)
    if (state.comet.inTail && labelled && !shot && state.comet.sparkles > 40) { await screenshot('in-tail'); shot = true }
    if (inside && !state.comet.inTail) break
  }
  assert(!state.hoverHeld, 'Hover is still on')
  assert(inside > 0, `The fairy never came into the tail: ${JSON.stringify(state.comet)} at ${JSON.stringify(state.fairy)}`)
  assert(labelled, 'The flight panel never said Comet tail')
  assert(mostSparkles > 30 && biggestTrail > 0.8, `No sparkles or no stronger trail: ${mostSparkles} sparkles, trail ${biggestTrail}`)
  // After the tail, the glow stays for a while, then goes.
  await evaluate('advanceFlight(0.5)')
  state = await snapshot()
  assert(!state.comet.inTail && state.belt.region !== 'Comet tail' && state.comet.glow > 0 && state.comet.sparkles > 0, `The glow after the tail is wrong: ${JSON.stringify(state.comet)}`)
  await screenshot('after-tail')
  await evaluate('advanceFlight(4.5)')
  state = await snapshot()
  assert(state.comet.glow === 0 && state.comet.trailBonus === 0, `The glow does not end: ${JSON.stringify(state.comet)}`)
  assert(shootingInSpace.launched === 0 && state.shootingStars.launched === 0, `Shooting stars in open space: ${JSON.stringify(state.shootingStars)}`)

  step('Earth by day')
  await load(false)
  await key('KeyQ', true); await key('KeyQ', false)
  await evaluate('advanceFlight(8)')
  state = await snapshot()
  assert(state.daylight.world === 'Earth' && state.daylight.elevation > 10, `Not day on Earth: ${JSON.stringify(state.daylight)}`)
  assert(state.shootingStars.launched === 0 && state.shootingStars.dark === 0, `Shooting stars by day: ${JSON.stringify(state.shootingStars)}`)

  step('Earth at night')
  for (let turn = 0; turn < 30 && (await snapshot()).daylight.elevation > -30; turn++) {
    await evaluate('__fairyTest.spin(8); advanceFlight(0.1)')
  }
  // Look up at the sky.
  await key('ArrowUp', true); await evaluate('advanceFlight(0.5)'); await key('ArrowUp', false)
  state = await snapshot()
  assert(state.daylight.elevation < -25, `Not night on Earth: ${JSON.stringify(state.daylight)}`)
  assert(state.shootingStars.dark > 0.9, `The night sky is not dark enough for shooting stars: ${JSON.stringify(state.shootingStars)} ${JSON.stringify(state.sky)}`)
  let mostActive = 0, starShots = 0
  const first = state.shootingStars.launched
  // Two pictures of a shooting star, then a longer time to count them.
  let watched = 0
  for (let tick = 0; tick < 160 && starShots < 2; tick++) {
    await evaluate('advanceFlight(0.1)'); watched += 0.1
    state = await snapshot()
    mostActive = Math.max(mostActive, state.shootingStars.active)
    if (state.shootingStars.active) {
      await evaluate('advanceFlight(0.15)'); watched += 0.15
      await screenshot(`shooting-star-${++starShots}`)
    }
  }
  await evaluate('advanceFlight(12)'); watched += 12
  state = await snapshot()
  const seen = state.shootingStars.launched - first
  assert(mostActive > 0 && seen >= Math.floor(watched / 6.5), `Too few shooting stars at night: ${seen} in ${watched.toFixed(1)} s`)
  // About one each 2.5 to 6.5 s.
  assert(seen <= Math.ceil(watched / 2.5) + 1, `Too many shooting stars: ${seen} in ${watched.toFixed(1)} s`)
  // The day comes back, and the shooting stars stop.
  for (let turn = 0; turn < 40 && (await snapshot()).daylight.elevation < 15; turn++) await evaluate('__fairyTest.spin(8); advanceFlight(0.1)')
  await evaluate('advanceFlight(1)')
  const dawn = (await snapshot()).shootingStars.launched
  await evaluate('advanceFlight(8)')
  state = await snapshot()
  assert(state.daylight.elevation > 15 && state.shootingStars.launched === dawn && state.shootingStars.active === 0, `Shooting stars after sunrise: ${JSON.stringify(state.shootingStars)} ${JSON.stringify(state.daylight)}`)

  step('reduced motion')
  await load(false, true)
  await key('KeyQ', true); await key('KeyQ', false)
  for (let turn = 0; turn < 30 && (await snapshot()).daylight.elevation > -30; turn++) await evaluate('__fairyTest.spin(8); advanceFlight(0.1)')
  await evaluate('advanceFlight(8)')
  state = await snapshot()
  assert(state.daylight.elevation < -25 && state.shootingStars.launched === 0 && state.shootingStars.dark === 0, `Shooting stars with reduced motion: ${JSON.stringify(state.shootingStars)}`)

  step('phone')
  await load(true)
  state = await snapshot()
  assert(state.graphics.mobile && state.comet.dust === 2600 && state.comet.ion === 1100 && state.comet.sparkleCapacity === 96, `Phone budget is wrong: ${JSON.stringify(state.comet)}`)
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')
  view = besideTail(state, 0.3, 0)
  await evaluate(`__fairyTest.place(${JSON.stringify(add(view.axis, view.side, 1))}, ${JSON.stringify(add(view.axis, state.comet.away, 300))})`)
  await evaluate('document.querySelector("#hover-toggle").click()')
  await evaluate('advanceFlight(0.1)')
  state = await snapshot()
  assert(state.comet.inTail && state.belt.region === 'Comet tail', `The phone fairy is not in the tail: ${JSON.stringify(state.comet)} ${state.belt.region}`)
  await screenshot('phone-in-tail-390')
  await evaluate('document.querySelector("#menu-toggle").click()')
  await evaluate('advanceFlight(0.2)')
  assert(await evaluate('document.querySelector("#flight-region").textContent') === 'Comet tail', 'The menu does not say Comet tail')
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px with the menu')
  await screenshot('phone-menu-390')

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors).slice(0, 2000)}`)
  step('done')
  console.log(`Verified the comet from space with its tails away from the Sun, a pass through the tail (${inside} frames inside, up to ${mostSparkles} sparkles, trail ${biggestTrail.toFixed(2)}), ${seen} shooting stars on Earth at night and none by day, in open space or with reduced motion, and the phone budget at 390 px. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
