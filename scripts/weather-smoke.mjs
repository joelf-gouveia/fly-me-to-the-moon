// Checks the weather of Earth in the real game: the weather map, the new clouds, the rain, the snow
// under a snow cloud, the mist, the thunder far away, the soft light and the short view in the rain,
// the wind of the plants, and the stars under a cloud. It takes a picture of each weather.
// Run against the dev server on port 5174:
//   node scripts/weather-smoke.mjs "path/to/chrome.exe" [origin]
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const browserPath = process.argv[2]
const origin = process.argv[3] ?? 'http://127.0.0.1:5174'
if (!browserPath) throw new Error('Pass a Chromium browser executable as the first argument')
const out = 'artifacts.local/weather'
await mkdir(out, { recursive: true })
const profile = await mkdtemp(join(tmpdir(), 'weather-browser-'))
const browser = spawn(browserPath, [
  // Port 0: Chrome picks a free port, so parallel test runs do not share a browser.
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
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
    // index.html has no icon link, so the browser asks for /favicon.ico; that 404 is not a season error.
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry)
    // A shader that does not compile gives a console error from three.js.
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' ').slice(0, 600))
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
  const picture = async name => {
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    await writeFile(join(out, name), Buffer.from(data, 'base64'))
  }
  /** Opens the game with one weather for the whole planet (or the weather of the map), starts the flight and waits. */
  async function open(weather, year = 0.125, width = 1280, height = 720, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 })
    await send('Page.navigate', { url: `${origin}/?test&year=${year}${weather ? `&weather=${weather}` : ''}` })
    for (let i = 0; i < 120 && !(await evaluate('typeof __fairyTest !== "undefined"').catch(() => false)); i++) await delay(250)
    await evaluate('document.querySelector("#begin-button").click()')
    await delay(4500)
    return snapshot()
  }
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  const line = (name, state) => console.log(`${name}: ${state.weather.kind}, cover ${state.weather.cover.toFixed(2)}, rain ${state.weather.rain.toFixed(2)}, wind ${state.weather.wind.toFixed(2)}, fog ${state.weather.fog.toFixed(4)}, Sun light ${state.weather.sunlight.toFixed(2)}, draw calls ${state.graphics.calls}, triangles ${state.graphics.triangles}`)

  const clear = await open('clear')
  assert(clear.weather.kind === 'clear', `Clear: the weather is ${clear.weather.kind}`)
  assert(clear.weather.cover < 0.02 && !clear.weather.rainLines, 'Clear: the sky has cloud or rain')
  assert(clear.weather.map === 128, `The map is ${clear.weather.map} wide`)
  for (const name of ['weather-heaps', 'weather-wisps', 'weather-curtains', 'weather-layer']) assert(clear.weather.clouds.includes(name), `Earth has no ${name}`)
  assert(clear.weather.clouds.every(name => name.startsWith('weather-')), 'Earth has the puffs of before')
  assert(Math.abs(clear.weather.sunlight - 2.4) < 0.05, `Clear: the Sun light is ${clear.weather.sunlight}`)
  assert(clear.weather.wind < 1.4, `Clear: the wind is ${clear.weather.wind}`)
  await picture('clear.jpg'); line('clear', clear)

  const rain = await open('rain')
  assert(rain.weather.kind === 'rain', `Rain: the weather is ${rain.weather.kind}`)
  assert(rain.weather.cover > 0.9 && rain.weather.rain > 0.8 && rain.weather.rainLines, 'Rain: no rain at the camera')
  assert(rain.weather.sunlight < clear.weather.sunlight * 0.5, `Rain: the Sun light is ${rain.weather.sunlight}`)
  assert(rain.weather.fog > clear.weather.fog * 2, `Rain: the fog is ${rain.weather.fog}`)
  assert(rain.weather.wind > clear.weather.wind + 0.8, `Rain: the wind is ${rain.weather.wind}`)
  assert(!rain.season.airVisible || rain.season.air < 0.6, 'Rain: the petals fall as with no rain')
  await picture('rain.jpg'); line('rain', rain)

  // In the winter of the north the rain is snow at the start meadow, and it falls from a cloud only.
  const snow = await open('rain', 0.875)
  assert(snow.weather.kind === 'snow', `Snow: the weather is ${snow.weather.kind}`)
  assert(snow.season.airVisible && !snow.weather.rainLines, 'Snow: no snow in the air, or rain lines')
  await picture('snow.jpg'); line('snow', snow)
  const cold = await open('clear', 0.875)
  assert(!cold.season.airVisible, 'A clear winter sky has snow in the air')

  const mist = await open('mist')
  assert(mist.weather.kind === 'mist' && mist.weather.mist > 0.9, `Mist: the weather is ${mist.weather.kind}`)
  assert(mist.weather.fog > clear.weather.fog * 4, `Mist: the fog is ${mist.weather.fog}`)
  await picture('mist.jpg'); line('mist', mist)

  const storm = await open('storm')
  assert(storm.weather.storm > 0.8, `Storm: the thunder is ${storm.weather.storm}`)
  await picture('storm.jpg'); line('storm', storm)

  // The weather of the map: clear places and cloud on one planet.
  const map = await open(null)
  assert(map.weather.mapCover > 0.08 && map.weather.mapCover < 0.6, `The map has a mean cover of ${map.weather.mapCover}`)
  await picture('map.jpg'); line('map', map)

  const phone = await open('rain', 0.125, 390, 844, true)
  assert(phone.weather.rainLines, 'Phone: no rain')
  assert(phone.weather.map === 64, `Phone: the map is ${phone.weather.map} wide`)
  assert(!phone.weather.clouds.includes('weather-wisps'), 'Phone: the high wisps are on')
  await picture('phone-rain.jpg'); line('phone', phone)

  assert(errors.length === 0, `Page errors: ${JSON.stringify(errors.slice(0, 3), null, 1)}`)
  console.log('The weather check passed. Pictures:', out)
} finally {
  ws?.close()
  browser.kill()
}
