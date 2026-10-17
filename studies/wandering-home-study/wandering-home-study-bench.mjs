// Measures Blossom Haven at each size of the wandering home study: the time of the build, the plants,
// the animals, the triangles, the draw calls and the frame time from space and on the ground. It
// runs a computer page (1280 × 720) and a phone page (390 × 844, the phone budget of the game),
// and the phone page again with a CPU 4 times slower. None of the runs is a real phone.
// Run against a dev server with no hot reload (see docs/wandering-home-study.md):
//   node studies/wandering-home-study/wandering-home-study-bench.mjs "path/to/chrome.exe" [origin]
// It writes public/studies/wandering-home/bench.json.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openPage } from '../animals-study/cdp.mjs'

const [browser, origin = 'http://127.0.0.1:5196'] = process.argv.slice(2)
if (!browser) throw new Error('Pass a Chromium browser executable as the first argument')
const out = join(process.cwd(), 'public', 'studies', 'wandering-home')
await mkdir(out, { recursive: true })
const result = { date: new Date().toISOString().slice(0, 10), frames: 60, devices: {} }

for (const [device, settings] of [['desktop', { width: 1280, height: 720 }], ['phone', { width: 390, height: 844, phone: true }], ['phoneSlow', { width: 390, height: 844, phone: true, throttle: 4 }]]) {
  const page = await openPage(browser, `${origin}/studies/wandering-home-study.html?bench${settings.phone ? '&phone' : ''}`, settings)
  try {
    await page.waitFor('Boolean(window.__bench)', 240)
    if (settings.throttle) await page.send('Emulation.setCPUThrottlingRate', { rate: settings.throttle })
    const info = await page.evaluate('({ gpu: window.__bench.gpu, sizes: window.__bench.sizes })')
    const rows = []
    // One build first, not kept: the first frame of the page compiles the shaders of the home.
    await page.evaluate('window.__bench.measure("today", 10)')
    for (const size of info.sizes) {
      const row = await page.evaluate(`window.__bench.measure(${JSON.stringify(size)}, ${result.frames})`)
      rows.push(row)
      console.log(device, size, `build ${row.build} ms, upload ${row.upload} ms, ${row.instances} instances, ${row.animals} animals, space ${row.space.ms} ms ${row.space.triangles} tris, ground ${row.ground.ms} ms ${row.ground.calls} calls`)
    }
    result.devices[device] = { gpu: info.gpu, rows }
    if (page.errors.length) console.log('Page errors:', JSON.stringify(page.errors.slice(0, 3)))
  } finally {
    page.close()
  }
}
await writeFile(join(out, 'bench.json'), JSON.stringify(result, null, 2))
console.log('Wrote', join(out, 'bench.json'))
