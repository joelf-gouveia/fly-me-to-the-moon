import * as THREE from 'three'
import type { Feature, Lab } from '../../feature-ideas-study/lab'
import type { World } from '../../../src/worlds'
import { magicOffset, setMagic } from '../../../src/magic-seasons'
import { tipToSun } from '../../learn-and-play-study/features/shared'
import type { OptionId } from '../catalog'
import { magicOf, surveyOf } from '../fauna'
import type { Fauna, FaunaHerd } from '../fauna'
import { addFauna, beltRoute, herdsOf, kindsOf, nearStops, optionLabel, overCamera, passes, railOver, sideCamera, stepFauna, tourDirs } from './kit'

/**
 * The clips of the animals study. Each clip runs in the lab of the feature ideas study, on the
 * real Earth and Blossom Haven of the game, with the fauna of one option (fauna.ts).
 */

/** A run with a fauna and a label. */
function run(lab: Lab, fauna: Fauna[], duration: number, label: ((calls: number, animals: number, shown: number) => void) | null, more: { update?: (t: number) => void; dispose?: () => void } = {}) {
  // The browser checks and the tuning of a clip read the fauna here.
  Object.assign(window, { __fauna: fauna })
  return {
    duration,
    update(t: number, delta: number) {
      for (const item of fauna) stepFauna(lab, item, t, delta)
      more.update?.(t)
      label?.(lab.renderer.info.render.calls, fauna.reduce((sum, item) => sum + item.calls, 0), fauna.reduce((sum, item) => sum + item.shown, 0))
    },
    dispose() { fauna.forEach(item => item.dispose()); more.dispose?.() },
  }
}

/** The shortest tour through one herd of each species of `ids`, from the herds of the first species. */
export function bestTour(fauna: Fauna, ids: string[], limit = 0.5): FaunaHerd[] {
  let best: FaunaHerd[] = [], bestLength = Infinity
  for (const first of herdsOf(fauna, ids[0])) {
    const stops = [first]
    for (const id of ids.slice(1)) {
      // The next stop is the nearest group of the next species that is at least 9 m away: the fairy must fly between them.
      const from = stops[stops.length - 1].route[0]
      const next = herdsOf(fauna, id, from).find(herd => herd.route[0].angleTo(from) * radiusOf(fauna) > 9)
      if (next) stops.push(next)
    }
    if (stops.length < ids.length) continue
    let length = 0
    for (let i = 1; i < stops.length; i++) length += stops[i - 1].route[0].angleTo(stops[i].route[0])
    // A short tour that has each species, with no long flight between two stops (angles in radians).
    const longest = Math.max(...stops.slice(1).map((stop, i) => stop.route[0].angleTo(stops[i].route[0])))
    if (length < bestLength && longest < limit) { best = stops; bestLength = length }
  }
  // No tour within the limit: the shortest tour of all.
  return best.length || limit > 10 ? best : bestTour(fauna, ids, 100)
}
const radiusOf = (fauna: Fauna) => fauna.radius
const lengthOf = (world: World, dirs: THREE.Vector3[]) => dirs.slice(1).reduce((sum, dir, i) => sum + dir.angleTo(dirs[i]) * world.radius, 0)

// ---- A, B and C: the same flight across the belts of Earth ----------------------------------------

/**
 * The route of the belt clips: a herd of each belt from the savanna to the snow line, going north,
 * from the herds of option B. A kind has the same herds in each option, so A, B and C fly the same route.
 */
function beltStops(lab: Lab) {
  const earth = lab.earth
  const fauna = addFauna(earth, { option: 'B' })
  const chain = ['zebra', 'deer', 'moose', 'reindeer']
  let best: FaunaHerd[] = [], bestLength = Infinity
  for (const first of herdsOf(fauna, 'zebra').filter(herd => herd.route[0].y > 0.05)) {
    const stops = [first]
    for (const id of chain.slice(1)) {
      const from = stops[stops.length - 1].route[0]
      const next = herdsOf(fauna, id, from).find(herd => herd.route[0].y > from.y + 0.05 && herd.route[0].angleTo(from) < 0.55)
      if (!next) break
      stops.push(next)
    }
    if (stops.length < chain.length) continue
    const length = stops.slice(1).reduce((sum, stop, i) => sum + stop.route[0].angleTo(stops[i].route[0]), 0)
    if (length < bestLength) { best = stops; bestLength = length }
  }
  // The herds of the chain of B; their places are the same in A and C.
  const dirs = best.length ? tourDirs(earth, best, 5, 30, 20) : beltRoute(earth, fauna)
  fauna.dispose()
  return dirs
}

export const acrossBelts = (option: OptionId): Feature => ({
  id: option,
  create(lab) {
    const earth = lab.earth
    const dirs = beltStops(lab)
    const fauna = addFauna(earth, { option })
    lab.setSunElevation(earth, dirs[Math.floor(dirs.length * 0.4)], 44)
    lab.setRail(earth, railOver(earth, dirs, 4.2), 0, 13)
    sideCamera(lab, earth, { back: 8, up: 3.6, right: 2.6, ahead: 12, drop: 2.6 })
    const label = optionLabel(lab, `Option ${option} · ${kindsOf(option, 'earth')} kinds on Earth`)
    return { ...run(lab, [fauna], 13, label), still: 6 }
  },
})

