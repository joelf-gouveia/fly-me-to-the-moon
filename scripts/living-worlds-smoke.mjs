// Checks the living skies of the worlds in the real game (option B of the living worlds study,
// docs/living-worlds-study.md): no puffs, the clouds of each world only inside its air, the lightning
// of Jupiter, the dust devils of Mars, the sparks on the night side of the Moon, the sky notes of the
// friend, reduced motion and the phone. It takes a picture inside the air of each world.
// Run against the dev server on port 5174:
//   node scripts/living-worlds-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const out = 'artifacts.local/living-worlds'
await mkdir(out, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'living-worlds-browser-'))
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
  /** Waits up to `seconds` for a test on the snapshot, and gives the last snapshot. */
  async function waitFor(test, seconds, step = 100) {
    let state
    for (let i = 0; i < seconds * 1000 / step; i++) {
      state = await snapshot()
      if (test(state)) return state
      await delay(step)
    }
    return state
  }
  async function open({ width = 1280, height = 720, mobile = false, reduced = false } = {}) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 120 && !(await evaluate('typeof __fairyTest !== "undefined"').catch(() => false)); i++) await delay(250)
    await evaluate('document.querySelector("#begin-button").click()')
    await delay(3000)
    return snapshot()
  }
  /** A local direction on the day side of a world, under a high Sun: the Sun is at the middle of the scene. */
  const daySide = kind => evaluate(`(() => { const w = __fairyTest.world(${JSON.stringify(kind)}); w.group.updateMatrixWorld(true); const p = w.group.worldToLocal(w.group.position.clone().multiplyScalar(0.5)); return p.normalize().toArray() })()`)
  /** A local direction on the night side of a world. */
  const nightSide = kind => evaluate(`(() => { const w = __fairyTest.world(${JSON.stringify(kind)}); w.group.updateMatrixWorld(true); const p = w.group.worldToLocal(w.group.position.clone().multiplyScalar(2)); return p.normalize().toArray() })()`)
  const placeOver = (kind, dir, height) => evaluate(`__fairyTest.placeOver(${JSON.stringify(kind)}, ${JSON.stringify(dir)}, ${height})`)
  const world = kind => evaluate(`(() => { const w = __fairyTest.world(${JSON.stringify(kind)}); return { atmosphere: w.atmosphere, cloudHeight: w.cloudHeight, puffs: Boolean(w.clouds.getObjectByName('cloud-puffs')), deck: Boolean(w.clouds.getObjectByName('venus-deck')) } })()`)

  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  const start = await open()
  const LIVING = ['mercury', 'venus', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
  assert(LIVING.every(kind => start.skies[kind]), `Worlds with no living sky: ${LIVING.filter(kind => !start.skies[kind])}`)
  assert(!start.skies.earth && !start.skies.fairy && !start.skies.ceres && !start.skies.vesta, `Earth, Blossom Haven, Ceres or Vesta has a living sky: ${Object.keys(start.skies)}`)
  // From the start on Earth, no world shows its clouds: from far away the painted maps show.
  assert(Object.entries(start.skies).every(([, sky]) => !sky.visible), 'A living sky shows from far away')

  // ---- Inside the air of each world with air: no puffs, the clouds show; far away they do not ---------
  const calls = {}
  for (const kind of ['venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const info = await world(kind)
    assert(!info.puffs, `${kind} has the puffs of before`)
    if (kind === 'venus') assert(info.deck, 'Venus has no painted deck')
    await placeOver(kind, await daySide(kind), kind === 'venus' ? info.cloudHeight * 1.4 : info.cloudHeight + 10)
    const inside = await waitFor(state => state.skies[kind].visible, 3)
    assert(inside.skies[kind].visible, `The clouds of ${kind} do not show inside its air`)
    calls[kind] = inside.graphics.calls
    await delay(600)
    await picture(`${kind}.jpg`)
    await placeOver(kind, await daySide(kind), info.atmosphere * 3)
    const far = await waitFor(state => !state.skies[kind].visible, 3)
    assert(!far.skies[kind].visible, `The clouds of ${kind} show from far away`)
    console.log(`${kind}: ${inside.skies[kind].parts.join(', ')} · ${calls[kind]} draw calls inside the air`)
  }

  // ---- Jupiter: the storm towers flash, and the friend tells the fact --------------------------------
  const jupiter = await world('jupiter')
  await placeOver('jupiter', await daySide('jupiter'), jupiter.cloudHeight * 0.7)
  const flash = await waitFor(state => state.skies.jupiter.flash > 0.5, 5, 50)
  assert(flash.skies.jupiter.flash > 0.5, 'No lightning on Jupiter in 5 s')
  const jupiterNote = await waitFor(state => state.skyNote.shown === 'jupiter', 20, 250)
  assert(jupiterNote.skyNote.shown === 'jupiter' && /storm/.test(jupiterNote.skyNote.text), `No sky note on Jupiter: ${JSON.stringify(jupiterNote.skyNote)}`)
  assert(jupiterNote.warmth.shown === null, 'The sky note shows with the thermometer')
  await picture('jupiter-note.jpg')
  console.log(`Jupiter: lightning ${flash.skies.jupiter.flash.toFixed(2)}, note "${jupiterNote.skyNote.text}"`)

  // ---- Venus: the note says that scientists are not sure -------------------------------------------
  const venus = await world('venus')
  await placeOver('venus', await daySide('venus'), venus.cloudHeight * 0.8)
  const venusNote = await waitFor(state => state.skyNote.shown === 'venus', 20, 250)
  assert(venusNote.skyNote.shown === 'venus' && /Scientists are not sure/.test(venusNote.skyNote.text), `The Venus note does not say that scientists are not sure: ${JSON.stringify(venusNote.skyNote)}`)

  // ---- Mars: the dust devils move -------------------------------------------------------------------
  // The dust devils move only within 220 m of the camera: the check tries some places on the day side.
  let mars
  const sun = await daySide('mars')
  for (const [x, y, z] of [[0, 0, 0], [0.5, 0.3, 0], [-0.5, -0.3, 0.2], [0.2, -0.5, 0.4], [-0.3, 0.5, -0.4]]) {
    await placeOver('mars', [sun[0] + x, sun[1] + y, sun[2] + z], 8)
    mars = await waitFor(state => state.skies.mars.devils > 0, 1)
    if (mars.skies.mars.devils > 0) break
  }
  assert(mars.skies.mars.devils > 0, 'No dust devil moves on Mars')
  // The warm ground of the day makes the dust devils: the night side has none.
  await placeOver('mars', await nightSide('mars'), 8)
  const night = await waitFor(state => state.skies.mars.devils === 0, 2)
  assert(night.skies.mars.devils === 0, 'A dust devil moves on the night side of Mars')
  await placeOver('mars', await daySide('mars'), 8)
  await delay(800)
  await picture('mars-low.jpg')

  // ---- The Moon: a spark on the night side, and the note of the spark ---------------------------------
  // The fairy flies on, and the Moon is small: she goes back to the middle of the night side each 2 s.
  let spark
  for (let tries = 0; tries < 15 && !(spark?.skies.moon.sparks > 0); tries++) {
    await placeOver('moon', await nightSide('moon'), 6)
    spark = await waitFor(state => state.skies.moon.sparks > 0, 2, 50)
  }
  assert(spark.skies.moon.sparks > 0, 'No spark on the night side of the Moon in 20 s')
  await picture('moon-spark.jpg')
  const moonNote = await waitFor(state => state.skyNote.shown === 'moon', 10, 100)
  assert(moonNote.skyNote.shown === 'moon', `No sky note on the Moon: ${JSON.stringify(moonNote.skyNote)}`)
  // No spark on the day side. A spark of the night side can end in its slot of 2.5 s first.
  await placeOver('moon', await daySide('moon'), 6)
  await delay(2600)
  await placeOver('moon', await daySide('moon'), 6)
  for (let i = 0; i < 40; i++) {
    const state = await snapshot()
    assert(state.skies.moon.sparks === 0, 'A spark shows on the day side of the Moon')
    await delay(100)
  }
  console.log('Moon: a spark on the night side, none on the day side')

  // ---- Reduced motion: the skies stand still, with no flash and no spark ----------------------------
  await open({ reduced: true })
  await placeOver('jupiter', await daySide('jupiter'), jupiter.cloudHeight * 0.7)
  const still = await snapshot()
  for (let i = 0; i < 30; i++) {
    const state = await snapshot()
    assert(state.skyClock === still.skyClock, 'The clock of the skies runs with reduced motion')
    assert(state.skies.jupiter.flash === 0, 'Lightning flashes with reduced motion')
    await delay(100)
  }

  // ---- The phone ---------------------------------------------------------------------------------
  await open({ width: 390, height: 844, mobile: true })
  await placeOver('jupiter', await daySide('jupiter'), jupiter.cloudHeight + 10)
  const phone = await waitFor(state => state.skies.jupiter.visible, 3)
  assert(phone.graphics.mobile, 'The phone page has no phone graphics')
  await delay(600)
  await picture('jupiter-phone.jpg')
  console.log(`Phone: ${phone.graphics.calls} draw calls inside the air of Jupiter (computer: ${calls.jupiter})`)

  if (errors.length) throw new Error(`Page errors: ${JSON.stringify(errors.slice(0, 3)).slice(0, 1500)}`)
  console.log('Living worlds check passed')
} finally {
  ws?.close()
  browser.kill()
}
