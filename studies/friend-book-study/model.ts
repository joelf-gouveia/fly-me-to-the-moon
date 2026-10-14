import { friendFlies, friendName } from '../../src/friend'

/** The nine kinds of the game at the time of this study. The game has more kinds now (docs/animals-study.md); the study keeps its own record. */
export const FRIEND_KINDS = ['cow', 'rabbit', 'sheep', 'duck', 'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus'] as const
export type FriendKind = typeof FRIEND_KINDS[number]

/**
 * The friend book study: how the Animal book (F11) and the fairy friend (F19) become one thing.
 * The page (main.ts) shows the options, the clips, the cards and the decisions. The first option
 * of each decision is the recommendation.
 */
export type OptionId = 'A' | 'B' | 'C'
/** The clips: one for each option, then the gift (before the fifth hello) and the phone. */
export type ClipId = OptionId | 'G' | 'P'
export type Size = 'S' | 'M' | 'L'
export const SIZES: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

// ---- The nine cards ------------------------------------------------------------------------------

/** One picture fact: an icon and a short word for the grown-up who reads it aloud. */
export type Fact = [icon: string, word: string]
export type Card = {
  kind: FriendKind
  name: string
  /** "Real animals" live on Earth; "Story creatures" live on Blossom Haven. */
  group: 'real' | 'story'
  world: 'earth' | 'fairy'
  /** Three picture facts. */
  facts: [Fact, Fact, Fact]
  /** The hint on the card of a kind that she did not meet: the world and the place. */
  home: Fact
  /** True for a kind with wings. Each other kind rides in a soap bubble. */
  flies: boolean
}

const FACTS: Record<FriendKind, { facts: [Fact, Fact, Fact]; home: Fact }> = {
  cow: { facts: [['🌿', 'Eats grass'], ['🥛', 'Gives milk'], ['🏡', 'Lives on a farm']], home: ['🌾', 'In the meadow'] },
  rabbit: { facts: [['🥕', 'Eats carrots'], ['👂', 'Long ears'], ['🕳️', 'Lives in a burrow']], home: ['🌾', 'In the meadow'] },
  sheep: { facts: [['🌿', 'Eats grass'], ['🧶', 'Gives wool'], ['🏡', 'Lives on a farm']], home: ['🌾', 'In the meadow'] },
  duck: { facts: [['💧', 'Swims'], ['🥚', 'Lays eggs'], ['🪶', 'Has feathers']], home: ['💧', 'On the water'] },
  unicorn: { facts: [['🌈', 'Rainbow mane'], ['✨', 'Golden horn'], ['🌿', 'Grazes in the meadow']], home: ['🌾', 'In the meadow'] },
  dragonling: { facts: [['🪽', 'Tiny wings'], ['🍬', 'Puffs candy floss'], ['👣', 'Waddles in a herd']], home: ['🌾', 'In the meadow'] },
  kitsune: { facts: [['🦊', 'A fox cub'], ['✨', 'Three wish tails'], ['🐾', 'Hops and stops']], home: ['🌾', 'In the meadow'] },
  frogPrince: { facts: [['👑', 'Golden crown'], ['🪷', 'Rides a lily pad'], ['🫧', 'Wishing bubbles']], home: ['🫧', 'On the soda water'] },
  pegasus: { facts: [['🪽', 'Flies on wings'], ['⭐', 'Starry mane'], ['🏡', 'Over the cottage']], home: ['🏡', 'Over the cottage'] },
}

const EARTH_KINDS: readonly FriendKind[] = ['cow', 'rabbit', 'sheep', 'duck']
export const CARDS: Card[] = FRIEND_KINDS.map(kind => {
  const earth = EARTH_KINDS.includes(kind)
  return { kind, name: friendName(kind), group: earth ? 'real' : 'story', world: earth ? 'earth' : 'fairy', ...FACTS[kind], flies: friendFlies(kind) }
})
export const cardOf = (kind: string) => CARDS.find(card => card.kind === kind)!
export const GROUPS = [
  { id: 'real', title: 'REAL ANIMALS', where: 'on Earth' },
  { id: 'story', title: 'STORY CREATURES', where: 'on Blossom Haven' },
] as const

// ---- The options ---------------------------------------------------------------------------------

export type Option = {
  id: OptionId
  name: string
  /** One line for the chip and the card. */
  line: string
  /** What the child sees and does. */
  child: string
  /** How the old friend leaves and how the new friend comes. */
  swap: string
  /** The binding decisions of 13 October 2026 that the option follows, and the ones it breaks. */
  follows: string
  breaks: string
  strong: string[]
  weak: string[]
  size: Size
  recommended: boolean
}

