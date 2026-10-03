import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'proportions-study-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
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
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry)
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
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).textContent`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const check = (selector, value) => evaluate(`(() => { const box = document.querySelector(${JSON.stringify(selector)}); if (box.checked !== ${value}) box.click() })()`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/proportions-study.html` })
  for (let i = 0; i < 120; i++) {
    if (await evaluate('!!document.querySelector("#sizes canvas") && !!window.__sizeStudy')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#sizes canvas")'), 'No WebGL preview')
  assert(await evaluate('!!window.__sizeStudy'), `The study did not start: ${JSON.stringify(errors)}`)
  await mkdir('artifacts.local/proportions-study', { recursive: true })
  async function capture(name, wait = 1500) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/proportions-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const stats = () => evaluate('window.__sizeStudy.stats()')
  const passing = () => evaluate('document.querySelectorAll("#targets li.pass").length')
  const failingIds = () => evaluate('[...document.querySelectorAll("#targets li.fail")].map(item => item.dataset.target)')
  const slide = (key, value) => evaluate(`(() => { const input = document.querySelector('#s-${key}'); input.value = '${value}'; input.dispatchEvent(new Event('input')) })()`)
  const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance

  let now = await stats()
  assert(await passing() === 12, `The recommendation does not pass every target: ${await failingIds()}`)
  assert(near(now.earthRadius, 275) && near(now.moonOrbit, 962.5) && near(now.earthOrbit, 8250) && now.beltScale === 2.5, `Preview differs from the model: ${JSON.stringify(now)}`)
  for (const view of ['far', 'system', 'pair', 'ground']) {
    await click(`[data-view="${view}"]`)
    await capture(`ideal-${view}`)
  }
  await click('[data-preset="today"]')
  await delay(300)
  now = await stats()
  assert(near(now.earthOrbit, 3300) && near(now.moonOrbit, 1100) && now.beltScale === 1, `Today preset differs from the game: ${JSON.stringify(now)}`)
  assert(JSON.stringify(await failingIds()) === '["pair","close"]', `Today fails other targets: ${await failingIds()}`)
  for (const view of ['far', 'ground']) {
    await click(`[data-view="${view}"]`)
    await capture(`today-${view}`)
  }
  await slide('size', 1.5)
  await delay(300)
  assert((await failingIds()).includes('life'), 'Planets ×1.5 do not fail the life target')
  await click('#find')
  assert((await text('#find-note')).startsWith('No setting'), 'The search finds a set for ×1.5')
  await slide('size', 1.4)
  await click('#find')
  await delay(300)
  assert(await passing() === 12 && (await text('#find-note')).startsWith('Found'), `The search at ×1.4 does not pass: ${await failingIds()}`)
  await click('[data-preset="wide"]')
  await delay(300)
  assert((await failingIds()).length > 3, 'The wide preset passes too many targets')
  await capture('wide-far')
  await click('[data-preset="ideal"]')

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && exported.targets.length === 12 && exported.settings.size === 1.25 && exported.code.length > 10, 'Export differs from the settings')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Planets ×1.25"); })()')
  assert(docWorks, 'Technical study link unavailable')
  await evaluate('document.querySelector(".neighbourhood").scrollIntoView()')
  await capture('neighbourhood', 600)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified the recommendation (12 of 12 targets) and today (pair and close fail) against the preview, four views, the search at ×1.5 and ×1.4, the wide preset, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
