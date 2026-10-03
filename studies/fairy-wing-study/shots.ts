import * as THREE from 'three'
import { regenerateWorld, surfaceRadius } from '../../src/worlds'
import { orientFlight } from '../../src/flight'
import { createSkyDancerAnimation } from '../../src/fairy'
import { defaultFairyLook } from '../../src/customization'
import type { FairyLook } from '../../src/customization'
import type { Feature, FeatureRun, Lab } from '../feature-ideas-study/lab'
import { ALL_LEVERS, NO_LEVERS } from '../../src/fairy-wings/wings'
import type { Levers, WingStats } from '../../src/fairy-wings/wings'
import { BEFORE, createStudyWings } from './wings'
import { DESIGNS } from './designs'

/**
 * The clips and the pictures of the study. The fairy flies a circle above the Earth of the
 * game, away from the Sun, so the camera sees the lit side of her wings. A clip has two
 * parts: a close view that turns around her back, then the flight camera of the game.
 */
export type WingRun = FeatureRun & { clip: boolean; stats(): WingStats; repaint(): void }
export type WingFeature = Feature & { create(lab: Lab): WingRun }

/** The controls of the live view. The page changes them; the clips do not read them. */
export const view = {
  levers: { ...ALL_LEVERS },
  camera: 'close' as 'close' | 'flight',
  boost: false,
  night: false,
  wingColor: defaultFairyLook.wingColor as FairyLook['wingColor'],
  /** The angle of the close camera around the fairy, in radians. A drag on the picture changes it. */
  turn: 0,
}

/** Earth has a new landscape at each visit in the game. The study uses one landscape, so each clip is the same at each run. */
export const EARTH_SEED = 23
const CLOSE_SECONDS = 4.2, CLIP_SECONDS = 6.4
/** A time in the close view with the wings open toward the camera. */
const STILL = 1.83
const wingsOf = new WeakMap<Lab, ReturnType<typeof createStudyWings>>()

type ShotOptions = { live?: boolean; levers?: Levers; night?: boolean; clip?: boolean; wingColor?: FairyLook['wingColor'] }
function shot(id: string, wing: string, options: ShotOptions = {}): WingFeature {
  return {
    id,
    create(lab) {
      if (lab.earth.seed !== EARTH_SEED) regenerateWorld(lab.earth, EARTH_SEED)
      if (!wingsOf.has(lab)) wingsOf.set(lab, createStudyWings(lab.rig))
      const wings = wingsOf.get(lab)!, world = lab.earth, live = !!options.live
      const night = live ? view.night : !!options.night
      lab.setSunElevation(world, lab.meadowLocal, night ? -16 : 32)
      let stats: WingStats
      const repaint = () => {
        const look = { ...defaultFairyLook, wingColor: live ? view.wingColor : options.wingColor ?? defaultFairyLook.wingColor }
        stats = wings.show(wing, look, live ? view.levers : options.levers ?? ALL_LEVERS)
      }
      repaint()

      // The circle: it starts above the meadow and goes away from the Sun, a little to one side.
      const centre = world.group.position
      const up = lab.meadowLocal.clone().normalize().applyQuaternion(world.group.quaternion)
      const toSun = lab.sun.group.position.clone().sub(centre).normalize()
      const first = toSun.addScaledVector(up, -toSun.dot(up)).normalize().negate().applyAxisAngle(up, 0.6)
      const axis = new THREE.Vector3().crossVectors(up, first).normalize()
      const normal = new THREE.Vector3(), heading = new THREE.Vector3()
      let height = 0
      for (let at = 0; at < 96; at++) height = Math.max(height, surfaceRadius(world, normal.copy(up).applyAxisAngle(axis, at / 96 * Math.PI * 2)))
      height += 9
      let angle = 0
      const place = () => {
        normal.copy(up).applyAxisAngle(axis, angle)
        heading.crossVectors(axis, normal)
        lab.fairy.position.copy(centre).addScaledVector(normal, height)
        orientFlight(lab.fairy.quaternion, heading, normal)
      }
      place()

      const beat = createSkyDancerAnimation(lab.rig)
      const offset = new THREE.Vector3(), target = new THREE.Vector3()
      lab.setShot((camera, t) => {
        const far = live ? view.camera === 'flight' : t > CLOSE_SECONDS
        if (far) {
          // The flight camera of the game: 2.8 up, 8 back, and a look 12 ahead.
          offset.set(0, 2.8, 8)
          target.set(0, 0, -12)
        } else {
          // The clip looks from straight behind at the time of the picture, as the game does.
          const turn = live ? view.turn + Math.sin(t * 0.5) * 0.2 : Math.sin((t - STILL) * 0.9) * 0.55
          offset.set(Math.sin(turn) * 4.5, 1, Math.cos(turn) * 4.5)
          target.set(0, 0.6, -0.25)
        }
        camera.position.copy(offset.applyQuaternion(lab.fairy.quaternion)).add(lab.fairy.position)
        camera.up.set(0, 1, 0).applyQuaternion(lab.fairy.quaternion)
        camera.lookAt(target.applyQuaternion(lab.fairy.quaternion).add(lab.fairy.position))
        camera.fov = far ? 58 : 40
        camera.updateProjectionMatrix()
      })

      return {
        duration: live ? 36000 : CLIP_SECONDS,
        still: STILL,
        clip: options.clip ?? true,
        stats: () => stats,
        repaint,
        update(t, delta) {
          const boost = live ? view.boost : t > CLOSE_SECONDS + 0.6
          lab.setBoost(boost)
          angle += delta * (boost ? 26 : 11) / height
          place()
          // The wing beat starts at the same phase in each clip, so two pictures of the same time show the same pose.
          beat.update(delta, boost)
        },
        dispose() { wings.show('B1', defaultFairyLook) },
      }
    },
  }
}

/** The design of the lever pictures, and the levers of each picture: each picture adds one lever. */
export const LEVER_DESIGN = 'glitter'
const LEVER_STEPS: Levers[] = [
  NO_LEVERS,
  { ...NO_LEVERS, paint: true },
  { ...NO_LEVERS, paint: true, lines: true },
  { ...NO_LEVERS, paint: true, lines: true, irid: true },
  { ...NO_LEVERS, paint: true, lines: true, irid: true, glitter: true },
  ALL_LEVERS,
]
/** The wings that have their own light, for the pictures at night. */
export const NIGHT_DESIGNS = ['moth', 'star', 'aurora']

export const FEATURES: Record<string, WingFeature> = Object.fromEntries([
  ...Object.keys(BEFORE).map(id => shot(id, id)),
  ...DESIGNS.map(design => shot(design.id, design.id)),
  ...LEVER_STEPS.map((levers, index) => shot(`L${index}`, LEVER_DESIGN, { levers, clip: false, wingColor: 'blush' })),
  ...NIGHT_DESIGNS.map(id => shot(`N-${id}`, id, { night: true, clip: false })),
  shot('N-B1', 'B1', { night: true, clip: false }),
].map(feature => [feature.id, feature]))

/** The live view of a wing: no end, and the controls of `view`. */
export const liveFeature = (id: string) => shot(`live-${id}`, id, { live: true })
