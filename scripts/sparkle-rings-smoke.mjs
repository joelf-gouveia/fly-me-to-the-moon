// Checks the sparkle rings in the real game: the ring lines on Earth, Blossom Haven and the Moon,
// a pass that takes a ring (the burst, the two-note chime and the longer trail), the number of a ring
// and the count after a ring that she flew past, the place of the number, a pause and a menu while it
// shows, a shape line (the shape of each ring, and its picture and name at the pass), a pass at boost
// speed, the return of a taken ring after 30 s, the rings that move with Blossom Haven, a new line
// after a new Earth landscape, the rings at night and in the rain, reduced motion, and the phone
// layout. Screenshots go to artifacts.local/sparkle-rings/.
// Run against the dev server on port 5174:
//   node scripts/sparkle-rings-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
// Optional second argument: the dev server origin, for example a server without file watching.
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'rings-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a ring error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      clearTimeout(handler?.timer)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 180000)
    pending.set(key, { resolve, reject, timer })
    ws.send(JSON.stringify({ id: key, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const snapshot = () => evaluate('__fairyTest.snapshot()')
  const rings = async () => (await snapshot()).rings
  const ringsOf = (state, name) => state.worlds.find(item => item.world === name)
  const started = Date.now(), step = text => process.stderr.write(`· ${text} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable')
  // Control the time of the game. `draw: false` skips the draw calls, for long waits on a software GPU.
  // Each new oscillator counts: the ambience makes three, and each chime makes one for each note.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.oscillators = 0;
    const createOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { window.oscillators++; return createOscillator.call(this); };
    window.advanceFlight = (seconds, fps = 60, draw = true) => {
      window.testTime ??= performance.now();
      const gl = document.querySelector('canvas').getContext('webgl2');
      const saved = ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced'].map(name => [name, gl[name]]);
      if (!draw) saved.forEach(([name]) => { gl[name] = () => {}; });
      try {
        for (let i = 0; i < Math.ceil(seconds * fps); i++) { window.testTime += 1000 / fps; window.testFrame(window.testTime); }
      } finally { saved.forEach(([name, fn]) => { gl[name] = fn; }); }
      window.testTime += 1000 / fps; window.testFrame(window.testTime);
    };
  ` })
  async function load(mobile, query = '') {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
    // A small window keeps software rendering fast enough.
    } else await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: `${origin}/?test${query}` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.testFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")')) break
      await delay(250)
    }
    assert(await evaluate('!!window.__fairyTest'), `The game did not start: ${JSON.stringify(errors).slice(0, 1500)}`)
    // No animals: a hello of an animal near a ring adds two notes to the chime of the ring, and the animals
    // that move change the draw calls between two frames. The animals have their own checks.
    await evaluate('__fairyTest.wildlifeOn(false)')
  }
  await mkdir('artifacts.local/sparkle-rings', { recursive: true })
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/sparkle-rings/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const key = async (type, code, key) => send('Input.dispatchKeyEvent', { type, code, key })
  /** The number or the shape that the game shows at a pass, and its place on the screen. */
  const shown = () => evaluate(`(() => {
    const box = document.querySelector("#ring-count"), rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }
    return {
      text: box.querySelector("b").textContent, dots: box.querySelectorAll("i").length, shown: box.classList.contains("is-visible"), shape: box.classList.contains("is-shape"),
      picture: getComputedStyle(box.querySelector("svg")).display !== "none" && box.querySelector("polygon").getAttribute("points").split(" ").length,
      pop: getComputedStyle(box).animationName, box: rect(box), worlds: rect(document.querySelector("#open-map")), speed: rect(document.querySelector(".flight-panel")), width: innerWidth, height: innerHeight,
    }
  })()`)
  const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
  /** The number is in the screen, and it does not cover the Worlds button, the speed panel or the fairy in the middle. */
  const placed = (state, text) => {
    const fairy = { left: state.width / 2 - state.height * 0.15, right: state.width / 2 + state.height * 0.15, top: state.height * 0.48, bottom: state.height * 0.9 }
    assert(state.box.left >= 0 && state.box.top >= 0 && state.box.right <= state.width && state.box.bottom <= state.height, `${text}: the number is not in the screen: ${JSON.stringify(state)}`)
    assert(apart(state.box, state.worlds) && apart(state.box, state.speed) && apart(state.box, fairy), `${text}: the number covers the Worlds button, the speed panel or the fairy: ${JSON.stringify(state)}`)
  }
  /**
   * Turns a world until the Sun is at its highest (or at its lowest) over ring `index`, and puts the fairy
   * `distance` m before that ring. Use the first ring of a line: she then starts next to no other ring.
   */
  async function sunAt(kind, index, highest, distance = 16) {
    const turn = { earth: 240, fairy: 300 }[kind] / 24, light = []
    for (let i = 0; i < 24; i++) {
      await evaluate(`__fairyTest.spin(${turn}); __fairyTest.aimRing("${kind}", ${index}, ${distance})`); await evaluate('advanceFlight(0.05)')
      light.push((await snapshot()).daylight.elevation)
    }
    const best = light.indexOf(highest ? Math.max(...light) : Math.min(...light))
    await evaluate(`__fairyTest.spin(${turn * (best + 1)}); __fairyTest.aimRing("${kind}", ${index}, ${distance})`); await evaluate('advanceFlight(0.3)')
    return (await snapshot()).daylight
  }
  /** The first ring of line `line` of a world. */
  const lineStart = (state, name, line) => ringsOf(state, name).lineStarts[line]
  /** Fly through ring `index` of a world from `distance` m before it, to 1 m after it. Returns the state after the pass. */
  async function pass(kind, index, distance = 8, speed = 11) {
    const aimed = await evaluate(`__fairyTest.aimRing(${JSON.stringify(kind)}, ${index}, ${distance}, ${speed})`)
    assert(aimed, `No ring ${index} on ${kind}`)
    await evaluate(`advanceFlight(${(distance + 1) / speed})`)
    return { aimed, state: await snapshot() }
  }

  step('desktop'); await load(false)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  let state = await rings()
  const earth = ringsOf(state, 'Earth'), haven = ringsOf(state, 'Blossom Haven'), moon = ringsOf(state, 'Moon')
  assert(earth.lines === 5 && earth.count >= 25 && earth.count <= 35, `Earth rings: ${JSON.stringify(earth)}`)
  assert(haven.lines === 3 && haven.count >= 15 && moon.lines === 3 && moon.count >= 15, `Blossom Haven or Moon rings: ${JSON.stringify(state.worlds)}`)
  assert(state.worlds.length === 3 && state.worlds.every(item => item.taken.length === 0), `Rings on other worlds, or taken at the start: ${JSON.stringify(state.worlds)}`)
  assert(state.worlds.map(item => item.world).join() === 'Earth,Moon,Blossom Haven' && state.worlds.every(item => item.inGroup), `The rings are not in the world groups: ${JSON.stringify(state.worlds)}`)
  // Each ring shows a number from 1 to the length of its line.
  assert(state.worlds.every(item => item.dotsInGroup && item.numbers.length === item.count && item.numbers.every(number => number >= 1 && number <= 7)), `The rings have no numbers: ${JSON.stringify(state.worlds.map(item => item.numbers))}`)
  // The shape lines: the second and the fourth line of Earth, and the second line of Blossom Haven and of the Moon.
  for (const item of state.worlds) {
    const lineOf = index => item.lineStarts.filter(start => start <= index).length - 1
    assert(item.shapes.every((shape, index) => (lineOf(index) % 2 === 1) === (shape !== null)), `The shape lines of ${item.world} are not the second and the fourth line: ${JSON.stringify(item.shapes)}`)
    assert(['circle', 'triangle', 'square', 'star', 'heart'].every(shape => item.shapes.includes(shape)), `${item.world} does not have each shape: ${JSON.stringify(item.shapes)}`)
  }
  await screenshot('start')
  await evaluate('__fairyTest.aimRing("earth", 0, 16)'); await evaluate('advanceFlight(0.2)')
  await screenshot('earth-rings')

  step('sound on')
  await evaluate('document.querySelector("#settings-toggle").click()')
  const box = await evaluate('(() => { const r = document.querySelector("#setting-sound + i").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()')
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  for (let i = 0; i < 20 && !(await snapshot()).sound; i++) await delay(100)
  await evaluate('document.querySelector("#close-settings").click()')
  assert((await snapshot()).sound, 'The sound did not start')

  step('a pass on Earth')
  const before = await evaluate('window.oscillators')
  await pass('earth', 1, 8)
  state = await rings()
  assert(ringsOf(state, 'Earth').taken.join() === '1', `The pass did not take ring 1: ${JSON.stringify(ringsOf(state, 'Earth'))}`)
  // The count: the fairy started next to ring 1, so it is number 1, and the next ring of the line shows 2.
  const counted = await shown()
  assert(counted.text === '1' && counted.dots === 1 && counted.shown && !counted.shape && !counted.picture, `The ring did not show the number 1: ${JSON.stringify(counted)}`)
  placed(counted, 'A number')
  assert(ringsOf(state, 'Earth').numbers[1] === 0 && ringsOf(state, 'Earth').numbers[2] === 2, `The next ring does not show 2: ${ringsOf(state, 'Earth').numbers.slice(0, 7)}`)
  const chime = await evaluate('window.oscillators') - before
  assert(chime === 2, `The ring did not play a two-note chime: ${chime} new oscillators`)
  assert(state.bursts > 0 && state.bursts <= state.burstSize && state.sparkle === 1 && state.trailBonus === 1, `No burst or no bright trail: ${JSON.stringify(state)}`)
  // The number fades in with the clock of the browser, not with the clock of the test.
  await delay(450)
  await screenshot('earth-burst')
  // Hover, so the fairy does not fly on through the next ring of the line.
  await evaluate('document.querySelector("#hover-toggle").click()')
  await evaluate('advanceFlight(1.2)')
  state = await rings()
  assert(state.trailBonus === 1, `The trail is not stronger after a ring: ${state.trailBonus}`)
  await evaluate('advanceFlight(3.2)')
  state = await rings()
  assert(state.sparkle === 0 && state.trailBonus === 0 && state.bursts === 0, `The stronger trail did not end after 4 s: ${JSON.stringify(state)}`)

  step('the return after 30 s')
  await evaluate('advanceFlight(23, 60, false)')
  assert(ringsOf(await rings(), 'Earth').taken.join() === '1', 'The ring came back before 30 s')
  await evaluate('advanceFlight(3, 60, false)')
  assert(ringsOf(await rings(), 'Earth').taken.length === 0, 'The ring did not come back after 30 s')
  assert(!(await evaluate('document.querySelector("#ring-count").classList.contains("is-visible")')), 'The number of the ring did not go away')
  // 8 m before ring 1: two rings are 12 m or more apart, so this start is after ring 0 and takes no ring.
  await evaluate('__fairyTest.aimRing("earth", 1, 8)'); await evaluate('advanceFlight(0.3)')
  await screenshot('earth-ring-back')

  step('the count after a ring that she flew past')
  // The third line of Earth is a count line, and no ring of it is taken yet.
  const third = lineStart(await rings(), 'Earth', 2)
  await pass('earth', third)
  assert((await shown()).text === '1', 'The first ring of the third line is not 1')
  // She starts again 8 m before the ring after the next ring: she did not take the ring between them.
  await pass('earth', third + 2)
  let count = await shown()
  state = await rings()
  assert(count.text === '2' && count.dots === 2, `The second ring that she took is not 2: ${JSON.stringify(count)}`)
  assert(ringsOf(state, 'Earth').numbers.slice(third, third + 4).join() === '0,3,0,3', `The rings do not count on from 2: ${ringsOf(state, 'Earth').numbers.slice(third, third + 4)}`)

  step('a pause and a menu while the number shows')
  await evaluate('document.querySelector("#pause-toggle").click()')
  // 2 s of the clock of the browser, with frames: the flight stands still, and the number stays.
  for (let i = 0; i < 8; i++) { await delay(250); await evaluate('advanceFlight(0.25)') }
  count = await shown()
  assert((await snapshot()).paused && count.shown && count.text === '2', `The number went away in a pause: ${JSON.stringify(count)}`)
  await screenshot('pause-number')
  await evaluate('document.querySelector("#pause-toggle").click()')
  await evaluate('advanceFlight(0.5)')
  assert((await shown()).shown, 'The number went away 0.5 s after the pause')
  // Worlds opens over the flight: the number goes away at once.
  await evaluate('document.querySelector("#open-map").click()'); await evaluate('advanceFlight(0.2)')
  assert((await snapshot()).mapOpen && !(await shown()).shown, 'The number stays behind Worlds')
  await evaluate('document.querySelector("#close-map").click()'); await evaluate('advanceFlight(0.2)')
  assert(!(await snapshot()).mapOpen && !(await shown()).shown, 'The number came back after Worlds')

  step('a shape line on Earth')
  const shapes = ringsOf(await rings(), 'Earth').shapes, second = lineStart(await rings(), 'Earth', 1)
  assert(shapes.slice(second, second + 5).join() === 'circle,triangle,square,star,heart', `The second line of Earth does not have the five shapes in order: ${shapes.slice(second, second + 7)}`)
  await evaluate(`__fairyTest.aimRing("earth", ${second}, 16)`); await evaluate('advanceFlight(0.2)')
  await screenshot('earth-shape-line')
  for (const [offset, name] of [[1, 'Triangle'], [2, 'Square'], [3, 'Star'], [4, 'Heart']]) {
    // 12 m before the ring: the picture shows the whole shape and its plate.
    await evaluate(`__fairyTest.aimRing("earth", ${second + offset}, 12)`); await evaluate('advanceFlight(0.2)')
    await screenshot(`earth-shape-${name.toLowerCase()}`)
    const sounds = await evaluate('window.oscillators')
    await pass('earth', second + offset)
    count = await shown()
    state = await rings()
    assert(ringsOf(state, 'Earth').taken.includes(second + offset), `The pass did not take the ${name} ring`)
    assert(count.shown && count.shape && count.text === name && count.dots === 0 && count.picture >= 3, `The ${name} ring did not show its picture and its name: ${JSON.stringify(count)}`)
    placed(count, name)
    const notes = await evaluate('window.oscillators') - sounds
    assert(notes === 2, `The ${name} ring did not play two notes: ${notes} new oscillators, hellos ${JSON.stringify(await evaluate('window.__fairyTest.snapshot().friend ?? null'))}`)
    if (name === 'Triangle' || name === 'Heart') { await delay(450); await screenshot(`earth-shape-pass-${name.toLowerCase()}`) }
  }
  // The circle is the last shape of the line that she takes: the two notes of the circle, and the high C of a full line.
  const last = await evaluate('window.oscillators')
  await pass('earth', second)
  count = await shown()
  assert(count.text === 'Circle' && count.shape, `The circle ring did not show its name: ${JSON.stringify(count)}`)
  if (ringsOf(await rings(), 'Earth').lineStarts[2] - second === 5) assert(await evaluate('window.oscillators') - last === 3, 'The last shape of the line did not add the high C')
  // A count ring after a shape ring shows a number again, with no picture.
  await pass('earth', third + 3)
  count = await shown()
  assert(!count.shape && !count.picture && /^[1-7]$/.test(count.text) && count.dots === Number(count.text), `A count ring after a shape ring: ${JSON.stringify(count)}`)

  step('the number in a low window and in a narrow window')
  for (const [width, height] of [[1280, 480], [640, 720]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await evaluate('advanceFlight(0.1)')
    // The fourth line of Earth is a shape line, and no ring of it is taken yet. It starts at the triangle.
    await pass('earth', lineStart(await rings(), 'Earth', 3) + (width > 1000 ? 0 : 1))
    count = await shown()
    assert(count.shown && count.shape, `No shape in the window of ${width} by ${height}: ${JSON.stringify(count)}`)
    placed(count, `A window of ${width} by ${height}`)
    await delay(450); await screenshot(`window-${width}x${height}`)
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false })
  await evaluate('advanceFlight(0.1)')

  step('a pass at boost speed, 20 frames a second')
  await key('keyDown', 'ShiftLeft', 'Shift')
  // The first ring of the fifth line: no ring of this line is taken yet.
  const boostRing = ringsOf(await rings(), 'Earth').lineStarts[4]
  await evaluate(`__fairyTest.aimRing("earth", ${boostRing}, 12, 26)`)
  await evaluate('advanceFlight(0.6, 20)')
  state = await snapshot()
  await key('keyUp', 'ShiftLeft', 'Shift')
  assert(state.boosted && ringsOf(state.rings, 'Earth').taken.includes(boostRing), `The boost pass did not take ring ${boostRing}: ${JSON.stringify(ringsOf(state.rings, 'Earth'))}`)

  step('Blossom Haven')
  await evaluate('__fairyTest.aimRing("fairy", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('haven-rings')
  let result = await pass('fairy', 1)
  assert(ringsOf(result.state.rings, 'Blossom Haven').taken.join() === '1', `The pass did not take a Haven ring: ${JSON.stringify(ringsOf(result.state.rings, 'Blossom Haven'))}`)
  // The shape line of Blossom Haven: the star, against the pink sky.
  const havenShapes = lineStart(await rings(), 'Blossom Haven', 1)
  await evaluate(`__fairyTest.aimRing("fairy", ${havenShapes}, 16)`); await evaluate('advanceFlight(0.3)')
  await screenshot('haven-shape-line')
  await pass('fairy', havenShapes + 3)
  count = await shown()
  assert(count.shape && count.text === 'Star', `The star ring of Blossom Haven: ${JSON.stringify(count)}`)
  await delay(450); await screenshot('haven-shape-pass')
  // The middle of the day of Blossom Haven: the plates and the shapes against the pink sky. This
  // comes before the hop, because a small home after the hop can have no rings.
  let sky = await sunAt('fairy', 0, true)
  assert(sky.elevation > 0, `No day on Blossom Haven: ${JSON.stringify(sky)}`)
  await screenshot('haven-day-rings')
  await sunAt('fairy', havenShapes, true)
  await screenshot('haven-day-shape-line')

  // Two minutes of active play move Blossom Haven. The hovering fairy and the rings move with it.
  await evaluate('document.querySelector("#hover-toggle").click()')
  const { home, radius } = await snapshot()
  const centre = (await evaluate('__fairyTest.aimRing("fairy", 2, 8)')).centre
  await evaluate('document.querySelector("#hover-toggle").click()')
  for (let i = 0; i < 12 && (await snapshot()).moves === 0; i++) await evaluate('advanceFlight(30, 60, false)')
  state = await snapshot()
  assert(state.moves === 1, `Blossom Haven did not move: ${state.moves}`)
  // A small home has fewer rings after the hop, or none: the home of the size of Ceres (radius
  // 32.5 m) has no ring line. The check takes ring 2, or the last ring.
  const after = ringsOf(await rings(), 'Blossom Haven')
  if (after.count === 0) {
    assert(state.radius < 60, `Blossom Haven has no rings after the hop, at the radius ${state.radius}`)
    step(`no rings on Blossom Haven at the radius ${state.radius}: the move of the rings is not checked`)
  } else {
    const index = Math.min(2, after.count - 1)
    const moved = (await evaluate(`__fairyTest.aimRing("fairy", ${index}, 8)`)).centre
    const shift = state.home.map((value, i) => value - home[i]), ringShift = moved.map((value, i) => value - centre[i])
    // The world also turns, and a hop can give it a new size (the wandering home study): the rings
    // then come again for the new size. A ring stays on the world: 9 to 11 m over the ground, which
    // is up to 8 m over or 1.3 m under the radius (src/terrain.ts), before and after the hop.
    const fromHome = (point, at) => Math.hypot(...point.map((value, i) => value - at[i]))
    const over = [fromHome(centre, home) - radius, fromHome(moved, state.home) - state.radius]
    assert(Math.hypot(...shift) > 1000 && Math.hypot(...ringShift) > 1000 && over.every(height => height > 5 && height < 22), `The rings did not move with Blossom Haven: ${JSON.stringify({ shift, ringShift, over, radius: [radius, state.radius] })}`)
    await evaluate('advanceFlight(1)')
    assert(ringsOf(await rings(), 'Blossom Haven').taken.includes(index), 'No pass after the move of Blossom Haven')
    await screenshot('haven-after-move')
  }

  step('the Moon')
  await evaluate('__fairyTest.aimRing("moon", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('moon-rings')
  result = await pass('moon', 1)
  assert(ringsOf(result.state.rings, 'Moon').taken.join() === '1', `The pass did not take a Moon ring: ${JSON.stringify(ringsOf(result.state.rings, 'Moon'))}`)
  const moonShapes = lineStart(await rings(), 'Moon', 1)
  await evaluate(`__fairyTest.aimRing("moon", ${moonShapes}, 16)`); await evaluate('advanceFlight(0.3)')
  await screenshot('moon-shape-line')
  await pass('moon', moonShapes + 2)
  count = await shown()
  assert(count.shape && count.text === 'Square', `The square ring of the Moon: ${JSON.stringify(count)}`)
  // The rings of Earth, seen from the Moon: each ring keeps a number or a shape, and no ring is taken by a fairy on the Moon.
  const far = ringsOf(await rings(), 'Earth')
  assert(far.numbers.every((number, index) => far.taken.includes(index) ? number === 0 : number >= 1 && number <= 7), `The numbers of Earth from the Moon: ${far.numbers}`)

  step('a new Earth landscape')
  const oldEarth = ringsOf(await rings(), 'Earth')
  await evaluate('document.querySelector("#open-map").click(); document.querySelector("[data-world=earth]").click(); document.querySelector("#world-fly").click()')
  let renewed = false
  for (let i = 0; i < 60 && !renewed; i++) {
    await evaluate('advanceFlight(1, 60, false)')
    renewed = (await snapshot()).earthVisit > 1
  }
  assert(renewed, 'No new Earth landscape')
  const newEarth = ringsOf(await rings(), 'Earth')
  assert(newEarth.seed !== oldEarth.seed && JSON.stringify(newEarth.first) !== JSON.stringify(oldEarth.first) && newEarth.taken.length === 0, `No new rings for the new Earth: ${JSON.stringify({ oldEarth, newEarth })}`)
  assert(newEarth.lines >= 3 && newEarth.count >= 15, `Too few rings on the new Earth: ${JSON.stringify(newEarth)}`)
  result = await pass('earth', 0)
  assert(ringsOf(result.state.rings, 'Earth').taken.join() === '0', `No pass on the new Earth: ${JSON.stringify(ringsOf(result.state.rings, 'Earth'))}`)
  await evaluate('__fairyTest.aimRing("earth", 2, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('new-earth-rings')
  // The new Earth has its shape line after its first line, and a pass there gives a shape.
  const newShapes = lineStart(await rings(), 'Earth', 1)
  assert(newEarth.shapes[newShapes] === 'circle' && newEarth.shapes[newShapes - 1] === null, `No shape line on the new Earth: ${JSON.stringify(newEarth.shapes)}`)
  await pass('earth', newShapes + 1)
  assert((await shown()).text === 'Triangle', 'No triangle on the new Earth')

  step('the night')
  // The third line of the new Earth is a count line with no ring taken. The middle of the night there, then at the fourth line, a shape line.
  sky = await sunAt('earth', lineStart(await rings(), 'Earth', 2), false)
  assert(sky.elevation < 0 && sky.day < 0.05, `No night on Earth: ${JSON.stringify(sky)}`)
  await screenshot('night-rings')
  sky = await sunAt('earth', lineStart(await rings(), 'Earth', 3), false)
  assert(sky.elevation < 0, `No night at the shape line: ${JSON.stringify(sky)}`)
  await screenshot('night-shape-line')

  step('the rain, with reduced motion')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await load(false, '&weather=rain')
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(4)')
  state = await snapshot()
  assert(state.weather.kind === 'rain' && state.weather.rainLines, `No rain: ${JSON.stringify(state.weather)}`)
  await evaluate('__fairyTest.aimRing("earth", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('rain-rings')
  await evaluate(`__fairyTest.aimRing("earth", ${lineStart(state.rings, 'Earth', 1)}, 16)`); await evaluate('advanceFlight(0.3)')
  await screenshot('rain-shape-line')
  // Reduced motion: the number shows with no bounce, and the rings do not pulse.
  await pass('earth', 0)
  count = await shown()
  assert(count.shown && count.text === '1' && count.pop === 'none', `Reduced motion: the number bounces, or does not show: ${JSON.stringify(count)}`)
  await pass('earth', lineStart(state.rings, 'Earth', 1) + 3)
  count = await shown()
  assert(count.shown && count.text === 'Star' && count.pop === 'none', `Reduced motion: the shape bounces, or does not show: ${JSON.stringify(count)}`)
  await send('Emulation.setEmulatedMedia', { features: [] })

  step('phone'); await load(true)
  await evaluate('document.querySelector("#begin-button").click()')
  await evaluate('advanceFlight(1)')
  state = await snapshot()
  assert(state.graphics.mobile && state.rings.burstSize === 24 && ringsOf(state.rings, 'Earth').lines === 5, `Phone rings: ${JSON.stringify(state.rings)}`)
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px')
  await evaluate('__fairyTest.aimRing("earth", 0, 16)'); await evaluate('advanceFlight(0.3)')
  await screenshot('phone-rings-390')
  result = await pass('earth', 0)
  assert(ringsOf((await rings()), 'Earth').taken.join() === '0', 'No pass on the phone')
  // The welcome card and the number fade with the clock of the browser.
  await delay(900); await evaluate('advanceFlight(0.05)')
  await screenshot('phone-burst-390')
  const phone = await shown()
  // The draw calls at the first line, where she starts.
  const startCalls = (await snapshot()).graphics.calls
  const menu = await evaluate('(() => { const r = document.querySelector("#open-map").getBoundingClientRect(); return r.bottom })()')
  assert(phone.shown && phone.text === '1' && phone.box.left >= 0 && phone.box.right <= 390 && phone.box.top > menu, `The number on the phone: ${JSON.stringify(phone)}`)
  const phoneShapes = lineStart(await rings(), 'Earth', 1)
  await evaluate(`__fairyTest.aimRing("earth", ${phoneShapes}, 16)`); await evaluate('advanceFlight(0.3)')
  await screenshot('phone-shape-line-390')
  // The draw calls with a shape line in view. The rings of a world take three of them: the frames, the glow and the
  // plates. A shape line adds no draw call.
  // Other things in the view (rain, clouds, a burst) can come or go between two frames, so the
  // count is the middle value of five pairs of frames.
  const show = visible => evaluate(`__fairyTest.world("earth").group.children.filter(child => ["sparkle-rings", "sparkle-ring-glow", "sparkle-ring-dots"].includes(child.name)).forEach(child => { child.visible = ${visible} })`)
  const pairs = []
  for (let k = 0; k < 5; k++) {
    await evaluate('advanceFlight(0.02)')
    const calls = (await snapshot()).graphics.calls
    await show(false); await evaluate('advanceFlight(0.02)')
    pairs.push(calls - (await snapshot()).graphics.calls)
    await show(true)
  }
  await evaluate('advanceFlight(0.02)')
  const calls = (await snapshot()).graphics.calls
  const ringCalls = pairs.sort((x, y) => x - y)[2]
  assert(ringCalls >= 1 && ringCalls <= 3, `The rings of Earth take ${ringCalls} draw calls (pairs ${pairs})`)
  await pass('earth', phoneShapes + 4)
  count = await shown()
  assert(count.shape && count.text === 'Heart' && count.box.left >= 0 && count.box.right <= 390 && count.box.top > menu, `The heart on the phone: ${JSON.stringify(count)}`)
  await delay(450); await screenshot('phone-shape-pass-390')
  assert(!(await evaluate('document.documentElement.scrollWidth > innerWidth')), 'Overflow at 390px with a shape')

  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log(`Verified sparkle rings: Earth ${earth.count} rings in ${earth.lines} lines, Blossom Haven ${haven.count} in ${haven.lines}, the Moon ${moon.count} in ${moon.lines}; a pass with a two-note chime, a burst and a stronger trail for 4 s; the number of a ring, and the count 1 and 2 after a ring that she flew past; the number in a pause and behind Worlds; a shape line on each world with the picture and the name of each shape; the place of the number in three windows; the return after 30 s; a pass at boost speed at 20 frames a second; the rings carried with Blossom Haven; new rings for a new Earth (seed ${oldEarth.seed} → ${newEarth.seed}, ${newEarth.count} rings); the rings at night and in the rain; reduced motion; the 390 px phone layout with ${startCalls} draw calls at the first line and ${calls} at a shape line, ${ringCalls} of them for the rings. No browser errors.`)
} finally {
  ws?.close(); browser.kill()
}
