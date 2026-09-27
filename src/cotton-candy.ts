import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from 'simplex-noise'
import { seededRandom } from './terrain'
import type { World } from './worlds'

// Cotton candy clouds for Blossom Haven: option B of the cotton candy cloud study
// (docs/cotton-candy-cloud-study.md). Other worlds keep the clouds of buildClouds().

/** Cotton candy colors. Instance colors multiply a white material. */
export const CANDY_PALETTE = { pink: 0xff9fd0, blue: 0x94ccff, lilac: 0xcdb6ff, cream: 0xfff0f7 } as const
/** The mist color of the Blossom Haven cloud layer. Other worlds keep cloudWhite in src/main.ts. */
export const CANDY_MIST = 0xffd3ea
/**
 * The column above the cottage stays free of puffs, so the cottage and the flower
 * stay visible from above. 0.15 rad is 20 m at cloud height.
 */
export const CLEAR_ANGLE = 0.15
/** The widest puff of a tuft is at most 14 m from the tuft center. */
export const TUFT_REACH = 14
export const PUFFS_PER_TUFT = 6
/** Sphere segments of one puff (width, height). SphereGeometry makes 2·w·(h − 1) triangles. */
export const PUFF_SEGMENTS = { desktop: [18, 12], phone: [12, 8] } as const

/** Time of the floss material in seconds: the puffs breathe. src/main.ts sets it each frame. */
export const flossTime: THREE.IUniform<number> = { value: 0 }

export type CandyPuff = { position: THREE.Vector3; up: THREE.Vector3; scale: THREE.Vector3; spin: number; color: number }
export type CandyTuft = { normal: THREE.Vector3; at: (dx: number, dy: number, dz: number) => THREE.Vector3; size: number; puffs: CandyPuff[] }

const mixHex = (a: number, b: number, t: number) => {
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t)
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

/** A tangent basis at a unit normal. */
export function tangentBasis(normal: THREE.Vector3) {
  const east = new THREE.Vector3().crossVectors(Math.abs(normal.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), normal).normalize()
  return { east, north: new THREE.Vector3().crossVectors(normal, east) }
}

