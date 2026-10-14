import { FRIEND, FRIEND_KINDS, friendName, hasFriendGift } from './friend'
import type { FriendKind, FriendState } from './friend'

// The animal book (docs/friend-book-study.md, design A): a card for each kind that can be the
// fairy friend. The book is the `met` list of the saved friend (src/friend.ts): it needs no data of
// its own. The page in Worlds is in src/animal-book-ui.ts.

/**
 * The small pictures of the facts: drawings of the game, not emoji, because an emoji looks
 * different on each device (as the faces of the thermometer in src/warmth.ts). Each one is in a
 * box of 24 × 24.
 */
const ICONS = {
  grass: '<path d="M4 21.5C5 16 4 12 1.8 8.8c3.4 2 5.6 6.3 5.9 12.7Z" fill="#6cc25e"/><path d="M9.6 21.5c-.2-6.8 1-12.7 3.2-17.3.8 5.3.8 11.4-.4 17.3Z" fill="#46a246"/><path d="M14.2 21.5c.4-5.2 2.6-9.4 7-11.6-2.6 3.2-3.8 7.2-3.8 11.6Z" fill="#82d26b"/>',
  milk: '<path d="M9 4.5h6v2.3l2.3 3.4V20a2 2 0 0 1-2 2H8.7a2 2 0 0 1-2-2v-9.8L9 6.8Z" fill="#fff" stroke="#8eaac4" stroke-width="1.2" stroke-linejoin="round"/><rect x="8.4" y="1.6" width="7.2" height="3.2" rx="1.2" fill="#4f93dd"/><path d="M6.7 13h10.6v3.6H6.7Z" fill="#8fc4f2"/>',
  barn: '<path d="M3.5 11.5 12 4.5l8.5 7V21h-17Z" fill="#dc5a4e"/><path d="M2.2 11.8 12 3.6l9.8 8.2" fill="none" stroke="#fff3e3" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><rect x="8.6" y="13.6" width="6.8" height="7.4" fill="#fff3e3"/><path d="M8.6 13.6l6.8 7.4M15.4 13.6l-6.8 7.4" stroke="#dc5a4e" stroke-width="1.2"/>',
  cottage: '<path d="M5 11h14v10.5H5Z" fill="#fff0d6"/><path d="M2.6 12.2 12 4.2l9.4 8Z" fill="#e47aa8" stroke="#c4568a" stroke-width="1" stroke-linejoin="round"/><path d="M9.8 21.5v-4.2a2.2 2.2 0 0 1 4.4 0v4.2Z" fill="#b06e4c"/><circle cx="16.4" cy="14.6" r="1.5" fill="#8fd2ff"/>',
  carrot: '<path d="M16.6 7.4c-1.9-1.9-4.5-1.6-6 0L3.4 19.4c-.6.9.3 1.8 1.2 1.2l12-7.2c1.6-1.5 1.9-4.1 0-6Z" fill="#f28a26"/><path d="M8.6 12.3l1.6 1.6M6.2 15.5l1.3 1.3M12 10.2l1.2 1.2" stroke="#c4650e" stroke-width="1.1" stroke-linecap="round"/><path d="M16 8 20.6 3.4M17 9.2l4.8-1.5M14.8 7.2 15.6 2.2" stroke="#46a246" stroke-width="2" stroke-linecap="round"/>',
  ears: '<g transform="rotate(-13 8 12)"><ellipse cx="8" cy="11.5" rx="3.3" ry="9.2" fill="#c8916a"/><ellipse cx="8" cy="12" rx="1.6" ry="6.6" fill="#f7b3c7"/></g><g transform="rotate(13 16 12)"><ellipse cx="16" cy="11.5" rx="3.3" ry="9.2" fill="#c8916a"/><ellipse cx="16" cy="12" rx="1.6" ry="6.6" fill="#f7b3c7"/></g>',
  burrow: '<path d="M1.5 21.5c1-7.3 5.4-11.4 10.5-11.4s9.5 4.1 10.5 11.4Z" fill="#a8774d"/><path d="M7.4 21.5v-2.8a4.6 4.6 0 0 1 9.2 0v2.8Z" fill="#3b2516"/><path d="M3.6 21.3c.2-1.4 1-2.3 2-2.7M20.4 21.3c-.2-1.4-1-2.3-2-2.7" stroke="#6cc25e" stroke-width="1.6" stroke-linecap="round"/>',
  wool: '<circle cx="12" cy="11.6" r="8.6" fill="#f4b8d1"/><path d="M4.6 8.6c4.2-1.2 9.8-.3 14 3.8M4 12.8c5.2-1 10.2 1 13.4 6M8 3.8c3 3 4.2 9 2.2 15.4M13.4 3.2c2 2.2 3.2 6 2.6 10.2" fill="none" stroke="#d27aa0" stroke-width="1.2" stroke-linecap="round"/><path d="M18.8 17.8c2 .9 3 2.4 2.6 4.2" fill="none" stroke="#d27aa0" stroke-width="1.4" stroke-linecap="round"/>',
  water: '<path d="M12 2.2c3.4 4.4 5.4 7.6 5.4 10a5.4 5.4 0 0 1-10.8 0c0-2.4 2-5.6 5.4-10Z" fill="#56b2ee"/><path d="M9.4 12.4a2.8 2.8 0 0 0 1.8 2.8" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><path d="M2 20.2q2.5-2.4 5 0t5 0 5 0 5 0" fill="none" stroke="#56b2ee" stroke-width="1.8" stroke-linecap="round"/>',
  egg: '<path d="M12 2.6c3.9 0 6.7 6.1 6.7 10.7a6.7 6.7 0 0 1-13.4 0C5.3 8.7 8.1 2.6 12 2.6Z" fill="#fff3d8" stroke="#d6b27e" stroke-width="1.2"/><path d="M8.6 9.6c.4-1.6 1.2-3 2.2-3.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
  feather: '<path d="M20 3.2C12 3.6 6.4 9.4 5.6 17.2l-.9 2 1.2.6 1-1.9C15 16.4 19.6 10.8 20 3.2Z" fill="#e2ad66"/><path d="M4.2 21.2 17.4 6" stroke="#93622a" stroke-width="1.2" stroke-linecap="round"/><path d="M9.6 12.4l3.4.3M8 15.2l3.6.4M12 9.8l3 .2" stroke="#fff3df" stroke-width="1" stroke-linecap="round"/>',
  rainbow: '<path d="M2.4 19a9.6 9.6 0 0 1 19.2 0" fill="none" stroke="#ef5f6a" stroke-width="2.6"/><path d="M5.4 19a6.6 6.6 0 0 1 13.2 0" fill="none" stroke="#f6c33f" stroke-width="2.6"/><path d="M8.4 19a3.6 3.6 0 0 1 7.2 0" fill="none" stroke="#56b2ee" stroke-width="2.6"/>',
  horn: '<path d="M12 1.8 16.8 21.5H7.2Z" fill="#f3c33f" stroke="#c88d18" stroke-width="1" stroke-linejoin="round"/><path d="M10.3 8.2l4 1.2M9.2 12.6l5.9 1.6M8.2 17.2l7.7 2" stroke="#c88d18" stroke-width="1.3" stroke-linecap="round"/>',
  tails: '<g transform="rotate(-36 12 21.5)"><ellipse cx="12" cy="12.6" rx="3.2" ry="8" fill="#f4a466"/><ellipse cx="12" cy="6.4" rx="2.4" ry="2.2" fill="#fff6ea"/></g><g transform="rotate(36 12 21.5)"><ellipse cx="12" cy="12.6" rx="3.2" ry="8" fill="#f4a466"/><ellipse cx="12" cy="6.4" rx="2.4" ry="2.2" fill="#fff6ea"/></g><ellipse cx="12" cy="12" rx="3.4" ry="8.6" fill="#f7b57b"/><ellipse cx="12" cy="5.4" rx="2.5" ry="2.3" fill="#fff6ea"/>',
  wing: '<path d="M2.6 16.4C4.8 9.2 10.6 5 21.4 4c-2 3-3.4 5-6.2 6.6 2 .1 3.6-.2 5.1-.8-1.6 2.9-4.1 4.6-7.2 5.1 1.3.4 2.7.4 4 0-3 3.1-8.6 4.6-14.5 1.5Z" fill="#d2c9f6" stroke="#8a7fcd" stroke-width="1.1" stroke-linejoin="round"/>',
  candy: '<path d="M12 13.5v8.3" stroke="#d9c39b" stroke-width="2" stroke-linecap="round"/><path d="M7 14.4a4 4 0 0 1-.6-7.9 5.1 5.1 0 0 1 9.7-1.6 4.2 4.2 0 0 1 1.5 9.5Z" fill="#ff9acd"/><path d="M8.6 9.4a2.6 2.6 0 0 1 2.4-2.2" fill="none" stroke="#ffd6eb" stroke-width="1.5" stroke-linecap="round"/>',
  feet: '<g fill="#6fc3a2"><ellipse cx="7.6" cy="16.2" rx="2.7" ry="3.6"/><circle cx="5" cy="11.3" r="1.2"/><circle cx="7.6" cy="10.3" r="1.2"/><circle cx="10.2" cy="11.3" r="1.2"/><ellipse cx="16.4" cy="9.2" rx="2.7" ry="3.6"/><circle cx="13.8" cy="4.3" r="1.2"/><circle cx="16.4" cy="3.3" r="1.2"/><circle cx="19" cy="4.3" r="1.2"/></g>',
  fox: '<path d="M3 3.6 8.2 8.8h7.6L21 3.6l-1 9.4c-1.5 4.6-4.6 7.4-8 7.4s-6.5-2.8-8-7.4Z" fill="#f4994e"/><path d="M6.8 14.2c1.6 3 3.2 4.6 5.2 4.6s3.6-1.6 5.2-4.6c-1.6.6-3.4.9-5.2.9s-3.6-.3-5.2-.9Z" fill="#fff3e4"/><circle cx="8.9" cy="12" r="1.1" fill="#3b2516"/><circle cx="15.1" cy="12" r="1.1" fill="#3b2516"/><circle cx="12" cy="16" r="1.1" fill="#3b2516"/>',
  paw: '<g fill="#c88a5a"><path d="M12 11.6c3 0 5.6 2.8 5.6 5.6 0 2.2-1.6 3.4-3.2 3.4-1 0-1.6-.6-2.4-.6s-1.4.6-2.4.6c-1.6 0-3.2-1.2-3.2-3.4 0-2.8 2.6-5.6 5.6-5.6Z"/><ellipse cx="5.4" cy="10.2" rx="1.9" ry="2.5"/><ellipse cx="9.4" cy="6.4" rx="1.9" ry="2.6"/><ellipse cx="14.6" cy="6.4" rx="1.9" ry="2.6"/><ellipse cx="18.6" cy="10.2" rx="1.9" ry="2.5"/></g>',
  crown: '<path d="M2.8 7.8 7.4 12 12 4.6l4.6 7.4 4.6-4.2-2 11.6H4.8Z" fill="#f3c33f" stroke="#c88d18" stroke-width="1.1" stroke-linejoin="round"/><circle cx="12" cy="15" r="1.7" fill="#e85d8a"/><circle cx="7.6" cy="15.6" r="1.1" fill="#56b2ee"/><circle cx="16.4" cy="15.6" r="1.1" fill="#56b2ee"/>',
  lily: '<path d="M12 15.6 21 12.4A9.4 6.6 0 1 1 16.6 9.2Z" fill="#5fb85a"/><path d="M12 14.2c-1.4-2.6-1.2-4.9 0-6.6 1.2 1.7 1.4 4 0 6.6Zm0 0c-2.4-1-3.9-2.8-4.1-5 2 .2 3.6 1.8 4.1 5Zm0 0c.5-3.2 2.1-4.8 4.1-5-.2 2.2-1.7 4-4.1 5Z" fill="#ff8cbd"/>',
  bubbles: '<circle cx="9" cy="14.4" r="5.6" fill="#dff3ff" stroke="#56b2ee" stroke-width="1.3"/><circle cx="17.2" cy="7.4" r="3.6" fill="#dff3ff" stroke="#56b2ee" stroke-width="1.2"/><circle cx="18.4" cy="17.6" r="2.1" fill="#dff3ff" stroke="#56b2ee" stroke-width="1.1"/><path d="M6.2 12.6a3.2 3.2 0 0 1 2.2-2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  star: `<path d="M${Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.6 : 10.6
    return `${(12 + Math.cos(angle) * r).toFixed(2)} ${(12.8 + Math.sin(angle) * r).toFixed(2)}`
  }).join('L')}Z" fill="#ffd24a" stroke="#c47a0c" stroke-width="1" stroke-linejoin="round"/>`,
} as const

