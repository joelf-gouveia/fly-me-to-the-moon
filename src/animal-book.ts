import { BOOK_KINDS, FRIEND, friendName, hasFriendGift, isFriendKind } from './friend'
import type { FriendKind, FriendState } from './friend'
import { speciesById } from './creatures/catalog'
import type { PlaceId } from './creatures/catalog'

// The animal book (docs/friend-book-study.md, design A, with the pages of docs/animals-study.md): a
// card for each kind of the catalog of src/creatures/catalog.ts. The book is the `met` list of the
// saved friend (src/friend.ts): it needs no data of its own. The page in Worlds is in
// src/animal-book-ui.ts.

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
  // The new pictures of the animals study (docs/animals-study.md): the facts of the new kinds and the places of the rows.
  leaf: '<path d="M20.5 3.5C11 3.6 4.5 8.4 4.2 16.6l-.8 4 1.2.5 1.6-3.4C14.6 17.4 20.2 12 20.5 3.5Z" fill="#5fb85a"/><path d="M5 19.8 16.4 8.2" stroke="#3d8a3a" stroke-width="1.3" stroke-linecap="round"/>',
  berry: '<circle cx="8.5" cy="14.5" r="4" fill="#e0475a"/><circle cx="15.5" cy="14.5" r="4" fill="#d43a50"/><circle cx="12" cy="18.6" r="3.6" fill="#ea5568"/><path d="M12 10.5c-.4-3 .8-5.4 3.6-6.8" stroke="#46a246" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M12.4 7.2c2.4-1.6 4.8-1.4 6.4.2-2.2 1.2-4.4 1.2-6.4-.2Z" fill="#6cc25e"/>',
  fish: '<path d="M3 12c3-4.4 8.6-6 13-2.6l4.6-3.4-1.4 6 1.4 6-4.6-3.4C11.6 18 6 16.4 3 12Z" fill="#6fb2e8"/><circle cx="7.6" cy="11.2" r="1.2" fill="#24384a"/>',
  sun: '<circle cx="12" cy="12" r="4.8" fill="#ffc93c"/><path d="M12 2.4v3M12 18.6v3M2.4 12h3M18.6 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1" stroke="#f4a62a" stroke-width="2" stroke-linecap="round"/>',
  snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" stroke="#7fb8e6" stroke-width="2" stroke-linecap="round"/><path d="M9.6 4.2 12 6.4l2.4-2.2M9.6 19.8 12 17.6l2.4 2.2" stroke="#7fb8e6" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  moon: '<path d="M15.6 3.2A9 9 0 1 0 20.8 16 7.2 7.2 0 0 1 15.6 3.2Z" fill="#ffe08a" stroke="#d4a93a" stroke-width="1"/>',
  stripes: '<circle cx="12" cy="12" r="9.4" fill="#fff" stroke="#2c2a2e" stroke-width="1.4"/><path d="M7 4.4c2.2 4.6 2.2 10.6 0 15.2M12 2.6c1.6 6 1.6 12.8 0 18.8M17 4.4c-2.2 4.6-2.2 10.6 0 15.2" stroke="#2c2a2e" stroke-width="2.2" fill="none"/>',
  spots: '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5" fill="#f0c76a"/><path d="M7 6.2l2.6.6.4 2.6-2.4 1.2-1.8-1.8ZM14.4 5.2l3 .8-.2 2.8-2.6.6-1.2-2.2ZM10.6 12.2l3 .4.8 2.8-2.4 1.6-2.4-1.8ZM5.6 15.4l2.4.8-.2 2.6-2.6.2ZM17 13.6l2 1.6-1 2.4-2.4-.6Z" fill="#b06a32"/>',
  antlers: '<path d="M12 21v-8M12 13c-2-2-4.6-2.6-6.6-6M12 13c2-2 4.6-2.6 6.6-6M7.6 9.6 4 8.4M9.2 11.6 7.4 4.6M16.4 9.6 20 8.4M14.8 11.6l1.8-7" stroke="#9a6b3e" stroke-width="2" fill="none" stroke-linecap="round"/>',
  tree: '<rect x="10.8" y="13" width="2.4" height="8.6" rx="1" fill="#8a5a3a"/><circle cx="12" cy="9.6" r="7" fill="#5fb85a"/><circle cx="9.4" cy="8" r="2.2" fill="#82d26b"/>',
  pine: '<rect x="10.9" y="17" width="2.2" height="4.6" fill="#8a5a3a"/><path d="M12 2.4 5 11h3.4L4.2 17.4h15.6L15.6 11H19Z" fill="#3f7d4f"/>',
  palm: '<path d="M12.6 21.6c.4-5.4-.2-9.4-1.8-12.6" stroke="#a87a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M11 9C8.4 5.6 5 5 2.4 6.4c3.2.2 5.6 1.4 8.6 2.6Zm0 0c1.6-3.6 4.6-5.2 8-4.6-2.8 1.2-5 2.8-8 4.6Zm0 0c3.4-1.6 6.8-.8 9.4 1.6-3.2-.4-6 .2-9.4-1.6Zm0 0c-3.4 0-5.8 1.8-7 4.6 2.2-1.8 4.4-3 7-4.6Z" fill="#46a246"/>',
  acacia: '<path d="M11 21.6v-8.4M11 13.4 7.6 9.4M11 14.6l4.4-5" stroke="#8a5a3a" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M2.4 9c1.8-3 6-4.4 9.6-4.4s7.8 1.4 9.6 4.4c-3 1.2-6.4 1.6-9.6 1.6S5.4 10.2 2.4 9Z" fill="#7a9a3a"/>',
  cactus: '<path d="M10 21.6V5.4a2 2 0 0 1 4 0v16.2ZM10 14H7.4a2 2 0 0 1-2-2V8.6a1.4 1.4 0 0 1 2.8 0V11H10ZM14 12h2.4V7.6a1.4 1.4 0 0 1 2.8 0V12a2.4 2.4 0 0 1-2.4 2.4H14Z" fill="#5fae6a"/>',
  wave: '<path d="M2 14.6c2.6-4.4 6.4-5.8 9.4-3.6-2.2.2-3 2-1.6 3.2 1.8 1.6 5.4.8 6.8-1.8 1.4 2.6 3.6 3.6 5.4 3v5H2Z" fill="#56b2ee"/><path d="M2 19.4q2.5-1.8 5 0t5 0 5 0 5 0" stroke="#fff" stroke-width="1.2" fill="none"/>',
  cloud: '<path d="M6.4 18.4a4 4 0 0 1-.6-8 5.6 5.6 0 0 1 10.8-1.6 4.4 4.4 0 0 1 1.4 9.6Z" fill="#fff" stroke="#9cc6e6" stroke-width="1.3"/>',
  mushroom: '<path d="M9.6 13h4.8l.8 8H8.8Z" fill="#fff3e4"/><path d="M2.6 13.4C3 7.6 7 4 12 4s9 3.6 9.4 9.4Z" fill="#b07ae8"/><circle cx="8" cy="9.6" r="1.5" fill="#fff"/><circle cx="14.4" cy="7.6" r="1.3" fill="#fff"/><circle cx="16.8" cy="11" r="1.1" fill="#fff"/>',
  lollipop: '<path d="M12 13.6v8" stroke="#e9d6b4" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8.6" r="6.4" fill="#ff8cbd"/><path d="M12 8.6a2 2 0 1 1 2 2 3.8 3.8 0 1 1-3.8-3.8 5.4 5.4 0 1 1 5.4 5.4" stroke="#fff3f8" stroke-width="1.4" fill="none"/>',
  crystal: '<path d="M12 2.4 16.6 8 12 21.6 7.4 8Z" fill="#9fe8f0" stroke="#5aaebf" stroke-width="1" stroke-linejoin="round"/><path d="M5.6 10.2 8.2 13 6.4 20 3.6 13ZM18.4 10.2l2 2.8-2.8 7-1.8-7Z" fill="#d8c3ef" stroke="#a68ac8" stroke-width=".9" stroke-linejoin="round"/>',
  flower: '<g fill="#ff9ec7"><circle cx="12" cy="6.2" r="3.6"/><circle cx="17.6" cy="10.4" r="3.6"/><circle cx="15.4" cy="17" r="3.6"/><circle cx="8.6" cy="17" r="3.6"/><circle cx="6.4" cy="10.4" r="3.6"/></g><circle cx="12" cy="12" r="3" fill="#ffd24a"/>',
  honey: '<path d="M12 3c3.6 4.6 5.8 8 5.8 10.6a5.8 5.8 0 0 1-11.6 0C6.2 11 8.4 7.6 12 3Z" fill="#ffc23c" stroke="#d4901a" stroke-width="1"/><path d="M9.4 13.4a2.8 2.8 0 0 0 1.8 2.8" stroke="#fff3c4" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  glow: '<circle cx="12" cy="12" r="9.6" fill="#ffe7a0" opacity=".45"/><circle cx="12" cy="12" r="6" fill="#ffd27a" opacity=".8"/><circle cx="12" cy="12" r="3.2" fill="#fff6d8"/>',
  shell: '<ellipse cx="12" cy="13" rx="9.4" ry="7" fill="#6f8f4a"/><path d="M12 6v14M5 10l14 6M5 16l14-6" stroke="#4f6e34" stroke-width="1.2"/><ellipse cx="12" cy="13" rx="3.4" ry="2.6" fill="#8fae5a"/>',
  heart: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.1 1.7-1.9 3.1-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#f06aa3"/>',
} as const

