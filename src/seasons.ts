import * as THREE from 'three'
import type { World } from './worlds'

/**
 * The seasons of Earth, from the seasons study (docs/seasons-study.md).
 *
 * Earth leans 23.4° on its axis, and its orbit makes the year. The place changes the season: the
 * north has summer while the south has winter, the equator has no season, and the snow line moves.
 * Each place gets one number, its warmth: the sine of the height of the noon Sun. The colours of
 * the ground and the plants, the snow and the sea ice come from that number and from the latitude.
 * A change of season is a change of three uniforms: no new mesh and no new texture.
 *
 * `year` is the part of one orbit, from 0 to 1. Year 0 is the March equinox, 0.25 is the June
 * solstice (summer in the north). Latitudes and angles are in degrees. North is positive.
 */
const RAD = Math.PI / 180
const TAU = Math.PI * 2
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const smooth = (value: number, low: number, high: number) => { const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t) }
const frac = (value: number) => value - Math.floor(value)

/** The real tilt of Earth's axis. */
export const EARTH_TILT = 23.4
/** The land and the sea warm up slowly, so the look of a season comes after the Sun: one eighth of a year. */
export const LOOK_LAG = 0.125
/**
 * No season below 10°. The full season from 24°. The climate belts of the game (src/foliage/zones.ts)
 * are nearer the equator than on the real Earth, so the bands and the snow line are too.
 */
export const SEASON_BAND = { none: 10, full: 24 } as const
/** Each metre of height is this much colder, so mountains get snow first. */
export const SNOW_LAPSE = 0.012
/** The colours and the limits of the seasons. */
export const SEASON_LOOK = {
  /** The plain grass colour of src/foliage/zones.ts. The season colours are tints of it. */
  base: 0x679a43,
  /** The grass in the middle of spring, summer, autumn and winter. */
  ground: [0x86b84a, 0x5f9440, 0xb89a45, 0x8f8a62],
  snow: 0xe9eef0, ice: 0xdbe9ef,
  /** Snow starts below `low` warmth and is full below `high`. Sea ice the same. */
  snowLine: { low: 0.58, high: 0.66 }, iceLine: { low: 0.3, high: 0.36 },
} as const

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter'
const SEASON_NAMES: SeasonName[] = ['spring', 'summer', 'autumn', 'winter']

/** The latitude of the place where the Sun is overhead at noon. */
export function declination(year: number, tilt = EARTH_TILT) {
  return Math.asin(Math.sin(tilt * RAD) * Math.sin(TAU * year)) / RAD
}
/** The sine of the noon height of the Sun: 1 with the Sun overhead, 0 with the Sun on the horizon. */
export function warmth(latitude: number, sun: number) { return Math.cos((latitude - sun) * RAD) }
/** How much of the season shows at a latitude: 0 near the equator, 1 from 24°. */
export function seasonStrength(latitude: number) {
  return smooth(Math.abs(Math.sin(latitude * RAD)), Math.sin(SEASON_BAND.none * RAD), Math.sin(SEASON_BAND.full * RAD))
}
/** The year of a hemisphere: the south is half a year after the north. 0 is the start of spring. */
export function localYear(latitude: number, year: number) { return frac(year + (latitude < 0 ? 0.5 : 0)) }
/** The place in the colour ramp: 0 is the middle of spring, 0.25 the middle of summer. */
export function lookPhase(latitude: number, year: number) { return frac(localYear(latitude, year) - LOOK_LAG) }
/** The season of a place, or null near the equator. The name follows the Sun: spring starts at the equinox. */
export function seasonAt(latitude: number, year: number): SeasonName | null {
  return seasonStrength(latitude) < 0.08 ? null : SEASON_NAMES[Math.floor(localYear(latitude, year) * 4) % 4]
}
/** Snow on the ground, from 0 to 1. `height` is metres above the sea. */
export function snowCover(latitude: number, year: number, tilt = EARTH_TILT, height = 0) {
  const { low, high } = SEASON_LOOK.snowLine
  return 1 - smooth(warmth(latitude, declination(year - LOOK_LAG, tilt)) - Math.max(0, height) * SNOW_LAPSE, low, high)
}
/** The year value of a real date: the season of the real world on that day. Year 0 is 20 March. */
export function yearOfDate(date: Date) {
  return frac((date.getTime() - Date.UTC(date.getUTCFullYear(), 2, 20)) / (365.25 * 86400000))
}

