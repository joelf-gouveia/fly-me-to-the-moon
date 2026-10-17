// Records the clips and the pictures of the living worlds study. The study uses the lab and the
// capture script of the feature ideas study; this script gives that script the page and the folder
// of this study, and a lower bit rate.
// Run against a dev server with no hot reload (see docs/living-worlds-study.md):
//   node studies/living-worlds-study/living-worlds-study-capture.mjs "path/to/chrome.exe" [A,B,...] [origin]
// The clips go to public/studies/living-worlds/<id>.webm and the pictures to <id>.jpg.
// The three moment pictures of each clip (<id>-0.jpg to <id>-2.jpg):
//   node studies/living-worlds-study/living-worlds-study-capture.mjs "path/to/chrome.exe" --moments [A,B,...] [origin]
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** The times of the three moments of each clip. They are the `moments` of CLIPS in model.ts. */
export const MOMENTS = {
  T: [2, 7, 12],
  A: [2, 7, 12],
  B: [2, 7, 9.13],
  C: [2, 7, 12],
  V: [2, 7, 12],
  M: [2, 7, 12],
  N: [2, 7, 12],
  L: [2, 7.3, 11.65],
}

process.env.STUDY_OUT ??= 'living-worlds'
process.env.STUDY_PAGE ??= 'living-worlds-study'
process.env.STUDY_BITRATE ??= '2.2M'
const args = process.argv.slice(2)
const moments = args.includes('--moments')
const [browser, only, origin = 'http://127.0.0.1:5197'] = args.filter(arg => arg !== '--moments')
const ids = only ? only.split(',') : Object.keys(MOMENTS)
const script = fileURLToPath(new URL('../feature-ideas-study/feature-ideas-study-capture.mjs', import.meta.url))
// Each clip runs in a new page, so it starts from the same state as its moment pictures.
for (const id of ids) {
  const env = moments ? { ...process.env, STILLS: (MOMENTS[id] ?? [2, 7, 12]).join(',') } : process.env
  const result = spawnSync(process.execPath, [script, browser, ...(moments ? ['--still'] : []), id, origin], { stdio: 'inherit', env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
