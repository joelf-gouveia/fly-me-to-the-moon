import * as THREE from 'three'
import { regenerateWorld } from '../../src/worlds'
import type { Feature, Lab } from '../feature-ideas-study/lab'
import { EARTH, LANDMARKS } from './model'
import type { LandmarkId } from './model'
import { buildScenery } from './scenery'
import { BERGS, BUTTES, canyonPath, fjordPath, GEYSER, iceFront, OASIS, TEPUI_POOL, TOWERS } from './shapes'
import { stampLandmarks } from './stamp'
import type { Site } from './stamp'

/**
 * The clip of each landmark. A clip has two parts: a view from the air that shows the whole
 * landmark, then the flight of the fairy through it with the camera of the game.
 */
type Waypoint = [u: number, v: number, clearance: number]
type Tour = {
  /** The height of the Sun over the landmark, in degrees. */
  sun: number
  /** The view from the air: the camera goes around `look` from the angle `from` to the angle `to` (degrees; 0 is east, 90 is north). */
  aerial: { look: [u: number, v: number, height: number]; distance: number; height: number; from: number; to: number; camera?: (s: number) => [u: number, v: number] }
  /** The flight path, with the clearance above the ground at each point. */
  path: Waypoint[]
  /** Round things that the path goes around. */
  avoid?: { u: number; v: number; r: number }[]
}

const AERIAL = 4.5, DURATION = 14
const river = (path: (v: number) => number, from: number, to: number, clearance: number): Waypoint[] =>
  Array.from({ length: 9 }, (_, i) => { const v = from + (to - from) * i / 8; return [path(v), v, clearance] })

const TOURS: Record<LandmarkId, Tour> = {
  L1: { sun: 38, aerial: { look: [0, 2, 6], distance: 70, height: 34, from: -110, to: -72 }, path: [[canyonPath(-46) - 6, -52, 6], ...river(canyonPath, -40, 40, 4.5), [canyonPath(46) + 5, 52, 7]] },
  L2: { sun: 30, aerial: { look: [0, 6, 20], distance: 76, height: 15, from: 104, to: 80 }, path: [[14, 70, 5], [10, 47, 4], [-10, 30, 6], [-25, 8, 6], [-20, -15, 6], [2, -26, 6], [24, -12, 6], [27, 10, 6]] },
  L3: { sun: 16, aerial: { look: [0, -4, 5], distance: 60, height: 21, from: 200, to: 242 }, path: [[-56, -34, 5], [OASIS.u - 14, OASIS.v - 4, 4.5], [OASIS.u, OASIS.v, 4.5], [0, -4, 5], [14, 12, 5], [36, 24, 5], [52, 36, 6]] },
  L4: { sun: 32, aerial: { look: [0, 0, 6], distance: 86, height: 30, from: -80, to: -46 }, path: [[-56, -22, 5], [-28, -10, 4.5], [0, 0, 4.5], [26, 12, 4.5], [54, 24, 6]], avoid: TOWERS.map(tower => ({ u: tower.u, v: tower.v, r: Math.max(tower.a, tower.b) + 3 })) },
  L5: { sun: 48, aerial: { look: [0, 0, 0], distance: 60, height: 31, from: 20, to: 62 }, path: [[-60, -12, 8], [-38, -5, 4.5], [-14, 3, 3.5], [10, 8, 3.5], [27, 15, 5], [32, 32, 6], [12, 46, 7]] },
  L6: { sun: 12, aerial: { look: [0, 2, 3], distance: 64, height: 22, from: -118, to: -76 }, path: [[-44, -44, 6], [-24, -24, 5], [-10, iceFront(-10) - 5, 5], [8, iceFront(8) - 4, 5], [26, iceFront(26) - 4, 6], [34, iceFront(34) + 8, 5], [30, iceFront(30) + 26, 5]], avoid: BERGS.map(berg => ({ u: berg.u, v: berg.v, r: berg.size + 2.5 })) },
  L7: { sun: 40, aerial: { look: [0, -18, 15], distance: 58, height: 15, from: -112, to: -74 }, path: [[3, -66, 5], [-3, -52, 4.5], [1, TEPUI_POOL.v - 5, 5], [4, TEPUI_POOL.v + 2, 15], [3, TEPUI_POOL.v + 9, 4], [3, -8, 3.5], [-4, 12, 4], [-10, 34, 8]] },
  L8: { sun: 22, aerial: { look: [-8, 8, 10], distance: 72, height: 11, from: -112, to: -78 }, path: [[4, -66, 5], [2, -40, 5], [-10, -8, 5], [-11, 12, 6], [-12, 34, 6], [4, 46, 6], [24, 54, 7]], avoid: BUTTES.map(butte => ({ u: butte.u, v: butte.v, r: Math.max(butte.a, butte.b) * 1.5 + 2 })) },
  L9: { sun: 28, aerial: { look: [3, -8, 2], distance: 32, height: 8, from: -70, to: -28 }, path: [[-6, -44, 4.5], [0, -30, 3], [5, -14, 2.8], [5, -2, 2.8], [2, 9, 3.5], [-2, 22, 4], [-8, 38, 5]] },
  L10: { sun: 36, aerial: { look: [fjordPath(-4), -4, 6], distance: 0, height: 19, from: 0, to: 0, camera: s => [fjordPath(-68 + s * 8), -68 + s * 8] }, path: [...river(fjordPath, -70, 40, 4.5), [fjordPath(46), 48, 9]] },
  L11: { sun: 42, aerial: { look: [0, 0, 2], distance: 36, height: 27, from: 196, to: 250 }, path: [[-48, 2, 6], [GEYSER.u - 6, GEYSER.v - 3, 5], [-15, 6, 4.5], [0, 0, 4], [15, -6, 4], [32, -14, 5], [46, -22, 6]] },
  L12: { sun: 26, aerial: { look: [0, 0, 8], distance: 62, height: 25, from: 150, to: 192 }, path: [[-58, -22, 6], [-32, -9, 5], [-8, 2, 5], [14, 6, 5], [36, 18, 5], [56, 30, 6]] },
}