/** What falls from the sky at a place: snow in the cold, leaves in autumn, petals in spring. */
export type Fall = 'snow' | 'leaf' | 'petal'
export function fallAt(latitude: number, year: number, tilt = EARTH_TILT): { fall: Fall | null; amount: number } {
  const snow = snowCover(latitude, year, tilt)
  if (snow > 0.35) return { fall: 'snow', amount: snow }
  const strength = seasonStrength(latitude), phase = lookPhase(latitude, year)
  const near = (centre: number) => Math.max(0, 1 - Math.abs(((phase - centre + 1.5) % 1) - 0.5) / 0.11)
  if (near(0.5) > 0.05) return { fall: 'leaf', amount: near(0.5) * strength }
  if (near(0) > 0.05) return { fall: 'petal', amount: near(0) * strength }
  return { fall: null, amount: 0 }
}

// ---- The axis ---------------------------------------------------------------------------------------

/**
 * Leans Earth so that the year has the value `year` now. The axis keeps its direction in space, so
 * the orbit then makes the seasons. The Euler order ZXY keeps `rotation.y` as the daily spin about
 * the leaned axis, as src/main.ts sets it.
 */
export function leanEarth(earth: World, sunPosition: THREE.Vector3, year: number, tilt = EARTH_TILT) {
  // The angle of the Sun around Earth in the plane of the orbit. It grows with the orbit.
  const toSun = Math.atan2(sunPosition.z - earth.group.position.z, sunPosition.x - earth.group.position.x)
  // At year 0.25 the axis leans toward the Sun.
  const leanAngle = toSun - TAU * (year - 0.25)
  const axis = new THREE.Vector3(Math.sin(tilt * RAD) * Math.cos(leanAngle), Math.cos(tilt * RAD), Math.sin(tilt * RAD) * Math.sin(leanAngle))
  earth.group.rotation.order = 'ZXY'
  earth.group.rotation.x = Math.asin(axis.z)
  earth.group.rotation.z = Math.atan2(-axis.x, axis.y)
  earth.group.updateMatrixWorld(true)
  earth.tilt = { angle: tilt, leanAngle, lean: new THREE.Quaternion().setFromEuler(new THREE.Euler(earth.group.rotation.x, 0, earth.group.rotation.z, 'ZXY')) }
}
/** The year of a leaned world now, from the place of the Sun. A world with no lean has the year 0. */
export function yearOf(world: World, sunPosition: THREE.Vector3) {
  if (!world.tilt) return 0
  const toSun = Math.atan2(sunPosition.z - world.group.position.z, sunPosition.x - world.group.position.x)
  return frac(0.25 + (toSun - world.tilt.leanAngle) / TAU)
}

// ---- The look ---------------------------------------------------------------------------------------

export type SeasonUniforms = { seasonQ: THREE.IUniform<number>; seasonDecl: THREE.IUniform<THREE.Vector2>; seasonOn: THREE.IUniform<number> }
/** The uniforms of a world with seasons. `seasonOn` 0 gives the look with no season. */
export function createSeasonUniforms(): SeasonUniforms {
  return { seasonQ: { value: 0 }, seasonDecl: { value: new THREE.Vector2(0, 1) }, seasonOn: { value: 0 } }
}
/** Sets the look of a day of the year. */
export function setSeason(uniforms: SeasonUniforms, year: number, tilt = EARTH_TILT) {
  const sun = declination(year - LOOK_LAG, tilt) * RAD
  uniforms.seasonQ.value = year - LOOK_LAG
  uniforms.seasonDecl.value.set(Math.sin(sun), Math.cos(sun))
  uniforms.seasonOn.value = 1
}

