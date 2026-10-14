import type { Feature } from '../../feature-ideas-study/lab'
import type { FriendKind } from '../../../src/friend'
import { createWorldsDialog } from './book'
import { createLayer, createPictures, createScreen, createTap, fillPictures, panelAt, ramp, smooth } from './kit'
import { createCaption, flightPath } from './flight'
import { createFriendStage } from './stage'

/**
 * The phone: the Animals page of option A on a phone of 390 px and of 320 px. Each phone is a
 * screen of the game with the class `touch-ui`, so the rules of src/mobile.css and the narrow
 * rules of src/adventure.css (container queries here) apply, as on a real phone. The fairy flies
 * behind them on Earth.
 */
const PHONES = [
  { width: 390, height: 844, x: 334, label: '390 × 844' },
  { width: 320, height: 640, x: 715, label: '320 × 640' },
]
const SCALE = 0.72, TOP = 52
const T = { in: 0.2, tapSheep: 2.6, sheep: 2.75, scroll: 5.0, tapFriend: 6.6, friend: 6.75 }
const MET: FriendKind[] = ['cow', 'sheep', 'duck', 'pegasus', 'unicorn', 'dragonling', 'rabbit']

export const phone: Feature = {
  id: 'P',
  create(lab) {
    const { earth } = lab
    const { at } = flightPath(lab, earth, lab.meadowLocal, 0.35)
    lab.setRailPoints(earth, [at(-40, 0, 13), at(-20, 1, 13), at(0, 0, 13.5), at(20, -1, 14), at(40, 0, 14)], 0)
    const stage = createFriendStage(lab, 'pegasus')
    const { layer, fit } = createLayer(lab)
    const dim = document.createElement('div')
    dim.className = 'fb-dim'
    layer.append(dim)
    const pictures = createPictures(lab.renderer)
    const phones = PHONES.map(spec => {
      const { screen, shell } = createScreen(layer, spec.width, spec.height, 'touch-ui is-map-open')
      screen.classList.add('fb-phone')
      screen.style.left = `${spec.x}px`
      screen.style.top = `${TOP}px`
      screen.style.transform = `scale(${SCALE})`
      shell.innerHTML = '<div class="adventure"><div class="mobile-top"><button type="button">☰ <span>Menu</span></button><button type="button"><span aria-hidden="true">◉</span> Worlds <span class="world-count">5/13</span></button></div></div>'
      const dialog = createWorldsDialog(shell, lab.worlds, ['earth', 'moon', 'fairy', 'mercury', 'venus'])
      dialog.setTab('animals')
      const label = document.createElement('p')
      label.className = 'fb-phone-label'
      label.textContent = spec.label
      label.style.left = `${spec.x + spec.width * SCALE / 2}px`
      label.style.top = `${TOP + spec.height * SCALE + 14}px`
      layer.append(label)
      return { spec, screen, shell, dialog }
    })
    const tap = createTap(layer)
    const caption = createCaption(layer, [
      [3.0, 5.0, '390 px: a tap on a card shows its facts and “Fly with me”', true],
      [6.9, 8.9, '320 px: the note stays on top; the friend has “No friend”', true],
    ])
    let frames = 0, tapAt = -1, tapPoint = { x: 0, y: 0 }, last = -1
    /** The centre of an element of a phone, in the coordinates of the layer. */
    const centre = (index: number, selector: string) => {
      const { spec, dialog, screen } = phones[index]
      const point = dialog.centre(selector, screen)
      return { x: spec.x + point.x * SCALE, y: TOP + point.y * SCALE }
    }

    return {
      duration: 9,
      still: 4.4,
      update(t, delta) {
        if (t < last) tapAt = -1
        last = t
        fit()
        if (++frames === 2) phones.forEach(item => fillPictures(item.shell, pictures))
        stage.update(t, delta)
        dim.style.opacity = String(smooth(ramp(t, 0, 0.5)))
        phones.forEach((item, index) => {
          panelAt(item.dialog.dialog, T.in, 99, t)
          item.dialog.backdrop.style.visibility = 'visible'
          item.screen.style.opacity = String(smooth(ramp(t, 0, 0.5)))
          const selected: FriendKind | null = index === 0 ? (t >= T.sheep ? 'sheep' : null) : (t >= T.friend ? 'pegasus' : null)
          item.dialog.setBook({ met: MET, hellos: 5, friend: 'pegasus', selected }, kind => pictures.colour(kind))
          // The 320 px phone scrolls down to the story creatures. The note stays at the top of the dialog.
          if (index === 1) {
            const box = item.dialog.dialog
            box.scrollTop = smooth(ramp(t, T.scroll, T.scroll + 1.2)) * (box.scrollHeight - box.clientHeight)
          }
        })
        const taps: [number, () => { x: number; y: number }][] = [
          [T.tapSheep, () => centre(0, '.fb-card[data-kind="sheep"]')],
          [T.tapFriend, () => centre(1, '.fb-card[data-kind="pegasus"]')],
        ]
        const now = taps.findLast(([time]) => t >= time)
        if (now) { if (tapAt !== now[0]) { tapAt = now[0]; tapPoint = now[1]() } tap(tapPoint.x, tapPoint.y, t - now[0]) } else tap(0, 0, -1)
        caption(t)
      },
      dispose() { stage.dispose() },
    }
  },
}
