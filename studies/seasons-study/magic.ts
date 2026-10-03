import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { World } from '../../src/worlds'
import { seededRandom } from '../../src/terrain'
import { foliageMaterial, foliageWind } from '../../src/foliage/build'
import { SPECIES, speciesGeometry } from '../../src/foliage/species'
import type { SpeciesId } from '../../src/foliage/species'
import { MAGIC, MAGIC_SPREAD, PATTERNS } from './model'
import type { Pattern } from './model'
import { createPose, glsl, INSTANCE_PLACE, markGround, patch } from './seasons'

/**
 * The prototype of the magic seasons of Blossom Haven. They are not the seasons of Earth: the
 * planet has no tilt, and the Sun does not make them. Each season has its own colour and its own
 * plants. The plants of a season grow from the ground when the season comes and go back into the
 * ground when it leaves. The candy of the four gardens of the game stays all year.
 *
 * All the plants of the four seasons are on the planet all the time, as instances. A shader gives
 * each plant the size of its season at its place, so a change of season is a change of uniforms.
 * Three of the seasons use plants of src/foliage/species.ts. The game does not use this file.
 */
const COMMON = /* glsl */`
uniform float seasonQ; uniform float seasonOn; uniform float seasonPattern; uniform float seasonGarden;
// How much later a place gets a season: magicOffset() of model.ts.
float magicOffset(vec3 d) {
  float halves = 0.5 * smoothstep(-0.12, 0.12, d.y);
  float rings = acos(clamp(-d.y, -1.0, 1.0)) / 3.14159265 * ${MAGIC_SPREAD.toFixed(2)};
  float patches = (0.5 + 0.5 * sin(d.x * 3.1 + sin(d.z * 2.3) * 1.7) * sin(d.y * 2.7 + d.x * 1.3)) * ${MAGIC_SPREAD.toFixed(2)};
  return seasonPattern < 0.5 ? halves : seasonPattern < 1.5 ? rings : seasonPattern < 2.5 ? patches : 0.0;
}
float magicPhase(vec3 d) { return fract(seasonQ - magicOffset(d)); }
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
// The clearing of the cottage at the south pole: the same edge as createTerrain() in src/terrain.ts.
float magicGardenAt(vec3 dir) { return seasonGarden * (dir.y < 0.0 ? 1.0 - smoothstep(0.11, 0.26, length(dir.xz)) : 0.0); }
`
const oneHot = (index: number) => `vec4(${[0, 1, 2, 3].map(i => i === index ? '1.0' : '0.0').join(', ')})`

/** A geometry with one colour, ready to merge with others. */
function painted(geometry: THREE.BufferGeometry, hex: number) {
  const plain = geometry.index ? geometry.toNonIndexed() : geometry
  const colour = new THREE.Color(hex), colours = new Float32Array(plain.attributes.position.count * 3)
  for (let i = 0; i < colours.length; i += 3) colours.set([colour.r, colour.g, colour.b], i)
  plain.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  plain.deleteAttribute('uv')
  return plain
}
/** The bubble bloom, the one plant that the foliage study does not have: a thin stem with two clear bubbles. */
function bubbleBloom() {
  return mergeGeometries([
    painted(new THREE.CylinderGeometry(0.06, 0.1, 1.9, 6).translate(0, 0.95, 0), 0x7fcdb6),
    painted(new THREE.SphereGeometry(0.8, 16, 12).translate(0, 2.4, 0), 0xd9fff6),
    painted(new THREE.SphereGeometry(0.42, 12, 9).translate(0.55, 1.45, 0.2), 0xc4f3ff),
  ])
}

/** The plants of each magic season: the kind, how many, and the size of an instance. */
type Planting = { kind: SpeciesId | 'bubble'; count: number; size: readonly number[] }
const PLANTINGS: Planting[][] = [
  [{ kind: 'blossomTree', count: 620, size: SPECIES.blossomTree.scale }, { kind: 'giantFlower', count: 520, size: SPECIES.giantFlower.scale }],
  [{ kind: 'bubble', count: 1100, size: [0.7, 1.6] }],
  // The toadstool of the game is small. In Lantern time it is as tall as the fairy and more.
  [{ kind: 'toadstool', count: 1000, size: [1.4, 4.2] }],
  [{ kind: 'crystal', count: 950, size: SPECIES.crystal.scale }],
]

export type MagicSeasons = ReturnType<typeof createMagicSeasons>

