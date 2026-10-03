import * as THREE from 'three'
import type { World } from '../worlds'
import type { CreatureObstacles } from '../creatures/spherical'
import { SPECIES, speciesGeometry } from './species'
import type { SpeciesId } from './species'
import { plan } from './planting'
import type { Batch, Site } from './planting'
import { createFields, zoneAt } from './zones'
import type { Fields, OptionId } from './zones'

/**
 * The plants of Earth and of Blossom Haven, from the foliage study (docs/foliage-study.md).
 * Earth has climate belts and Blossom Haven has four gardens. Each kind of plant is one
 * instanced mesh on `world.surface`, with the name `foliage-<kind>`.
 */
export const GAME_LOOK = { earth: 'E2', fairy: 'H2' } as const satisfies Record<Site['kind'], OptionId>

/** `wind`: x is the time in seconds, y is the strength. `glow`: the light of the glow parts at night. */
export type FoliageUniforms = { wind: THREE.IUniform<THREE.Vector2>; glow: THREE.IUniform<number> }

/** One wind for all the worlds. The loop of src/main.ts sets its time. */
export const foliageWind: THREE.IUniform<THREE.Vector2> = { value: new THREE.Vector2(0, 1) }

/**
 * The material of the plants: vertex colours, and three small changes to the shader.
 * The instance colour paints only the parts with aFoliage.x = 1. The wind moves each vertex by
 * aFoliage.z. The parts with aFoliage.y glow at night.
 */
export function foliageMaterial(gloss: boolean, uniforms: FoliageUniforms) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: gloss ? 0.42 : 1, side: THREE.DoubleSide })
  material.onBeforeCompile = shader => {
    shader.uniforms.uWind = uniforms.wind
    shader.uniforms.uGlow = uniforms.glow
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aFoliage;\nuniform vec2 uWind;\nvarying float vGlow;')
      .replace('#include <color_vertex>', `#include <color_vertex>
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb = mix( color.rgb, vColor.rgb, aFoliage.x );
        #endif
        vGlow = aFoliage.y;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float windPhase = dot( instanceMatrix[ 3 ].xyz, vec3( 0.37, 0.21, 0.29 ) );
          float bend = aFoliage.z * uWind.y;
          transformed.x += sin( uWind.x * 1.6 + windPhase ) * bend;
          transformed.z += cos( uWind.x * 1.1 + windPhase * 1.7 ) * bend * 0.6;
        #endif`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nvarying float vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow * uGlow;')
  }
  material.customProgramCacheKey = () => 'foliage'
  return material
}

export function siteOf(world: World): Site {
  return { kind: world.kind === 'fairy' ? 'fairy' : 'earth', radius: world.radius, seed: world.seed, sample: world.sample, mobile: world.mobile }
}

/** Adds one instanced mesh for each batch of a plan to `world.surface`. Returns the meshes. */
export function addFoliage(world: World, batches: Batch[], uniforms: FoliageUniforms) {
  const gloss = foliageMaterial(true, uniforms), matt = foliageMaterial(false, uniforms)
  return batches.map(batch => {
    const mesh = new THREE.InstancedMesh(speciesGeometry(batch.species), SPECIES[batch.species].gloss ? gloss : matt, batch.count)
    mesh.name = `foliage-${batch.species}`
    mesh.instanceMatrix.array.set(batch.matrices)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(batch.colours, 3)
    // The plants are all around the planet, so the mesh is always in view.
    mesh.frustumCulled = false
    world.surface.add(mesh)
    return mesh
  })
}

/** The space that a creature keeps free around a plant of size 1, in metres. A plant with no value is no obstacle. */
const FOOTPRINT: Partial<Record<SpeciesId, number>> = {
  pine: 1.3, snowPine: 1.3, oak: 1.5, birch: 1, palm: 1, acacia: 1.2, cactus: 0.8, bareTree: 1, bush: 0.9, rock: 1,
  lollipop: 2, ballPop: 1.4, cane: 2.5, cottonTree: 1.6, iceCream: 1.2, crystal: 1.2, toadstool: 0.5, gumdrops: 0.9, marshmallow: 0.8,
}

/** Plants a living world with the look of the game, and gives the creatures the footprint of each plant. */
export function buildFoliage(world: World, obstacles: CreatureObstacles) {
  const site = siteOf(world)
  const { batches } = plan(GAME_LOOK[site.kind], site)
  world.foliage ??= { wind: foliageWind, glow: { value: 0 } }
  addFoliage(world, batches, world.foliage)
  const matrix = new THREE.Matrix4(), normal = new THREE.Vector3()
  for (const batch of batches) {
    const footprint = FOOTPRINT[batch.species]
    if (!footprint) continue
    for (let i = 0; i < batch.count; i++) {
      matrix.fromArray(batch.matrices, i * 16)
      obstacles.add(normal.setFromMatrixPosition(matrix).normalize(), world.radius, footprint * matrix.getMaxScaleOnAxis())
    }
  }
}

const local = new THREE.Vector3(), turn = new THREE.Quaternion()
let fieldsOf: { seed: number; fields: Fields } | null = null
/** The name of the zone below a world position, for the flight panel. Null over water, sand, bare rock and snow. */
export function zoneNameAt(world: World, position: THREE.Vector3) {
  if (world.kind !== 'earth' && world.kind !== 'fairy') return null
  local.copy(position).sub(world.group.position).normalize().applyQuaternion(turn.copy(world.group.quaternion).invert())
  const sample = world.sample(local.x, local.y, local.z)
  if (sample.height < 0.7 || sample.height > (world.kind === 'fairy' ? 6 : 8.5)) return null
  if (fieldsOf?.seed !== world.seed) fieldsOf = { seed: world.seed, fields: createFields(world.seed) }
  return zoneAt(GAME_LOOK[world.kind], local.x, local.y, local.z, sample, fieldsOf.fields)?.name ?? null
}
