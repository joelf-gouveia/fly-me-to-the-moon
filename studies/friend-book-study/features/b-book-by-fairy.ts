import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import type { FriendKind } from '../../../src/friend'
import { tipToSun } from '../../learn-and-play-study/features/shared'
import { createLookMenu } from './book'
import { createLayer, createPictures, createScreen, createTap, fillPictures, panelAt, ramp } from './kit'
import { createCaption } from './flight'
import { createFriendStage, SWAP } from './stage'

/**
 * Option B · The book next to the fairy. Over Blossom Haven the child opens Your fairy. Its first
 * row is the Animal book: the nine kinds, the met ones in colour. A tap on the dragonling pops the
 * bubble of the kitsune kit, and the dragonling grows at its place and makes the happy loop. The
 * camera is the camera of the look menu of src/main.ts: near, with the fairy left of the middle.
 */
const T = { tapOpen: 1.2, open: 1.4, tapKind: 3.6, swap: 3.75, tapClose: 8.3, close: 8.45 }
const MET: FriendKind[] = ['kitsune', 'dragonling', 'unicorn', 'pegasus', 'cow', 'duck']

export const bookByFairy: Feature = {
  id: 'B',
  create(lab) {
    const { home } = lab
    const anchor = new THREE.Vector3(0.1, -1, 0.3).normalize()
    const untip = tipToSun(lab, home, anchor, 46)
    const heading = new THREE.Vector3(1, 0, 0).addScaledVector(anchor, -anchor.x).normalize()
    const side = new THREE.Vector3().crossVectors(anchor, heading).normalize()
    const at = (along: number, across: number, alt: number) => {
      let dir = lab.stepAlong(home, anchor, heading, along)
      if (across) dir = lab.stepAlong(home, dir, side, across)
      return lab.surfacePoint(home, dir, alt)
    }
    // The flight stops while Your fairy is open, as in the game.
    lab.setRailPoints(home, [at(-30, 4, 9), at(-22, 2.5, 8.6), at(-15, 1.5, 8.4)], 0)
    lab.setRailPoints(home, [at(-15, 1.5, 8.4), at(-14.98, 1.5, 8.4)], T.open)
    lab.setRailPoints(home, [at(-14.98, 1.5, 8.4), at(-2, 0.5, 10), at(10, -1, 12), at(22, -1.5, 13.5), at(34, 0, 14.5)], T.close)

    const stage = createFriendStage(lab, 'kitsune')
    stage.setSwaps([{ at: T.swap, to: 'dragonling', leave: 'pop', arrive: 'grow' }])
    const { layer, fit } = createLayer(lab)
    const { screen, shell } = createScreen(layer)
    const look = createLookMenu(shell)
    const tap = createTap(layer)
    const caption = createCaption(layer, [
      [0.2, 1.3, '<b>B</b> The book next to the fairy'],
      [1.7, 3.6, 'Your fairy: the first row is the Animal book'],
      [3.8, 8.2, 'A tap changes the friend at once, next to her'],
      [8.7, 11.8, 'Then she flies on with the dragonling'],
    ])
    const pictures = createPictures(lab.renderer)

    // The camera of src/main.ts: the follow camera, and near the fairy with the view moved right in the look menu.
    const goal = new THREE.Vector3(), look3 = new THREE.Vector3(), position = new THREE.Vector3(), target = new THREE.Vector3()
    const offset = new THREE.Vector3(), forward = new THREE.Vector3(), up = new THREE.Vector3()
    let menuK = 0, shotLast = -1
    lab.setShot((camera, t) => {
      const fairy = lab.fairy
      const menu = t >= T.open && t < T.close
      const step = shotLast < 0 || t < shotLast ? 1 : 1 - Math.exp(-(t - shotLast) * 6)
      menuK = shotLast < 0 || t < shotLast ? (menu ? 1 : 0) : menuK + ((menu ? 1 : 0) - menuK) * step
      forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
      up.set(0, 1, 0).applyQuaternion(fairy.quaternion)
      goal.copy(fairy.position).add(offset.set(0, 2.8, THREE.MathUtils.lerp(8.5, 3.4, menuK)).applyQuaternion(fairy.quaternion))
      look3.copy(fairy.position).addScaledVector(forward, 12 * (1 - menuK))
      if (shotLast < 0 || t < shotLast) { position.copy(goal); target.copy(look3) } else { position.lerp(goal, step); target.lerp(look3, step) }
      shotLast = t
      camera.position.copy(position)
      camera.up.copy(up)
      camera.lookAt(target)
      const width = lab.renderer.domElement.width, height = lab.renderer.domElement.height
      if (menuK > 0.001) camera.setViewOffset(width, height, width * 0.13 * menuK, 0, width, height)
      else if (camera.view?.enabled) camera.clearViewOffset()
      camera.updateProjectionMatrix()
    })

    let frames = 0, last = -1, chimed = false, tapAt = -1, tapPoint = { x: 0, y: 0 }
    const loopAt = T.swap + SWAP.arriveAfter.pop + SWAP.grow
    return {
      duration: 12,
      still: 3,
      update(t, delta) {
        if (t < last) { chimed = false; tapAt = -1; shotLast = -1 }
        last = t
        fit()
        if (++frames === 2) fillPictures(shell, pictures)
        const menu = t >= T.open && t < T.close
        stage.update(t, delta, menu)
        panelAt(look.menu, T.open, T.close, t)
        look.setBook({ met: MET, hellos: 5, friend: t < T.swap ? 'kitsune' : 'dragonling', selected: null })
        const taps: [number, () => { x: number; y: number }][] = [
          [T.tapOpen, () => ({ x: 1114, y: 663 })],
          [T.tapKind, () => look.centre('[data-kind="dragonling"]', screen)],
          [T.tapClose, () => look.centre('.customizer-close', screen)],
        ]
        const now = taps.findLast(([time]) => t >= time)
        if (now) { if (tapAt !== now[0]) { tapAt = now[0]; tapPoint = now[1]() } tap(tapPoint.x, tapPoint.y, t - now[0]) } else tap(0, 0, -1)
        // The dragonling button pulses at the tap.
        const button = look.menu.querySelector<HTMLElement>('[data-kind="dragonling"]')!
        const pulse = ramp(t, T.tapKind, T.tapKind + 0.4)
        button.style.transform = pulse > 0 && pulse < 1 ? `scale(${1 + Math.sin(pulse * Math.PI) * 0.12})` : ''
        caption(t)
        if (!chimed && t >= loopAt) { chimed = true; chime([880, 1174.66], 0.045) }
      },
      dispose() {
        stage.dispose()
        if (lab.camera.view?.enabled) { lab.camera.clearViewOffset(); lab.camera.updateProjectionMatrix() }
        untip()
      },
    }
  },
}
