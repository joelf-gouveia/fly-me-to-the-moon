import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { groundRail } from '../../feature-ideas-study/features/path'
import { createFairytaleCreature } from '../../../src/creatures/fairytale-models'
import { overlay, pop, portrait, ramp, smooth, tipToSun } from './shared'

/**
 * F19 · Fairy friend. After five hellos, a small friend comes to fly with the fairy. The clip
 * shows a pegasus foal of Blossom Haven. It keeps a place at her side, a little late in each
 * turn, and at times it makes a happy loop around her. The friend has no task and no health:
 * it is company. The child selects the friend in Your fairy.
 */
/** How the friend follows: its place from the fairy, and how fast it comes to that place. */
export const FRIEND = { right: 2.2, up: 0.5, back: 0.4, scale: 0.95, follow: 3.2, loopAt: 6.4, loopFor: 1.5, hellos: 5 }

export const fairyFriend: Feature = {
  id: 'F19',
  create(lab) {
    const { home } = lab
    const anchor = new THREE.Vector3(0.1, -1, 0.3).normalize()
    const untip = tipToSun(lab, home, anchor, 46)
    const stops: [number, number, number][] = [[-50, 6, 9], [-28, 0, 8], [-6, -5, 7.2], [16, -2, 8], [38, 5, 7.4], [60, 3, 8.6], [82, -4, 8], [104, 0, 9.5]]
    lab.setRail(home, groundRail(lab, home, anchor, new THREE.Vector3(1, 0, 0).addScaledVector(anchor, -anchor.x).normalize(), stops))
    lab.setFollow(9, 2.9)

    const friend = createFairytaleCreature('pegasus')
    const holder = new THREE.Group()
    holder.add(friend.root)
    // The models of the game face +z, and the fairy flies toward -z.
    friend.root.rotation.y = Math.PI
    holder.scale.setScalar(FRIEND.scale)
    lab.scene.add(holder)
    // The sparkle trail of the friend: a few points behind it.
    const count = 26
    const positions = new Float32Array(count * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ size: 0.3, map: lab.softDisc('rgba(214,205,255,1)'), color: 0xd9d2ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })
    const sparkles = new THREE.Points(geometry, material)
    sparkles.frustumCulled = false
    lab.scene.add(sparkles)

    const root = overlay(lab, `<div class="lp-card f19-card"><img alt=""><div><small>YOUR FRIEND</small><h2>Pegasus foal</h2><p>You said hello ${FRIEND.hellos} times. A friend flies with you now.</p><div class="lp-icons"><span>💜</span><span>💜</span><span>💜</span><span>💜</span><span>💜</span></div></div></div>`)
    const note = root.querySelector<HTMLElement>('.lp-card')!
    const goal = new THREE.Vector3(), offset = new THREE.Vector3(), place = new THREE.Vector3(), before = new THREE.Vector3()
    let started = false, last = -1, cursor = 0, chimed = 0, frames = 0, pictured = false

    return {
      duration: 10.5,
      still: 4.6,
      update(t, delta) {
        if (t < last) { started = false; chimed = 0 }
        last = t
        if (!pictured && ++frames > 1) {
          pictured = true
          const model = createFairytaleCreature('pegasus')
          model.animate(0, false, { details: true, magic: false, motion: false })
          note.querySelector('img')!.src = portrait(lab, model.root, 0xa99be6, 0.8)
          model.dispose()
        }
        // The place of the friend: at her right side. In the loop it goes around her one time.
        const loop = ramp(t, FRIEND.loopAt, FRIEND.loopAt + FRIEND.loopFor)
        const angle = smooth(loop) * Math.PI * 2
        offset.set(Math.cos(angle) * FRIEND.right, FRIEND.up + Math.sin(angle) * FRIEND.right * 0.8 + Math.sin(t * 2.6) * 0.18, FRIEND.back).applyQuaternion(lab.fairy.quaternion)
        goal.copy(lab.fairy.position).add(offset)
        if (!started) { place.copy(goal); holder.quaternion.copy(lab.fairy.quaternion); started = true }
        else {
          // The friend moves with her, and comes to its place a little late.
          place.add(lab.fairy.position).sub(before).lerp(goal, 1 - Math.exp(-delta * FRIEND.follow))
          holder.quaternion.slerp(lab.fairy.quaternion, 1 - Math.exp(-delta * 4))
        }
        before.copy(lab.fairy.position)
        holder.position.copy(place)
        friend.root.rotation.z = Math.sin(angle) * 0.5
        friend.animate(t, true, { details: true, magic: true, motion: true })
        if (delta > 0) {
          const index = cursor++ % count
          positions.set([place.x + (Math.random() - 0.5) * 0.25, place.y + (Math.random() - 0.5) * 0.25, place.z + (Math.random() - 0.5) * 0.25], index * 3)
          geometry.attributes.position.needsUpdate = true
        }
        if (t >= 0.9 && chimed < 1) { chimed = 1; chime([659.25, 880, 1046.5], 0.045) }
        if (t >= FRIEND.loopAt && chimed < 2) { chimed = 2; chime([880, 1174.66], 0.045) }
        pop(note, t - 0.9, 3.6)
      },
      dispose() {
        lab.scene.remove(holder, sparkles)
        friend.dispose(); geometry.dispose(); material.map?.dispose(); material.dispose()
        untip()
      },
    }
  },
}
