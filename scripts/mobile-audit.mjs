// Layout/input evidence from desktop Chromium emulation, not a device benchmark.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const executable = process.argv[2]
if (!executable) throw new Error('Pass a Chrome/Chromium executable')
const base = process.env.FAIRY_TEST_URL || 'http://127.0.0.1:5174/'
const studyOnly = process.argv.includes('--study')
const profile = await mkdtemp(join(tmpdir(), 'fairy-mobile-audit-'))
const browser = spawn(executable, ['--headless', '--remote-debugging-port=9341', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let tabs
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9341/json')).json(); break } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error('Browser did not start')
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.id) {
      const handler = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id
    const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`Timeout: ${method}`)) }, 60000)
    pending.set(key, { resolve: value => { clearTimeout(timeout); resolve(value) }, reject: error => { clearTimeout(timeout); reject(error) } })
    ws.send(JSON.stringify({ id: key, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await send('Runtime.enable')
  await send('Page.enable')
  if (studyOnly) {
    await send('Emulation.setDeviceMetricsOverride', { width:1440, height:1000, deviceScaleFactor:1, mobile:false })
    await send('Page.navigate', { url: new URL('studies/mobile-study.html', base).href })
    let ready = false
    for (let i = 0; i < 80; i++) {
      if (await evaluate('!!document.querySelector("#brief-preview")')) { ready = true; break }
      await delay(250)
    }
    if (!ready) throw new Error('Study did not initialize')
    const assert = async (expression, label) => { if (!await evaluate(expression)) throw new Error(label) }
    await assert('document.querySelector("#answered").textContent === "0 / 14"', 'Fresh brief must have no selected answers')
    await evaluate('document.querySelector(\'[data-device="820,1180"]\').click()')
    await assert('document.querySelector("#mock-arrows").hidden', 'iPad should show current control gap')
    await evaluate('document.querySelector("#proposed").click()')
    await assert('!document.querySelector("#mock-arrows").hidden', 'Proposal should show iPad controls')
    await evaluate(`document.querySelector('[name="orientation"][value="0"]').click(); const field = document.querySelector('[name="devices"]'); field.value='Test phone / Test iPad'; field.dispatchEvent(new Event('input', {bubbles:true}));`)
    await assert('document.querySelector("#answered").textContent === "2 / 14"', 'Answer counter failed')
    await send('Page.reload')
    await delay(500)
    for (let i = 0; i < 80; i++) {
      if (await evaluate('document.querySelector("#answered")?.textContent === "2 / 14"')) break
      await delay(100)
    }
    await assert('document.querySelector("#answered")?.textContent === "2 / 14"', 'Reload did not restore questionnaire')
    await assert('document.querySelector(\'[name="devices"]\').value === "Test phone / Test iPad"', 'Saved answer was not restored')
    await evaluate('document.querySelector(\'[data-clear="orientation"]\').click()')
    await assert('document.querySelector("#answered").textContent === "1 / 14"', 'Clear answer failed')
    await evaluate(`window.auditBlob = null; URL.createObjectURL = blob => { window.auditBlob = blob; return 'blob:audit' }; HTMLAnchorElement.prototype.click = function() {}; document.querySelector('#download').click()`)
    await assert('(async () => { const text = await window.auditBlob.text(); return text.includes("Test phone / Test iPad") && text.includes("Undecided") })()', 'Export does not preserve answers/unknowns')
    await evaluate('document.querySelector("#check").click()')
    await assert('document.querySelector("#device-result").textContent.includes("WebGL 2:")', 'Capability check failed')
    await mkdir('artifacts.local/mobile-study', { recursive:true })
    const layouts = []
    for (const [label,width,height] of [['desktop',1440,1000],['phone',390,844],['small-phone',320,568],['landscape',844,390],['ipad',820,1180]]) {
      await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:width<1000})
      await delay(150)
      await assert('document.documentElement.scrollWidth <= innerWidth', `Horizontal overflow at ${label}`)
      const shot = await send('Page.captureScreenshot', {format:'png'})
      await writeFile(`artifacts.local/mobile-study/${label}.png`, Buffer.from(shot.data,'base64'))
      layouts.push({label,width,height,horizontalOverflow:false})
    }
    await writeFile('artifacts.local/mobile-study/results.json', JSON.stringify({layouts,errors,checks:['no default answers','current/proposed controls','save/reload','clear to undecided','Markdown export','capability check']},null,2))
    console.log('Study checks passed: questionnaire, persistence, export, capability check and five responsive layouts.')
    if (errors.length) throw new Error(JSON.stringify(errors))
  } else {
  // One real render on load. Freeze animation to make layout inspection cheap on a software GPU.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = callback => { window.auditFrame = callback; return 1 }' })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: new URL('?test', base).href })
  let ready = false
  for (let i = 0; i < 160; i++) {
    if (await evaluate('typeof window.auditFrame === "function" && !!document.querySelector("#journey-world option")')) { ready = true; break }
    await delay(250)
  }
  if (!ready) throw new Error('Game did not initialize')
  await mkdir('artifacts.local/mobile-audit', { recursive: true })
  const results = []
  for (const [label, width, height] of [['phone-portrait',390,844], ['small-phone',320,568], ['phone-landscape',844,390], ['ipad-portrait',820,1180], ['ipad-landscape',1180,820], ['ipad-split',600,820]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true })
    await delay(150)
    await evaluate('window.auditFrame(performance.now())')
    results.push(await evaluate(`(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom } };
      return { label:${JSON.stringify(label)}, viewport:[innerWidth,innerHeight], touchDisplay:getComputedStyle(document.querySelector('.touch-controls')).display, touchTarget:rect('.touch-controls button'), welcome:rect('#welcome'), webgl2:!!document.querySelector('canvas').getContext('webgl2'), boostButton:!!document.querySelector('[data-key^="Shift"]') };
    })()`))
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`artifacts.local/mobile-audit/${label}.png`, Buffer.from(shot.data, 'base64'))
  }
  await send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:true })
  await evaluate(`document.querySelector('#begin-button').click(); document.querySelectorAll('.touch-controls button').forEach(b => { for (const type of ['pointerdown','pointerup','pointercancel','lostpointercapture']) b.addEventListener(type, e => (window.auditEvents ??= []).push({type:e.type,key:b.dataset.key})) })`)
  const point = await evaluate(`(() => { const r=document.querySelector('[data-key="ArrowUp"]').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{...point,id:1}] })
  await send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] })
  const touchEvents = await evaluate('window.auditEvents')
  const report = { date:new Date().toISOString(), url:base, method:'Desktop Chrome; touch/viewport emulation; SwiftShader; animation advanced one frame per layout; not physical hardware or iOS WebKit', results, touchEvents, errors }
  await writeFile('artifacts.local/mobile-audit/results.json', JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
  if (errors.length) throw new Error('Browser runtime errors; see report')
  }
} finally { ws?.close(); browser.kill() }
