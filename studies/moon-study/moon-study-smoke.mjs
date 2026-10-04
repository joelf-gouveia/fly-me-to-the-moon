import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'moon-study-browser-'))
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
  await send('Page.navigate', { url: `${origin}/studies/moon-study.html` })
  for (let i = 0; i < 120; i++) {
    if (await evaluate('!!document.querySelector("#moon canvas") && !!window.__moonStudy')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#moon canvas")'), 'No WebGL preview')
  assert(await evaluate('!!window.__moonStudy'), `The study did not start: ${JSON.stringify(errors)}`)
  await mkdir('artifacts.local/moon-study', { recursive: true })
  async function capture(name, wait = 1500) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/moon-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const stats = () => evaluate('window.__moonStudy.stats()')
  const settings = () => evaluate('window.__moonStudy.settings()')
  const orbits = { sky: 800, close: 528, far: 1100 }

  await click('[data-speed="0"]')
  await evaluate('window.__moonStudy.setTime(0)')
  for (const option of ['sky', 'close', 'far']) {
    await click(`[data-option="${option}"]`)
    const moonView = await evaluate('!document.querySelector("[data-view=moon]").disabled')
    assert(moonView === (option !== 'sky'), `Moon view availability is wrong for ${option}`)
    for (const view of ['system', 'meadow', 'moon']) {
      if (view === 'moon' && option === 'sky') continue
      await click(`[data-view="${view}"]`)
      await capture(`${option}-${view}`)
      const now = await stats()
      assert(Math.abs(now.orbitRadius - orbits[option]) < 1, `Preview orbit differs from the model for ${option}: ${now.orbitRadius}`)
      assert(now.moonVisible === (option !== 'sky' || view === 'meadow'), `Moon visibility is wrong for ${option} in ${view}`)
      assert(now.moonOccluder === (option !== 'sky'), `Moon shadow is wrong for ${option}`)
    }
  }
  await click('[data-option="far"]')
  await click('[data-view="meadow"]')
  const morning = await stats()
  assert(morning.phase === 'Last quarter' && morning.moonElevation > 20 && morning.sunElevation > 15, `The morning Moon is not up at the start: ${JSON.stringify(morning)}`)

  await check('#fog-free', false); await check('#earthshine', false)
  await capture('far-meadow-today')
  const today = await stats()
  assert(today.moonFog === true && today.earthshine === 1, `Fixes do not turn off: ${JSON.stringify(today)}`)
  await check('#fog-free', true); await check('#earthshine', true)
  const fixed = await stats()
  assert(fixed.moonFog === false && Math.abs(fixed.earthshine - 0.12) < 1e-6, `Fixes do not turn on: ${JSON.stringify(fixed)}`)

  for (const type of ['solar', 'lunar']) {
    await click(`[data-jump="${type}"]`)
    const now = await stats(), chosen = await settings()
    assert(now.eclipse === type && chosen.view === 'eclipse' && chosen.speed === 0, `Jump to the ${type} eclipse failed: ${JSON.stringify(now)}`)
    assert((await text('#caption-note')).toLowerCase().includes(`${type} eclipse`), `The ${type} caption is missing`)
    await capture(`far-${type}-eclipse`, 2500)
  }
  const ticks = () => evaluate('document.querySelectorAll("#ticks i").length')
  assert(await ticks() === 6, `C at 28° has ${await ticks()} eclipses, not 6`)
  await evaluate(`(() => { const input = document.querySelector('#inclination'); input.value = '5.1'; input.dispatchEvent(new Event('input')) })()`)
  assert(await ticks() === 24, `C at 5.1° has ${await ticks()} eclipses, not 24`)
  assert(await text('#b-eclipses') === '12 solar · 12 lunar', 'Eclipse count does not follow the tilt')

  await click('[data-option="close"]')
  await click('[data-view="system"]')
  await check('#zones', true)
  await capture('close-zones')
  await check('#zones', false)
  await click('[data-option="far"]')
  await click('[data-jump="full"]')
  assert((await stats()).phase === 'Full moon', 'Next full moon did not reach a full moon')

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && Object.keys(exported.options).length === 3 && exported.settings.option === 'far' && exported.eclipses.length === 6, 'Export differs from the selected settings')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Journey Moon"); })()')
  assert(docWorks, 'Technical study link unavailable')

  await evaluate('document.querySelector(".option-cards").scrollIntoView()')
  await capture('options', 600)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await click('[data-view="meadow"]')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified three options in their views, the orbit radius against the model, the start Moon, the fog and earthshine fixes, both eclipse jumps, eclipse counts per tilt, the full moon jump, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
