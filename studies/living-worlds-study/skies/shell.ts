import * as THREE from 'three'
import type { World } from '../../../src/worlds'
import { NOISE, TURN } from './glsl'

/**
 * A shell: one sphere around a world at a height, with a shader that draws a cloud layer on it,
 * as the cloud layers of the EVE mod of Kerbal Space Program. One draw call for a layer. The
 * body of the layer is GLSL: `vec4 lwLayer(vec3 d, float time, float above)` gives the colour and
 * the cover of the local direction `d`. `above` is 1 when the camera is above the shell.
 */
export type ShellOptions = {
  height: number
  /** GLSL with the function lwLayer() and the functions that it needs. */
  body: string
  /** The light of the night side, as a part of the day (0 for a dark night). */
  night?: number
  /** Draw the shell after the tufts (a higher number is later). */
  order?: number
  segments?: number
  /** More uniforms for the body, with their GLSL declarations in the body. */
  uniforms?: Record<string, THREE.IUniform>
}

const VERTEX = /* glsl */`
varying vec3 vDir; varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vDir = normalize(position);
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

export function createShell(world: World, sunPosition: THREE.Vector3, options: ShellOptions) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    time: { value: 0 }, centre: { value: new THREE.Vector3() }, above: { value: 1 }, night: { value: options.night ?? 0.22 },
    flash: { value: new THREE.Vector4(0, 1, 0, 0) },
  }])
  uniforms.sunPosition = { value: sunPosition }
  Object.assign(uniforms, options.uniforms ?? {})
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    fragmentShader: /* glsl */`
      uniform float time; uniform vec3 centre; uniform vec3 sunPosition; uniform float above; uniform float night; uniform vec4 flash;
      varying vec3 vDir; varying vec3 vWorld;
      ${NOISE}
      ${TURN}
      ${options.body}
      #include <fog_pars_fragment>
      void main() {
        vec3 d = normalize(vDir);
        vec4 layer = lwLayer(d, time, above);
        float day = smoothstep(-0.3, 0.2, dot(normalize(vWorld - centre), normalize(sunPosition - centre)));
        vec3 c = layer.rgb * mix(night, 1.0, day);
        // A flash of lightning under the layer: xyz is the local direction, w the strength.
        c += vec3(0.8, 0.82, 1.0) * flash.w * smoothstep(0.9975, 1.0, dot(d, flash.xyz)) * layer.a * 1.4;
        gl_FragColor = vec4(c, layer.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  })
  const segments = options.segments ?? 96
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(world.radius + options.height, segments, Math.round(segments * 0.6)), material)
  mesh.renderOrder = options.order ?? 1
  mesh.name = 'living-shell'
  world.clouds.add(mesh)
  return {
    mesh, uniforms,
    update(time: number, camera: THREE.Vector3) {
      uniforms.time.value = time
      uniforms.centre.value.copy(world.group.position)
      uniforms.above.value = camera.distanceTo(world.group.position) > world.radius + options.height ? 1 : 0
    },
    dispose() { world.clouds.remove(mesh); mesh.geometry.dispose(); material.dispose() },
  }
}
