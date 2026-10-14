import * as THREE from 'three'
import type { Lab, RailPoint } from '../../feature-ideas-study/lab'
import type { World } from '../../../src/worlds'
import { sceneryObstacles } from '../../../src/rings'
import { createFields } from '../../../src/foliage/zones'
import { createFauna } from '../fauna'
import type { Fauna, FaunaHerd, FaunaSettings } from '../fauna'
import { placeAt } from '../rules'
import type { Zone } from '../rules'
import { speciesOf } from '../catalog'

/**
 * The parts that the clips of the animals study share: the fauna of an option on a world, a route
 * over the real planet, a rail through places with a camera at the side, and the label of an option.
 */
export function addFauna(world: World, settings: Omit<FaunaSettings, 'mobile'> & { mobile?: boolean }) {
  return createFauna(world, { mobile: false, ...settings })
}

/** Moves a fauna on each frame of the clip. Call it from update(). */
export function stepFauna(lab: Lab, fauna: Fauna, t: number, delta: number) {
  fauna.update(t, delta, lab.camera, lab.fairy.position)
}

/** The herds of a species, nearest first to a local direction. */
export function herdsOf(fauna: Fauna, id: string, near?: THREE.Vector3) {
  const list = fauna.herds.filter(herd => herd.species.id === id)
  return near ? list.sort((a, b) => a.route[0].angleTo(near) - b.route[0].angleTo(near)) : list
}

/**
 * The best route of Earth from the warm belt to the snow line: a meridian of the north with much
 * land, each belt, and many herds near it. It returns local directions every `step` metres.
 */
export function beltRoute(world: World, fauna: Fauna | null, from = 3, to = 52, step = 5) {
  const fields = createFields(world.seed)
  const order: Zone[][] = [['beach', 'jungle', 'savanna', 'desert'], ['temperate'], ['taiga'], ['tundra']]
  let best: THREE.Vector3[] = [], bestScore = -Infinity
  for (let lon = 0; lon < 360; lon += 4) {
    const dirs: THREE.Vector3[] = []
    const length = (to - from) * Math.PI / 180 * world.radius
    for (let s = 0; s <= length; s += step) {
      const lat = (from + (to - from) * s / length) * Math.PI / 180, phi = lon * Math.PI / 180
      dirs.push(new THREE.Vector3(Math.cos(lat) * Math.cos(phi), Math.sin(lat), Math.cos(lat) * Math.sin(phi)))
    }
    let land = 0, high = 0
    const zones = new Set<number>()
    for (const dir of dirs) {
      const place = placeAt('earth', dir.x, dir.y, dir.z, world.sample, fields, world.radius)
      if (place.surface === 'land' || place.surface === 'shore') land++
      if (place.height > 9) high++
      order.forEach((group, i) => { if (group.includes(place.zone) && place.surface !== 'sea' && place.surface !== 'deep') zones.add(i) })
    }
    let near = 0
    if (fauna) for (const herd of fauna.herds) if (dirs.some(dir => dir.angleTo(herd.route[0]) * world.radius < 22)) near++
    const score = land / dirs.length * 4 + zones.size * 1.5 - high * 0.3 + near * 0.08
    if (score > bestScore) { bestScore = score; best = dirs }
  }
  return best
}

/** The tops of the trees and the candy near a local direction, for a rail that must stay over them. */
export function obstacleTop(world: World, obstacles: ReturnType<typeof sceneryObstacles>, dir: THREE.Vector3, reach: number) {
  let top = 0
  for (const item of obstacles) if (item.normal.angleTo(dir) * world.radius < item.radius + reach) top = Math.max(top, item.top - world.radius)
  return top
}

/**
 * A rail through local directions, `alt` metres over the ground, the water and the trees. The
 * height is smoothed, so the fairy glides and does not jump over each tree.
 */
export function railOver(world: World, dirs: THREE.Vector3[], alt: number, obstacles = sceneryObstacles(world), reach = 3): RailPoint[] {
  const need = dirs.map(dir => Math.max(Math.max(0, world.sample(dir.x, dir.y, dir.z).height) + alt, obstacleTop(world, obstacles, dir, reach) + 1.6))
  // The highest need of the next and the last two points, then an average: a soft climb before a tree.
  const held = need.map((_, i) => Math.max(...need.slice(Math.max(0, i - 2), i + 3)))
  const soft = held.map((_, i) => { const part = held.slice(Math.max(0, i - 2), i + 3); return part.reduce((a, b) => a + b, 0) / part.length })
  return dirs.map((dir, i) => ({ dir, alt: Math.max(soft[i], need[i]) - Math.max(0, world.sample(dir.x, dir.y, dir.z).height) }))
}

