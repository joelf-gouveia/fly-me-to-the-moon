import { arrive, emptyBook, stickerById, STICKERS } from '../stickers'
import type { Book, Earned, Sticker, StickerId } from '../stickers'

// The sticker data and the book of option A are in src/stickers.ts; the game and this study use the same values.
export {
  arrivalDistance, arrive, earnsSticker, emptyBook, GROUP_NAMES, isStickerId, MILESTONE, parseBook,
  reachesMilestone, stickerById, STICKERS, suggestNext,
} from '../stickers'
export type { Book, Earned, Group, SearchCheck, Sticker, StickerId } from '../stickers'

export type BookOption = 'stamps' | 'search' | 'poster'

export const OPTIONS: Record<BookOption, { letter: string; name: string }> = {
  stamps: { letter: 'A', name: 'Stamp card' },
  search: { letter: 'B', name: 'Hello and search' },
  poster: { letter: 'C', name: 'Space poster' },
}

/** A search is done at the world, so it also counts as an arrival. Only option B has search stickers. */
export function find(book: Book, id: StickerId, option: BookOption): { book: Book; earned: Earned[] } {
  const first = arrive(book, id)
  if (option !== 'search' || first.book.found.includes(id)) return first
  return { book: { ...first.book, found: [...first.book.found, id] }, earned: [...first.earned, { id, kind: 'search' }] }
}

export type Placement = 'placed' | 'closer' | 'further' | 'anywhere' | 'not-earned'
/**
 * Option C: the child puts an earned sticker on a poster path.
 * A wrong path gives a hint and keeps the sticker in the tray. Nothing is lost.
 */
export function place(book: Book, id: StickerId, path: number): { book: Book; result: Placement } {
  if (!book.arrived.includes(id)) return { book, result: 'not-earned' }
  const target = stickerById(id).path
  const result: Placement = target === null ? 'anywhere' : path === target ? 'placed' : path > target ? 'closer' : 'further'
  if ((result === 'placed' || result === 'anywhere') && !book.placed.includes(id)) return { book: { ...book, placed: [...book.placed, id] }, result }
  return { book, result }
}

/** The English name in a sentence: "the Sun", "Mars". */
const called = (sticker: Sticker) => sticker.the ? `the ${sticker.name}` : sticker.name
const Called = (sticker: Sticker) => called(sticker).replace(/^./, letter => letter.toUpperCase())

/** Words for a placement, for the voice and the caption. */
export function placementWords(id: StickerId, result: Placement) {
  const sticker = stickerById(id)
  const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
  if (result === 'anywhere') return `${Called(sticker)} wanders. It can live anywhere on your poster.`
  // The Sun has no path: every wrong place is further out.
  if (result === 'closer' && sticker.id === 'sun') return 'The Sun is in the middle. Tap the middle.'
  if (result === 'closer') return `${Called(sticker)} lives closer to the Sun. Try a smaller path.`
  if (result === 'further') return `${Called(sticker)} lives further from the Sun. Try a bigger path.`
  if (result === 'not-earned') return `Fly to ${called(sticker)} to get this sticker.`
  if (sticker.id === 'sun') return 'Yes! The Sun is in the middle. Everything goes around it.'
  if (sticker.id === 'moon') return 'Yes! The Moon goes around Earth. They go around the Sun together.'
  if (sticker.group === 'dwarf') return `Yes! ${sticker.name} lives in the asteroid belt, between Mars and Jupiter.`
  // The belt path (5) sits between Mars and Jupiter, so planets after it count one less.
  const planet = sticker.path! < 5 ? sticker.path! : sticker.path! - 1
  return `Yes! ${sticker.name} is the ${ordinals[planet]} planet from the Sun.`
}

export type Lang = 'en' | 'pt'
export const LANGS: Record<Lang, { name: string; speech: string }> = {
  en: { name: 'English', speech: 'en' },
  pt: { name: 'Português (Portugal)', speech: 'pt-PT' },
}

/**
 * European Portuguese, in the "tu" form for a child. The article gives the
 * contractions: "do Sol", "da Terra", "de Marte"; "até ao Sol", "até à Terra".
 */
