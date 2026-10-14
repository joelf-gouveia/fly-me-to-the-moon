import type { Feature } from '../../feature-ideas-study/lab'

/**
 * The capture page makes each clip the same at each run. The game makes a new Earth at each
 * visit (regenerateWorld() with Math.random()), and the trails and the bursts use Math.random()
 * too. On the capture page Math.random() has a fixed seed: one at the start of the page (it gives
 * the Earth of the clips), and one at the load of each clip. The live view of the page keeps
 * the real Math.random(), so it shows a new Earth at each visit, as the game does.
 */
export const EARTH_SEED = 24

/** Gives Math.random() a fixed seed (mulberry32). */
export function seedRandom(seed: number) {
  let state = seed >>> 0
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The features with a fixed seed at each load: a still run and a clip run give the same frames. */
export function seeded(features: Record<string, Feature>) {
  return Object.fromEntries(Object.entries(features).map(([id, feature]) => [id, {
    id: feature.id,
    create(lab) {
      seedRandom([...id].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7))
      return feature.create(lab)
    },
  } satisfies Feature]))
}
