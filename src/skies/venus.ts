import * as THREE from 'three'
import { seededRandom } from '../terrain'
import type { World } from '../worlds'
import { JETS, LAYERS, jetGlsl, turnRate, WIND_SCALE } from './data'
import { createShell } from './shell'
import { frameAt, glowTexture, latOf, skyOf, slotRandom, spherePlaces } from './common'
import type { Sky, SkyPart } from './common'
import { NOISE, TURN } from './glsl'

/**
 * The sky of Venus (option B of the living worlds study, docs/living-worlds-study.md). The closed
 * painted deck of the planet look study stays. Above it, dark streaks and chevrons go around the
 * planet with the super-rotation (about 4 days; the ground turns in 243 days). Under it, a thin orange
 * haze, curtains of acid rain that go back to gas before they get to the ground (virga), and faint
 * flashes in the deck near the fairy: scientists are not sure that Venus has lightning.
 */
const f = (value: number) => value.toFixed(4)

export function venusSky(world: World, sun: THREE.Vector3): Sky {
  const cloud = world.cloudHeight
  const low = LAYERS.venus[2]
  const streakHeight = cloud * 1.27, radius = world.radius + streakHeight
  const flow = /* glsl */`
    ${jetGlsl(JETS.venus)}
    vec3 lwFlow(vec3 d, float time) {
      float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
      return lwTurn(d, lwJet(lat) * ${f(WIND_SCALE)} / (${f(radius)} * max(0.15, cos(radians(lat)))) * time);
    }`
  const streaks = createShell(world, sun, {
    height: streakHeight, order: 2, night: 0.3, segments: world.mobile ? 64 : 96,
    body: /* glsl */`
      ${flow}
      vec4 lwLayer(vec3 d, float time, float above) {
        vec3 q = lwFlow(d, time);
        float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
        // A chevron: the pattern lags at high latitude, so the streaks make a "V" toward the equator.
        float lon = atan(q.z, q.x) + abs(lat) * 0.012;
        vec3 p = vec3(cos(lon) * 6.0, q.y * 30.0, sin(lon) * 6.0);
        float n = lwFbm(p + lwFbm(p * 0.6) * 1.6);
        float dark = smoothstep(0.5, 0.75, n);
        vec3 c = mix(vec3(1.0, 0.95, 0.8), vec3(0.6, 0.45, 0.26), dark);
        return vec4(c, 0.45 + dark * 0.5);
      }`,
  })
  const haze = createShell(world, sun, {
    height: cloud * low.part, order: 1, night: 0.3, segments: world.mobile ? 64 : 96,
    body: /* glsl */`
      ${flow}
      vec4 lwLayer(vec3 d, float time, float above) {
        vec3 q = lwFlow(d, time * 0.25);
        float n = lwFbm(vec3(q.x * 8.0, q.y * 16.0, q.z * 8.0));
        return vec4(mix(vec3(0.85, 0.6, 0.33), vec3(0.95, 0.75, 0.45), n), 0.18 + n * 0.22);
      }`,
  })
  const rain = virga(world, cloud * 1.15, cloud * 0.45, world.mobile ? 120 : 240)
  const flashes = deckFlashes(world, streaks.uniforms.flash.value as THREE.Vector4)
  const parts: SkyPart[] = [
    { name: 'venus-streaks', update: frame => streaks.update(frame.time, frame.camera.position), dispose: () => streaks.dispose() },
    { name: 'venus-haze', update: frame => haze.update(frame.time, frame.camera.position), dispose: () => haze.dispose() },
    rain, flashes,
  ]
  return skyOf(world, parts, [streaks.mesh, haze.mesh, rain.mesh, flashes.glow])
}

/**
 * Virga: soft curtains of acid rain that hang under the deck and fade before the lower haze. Each
 * curtain faces the camera about its own vertical axis and moves with the deck. One draw call.
 */