export const OPTIONS: Option[] = [
  {
    id: 'A', name: 'The book in Worlds', recommended: true, size: 'M',
    line: 'Worlds gets an Animals page: a card for each kind, and "Fly with me" on each card that she met.',
    child: 'She opens Worlds and taps Animals. The animals that she met have cards in colour, with a picture, a name and three picture facts. The others are soft shadows with their world and their place. The friend has the mark "✦ Flies with me". She taps the sheep, then "Fly with me". Worlds closes, and the swap plays in front of her.',
    swap: 'The old friend turns to her and waves (a rock from side to side and a small hop). Then it flies home: up and away, with its fairy dust, and it goes in a small puff of sparkles. A bubble friend floats home in its bubble. The new friend comes out of the sky ahead of her, flies to its place at her side, and makes the happy loop.',
    follows: 'The book is a page in Worlds, next to the stickers. A card has a picture, a name and picture facts. In the flight only the note of a new card shows. She selects the friend from the creatures that she met.',
    breaks: 'None.',
    strong: [
      'One place for the animals and the friend: the card is the book and the choice.',
      'It follows each decision of 13 October 2026.',
      'The swap plays in the flight, where the child sees it, on a phone too.',
      'The flight screen keeps its few buttons. Your fairy is again only about her look.',
    ],
    weak: [
      'The friend changes after Worlds closes, not while she looks at the card.',
      'Worlds gets a second page, so the dialog needs two tabs.',
    ],
  },
  {
    id: 'B', name: 'The book next to the fairy', recommended: false, size: 'M',
    line: 'The Friend row of Your fairy grows into the Animal book, and the friend changes live next to her.',
    child: 'She opens Your fairy. The first row is the Animal book: a small round picture for each of the nine kinds, in two rows. A tap on a kind that she met changes the friend at once, next to the fairy, and the picture facts of that kind show under the row.',
    swap: 'The camera is near, so there is no room for a flight home. The bubble of the old friend pops softly in sparkles, and the new friend grows at its place and makes the happy loop. A friend with wings flies up and out of the view.',
    follows: 'She selects the friend from the creatures that she met. In the flight only the note of a new card shows.',
    breaks: 'The decision "new books are pages in Worlds": the book is in Your fairy. The cards are small, so the picture facts move to one line under the row.',
    strong: [
      'On a computer she sees each friend next to her fairy, before she flies.',
      'It changes little: the Friend row of F19 gets the kinds that she did not meet and the facts.',
    ],
    weak: [
      'The book is not in Worlds, as decided on 13 October 2026.',
      'On a phone the panel covers the view, so the child does not see the change live.',
      'Nine pictures, the facts and "No friend" make the panel long, before the hair and the wings.',
    ],
  },
  {
    id: 'C', name: 'Choose in flight', recommended: false, size: 'L',
    line: 'After the gift, a hello to a kind that she met offers "Fly with me?" over that creature.',
    child: 'She flies low over the meadow. A sheep says hello, and a round bubble with the picture of a sheep and "Fly with me?" shows over it for 4 s. One tap (or Enter) and the sheep comes with her. The book in Worlds keeps the cards, and it also allows a change.',
    swap: 'The old friend waves and flies home, as in A. The new friend rises from the place of its kind on the ground, flies to her side and makes the happy loop.',
    follows: 'She selects the friend from the creatures that she met. The book is a page in Worlds.',
    breaks: 'The decision "in the flight only the note of a new card shows": the offer is a button on the flight screen. It also needs a second way to choose (the book), so it is A and more.',
    strong: [
      'The choice is where the animal is: the hello gets a purpose.',
      'The new friend comes from its own kind, which is a strong picture.',
    ],
    weak: [
      'A tap on a moving creature while she steers is hard at 5, and the creature goes out of the view in 2 s.',
      'An offer at each hello is a question in each pass: the flight is less calm. It needs a limit (one offer for each kind in each visit).',
      'A friend of Blossom Haven can only come on Blossom Haven, so the book must allow a change too.',
      'The most code: a screen point over a creature, a new key, the offer rules, and A.',
    ],
  },
]
export const optionById = (id: OptionId) => OPTIONS.find(option => option.id === id)!

// ---- The two parts that each option shares --------------------------------------------------------

