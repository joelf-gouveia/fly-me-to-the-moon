import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'fairy-browser-'))
const browser = spawn(browserPath, [
  '--headless', '--remote-debugging-port=9333', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', (data) => { browserErrors += data })
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9333/json')).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  ws.onclose = () => {
    for (const handler of pending.values()) handler.reject(new Error(`Browser closed: ${browserErrors}`))
  }
  const errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.id) {
      const handler = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await send('Runtime.enable')
  await send('Page.enable')


  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/studies/candy-planet-study.html' })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!document.querySelector("#candy-view canvas") && !!document.querySelector("#detail-title")?.textContent')) break
    await delay(250)
  }
  await delay(900)
  await mkdir('artifacts.local', { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await evaluate('document.querySelector("#pause-scene").click()')
  await capture('candy-study-meadow')
  await evaluate('document.querySelector("[data-view=home]").click(); document.querySelector(".landscape").scrollIntoView({block:"start",behavior:"instant"})')
  await delay(300)
  await capture('candy-study-cottage')
  await evaluate('document.querySelector("[data-view=overview]").click()')
  await delay(200)
  await capture('candy-study-planet')
  for (const id of ['water','trees','canes','ground','sky','friends','home']) {
    await evaluate(`document.querySelector('[data-ecosystem="${id}"]').click()`)
    const title = await evaluate('document.querySelector("#detail-title").textContent')
    if (!title) throw new Error('Missing ecosystem detail')
    console.log('Ecosystem:', id, title)
  }
  await evaluate('document.querySelector("[data-location=roaming]").click(); document.querySelector("#visitor-state").value="home"; document.querySelector("#visitor-state").dispatchEvent(new Event("change")); document.querySelector("#simulate-teleport").click()')
  let status = await evaluate('document.querySelector("#map-status").textContent')
  if (!status.includes('deferred')) throw new Error('Home moved during a visit')
  await evaluate('document.querySelector(".location-section").scrollIntoView({block:"start",behavior:"instant"})')
  await delay(700)
  await capture('candy-study-teleport')
  await evaluate('document.querySelector("#visitor-state").value="away"; document.querySelector("#visitor-state").dispatchEvent(new Event("change"))')
  const moved = await evaluate('document.querySelector("#map-home").getAttribute("transform")')
  if (moved !== 'translate(575 263)') throw new Error('Deferred relocation did not occur on departure')
  await evaluate('document.querySelector("[data-location=doorway]").click(); document.querySelector("#simulate-teleport").click()')
  status = await evaluate('document.querySelector("#map-status").textContent')
  if (!status.includes('same place')) throw new Error('Fixed home unexpectedly moved')
  const exported = await evaluate(`(async () => {
    const createURL = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return createURL(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#save-study').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = createURL; HTMLAnchorElement.prototype.click = click; }
  })()`)
  if (exported.dimensions.homeRadius !== 110 || exported.location !== 'doorway' || exported.ecosystem.length !== 7) throw new Error('Wrong study export')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate('window.scrollTo({top:0,behavior:"instant"})')
  await delay(300)
  await capture('candy-study-mobile')
  await evaluate('document.querySelector(".landscape").scrollIntoView({block:"start",behavior:"instant"}); document.querySelector("[data-view=meadow]").click()')
  await delay(300)
  await capture('candy-study-mobile-scene')
  const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth')
  if (overflow) throw new Error('Mobile horizontal overflow')
  console.log('Teleport safeguards, fixed home, study export, and mobile overflow verified')
  console.log('Runtime errors:', JSON.stringify(errors))
  if (errors.length) process.exitCode = 1
} finally {
  ws?.close()
  browser.kill()
}
