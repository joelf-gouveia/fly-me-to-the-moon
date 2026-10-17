import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { seededRandom } from '../terrain'
import type { World } from '../worlds'
import { TURN } from './glsl'

/**
 * Tufts: the near clouds of a world, as one InstancedMesh. Each tuft is a few joined balls with a
 * flat base, as the heap clouds of Earth (src/weather-clouds.ts), so the worlds have one look. A
 * tuft turns about the axis of its world at the speed of the jet of its latitude, so the bands of a
 * giant move past each other. One draw call for all the tufts of a kind.
 */
export type TuftSite = {
  /** The local direction of the middle of the tuft. */
  dir: THREE.Vector3
  /** The height above the radius of the world. */
  height: number
  /** The size: width, height and depth in metres. */
  size: THREE.Vector3
  /** The turn in radians each second (the jet of its latitude). */
  turn: number
  /** A colour factor for each tuft. */
  tint: THREE.Color
  /** The angle of the long side from the east, in radians (0 for a streak along the band). */
  yaw?: number
}

/** A tuft: `lobes` balls on a line, the middle one the largest, with a flat base. Its size is about 1. */
export function tuftGeometry(seed: number, lobes = 4, detail = 1) {
  const random = seededRandom(seed), parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < lobes; i++) {
    const ball = new THREE.IcosahedronGeometry(1, detail)
    // Round normals: the normal of a point of a ball is its direction from the middle, so the tuft is soft, not faceted.
    ball.setAttribute('normal', ball.attributes.position.clone())
    const at = lobes === 1 ? 0 : (i / (lobes - 1) - 0.5) * 1.5
    const size = (1 - Math.abs(at) * 0.45) * (0.75 + random() * 0.3)
    ball.scale(size * 0.75, size * 0.7, size * 0.75)
    ball.translate(at + (random() - 0.5) * 0.2, (random() - 0.2) * 0.25, (random() - 0.5) * 0.45)
    parts.push(ball)
  }
  const geometry = mergeGeometries(parts)!
  const positions = geometry.attributes.position
  const normals = geometry.attributes.normal
  for (let i = 0; i < positions.count; i++) if (positions.getY(i) < 0) {
    positions.setY(i, positions.getY(i) * 0.25)
    // The flat base faces down.
    normals.setXYZ(i, normals.getX(i) * 0.4, -1, normals.getZ(i) * 0.4)
  }
  return geometry
}

export type TuftStyle = {
  colour: number
  /** The colour of the side away from the Sun. */
  shade: number
  /** The light of the tufts themselves, for a storm with lightning (0 for none). */
  glow?: number
  /** 1: opaque. Less: soft and see-through, for thin clouds. */
  opacity?: number
  lobes?: number
  /** The detail of each ball: 1 is 80 triangles, 2 is 320. */
  detail?: number
}

const VERTEX = /* glsl */`
${TURN}
attribute vec4 aTurn; attribute vec3 aTint;
uniform float time;
varying vec3 vNormalW; varying vec3 vWorld; varying vec3 vTint; varying float vBase;
#include <fog_pars_vertex>
void main() {
  vec4 local = instanceMatrix * vec4(position, 1.0);
  float angle = aTurn.x * time;
  local.xyz = lwTurn(local.xyz, angle);
  vec3 n = lwTurn(mat3(instanceMatrix) * normal, angle);
  vNormalW = normalize(mat3(modelMatrix) * n);
  vWorld = (modelMatrix * local).xyz;
  vTint = aTint;
  vBase = position.y;
  vec4 mvPosition = modelViewMatrix * local;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAGMENT = /* glsl */`
uniform vec3 sunPosition; uniform vec3 centre; uniform vec3 colour; uniform vec3 shade; uniform float opacity; uniform float glow;
uniform vec4 flash;
varying vec3 vNormalW; varying vec3 vWorld; varying vec3 vTint; varying float vBase;
#include <fog_pars_fragment>
void main() {
  vec3 toSun = normalize(sunPosition - vWorld);
  float day = smoothstep(-0.3, 0.2, dot(normalize(vWorld - centre), normalize(sunPosition - centre)));
  float lit = clamp(dot(normalize(vNormalW), toSun) * 0.6 + 0.45, 0.0, 1.0);
  float base = mix(0.78, 1.0, smoothstep(-0.05, 0.5, vBase));
  vec3 c = mix(shade, colour, lit) * vTint * base;
  c *= mix(0.22, 1.0, day);
  // A flash of lightning near the tuft: xyz is the place, w the strength.
  float near = flash.w * exp(-distance(vWorld, flash.xyz) / 9.0);
  c += vec3(0.75, 0.8, 1.0) * near * 1.6 + colour * glow * (1.0 - day);
  gl_FragColor = vec4(c, opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

export function createTufts(world: World, sites: TuftSite[], style: TuftStyle, sunPosition: THREE.Vector3, seed = 1) {
  const geometry = tuftGeometry(seed, style.lobes ?? 4, style.detail ?? 1)
  const opacity = style.opacity ?? 1
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    time: { value: 0 }, colour: { value: new THREE.Color(style.colour) }, shade: { value: new THREE.Color(style.shade) },
    opacity: { value: opacity }, glow: { value: style.glow ?? 0 }, flash: { value: new THREE.Vector4(0, 0, 0, 0) },
    centre: { value: new THREE.Vector3() },
  }])
  uniforms.sunPosition = { value: sunPosition }
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, fog: true,
    transparent: opacity < 1, depthWrite: opacity >= 1,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, sites.length)
  const turns = new Float32Array(sites.length * 4), tints = new Float32Array(sites.length * 3)
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), east = new THREE.Vector3()
  sites.forEach((site, i) => {
    const normal = site.dir.clone().normalize()
    dummy.position.copy(normal).multiplyScalar(world.radius + site.height)
    // The long side of a tuft goes along its band (to the east), and its base faces the world.
    east.crossVectors(up, normal)
    if (east.lengthSq() < 1e-6) east.set(1, 0, 0)
    east.normalize().applyAxisAngle(normal, site.yaw ?? 0)
    const basis = new THREE.Matrix4().makeBasis(east, normal, new THREE.Vector3().crossVectors(east, normal))
    dummy.quaternion.setFromRotationMatrix(basis)
    dummy.scale.copy(site.size)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    turns.set([site.turn, 0, 0, 0], i * 4)
    tints.set([site.tint.r, site.tint.g, site.tint.b], i * 3)
  })
  geometry.setAttribute('aTurn', new THREE.InstancedBufferAttribute(turns, 4))
  geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3))
  // The tufts move in the shader, so the bounds of the mesh do not hold them.
  mesh.frustumCulled = false
  mesh.name = 'living-tufts'
  world.clouds.add(mesh)
  return {
    mesh, material,
    update(time: number) {
      uniforms.time.value = time
      uniforms.centre.value.copy(world.group.position)
    },
    dispose() { world.clouds.remove(mesh); mesh.dispose(); geometry.dispose(); material.dispose() },
  }
}
