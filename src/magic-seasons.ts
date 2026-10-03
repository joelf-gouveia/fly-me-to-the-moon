import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { World } from './worlds'
import type { CreatureObstacles } from './creatures/spherical'
import { seededRandom } from './terrain'
import { foliageMaterial, foliageWind } from './foliage/build'
import { SPECIES, speciesGeometry } from './foliage/species'
import type { SpeciesId } from './foliage/species'

/**
 * The magic seasons of Blossom Haven, from the seasons study (docs/seasons-study.md).
 *
 * They are not the seasons of Earth: the planet has no tilt, and the Sun does not make them. Each
 * season has its own colour, its own thing in the air and its own plants. The plants of a season
 * grow from the ground when it comes and go back into the ground when it leaves. The candy of
 * the four gardens stays all year.
 *
 * A season starts at the cottage and goes out over the planet in a ring, so the planet shows two
 * or three seasons at one time. Each hop of the planet brings the next season (src/main.ts).
 *
 * All the plants of the four seasons are on the planet all the time, as instances. A shader gives
 * each plant the size of its season at its place, so a change of season is a change of one uniform.
 *
 * The magic year goes from 0 to 1: 0 is the middle of the first season at the cottage, 0.25 of the second.
 */
export type MagicId = 'blossom' | 'bubble' | 'lantern' | 'crystal'
/** What is in the air in a season (src/season-air.ts). */
export type MagicAir = 'petal' | 'bubble' | 'firefly' | 'glitter'
export type MagicSeason = { id: MagicId; name: string; plants: string; air: MagicAir; ground: number }
export const MAGIC_SEASONS: MagicSeason[] = [
  // Blossom time keeps the ground colours of the four gardens.
  { id: 'blossom', name: 'Blossom time', plants: 'Blossom trees and giant flowers', air: 'petal', ground: 0xf0a3c4 },
  { id: 'bubble', name: 'Bubble time', plants: 'Bubble blooms', air: 'bubble', ground: 0x9fe3cf },
  { id: 'lantern', name: 'Lantern time', plants: 'Giant toadstools that glow', air: 'firefly', ground: 0x9577d6 },
  { id: 'crystal', name: 'Crystal time', plants: 'Sugar crystals', air: 'glitter', ground: 0xe9e6fb },
]
/** The far side of the planet gets a season this part of a year after the cottage: three seasons later. */
export const MAGIC_SPREAD = 0.75
/** A hop of the planet adds this to the magic year. The look takes MAGIC_CHANGE_SECONDS to follow. */
export const MAGIC_STEP = 1 / MAGIC_SEASONS.length
export const MAGIC_CHANGE_SECONDS = 20

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const frac = (value: number) => value - Math.floor(value)

/** How much later a place gets a season, in parts of a magic year. `y` is the height of the local direction; the cottage is at -1. */
export function magicOffset(y: number) { return Math.acos(clamp(-y, -1, 1)) / Math.PI * MAGIC_SPREAD }
/** The magic season of a place: the season, and how full it is (1 in its middle, 0 at a change). */
export function magicAt(y: number, year: number) {
  const x = frac(year - magicOffset(y)) * MAGIC_SEASONS.length, index = Math.round(x) % MAGIC_SEASONS.length
  return { season: MAGIC_SEASONS[index], index, full: 1 - Math.abs(x - Math.round(x)) * 2 }
}
/** The magic year one frame later: it goes to `target` at a speed of one season in MAGIC_CHANGE_SECONDS. */
export function stepMagicYear(year: number, target: number, delta: number) {
  return Math.min(target, year + Math.max(0, delta) * MAGIC_STEP / MAGIC_CHANGE_SECONDS)
}

export type MagicUniforms = {
  magicYear: THREE.IUniform<number>
  magicOn: THREE.IUniform<number>
  /** The glow of the toadstools of Lantern time: soft by day, full at night. */
  glow: THREE.IUniform<number>
  /** The meshes of the season plants. They are not drawn while the seasons are off. */
  plants: THREE.InstancedMesh[]
}
/** `magicOn` 0 gives the look with no season: the ground of the gardens, and no season plant. */
export function createMagicUniforms(): MagicUniforms {
  return { magicYear: { value: 0 }, magicOn: { value: 0 }, glow: { value: 0.35 }, plants: [] }
}
export function setMagic(uniforms: MagicUniforms, year: number) {
  uniforms.magicYear.value = year
  uniforms.magicOn.value = 1
  for (const mesh of uniforms.plants) mesh.visible = true
}

