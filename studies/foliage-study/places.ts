import * as THREE from 'three'
import type { Site } from '../../src/foliage/planting'
import { createFields, zoneAt } from '../../src/foliage/zones'
import type { OptionId } from '../../src/foliage/zones'

/**
 * The places of the clips. Each search has a seed, so it finds the same place each time on the
 * same landscape. A place has a direction on the planet and a heading on the ground; both are
 * in the local frame of the planet.
 */
export type Spot = { dir: THREE.Vector3; heading: THREE.Vector3; quality: number }

/** The local direction `metres` from `dir` along the unit tangent `heading`. */
export function along(dir: THREE.Vector3, heading: THREE.Vector3, metres: number, radius: number) {
  const angle = metres / radius
  return dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(heading, Math.sin(angle)).normalize()
}

function sequence(seed: number) {
  let state = seed >>> 0
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 }
}
const spots = new Map<string, Spot>()
const axis = new THREE.Vector3(0, 1, 0)

/**
 * A place for a flight through one zone: 80 m of dry land with no steep hill. `quality` is the
 * number of the nine points of the path that are in the zone. With `wooded`, the path is in a wood.
 */
export function findSpot(site: Site, option: OptionId, zone: string, wooded: boolean): Spot {
  const key = `${site.kind}:${site.seed}:${option}:${zone}:${wooded}`
  const known = spots.get(key)
  if (known) return known
  const fields = createFields(site.seed)
  const random = sequence(site.seed ^ (zone.length * 7919 + zone.charCodeAt(0) * 104729 + option.charCodeAt(1) * 31))
  const fairy = site.kind === 'fairy'
  const dir = new THREE.Vector3(), heading = new THREE.Vector3()
  let best: Spot | null = null, bestScore = -Infinity
  for (let attempt = 0; attempt < 80000; attempt++) {
    // The Sun stays low at the poles, so a place is between 53° south and 53° north. The candy lane is at the south pole.
    const y = zone === 'lane' ? -0.92 - random() * 0.07 : random() * 1.6 - 0.8, angle = random() * Math.PI * 2
    dir.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    const sample = site.sample(dir.x, dir.y, dir.z)
    if (zoneAt(option, dir.x, dir.y, dir.z, sample, fields)?.id !== zone) continue
    heading.crossVectors(dir, axis).normalize().applyAxisAngle(dir, random() * Math.PI * 2)
    let inZone = 0, wood = 0, low = Infinity, high = -Infinity, dry = true
    for (let metres = -10; metres <= 70 && dry; metres += 10) {
      const point = along(dir, heading, metres, site.radius), at = site.sample(point.x, point.y, point.z)
      low = Math.min(low, at.height); high = Math.max(high, at.height)
      if (at.river > 0.1 || at.height < 1) dry = false
      if (zoneAt(option, point.x, point.y, point.z, at, fields)?.id === zone) inZone++
      wood += THREE.MathUtils.smoothstep(fields.wood(point.x, point.y, point.z), -0.05, 0.3)
    }
    if (!dry || high > (fairy ? 5.8 : 7.5) || high - low > 3) continue
    const score = inZone * 2 + (wooded ? Math.min(wood, 6) : 0) - (high - low) * 0.5
    if (score > bestScore) { bestScore = score; best = { dir: dir.clone(), heading: heading.clone(), quality: inZone } }
    if (inZone === 9 && (!wooded || wood > 5.5) && high - low < 2) break
  }
  if (!best) throw new Error(`No place for the zone ${zone} of ${option}`)
  spots.set(key, best)
  return best
}

/**
 * A place for a view from above: a start in the zone, with the most land in the `reach` metres
 * ahead and a quarter of `reach` to each side. `quality` is the share of land, from 0 to 1.
 */
export function findView(site: Site, option: OptionId, zone: string, reach = 225): Spot {
  const key = `${site.kind}:${site.seed}:${option}:${zone}:view:${reach}`
  const known = spots.get(key)
  if (known) return known
  const fields = createFields(site.seed)
  const random = sequence(site.seed ^ (zone.length * 15485863 + option.charCodeAt(1) * 31))
  const dir = new THREE.Vector3(), heading = new THREE.Vector3(), side = new THREE.Vector3()
  let best: Spot | null = null
  for (let attempt = 0; attempt < 6000 && (best?.quality ?? 0) < 0.95; attempt++) {
    const y = random() * 1.6 - 0.8, angle = random() * Math.PI * 2
    dir.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    const sample = site.sample(dir.x, dir.y, dir.z)
    if (sample.height < 1 || zoneAt(option, dir.x, dir.y, dir.z, sample, fields)?.id !== zone) continue
    heading.crossVectors(dir, axis).normalize().applyAxisAngle(dir, random() * Math.PI * 2)
    side.crossVectors(dir, heading).normalize()
    let land = 0, points = 0
    for (let ahead = 0; ahead <= reach; ahead += reach / 15) {
      for (let across = -reach / 4; across <= reach / 4; across += reach / 8) {
        const point = along(along(dir, heading, ahead, site.radius), side, across, site.radius), at = site.sample(point.x, point.y, point.z)
        points++
        // Land with plants: above the water, below the bare rock.
        if (at.height > 0.9 && at.height < 8.5) land++
      }
    }
    if (land / points > (best?.quality ?? 0)) best = { dir: dir.clone(), heading: heading.clone(), quality: land / points }
  }
  if (!best) throw new Error(`No view for the zone ${zone} of ${option}`)
  spots.set(key, best)
  return best
}

/** The half width and the half depth of the lawn of a plant sheet, in metres. */
export const LAWN = { width: 24, depth: 11 } as const

/**
 * The place of a plant sheet: the land with the smallest height range below the lawn.
 * `quality` is the height of the highest ground below the lawn; the lawn sits on it.
 */
export function findFlat(site: Site): Spot {
  const key = `${site.kind}:${site.seed}:flat`
  const known = spots.get(key)
  if (known) return known
  const random = sequence(site.seed ^ 0x5eed)
  const dir = new THREE.Vector3(), heading = new THREE.Vector3(), side = new THREE.Vector3()
  let best: Spot | null = null, bestRange = Infinity
  for (let attempt = 0; attempt < 20000 && bestRange > 1.2; attempt++) {
    const y = random() * 1.2 - 0.6, angle = random() * Math.PI * 2
    dir.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    if (site.sample(dir.x, dir.y, dir.z).height < 1.5) continue
    heading.crossVectors(dir, axis).normalize().applyAxisAngle(dir, random() * Math.PI * 2)
    side.crossVectors(dir, heading).normalize()
    let low = Infinity, high = -Infinity
    // The lawn, and the ground from the lawn to the camera in front of it.
    for (let across = -LAWN.width; across <= LAWN.width && high - low < bestRange; across += 6) {
      for (let back = -30; back <= LAWN.depth; back += 5) {
        const point = along(along(dir, heading, across, site.radius), side, back, site.radius)
        const height = Math.max(0, site.sample(point.x, point.y, point.z).height)
        low = Math.min(low, height); high = Math.max(high, height)
      }
    }
    if (high - low < bestRange) { bestRange = high - low; best = { dir: dir.clone(), heading: heading.clone(), quality: high } }
  }
  if (!best) throw new Error('No place for the plant sheet')
  spots.set(key, best)
  return best
}
