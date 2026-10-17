import * as THREE from 'three'
import type { Feature, Kind, Lab } from '../../feature-ideas-study/lab'
import type { World } from '../../../src/worlds'
import type { SkyPart } from '../skies/common'
import { venusSky } from '../skies/venus'
import { marsSky } from '../skies/mars'
import { impactFlashes } from '../skies/airless'
import { floaters } from '../skies/life'
import { along, dirAt, flight, label, sunOver } from './kit'
import type { Profile } from './kit'
import { giantClip, ROUTES } from './giants'

/**
 * The clips of Venus, Mars and the Moon, each one today and with an option, on the same route.
 * `near` is the place of the events: three quarters of the way along the route.
 */
export type WorldRoute = { kind: Kind; lat: number; lon: number; length: number; sun: number; profile: (world: World) => Profile }
export const WORLD_ROUTES: Record<'venus' | 'mars' | 'moon', WorldRoute> = {
  venus: { kind: 'venus', lat: 8, lon: 20, length: 300, sun: 50, profile: world => [[0, world.atmosphere * 1.15], [0.12, world.cloudHeight * 1.42], [0.5, world.cloudHeight * 1.36], [0.62, world.cloudHeight], [0.75, world.cloudHeight * 0.85], [1, world.cloudHeight * 0.75]] },
  mars: { kind: 'mars', lat: 10, lon: 60, length: 220, sun: 34, profile: world => [[0, world.atmosphere * 1.1], [0.3, world.cloudHeight * 1.05], [0.6, 9], [1, 7]] },
  moon: { kind: 'moon', lat: 5, lon: 10, length: 200, sun: -24, profile: () => [[0, 16], [0.3, 7], [1, 6]] },
}

type Make = (lab: Lab, world: World, near: ReturnType<typeof along>) => SkyPart | null

export function worldClip(id: string, route: WorldRoute, text: string, make: Make, duration = 14): Feature {
  return {
    id,
    create(lab) {
      const world = lab.byKind(route.kind)
      const start = dirAt(route.lat, route.lon)
      const undo = sunOver(lab, world, along(world, start, route.length * 0.7), route.sun)
      flight(lab, world, start, route.length, route.profile(world), { duration })
      const sky = make(lab, world, along(world, start, route.length * 0.78))
      label(lab, text)
      return {
        duration, still: duration * 0.55,
        update(t) { sky?.update(t, lab.camera.position) },
        dispose() { sky?.dispose(); undo() },
      }
    },
  }
}

const sunOf = (lab: Lab) => lab.sun.group.position
const disc = (lab: Lab) => (color?: string) => lab.softDisc(color)

export const VENUS = {
  today: worldClip('V-today', WORLD_ROUTES.venus, 'Today · Venus', () => null),
  A: worldClip('V-A', WORLD_ROUTES.venus, 'Option A · Venus: the deck goes around the planet in 4 days', (lab, world, near) => venusSky(world, sunOf(lab), 'A', near)),
  B: worldClip('V', WORLD_ROUTES.venus, 'Option B · Venus: acid rain that never lands, and faint flashes', (lab, world, near) => venusSky(world, sunOf(lab), 'B', near)),
}
export const MARS = {
  today: worldClip('M-today', WORLD_ROUTES.mars, 'Today · Mars', () => null),
  A: worldClip('M-A', WORLD_ROUTES.mars, 'Option A · Mars: thin wisps of ice', (lab, world, near) => marsSky(world, sunOf(lab), 'A', near, disc(lab))),
  B: worldClip('M', WORLD_ROUTES.mars, 'Option B · Mars: dust devils', (lab, world, near) => marsSky(world, sunOf(lab), 'B', near, disc(lab))),
}
export const MOON = {
  today: worldClip('L-today', WORLD_ROUTES.moon, 'Today · the night side of the Moon', () => null),
  B: worldClip('L', WORLD_ROUTES.moon, 'Option B · the Moon: sparks of small stones from space', (lab, world, near) => impactFlashes(world, near, disc(lab), 1.1, () => sparkAhead(lab, world))),
}

/** A place on the ground 12 to 30 m in front of the fairy and a little to the side, as a local direction of the world. */
function sparkAhead(lab: Lab, world: World) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lab.fairy.quaternion)
  const side = new THREE.Vector3(1, 0, 0).applyQuaternion(lab.fairy.quaternion)
  const point = lab.fairy.position.clone().addScaledVector(forward, 12 + Math.random() * 18).addScaledVector(side, (Math.random() - 0.5) * 24)
  return point.sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert()).normalize()
}

/** Option C: the weather of B and the floaters, on the route of Jupiter. */
export const FLOATERS = giantClip('C', 'jupiter', 'B', 'Option C · floaters, imagined by scientists in 1976', 14, lab => {
  const jupiter = lab.byKind('jupiter')
  const route = ROUTES.jupiter
  return floaters(jupiter, along(jupiter, dirAt(route.lat, route.lon), route.length * 0.72), [jupiter.cloudHeight * 0.3, jupiter.cloudHeight * 0.85])
})
