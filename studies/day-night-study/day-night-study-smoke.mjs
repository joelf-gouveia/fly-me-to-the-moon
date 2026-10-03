import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'day-night-browser-'))
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
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 15000)
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
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/studies/day-night-study.html' })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!document.querySelector("#garden canvas") && !!document.querySelector("#elevation")?.textContent')) break
    await delay(250)
  }
  assert(await evaluate('!!document.querySelector("#garden canvas")'), 'No WebGL preview')
  await mkdir('artifacts.local', { recursive: true })
  async function capture(name) {
    await delay(350)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/day-night-${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  for (const [name, hour] of [['sunset', 17.5], ['dawn', 6.5], ['noon', 12], ['night', 0]]) {
    await evaluate(`document.querySelector('[data-hour="${hour}"]').click()`)
    assert((await evaluate('document.querySelector("#phase-title").textContent')).toLowerCase().startsWith(name), `Wrong ${name} label`)
    await capture(name)
  }
  assert(await evaluate('document.querySelector("#sunlight").textContent === "0%"'), 'Sun shines at midnight')
  await evaluate('document.querySelector("[data-style=deep]").click()')
  await capture('deep-night')
  await evaluate('document.querySelector("#compare").click()')
  assert(await evaluate('document.querySelector("#phase-title").textContent === "Always daytime"'), 'Baseline toggle failed')
  await capture('baseline')
  await evaluate('document.querySelector("#compare").click(); document.querySelector("[data-style=gentle]").click(); document.querySelector("#view").value="home"; document.querySelector("#view").dispatchEvent(new Event("change"))')
  await capture('cottage')
  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.status === 'proposal-only' && exported.nightStyle === 'gentle' && exported.hour === 0 && exported.camera === 'home', 'Export differs from selected settings')
  await evaluate('document.querySelector("#play").click()')
  await delay(700)
  const time = await evaluate('Number(document.querySelector("#hour").value)')
  assert(time > 0, 'Playback does not advance')
  await evaluate('document.querySelector("#play").click()')
  const pausedTime = await evaluate('Number(document.querySelector("#hour").value)')
  await delay(350)
  assert(await evaluate('Number(document.querySelector("#hour").value)') === pausedTime, 'Pause does not freeze time')
  await evaluate('document.querySelector("#hour").value=6; document.querySelector("#hour").dispatchEvent(new Event("input"))')
  assert(await evaluate('document.querySelector("#clock").textContent === "06:00"'), 'Scrubber failed')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".brief-title a").href); return r.ok && (await r.text()).includes("polar cottage"); })()')
  assert(docWorks, 'Technical study link unavailable')
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
    await evaluate('window.scrollTo(0,0); document.querySelector("#view").value="meadow"; document.querySelector("#view").dispatchEvent(new Event("change")); document.querySelector(\'[data-hour="0"]\').click()')
    await capture(`mobile-${width}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Page.reload')
  await delay(1800)
  assert(await evaluate('document.querySelector("#play").getAttribute("aria-pressed") === "false"'), 'Reduced-motion page starts playing')
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified four phases, brightness comparison, baseline, camera, export, playback/pause, scrubber, study link, reduced motion, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
