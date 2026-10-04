import * as THREE from 'three'
import { regenerateWorld } from '../../src/worlds'
import { orientFlight } from '../../src/flight'
import type { Feature, FeatureRun, Lab } from '../feature-ideas-study/lab'
import { SPECIES } from '../../src/foliage/species'
import type { SpeciesId } from '../../src/foliage/species'
import { ALL_LEVERS } from '../../src/foliage/planting'
import type { Levers, PlanStats } from '../../src/foliage/planting'
import { along, findFlat, findSpot, findView, LAWN } from './places'
import { plant, plantRow, siteOf } from './scene'
import type { OptionId } from '../../src/foliage/zones'

/**
 * The clips and the pictures of the study. A clip is a flight in a few cuts: each cut is a
 * short low flight through one zone, and the last cut looks down from above. The clips of
 * Today, A and B of a world fly the same paths, so only the plants change.
 */
export type FoliageRun = FeatureRun & { clip: boolean; stats(): PlanStats & { ms: number }; replant(): void }
export type FoliageFeature = Feature & { create(lab: Lab): FoliageRun }

/** The levers of the live view. The page changes them; the clips use all levers. */
export const levers: Levers = { ...ALL_LEVERS }

/** Earth has a new landscape at each visit in the game. The study uses one landscape, so each clip is the same at each run. */
export const EARTH_SEED = 23
export function prepare(lab: Lab) {
  if (lab.earth.seed !== EARTH_SEED) regenerateWorld(lab.earth, EARTH_SEED)
}

// ---- Flights --------------------------------------------------------------------------------------
type CutSpec = { from: OptionId; zone: string; wooded?: boolean; seconds?: number; elevation?: number; aerial?: boolean; low?: boolean }
const CUT = 3.2
const earthCuts: CutSpec[] = [
  { from: 'E2', zone: 'jungle' }, { from: 'E2', zone: 'savanna', wooded: false }, { from: 'E2', zone: 'temperate' }, { from: 'E2', zone: 'taiga' },
  { from: 'E2', zone: 'temperate', aerial: true },
]
const seasonCuts: CutSpec[] = [
  { from: 'E3', zone: 'spring' }, { from: 'E3', zone: 'summer' }, { from: 'E3', zone: 'autumn' }, { from: 'E3', zone: 'winter' },
  { from: 'E3', zone: 'autumn', aerial: true },
]
const gardenCuts: CutSpec[] = [
  { from: 'H2', zone: 'grove' }, { from: 'H2', zone: 'orchard' }, { from: 'H2', zone: 'glade' }, { from: 'H2', zone: 'glade', elevation: -24 },
  { from: 'H2', zone: 'peaks', wooded: false }, { from: 'H2', zone: 'grove', aerial: true },
]
const blossomCuts: CutSpec[] = [
  { from: 'H3', zone: 'meadow', wooded: false }, { from: 'H3', zone: 'blossom' }, { from: 'H3', zone: 'blossom', elevation: -24 }, { from: 'H3', zone: 'hills' },
  { from: 'H3', zone: 'lane', wooded: false }, { from: 'H3', zone: 'blossom', aerial: true },
]

