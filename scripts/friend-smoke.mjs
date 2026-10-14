// Checks the fairy friend (F19) and its animal book in the real game: the first hello of a kind
// shows the note of its card with the hearts, the Animals page of Worlds shows the hearts before the
// gift, five hellos on Earth give the friend and its note, the friend is no creature of the world,
// the Animals page has a card for each met kind and a shadow for the others, "Fly with me" swaps the
// friend in the flight (the old one waves and flies home, the new one comes out of the sky), "No
// friend" sends the friend home, the tabs work with the keyboard, a reload keeps the friend, the
// friend stays near her in a climb from the meadow to open space and back, each of the nine kinds
// shows, a pegasus foal of Blossom Haven says hello, the reset in Settings removes the friend and the
// book, and phones of 390 px and 320 px show the page and the swap. The check also reads the draw
// calls with and without the friend, and in a swap. Run against the dev server:
//   node scripts/friend-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const profile = await mkdtemp(join(tmpdir(), 'friend-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  ...(process.env.FAIRY_SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const folder = 'artifacts.local/friend'
const KINDS = ['cow', 'rabbit', 'sheep', 'duck', 'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus']
const NAMES = { cow: 'Cow', rabbit: 'Rabbit', sheep: 'Sheep', duck: 'Duck', unicorn: 'Unicorn', dragonling: 'Dragonling', kitsune: 'Kitsune kit', frogPrince: 'Frog Prince', pegasus: 'Pegasus foal' }
// The friend is never farther than this from the fairy, in metres (FRIEND.limit in src/friend.ts).
const LIMIT = 4
// A swap takes 3 s of flight (SWAP in src/friend.ts); the checks wait a little longer. The happy loop of the new friend takes 1.6 s more.
const SWAP_TIME = 3.5, SETTLED = 5.2
let ws
try {
  let tabs
  for (let i = 0; i < 80; i++) {
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
  const advance = (seconds, drawAll = false) => evaluate(`advanceGame(${seconds}, ${drawAll})`)
  /** True when a picture shows a thing: it has many colours. */
  const painted = selector => evaluate(`(() => { const image = document.querySelector(${JSON.stringify(selector)}), canvas = document.createElement('canvas'); canvas.width = canvas.height = 48; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 48, 48); const data = context.getImageData(0, 0, 48, 48).data, colours = new Set(); for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 120) colours.add((data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | data[i + 2] >> 3); return colours.size })()`)
  /** The part of a picture that the thing covers, from 0 to 1: a shadow covers a part, and the rest is clear. */
  const covered = selector => evaluate(`(() => { const image = document.querySelector(${JSON.stringify(selector)}), canvas = document.createElement('canvas'); canvas.width = canvas.height = 48; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 48, 48); const data = context.getImageData(0, 0, 48, 48).data; let cover = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 20) cover++; return cover / (48 * 48) })()`)
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)
  const shown = selector => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); return Boolean(element && element.offsetParent && getComputedStyle(element).visibility === 'visible') })()`)
  const key = (code, down) => evaluate(`window.dispatchEvent(new KeyboardEvent(${JSON.stringify(down ? 'keydown' : 'keyup')}, { code: ${JSON.stringify(code)} }))`)
  /** A real key of the keyboard: Enter on a button clicks it, and Escape closes a dialog. */
  const press = async name => {
    const code = { Enter: 13, Escape: 27, Tab: 9, ArrowRight: 39, ArrowLeft: 37 }[name]
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code, ...(name === 'Enter' ? { text: '\r' } : {}) })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code })
  }
  const choose = kind => evaluate(`__fairyTest.chooseFriend(${JSON.stringify(kind)})`)
  const saved = () => evaluate('JSON.parse(localStorage.getItem("fairy-friend"))')
  const started = Date.now(), step = label => process.stderr.write(`· ${label} (${Math.round((Date.now() - started) / 1000)} s)\n`)
  await mkdir(folder, { recursive: true })
  const capture = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${folder}/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  await send('Runtime.enable'); await send('Page.enable')
  // Simulation time is in the hands of the check. Only the last frame of each step draws.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.requestAnimationFrame = callback => { window.gameFrame = callback; return 1; };
    window.advanceGame = (seconds, drawAll) => {
      window.testTime ??= performance.now();
      // A picture of a friend is a render in the frame of its hello, so the frames of a hello draw.
      if (drawAll) { for (let i = 0; i < Math.ceil(seconds * 60); i++) window.gameFrame(window.testTime += 1000 / 60); return; }
      const gl = document.querySelector('#scene canvas').getContext('webgl2');
      const draw = gl.drawElements, instances = gl.drawElementsInstanced, arrays = gl.drawArrays;
      try {
        gl.drawElements = () => {}; gl.drawElementsInstanced = () => {}; gl.drawArrays = () => {};
        for (let i = 0; i < Math.ceil(seconds * 60) - 1; i++) window.gameFrame(window.testTime += 1000 / 60);
      } finally { gl.drawElements = draw; gl.drawElementsInstanced = instances; gl.drawArrays = arrays; }
      window.gameFrame(window.testTime += 1000 / 60);
    };
  ` })
  async function load(mobile, query = '?test&weather=clear', width = 390, height = 844) {
    if (mobile) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
    } else {
      await send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
    }
    await send('Page.navigate', { url: `${origin}/${query}` })
    for (let i = 0; i < 160; i++) {
      if (await evaluate('!!window.gameFrame && !!window.__fairyTest && !!document.querySelector("#begin-button")').catch(() => false)) return
      await delay(250)
    }
    throw new Error(`The game did not load: ${JSON.stringify(errors).slice(0, 800)}`)
  }
  const population = (state, world) => state.wildlife.find(item => item.world === world)
  /** The local direction of the fairy on a world, for placeOver(). */
  const directionOn = kind => evaluate(`(() => { const world = __fairyTest.world(${JSON.stringify(kind)}); return world.group.position.clone().fromArray(__fairyTest.snapshot().fairy).sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert()).normalize().toArray() })()`)
  /** Puts the fairy `height` m over the place where she is, and makes her hover or fly. */
  async function over(kind, height, hover = true) {
    await evaluate(`__fairyTest.placeOver(${JSON.stringify(kind)}, ${JSON.stringify(await directionOn(kind))}, ${height})`)
    if ((await snapshot()).hoverHeld !== hover) await click('#hover-toggle')
  }
  /** True when the friend is in the picture: its middle is inside the view. */
  const inView = friend => Math.abs(friend.screen[0]) < 0.96 && Math.abs(friend.screen[1]) < 0.96 && friend.screen[2] < 1
  /** Selects a friend with the test hook, and waits for the end of the swap and of the happy loop. */
  async function swapTo(kind) {
    await choose(kind)
    await advance(SETTLED)
  }
  /** The draw calls of the view with the friend and with no friend: two renders of the same moment (renderer.info.render.calls). */
  async function drawCalls(kind) {
    await swapTo(kind)
    return evaluate('__fairyTest.friendCalls()')
  }
  /** Opens Worlds at its Animals tab, and waits for the pictures of the cards. They render one at a time. */
  async function openAnimals() {
    if (!(await evaluate('document.querySelector("#world-map").open'))) await click('#open-map')
    await click('#tab-animals')
    for (let i = 0; i < 100; i++) {
      if (await evaluate('[...document.querySelectorAll(".animal-card img")].every(image => image.getAttribute("src") && image.complete)')) return
      await delay(50)
    }
    throw new Error('The pictures of the cards did not render')
  }
  const cardLooks = () => evaluate('Object.fromEntries([...document.querySelectorAll(".animal-card")].map(card => [card.dataset.animal, card.className.match(/is-(friend|met|unmet)/)[1]]))')
  const heartsOf = selector => evaluate(`document.querySelectorAll(${JSON.stringify(`${selector} .friend-hearts:not([hidden]) i.is-full`)}).length`)
  /** The swap in the flight, from its start: the friend that goes home and the friend that comes, and the most draw calls of the friends. */
  async function watchSwap(from, to, shots = '') {
    let leaving = false, sky = false, most = 0, looped = 0
    for (let t = 0.25; t <= SWAP_TIME + 1.6; t += 0.25) {
      await advance(0.25)
      const friend = (await snapshot()).friend
      leaving ||= friend.leaving === from
      sky ||= friend.shown && friend.swapping && friend.kind === to
      if (friend.swapping) { const calls = await evaluate('__fairyTest.friendCalls()'); most = Math.max(most, calls.with - calls.without) }
      looped = Math.max(looped, friend.loop)
      if (shots && t === 1) await capture(`${shots}-leave`)
      if (shots && t === 2) await capture(`${shots}-arrive`)
    }
    const friend = (await snapshot()).friend
    assert(!from || leaving, `The ${from} did not fly home`)
    assert(!to || (sky && friend.kind === to && friend.shown && !friend.swapping && looped > 3), `The ${to} did not come out of the sky with a loop: ${JSON.stringify({ sky, looped, friend })}`)
    assert(!friend.leaving, `The old friend is still there: ${friend.leaving}`)
    return most
  }

  // ---- Earth: card notes with hearts, the book before the gift, five hellos give the friend -----
  step('five hellos')
  await load(false)
  await click('#begin-button')
  await advance(1)
  let state = await snapshot()
  assert(!state.friend.gift || state.friend.hellos === 5, `Wrong start: ${JSON.stringify(state.friend)}`)
  const totalBefore = population(state, 'Earth').total
  let gift = null, tries = 0, bookBefore = null
  const cardNotes = [], used = new Set()
  while (!gift && tries++ < 40) {
    state = await snapshot()
    const next = population(state, 'Earth').visible.filter(model => /^creature-(rabbit|sheep|cow)-/.test(model.name) && !used.has(model.name)).sort((a, b) => a.distance - b.distance)[0]
    if (!next) { used.clear(); await advance(8); continue }
    used.add(next.name)
    assert(await evaluate(`__fairyTest.approach(${JSON.stringify(next.name)}, 9, 2.4, false)`), 'The fairy could not fly to the animal')
    for (let t = 0; t < 2.5 && !gift; t += 0.1) {
      await advance(0.1, true)
      const friend = (await snapshot()).friend
      if (friend.note && friend.noteLabel === 'NEW IN YOUR ANIMAL BOOK' && !cardNotes.some(note => note.name === friend.noteName)) {
        // The note of a new card: its picture facts and the hearts. The hearts are the only count.
        cardNotes.push({ name: friend.noteName, hearts: friend.noteHearts, hellos: friend.hellos })
        assert(friend.noteHearts >= 1 && friend.noteHearts <= friend.hellos, `Wrong hearts on the card note: ${JSON.stringify(friend)}`)
        assert(await evaluate('document.querySelectorAll("#friend-note .friend-note-facts svg").length') === 3, 'The card note has no three picture facts')
        assert(!(await text('#friend-note')).match(/\d/), 'The card note shows a number')
        if (cardNotes.length === 1) { await advance(0.6); await capture('card-note') }
      }
      if (friend.hellos < 5) assert(!friend.shown && !friend.gift, `The friend came before five hellos: ${JSON.stringify(friend)}`)
      else gift = friend
      // Before the gift, the Animals page shows the hearts and the empty bubble, and no "Fly with me".
      if (!gift && !bookBefore && friend.hellos >= 2 && friend.met.length) {
        await openAnimals()
        bookBefore = { hellos: friend.hellos, hearts: await heartsOf('.animal-note'), bubble: await shown('.animal-note .friend-preview--none'), looks: await cardLooks() }
        await click(`[data-animal="${friend.met[0]}"]`)
        bookBefore.fly = await shown('#animal-fly')
        bookBefore.cardHearts = await heartsOf('.animal-note')
        await capture('animals-before-gift')
        await click('#close-map')
        assert(bookBefore.hearts === friend.hellos && bookBefore.cardHearts === friend.hellos && bookBefore.bubble && !bookBefore.fly, `Wrong Animals page before the gift: ${JSON.stringify(bookBefore)}`)
        assert(KINDS.every(kind => bookBefore.looks[kind] === (friend.met.includes(kind) ? 'met' : 'unmet')), `Wrong cards before the gift: ${JSON.stringify(bookBefore.looks)}`)
      }
    }
  }
  assert(gift, `No friend after ${tries} passes: ${JSON.stringify((await snapshot()).friend)}`)
  assert(cardNotes.length >= 1, 'No note of a new card showed')
  // The gift note can wait for a card note. The friend comes out of the sky with its note.
  for (let t = 0; t < 12 && !((await snapshot()).friend.noteLabel === 'A NEW FRIEND' && (await snapshot()).friend.note); t += 0.1) await advance(0.1, true)
  await advance(0.4)
  state = await snapshot()
  assert(state.friend.gift && state.friend.friend && state.friend.met.includes(state.friend.friend) && state.friend.kind === state.friend.friend, `The fifth hello gave no friend: ${JSON.stringify(state.friend)}`)
  assert(state.friend.note && state.friend.noteName === NAMES[state.friend.friend] && state.friend.noteHearts === 5, `No gift note with five hearts: ${JSON.stringify(state.friend)}`)
  assert(state.friend.shown && state.friend.swapping, `The first friend does not come out of the sky: ${JSON.stringify(state.friend)}`)
  assert(await evaluate('document.querySelector("#friend-note p").textContent') === 'A friend flies with you now', 'Wrong text in the note')
  assert(await evaluate('getComputedStyle(document.querySelector("#friend-note")).visibility') === 'visible', 'The note does not show in the flight')
  assert(await painted('#friend-note img') > 20, 'The note has no picture of the friend')
  // No count shows: the child sees only the hearts.
  assert(!(await evaluate('document.querySelector("#friend-note").textContent')).match(/\d/), 'The note shows a number')
  await capture('gift')
  await advance(1.4)
  await capture('gift-loop')
  const first = state.friend.friend
  let met = state.friend.met
  assert(JSON.stringify(await saved()) === JSON.stringify({ hellos: 5, met, friend: first }), `Wrong saved state: ${JSON.stringify(await saved())}`)

  // The friend is no creature of the world: the count of the residents stays, and the friend says no hello.
  step('the friend is no resident')
  await over('earth', 30)
  await advance(10)
  state = await snapshot()
  assert(population(state, 'Earth').total === totalBefore, 'The friend changed the number of the residents')
  assert(!state.wildlife.some(item => item.visible.some(model => /friend/.test(model.name))), 'The friend is in the list of the creatures')
  const quiet = state.hellos
  await advance(10)
  state = await snapshot()
  assert(state.hellos === quiet && state.friend.hellos === 5, `A hello started with no creature near: ${state.hellos} after ${quiet}`)
  // A note goes after its time of flight: 4 s for a card and 6 s for the gift.
  assert(!state.friend.note && !state.friend.waiting.length, `The notes did not go: ${JSON.stringify(state.friend)}`)
  assert(state.friend.farthest < LIMIT && inView(state.friend), `The friend is not at her side in a hover: ${JSON.stringify(state.friend)}`)

  // A happy loop, and not a second loop in the next 20 s.
  step('happy loop')
  await advance(12)
  assert(await evaluate('__fairyTest.cheer()'), 'No happy loop after 20 s')
  let looped = 0
  for (let t = 0; t < 1.6; t += 0.1) { await advance(0.1); looped = Math.max(looped, (await snapshot()).friend.loop) }
  assert(looped > 3, `The friend did not go around her: ${looped}`)
  assert(!(await evaluate('__fairyTest.cheer()')), 'A second loop started at once')
  await advance(1)
  state = await snapshot()
  assert(state.friend.loop === 0 && state.friend.farthest < LIMIT, `The loop took the friend too far: ${state.friend.farthest}`)

  // ---- The Animals page of Worlds: the cards, the tabs, "Fly with me" and "No friend" -------------
  step('Animals page')
  // The page needs two friends: give a duck when all the hellos came from one kind. Its card note shows and goes.
  if (met.length < 2) { await evaluate('__fairyTest.meet("duck")'); await advance(5, true) }
  met = (await snapshot()).friend.met
  const other = met.find(kind => kind !== first), unmet = KINDS.find(kind => !met.includes(kind))
  // Your fairy has no Friend row now.
  assert(!(await evaluate('!!document.querySelector("#friend-row, [data-friend]")')), 'The Friend row is still in Your fairy')
  await click('#open-map')
  // Worlds opens at its Worlds tab, with the thermometers and the Moon diary.
  assert(await evaluate('document.querySelector("#tab-worlds").getAttribute("aria-selected") === "true" && !document.querySelector("#worlds-page").hidden && document.querySelector("#animals-page").hidden'), 'Worlds does not open at its Worlds tab')
  assert(await evaluate('document.querySelectorAll("#worlds-page .book-card .warmth-meter").length') >= 3 && await shown('#worlds-page .moon-diary-book'), 'The Worlds tab lost the thermometers or the Moon diary')
  await capture('worlds-tab')
  // The roles of the tabs.
  assert(await evaluate(`(() => {
    const list = document.querySelector('#world-map [role=tablist]'), tabs = [...list.querySelectorAll('[role=tab]')]
    return tabs.length === 2 && tabs.every(tab => document.getElementById(tab.getAttribute('aria-controls'))?.getAttribute('role') === 'tabpanel'
      && document.getElementById(tab.getAttribute('aria-controls')).getAttribute('aria-labelledby') === tab.id)
  })()`), 'The tabs of Worlds have wrong roles')
  // The keyboard: the arrow key goes to the Animals tab and shows its page.
  await evaluate('document.querySelector("#tab-worlds").focus()')
  await press('ArrowRight')
  assert(await evaluate('document.activeElement.id === "tab-animals" && document.querySelector("#tab-animals").getAttribute("aria-selected") === "true" && !document.querySelector("#animals-page").hidden && document.querySelector("#worlds-page").hidden'), 'The arrow key does not open the Animals tab')
  assert(await text('#map-title') === 'Your animal friends', 'Wrong title of the Animals page')
  await openAnimals()
  let looks = await cardLooks()
  assert(KINDS.every(kind => looks[kind] === (kind === first ? 'friend' : met.includes(kind) ? 'met' : 'unmet')), `Wrong cards: ${JSON.stringify(looks)}`)
  assert(await text(`[data-animal="${first}"] .animal-mark`) === '✦ Flies with me', 'The card of the friend has no mark')
  assert(await evaluate(`getComputedStyle(document.querySelector('[data-animal="${first}"]')).boxShadow.includes('255, 225, 162')`), 'The card of the friend has no gold ring')
  for (const kind of met) {
    assert(await painted(`[data-animal="${kind}"] img`) > 20, `The card of the ${kind} has no picture`)
    if (kind !== first) assert(await evaluate(`document.querySelectorAll('[data-animal="${kind}"] .animal-facts svg').length`) === 3, `The card of the ${kind} has no three facts`)
  }
  const shadow = { text: await evaluate(`document.querySelector('[data-animal="${unmet}"] .animal-unknown')?.textContent`), cover: await covered(`[data-animal="${unmet}"] img`), colours: await painted(`[data-animal="${unmet}"] img`) }
  assert(shadow.text === '?' && shadow.cover > 0.08 && shadow.colours <= 3, `The ${unmet} is not a soft shadow: ${JSON.stringify(shadow)}`)
  assert(await text('#tab-animals .world-count') === `${met.length}/9`, 'Wrong count on the Animals tab')
  // After the gift the note shows the friend, with no hearts.
  assert(await text('.animal-note strong') === NAMES[first] && await heartsOf('.animal-note') === 0, 'The note does not show the friend')
  await capture('animals-some')
  // Tab goes into the page, and Enter taps the card that has the focus.
  await press('Tab')
  const focused = await evaluate('document.activeElement.dataset.animal ?? null')
  assert(focused, `Tab does not go to a card: ${await evaluate('document.activeElement.outerHTML.slice(0, 80)')}`)
  await press('Enter')
  assert((await snapshot()).animalBook.selected === focused, 'Enter does not tap the card')
  // A shadow: its world and its place, with no "Fly with me".
  await click(`[data-animal="${unmet}"]`)
  assert(await text('.animal-note strong') === 'Who is it?' && /Earth|Blossom Haven/.test(await text('.animal-note-facts')) && !(await shown('#animal-fly')), `Wrong note of a shadow: ${await text('.animal-note')}`)
  await capture('animals-shadow')
  // A met card: its facts and "Fly with me".
  await click(`[data-animal="${other}"]`)
  assert(await text('.animal-note strong') === NAMES[other] && await evaluate('document.querySelectorAll(".animal-note-facts .animal-fact").length') === 3, 'The note of a met card has no facts')
  assert(await shown('#animal-fly') && !(await shown('#animal-none')), 'A met card has no "Fly with me"')
  await capture('animals-fly-with-me')
  // "Fly with me" with the keyboard: Enter closes Worlds, and the swap plays in the flight.
  await evaluate('document.querySelector("#animal-fly").focus()')
  await press('Enter')
  state = await snapshot()
  assert(!state.mapOpen && !(await evaluate('document.querySelector("#world-map").open')), '"Fly with me" did not close Worlds')
  assert(state.friend.friend === other && state.friend.leaving === first && state.friend.swapping, `"Fly with me" did not start the swap: ${JSON.stringify(state.friend)}`)
  const computerSwap = await watchSwap(first, other, 'swap')
  assert(computerSwap >= 5 && computerSwap <= 6, `Wrong draw calls in a swap on a computer: ${computerSwap}`)
  assert(JSON.stringify(await saved()) === JSON.stringify({ hellos: 5, met, friend: other }), 'The swap did not save the friend')
  // "No friend": a small button in the note of the card of the friend. The friend flies home.
  await openAnimals()
  await click(`[data-animal="${other}"]`)
  assert(await shown('#animal-none') && !(await shown('#animal-fly')), 'The card of the friend has no "No friend"')
  await capture('animals-friend-card')
  await click('#animal-none')
  assert(!(await evaluate('document.querySelector("#world-map").open')), '"No friend" did not close Worlds')
  await watchSwap(other, null)
  state = await snapshot()
  assert(!state.friend.shown && state.friend.friend === null && state.friend.gift, `"No friend" did not send the friend home: ${JSON.stringify(state.friend)}`)
  // Escape closes Worlds.
  await openAnimals()
  assert(await text('.animal-note small') === 'No friend' && await shown('.animal-note .friend-preview--none'), 'The note does not show "No friend"')
  await capture('animals-no-friend')
  await press('Escape')
  assert(!(await evaluate('document.querySelector("#world-map").open')) && !(await snapshot()).mapOpen, 'Escape does not close Worlds')

  // ---- A reload keeps the choice -----------------------------------------------------------------
  step('reload')
  await load(false)
  state = await snapshot()
  assert(state.friend.gift && !state.friend.shown && state.friend.friend === null, `A reload did not keep "No friend": ${JSON.stringify(state.friend)}`)
  await choose(other)
  await load(false)
  state = await snapshot()
  assert(state.friend.shown && state.friend.kind === other && state.friend.hellos === 5, `A reload did not keep the friend: ${JSON.stringify(state.friend)}`)
  // The friend is at her side on the welcome screen, before the flight starts.
  await advance(0.2)
  state = await snapshot()
  assert(state.friend.scale > 0.9 && state.friend.distance < LIMIT && inView(state.friend), `The friend of the saved game does not show at the start: ${JSON.stringify(state.friend)}`)
  await capture('reload-welcome')
  // A broken saved value gives a game with no friend, and no error.
  await evaluate('localStorage.setItem("fairy-friend", "{not json")')
  await load(false)
  state = await snapshot()
  assert(!state.friend.gift && !state.friend.shown && state.friend.hellos === 0, `A broken saved value gave a friend: ${JSON.stringify(state.friend)}`)

  // ---- Each kind as a friend, and the draw calls on a computer -----------------------------------
  step('nine friends')
  await evaluate(`__fairyTest.meet(${KINDS.map(kind => JSON.stringify(kind)).join(', ')})`)
  await click('#begin-button')
  await advance(1)
  state = await snapshot()
  assert(state.friend.friend === 'unicorn' && state.friend.met.length === 9, `Wrong friend after a hello of each kind: ${JSON.stringify(state.friend)}`)
  await over('earth', 9)
  await advance(7)
  const models = {}
  for (const kind of KINDS) {
    assert(await choose(kind) || kind === 'unicorn', `Could not select the ${kind}`)
    await advance(SETTLED)
    state = await snapshot()
    assert(state.friend.kind === kind && state.friend.calls === 3, `The ${kind} is not three draw calls: ${state.friend.calls}`)
    assert(inView(state.friend) && state.friend.screen[0] > 0.1 && state.friend.distance < LIMIT, `The ${kind} is not at her right side: ${JSON.stringify(state.friend.screen)}`)
    models[kind] = state.friend.flies ? 'wings' : 'bubble'
    await capture(`earth-${kind}`)
  }
  const computer = await drawCalls('cow')
  assert(computer.with - computer.without === 3, `Wrong draw calls of the friend on a computer: ${JSON.stringify(computer)}`)
  // The full book.
  await openAnimals()
  looks = await cardLooks()
  assert(KINDS.every(kind => looks[kind] === (kind === 'cow' ? 'friend' : 'met')), `The full book is wrong: ${JSON.stringify(looks)}`)
  await capture('animals-all')
  await click('#close-map')

  // A low flight over the ground: the friend stays out of the ground and near her.
  step('low flight')
  await over('earth', 2.4, false)
  let lowest = Infinity
  for (let t = 0; t < 8; t += 0.5) {
    if (t === 2) await key('KeyA', true)
    if (t === 5) { await key('KeyA', false); await key('KeyD', true) }
    await advance(0.5)
    const height = await evaluate(`(() => { const world = __fairyTest.world('earth'), friend = __fairyTest.snapshot().friend; const at = world.group.position.clone().fromArray(friend.position).sub(world.group.position); const local = at.clone().applyQuaternion(world.group.quaternion.clone().invert()).normalize(); return at.length() - world.radius - Math.max(0, world.sample(local.x, local.y, local.z).height) })()`)
    lowest = Math.min(lowest, height)
    if (t === 3.5) await capture('earth-low-turn')
  }
  await key('KeyD', false)
  state = await snapshot()
  assert(lowest > 0.9, `The friend went into the ground: ${lowest} m over it`)
  assert(state.friend.farthest < LIMIT, `The friend left her in the low flight: ${state.friend.farthest}`)

  // ---- The climb from the meadow to open space, and back -----------------------------------------
  step('climb to open space')
  const climb = { near: 0, space: 0, boost: 0, back: 0, speed: 0 }
  await key('KeyW', true)
  for (let t = 0; t < 60; t += 0.5) {
    await advance(0.5)
    state = await snapshot()
    climb.near = Math.max(climb.near, state.friend.farthest)
    if (state.belt.region === 'Open space') break
  }
  await key('KeyW', false)
  assert(state.belt.region === 'Open space', `The fairy did not reach open space: ${state.belt.region}`)
  for (let t = 0; t < 8; t += 0.5) {
    await advance(0.5)
    state = await snapshot()
    climb.space = Math.max(climb.space, state.friend.farthest)
    climb.speed = Math.max(climb.speed, Number(await evaluate('document.querySelector("#speed-value").textContent')))
  }
  assert(inView(state.friend), 'The friend is not in the view in open space')
  await capture('space-cow')
  // A swap in a boost at the speed of open space: the friends keep up with her.
  await choose('pegasus')
  await key('ShiftLeft', true)
  for (let t = 0; t < 5; t += 0.5) {
    if (t === 2) await key('KeyA', true)
    await advance(0.5)
    state = await snapshot()
    climb.boost = Math.max(climb.boost, state.friend.farthest)
    climb.speed = Math.max(climb.speed, Number(await evaluate('document.querySelector("#speed-value").textContent')))
  }
  assert(state.boosted && inView(state.friend) && state.friend.kind === 'pegasus' && !state.friend.swapping, 'The friend is not in the view after a swap in a boost')
  await capture('space-pegasus-boost')
  await key('KeyA', false); await key('ShiftLeft', false)
  assert(climb.speed > 2000, `The fairy did not reach the boost speed of open space: ${climb.speed} m/s`)
  // Back to Earth with a guided flight.
  await evaluate('document.querySelector("[data-world=earth]").click(); document.querySelector("#world-fly").click()')
  let landed = false
  for (let t = 0; t < 240 && !landed; t += 0.5) {
    await advance(0.5)
    state = await snapshot()
    climb.back = Math.max(climb.back, state.friend.farthest)
    landed = state.belt.nearest === 'Earth' && state.destination === null && /m above/.test(await evaluate('document.querySelector("#planet-distance").textContent'))
  }
  assert(landed, `The fairy did not come back to Earth: ${state.belt.nearest}, ${state.belt.region}`)
  await advance(3)
  state = await snapshot()
  climb.back = Math.max(climb.back, state.friend.farthest)
  for (const [part, distance] of Object.entries(climb)) if (part !== 'speed') assert(distance > 0.5 && distance < LIMIT, `The friend was ${distance} m from her in the part "${part}"`)
  assert(state.friend.shown && inView(state.friend), 'The friend is not with her after the return')
  await capture('earth-return')

  // ---- Reduced motion: no loop, and a change of friend at once --------------------------------------
  step('reduced motion')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await advance(25)
  assert(!(await evaluate('__fairyTest.cheer()')), 'A loop started with reduced motion')
  await advance(0.5)
  const stillA = (await snapshot()).friend
  await advance(0.7)
  const stillB = (await snapshot()).friend
  assert(stillA.loop === 0 && Math.abs(stillA.distance - stillB.distance) < 0.02, `The friend bobs with reduced motion: ${stillA.distance}, ${stillB.distance}`)
  await choose('frogPrince')
  await advance(0.1)
  state = await snapshot()
  assert(state.friend.kind === 'frogPrince' && state.friend.shown && !state.friend.swapping && !state.friend.leaving, `The change is not at once with reduced motion: ${JSON.stringify(state.friend)}`)
  await send('Emulation.setEmulatedMedia', { features: [] })

  // ---- The reset in Settings removes the friend and the book ----------------------------------------
  step('reset')
  await click('#settings-toggle')
  assert(!(await evaluate('document.querySelector("#reset-stickers").disabled')), 'The reset is not ready with a friend in the game')
  await click('#reset-stickers')
  assert((await evaluate('document.querySelector("#reset-detail").textContent')).includes('fairy friend'), 'The reset does not say that the friend goes')
  await click('#reset-yes')
  await click('#close-settings')
  await advance(0.5)
  state = await snapshot()
  assert(!state.friend.shown && !state.friend.gift && state.friend.hellos === 0 && !state.friend.met.length, `The reset kept the friend: ${JSON.stringify(state.friend)}`)
  assert(Object.values(state.animalBook.cards).every(look => look === 'unmet') && await text('#tab-animals .world-count') === '0/9', 'The reset kept the cards of the book')
  assert(JSON.stringify(await saved()) === JSON.stringify({ hellos: 0, met: [], friend: null }), 'The reset did not save the empty state')

  // ---- Blossom Haven: a pegasus foal says hello ------------------------------------------------------
  step('Blossom Haven')
  await load(false)
  await evaluate('document.querySelector("#begin-button").click(); document.querySelector("[data-world=fairy]").click(); document.querySelector("#world-fly").click()')
  // The guided flight is long, so a test hook puts the fairy at the end of the flower guide.
  await advance(1)
  await evaluate('__fairyTest.arriveHome()')
  for (let i = 0; i < 10; i++) {
    await advance(0.5)
    state = await snapshot()
    if (state.found && !state.guided) break
  }
  assert(state.found, 'The fairy did not reach Blossom Haven')
  assert(state.foalHellos && state.foalHellos.count === 0 && !state.friend.met.includes('pegasus'), `A foal said hello before the fairy came: ${JSON.stringify(state.foalHellos)}`)
  // She flies to a foal over the cottage garden, from 9 m away at its height.
  await evaluate(`(() => {
    const world = __fairyTest.world('fairy'), foal = world.surface.getObjectByName('pegasus-foal-0')
    const at = foal.getWorldPosition(foal.position.clone()), up = at.clone().sub(world.group.position).normalize()
    const side = up.clone().cross(up.clone().set(0.3, 0.2, 0.9).normalize()).normalize()
    __fairyTest.place(at.clone().addScaledVector(side, 9).toArray(), at.toArray())
  })()`)
  let foal = null
  for (let t = 0; t < 3 && !foal; t += 0.1) {
    await advance(0.1)
    state = await snapshot()
    if (state.foalHellos.count > 0) foal = state
  }
  assert(foal, 'No pegasus foal said hello')
  assert(foal.friend.met.includes('pegasus') && foal.friend.hellos >= 1, `The hello of the foal did not count: ${JSON.stringify(foal.friend)}`)
  // The picture: she hovers, so the camera comes level, and the hearts are over the foal.
  await click('#hover-toggle')
  await advance(1.1)
  await capture('haven-foal-hello')
  // Each kind that lives here: a unicorn, a pegasus foal and a guest from Earth over the candy gardens.
  await evaluate(`__fairyTest.meet(${KINDS.map(kind => JSON.stringify(kind)).join(', ')})`)
  // The home card and the sticker note show now. The notes of the friend wait for them, and then they show.
  await advance(0.2)
  const otherNote = () => evaluate('!document.querySelector("#sticker-toast").hidden || !document.querySelector("#home-celebration").hidden || !document.querySelector("#warmth-note").hidden || !document.querySelector("#moon-toast").hidden')
  const waited = await otherNote()
  state = await snapshot()
  assert(!waited || !state.friend.note, 'The note of the friend covers a different note')
  await over('fairy', 9)
  await advance(8)
  for (let i = 0; i < 150 && !(await snapshot()).friend.note; i++) { await delay(100); await advance(0.1) }
  assert((await snapshot()).friend.note && !(await otherNote()), 'The note of the friend did not show after the other notes')
  // The notes wait for each other: never two of them on the screen.
  for (let t = 0; t < 40 && ((await snapshot()).friend.note || (await snapshot()).friend.waiting.length); t += 0.5) {
    await advance(0.5)
    assert(!((await snapshot()).friend.note && await otherNote()), 'Two notes show at the same time')
  }
  for (const kind of ['pegasus', 'unicorn', 'frogPrince', 'sheep']) {
    await swapTo(kind)
    state = await snapshot()
    assert(state.friend.kind === kind && inView(state.friend) && state.friend.distance < LIMIT, `The ${kind} is not at her side over Blossom Haven`)
    await capture(`haven-${kind}`)
  }
  // A hop of Blossom Haven carries the fairy far in one frame. The friend goes with her at once.
  await over('fairy', 9, false)
  await advance(1)
  await snapshot()
  const beforeHop = (await snapshot()).home
  assert(await evaluate('__fairyTest.hop()'), 'Blossom Haven did not hop')
  await advance(0.1)
  state = await snapshot()
  const hop = Math.hypot(...state.home.map((value, index) => value - beforeHop[index]))
  assert(hop > 500 && state.friend.farthest < LIMIT && state.friend.distance < LIMIT, `The friend stayed behind at the hop of ${hop} m: ${state.friend.farthest}`)

  // ---- Phones: the friend at 390 px, the Animals page at 390 px and 320 px, and the draw calls ------
  step('phone')
  await load(true)
  await click('#begin-button')
  await advance(1)
  state = await snapshot()
  assert(state.graphics.mobile, 'The phone check does not run as a phone')
  assert(state.friend.shown && state.friend.kind === 'sheep', `The phone did not load the friend: ${JSON.stringify(state.friend)}`)
  await over('earth', 9)
  await advance(7)
  for (const kind of ['cow', 'duck', 'frogPrince', 'pegasus']) {
    await swapTo(kind)
    state = await snapshot()
    assert(state.friend.kind === kind && state.friend.calls === 3, `The ${kind} is not three draw calls on a phone: ${state.friend.calls}`)
    assert(inView(state.friend) && state.friend.screen[0] > 0.1 && state.friend.distance < LIMIT, `The ${kind} is not in the view of a phone: ${JSON.stringify(state.friend.screen)}`)
    await capture(`phone-${kind}`)
  }
  const phone = await drawCalls('cow')
  assert(phone.with - phone.without === 3, `Wrong draw calls of the friend on a phone: ${JSON.stringify(phone)}`)
  const phoneLayout = {}
  for (const [width, height] of [[390, 844], [320, 640]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true })
    await advance(0.3)
    await openAnimals()
    await capture(`phone${width}-animals`)
    // The note of a low card stays at the top of Worlds while the cards scroll.
    await click('[data-animal="pegasus"]')
    await evaluate('document.querySelector("#world-map").scrollTop = 99999')
    const place = await evaluate('(() => { const dialog = document.querySelector("#world-map"), note = document.querySelector(".animal-note").getBoundingClientRect(), box = dialog.getBoundingClientRect(); return { scrolled: dialog.scrollTop, top: note.top - box.top, bottom: note.bottom - box.top, height: box.height } })()')
    assert(place.scrolled > 0 && place.top >= -1 && place.bottom < place.height * 0.6 && await shown('#animal-fly'), `The note does not stay on top at ${width} px: ${JSON.stringify(place)}`)
    await capture(`phone${width}-scrolled`)
    const overflow = await evaluate('Math.max(document.documentElement.scrollWidth - innerWidth, (d => d.scrollWidth - d.clientWidth)(document.querySelector("#world-map")))')
    const smallest = await evaluate('Math.min(...[...document.querySelectorAll("#world-map button")].filter(b => b.offsetParent).map(b => Math.min(b.offsetWidth, b.offsetHeight)))')
    assert(overflow <= 0 && smallest >= 44, `The Animals page does not fit ${width} px: overflow ${overflow}, smallest button ${smallest}`)
    phoneLayout[width] = { overflow, smallest, noteTop: Math.round(place.top) }
    await click('#close-map')
  }
  // A swap on a phone: two friends in the scene for about 1.5 s.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await advance(0.3)
  await openAnimals()
  await click('[data-animal="duck"]')
  await click('#animal-fly')
  const phoneSwap = await watchSwap('cow', 'duck', 'phone-swap')
  assert(phoneSwap >= 4 && phoneSwap <= 6, `Wrong draw calls in a swap on a phone: ${phoneSwap}`)
  // Your fairy has no friend row on a phone either.
  await click('#customize-toggle')
  await advance(1.5)
  await capture('phone-menu')
  await click('#customizer-close')
  const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth')
  assert(overflow <= 0, `The page scrolls sideways on a phone: ${overflow}`)

  assert(!errors.length, JSON.stringify(errors))
  const metres = value => +value.toFixed(2)
  console.log(JSON.stringify({
    gift: { friend: first, met, passes: tries, cardNotes, bookBefore: { hellos: bookBefore?.hellos, hearts: bookBefore?.hearts } },
    animals: { swapped: other, shadow: unmet, keyboard: 'passed', noFriend: 'passed', reload: 'passed', brokenValue: 'passed' },
    models,
    farthest: { lowTurn: 'below 4', climb: metres(climb.near), openSpace: metres(climb.space), boost: metres(climb.boost), guidedReturn: metres(climb.back), topSpeed: climb.speed, hop: Math.round(hop) },
    lowestOverGround: metres(lowest),
    drawCalls: { computer, phone, swapComputer: computerSwap, swapPhone390: phoneSwap },
    phoneLayout,
    foalHello: 'passed', noteWaits: waited ? 'passed' : 'no other note', reset: 'passed', reducedMotion: 'passed', loop: metres(looped),
    screenshots: folder, runtimeExceptions: errors.length,
  }))
} finally { ws?.close(); browser.kill() }
