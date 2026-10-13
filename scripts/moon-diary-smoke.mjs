// Checks the Moon shapes diary (F14) in the real game: no shape while the Moon is out of the view, the
// look time, the note and its wait for another note, the saved diary, the diary in Worlds (flight waits),
// the clouds, the thick air at the horizon, the eclipse, the new Moon next to the Sun, a broken saved
// value, Reset sticker book of Settings, reduced motion, and the phone layouts.
// Run against the dev server on port 5174:
//   node scripts/moon-diary-smoke.mjs "path/to/chrome.exe" [origin]
// A third argument "month" measures the diary of a child who stays on Earth, and checks nothing:
//   node scripts/moon-diary-smoke.mjs "path/to/chrome.exe" [origin] month [seconds]
// It flies three scripted children (the child who wanders flies three times) for `seconds` of game time (default: 600, two lunar months) at 1×
// World speed, with the real weather, and prints the time of each new shape.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
const measure = process.argv[4] === 'month', measureSeconds = Number(process.argv[5] ?? 600)
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'moon-diary-browser-'))
const browser = spawn(browserPath, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a diary error.
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
  const diary = async () => (await snapshot()).moonDiary
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const hidden = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).hidden`)
  const fly = seconds => evaluate(`advanceFlight(${seconds})`)
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
  ` })
  /** Loads the game with the test options of `query`, for example "weather=clear&moon=75", and starts the flight. */
  async function load(query = '', mobile = false, width = 390) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    // The old page must not answer for the new page.
    await evaluate('window.oldPage = true').catch(() => {})
    await send('Page.navigate', { url: `${origin}/?test${query ? `&${query}` : ''}` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!window.oldPage && !!window.testFrame && !!window.__fairyTest && !!document.querySelector("#moon-toast")').catch(() => false)) {
        await click('#begin-button')
        await fly(0.5)
        // The stubbed frame clock holds CSS animations at their start, so a screenshot skips the entry animation.
        await evaluate('document.querySelector("#moon-toast").style.animation = "none"; document.querySelector("#welcome").style.display = "none"')
        return
      }
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir('artifacts.local/moon-diary', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/moon-diary/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  /**
   * Turns Earth until the Moon is above the horizon in a clear part of the sky, by night or by day, and looks
   * at it. With `shape`, the turn continues until the fairy sees that shape: the lit part changes with her place.
   */
  async function findMoon(night, shape) {
    const shapes = new Set()
    for (let i = 0; i < 48; i++) {
      await evaluate('__fairyTest.spin(5); __fairyTest.faceMoon()')
      await fly(0.05)
      const state = await snapshot(), sight = state.moonDiary.sight
      shapes.add(state.moonDiary.shape)
      const dark = night ? state.daylight.elevation < -14 : state.daylight.elevation > 8
      if (sight.aboveHorizon && dark && (shape ? state.moonDiary.shape === shape : sight.veil < 0.5)) return state
    }
    throw new Error(`The Moon does not come into a clear ${night ? 'night' : 'day'} sky${shape ? ` as ${shape}. Shapes in one day: ${[...shapes].join(', ')}` : ''}`)
  }

  if (measure) {
    // Three children who stay in the air of Earth. Each one starts as the game starts: a half Moon in the morning sky.
    const key = (code, down) => evaluate(`window.dispatchEvent(new KeyboardEvent(${JSON.stringify(down ? 'keydown' : 'keyup')}, { code: ${JSON.stringify(code)}, bubbles: true }))`)
    const KEYS = ['KeyA', 'KeyD', 'KeyW', 'KeyS']
    const children = {
      // She does not steer: a low, level flight around Earth.
      cruise: () => [],
      // She turns, climbs and dives at random, and stays in the air.
      wander: (state, random) => [random() < 0.3 ? 'KeyA' : random() < 0.43 ? 'KeyD' : null, state.moonDiary.altitude > 70 ? 'KeyS' : random() < 0.3 ? 'KeyW' : random() < 0.2 ? 'KeyS' : null],
      // She flies to the Moon when it is in the sky. Near the top of the air she comes down again.
      moon: (state, random) => {
        const { sight, aim, altitude } = state.moonDiary
        if (altitude > 55 || !sight.aboveHorizon) return [null, altitude > 25 ? 'KeyS' : null]
        const behind = aim[2] > 1
        return [behind || aim[0] < -0.15 ? 'KeyA' : aim[0] > 0.15 ? 'KeyD' : null, behind ? null : aim[1] > 0.25 ? 'KeyW' : aim[1] < -0.25 ? 'KeyS' : null]
      },
    }
    // The child who wanders flies three times, each time with other random choices.
    for (const [name, start] of [['cruise', 7], ['wander', 7], ['wander', 21], ['wander', 99], ['moon', 7]]) {
      const choose = children[name]
      await load()
      await evaluate('localStorage.clear()')
      await load()
      let seed = start
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      const seen = [], clearNights = { moonUp: 0, inView: 0, counts: 0, total: 0 }
      let held = [], away = 0
      for (let time = 0; time < measureSeconds; time += 0.5) {
        const state = await snapshot()
        for (const shape of state.moonDiary.seen) if (!seen.some(item => item.shape === shape)) seen.push({ shape, at: time })
        clearNights.total++
        if (state.moonDiary.sight.aboveHorizon) clearNights.moonUp++
        if (state.moonDiary.sight.aboveHorizon && state.moonDiary.sight.inView) clearNights.inView++
        if (state.moonDiary.shape) clearNights.counts++
        if (!state.moonDiary.sight.onEarth) away++
        // A new choice each 2 s for the child who wanders, and each 0.5 s for the others.
        if (name !== 'wander' || time % 2 === 0) {
          const next = choose(state, random).filter(Boolean)
          for (const code of KEYS) if (held.includes(code) !== next.includes(code)) await key(code, next.includes(code))
          held = next
        }
        await fly(0.5)
        if (time % 60 === 0) step(`${name} ${time} s: ${seen.map(item => item.shape).join(', ') || 'no shape'} · ${Math.round(state.moonDiary.altitude)} m`)
      }
      const part = value => `${Math.round(value / clearNights.total * 100)}%`
      const months = Array.from({ length: Math.ceil(measureSeconds / 300) }, (_, month) => seen.filter(item => item.at < (month + 1) * 300).length)
      console.log(`${name}${name === 'wander' ? ` (${start})` : ''}: ${seen.length} of 5 shapes in ${measureSeconds} s. Shapes at the end of each month: ${months.join(', ')}. New shapes: ${seen.map(item => `${item.shape} at ${item.at} s`).join(', ') || 'none'}. Moon above the horizon ${part(clearNights.moonUp)} of the time, in the view ${part(clearNights.inView)}, and a shape counts ${part(clearNights.counts)}. Out of the air of Earth ${part(away)}.`)
    }
    assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  } else {
    step('desktop: the first shape')
    await load('weather=clear')
    await evaluate('localStorage.clear()')
    await load('weather=clear')
    let state = await diary()
    // The game starts with a half Moon high in the morning sky, above the picture.
    assert(state.seen.length === 0 && state.sight.onEarth && state.sight.aboveHorizon && !state.sight.inView && state.shape === null, `The start is wrong: ${JSON.stringify(state)}`)
    await fly(3)
    assert((await diary()).seen.length === 0 && await hidden('#moon-toast'), 'A shape counts while the Moon is out of the view')
    await screenshot('flight-no-note')
    // Thick air hides a low Moon: no shape, also with the Moon in the view and above the horizon.
    let low = 0
    for (let i = 0; i < 48 && low < 0.8; i++) {
      await evaluate('__fairyTest.spin(5); __fairyTest.faceMoon()')
      await fly(0.05)
      state = await diary()
      low = state.sight.aboveHorizon && state.sight.inView ? state.sight.veil : 0
    }
    await fly(2)
    state = await diary()
    assert(low >= 0.8 && state.sight.aboveHorizon && state.sight.inView && state.sight.veil > 0.75 && state.shape === null && state.seen.length === 0, `A shape counts behind thick air: ${JSON.stringify(state)}`)
    await screenshot('low-moon-no-note')
    // The Moon in a clear part of the day sky: the shape counts after the look time, not before.
    await findMoon(false, 'half')
    state = await diary()
    assert(state.shape === 'half' && (state.seen.length === 0) === (state.look < 0.8), `The half Moon counts before the look time: ${JSON.stringify(state)}`)
    await fly(1.5)
    state = await diary()
    assert(state.seen.join() === 'half' && state.note === 'Half Moon', `The look does not give the half Moon: ${JSON.stringify(state)}`)
    assert((await text('#moon-toast small')) === 'NEW MOON SHAPE' && (await text('#moon-toast p')) === 'One half is bright.' && await evaluate('!!document.querySelector("#moon-toast svg path")'), 'The note has no picture, name or line')
    assert(JSON.parse(await evaluate('localStorage.getItem("fairy-moon-diary")')).seen.join() === 'half', 'The diary is not saved')
    // The note has the place of the sticker note, and no strip shows in the flight.
    const place = await evaluate('(() => { const a = document.querySelector("#moon-toast").getBoundingClientRect(); const s = document.querySelector("#sticker-toast"); s.style.animation = "none"; s.hidden = false; const b = s.getBoundingClientRect(); s.hidden = true; return [a.right, a.bottom, b.right, b.bottom, innerWidth, innerHeight] })()')
    assert(Math.abs(place[0] - place[2]) < 1 && Math.abs(place[1] - place[3]) < 1 && place[0] <= place[4], `The note is not at the place of the sticker note: ${place}`)
    assert(await evaluate('!document.querySelector(".moon-diary-book").closest("dialog").open'), 'The diary shows in the flight')
    await screenshot('note-half-day')
    // The note goes after 6.5 s of flight. The same shape gives no second note.
    await fly(7)
    assert(await hidden('#moon-toast'), 'The note stays')
    await fly(3)
    state = await diary()
    assert(state.seen.join() === 'half' && state.note === null && state.waiting.length === 0, `The same shape counts again: ${JSON.stringify(state)}`)

    step('Worlds: the diary')
    await click('#open-map')
    const before = (await snapshot()).elapsed
    await fly(1)
    assert((await snapshot()).mapOpen && (await snapshot()).elapsed === before, 'The flight does not wait while Worlds is open')
    assert((await text('#moon-diary-count')).trim() === '1 of 5 Moon shapes', `Wrong count: ${await text('#moon-diary-count')}`)
    const places = () => evaluate('[...document.querySelectorAll(".moon-shape")].map(place => [place.dataset.shape, place.classList.contains("is-seen"), place.ariaLabel, !!place.querySelector("svg")])')
    assert(JSON.stringify((await places()).map(place => [place[0], place[1]])) === '[["new",false],["crescent",false],["half",true],["gibbous",false],["full",false]]' && (await places()).every(place => place[3]), `Wrong places: ${JSON.stringify(await places())}`)
    // The line says where the Moon is now.
    assert((await text('#moon-diary-line')) === 'The Moon is in the sky now. Look up!', `Wrong line: ${await text('#moon-diary-line')}`)
    await click('.moon-shape[data-shape="half"]')
    assert((await text('#moon-diary-line')) === 'Half Moon. One half is bright.', `Wrong line of a shape: ${await text('#moon-diary-line')}`)
    await click('.moon-shape[data-shape="new"]')
    assert((await text('#moon-diary-line')) === 'Look near the Sun. The Moon hides there.', `Wrong hint of an empty place: ${await text('#moon-diary-line')}`)
    await evaluate('document.querySelector(".moon-diary-book").scrollIntoView({ block: "center" })')
    await screenshot('worlds-some')
    await click('#close-map')

    step('the note waits for another note')
    // Another lunar time: a crescent in the day sky. The saved half Moon stays.
    await load('weather=clear&moon=105')
    assert((await diary()).seen.join() === 'half', 'The diary differs after a reload')
    await evaluate('document.querySelector("#sticker-toast").hidden = false')
    await findMoon(false, 'crescent')
    await fly(2)
    state = await diary()
    assert(state.seen.join() === 'half,crescent' && state.note === null && state.waiting.join() === 'crescent', `The note does not wait for the sticker note: ${JSON.stringify(state)}`)
    await evaluate('document.querySelector("#sticker-toast").hidden = true')
    await fly(0.1)
    state = await diary()
    assert(state.note === 'Crescent' && state.waiting.length === 0, `The note does not come after the sticker note: ${JSON.stringify(state)}`)
    // A sticker note comes first: the note of the shape goes.
    await evaluate('document.querySelector("#sticker-toast").hidden = false')
    await fly(0.1)
    assert(await hidden('#moon-toast'), 'Two notes show at the same time')
    await evaluate('document.querySelector("#sticker-toast").hidden = true')

    step('clouds')
    await load('weather=rain&moon=150')
    // At this time the Moon is below the horizon of the meadow.
    assert(!(await diary()).sight.aboveHorizon, 'The Moon is above the horizon at 150 s')
    await click('#open-map')
    assert((await text('#moon-diary-line')) === 'The Moon is on the other side of Earth now. It comes back soon.', `Wrong line below the horizon: ${await text('#moon-diary-line')}`)
    await click('#close-map')
    await findMoon(true).catch(() => {})
    await fly(2)
    state = await diary()
    assert(state.sight.cover > 0.5 && state.shape === null && state.seen.join() === 'half,crescent', `A shape counts below the clouds: ${JSON.stringify(state)}`)

    step('night: almost full, the eclipse, the full Moon')
    await load('weather=clear&moon=172')
    await findMoon(true, 'gibbous')
    await fly(1.5)
    state = await diary()
    assert(state.seen.at(-1) === 'gibbous' && state.note === 'Almost full', `No almost full Moon: ${JSON.stringify(state)}`)
    await screenshot('note-almost-full-night')
    // At 225 s the shadow of Earth is on the full Moon: the dark Moon gives no shape.
    await load('weather=clear&moon=225')
    await findMoon(true)
    await fly(2)
    state = await diary()
    assert(state.sight.eclipse && state.sight.lit > 0.88 && state.shape === null && !state.seen.includes('full'), `The eclipse gives a full Moon: ${JSON.stringify(state)}`)
    await screenshot('eclipse-no-note')
    await load('weather=clear&moon=190')
    await findMoon(true, 'full')
    await fly(1.5)
    state = await diary()
    assert(!state.sight.eclipse && state.seen.at(-1) === 'full' && state.note === 'Full Moon', `No full Moon: ${JSON.stringify(state)}`)
    await screenshot('note-full-night')

    step('the new Moon, and the full diary')
    await load('weather=clear&moon=75')
    await findMoon(false, 'new')
    state = await diary()
    assert(state.shape === 'new' && state.sight.elongation < 37 && state.sight.sunUp, `No new Moon next to the Sun: ${JSON.stringify(state)}`)
    await fly(1.5)
    state = await diary()
    assert(state.seen.length === 5 && state.note === 'New Moon' && (await text('#moon-toast p')) === 'The Moon hides today.' && (await text('#moon-toast small')) === 'YOUR MOON DIARY IS FULL', `No new Moon in a full diary: ${JSON.stringify(state)}`)
    await screenshot('note-new-day')
    await click('#open-map')
    await fly(0.2)
    assert(await evaluate('document.querySelectorAll(".moon-shape.is-seen").length') === 5 && (await text('#moon-diary-line')) === 'You saw every shape of the Moon!', 'The full diary does not show in Worlds')
    assert(await hidden('#moon-toast'), 'The note stays behind Worlds')
    await evaluate('document.querySelector(".moon-diary-book").scrollIntoView({ block: "center" })')
    await screenshot('worlds-all')
    await evaluate('document.querySelector("#world-map").scrollTop = 0')
    await screenshot('worlds-top')
    await click('#close-map')

    step('Settings: Reset sticker book')
    await click('#settings-toggle')
    assert((await text('#sticker-summary')) === 'The book is empty. The Moon diary has 5 Moon shapes.' && !(await evaluate('document.querySelector("#reset-stickers").disabled')), `Wrong summary: ${await text('#sticker-summary')}`)
    await click('#reset-stickers')
    assert((await text('#reset-question')) === 'Remove all 5 Moon shapes?', `Wrong question: ${await text('#reset-question')}`)
    await click('#reset-cancel')
    assert((await diary()).seen.length === 5, 'Cancel changes the diary')
    await click('#reset-stickers')
    await click('#reset-yes')
    state = await diary()
    assert(state.seen.length === 0 && JSON.parse(await evaluate('localStorage.getItem("fairy-moon-diary")')).seen.length === 0, `The reset keeps the diary: ${JSON.stringify(state)}`)
    assert((await text('#reset-status')).startsWith('5 Moon shapes removed.') && (await text('#sticker-summary')) === 'The book is empty.' && await evaluate('document.querySelector("#reset-stickers").disabled'), `Wrong status: ${await text('#reset-status')}`)
    await click('#close-settings')
    await click('#open-map')
    assert((await text('#moon-diary-count')).trim() === '0 of 5 Moon shapes' && await evaluate('document.querySelectorAll(".moon-shape.is-seen").length') === 0, 'Worlds shows the old diary after the reset')
    await evaluate('document.querySelector(".moon-diary-book").scrollIntoView({ block: "center" })')
    await screenshot('worlds-empty')
    await click('#close-map')

    step('a broken saved diary, and reduced motion')
    await evaluate('localStorage.setItem("fairy-moon-diary", "{broken")')
    await load('weather=clear')
    assert((await diary()).seen.length === 0, 'A broken saved diary is not empty')
    await evaluate('localStorage.setItem("fairy-moon-diary", JSON.stringify({ seen: ["full", "cheese", "full", 3] }))')
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await load('weather=clear')
    assert((await diary()).seen.join() === 'full', `An unknown shape stays: ${(await diary()).seen}`)
    await evaluate('document.querySelector("#moon-toast").style.animation = ""; document.querySelector("#moon-toast").hidden = false')
    assert(await evaluate('getComputedStyle(document.querySelector("#moon-toast")).animationName') === 'none', 'The note moves with reduced motion')
    await send('Emulation.setEmulatedMedia', { features: [] })

    for (const width of [390, 320]) {
      step(`phone ${width}`)
      await evaluate('localStorage.setItem("fairy-moon-diary", JSON.stringify({ seen: ["crescent", "full"] }))')
      await load('weather=clear', true, width)
      await findMoon(false)
      await fly(1.5)
      state = await diary()
      assert(state.seen.join() === 'crescent,full,half' && state.note === 'Half Moon', `No note on a phone: ${JSON.stringify(state)}`)
      const box = await evaluate('(() => { const r = document.querySelector("#moon-toast").getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom, innerWidth, document.querySelector(".mobile-top").getBoundingClientRect().bottom] })()')
      assert(box[0] >= 0 && box[1] <= box[4] && box[2] >= box[5], `The note is not on the screen below the top buttons at ${width}px: ${box}`)
      assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), `Overflow in the flight at ${width}px`)
      await screenshot(`note-${width}`)
      await click('#open-map')
      await fly(0.2)
      assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')) && await evaluate('(() => { const d = document.querySelector("#world-map"); const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && d.scrollWidth <= d.clientWidth })()'), `Worlds is wider than the screen at ${width}px`)
      const smallest = await evaluate('Math.min(...[...document.querySelectorAll("#world-map button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
      assert(smallest >= 44, `A Worlds button is smaller than 44 px at ${width}px: ${smallest}`)
      const names = await evaluate('[...document.querySelectorAll(".moon-shape strong")].every(name => name.scrollWidth <= name.clientWidth + 1)')
      assert(names, `A shape name is cut at ${width}px`)
      await evaluate('document.querySelector(".moon-diary-book").scrollIntoView({ block: "center" })')
      await screenshot(`worlds-${width}`)
      await click('#close-map')
    }

    assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
    console.log(`Verified the Moon shapes diary: no shape with the Moon out of the view, behind the thick air of the horizon (veil ${low.toFixed(2)}), below the clouds or in an eclipse; the look time; the five shapes with their notes by day and by night; the wait for the sticker note; the saved diary and a broken value; the diary in Worlds (flight waits); Reset sticker book; reduced motion; and the 390/320 px phone layouts. No browser errors.`)
  }
} finally {
  ws?.close(); browser.kill()
}
