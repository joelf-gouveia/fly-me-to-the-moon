// Checks the star sky in the real game: catalog stars, the Star pictures toggle
// (lines, names and Webb pictures), the Webb caption with its credit, and the
// credits in the Worlds dialog. Run against the dev server on port 5174:
// node scripts/star-sky-smoke.mjs "path/to/chrome.exe"
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const debugPort = 9336
const profile = await mkdtemp(join(tmpdir(), 'star-sky-browser-'))
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
  const sky = () => evaluate('__fairyTest.snapshot().sky')
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  // Control simulation time so the check is repeatable even on software GPUs.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/?test' })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#settings-toggle")')) break
    await delay(250)
  }
  await mkdir('artifacts.local/star-sky', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/star-sky/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(2)')
  let state = await sky()
  assert(!state.pictures && state.labels.length === 0, 'Star pictures are on before the toggle')
  assert(state.webb.every(image => !image.loaded), 'Webb pictures load before the toggle')

  await evaluate('document.querySelector("#setting-stars").click()')
  await evaluate('advanceFlight(0.5)')
  state = await sky()
  assert(state.pictures, 'The Star pictures switch does not turn the pictures on')
  assert(state.visibility > 0.05 || state.labels.length === 0, 'Names show in a daylight sky')

  // Climb out of the atmosphere, as in scripts/browser-smoke.mjs.
  await key('keyDown', 'KeyW', 'w'); await key('keyDown', 'ShiftLeft', 'Shift')
  await evaluate('advanceFlight(6)')
  await key('keyUp', 'KeyW', 'w'); await key('keyUp', 'ShiftLeft', 'Shift')
  await evaluate('advanceFlight(3)')
  for (let i = 0; i < 40 && !(await sky()).webb.every(image => image.loaded); i++) await delay(250)
  state = await sky()
  assert(state.visibility > 0.9, `Stars are faint in space: ${state.visibility}`)
  assert(state.webb.every(image => image.loaded), 'A Webb picture did not load')
  await evaluate('advanceFlight(0.2)')
  state = await sky()
  assert(state.labels.length > 0, 'No names are visible in space')
  await screenshot('pictures-on')
  console.log('In space:', state.labels.slice(0, 12).join(', '))

  // Look around; record every name and caption seen.
  const seen = new Set(state.labels), captions = new Set()
  for (const code of ['ArrowLeft', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
    await key('keyDown', code, code)
    for (let step = 0; step < 12; step++) {
      await evaluate('advanceFlight(0.5)')
      const view = await sky()
      view.labels.forEach(label => seen.add(label))
      if (view.caption && !captions.has(view.caption)) {
        captions.add(view.caption)
        const credit = await evaluate('document.querySelector(".sky-caption .credit").textContent')
        const link = await evaluate('document.querySelector(".sky-caption a").href')
        assert(credit.startsWith('Credit: ') && link.startsWith('https://esawebb.org/images/'), 'The caption has no credit or link')
        await screenshot(`caption-${captions.size}`)
      }
    }
    await key('keyUp', code, code)
  }
  console.log(`Names seen while turning: ${seen.size}. Captions: ${[...captions].join(', ') || 'none on this path'}`)

  await evaluate('document.querySelector("#setting-stars").click()')
  await evaluate('advanceFlight(0.2)')
  state = await sky()
  assert(!state.pictures && state.labels.length === 0 && state.caption === null, 'The toggle does not hide names, lines and pictures')
  assert(await evaluate('!document.querySelector("#scene canvas") || document.querySelector(".sky-labels").hidden'), 'The name layer stays visible')
  await screenshot('pictures-off')

  await evaluate('document.querySelector("#settings-toggle").click()')
  const credits = await evaluate('[...document.querySelectorAll("#settings .sky-credits li a")].map(a => a.href)')
  assert(credits.length === 10 && credits.every(href => href.startsWith('https://esawebb.org/images/')), 'Settings credits are incomplete')
  await evaluate('document.querySelector("#close-settings").click()')

  await evaluate('document.querySelector("#setting-stars").click()')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await evaluate('dispatchEvent(new Event("resize")); advanceFlight(0.5)')
  await screenshot('mobile-390')
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified toggle off by default, lazy Webb load, names in space only, caption credit, toggle hides names/lines/pictures, Worlds credits, and 390px layout. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
