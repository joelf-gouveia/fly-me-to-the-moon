// Records the clips and the pictures of the friend book study (A, B, C, G and P). The study uses
// the lab and the capture script of the feature ideas study; this script gives that script the
// page and the folder of this study, and a lower bit rate (each clip is about 3 to 4 MB).
// Run against a dev server with no hot reload (see docs/friend-book-study.md):
//   node studies/friend-book-study/friend-book-study-capture.mjs "path/to/chrome.exe" [A,B,C,G,P] [origin]
// The clips go to public/studies/friend-book/<id>.webm and the pictures to <id>.jpg.
// The three moment pictures of each clip (<id>-0.jpg to <id>-2.jpg):
//   node studies/friend-book-study/friend-book-study-capture.mjs "path/to/chrome.exe" --moments [A,B,...] [origin]
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** The times of the three moments of each clip. They are the `moments` of CLIPS in model.ts. */
export const MOMENTS = {
  A: [5, 8.2, 9.6],
  B: [3, 3.95, 4.9],
  C: [4.9, 8.4, 10],
  G: [4.4, 7.8, 9.2],
  P: [1.2, 4.4, 7.6],
}

process.env.STUDY_OUT ??= 'friend-book'
process.env.STUDY_PAGE ??= 'friend-book-study'
process.env.STUDY_BITRATE ??= '2.2M'
// Each clip runs in a new page, so it starts from the same state (features/seed.ts) as its moment pictures.
const args = process.argv.slice(2)
const moments = args.includes('--moments')
const [browser, only, origin] = args.filter(arg => arg !== '--moments')
const ids = only ? only.split(',') : Object.keys(MOMENTS)
const script = fileURLToPath(new URL('../feature-ideas-study/feature-ideas-study-capture.mjs', import.meta.url))
for (const id of ids) {
  const env = moments ? { ...process.env, STILLS: MOMENTS[id].join(',') } : process.env
  const result = spawnSync(process.execPath, [script, browser, ...(moments ? ['--still'] : []), id, ...(origin ? [origin] : [])], { stdio: 'inherit', env })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
