import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'asteroid-belt-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=9337', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9337/json')).json(); break } catch { await delay(250) }
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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 20000)
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
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/asteroid-belt-study.html' })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!document.querySelector("#belt canvas") && !!window.__beltStudy')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#belt canvas")'), 'No WebGL preview')
  await mkdir('artifacts.local/asteroid-belt-study', { recursive: true })
  async function capture(name, wait = 1800) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/asteroid-belt-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const stats = () => evaluate('window.__beltStudy.stats()')
  const expected = { ribbon: { dust: 12000, ring: 0, worlds: 0 }, ring: { dust: 6000, ring: 3200, worlds: 0 }, living: { dust: 12000, ring: 0, worlds: 2 } }

  for (const option of ['ribbon', 'ring', 'living']) {
    await click(`[data-option="${option}"]`)
    for (const view of ['system', 'mars', 'inside']) {
      await click(`[data-view="${view}"]`)
      await capture(`${option}-${view}`, view === 'inside' ? 2500 : 1600)
      const now = await stats()
      assert(now.dust === expected[option].dust && now.ringRocks === expected[option].ring && now.worlds === expected[option].worlds, `Preview counts differ from the model for ${option}: ${JSON.stringify(now)}`)
      if (view === 'inside') assert(option === 'living' ? now.nearRocks > 40 : now.nearRocks === 0, `Near field is wrong for ${option}: ${now.nearRocks}`)
    }
  }
  assert(await evaluate('document.querySelector("[data-view=ceres]").disabled === false'), 'Ceres view is not available in option C')
  await click('[data-view="ceres"]')
  await capture('living-ceres')
  assert((await text('#caption-note')).includes('Occator'), 'Ceres caption is missing')
  await click('[data-option="ribbon"]')
  assert(await evaluate('window.__beltStudy.settings().view') === 'inside', 'Ceres view stays open without Ceres')
  assert(await evaluate('document.querySelector("[data-view=ceres]").disabled'), 'Ceres view is not disabled in option A')

  await click('[data-option="ring"]')
  await click('[data-device="phone"]')
  await delay(300)
  const phone = await stats()
  assert(phone.dust === 3000 && phone.ringRocks === 1600, `Phone budget is not half: ${JSON.stringify(phone)}`)
  assert(await text('#b-rocks') === '1,600', 'Budget panel does not follow the device')
  await click('[data-device="desktop"]')

  await click('[data-option="living"]')
  await click('[data-view="system"]')
  await evaluate('document.querySelector("#zones").click()')
  await capture('living-zones')
  assert(await evaluate('[...document.querySelectorAll(".belt-label.gap")].some(label => !label.hidden)'), 'Gap labels do not show')
  await evaluate('document.querySelector("#zones").click()')

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && Object.keys(exported.options).length === 3 && exported.settings.option === 'living', 'Export differs from the selected settings')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Kirkwood"); })()')
  assert(docWorks, 'Technical study link unavailable')

  await evaluate('document.querySelector(".option-cards").scrollIntoView()')
  await capture('options', 600)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await click('[data-view="inside"]')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified three options in three views, preview counts against the model, Ceres view, phone budget, safe zones, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
