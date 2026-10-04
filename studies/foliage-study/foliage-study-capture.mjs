// Records the clip and the picture of each look of the foliage study, from the live lab of the
// study page. The page stops its own frames; this script asks for each frame (30 in each
// second), takes a JPEG of the stage, and sends the frames to ffmpeg for a WebM clip.
// Run against the dev server on port 5174:
//   node studies/foliage-study/foliage-study-capture.mjs "path/to/chrome.exe" [E0,E1,...] [origin]
// ffmpeg: set FFMPEG, or the script uses the ffmpeg of Playwright in %LOCALAPPDATA%\ms-playwright.
// The clips go to public/studies/foliage/<id>.webm, the pictures to <id>.jpg, and the numbers
// of each look to stats.json. The plant sheets (SE, SH) and the levers (L0 to L2) are pictures only.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'

// --still: only the pictures, at the times in STILLS (seconds, comma-separated) or the still time of each look.
// OUT: a different folder for the files, for a test run.
const args = process.argv.slice(2)
const stillOnly = args.includes('--still')
const [browserPath, only, origin = 'http://127.0.0.1:5174'] = args.filter(arg => arg !== '--still')
const stillTimes = process.env.STILLS?.split(',').map(Number)
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const FPS = 30, WIDTH = 1280, HEIGHT = 720
const out = process.env.OUT ?? join(process.cwd(), 'public', 'studies', 'foliage')
await mkdir(out, { recursive: true })

async function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG
  const base = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'ms-playwright')
  for (const folder of (await readdir(base).catch(() => [])).filter(name => name.startsWith('ffmpeg'))) {
    const file = join(base, folder, 'ffmpeg-win64.exe')
    if (existsSync(file)) return file
  }
  return 'ffmpeg'
}
const ffmpeg = await findFfmpeg()
function encode(input, output) {
  return new Promise((resolve, reject) => {
    const encoder = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', `file:${input}`,
      '-c:v', 'libvpx', '-b:v', '2500k', '-crf', '8', '-auto-alt-ref', '0', '-pix_fmt', 'yuv420p', `file:${output}`], { stdio: ['ignore', 'ignore', 'pipe'] })
    let errors = ''
    encoder.stderr.on('data', data => { errors += data })
    encoder.on('error', reject)
    encoder.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${errors}`)))
  })
}

const profile = await mkdtemp(join(tmpdir(), 'foliage-study-browser-'))
const browser = spawn(browserPath, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', 'about:blank',
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
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    if (message.id) {
      const handler = pending.get(message.id); pending.delete(message.id)
      if (message.error) handler?.reject(message.error)
      else handler?.resolve(message.result)
    }
  }
  // A call that takes more than 60 s stops the script with the name of the call.
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} took more than 60 s`)), 60000)
    pending.set(++id, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${origin}/studies/foliage-study.html?capture` })
  for (let i = 0; i < 120 && !(await evaluate('Boolean(window.__capture)').catch(() => false)); i++) await delay(250)
  console.log('Page ready:', await evaluate('Boolean(window.__capture)'))
  const ids = only ? only.split(',') : await evaluate('window.__capture.features')
  const clip = { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 }
  const statsFile = join(out, 'stats.json')
  const stats = existsSync(statsFile) ? JSON.parse(await readFile(statsFile, 'utf8')) : {}

  for (const featureId of ids) {
    const info = await evaluate(`window.__capture.load(${JSON.stringify(featureId)})`)
    // Three frames to compile the shaders and to load the pictures of the sky.
    for (let i = 0; i < 3; i++) {
      await evaluate('window.__capture.frame(0)'); await delay(300)
    }
    // The numbers of the looks. The sheets and the levers have no row in the table of the page.
    if (/^[EH]\d$/.test(featureId)) stats[featureId] = { ...info.stats, drawn: await evaluate('window.__capture.drawn()') }
    const frames = Math.round(info.duration * FPS)
    const stillFrame = Math.round(info.still * FPS)
    const parts = []
    if (stillOnly || !info.clip) {
      const times = stillTimes ?? [info.still]
      let frame = 0
      for (const [index, time] of times.entries()) {
        for (; frame < Math.round(time * FPS); frame++) await evaluate(`window.__capture.frame(${frame === 0 ? 0 : 1 / FPS})`)
        const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90, clip })
        await writeFile(join(out, `${featureId}${stillTimes ? `-${index}` : ''}.jpg`), Buffer.from(data, 'base64'))
      }
      console.log(`${featureId}: pictures at ${times.join(', ')} s`, JSON.stringify(info.stats))
      continue
    }
    for (let frame = 0; frame <= frames; frame++) {
      await evaluate(`window.__capture.frame(${frame === 0 ? 0 : 1 / FPS})`)
      const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90, clip })
      const jpeg = Buffer.from(data, 'base64')
      parts.push(jpeg)
      if (frame % 120 === 0) console.log(`${featureId}: frame ${frame} of ${frames}`)
      if (frame === stillFrame) await writeFile(join(out, `${featureId}.jpg`), jpeg)
    }
    // The ffmpeg of Playwright reads no pipe, so the frames go to one MJPEG file first.
    const stream = join(profile, `${featureId}.mjpeg`)
    await writeFile(stream, Buffer.concat(parts))
    await encode(stream, join(out, `${featureId}.webm`))
    console.log(`${featureId}: ${frames} frames, ${info.duration} s`, JSON.stringify(info.stats))
  }
  if (!process.env.OUT) await writeFile(statsFile, JSON.stringify(Object.fromEntries(Object.entries(stats).sort()), null, 2))
  if (errors.length) console.log('Page errors:', JSON.stringify(errors.slice(0, 5), null, 2))
} finally {
  ws?.close()
  browser.kill()
}
