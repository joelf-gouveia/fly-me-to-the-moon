import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'star-map-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/studies/star-map-study.html' })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!document.querySelector("#sky canvas") && !!document.querySelector("#b-stars")?.textContent')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#sky canvas")'), 'No WebGL preview')
  await mkdir('artifacts.local/star-map-study', { recursive: true })
  async function capture(name, wait = 1600) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/star-map-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const visibleLabels = () => evaluate('[...document.querySelectorAll(".sky-label")].filter(label => !label.hidden).map(label => label.textContent)')

  assert(await text('#b-stars') === '2,887', 'Proposed sky does not draw the catalog')
  assert(await text('#b-figures') === '24 · 147', 'Wrong figure or line count')
  assert((await visibleLabels()).includes('Orion'), 'Orion label is not visible at start')
  await capture('orion', 2500)

  await click('[data-figure="scorpius"]')
  assert(await text('#caption-title') === 'Scorpius', 'Figure chip does not select')
  assert((await text('#caption-note')).includes('Antares'), 'Caption does not name the bright star')
  await capture('scorpius')

  await click('[data-webb="weic2320b"]')
  assert(await text('#caption-title') === 'Ring Nebula', 'Webb chip does not select')
  assert(await evaluate('!document.querySelector("#caption-credit").hidden && document.querySelector("#caption-credit a").href.includes("esawebb.org/images/weic2320b")'), 'Webb credit or link is missing')
  await capture('ring-nebula')

  const loaded = await evaluate(`Promise.all([...document.querySelectorAll('[data-webb]')].map(b => fetch('/sky/webb/' + b.dataset.webb + '.jpg').then(r => r.ok && r.headers.get('content-type').includes('image'))))`)
  assert(loaded.every(Boolean) && loaded.length === 10, 'A Webb preview does not load')

  await click('[data-figure="crux"]')
  await capture('southern-cross')

  await click('[data-preset="today"]')
  assert(await text('#mode-label') === 'BEFORE THE CHANGE', 'Baseline mode label is wrong')
  assert(await text('#b-stars') === '3,022' && await text('#b-webb') === 'None', 'Baseline cost is wrong')
  await click('[data-figure="orion"]')
  assert(await text('#mode-label') === 'MIXED COMPARISON', 'Selecting a figure does not show the proposed lines')
  await click('[data-figures="today"]')
  assert(await evaluate('document.querySelector("[data-preset=today]").getAttribute("aria-pressed") === "true"'), 'Baseline preset is not shown as selected')
  await capture('today', 2500)
  await click('[data-preset="proposal"]')
  assert(await text('#mode-label') === 'PROPOSED SKY' && await evaluate('document.querySelector("#webb").checked'), 'Proposal preset does not restore the settings')

  await evaluate('{ const l = document.querySelector("#limit"); l.value = 4; l.dispatchEvent(new Event("input")) }')
  assert((await text('#limit-out')).startsWith('4.0 · 518'), 'Magnitude limit does not update the count')
  await evaluate('{ const l = document.querySelector("#limit"); l.value = 5.5; l.dispatchEvent(new Event("input")) }')
  await evaluate('document.querySelector("#asterisms").click()')
  const withoutHelpers = await text('#b-figures')
  assert(withoutHelpers === '19 · 122', `Asterism toggle does not remove the helper shapes: ${withoutHelpers}`)
  await evaluate('document.querySelector("#asterisms").click()')

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && exported.figures.length === 24 && exported.webb.length === 10 && exported.settings.background === 'real', 'Export differs from selected settings')

  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Bright Star Catalog"); })()')
  assert(docWorks, 'Technical study link unavailable')

  await evaluate('document.querySelector("#chart").scrollIntoView()')
  await capture('chart', 600)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await click('[data-figure="cygnus"]')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified catalog sky, figure and Webb selection with credit, all ten previews, baseline, magnitude limit, asterisms, export, study link, chart, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
