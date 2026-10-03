import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'world-book-study-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${(await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]}/json`)).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('favicon.ico')) errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)
  const count = selector => evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await mkdir('artifacts.local/world-book-study', { recursive: true })
  async function capture(name) {
    await delay(300)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/world-book-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/world-book-study.html` })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('document.querySelectorAll("#compare tbody tr").length > 0').catch(() => false)) break
    await delay(250)
  }
  assert(await count('#compare tbody tr') === 9, 'The comparison table does not have 9 rows')
  assert(await count('.findings li') === 8, 'The study does not show eight findings')
  assert(await count('#from-earth tbody tr') === 12 && await count('#plan tbody tr') === 11 && await count('#chain tbody tr') === 12, 'A distance table has the wrong rows')
  assert(await count('#from-earth tr.hard') === 3, 'The three hard worlds (Ceres, Vesta, Blossom Haven) are not marked')
  const readout = key => text(`#r-${key}`)
  const has = (selector, name) => evaluate(`document.querySelector(${JSON.stringify(selector)}).classList.contains(${JSON.stringify(name)})`)
  const exists = selector => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)

  // D, the default: one dialog, one open mystery (the Moon), the tabs of today hidden.
  assert(await evaluate('document.querySelector("#tabs").hidden'), 'The tabs of today show in D')
  assert(await count('#drawing .book-card') === 13, 'D does not have 13 cards')
  assert(await count('#drawing .book-card.is-mystery-open') === 1 && await has('[data-card="moon"]', 'is-mystery-open'), 'The Moon is not the only open mystery')
  assert(await readout('open') === '3' && await readout('mystery') === '10' && await readout('next') === 'Moon', `Wrong start of D: ${await readout('open')} ${await readout('mystery')} ${await readout('next')}`)
  await click('[data-card="earth"]')
  assert((await text('#drawing .sticker-note p')).startsWith('Fly out to space') && !(await exists('#note-fly')), 'Earth offers a flight or a sticker at the start')
  await click('[data-card="moon"]'); await click('#note-fly')
  assert(await readout('stickers') === '1 of 13' && await readout('next') === 'Venus', `The Moon does not open Venus: ${await readout('next')}`)
  assert(await has('[data-card="moon"]', 'is-sticker'), 'The Moon card is not a sticker')
  assert(await count('#drawing .solar-orbit') === 3, `The map does not add the path of the Moon: ${await count('#drawing .solar-orbit')}`)
  assert(!(await evaluate('document.querySelector("#study-toast").hidden')), 'No new-sticker note')
  await capture('d-moon')
  await click('[data-card="earth"]'); await click('#note-fly')
  assert(await readout('stickers') === '2 of 13', 'Earth does not give its sticker after the Moon')

  // C: only Earth and Blossom Haven are open; a free flight opens a world.
  await click('#restart'); await click('[data-option="earn"]')
  assert(await readout('open') === '2' && await has('[data-card="mars"]', 'is-mystery-closed'), 'C does not lock Mars')
  await click('[data-card="mars"]')
  assert(!(await exists('#note-fly')), 'C offers a flight to a locked world')
  await click('#free [data-free="mars"]')
  assert(await readout('open') === '3' && await readout('stickers') === '1 of 13', 'A free flight does not open Mars')
  await capture('c-mars')

  // B: every world is open, ten are mysteries. A: no mysteries.
  await click('#restart'); await click('[data-option="fillin"]')
  assert(await readout('open') === '13' && await count('#drawing .book-card.is-mystery-open') === 10, 'B is not ten open mysteries')
  await click('[data-option="onebook"]')
  assert(await readout('mystery') === '0' && await count('#drawing .book-card.is-open') === 13, 'A has mysteries')

  // Today: two dialogs.
  await click('[data-option="today"]')
  assert(!(await evaluate('document.querySelector("#tabs").hidden')) && await count('#drawing .world-picture') === 13, 'Today has no Worlds dialog')
  await click('[data-tab="book"]')
  assert(await count('#drawing .sticker-slot') === 13, 'Today has no sticker book')
  await click('#fill')
  assert(await readout('stickers') === '13 of 13', 'Fill the book does not fill it')
  await capture('today-book')

  // A decision answer stays after a reload, and the export has the five options.
  await click('input[name="option"][value="3"]')
  await send('Page.reload')
  for (let i = 0; i < 40 && !(await evaluate('!!document.querySelector("#compare tbody tr")').catch(() => false)); i++) await delay(250)
  assert(await evaluate(`document.querySelector(${JSON.stringify('input[name="option"][value="3"]')}).checked`), 'The answer is not kept')
  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.study === 'world-book-study' && Object.keys(exported.options).length === 5 && exported.freeFlightPlan.length === 11 && exported.answers.option?.startsWith('D'), 'The export differs from the page')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".intro a").href); return r.ok && (await r.text()).includes("Next door"); })()')
  assert(docWorks, 'The study link does not work')
  await evaluate('localStorage.clear()')

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    for (const device of ['computer', 'phone']) {
      await click(`[data-device="${device}"]`)
      await delay(100)
      // A mobile viewport widens to fit wide content, so compare with the target width too.
      assert(!(await evaluate(`document.documentElement.scrollWidth > Math.min(innerWidth, ${width})`)), `Overflow at ${width}px (${device})`)
    }
    await evaluate('document.querySelector(".stage").scrollIntoView()')
    await capture(`mobile-${width}`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified the tables, eight findings, D (one open mystery, the Moon opens Venus, the map path, the Earth rule), C (a lock, a free flight opens Mars), B, A, the two dialogs of today, a kept answer, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