/** Local directions along the great circle from `a` to `b`, every `step` metres. */
export function arc(world: World, a: THREE.Vector3, b: THREE.Vector3, step = 5) {
  const angle = a.angleTo(b), count = Math.max(1, Math.ceil(angle * world.radius / step)), out: THREE.Vector3[] = []
  for (let i = 0; i <= count; i++) out.push(new THREE.Vector3().copy(a).lerp(b, i / count).normalize())
  return out
}
/**
 * A tour: the fairy flies through the herds in order and passes each one `offset` metres to the
 * side (one value, or one value for each herd), `alt` metres up. The rail starts `lead` metres
 * before the first herd and ends `tail` metres after the last one.
 */
export function tourDirs(world: World, herds: FaunaHerd[], offset: number | number[] = 3.5, lead = 40, tail = 25) {
  const stops = herds.map(herd => herd.route[0].clone())
  const offsets = herds.map((_, i) => Array.isArray(offset) ? offset[Math.min(i, offset.length - 1)] : offset)
  const first = stops[0], second = stops[1] ?? stops[0].clone().add(new THREE.Vector3(0.01, 0, 0)).normalize()
  const back = first.clone().multiplyScalar(2).sub(second).normalize()
  const start = first.clone().lerp(back, lead / (first.angleTo(back) * world.radius || 1)).normalize()
  const last = stops[stops.length - 1], before = stops[stops.length - 2] ?? start
  const end = last.clone().multiplyScalar(2).sub(before).normalize()
  const stop = last.clone().lerp(end, tail / (last.angleTo(end) * world.radius || 1)).normalize()
  const points = [start, ...stops, stop], sides = [offsets[0], ...offsets, offsets[offsets.length - 1]]
  const dirs: THREE.Vector3[] = [], shifts: number[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const part = arc(world, points[i], points[i + 1], 4)
    part.forEach((dir, k) => {
      if (i && !k) return
      dirs.push(dir)
      // The offset changes smoothly from one herd to the next.
      const u = part.length > 1 ? k / (part.length - 1) : 0
      shifts.push(sides[i] + (sides[i + 1] - sides[i]) * u * u * (3 - 2 * u))
    })
  }
  // The offset is to the left of the path, so the herds are on the right of the fairy, in the camera.
  return dirs.map((dir, i) => {
    const next = dirs[Math.min(dirs.length - 1, i + 1)], prev = dirs[Math.max(0, i - 1)]
    const side = new THREE.Vector3().crossVectors(dir, next.clone().sub(prev)).normalize()
    return side.lengthSq() ? dir.clone().addScaledVector(side, shifts[i] / world.radius).normalize() : dir
  })
}

/** One pass of `passes()`: the herd, the heading of the fairy and the side of her line, in the local frame of the world. */
export type Pass = { herd: FaunaHerd; heading: THREE.Vector3; side: THREE.Vector3 }

/**
 * Short passes, one for each herd: the fairy flies `length` metres past it, slowly, `offset`
 * metres to its side and `alt` metres up, for `seconds` each. The heading of each pass keeps the
 * trees and the candy away from the line of the fairy and of the camera. The camera cuts at each pass.
 */