const glsl = (hex: number) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})` }
/** A colour as a factor of the base colour, so the shade of each vertex stays. */
const factor = (hex: number) => { const c = new THREE.Color(hex), b = new THREE.Color(SEASON_LOOK.base); return `vec3(${(c.r / b.r).toFixed(4)}, ${(c.g / b.g).toFixed(4)}, ${(c.b / b.b).toFixed(4)})` }
const sine = (degrees: number) => Math.sin(degrees * RAD).toFixed(4)
const TINTS = SEASON_LOOK.ground.map(factor).join(', ')
const SNOW_AT = `(1.0 - smoothstep(${SEASON_LOOK.snowLine.low.toFixed(3)}, ${SEASON_LOOK.snowLine.high.toFixed(3)}, warm))`

const COMMON = /* glsl */`
uniform float seasonQ; uniform vec2 seasonDecl; uniform float seasonOn;
varying vec3 vSeasonDir;
float seasonStrength(float sLat) { return smoothstep(${sine(SEASON_BAND.none)}, ${sine(SEASON_BAND.full)}, abs(sLat)); }
// The sine of the noon height of the Sun: warmth().
float seasonWarm(float sLat) { return sqrt(max(0.0, 1.0 - sLat * sLat)) * seasonDecl.y + sLat * seasonDecl.x; }
// The south is half a year after the north. The switch is at the equator, where the season is 0.
float seasonPhase(float sLat) { return fract(seasonQ + (sLat < 0.0 ? 0.5 : 0.0)); }
vec3 seasonRamp(float q, vec3 a, vec3 b, vec3 c, vec3 d) {
  float x = fract(q) * 4.0; float t = smoothstep(0.0, 1.0, fract(x));
  return x < 1.0 ? mix(a, b, t) : x < 2.0 ? mix(b, c, t) : x < 3.0 ? mix(c, d, t) : mix(d, a, t);
}
float seasonRamp(float q, vec4 v) {
  float x = fract(q) * 4.0; float t = smoothstep(0.0, 1.0, fract(x));
  return x < 1.0 ? mix(v.x, v.y, t) : x < 2.0 ? mix(v.y, v.z, t) : x < 3.0 ? mix(v.z, v.w, t) : mix(v.w, v.x, t);
}
`
/** The place of a plant: the translation of its instance matrix. A plant needs no new attribute. */
const INSTANCE_PLACE = /* glsl */`
#ifdef USE_INSTANCING
  vec3 seasonPlace = instanceMatrix[3].xyz;
#else
  vec3 seasonPlace = position;
