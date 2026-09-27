// Checks the Moon in the real game: its orbit around Earth, the material without fog,
// the Moon in Worlds, a guided trip from the meadow to the Moon, the carry of a
// hovering fairy at 8× orbital speed, earthshine close by, and the phone layout.
// Run against the dev server on port 5174: node scripts/moon-smoke.mjs "path/to/chrome.exe"
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
// Optional second argument: the dev server origin, for a server without file watching.
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const debugPort = 9343
const profile = await mkdtemp(join(tmpdir(), 'moon-browser-'))
const browser = spawn(browserPath, [
  '--headless', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a Moon error.
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
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 90000)
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
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const started = Date.now(), step = text => process.stderr.write(`· ${text} (${Math.round((Date.now() - started) / 1000)} s)\n`)
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
    // A small window keeps software rendering fast enough for a guided flight.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")`)) break
      await delay(250)
    }
    assert(await evaluate('!!window.__fairyTest'), `The game did not start: ${JSON.stringify(errors).slice(0, 1500)}`)
  }
  await mkdir('artifacts.local/moon', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/moon/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  step('desktop'); await load(false)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  let state = await snapshot()
  assert(Math.abs(distance(state.moon.position, state.moon.earth) - 962.5) < 0.5, `The Moon is not on its orbit: ${JSON.stringify(state.moon)}`)
  assert(state.moon.fog === false && Math.abs(state.moon.earthshine - 0.12) < 0.01, `The Moon material is wrong: ${JSON.stringify(state.moon)}`)

  await evaluate('document.querySelector("#open-map").click()')
  const pictures = await evaluate('[...document.querySelectorAll("[data-world]")].map(button => button.dataset.world)')
  assert(pictures.length === 13 && pictures.indexOf('moon') === pictures.indexOf('earth') + 1, `Worlds dialog pictures: ${pictures}`)
  const mapRing = await evaluate('(() => { const ring = document.querySelector("[data-orbit=moon]"); return [+ring.getAttribute("cx"), +ring.getAttribute("r")] })()')
  await evaluate('advanceFlight(0.2)')
  const mapRingLater = await evaluate('+document.querySelector("[data-orbit=moon]").getAttribute("cx")')
  assert(mapRing[1] === 12 && mapRingLater !== 300, `The Moon path on the map is not around Earth: ${mapRing} ${mapRingLater}`)
  await screenshot('worlds-dialog')

  step('to the Moon'); await evaluate('document.querySelector("[data-world=moon]").click()')
  let seconds = 0
  for (let tick = 0; tick < 240; tick++) {
    await evaluate('advanceFlight(0.5)'); seconds += 0.5
    state = await snapshot()
    if (tick % 10 === 0) step(`${state.belt.nearest} · ${state.belt.region}`)
    if (state.belt.nearest === 'Moon' && state.belt.region === 'Airless · grey dust and dark seas') break
  }
  assert(state.belt.nearest === 'Moon' && state.belt.region === 'Airless · grey dust and dark seas', `Did not reach the Moon: ${JSON.stringify(state.belt)}`)
  // The panel names the Moon 85 m above its ground; the trip ends 12 m above it.
  const status = () => evaluate('document.querySelector("#journey-status").textContent')
  for (let tick = 0; tick < 40 && !(await status()).includes('Cruising around Moon'); tick++) { await evaluate('advanceFlight(0.25)'); seconds += 0.25 }
  assert((await status()).includes('Cruising around Moon'), `The guided trip did not end at the Moon: ${await status()}`)
  await evaluate('advanceFlight(2)')
  await screenshot('moon-arrival')

  step('carry at 8×')
  await evaluate('document.querySelector("#hover-toggle").click()')
  await evaluate('document.querySelector("#orbit-speed-toggle").click()')
  await evaluate('advanceFlight(0.5)')
  const before = await snapshot()
  await evaluate('advanceFlight(4)')
  const after = await snapshot()
  const heightBefore = distance(before.fairy, before.moon.position), heightAfter = distance(after.fairy, after.moon.position)
  assert(before.hoverHeld && Math.abs(heightAfter - heightBefore) < 1 && heightBefore < 75 + 85, `The Moon does not carry the hovering fairy: ${heightBefore} → ${heightAfter}`)
  assert(distance(before.fairy, after.fairy) > 200, `The Moon did not move at 8×: ${distance(before.fairy, after.fairy)} m`)
  assert(after.moon.earthshine > 0.4, `Earthshine is not raised close to the Moon: ${after.moon.earthshine}`)
  await screenshot('moon-carry')

  step('phone'); await load(true)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.graphics.mobile && state.moon.fog === false, `Phone Moon is wrong: ${JSON.stringify(state.moon)}`)
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')
  await evaluate('document.querySelector("#open-map")?.click()')
  await evaluate('advanceFlight(0.2)')
  await screenshot('worlds-dialog-390')

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified the Moon orbit and material, 13 Worlds pictures with the Moon path around Earth, a guided trip to the Moon (${seconds} s of game time), the carry of a hovering fairy at 8× (${heightBefore.toFixed(1)} → ${heightAfter.toFixed(1)} m), earthshine close by, and the phone layout. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
