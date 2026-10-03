import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'fairy-browser-'))
const browser = spawn(browserPath, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', (data) => { browserErrors += data })
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); break } catch { await delay(250) }
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/studies/fairy-flight-study.html' })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('document.querySelectorAll("canvas").length === 2')) break
    await delay(250)
  }
  await delay(1200)
  await evaluate('document.querySelector("#play-toggle").click()')
  await mkdir('artifacts.local', { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await capture('flight-study-rear')
  console.log('Initial:', await evaluate('document.querySelector("#choice-label").textContent'))
  await evaluate('document.querySelector("[data-direction=\\"2\\"]").click(); document.querySelector("[data-view=\\"90\\"]").click(); document.querySelector("#silhouette").click()')
  await delay(250)
  await capture('flight-study-dart-side')
  console.log('Alternative:', await evaluate('document.querySelector("#choice-label").textContent'))
  await evaluate('document.querySelector("[data-direction=\\"0\\"]").click(); document.querySelector("[data-view=\\"0\\"]").click(); document.querySelector("#silhouette").click(); document.querySelector("#game-size").click(); document.querySelector("[data-background=\\"sky\\"]").click(); document.querySelector("#normal-lean").value = 23; document.querySelector("#normal-lean").dispatchEvent(new Event("input"))')
  console.log('Custom:', await evaluate('document.querySelector("#choice-label").textContent'))
  const exported = await evaluate(`(async () => {
    const createURL = URL.createObjectURL;
    const click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return createURL(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try {
      document.querySelector('#save-choice').click();
      return JSON.parse(await payload.text());
    } finally { URL.createObjectURL = createURL; HTMLAnchorElement.prototype.click = click; }
  })()`)
  if (exported.normalLeanDegreesFromUpright !== 23 || exported.name !== 'Petal glide') throw new Error('Choice export did not match the displayed pose')
  console.log('Choice export: verified')
  await delay(250)
  await capture('flight-study-game-size')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(250)
  await capture('flight-study-mobile')
  console.log('Horizontal overflow:', await evaluate('document.documentElement.scrollWidth > innerWidth'))
  console.log('Runtime errors:', JSON.stringify(errors))
  if (errors.length) process.exitCode = 1
} finally {
  ws?.close()
  browser.kill()
}
