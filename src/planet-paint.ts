import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from './terrain'
import type { TerrainSample } from './terrain'
import { CANYON, canyonLatitude, canyonOffset, DARK_SPOT, RED_SPOT } from './search-places'
import { BAKE_SIZE, haloFarAt, puffsVisibleAt, RING_SPAN, ringOpacity, spaceLightAt, URANUS_RING_SPAN } from './planet-look'
import type { LookedPlanet } from './planet-look'

/*
 * The painted look of the seven planets: option B of the planet look study (docs/planet-look-study.md).
 * The graphics card paints one map per planet from a recipe. Mars and Mercury get painted vertex colours.
 * src/worlds.ts builds the planets with these parts; updatePlanetLooks() sets the light each frame.
 */

/** A linear-light GLSL colour from an sRGB hex. THREE.Color converts it, as the game materials do. */
const vec3 = (hex: number) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(5)}, ${c.g.toFixed(5)}, ${c.b.toFixed(5)})` }
/** A number as a GLSL float. */
const glsl = (value: number) => value.toFixed(2)

/*
 * 3D simplex noise: webgl-noise by Ian McEwan and Stefan Gustavson, Ashima Arts, MIT license.
 * https://github.com/ashima/webgl-noise
 */
export const NOISE = /* glsl */`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float sum = 0.0, amplitude = 0.5;
  for (int i = 0; i < 5; i++) { sum += amplitude * snoise(p); p = p * 2.03 + vec3(17.1, 3.7, 9.2); amplitude *= 0.5; }
  return sum;
}
/** Signed longitude difference in degrees, from -180 to 180. */
float dlon(float a, float b) { return mod(a - b + 540.0, 360.0) - 180.0; }
/** An elliptic storm: 1 inside, 0 outside. Sizes in degrees. */
float oval(float lat, float lon, float cLat, float cLon, float w, float h) {
  vec2 d = vec2(dlon(lon, cLon) * cos(radians(lat)) / w, (lat - cLat) / h);
  return 1.0 - smoothstep(0.75, 1.0, length(d));
}
`

/** Latitude bands as GLSL: each stop is the upper edge in degrees and the colour below it. */
function bandShader(stops: Array<[number, number]>, width: number) {
  let code = `vec3 bandColor(float lat) {\n  vec3 c = ${vec3(stops[0][1])};\n`
  for (let i = 1; i < stops.length; i++) code += `  c = mix(c, ${vec3(stops[i][1])}, smoothstep(${(stops[i - 1][0] - width).toFixed(2)}, ${(stops[i - 1][0] + width).toFixed(2)}, lat));\n`
  return `${code}  return c;\n}\n`
}

/**
 * One recipe per planet: `vec3 paint(vec3 p, float lat, float lon)` returns linear colour for the unit
 * direction p. Colours come from the measured bands of the reference maps (src/planet-look-study/model.ts),
 * with a little more saturation for the storybook look.
 */
const RECIPES: Partial<Record<LookedPlanet, string>> = {
  jupiter: bandShader([
    [-64, 0x8e9b9c], [-50, 0xa99f8c], [-41, 0xc9ab84], [-35, 0xe2d2b6], [-29, 0xb98758], [-19, 0xf2ebdf],
    [-13, 0xc47c46], [-7, 0xb36638], [6, 0xf4eee2], [11, 0xc9743c], [17, 0xb05f32], [23, 0xf0e5d0],
    [29, 0xc49466], [37, 0xe3d2b4], [47, 0xcbaf88], [60, 0xb1a488], [90, 0x93a09f],
  ], 1.3) + /* glsl */`
  vec3 paint(vec3 p, float lat, float lon) {
    vec3 q = vec3(p.x * 1.7, p.y * 10.0, p.z * 1.7) + seed;
    float w = fbm(q);
    float w2 = fbm(q * 2.4 + vec3(w * 2.0, 0.0, w * 1.5));
    float latw = lat + 2.6 * w + 1.4 * w2;
    vec3 c = bandColor(latw);
    float streak = snoise(vec3(p.x * 7.0, p.y * 70.0, p.z * 7.0) + seed + w2 * 2.0);
    c *= 0.93 + 0.06 * streak + 0.07 * w2;
    // Festoons: blue-grey plumes at the south edge of the North Equatorial Belt.
    float plume = smoothstep(0.25, 0.65, snoise(vec3(p.x * 6.0, p.y * 16.0, p.z * 6.0) + seed * 1.3 + w));
    c = mix(c, ${vec3(0x7d8c9c)}, plume * exp(-pow((latw - 6.0) / 1.8, 2.0)) * 0.75);
    // White ovals in the South Temperate Belt.
    for (int i = 0; i < 7; i++) c = mix(c, ${vec3(0xf6f1e8)}, oval(lat, lon, -33.0 + mod(float(i), 2.0) * 1.5, 40.0 + float(i) * 48.0, 3.2, 2.0) * 0.9);
    // The Great Red Spot, larger than life so it reads from far away. The swirl turns its inside.
    float dl = dlon(lon, ${glsl(RED_SPOT.longitude)}) * cos(radians(lat)) / ${glsl(RED_SPOT.width)}, dt = (lat - (${glsl(RED_SPOT.latitude)})) / ${glsl(RED_SPOT.height)};
    float r = length(vec2(dl, dt));
    float turn = (1.0 - smoothstep(0.0, 1.2, r)) * 3.0;
    vec2 s = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * vec2(dl, dt);
    float swirl = snoise(vec3(s * 2.5, 3.0) + seed);
    c = mix(c, ${vec3(0xf3e6d2)}, (1.0 - smoothstep(0.95, 1.5, r)) * 0.85);
    float core = 1.0 - smoothstep(0.82, 1.0, r + swirl * 0.07);
    vec3 red = mix(${vec3(0xd9885a)}, ${vec3(0xb9502c)}, smoothstep(0.95, 0.25, r)) * (0.9 + 0.1 * swirl);
    return mix(c, red, core);
  }`,
  saturn: bandShader([
    [-78, 0x9ea4aa], [-62, 0xc9bfb3], [-45, 0xdecca6], [-30, 0xe8d19e], [-16, 0xf0d6a0], [-6, 0xfbe4b6],
    [6, 0xffedc9], [14, 0xf6d9a2], [24, 0xe2bd82], [36, 0xd9b985], [50, 0xcfb384], [62, 0xbcab84], [72, 0xa8a886], [90, 0x93a4a4],
  ], 2.2) + /* glsl */`
  vec3 paint(vec3 p, float lat, float lon) {
    vec3 q = vec3(p.x * 1.4, p.y * 12.0, p.z * 1.4) + seed;
    float w = fbm(q);
    float latw = lat + 1.2 * w;
    vec3 c = bandColor(latw);
    c *= 0.96 + 0.05 * snoise(vec3(p.x * 4.0, p.y * 90.0, p.z * 4.0) + seed) + 0.04 * w;
    // The north polar hexagon, with a dark vortex in the middle.
    float d = 90.0 - lat;
    float corner = mod(lon + 30.0, 60.0) - 30.0;
    float edge = 13.0 * cos(radians(30.0)) / cos(radians(corner));
    float hexagon = 1.0 - smoothstep(edge - 0.8, edge + 0.4, d);
    c = mix(c, ${vec3(0x7f9aa6)}, hexagon * 0.9);
    c = mix(c, ${vec3(0x5f7885)}, exp(-pow((d - edge) / 0.6, 2.0)) * 0.5);
    return mix(c, ${vec3(0x4c606c)}, 1.0 - smoothstep(1.5, 4.0, d));
  }`,
  uranus: bandShader([
    [-55, 0x6fb6c2], [-30, 0x7cc4cf], [-12, 0x8bd3dc], [8, 0x96dee6], [28, 0x9fe5ec], [52, 0xaaebf0], [90, 0xc8f6f7],
  ], 7) + /* glsl */`
  vec3 paint(vec3 p, float lat, float lon) {
    vec3 q = vec3(p.x * 1.2, p.y * 6.0, p.z * 1.2) + seed;
    float w = fbm(q);
    vec3 c = bandColor(lat + 2.0 * w);
    c *= 0.985 + 0.02 * sin(radians(lat) * 18.0 + w) + 0.015 * w;
    // A bright cap on the pole that faces the Sun in the pictures.
    c = mix(c, ${vec3(0xe4fafa)}, smoothstep(58.0, 75.0, lat + 3.0 * w) * 0.8);
    for (int i = 0; i < 3; i++) c = mix(c, ${vec3(0xf2ffff)}, oval(lat, lon, 30.0 + float(i) * 4.0, 60.0 + float(i) * 110.0, 3.0, 1.2) * 0.7);
    return c;
  }`,
  neptune: bandShader([
    [-68, 0x2c3a94], [-50, 0x30429f], [-34, 0x3958bb], [-14, 0x3d6ccd], [12, 0x4384dc], [30, 0x3d6bcb], [50, 0x3553b4], [90, 0x2d388d],
  ], 5) + /* glsl */`
  vec3 paint(vec3 p, float lat, float lon) {
    vec3 q = vec3(p.x * 1.5, p.y * 8.0, p.z * 1.5) + seed;
    float w = fbm(q);
    vec3 c = bandColor(lat + 3.0 * w) * (0.95 + 0.07 * w);
    // White cirrus streaks, long in longitude and soft at the ends.
    float streak = smoothstep(0.2, 0.8, snoise(vec3(p.x * 1.6, p.y * 22.0, p.z * 1.6) + seed + w * 0.6)) * smoothstep(-0.2, 0.4, snoise(p * 2.5 + seed * 2.0));
    float belts = exp(-pow((lat - 27.0) / 4.0, 2.0)) + exp(-pow((lat + 43.0) / 3.0, 2.0)) * 0.8;
    c = mix(c, ${vec3(0xeef4ff)}, streak * belts * 0.85);
    // The Great Dark Spot with its white companion cloud.
    c = mix(c, ${vec3(0x1f2f80)}, oval(lat, lon, ${glsl(DARK_SPOT.latitude)}, ${glsl(DARK_SPOT.longitude)}, ${glsl(DARK_SPOT.width)}, ${glsl(DARK_SPOT.height)}) * 0.9);
    c = mix(c, ${vec3(0xf4f7ff)}, oval(lat, lon, -27.5, 196.0, 10.0, 1.3) * 0.9);
    // The Scooter: a small bright cloud further south.
    return mix(c, ${vec3(0xe6eeff)}, oval(lat, lon, -42.0, 300.0, 4.0, 1.6) * 0.8);
  }`,
  venus: /* glsl */`
  vec3 paint(vec3 p, float lat, float lon) {
    vec3 q = p * 2.2 + seed;
    float w = fbm(q);
    float w2 = fbm(vec3(p.x * 2.0, p.y * 5.0, p.z * 2.0) + seed * 1.7 + w * 1.6);
    float latw = abs(lat + 6.0 * w);
    // A sideways Y: one dark band on the equator that opens into two arms over half the planet.
    float along = clamp(mod(lon - 40.0, 360.0) / 200.0, 0.0, 1.0);
    float arm = exp(-pow((latw - 36.0 * along) / (6.0 + 6.0 * along), 2.0)) * (1.0 - along * 0.55);
    vec3 c = mix(${vec3(0xf2d59d)}, ${vec3(0xfbecc6)}, smoothstep(-0.2, 0.5, w2));
    c = mix(c, ${vec3(0xc99a52)}, clamp(arm * 0.8 + smoothstep(0.2, 0.6, -w2) * 0.35, 0.0, 1.0));
    // Bright collars near the poles.
    return mix(c, ${vec3(0xfff1d2)}, smoothstep(55.0, 72.0, latw) * 0.6);
  }`,
}

export const bakedPlanets = Object.keys(RECIPES) as LookedPlanet[]

/**
 * Paints an equirectangular map on the graphics card, then reads it back into an sRGB texture with mipmaps.
 * The map matches the uv of THREE.SphereGeometry, so the game spheres can use it without change.
 */
export function bakePlanetMap(renderer: THREE.WebGLRenderer, id: LookedPlanet, width: number, height: number, seed = 1) {
  const recipe = RECIPES[id]
  if (!recipe) throw new Error(`No recipe for ${id}`)
  const started = performance.now()
  const random = seededRandom(seed)
  const target = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false })
  const material = new THREE.ShaderMaterial({
    uniforms: { size: { value: new THREE.Vector2(width, height) }, seed: { value: new THREE.Vector3(random() * 50, random() * 50, random() * 50) } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec2 size; uniform vec3 seed;
      ${NOISE}
      ${recipe}
      vec3 toSrgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        vec2 uv = gl_FragCoord.xy / size;
        // The direction of THREE.SphereGeometry at this uv.
        float phi = uv.x * 6.28318530718, theta = (1.0 - uv.y) * 3.14159265359;
        vec3 p = vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
        gl_FragColor = vec4(toSrgb(paint(p, uv.y * 180.0 - 90.0, degrees(phi))), 1.0);
      }`,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  quad.frustumCulled = false
  const scene = new THREE.Scene(), camera = new THREE.Camera()
  scene.add(quad)
  const previous = renderer.getRenderTarget()
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  const pixels = new Uint8Array(width * height * 4)
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)
  renderer.setRenderTarget(previous)
  target.dispose(); material.dispose(); quad.geometry.dispose()
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  texture.wrapS = THREE.RepeatWrapping
  texture.needsUpdate = true
  return { texture, milliseconds: performance.now() - started }
}

