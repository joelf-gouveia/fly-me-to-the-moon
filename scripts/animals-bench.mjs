// The bench of the animals in the game (the method of the bench of the animals study,
// studies/animals-study/bench.ts): five views, with the animals and with no animals, on a computer
// page (1280 × 720), on a phone page (390 × 844, touch, device scale 3) and on the phone page with
// the CPU 4 times slower (DevTools throttling). For each view: after 20 frames of warm-up, 90 frames
// are measured: one frame of the game (the update and the render) and gl.readPixels() of one pixel,
// which waits for the graphics card. It is a tool, not a check: it prints a table and passes always.
//   FAIRY_TEST_URL=http://127.0.0.1:5174 node scripts/animals-bench.mjs "path/to/chrome.exe"
import { spawn } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const origin = process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'
const profile = await mkdtemp(join(tmpdir(), 'animals-bench-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 60 && !tabs?.length; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json() } catch { await delay(250) }
  }
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.id) { const handler = pending.get(msg.id); pending.delete(msg.id); if (msg.error) handler.reject(msg.error); else handler.resolve(msg.result) }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
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
      const draw = gl.drawElements, instances = gl.drawElementsInstanced, arrays = gl.drawArrays;
      try {
        gl.drawElements = () => {}; gl.drawElementsInstanced = () => {}; gl.drawArrays = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60); i++) window.gameFrame(window.testTime += 1000 / 60);
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; gl.drawArrays = arrays; }
      window.gameFrame(window.testTime += 1000 / 60);
    };
    // The measure of one view: 20 frames of warm-up, then 90 frames, each with a read of one pixel.
    window.benchView = on => {
      __fairyTest.wildlifeOn(on);
      const gl = document.querySelector('#scene canvas').getContext('webgl2'), pixel = new Uint8Array(4);
      for (let i = 0; i < 20; i++) window.gameFrame(window.testTime += 1000 / 60);
      const times = [];
      for (let i = 0; i < 90; i++) {
        const start = performance.now();
        window.gameFrame(window.testTime += 1000 / 60);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      const calls = __fairyTest.snapshot().graphics.calls;
      __fairyTest.wildlifeOn(true);
      return { ms: +times[45].toFixed(2), p90: +times[81].toFixed(2), calls };
    };
  ` })
  const DEVICES = {
    computer: { width: 1280, height: 720, scale: 1, mobile: false, cpu: 1 },
    phone: { width: 390, height: 844, scale: 3, mobile: true, cpu: 1 },
    phoneSlow: { width: 390, height: 844, scale: 3, mobile: true, cpu: 4 },
  }
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  /** Flies to the nearest herd of a kind (in a zone), `up` m over the ground, and hovers. */
  async function visit(kind, up, zone) {
    const [place] = await evaluate(`__fairyTest.herdPlaces(${JSON.stringify(kind)}, 1, ${zone ? JSON.stringify(zone) : 'undefined'})`)
    await evaluate(`__fairyTest.placeOver(${JSON.stringify(place.world)}, ${JSON.stringify(place.direction)}, ${Math.max(up, 25)})`)
    if (!(await snapshot()).hoverHeld) await evaluate('document.querySelector("#hover-toggle").click()')
    await evaluate('advanceGame(0.1)')
    if (up < 25) {
      const name = await evaluate(`(() => { const w = __fairyTest.snapshot().wildlife.find(w => w.world === ${JSON.stringify(place.world === 'earth' ? 'Earth' : 'Blossom Haven')}); const m = w.visible.filter(m => m.name.startsWith('creature-${kind}-')).sort((a, b) => a.distance - b.distance)[0]; return m ? m.name : null })()`)
      if (name) await evaluate(`__fairyTest.approach(${JSON.stringify(name)}, 12, ${up}, true, 2.5)`)
    }
    await evaluate('advanceGame(1.5)')
  }
  const rows = []
  for (const [device, setting] of Object.entries(DEVICES)) {
    await send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await send('Emulation.setTouchEmulationEnabled', { enabled: setting.mobile, maxTouchPoints: setting.mobile ? 5 : 1 })
    await send('Emulation.setDeviceMetricsOverride', { width: setting.width, height: setting.height, deviceScaleFactor: setting.scale, mobile: setting.mobile })
    await send('Page.navigate', { url: `${origin}/?test&weather=clear` })
    for (let i = 0; i < 200 && !(await evaluate('!!window.__fairyTest && !!window.gameFrame && !!document.querySelector("#begin-button")').catch(() => false)); i++) await delay(250)
    await evaluate('document.querySelector("#begin-button").click(); advanceGame(1)')
    const views = [
      ['start', async () => {}],
      ['savanna', () => visit('zebra', 5, 'savanna')],
      ['meadow', () => visit('cow', 5)],
      ['high', () => visit('zebra', 30, 'savanna')],
      ['grove', async () => {
        await evaluate('document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click(); advanceGame(1); __fairyTest.arriveHome()')
        for (let i = 0; i < 10 && !(await snapshot()).found; i++) await evaluate('advanceGame(0.5)')
        await visit('gummyBear', 5)
      }],
    ]
    for (const [view, go] of views) {
      await send('Emulation.setCPUThrottlingRate', { rate: 1 })
      await go()
      await send('Emulation.setCPUThrottlingRate', { rate: setting.cpu })
      const off = await evaluate('benchView(false)'), on = await evaluate('benchView(true)')
      await send('Emulation.setCPUThrottlingRate', { rate: 1 })
      const calls = await evaluate('__fairyTest.wildlifeCalls()')
      const state = await snapshot()
      const stats = state.wildlife.find(item => item.world === (view === 'grove' ? 'Blossom Haven' : 'Earth')).stats
      rows.push({ device, view, animalCalls: calls.animals, frameCalls: on.calls, noAnimalCalls: off.calls, ms: on.ms, p90: on.p90, noAnimalMs: off.ms, drawn: stats.drawn, points: stats.points, lights: stats.lights, buffer: `${state.graphics.pixelRatio}` })
      process.stderr.write(`${device} ${view}: ${JSON.stringify(rows.at(-1))}\n`)
    }
  }
  console.log('| Device | View | Animal calls | Frame calls (no animals) | Animals drawn | Points | Median frame (no animals) | p90 |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const row of rows) console.log(`| ${row.device} | ${row.view} | ${row.animalCalls} | ${row.frameCalls} (${row.noAnimalCalls}) | ${row.drawn} | ${row.points} + ${row.lights} | ${row.ms} ms (${row.noAnimalMs} ms) | ${row.p90} ms |`)
} finally { ws?.close(); browser.kill() }
