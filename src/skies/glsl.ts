/**
 * The shader parts of the skies of the study: value noise, a sum of noise, and the light of a
 * place on a world from the Sun. They are the same noise as the clouds of Earth (src/weather-clouds.ts).
 */
export const NOISE = /* glsl */`
float lwHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float lwNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(lwHash(i), lwHash(i + vec3(1, 0, 0)), f.x), mix(lwHash(i + vec3(0, 1, 0)), lwHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(lwHash(i + vec3(0, 0, 1)), lwHash(i + vec3(1, 0, 1)), f.x), mix(lwHash(i + vec3(0, 1, 1)), lwHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float lwFbm(vec3 p) { return lwNoise(p) * 0.5 + lwNoise(p * 2.03) * 0.27 + lwNoise(p * 4.1) * 0.15 + lwNoise(p * 8.3) * 0.08; }
`

/**
 * The turn of a band of a giant: a point at latitude `lat` (a sine) turns about the axis of the
 * world by `angle`. The jets of the band set the angle; the turn is in the local frame of the world.
 */
export const TURN = /* glsl */`
vec3 lwTurn(vec3 p, float angle) { float c = cos(angle), s = sin(angle); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
`