export type IconId = keyof typeof ICONS

/** A small picture of a fact, as an SVG. It has no text: the word is next to it, or in the note. */
export function factIcon(id: IconId) {
  return `<svg class="fact-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg>`
}

/** One picture fact: a small picture and a short word for the grown-up who reads it aloud. */
export type Fact = readonly [icon: IconId, word: string]
export type AnimalCard = {
  /** "Real animals" live on Earth; "story creatures" live on Blossom Haven. */
  group: 'real' | 'story'
  world: 'earth' | 'fairy'
  /** Three picture facts. */
  facts: readonly [Fact, Fact, Fact]
  /** The place where she can meet the kind: a kind of place, not a fixed place, so it is true on each new Earth. */
  place: Fact
}

/** The nine cards. The facts of the story creatures come from their notes in src/creatures/fairytale.ts. */
export const ANIMAL_CARDS: Record<FriendKind, AnimalCard> = {
  cow: { group: 'real', world: 'earth', facts: [['grass', 'Eats grass'], ['milk', 'Gives milk'], ['barn', 'Lives on a farm']], place: ['grass', 'In the meadow'] },
  rabbit: { group: 'real', world: 'earth', facts: [['carrot', 'Eats carrots'], ['ears', 'Long ears'], ['burrow', 'Lives in a burrow']], place: ['grass', 'In the meadow'] },
  sheep: { group: 'real', world: 'earth', facts: [['grass', 'Eats grass'], ['wool', 'Gives wool'], ['barn', 'Lives on a farm']], place: ['grass', 'In the meadow'] },
  duck: { group: 'real', world: 'earth', facts: [['water', 'Swims'], ['egg', 'Lays eggs'], ['feather', 'Has feathers']], place: ['water', 'On the water'] },
  unicorn: { group: 'story', world: 'fairy', facts: [['rainbow', 'Rainbow mane'], ['horn', 'Golden horn'], ['grass', 'Grazes in the meadow']], place: ['grass', 'In the meadow'] },
  dragonling: { group: 'story', world: 'fairy', facts: [['wing', 'Tiny wings'], ['candy', 'Puffs candy floss'], ['feet', 'Waddles in a herd']], place: ['grass', 'In the meadow'] },
  kitsune: { group: 'story', world: 'fairy', facts: [['fox', 'A fox cub'], ['tails', 'Three wish tails'], ['paw', 'Hops and stops']], place: ['grass', 'In the meadow'] },
  frogPrince: { group: 'story', world: 'fairy', facts: [['crown', 'Golden crown'], ['lily', 'Rides a lily pad'], ['bubbles', 'Wishing bubbles']], place: ['bubbles', 'On the soda water'] },
  pegasus: { group: 'story', world: 'fairy', facts: [['wing', 'Flies on wings'], ['star', 'Starry mane'], ['cottage', 'Over the cottage']], place: ['cottage', 'Over the cottage'] },
}

