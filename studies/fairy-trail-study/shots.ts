import * as THREE from 'three'
import { regenerateWorld, surfaceRadius } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { hoverFlight, orientFlight, stepFlight } from '../../src/flight'
import type { FlightState } from '../../src/flight'
import { defaultFairyLook, lookColors } from '../../src/customization'
import type { FairyLook } from '../../src/customization'
import type { Feature, FeatureRun, Lab } from '../feature-ideas-study/lab'
import { ALL, FINDING_SHOTS, ORBIT_SECONDS, SPIN_SECONDS, TOUR_SECONDS, circleSpeed, phaseAt } from './model'
import { TRAILS } from './trails'
import type { Emit } from './trails'

/**
 * The clips and the pictures of the study. The fairy flies the same 14 s over a world of the
 * game, with stepFlight() and hoverFlight() of src/flight.ts. The world turns and moves on its
 * orbit as in the game, and it carries the fairy as the game does (src/main.ts:1001). The
 * camera is the flight camera of the game.
 */
export type TrailStats = { points: number; calls: number; carry: number; cruise: number }
export type TrailRun = FeatureRun & { clip: boolean; stats(): TrailStats }
export type TrailFeature = Feature & { create(lab: Lab): TrailRun }
export type Manoeuvre = 'tour' | 'cruise' | 'turns' | 'boost' | 'hover'
export type CameraView = 'game' | 'side' | 'above'

/** The controls of the live view. The page changes them; the clips do not read them. */
export const view = {
  manoeuvre: 'tour' as Manoeuvre,
  camera: 'game' as CameraView,
  wingColor: defaultFairyLook.wingColor as FairyLook['wingColor'],
  night: false,
  /** The 4 s after a sparkle ring, for as long as the switch is on. */
  bonus: false,
  /** The spin and the orbit of the world. Off: the world is still, and the trail of today has no fault. */
  motion: true,
  still: false,
}

/** Earth has a new landscape at each visit in the game. The study uses one landscape. */
export const EARTH_SEED = 23
const START_HEIGHT = 12
const homes = new WeakMap<Lab, Map<World, { position: THREE.Vector3; spin: number }>>()

