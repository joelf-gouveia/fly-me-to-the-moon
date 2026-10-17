import type { Feature, Lab } from '../../feature-ideas-study/lab'
import { giantSky } from '../skies/giants'
import type { Giant } from '../skies/giants'
import type { SkyPart } from '../skies/common'
import { dirAt, flight, label, QUALITY, sunOver } from './kit'
import type { Profile } from './kit'

/**
 * The clips of the giants. Each option flies the same route, so the clips compare. Jupiter: from
 * the top of the air down along the north edge of the Great Red Spot, through the top layer and
 * under it, past the storm towers of the belt. The storms are where src/planet-paint.ts paints them
 * (RED_SPOT and DARK_SPOT of src/search-places.ts): a longitude λ of dirAt() is the map longitude λ + 180°.
 */
export type Route = { lat: number; lon: number; length: number; sun: number; storm: [number, number]; towers: [number, number]; profile?: (atmosphere: number, cloud: number) => Profile }
export const ROUTES: Record<Giant, Route> = {
  jupiter: { lat: -14, lon: -60, length: 400, sun: 30, storm: [-22, -30], towers: [-8, -27] },
  saturn: { lat: 34, lon: 20, length: 380, sun: 30, storm: [40, 40], towers: [39, 54] },
  uranus: { lat: 30, lon: 20, length: 340, sun: 30, storm: [40, 40], towers: [36, 50] },
  neptune: { lat: -18, lon: -5, length: 360, sun: 32, storm: [-21, 20], towers: [-20, 50], profile: (atmosphere, cloud) => [[0, atmosphere * 1.15], [0.3, cloud * 1.3 + 12], [0.5, cloud * 1.3 + 4], [0.75, cloud * 1.05], [1, cloud * 0.95]] },
}

/** The heights of a giant clip: down to the top of the clouds, through them, and along under the top layer. */
export const giantProfile = (atmosphere: number, cloud: number): Profile => [[0, atmosphere * 1.15], [0.28, cloud + 14], [0.45, cloud + 4], [0.6, cloud * 0.72], [0.85, cloud * 0.62], [1, cloud * 0.8]]

/** A clip of a giant: today (no sky part), option A or option B. */
export function giantClip(id: string, kind: Giant, option: 'today' | 'A' | 'B', text: string, duration = 14, extra?: (lab: Lab) => SkyPart): Feature {
  return {
    id,
    create(lab) {
      const world = lab.byKind(kind)
      const route = ROUTES[kind]
      const start = dirAt(route.lat, route.lon)
      const undo = sunOver(lab, world, dirAt(route.lat, route.lon + route.length / world.radius * 57.3 * 0.5), route.sun)
      flight(lab, world, start, route.length, (route.profile ?? giantProfile)(world.atmosphere, world.cloudHeight), { duration })
      const sky = option === 'today' ? null : giantSky(world, kind, lab.sun.group.position, { option, storm: dirAt(...route.storm), towers: dirAt(...route.towers), mobile: QUALITY.mobile })
      const more = extra?.(lab) ?? null
      label(lab, text)
      return {
        duration, still: duration * 0.55,
        update(t) { sky?.update(t, lab.camera.position); more?.update(t, lab.camera.position) },
        dispose() { sky?.dispose(); more?.dispose(); undo() },
      }
    },
  }
}