/** Tufts of six round puffs in planet-local coordinates, clear of the column above the cottage. */
export function candyTufts(radius: number, cloudHeight: number, tuftCount: number, seed: number, cottage: THREE.Vector3) {
  const random = seededRandom(seed + 1914), { pink, blue, lilac, cream } = CANDY_PALETTE
  const tufts: CandyTuft[] = []
  for (let t = 0; t < tuftCount; t++) {
    const normal = new THREE.Vector3()
    do {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2
      normal.set(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
    } while (normal.angleTo(cottage) < CLEAR_ANGLE + TUFT_REACH / (radius + cloudHeight))
    const altitude = cloudHeight + 1 + random() * 5, size = 0.8 + random() * 0.5
    const style = random(), base = style < 0.55 ? pink : style < 0.82 ? blue : -1
    const { east, north } = tangentBasis(normal)
    const centre = normal.clone().multiplyScalar(radius + altitude)
    const at = (dx: number, dy: number, dz: number) => centre.clone().addScaledVector(east, dx).addScaledVector(north, dz).addScaledVector(normal, dy)
    // One large center puff, four smaller puffs around it, and one on top.
    const offsets: [number, number, number, number][] = [[0, 0, 0, 6.2]]
    const turn = random() * Math.PI * 2
    for (let k = 0; k < 4; k++) {
      const angle = turn + k * Math.PI / 2 + (random() - 0.5) * 0.5
      offsets.push([Math.cos(angle) * 5.6, -1.1, Math.sin(angle) * 5.6, 4.2 * (0.85 + random() * 0.3)])
    }
    offsets.push([(random() - 0.5) * 2.4, 3.3, (random() - 0.5) * 2.4, 3.8])
    const puffs = offsets.map(([dx, dy, dz, puff], k) => {
      // A swirl tuft alternates pink and blue, with a lilac top.
      const color = base >= 0 ? base : k === 5 ? lilac : k % 2 ? blue : pink
      return {
        position: at(dx * size, dy * size, dz * size), up: normal.clone(),
        scale: new THREE.Vector3(puff * size, puff * size * 0.78, puff * size), spin: random() * Math.PI * 2,
        color: mixHex(color, cream, random() * 0.25),
      }
    })
    tufts.push({ normal, at, size, puffs })
  }
  return tufts
}

const FLOSS_COMMON = /* glsl */`
uniform float flossTime;
varying vec3 vFlossLocal;
varying float vFlossSeed;
float flossHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float flossNoise( vec3 x ) {
  vec3 i = floor( x ), f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( flossHash( i ), flossHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( flossHash( i + vec3( 0, 1, 0 ) ), flossHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
    mix( mix( flossHash( i + vec3( 0, 0, 1 ) ), flossHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( flossHash( i + vec3( 0, 1, 1 ) ), flossHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}`

/**
 * Spun sugar on a built-in lit material. The change goes in onBeforeCompile, as for
 * the water ripples, so createSunShading() can still patch the shader.
 */
export function flossMaterial(time = flossTime) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })
  material.onBeforeCompile = shader => {
    shader.uniforms.flossTime = time
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FLOSS_COMMON}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        // Normals bent toward the sky: the base of a puff gets sky light, not the ground color.
        objectNormal = normalize( objectNormal + vec3( 0.0, 0.8, 0.0 ) );`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFlossLocal = position;
        #ifdef USE_INSTANCING
          vFlossSeed = float( gl_InstanceID );
        #else
          vFlossSeed = 0.0;
        #endif
        // Each puff breathes a little, out of step with its neighbors.
        transformed *= 1.0 + sin( flossTime * 0.8 + vFlossSeed * 1.7 ) * 0.035;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FLOSS_COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Fine strands turn around the puff, as sugar does on the spinning head.
        vec3 flossPoint = vFlossLocal * 2.2 + vFlossSeed * 3.17;
        float swirl = atan( vFlossLocal.z, vFlossLocal.x ) * 16.0 + vFlossLocal.y * 11.0;
        float strands = sin( swirl + flossNoise( flossPoint ) * 3.0 );
        float fibre = smoothstep( 0.3, 1.0, strands ) * 0.5 + flossNoise( flossPoint * 9.0 ) * 0.5;
        float flossTop = smoothstep( -0.9, 0.95, vFlossLocal.y );
        diffuseColor.rgb *= mix( 0.8, 1.0, flossTop ) * ( 0.88 + fibre * 0.22 );
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), flossTop * 0.12 );`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // A bright, soft edge: light passes through the thin floss at the rim.
        float flossRim = pow( 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 ), 2.2 );
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0, 0.96, 0.99 ), flossRim * 0.4 );`)
  }
  material.customProgramCacheKey = () => 'cotton-floss'
  return material
}

/** A round, lumpy puff with a flatter base. Merged vertices keep the normals smooth. */
export function puffGeometry(mobile = false) {
  const [width, height] = PUFF_SEGMENTS[mobile ? 'phone' : 'desktop']
  const sphere = new THREE.SphereGeometry(1, width, height)
  sphere.deleteAttribute('uv'); sphere.deleteAttribute('normal')
  const geometry = mergeVertices(sphere)
  const noise = createNoise3D(seededRandom(4104)), position = geometry.attributes.position, v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    const bump = 1 + noise(v.x * 1.9, v.y * 1.9, v.z * 1.9) * 0.1 + noise(v.x * 4.5, v.y * 4.5, v.z * 4.5) * 0.04
    v.multiplyScalar(bump)
    if (v.y < -0.45) v.y = -0.45 + (v.y + 0.45) * 0.45
    position.setXYZ(i, v.x, v.y, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

/** One instanced mesh of cotton candy puffs, from a puff list in planet-local coordinates. */
export function candyPuffMesh(puffs: CandyPuff[], mobile = false, time = flossTime) {
  const mesh = new THREE.InstancedMesh(puffGeometry(mobile), flossMaterial(time), puffs.length)
  mesh.name = 'cotton-candy-clouds'
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), color = new THREE.Color()
  puffs.forEach((puff, i) => {
    dummy.position.copy(puff.position)
    dummy.quaternion.setFromUnitVectors(up, puff.up)
    dummy.rotateY(puff.spin)
    dummy.scale.copy(puff.scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    mesh.setColorAt(i, color.setHex(puff.color))
  })
  return mesh
}

/** Blossom Haven clouds: 300 puffs in 50 tufts, or half on a phone, as in buildClouds(). */
export function buildCottonCandyClouds(world: World, cottage: THREE.Vector3) {
  const tuftCount = Math.round(300 * (world.mobile ? 0.5 : 1)) / PUFFS_PER_TUFT
  const tufts = candyTufts(world.radius, world.cloudHeight, tuftCount, world.seed, cottage)
  world.clouds.add(candyPuffMesh(tufts.flatMap(tuft => tuft.puffs), world.mobile))
}
