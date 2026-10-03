import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Browser checks for the cotton candy clouds in the game, against the Vite server on port 5174:
// node scripts/cotton-candy-smoke.mjs "path/to/chrome.exe" [origin]
// The fairy follows the flower home through the cloud layer, on a computer and on a phone.
if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
const profile = await mkdtemp(join(tmpdir(), 'cotton-candy-game-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=9464', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9464/json')).json(); if (tabs.length) break } catch {}
    await delay(250)
  }
  if (!tabs?.length) throw new Error('Browser did not start')
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails)
    // three.js reports shader compile errors with console.error.
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(arg => arg.value ?? arg.description).join(' ').slice(0, 400))
    if (msg.id) {
      const handler = pending.get(msg.id); pending.delete(msg.id)
      if (msg.error) handler.reject(msg.error); else handler.resolve(msg.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  await send('Runtime.enable'); await send('Page.enable')
  // The same fast clock as scripts/wildlife-smoke.mjs: skipped frames do not draw, the last frame draws.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.gameFrame = callback; return 1; };
    window.advanceGame = seconds => {
      window.testTime ??= performance.now();
      const gl = document.querySelector('#scene canvas').getContext('webgl2');
      const draw = gl.drawElements, instances = gl.drawElementsInstanced;
      try {
        gl.drawElements = () => {}; gl.drawElementsInstanced = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60); i++) window.gameFrame(window.testTime += 1000 / 60);
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; }
      window.gameFrame(window.testTime += 1000 / 60);
    };
  ` })
  await mkdir('artifacts.local/cotton-candy', { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/cotton-candy/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const snapshot = () => evaluate('window.__fairyTest.snapshot()')
  const channels = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))

  for (const device of ['desktop', 'phone']) {
    const phone = device === 'phone'
    if (phone) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await send('Emulation.setDeviceMetricsOverride', phone ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 120; i++) {
      if (await evaluate('!!window.__fairyTest && !!window.gameFrame && !!document.querySelector("#begin-button")')) break
      await delay(250)
    }
    const start = await snapshot()
    assert(start.clouds.puffs === (phone ? 150 : 300), `Blossom Haven has ${start.clouds.puffs} cloud puffs on a ${device}`)
    await evaluate('document.querySelector("#begin-button").click(); advanceGame(0.5)')
    const [er, eg] = channels((await snapshot()).clouds.mist)
    assert(eg >= er - 6, `The mist on Earth is not white: ${(await snapshot()).clouds.mist}`)
    await evaluate('document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceGame(0.05)')
    let home, layer
    for (let i = 0; i < 600; i++) {
      await evaluate('advanceGame(0.5)')
      home = await snapshot()
      // The first frame in the cloud layer of Blossom Haven.
      if (!layer && home.daylight.world === 'Blossom Haven' && home.clouds.fogDensity > 0.008) {
        layer = home
        await capture(`${device}-cloud-layer`)
      }
      if (home.found && !home.guided) break
    }
    assert(home.found, `The fairy did not reach Blossom Haven on a ${device}`)
    assert(layer, `The fairy did not fly through the cloud layer on a ${device}`)
    const [r, g] = channels(layer.clouds.mist)
    assert(r - g > 8, `The mist of Blossom Haven is not pink: ${layer.clouds.mist}`)
    await capture(`${device}-arrival`)
    console.log(`${device}: ${start.clouds.puffs} puffs, cloud layer mist #${layer.clouds.mist}, fog density ${layer.clouds.fogDensity.toFixed(4)}`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified the cotton candy clouds on a computer and a phone, the pink mist in the cloud layer, the white mist on Earth, and no shader or browser errors.')
} finally {
  ws?.close(); browser.kill()
}