// ---- S: a herd on the savanna -----------------------------------------------------------------------

export const savannaHerd: Feature = {
  id: 'S',
  create(lab) {
    const earth = lab.earth
    const fauna = addFauna(earth, { option: 'B', density: 1.3 })
    const stops = bestTour(fauna, ['giraffe', 'zebra', 'elephant'], 0.25)
    const dirs = tourDirs(earth, stops, 4, 34, 24)
    lab.setSunElevation(earth, stops[1].route[0], 40)
    lab.setRail(earth, railOver(earth, dirs, 3.4), 0, 11)
    sideCamera(lab, earth, { back: 7, up: 4.2, right: 3.2, ahead: 10, drop: 3 })
    const label = optionLabel(lab, 'Option B · a savanna of giraffes, zebras and elephants')
    return { ...run(lab, [fauna], 11, label), still: 5.5, length: lengthOf(earth, dirs) }
  },
}

// ---- W: the sea, the shore and the air --------------------------------------------------------------

export const seaAndShore: Feature = {
  id: 'W',
  create(lab) {
    const earth = lab.earth
    const fauna = addFauna(earth, { option: 'C', density: 1.4 })
    const stops = bestTour(fauna, ['dolphin', 'fish', 'flamingo', 'seagull'], 0.3)
    // The pod swims on a loop: the fairy passes outside the loop, so the whole pod is on her right.
    const dirs = tourDirs(earth, stops, [stops[0].loop + 4, 4, 4.5, 5], 18, 20)
    lab.setSunElevation(earth, stops[1].route[0], 38)
    lab.setRail(earth, railOver(earth, dirs, 3.6), 0, 12)
    sideCamera(lab, earth, { back: 7.5, up: 3.6, right: 3.4, ahead: 11, drop: 2.6 })
    const label = optionLabel(lab, 'Option C · dolphins, a school of fish, flamingos and seagulls')
    return { ...run(lab, [fauna], 10, label), still: 4.5 }
  },
}

// ---- H: the gardens of Blossom Haven ----------------------------------------------------------------

export const havenGardens: Feature = {
  id: 'H',
  create(lab) {
    const home = lab.home
    const fauna = addFauna(home, { option: 'B', density: 1.4 })
    const stops = nearStops(home, fauna, ['gummyBear', 'flossLamb', 'jelly', 'crystalDeer'], 55)
    const middle = stops.reduce((sum, herd) => sum.add(herd.route[0]), new THREE.Vector3()).normalize()
    const restore = tipToSun(lab, home, middle, 52)
    const passAt = passes(lab, home, stops, 3.25, { offset: 1.4, alt: 3.2, length: 18, after: 3, view: 0 })
    overCamera(lab, home, fauna, passAt, { back: 5.2, up: 2.8, side: 1.2, toward: 0.68 })
    const label = optionLabel(lab, 'Option B · gummy bear cubs, candy-floss lambs, gummy jellyfish, crystal deer')
    return { ...run(lab, [fauna], 13, label, { dispose: restore }), still: 4.6 }
  },
}

// ---- L: Lantern time on Blossom Haven ----------------------------------------------------------------

export const lanternTime: Feature = {
  id: 'L',
  create(lab) {
    const home = lab.home
    // The year puts a glade of the middle latitudes in the middle of Lantern time (the third season).
    const survey = surveyOf(home)
    const glade = Math.max(0, survey.places.findIndex((place, i) => place.zone === 'glade' && place.surface === 'land' && Math.abs(survey.dirs[i].y) < 0.4))
    const year = magicOffset(survey.dirs[glade].y) + 2 / 4
    const fauna = addFauna(home, { option: 'C', magic: magicOf(year), density: 1.6 })
    const stops = nearStops(home, fauna, ['lanternMoth', 'jelly'], 45)
    const restore = tipToSun(lab, home, stops[0].route[0], -7)
    setMagic(home.magic!, year)
    home.magic!.glow.value = 1.3
    if (home.foliage) home.foliage.glow.value = 1
    const passAt = passes(lab, home, stops, 5, { offset: 1.5, alt: 3.6, length: 24, after: 4, view: 0 })
    overCamera(lab, home, fauna, passAt, { back: 6, up: 3.2, side: 1.2, toward: 0.55 })
    const label = optionLabel(lab, 'Option C · Lantern time: glowing moths in the glade, jellyfish on the soda')
    return {
      ...run(lab, [fauna], 10, label, {
        dispose() {
          restore()
          home.magic!.magicOn.value = 0; home.magic!.glow.value = 0.35
          for (const mesh of home.magic!.plants) mesh.visible = false
          if (home.foliage) home.foliage.glow.value = 0
        },
      }),
      still: 3,
    }
  },
}
