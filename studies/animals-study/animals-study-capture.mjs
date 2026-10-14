// Records the clips and the pictures of the animals study (A, B, C, S, W, H and L). The study uses
// the lab and the capture script of the feature ideas study; this script gives that script the page
// and the folder of this study, and a lower bit rate (each clip is about 3 to 4 MB).
// Run against a dev server with no hot reload (see docs/animals-study.md):
//   node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe" [A,B,...] [origin]
// The clips go to public/studies/animals/<id>.webm and the pictures to <id>.jpg.
// The three moment pictures of each clip (<id>-0.jpg to <id>-2.jpg):
//   node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe" --moments [A,B,...] [origin]
// The pictures of the cards of the book (cards/<species>.jpg), from the joined models:
//   node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe" --cards [origin]
import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openPage } from './cdp.mjs'

/** The times of the three moments of each clip. They are the `moments` of CLIPS in model.ts. */
export const MOMENTS = {
  A: [1.5, 5.5, 11.5],
  B: [1.5, 5.5, 11.5],
  C: [1.5, 5.5, 11.5],
  S: [4.5, 6.5, 10.5],
  W: [3, 6, 7],
  H: [2.8, 6, 11],
  L: [2, 4, 9.5],
}

process.env.STUDY_OUT ??= 'animals'
process.env.STUDY_PAGE ??= 'animals-study'
process.env.STUDY_BITRATE ??= '2.2M'
// Each clip runs in a new page, so it starts from the same state (the seed of the friend book study) as its moment pictures.
const args = process.argv.slice(2)
if (args.includes('--cards')) {
  const [chrome, host = 'http://127.0.0.1:5192'] = args.filter(arg => arg !== '--cards')
  const page = await openPage(chrome, `${host}/studies/animals-study.html?cards`)
  try {
    await page.waitFor('typeof window.__cards === "function"')
    const pictures = await page.evaluate('window.__cards()')
    const folder = join(process.cwd(), 'public', 'studies', 'animals', 'cards')
    await mkdir(folder, { recursive: true })
    for (const [id, url] of Object.entries(pictures)) await writeFile(join(folder, `${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'))
    console.log(`${Object.keys(pictures).length} card pictures`)
  } finally { page.close() }
  process.exit(0)
}
const moments = args.includes('--moments')
const [browser, only, origin = 'http://127.0.0.1:5192'] = args.filter(arg => arg !== '--moments')
const ids = only ? only.split(',') : Object.keys(MOMENTS)
const script = fileURLToPath(new URL('../feature-ideas-study/feature-ideas-study-capture.mjs', import.meta.url))
for (const id of ids) {
  const env = moments ? { ...process.env, STILLS: MOMENTS[id].join(',') } : process.env
  const result = spawnSync(process.execPath, [script, browser, ...(moments ? ['--still'] : []), id, origin], { stdio: 'inherit', env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
