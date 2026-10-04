import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// node studies/fairytale-creature-study/fairytale-study-smoke.mjs "path/to/chrome.exe"
if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const profile = await mkdtemp(join(tmpdir(), 'fairytale-study-'))
const browser = spawn(process.argv[2], ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const out = 'artifacts.local/fairytale-study'
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
  // Manual frames: each renderStudy() advances the animation by a fixed step.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.studyNow = 0; window.requestAnimationFrame = callback => { window.studyFrame = callback; return 1; }; window.renderStudy = (steps = 1) => { for (let i = 0; i < steps; i++) { window.studyNow += 33; window.studyFrame(window.studyNow); } };` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1180, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174'}/studies/fairytale-creature-study.html` })
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.studyFrame')) break
    await delay(250)
  }
  await check('!!window.studyFrame && document.querySelectorAll("canvas").length === 3', 'Study did not initialize')
  await mkdir(out, { recursive: true })
  const capture = async (name, clip) => {
    await evaluate('renderStudy(40)')
    const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
    await writeFile(`${out}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  // Scroll the section into view first: the capture shows only what the viewport renders.
  const box = selector => evaluate(`(() => { const e = document.querySelector('${selector}'); e.scrollIntoView({ block: 'start' }); const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: Math.min(r.height, innerHeight) } })()`)
  const exported = () => evaluate(`(async () => {
    const original = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return original(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = original; HTMLAnchorElement.prototype.click = click; }
  })()`)

  await capture('page')
  const initial = await exported()
  if (initial.cast !== 'fairytale' || initial.replacements.cow !== 'unicorn' || initial.replacements.butterfly !== 'pegasus') throw new Error('Wrong replacement map')
  await check(`+document.querySelector('#land-count').textContent > 0 && +document.querySelector('#water-count').textContent > 0 && +document.querySelector('#air-count').textContent > 0`, 'A habitat is empty')
  await check(`document.querySelectorAll('tbody tr').length === 5`, 'Replacement table must have five rows')

  for (const kind of ['unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus']) {
    await evaluate(`document.querySelector('[data-kind="${kind}"]').click(); document.querySelector('#focus').click()`)
    await capture(`meadow-${kind}`, await box('#meadow-view'))
    await capture(`closeup-${kind}`, await box('.inspector'))
  }
  await check(`document.querySelector('#habitat-badge').textContent === 'IN THE AIR' && document.querySelector('#creature-replaces').textContent === 'Replaces the ribbon butterfly'`, 'Pegasus inspector mismatch')

  await evaluate(`document.querySelector('[data-kind="frogPrince"]').click()`)
  await check(`document.querySelector('#habitat-badge').textContent === 'WATER ONLY'`, 'Frog inspector mismatch')
  await evaluate(`document.querySelector('#details').click(); document.querySelector('#magic').click()`)
  const frog = await exported()
  if (frog.features.frogPrince.details || frog.features.frogPrince.magic || !frog.features.frogPrince.motion) throw new Error('Feature controls failed')
  await evaluate(`document.querySelector('#details').click(); document.querySelector('#magic').click()`)

  await evaluate(`document.querySelector('[data-kind="unicorn"]').click(); document.querySelector('#compare').click()`)
  await check(`document.querySelector('#specimen-label').textContent.startsWith('LEFT: COW')`, 'Comparison label is wrong')
  await capture('compare-unicorn', await box('.inspector'))
  await evaluate(`document.querySelector('#compare').click()`)

  await evaluate(`document.querySelector('#overview').click()`)
  await capture('lineup-close', await box('.lineup-section'))
  await evaluate(`document.querySelector('[data-shot="flight"]').click()`)
  await capture('lineup-flight', await box('.lineup-section'))
  await evaluate(`document.querySelector('[data-cast="before"]').click()`)
  await check(`document.querySelector('#lineup-label').textContent === 'BEFORE / FLIGHT DISTANCE'`, 'Cast toggle did not reach the line-up')
  await capture('lineup-flight-before', await box('.lineup-section'))
  await capture('meadow-before', await box('#meadow-view'))
  await evaluate(`document.querySelector('[data-cast="fairytale"]').click(); document.querySelector('[data-shot="close"]').click(); document.querySelector('[data-light="night"]').click()`)
  await capture('meadow-night', await box('#meadow-view'))
  await capture('lineup-night', await box('.lineup-section'))
  const night = await exported()
  if (night.lighting !== 'night' || night.cast !== 'fairytale') throw new Error('Light or cast did not export')
  await evaluate(`document.querySelector('[data-light="day"]').click()`)

  const before = (await exported()).populationSeed
  await evaluate(`document.querySelector('#shuffle').click()`)
  if ((await exported()).populationSeed === before) throw new Error('New residents did not change the population')
  await evaluate(`document.querySelector('#pause').click()`)
  await check(`document.querySelector('#pause').getAttribute('aria-pressed') === 'true'`, 'Pause did not work')
  await evaluate(`document.querySelector('#pause').click()`)

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
    // Let the resize observers run before the frames that the capture draws.
    await delay(300); await evaluate('renderStudy(2)'); await delay(200)
    await check('document.documentElement.scrollWidth <= innerWidth', `Horizontal overflow at ${width}px`)
    await evaluate('scrollTo(0, 0)')
    await capture(`mobile-${width}`)
    await evaluate(`document.querySelector('.inspector').scrollIntoView()`)
    await capture(`mobile-${width}-inspector`)
    await evaluate(`document.querySelector('.lineup-section').scrollIntoView()`)
    await capture(`mobile-${width}-lineup`)
  }
  if (errors.length) throw new Error(JSON.stringify(errors))
  console.log(`Fairytale study passed: five replacements, three habitats, close-ups, comparison, line-up, night, export, shuffle, pause, responsive layout. Screenshots in ${out}/.`)
} finally { ws?.close(); browser.kill() }
