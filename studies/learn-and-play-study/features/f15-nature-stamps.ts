import * as THREE from 'three'
import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { zoneNameAt } from '../../../src/foliage/build'
import { BELTS } from '../../../src/foliage/zones'
import { surfaceRadius } from '../../../src/worlds'
import { overlay, pop } from './shared'

/**
 * F15 · Nature stamps. Earth has seven climate belts, and the flight panel names the belt below
 * the fairy. The first flight over a belt gives its stamp. The stamps follow a rule, not a
 * place: each new Earth has the same seven belts, so the book stays correct after each visit.
 * Blossom Haven gives a stamp for each garden and each magic season in the same way.
 */
export const BELT_STAMPS: { id: keyof typeof BELTS; icon: string; colour: string }[] = [
  { id: 'beach', icon: '🌴', colour: '#e2b65c' },
  { id: 'jungle', icon: '🦜', colour: '#3f8a3c' },
  { id: 'savanna', icon: '🦒', colour: '#b39a3f' },
  { id: 'desert', icon: '🌵', colour: '#d0a45e' },
  { id: 'temperate', icon: '🍂', colour: '#6aa64b' },
  { id: 'taiga', icon: '🌲', colour: '#3f7a57' },
  { id: 'tundra', icon: '❄️', colour: '#7fa9c9' },
]
const DURATION = 11, ALT = 15, FROM = 3, TO = 68

export const natureStamps: Feature = {
  id: 'F15',
  create(lab) {
    const { earth } = lab
    earth.group.updateMatrixWorld(true)
    const point = (latitude: number, longitude: number, alt: number) => {
      const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude)
      const normal = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).applyQuaternion(earth.group.quaternion)
      return earth.group.position.clone().addScaledVector(normal, Math.max(surfaceRadius(earth, normal), earth.radius) + alt)
    }
    // The line from the equator to the north with the most belts and the most land.
    let longitude = 0, best = -1
    for (let lon = 0; lon < 360; lon += 10) {
      const names = new Set<string>()
      let land = 0
      for (let lat = FROM; lat <= TO; lat += 2.5) {
        const name = zoneNameAt(earth, point(lat, lon, ALT))
        if (name) { names.add(name); land++ }
      }
      const score = names.size * 10 + land
      if (score > best) { best = score; longitude = lon }
    }
    // The Sun is high over the middle of the line. The turn of Earth moves the ground, so the rail comes after it.
    const middle = THREE.MathUtils.degToRad((FROM + TO) / 2), turn = THREE.MathUtils.degToRad(longitude)
    lab.setSunElevation(earth, new THREE.Vector3(Math.cos(middle) * Math.cos(turn), Math.sin(middle), Math.cos(middle) * Math.sin(turn)), 44)
    lab.setRailPoints(earth, Array.from({ length: 14 }, (_, i) => point(THREE.MathUtils.lerp(FROM, TO, i / 13), longitude + Math.sin(i * 0.9) * 1.2, ALT + Math.sin(i * 1.3) * 2)))
    lab.setFollow(9.5, 3.4)
    lab.setBoost(true)

    const byName = new Map(BELT_STAMPS.map(stamp => [BELTS[stamp.id].name, stamp]))
    const root = overlay(lab, `
      <div class="f15-stamp"><span></span><b></b><small>NEW STAMP</small></div>
      <div class="lp-strip"><div class="lp-strip-title"><small>NATURE STAMPS</small><b id="f15-count"></b></div>${BELT_STAMPS.map(stamp => `<div class="lp-slot f15-slot is-empty" data-belt="${stamp.id}" style="--belt:${stamp.colour}"><span>${stamp.icon}</span></div>`).join('')}</div>`)
    const stamp = root.querySelector<HTMLElement>('.f15-stamp')!, count = root.querySelector<HTMLElement>('#f15-count')!
    const slots = new Map(BELT_STAMPS.map(item => [item.id, root.querySelector<HTMLElement>(`[data-belt="${item.id}"]`)!]))
    const seen = new Map<string, number>()
    let last = -1, shownAt = -1

    return {
      duration: DURATION,
      still: 6.2,
      update(t) {
        if (t < last) { seen.clear(); shownAt = -1 }
        last = t
        const belt = byName.get(zoneNameAt(earth, lab.fairy.position) ?? '')
        if (belt && !seen.has(belt.id) && t - shownAt > 0.9) {
          seen.set(belt.id, t); shownAt = t
          chime([523.25, 783.99], 0.05)
          stamp.style.setProperty('--belt', belt.colour)
          stamp.querySelector('span')!.textContent = belt.icon
          stamp.querySelector('b')!.textContent = BELTS[belt.id].name
        }
        pop(stamp, shownAt < 0 ? -1 : t - shownAt, 1.25, `rotate(${-8 + Math.min(1, Math.max(0, t - shownAt) / 0.3) * 8}deg)`)
        for (const [id, slot] of slots) {
          const at = seen.get(id)
          slot.classList.toggle('is-empty', at === undefined)
          slot.classList.toggle('is-full', at !== undefined)
          slot.style.transform = at !== undefined && t - at < 0.5 ? `scale(${1 + Math.sin((t - at) * Math.PI * 2) * 0.3})` : ''
        }
        count.textContent = `${seen.size} of ${BELT_STAMPS.length}`
      },
      dispose() {},
    }
  },
}
