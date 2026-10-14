import * as THREE from 'three'
import type { Lab } from '../../feature-ideas-study/lab'
import { createFriend, friendFlies, friendPlace, friendSize } from '../../../src/friend'
import type { FriendKind } from '../../../src/friend'
import { nearestWorldAt } from '../../../src/flight'
import { surfaceRadius } from '../../../src/worlds'
import { createBurst } from '../../learn-and-play-study/features/shared'
import { clamp01, ramp, smooth } from './kit'

/**
 * The fairy friend of the game (createFriend() of src/friend.ts) in the lab, with the swap of
 * this study: the old friend says goodbye and leaves, and the new friend comes and makes the
 * happy loop. The follow rule, the models, the bubble, the dust and the loop are the game code;
 * the leave and the arrival are study code, on top of the place that the follow rule gives.
 */
export type Leave = 'home' | 'pop'
export type Arrive = 'sky' | 'grow' | 'rise'
export type Swap = {
  at: number
  to: FriendKind
  leave: Leave
  arrive: Arrive
  /** The world point where a 'rise' arrival starts, at the clip time `t`. */
  from?: (t: number) => THREE.Vector3
}

/** The times of a swap, in seconds. The wave, the flight home, and the arrival. */
export const SWAP = { wave: 0.9, home: 2.1, pop: 0.4, arriveAfter: { home: 1.5, pop: 0.3 }, sky: 1.5, rise: 1.8, grow: 0.45 }

const easeIn = (x: number) => x * x * x
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