type FlightOptions = { cuts: CutSpec[]; stillCut: number; clip?: boolean; levers?: Partial<Levers> }
function flight(id: string, option: OptionId, options: FlightOptions): FoliageFeature {
  return {
    id,
    create(lab) {
      prepare(lab)
      const world = option.startsWith('E') ? lab.earth : lab.home
      const active = (): Levers => ({ ...levers, ...options.levers })
      let planting = plant(world, option, active())
      const cuts = options.cuts.map(spec => ({ ...spec, seconds: spec.seconds ?? CUT, spot: spec.aerial ? findView(siteOf(world), spec.from, spec.zone, spec.low ? 130 : 225) : findSpot(siteOf(world), spec.from, spec.zone, spec.wooded ?? true) }))
      const starts = cuts.map((_, index) => cuts.slice(0, index).reduce((sum, cut) => sum + cut.seconds, 0))
      const duration = starts.at(-1)! + cuts.at(-1)!.seconds
      // The camera is higher than in the game, to see the ground. Blossom Haven is small, so its horizon is low.
      const fairyWorld = world.kind === 'fairy'
      lab.setFollow(fairyWorld ? 8.5 : 8, fairyWorld ? 5.4 : 4.2)

      let current = -1, last = 0
      let curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)])
      const heading = new THREE.Vector3(), normal = new THREE.Vector3(), target = new THREE.Vector3()
      function placeAt(u: number) {
        curve.getPointAt(u, lab.fairy.position)
        curve.getTangentAt(u, heading)
        normal.copy(lab.fairy.position).sub(world.group.position).normalize()
        orientFlight(lab.fairy.quaternion, heading, normal)
      }
      /** The last cut: the camera is above and behind the fairy, and it looks down at the land ahead. */
      const fromAbove = (camera: THREE.PerspectiveCamera) => {
        // The low view stays below the mist of the cloud layer.
        const near = cuts[current].low ? 0.55 : 1
        camera.position.copy(lab.fairy.position).addScaledVector(heading, -30 * near).addScaledVector(normal, 20 * near)
        camera.up.copy(normal)
        camera.lookAt(target.copy(lab.fairy.position).addScaledVector(heading, 46 * near).addScaledVector(normal, -40 * near))
      }
      function enter(index: number) {
        current = index
        const cut = cuts[index]
        lab.setSunElevation(world, cut.spot.dir, active().night ? -14 : cut.elevation ?? 34)
        const length = cut.aerial ? 95 : 62, height = cut.low ? 13 : cut.aerial ? 42 : fairyWorld ? 6.5 : 9
        const points: THREE.Vector3[] = []
        for (let metres = -8; metres <= length; metres += 10) points.push(lab.surfacePoint(world, along(cut.spot.dir, cut.spot.heading, metres, world.radius), height))
        curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
        placeAt(0)
        lab.setShot(cut.aerial ? fromAbove : null)
        lab.snapCamera()
      }

      return {
        duration, clip: options.clip ?? true,
        still: starts[options.stillCut] + cuts[options.stillCut].seconds * 0.55,
        stats: () => planting.stats,
        replant() { planting.dispose(); planting = plant(world, option, active()); current = -1 },
        update(t) {
          if (lab.mode === 'clip') {
            const time = Math.min(t, duration - 0.001)
            const index = starts.findLastIndex(start => start <= time)
            if (index !== current || t < last) enter(index)
            placeAt((time - starts[index]) / cuts[index].seconds)
          }
          last = t
          planting.uniforms.wind.value.x = t
          planting.uniforms.glow.value = world.kind === 'fairy' ? lab.light.night * 1.5 : 0
        },
        dispose() { planting.dispose(); lab.setShot(null) },
      }
    },
  }
}

// ---- Plant sheets ---------------------------------------------------------------------------------
type SheetPlant = { species: SpeciesId; size?: number; colour?: number; label?: string }
const row = (ids: SpeciesId[]): SheetPlant[] => ids.map(species => ({ species }))

