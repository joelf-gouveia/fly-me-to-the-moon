import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// node scripts/hair-study-smoke.mjs "path/to/chrome.exe"
if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const profile = await mkdtemp(join(tmpdir(), 'hair-study-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const out = 'artifacts.local/hair-study'
const candidates = ['pixie', 'spaceBuns', 'cloudCurls', 'ponytail', 'crownBraid', 'braid', 'twinBraids', 'longWaves']
let ws
try {
  // Port 0: Chrome chooses a free port and writes it to the profile, so an old
  // browser on a fixed port cannot take the connection.
  let tabs
  for (let i = 0; i < 60; i++) {
    try {
      const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]
      tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break
    } catch {}
    await delay(250)
  }
  if (!tabs?.length) throw new Error('Browser did not start')
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails)
    if (msg.id) {
      const handler = pending.get(msg.id); pending.delete(msg.id)
      if (!handler) return
      if (msg.error) handler.reject(msg.error); else handler.resolve(msg.result)
    }
  }
  // A headless browser under load can stall on one call: fail with its name, not a silent hang.
  const send = (method, params = {}, timeout = 45000) => new Promise((resolve, reject) => {
    const callId = ++id
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`${method} did not answer in ${timeout / 1000} s`)) }, timeout)
    pending.set(callId, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
    ws.send(JSON.stringify({ id: callId, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const check = async (expression, message) => { if (!await evaluate(expression)) throw new Error(message) }
  const click = selector => evaluate(`document.querySelector('${selector}').click()`)
  await send('Runtime.enable'); await send('Page.enable')
  // Manual frames: each renderStudy() advances the animation by a fixed step.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.studyNow = 0; window.requestAnimationFrame = callback => { window.studyFrame = callback; return 1; }; window.renderStudy = (steps = 1) => { for (let i = 0; i < steps; i++) { window.studyNow += 33; window.studyFrame(window.studyNow); } };` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'}/hair-style-study.html` })
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.studyFrame && document.body.dataset.measured === "true"')) break
    await delay(250)
  }
  await check('!!window.studyFrame && document.querySelectorAll("canvas").length === 2', 'Study did not initialize')
  await check('document.body.dataset.measured === "true"', 'Measurements did not finish')
  await mkdir(out, { recursive: true })
  const capture = async (name, clip) => {
    await evaluate('renderStudy(12)')
    const params = { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }
    const shot = await send('Page.captureScreenshot', params, 20000).catch(() => send('Page.captureScreenshot', params))
    await writeFile(`${out}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  // Scroll the section into view first: the capture shows only what the viewport renders.
  const box = selector => evaluate(`(() => { const e = document.querySelector('${selector}'); e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: Math.min(r.height, innerHeight) } })()`)
  const exported = () => evaluate(`(async () => {
    const original = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return original(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = original; HTMLAnchorElement.prototype.click = click; }
  })()`)

  await capture('page')
  await check(`document.querySelectorAll('tbody tr').length === 11 && [...document.querySelectorAll('[data-metric="wings"]')].every(cell => cell.textContent !== '…')`, 'Table is not complete')
  const initial = await exported()
  if (initial.shortlist.length !== 6 || initial.menu.rows !== 3 || Object.keys(initial.measurements).length !== 11) throw new Error('Wrong initial export')
  for (const id of candidates) {
    if (initial.measurements[id].wingContact.length || !initial.measurements[id].earsVisible) throw new Error(`${id} fails the wing or ear rule`)
  }

  const workspace = await box('.workspace')
  for (const id of ['bun', ...candidates]) {
    await click(`[data-style="${id}"]`)
    await capture(`menu-${id}`, workspace)
  }
  for (const view of ['flight', 'three', 'side', 'front']) {
    await click(`[data-view="${view}"]`)
    await capture(`${view}-longWaves`, await box('#hair-view'))
  }
  await click('[data-style="ponytail"]'); await click('[data-view="side"]'); await click('[data-boost="1"]')
  await capture('side-ponytail-boost', await box('#hair-view'))
  await click('[data-boost="0"]'); await click('[data-view="menu"]')
  await click('[data-backdrop="night"]'); await click('[data-look="hairColor"][data-value="midnight"]')
  await capture('night-midnight', await box('#hair-view'))
  await click('[data-backdrop="meadow"]'); await click('[data-look="hairColor"][data-value="plum"]')

  await capture('lineup-close', await box('.lineup-section'))
  await click('[data-angle="side"]')
  await capture('lineup-side', await box('.lineup-section'))
  await click('[data-angle="rear"]'); await click('[data-shot="flight"]')
  await capture('lineup-flight', await box('.lineup-section'))
  await click('#silhouette')
  await capture('lineup-flight-silhouette', await box('.lineup-section'))
  await click('#silhouette'); await click('[data-shot="close"]')
  await capture('table', await box('.numbers-section'))

  await evaluate(`document.querySelector('[data-shortlist="pixie"]').click()`)
  await check(`document.querySelector('#menu-count').textContent === '10' && document.querySelector('#menu-rows').textContent === '4'`, 'Shortlist did not reach the menu preview')
  await capture('menu-preview', await box('.menu-section'))
  await click('#reset-shortlist')
  await check(`document.querySelector('#menu-count').textContent === '9'`, 'Reset did not restore the recommendation')
  await click('#pause')
  await check(`document.querySelector('#pause').getAttribute('aria-pressed') === 'true'`, 'Pause did not work')
  await click('#pause')

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
    // Let the resize observers run before the frames that the capture draws.
    await delay(300); await evaluate('renderStudy(2)'); await delay(200)
    await check('document.documentElement.scrollWidth <= innerWidth', `Horizontal overflow at ${width}px`)
    await evaluate('scrollTo(0, 0)')
    await capture(`mobile-${width}`)
    await evaluate(`document.querySelector('.inspector').scrollIntoView()`)
    await capture(`mobile-${width}-inspector`)
    await evaluate(`document.querySelector('.lineup-section').scrollIntoView()`)
    await capture(`mobile-${width}-lineup`)
  }
  if (errors.length) throw new Error(JSON.stringify(errors))
  console.log(`Hair study passed: 11 styles measured, wing and ear rules, camera views, boost, night, line-up, shortlist, export, pause, responsive layout. Screenshots in ${out}/.`)
} finally {
  ws?.close()
  // On Windows, kill() can leave the child processes of Chrome running.
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' })
  else browser.kill()
}
