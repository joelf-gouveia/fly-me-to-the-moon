import * as THREE from 'three'
import type { World } from '../../src/worlds'
import { setMagic } from '../../src/magic-seasons'
import { createPose } from './seasons'

/**
 * The magic seasons of Blossom Haven for a clip. They are in the game now (src/magic-seasons.ts):
 * the ground and the season plants of Blossom Haven read the uniforms of `world.magic`. The study
 * sets these uniforms for its clips.
 *
 * The second round of the study had its own shader and its own plants in this file, with four
 * patterns and the garden of always blossom. The game has the pattern "Rings from the cottage"
 * only, so clip B3 (the three patterns) is a record of that round.
 */
export type MagicSeasons = ReturnType<typeof createMagicSeasons>

export function createMagicSeasons(world: World, sunPosition: THREE.Vector3) {
  const uniforms = world.magic!
  let on = 1
  return {
    world, uniforms,
    /** Blossom Haven has no tilt, so `pose` gets a tilt of 0. */
    pose: createPose(world, sunPosition),
    /** The magic year: 0 is Blossom time at the cottage, 0.25 is the next season. */
    setLook(year: number) { setMagic(uniforms, year); uniforms.magicOn.value = on },
    /** 0 is the look with no season, 1 is the magic seasons. */
    setOn(value: number) { on = value; uniforms.magicOn.value = value },
  }
}
