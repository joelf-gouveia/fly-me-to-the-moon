// A small driver for a headless Chrome over the DevTools protocol, for the bench and the card
// pictures of the animals study. It is the same start as feature-ideas-study-capture.mjs.
import { spawn } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

/** Starts Chrome and opens `url` in a page of `width` × `height`. A phone has a device scale of 3 and touch. */
export async function openPage(browserPath, url, { width = 1280, height = 720, phone = false } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'animals-study-browser-'))
  const browser = spawn(browserPath, [
    '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--hide-scrollbars', '--ignore-gpu-blocklist', 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  let browserErrors = ''
  browser.stderr.on('data', data => { browserErrors += data })
  let tabs
  for (let i = 0; i < 40; i++) {
    try {
      const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]
      tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break
    } catch { await delay(250) }
  }
  if (!tabs?.length) throw new Error(`Browser did not start: ${browserErrors}`)
  const ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map(), errors = [], logs = []
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'Runtime.consoleAPICalled') logs.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '))
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  const send = (method, params = {}, limit = 300000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} took more than ${limit / 1000} s`)), limit)
    pending.set(++id, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 2000))
    return result.result.value
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: phone ? 3 : 1, mobile: phone })
  if (phone) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Page.navigate', { url })
  const screenshot = async (clip = { x: 0, y: 0, width, height, scale: 1 }) => Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip })).data, 'base64')
  return {
    send, evaluate, screenshot, errors, logs,
    async waitFor(expression, tries = 160) {
      for (let i = 0; i < tries; i++) { if (await evaluate(expression).catch(() => false)) return true; await delay(250) }
      throw new Error(`Timed out: ${expression}`)
    },
    close() { ws.close(); browser.kill() },
  }
}
