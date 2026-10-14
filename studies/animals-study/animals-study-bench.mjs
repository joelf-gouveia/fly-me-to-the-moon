// Measures the draw calls and the frame time of each option of the animals study, on a computer
// page (1280 × 720) and on a phone page (390 × 844, device scale 3, touch), with the real renderer
// of the lab. It also takes the pictures of each option: the savanna view, with its numbers.
// Run against a dev server with no hot reload (see docs/animals-study.md):
//   node studies/animals-study/animals-study-bench.mjs "path/to/chrome.exe" [origin]
// It writes public/studies/animals/bench.json, D-<option>.jpg (computer) and P-<option>.jpg (phone).
// A third run is the phone page with a CPU 4 times slower. None of the runs is a real phone.
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openPage } from './cdp.mjs'

const [browser, origin = 'http://127.0.0.1:5192'] = process.argv.slice(2)
if (!browser) throw new Error('Pass a Chromium browser executable as the first argument')
const out = join(process.cwd(), 'public', 'studies', 'animals')
const OPTIONS = ['none', 'today', 'A', 'B', 'C']
const NAMES = { none: 'No animals', today: 'Today: 4 kinds, one mesh for each part', A: 'A · 14 kinds, one mesh for each part', B: 'B · 27 kinds, herds instanced', C: 'C · 31 kinds, few models and a living layer' }
const result = { date: new Date().toISOString().slice(0, 10), frames: 90 }

// phoneSlow: the phone page with the CPU of the page 4 times slower (DevTools CPU throttling), nearer to a phone.
for (const [device, settings] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844, phone: true }], ['phoneSlow', { width: 390, height: 844, phone: true, throttle: 4 }]]) {
  const page = await openPage(browser, `${origin}/studies/animals-study.html?bench${settings.phone ? '&phone' : ''}`, settings)
  try {
    await page.waitFor('Boolean(window.__bench)', 240)
    if (settings.throttle) await page.send('Emulation.setCPUThrottlingRate', { rate: settings.throttle })
    const info = await page.evaluate('({ gpu: window.__bench.gpu, size: window.__bench.size, views: window.__bench.views })')
    const rows = []
    for (const view of info.views) {
      for (const option of OPTIONS) {
        const row = await page.evaluate(`window.__bench.measure(${JSON.stringify(view.id)}, ${JSON.stringify(option)}, ${result.frames})`)
        const base = rows.find(item => item.view === view.id && item.option === 'none')
        row.animalCalls = base ? row.calls - base.calls : 0
        rows.push(row)
        console.log(device, view.id, option, `${row.calls} calls (${row.animalCalls} for the animals), ${row.ms} ms, p90 ${row.p90} ms, ${row.shown} animals`)
        if (view.id === 'savanna' && option !== 'none' && !settings.throttle) {
          await page.evaluate(`window.__bench.label(${JSON.stringify(`${NAMES[option]} · ${row.calls} draw calls (${row.animalCalls} for the animals) · ${row.ms} ms`)})`)
          await page.evaluate('new Promise(resolve => setTimeout(resolve, 200))')
          await writeFile(join(out, `${device === 'phone' ? 'P' : 'D'}-${option}.jpg`), await page.screenshot())
        }
      }
    }
    result[device] = { gpu: info.gpu, ...info.size, throttle: settings.throttle ?? 1, views: info.views, rows }
    if (page.errors.length) console.log('Page errors:', JSON.stringify(page.errors.slice(0, 3)).slice(0, 1500))
  } finally { page.close() }
}
await writeFile(join(out, 'bench.json'), JSON.stringify(result, null, 2))
console.log('bench.json written')
