import * as THREE from 'three'
import { seededRandom } from '../../../src/terrain'
import type { World } from '../../../src/worlds'
import { JETS, LAYERS, jetGlsl, turnRate, WIND_SCALE } from './data'
import type { SkyKind } from './data'
import { createShell } from './shell'
import { createTufts } from './tufts'
import type { TuftSite } from './tufts'
import { frameAt, hidePuffs, latOf, parts, placesNear, spherePlaces, vortexGlsl } from './common'
import type { SkyPart } from './common'

/**
 * The skies of the four giants in the study. Option A: the real kind of cloud of each giant, in
 * its bands, and the bands move with the real jets. Option B adds the weather: a storm that turns
 * in place, storm towers with lightning, and on Neptune a dark spot with a bright companion and
 * high streaks with shadows on the deck below. The skies show only inside the air, as the puffs of today.
 */
export type Giant = 'jupiter' | 'saturn' | 'uranus' | 'neptune'
export type GiantPlan = {
  option: 'A' | 'B'
  /** B: the local direction of the storm that turns in place (the Great Red Spot, the Great Dark Spot). */
  storm?: THREE.Vector3
  /** B: the local direction of the storm towers with lightning. */
  towers?: THREE.Vector3
  mobile?: boolean
}

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
const ZONE_GLSL: Partial<Record<Giant, string>> = {
  jupiter: 'float lwZone(float lat) { return cos(6.2831853 * (abs(lat) < 6.0 ? lat : lat - sign(lat) * 2.0) / 18.0); }',
  saturn: 'float lwZone(float lat) { return cos(6.2831853 * lat / 16.0); }',
  uranus: 'float lwZone(float lat) { return 0.3 * cos(6.2831853 * lat / 40.0) - 0.2; }',
  neptune: 'float lwZone(float lat) { return -0.4 + 0.5 * smoothstep(15.0, 30.0, abs(lat)) * (1.0 - smoothstep(35.0, 50.0, abs(lat))); }',
}