const glsl = (hex: number) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})` }
const oneHot = (index: number) => `vec4(${MAGIC_SEASONS.map((_, i) => i === index ? '1.0' : '0.0').join(', ')})`
const COMMON = /* glsl */`
uniform float magicYear; uniform float magicOn;
varying vec3 vMagicDir;
// magicOffset(): the ring from the cottage at the south pole.
float magicPhase(vec3 d) { return fract(magicYear - acos(clamp(-d.y, -1.0, 1.0)) / 3.14159265 * ${MAGIC_SPREAD.toFixed(2)}); }
// A season keeps its full look for 60% of its time. The change takes the other 40%.
float magicBlend(float x) { return smoothstep(0.3, 0.7, fract(x)); }
vec3 magicRamp(float q, vec3 a, vec3 b, vec3 c, vec3 d) {
  float x = fract(q) * 4.0; float t = magicBlend(x);
  return x < 1.0 ? mix(a, b, t) : x < 2.0 ? mix(b, c, t) : x < 3.0 ? mix(c, d, t) : mix(d, a, t);
}
float magicAmount(float q, vec4 v) {
  float x = fract(q) * 4.0; float t = magicBlend(x);
  return x < 1.0 ? mix(v.x, v.y, t) : x < 2.0 ? mix(v.y, v.z, t) : x < 3.0 ? mix(v.z, v.w, t) : mix(v.w, v.x, t);
}
`
type Change = { key: string; pars?: string; vertex: string; fragment: string; emissive?: string }
/** Adds a season change to a built-in material. It keeps each shader change that the material has. */
function patch(material: THREE.Material, uniforms: MagicUniforms, change: Change) {
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey()
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    shader.uniforms.magicYear = uniforms.magicYear
    shader.uniforms.magicOn = uniforms.magicOn
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${COMMON}\n${change.pars ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${change.vertex}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}\n${change.pars?.replace(/attribute [^;]+;/g, '') ?? ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${change.fragment}`)
    if (change.emissive) shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${change.emissive}`)
  }
  material.customProgramCacheKey = () => `${previousKey}|magic-${change.key}`
  return material
}

/**
 * The ground. Blossom time keeps the colours of the four gardens. Each other season gives the
 * grass 70% of its own colour, so the gardens still show. The geometry needs the attribute
 * `seasonInfo` of buildGround() in src/worlds.ts: grass (1) or not (0), the height, the detail.
 */
export function magicGround(material: THREE.Material, uniforms: MagicUniforms) {
  return patch(material, uniforms, {
    key: 'ground',
    pars: 'attribute vec3 seasonInfo; varying vec3 vSeasonInfo;',
    vertex: 'vMagicDir = normalize(position); vSeasonInfo = seasonInfo;',
    fragment: /* glsl */`{
      float q = magicPhase(vMagicDir);
      vec3 shade = vec3(0.9 + vSeasonInfo.z * 0.2);
      vec3 season = magicRamp(q, diffuseColor.rgb, ${MAGIC_SEASONS.slice(1).map(item => `${glsl(item.ground)} * shade`).join(', ')});
      diffuseColor.rgb = mix(diffuseColor.rgb, season, 0.7 * (1.0 - magicAmount(q, ${oneHot(0)})) * magicOn * vSeasonInfo.x);
    }`,
  })
}

/** A geometry with one colour, ready to merge with others. */
function painted(geometry: THREE.BufferGeometry, hex: number) {
  const plain = geometry.index ? geometry.toNonIndexed() : geometry
  const colour = new THREE.Color(hex), colours = new Float32Array(plain.attributes.position.count * 3)
  for (let i = 0; i < colours.length; i += 3) colours.set([colour.r, colour.g, colour.b], i)
  plain.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  plain.deleteAttribute('uv')
  return plain
}
/** The bubble bloom of Bubble time: a thin stem with two clear bubbles. */
function bubbleBloom() {
  return mergeGeometries([
    painted(new THREE.CylinderGeometry(0.06, 0.1, 1.9, 6).translate(0, 0.95, 0), 0x7fcdb6),
    painted(new THREE.SphereGeometry(0.8, 10, 7).translate(0, 2.4, 0), 0xd9fff6),
    painted(new THREE.SphereGeometry(0.42, 8, 5).translate(0.55, 1.45, 0.2), 0xc4f3ff),
  ])
}

/** The plants of each season: the kind, how many, the size of an instance, and the space that a creature keeps free. */
type Planting = { kind: SpeciesId | 'bubble'; count: number; size: readonly number[]; footprint: number }
export const MAGIC_PLANTS: Planting[][] = [
  [{ kind: 'blossomTree', count: 620, size: SPECIES.blossomTree.scale, footprint: 1.5 }, { kind: 'giantFlower', count: 520, size: SPECIES.giantFlower.scale, footprint: 0.8 }],
  [{ kind: 'bubble', count: 1100, size: [0.7, 1.6], footprint: 0.8 }],
  // The toadstool of the gardens is small. In Lantern time it is as tall as the fairy and more.
  [{ kind: 'toadstool', count: 1000, size: [1.4, 4.2], footprint: 0.5 }],
  [{ kind: 'crystal', count: 950, size: SPECIES.crystal.scale, footprint: 1.2 }],
]
const BUBBLE_TINTS = [0xffffff, 0xd9f4ff, 0xe6ffe9, 0xffe9fb]

/**
 * Plants the season plants of Blossom Haven on dry ground, away from the cottage. A season plant
 * does not stand in a plant of the gardens (`obstacles`), in a different season plant, or on the
 * path of a creature (`paths`: the points of the routes, as directions). Each kind is one instanced
 * mesh with the name `magic-<season>-<kind>`. A phone gets half of the plants.
 */
export function buildMagicPlants(world: World, obstacles: CreatureObstacles, paths: THREE.Vector3[] = []) {
  const uniforms = world.magic!
  const random = seededRandom(world.seed + 4177)
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dummy = new THREE.Object3D(), tint = new THREE.Color()
  // The toadstools of Lantern time have their own glow: soft by day, full at night.
  const glow = { wind: foliageWind, glow: uniforms.glow }
  return MAGIC_PLANTS.flatMap((plantings, index) => plantings.map(({ kind, count, size, footprint }) => {
    const wanted = Math.round(count * (world.mobile ? 0.5 : 1))
    const material = kind === 'bubble'
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.8 })
      : foliageMaterial(SPECIES[kind].gloss, glow)
    const palette = kind === 'bubble' ? BUBBLE_TINTS : SPECIES[kind].palette
    const mesh = new THREE.InstancedMesh(kind === 'bubble' ? bubbleBloom() : speciesGeometry(kind), material, wanted)
    mesh.name = `magic-${MAGIC_SEASONS[index].id}-${kind}`
    // The plants are all around the planet, so the mesh is always in view.
    mesh.frustumCulled = false
    let placed = 0
    for (let attempt = 0; attempt < wanted * 60 && placed < wanted; attempt++) {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2
      normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
      const sample = world.sample(normal.x, normal.y, normal.z)
      if (sample.height < 1 || sample.height > 6 || sample.river > 0.1 || (y < 0 && Math.hypot(normal.x, normal.z) < 0.09)) continue
      const scale = size[0] + random() * (size[1] - size[0])
      if (!obstacles.clearSegment(normal, normal, world.radius, footprint * scale)) continue
      // A creature needs 2.5 m around each point of its route.
      const reach = (footprint * scale + 2.5) / world.radius
      if (paths.some(point => point.distanceToSquared(normal) < reach * reach)) continue
      obstacles.add(normal, world.radius, footprint * scale)
      dummy.position.copy(normal).multiplyScalar(world.radius + sample.height - 0.05)
      dummy.quaternion.setFromUnitVectors(up, normal)
      dummy.rotateY(random() * Math.PI * 2)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)
      mesh.setColorAt(placed++, tint.setHex(palette[attempt % palette.length]))
    }
    mesh.count = placed
    patch(material, uniforms, {
      key: `plant-${index}-${kind}`,
      pars: 'varying float vMagicGrow;',
      vertex: /* glsl */`
        #ifdef USE_INSTANCING
          vec3 magicPlace = instanceMatrix[3].xyz;
        #else
          vec3 magicPlace = position;
        #endif
        vMagicDir = normalize(magicPlace);
        // The plant grows from the ground in its season. Each plant starts at its own time.
        float magicHash = fract(sin(dot(floor(magicPlace * 8.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        vMagicGrow = magicOn * smoothstep(0.25 + magicHash * 0.3, 0.6 + magicHash * 0.35, magicAmount(magicPhase(vMagicDir), ${oneHot(index)}));
        transformed *= vMagicGrow;`,
      fragment: '',
      emissive: kind === 'bubble' ? 'totalEmissiveRadiance += diffuseColor.rgb * 0.12 * vMagicGrow;' : undefined,
    })
    // A world with the seasons off (a study page) does not draw the season plants.
    mesh.visible = uniforms.magicOn.value > 0
    uniforms.plants.push(mesh)
    world.surface.add(mesh)
    return mesh
  }))
}
