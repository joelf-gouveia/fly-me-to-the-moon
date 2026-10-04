import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
// The painted maps and the game worlds are slow in software rendering, so the default is the graphics card.
const software = args.includes('--swiftshader') || !!process.env.FAIRY_SWIFTSHADER
const [browserPath, origin = 'http://127.0.0.1:5174'] = args.filter(arg => arg !== '--swiftshader')
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'planet-look-study-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...(software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
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
    // three.js reports shader compile errors on the console.
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '))
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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 90000)
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
  await send('Page.navigate', { url: `${origin}/studies/planet-look-study.html` })
  for (let i = 0; i < 240; i++) {
    if (await evaluate('!!document.querySelector("#planet-view canvas") && !!window.__planetStudy')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#planet-view canvas")'), 'No WebGL preview')
  assert(await evaluate('!!window.__planetStudy'), `The study did not start: ${JSON.stringify(errors)}`)
  await mkdir('artifacts.local/planet-look-study', { recursive: true })
  async function capture(name, wait = 1200) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/planet-look-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const stats = () => evaluate('window.__planetStudy.stats()')
  const settings = () => evaluate('window.__planetStudy.settings()')
  async function ready(planet, option) {
    for (let i = 0; i < 240; i++) {
      if (await evaluate(`window.__planetStudy.layer(${JSON.stringify(planet)}, ${JSON.stringify(option)}).ready`)) return true
      await delay(250)
    }
    throw new Error(`The ${option} look of ${planet} did not build`)
  }

  // Wait for the first frame of the game planets.
  for (let i = 0; i < 240 && !(await stats()).calls; i++) await delay(250)
  assert((await stats()).calls > 0, 'The preview draws nothing')
  // Stop the spin, so the screenshots compare the same face.
  if ((await settings()).spin) await click('#spin')
  const tilts = { mercury: 0.03, venus: 2.6, mars: 25.2, jupiter: 3.1, saturn: 26.7, uranus: 97.8, neptune: 28.3 }
  for (const planet of Object.keys(tilts)) {
    await click(`[data-planet="${planet}"]`)
    for (const option of ['today', 'retune', 'paint', 'photo']) {
      await click(`[data-option="${option}"]`)
      await ready(planet, option)
      await capture(`${planet}-${option}`, 900)
      const now = await stats()
      assert(now.planet === planet && now.option === option, `Settings did not apply for ${planet} ${option}`)
      assert(Math.abs(now.tilt - (option === 'today' ? 0 : tilts[planet])) < 0.2, `Tilt is ${now.tilt}° for ${planet} ${option}`)
      assert(now.calls > 0, `Nothing drawn for ${planet} ${option}`)
      const memory = await text('#b-memory')
      assert(!memory.includes('…'), `Texture memory not shown for ${planet} ${option}`)
    }
  }
  const built = (await stats()).layers
  assert(built.length === 21, `Expected 21 built looks, got ${built.length}`)

  await click('[data-planet="jupiter"]')
  await click('[data-option="paint"]')
  for (const view of ['portrait', 'approach', 'flight']) {
    await click(`[data-view="${view}"]`)
    await capture(`jupiter-paint-${view}`)
    const now = await stats()
    // Jupiter's radius in the game: 470 base units times PROPORTIONS.size (1.25).
    const radius = await evaluate('window.__planetStudy.radius("jupiter")')
    const altitude = { portrait: radius * 2.3, approach: radius * 0.62 }[view]
    if (altitude) assert(Math.abs(now.altitude - altitude) < 2, `The ${view} camera is at ${now.altitude} m`)
    else assert(now.altitude < radius * 145 / 470, `The flight camera is not in the air: ${now.altitude} m`)
  }
  await click('[data-view="portrait"]')
  await click('#split')
  assert(await evaluate('document.querySelector(".split-tags").classList.contains("on")'), 'Split tags are hidden')
  // Wait for frames with the new setting: the stats come from the last frame.
  await delay(400)
  const split = await stats()
  await capture('jupiter-split')
  await click('#split')
  await delay(400)
  const single = await stats()
  assert(split.calls > single.calls, `Split view does not draw twice: ${split.calls} and ${single.calls}`)
  await click('[data-option="today"]')
  assert(await evaluate('document.querySelector("#split").disabled'), 'Side by side is on for Today')

  assert((await evaluate('window.__planetStudy.shadows()')).before.length === 2, 'The far-side shadow finding changed')
  assert((await text('.finding-grid')).includes('Venus shadowed Jupiter'), 'The shadow finding is missing')

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'option-b-in-game' && Object.keys(exported.planets).length === 7 && Object.keys(exported.budgets).length === 4 && exported.settings.planet === 'jupiter', 'Export differs from the selected settings')
  assert(exported.planets.saturn.built.paint.ready && exported.planets.saturn.built.paint.bakeMs > 0, 'Export has no build time')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Storybook paint"); })()')
  assert(docWorks, 'Technical study link unavailable')
  const mapWorks = await evaluate('(async () => (await fetch("/planets/ssc/2k_saturn_ring_alpha.png")).ok)()')
  assert(mapWorks, 'Reference maps unavailable')

  await evaluate('document.querySelector(".findings").scrollIntoView()')
  await capture('findings', 600)
  await evaluate('document.querySelector(".option-cards").scrollIntoView()')
  await capture('options', 600)

  await click('[data-option="paint"]')
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified seven planets in four looks (21 built looks), the tilts, the three views, the split view, the shadow finding, export, study link, reference maps, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
