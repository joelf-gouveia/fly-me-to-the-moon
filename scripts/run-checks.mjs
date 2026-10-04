// Runs the browser checks of the game at the same time, and gives one result table.
//   node scripts/run-checks.mjs "path/to/chrome.exe" [options]
// Without the path, the script uses the variable CHROME_PATH.
// Options:
//   --changed [base]   only the checks for the files that changed from `base` (default: master),
//                      with the files that are not committed
//   --files a,b        only the checks for these files, for example src/rings.ts
//   --only a,b         only these checks, by name (see CHECKS below)
//   --dry-run          show the selected checks, and stop (this needs no browser)
//   --list             show the checks and the files of each, and stop
//   --jobs n           the number of checks at the same time (default: 4)
//   --origin url       use a dev server that runs; without it, the script starts its own server
//   --swiftshader      software graphics, as on a machine with no graphics card (slow)
//   --timeout s        the time limit of one check in seconds (default: 600; 3600 with --swiftshader)
// The output of each check goes to artifacts.local/checks/<name>.log. The exit code is 1 if a check fails.
import { spawn, execFileSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'

/**
 * The checks. `url` says how a script gets the address of the server: 'arg' is the second
 * argument; the others are the value of FAIRY_TEST_URL ('root' ends with "/", 'test' with
 * "/?test", 'origin' has no end part). `files` are the game files that the check covers: a
 * path, or the start of a path. A check also covers its own script.
 */
const CHECKS = [
  { name: 'browser', script: 'scripts/browser-smoke.mjs', url: 'root', files: ['src/fairy', 'src/customization.ts', 'src/flight-input.ts', 'src/viewport.ts'] },
  { name: 'sky-dancer', script: 'scripts/sky-dancer-smoke.mjs', url: 'root', files: ['src/fairy', 'src/customization.ts'] },
  { name: 'play-modes', script: 'scripts/play-modes-smoke.mjs', url: 'test', files: ['src/adventure', 'src/journey.ts', 'src/mobile-ui.ts'] },
  { name: 'mobile-play', script: 'scripts/mobile-play-smoke.mjs', url: 'root', files: ['src/mobile', 'src/viewport.ts', 'src/flight-input.ts'] },
  { name: 'settings', script: 'scripts/settings-smoke.mjs', url: 'arg', files: ['src/settings', 'src/mobile-ui.ts', 'src/sticker-book'] },
  { name: 'sticker-book', script: 'scripts/sticker-book-smoke.mjs', url: 'arg', files: ['src/stickers.ts', 'src/sticker-book', 'src/adventure'] },
  { name: 'search-stars', script: 'scripts/search-stars-smoke.mjs', url: 'arg', files: ['src/stickers.ts', 'src/search-', 'src/sticker-book', 'src/planet-paint.ts', 'src/sun-', 'src/candy.ts', 'src/weather'] },
  { name: 'blossom', script: 'scripts/blossom-smoke.mjs', url: 'test', files: ['src/relocation.ts', 'src/journey.ts', 'src/candy.ts', 'src/adventure'] },
  { name: 'cotton-candy', script: 'scripts/cotton-candy-smoke.mjs', url: 'arg', files: ['src/cotton-candy.ts', 'src/candy.ts'] },
  { name: 'wildlife', script: 'scripts/wildlife-smoke.mjs', url: 'origin', files: ['src/creatures/'] },
  { name: 'creature-hello', script: 'scripts/creature-hello-smoke.mjs', url: 'arg', files: ['src/creatures/'] },
  { name: 'moon', script: 'scripts/moon-smoke.mjs', url: 'arg', files: ['src/moon.ts', 'src/orbits.ts'] },
  { name: 'asteroid-belt', script: 'scripts/asteroid-belt-smoke.mjs', url: 'arg', files: ['src/belt.ts', 'src/asteroid-belt.ts', 'src/orbits.ts', 'src/relocation.ts'] },
  { name: 'comet', script: 'scripts/comet-smoke.mjs', url: 'arg', files: ['src/comet', 'src/shooting-stars.ts', 'src/relocation.ts', 'src/orbits.ts'] },
  { name: 'star-sky', script: 'scripts/star-sky-smoke.mjs', url: 'arg', files: ['src/stars.ts', 'src/star-', 'src/sky-labels'] },
  { name: 'sun', script: 'scripts/sun-smoke.mjs', url: 'arg', files: ['src/sun-', 'src/daylight.ts'] },
  { name: 'postcard', script: 'scripts/postcard-smoke.mjs', url: 'arg', files: ['src/postcard'] },
  { name: 'sparkle-rings', script: 'scripts/sparkle-rings-smoke.mjs', url: 'arg', files: ['src/rings.ts'] },
  { name: 'seasons', script: 'scripts/seasons-smoke.mjs', url: 'arg', files: ['src/seasons.ts', 'src/season-air.ts', 'src/foliage/'] },
  { name: 'magic-seasons', script: 'scripts/magic-seasons-smoke.mjs', url: 'arg', files: ['src/magic-seasons.ts', 'src/foliage/'] },
  { name: 'weather', script: 'scripts/weather-smoke.mjs', url: 'arg', files: ['src/weather'] },
]

/**
 * A change to one of these files can change each part of the game: all the checks run. A game
 * file that no check covers also runs all the checks.
 */
const CORE = ['src/main.ts', 'src/worlds.ts', 'src/flight.ts', 'src/terrain.ts', 'src/proportions.ts', 'src/style.css', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'scripts/run-checks.mjs']
/** Only these paths can change the game in the browser. A change to a document or a study selects no check. */
const GAME = ['src/', 'public/', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'scripts/']

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const value = (name, fallback) => {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] && !args[at + 1].startsWith('--') ? args[at + 1] : fallback
}
const browserPath = args[0] && !args[0].startsWith('--') ? args[0] : process.env.CHROME_PATH
const software = flag('--swiftshader')
const jobs = Math.max(1, Number(value('--jobs', 4)))
const limit = Number(value('--timeout', software ? 3600 : 600))
const covers = (check, file) => file === check.script || check.files.some(start => file.startsWith(start))