/** One plant of each kind in two rows on a flat lawn, with its name, and the fairy for the size. */
function sheet(id: string, home: boolean, trees: SheetPlant[], small: SheetPlant[]): FoliageFeature {
  return {
    id,
    create(lab) {
      prepare(lab)
      const world = home ? lab.home : lab.earth
      // The terrain of a world has no flat place of this size, so the plants stand on a lawn: a flat stage on the ground.
      const spot = findFlat(siteOf(world))
      lab.setSunElevation(world, spot.dir, 40)
      const up = spot.dir, right = spot.heading, forward = new THREE.Vector3().crossVectors(up, right).normalize()
      const origin = up.clone().multiplyScalar(world.radius + spot.quality + 0.3)
      /** A point of the lawn in the local frame of the planet: `x` to the right, `z` away from the camera, `y` up. */
      const local = (x: number, z: number, y = 0) => origin.clone().addScaledVector(right, x).addScaledVector(forward, z).addScaledVector(up, y)
      const inWorld = (point: THREE.Vector3) => world.group.localToWorld(point)
      const lawn = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 12, 64).scale(LAWN.width, 1, LAWN.depth).translate(0, -6, 0),
        new THREE.MeshStandardMaterial({ color: home ? 0xe7a0ba : 0x679a43, roughness: 0.95 }),
      )
      lawn.position.copy(origin)
      lawn.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward.clone().negate()))
      world.surface.add(lawn)

      const items = [
        ...trees.map((item, index) => ({ ...item, x: (index - (trees.length - 1) / 2) * 4.8, z: 4, size: item.size ?? 1.1, low: index % 2 === 1 })),
        ...small.map((item, index) => ({ ...item, x: (index - (small.length - 1) / 2) * 3.6, z: -5, size: item.size ?? 1.5, low: false })),
      ]
      const planted = plantRow(world, items.map(item => ({ species: item.species, position: local(item.x, item.z), up, size: item.size, colour: item.colour ?? SPECIES[item.species].palette[0] })))
      const labels = items.map(item => {
        const label = document.createElement('span')
        // Each second name of the back row is one line lower, so two long names do not touch.
        label.className = item.low ? 'plant-label low' : 'plant-label'
        label.textContent = item.label ?? SPECIES[item.species].name
        lab.overlay.append(label)
        return { label, at: inWorld(local(item.x, item.z - 1.1)) }
      })
      const cameraAt = inWorld(local(0, -27, 9)), lookAt = inWorld(local(0, 0, 1.4)), worldUp = lab.upAt(world, cameraAt)
      lab.setShot(camera => {
        camera.fov = 58
        camera.position.copy(cameraAt); camera.up.copy(worldUp); camera.lookAt(lookAt)
        camera.updateMatrixWorld()
      })
      const fairyAt = inWorld(local(-(small.length + 1) / 2 * 3.6 - 1.5, -5, 1.4))
      const fairyHeading = right.clone().applyQuaternion(world.group.quaternion)
      const projected = new THREE.Vector3()
      return {
        duration: 4, still: 2, clip: false,
        stats: () => ({ trees: trees.length, small: small.length, kinds: items.length, triangles: 0, zones: {}, ms: 0 }),
        replant() {},
        update(t) {
          if (lab.mode === 'clip') {
            lab.fairy.position.copy(fairyAt)
            orientFlight(lab.fairy.quaternion, fairyHeading, worldUp)
          }
          planted.uniforms.wind.value.x = t
          for (const { label, at } of labels) {
            projected.copy(at).project(lab.camera)
            label.style.left = `${(projected.x + 1) * 50}%`
            label.style.top = `${(1 - projected.y) * 50}%`
          }
        },
        dispose() {
          planted.dispose(); lab.setShot(null); labels.forEach(item => item.label.remove())
          world.surface.remove(lawn); lawn.geometry.dispose(); (lawn.material as THREE.Material).dispose()
        },
      }
    },
  }
}

const aerialOnly = (zone: string): CutSpec[] => [{ from: 'E2', zone, aerial: true, low: true, seconds: 4 }]

export const FEATURES: Record<string, FoliageFeature> = {
  E0: flight('E0', 'E0', { cuts: earthCuts, stillCut: 2 }),
  E1: flight('E1', 'E1', { cuts: earthCuts, stillCut: 2 }),
  E2: flight('E2', 'E2', { cuts: earthCuts, stillCut: 0 }),
  E3: flight('E3', 'E3', { cuts: seasonCuts, stillCut: 2 }),
  H0: flight('H0', 'H0', { cuts: gardenCuts, stillCut: 0 }),
  H1: flight('H1', 'H1', { cuts: gardenCuts, stillCut: 0 }),
  H2: flight('H2', 'H2', { cuts: gardenCuts, stillCut: 2 }),
  H3: flight('H3', 'H3', { cuts: blossomCuts, stillCut: 1 }),
  // The plant sheets.
  SE: sheet('SE', false, row(['pine', 'snowPine', 'oak', 'birch', 'palm', 'acacia', 'cactus', 'bareTree']),
    [...row(['bush', 'fern', 'flowers', 'grass', 'reeds', 'rock']), { species: 'toadstool', size: 0.5, colour: 0xc0482e, label: 'Mushroom' }]),
  SH: sheet('SH', true, [...row(['lollipop', 'ballPop', 'cane', 'cottonTree', 'iceCream', 'blossomTree', 'giantFlower', 'crystal']), { species: 'toadstool', size: 2, label: 'Giant toadstool' }],
    [...row(['gumdrops', 'marshmallow']), { species: 'toadstool', size: 0.5, colour: 0xb07ae8, label: 'Toadstool' },
      { species: 'flowers', colour: 0xc9a8f5, label: 'Bell flowers' }, { species: 'grass', colour: 0xf2a6c8, label: 'Sugar grass' }]),
  // The levers, one by one, from above the leaf forest of Earth.
  L0: flight('L0', 'E1', { cuts: aerialOnly('temperate'), stillCut: 0, clip: false, levers: { clusters: false, variation: false, ground: false, night: false } }),
  L1: flight('L1', 'E1', { cuts: aerialOnly('temperate'), stillCut: 0, clip: false, levers: { clusters: false, variation: true, ground: false, night: false } }),
  L2: flight('L2', 'E1', { cuts: aerialOnly('temperate'), stillCut: 0, clip: false, levers: { clusters: true, variation: true, ground: false, night: false } }),
}
