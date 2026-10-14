import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import type { FriendKind } from '../../../src/friend'
import { createWorldsDialog } from './book'
import type { BookState } from './book'
import { createLayer, createPictures, createScreen, createTap, fillPictures, panelAt } from './kit'
import { createCaption, flightPath } from './flight'
import { createFriendStage, SWAP } from './stage'

/**
 * Option A · The book in Worlds. The fairy flies over the meadow of Earth with her pegasus foal.
 * The child opens Worlds, taps Animals, taps the sheep and then "Fly with me". Worlds closes,
 * the foal waves and flies home, and the sheep comes out of the sky in its bubble with a loop.
 */
const T = { tapWorlds: 1.3, open: 1.5, tapTab: 2.4, tab: 2.55, tapCard: 4.2, card: 4.35, tapFly: 5.4, close: 5.55, swap: 5.9 }
const MET: FriendKind[] = ['cow', 'sheep', 'duck', 'pegasus', 'unicorn', 'dragonling', 'rabbit']

export const bookInWorlds: Feature = {
  id: 'A',
  create(lab) {
    const { earth } = lab
    const path = flightPath(lab, earth, lab.meadowLocal, 0.35)
    const { at } = path
    // The flight stops while Worlds is open, as in the game.
    lab.setRailPoints(earth, [at(-16, 0, 12), at(-8, 0.4, 12), at(0, 0.8, 12)], 0)
    lab.setRailPoints(earth, [at(0, 0.8, 12), at(0.02, 0.8, 12)], T.open)
    lab.setRailPoints(earth, [at(0.02, 0.8, 12), at(16, 1.8, 12), at(32, 0.5, 12.5), at(48, -1.5, 13), at(64, -1, 13), at(80, 1, 13)], T.close)

    const stage = createFriendStage(lab, 'pegasus')
    stage.setSwaps([{ at: T.swap, to: 'sheep', leave: 'home', arrive: 'sky' }])
    const { layer, fit } = createLayer(lab)
    const { screen, shell } = createScreen(layer)
    const worlds = createWorldsDialog(shell, lab.worlds, ['earth', 'moon', 'fairy', 'mercury', 'venus'])
    const tap = createTap(layer)
    const caption = createCaption(layer, [
      [0.2, 1.4, '<b>A</b> The book in Worlds'],
      [2.6, 5.5, 'The Animals page: tap a card, then “Fly with me”', true],
      [6.0, 8.6, 'The foal waves and flies home'],
      [8.8, 12.6, 'The sheep comes, with a happy loop'],
    ])
    const pictures = createPictures(lab.renderer)
    let frames = 0, last = -1, chimed = false, tapAt = -1, tapPoint = { x: 0, y: 0 }
    const arrive = T.swap + SWAP.arriveAfter.home + SWAP.sky

    return {
      duration: 13,
      still: 5,
      update(t, delta) {
        if (t < last) { chimed = false; tapAt = -1 }
        last = t
        fit()
        if (++frames === 2) fillPictures(shell, pictures)
        const open = t >= T.open && t < T.close
        stage.update(t, open ? 0 : delta)
        // Worlds: first the page of the worlds, then the Animals page.
        panelAt(worlds.dialog, T.open, T.close, t)
        worlds.backdrop.style.visibility = worlds.dialog.style.visibility
        worlds.backdrop.style.opacity = worlds.dialog.style.opacity
        worlds.setTab(t < T.tab ? 'worlds' : 'animals')
        const state: BookState = { met: MET, hellos: 5, friend: t < T.close ? 'pegasus' : 'sheep', selected: t >= T.card && t < T.close ? 'sheep' : null }
        worlds.setBook(state, kind => pictures.colour(kind))
        // The taps: the Worlds button of the screen, the Animals tab, the sheep card, and "Fly with me".
        const taps: [number, () => { x: number; y: number }][] = [
          [T.tapWorlds, () => ({ x: 98, y: 150 })],
          [T.tapTab, () => worlds.centre('[data-tab="animals"]', screen)],
          [T.tapCard, () => worlds.centre('.fb-card[data-kind="sheep"]', screen)],
          [T.tapFly, () => worlds.centre('.fb-fly', screen)],
        ]
        // The point of a tap is read at its start: the button can go away while the ring fades.
        const now = taps.findLast(([time]) => t >= time)
        if (now) { if (tapAt !== now[0]) { tapAt = now[0]; tapPoint = now[1]() } tap(tapPoint.x, tapPoint.y, t - now[0]) } else tap(0, 0, -1)
        caption(t)
        if (!chimed && t >= arrive) { chimed = true; chime([880, 1174.66], 0.045) }
      },
      dispose() { stage.dispose() },
    }
  },
}