export function createFriendStage(lab: Lab, first: FriendKind | null) {
  const sparkle = lab.softDisc()
  const current = createFriend(lab.scene, sparkle)
  const leaving = createFriend(lab.scene, sparkle)
  const burst = createBurst(lab, 60, 0xffe2b0)
  // A small soft burst for a bubble that pops near the camera of the look menu.
  const soft = createBurst(lab, 26, 0xffd6ea)
  const place = new THREE.Vector3()
  const up = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), path = new THREE.Vector3()
  const start = new THREE.Vector3(), look = new THREE.Object3D(), roll = new THREE.Quaternion(), axis = new THREE.Vector3()
  let nearest = lab.nearest
  const ground = { centre: nearest.group.position, radiusAt: (direction: THREE.Vector3) => surfaceRadius(nearest, direction) }
  let swaps: Swap[] = []
  let last = -1, done = new Set<string>(), menuK = 0
  const sizeOf = (menu: boolean) => friendSize(lab.camera.aspect, menu)

  function reset() {
    current.setKind(first, false)
    current.follow.reset()
    leaving.setKind(null, false)
    done = new Set()
  }
  reset()

  /** The frame of the fairy now: her up, her forward (-z) and her right (+x) in the scene. */
  function axes() {
    up.set(0, 1, 0).applyQuaternion(lab.fairy.quaternion)
    forward.set(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
    right.set(1, 0, 0).applyQuaternion(lab.fairy.quaternion)
  }
  /** Turns the holder so that its forward (-z) is along `direction`. */
  function face(holder: THREE.Object3D, direction: THREE.Vector3, amount: number) {
    look.position.copy(holder.position)
    look.up.copy(up)
    look.lookAt(start.copy(holder.position).sub(direction))
    holder.quaternion.slerp(look.quaternion, amount)
  }

  return {
    /** The swaps of the clip, in the order of their times. */
    setSwaps(next: Swap[]) { swaps = next },
    get kind() { return current.kind },
    get holder() { return current.holder },
    /**
     * One frame. `delta` is the time of the friend (0 holds its pose, as in a pause or in Worlds).
     * `menu` is the look menu: the friend comes near and turns to the camera.
     */
    update(t: number, delta: number, menu = false) {
      if (t < last) reset()
      last = t
      nearest = nearestWorldAt(lab.fairy.position, lab.worlds)
      ground.centre = nearest.group.position
      axes()
      menuK += ((menu ? 1 : 0) - menuK) * (1 - Math.exp(-Math.max(delta, 1 / 30) * 5))
      const frame = (holdMenu: boolean) => ({
        fairy: lab.fairy.position, heading: lab.fairy.quaternion, delta, carry: null, still: false, ground,
        camera: lab.camera.position, menu: holdMenu, fast: false, light: lab.light.day, size: sizeOf(menu), place: place,
      })
      // The place at her side: the flight place, or the near place of the look menu.
      const flightPlace = friendPlace(lab.camera.aspect, false, new THREE.Vector3()), menuPlace = friendPlace(lab.camera.aspect, true, new THREE.Vector3())
      place.copy(flightPlace).lerp(menuPlace, menuK)

      const swap = swaps.findLast(item => t >= item.at)
      // The start of a swap: the old model goes to the leaving friend, and the current friend waits for the new one.
      if (swap && !done.has(`start-${swap.at}`)) {
        done.add(`start-${swap.at}`)
        const old = current.kind
        leaving.setKind(old, false)
        leaving.follow.reset()
        current.setKind(null, false)
      }
      const arriveAt = swap ? swap.at + SWAP.arriveAfter[swap.leave] : Infinity
      if (swap && t >= arriveAt && !done.has(`arrive-${swap.at}`)) {
        done.add(`arrive-${swap.at}`)
        current.setKind(swap.to, swap.arrive === 'grow')
        current.follow.reset()
        if (swap.arrive === 'sky') burst.fire(start.copy(lab.fairy.position).addScaledVector(forward, 15).addScaledVector(up, 5.5).addScaledVector(right, -1.5), t, 3)
      }

      // ---- The old friend leaves ----
      if (leaving.kind && swap) {
        const age = t - swap.at
        leaving.update(frame(age < SWAP.wave))
        const holder = leaving.holder
        if (swap.leave === 'pop') {
          // The bubble pops softly: a small swell, then the friend goes in sparkles.
          const k = ramp(age, 0, SWAP.pop)
          holder.scale.multiplyScalar(k < 0.35 ? 1 + Math.sin(k / 0.35 * Math.PI) * 0.12 : 1 - smooth((k - 0.35) / 0.65))
          if (!done.has(`pop-${swap.at}`)) { done.add(`pop-${swap.at}`); soft.fire(holder.position.clone(), t, 1.1) }
          if (age >= SWAP.pop) leaving.setKind(null, false)
        } else {
          if (age < SWAP.wave) {
            // The wave: it rocks from side to side, with a small hop.
            const k = age / SWAP.wave
            holder.position.addScaledVector(up, Math.sin(k * Math.PI) * 0.35)
            axis.set(0, 0, 1)
            roll.setFromAxisAngle(axis, Math.sin(k * Math.PI * 4) * 0.42 * (1 - k * 0.5))
            holder.quaternion.multiply(roll)
          } else {
            // The flight home: up, forward and out to the side, faster and faster, and smaller at the end.
            const k = clamp01((age - SWAP.wave) / SWAP.home)
            const flies = friendFlies(leaving.kind)
            path.copy(up).multiplyScalar(flies ? 0.5 : 0.85).addScaledVector(forward, flies ? 0.75 : 0.35).addScaledVector(right, 0.55).normalize()
            holder.position.addScaledVector(path, easeIn(k) * (flies ? 34 : 20))
            face(holder, path, smooth(ramp(k, 0, 0.3)))
            holder.scale.multiplyScalar(1 - smooth(ramp(k, 0.72, 1)))
            if (k >= 1) {
              burst.fire(holder.position.clone(), t, 1.6)
              leaving.setKind(null, false)
            }
          }
        }
      }

      // ---- The friend now, and the arrival of a new friend ----
      current.update(frame(menu))
      if (swap && current.kind === swap.to && t >= arriveAt) {
        const age = t - arriveAt
        const length = swap.arrive === 'rise' ? SWAP.rise : swap.arrive === 'sky' ? SWAP.sky : SWAP.grow
        const k = ramp(age, 0, length)
        if (swap.arrive !== 'grow' && k < 1) {
          if (swap.arrive === 'sky') start.copy(lab.fairy.position).addScaledVector(forward, 15).addScaledVector(up, 5.5).addScaledVector(right, -1.5)
          else start.copy(swap.from!(t))
          current.holder.position.lerpVectors(start, current.follow.position, easeOut(k))
          current.holder.scale.multiplyScalar(0.35 + 0.65 * smooth(ramp(k, 0, 0.6)))
        }
        // The happy loop when it is at its place.
        if (k >= 1 && !done.has(`loop-${swap.at}`)) { done.add(`loop-${swap.at}`); current.cheer(false, true) }
      }
      burst.update(t, delta > 0 ? delta : 1 / 30)
      soft.update(t, delta > 0 ? delta : 1 / 30)
    },
    /** The friend makes the happy loop now (a gift with no swap). */
    cheer() { current.cheer(false, true) },
    /** Shows a kind at once, with the grow of the game (the gift). */
    give(kind: FriendKind) { current.setKind(kind, true) },
    restart() { reset() },
    dispose() { current.dispose(); leaving.dispose(); burst.dispose(); soft.dispose(); sparkle.dispose() },
  }
}
export type FriendStage = ReturnType<typeof createFriendStage>
