import * as THREE from 'three'
import { seededRandom } from '../terrain'
import type { World } from '../worlds'
import { DARK_SPOT, RED_SPOT } from '../search-places'
import { JETS, LAYERS, jetGlsl, turnRate, WIND_SCALE } from './data'
import type { SkyKind } from './data'
import { createShell } from './shell'
import { createTufts } from './tufts'
import type { TuftSite } from './tufts'
import { dirOnMap, frameAt, glowTexture, latOf, placesNear, skyOf, slotRandom, spherePlaces, vortexGlsl } from './common'
import type { Sky, SkyPart } from './common'

/**
 * The skies of the four giants (option B of the living worlds study, docs/living-worlds-study.md).
 *
 * - Jupiter: a layer of white ammonia ice on the zones, with gaps over the belts where brown
 *   tufts of the deeper layer show. The Great Red Spot turns in place where src/planet-paint.ts paints
 *   it, and storm towers with lightning rise from the South Equatorial Belt.
 * - Saturn: a soft haze over the bands, cream tufts, and storm towers with lightning in "storm alley".
 * - Uranus: a pale haze with almost no features, and a few bright clouds of methane.
 * - Neptune: a pale blue deck, high white streaks with their shadows on the deck, and the Great Dark
 *   Spot that turns in place, with bright clouds at its south edge.
 *
 * The bands turn about the axis of the world at the speed of the real jets (src/skies/data.ts). The
 * clouds show only inside the air; from far away the painted maps of the planet look study show.
 * A new visit gives new places for the storm towers; the two great spots keep their places on the map.
 */
export type Giant = 'jupiter' | 'saturn' | 'uranus' | 'neptune'

const glslColour = (hex: number) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})` }
const f = (value: number) => value.toFixed(4)

/** The GLSL of the turn of the bands: the point of the pattern that is at `d` now. */
function bandTurn(kind: SkyKind, radius: number) {
  return /* glsl */`
