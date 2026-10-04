import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
// The game worlds and the noise of the Sun are slow in software rendering, so the default is the graphics card.
const software = args.includes('--swiftshader') || !!process.env.FAIRY_SWIFTSHADER
const [browserPath, origin = 'http://127.0.0.1:5174'] = args.filter(arg => arg !== '--swiftshader')
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'sun-study-browser-'))
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
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/sun-study.html` })
  for (let i = 0; i < 240; i++) {
    if (await evaluate('!!document.querySelector("#sun-view canvas") && !!window.__sunStudy')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#sun-view canvas")'), 'No WebGL preview')
  assert(await evaluate('!!window.__sunStudy'), `The study did not start: ${JSON.stringify(errors)}`)
  await mkdir('artifacts.local/sun-study', { recursive: true })
  async function capture(name, wait = 1000) {
    await delay(wait)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/sun-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const stats = () => evaluate('window.__sunStudy.stats()')
  const settings = () => evaluate('window.__sunStudy.settings()')
  const probe = () => evaluate('window.__sunStudy.probe()')

  for (let i = 0; i < 240 && !(await stats()).calls; i++) await delay(250)
  assert((await stats()).calls > 0, 'The preview draws nothing')
  // Stop the motion, so the screenshots show the same moment.
  if ((await settings()).motion) await click('#motion')
  await evaluate('document.querySelector("#sun-view").scrollIntoView({ block: "start" })')

  const distances = { space: 4.4, limb: 1.5 }
  for (const view of ['space', 'limb', 'surface', 'meadow']) {
    await click(`[data-view="${view}"]`)
    for (const option of ['today', 'retune', 'living', 'camera']) {
      await click(`[data-option="${option}"]`)
      await capture(`${view}-${option}`, 700)
      const now = await stats()
      assert(now.option === option && now.view === view, `Settings did not apply for ${view} ${option}`)
      assert(now.calls > 0, `Nothing drawn for ${view} ${option}`)
      if (distances[view]) assert(Math.abs(now.distance - distances[view]) < 0.01, `The ${view} camera is ${now.distance} radii from the centre`)
      if (view === 'surface') assert(now.distance > 1.03 && now.distance < 1.06, `The surface camera is ${now.distance} radii from the centre`)
      if (view === 'meadow') assert(now.air > 0.9 && Math.abs(now.elevation - 25) < 3, `The meadow is not in the air or the Sun is ${now.elevation}° high`)
    }
  }

  // From the meadow, today's Sun is sky; the proposal shows a bright Sun.
  await click('[data-view="meadow"]')
  await click('[data-option="today"]')
  const hidden = await probe()
  await click('[data-option="retune"]')
  const shown = await probe()
  assert(hidden && shown, 'The centre of the Sun is out of view in the meadow')
  assert(shown[0] > 240 && shown[1] > 225 && shown.reduce((a, b) => a + b) > hidden.reduce((a, b) => a + b) + 60, `The meadow Sun: today ${hidden}, A ${shown}`)
  for (const height of ['high', 'low']) {
    await click(`[data-height="${height}"]`)
    await capture(`meadow-retune-${height}`, 700)
    const now = await stats()
    assert(Math.abs(now.elevation - { high: 50, low: 4 }[height]) < 3, `The ${height} Sun is ${now.elevation}° high`)
  }
  const low = await probe()
  assert(low && low[0] > low[2] + 40, `The low Sun is not orange: ${low}`)
  await click('[data-height="morning"]')

  // From space, the proposal has a brighter centre than today.
  await click('[data-view="space"]')
  await click('[data-option="today"]')
  const todayCentre = await probe()
  await click('[data-option="retune"]')
  const retuneCentre = await probe()
  assert(retuneCentre.reduce((a, b) => a + b) > todayCentre.reduce((a, b) => a + b), `The centre of A (${retuneCentre}) is not brighter than today (${todayCentre})`)

  // Motion: the living Sun turns and boils.
  await click('[data-option="living"]')
  await click('#motion')
  await delay(1500)
  assert((await stats()).time > 0.5, 'The time does not move with Motion on')
  await capture('space-living-motion', 200)
  await click('#motion')
  assert(await evaluate(`document.querySelector("[data-height]").disabled`), "The height buttons are active out of the meadow view")

  // Side by side.
  const single = await stats()
  await click('#split')
  assert(await evaluate('document.querySelector(".split-tags").classList.contains("on")'), 'Split tags are hidden')
  await delay(400)
  const split = await stats()
  await capture('space-split')
  assert(split.calls > single.calls, `Split view does not draw twice: ${split.calls} and ${single.calls}`)
  await click('[data-view="surface"]')
  await capture('surface-split')
  await click('[data-view="meadow"]')
  await capture('meadow-split')
  await click('#split')
  await click('[data-option="today"]')
  assert(await evaluate('document.querySelector("#split").disabled'), 'Side by side is on for Today')

  // Phone shader.
  await click('[data-option="living"]')
  await click('[data-view="surface"]')
  await click('#phone')
  await capture('surface-living-phone')
  assert((await stats()).looks.includes('living-phone'), 'The phone look did not build')
  await click('#phone')

  // Frame times in the two hardest views.
  const frameTimes = {}
  for (const view of ['surface', 'space']) {
    await click(`[data-view="${view}"]`)
    frameTimes[view] = await evaluate('window.__sunStudy.measure(20)')
    for (const option of ['today', 'retune', 'living', 'camera']) assert(frameTimes[view][option] > 0, `No frame time for ${option} in ${view}`)
  }
  await click('#phone')
  await click('[data-view="surface"]')
  frameTimes.surfacePhoneShader = await evaluate('window.__sunStudy.measure(20)')
  await click('#phone')
  const canvas = (await stats()).canvas
  const gpu = await evaluate(`(() => { const gl = document.createElement('canvas').getContext('webgl2'); const info = gl.getExtension('WEBGL_debug_renderer_info'); return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown' })()`)

  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.study === 'sun' && Object.keys(exported.budgets).length === 4 && exported.settings.view === 'surface' && exported.real.limbExponents.length === 3, 'Export differs from the selected settings')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("Living Sun"); })()')
  assert(docWorks, 'Technical study link unavailable')

  await click('[data-view="space"]')
  await click('[data-option="living"]')
  await evaluate('document.querySelector(".findings").scrollIntoView()')
  await capture('findings', 600)
  await evaluate('document.querySelector(".option-cards").scrollIntoView()')
  await capture('options', 600)
  await evaluate('document.querySelector(".controls").scrollIntoView()')
  await capture('controls', 600)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    await evaluate('window.scrollTo(0, 0)')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(JSON.stringify({ gpu, canvas, frameTimes, meadow: { today: hidden, retune: shown, low }, space: { today: todayCentre, retune: retuneCentre } }))
  console.log('Verified four views in four options, the meadow Sun at three heights, the pixel checks, motion, the split view, the phone shader, frame times, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
