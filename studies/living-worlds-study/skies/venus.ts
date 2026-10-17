import * as THREE from 'three'
import { seededRandom } from '../../../src/terrain'
import type { World } from '../../../src/worlds'
import { JETS, LAYERS, jetGlsl, turnRate, WIND_SCALE } from './data'
import { createShell } from './shell'
import { hidePuffs, latOf, parts, placesNear } from './common'
import type { SkyPart } from './common'
import { NOISE, TURN } from './glsl'

/**
 * The sky of Venus in the study. Today: the closed deck of the planet look study, with puffs under it.
 * Option A: no puffs. The deck stays; under it a layer of streaks that goes around the planet fast
 * (the super-rotation: about 4 days, while the ground turns in 243 days), with the dark "Y" and
 * chevrons of the ultraviolet pictures, and a thin orange haze lower down. Option B adds the rain
 * of sulfuric acid that falls from the deck and goes back to gas before it gets to the ground
 * (virga), and faint flashes in the deck: the lightning of Venus is not certain.
 */
const f = (value: number) => value.toFixed(4)

export function venusSky(world: World, sun: THREE.Vector3, option: 'A' | 'B', near: THREE.Vector3): SkyPart {
  const cloud = world.cloudHeight
  const [, deck, low] = LAYERS.venus
  const streakHeight = cloud * 1.27, radius = world.radius + streakHeight
  const flow = /* glsl */`
    ${jetGlsl(JETS.venus)}
    vec3 lwFlow(vec3 d, float time) {
      float lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
      // The super-rotation goes to the west, as the slow spin of Venus.
      return lwTurn(d, lwJet(lat) * ${f(WIND_SCALE)} / (${f(radius)} * max(0.15, cos(radians(lat)))) * time);
    }`
  const streaks = createShell(world, sun, {
    height: streakHeight, order: 2, night: 0.3,
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
    height: cloud * low.part, order: 1, night: 0.3,
    body: /* glsl */`
      ${flow}
      vec4 lwLayer(vec3 d, float time, float above) {
        vec3 q = lwFlow(d, time * 0.25);
        float n = lwFbm(vec3(q.x * 8.0, q.y * 16.0, q.z * 8.0));
        return vec4(mix(vec3(0.85, 0.6, 0.33), vec3(0.95, 0.75, 0.45), n), 0.18 + n * 0.22);
      }`,
  })
  const list: SkyPart[] = [hidePuffs(world),
    { update: (time, camera) => streaks.update(time, camera), dispose: () => streaks.dispose() },
    { update: (time, camera) => haze.update(time, camera), dispose: () => haze.dispose() }]
  if (option === 'B') list.push(virga(world, near, cloud * 1.15, cloud * 0.45, sun), flashes(streaks.uniforms.flash.value as THREE.Vector4, near))
  void deck
  const sky = parts(list)
  return {
    calls: sky.calls,
    update(time, camera) {
      const inside = camera.distanceTo(world.group.position) - world.radius < world.atmosphere * 1.2
      streaks.mesh.visible = haze.mesh.visible = inside
      sky.update(time, camera)
    },
    dispose: sky.dispose,
  }
}

/**
 * Virga: soft curtains of acid rain that hang under the deck and fade before the lower haze. Each
 * curtain is a quad that faces the camera about its own vertical axis, and moves with the deck.
 */
function virga(world: World, near: THREE.Vector3, top: number, bottom: number, sun: THREE.Vector3): SkyPart {
  const random = seededRandom(91)
  const dirs = placesNear(near, 70, world.radius, 44, 91)
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
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, top: { value: world.radius + top }, bottom: { value: world.radius + bottom }, centre: { value: new THREE.Vector3() } }])
  uniforms.sunPosition = { value: sun }
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
  world.clouds.add(mesh)
  return {
    calls: 1,
    update(time) { uniforms.time.value = time; uniforms.centre.value.copy(world.group.position) },
    dispose() { world.clouds.remove(mesh); geometry.dispose(); material.dispose() },
  }
}

/** Faint flashes in the deck near `near`, a few each minute. The lightning of Venus is not certain. */
function flashes(flash: THREE.Vector4, near: THREE.Vector3): SkyPart {
  const random = seededRandom(97)
  const list = Array.from({ length: 30 }, (_, i) => ({ at: 1.5 + i * 2.6 + random() * 1.2, dir: placesNear(near, 120, 210, 1, 97 + i)[0] }))
  return {
    calls: 0,
    update(time) {
      const now = list.find(item => time >= item.at && time < item.at + 0.3)
      if (now) flash.set(now.dir.x, now.dir.y, now.dir.z, 0.55 * (1 - (time - now.at) / 0.3))
      else flash.w = 0
    },
    dispose() {},
  }
}