export type IconId = keyof typeof ICONS

/** A small picture of a fact, as an SVG. It has no text: the word is next to it, or in the note. */
export function factIcon(id: IconId) {
  return `<svg class="fact-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg>`
}

/** One picture fact: a small picture and a short word for the grown-up who reads it aloud. */
export type Fact = readonly [icon: IconId, word: string]

/**
 * A row of the book: a place of a world with its picture. The rows follow a flight: warm to cold on
 * Earth, then the sea and the sky; the gardens on Blossom Haven, then the soda water and the sky.
 */
export type BookPlace = { id: PlaceId; world: 'earth' | 'fairy'; name: string; icon: IconId }
export const BOOK_PLACES: BookPlace[] = [
  { id: 'beach', world: 'earth', name: 'Palm beach', icon: 'palm' },
  { id: 'jungle', world: 'earth', name: 'Jungle', icon: 'leaf' },
  { id: 'savanna', world: 'earth', name: 'Savanna', icon: 'acacia' },
  { id: 'desert', world: 'earth', name: 'Desert', icon: 'cactus' },
  { id: 'temperate', world: 'earth', name: 'Leaf forest', icon: 'tree' },
  { id: 'taiga', world: 'earth', name: 'Pine forest', icon: 'pine' },
  { id: 'tundra', world: 'earth', name: 'Snow line', icon: 'snow' },
  { id: 'sea', world: 'earth', name: 'The sea', icon: 'wave' },
  { id: 'sky', world: 'earth', name: 'The sky', icon: 'cloud' },
  { id: 'grove', world: 'fairy', name: 'Lollipop grove', icon: 'lollipop' },
  { id: 'orchard', world: 'fairy', name: 'Cotton candy orchard', icon: 'candy' },
  { id: 'glade', world: 'fairy', name: 'Mushroom glade', icon: 'mushroom' },
  { id: 'peaks', world: 'fairy', name: 'Crystal peaks', icon: 'crystal' },
  { id: 'soda', world: 'fairy', name: 'Soda water', icon: 'bubbles' },
  { id: 'heaven', world: 'fairy', name: 'The sky', icon: 'cloud' },
]
const placeOf = (kind: FriendKind) => BOOK_PLACES.find(place => place.id === speciesById(kind).place)!