/** The two groups of the book, in the order of the page. */
export const BOOK_GROUPS = [
  { id: 'real', title: 'Real animals', where: 'on Earth', kinds: FRIEND_KINDS.filter(kind => ANIMAL_CARDS[kind].group === 'real') },
  { id: 'story', title: 'Story creatures', where: 'on Blossom Haven', kinds: FRIEND_KINDS.filter(kind => ANIMAL_CARDS[kind].group === 'story') },
] as const

/** The name of the world of a card, as in Worlds. */
export const worldName = (world: AnimalCard['world']) => world === 'earth' ? 'Earth' : 'Blossom Haven'

/** The look of a card: the friend (a gold ring), a kind that she met (in colour), or a kind that she did not meet (a shadow). */
export type CardLook = 'friend' | 'met' | 'unmet'
export function cardLook(state: FriendState, kind: FriendKind): CardLook {
  if (!state.met.includes(kind)) return 'unmet'
  return kind === state.friend ? 'friend' : 'met'
}

/** The count of the met kinds on the tab, as the sticker count: "7/9". It is the size of the book, not a score. */
export const bookCount = (state: FriendState) => `${state.met.length}/${FRIEND_KINDS.length}`

/**
 * The note at the top of the Animals page. `kind` is the picture (null: the empty bubble of no
 * friend), `shadow` is true for a kind that she did not meet. `hearts` is the count of the hellos
 * before the gift, and null after it: the count shows only as hearts, never as a number. `facts`
 * are the facts with their words; a kind that she did not meet has its world and its place.
 */