// ---- Rocky worlds: vertex colours ----------------------------------------------------------------

const DEGREES = 180 / Math.PI
const smooth = THREE.MathUtils.smoothstep
const colors = {
  marsDust: new THREE.Color(0xc8663c), marsBright: new THREE.Color(0xe39561), marsDark: new THREE.Color(0x6a3a2b),
  marsCanyon: new THREE.Color(0x4f2a20), ice: new THREE.Color(0xf6f2ee),
  mercury: new THREE.Color(0x97938e), mercuryDark: new THREE.Color(0x676c76), mercuryPlain: new THREE.Color(0xa99f91), ray: new THREE.Color(0xf5f4f2),
}

/** Four young ray craters on Mercury, as in the MESSENGER pictures. `centre` is a unit direction. Same seed as the terrain. */
export function rayCraters(seed: number) {
  const random = seededRandom(seed + 78)
  return Array.from({ length: 4 }, () => {
    const y = random() * 1.6 - 0.8, a = random() * Math.PI * 2, s = Math.sqrt(1 - y * y)
    const centre = new THREE.Vector3(s * Math.cos(a), y, s * Math.sin(a))
    const east = new THREE.Vector3().crossVectors(centre, new THREE.Vector3(0, 1, 0)).normalize()
    return { centre, east, north: new THREE.Vector3().crossVectors(east, centre), reach: 0.55 + random() * 0.45, rays: 9 + Math.floor(random() * 6) }
  })
}

