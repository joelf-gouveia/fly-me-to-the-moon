import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Browser checks for the cotton candy cloud study, against the Vite server on port 5174:
// node studies/cotton-candy-study/cotton-candy-study-smoke.mjs "path/to/chrome.exe"
const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
const profile = await mkdtemp(join(tmpdir(), 'cotton-candy-browser-'))
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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 30000)
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
  await send('Page.navigate', { url: `${origin}/studies/cotton-candy-study.html` })
  for (let i = 0; i < 120; i++) {
    if (await evaluate('!!document.querySelector("#sky canvas") && !!window.__cloudStudy && window.__cloudStudy.stats().calls > 0')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#sky canvas")'), 'No WebGL preview')
  await mkdir('artifacts.local/cotton-candy-study', { recursive: true })
  async function capture(name, wait = 1800) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/cotton-candy-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const stats = () => evaluate('window.__cloudStudy.stats()')
  const expected = { today: [300, 0, 0], tint: [300, 0, 0], puffs: [300, 0, 0], cones: [300, 10, 600] }

  for (const option of Object.keys(expected)) {
    await click(`[data-option="${option}"]`)
    for (const view of ['garden', 'planet']) {
      await click(`[data-view="${view}"]`)
      await capture(`${option}-${view}`)
      const now = await stats()
      assert(now.puffs === expected[option][0] && now.cones === expected[option][1] && now.sparkles === expected[option][2], `Preview counts differ from the model for ${option}: ${JSON.stringify(now)}`)
      assert(await text('#b-puffs') === '300', 'Budget panel does not show the puffs')
    }
  }

  await click('[data-option="puffs"]')
  await click('[data-view="layer"]')
  await click('[data-flight="hover"]')
  await capture('puffs-layer-pink', 2200)
  const pink = await stats()
  await evaluate('document.querySelector("#mist").click()')
  await capture('puffs-layer-white', 1200)
  const white = await stats()
  assert(pink.fogDensity > 0.008, `The cloud layer has no mist: ${pink.fogDensity}`)
  assert(pink.fog !== white.fog, 'The mist toggle does not change the fog color')
  assert((await text('#caption-note')).includes('white'), 'Caption does not follow the mist toggle')
  await evaluate('document.querySelector("#mist").click()')
  await click('[data-flight="fly"]')
  await capture('puffs-layer-fly', 2500)

  for (const light of ['golden', 'night']) {
    await click(`[data-light="${light}"]`)
    await click('[data-view="garden"]')
    await capture(`puffs-garden-${light}`)
    await click('[data-option="cones"]')
    await capture(`cones-garden-${light}`)
    await click('[data-option="puffs"]')
  }
  await click('[data-light="day"]')

  await click('[data-option="cones"]')
  await click('[data-device="phone"]')
  await delay(400)
  const phone = await stats()
  assert(phone.puffs === 150 && phone.cones === 5 && phone.sparkles === 300, `Phone budget is not half: ${JSON.stringify(phone)}`)
  assert(await text('#b-puffs') === '150', 'Budget panel does not follow the device')
  await click('[data-device="desktop"]')
  await click('[data-option="puffs"]')
  assert(await text('#b-cottage') === '0', 'B has puffs over the cottage')
  await click('[data-option="today"]')
  assert(Number(await text('#b-cottage')) > 0, 'Today shows no puffs over the cottage')
  await click('[data-option="puffs"]')

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && Object.keys(exported.options).length === 4 && exported.settings.option === 'puffs', 'Export differs from the selected settings')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("sun shading"); })()')
  assert(docWorks, 'Technical study link unavailable')

  await evaluate('document.querySelector(".option-cards").scrollIntoView()')
  await capture('options', 600)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await click('[data-view="garden"]')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified four options in two views, preview counts against the model, the cloud layer with both mists, golden hour and night, phone budget, the cottage column, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
