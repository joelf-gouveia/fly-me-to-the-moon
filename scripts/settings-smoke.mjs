// Checks Settings in the real game: the gear button, the wait of the flight, the
// sticker count, the confirmation (Cancel keeps the book), the reset, no sticker
// again at the world where the fairy is, Escape, and the phone menu. Run against
// the dev server on port 5174:
//   node scripts/settings-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'settings-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
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
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a settings error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
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
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  async function load(mobile, width = 390) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough for a guided flight.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#settings-toggle")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir('artifacts.local/settings', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/settings/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  step('desktop'); await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  await click('#begin-button')
  await evaluate('advanceFlight(1)')

  step('to the Moon')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  await click('[data-world="moon"]'); await click('#world-fly')
  let state = await snapshot()
  for (let tick = 0; tick < 200 && !state.stickers.includes('moon'); tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
  }
  assert(state.stickers.join() === 'moon', `The Moon sticker is not the only sticker: ${state.stickers}`)

  // Settings: flight waits, and the count shows.
  await click('#settings-toggle')
  const before = (await snapshot()).elapsed
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.settingsOpen && await evaluate('document.querySelector("#settings").open'), 'Settings does not open')
  assert(state.elapsed === before, 'The flight clock runs while Settings is open')
  assert((await text('#sticker-summary')) === 'The book has 1 of 13 stickers.', `Wrong summary: ${await text('#sticker-summary')}`)

  // The confirmation: Cancel has the focus and keeps the book.
  await click('#reset-stickers')
  assert(await evaluate('!document.querySelector("#reset-confirm").hidden') && (await text('#reset-question')) === 'Remove the sticker?', `Wrong question: ${await text('#reset-question')}`)
  assert(await evaluate('document.activeElement.id') === 'reset-cancel', 'The safe answer does not have the focus')
  await screenshot('confirm')
  await click('#reset-cancel')
  assert((await snapshot()).stickers.join() === 'moon' && await evaluate('document.querySelector("#reset-confirm").hidden'), 'Cancel changes the book')

  // The reset.
  await click('#reset-stickers')
  await click('#reset-yes')
  state = await snapshot()
  assert(state.stickers.length === 0, `The reset keeps stickers: ${state.stickers}`)
  assert(state.openWorlds.join() === 'earth,moon,fairy', `The reset does not close the worlds again: ${state.openWorlds}`)
  assert(JSON.parse(await evaluate('localStorage.getItem("fairy-sticker-book")')).arrived.length === 0, 'The saved book is not empty')
  assert((await text('#reset-status')).startsWith('1 sticker removed.') && await evaluate('document.querySelector("#reset-stickers").disabled'), 'No status after the reset')
  assert((await text('#sticker-summary')) === 'The book is empty.', 'The summary does not show the empty book')
  await screenshot('reset')

  // The fairy is still at the Moon: its sticker does not come back at once.
  await click('#close-settings')
  await evaluate('advanceFlight(3)')
  state = await snapshot()
  assert(!state.settingsOpen && state.belt.nearest === 'Moon' && state.stickers.length === 0, `The Moon sticker comes back without a new visit: ${JSON.stringify({ nearest: state.belt.nearest, stickers: state.stickers })}`)

  // Escape closes Settings.
  await click('#settings-toggle')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await delay(100)
  assert(!(await snapshot()).settingsOpen && !(await evaluate('document.querySelector("#settings").open')), 'Escape does not close Settings')

  // Option C of docs/ui-simplify-study.md, and the book in Worlds (docs/world-book-study.md): three toolbar buttons, and the grown-up controls in Settings.
  step('option C')
  assert(await evaluate('[...document.querySelectorAll(".toolbar button")].map(b => b.id).join()') === 'customize-toggle,settings-toggle,pause-toggle', `The toolbar is not the three buttons: ${await evaluate('[...document.querySelectorAll(".toolbar button")].map(b => b.id).join()')}`)
  assert(await evaluate('["#follow-home", "#show-stars", "#show-orbits", "#sound-toggle", "#orbit-speed-toggle", ".journey-picker", ".controls-copy"].every(s => !document.querySelector(s))'), 'A removed control is still in the game')
  assert(await evaluate('document.querySelector("#home-help").hidden'), 'The guide help shows with no guide')
  assert(!(await text('#flight-region')).includes('landscape'), 'The world panel still shows the landscape number')
  // The map shows the path of each known world; a mystery world has no path until the first arrival.
  const mapPaths = () => evaluate('(() => { const known = [...document.querySelectorAll(".solar-orbit:not(.is-mystery)")]; return known.length >= 2 && known.every(path => getComputedStyle(path).display !== "none") })()')
  await click('#open-map'); await evaluate('advanceFlight(0.1)')
  assert(await mapPaths(), 'The Worlds map hides its paths with the switch off')
  await click('#close-map')
  state = await snapshot()
  assert(!state.orbitPaths && !state.sky.pictures && state.orbitSpeed === 1 && !state.sound, `Wrong start state: ${JSON.stringify({ orbits: state.orbitPaths, stars: state.sky.pictures, speed: state.orbitSpeed, sound: state.sound })}`)
  await click('#settings-toggle')
  assert(await evaluate('getComputedStyle(document.querySelector(".how-keys")).display !== "none" && getComputedStyle(document.querySelector(".how-touch")).display === "none"'), 'How to fly does not show the keys on a computer')
  await click('#setting-orbits'); await click('#setting-stars'); await click('#settings [data-speed="16"]')
  // The sound needs a real tap: the browser starts sound only after a user action.
  const box = await evaluate('(() => { const r = document.querySelector("#setting-sound + i").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()')
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  for (let i = 0; i < 20 && !(await snapshot()).sound; i++) await delay(100)
  state = await snapshot()
  assert(state.orbitPaths && state.sky.pictures && state.orbitSpeed === 16 && state.sound, `The switches do not act: ${JSON.stringify({ orbits: state.orbitPaths, stars: state.sky.pictures, speed: state.orbitSpeed, sound: state.sound })}`)
  assert(JSON.stringify(JSON.parse(await evaluate('localStorage.getItem("fairy-settings")'))) === '{"stars":true,"orbits":true}', 'The sky switches are not saved')
  await screenshot('sky-switches')
  await click('#setting-orbits'); await click('#close-settings')
  state = await snapshot()
  assert(!state.orbitPaths && state.sky.pictures, 'The Orbit paths switch does not turn the paths off')
  await click('#open-map'); await evaluate('advanceFlight(0.1)')
  assert(await mapPaths(), 'The Orbit paths switch hides the paths of the Worlds map')
  await click('#close-map')
  await click('#settings-toggle'); await click('#setting-orbits'); await click('#close-settings')

  // After a reload: the two sky switches stay, World speed and the sound start again.
  await load(false)
  state = await snapshot()
  assert(state.orbitPaths && state.sky.pictures && state.orbitSpeed === 1 && !state.sound, `Wrong state after a reload: ${JSON.stringify({ orbits: state.orbitPaths, stars: state.sky.pictures, speed: state.orbitSpeed, sound: state.sound })}`)
  assert(await evaluate('document.querySelector("#setting-stars").checked && document.querySelector("#setting-orbits").checked && !document.querySelector("#setting-sound").checked'), 'The switches do not show the saved state')
  assert(await evaluate('document.querySelector("#settings [data-speed=\\"1\\"]").getAttribute("aria-checked")') === 'true', 'World speed does not start at 1×')
  await evaluate('localStorage.removeItem("fairy-settings")')

  for (const width of [390, 320]) {
    step(`phone ${width}`); await load(true, width)
    await click('#begin-button')
    await evaluate('advanceFlight(1)')
    await click('#menu-toggle')
    assert(await evaluate('!!document.querySelector(".menu-actions #settings-toggle")') && (await text('#settings-toggle .mobile-action-label')) === 'Settings', 'The phone menu has no Settings button')
    await click('#settings-toggle')
    await evaluate('advanceFlight(0.2)')
    state = await snapshot()
    assert(state.settingsOpen && !state.menuOpen, 'The Settings button does not swap the menu for Settings')
    assert(await evaluate('[...document.querySelectorAll(".menu-actions button")].map(b => b.id).join()') === 'customize-toggle,settings-toggle', 'The phone menu is not the two buttons')
    assert(await evaluate('getComputedStyle(document.querySelector(".how-touch")).display !== "none" && getComputedStyle(document.querySelector(".how-keys")).display === "none"'), 'How to fly does not show the touch help on a phone')
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${width}px`)
    assert(await evaluate('(() => { const d = document.querySelector("#settings").getBoundingClientRect(); return d.left >= 0 && d.right <= innerWidth })()'), `Settings is wider than the screen at ${width}px`)
    const smallest = await evaluate('Math.min(...[...document.querySelectorAll("#settings button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(smallest >= 44, `A Settings button is smaller than 44 px at ${width}px: ${smallest}`)
    await screenshot(`settings-${width}`)
  }

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified Settings: the gear button, the wait of the flight, the count, Cancel with the focus, the reset and the saved empty book, no Moon sticker again at the Moon, Escape, the three toolbar buttons, the removed controls, the map paths, the sky switches, World speed, the sound, the saved switches after a reload, How to fly, and the 390/320 px phone menu. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
