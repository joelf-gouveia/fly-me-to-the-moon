import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'transition-study-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=9346', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9346/json')).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('favicon.ico')) errors.push(message.params.entry)
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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 60000)
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
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const reading = key => evaluate(`parseFloat(document.querySelector('#r-${key}').textContent.replace(/,/g, ''))`)
  // A new run clears the readouts. Wait for the first frame of the run.
  async function firstReading() {
    for (let i = 0; i < 80; i++) {
      const value = await reading('altitude')
      if (typeof value === 'number' && Number.isFinite(value)) return value
      await delay(100)
    }
    throw new Error('No readout for the new run')
  }
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/planet-transition-study.html` })
  for (let i = 0; i < 120; i++) {
    if (await evaluate('!!document.querySelector("#transition-view canvas") && document.querySelectorAll("#score tbody tr").length === 6')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#transition-view canvas")'), `No WebGL view: ${JSON.stringify(errors)}`)
  await mkdir('artifacts.local/transition-study', { recursive: true })
  async function capture(name, wait = 800) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/transition-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  // The score table: today snaps in four moments, the options in none outside the ground.
  const bad = await evaluate('[...document.querySelectorAll("#score tbody tr")].map(row => [...row.querySelectorAll("td")].map(cell => cell.classList.contains("bad")))')
  assert(bad.filter(row => row[0]).length >= 3, `Today shows too few snaps: ${JSON.stringify(bad)}`)
  // The live Earth has a new landscape at each load, so B is checked against a limit, not the red mark.
  const turnsB = await evaluate('[...document.querySelectorAll("#score tbody tr")].map(row => parseFloat(row.querySelectorAll("td")[2].querySelector("b").textContent))')
  assert(turnsB.every((turn, index) => index === 3 || turn < 4), `Option B snaps outside the ground: ${JSON.stringify(turnsB)}`)
  assert(await evaluate('[...document.querySelectorAll(".chart svg")].every(svg => svg.querySelectorAll("path.series").length === 4)'), 'A chart has not four lines')
  assert(await evaluate('document.querySelectorAll("#findings li").length') === 9, 'Nine findings expected')

  // Each option flies the dive: the altitude falls, and the readouts update.
  for (const option of ['today', 'retune', 'onesky', 'door']) {
    await click(`[data-option="${option}"]`)
    await click('[data-scenario="dive"]')
    const start = await firstReading()
    await delay(3500)
    const later = await reading('altitude')
    assert(later < start, `${option}: the altitude does not fall (${start} → ${later})`)
    await capture(`dive-${option}`, 200)
  }
  // Free flight from the meadow: W climbs.
  await click('[data-option="onesky"]')
  await click('[data-free="meadow"]')
  const ground = await firstReading()
  await evaluate('document.querySelector("#transition-view canvas").focus()')
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 })
  // The headless browser draws few frames each second, and each frame is 0.05 s or less of flight.
  await delay(6000)
  const climbed = await reading('altitude'), angle = await reading('pitch')
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 })
  assert(climbed > ground + 3 && angle > 10, `Free flight does not climb with W (${ground} → ${climbed} m, ${angle}°)`)
  await capture('free-climb', 200)

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.study === 'planet-transition-study' && Object.keys(exported.results).length === 6 && exported.results.dive.today.maxTurn > 10, 'Export differs from the results')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("One sky"); })()')
  assert(docWorks, 'Technical study link unavailable')
  await evaluate('document.querySelector("#charts-title").scrollIntoView()')
  await capture('charts', 400)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await capture(`mobile-${width}`)
    // A mobile viewport widens to fit wide content, so compare with the target width too.
    assert(!(await evaluate(`document.documentElement.scrollWidth > Math.min(innerWidth, ${width})`)), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified the score table (today snaps, B does not), four lines in each chart, nine findings, the dive for four options, free-flight climb, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
