import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const profile = await mkdtemp(join(tmpdir(), 'wildlife-game-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=9338', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9338/json')).json(); if (tabs.length) break } catch {}
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
  await send('Runtime.enable'); await send('Page.enable')
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'}/?test` })
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.__fairyTest && !!window.gameFrame')) break
    await delay(250)
  }
  const snapshot = () => evaluate('window.__fairyTest.snapshot()')
  const initial = await snapshot()
  if (initial.wildlife.length !== 2) throw new Error('Wildlife must exist on exactly Earth and Blossom Haven')
  for (const population of initial.wildlife) {
    if (population.kinds.length !== 4 || population.total < 50) throw new Error(`Missing species on ${population.world}`)
  }
  const earth = initial.wildlife.find(w => w.world === 'Earth')
  if (!earth.visible.length) throw new Error('No wildlife near the initial meadow')
  await evaluate('document.querySelector("#begin-button").click(); advanceGame(3)')
  const moving = (await snapshot()).wildlife.find(w => w.world === 'Earth')
  const changed = moving.visible.some(m => earth.visible.some(a => a.name === m.name && JSON.stringify(a.position) !== JSON.stringify(m.position)))
  if (!changed) throw new Error('Creatures did not move during flight')
  await evaluate('document.querySelector("#pause-toggle").click(); advanceGame(0.5)')
  const beforePause = (await snapshot()).wildlife.find(w => w.world === 'Earth')
  await evaluate('advanceGame(2)')
  const afterPause = (await snapshot()).wildlife.find(w => w.world === 'Earth')
  for (const model of afterPause.visible) {
    const before = beforePause.visible.find(m => m.name === model.name)
    if (before && JSON.stringify(before.position) !== JSON.stringify(model.position)) throw new Error('Creature moved while paused')
  }
  await mkdir('artifacts.local', { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await capture('wildlife-in-game')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate('advanceGame(0.2)')
  await capture('wildlife-in-game-mobile')
  if (earth.visible.some(model => model.fairytale)) throw new Error('Earth must keep its animals')

  // Blossom Haven: follow the flower guide home, then check the fairytale residents and the pegasus foals.
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'}/?test` })
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.__fairyTest && !!window.gameFrame && !!document.querySelector("#begin-button")')) break
    await delay(250)
  }
  await evaluate('document.querySelector("#begin-button").click(); document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceGame(0.05)')
  let home
  for (let i = 0; i < 150; i++) {
    await evaluate('advanceGame(2)')
    home = await snapshot()
    if (home.found && !home.guided) break
  }
  if (!home.found) throw new Error('The fairy did not reach Blossom Haven')
  await evaluate('advanceGame(1)')
  home = await snapshot()
  const haven = home.wildlife.find(w => w.world === 'Blossom Haven')
  const cast = [...new Set(haven.visible.map(model => model.fairytale))]
  if (!haven.visible.length || cast.includes(null)) throw new Error(`Blossom Haven must show only fairytale creatures: ${JSON.stringify(cast)}`)
  if (!home.candy.includes('pegasus-foals')) throw new Error('The pegasus foals are missing')
  await capture('wildlife-blossom-fairytale')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate('advanceGame(0.2)')
  await capture('wildlife-blossom-fairytale-mobile')
  if (errors.length) throw new Error(JSON.stringify(errors))
  console.log(JSON.stringify({ populations: initial.wildlife.map(({ world, total, kinds }) => ({ world, total, kinds })), visibleAtStart: earth.visible.length, blossomCast: cast, movement: 'passed', pause: 'passed', runtimeExceptions: errors.length }))
} finally { ws?.close(); browser.kill() }