export type AnimalCard = {
  /** "Real animals" live on Earth; "story creatures" live on Blossom Haven. */
  group: 'real' | 'story'
  world: 'earth' | 'fairy'
  /** Three picture facts. */
  facts: readonly [Fact, Fact, Fact]
  /** The place where she can meet the kind: the row of the book, a kind of place, so it is true on each new Earth. */
  place: Fact
}

/** The three picture facts of each kind. The facts of the story creatures of the first game come from src/creatures/fairytale.ts. */
const FACTS: Record<FriendKind, readonly [Fact, Fact, Fact]> = {
  cow: [['grass', 'Eats grass'], ['milk', 'Gives milk'], ['barn', 'Lives on a farm']],
  rabbit: [['carrot', 'Eats carrots'], ['ears', 'Long ears'], ['burrow', 'Lives in a burrow']],
  sheep: [['grass', 'Eats grass'], ['wool', 'Gives wool'], ['barn', 'Lives on a farm']],
  duck: [['water', 'Swims'], ['egg', 'Lays eggs'], ['feather', 'Has feathers']],
  deer: [['leaf', 'Eats leaves'], ['antlers', 'Antlers on its head'], ['tree', 'Lives in the forest']],
  fox: [['fox', 'Orange and fluffy'], ['tails', 'A bushy tail'], ['burrow', 'Sleeps in a den']],
  stork: [['wing', 'Flies very far'], ['sun', 'Flies south in winter'], ['egg', 'Nests on roofs']],
  moose: [['leaf', 'Eats leaves'], ['antlers', 'Very big antlers'], ['water', 'Wades in lakes']],
  bear: [['berry', 'Eats berries'], ['heart', 'Mother and cub'], ['snow', 'Sleeps all winter']],
  beaver: [['tree', 'Builds with sticks'], ['water', 'Swims well'], ['paw', 'A flat tail']],
  reindeer: [['snow', 'Lives in the snow'], ['antlers', 'Big antlers'], ['feet', 'Walks in a herd']],
  hare: [['snow', 'White in winter'], ['ears', 'Long ears'], ['paw', 'Big snow feet']],
  penguin: [['fish', 'Eats fish'], ['snow', 'Lives in the cold'], ['water', 'Swims, cannot fly']],
  seal: [['fish', 'Eats fish'], ['water', 'Swims in the sea'], ['snow', 'Rests on the ice']],
  zebra: [['stripes', 'Black and white stripes'], ['grass', 'Eats grass'], ['feet', 'Lives in a herd']],
  giraffe: [['leaf', 'Eats treetop leaves'], ['spots', 'Brown spots'], ['acacia', 'The tallest animal']],
  elephant: [['grass', 'Eats grass'], ['water', 'Sprays water'], ['heart', 'A big family']],
  meerkat: [['sun', 'Loves the sun'], ['burrow', 'Lives in burrows'], ['feet', 'Stands up tall']],
  camel: [['sun', 'Lives in the desert'], ['water', 'Drinks a lot'], ['feet', 'Walks very far']],
  monkey: [['tree', 'Climbs trees'], ['tails', 'A long tail'], ['berry', 'Eats fruit']],
  parrot: [['rainbow', 'Bright colours'], ['wing', 'Flies in flocks'], ['berry', 'Eats fruit and nuts']],
  capybara: [['water', 'Swims in rivers'], ['grass', 'Eats grass'], ['heart', 'Calm and friendly']],
  flamingo: [['feet', 'Stands on one leg'], ['water', 'Wades in water'], ['fish', 'Eats tiny shrimp']],
  turtle: [['shell', 'A hard shell'], ['water', 'Swims in the sea'], ['egg', 'Lays eggs in sand']],
  seagull: [['wing', 'Glides over the sea'], ['fish', 'Eats fish'], ['wave', 'Lives by the sea']],
  dolphin: [['wave', 'Leaps over waves'], ['fish', 'Eats fish'], ['heart', 'Swims with family']],
  whale: [['wave', 'The biggest animal'], ['water', 'Blows a spout'], ['fish', 'Eats tiny food']],
  fish: [['fish', 'Swims in a school'], ['wave', 'Jumps out of water'], ['star', 'Shiny and silver']],
  butterfly: [['flower', 'Visits flowers'], ['wing', 'Colourful wings'], ['sun', 'Out in summer']],
  firefly: [['glow', 'Glows at night'], ['moon', 'Out on summer nights'], ['wing', 'Tiny wings']],
  goose: [['wing', 'Flies in a V'], ['sun', 'Flies south in autumn'], ['grass', 'Eats grass']],
  unicorn: [['rainbow', 'Rainbow mane'], ['horn', 'Golden horn'], ['grass', 'Grazes in the meadow']],
  dragonling: [['wing', 'Tiny wings'], ['candy', 'Puffs candy floss'], ['feet', 'Waddles in a herd']],
  kitsune: [['fox', 'A fox cub'], ['tails', 'Three wish tails'], ['paw', 'Hops and stops']],
  frogPrince: [['crown', 'Golden crown'], ['lily', 'Rides a lily pad'], ['bubbles', 'Wishing bubbles']],
  pegasus: [['wing', 'Flies on wings'], ['star', 'Starry mane'], ['cottage', 'Over the cottage']],
  gummyBear: [['candy', 'Made of jelly'], ['rainbow', 'Many candy colours'], ['feet', 'Bounces and wobbles']],
  flossLamb: [['candy', 'Candy floss fleece'], ['cloud', 'Floats a little'], ['heart', 'Soft to hug']],
  caterpillar: [['bubbles', 'Blows bubble rings'], ['mushroom', 'Sits on a mushroom'], ['star', 'From a story']],
  crystalDeer: [['crystal', 'Crystal antlers'], ['star', 'They sparkle'], ['feet', 'Walks on the peaks']],
  griffin: [['wing', 'Fluffy wings'], ['crystal', 'Lives on the peaks'], ['feather', 'Soft feathers']],
  jelly: [['bubbles', 'Swims in soda'], ['candy', 'Made of jelly'], ['glow', 'Glows softly']],
  serpent: [['wave', 'Three big humps'], ['bubbles', 'Blows fizz'], ['heart', 'Big and friendly']],
  phoenix: [['glow', 'A warm glow'], ['cloud', 'Flies very high'], ['sun', 'Warm, never hot']],
  honeyBee: [['flower', 'Visits big flowers'], ['honey', 'Makes honey drops'], ['heart', 'Never stings']],
  bubbleFish: [['bubbles', 'Swims in a bubble'], ['cloud', 'Swims in the air'], ['star', 'In Bubble time']],
  lanternMoth: [['glow', 'Glows like a lantern'], ['moon', 'Out at night'], ['mushroom', 'In Lantern time']],
  owlet: [['crystal', 'Made of sugar glass'], ['moon', 'Blinks sleepy eyes'], ['star', 'In Crystal time']],
}

