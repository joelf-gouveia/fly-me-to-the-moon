import * as THREE from 'three'
import type { Feature, Kind } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import type { World } from '../../../src/worlds'
import { overlay } from './shared'

/**
 * F16 · Picture thermometer. A thermometer with a face shows if the world near the fairy is hot
 * or cold. It has no numbers: the level, the colour and the face give the answer. The clip goes
 * to Venus, the hottest planet, and then to Uranus, the coldest one.
 */
/**
 * The level of each world, from 0 (the coldest) to 1 (the hottest). The order follows the real temperatures.
 * Uranus is below Neptune, as the sticker fact of the game says: its lowest temperature is the lowest of the planets.
 */
export const WARMTH: Record<Kind, number> = {
  sun: 1, venus: 0.92, mercury: 0.8, earth: 0.55, fairy: 0.55, moon: 0.45, mars: 0.34, vesta: 0.26, ceres: 0.24,
  jupiter: 0.16, saturn: 0.12, neptune: 0.06, uranus: 0.04,
}
export function warmthFace(level: number) {
  return level > 0.75 ? { face: '🥵', word: 'HOT' } : level > 0.62 ? { face: '😅', word: 'WARM' } : level > 0.42 ? { face: '😊', word: 'NICE' } : level > 0.2 ? { face: '😬', word: 'COOL' } : { face: '🥶', word: 'COLD' }
}
const cold = new THREE.Color('#5fb8ff'), mild = new THREE.Color('#7fd08a'), hot = new THREE.Color('#ff5a4a'), mixed = new THREE.Color()
export function warmthColour(level: number) {
  if (level < 0.5) mixed.copy(cold).lerp(mild, level * 2)
  else mixed.copy(mild).lerp(hot, level * 2 - 1)
  return `#${mixed.getHexString()}`
}
const CUT = 5.6

export const thermometer: Feature = {
  id: 'F16',
  create(lab) {
    const { sun } = lab
    /** A path down to the day side of a world, from `from` to `to` metres above it. */
    function approach(world: World, start: number, end: number | undefined, from: number, to: number) {
      const unspin = world.group.quaternion.clone().invert()
      const day = sun.group.position.clone().sub(world.group.position).applyQuaternion(unspin).normalize()
      const axis = new THREE.Vector3(0, 1, 0)
      const points = [0, 1, 2, 3, 4].map(i => ({ dir: day.clone().applyAxisAngle(axis, -0.5 + i * 0.13), alt: THREE.MathUtils.lerp(from, to, i / 4) }))
      lab.setRail(world, points, start, end)
    }
    approach(lab.byKind('venus'), 0, CUT, 380, 150)
    approach(lab.byKind('uranus'), CUT, undefined, 420, 170)
    lab.setFollow(8, 2.8)

    const root = overlay(lab, `
      <div class="f16-meter">
        <svg viewBox="0 0 40 140" aria-hidden="true">
          <rect x="13" y="6" width="14" height="104" rx="7" fill="#ffffff22" stroke="#fff" stroke-width="2"/>
          <rect class="f16-level" x="16" y="9" width="8" height="98" rx="4" fill="#fff"/>
          <circle class="f16-bulb" cx="20" cy="120" r="15" fill="#fff" stroke="#fff" stroke-width="2"/>
        </svg>
        <div class="f16-face"><span></span><b></b></div>
      </div>`)
    const level = root.querySelector<SVGRectElement>('.f16-level')!, bulb = root.querySelector<SVGCircleElement>('.f16-bulb')!
    const face = root.querySelector<HTMLElement>('.f16-face span')!, word = root.querySelector<HTMLElement>('.f16-face b')!
    let shown = 0.5, last = -1, said = ''

    return {
      duration: 11,
      still: 3.6,
      update(t, delta) {
        if (t < last) { shown = 0.5; said = '' }
        last = t
        // The thermometer moves to the level of the nearest world when the fairy is near it.
        const world = lab.nearest
        const distance = lab.fairy.position.distanceTo(world.group.position) - world.radius
        const near = distance < Math.max(85, world.atmosphere * 1.5) * 1.9
        const goal = near ? WARMTH[world.kind] : 0.5
        shown += (goal - shown) * (1 - Math.exp(-delta * 2.2))
        const look = warmthFace(shown)
        const colour = warmthColour(shown)
        const height = 8 + shown * 90
        level.setAttribute('y', String(9 + 98 - height)); level.setAttribute('height', String(height))
        level.setAttribute('fill', colour); bulb.setAttribute('fill', colour)
        face.textContent = look.face; word.textContent = look.word; word.style.color = colour
        if (look.word !== said && (look.word === 'HOT' || look.word === 'COLD')) chime(look.word === 'HOT' ? [392, 493.88, 587.33] : [587.33, 493.88, 392], 0.045)
        said = look.word
      },
      dispose() {},
    }
  },
}