export function passes(lab: Lab, world: World, herds: FaunaHerd[], seconds: number, { offset = 3, alt = 2.6, length = 22, view = 8, after = 11 }: { offset?: number; alt?: number; length?: number; view?: number; after?: number } = {}) {
  const obstacles = sceneryObstacles(world)
  const list: Pass[] = herds.map((herd, i) => {
    const centre = herd.route[0].clone()
    const base = new THREE.Vector3().crossVectors(centre, Math.abs(centre.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize()
    const at = (heading: THREE.Vector3, side: THREE.Vector3, s: number, o: number) => centre.clone().multiplyScalar(world.radius).addScaledVector(heading, s).addScaledVector(side, o).normalize()
    const away = offset + herd.loop
    let best = base, bestScore = Infinity
    for (let step = 0; step < 24; step++) {
      const heading = base.clone().applyAxisAngle(centre, step / 24 * Math.PI * 2)
      const side = new THREE.Vector3().crossVectors(centre, heading).normalize()
      let score = 0
      for (let s = -length / 2; s <= length / 2; s += 2) {
        // The line of the fairy, and the line of the camera on the other side of the herd.
        for (const [o, weight] of [[away, 1], [-view * 0.8, 2]] as const) {
          const probe = at(heading, side, s - (weight > 1 ? view * 0.45 : 0), o)
          score += obstacles.filter(item => item.normal.angleTo(probe) * world.radius < item.radius + 1.6 && item.top - world.radius > alt - 1).length * weight
          score += Math.max(0, world.sample(probe.x, probe.y, probe.z).height - 4) * 0.5
        }
      }
      if (score < bestScore) { bestScore = score; best = heading }
    }
    const side = new THREE.Vector3().crossVectors(centre, best).normalize()
    const dirs: THREE.Vector3[] = []
    for (let s = after - length; s <= after + 0.01; s += 2) dirs.push(at(best, side, s, away))
    lab.setRail(world, railOver(world, dirs, alt, obstacles, 0.6), i * seconds, (i + 1) * seconds)
    return { herd, heading: best, side }
  })
  /** The pass at the clip time `t`. */
  return (t: number) => list[Math.min(list.length - 1, Math.max(0, Math.floor(t / seconds)))]
}

/**
 * Stops for passes: one herd of each species of `ids`, all within `spread` metres of the first, so
 * one Sun lights them all. Open herds (few trees and candy around them) come first.
 */
export function nearStops(world: World, fauna: Fauna, ids: string[], spread = 50) {
  const obstacles = sceneryObstacles(world)
  const crowd = (herd: FaunaHerd) => obstacles.filter(item => item.normal.angleTo(herd.route[0]) * world.radius < 9 + item.radius && item.top - world.radius > 2).length
  let best: FaunaHerd[] = [], bestScore = Infinity
  for (const first of herdsOf(fauna, ids[0]).filter(herd => Math.abs(herd.route[0].y) < 0.8)) {
    const stops = [first]
    let score = crowd(first)
    for (const id of ids.slice(1)) {
      const near = herdsOf(fauna, id, first.route[0]).filter(herd => herd.route[0].angleTo(first.route[0]) * world.radius < spread && herd.route[0].angleTo(first.route[0]) * world.radius > 8)
      if (!near.length) { score = Infinity; break }
      const pick = near.sort((a, b) => crowd(a) - crowd(b))[0]
      stops.push(pick); score += crowd(pick) + pick.route[0].angleTo(first.route[0]) * world.radius / 10
    }
    if (score < bestScore) { bestScore = score; best = stops }
  }
  return best
}

/**
 * A camera on the far side of the herd of the pass, `view` metres from the middle of the fairy and
 * the herd: the herd is in front, the fairy flies past behind it. It cuts when the pass changes.
 */
export function pairCamera(lab: Lab, world: World, fauna: Fauna, passAt: (t: number) => Pass, view = 8) {
  const position = new THREE.Vector3(), look = new THREE.Vector3(), goal = new THREE.Vector3(), aim = new THREE.Vector3()
  const target = new THREE.Vector3(), mid = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3(), heading = new THREE.Vector3()
  let last = -1, lastPass: Pass | null = null
  lab.setShot((camera, t) => {
    const pass = passAt(t)
    fauna.placeOf(pass.herd, 0, t, target)
    up.copy(target).sub(world.group.position).normalize()
    side.copy(pass.side).applyQuaternion(world.group.quaternion)
    heading.copy(pass.heading).applyQuaternion(world.group.quaternion)
    mid.copy(lab.fairy.position).lerp(target, 0.5)
    goal.copy(mid).addScaledVector(side, -view).addScaledVector(up, view * 0.3).addScaledVector(heading, -view * 0.4)
    aim.copy(mid).addScaledVector(up, 0.3)
    if (last < 0 || t < last || pass !== lastPass) { position.copy(goal); look.copy(aim) }
    else { const k = 1 - Math.exp(-(t - last) * 4); position.lerp(goal, k); look.lerp(aim, k) }
    last = t; lastPass = pass
    camera.position.copy(position)
    camera.up.copy(up)
    camera.lookAt(look)
  })
}

/**
 * A camera behind and above the fairy that looks down at the herd of the pass, over the trees and
 * the candy. The fairy is in the front of the view, the herd below and ahead of her.
 */
export function overCamera(lab: Lab, world: World, fauna: Fauna, passAt: (t: number) => Pass, { back = 6, up = 4.5, side = 1.5, toward = 0.62 } = {}) {
  const position = new THREE.Vector3(), look = new THREE.Vector3(), goal = new THREE.Vector3(), aim = new THREE.Vector3()
  const target = new THREE.Vector3(), normal = new THREE.Vector3(), heading = new THREE.Vector3(), across = new THREE.Vector3()
  let last = -1, lastPass: Pass | null = null
  lab.setShot((camera, t) => {
    const pass = passAt(t)
    fauna.placeOf(pass.herd, 0, t, target)
    normal.copy(lab.fairy.position).sub(world.group.position).normalize()
    heading.copy(pass.heading).applyQuaternion(world.group.quaternion)
    across.copy(pass.side).applyQuaternion(world.group.quaternion)
    goal.copy(lab.fairy.position).addScaledVector(heading, -back).addScaledVector(normal, up).addScaledVector(across, side)
    aim.copy(lab.fairy.position).lerp(target.addScaledVector(normal, pass.herd.species.size * 0.4), toward)
    if (last < 0 || t < last || pass !== lastPass) { position.copy(goal); look.copy(aim) }
    else { const k = 1 - Math.exp(-(t - last) * 4); position.lerp(goal, k); look.lerp(aim, k) }
    last = t; lastPass = pass
    camera.position.copy(position)
    camera.up.copy(normal)
    camera.lookAt(look)
  })
}

/**
 * A camera at the side and above the fairy: it looks at the ground ahead on her right, where the
 * herds are. `right` is the share of the side in the offset.
 */
export function sideCamera(lab: Lab, world: World, { back = 7, up = 3.4, right = 3, ahead = 9, drop = 2 } = {}) {
  const position = new THREE.Vector3(), look = new THREE.Vector3(), goal = new THREE.Vector3(), aim = new THREE.Vector3()
  const forward = new THREE.Vector3(), normal = new THREE.Vector3(), side = new THREE.Vector3()
  let last = -1
  lab.setShot((camera, t) => {
    const fairy = lab.fairy
    forward.set(0, 0, -1).applyQuaternion(fairy.quaternion)
    normal.copy(fairy.position).sub(world.group.position).normalize()
    forward.addScaledVector(normal, -forward.dot(normal)).normalize()
    side.crossVectors(forward, normal).normalize()
    goal.copy(fairy.position).addScaledVector(forward, -back).addScaledVector(normal, up).addScaledVector(side, -right)
    aim.copy(fairy.position).addScaledVector(forward, ahead).addScaledVector(side, right * 0.6).addScaledVector(normal, -drop)
    // A cut: the fairy is at a new place, so the camera is there at once.
    if (last < 0 || t < last || position.distanceTo(goal) > 14) { position.copy(goal); look.copy(aim) }
    else { const k = 1 - Math.exp(-(t - last) * 5); position.lerp(goal, k); look.lerp(aim, k) }
    last = t
    camera.position.copy(position)
    camera.up.copy(normal)
    camera.lookAt(look)
  })
  return { restart() { last = -1 } }
}

/** A small label of the option at the foot of the clip: the option, its scope, and the live draw calls. */
export function optionLabel(lab: Lab, text: string) {
  const label = document.createElement('div')
  label.setAttribute('style', 'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:7px 16px;border-radius:999px;background:rgba(14,18,38,.78);color:#fff6e4;font:600 15px/1.2 system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.25)')
  lab.overlay.append(label)
  return (calls: number, animals: number, shown: number) => {
    label.innerHTML = `${text} · <b style="color:#ffd27a">${animals}</b> draw calls for <b style="color:#ffd27a">${shown}</b> animals · ${calls} in the frame`
  }
}

/** The number of species of an option on a world, for the labels. */
export const kindsOf = (option: 'A' | 'B' | 'C', world: 'earth' | 'fairy') => speciesOf(option, world).length