/** Ground colour for Mars or Mercury at a unit direction. Same seed as the terrain. */
export function createGroundPainter(id: 'mars' | 'mercury', seed: number) {
  const noise = createNoise3D(seededRandom(seed + 77))
  const craters = rayCraters(seed)
  const flat = new THREE.Vector3()
  const fbm = (x: number, y: number, z: number) => noise(x, y, z) * 0.6 + noise(x * 2.1 + 9, y * 2.1, z * 2.1) * 0.3 + noise(x * 4.3 + 3, y * 4.3, z * 4.3) * 0.1

  return (direction: THREE.Vector3, sample: TerrainSample, target: THREE.Color) => {
    const lat = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)) * DEGREES
    const lon = Math.atan2(direction.z, direction.x) * DEGREES
    if (id === 'mars') {
      const ragged = noise(direction.x * 7, direction.y * 7, direction.z * 7)
      const dark = smooth(fbm(direction.x * 1.5, direction.y * 1.5, direction.z * 1.5) + ragged * 0.1 + (lat < -8 && lat > -48 ? 0.12 : 0) + (lat > 35 && lat < 58 ? 0.08 : 0), 0.2, 0.36)
      const bright = smooth(noise(direction.x * 2.3 + 40, direction.y * 2.3, direction.z * 2.3), 0.2, 0.55) * (1 - dark)
      target.copy(colors.marsDust).lerp(colors.marsBright, bright * 0.7).lerp(colors.marsDark, dark * 0.85)
      target.multiplyScalar(0.9 + sample.detail * 0.12 + sample.height * 0.018)
      // A long canyon along the equator, as Valles Marineris.
      const inside = CANYON.reach - canyonOffset(lon)
      if (inside > 0) {
        const middle = canyonLatitude(lon) + noise(direction.x * 9, direction.y * 9, direction.z * 9) * 0.8
        target.lerp(colors.marsCanyon, Math.exp(-(((lat - middle) / CANYON.width) ** 2)) * smooth(inside, 0, CANYON.fade) * 0.85)
      }
      // Ice caps: the north cap is larger. Their edges are ragged.
      const ice = Math.max(smooth(lat + ragged * 4, 60, 64), smooth(-lat + ragged * 4, 68, 72))
      return target.lerp(colors.ice, ice)
    }
    const dark = smooth(fbm(direction.x * 1.8 + 5, direction.y * 1.8, direction.z * 1.8), 0.15, 0.45)
    const plain = smooth(noise(direction.x * 2.6 + 70, direction.y * 2.6, direction.z * 2.6), 0.3, 0.6) * (1 - dark)
    target.copy(colors.mercury).lerp(colors.mercuryDark, dark * 0.85).lerp(colors.mercuryPlain, plain * 0.5)
    target.multiplyScalar(0.84 + sample.detail * 0.2 + sample.height * 0.035)
    for (const crater of craters) {
      const angle = direction.angleTo(crater.centre)
      if (angle > crater.reach) continue
      if (angle < 0.05) return target.copy(colors.ray)
      flat.copy(direction).addScaledVector(crater.centre, -direction.dot(crater.centre))
      const ray = smooth(Math.cos(Math.atan2(flat.dot(crater.north), flat.dot(crater.east)) * crater.rays + sample.detail * 2), 0.86, 1) * (1 - angle / crater.reach)
      target.lerp(colors.ray, Math.max(ray * 0.7, (1 - smooth(angle, 0.05, 0.13)) * 0.8))
    }
    return target
  }
}

