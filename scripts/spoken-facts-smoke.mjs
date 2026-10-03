// Checks the spoken facts (F2) in the real game, with the Moon sticker. With the sound off,
// a new sticker gives no voice and the note looks as before. With the sound on, the voice says
// the hello line after the chime, the speaker mark moves, and the words light up in turn. The
// voice stops at the end of the line, at a pause, when the page hides and when the sound goes
// off. The game has one audio element for the voice, so two lines never play together. Last,
// the note at the width of a phone. Run against the dev server on port 5174:
//   node scripts/spoken-facts-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'spoken-facts-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a voice error.
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
  // The frame clock is in the hands of the test. Each play() of an audio element is recorded:
  // the voice plays a line with sound; the tap on the Sound switch plays one muted.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.advanceFlight = seconds => {
      window.testTime ??= performance.now();
      for (let i = 0; i < Math.ceil(seconds * 60); i++) { window.testTime += 1000 / 60; window.testFrame(window.testTime); }
    };
    window.voicePlays = []; window.voiceElements = new Set();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.voiceElements.add(this); window.voiceElement = this;
      // A slow line gives the slow software renderer time to see each word.
      // A new source puts the rate back to the default rate, so the test sets the two.
      this.defaultPlaybackRate = this.playbackRate = window.voiceRate ?? 1;
      if (!this.muted) window.voicePlays.push(this.src.replace(location.origin, ''));
      return play.call(this);
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
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#open-map")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load. Errors: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  await mkdir('artifacts.local/spoken-facts', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/spoken-facts/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  // The stubbed frame clock holds CSS animations at their start, so the screenshot skips the entry animation.
  const settleNote = () => evaluate('document.querySelector("#sticker-toast").style.animation = "none"')

  /** A real tap: the browser starts sound only after a user action. */
  async function tap(selector) {
    const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  }
  async function setSound(on) {
    // On a touch screen, Settings is in Menu.
    if (await evaluate('document.querySelector(".game-shell").classList.contains("touch-ui")')) await click('#menu-toggle')
    await click('#settings-toggle')
    if ((await evaluate('document.querySelector("#setting-sound").checked')) !== on) await tap('#setting-sound + i')
    for (let i = 0; i < 20 && (await snapshot()).sound !== on; i++) await delay(100)
    assert((await snapshot()).sound === on, `The Sound switch does not turn the sound ${on ? 'on' : 'off'}`)
    await click('#close-settings')
  }
  async function resetBook() {
    await click('#settings-toggle'); await click('#reset-stickers'); await click('#reset-yes'); await click('#close-settings')
    assert((await snapshot()).stickers.length === 0, 'The reset keeps stickers')
  }
  /** "Fly there" in Worlds, until the world gives its sticker. */
  async function flyTo(world) {
    step(`Fly there: ${world}`)
    await click('#open-map')
    await evaluate('advanceFlight(0.1)')
    await click(`[data-world="${world}"]`)
    await click('#world-fly')
    let state = await snapshot()
    assert(!state.mapOpen && state.destination, `"Fly there" does not start the flight to ${world}: ${state.destination}`)
    for (let tick = 0; tick < 400 && !state.stickers.includes(world); tick++) {
      await evaluate('advanceFlight(0.5)')
      state = await snapshot()
    }
    assert(state.stickers.includes(world), `The flight does not earn the ${world} sticker: ${state.stickers}`)
    return state
  }
  /**
   * A new Moon sticker: a reset of the book, a flight toward Earth until Earth is the nearest
   * world, and "Fly there" back to the Moon. After a reset, the world where the fairy is gives
   * no sticker until she leaves it, and Worlds has no "Fly there" for the nearest world.
   */
  async function moonAgain() {
    await resetBook()
    step('toward Earth')
    await click('#open-map')
    await evaluate('advanceFlight(0.1)')
    await click('[data-world="earth"]')
    await click('#world-fly')
    let state = await snapshot()
    for (let tick = 0; tick < 200 && state.belt.nearest !== 'Earth'; tick++) {
      await evaluate('advanceFlight(0.25)')
      state = await snapshot()
    }
    assert(state.belt.nearest === 'Earth' && !state.stickers.length, `The fairy does not leave the Moon: ${state.belt.nearest}, ${state.stickers}`)
    return flyTo('moon')
  }
  /** Runs frames in real time until the voice lights a word, for the speaker and the words. */
  async function untilWord() {
    for (let i = 0; i < 80; i++) {
      await evaluate('advanceFlight(0.05)')
      if (await evaluate('!!document.querySelector("#sticker-toast .sticker-word.is-now")')) return
      await delay(50)
    }
    throw new Error(`No word lights up: ${JSON.stringify(await reading())}`)
  }
  const reading = () => evaluate(`(() => {
    const toast = document.querySelector('#sticker-toast'), speaker = document.querySelector('.sticker-voice'), player = window.voiceElement
    return {
      shown: !toast.hidden, speaking: toast.classList.contains('is-speaking'), speaker: !speaker.hidden, talking: speaker.classList.contains('is-talking'),
      now: [...toast.querySelectorAll('.sticker-word.is-now')].map(word => word.textContent).join(' '),
      later: toast.querySelectorAll('.sticker-word.is-later').length,
      player: player ? { src: player.src.replace(location.origin, ''), paused: player.paused, time: player.currentTime, duration: player.duration } : null,
      plays: [...window.voicePlays], elements: window.voiceElements.size,
    }
  })()`)

  step('desktop, sound off')
  await load(false)
  await evaluate('localStorage.clear()')
  await load(false)
  await click('#begin-button')
  await evaluate('advanceFlight(1)')
  let state = await flyTo('moon')
  await delay(900); await evaluate('advanceFlight(0.1)')
  let voice = await reading()
  state = await snapshot()
  assert(!state.sound && state.voice === null && voice.plays.length === 0, `A voice speaks with the sound off: ${JSON.stringify({ voice: state.voice, plays: voice.plays })}`)
  assert(voice.shown && !voice.speaking && !voice.speaker && voice.later === 0 && !voice.now, `The note differs with the sound off: ${JSON.stringify(voice)}`)
  assert((await text('#sticker-toast h2')) === 'Moon' && (await text('#sticker-toast .sticker-toast-fact')) === 'The Moon goes around Earth. People have walked on it!', 'Wrong words in the Moon note')
  await settleNote()
  await screenshot('sound-off')

  step('sound on: the voice and the words')
  await setSound(true)
  await evaluate('window.voiceRate = 0.2')
  state = await moonAgain()
  // The voice waits for the chime, then says the line.
  assert(state.voice === 'hello-moon', `No voice for the Moon sticker: ${state.voice}`)
  voice = await reading()
  assert(voice.speaking && voice.speaker && voice.later > 0, `The note does not show the voice: ${JSON.stringify(voice)}`)
  await untilWord()
  voice = await reading()
  assert(voice.plays.join() === '/voice/en/af_heart/hello-moon.mp3' && !voice.player.paused && voice.talking, `The Moon line does not play: ${JSON.stringify(voice)}`)
  await settleNote()
  await screenshot('moon-voice')
  const lit = new Set([voice.now])
  let shotLater = false
  // The words light up in turn, until the end of the line. Then the note shows as usual.
  for (let i = 0; i < 400 && (await snapshot()).voice; i++) {
    await evaluate('advanceFlight(1 / 60)')
    const now = (await reading()).now
    if (now) lit.add(now)
    if (lit.size === 5 && !shotLater) { shotLater = true; await screenshot('moon-voice-later') }
  }
  // One more frame ends the reading in the note.
  await evaluate('advanceFlight(0.1)')
  voice = await reading()
  state = await snapshot()
  assert(state.voice === null && voice.player.paused && voice.player.time > 3, `The line does not end: ${JSON.stringify({ voice: state.voice, player: voice.player })}`)
  assert(lit.size >= 5 && lit.has('Moon'), `Too few words light up: ${[...lit]}`)
  assert(voice.shown && !voice.speaking && !voice.speaker && voice.later === 0 && !voice.now, `The note does not end the reading: ${JSON.stringify(voice)}`)
  await screenshot('moon-voice-end')

  step('pause')
  state = await moonAgain()
  assert(state.voice === 'hello-moon', `No voice for the second Moon sticker: ${state.voice}`)
  await untilWord()
  await click('#pause-toggle')
  await evaluate('advanceFlight(0.3)')
  voice = await reading()
  state = await snapshot()
  assert(state.paused && state.voice === null && voice.player.paused && !voice.speaking && !voice.speaker && voice.later === 0, `The pause does not stop the voice: ${JSON.stringify({ voice: state.voice, reading: voice })}`)
  await screenshot('paused')
  await click('#resume-flight')
  await delay(1000); await evaluate('advanceFlight(0.2)')
  assert((await snapshot()).voice === null && (await reading()).player.paused, 'The voice comes back after the pause')

  step('page hides')
  state = await moonAgain()
  assert(state.voice === 'hello-moon', `No voice for the third Moon sticker: ${state.voice}`)
  await untilWord()
  await evaluate('Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange"))')
  voice = await reading()
  state = await snapshot()
  assert(state.voice === null && voice.player.paused, `The hidden page does not stop the voice: ${JSON.stringify({ voice: state.voice, player: voice.player })}`)
  await evaluate('delete document.hidden; document.dispatchEvent(new Event("visibilitychange"))')
  await click('#resume-flight')
  await evaluate('advanceFlight(0.2)')
  assert(!(await reading()).speaking, 'The note still reads after the page hides')

  step('sound off while the voice speaks')
  state = await moonAgain()
  await untilWord()
  await setSound(false)
  await evaluate('advanceFlight(0.2)')
  voice = await reading()
  state = await snapshot()
  assert(state.voice === null && voice.player.paused && !voice.speaking, `The Sound switch does not stop the voice: ${JSON.stringify({ voice: state.voice, reading: voice })}`)

  // The same page at the width of a phone, with the touch layout.
  step('phone 390')
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await evaluate('advanceFlight(0.2)')
  assert(await evaluate('document.querySelector(".game-shell").classList.contains("touch-ui")'), 'No touch layout at 390 px')
  await setSound(true)
  // The phone picture has four times the pixels, so the line plays more slowly still.
  await evaluate('window.voiceRate = 0.1')
  state = await moonAgain()
  await untilWord()
  await settleNote()
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')
  const box = await evaluate('(() => { const r = document.querySelector("#sticker-toast").getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom } })()')
  assert(box.left >= 0 && box.right <= 390, `The note is wider than the screen: ${JSON.stringify(box)}`)
  await screenshot('moon-voice-390')
  voice = await reading()
  assert(voice.elements === 1, `The game has more than one audio element: ${voice.elements}`)
  assert(voice.plays.length === 5 && voice.plays.every(src => src === '/voice/en/af_heart/hello-moon.mp3'), `Wrong lines: ${voice.plays}`)

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified no voice with the sound off (the note as before), the Moon line after the chime with the speaker mark and ${lit.size} lit words to the end of the line, the stop at a pause, when the page hides and when the sound goes off, one audio element for ${voice.plays.length} lines, and the 390 px phone note. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
