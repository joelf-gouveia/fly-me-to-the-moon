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
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank',
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

  await mkdir('artifacts.local', { recursive: true })
  const screenshot = async (name) => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const snapshot = () => evaluate('window.__fairyTest.snapshot()')
  const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
  const initial = await snapshot()
  if (initial.radius !== 137.5 || initial.candy.some(value => !value)) throw new Error('Candy world is missing or the wrong size')
  await evaluate('document.querySelector("#begin-button").click(); document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceFlight(0.05); document.querySelector("#stop-home").click(); advanceFlight(295)')
  let state = await snapshot()
  if (state.moves !== 0) throw new Error('Planet moved before five active minutes')
  await evaluate('document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceFlight(2)')
  const locked = await snapshot()
  if (!locked.guided || locked.moves !== 0 || Math.abs(locked.elapsed - state.elapsed) > 0.05) throw new Error('Guided navigation did not pause relocation')
  console.log('Five-minute interval and guided navigation lock verified')
  for (let i = 0; i < 100; i++) {
    await evaluate('advanceFlight(2)')
    state = await snapshot()
    if (!state.guided) break
  }
  if (state.guided || !state.found) throw new Error('Guided arrival failed: ' + JSON.stringify(state))
  await screenshot('blossom-candy-arrival')
  console.log('Arrived at candy home', JSON.stringify({radius:state.radius,elapsed:state.elapsed,moves:state.moves}))
  await evaluate('document.querySelector("#pause-toggle").click()')
  const paused = await snapshot()
  await evaluate('advanceFlight(20)')
  if (Math.abs((await snapshot()).elapsed - paused.elapsed) > 0.001) throw new Error('Pause advanced the teleport timer')
  await evaluate('document.querySelector("#pause-toggle").click(); document.querySelector("#open-map").click()')
  await delay(100)
  const mapped = await snapshot()
  await evaluate('advanceFlight(20)')
  if (Math.abs((await snapshot()).elapsed - mapped.elapsed) > 0.001) throw new Error('Map advanced the teleport timer')
  await screenshot('blossom-world-map')
  await evaluate('document.querySelector("#close-map").click()')
  await delay(100)
  const before = await snapshot()
  await evaluate('advanceFlight(6)')
  const after = await snapshot()
  if (after.moves !== 1 || distance(before.home, after.home) < 1400 * 2.5) throw new Error('Five-minute relocation failed')
  if (distance(after.fairy, after.home) > after.radius + after.atmosphere + 12) throw new Error('Visiting fairy was not carried with home')
  if (distance(after.camera, after.fairy) > 40) throw new Error('Camera did not travel with fairy')
  if (before.seed !== after.seed || before.visit !== after.visit) throw new Error('Teleport rerolled the landscape')
  if (distance(after.target, before.target) < 1400 * 2.5) throw new Error('Home approach target was not refreshed')
  await screenshot('blossom-home-teleported')
  console.log('Visitor, camera, terrain and updated target survived relocation')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate('advanceFlight(0.2)')
  await screenshot('blossom-candy-mobile')
  if (await evaluate('document.documentElement.scrollWidth > innerWidth')) throw new Error('Mobile overflow')
  console.log('Runtime errors:', JSON.stringify(errors))
  if (errors.length) process.exitCode = 1
} finally {
  ws?.close()
  browser.kill()
}
