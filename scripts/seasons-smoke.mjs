// Checks the seasons of Earth in the real game: the lean of the axis, the year from the real
// date, the start meadow in the leaf forest, the morning Sun at the start in each season, the
// season at the fairy, and the petals, the leaves and the snow in the air. It takes a picture
// of the start in the middle of each season. Run against the dev server on port 5174:
//   node scripts/seasons-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const out = 'artifacts.local/seasons'
await mkdir(out, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'seasons-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a season error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    // A shader that does not compile gives a console error from three.js.
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' ').slice(0, 600))
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
  const picture = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    await writeFile(join(out, name), Buffer.from(data, 'base64'))
  }
  /** Opens the game at a year (or at the real date), starts the flight and waits for the first frames. */
  async function open(year, width = 1280, height = 720, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    await send('Page.navigate', { url: `${origin}/?test${year === null ? '' : `&year=${year}`}` })
    for (let i = 0; i < 120 && !(await evaluate('typeof __fairyTest !== "undefined"').catch(() => false)); i++) await delay(250)
    await evaluate('document.querySelector("#begin-button").click()')
    await delay(3500)
    return snapshot()
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')

  // The middle of the look of each season in the north, and what is in the air there.
  const seasons = [[0.125, 'spring', true], [0.375, 'summer', false], [0.625, 'autumn', true], [0.875, 'winter', null]]
  for (const [year, name, air] of seasons) {
    const state = await open(year)
    assert(state.season.on === 1, `${name}: the seasons are off`)
    assert(state.season.tilt === 23.4, `${name}: the tilt is ${state.season.tilt}`)
    assert(Math.abs(state.season.year - year) < 0.01, `${name}: the year is ${state.season.year}, not ${year}`)
    assert(state.season.name === name, `${name}: the season at the fairy is ${state.season.name}`)
    assert(state.season.latitude > 23.5 && state.season.latitude < 35, `${name}: the start is at ${state.season.latitude.toFixed(1)}°, not in the leaf forest`)
    // Snow falls only under a snow cloud of the weather (scripts/weather-smoke.mjs), so the winter has no fixed answer.
    if (air !== null) assert(state.season.airVisible === air, `${name}: the air is ${state.season.airVisible ? 'on' : 'off'}`)
    assert(state.daylight.day > 0.9, `${name}: the start is not in daylight (${state.daylight.elevation.toFixed(1)}°)`)
    assert(Math.abs(state.daylight.elevation - 25) < 6, `${name}: the Sun is at ${state.daylight.elevation.toFixed(1)}° at the start, not near 25°`)
    await picture(`start-${name}.jpg`)
    console.log(`${name}: year ${state.season.year.toFixed(3)}, ${state.season.latitude.toFixed(1)}° N, Sun ${state.daylight.elevation.toFixed(1)}°, air ${state.season.air.toFixed(2)}, draw calls ${state.graphics.calls}`)
  }

  // With no year in the address, the year is the real date.
  const today = await open(null)
  const expected = await evaluate('((Date.now() - Date.UTC(new Date().getUTCFullYear(), 2, 20)) / (365.25 * 86400000) % 1 + 1) % 1')
  assert(Math.abs(today.season.year - expected) < 0.01, `The year is ${today.season.year}, not the real date ${expected}`)
  await picture('start-today.jpg')
  console.log(`today: year ${today.season.year.toFixed(3)}, ${today.season.name}`)

  const phone = await open(0.875, 390, 844, true)
  assert(phone.season.name === 'winter', `Phone: the season is ${phone.season.name}`)
  await picture('phone-winter.jpg')
  console.log(`phone: draw calls ${phone.graphics.calls}, triangles ${phone.graphics.triangles}`)

  assert(errors.length === 0, `Page errors: ${JSON.stringify(errors.slice(0, 3), null, 1)}`)
  console.log('The seasons check passed. Pictures:', out)
} finally {
  ws?.close()
  browser.kill()
}
