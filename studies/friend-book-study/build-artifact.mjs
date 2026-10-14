// Builds one copy of the friend book study for a claude.ai page: the page with its script and
// styles inline, and the files it reads next to it (the clips, the pictures, the cue lists, the
// Webb pictures of the sky and the game icon).
//   node studies/friend-book-study/build-artifact.mjs <out folder>
// The out folder then holds page.html and a files.json map for the publish.
import { build } from 'vite'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { scopeCss } from './scope-css.mjs'

const out = resolve(process.argv[2] ?? 'artifacts.local/friend-book-artifact')
const bundle = join(out, 'bundle')
await rm(out, { recursive: true, force: true })
await build({
  logLevel: 'warn',
  base: './',
  publicDir: false,
  build: { outDir: bundle, emptyOutDir: true, assetsInlineLimit: 100000000, cssCodeSplit: false, modulePreload: false,
    rolldownOptions: { input: 'studies/friend-book-study.html', output: { codeSplitting: false } } },
})

// The page: the built script and the styles inline, with no html, head or body tags.
const html = await readFile(join(bundle, 'studies', 'friend-book-study.html'), 'utf8')
let page = '<title>Friend Book Study</title>\n<meta name="theme-color" content="#070b18">\n'
// The page look and the scoped CSS of the game as fixed style blocks: a strict page policy can refuse a style block that a script adds.
page += `<style data-page-style>${await readFile('studies/feature-ideas-study/page.css', 'utf8')}${await readFile('studies/learn-and-play-study/page.css', 'utf8')}${await readFile('studies/friend-book-study/page.css', 'utf8')}</style>\n`
// The same files as GAME_CSS_FILES in features/kit.ts.
const gameFiles = ['src/style.css', 'src/adventure.css', 'src/sticker-book.css', 'src/friend.css', 'src/mobile.css']
page += `<style data-game-style>${scopeCss((await Promise.all(gameFiles.map(file => readFile(file, 'utf8')))).join('\n')).replaceAll('</style', '<\\/style')}</style>\n`
for (const [, href] of html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)) {
  page += `<style>${(await readFile(join(bundle, 'studies', href), 'utf8')).replaceAll('</style', '<\\/style')}</style>\n`
}
page += '<div id="friend-book-study"></div>\n'
for (const [, src] of html.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)) {
  page += `<script type="module">${(await readFile(join(bundle, 'studies', src), 'utf8')).replaceAll('</script', '<\\/script')}</script>\n`
}
// One line end everywhere: the browser reads CR LF as LF before it checks the hash of a block.
await writeFile(join(out, 'page.html'), page.replaceAll(String.fromCharCode(13), ''))

// The files next to the page, at the paths the page asks for (relative to the page).
const files = {}
let total = 0
const add = async (from, to) => {
  await mkdir(join(out, 'files', to, '..'), { recursive: true })
  await cp(from, join(out, 'files', to))
  files[to] = join(out, 'files', to)
  total += (await stat(from)).size
}
for (const name of await readdir('public/studies/friend-book')) {
  if (/^[ABCGP](-\d)?\.(webm|jpg|cues\.json)$/.test(name)) await add(join('public/studies/friend-book', name), `studies/friend-book/${name}`)
}
for (const name of await readdir('public/sky/webb')) await add(join('public/sky/webb', name), `sky/webb/${name}`)
await add('public/favicon.svg', 'favicon.svg')
await writeFile(join(out, 'files.json'), JSON.stringify(files, null, 2))
const size = (await readFile(join(out, 'page.html'))).length
console.log(`page.html ${(size / 1024).toFixed(0)} KB, ${Object.keys(files).length} files, ${(total / 1024 / 1024).toFixed(1)} MB`)
