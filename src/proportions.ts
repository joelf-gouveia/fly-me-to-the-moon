/**
 * The proportions of the solar system, from the proportions study (docs/proportions-study.md).
 * World data stays in base units: the sizes and distances before this change. The game
 * multiplies them by these factors.
 *
 * - `size`: the radius of every world except the Sun, with its air and clouds.
 * - `spacing`: every distance from the Sun (orbits, the asteroid belt, Blossom Haven).
 * - `sun`: the radius of the Sun and its glow.
 * - `speed`: the flight speed in open space.
 */
export const PROPORTIONS = { size: 1.25, spacing: 2.5, sun: 1.6, speed: 2.25 } as const

/** Life (trees, grass, candy) keeps its base density when a world grows: counts grow with the area. */
export const LIFE_SCALE = PROPORTIONS.size ** 2