// ---- Rings --------------------------------------------------------------------------------------

/** A radial ring texture: u is the distance from the inner edge to the outer edge. */
export function ringTexture(kind: 'saturn' | 'uranus', width = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = 1
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(width, 1)
  const random = seededRandom(kind === 'saturn' ? 0x5a7 : 0x0a5)
  const ringlets = Array.from({ length: width }, () => random())
  const colour = new THREE.Color(), cream = new THREE.Color(0xeee0c2), dusty = new THREE.Color(0x9a8c78), grey = new THREE.Color(0xd2c6ae)
  for (let x = 0; x < width; x++) {
    let alpha: number
    if (kind === 'saturn') {
      const radius = RING_SPAN.inner + (x + 0.5) / width * (RING_SPAN.outer - RING_SPAN.inner)
      // Fine ringlets: small steps of brightness and opacity, smoothed over three pixels.
      const ringlet = (ringlets[Math.max(0, x - 1)] + ringlets[x] + ringlets[Math.min(width - 1, x + 1)]) / 3
      alpha = ringOpacity(radius) * (0.82 + 0.18 * ringlet)
      const t = (radius - RING_SPAN.inner) / (RING_SPAN.outer - RING_SPAN.inner)
      colour.copy(dusty).lerp(cream, smooth(t, 0.2, 0.45)).lerp(grey, smooth(t, 0.62, 0.8)).multiplyScalar(0.9 + 0.12 * ringlet)
    } else {
      // Uranus: nine narrow rings, the outer epsilon ring the brightest (URANUS_RING_SPAN).
      const t = (x + 0.5) / width
      alpha = 0
      for (let i = 0; i < 9; i++) alpha = Math.max(alpha, Math.exp(-((((t - i / 8) * width) / (i === 8 ? 4 : 2)) ** 2)) * (i === 8 ? 0.95 : 0.7))
      colour.setHex(0xd8ecf0)
    }
    colour.convertLinearToSRGB()
    pixels.data.set([colour.r * 255, colour.g * 255, colour.b * 255, alpha * 255], x * 4)
  }
  ctx.putImageData(pixels, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A flat ring in the local XZ plane (the equator) with u along the radius, for a radial texture. */
export function ringGeometry(inner: number, outer: number) {
  const geometry = new THREE.RingGeometry(inner, outer, 256, 1)
  const position = geometry.attributes.position, uv = geometry.attributes.uv
  for (let i = 0; i < position.count; i++) {
    const radius = Math.hypot(position.getX(i), position.getY(i))
    uv.setXY(i, (radius - inner) / (outer - inner), 0.5)
  }
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

// ---- Light --------------------------------------------------------------------------------------

/**
 * Scales the hemisphere light on one material, as createMoonMaterial() in src/moon.ts does for earthshine.
 * The Sun (a point light) does not change, so the night side gets dark from far away.
 */
export function withSpaceLight(material: THREE.MeshStandardMaterial, light: THREE.IUniform<number>, key: string) {
  const previous = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    shader.uniforms.spaceLight = light
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float spaceLight;')
      .replace('#include <lights_fragment_end>', '#if defined( RE_IndirectDiffuse )\n\tirradiance *= spaceLight;\n#endif\n#include <lights_fragment_end>')
  }
  material.customProgramCacheKey = () => `space-light-${key}`
  return material
}

/**
 * Saturn: the shadow of the rings on the planet. A ray from the ground to the Sun crosses the
 * ring plane; the ring opacity at that radius darkens the ground. `ring` is the radial ring texture.
 */
export function withRingShadow(material: THREE.MeshStandardMaterial, uniforms: { ringNormal: THREE.IUniform<THREE.Vector3>; ringCentre: THREE.IUniform<THREE.Vector3>; ringSun: THREE.IUniform<THREE.Vector3>; ringMap: THREE.IUniform<THREE.Texture>; ringSpan: THREE.IUniform<THREE.Vector2> }) {
  const previous = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRingWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRingWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRingWorld;\nuniform vec3 ringNormal; uniform vec3 ringCentre; uniform vec3 ringSun; uniform sampler2D ringMap; uniform vec2 ringSpan;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 toSun = normalize(ringSun - vRingWorld);
        float facing = dot(toSun, ringNormal);
        // The sun shading patch names its own uniform sunPosition, so this one is ringSun.
        float along = dot(ringCentre - vRingWorld, ringNormal) / (abs(facing) > 1e-4 ? facing : 1e-4);
        if (along > 0.0) {
          float radius = length(vRingWorld + toSun * along - ringCentre);
          float u = (radius - ringSpan.x) / (ringSpan.y - ringSpan.x);
          if (u > 0.0 && u < 1.0) diffuseColor.rgb *= 1.0 - texture2D(ringMap, vec2(u, 0.5)).a * 0.75;
        }`)
  }
  const key = material.customProgramCacheKey()
  material.customProgramCacheKey = () => `${key}|ring-shadow`
  return material
}

// ---- The game: state per planet, and the frame update ------------------------------------------

/** Uniforms and parts of one planet look. They live as long as the world; rebuilt materials use them again. */
export type PlanetLookState = {
  /** Hemisphere light on the planet materials: 1 in the air, SPACE_LIGHT far away. */
  spaceLight: THREE.IUniform<number>
  /** 0 inside the air, 1 far away: the thin air rim. */
  haloFar: THREE.IUniform<number>
  /** Saturn: the ring plane in world space, for the ring shadow on the planet. */
  ringNormal?: THREE.IUniform<THREE.Vector3>
  rings?: { map: THREE.Texture; inner: number; outer: number }
  /** Venus: the closed cloud deck and its height above the ground. */
  deck?: { material: THREE.MeshStandardMaterial; height: number }
}

export const createLookState = (): PlanetLookState => ({ spaceLight: { value: 1 }, haloFar: { value: 0 } })

/** The renderer that paints the maps. Without it, src/worlds.ts keeps its canvas deck. */
let painter: THREE.WebGLRenderer | null = null
export function setPlanetPainter(renderer: THREE.WebGLRenderer | null) { painter = renderer }

type LookedWorld = {
  kind: string; radius: number; atmosphere: number; cloudHeight: number; seed: number; mobile?: boolean
  group: THREE.Group; clouds: THREE.Group; look?: PlanetLookState
}

/** A lit planet material with the space light, and the ring shadow on Saturn. */
export function lookMaterial(material: THREE.MeshStandardMaterial, kind: LookedPlanet, state: PlanetLookState, sunPosition?: THREE.Vector3, centre?: THREE.Vector3) {
  withSpaceLight(material, state.spaceLight, kind)
  if (state.rings && state.ringNormal && sunPosition && centre) {
    withRingShadow(material, {
      ringNormal: state.ringNormal, ringCentre: { value: centre }, ringSun: { value: sunPosition },
      ringMap: { value: state.rings.map }, ringSpan: { value: new THREE.Vector2(state.rings.inner, state.rings.outer) },
    })
  }
  return material
}

/** A painted map for a giant or the cloud deck of Venus, or null without a painter. */
export function paintedMap(kind: LookedPlanet, seed: number, mobile = false) {
  if (!painter) return null
  const [width, height] = BAKE_SIZE[mobile ? 'phone' : 'desktop']
  return bakePlanetMap(painter, kind, width, height, seed).texture
}

/** Saturn's rings or Uranus's rings, in the equator plane of the planet (local XZ), so they tilt with it. */
export function planetRings(kind: 'saturn' | 'uranus', radius: number, state: PlanetLookState) {
  const span = kind === 'saturn' ? RING_SPAN : URANUS_RING_SPAN
  const inner = radius * span.inner, outer = radius * span.outer
  const map = ringTexture(kind)
  const mesh = new THREE.Mesh(ringGeometry(inner, outer), new THREE.MeshStandardMaterial({
    map, roughness: 0.85, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    // A little light of its own, so the unlit face of the rings stays faint, not black.
    emissive: kind === 'saturn' ? 0x262626 : 0x1a2426, emissiveMap: kind === 'saturn' ? map : null,
  }))
  mesh.name = `${kind}-rings`
  if (kind === 'saturn') {
    state.rings = { map, inner, outer }
    state.ringNormal = { value: new THREE.Vector3(0, 1, 0) }
  }
  return mesh
}

/** Venus: a closed cloud deck above the cloud puffs, as in the pictures. It opens when the fairy flies through it. */
export function venusDeck(world: LookedWorld, state: PlanetLookState, fallback: number) {
  const map = paintedMap('venus', world.seed, world.mobile)
  const height = world.cloudHeight * 1.2
  const material = lookMaterial(new THREE.MeshStandardMaterial({
    map, color: map ? 0xffffff : fallback, emissiveMap: map, emissive: 0x000000,
    roughness: 1, transparent: true, side: THREE.DoubleSide,
  }), 'venus', state)
  state.deck = { material, height }
  const deck = new THREE.Mesh(new THREE.SphereGeometry(world.radius + height, 128, 80), material)
  deck.name = 'venus-deck'
  return deck
}

const ringUp = new THREE.Vector3()
/**
 * Once per frame: the space light, the air rim, the cloud puffs, the deck of Venus and Saturn's ring
 * plane, from the camera altitude above each planet.
 */
export function updatePlanetLooks(worlds: LookedWorld[], camera: THREE.Vector3) {
  for (const world of worlds) {
    const state = world.look
    if (!state) continue
    const altitude = camera.distanceTo(world.group.position) - world.radius
    state.spaceLight.value = spaceLightAt(altitude, world)
    state.haloFar.value = haloFarAt(altitude, world.atmosphere)
    const puffs = world.clouds.getObjectByName('cloud-puffs')
    if (puffs) puffs.visible = puffsVisibleAt(altitude, world.atmosphere)
    if (state.deck) {
      const { material, height } = state.deck
      const above = altitude - height
      material.opacity = above > world.cloudHeight * 0.35 ? 1 : above > -world.cloudHeight * 0.17 ? 0.3 : 0.88
      material.depthWrite = material.opacity > 0.99
      // Under the deck, the sky is the lit underside of the cloud.
      material.emissive.setScalar(above < -world.cloudHeight * 0.17 ? 0.35 : 0)
      if (!material.map) material.emissive.multiply(material.color)
    }
    if (state.ringNormal) state.ringNormal.value.copy(ringUp.set(0, 1, 0).applyQuaternion(world.group.quaternion))
  }
}
