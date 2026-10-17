// Measures the draw calls, the triangles and the frame time of the skies of the living worlds study,
// on a computer page (1280 × 720) and on a phone page (390 × 844, device scale 3, touch), with the
// real renderer of the lab. A third run is the phone page with a CPU 4 times slower. None of the
// runs is a real phone. Run against a dev server with no hot reload (see docs/living-worlds-study.md):
//   node studies/living-worlds-study/living-worlds-study-bench.mjs "path/to/chrome.exe" [origin]
// It writes public/studies/living-worlds/bench.json.
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openPage } from '../animals-study/cdp.mjs'

const [browser, origin = 'http://127.0.0.1:5197'] = process.argv.slice(2)
if (!browser) throw new Error('Pass a Chromium browser executable as the first argument')
const out = join(process.cwd(), 'public', 'studies', 'living-worlds')
const result = { date: new Date().toISOString().slice(0, 10), frames: 60 }

for (const [device, settings] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844, phone: true }], ['phoneSlow', { width: 390, height: 844, phone: true, throttle: 4 }]]) {
  const page = await openPage(browser, `${origin}/studies/living-worlds-study.html?bench${settings.phone ? '&phone' : ''}`, settings)
  try {
    await page.waitFor('Boolean(window.__bench)', 480)
    if (settings.throttle) await page.send('Emulation.setCPUThrottlingRate', { rate: settings.throttle })
    const info = await page.evaluate('({ gpu: window.__bench.gpu, size: window.__bench.size, views: window.__bench.views })')
    const rows = []
    // One measure first, which is not kept: the first frames compile the shaders.
    await page.evaluate(`window.__bench.measure(${JSON.stringify(info.views[0].id)}, 'today', ${result.frames})`)
    for (const view of info.views) {
      for (const option of Object.keys(view.clips)) {
        const row = await page.evaluate(`window.__bench.measure(${JSON.stringify(view.id)}, ${JSON.stringify(option)}, ${result.frames})`)
        const base = rows.find(item => item.view === view.id && item.option === 'today')
        row.extraCalls = base ? row.calls - base.calls : 0
        rows.push(row)
        console.log(device, view.id, option, `${row.calls} calls (${row.extraCalls >= 0 ? '+' : ''}${row.extraCalls}), ${row.triangles} triangles, ${row.ms} ms, p90 ${row.p90} ms`)
      }
    }
    result[device] = { gpu: info.gpu, ...info.size, throttle: settings.throttle ?? 1, views: info.views.map(view => ({ id: view.id, name: view.name })), rows }
    if (page.errors.length) console.log('Page errors:', JSON.stringify(page.errors.slice(0, 3)).slice(0, 1500))
  } finally { page.close() }
}
await writeFile(join(out, 'bench.json'), JSON.stringify(result, null, 2))
console.log('bench.json written')
