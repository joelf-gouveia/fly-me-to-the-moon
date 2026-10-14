import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { creaturePass } from '../../learn-and-play-study/features/shared'
import { createLayer, createPictures, createScreen, createTap, ramp } from './kit'
import { createCaption, keepShot, passThenChase } from './flight'
import { createFriendStage, SWAP } from './stage'
import { backOut } from '../../feature-ideas-study/features/f1-search-stars'

/**
 * Option C · Choose in flight. After the gift, the fairy flies low past a sheep with her duck. The
 * sheep says hello, and a round offer "Fly with me?" shows over it. One tap: the duck waves and
 * flies home, and a small sheep rises from the meadow in its bubble, comes to her side and makes
 * the happy loop. The sheep on the ground stays in its herd.
 */
const PASS = 5.2, HELLO_DISTANCE = 6.5, OFFER_DELAY = 0.25, TAP_AFTER = 1.3

export const chooseInFlight: Feature = {
  id: 'C',
  create(lab) {
    const { earth } = lab
    let pass!: ReturnType<typeof creaturePass>
    const passShot = keepShot(lab, () => { pass = creaturePass(lab, earth, ['sheep'], PASS, { view: 9.5 }) })
    // After the tap: a camera at her right side and a little behind, so the sheep that rises from the meadow shows.
    passThenChase(lab, passShot, PASS + 0.6, (goal, { forward, up, right }) => {
      goal.eye.copy(lab.fairy.position).addScaledVector(right, 7).addScaledVector(up, 2.6).addScaledVector(forward, -6)
      goal.look.copy(lab.fairy.position).addScaledVector(forward, -1)
    }, 3)
    const stage = createFriendStage(lab, 'duck')
    const { layer, fit } = createLayer(lab)
    const { shell } = createScreen(layer)
    const offer = document.createElement('div')
    offer.className = 'fb-offer'
    offer.innerHTML = '<span class="fb-pic"><img alt=""></span><b>Fly with me?</b><span class="fb-yes" aria-hidden="true">✓</span><kbd>Enter</kbd>'
    shell.append(offer)
    const tap = createTap(layer)
    const caption = createCaption(layer, [
      [0.2, 3.6, '<b>C</b> Choose in flight'],
      [4.3, 6.4, 'A hello offers “Fly with me?” for 4 s'],
      [6.6, 9.0, 'One tap: the duck flies home, a sheep rises'],
      [9.2, 11.8, 'The sheep flies with her'],
    ])
    const pictures = createPictures(lab.renderer)
    const above = new THREE.Vector3(), up = new THREE.Vector3(), screenPoint = new THREE.Vector3()
    /** The point over the sheep, at the clip time `t`. */
    const over = (t: number, lift: number) => {
      pass.placeAt(t, above)
      up.copy(above).sub(earth.group.position).normalize()
      return above.addScaledVector(up, lift)
    }
    let helloAt = -1, last = -1, frames = 0, chimed = 0, tapPoint = { x: 0, y: 0 }

    return {
      duration: 12,
      still: 4.9,
      update(t, delta) {
        if (t < last) { helloAt = -1; chimed = 0; pass.restart() }
        last = t
        fit()
        if (++frames === 2) offer.querySelector('img')!.src = pictures.colour('sheep')
        earth.creatures?.greet(delta, lab.fairy.position)
        if (helloAt < 0 && pass.distance(t) < HELLO_DISTANCE) {
          helloAt = t
          // The tap of the child starts the swap: the sheep rises from the place of the sheep on the ground.
          stage.setSwaps([{ at: t + OFFER_DELAY + TAP_AFTER, to: 'sheep', leave: 'home', arrive: 'rise', from: time => over(time, 1.2).clone() }])
        }
        if (helloAt < 0) stage.setSwaps([])
        stage.update(t, delta)
        // The offer: over the sheep on the screen, from the hello to the tap.
        const age = helloAt < 0 ? -1 : t - helloAt - OFFER_DELAY
        const tapTime = helloAt + OFFER_DELAY + TAP_AFTER
        if (age >= 0 && age < TAP_AFTER + 0.35) {
          screenPoint.copy(over(t, 2.2)).project(lab.camera)
          const x = (screenPoint.x + 1) / 2 * 1280, y = (1 - screenPoint.y) / 2 * 720
          offer.style.left = `${x}px`
          offer.style.top = `${y}px`
          offer.style.visibility = 'visible'
          const grow = backOut(Math.min(age / 0.45, 1)), out = ramp(age, TAP_AFTER + 0.05, TAP_AFTER + 0.35)
          offer.style.opacity = String(Math.min(age / 0.2, 1) * (1 - out))
          offer.style.transform = `scale(${(0.6 + 0.4 * grow) * (1 + out * 0.25)})`
          if (t < tapTime) { const yes = offer.querySelector('.fb-yes')!.getBoundingClientRect(), frame = layer.getBoundingClientRect(), scale = frame.width / 1280; tapPoint = { x: (yes.left + yes.width / 2 - frame.left) / scale, y: (yes.top + yes.height / 2 - frame.top) / scale } }
        } else offer.style.visibility = 'hidden'
        tap(tapPoint.x, tapPoint.y, helloAt < 0 ? -1 : t - tapTime)
        caption(t)
        if (helloAt >= 0 && chimed < 1) { chimed = 1; chime([659.25, 783.99], 0.04) }
        if (helloAt >= 0 && chimed < 2 && t >= tapTime + SWAP.arriveAfter.home + SWAP.rise) { chimed = 2; chime([880, 1174.66], 0.045) }
      },
      dispose() { stage.dispose() },
    }
  },
}
