import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const profile = await mkdtemp(join(tmpdir(), 'creature-study-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); if (tabs.length) break } catch {}
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
  const check = async (expression, message) => { if (!await evaluate(expression)) throw new Error(message) }
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.requestAnimationFrame = callback => { window.studyFrame = callback; return 1; }; window.renderStudy = () => window.studyFrame(performance.now());` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1120, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'}/studies/creature-study.html` })
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.studyFrame')) break
    await delay(250)
  }
  await check('!!window.studyFrame && document.querySelectorAll("canvas").length === 2', 'Study did not initialize')
  await mkdir('artifacts.local', { recursive: true })
  const capture = async name => {
    await evaluate('renderStudy()')
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const exported = () => evaluate(`(async () => {
    const original = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return original(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = original; HTMLAnchorElement.prototype.click = click; }
  })()`)
  await capture('creature-study-earth')
  const initial = await exported()
  if (!initial.residents.length || initial.world !== 'earth') throw new Error('No Earth population')
  await evaluate(`document.querySelector('[data-species="cow"]').click(); document.querySelector('#focus-animal').click()`)
  await check(`document.querySelector('#habitat-badge').textContent === 'LAND ONLY' && document.querySelector('#species-index').textContent === '04 / 04'`, 'Cow inspector mismatch')
  await capture('creature-study-cow-earth')
  await evaluate(`document.querySelector('#details').click(); document.querySelector('#tails').click()`)
  const cowLook = await exported()
  if (cowLook.features.cow.details || cowLook.features.cow.tails || !cowLook.features.cow.motion) throw new Error('Cow feature controls failed')
  await evaluate('document.querySelector("#shuffle").click()')
  const shuffled = await exported()
  if (shuffled.terrainSeed !== initial.terrainSeed || JSON.stringify(shuffled.residents) === JSON.stringify(initial.residents)) throw new Error('Shuffle failed')
  await evaluate('document.querySelector("#regenerate").click()')
  if ((await exported()).terrainSeed === initial.terrainSeed) throw new Error('Terrain did not regenerate')
  await evaluate(`document.querySelector('[data-species="duck"]').click(); document.querySelector('#details').click(); document.querySelector('#tails').click(); document.querySelector('#motion').click(); document.querySelector('#paths').click(); document.querySelector('#focus-animal').click();`)
  await check(`document.querySelector('#habitat-badge').textContent === 'WATER ONLY'`, 'Duck inspector mismatch')
  const edited = await exported()
  if (Object.values(edited.features.duck).some(Boolean)) throw new Error('Feature controls did not update settings')
  await capture('creature-study-duck')
  await evaluate(`document.querySelector('[data-world="fairy"]').click(); document.querySelector('[data-species="sheep"]').click(); document.querySelector('#paths').click(); document.querySelector('#focus-animal').click();`)
  const fairy = await exported()
  if (fairy.world !== 'fairy' || !fairy.residents.length) throw new Error('Blossom Haven failed')
  await capture('creature-study-blossom')
  await evaluate(`document.querySelector('[data-species="cow"]').click()`)
  await check(`!document.querySelector('#details').checked && !document.querySelector('#tails').checked`, 'Cow feature choices did not carry across worlds')
  await evaluate(`document.querySelector('#details').click(); document.querySelector('#tails').click(); document.querySelector('#focus-animal').click()`)
  await capture('creature-study-cow-blossom')
  await evaluate(`document.querySelector('#pause').click()`)
  await check(`document.querySelector('#pause').getAttribute('aria-pressed') === 'true'`, 'Pause did not work')
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
    await delay(100)
    await check('document.documentElement.scrollWidth <= innerWidth', `Horizontal overflow at ${width}px`)
    await capture(`creature-study-mobile-${width}`)
  }
  if (errors.length) throw new Error(JSON.stringify(errors))
  console.log('Creature study passed: both worlds, regeneration, randomized residents, features, pause, export, responsive layout, no runtime exceptions.')
} finally { ws?.close(); browser.kill() }
