// Records the clips and the pictures of the fairy home study. The study uses the lab and the
// capture script of the feature ideas study; this script gives that script the page and the
// folder of this study, and a lower bit rate.
// Run against a dev server with no hot reload (see docs/fairy-home-study.md):
//   node studies/fairy-home-study/fairy-home-study-capture.mjs "path/to/chrome.exe" [B,R,W,D,Y,C,G] [origin]
// The clips go to public/studies/fairy-home/<id>.webm and the pictures to <id>.jpg.
// The three moment pictures of each clip (<id>-0.jpg to <id>-2.jpg):
//   node studies/fairy-home-study/fairy-home-study-capture.mjs "path/to/chrome.exe" --moments [B,R,...] [origin]
// The picture sheets: the 23 options (P-0.jpg to P-22.jpg), the 8 homes (H-0.jpg to H-7.jpg) and the parts apart (X-0.jpg):
//   node studies/fairy-home-study/fairy-home-study-capture.mjs "path/to/chrome.exe" --sheets [origin]
// Capture the sheets first: the panel of the clip B shows the pictures of P.

/** The times of the three moments of each clip. They are the `moments` of CLIPS in model.ts. */
export const MOMENTS = {
  B: [4.4, 7.4, 16.4],
  R: [3.3, 7.2, 11.0],
  W: [3.3, 5.2, 9.0],
  D: [3.1, 4.9, 8.5],
  Y: [3.4, 7.4, 9.4],
  C: [2.0, 6.4, 11.2],
  G: [3.4, 7.8, 14.4],
}
/** The picture sheets: one picture in the middle of each second. */
export const SHEETS = { P: 23, H: 8, X: 1 }

// The page (model.ts) reads MOMENTS, so the modules of node load only in node, and the capture runs only when node runs this file.
if (typeof process !== 'undefined' && process.versions?.node && process.argv[1]) {
  const { resolve } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const { spawnSync } = await import('node:child_process')
  if (resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) capture(fileURLToPath, spawnSync)
}

function capture(fileURLToPath, spawnSync) {
  process.env.STUDY_OUT ??= 'fairy-home'
  process.env.STUDY_PAGE ??= 'fairy-home-study'
  process.env.STUDY_BITRATE ??= '2.4M'
  // Each clip runs in a new page, so it starts from the same state (the seed of main.ts) as its moment pictures.
  const args = process.argv.slice(2)
  const moments = args.includes('--moments'), sheets = args.includes('--sheets')
  const rest = args.filter(arg => arg !== '--moments' && arg !== '--sheets')
  const [browser] = rest
  const origin = (sheets ? rest[1] : rest[2]) ?? 'http://localhost:5207'
  const ids = sheets ? Object.keys(SHEETS) : rest[1] ? rest[1].split(',') : Object.keys(MOMENTS)
  const script = fileURLToPath(new URL('../feature-ideas-study/feature-ideas-study-capture.mjs', import.meta.url))
  for (const id of ids) {
    const stills = sheets ? Array.from({ length: SHEETS[id] }, (_, i) => i + 0.5) : moments ? MOMENTS[id] : null
    const env = stills ? { ...process.env, STILLS: stills.join(',') } : process.env
    const result = spawnSync(process.execPath, [script, browser, ...(stills ? ['--still'] : []), id, origin], { stdio: 'inherit', env })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
}
