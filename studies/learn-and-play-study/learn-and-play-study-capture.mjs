// Records the clip and the picture of each feature of the learn and play study (F11 to F20).
// The study uses the lab and the capture script of the feature ideas study; this script gives
// that script the page and the folder of this study.
// Run against the dev server on port 5174:
//   node studies/learn-and-play-study/learn-and-play-study-capture.mjs "path/to/chrome.exe" [F11,F12,...] [origin]
// The clips go to public/studies/learn-and-play/<id>.webm and the pictures to <id>.jpg.
process.env.STUDY_OUT ??= 'learn-and-play'
process.env.STUDY_PAGE ??= 'learn-and-play-study'
await import('../feature-ideas-study/feature-ideas-study-capture.mjs')