export type Part = { id: 'G' | 'P'; name: string; line: string; child: string; detail: string[] }
export const PARTS: Record<'G' | 'P', Part> = {
  G: {
    id: 'G', name: 'The gift: before the fifth hello',
    line: 'The book fills before the friend comes, and five hearts show the way to the gift.',
    child: 'Each first hello of a kind shows the note of its card: the picture, "NEW IN YOUR ANIMAL BOOK", the name, the three picture facts and five hearts, one for each hello. The pink hearts of the hello over the creature are the same hearts. At the fifth hello the gift note shows, and the first friend comes out of the sky with a loop.',
    detail: [
      'The hearts count the hellos, not the cards: a second hello to a sheep is a heart too. A hello of a kind that she met shows no note in the flight; its heart shows in the next note and in the book.',
      'Two notes do not show at the same time. A note waits until the note before it is gone, as the friend note of F19 waits for a sticker note. The friend comes with its note.',
      'At the fifth hello of a new kind, the gift note takes the place of the card note. The card is in the book.',
      'The Animals page shows the same five hearts and an empty bubble at the place of the friend, until the gift.',
    ],
  },
  P: {
    id: 'P', name: 'The phone: 390 and 320 px',
    line: 'The Animals page with the phone rules of the game: three cards in each row, and a note that stays on top.',
    child: 'On a phone Worlds is at the top of the screen. The Animals page has three cards in each row, as the cards of the worlds. A tap on a card shows its facts in the note, with a wide "Fly with me" button. The note stays at the top of the dialog while the cards scroll, so a tap on a low card shows its note.',
    detail: [
      'The phone frames use the real CSS of the game: <code>src/mobile.css</code> and the narrow rules of <code>src/adventure.css</code>. The study makes those media queries container queries, so a frame of 390 px gets them on a wide screen.',
      'At 320 px the title takes two lines, and the facts take one line each. The buttons of the note go to their own row.',
      'The note on top is new: in Worlds today the note is above the map, and a tap on a low card changes a note that is out of view. The same rule can help the cards of the worlds.',
      'The swap is the same on a phone: Worlds closes, and the swap plays in the view. A phone draws two friends for 3 s (6 draw calls).',
    ],
  },
}

// ---- The clips -----------------------------------------------------------------------------------

export type Moment = { t: number; caption: string }
export type Clip = {
  id: ClipId
  name: string
  /** The question that the clip answers. */
  question: string
  length: number
  /** Three times of the clip, each with a picture from the engine (<id>-0.jpg to <id>-2.jpg). */
  moments: [Moment, Moment, Moment]
}

