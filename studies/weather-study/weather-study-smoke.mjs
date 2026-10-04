// The browser check of the weather study. It opens the page, plays a clip, opens the live view,
// and checks the weather at the camera with each setting of "Sky over the fairy", "Clouds" and "Weather".
// Run against the dev server on port 5174:
//   node studies/weather-study/weather-study-smoke.mjs "path/to/chrome.exe" [origin]
// A screenshot of the page and one of the live view go to artifacts.local/.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [browserPath, origin = 'http://127.0.0.1:5174'] = process.argv.slice(2)
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'weather-study-smoke-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const failures = []
const check = (name, pass, detail = '') => { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); if (!pass) failures.push(name) }
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try {
      const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]
      tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break
    } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry.text)
    // three.js reports shader compile errors on the console.
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '))
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} took more than 60 s`)), 60000)
    pending.set(++id, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails))
    return result.result.value
  }
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const shot = async name => {
    await mkdir(join(process.cwd(), 'artifacts.local'), { recursive: true })
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(join(process.cwd(), 'artifacts.local', name), Buffer.from(data, 'base64'))
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/weather-study.html` })
  for (let i = 0; i < 120 && !(await evaluate('Boolean(document.querySelector("#technical h2"))').catch(() => false)); i++) await delay(250)

  // ---- The page ----
  const page = await evaluate(`({
    study: document.querySelector('.masthead span')?.textContent,
    chips: document.querySelectorAll('.stage-bar [data-pick]').length,
    cards: document.querySelectorAll('.idea-card').length,
    seasons: document.querySelectorAll('.season-row img').length,
    maps: document.querySelectorAll('.map-grid svg').length,
    decisions: document.querySelectorAll('#decisions fieldset').length,
    systems: document.querySelectorAll('#systems-title ~ .table-wrap tbody tr').length,
    technical: document.querySelectorAll('#technical h3').length,
    wide: document.documentElement.scrollWidth > innerWidth + 1,
  })`)
  check('The page is field study 21', /FIELD STUDY\s*21/.test(page.study ?? ''), page.study)
  check('The page has ten clip chips and ten clip cards', page.chips === 10 && page.cards === 10)
  check('The page has four cloud pictures, four season pictures and two map figures', page.seasons === 8 && page.maps === 2)
  check('The page has nine decisions and fourteen systems', page.decisions === 9 && page.systems === 14, `${page.decisions}, ${page.systems}`)
  check('The page shows the technical study', page.technical > 8)
  check('The page has no sideways scroll', !page.wide)
  await delay(1500)
  const images = await evaluate(`[...document.images].filter(image => image.loading !== 'lazy' || image.complete).every(image => image.naturalWidth > 0)`)
  check('Each loaded picture has content', images)
  await click('[data-pick="W4"]')
  for (let i = 0; i < 40 && !(await evaluate('document.querySelector("#clip").readyState >= 2')); i++) await delay(250)
  const video = await evaluate(`(v => ({ ready: v.readyState, width: v.videoWidth, duration: v.duration }))(document.querySelector('#clip'))`)
  check('Clip W4 plays', video.ready >= 2 && video.width === 1280 && video.duration > 10, JSON.stringify(video))
  await shot('weather-study-page.png')

  // ---- The answers ----
  await evaluate(`(() => { const input = document.querySelector('input[name="model"]'); input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  const saved = await evaluate(`JSON.parse(localStorage.getItem('fairy-weather-study-v1') ?? '{}').model?.choices?.[0] ?? ''`)
  check('An answer goes to the store of the study', saved.startsWith('A —'), saved)
  await evaluate(`localStorage.removeItem('fairy-weather-study-v1')`)

  // ---- The live view ----
  await click('#mode-live')
  for (let i = 0; i < 160 && !(await evaluate('Boolean(window.__weather?.current)').catch(() => false)); i++) await delay(250)
  check('The live view starts', await evaluate('Boolean(window.__weather?.current)'))
  const here = () => evaluate(`(w => ({ kind: w.current.kind, cover: w.here.cover, rain: w.here.rain, mist: w.here.mist, storm: w.here.storm, snow: w.current.snow, wind: w.here.wind, deck: w.deck.visible, mode: w.state.mode }))(window.__weather)`)
  const pick = async (name, value) => { await click(`[data-live="${name}"][data-value="${value}"]`); await delay(2500) }
  await pick('sky', 'clear')
  let now = await here()
  check('A clear sky has no cloud and no rain at the camera', now.cover < 0.05 && now.rain < 0.02 && now.kind === 'clear', JSON.stringify(now))
  const calm = now.wind
  await pick('sky', 'rain')
  now = await here()
  check('Rain gives a full cover, rain and more wind', now.cover > 0.9 && now.rain > 0.8 && now.wind > calm + 0.8, JSON.stringify(now))
  check('Rain at 32° N in spring is not snow', now.snow < 0.05 && now.kind === 'rain', now.kind)
  await shot('weather-study-live-rain.png')
  await click('[data-season="winter"]')
  await pick('place', '50')
  now = await here()
  check('Rain at 50° N in winter is snow', now.snow > 0.95 && now.kind === 'snow', JSON.stringify(now))
  await pick('sky', 'mist')
  now = await here()
  check('Mist is at the camera', now.mist > 0.9 && now.kind === 'mist', JSON.stringify(now))
  await pick('sky', 'storm')
  now = await here()
  check('Thunder is far away: a clear sky at the camera', now.storm > 0.5 && now.rain < 0.1, JSON.stringify(now))
  const looks = async () => evaluate(`(w => ({ fresh: w.clouds.group.visible, puffs: w.clouds.group.parent.children.some(child => child.children.some(mesh => mesh.isInstancedMesh && mesh.visible && !mesh.name)) }))(window.__weather)`)
  let look = await looks()
  check('The new clouds take the place of the puffs', look.fresh && !look.puffs, JSON.stringify(look))
  await pick('clouds', 'puffs')
  look = await looks()
  check('The switch gives the puffs of the game', !look.fresh && look.puffs, JSON.stringify(look))
  await pick('clouds', 'new')
  await pick('sky', 'map')
  await pick('mode', 'off')
  now = await here()
  check('The game of today has no weather', now.mode === 'off' && !now.deck && now.cover < 0.01 && Math.abs(now.wind - 1) < 0.02, JSON.stringify(now))
  await pick('mode', 'one')
  await pick('place', 'space')
  const one = await evaluate(`(w => { const a = w.weatherAt({ x: 0.83, y: 0.5, z: 0.25 }), b = w.weatherAt({ x: -0.5, y: 0.5, z: -0.71 }); return [a.cover, b.cover] })(window.__weather)`)
  check('One sky gives two places the same cover', Math.abs(one[0] - one[1]) < 1e-6, one.join(', '))
  await pick('mode', 'map')
  const many = await evaluate(`(w => { let low = 1, high = 0; for (let i = 0; i < 60; i++) { const a = i * 0.7, c = w.weatherAt({ x: Math.cos(a) * 0.85, y: 0.52, z: Math.sin(a) * 0.85 }).cover; low = Math.min(low, c); high = Math.max(high, c) } return [low, high] })(window.__weather)`)
  check('The weather map gives clear places and cloudy places', many[0] < 0.1 && many[1] > 0.5, many.map(value => value.toFixed(2)).join(', '))
  await shot('weather-study-live-space.png')
  check('The page has no errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  ws?.close()
  browser.kill()
}
if (failures.length) { console.log(`${failures.length} checks failed`); process.exit(1) }
console.log('All checks passed')
