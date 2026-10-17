import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Browser checks for build mode (src/home-build.ts), against the Vite server on port 5174:
// node scripts/home-build-smoke.mjs "path/to/chrome.exe" [origin]
// On a computer and on a phone: the Build button shows only near the cottage, build mode stops the
// flight, each part and each colour changes and saves, Surprise gives a new home, Escape closes it,
// and a new page builds the saved home.
if (!process.argv[2]) throw new Error('Pass a Chromium executable')
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
const profile = await mkdtemp(join(tmpdir(), 'home-build-game-'))
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
  await mkdir('artifacts.local/home-build', { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/home-build/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const snapshot = () => evaluate('window.__fairyTest.snapshot()')
  const open = async () => {
    for (let i = 0; i < 120; i++) {
      if (await evaluate('!!window.__fairyTest && !!window.gameFrame && !!document.querySelector("#begin-button")')) return
      await delay(250)
    }
    throw new Error('The game did not start')
  }
  /** A new page: the old page has a mark, so the wait ends only on the new page. */
  const reload = async () => {
    await evaluate('window.__oldPage = true')
    await send('Page.reload')
    for (let i = 0; i < 120 && await evaluate('!!window.__oldPage').catch(() => true); i++) await delay(250)
    await open()
  }
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); advanceGame(0.2)`)
  /** The box of an element on the screen, or null when it does not show. */
  const box = selector => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element || element.hidden || getComputedStyle(element).visibility === 'hidden' || getComputedStyle(element).display === 'none') return null; const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })()`)
  const overlaps = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

  for (const device of ['desktop', 'phone']) {
    const phone = device === 'phone'
    if (phone) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await send('Emulation.setDeviceMetricsOverride', phone ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test` })
    await open()
    await evaluate('localStorage.removeItem("fairy-home")')
    await reload()
    await evaluate('document.querySelector("#begin-button").click(); advanceGame(0.5)')
    let state = await snapshot()
    assert(!state.homeBuild.button && !state.homeBuild.building, `The Build button shows far from the cottage on a ${device}`)
    assert(JSON.stringify(state.homeBuild.look) === JSON.stringify({ roof: 'petals', walls: 'cottage', door: 'round', yard: 'flowers', colors: { roof: 'rose', walls: 'cream', door: 'berry', yard: 'honey' } }), `A new game does not start with the cottage of today on a ${device}`)

    // Near the cottage, the button shows; it does not cover the buttons of the flight.
    await evaluate('window.__fairyTest.placeOver("fairy", [0.05, -1, 0.12], 5); document.querySelector("#hover-toggle").click(); advanceGame(0.3)')
    state = await snapshot()
    assert(state.homeBuild.button, `The Build button does not show near the cottage on a ${device}`)
    const button = await box('#build-home')
    assert(button, `The Build button is not on the screen on a ${device}`)
    for (const other of ['.touch-controls', '.touch-actions', '.toolbar', '.flight-panel', '.mobile-top', '.destination']) assert(!overlaps(button, await box(other)), `The Build button covers ${other} on a ${device}`)
    await capture(`${device}-button`)

    // Build mode: the flight waits, and the panel fits the screen.
    await click('#build-home')
    const before = (await snapshot()).fairy
    await evaluate('advanceGame(1)')
    state = await snapshot()
    assert(state.homeBuild.building && !state.homeBuild.button, `Build mode does not open on a ${device}`)
    assert(state.fairy.every((value, index) => Math.abs(value - before[index]) < 1e-6), `The fairy moves in build mode on a ${device}`)
    const panel = await box('#home-builder')
    const size = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }
    assert(panel && panel.left >= 0 && panel.top >= 0 && panel.right <= size.width && panel.bottom <= size.height, `The panel does not fit the screen on a ${device}: ${JSON.stringify(panel)}`)
    if (phone) assert(!(await box('.touch-controls')) && !(await box('.touch-actions')), 'The touch buttons show in build mode on a phone')

    // Each part changes: a new shape comes in its own colour, a colour changes only the colour.
    await click('[data-home-option="toadstool"]')
    await click('[data-home-tab="walls"]')
    await click('[data-home-option="teapot"]')
    state = await snapshot()
    assert(state.homeBuild.look.roof === 'toadstool' && state.homeBuild.look.colors.roof === 'cherry', `The roof did not change to a cherry toadstool on a ${device}`)
    assert(state.homeBuild.look.walls === 'teapot' && state.homeBuild.look.colors.walls === 'sky', `The walls did not change to a sky teapot on a ${device}`)
    await click('[data-home-color="lilac"]')
    await click('[data-home-tab="door"]')
    await click('[data-home-option="heart"]')
    await click('[data-home-tab="yard"]')
    await click('[data-home-option="lanterns"]')
    await evaluate('advanceGame(1)')
    state = await snapshot()
    const built = { roof: 'toadstool', walls: 'teapot', door: 'heart', yard: 'lanterns', colors: { roof: 'cherry', walls: 'lilac', door: 'berry', yard: 'honey' } }
    assert(JSON.stringify(state.homeBuild.look) === JSON.stringify(built), `The home is not the home that she built on a ${device}: ${JSON.stringify(state.homeBuild.look)}`)
    assert(await evaluate('JSON.parse(localStorage.getItem("fairy-home")).walls === "teapot"'), `The home is not saved on a ${device}`)
    // The parts are in the scene, with the names that the rings and the windows read.
    const scene = await evaluate(`(() => { const home = window.__fairyTest.world('fairy').surface.getObjectByName('flower-cottage'); return { parts: home.children.map(child => child.name), window: !!home.getObjectByName('cottage-window'), scale: home.children.map(child => child.scale.x) } })()`)
    assert(JSON.stringify(scene.parts.sort()) === JSON.stringify(['home-door', 'home-roof', 'home-walls', 'home-yard']), `The home has the parts ${scene.parts} on a ${device}`)
    assert(scene.window, `The home has no lit window on a ${device}`)
    assert(scene.scale.every(value => value === 1), `A part did not end its pop on a ${device}: ${scene.scale}`)
    await capture(`${device}-built`)

    // Surprise gives a whole new home, and saves it.
    await click('#home-surprise')
    await evaluate('advanceGame(1)')
    state = await snapshot()
    assert(JSON.stringify(state.homeBuild.look) !== JSON.stringify(built), `Surprise did not change the home on a ${device}`)
    const surprise = state.homeBuild.look
    await capture(`${device}-surprise`)

    // Escape closes build mode; the flight goes on and the button shows again.
    await evaluate('window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", key: "Escape" })); advanceGame(0.5)')
    state = await snapshot()
    assert(!state.homeBuild.building && state.homeBuild.button, `Escape does not close build mode on a ${device}`)
    assert(!(await box('#home-builder')) || (await evaluate('document.querySelector("#home-builder").getAttribute("aria-hidden")')) === 'true', `The panel stays open on a ${device}`)

    // A new page builds the saved home.
    await reload()
    state = await snapshot()
    assert(JSON.stringify(state.homeBuild.look) === JSON.stringify(surprise), `A new page does not build the saved home on a ${device}`)
    const parts = await evaluate(`window.__fairyTest.world('fairy').surface.getObjectByName('flower-cottage').children.map(child => child.name).sort().join(',')`)
    assert(parts === 'home-door,home-roof,home-walls,home-yard', `A new page builds the parts ${parts} on a ${device}`)
    console.log(`${device}: button near the cottage, built ${built.roof}/${built.walls}/${built.door}/${built.yard}, surprise ${surprise.roof}/${surprise.walls}/${surprise.door}/${surprise.yard}, saved and built again`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified build mode on a computer and a phone: the button near the cottage, the stop of the flight, each part and colour, the save, Surprise, Escape, the saved home on a new page, and no browser errors.')
} finally {
  ws?.close(); browser.kill()
}
