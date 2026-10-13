// Builds one copy of the learn and play study for a claude.ai page: the page with its script and
// styles inline, and the files it reads next to it (the clips, the pictures, the cue lists, the
// Webb pictures of the sky and the game icon).
//   node studies/learn-and-play-study/build-artifact.mjs <out folder>
// The out folder then holds page.html and a files.json map for the publish.
import { build } from 'vite'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const out = resolve(process.argv[2] ?? 'artifacts.local/learn-and-play-artifact')
const bundle = join(out, 'bundle')
await rm(out, { recursive: true, force: true })
await build({
  logLevel: 'warn',
  base: './',
  publicDir: false,
  build: { outDir: bundle, emptyOutDir: true, assetsInlineLimit: 100000000, cssCodeSplit: false, modulePreload: false,
    rolldownOptions: { input: 'studies/learn-and-play-study.html', output: { codeSplitting: false } } },
})

// The page: the built script and the styles inline, with no html, head or body tags.
const html = await readFile(join(bundle, 'studies', 'learn-and-play-study.html'), 'utf8')
let page = '<title>Learn and Play Studies</title>\n<meta name="theme-color" content="#070b18">\n'
// The page look as a fixed style block: a strict page policy can refuse a style block that a script adds.
page += `<style data-page-style>${await readFile('studies/feature-ideas-study/page.css', 'utf8')}${await readFile('studies/learn-and-play-study/page.css', 'utf8')}</style>\n`
for (const [, href] of html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)) {
  page += `<style>${(await readFile(join(bundle, 'studies', href), 'utf8')).replaceAll('</style', '<\\/style')}</style>\n`
}
page += '<div id="learn-and-play-study"></div>\n'
for (const [, src] of html.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)) {
  page += `<script type="module">${(await readFile(join(bundle, 'studies', src), 'utf8')).replaceAll('</script', '<\\/script')}</script>\n`
}
// One line end everywhere: the browser reads CR LF as LF before it checks the hash of a block.
await writeFile(join(out, 'page.html'), page.replaceAll(String.fromCharCode(13), ''))

// The files next to the page, at the paths the page asks for (relative to the page).
const files = {}
const add = async (from, to) => { await mkdir(join(out, 'files', to, '..'), { recursive: true }); await cp(from, join(out, 'files', to)); files[to] = join(out, 'files', to) }
for (const name of await readdir('public/studies/learn-and-play')) {
  if (/^F\d+(-\d)?\.(webm|jpg|cues\.json)$/.test(name)) await add(join('public/studies/learn-and-play', name), `studies/learn-and-play/${name}`)
}
for (const name of await readdir('public/sky/webb')) await add(join('public/sky/webb', name), `sky/webb/${name}`)
await add('public/favicon.svg', 'favicon.svg')
await writeFile(join(out, 'files.json'), JSON.stringify(files, null, 2))
const size = (await readFile(join(out, 'page.html'))).length
console.log(`page.html ${(size / 1024).toFixed(0)} KB, ${Object.keys(files).length} files`)