/** The 48 cards, from the catalog of src/creatures/catalog.ts. */
export const ANIMAL_CARDS = Object.fromEntries(BOOK_KINDS.map(kind => {
  const world = speciesById(kind).world, place = placeOf(kind)
  return [kind, { group: world === 'earth' ? 'real' : 'story', world, facts: FACTS[kind], place: [place.icon, place.name] }]
})) as unknown as Record<FriendKind, AnimalCard>

/** The two pages of the book, one for each world, with a row for each place that has a kind. */
export const BOOK_PAGES = (['earth', 'fairy'] as const).map(world => ({
  world,
  title: world === 'earth' ? 'Real animals' : 'Story creatures',
  rows: BOOK_PLACES.filter(place => place.world === world)
    .map(place => ({ ...place, kinds: BOOK_KINDS.filter(kind => speciesById(kind).place === place.id) }))
    .filter(row => row.kinds.length),
}))

/** The name of the world of a card, as in Worlds. */
export const worldName = (world: AnimalCard['world']) => world === 'earth' ? 'Earth' : 'Blossom Haven'

/** The look of a card: the friend (a gold ring), a kind that she met (in colour), or a kind that she did not meet (a shadow). */
export type CardLook = 'friend' | 'met' | 'unmet'
export function cardLook(state: FriendState, kind: FriendKind): CardLook {
  if (!state.met.includes(kind)) return 'unmet'
  return kind === state.friend ? 'friend' : 'met'
}

/** The count of the met kinds on the tab, as the sticker count: "7/48". It is the size of the book, not a score. */
export const bookCount = (state: FriendState) => `${state.met.length}/${BOOK_KINDS.length}`

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
  /** "Fly with me": a met kind that can be a friend and is not the friend, after the gift. */
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
  const friendly = isFriendKind(selected)
  return {
    ...note, kind: selected, name: friendName(selected), facts: [...card.facts],
    // A school or a swarm is many small animals: it stays in its place, so it has no "Fly with me".
    label: look === 'friend' ? '✦ Flies with you' : !friendly ? 'Many little friends' : card.group === 'real' ? 'Real animal' : 'Story creature',
    fly: gift && look === 'met' && friendly, none: gift && look === 'friend',
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
