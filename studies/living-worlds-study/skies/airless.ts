import * as THREE from 'three'
import { seededRandom } from '../../../src/terrain'
import { surfaceRadius } from '../../../src/worlds'
import type { World } from '../../../src/worlds'
import { placesNear } from './common'
import type { SkyPart } from './common'

/**
 * Impact flashes on an airless world (the Moon, Mercury): a small stone from space hits the night
 * side and makes a short spark of light. Telescopes on Earth see them on the Moon. The airless
 * worlds keep their black sky and get no clouds.
 */
/**
 * `ahead` gives a local direction on the ground where the next spark lands: in the clips, a place
 * 12 to 30 m in front of the fairy, so the spark is on her side of the near horizon of a small world.
 */
export function impactFlashes(world: World, near: THREE.Vector3, softDisc: (color?: string) => THREE.Texture, every = 1.1, ahead?: () => THREE.Vector3): SkyPart {
  const random = seededRandom(151)
  const count = 40
  const hits = placesNear(near, 140, world.radius, count, 151).map((dir, i) => ({ dir, at: 1.5 + i * every + random() * every * 0.6, size: 3.5 + random() * 3 }))
  const positions = new Float32Array(count * 3), sizes = new Float32Array(count)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: softDisc('rgba(255,250,235,1)') } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSize;
      varying float vSize;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 260.0 / -mvPosition.z;
        vSize = aSize;
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      varying float vSize;
      void main() {
        vec4 glow = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * glow.a, glow.a * min(vSize, 1.0));
      }`,
  })
  const mesh = new THREE.Points(geometry, material)
  mesh.frustumCulled = false
  world.surface.add(mesh)
  const normal = new THREE.Vector3()
  const place = (i: number, dir: THREE.Vector3) => {
    normal.copy(dir).applyQuaternion(world.group.quaternion)
    positions.set(dir.clone().multiplyScalar(surfaceRadius(world, normal) + 0.3).toArray(), i * 3)
    geometry.attributes.position.needsUpdate = true
  }
  hits.forEach((hit, i) => place(i, hit.dir))
  const placed = new Set<number>()
  return {
    calls: 1,
    update(time) {
      hits.forEach((hit, i) => {
        const age = time - hit.at
        if (ahead && age >= 0 && !placed.has(i)) { placed.add(i); place(i, ahead()) }
        if (age < 0) placed.delete(i)
        // A spark of a tenth of a second, and a glow that fades in half a second.
        sizes[i] = age < 0 || age > 0.6 ? 0 : hit.size * (age < 0.08 ? 1.6 : Math.exp(-(age - 0.08) * 7))
      })
      geometry.attributes.aSize.needsUpdate = true
    },
    dispose() { world.surface.remove(mesh); geometry.dispose(); material.uniforms.map.value.dispose(); material.dispose() },
  }
}
