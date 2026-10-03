// Checks the postcard camera in the real game: the camera button, the flash, the postcard
// with a real picture, Save (a PNG file), Share, the wait of the flight, Escape, the focus,
// reduced motion, a postcard from the Moon, and the phone Menu at 390 and 320 px. Run
// against the dev server on port 5174:
//   node scripts/postcard-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const out = 'artifacts.local/postcard'
const downloads = resolve(out, 'downloads')
const profile = await mkdtemp(join(tmpdir(), 'postcard-browser-'))
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a postcard error.
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
  const focused = () => evaluate('document.activeElement?.id ?? null')
  // A real press of the mouse or a finger, so the browser counts it as a user action.
  const press = async (selector, touch = false) => {
    const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
    if (touch) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [box] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  }
  const escape = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await delay(100)
  }
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  async function load(mobile, width = 390, height = 844) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough for a guided flight.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#postcard-toggle")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir(out, { recursive: true })
  await rm(downloads, { recursive: true, force: true }); await mkdir(downloads, { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${out}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  /** Waits for the CSS animations of the card: the flash, the slide and the buttons. */
  const settle = () => delay(1300)
  /** The picture on the card: its size, and how much its colours change. A blank picture has one colour. */
  const photoStats = () => evaluate(`(() => {
    const canvas = document.querySelector('#postcard .postcard-photo canvas')
    if (!canvas) return null
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    let sum = 0, square = 0, count = 0
    const colours = new Set()
    for (let i = 0; i < data.length; i += 4 * 97) {
      const light = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      sum += light; square += light * light; count++
      colours.add((data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | data[i + 2] >> 3)
    }
    const mean = sum / count
    return { width: canvas.width, height: canvas.height, mean, deviation: Math.sqrt(square / count - mean * mean), colours: colours.size }
  })()`)
  const notBlank = (stats, where) => assert(stats && stats.deviation > 6 && stats.colours > 40 && stats.mean > 8 && stats.mean < 250, `The picture is blank ${where}: ${JSON.stringify(stats)}`)
  /** The PNG size from its header. */
  const pngSize = buffer => {
    assert(buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'The saved file is not a PNG')
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  async function waitForDownload(name) {
    for (let i = 0; i < 80; i++) {
      const files = await readdir(downloads)
      if (files.includes(name)) {
        const buffer = await readFile(join(downloads, name))
        if (buffer.length > 1000) return buffer
      }
      await delay(150)
    }
    throw new Error(`No download named ${name}: ${await readdir(downloads)}`)
  }
  const downloadBehavior = { behavior: 'allow', downloadPath: downloads }
  await send('Browser.setDownloadBehavior', downloadBehavior).catch(() => send('Page.setDownloadBehavior', downloadBehavior))

  step('desktop'); await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  await click('#begin-button')
  await evaluate('advanceFlight(1)')

  // The camera is a round button of the toolbar, between the fairy button and Settings.
  const toolbar = await evaluate('[...document.querySelectorAll(".toolbar button")].map(b => b.id).join()')
  assert(toolbar === 'customize-toggle,postcard-toggle,settings-toggle,pause-toggle', `The toolbar is not the four buttons: ${toolbar}`)
  assert(await evaluate('(() => { const b = document.querySelector("#postcard-toggle"); return b.classList.contains("icon-button") && b.ariaLabel === "Take a postcard" && !!b.querySelector("svg circle[cx=\\"12\\"][cy=\\"13\\"][r=\\"3\\"]") })()'), 'The camera button has no camera icon or no name')
  await screenshot('toolbar')

  // The flash and the postcard.
  step('the flash and the postcard')
  await evaluate('document.querySelector("#postcard-toggle").focus()')
  await press('#postcard-toggle')
  const flash = await evaluate('(() => { const style = getComputedStyle(document.querySelector("#postcard"), "::backdrop"); return { name: style.animationName, colour: style.backgroundColor } })()')
  await screenshot('flash')
  assert(flash.name === 'postcard-flash', `No flash animation: ${JSON.stringify(flash)}`)
  const [red, green, blue] = flash.colour.match(/[\d.]+/g).map(Number)
  assert(red > 200 && green > 200 && blue > 200, `The flash is not white at the start: ${flash.colour}`)
  let state = await snapshot()
  assert(state.postcardOpen && state.postcard.open && await evaluate('document.querySelector("#postcard").open'), 'The postcard does not open')
  assert(state.postcard.world === 'Earth' && state.postcard.file === 'fairy-postcard-earth.png' && state.postcard.shots === 1, `Wrong postcard state: ${JSON.stringify(state.postcard)}`)
  assert(await focused() === 'postcard-save', `The focus is not on the postcard: ${await focused()}`)
  await settle()
  assert((await text('#postcard-title')) === 'Earth' && (await text('#postcard-line')) === 'A POSTCARD FROM YOUR JOURNEY', 'The postcard has the wrong words')
  assert(await evaluate('getComputedStyle(document.querySelector("#postcard-title")).fontFamily.includes("Italiana")'), 'The name does not use the display font')
  assert(await evaluate('!!document.querySelector("#postcard .postcard-stamp .planet-picture.earth")'), 'The stamp is not the Earth sticker picture')
  assert(await evaluate('getComputedStyle(document.querySelector(".postcard-figure")).rotate') === '-2.5deg', 'The card has no tilt')
  const desktopPhoto = await photoStats()
  notBlank(desktopPhoto, 'on the computer')
  assert(desktopPhoto.width > desktopPhoto.height, `A computer gives a tall picture: ${JSON.stringify(desktopPhoto)}`)
  // The picture is the 3D view only: the panels of the screen are HTML, not in the canvas.

  // Flight waits while the postcard is open.
  const before = (await snapshot()).elapsed
  await evaluate('advanceFlight(1)')
  assert((await snapshot()).elapsed === before, 'The flight clock runs while the postcard is open')

  for (let i = 0; i < 40 && !(await snapshot()).postcard.ready; i++) await delay(100)
  state = await snapshot()
  assert(state.postcard.ready && !(await evaluate('document.querySelector("#postcard-save").disabled')), 'The card is not ready to save')
  const canShare = await evaluate('typeof navigator.share === "function" && !!navigator.canShare')
  assert(state.postcard.share === await evaluate('!document.querySelector("#postcard-share").hidden'), 'The Share button does not follow canShare()')
  await screenshot('postcard')

  // Save: a PNG of the whole card.
  step('save')
  await press('#postcard-save')
  const png = await waitForDownload('fairy-postcard-earth.png')
  const size = pngSize(png)
  assert(size.width === state.postcard.width && size.height === state.postcard.height && size.width === 1280, `The PNG is not the whole card: ${JSON.stringify(size)}`)
  await copyFile(join(downloads, 'fairy-postcard-earth.png'), `${out}/fairy-postcard-earth.png`)
  for (let i = 0; i < 20 && !(await text('#postcard-status')); i++) await delay(50)
  assert((await text('#postcard-status')) === 'Saved to Downloads' && (await snapshot()).postcard.saved === 1, `No note after Save: ${await text('#postcard-status')}`)
  await screenshot('saved')

  // Escape closes the postcard; the focus goes back to the camera, and the flight goes on.
  step('escape')
  await escape()
  state = await snapshot()
  assert(!state.postcardOpen && !(await evaluate('document.querySelector("#postcard").open')), 'Escape does not close the postcard')
  assert(await focused() === 'postcard-toggle', `The focus does not go back to the camera: ${await focused()}`)
  await evaluate('advanceFlight(0.5)')
  assert((await snapshot()).elapsed > state.elapsed, 'The flight does not go on after the postcard')

  // The close button, and a tap outside the card.
  await press('#postcard-toggle'); await settle()
  await press('#close-postcard')
  await delay(100)
  assert(!(await snapshot()).postcardOpen && await focused() === 'postcard-toggle', 'The close button does not close the postcard')
  await press('#postcard-toggle'); await settle()
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: 6, y: 6, button: 'left', clickCount: 1 })
  await delay(100)
  assert(!(await snapshot()).postcardOpen, 'A tap outside the card does not close it')

  // Share: hidden where the device cannot share files, and one call with the file where it can.
  step('share')
  await evaluate('navigator.canShare = () => false')
  await press('#postcard-toggle'); await settle()
  for (let i = 0; i < 40 && !(await snapshot()).postcard.ready; i++) await delay(100)
  assert(await evaluate('document.querySelector("#postcard-share").hidden') && !(await snapshot()).postcard.share, 'Share shows on a device that cannot share files')
  await escape()
  await evaluate('navigator.canShare = data => data.files?.[0] instanceof File; navigator.share = async data => { window.sharedFiles = data.files.map(file => file.name + " " + file.type) }')
  await press('#postcard-toggle'); await settle()
  for (let i = 0; i < 40 && !(await snapshot()).postcard.ready; i++) await delay(100)
  assert(await evaluate('!document.querySelector("#postcard-share").hidden'), 'Share does not show on a device that can share files')
  assert(await evaluate('window.sharedFiles === undefined'), 'The postcard is shared without a tap')
  await screenshot('share')
  await press('#postcard-share')
  for (let i = 0; i < 20 && !(await snapshot()).postcard.shared; i++) await delay(50)
  assert(await evaluate('window.sharedFiles?.join()') === 'fairy-postcard-earth.png image/png', `Share does not send the PNG: ${await evaluate('window.sharedFiles?.join()')}`)
  await escape()

  // Reduced motion: no flash and no slide. The card keeps its tilt.
  step('reduced motion')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await press('#postcard-toggle')
  const still = await evaluate('[getComputedStyle(document.querySelector("#postcard"), "::backdrop").animationName, getComputedStyle(document.querySelector(".postcard-card")).animationName, getComputedStyle(document.querySelector(".postcard-figure")).rotate].join()')
  assert(still === 'none,none,-2.5deg', `Reduced motion still moves the postcard: ${still}`)
  await screenshot('reduced-motion')
  await escape()
  await send('Emulation.setEmulatedMedia', { features: [] })

  // A postcard from the Moon: "The Moon", the Moon stamp and its file name.
  step('to the Moon')
  await click('#open-map')
  await evaluate('advanceFlight(0.2)')
  await click('[data-world="moon"]'); await click('#world-fly')
  state = await snapshot()
  for (let tick = 0; tick < 200 && !state.stickers.includes('moon'); tick++) {
    await evaluate('advanceFlight(0.5)')
    state = await snapshot()
  }
  assert(state.belt.nearest === 'Moon', `The fairy is not at the Moon: ${state.belt.nearest}`)
  await evaluate('advanceFlight(2)')
  await press('#postcard-toggle'); await settle()
  state = await snapshot()
  assert(state.postcard.file === 'fairy-postcard-moon.png' && (await text('#postcard-title')) === 'The Moon' && await evaluate('!!document.querySelector("#postcard .planet-picture.moon")'), `Wrong postcard at the Moon: ${JSON.stringify(state.postcard)}`)
  notBlank(await photoStats(), 'at the Moon')
  for (let i = 0; i < 40 && !(await snapshot()).postcard.ready; i++) await delay(100)
  await press('#postcard-save')
  pngSize(await waitForDownload('fairy-postcard-moon.png'))
  await copyFile(join(downloads, 'fairy-postcard-moon.png'), `${out}/fairy-postcard-moon.png`)
  await screenshot('moon')
  await escape()

  const phones = []
  for (const [width, height] of [[390, 844], [320, 568], [844, 390]]) {
    const label = `${width}x${height}`
    step(`phone ${label}`); await load(true, width, height)
    await click('#begin-button')
    await evaluate('advanceFlight(1)')
    // On a touch screen the camera is in Menu, with the fairy button and Settings.
    assert(await evaluate('!document.querySelector(".toolbar #postcard-toggle")'), 'The camera is on the phone screen, not in Menu')
    await press('#menu-toggle', true); await delay(100)
    const menu = await evaluate('[...document.querySelectorAll(".menu-actions button")].map(b => b.id).join()')
    assert(menu === 'customize-toggle,postcard-toggle,settings-toggle', `The phone menu is not the three buttons: ${menu}`)
    assert((await text('#postcard-toggle .mobile-action-label')) === 'Postcard', 'The camera has no label in Menu')
    const smallestMenu = await evaluate('Math.min(...[...document.querySelectorAll(".menu-actions button")].map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(smallestMenu >= 48, `A Menu button is smaller than 48 px: ${smallestMenu}`)
    await screenshot(`menu-${label}`)
    await press('#postcard-toggle', true)
    await evaluate('advanceFlight(0.2)')
    state = await snapshot()
    assert(state.postcardOpen && !state.menuOpen && !(await evaluate('document.querySelector("#flight-menu").open')), 'The camera does not swap Menu for the postcard')
    const time = state.elapsed
    await evaluate('advanceFlight(1)')
    assert((await snapshot()).elapsed === time, 'The flight clock runs while the postcard is open on a phone')
    await settle()
    const photo = await photoStats()
    notBlank(photo, `at ${label}`)
    if (height > width) assert(photo.height > photo.width, `A phone held upright gives a wide picture: ${JSON.stringify(photo)}`)
    assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow at ${label}`)
    const fit = await evaluate('(() => { const parts = ["#postcard .postcard-figure", "#close-postcard", "#postcard-save"].map(s => document.querySelector(s).getBoundingClientRect()); return parts.every(r => r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight) })()')
    assert(fit, `The postcard is larger than the screen at ${label}`)
    const smallest = await evaluate('Math.min(...[...document.querySelectorAll("#postcard button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(smallest >= 44, `A postcard button is smaller than 44 px at ${label}: ${smallest}`)
    await screenshot(`postcard-${label}`)
    await escape()
    assert(!(await snapshot()).postcardOpen && await focused() === 'menu-toggle', `On a phone the focus does not go back to Menu: ${await focused()}`)
    phones.push({ label, photo: `${photo.width}x${photo.height}` })
  }

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified the postcard camera: the toolbar button with the camera icon, the white flash, the postcard with a real picture (deviation ${desktopPhoto.deviation.toFixed(1)}, ${desktopPhoto.colours} colours), the name in the display font, the line, the Earth stamp, the tilt, the focus on Save, the wait of the flight, Save as a ${size.width} × ${size.height} PNG, Share (hidden without canShare(); a real share API here: ${canShare}), Escape, the close button, a tap outside, the focus back on the camera, reduced motion, a postcard from the Moon, and the phone Menu at ${phones.map(phone => `${phone.label} (picture ${phone.photo})`).join(', ')}. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
