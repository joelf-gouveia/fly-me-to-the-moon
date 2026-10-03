import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const customizationOnly = process.argv.includes('--customization')
const appUrl = process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174/'
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
      const arrays = gl.drawArrays, arrayInstances = gl.drawArraysInstanced;
      try {
        gl.drawElements = () => {};
        gl.drawElementsInstanced = () => {};
        gl.drawArrays = () => {};
        gl.drawArraysInstanced = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          window.testTime += 1000/60;
          window.testFrame(window.testTime);
        }
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; gl.drawArrays = arrays; gl.drawArraysInstanced = arrayInstances; }
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
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(2)')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ' })
  await mkdir('artifacts.local', { recursive: true })
  const screenshot = async (name) => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await screenshot('earth-surface')
  console.log('Surface:', await evaluate('document.querySelector(".destination").innerText'))
  console.log('Paused:', await evaluate('document.querySelector("#pause-toggle").ariaLabel'))
  await evaluate('document.querySelector("#customize-toggle").click()')
  await evaluate('document.querySelector(\'[data-custom="hair"][data-value="bob"]\').click()')
  await evaluate('document.querySelector(\'[data-custom="wings"][data-value="luna"]\').click()')
  for (const [part, value] of [['hairColor', 'lavender'], ['dress', 'buttercup'], ['wingColor', 'violet'], ['skin', 'cocoa']]) {
    await evaluate(`document.querySelector('[data-custom="${part}"][data-value="${value}"]').click()`)
  }
  const savedLook = await evaluate('localStorage.getItem("fairy-look")')
  if (savedLook !== '{"hair":"bob","hairColor":"lavender","dress":"buttercup","wings":"luna","wingColor":"violet","skin":"cocoa"}') throw new Error(`Customization was not saved: ${savedLook}`)
  await evaluate('advanceFlight(1)')
  await delay(300)
  await screenshot('customization')
  if (customizationOnly) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await evaluate('advanceFlight(1)')
    await screenshot('customization-mobile')
    for (const [width, height] of [[320, 568], [844, 390]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 720 })
      const fits = await evaluate(`(() => {
        const r = document.querySelector('#customizer').getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      })()`)
      if (!fits) throw new Error(`Customizer overflows at ${width} x ${height}`)
    }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' })
    if (await evaluate('document.querySelector("#customize-toggle").getAttribute("aria-expanded")') !== 'false') throw new Error('Escape did not close the panel')
    await evaluate('document.querySelector("#pause-toggle").click(); document.querySelector("#customize-toggle").focus()')
    // W climbs: the height in the world panel rises.
    const height = () => evaluate('parseFloat(document.querySelector("#planet-distance").textContent)')
    const low = await height()
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' })
    await evaluate('advanceFlight(1.5)')
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' })
    if (!(await height() > low)) throw new Error('Steering did not resume after customization')
    await send('Page.reload')
    await delay(1000)
    for (let i = 0; i < 80; i++) {
      if (await evaluate('!!window.testFrame && !!document.querySelector("#settings-toggle")')) break
      await delay(250)
    }
    const selected = await evaluate('Array.from(document.querySelectorAll(\'[data-custom][aria-pressed="true"]\'), b => b.dataset.value).join(",")')
    if (selected !== 'bob,lavender,buttercup,luna,violet,cocoa') throw new Error(`Saved look was not restored: ${selected}`)
    await evaluate('document.querySelector("#welcome-customize").click()')
    if (!await evaluate('document.querySelector("#customizer").classList.contains("is-open")')) throw new Error('Welcome customization did not open')
    console.log('Customization: selection, persistence, Escape, welcome entry and responsive layout passed')
  } else {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' })
  // Resume, climb through the cloud layer, then continue out into space.
  await evaluate('document.querySelector("#pause-toggle").click()')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' })
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ShiftLeft', key: 'Shift' })
  await evaluate('advanceFlight(3)')
  await screenshot('earth-clouds')
  await evaluate('advanceFlight(3)')
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ShiftLeft', key: 'Shift' })
  await evaluate('advanceFlight(3)')
  await screenshot('earth-ascent')
  console.log('Ascent:', await evaluate('document.querySelector(".destination").innerText'))
  // Fly back with the Earth picture of Worlds. On the way in, the game builds a new Earth and says so.
  await evaluate('document.querySelector("#open-map").click(); document.querySelector("[data-world=earth]").click(); document.querySelector("#world-fly").click()')
  const returnProgress = []
  let returned = false
  for (let i = 0; i < 20 && !returned; i++) {
    await evaluate('advanceFlight(5)')
    const note = await evaluate('document.querySelector("#arrival-note").textContent')
    returnProgress.push({ note, distance: await evaluate('document.querySelector("#planet-distance").textContent'), pause: await evaluate('document.querySelector("#pause-toggle").ariaLabel') })
    returned = note === 'A new Earth to explore'
  }
  console.log('Return:', await evaluate('document.querySelector(".destination").innerText'))
  if (!returned) throw new Error(`Return from space failed to generate a new Earth: ${JSON.stringify(returnProgress)}`)
  await evaluate('document.querySelector("#pause-toggle").click()')
  await screenshot('earth-return')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate('advanceFlight(0.1)')
  await screenshot('mobile')
  }
  console.log('Runtime errors:', JSON.stringify(errors))
  if (errors.length) process.exitCode = 1
} finally {
  ws?.close()
  browser.kill()
}