export type BookNote = {
  kind: FriendKind | null
  shadow: boolean
  label: string
  name: string
  facts: Fact[]
  /** A kind that she did not meet shows its world (a world picture) before its place. */
  world: AnimalCard['world'] | null
  hearts: number | null
  /** "Fly with me": a met kind that is not the friend, after the gift. */
  fly: boolean
  /** "No friend": the card of the friend. */
  none: boolean
}

/** The note for the book of `state` and the card that she tapped (`selected`), or no card. */
export function bookNote(state: FriendState, selected: FriendKind | null): BookNote {
  const gift = hasFriendGift(state), hearts = gift ? null : Math.min(state.hellos, FRIEND.hellos)
  const note: BookNote = { kind: null, shadow: false, label: '', name: '', facts: [], world: null, hearts, fly: false, none: false }
  if (!selected) {
    // No card: the friend, or the way to the gift.
    if (!gift) return { ...note, label: 'A friend comes after five hellos', name: 'Say hello' }
    if (!state.friend) return { ...note, label: 'No friend', name: 'Choose a friend' }
    return { ...note, kind: state.friend, label: '✦ Flies with you', name: friendName(state.friend) }
  }
  const card = ANIMAL_CARDS[selected], look = cardLook(state, selected)
  if (look === 'unmet') return { ...note, kind: selected, shadow: true, label: 'Say hello to meet it', name: 'Who is it?', facts: [card.place], world: card.world }
  return {
    ...note, kind: selected, name: friendName(selected), facts: [...card.facts],
    label: look === 'friend' ? '✦ Flies with you' : card.group === 'real' ? 'Real animal' : 'Story creature',
    fly: gift && look === 'met', none: gift && look === 'friend',
  }
}

/** The heart of a hello, as an SVG: the hearts that float over a creature at its hello. */
const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>'

/**
 * Five hearts, one for each hello until the friend comes. `full` hearts are pink. With `swell`,
 * the last full heart swells: it is the heart of this hello.
 */
export function heartsHtml(full: number, swell = false) {
  const count = Math.max(0, Math.min(full, FRIEND.hellos))
  return Array.from({ length: FRIEND.hellos }, (_, i) => `<i class="${i < count ? 'is-full' : ''}${swell && i === count - 1 ? ' is-new' : ''}">${HEART}</i>`).join('')
}