/** A smooth path through the waypoints, 3 m between its points, around the things to avoid and clear of the ground. */
function flightPath(site: Site, tour: Tour) {
  const curve = new THREE.CatmullRomCurve3(tour.path.map(([u, v, clearance]) => new THREE.Vector3(u, v, clearance)), false, 'centripetal')
  const points = curve.getSpacedPoints(Math.max(8, Math.round(curve.getLength() / 3)))
  for (let pass = 0; pass < 40 && tour.avoid; pass++) {
    for (const point of points) for (const thing of tour.avoid) {
      const du = point.x - thing.u, dv = point.y - thing.v, d = Math.hypot(du, dv)
      if (d < thing.r) { point.x = thing.u + du / (d || 1) * thing.r; point.y = thing.v + dv / (d || 1) * thing.r }
    }
    for (let i = 1; i < points.length - 1; i++) { points[i].x = (points[i - 1].x + points[i].x * 2 + points[i + 1].x) / 4; points[i].y = (points[i - 1].y + points[i].y * 2 + points[i + 1].y) / 4 }
  }
  // The height above the sea: the highest ground of the five nearest points, then a smooth line through the heights.
  const ground = points.map(point => Math.max(0, site.heightAt(point.x, point.y)))
  let heights = points.map((point, index) => Math.max(...ground.slice(Math.max(0, index - 2), index + 3)) + point.z)
  for (let pass = 0; pass < 4; pass++) heights = heights.map((height, index) => (heights[Math.max(0, index - 1)] + height * 2 + heights[Math.min(heights.length - 1, index + 1)]) / 4)
  return points.map((point, index) => site.at(point.x, point.y, Math.max(heights[index], ground[index] + 2.4)))
}

export type Landscape = ReturnType<typeof prepareEarth>

/**
 * Makes the Earth of the study in the lab: one fixed landscape, with the landmarks, their objects and their clips.
 * `cell` sets one mesh cell size for each patch; 0 uses the cell of each landmark.
 */
export function prepareEarth(lab: Lab, cell = 0) {
  const earth = lab.earth
  regenerateWorld(earth, EARTH.seed)
  const { sites, triangles } = stampLandmarks(earth, cell)
  const scenery = buildScenery(earth, sites)
  const toWorld = (local: THREE.Vector3) => local.applyMatrix4(earth.group.matrixWorld)
  const look = new THREE.Vector3()

  const features = Object.fromEntries(LANDMARKS.map(landmark => {
    const site = sites.find(item => item.landmark === landmark)!, tour = TOURS[landmark.id]
    const feature: Feature = {
      id: landmark.id,
      create() {
        lab.setSunElevation(earth, site.centre, tour.sun)
        lab.setRailPoints(earth, flightPath(site, tour).map(toWorld))
        const aerial = tour.aerial
        const shot = (camera: THREE.PerspectiveCamera, t: number) => {
          const angle = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(aerial.from, aerial.to, t / AERIAL))
          const [u, v] = aerial.camera?.(t / AERIAL) ?? [aerial.look[0] + Math.cos(angle) * aerial.distance, aerial.look[1] + Math.sin(angle) * aerial.distance]
          toWorld(site.at(u, v, Math.max(aerial.height, site.heightAt(u, v) + 3), camera.position))
          camera.up.copy(camera.position).sub(earth.group.position).normalize()
          camera.lookAt(toWorld(site.at(aerial.look[0], aerial.look[1], aerial.look[2], look)))
        }
        lab.setShot(shot)
        let fromAir = true
        return {
          duration: DURATION, still: AERIAL * 0.55,
          update(t) {
            scenery.update(t)
            const want = t < AERIAL
            if (want === fromAir || lab.mode !== 'clip') return
            fromAir = want
            lab.setShot(want ? shot : null)
            if (!want) lab.snapCamera()
          },
          dispose() {},
        }
      },
    }
    return [landmark.id, feature]
  })) as Record<LandmarkId | 'EARTH', Feature>

  // The whole Earth from space: the camera goes a third of the way around it.
  features.EARTH = {
    id: 'EARTH',
    create() {
      const first = sites.find(site => site.landmark.id === 'L8')!, centre = earth.group.position
      lab.setSunElevation(earth, first.centre, 50)
      const start = toWorld(first.at(0, 0, 0)).sub(centre).normalize(), axis = new THREE.Vector3(0, 1, 0).applyQuaternion(earth.group.quaternion)
      lab.setRailPoints(earth, [-60, -30, 0, 30, 60].map(v => toWorld(first.at(0, v, 70))))
      lab.setShot((camera, t) => {
        camera.position.copy(start).applyAxisAngle(axis, t / DURATION * 2.1 - 0.4).multiplyScalar(earth.radius * 2.9).add(centre)
        camera.up.copy(axis)
        camera.lookAt(centre)
      })
      return { duration: DURATION, still: 4, update(t) { scenery.update(t) }, dispose() {} }
    },
  }
  return { sites, scenery, features, triangles }
}