/** A cloud layer with bands: white zones, gaps over the belts, and streaks along the band. */
function bandShell(world: World, kind: Giant, sun: THREE.Vector3, height: number, top: number, under: number, { cover = 0.93, stretch = 34, soft = 0 } = {}) {
  const radius = world.radius + height
  return createShell(world, sun, {
    height, order: 2,
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

/** Tufts on the white zones (or anywhere for `anywhere`), at the height of a layer. */
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

const JUPITER_ZONE = (lat: number) => Math.cos(2 * Math.PI * (Math.abs(lat) < 6 ? lat : lat - Math.sign(lat) * 2) / 18)

/**
 * The storm towers of option B: tall tufts that rise from a belt, with lightning in them. The water
 * clouds of Jupiter and Saturn are deep; the lightning lights the clouds from inside.
 */
function towers(world: World, kind: Giant, sun: THREE.Vector3, centre: THREE.Vector3, seed: number, colour: number, flashTargets: { flash: THREE.Vector4 }[], shells: { uniforms: Record<string, THREE.IUniform> }[]) {
  const random = seededRandom(seed)
  const base = world.cloudHeight * 0.4
  const dirs = placesNear(centre, 25, world.radius, 5, seed)
  const sites: TuftSite[] = dirs.map(dir => ({
    dir, height: base, size: new THREE.Vector3(16 + random() * 8, 34 + random() * 14, 16 + random() * 8),
    turn: turnRate(JETS[kind], latOf(dir), world.radius + base), tint: new THREE.Color(1, 1, 1),
  }))
  // A storm tower is white on top and dark under it, so a flash shows in the light of day.
  const tufts = createTufts(world, sites, { colour, shade: 0x5f5b73, lobes: 5, detail: 2 }, sun, seed)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xcfd8ff, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  glow.scale.setScalar(34)
  world.clouds.add(glow)
  // Each flash: a tower, a time and a length. Two quick pulses, as a real flash.
  const flashes = Array.from({ length: 60 }, (_, i) => ({ tower: Math.floor(random() * sites.length), at: i * 0.9 + random() * 0.7, length: 0.18 + random() * 0.12 }))
  const local = new THREE.Vector3(), place = new THREE.Vector3()
  return {
    calls: 1,
    update(time: number, camera: THREE.Vector3) {
      tufts.update(time)
      const now = flashes.find(item => time >= item.at && time < item.at + item.length)
      let strength = 0
      if (now) {
        const phase = (time - now.at) / now.length
        strength = phase < 0.35 ? 1 : phase < 0.55 ? 0.15 : 0.8 * (1 - (phase - 0.55) / 0.45)
        const site = sites[now.tower]
        local.copy(site.dir).multiplyScalar(world.radius + site.height + site.size.y * 0.35)
        const angle = site.turn * time
        local.set(Math.cos(angle) * local.x + Math.sin(angle) * local.z, local.y, -Math.sin(angle) * local.x + Math.cos(angle) * local.z)
        place.copy(local).applyMatrix4(world.group.matrixWorld)
        glow.position.copy(local)
        glow.material.opacity = strength * 0.85
        for (const target of [tufts.material.uniforms as unknown as { flash: THREE.IUniform<THREE.Vector4> }, ...flashTargets.map(item => ({ flash: { value: item.flash } }))]) target.flash.value.set(place.x, place.y, place.z, strength)
        const dir = local.clone().normalize()
        for (const shell of shells) (shell.uniforms.flash.value as THREE.Vector4).set(dir.x, dir.y, dir.z, strength)
      } else {
        glow.material.opacity = 0
        ;(tufts.material.uniforms.flash.value as THREE.Vector4).w = 0
        flashTargets.forEach(item => { item.flash.w = 0 })
        shells.forEach(shell => { (shell.uniforms.flash.value as THREE.Vector4).w = 0 })
      }
      void camera
    },
    dispose() { tufts.dispose(); world.clouds.remove(glow); glow.material.map?.dispose(); glow.material.dispose() },
  } satisfies SkyPart
}

/** A soft round glow for the light of a flash. */
function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

/** A storm that turns in place on its own shell: the Great Red Spot of Jupiter or the Great Dark Spot of Neptune. */
function stormShell(world: World, sun: THREE.Vector3, centre: THREE.Vector3, height: number, size: [number, number], spin: number, colours: { core: number; arms: number; rim: number }) {
  const frame = frameAt(centre)
  return createShell(world, sun, {
    height, order: 3, segments: 160,
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

/** The sky of a giant for an option of the study. */
export function giantSky(world: World, kind: Giant, sun: THREE.Vector3, plan: GiantPlan): SkyPart {
  const list: SkyPart[] = [hidePuffs(world)]
  const scale = plan.mobile ? 0.5 : 1
  const cloud = world.cloudHeight
  const layers = LAYERS[kind]
  const shells: ReturnType<typeof createShell>[] = []
  const tufts: ReturnType<typeof createTufts>[] = []
  // The tufts keep out of the storm that turns in place.
  const clear = (sites: TuftSite[]) => plan.option === 'B' && plan.storm ? sites.filter(site => site.dir.angleTo(plan.storm!) > 0.26) : sites
  const add = (part: { update(time: number, camera?: THREE.Vector3): void; dispose(): void }) => list.push({ update: (time, camera) => part.update(time, camera), dispose: () => part.dispose(), calls: 1 })

  if (kind === 'jupiter' || kind === 'saturn') {
    const top = layers.find(layer => layer.name === 'Ammonia ice')!
    const zoneOf = kind === 'jupiter' ? JUPITER_ZONE : (lat: number) => Math.cos(2 * Math.PI * lat / 16)
    if (kind === 'saturn') {
      // Saturn: a haze above the clouds makes the colours soft.
      const haze = layers[0]
      shells.push(bandShell(world, kind, sun, cloud * haze.part, haze.colour, haze.under, { cover: 0.42, soft: 0.85, stretch: 20 }))
    }
    shells.push(bandShell(world, kind, sun, cloud * top.part, top.colour, top.under))
    tufts.push(createTufts(world, clear(zoneTufts(world, kind, Math.round(950 * scale), cloud * top.part + 1, 31, lat => zoneOf(lat) > 0.1, [18, 6, 12])), { colour: top.colour, shade: top.under, lobes: 4 }, sun, 31))
    if (kind === 'jupiter') {
      // Deeper and browner: the ammonium hydrosulfide clouds show in the gaps over the belts.
      const deep = layers[1]
      tufts.push(createTufts(world, zoneTufts(world, kind, Math.round(320 * scale), cloud * deep.part, 47, lat => zoneOf(lat) < -0.3, [24, 6, 14], 0.6), { colour: deep.colour, shade: deep.under, lobes: 5 }, sun, 47))
    }
  } else if (kind === 'uranus') {
    // Uranus: a pale haze with almost no features, and a few bright methane clouds.
    const top = layers[0]
    shells.push(bandShell(world, kind, sun, cloud, top.colour, top.under, { cover: 0.22, soft: 0.7, stretch: 14 }))
    tufts.push(createTufts(world, zoneTufts(world, kind, Math.round(120 * scale), cloud + 4, 53, lat => Math.abs(lat) > 20 && Math.abs(lat) < 60, [16, 3, 6]), { colour: 0xffffff, shade: 0xbfe6ea, lobes: 4 }, sun, 53))
  } else {
    // Neptune: white methane streaks high above a blue deck, each with its shadow on the deck.
    const high = layers[0], deck = layers[1]
    shells.push(bandShell(world, kind, sun, cloud * deck.part, deck.colour, deck.under, { cover: 0.55, soft: 0.5, stretch: 26 }))
    const streaks = zoneTufts(world, kind, Math.round(420 * scale), cloud * high.part, 61, lat => Math.abs(lat) > 12 && Math.abs(lat) < 55, [60, 2.2, 5], 0.2)
    tufts.push(createTufts(world, streaks, { colour: high.colour, shade: high.under, lobes: 5 }, sun, 61))
    tufts.push(createTufts(world, shadowsOf(world, streaks, sun, cloud * deck.part + 0.6), { colour: 0x1f3577, shade: 0x1f3577, opacity: 0.42, lobes: 5 }, sun, 61))
  }

  if (plan.option === 'B' && plan.storm) {
    if (kind === 'jupiter') shells.push(stormShell(world, sun, plan.storm, cloud + 1.5, [0.244, 0.131], 0.25, { core: 0xc4532f, arms: 0xdc8a5a, rim: 0xfaf3e6 }))
    if (kind === 'neptune') {
      shells.push(stormShell(world, sun, plan.storm, cloud * 0.5 + 1, [0.227, 0.113], -0.3, { core: 0x1d2f7a, arms: 0x2c4596, rim: 0x5a7fd8 }))
      // The bright companion: high white clouds at the south edge of the dark spot, where the air goes up over it.
      const frame = frameAt(plan.storm)
      const random = seededRandom(71)
      const sites = Array.from({ length: 9 }, () => {
        const dir = plan.storm!.clone().addScaledVector(frame.north, -0.13 + (random() - 0.5) * 0.03).addScaledVector(frame.east, (random() - 0.5) * 0.25).normalize()
        return { dir, height: cloud * 1.15 + random() * 4, size: new THREE.Vector3(18 + random() * 10, 5, 9), turn: 0, tint: new THREE.Color(1, 1, 1) }
      })
      tufts.push(createTufts(world, sites, { colour: 0xffffff, shade: 0xd4e2ff, lobes: 5 }, sun, 71))
    }
  }
  shells.forEach(add)
  tufts.forEach(item => list.push({ update: time => item.update(time), dispose: () => item.dispose(), calls: 1 }))
  if (plan.option === 'B' && plan.towers && (kind === 'jupiter' || kind === 'saturn')) {
    list.push(towers(world, kind, sun, plan.towers, 83, kind === 'jupiter' ? 0xfbf6ee : 0xfffbf0, tufts.map(item => ({ flash: item.material.uniforms.flash.value as THREE.Vector4 })), shells))
  }

  const sky = parts(list)
  // The skies show only inside the air, as the puffs of today (puffsVisibleAt() in src/planet-look.ts).
  return {
    calls: sky.calls,
    update(time, camera) {
      const inside = camera.distanceTo(world.group.position) - world.radius < world.atmosphere * 1.2
      for (const item of [...shells.map(shell => shell.mesh), ...tufts.map(tuft => tuft.mesh)]) item.visible = inside
      sky.update(time, camera)
    },
    dispose: sky.dispose,
  }
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