export const PT: Record<StickerId, { name: string; article: '' | 'o' | 'a'; fact: string; task: string; found: string }> = {
  sun: { name: 'Sol', article: 'o', fact: 'O Sol é uma estrela. Dá-nos luz e mantém-nos quentes.', task: 'Voa para perto e sente a luz quente.', found: 'Voaste para dentro da luz do Sol!' },
  mercury: { name: 'Mercúrio', article: '', fact: 'Mercúrio é o planeta mais perto do Sol. Não tem ar e tem muitas crateras.', task: 'Encontra uma cratera, um buraco redondo no chão.', found: 'Encontraste uma cratera!' },
  venus: { name: 'Vénus', article: '', fact: 'Vénus é o planeta mais quente. As nuvens grossas guardam o calor, como um cobertor.', task: 'Voa por baixo das nuvens douradas.', found: 'Voaste por baixo das nuvens douradas!' },
  moon: { name: 'Lua', article: 'a', fact: 'A Lua anda à volta da Terra. Já houve pessoas a andar lá!', task: 'Encontra os mares escuros da Lua.', found: 'Encontraste os mares escuros!' },
  earth: { name: 'Terra', article: 'a', fact: 'A Terra é a nossa casa. É o único mundo que conhecemos com plantas e animais.', task: 'Encontra um pato na água.', found: 'Encontraste um pato!' },
  mars: { name: 'Marte', article: '', fact: 'Marte é vermelho. O seu pó tem ferrugem, como um prego velho.', task: 'Voa baixinho sobre o pó vermelho.', found: 'Voaste sobre o pó vermelho!' },
  vesta: { name: 'Vesta', article: '', fact: 'Vesta tem um buraco gigante lá em baixo. Uma grande rocha bateu-lhe há muito tempo.', task: 'Encontra o buraco gigante lá em baixo.', found: 'Encontraste o buraco gigante!' },
  ceres: { name: 'Ceres', article: '', fact: 'Ceres é a maior bola de rocha da cintura de asteroides. As manchas brilhantes são sal.', task: 'Encontra as manchas brancas brilhantes.', found: 'Encontraste as manchas de sal!' },
  jupiter: { name: 'Júpiter', article: '', fact: 'Júpiter é o maior planeta. Todos os outros planetas cabiam lá dentro.', task: 'Mergulha nas nuvens às riscas.', found: 'Voaste para dentro das riscas!' },
  saturn: { name: 'Saturno', article: '', fact: 'Saturno é muito leve para o seu tamanho. Podia flutuar numa banheira gigante.', task: 'Voa por cima dos anéis.', found: 'Voaste por cima dos anéis!' },
  uranus: { name: 'Úrano', article: '', fact: 'Úrano é o planeta mais frio de todos. É ainda mais frio do que Neptuno.', task: 'Mergulha nas nuvens frias azul-esverdeadas.', found: 'Voaste para dentro das nuvens geladas!' },
  neptune: { name: 'Neptuno', article: '', fact: 'Neptuno tem os ventos mais rápidos de todos os planetas.', task: 'Mergulha nas nuvens azul-escuras.', found: 'Voaste para dentro das nuvens com vento!' },
  fairy: { name: 'Refúgio das Flores', article: 'o', fact: 'O Refúgio das Flores é um mundo de faz de conta. Os unicórnios vivem aqui, mas só nas histórias.', task: 'Diz olá a um unicórnio.', found: 'Encontraste um unicórnio!' },
}

export const stickerName = (id: StickerId, lang: Lang) => lang === 'pt' ? PT[id].name : stickerById(id).name
export const stickerFact = (id: StickerId, lang: Lang) => lang === 'pt' ? PT[id].fact : stickerById(id).fact
export const stickerTask = (id: StickerId, lang: Lang) => lang === 'pt' ? PT[id].task : stickerById(id).search.task

const each = (prefix: string, text: (sticker: Sticker) => string | null) =>
  STICKERS.flatMap(sticker => { const value = text(sticker); return value ? [[`${prefix}-${sticker.id}`, value] as const] : [] })
// Paths run from 0 (the Sun) to 9 (Neptune), so only some hints can happen.
const canBeCloser = (sticker: Sticker) => sticker.path !== null && sticker.path < 9
const canBeFurther = (sticker: Sticker) => sticker.path !== null && sticker.path > 0

