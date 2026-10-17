// Records the clips and the pictures of the let go study (T, A, B, C and S). The study uses the lab
// and the capture script of the feature ideas study; this script gives that script the page and
// the folder of this study, and a lower bit rate.
// Run against a dev server with no hot reload (see docs/let-go-study.md):
//   node studies/let-go-study/let-go-study-capture.mjs "path/to/chrome.exe" [T,A,B,C,S] [origin]
// The clips go to public/studies/let-go/<id>.webm and the pictures to <id>.jpg.
// The three moment pictures of each clip (<id>-0.jpg to <id>-2.jpg):
//   node studies/let-go-study/let-go-study-capture.mjs "path/to/chrome.exe" --moments [T,A,...] [origin]
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The times of the three moments of each clip. They are the `moments` of CLIPS in content.ts. */
export const MOMENTS = {
  T: [1.5, 6.6, 10.4],
  A: [1.5, 6.6, 10.4],
  B: [1.5, 6.6, 10.4],
  C: [1.5, 6.6, 10.4],
  S: [2.8, 9.1, 16.5],
}

// The test of the study (model.test.ts) reads MOMENTS. The capture runs only when node runs this file.
const self = fileURLToPath(import.meta.url).toLowerCase()
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === self) capture()

function capture() {
  process.env.STUDY_OUT ??= 'let-go'
  process.env.STUDY_PAGE ??= 'let-go-study'
  process.env.STUDY_BITRATE ??= '2.2M'
  // Each clip runs in a new page, so it starts from the same state (the seed of main.ts) as its moment pictures.
  const args = process.argv.slice(2)
  const moments = args.includes('--moments')
  const [browser, only, origin = 'http://localhost:5197'] = args.filter(arg => arg !== '--moments')
  const ids = only ? only.split(',') : Object.keys(MOMENTS)
  const script = fileURLToPath(new URL('../feature-ideas-study/feature-ideas-study-capture.mjs', import.meta.url))
  for (const id of ids) {
    const env = moments ? { ...process.env, STILLS: MOMENTS[id].join(',') } : process.env
    const result = spawnSync(process.execPath, [script, browser, ...(moments ? ['--still'] : []), id, origin], { stdio: 'inherit', env })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
}