function virga(world: World, top: number, bottom: number, count: number): SkyPart & { mesh: THREE.Mesh } {
  const random = seededRandom(world.seed + 91)
  const dirs = spherePlaces(count, world.seed + 91, 0.9)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  const sites = new Float32Array(dirs.length * 4), shapes = new Float32Array(dirs.length * 2)
  dirs.forEach((dir, i) => {
    sites.set([dir.x, dir.y, dir.z, turnRate(JETS.venus, latOf(dir), world.radius + top)], i * 4)
    shapes.set([10 + random() * 12, random()], i * 2)
  })
  geometry.setAttribute('aSite', new THREE.InstancedBufferAttribute(sites, 4))
  geometry.setAttribute('aShape', new THREE.InstancedBufferAttribute(shapes, 2))
  geometry.instanceCount = dirs.length
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, top: { value: world.radius + top }, bottom: { value: world.radius + bottom } }])
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      ${TURN}
      attribute vec4 aSite; attribute vec2 aShape;
      uniform float time; uniform float top; uniform float bottom;
      varying vec2 vUv; varying float vSeed;
      #include <fog_pars_vertex>
      void main() {
        vec3 up = normalize(lwTurn(aSite.xyz, aSite.w * time));
        vec3 base = up * mix(bottom, top, position.y);
        // The curtain turns about its vertical axis to face the camera.
        vec3 camLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        vec3 toCam = camLocal - base; toCam -= up * dot(toCam, up);
        vec3 side = normalize(cross(up, normalize(toCam + vec3(1e-4))));
        vec3 local = base + side * position.x * aShape.x;
        vUv = vec2(position.x + 0.5, position.y); vSeed = aShape.y;
        vec4 mvPosition = modelViewMatrix * vec4(local, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      ${NOISE}
      uniform float time;
      varying vec2 vUv; varying float vSeed;
      #include <fog_pars_fragment>
      void main() {
        float lines = lwNoise(vec3(vUv.x * 9.0 + vSeed * 40.0, vUv.y * 2.0 + time * 0.6, vSeed * 7.0));
        float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
        // Strong under the deck, gone at the bottom: the drops go back to gas.
        float fade = smoothstep(0.0, 0.75, vUv.y);
        gl_FragColor = vec4(vec3(0.5, 0.38, 0.26), min(1.0, edge * fade * (0.6 + lines * 0.5)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.name = 'venus-virga'
  world.clouds.add(mesh)
  return {
    name: 'venus-virga', mesh,
    update(frame) { uniforms.time.value = frame.time },
    dispose() { world.clouds.remove(mesh); geometry.dispose(); material.dispose() },
  }
}

/**
 * Faint flashes in the deck, 20 to 80 m from the fairy, in about half of the slots of 4 s. Scientists
 * are not sure that Venus has lightning, so the flashes are soft and rare. None with reduced motion.
 */
function deckFlashes(world: World, flash: THREE.Vector4): SkyPart & { glow: THREE.Sprite } {
  const SLOT = 4, LENGTH = 0.3
  // A soft glow in the deck, seen from above and from below it.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2d6, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  glow.scale.setScalar(40)
  world.clouds.add(glow)
  const inverse = new THREE.Matrix4(), local = new THREE.Vector3()
  let slotDir: THREE.Vector3 | null = null, slotOf = -1, strength = 0
  return {
    name: 'venus-flashes', glow,
    flash: () => strength,
    update({ time, camera, still }) {
      const slot = Math.floor(time / SLOT)
      if (slot !== slotOf) {
        slotOf = slot
        // The place is chosen at the start of the slot, near the camera, and stays for the flash.
        inverse.copy(world.group.matrixWorld).invert()
        local.copy(camera.position).applyMatrix4(inverse).normalize()
        const { east, north } = frameAt(local)
        const angle = slotRandom(slot, world.seed) * Math.PI * 2, reach = (20 + slotRandom(slot, world.seed + 1) * 60) / world.radius
        slotDir = local.clone().addScaledVector(east, Math.cos(angle) * reach).addScaledVector(north, Math.sin(angle) * reach).normalize()
      }
      const at = slot * SLOT + 0.5 + slotRandom(slot, world.seed + 2) * 2.5
      const on = !still && slotRandom(slot, world.seed + 3) < 0.5 && time >= at && time < at + LENGTH
      strength = on ? 0.55 * (1 - (time - at) / LENGTH) : 0
      if (strength > 0 && slotDir) flash.set(slotDir.x, slotDir.y, slotDir.z, strength)
      else flash.w = 0
      if (slotDir) glow.position.copy(slotDir).multiplyScalar(world.radius + world.cloudHeight * 1.1)
      glow.material.opacity = strength * 0.9
    },
    dispose() { world.clouds.remove(glow); glow.material.map?.dispose(); glow.material.dispose() },
  }
}