const countWords: Record<number, string> = { 4: 'Four', 8: 'Eight', 12: 'Twelve', 16: 'Sixteen', 20: 'Twenty', 24: 'Twenty-four' }
const english: Record<string, string> = Object.fromEntries([
  ...each('hello', sticker => `${sticker.name}! ${sticker.fact}`),
  ...each('task', sticker => `Can you find this? ${sticker.search.task}`),
  ...each('found', sticker => `${sticker.search.found} A shiny star for ${called(sticker)}.`),
  ...each('both', sticker => `You have both ${sticker.name} stickers.`),
  ...each('already', sticker => `You already have the ${sticker.name} sticker.`),
  ...each('fly', sticker => placementWords(sticker.id, 'not-earned')),
  ...each('waiting', sticker => `${Called(sticker)} is waiting. Fly there to get its sticker.`),
  ...each('where', sticker => sticker.path === null ? `${Called(sticker)} wanders. Tap any path.` : sticker.path === 0 ? 'Where does the Sun go? Tap the poster.' : `Where does ${called(sticker)} live? Tap its path.`),
  ...each('placed', sticker => placementWords(sticker.id, sticker.path === null ? 'anywhere' : 'placed')),
  ...each('closer', sticker => canBeCloser(sticker) ? placementWords(sticker.id, 'closer') : null),
  ...each('further', sticker => canBeFurther(sticker) ? placementWords(sticker.id, 'further') : null),
  ...Object.entries(countWords).map(([count, word]) => [`count-${count}`, `${word} stickers! Your book is filling up.`] as const),
  // Two stickers at once can pass a milestone. Then no exact count fits.
  ['filling', 'Look! Your book is filling up.'],
  ['book-full', 'Your book is full! You are a space explorer!'],
  ['poster-ready', 'Every sticker is yours! Now put them on your poster.'],
  ['poster-full', 'Your poster is full! You know the way around the Sun.'],
  ['pick-first', 'Pick a sticker first.'],
  ['review', 'The whole book, for review.'],
  ['empty', 'An empty book. Fly to a world to begin.'],
  ['start', 'Fly to a world to get its sticker.'],
])

const withArticle = (id: StickerId) => PT[id].article ? `${PT[id].article} ${PT[id].name}` : PT[id].name
const subject = (id: StickerId) => withArticle(id).replace(/^./, letter => letter.toUpperCase())
const of = (id: StickerId) => ({ o: `do ${PT[id].name}`, a: `da ${PT[id].name}`, '': `de ${PT[id].name}` })[PT[id].article]
const upTo = (id: StickerId) => ({ o: `até ao ${PT[id].name}`, a: `até à ${PT[id].name}`, '': `até ${PT[id].name}` })[PT[id].article]
const ordinalsPt = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo']
function placedPt(sticker: Sticker) {
  if (sticker.path === null) return `${subject(sticker.id)} anda sempre a passear. Pode ficar em qualquer lado do teu cartaz.`
  if (sticker.id === 'sun') return 'Boa! O Sol fica no meio. Tudo anda à volta dele.'
  if (sticker.id === 'moon') return 'Boa! A Lua anda à volta da Terra. Andam as duas à volta do Sol.'
  if (sticker.group === 'dwarf') return `Boa! ${PT[sticker.id].name} vive na cintura de asteroides, entre Marte e Júpiter.`
  return `Boa! ${subject(sticker.id)} é o ${ordinalsPt[sticker.path < 5 ? sticker.path : sticker.path - 1]} planeta a contar do Sol.`
}
const countWordsPt: Record<number, string> = { 4: 'Quatro', 8: 'Oito', 12: 'Doze', 16: 'Dezasseis', 20: 'Vinte', 24: 'Vinte e quatro' }
const portuguese: Record<string, string> = Object.fromEntries([
  ...each('hello', sticker => `${PT[sticker.id].name}! ${PT[sticker.id].fact}`),
  ...each('task', sticker => `Consegues encontrar isto? ${PT[sticker.id].task}`),
  ...each('found', sticker => `${PT[sticker.id].found} Uma estrela brilhante para ${withArticle(sticker.id)}.`),
  ...each('both', sticker => `Já tens os dois autocolantes ${of(sticker.id)}.`),
  ...each('already', sticker => `Já tens o autocolante ${of(sticker.id)}.`),
  ...each('fly', sticker => `Voa ${upTo(sticker.id)} para ganhares este autocolante.`),
  ...each('waiting', sticker => `${subject(sticker.id)} está à tua espera. Voa até lá para ganhares o autocolante.`),
  ...each('where', sticker => sticker.path === null ? `${subject(sticker.id)} anda sempre a passear. Toca em qualquer caminho.` : sticker.path === 0 ? 'Onde fica o Sol? Toca no cartaz.' : `Onde vive ${withArticle(sticker.id)}? Toca no caminho certo.`),
  ...each('placed', placedPt),
  ...each('closer', sticker => !canBeCloser(sticker) ? null : sticker.id === 'sun' ? 'O Sol fica no meio. Toca no meio.' : `${subject(sticker.id)} vive mais perto do Sol. Experimenta um caminho mais pequeno.`),
  ...each('further', sticker => canBeFurther(sticker) ? `${subject(sticker.id)} vive mais longe do Sol. Experimenta um caminho maior.` : null),
  ...Object.entries(countWordsPt).map(([count, word]) => [`count-${count}`, `${word} autocolantes! O teu livro está a ficar cheio.`] as const),
  ['filling', 'Olha! O teu livro está a ficar cheio.'],
  ['book-full', 'O teu livro está cheio! Exploraste o espaço todo!'],
  ['poster-ready', 'Os autocolantes são todos teus! Agora põe-nos no teu cartaz.'],
  ['poster-full', 'O teu cartaz está completo! Já sabes o caminho à volta do Sol.'],
  ['pick-first', 'Primeiro, escolhe um autocolante.'],
  ['review', 'O livro todo, para rever.'],
  ['empty', 'Um livro vazio. Voa até um mundo para começar.'],
  ['start', 'Voa até um mundo para ganhares o autocolante dele.'],
])