#endif
vSeasonDir = normalize(seasonPlace);
vSeasonHash = fract(sin(dot(floor(seasonPlace * 8.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);`

type Change = { key: string; pars?: string; vertex: string; fragment: string; roughness?: string }
/** Adds a season change to a built-in material. It keeps each shader change that the material has. */
function patch(material: THREE.Material, uniforms: SeasonUniforms, change: Change) {
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON}\n${change.pars ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${change.vertex}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}\n${change.pars?.replace(/attribute [^;]+;/g, '') ?? ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${change.fragment}`)
    if (change.roughness) shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${change.roughness}`)
  }
  material.customProgramCacheKey = () => `${previousKey}|season-${change.key}`
  return material
}

/**
 * The ground: the grass takes the tint of its season, then the snow. The geometry needs the
 * attribute `seasonInfo`: grass (1) or not (0), the height in metres, and the terrain detail.
 */
export function seasonGround(material: THREE.Material, uniforms: SeasonUniforms) {
  return patch(material, uniforms, {
    key: 'ground',
    pars: 'attribute vec3 seasonInfo; varying vec3 vSeasonInfo;',
    vertex: 'vSeasonDir = normalize(position); vSeasonInfo = seasonInfo;',
    fragment: /* glsl */`{
      float sLat = vSeasonDir.y;
      float warm = seasonWarm(sLat) - max(vSeasonInfo.y, 0.0) * ${SNOW_LAPSE.toFixed(4)} + vSeasonInfo.z * 0.03;
      vec3 tint = seasonRamp(seasonPhase(sLat), ${TINTS});
      vec3 lived = mix(diffuseColor.rgb, diffuseColor.rgb * tint, seasonStrength(sLat) * vSeasonInfo.x);
      lived = mix(lived, ${glsl(SEASON_LOOK.snow)} * (0.92 + vSeasonInfo.z * 0.08), ${SNOW_AT});
      diffuseColor.rgb = mix(diffuseColor.rgb, lived, seasonOn);
    }`,
  })
}

/** The water: ice near a cold pole. The ice is rough, so it does not shine. */
export function seasonWater(material: THREE.Material, uniforms: SeasonUniforms) {
  return patch(material, uniforms, {
    key: 'water',
    vertex: 'vSeasonDir = normalize(position);',
    fragment: /* glsl */`
      float seasonWobble = sin(vSeasonDir.x * 41.0 + vSeasonDir.z * 23.0) * sin(vSeasonDir.y * 37.0 + vSeasonDir.x * 17.0) * 0.02;
      float seasonIce = (1.0 - smoothstep(${SEASON_LOOK.iceLine.low.toFixed(3)}, ${SEASON_LOOK.iceLine.high.toFixed(3)}, seasonWarm(vSeasonDir.y) + seasonWobble)) * seasonOn;
      diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(SEASON_LOOK.ice)}, seasonIce);`,
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.85, seasonIce);',
  })
}

/** How a plant changes with the season. */
export type PlantSeason = 'leaf' | 'small' | 'flower' | 'evergreen'
/** The broadleaf tree, the birch and the bush lose their leaves. The pines, the palms and the cactus stay green. */
export function plantSeason(species: string): PlantSeason {
  return ['oak', 'birch', 'bush'].includes(species) ? 'leaf' : ['grass', 'fern', 'reeds'].includes(species) ? 'small' : species === 'flowers' ? 'flower' : 'evergreen'
}
/**
 * The plants of src/foliage/build.ts. `aFoliage.x` marks the leaves: the part that the game paints
 * with the colour of the instance.
 */
export function seasonPlant(material: THREE.Material, uniforms: SeasonUniforms, kind: PlantSeason) {
  const tops = `${SNOW_AT} * seasonOn * smoothstep(0.8, 2.2, vSeasonTop) * 0.9`
  if (kind === 'leaf') return patch(material, uniforms, {
    // Blossom, then the green of the plant, then autumn colours, then a thin bare crown.
    key: 'leaf',
    pars: 'varying float vSeasonHash; varying float vSeasonTop; varying float vSeasonLeaf;',
    vertex: /* glsl */`${INSTANCE_PLACE}
      vSeasonTop = position.y; vSeasonLeaf = aFoliage.x;
      float seasonBare = seasonOn * seasonStrength(vSeasonDir.y) * seasonRamp(seasonPhase(vSeasonDir.y), vec4(0.0, 0.0, 0.1, 1.0));
      transformed.xz *= 1.0 - 0.7 * seasonBare * aFoliage.x;`,
    fragment: /* glsl */`{
      float sLat = vSeasonDir.y, strength = seasonStrength(sLat) * seasonOn;
      vec3 blossom = mix(${glsl(0x9fd060)}, ${glsl(0xf7b6cf)}, step(0.5, fract(vSeasonHash * 13.0)));
      vec3 autumn = mix(${glsl(0xe08a2a)}, ${glsl(0xc0432a)}, fract(vSeasonHash * 7.0));
      vec3 leaf = seasonRamp(seasonPhase(sLat), blossom, diffuseColor.rgb, autumn, ${glsl(0x6f5f4d)});
      diffuseColor.rgb = mix(diffuseColor.rgb, leaf, strength * vSeasonLeaf);
      float warm = seasonWarm(sLat);
      diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(SEASON_LOOK.snow)}, ${tops});
    }`,
  })
  if (kind === 'small' || kind === 'flower') return patch(material, uniforms, {
    // The tint of the ground, and no plant under the snow. The flowers are out in spring and in summer only.
    key: kind,
    pars: 'varying float vSeasonHash;',
    vertex: /* glsl */`${INSTANCE_PLACE}
      { float warm = seasonWarm(vSeasonDir.y); transformed *= 1.0 - ${SNOW_AT} * seasonOn;
        ${kind === 'flower' ? 'transformed *= mix(1.0, seasonRamp(seasonPhase(vSeasonDir.y), vec4(1.0, 1.0, 0.15, 0.0)), seasonOn * seasonStrength(vSeasonDir.y));' : ''} }`,
    fragment: kind === 'flower' ? '' : /* glsl */`{
      vec3 tint = seasonRamp(seasonPhase(vSeasonDir.y), ${TINTS});
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * tint, seasonStrength(vSeasonDir.y) * seasonOn);
    }`,
  })
  return patch(material, uniforms, {
    // The colour stays. Snow on the top in the cold.
    key: 'evergreen',
    pars: 'varying float vSeasonHash; varying float vSeasonTop;',
    vertex: `${INSTANCE_PLACE}\nvSeasonTop = position.y;`,
    fragment: /* glsl */`{
      float warm = seasonWarm(vSeasonDir.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, ${glsl(SEASON_LOOK.snow)}, ${tops});
    }`,
  })
}
