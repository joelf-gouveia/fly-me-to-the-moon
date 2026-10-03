// Checks the asteroid belt in the real game: Ceres and Vesta in Worlds, a guided
// trip through the belt to Ceres, rocks near the fairy, the region label, the
// home kept out of the belt, and the phone budget. Run against the dev server
// on port 5174: node scripts/asteroid-belt-smoke.mjs "path/to/chrome.exe"
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
// Optional second argument: the dev server origin, for a server without file watching.
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'asteroid-belt-browser-'))
const browser = spawn(browserPath, [
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a sky error.
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
  const key = async (type, code, keyName) => send('Input.dispatchKeyEvent', { type, code, key: keyName })
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const started = Date.now(), step = text => process.stderr.write(`· ${text} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  const BELT = { inner: 4850 * 2.5, outer: 5550 * 2.5, halfHeight: 160 * 2.5 } // src/belt.ts: the base belt at the spacing of src/proportions.ts
  const inBelt = ([x, y, z], radius = 0) => { const r = Math.hypot(x, z); return r > BELT.inner - radius && r < BELT.outer + radius && Math.abs(y) < BELT.halfHeight + radius }
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  // Worlds opens a world with its sticker, and a new book opens only Earth, Blossom Haven and the Moon.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('fairy-sticker-book', JSON.stringify({ arrived: ['ceres', 'vesta'] }))` })
  async function load(mobile) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough for a long guided flight.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")`)) break
      await delay(250)
    }
  }
  await mkdir('artifacts.local/asteroid-belt', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/asteroid-belt/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  step("desktop"); await load(false)
  if (!(await evaluate(`!!document.querySelector("#begin-button")`))) throw new Error(`No begin button. Errors: ${JSON.stringify(errors).slice(0, 1500)} Buttons: ${await evaluate(`[...document.querySelectorAll("button")].map(b => b.id).join()`)}`)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  let state = await snapshot()
  assert(state.belt.dust === 12000, `Desktop dust count is wrong: ${state.belt.dust}`)
  assert(state.belt.rocks === 0, 'Rocks are drawn near Earth')

  await evaluate('document.querySelector("#open-map").click()')
  const pictures = await evaluate('[...document.querySelectorAll("[data-world]")].map(button => button.dataset.world)')
  assert(pictures.length === 13 && pictures.includes('moon') && pictures.includes('ceres') && pictures.includes('vesta'), `Worlds dialog pictures: ${pictures}`)
  await evaluate('advanceFlight(0.2)')
  await screenshot('worlds-dialog')
  await evaluate('document.querySelector("[data-world=ceres]").click(); document.querySelector("#world-fly").click()')

  step("to Ceres")
  // Guided flight from Earth to Ceres crosses the inner edge of the belt.
  const regions = new Set()
  let mostRocks = 0, beltShot = false
  for (let tick = 0; tick < 240; tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
    regions.add(state.belt.region)
    mostRocks = Math.max(mostRocks, state.belt.rocks)
    if (!beltShot && state.belt.region === 'Asteroid belt' && state.belt.rocks > 20) { await screenshot('inside-belt'); beltShot = true }
    if (tick % 20 === 0) step(`${state.belt.nearest} · ${state.belt.region} · ${state.belt.rocks} rocks`)
    if (state.belt.nearest === 'Ceres' && state.belt.region.startsWith('Dwarf planet')) break
  }
  assert(regions.has('Asteroid belt'), `The region label never says Asteroid belt: ${[...regions]}`)
  assert(mostRocks > 20, `Too few rocks near the fairy: ${mostRocks}`)
  assert(state.belt.nearest === 'Ceres' && state.belt.region === 'Dwarf planet · bright salt spots', `Did not arrive at Ceres: ${JSON.stringify(state.belt)}`)
  await evaluate('advanceFlight(3)')
  await screenshot('ceres')

  await evaluate('document.querySelector("#open-map").click()')
  step("to Vesta"); await evaluate(`document.querySelector("[data-world=vesta]").click(); document.querySelector("#world-fly").click()`)
  for (let tick = 0; tick < 240; tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
    if (state.belt.nearest === 'Vesta' && state.belt.region.startsWith('Airless')) break
  }
  assert(state.belt.nearest === 'Vesta', `Did not arrive at Vesta: ${JSON.stringify(state.belt)}`)
  await evaluate('advanceFlight(3)')
  await screenshot('vesta')
  assert(!inBelt(state.home, state.radius + state.atmosphere), 'Blossom Haven is inside the belt')

  step("phone"); await load(true)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.graphics.mobile && state.belt.dust === 6000 && state.belt.capacity === 525, `Phone budget is wrong: ${JSON.stringify(state.belt)}`)
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')
  await evaluate('document.querySelector("#open-map")?.click()')
  await evaluate('advanceFlight(0.2)')
  await screenshot('worlds-dialog-390')

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified 13 Worlds pictures, a guided trip through the belt to Ceres (regions: ${[...regions].join(', ')}; up to ${mostRocks} rocks), Vesta, the home outside the belt, and the phone budget. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