/**
 * Every line that the book can say, by language and key. A recorded voice
 * needs a fixed list: scripts/sticker-voice.mjs makes one audio file per key.
 * The page says one to three keys in a row. Both languages have the same keys.
 */
export const LINES: Record<Lang, Record<string, string>> = { en: english, pt: portuguese }
export const text = (lang: Lang, ...keys: string[]) => keys.map(key => LINES[lang][key] ?? key).join(' ')

const common = ['hello', 'already', 'fly', 'waiting', 'count', 'start']
const OPTION_LINES: Record<BookOption, string[]> = {
  stamps: [...common, 'book-full'],
  search: [...common, 'task', 'found', 'both', 'filling', 'book-full'],
  poster: [...common, 'where', 'placed', 'closer', 'further', 'poster-ready', 'poster-full', 'pick-first'],
}
/** The keys that one option can say. A milestone count at the full book is replaced by the "full" line. */
export function linesFor(option: BookOption) {
  const total = progress(option, emptyBook()).total
  return Object.keys(english).filter(key => OPTION_LINES[option].some(prefix => key === prefix || key.startsWith(`${prefix}-`))
    && !(key.startsWith('count-') && Number(key.slice(6)) >= total))
}

/** Stickers in the book for one option. Option C also counts the placed stickers. */
export function progress(option: BookOption, book: Book) {
  const total = option === 'search' ? STICKERS.length * 2 : STICKERS.length
  const earned = book.arrived.length + (option === 'search' ? book.found.length : 0)
  return { earned, total, placed: option === 'poster' ? book.placed.length : 0, complete: earned === total && (option !== 'poster' || book.placed.length === total) }
}

export const wordCount = (text: string) => text.trim().split(/\s+/).length
export const sentences = (text: string) => text.split(/(?<=[.!?])\s+/)

/** Rough game cost of an option, for the cost panel and the tests. */
export function cost(option: BookOption) {
  const full: Book = { arrived: STICKERS.map(s => s.id), found: option === 'search' ? STICKERS.map(s => s.id) : [], placed: option === 'poster' ? STICKERS.map(s => s.id) : [] }
  const checks = { altitude: 0, place: 0, creature: 0, terrain: 0 }
  if (option === 'search') for (const sticker of STICKERS) checks[sticker.search.check]++
  return {
    stickers: progress(option, emptyBook()).total,
    spokenLines: linesFor(option).length,
    checks,
    newChecks: option === 'search' ? STICKERS.length : 0,
    savedBytes: JSON.stringify(full).length,
    screens: option === 'poster' ? 2 : 1,
  }
}
