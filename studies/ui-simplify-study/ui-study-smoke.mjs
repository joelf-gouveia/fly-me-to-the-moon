import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable')
const profile = await mkdtemp(join(tmpdir(), 'ui-study-browser-'))
const browser = spawn(browserPath, ['--headless', '--remote-debugging-port=9349', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', data => { browserErrors += data })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9349/json')).json(); break } catch { await delay(250) }
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
  await mkdir('artifacts.local/ui-study', { recursive: true })
  async function capture(name) {
    await delay(300)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/ui-study/${name}.png`, Buffer.from(shot.data, 'base64'))
  }

  // The game now follows option C, without Guide me home (docs/ui-simplify-study.md, Status).
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 750, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/` })
  for (let i = 0; i < 160; i++) {
    if (await evaluate('!!document.querySelector("#settings-toggle") && !!document.querySelector("#setting-orbits")').catch(() => false)) break
    await delay(250)
  }
  assert(await evaluate('[...document.querySelectorAll(".toolbar button")].map(b => b.id).join()') === 'customize-toggle,stickers-toggle,settings-toggle,pause-toggle', 'The game toolbar is not the four buttons of option C')
  assert(await evaluate('["#follow-home", "#show-stars", "#show-orbits", "#orbit-speed-toggle", "#sound-toggle", ".journey-picker", "#toggle-orbits"].every(selector => !document.querySelector(selector))'), 'A removed control is still in the game')
  assert(await evaluate('!document.querySelector(".solar-map").classList.contains("hide-orbit-paths")'), 'The Worlds map hides its paths')
  errors.length = 0

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/ui-simplify-study.html` })
  for (let i = 0; i < 80; i++) {
    if (await evaluate('document.querySelectorAll("#inventory tbody tr").length > 0').catch(() => false)) break
    await delay(250)
  }
  assert(await count('#inventory tbody tr') === 15, 'The inventory does not have 15 rows')
  assert(await count('.findings li') === 8, 'The study does not show eight findings')

  // Each option: the counts, the moved controls, and the Settings sections.
  const expected = { today: ['10', '8', 0], two: ['8 (today 10)', '6 (today 8)', 2], grownup: ['7 (today 10)', '5 (today 8)', 7], four: ['6 (today 10)', '4 (today 8)', 9] }
  for (const [option, [computer, menu, moved]] of Object.entries(expected)) {
    await click(`[data-option="${option}"]`)
    assert(await text('#r-computer') === computer, `${option}: computer buttons ${await text('#r-computer')}`)
    assert(await text('#r-menu') === menu, `${option}: menu buttons ${await text('#r-menu')}`)
    assert(await count('#frame .ghost') >= (moved ? 1 : 0) && await count('#moves [data-place]') === moved, `${option}: moves ${await count('#moves [data-place]')}`)
    await capture(`computer-${option}`)
  }

  // The drawing: the gear opens Settings, and the switches show the star pictures and the paths in space.
  await click('[data-option="grownup"]')
  await click('[data-where="space"]')
  await click('#frame [data-act="settings-toggle"]')
  assert(await count('#frame .m-settings .m-section') === 3, 'Settings of B does not have three sections')
  await click('#frame [data-switch="stars"]')
  await click('#frame [data-switch="orbits"]')
  await click('#frame [data-speed="4"]')
  assert(await evaluate('document.querySelector("#frame [data-speed=\\"4\\"]").getAttribute("aria-checked")') === 'true', 'World speed does not change')
  await capture('settings-b')
  await click('#frame [data-act="close-settings"]')
  assert(await count('#frame .constellation') === 1 && await count('#frame ellipse[stroke]') === 5, 'Space does not show the star pictures and the paths')
  await click('[data-where="meadow"]')
  assert(await count('#frame .constellation') === 0, 'The meadow shows the star pictures')
  await capture('meadow-paths')

  // The phone Menu of today and of B.
  for (const option of ['today', 'grownup']) {
    await click(`[data-option="${option}"]`)
    await click('[data-device="menu"]')
    const buttons = await count('#frame .m-menu button.m-action:not(.ghost *), #frame .m-menu .m-adventure-menu button:not(.ghost *)')
    assert(buttons === (option === 'today' ? 8 : 5), `${option}: ${buttons} buttons in the phone Menu`)
    await capture(`menu-${option}`)
  }

  // A decision answer stays after a reload, and the export has the four options.
  await click('input[name="option"][value="1"]')
  await send('Page.reload')
  for (let i = 0; i < 40 && !(await evaluate('!!document.querySelector("#inventory tbody tr")').catch(() => false)); i++) await delay(250)
  assert(await evaluate('document.querySelector("input[name=option][value=\\"1\\"]").checked'), 'The answer is not kept')
  const exported = await evaluate(`(async () => {
    const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    let payload;
    URL.createObjectURL = blob => { payload = blob; return create(blob); };
    HTMLAnchorElement.prototype.click = () => {};
    try { document.querySelector('#export').click(); return JSON.parse(await payload.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  })()`)
  assert(exported.study === 'ui-simplify-study' && Object.keys(exported.options).length === 4 && exported.answers.option?.startsWith('B'), 'The export differs from the page')
  const docWorks = await evaluate('(async () => { const r = await fetch(document.querySelector(".intro a").href); return r.ok && (await r.text()).includes("Grown-up corner"); })()')
  assert(docWorks, 'The study link does not work')
  await evaluate('localStorage.clear()')

  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 2, mobile: true })
    for (const device of ['computer', 'phone', 'menu']) {
      await click(`[data-device="${device}"]`)
      await delay(100)
      // A mobile viewport widens to fit wide content, so compare with the target width too.
      assert(!(await evaluate(`document.documentElement.scrollWidth > Math.min(innerWidth, ${width})`)), `Overflow at ${width}px (${device})`)
    }
    await evaluate('window.scrollTo(0, 0)')
    await capture(`mobile-${width}`)
  }
  assert(errors.length === 0, `Browser errors: ${JSON.stringify(errors)}`)
  console.log('Verified that the game follows option C, 15 inventory rows, eight findings, the counts of four options, Settings of B, the drawing in space and on the meadow, the phone Menu, a kept answer, export, study link, and 390/320px layouts. No browser errors.')
} finally {
  ws?.close(); browser.kill()
}
