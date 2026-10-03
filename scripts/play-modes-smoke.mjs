import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const appUrl = process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174/?test'
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
  // Control simulation time so the check is repeatable even on software GPUs.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = (callback) => { window.testFrame = callback; return 1; };
    window.advanceFlight = (seconds) => {
      window.testTime ??= performance.now();
      const gl = document.querySelector('canvas').getContext('webgl2');
      const draw = gl.drawElements, instances = gl.drawElementsInstanced;
      try {
        gl.drawElements = () => {};
        gl.drawElementsInstanced = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          window.testTime += 1000/60;
          window.testFrame(window.testTime);
        }
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; }
      window.testTime += 1000/60;
      window.testFrame(window.testTime);
    };
  ` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: appUrl })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!document.querySelector("#scene canvas") && !!document.querySelector("#settings-toggle")')) break
    await delay(250)
  }


  const snapshot = () => evaluate('window.__fairyTest.snapshot()')
  if (await evaluate('!!document.querySelector("#welcome-home")')) throw new Error('The welcome card still offers a second mode')
  if (await evaluate('document.querySelector("#begin-button span").textContent') !== 'Begin your adventure') throw new Error('The welcome card is missing Begin your adventure')
  await evaluate('document.querySelector("#begin-button").click(); advanceFlight(0.1)')
  if (await evaluate('!!document.querySelector("#follow-home")')) throw new Error('The Guide me home button is still on the screen')
  if (!(await evaluate('document.querySelector("#home-help").hidden'))) throw new Error('The guide help shows before the guide is on')
  if (!(await evaluate('document.querySelector("#home-beacon").hidden'))) throw new Error('The flower marker shows before the guide is on')
  if ((await snapshot()).guided) throw new Error('The guide started without a request')
  await evaluate('document.querySelector("#open-map").click()')
  await delay(100)
  if (await evaluate('document.querySelector("[data-world=fairy] strong").textContent') !== 'Blossom Haven') throw new Error('The map is missing Blossom Haven')
  if (await evaluate('document.querySelector("[data-world=fairy] .planet-picture").textContent') !== '✿') throw new Error('The map is missing the blossom icon')
  await evaluate('document.querySelector("#close-map").click()')
  await delay(100)
  await evaluate('document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceFlight(0.1)')
  if (!(await snapshot()).guided) throw new Error('The Blossom Haven picture did not start the guide')
  if (await evaluate('document.querySelector("#home-beacon").hidden')) throw new Error('The guide is missing its flower marker')
  for (let i = 0; i < 100 && !(await snapshot()).found; i++) await evaluate('advanceFlight(2)')
  if (!(await snapshot()).found) throw new Error('Guided discovery failed')
  console.log('One start button; the Blossom Haven picture in Worlds starts the flower guide, with its marker, help and discovery.')
  console.log('Runtime errors:', JSON.stringify(errors))
  if (errors.length) process.exitCode = 1
} finally {
  ws?.close()
  browser.kill()
}