export function createMagicSeasons(world: World, sunPosition: THREE.Vector3) {
  const uniforms = { seasonQ: { value: 0 }, seasonOn: { value: 1 }, seasonPattern: { value: 1 }, seasonGarden: { value: 0 } }

  // ---- The ground. Blossom time keeps the colours of the four gardens of the game. Each other season
  // gives the grass 70% of its own colour, so the gardens still show.
  const ground = markGround(world, 5.5, false)
  patch(ground.material as THREE.Material, uniforms, COMMON, {
    key: 'magic-ground',
    vertexPars: 'attribute vec3 seasonInfo; varying vec3 vSeasonInfo;',
    vertex: 'vSeasonDir = normalize(position); vSeasonInfo = seasonInfo;',
    fragment: /* glsl */`{
      float q = magicPhase(vSeasonDir);
      vec3 shade = vec3(0.9 + vSeasonInfo.z * 0.2);
      vec3 season = magicRamp(q, diffuseColor.rgb, ${MAGIC.slice(1).map(item => `${glsl(item.ground)} * shade`).join(', ')});
      float other = (1.0 - magicAmount(q, ${oneHot(0)})) * (1.0 - magicGardenAt(vSeasonDir));
      diffuseColor.rgb = mix(diffuseColor.rgb, season, 0.7 * other * seasonOn * vSeasonInfo.x);
    }`,
  })

  // ---- The plants of the four seasons, on dry ground: the rule of the candy of the game.
  const random = seededRandom(world.seed + 4177)
  const normal = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dummy = new THREE.Object3D(), tint = new THREE.Color()
  // The toadstools glow by day too in the study. The game gives its plants a glow at night only.
  const glow = { wind: foliageWind, glow: { value: 1.1 } }
  const plants = PLANTINGS.flatMap((plantings, index) => plantings.map(({ kind, count, size }) => {
    const material = kind === 'bubble'
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.8 })
      : foliageMaterial(SPECIES[kind].gloss, glow)
    const palette = kind === 'bubble' ? [0xffffff, 0xd9f4ff, 0xe6ffe9, 0xffe9fb] : SPECIES[kind].palette
    const mesh = new THREE.InstancedMesh(kind === 'bubble' ? bubbleBloom() : speciesGeometry(kind), material, count)
    mesh.name = `magic-${MAGIC[index].id}-${kind}`
    mesh.frustumCulled = false
    let placed = 0
    for (let attempt = 0; attempt < count * 12 && placed < count; attempt++) {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2
      normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
      const sample = world.sample(normal.x, normal.y, normal.z)
      if (sample.height < 1 || sample.height > 6 || sample.river > 0.1 || (y < 0 && Math.hypot(normal.x, normal.z) < 0.09)) continue
      dummy.position.copy(normal).multiplyScalar(world.radius + sample.height - 0.05)
      dummy.quaternion.setFromUnitVectors(up, normal)
      dummy.rotateY(random() * Math.PI * 2)
      dummy.scale.setScalar(size[0] + random() * (size[1] - size[0]))
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)
      mesh.setColorAt(placed++, tint.setHex(palette[attempt % palette.length]))
    }
    mesh.count = placed
    patch(material, uniforms, COMMON, {
      key: `magic-plant-${index}-${kind}`,
      vertexPars: 'varying float vSeasonHash; varying float vSeasonGrow;',
      vertex: /* glsl */`${INSTANCE_PLACE}
        // The plant grows from the ground in its season. Each plant starts at its own time.
        float magicMine = mix(magicAmount(magicPhase(vSeasonDir), ${oneHot(index)}), ${index === 0 ? '1.0' : '0.0'}, magicGardenAt(vSeasonDir));
        vSeasonGrow = seasonOn * smoothstep(0.25 + vSeasonHash * 0.3, 0.6 + vSeasonHash * 0.35, magicMine);
        transformed *= vSeasonGrow;`,
      fragment: '',
      emissive: kind === 'bubble' ? 'totalEmissiveRadiance += diffuseColor.rgb * 0.12 * vSeasonGrow;' : undefined,
    })
    world.surface.add(mesh)
    return mesh
  }))

  return {
    world, uniforms, plants,
    /** Blossom Haven has no tilt, so `pose` gets a tilt of 0. */
    pose: createPose(world, sunPosition),
    /** The magic year: 0 is Blossom time at the cottage, 0.25 is the next season. */
    setLook(year: number) { uniforms.seasonQ.value = year },
    /** 0 is the game of today, 1 is the magic seasons. */
    setOn(value: number) { uniforms.seasonOn.value = value },
    setGarden(value: number) { uniforms.seasonGarden.value = value },
    setPattern(pattern: Pattern) { uniforms.seasonPattern.value = PATTERNS.findIndex(item => item.id === pattern) },
  }
}
