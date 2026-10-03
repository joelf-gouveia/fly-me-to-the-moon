// Checks the magic seasons of Blossom Haven in the real game: the four seasons at the cottage,
// the season plants, the thing in the air, the flight panel, the next season after a hop of the
// planet, the creatures, and the phone. It takes a picture of the cottage in each season. Run
// against the dev server on port 5174:
//   node scripts/magic-seasons-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const out = 'artifacts.local/magic-seasons'
await mkdir(out, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'magic-seasons-browser-'))
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
  /** Opens the game at a magic year, starts the flight and puts the fairy near the cottage, with the cottage ahead. */
  async function openAtCottage(magic, width = 1280, height = 720, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    // The game reads a touch device from the touch points, so a phone needs them.
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 })
    await send('Page.navigate', { url: `${origin}/?test&magic=${magic}` })
    for (let i = 0; i < 120 && !(await evaluate('typeof __fairyTest !== "undefined"').catch(() => false)); i++) await delay(250)
    await evaluate('document.querySelector("#begin-button").click()')
    await delay(800)
    // The cottage is at the south pole of Blossom Haven, and the planet has no tilt.
    await evaluate(`(() => {
      const { home, radius } = __fairyTest.snapshot()
      __fairyTest.place([home[0] + 34, home[1] - radius - 3, home[2] + 22], [home[0], home[1] - radius - 9, home[2]])
    })()`)
    await delay(2600)
    return snapshot()
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')

  const seasons = [[0, 'blossom', 'Blossom time'], [0.25, 'bubble', 'Bubble time'], [0.5, 'lantern', 'Lantern time'], [0.75, 'crystal', 'Crystal time']]
  for (const [year, id, name] of seasons) {
    const state = await openAtCottage(year)
    const region = await evaluate('document.querySelector("#flight-region").textContent')
    assert(state.magic.on === 1, `${name}: the magic seasons are off`)
    assert(state.magic.cottage === id, `${name}: the cottage has ${state.magic.cottage}`)
    assert(state.magic.season === id, `${name}: the fairy is in ${state.magic.season}`)
    assert(state.magic.farSide !== id, `${name}: the far side has the same season as the cottage`)
    assert(state.magic.airVisible, `${name}: nothing is in the air`)
    assert(region.startsWith(name), `${name}: the flight panel shows "${region}"`)
    const plants = Object.entries(state.magic.plants)
    assert(plants.length === 5 && plants.every(([, count]) => count > 300), `${name}: the season plants are ${JSON.stringify(state.magic.plants)}`)
    const wildlife = state.wildlife.find(item => item.world === 'Blossom Haven')
    assert(wildlife.total >= 20, `${name}: Blossom Haven has ${wildlife.total} creatures`)
    await picture(`cottage-${id}.jpg`)
    console.log(`${name}: "${region}", far side ${state.magic.farSide}, air ${state.magic.air.toFixed(2)}, creatures ${wildlife.total}, draw calls ${state.graphics.calls}`)
  }

  // A hop of the planet brings the next season. The look follows in about 20 s of flight.
  const before = await openAtCottage(0)
  assert(await evaluate('__fairyTest.hop()'), 'The planet did not hop')
  await delay(1500)
  const during = await snapshot()
  assert(during.magic.target === 0.25, `After the hop the target is ${during.magic.target}`)
  assert(during.magic.year > before.magic.year && during.magic.year < 0.1, `1.5 s after the hop the year is ${during.magic.year}`)
  await picture('hop-start.jpg')
  let after = during
  for (let i = 0; i < 40 && after.magic.year < 0.2499; i++) { await delay(1000); after = await snapshot() }
  assert(Math.abs(after.magic.year - 0.25) < 0.001, `After the change the year is ${after.magic.year}`)
  assert(after.magic.cottage === 'bubble', `After the hop the cottage has ${after.magic.cottage}`)
  await picture('hop-end.jpg')
  console.log(`hop: year ${before.magic.year} -> ${after.magic.year.toFixed(3)}, cottage ${before.magic.cottage} -> ${after.magic.cottage}`)

  // A pause stops the change.
  await evaluate('__fairyTest.hop()')
  await delay(1000)
  await evaluate('document.querySelector("#pause-toggle").click()')
  const paused = await snapshot()
  await delay(2500)
  const still = await snapshot()
  assert(still.magic.year === paused.magic.year, `The year moved in a pause: ${paused.magic.year} -> ${still.magic.year}`)
  console.log(`pause: the year stays at ${still.magic.year.toFixed(3)}`)

  // A phone gets half of the season plants.
  const phone = await openAtCottage(0.5, 390, 844, true)
  const phonePlants = Object.values(phone.magic.plants)
  assert(phonePlants.every(count => count > 150 && count <= 550), `Phone: the season plants are ${JSON.stringify(phone.magic.plants)}`)
  await picture('phone-lantern.jpg')
  console.log(`phone: plants ${phonePlants.join(', ')}, draw calls ${phone.graphics.calls}, triangles ${phone.graphics.triangles}`)

  assert(errors.length === 0, `Page errors: ${JSON.stringify(errors.slice(0, 3), null, 1)}`)
  console.log('The magic seasons check passed. Pictures:', out)
} finally {
  ws?.close()
  browser.kill()
}
