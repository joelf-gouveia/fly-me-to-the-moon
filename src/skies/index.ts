import type * as THREE from 'three'
import type { World } from '../worlds'
import { airlessSky } from './airless'
import { giantSky } from './giants'
import { marsSky } from './mars'
import { venusSky } from './venus'
import type { Sky } from './common'

export type { Sky, SkyFrame, SkyStats } from './common'

/**
 * The living sky of a world (option B of the living worlds study, docs/living-worlds-study.md), or
 * undefined for a world that keeps its sky: Earth has its weather (src/weather-clouds.ts), Blossom
 * Haven its cotton candy (src/cotton-candy.ts), and Ceres, Vesta and the Sun stay as they are.
 */
export function buildSky(world: World, sun: THREE.Vector3): Sky | undefined {
  switch (world.kind) {
    case 'jupiter': case 'saturn': case 'uranus': case 'neptune': return giantSky(world, world.kind, sun)
    case 'venus': return venusSky(world, sun)
    case 'mars': return marsSky(world, sun)
    case 'moon': case 'mercury': return airlessSky(world, sun)
    default: return undefined
  }
}
