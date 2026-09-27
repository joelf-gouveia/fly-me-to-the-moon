import * as THREE from 'three'
import type { World } from './worlds'

export const MAX_SUN_OCCLUDERS = 12

const vertexTarget = '#include <project_vertex>'
const fragmentTarget = '#include <lights_fragment_begin>'
const pointTarget = 'getPointLightInfo( pointLight, geometryPosition, directLight );'
const litMaterials = new Set(['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial', 'MeshToonMaterial'])

type SunUniforms = {
  sunPosition: THREE.IUniform<THREE.Vector3>
  sunOccluders: THREE.IUniform<THREE.Vector4[]>
}

const vertexWorldPosition = /* glsl */`
vec4 sunShadowPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  sunShadowPosition = batchingMatrix * sunShadowPosition;
#endif
#ifdef USE_INSTANCING
  sunShadowPosition = instanceMatrix * sunShadowPosition;
#endif
vSunShadowPosition = ( modelMatrix * sunShadowPosition ).xyz;`

/*
 * Planets are spheres between a fragment and the Sun. Without shadow maps,
 * this keeps trees, creatures and the fairy on a night side out of sunlight.
 * A sphere with radius 0 is an unused slot.
 */
const fragmentPars = /* glsl */`
uniform vec3 sunPosition;
uniform vec4 sunOccluders[ ${MAX_SUN_OCCLUDERS} ];
varying vec3 vSunShadowPosition;
float sunShadow( vec3 point ) {
  vec3 toSun = normalize( sunPosition - point );
  float sunDistance = length( sunPosition - point );
  float visibility = 1.0;
  for ( int i = 0; i < ${MAX_SUN_OCCLUDERS}; i ++ ) {
    vec4 occluder = sunOccluders[ i ];
    if ( occluder.w <= 0.0 ) continue;
    vec3 toCenter = occluder.xyz - point;
    float range = length( toCenter );
    float along = dot( toCenter, toSun );
    // A world on the far side of the Sun casts no shadow (docs/planet-look-study.md, finding 5).
    if ( along > sunDistance ) continue;
    if ( range < occluder.w ) {
      // Below the reference sphere (a crater or a cloud deck): use the local horizon.
      visibility *= smoothstep( -0.06, 0.04, -along / range );
    } else {
      float closest = along > 0.0 ? sqrt( max( range * range - along * along, 0.0 ) ) : range;
      visibility *= smoothstep( occluder.w * 0.99, occluder.w, closest );
    }
  }
  return visibility;
}`

/** Injects the planet shadow into a lit built-in shader. Returns false when the shader has no lights. */
export function patchSunShader(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: SunUniforms) {
  const lights = THREE.ShaderChunk.lights_fragment_begin
  if (!shader.vertexShader.includes(vertexTarget) || !shader.fragmentShader.includes(fragmentTarget) || !lights.includes(pointTarget)) return false
  Object.assign(shader.uniforms, uniforms)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSunShadowPosition;')
    .replace(vertexTarget, `${vertexTarget}\n${vertexWorldPosition}`)
  // Only an unbounded point light (distance 0) is a sun; the fairy's glow stays local.
  const maskedLights = lights.replace(pointTarget, `${pointTarget}\n\t\tif ( pointLight.distance == 0.0 ) directLight.color *= sunVisibility;`)
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${fragmentPars}`)
    .replace(fragmentTarget, `float sunVisibility = sunShadow( vSunShadowPosition );\n${maskedLights}`)
  return true
}

/** Occluder radius: sea level for solid worlds, the visible cloud deck for gas worlds. */
export function occluderRadius(world: Pick<World, 'radius' | 'gas'>) {
  return world.gas ? world.radius - 12 : world.radius
}

export function createSunShading(sunPosition: THREE.Vector3) {
  const occluders = Array.from({ length: MAX_SUN_OCCLUDERS }, () => new THREE.Vector4())
  const uniforms: SunUniforms = { sunPosition: { value: sunPosition }, sunOccluders: { value: occluders } }
  const prepared = new WeakSet<THREE.Material>()

  function prepare(material: THREE.Material) {
    if (prepared.has(material)) return
    prepared.add(material)
    if (!litMaterials.has(material.type)) return
    // Keep any existing shader change (for example, water ripples) and its program key.
    const previous = material.onBeforeCompile
    const previousKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer)
      patchSunShader(shader, uniforms)
    }
    material.customProgramCacheKey = () => `${previousKey}|sun-shadow`
    material.needsUpdate = true
  }

  return {
    uniforms,
    /** Every planet except the Sun. Positions are read each frame, so orbits and relocation apply. */
    update(worlds: World[]) {
      let index = 0
      for (const world of worlds) {
        if (world.kind === 'sun' || index >= MAX_SUN_OCCLUDERS) continue
        occluders[index++].set(world.group.position.x, world.group.position.y, world.group.position.z, occluderRadius(world))
      }
      for (; index < MAX_SUN_OCCLUDERS; index++) occluders[index].set(0, 0, 0, 0)
    },
    /** Patch new lit materials, including lazily created wildlife and regenerated terrain. */
    track(root: THREE.Object3D) {
      root.traverse(object => {
        const material = (object as THREE.Mesh).isMesh ? (object as THREE.Mesh).material : undefined
        if (Array.isArray(material)) material.forEach(prepare)
        else if (material) prepare(material)
      })
    },
  }
}
