import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { isFriendKind } from '../../../src/friend'
import type { FriendKind } from '../../../src/friend'
import { creaturePass } from '../../learn-and-play-study/features/shared'
import { cardOf } from '../model'
import { createLayer, createPictures, createScreen, heartsHtml, noteAt, setHearts } from './kit'
import { createCaption, keepShot, passThenChase } from './flight'
import { createFriendStage } from './stage'

/**
 * The gift: what the child sees before the fifth hello. The fairy flies low over the meadow of
 * Earth. Each first hello of a kind shows the note of its card, with the five hearts: one heart
 * for each hello. At the fifth hello the gift note shows, and the friend comes out of the sky
 * with a loop. The hellos are the real hellos of the creatures (greet() of the population).
 */
/** The book of the clip at its start: three hellos, to a duck and to two sheep. */
export const GIFT_START = { hellos: 3, met: ['duck', 'sheep'] as FriendKind[] }
/** The pass of the clip, and the time of a card note and of the gift note. Each note waits for the note before it. */
const PASS = 6.2, CARD_HOLD = 2.2, GIFT_HOLD = 3.6, FADE = 0.6, FOLLOW_AT = 6.3

export const gift: Feature = {
  id: 'G',
  create(lab) {
    const { earth } = lab
    // The side view of the pass, then a camera behind her, so the arrival of the friend shows.
    const passShot = keepShot(lab, () => creaturePass(lab, earth, ['cow', 'rabbit', 'sheep'], PASS, { view: 9 }))
    passThenChase(lab, passShot, FOLLOW_AT, (goal, { forward, up, right }) => {
      goal.eye.copy(lab.fairy.position).addScaledVector(up, 8.5).addScaledVector(forward, -7.5).addScaledVector(right, 1.5)
      goal.look.copy(lab.fairy.position).addScaledVector(forward, 5).addScaledVector(up, 0.5)
    })
    const stage = createFriendStage(lab, null)
    const { layer, fit } = createLayer(lab)
    const { shell } = createScreen(layer)
    const note = document.createElement('div')
    note.id = 'friend-note'
    note.hidden = true
    note.innerHTML = `<img alt=""><div><small></small><h2></h2><div class="fb-facts-row"></div><p></p>${heartsHtml()}</div>`
    shell.append(note)
    const caption = createCaption(layer, [
      [0.2, 3.5, 'Before the gift: the book fills'],
      [3.8, 6.3, 'A new card shows the hearts: one for each hello'],
      [6.6, 11.8, 'The fifth hello brings the friend'],
    ])
    const pictures = createPictures(lab.renderer)
    type Hello = { t: number; kind: FriendKind; count: number; card: boolean; showAt: number }
    let hellos: Hello[] = [], last = -1, frames = 0
    let shown: Hello | null = null

    return {
      duration: 12,
      still: 7.8,
      update(t, delta) {
        if (t < last) { hellos = []; shown = null }
        last = t
        fit()
        if (++frames === 2) for (const kind of ['cow', 'rabbit', 'sheep', 'duck'] as FriendKind[]) pictures.colour(kind)
        // The real hellos of this frame: each one is a heart, and the first hello of a kind is a card.
        for (const kind of earth.creatures?.greet(delta, lab.fairy.position) ?? []) {
          if (!isFriendKind(kind)) continue
          const before = hellos.at(-1)?.count ?? GIFT_START.hellos
          if (before >= 5) continue
          const met = [...GIFT_START.met, ...hellos.map(hello => hello.kind)]
          const count = before + 1, card = !met.includes(kind)
          // A note waits until the note before it is gone. A hello of a kind that she met shows no note.
          const previous = hellos.findLast(hello => hello.card || hello.count === 5)
          const showAt = previous ? Math.max(t, previous.showAt + CARD_HOLD + FADE) : t
          hellos.push({ t, kind, count, card, showAt })
          if (count === 5) stage.setSwaps([{ at: showAt, to: kind, leave: 'pop', arrive: 'sky' }])
        }
        stage.update(t, delta)
        const latest = hellos.findLast(hello => (hello.card || hello.count === 5) && hello.showAt <= t) ?? null
        if (latest && latest !== shown) {
          shown = latest
          const gift = latest.count === 5, card = cardOf(latest.kind)
          chime(gift ? [659.25, 880, 1046.5] : [659.25, 783.99, 1046.5], 0.045)
          note.querySelector('img')!.src = pictures.colour(latest.kind)
          note.querySelector('img')!.style.setProperty('--sky', card.world === 'earth' ? '#9fd3ee' : '#f3c6e4')
          note.querySelector('small')!.textContent = gift ? 'A NEW FRIEND' : 'NEW IN YOUR ANIMAL BOOK'
          note.querySelector('h2')!.textContent = card.name
          note.querySelector('.fb-facts-row')!.innerHTML = gift ? '' : card.facts.map(([icon]) => `<span>${icon}</span>`).join('')
          note.querySelector('p')!.textContent = gift ? 'A friend flies with you now' : ''
        }
        // The hearts of the note: the count at its hello. The new heart swells.
        setHearts(note, shown ? shown.count : GIFT_START.hellos, shown ? t - shown.showAt - 0.35 : -1)
        noteAt(note, shown ? t - shown.showAt : -1, shown?.count === 5 ? GIFT_HOLD : CARD_HOLD, 'translateX(-50%)')
        caption(t)
      },
      dispose() { stage.dispose() },
    }
  },
}
