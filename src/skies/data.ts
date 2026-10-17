/**
 * The real skies of the worlds (option B of the living worlds study, docs/living-worlds-study.md).
 * Pure data and functions, so the tests run without WebGL. The sources are in the study.
 *
 * Wind: `jet()` gives the real east wind of a latitude in m/s (a negative wind blows to the west,
 * against the spin of the world). The game shows it at WIND_SCALE, so a jet of 100 m/s moves the
 * clouds 7 m/s: faster than the 4 m/s of the study clips, so a child sees the bands slide. The
 * fairy flies 11 to 32 m/s near a world.
 */
export const WIND_SCALE = 0.07

/** u(lat) = a + b·cos(2π·lat/period) + c·sin²(min(90°, d·|lat|)) + e·exp(-(lat/width)²), in m/s. */
export type JetShape = { a: number; b: number; period: number; c: number; d: number; e: number; width: number }

const DEG = Math.PI / 180

export function jet(shape: JetShape, lat: number) {
  const s = Math.sin(Math.min(90, shape.d * Math.abs(lat)) * DEG)
  return shape.a + shape.b * Math.cos(2 * Math.PI * lat / shape.period) + shape.c * s * s + shape.e * Math.exp(-((lat / shape.width) ** 2))
}

/** The same function in GLSL, for the shaders: `float lwJet(float lat)` with `lat` in degrees. */
export function jetGlsl(shape: JetShape) {
  const f = (value: number) => value.toFixed(3)
  return /* glsl */`
float lwJet(float lat) {
  float s = sin(radians(min(90.0, ${f(shape.d)} * abs(lat))));
  return ${f(shape.a)} + ${f(shape.b)} * cos(6.2831853 * lat / ${f(shape.period)}) + ${f(shape.c)} * s * s + ${f(shape.e)} * exp(-pow(lat / ${f(shape.width)}, 2.0));
}`
}

/** The turn of the clouds of a latitude in radians each second, at `radius` game metres from the middle. */
export function turnRate(shape: JetShape, lat: number, radius: number) {
  return jet(shape, lat) * WIND_SCALE / (radius * Math.max(0.15, Math.cos(lat * DEG)))
}

export type SkyKind = 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'venus' | 'mars'

/**
 * The jets. Jupiter: a prograde equator and the strongest jet near 23° N, with jets that change
 * direction about each 12°. Saturn: one wide prograde jet of about 400 m/s at the equator. Uranus
 * and Neptune: a retrograde equator and prograde jets near 60° to 70°; Neptune has the fastest
 * winds of the Solar System, about 400 m/s to the west at the equator. Venus: the clouds go around
 * the planet in about 4 days at about 100 m/s, much faster than the planet turns (243 days).
 * Mars: winds of 10 to 30 m/s; the study uses a slow drift.
 */
export const JETS: Record<SkyKind, JetShape> = {
  jupiter: { a: 0, b: 110, period: 24, c: 0, d: 1, e: 40, width: 8 },
  saturn: { a: 0, b: 50, period: 20, c: 0, d: 1, e: 380, width: 24 },
  uranus: { a: -100, b: 0, period: 360, c: 350, d: 1.5, e: 0, width: 1 },
  neptune: { a: -400, b: 0, period: 360, c: 650, d: 1.3, e: 0, width: 1 },
  venus: { a: 0, b: 100, period: 360, c: 0, d: 1, e: 0, width: 1 },
  mars: { a: 0, b: 20, period: 360, c: 0, d: 1, e: 0, width: 1 },
}

/** The zones of a giant: the latitudes where the high white clouds are, as a band function from -1 to 1. */
export function zone(kind: 'jupiter' | 'saturn', lat: number) {
  // Jupiter: the Equatorial Zone is white, the belts at about ±12° are dark, the tropical zones at ±20° white.
  return kind === 'jupiter' ? Math.cos(2 * Math.PI * (Math.abs(lat) < 6 ? lat : lat - Math.sign(lat) * 2) / 18)
    : Math.cos(2 * Math.PI * lat / 16)
}

/**
 * The layers of the clouds, with the height of each layer as a part of the cloud height of the
 * world in the game, and the real substance and pressure. The colours are for the light of day.
 */
export type Layer = { name: string; part: number; colour: number; under: number; made: string }
export const LAYERS: Record<SkyKind, Layer[]> = {
  jupiter: [
    { name: 'Ammonia ice', part: 1, colour: 0xf7efe0, under: 0xc9b9a0, made: 'ammonia ice, about 0.7 bar' },
    { name: 'Ammonium hydrosulfide', part: 0.45, colour: 0xc9a27e, under: 0x8a6a52, made: 'ammonium hydrosulfide, about 2 bar' },
  ],
  saturn: [
    { name: 'Haze', part: 1.35, colour: 0xf3e6c4, under: 0xd8c8a0, made: 'a haze of hydrocarbons above the clouds' },
    { name: 'Ammonia ice', part: 1, colour: 0xf6ead0, under: 0xcdbf9e, made: 'ammonia ice, about 1 bar' },
  ],
  uranus: [
    { name: 'Methane ice', part: 1, colour: 0xf2fdff, under: 0xa7d6dc, made: 'methane ice, about 1.2 bar' },
  ],
  neptune: [
    { name: 'Methane ice', part: 1.3, colour: 0xffffff, under: 0xc9d7f4, made: 'high methane ice, about 0.2 bar' },
    // The pale blue of the pictures of Voyager 2 that NASA processed again in 2024.
    { name: 'Deck', part: 0.5, colour: 0x86b4d9, under: 0x5f8db8, made: 'hydrogen sulfide, about 3 bar' },
  ],
  venus: [
    { name: 'Upper haze', part: 1.5, colour: 0xf5e2b0, under: 0xe6c88c, made: 'droplets of sulfuric acid, 70 to 90 km' },
    { name: 'Main deck', part: 1.2, colour: 0xf0d29a, under: 0xd9b072, made: 'sulfuric acid, 48 to 70 km' },
    { name: 'Lower haze', part: 0.55, colour: 0xd99a54, under: 0xb8763a, made: 'a thin haze, 30 to 48 km' },
  ],
  mars: [
    { name: 'Water ice wisps', part: 1, colour: 0xf3f4fa, under: 0xd7dbe8, made: 'water ice, 10 to 50 km' },
  ],
}