export const CLIPS: Clip[] = [
  {
    id: 'A', name: 'A · The book in Worlds', length: 13,
    question: 'Can the card of an animal be the place where she changes her friend?',
    moments: [
      { t: 5, caption: 'The Animals page of Worlds. She tapped the sheep: its note has the three picture facts and "Fly with me". The pegasus foal has the mark "✦ Flies with me"; two kinds are shadows.' },
      { t: 8.2, caption: 'Worlds is closed. The foal waved and flies home, high on the right. The sheep comes out of a puff of sparkles in its bubble.' },
      { t: 9.6, caption: 'The sheep is at her side and makes the happy loop over her head.' },
    ],
  },
  {
    id: 'B', name: 'B · The book next to the fairy', length: 12,
    question: 'Is it better to see the new friend next to the fairy, before the flight?',
    moments: [
      { t: 3, caption: 'Your fairy is open, and the camera is near. The first row is the Animal book: nine round pictures, the met kinds in colour.' },
      { t: 3.95, caption: 'A tap on the dragonling: the bubble of the kitsune kit pops softly in sparkles.' },
      { t: 4.9, caption: 'The dragonling grows at its place and makes the happy loop. Its picture facts show under the row.' },
    ],
  },
  {
    id: 'C', name: 'C · Choose in flight', length: 12,
    question: 'Does a choice at the hello make the hello more fun, or only more busy?',
    moments: [
      { t: 4.9, caption: 'A sheep says hello. The offer "Fly with me?" shows over it, with its picture, for a tap or the Enter key.' },
      { t: 8.4, caption: 'After the tap the duck flew home. A small sheep rises from the meadow in its bubble.' },
      { t: 10, caption: 'The sheep is at her side and makes the happy loop. The sheep that said hello stays on the ground in its herd.' },
    ],
  },
  {
    id: 'G', name: 'The gift: before the fifth hello', length: 12,
    question: 'How does a child of 5 understand that a friend comes, before it comes?',
    moments: [
      { t: 4.4, caption: 'The first hello of a rabbit: its card note shows, with its picture facts and the hearts. The fourth heart swells.' },
      { t: 7.8, caption: 'A cow says the fifth hello. The gift note shows five hearts, and the cow comes out of the sky in its bubble.' },
      { t: 9.2, caption: 'The cow makes the happy loop around her. The friend came.' },
    ],
  },
  {
    id: 'P', name: 'The phone: 390 and 320 px', length: 9,
    question: 'Do the cards, the note and "Fly with me" fit a phone of 390 px and of 320 px?',
    moments: [
      { t: 1.2, caption: 'The Animals page at 390 px and at 320 px: three cards in each row, with the phone rules of the game.' },
      { t: 4.4, caption: '390 px: a tap on the sheep. The note shows its facts and a wide "Fly with me" button.' },
      { t: 7.6, caption: '320 px: the cards scrolled, and the note stayed on top. The card of the friend shows "No friend".' },
    ],
  },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

// ---- The findings --------------------------------------------------------------------------------

export const FINDINGS: [string, string][] = [
  ['The friend code has the book already', '<code>sayHello()</code> in <code>src/friend.ts</code> adds each kind to <code>met</code> at its first hello, also before the gift. The saved <code>fairy-friend</code> record is the list of the met kinds, the count of the hellos to five, and the friend. The Animal book needs no new saved data.'],
  ['The Friend row shows only after the gift', '<code>renderRow()</code> in <code>src/friend-ui.ts</code> hides the row until the fifth hello. Before the gift the child sees nothing of the kinds that she met, and nothing tells her that a friend comes.'],
  ['A new friend grows at its place', '<code>setKind()</code> of <code>createFriend()</code> disposes the old model at once, and the new one grows in 0.4 s at its place. The old friend has no goodbye, and the new one has a loop only at the gift.'],
  ['Worlds has one page', '<code>src/adventure.ts</code> has the note with "Fly there", the map and one card for each world. A card is a button that shows its fact in the note. The Animals page can use the same card, note and button.'],
  ['The decisions of 13 October 2026 bind the design', 'New books are pages in Worlds. A card has a picture, a name and picture facts. In the flight only the note of a new card shows. The child selects the friend from the creatures that she met.'],
  ['The look menu is about her look', 'Your fairy has the Friend row first, then hair, dress, wings, trail and skin. On a computer the camera comes near; on a phone the panel covers the view (<code>src/mobile.css</code>).'],
]

// ---- The decisions -------------------------------------------------------------------------------

export type Decision = { id: string; title: string; why: string; options: string[] }
export const DECISIONS: Decision[] = [
  { id: 'option', title: '1 / How do the book and the friend become one thing?', why: 'A follows each decision of 13 October 2026. B puts the book in Your fairy. C adds a button to the flight screen.', options: ['A · The book in Worlds, with "Fly with me" on each met card (recommended)', 'B · The book next to the fairy, in Your fairy', 'C · Choose in flight, and the book in Worlds', 'A now, and C later as a test'] },
  { id: 'leave', title: '2 / How does the old friend leave?', why: 'A child who changes her friend must not feel that she sent it away. A wave and a flight home say "see you again".', options: ['It waves, then flies home in a trail of dust; a bubble friend floats home in its bubble (recommended)', 'Its bubble pops softly in sparkles, at once', 'It goes at once, as in F19 today'] },
  { id: 'arrive', title: '3 / How does the new friend come?', why: 'The arrival is the reward of the choice. F19 today grows the friend at its place.', options: ['Out of the sky ahead of her, to its place, then the happy loop (recommended)', 'It grows at its place, then the happy loop', 'From its kind in the world, only near that kind (C)'] },
  { id: 'before', title: '4 / What shows the way to the gift before the fifth hello?', why: 'Today nothing shows before the gift. Five is a count that a child of 5 knows.', options: ['Five hearts on the note of a new card and at the top of the Animals page, with an empty bubble (recommended)', 'Nothing: the friend is a surprise', 'Words: "Two more hellos"'] },
  { id: 'unmet', title: '5 / How does the book show a kind that she did not meet?', why: 'A shadow invites a search, as the mystery worlds do in Worlds.', options: ['A soft shadow of the model, with its world and its place (recommended)', 'A "?" card with no shadow', 'No card until she meets the kind'] },
  { id: 'none', title: '6 / Where is "No friend"?', why: 'F19 has "No friend" as a button in the Friend row. A child rarely wants it; a grown-up can.', options: ['A small button in the note of the card of the friend (recommended)', 'A tenth card "No friend" after the nine', 'No "No friend": a friend always flies after the gift'] },
  { id: 'menu', title: '7 / What stays in Your fairy?', why: 'Two places to change the friend are two things to learn.', options: ['Nothing: the Friend row leaves Your fairy (recommended)', 'A small link "Your friend ›" that opens the Animals page', 'The Friend row stays as a second place'] },
  { id: 'save', title: '8 / What is the saved data?', why: 'The met list of fairy-friend is the book already. A new key needs a copy of the old data.', options: ['One record: keep fairy-friend { hellos, met, friend }; the met list is the book (recommended)', 'A new key fairy-animal-book, with a copy of fairy-friend at the first start', 'Two keys: one for the book and one for the friend'] },
]

// ---- The saved data and the changes to F19 -------------------------------------------------------

/** The saved record of the recommendation: the record of F19, with no new field. */
export const SAVE_EXAMPLE = `// localStorage "fairy-friend": the book and the friend in one record
{
  "hellos": 5,                                  // 0 to 5; it stops at 5. Not a score
  "met": ["cow", "sheep", "pegasus", "duck"],   // the book: the kinds in the order of the first hello
  "friend": "pegasus"                           // the friend, or null for "No friend"
}`

/** The concrete changes to F19 that the recommendation means. */
export const CHANGES: [string, string][] = [
  ['The Animals page in Worlds', '<code>src/adventure.ts</code> gets two tabs, Worlds and Animals. A new <code>src/animal-book.ts</code> draws the nine cards: the met kinds in colour with a picture, a name and three picture facts; the others as a shadow with their world and their place; the mark "✦ Flies with me" on the friend.'],
  ['"Fly with me" and "No friend" in the note', 'A tap on a met card shows its facts in the note of Worlds. After the gift the note has "Fly with me ↗" (as "Fly there"), and the card of the friend has a small "No friend". Before the gift the note shows the five hearts.'],
  ['The Friend row leaves Your fairy', 'Remove <code>#friend-row</code> from <code>src/main.ts</code>, <code>renderRow()</code> from <code>src/friend-ui.ts</code> and the row styles from <code>src/friend.css</code>.'],
  ['A swap with a goodbye and a loop', '<code>setKind()</code> of <code>createFriend()</code> keeps the old model for its leave: a wave for 0.9 s, then a flight home for 2.1 s. The new friend comes from the sky ahead in 1.5 s and makes the happy loop. For about 3 s a phone draws two friends: 6 draw calls. With reduced motion the change is at once.'],
  ['The note of a new card', 'The first hello of a kind shows a note at the place of the friend note: the picture, "NEW IN YOUR ANIMAL BOOK", the name and the three facts. Before the gift it also shows the five hearts. At the fifth hello the gift note takes its place.'],
  ['Pictures with no background', '<code>friendPicture()</code> gets an option for a clear background, so a card can show the shadow of a kind. This is a small change in <code>src/friend.ts</code>.'],
  ['The same saved record', '<code>fairy-friend</code> keeps <code>{ hellos, met, friend }</code>. The <code>met</code> list is the book. Old data loads with no change, and the reset of the sticker book removes it, as today.'],
  ['Tests and checks', '<code>tests/friend.test.ts</code> for the card states and the swap; <code>scripts/friend-smoke.mjs</code> uses the Animals page in place of the row; the README part and the study status.'],
]

/** The rows of the comparison table. */
export const COMPARE: { row: string; values: Record<OptionId, string> }[] = [
  { row: 'Where the book is', values: { A: 'Worlds, next to the stickers', B: 'Your fairy, first row', C: 'Worlds, next to the stickers' } },
  { row: 'Where she changes the friend', values: { A: 'The card in Worlds', B: 'The row in Your fairy', C: 'Over the creature at a hello, and the card in Worlds' } },
  { row: 'Where she sees the swap', values: { A: 'In the flight, after Worlds closes', B: 'Next to the fairy, on a computer only', C: 'In the flight, at the creature' } },
  { row: 'Decisions of 13 October 2026', values: { A: 'Follows each one', B: 'Breaks "books in Worlds"', C: 'Breaks "only the note in flight"' } },
  { row: 'New buttons on the flight screen', values: { A: 'None', B: 'None', C: 'The offer, for 4 s at a hello' } },
  { row: 'On a phone', values: { A: 'Worlds is at the top; the swap is in the view', B: 'The panel covers the view', C: 'A tap on a moving creature' } },
  { row: 'Size', values: { A: 'M', B: 'M', C: 'L (it includes A)' } },
]
