// Puts the CSS of the game under one class, so the panels of the game (Worlds, Your fairy, the
// notes) show with their real styles inside a frame of the study page, and nowhere else.
//   - Each selector gets the prefix `.fb-game `. `:root` becomes the frame itself.
//   - The rules for `html` and `body` go: the frame is not a page.
//   - `@media (max-width: …)` and `@media (max-height: …)` become container queries on the frame
//     (`@container fb-view`), so a frame of 390 px gets the phone rules on a wide screen too.
//   - `@keyframes`, `@font-face` and the other media queries stay as they are. `@import` goes.
// The page (main.ts) and the published copy (build-artifact.mjs) use the same function.

const SKIP = new Set(['html', 'body', '#app'])

/** The parts of a list of selectors at depth 0, split at each comma. */
function splitList(text) {
  const parts = []
  let depth = 0, start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1 }
  }
  parts.push(text.slice(start))
  return parts.map(part => part.trim()).filter(Boolean)
}

function scopeSelectors(selectors, prefix) {
  const kept = splitList(selectors).filter(selector => !SKIP.has(selector)).map(selector => {
    if (selector === ':root') return prefix
    if (selector.startsWith(':root')) return prefix + selector.slice(5)
    return `${prefix} ${selector}`
  })
  return kept.join(', ')
}

/** The index of the brace that closes the block that opens at `open`. */
function closing(css, open) {
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return i
  }
  return css.length - 1
}

/** Scopes a block of rules. */
function scopeRules(css, prefix) {
  let out = '', i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    const semi = css.indexOf(';', i)
    // A statement with no block, as @import or @charset.
    if (semi >= 0 && (open < 0 || semi < open) && css.slice(i, semi).trim().startsWith('@')) { i = semi + 1; continue }
    if (open < 0) break
    const head = css.slice(i, open).trim()
    const end = closing(css, open)
    const body = css.slice(open + 1, end)
    if (head.startsWith('@media')) {
      const size = /max-(width|height)/.test(head)
      const rules = scopeRules(body, prefix)
      out += size ? `@container fb-view ${head.slice(6).trim()} {${rules}}\n` : `${head} {${rules}}\n`
    } else if (head.startsWith('@')) {
      // @keyframes, @font-face, @supports and the others: as they are.
      out += `${head} {${body}}\n`
    } else if (head) {
      const scoped = scopeSelectors(head.replace(/\/\*[\s\S]*?\*\//g, ''), prefix)
      if (scoped) out += `${scoped} {${body}}\n`
    }
    i = end + 1
  }
  return out
}

/** The CSS of the game under the class `.fb-game` (or `prefix`). */
export function scopeCss(css, prefix = '.fb-game') {
  return scopeRules(css.replace(/\/\*[\s\S]*?\*\//g, ''), prefix)
}