type ShotOptions = { live?: boolean; camera?: CameraView; still?: number; clip?: boolean; world?: 'fairy' }
function shot(id: string, trailId: string, options: ShotOptions = {}): TrailFeature {
  return {
    id,
    create(lab) {
      const live = !!options.live
      const world = options.world === 'fairy' ? lab.home : lab.earth
      // Each world goes back to its place of the start, so each clip is the same at each run.
      if (!homes.has(lab)) homes.set(lab, new Map([lab.earth, lab.home, lab.moon].map(item => [item, { position: item.group.position.clone(), spin: item.group.rotation.y }])))
      const restore = () => homes.get(lab)!.forEach((home, item) => { item.group.position.copy(home.position); item.group.rotation.y = home.spin; item.group.updateMatrixWorld(true) })
      restore()
      if (world === lab.earth && world.seed !== EARTH_SEED) regenerateWorld(world, EARTH_SEED)
      // Earth: the meadow of the start of the game. Blossom Haven: a place at a low latitude, where the Sun can be high.
      const place = world === lab.earth ? lab.meadowLocal.clone() : new THREE.Vector3(1, 0.3, 0.4).normalize()
      lab.setSunElevation(world, place, (live ? view.night : false) ? -16 : 32)
      const look = () => ({ ...defaultFairyLook, wingColor: live ? view.wingColor : defaultFairyLook.wingColor })
      let painted = ''
      const paint = () => { if (painted !== look().wingColor) { painted = look().wingColor; lab.rig.applyLook(look()) } }
      paint()
      lab.trailMaterial.visible = false

      // The start: over the meadow, away from the Sun and a little to one side, so the Sun lights her back.
      const centre = world.group.position
      const up = place.clone().normalize().applyQuaternion(world.group.quaternion)
      const toSun = lab.sun.group.position.clone().sub(centre).normalize()
      const heading = toSun.addScaledVector(up, -toSun.dot(up)).normalize().negate().applyAxisAngle(up, 0.6)
      lab.fairy.position.copy(centre).addScaledVector(up, surfaceRadius(world, up) + START_HEIGHT)
      orientFlight(lab.fairy.quaternion, heading, up)
      const flight: FlightState = { position: lab.fairy.position, quaternion: lab.fairy.quaternion, speed: 11 }

      // The orbit and the spin of the game (src/orbits.ts, src/main.ts:998).
      const sun = lab.sun.group.position
      const orbitRadius = Math.hypot(centre.x - sun.x, centre.z - sun.z)
      let orbitAngle = Math.atan2(centre.z - sun.z, centre.x - sun.x)
      const spinSeconds = SPIN_SECONDS[world === lab.earth ? 'earth' : 'fairy']
      const inverse = new THREE.Quaternion(), offset = new THREE.Vector3(), turn = new THREE.Quaternion(), moved = new THREE.Vector3()
      function carry(delta: number) {
        inverse.copy(world.group.quaternion).invert()
        offset.copy(lab.fairy.position).sub(centre).applyQuaternion(inverse)
        turn.copy(inverse).multiply(lab.fairy.quaternion)
        world.group.rotation.y += delta * Math.PI * 2 / spinSeconds
        orbitAngle += delta * Math.PI * 2 / ORBIT_SECONDS
        moved.set(sun.x + Math.cos(orbitAngle) * orbitRadius, centre.y, sun.z + Math.sin(orbitAngle) * orbitRadius).sub(centre)
        centre.add(moved)
        if (world === lab.earth) lab.moon.group.position.add(moved)
        world.group.updateMatrixWorld(true)
        lab.fairy.position.copy(offset).applyQuaternion(world.group.quaternion).add(centre)
        lab.fairy.quaternion.copy(world.group.quaternion).multiply(turn)
      }

      const trail = TRAILS[trailId]({
        scene: lab.scene, frame: world.group, fairy: lab.fairy, camera: lab.camera, renderer: lab.renderer, disc: lab.softDisc(),
        sparkle: () => lookColors(look()).sparkle, still: () => live && view.still,
      })
      const body = lab.fairy.getObjectByName('fairy-body')!
      const emit: Emit = { centre: new THREE.Vector3(), left: new THREE.Vector3(), right: new THREE.Vector3(), feet: [new THREE.Vector3(), new THREE.Vector3()], wing: out => out, velocity: new THREE.Vector3(), down: new THREE.Vector3(), boost: false, hover: false, bonus: 0 }
      // The four wing panels of the rig, left side first, the upper panel before the lower panel. They move with the wing beat.
      const panels = lab.rig.classicWings.petal.children
      emit.wing = (out, random) => {
        const index = Math.floor(random() * 2) * 2 + (random() < 0.35 ? 1 : 0), lower = index % 2 === 1, side = index < 2 ? -1 : 1
        // The line from the root of the panel to its tip, and a width that is largest at the middle of the panel.
        const tipX = lower ? 0.83 : 1.26, tipY = lower ? -0.64 : 0.99, length = Math.hypot(tipX, tipY)
        const along = 0.12 + 0.88 * Math.sqrt(random()), across = (random() - 0.5) * (lower ? 0.42 : 0.62) * Math.sin(Math.PI * along)
        out.set(side * (tipX * along - tipY / length * across), tipY * along + tipX / length * across, 0)
        return panels[index].localToWorld(out)
      }
      const before = new THREE.Vector3()
      const label = document.createElement('p')
      label.className = 'phase-label'
      lab.overlay.append(label)

      // The other cameras: from one side, and from above with her heading up the picture.
      const eye = new THREE.Vector3(), target = new THREE.Vector3()
      let camera: CameraView = 'game'
      function setCamera(next: CameraView) {
        if (next === camera) return
        camera = next
        if (next === 'game') { lab.setShot(null); lab.snapCamera(); return }
        lab.setShot(cam => {
          if (next === 'above') { eye.set(0, 15, 3.5); target.set(0, 0, 3.5); cam.up.set(0, 0, -1) }
          else { eye.set(12, 1.5, 4); target.set(0, 0.4, 4); cam.up.set(0, 1, 0) }
          cam.up.applyQuaternion(lab.fairy.quaternion)
          cam.position.copy(eye.applyQuaternion(lab.fairy.quaternion)).add(lab.fairy.position)
          cam.lookAt(target.applyQuaternion(lab.fairy.quaternion).add(lab.fairy.position))
          cam.fov = 58
          cam.updateProjectionMatrix()
        })
      }
      setCamera(live ? view.camera : options.camera ?? 'game')

      let bonusFrom = Infinity, carrySpeed = 0, cruiseSpeed = 0
      return {
        duration: live ? 36000 : TOUR_SECONDS,
        still: options.still ?? 5.6,
        clip: options.clip ?? true,
        stats: () => ({ points: trail.points, calls: trail.calls, carry: carrySpeed, cruise: cruiseSpeed }),
        update(t, delta) {
          if (live) { paint(); setCamera(view.camera) }
          if (delta <= 0) return
          const manoeuvre = live ? view.manoeuvre : 'tour'
          const phase = phaseAt(t % TOUR_SECONDS)
          const input = manoeuvre === 'tour' ? phase
            : { label: '', yaw: manoeuvre === 'turns' ? (Math.sin(t * 0.9) > 0 ? 1 : -1) : 0, boost: manoeuvre === 'boost', hover: manoeuvre === 'hover', bonus: false }
          const bonusOn = input.bonus || (live && view.bonus)
          // sparkleLevel() of the game: 1 after a ring, and the last 0.75 s go down. In the flight of the clip the ring comes at the start of the last phase.
          if (bonusOn && bonusFrom === Infinity) bonusFrom = t
          if (!bonusOn) bonusFrom = Infinity
          const until = live && view.bonus ? Infinity : bonusFrom + 2.5
          emit.bonus = bonusOn ? THREE.MathUtils.clamp((until - t) / 0.75, 0, 1) : 0

          before.copy(lab.fairy.position)
          if (!live || view.motion) carry(delta)
          carrySpeed = before.distanceTo(lab.fairy.position) / delta
          before.copy(lab.fairy.position)
          if (input.hover) hoverFlight(flight, world, delta, { yaw: input.yaw, pitch: 0 })
          else stepFlight(flight, world, delta, { yaw: input.yaw, pitch: 0, boost: input.boost })
          emit.velocity.copy(lab.fairy.position).sub(before).divideScalar(delta)
          if (!input.boost && !input.hover) cruiseSpeed = emit.velocity.length()
          lab.setBoost(input.boost)

          lab.fairy.updateMatrixWorld(true)
          body.localToWorld(emit.centre.set(0, 0.15, 0.3))
          // The ankle joints of the rig move with the pose of her legs.
          lab.rig.joints.forEach((joint, side) => { body.localToWorld(emit.feet[side].copy(joint.ankle)) })
          body.localToWorld(emit.left.set(-0.95, 1.15, 0.25))
          body.localToWorld(emit.right.set(0.95, 1.15, 0.25))
          emit.down.copy(centre).sub(lab.fairy.position).normalize()
          emit.boost = input.boost
          emit.hover = input.hover
          trail.update(t, delta, emit)
          if (label.textContent !== input.label) { label.textContent = input.label; label.hidden = !input.label }
        },
        dispose() {
          trail.dispose()
          lab.trailMaterial.visible = true
          lab.setShot(null)
          restore()
        },
      }
    },
  }
}

export const FEATURES: Record<string, TrailFeature> = Object.fromEntries([
  ...ALL.map(option => shot(option.id, option.id, { still: option.still, world: option.world })),
  ...FINDING_SHOTS.map(finding => shot(finding.id, finding.trail, { camera: finding.camera, still: finding.time, clip: false })),
].map(feature => [feature.id, feature]))

/** The live view of an option: no end, and the controls of `view`. */
export const liveFeature = (id: string) => shot(`live-${id}`, id, { live: true, world: ALL.find(option => option.id === id)?.world })

/** The speed of the ground of a world at its equator, and the speed of the world on its orbit, in metres in each second. */
export function worldSpeeds(lab: Lab, kind: 'earth' | 'fairy') {
  const world = kind === 'earth' ? lab.earth : lab.home, sun = lab.sun.group.position
  return {
    spin: circleSpeed(world.radius, SPIN_SECONDS[kind]),
    orbit: circleSpeed(Math.hypot(world.group.position.x - sun.x, world.group.position.z - sun.z), ORBIT_SECONDS),
  }
}