if (flag('--list')) {
  for (const check of CHECKS) console.log(`${check.name.padEnd(15)} ${check.script}\n${' '.repeat(16)}${check.files.join(', ')}`)
  console.log(`\nAll the checks: ${CORE.join(', ')}, and a game file that no check covers.`)
  process.exit(0)
}
if (!browserPath && !flag('--dry-run')) {
  console.error('Pass a Chromium browser executable as the first argument, or set CHROME_PATH. See the top of this file for the options.')
  process.exit(2)
}

/** The checks to run, and one line that says why. */
function selectChecks() {
  if (flag('--only')) {
    const names = value('--only', '').split(',').filter(Boolean)
    const unknown = names.filter(name => !CHECKS.some(check => check.name === name))
    if (unknown.length) { console.error(`No such check: ${unknown.join(', ')}. Use --list.`); process.exit(2) }
    return { checks: CHECKS.filter(check => names.includes(check.name)), why: `--only ${names.join(',')}` }
  }
  if (!flag('--changed') && !flag('--files')) return { checks: CHECKS, why: 'all the checks' }
  const base = value('--changed', 'master')
  const git = (...command) => execFileSync('git', command, { encoding: 'utf8' }).split('\n').map(line => line.trim()).filter(Boolean)
  // The files that changed on this branch, and the files that are not committed (also new files).
  const changed = flag('--files') ? value('--files', '').split(',').filter(Boolean) : [...new Set([...git('diff', '--name-only', `${base}...HEAD`), ...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')])]
  const game = changed.filter(file => GAME.some(start => file.startsWith(start)))
  const core = game.filter(file => CORE.includes(file))
  if (core.length) return { checks: CHECKS, why: `all the checks, because ${core.join(', ')} changed` }
  // A game file under src/ or public/ that no check covers: all the checks, to be safe.
  const loose = game.filter(file => (file.startsWith('src/') || file.startsWith('public/')) && !file.startsWith('public/studies/') && !CHECKS.some(check => covers(check, file)))
  if (loose.length) return { checks: CHECKS, why: `all the checks, because no check covers ${loose.slice(0, 5).join(', ')}` }
  const checks = CHECKS.filter(check => game.some(file => covers(check, file)))
  return { checks, why: flag('--files') ? `${game.length} game files` : `${game.length} changed game files from ${base}` }
}

const freePort = () => new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)) })
})
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const kill = child => {
  if (!child?.pid) return
  // On Windows a child of a child stays alive after kill(): stop the whole tree.
  if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

const { checks, why } = selectChecks()
console.log(`${checks.length} of ${CHECKS.length} checks (${why}), ${jobs} at the same time, ${software ? 'software graphics' : 'the graphics card'}.`)
if (!checks.length) { console.log('No check covers the changed files. Nothing to run.'); process.exit(0) }
if (flag('--dry-run')) { console.log(checks.map(check => check.name).join(', ')); process.exit(0) }

let server
let origin = value('--origin')
if (!origin) {
  const port = await freePort()
  origin = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  let ready = false
  for (let i = 0; i < 120 && !ready; i++) {
    try { ready = (await fetch(`${origin}/`)).ok } catch { await delay(250) }
  }
  if (!ready) { kill(server); console.error('The dev server did not start.'); process.exit(2) }
  console.log(`Dev server at ${origin}.`)
}

const logs = join('artifacts.local', 'checks')
await mkdir(logs, { recursive: true })
const begin = Date.now()
const results = []

/** Runs one check. It passes when its exit code is 0. */
function run(check) {
  return new Promise(resolve => {
    const started = Date.now()
    const address = { root: `${origin}/`, test: `${origin}/?test`, origin }[check.url]
    const child = spawn(process.execPath, [check.script, browserPath, ...(check.url === 'arg' ? [origin] : [])], {
      env: { ...process.env, ...(address ? { FAIRY_TEST_URL: address } : {}), ...(software ? { FAIRY_SWIFTSHADER: '1' } : {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const log = createWriteStream(join(logs, `${check.name}.log`))
    let tail = ''
    const keep = data => { log.write(data); tail = (tail + data).slice(-4000) }
    child.stdout.on('data', keep); child.stderr.on('data', keep)
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; kill(child) }, limit * 1000)
    child.on('close', code => {
      clearTimeout(timer); log.end()
      const seconds = Math.round((Date.now() - started) / 1000)
      const passed = code === 0 && !timedOut
      // The line of the error, for the table.
      const error = passed ? '' : timedOut ? `no result after ${limit} s` : (tail.split('\n').find(line => /^Error|Error:/.test(line.trim())) ?? `exit code ${code}`).trim().slice(0, 160)
      console.log(`${passed ? 'pass' : 'FAIL'}  ${check.name.padEnd(15)} ${String(seconds).padStart(4)} s${error ? `  ${error}` : ''}`)
      resolve({ name: check.name, passed, seconds, error })
    })
  })
}

// A small pool: `jobs` checks at the same time, in the order of the list.
const queue = [...checks]
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  for (let check = queue.shift(); check; check = queue.shift()) results.push(await run(check))
}))
kill(server)

const failed = results.filter(result => !result.passed)
console.log(`\n${results.length - failed.length} of ${results.length} checks pass in ${Math.round((Date.now() - begin) / 1000)} s.${failed.length ? ` Failed: ${failed.map(result => result.name).join(', ')}. See ${logs}/<name>.log.` : ''}`)
process.exit(failed.length ? 1 : 0)