${jetGlsl(JETS[kind])}
vec3 lwFlow(vec3 d, float time) {
  float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
  float rate = lwJet(lat) * ${f(WIND_SCALE)} / (${f(radius)} * max(0.15, cos(radians(lat))));
  return lwTurn(d, -rate * time);
}
float lwLat(vec3 d) { return degrees(asin(clamp(d.y, -1.0, 1.0))); }`
}

/** The zone of a latitude, from -1 (a dark belt) to 1 (a white zone). The same as zone() in data.ts. */
const ZONE_GLSL: Record<Giant, string> = {
  jupiter: 'float lwZone(float lat) { return cos(6.2831853 * (abs(lat) < 6.0 ? lat : lat - sign(lat) * 2.0) / 18.0); }',
  saturn: 'float lwZone(float lat) { return cos(6.2831853 * lat / 16.0); }',
  uranus: 'float lwZone(float lat) { return 0.3 * cos(6.2831853 * lat / 40.0) - 0.2; }',
  neptune: 'float lwZone(float lat) { return -0.4 + 0.5 * smoothstep(15.0, 30.0, abs(lat)) * (1.0 - smoothstep(35.0, 50.0, abs(lat))); }',
}
const JUPITER_ZONE = (lat: number) => Math.cos(2 * Math.PI * (Math.abs(lat) < 6 ? lat : lat - Math.sign(lat) * 2) / 18)
const SATURN_ZONE = (lat: number) => Math.cos(2 * Math.PI * lat / 16)

/** A cloud layer with bands: white zones, gaps over the belts, and streaks along the band. */
function bandShell(world: World, kind: Giant, sun: THREE.Vector3, height: number, top: number, under: number, { cover = 0.93, stretch = 34, soft = 0 } = {}) {
  const radius = world.radius + height
  return createShell(world, sun, {
    height, order: 2, segments: world.mobile ? 64 : 96,
    body: /* glsl */`
      ${bandTurn(kind, radius)}
      ${ZONE_GLSL[kind]}
      vec4 lwLayer(vec3 d, float time, float above) {
        vec3 q = lwFlow(d, time);
        vec3 p = vec3(q.x * 9.0, q.y * ${f(stretch)}, q.z * 9.0);
        float warp = lwFbm(p * 0.45 + 3.1);
        float n = lwFbm(p + vec3(warp * 2.2, 0.0, warp * 1.4));
        float z = lwZone(lwLat(d)) * 0.5 + 0.5;
        float amount = smoothstep(0.42, 0.72, z * 0.85 + (n - 0.5) * 0.95);
        amount = mix(amount, 0.55 + n * 0.3, ${f(soft)});
        vec3 c = mix(${glslColour(under)}, ${glslColour(top)}, above > 0.5 ? 0.7 + n * 0.4 : 0.35 + n * 0.35);
        return vec4(c, amount * ${f(cover)});
      }`,
  })
}

/** Tufts on the latitudes of `zoneTest`, at the height of a layer. */
function zoneTufts(world: World, kind: Giant, count: number, height: number, seed: number, zoneTest: (lat: number) => boolean, size: [number, number, number], spread = 0.45) {
  const random = seededRandom(seed)
  const sites: TuftSite[] = []
  for (const dir of spherePlaces(count * 3, seed)) {
    const lat = latOf(dir)
    if (!zoneTest(lat) || sites.length >= count) continue
    const h = height + random() * 5
    const s = 0.7 + random() * 0.6
    sites.push({
      dir, height: h, size: new THREE.Vector3(size[0] * s, size[1] * (0.7 + random() * 0.6), size[2] * s),
      turn: turnRate(JETS[kind], lat, world.radius + h),
      tint: new THREE.Color().setScalar(1 - spread * 0.25 + random() * spread * 0.25),
      yaw: (random() - 0.5) * 0.3,
    })
  }
  return sites
}

/** A part from a shell or a set of tufts: it moves with the clock of the skies. */
const timed = (name: string, item: { update(time: number, camera?: THREE.Vector3): void; dispose(): void }): SkyPart =>
  ({ name, update: frame => item.update(frame.time, frame.camera.position), dispose: () => item.dispose() })

/**
 * Storm towers: tall tufts that rise from a belt, white on top and dark under it, in groups. In each
 * group, lightning lights a tower from inside about each second, with two quick pulses. The tufts and
 * the shells near the group that is nearest to the camera take the light. No flash with reduced motion.
 */
function stormTowers(world: World, kind: Giant, sun: THREE.Vector3, centres: THREE.Vector3[], colour: number, lit: { tufts: ReturnType<typeof createTufts>[]; shells: ReturnType<typeof createShell>[] }): SkyPart & { mesh: THREE.Object3D; glows: THREE.Sprite[] } {
  const random = seededRandom(world.seed + 83)
  const base = world.cloudHeight * 0.4
  const groups = centres.map((centre, g) => placesNear(centre, 25, world.radius, world.mobile ? 3 : 5, world.seed + 90 + g))
  const sites: TuftSite[] = groups.flat().map(dir => ({
    dir, height: base, size: new THREE.Vector3(16 + random() * 8, 34 + random() * 14, 16 + random() * 8),
    turn: turnRate(JETS[kind], latOf(dir), world.radius + base), tint: new THREE.Color(1, 1, 1),
  }))
  const tufts = createTufts(world, sites, { colour, shade: 0x5f5b73, lobes: 5, detail: world.mobile ? 1 : 2 }, sun, world.seed + 83)
  const texture = glowTexture()
  const glows = groups.map(() => {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: 0xcfd8ff, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
    glow.scale.setScalar(34)
    world.clouds.add(glow)
    return glow
  })
  const local = new THREE.Vector3(), cameraLocal = new THREE.Vector3(), inverse = new THREE.Matrix4()
  const SLOT = 1.1
  let strongest = 0
  const towerPlace = (index: number, time: number, out: THREE.Vector3) => {
    const site = sites[index]
    out.copy(site.dir).multiplyScalar(world.radius + site.height + site.size.y * 0.35)
    const angle = site.turn * time
    return out.set(Math.cos(angle) * out.x + Math.sin(angle) * out.z, out.y, -Math.sin(angle) * out.x + Math.cos(angle) * out.z)
  }
  return {
    name: `${kind}-storm-towers`, mesh: tufts.mesh, glows,
    flash: () => strongest,
    update({ time, camera, still }) {
      tufts.update(time)
      inverse.copy(world.group.matrixWorld).invert()
      cameraLocal.copy(camera.position).applyMatrix4(inverse)
      strongest = 0
      let nearest = Infinity, light: { place: THREE.Vector3; dir: THREE.Vector3; strength: number } | null = null
      groups.forEach((group, g) => {
        // A slot of 1.1 s: in most slots one tower of the group flashes, at a random time in it.
        const slot = Math.floor(time / SLOT), seed = world.seed + g * 7919
        const start = slot * SLOT + slotRandom(slot, seed) * 0.6, length = 0.18 + slotRandom(slot, seed + 1) * 0.12
        const phase = (time - start) / length
        const on = !still && slotRandom(slot, seed + 2) < 0.8 && phase >= 0 && phase < 1
        const strength = on ? (phase < 0.35 ? 1 : phase < 0.55 ? 0.15 : 0.8 * (1 - (phase - 0.55) / 0.45)) : 0
        const tower = groups.slice(0, g).reduce((sum, item) => sum + item.length, 0) + Math.floor(slotRandom(slot, seed + 3) * group.length)
        towerPlace(tower, time, local)
        glows[g].position.copy(local)
        glows[g].material.opacity = strength * 0.85
        strongest = Math.max(strongest, strength)
        const distance = local.distanceTo(cameraLocal)
        if (strength > 0 && distance < nearest) { nearest = distance; light = { place: local.clone().applyMatrix4(world.group.matrixWorld), dir: local.clone().normalize(), strength } }
      })
      const flash = light as { place: THREE.Vector3; dir: THREE.Vector3; strength: number } | null
      for (const item of [tufts, ...lit.tufts]) {
        const value = item.material.uniforms.flash.value as THREE.Vector4
        if (flash) value.set(flash.place.x, flash.place.y, flash.place.z, flash.strength)
        else value.w = 0
      }
      for (const shell of lit.shells) {
        const value = shell.uniforms.flash.value as THREE.Vector4
        if (flash) value.set(flash.dir.x, flash.dir.y, flash.dir.z, flash.strength)
        else value.w = 0
      }
    },
    dispose() {
      tufts.dispose()
      glows.forEach(glow => { world.clouds.remove(glow); glow.material.dispose() })
      texture.dispose()
    },
  }
}

/** A storm that turns in place on its own shell: the Great Red Spot of Jupiter or the Great Dark Spot of Neptune. */
function stormShell(world: World, sun: THREE.Vector3, centre: THREE.Vector3, height: number, size: [number, number], spin: number, colours: { core: number; arms: number; rim: number }) {
  const frame = frameAt(centre)
  return createShell(world, sun, {
    height, order: 3, segments: world.mobile ? 112 : 160,
    uniforms: { middle: { value: frame.up }, east: { value: frame.east }, north: { value: frame.north } },
    body: /* glsl */`
      uniform vec3 middle; uniform vec3 east; uniform vec3 north;
      ${vortexGlsl('lwStorm')}
      vec4 lwLayer(vec3 d, float time, float above) {
        if (dot(d, middle) < 0.9) return vec4(0.0);
        vec3 storm = lwStorm(d, middle, east, north, vec2(${f(size[0])}, ${f(size[1])}), ${f(spin)}, time);
        vec3 c = mix(${glslColour(colours.arms)}, ${glslColour(colours.core)}, smoothstep(0.35, 0.8, storm.y));
        c = mix(c, ${glslColour(colours.rim)}, storm.z * 0.85);
        return vec4(c * (above > 0.5 ? 1.0 : 0.6), max(storm.x * (0.8 + storm.y * 0.2), storm.z * 0.85) * 0.97);
      }`,
  })
}

/** The shadows of high streaks on a deck below them, away from the Sun. They move with their streak. */
function shadowsOf(world: World, streaks: TuftSite[], sun: THREE.Vector3, deckHeight: number): TuftSite[] {
  const toSun = sun.clone().sub(world.group.position).applyQuaternion(world.group.quaternion.clone().invert()).normalize()
  return streaks.map(site => {
    const up = site.dir.clone().normalize()
    const rise = Math.max(0.25, up.dot(toSun))
    const drop = (site.height - deckHeight) / rise
    const point = up.clone().multiplyScalar(world.radius + site.height).addScaledVector(toSun, -drop)
    return { ...site, dir: point.normalize(), height: deckHeight, size: site.size.clone().multiply(new THREE.Vector3(1.05, 0.12, 1.3)), tint: new THREE.Color(1, 1, 1) }
  })
}

/** The size of a painted storm (src/search-places.ts) on the unit sphere: half the width and half the height. */
const stormSize = (storm: { width: number; height: number }): [number, number] => [THREE.MathUtils.degToRad(storm.width), THREE.MathUtils.degToRad(storm.height)]

/** The places of the groups of storm towers: on a latitude, at longitudes from the seed of the visit. */
function towerCentres(world: World, lat: number, count: number) {
  const random = seededRandom(world.seed + 77)
  const start = random() * 360
  return Array.from({ length: count }, (_, i) => dirOnMap(lat + (random() - 0.5) * 3, start + i * 360 / count + (random() - 0.5) * 40))
}

/** The living sky of a giant. `sun` is the live position of the Sun. A phone gets half the tufts. */
export function giantSky(world: World, kind: Giant, sun: THREE.Vector3): Sky {
  const scale = world.mobile ? 0.5 : 1
  const cloud = world.cloudHeight
  const layers = LAYERS[kind]
  const shells: ReturnType<typeof createShell>[] = []
  const tufts: ReturnType<typeof createTufts>[] = []
  const parts: SkyPart[] = []
  let storm: THREE.Vector3 | null = null

  if (kind === 'jupiter' || kind === 'saturn') {
    const top = layers.find(layer => layer.name === 'Ammonia ice')!
    const zoneOf = kind === 'jupiter' ? JUPITER_ZONE : SATURN_ZONE
    if (kind === 'saturn') {
      // Saturn: a haze above the clouds makes the colours soft.
      const haze = layers[0]
      shells.push(bandShell(world, kind, sun, cloud * haze.part, haze.colour, haze.under, { cover: 0.42, soft: 0.85, stretch: 20 }))
    } else storm = dirOnMap(RED_SPOT.latitude, RED_SPOT.longitude)
    shells.push(bandShell(world, kind, sun, cloud * top.part, top.colour, top.under))
    // The tufts keep out of the Great Red Spot.
    const clear = (sites: TuftSite[]) => storm ? sites.filter(site => site.dir.angleTo(storm!) > 0.26) : sites
    tufts.push(createTufts(world, clear(zoneTufts(world, kind, Math.round(950 * scale), cloud * top.part + 1, 31, lat => zoneOf(lat) > 0.1, [18, 6, 12])), { colour: top.colour, shade: top.under, lobes: 4 }, sun, 31))
    if (kind === 'jupiter') {
      // Deeper and browner: the ammonium hydrosulfide clouds show in the gaps over the belts.
      const deep = layers[1]
      tufts.push(createTufts(world, clear(zoneTufts(world, kind, Math.round(320 * scale), cloud * deep.part, 47, lat => zoneOf(lat) < -0.3, [24, 6, 14], 0.6)), { colour: deep.colour, shade: deep.under, lobes: 5 }, sun, 47))
      shells.push(stormShell(world, sun, storm!, cloud + 1.5, stormSize(RED_SPOT), 0.25, { core: 0xc4532f, arms: 0xdc8a5a, rim: 0xfaf3e6 }))
    }
  } else if (kind === 'uranus') {
    const top = layers[0]
    shells.push(bandShell(world, kind, sun, cloud, top.colour, top.under, { cover: 0.22, soft: 0.7, stretch: 14 }))
    tufts.push(createTufts(world, zoneTufts(world, kind, Math.round(120 * scale), cloud + 4, 53, lat => Math.abs(lat) > 20 && Math.abs(lat) < 60, [16, 3, 6]), { colour: 0xffffff, shade: 0xbfe6ea, lobes: 4 }, sun, 53))
  } else {
    const high = layers[0], deck = layers[1]
    shells.push(bandShell(world, kind, sun, cloud * deck.part, deck.colour, deck.under, { cover: 0.55, soft: 0.5, stretch: 26 }))
    const streaks = zoneTufts(world, kind, Math.round(420 * scale), cloud * high.part, 61, lat => Math.abs(lat) > 12 && Math.abs(lat) < 55, [60, 2.2, 5], 0.2)
    tufts.push(createTufts(world, streaks, { colour: high.colour, shade: high.under, lobes: 5 }, sun, 61))
    tufts.push(createTufts(world, shadowsOf(world, streaks, sun, cloud * deck.part + 0.6), { colour: 0x3c6390, shade: 0x3c6390, opacity: 0.42, lobes: 5 }, sun, 61))
    storm = dirOnMap(DARK_SPOT.latitude, DARK_SPOT.longitude)
    shells.push(stormShell(world, sun, storm, cloud * deck.part + 1, stormSize(DARK_SPOT), -0.3, { core: 0x2f4f86, arms: 0x4a71a8, rim: 0x9cc3e6 }))
    // The bright companion: high white clouds at the south edge of the dark spot, where the paint has its white cloud.
    const random = seededRandom(71)
    const companion = dirOnMap(-27.5, 196)
    const { north, east } = frameAt(companion)
    const sites = Array.from({ length: 9 }, () => ({
      dir: companion.clone().addScaledVector(north, (random() - 0.5) * 0.03).addScaledVector(east, (random() - 0.5) * 0.25).normalize(),
      height: cloud * 1.15 + random() * 4, size: new THREE.Vector3(18 + random() * 10, 5, 9), turn: 0, tint: new THREE.Color(1, 1, 1),
    }))
    tufts.push(createTufts(world, sites, { colour: 0xffffff, shade: 0xd4e2ff, lobes: 5 }, sun, 71))
  }
  shells.forEach((shell, i) => parts.push(timed(`${kind}-shell-${i}`, shell)))
  tufts.forEach((item, i) => parts.push(timed(`${kind}-tufts-${i}`, item)))
  const inside: THREE.Object3D[] = [...shells.map(shell => shell.mesh), ...tufts.map(item => item.mesh)]
  if (kind === 'jupiter' || kind === 'saturn') {
    // Jupiter: the South Equatorial Belt, where Juno saw lightning. Saturn: "storm alley" at 35° N.
    const centres = kind === 'jupiter' ? towerCentres(world, -12, 3) : towerCentres(world, 37, 2)
    const towers = stormTowers(world, kind, sun, centres, kind === 'jupiter' ? 0xfbf6ee : 0xfffbf0, { tufts, shells })
    parts.push(towers)
    inside.push(towers.mesh, ...towers.glows)
  }
  return skyOf(world, parts, inside)
}

/** The local place of the turning storm of a giant, or null: for the browser checks and the notes. */
export function giantStorm(kind: Giant) {
  return kind === 'jupiter' ? dirOnMap(RED_SPOT.latitude, RED_SPOT.longitude) : kind === 'neptune' ? dirOnMap(DARK_SPOT.latitude, DARK_SPOT.longitude) : null
}
