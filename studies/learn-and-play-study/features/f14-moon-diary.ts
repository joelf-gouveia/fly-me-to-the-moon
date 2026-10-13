import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { orientFlight } from '../../../src/flight'
import { overlay, ramp } from './shared'

/**
 * F14 · Moon shapes diary. The Moon of the game has real phases: its night side is dark. The
 * diary keeps each shape that the child sees from Earth: new, crescent, half, almost full and
 * full. In the game a month is 300 s, so a diary fills in one or two visits. The clip moves the
 * Moon across the evening sky in 11 s, away from the Sun, to show three shapes.
 */
export const SHAPES = [
  { id: 'new', name: 'New Moon', lit: 0 },
  { id: 'crescent', name: 'Crescent', lit: 0.2 },
  { id: 'half', name: 'Half Moon', lit: 0.5 },
  { id: 'gibbous', name: 'Almost full', lit: 0.82 },
  { id: 'full', name: 'Full Moon', lit: 1 },
] as const
/** The shape of the Moon for the angle between the Moon and the Sun in the sky, in degrees. */
export function shapeAt(elongation: number) {
  return SHAPES[elongation < 18 ? 0 : elongation < 68 ? 1 : elongation < 112 ? 2 : elongation < 158 ? 3 : 4]
}

/** The drawing of a shape: a dark disc and its lit part, on the right. */
export function shapeIcon(lit: number) {
  const k = 1 - 2 * lit, r = 40
  // A half circle, then an ellipse for the line between light and dark.
  const path = `M50 ${50 - r} A${r} ${r} 0 0 1 50 ${50 + r} A${(Math.abs(k) * r).toFixed(1)} ${r} 0 0 ${k > 0 ? 0 : 1} 50 ${50 - r}Z`
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="#39406a"/>${lit > 0 ? `<path d="${path}" fill="#fff3c4"/>` : ''}</svg>`
}

const DURATION = 11

export const moonDiary: Feature = {
  id: 'F14',
  create(lab) {
    const { earth, moon, sun, meadowLocal } = lab
    const savedMoon = moon.group.position.clone()
    lab.setSunElevation(earth, meadowLocal, -7)
    const centre = earth.group.position
    const place = lab.surfacePoint(earth, meadowLocal, 26)
    const up = lab.upAt(earth, place)
    const toSun = sun.group.position.clone().sub(place).normalize()
    const sunFlat = toSun.clone().addScaledVector(up, -toSun.dot(up)).normalize()
    // The Moon keeps its distance from the meadow, so it keeps its size in the sky.
    const reach = savedMoon.distanceTo(centre) - earth.radius
    const moonDirection = new THREE.Vector3(), right = new THREE.Vector3(), target = new THREE.Vector3()
    /** The direction to the Moon of the clip, from the meadow: from near the sunset to the far side of the sky, and higher. */
    function directionAt(t: number, out = moonDirection) {
      const k = ramp(t, 0, DURATION)
      const azimuth = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(24, 152, k)), height = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(17, 40, k))
      return out.copy(sunFlat).applyAxisAngle(up, azimuth).multiplyScalar(Math.cos(height)).addScaledVector(up, Math.sin(height))
    }
    /** Puts the Moon in its place for the clip time. It returns the angle between the Moon and the Sun, in degrees. */
    function moonAt(t: number) {
      moon.group.position.copy(place).addScaledVector(directionAt(t), reach)
      moon.group.updateMatrixWorld(true)
      return THREE.MathUtils.radToDeg(moonDirection.angleTo(toSun))
    }
    // The fairy floats low at the left of the view. Her rail follows the turn of the camera.
    const floatAt = (t: number) => {
      const direction = directionAt(t, new THREE.Vector3())
      return place.clone().addScaledVector(direction, 13).addScaledVector(new THREE.Vector3().crossVectors(direction, up).normalize(), -3.4).addScaledVector(up, -3.9)
    }
    lab.setRailPoints(earth, Array.from({ length: 34 }, (_, i) => floatAt(i / 33 * DURATION)))
    lab.setShot((camera, t) => {
      moonAt(t)
      target.copy(place).addScaledVector(moonDirection, 100).addScaledVector(up, -9)
      camera.position.copy(place)
      camera.up.copy(up)
      camera.fov = 26
      camera.updateProjectionMatrix()
      camera.lookAt(target)
    })

    const root = overlay(lab, `<div class="lp-strip f14-strip"><div class="lp-strip-title"><small>MOON DIARY</small><b id="f14-name"></b></div>${SHAPES.map(shape => `<div class="lp-slot-wrap"><div class="lp-slot f14-slot is-empty" data-shape="${shape.id}">${shapeIcon(shape.lit)}</div><em>${shape.name}</em></div>`).join('')}</div>`)
    const name = root.querySelector<HTMLElement>('#f14-name')!
    const slots = new Map<string, HTMLElement>(SHAPES.map(shape => [shape.id, root.querySelector<HTMLElement>(`[data-shape="${shape.id}"]`)!]))
    const seen = new Map<string, number>()
    const heading = new THREE.Vector3()
    let last = -1

    return {
      duration: DURATION,
      still: 6.4,
      update(t) {
        if (t < last) seen.clear()
        last = t
        const shape = shapeAt(moonAt(t))
        if (!seen.has(shape.id) && t > 0.5) { seen.set(shape.id, t); chime([587.33, 880], 0.045) }
        name.textContent = shape.name
        for (const [id, slot] of slots) {
          const at = seen.get(id)
          slot.classList.toggle('is-empty', at === undefined)
          slot.classList.toggle('is-full', at !== undefined)
          slot.style.transform = at !== undefined && t - at < 0.5 ? `scale(${1 + Math.sin((t - at) * Math.PI * 2) * 0.3})` : ''
        }
        // She looks at the Moon.
        right.crossVectors(moonDirection, up).normalize()
        heading.copy(moonDirection).addScaledVector(right, 0.25).normalize()
        if (lab.mode === 'clip') orientFlight(lab.fairy.quaternion, heading, up)
      },
      dispose() {
        moon.group.position.copy(savedMoon)
        moon.group.updateMatrixWorld(true)
      },
    }
  },
}
