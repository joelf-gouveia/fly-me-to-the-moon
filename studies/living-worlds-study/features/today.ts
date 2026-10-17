import type { Feature, Kind, Lab } from '../../feature-ideas-study/lab'
import { dirAt, flight, label, sunOver } from './kit'
import type { Profile } from './kit'

/**
 * The worlds of today, with no change: a visit flies from the top of the air down through the
 * cloud layer and under it. The study uses these clips as the "today" side of each comparison.
 */
export type Visit = { kind: Kind; lat: number; lon: number; sun: number; length: number; profile: Profile; name: string }

/** The heights of a visit, from the air and the cloud height of the world. */
export function visitProfile(lab: Lab, kind: Kind): Profile {
  const world = lab.byKind(kind)
  const top = world.atmosphere ? world.atmosphere * 1.15 : 60
  const cloud = world.cloudHeight || 12
  const low = world.gas ? cloud * 0.35 : 6
  return [[0, top], [0.32, cloud + 16], [0.5, cloud + 6], [0.62, cloud], [0.8, low], [1, low]]
}

export const VISITS: Record<string, Omit<Visit, 'profile'>> = {
  mercury: { kind: 'mercury', lat: 12, lon: 40, sun: 30, length: 420, name: 'Mercury' },
  venus: { kind: 'venus', lat: 8, lon: 20, sun: 50, length: 520, name: 'Venus' },
  mars: { kind: 'mars', lat: 10, lon: 60, sun: 35, length: 460, name: 'Mars' },
  jupiter: { kind: 'jupiter', lat: 12, lon: 30, sun: 45, length: 620, name: 'Jupiter' },
  saturn: { kind: 'saturn', lat: 18, lon: 30, sun: 40, length: 620, name: 'Saturn' },
  uranus: { kind: 'uranus', lat: 10, lon: 30, sun: 40, length: 560, name: 'Uranus' },
  neptune: { kind: 'neptune', lat: -10, lon: 30, sun: 40, length: 560, name: 'Neptune' },
  moon: { kind: 'moon', lat: 5, lon: 10, sun: 25, length: 300, name: 'The Moon' },
}

/** A visit to a world of today, with the label of the clip. */
export function todayVisit(id: string, duration = 14): Feature {
  return {
    id,
    create(lab) {
      const visit = VISITS[id.replace(/^T-/, '')]
      const world = lab.byKind(visit.kind)
      const start = dirAt(visit.lat, visit.lon)
      const undo = sunOver(lab, world, dirAt(visit.lat, visit.lon + visit.length / world.radius * 57.3 * 0.6), visit.sun)
      flight(lab, world, start, visit.length, visitProfile(lab, visit.kind), { duration })
      label(lab, `Today · ${visit.name}`)
      return { duration, still: duration * 0.55, update() {}, dispose: undo }
    },
  }
}
