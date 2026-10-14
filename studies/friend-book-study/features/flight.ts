import * as THREE from 'three'
import type { CameraShot, Lab } from '../../feature-ideas-study/lab'
import type { World } from '../../../src/worlds'

/**
 * A flight path on a world for a clip: points at a distance along a heading, to the side, and
 * over the ground. The heading has the Sun behind the camera, so the fairy and the friend have
 * the light on their backs and faces, as in the clips of the other studies.
 */
export function flightPath(lab: Lab, world: World, start: THREE.Vector3, turn = 0) {
  const centre = world.group.position
  const unspin = world.group.quaternion.clone().invert()
  const dir = start.clone().normalize()
  const sunLocal = lab.sun.group.position.clone().sub(centre).applyQuaternion(unspin).normalize()
  // Away from the Sun on the ground: the Sun is behind the fairy and the camera.
  const heading = sunLocal.clone().addScaledVector(dir, -sunLocal.dot(dir)).multiplyScalar(-1).normalize().applyAxisAngle(dir, turn)
  const side = new THREE.Vector3().crossVectors(dir, heading).normalize()
  /** The world point `along` metres ahead, `across` metres to the side, `alt` metres over the ground. */
  const at = (along: number, across: number, alt: number) => {
    let point = lab.stepAlong(world, dir, heading, along)
    if (across) point = lab.stepAlong(world, point, side, across)
    return lab.surfacePoint(world, point, alt)
  }
  return { at, heading, side }
}

/**
 * A short caption at the bottom of the clip, for the person who watches it. A line can be at the
 * top of the view, over a dialog: `top` is true.
 */
export function createCaption(layer: HTMLElement, lines: [from: number, to: number, html: string, top?: boolean][]) {
  const caption = document.createElement('p')
  caption.className = 'fb-caption'
  layer.append(caption)
  let shown = ''
  return (t: number) => {
    const line = lines.find(([from, to]) => t >= from && t < to)
    if (!line) { caption.style.visibility = 'hidden'; return }
    if (line[2] !== shown) { caption.innerHTML = line[2]; shown = line[2] }
    caption.style.visibility = 'visible'
    caption.classList.toggle('is-top', Boolean(line[3]))
    caption.style.opacity = String(Math.min(1, (t - line[0]) / 0.3, (line[1] - t) / 0.3))
  }
}

/**
 * Runs `make` (a creature pass of the learn and play study, which sets its own side camera) and
 * returns that camera, in place of setting it. The clip then uses it until a time of its choice.
 */
export function keepShot(lab: Lab, make: () => void) {
  const setShot = lab.setShot
  let kept: CameraShot | null = null
  lab.setShot = next => { kept = next }
  try { make() } finally { lab.setShot = setShot }
  return kept as CameraShot | null
}

/**
 * The pass camera until `from`, then a camera that goes smoothly to a place near the fairy:
 * `place(fairy frame)` gives the camera position and the point to look at.
 */
export function passThenChase(lab: Lab, pass: CameraShot | null, from: number, place: (out: { eye: THREE.Vector3; look: THREE.Vector3 }, axes: { forward: THREE.Vector3; up: THREE.Vector3; right: THREE.Vector3 }) => void, rate = 2.2) {
  const axes = { forward: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3() }
  const goal = { eye: new THREE.Vector3(), look: new THREE.Vector3() }, look = new THREE.Vector3()
  let last = -1
  lab.setShot((camera, t) => {
    if (t < from || !pass) { pass?.(camera, t); last = -1; return }
    const fairy = lab.fairy
    axes.forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    axes.up.copy(fairy.position).sub(lab.nearest.group.position).normalize()
    axes.right.crossVectors(axes.forward, axes.up).normalize()
    place(goal, axes)
    if (last < 0) {
      // The look point starts where the pass camera looks now.
      look.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(goal.look.distanceTo(camera.position)).add(camera.position)
    }
    const k = last < 0 ? 0 : 1 - Math.exp(-(t - last) * rate)
    last = t
    camera.position.lerp(goal.eye, k)
    look.lerp(goal.look, k)
    camera.up.lerp(axes.up, k).normalize()
    camera.lookAt(look)
  })
}
