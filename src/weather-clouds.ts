import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { seededRandom } from './terrain'
import type { World } from './worlds'
import { WEATHER_GLSL } from './weather'
import type { WeatherUniforms } from './weather'

/**
 * The clouds of Earth, from the weather study (docs/weather-study.md). Each cloud reads the weather
 * map of src/weather.ts, so the kind of cloud follows the weather:
 *
 * - Heap clouds: solid, low-poly clouds with a flat base. They are small in fair weather and tall
 *   and grey in the rain.
 * - High wisps: one thin layer above the heap clouds.
 * - Rain curtains: soft columns from a rain cloud to the ground, so rain shows from far away.
 * - The grey layer: it closes the sky under a front, between the heap clouds.
 *
 * The other worlds keep the puffs of buildClouds() in src/worlds.ts.
 */
const TAU = Math.PI * 2

const MAP = WEATHER_GLSL
/** The light of a place from the height of the Sun there: x is the day, y is the low Sun of dawn and dusk. */
const LIGHT = /* glsl */`
vec2 cloudLight(vec3 site, vec3 sun) {
  float noon = dot(normalize(mat3(modelMatrix) * site), normalize(sun - modelMatrix[3].xyz));
  return vec2(smoothstep(-0.1, 0.25, noon), 1.0 - smoothstep(0.0, 0.32, abs(noon)));
}`
const NOISE = /* glsl */`
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`

export const CLOUDS = {
  /** The heap clouds of the planet, and the shapes that they share. */
  heaps: 450, shapes: 3,
  /** The lobes of one heap cloud. Each lobe is a ball of 80 triangles. */
  lobes: 6,
  /** The rain curtains of the planet. */
  curtains: 360,
  /** The high wisps are this far above the heap clouds, in metres. */
  wispLift: 24,
} as const

/** One heap cloud: a large ball with smaller balls around it, and a flat base. Its size is about 1. */
function heapGeometry(seed: number) {
  const random = seededRandom(seed), parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < CLOUDS.lobes; i++) {
    const lobe = new THREE.IcosahedronGeometry(1, 1)
    const size = i === 0 ? 1 : 0.45 + random() * 0.4, angle = random() * TAU, distance = i === 0 ? 0 : 0.6 + random() * 0.6
    lobe.scale(size * 1.15, size * 0.85, size)
    lobe.translate(Math.cos(angle) * distance, i === 0 ? 0.3 : random() * 0.25, Math.sin(angle) * distance)
    parts.push(lobe)
  }
  const geometry = mergeGeometries(parts)!
  const positions = geometry.attributes.position
  // The part below the base goes flat.
  for (let i = 0; i < positions.count; i++) if (positions.getY(i) < 0) positions.setY(i, positions.getY(i) * 0.16)
  geometry.computeVertexNormals()
  return geometry
}

/** Places on a sphere with an even distance between them, each with a small random shift. */
function sites(count: number, seed: number) {
  const random = seededRandom(seed), golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i + 0.5) / count * 2, ring = Math.sqrt(1 - y * y), angle = i * golden
    return new THREE.Vector3(Math.cos(angle) * ring + (random() - 0.5) * 0.14, y + (random() - 0.5) * 0.14, Math.sin(angle) * ring + (random() - 0.5) * 0.14).normalize()
  })
}

/** What the loop of src/main.ts sets on each frame: the clock of the clouds, the haze of the air and the glow of the thunder. */
export type WeatherSky = { time: THREE.IUniform<number>; haze: THREE.Color; flash: THREE.Vector4 }

const DECK_VERTEX = /* glsl */`
varying vec3 vDir; varying vec3 vWorld;
void main() {
  vDir = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  // The place on the screen comes from the model-view matrix, as for the heap clouds. Earth is far from the
  // middle of the scene, so a place in the scene has an error of some millimetres that changes on each frame.
  // With that error the line where a heap cloud goes through the layer flickers.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const DECK_FRAGMENT = /* glsl */`
${MAP}
uniform float time; uniform vec3 sunPosition; uniform vec3 centre; uniform vec3 haze; uniform vec4 flash;
varying vec3 vDir; varying vec3 vWorld;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main() {
  vec3 d = normalize(vDir);
  vec4 weather = texture2D(weatherMap, weatherUv(d));
  vec3 p = d * 22.0 + vec3(time * 0.03, 0.0, time * 0.02);
  float detail = noise(p) * 0.55 + noise(p * 2.1) * 0.3 + noise(p * 4.3) * 0.15;
  // Large lumps break the edge of a front. A thick cloud stays closed.
  float lumps = noise(d * 6.5 + vec3(0.0, time * 0.008, 0.0)) * 0.6 + noise(d * 13.0 - vec3(time * 0.012, 0.0, 0.0)) * 0.4;
  float cover = smoothstep(0.45, 0.82, weather.r + ((detail - 0.5) * 0.5 + (lumps - 0.5) * 0.7) * (1.0 - 0.55 * weather.r)) * weatherOn;
  float day = smoothstep(-0.1, 0.24, dot(normalize(vWorld - centre), normalize(sunPosition - centre)));
  vec3 colour; float alpha;
  if (gl_FrontFacing) {
    // From above and from space: white in the Sun, dark at night.
    colour = mix(vec3(0.035, 0.045, 0.08), vec3(0.97, 0.98, 1.0), day) * (0.84 + detail * 0.2);
    alpha = cover * 0.95;
  } else {
    // From below: a rain cloud is thick and grey. Far away it goes into the haze of the air.
    colour = mix(vec3(0.74, 0.78, 0.83), vec3(0.25, 0.28, 0.34), smoothstep(0.05, 0.75, weather.g + (weather.r - 0.75) * 0.8)) * (0.86 + detail * 0.22);
    colour *= mix(0.1, 1.0, day);
    colour = mix(colour, haze, (1.0 - exp(-length(vWorld - cameraPosition) * 0.0045)) * 0.62);
    alpha = cover * 0.93;
  }
  colour += vec3(0.62, 0.66, 0.95) * flash.w * smoothstep(0.984, 1.0, dot(d, flash.xyz)) * (0.25 + detail * detail * 1.6);
  gl_FragColor = vec4(colour, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`


/** Adds the clouds of Earth to `world.clouds`. A phone gets half the heap clouds and no high wisps. */
export function buildWeatherClouds(world: World, map: WeatherUniforms, sunPosition: THREE.Vector3): WeatherSky {
  const group = world.clouds
  const sky: WeatherSky = { time: { value: 0 }, haze: new THREE.Color(0xbfd0de), flash: new THREE.Vector4(0, 1, 0, 0) }
  const uniforms = { ...map, cloudSun: { value: sunPosition }, cloudTime: sky.time }
  const up = new THREE.Vector3(0, 1, 0), dummy = new THREE.Object3D()
  const random = seededRandom(world.seed + 4100)

  // ---- The heap clouds ------------------------------------------------------------------------------
  const heapMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true })
  heapMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${MAP}\n${LIGHT}\nuniform vec3 cloudSun;\nvarying vec4 vCloud; varying vec2 vCloudLight;`)
      // A cloud shows when the cover at its place is more than its own limit, so a sky fills cloud by cloud.
      .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
        vec3 cloudSite = normalize(instanceMatrix[3].xyz);
        vec4 cloudWeather = texture2D(weatherMap, weatherUv(cloudSite));
        float cloudOwn = fract(sin(dot(cloudSite, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float cloudGrow = smoothstep(0.05 + cloudOwn * 0.32, 0.34 + cloudOwn * 0.4, cloudWeather.r);
        vCloud = vec4(cloudWeather.r, cloudWeather.g, clamp(position.y / 0.9, 0.0, 1.0), cloudOwn);
        // A rain cloud is tall and wide.
        transformed.y *= 1.0 + cloudWeather.g * 1.1;
        transformed.xz *= 1.0 + cloudWeather.r * 0.3;
        transformed *= cloudGrow * weatherOn;
        vCloudLight = cloudLight(cloudSite, cloudSun);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vCloud; varying vec2 vCloudLight;')
      // White at the top. The base is light grey in fair weather and dark grey in the rain. Warm colours at a low Sun.
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        vec3 cloudBase = mix(vec3(0.72, 0.77, 0.85), vec3(0.4, 0.44, 0.52), smoothstep(0.1, 0.8, vCloud.y));
        diffuseColor.rgb = mix(cloudBase, vec3(1.0), smoothstep(0.05, 0.55 + vCloud.y * 0.5, vCloud.z));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.8, 0.6) * (0.7 + 0.3 * vCloud.z), vCloudLight.y * 0.65);`)
      // The light of the sky fills the shade of a cloud, so its base is not dark.
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * (0.4 * vCloudLight.x + 0.35 * vCloudLight.x * vCloudLight.y + 0.02);')
  }
  heapMaterial.customProgramCacheKey = () => 'weather-heap'
  const heapSites = sites(world.mobile ? CLOUDS.heaps / 2 : CLOUDS.heaps, world.seed + 4101)
  Array.from({ length: CLOUDS.shapes }, (_, shape) => {
    const mine = heapSites.filter((_, i) => i % CLOUDS.shapes === shape)
    const mesh = new THREE.InstancedMesh(heapGeometry(world.seed + 4200 + shape), heapMaterial, mine.length)
    mesh.name = 'weather-heaps'
    mine.forEach((site, i) => {
      dummy.position.copy(site).multiplyScalar(world.radius + world.cloudHeight + random() * 5)
      dummy.quaternion.setFromUnitVectors(up, site).multiply(new THREE.Quaternion().setFromAxisAngle(up, random() * TAU))
      const wide = 9 + random() * 6
      dummy.scale.set(wide, 6 + random() * 3.5, wide * (0.8 + random() * 0.4))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    // The clouds are all around the planet, and the shader gives them their size.
    mesh.frustumCulled = false
    group.add(mesh)
  })

  // ---- The high wisps -------------------------------------------------------------------------------
  const wispMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms,
    vertexShader: /* glsl */`
      ${LIGHT}
      uniform vec3 cloudSun;
      varying vec3 vDir; varying vec2 vCloudLight;
      void main() {
        vDir = normalize(position);
        vCloudLight = cloudLight(vDir, cloudSun);
        // The wisps are high, so they have the light of the Sun for a longer time.
        vCloudLight.x = smoothstep(0.0, 0.6, vCloudLight.x);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${MAP}
      ${NOISE}
      uniform float cloudTime;
      varying vec3 vDir; varying vec2 vCloudLight;
      void main() {
        vec3 d = normalize(vDir);
        // Long, thin streaks from the west to the east.
        vec3 p = vec3(d.x * 7.0 + cloudTime * 0.004, d.y * 44.0, d.z * 7.0);
        float streaks = noise(p) * 0.6 + noise(p * vec3(2.2, 2.0, 2.2) + 3.0) * 0.4;
        // Wisps come in groups, and not above a thick cloud.
        float groups = smoothstep(0.45, 0.72, noise(d * 3.4 + 5.0)) * (1.0 - smoothstep(0.6, 0.95, texture2D(weatherMap, weatherUv(d)).r));
        // The planet is small, so the Sun is low for a wisp that is not far away. A wisp in the dark goes clear, not black.
        float alpha = smoothstep(0.5, 0.82, streaks) * groups * 0.55 * weatherOn * (0.12 + 0.88 * vCloudLight.x);
        vec3 colour = mix(vec3(0.55, 0.6, 0.72), vec3(1.0), vCloudLight.x) * mix(vec3(1.0), vec3(1.0, 0.72, 0.58), vCloudLight.y * 0.8);
        gl_FragColor = vec4(colour, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const wisps = new THREE.Mesh(new THREE.SphereGeometry(world.radius + world.cloudHeight + CLOUDS.wispLift, 96, 64), wispMaterial)
  wisps.name = 'weather-wisps'
  // After the stars, the air and the Sun, and before the grey layer.
  wisps.renderOrder = -0.6
  if (!world.mobile) group.add(wisps)

  // ---- The rain curtains ----------------------------------------------------------------------------
  const curtainMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  curtainMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${MAP}\n${LIGHT}\nuniform vec3 cloudSun;\nvarying vec4 vCurtain; varying float vCurtainFace;`)
      .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
        vec3 curtainSite = normalize(instanceMatrix[3].xyz);
        vec4 curtainWeather = texture2D(weatherMap, weatherUv(curtainSite));
        float curtainRain = smoothstep(0.3, 0.75, curtainWeather.g) * weatherOn;
        transformed.xz *= curtainRain;
        vCurtain = vec4(position.y + 1.0, curtainRain, curtainWeather.b, cloudLight(curtainSite, cloudSun).x);
        // The side of the column goes clear, so the curtain has a soft edge.
        vec4 curtainView = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
        vCurtainFace = abs(dot(normalize(normalMatrix * mat3(instanceMatrix) * normal), normalize(curtainView.xyz)));`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vCurtain; varying float vCurtainFace;')
      // Grey for rain and white for snow. The curtain is thin near the ground, and it is clear near the eye.
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        diffuseColor.rgb = mix(vec3(0.34, 0.39, 0.48), vec3(0.9, 0.93, 0.96), vCurtain.z) * (0.03 + 0.97 * vCurtain.w);
        diffuseColor.a = vCurtain.y * 0.62 * (0.3 + 0.7 * vCurtain.x) * (1.0 - smoothstep(0.82, 1.0, vCurtain.x)) * smoothstep(0.05, 0.75, vCurtainFace) * (0.3 + 0.7 * vCurtain.w) * smoothstep(22.0, 70.0, gl_FragCoord.z / gl_FragCoord.w);`)
  }
  curtainMaterial.customProgramCacheKey = () => 'weather-curtain'
  const fall = world.cloudHeight + 3
  const curtainGeometry = new THREE.CylinderGeometry(1, 1.3, 1, 12, 1, true)
  curtainGeometry.translate(0, -0.5, 0)
  const curtains = new THREE.InstancedMesh(curtainGeometry, curtainMaterial, CLOUDS.curtains)
  curtains.name = 'weather-curtains'
  sites(CLOUDS.curtains, world.seed + 4300).forEach((site, i) => {
    dummy.position.copy(site).multiplyScalar(world.radius + fall)
    dummy.quaternion.setFromUnitVectors(up, site)
    const wide = 11 + random() * 6
    dummy.scale.set(wide, fall, wide)
    dummy.updateMatrix()
    curtains.setMatrixAt(i, dummy.matrix)
  })
  curtains.frustumCulled = false
  curtains.renderOrder = 1
  group.add(curtains)


  // ---- The grey layer -------------------------------------------------------------------------------
  const layer = new THREE.Mesh(new THREE.SphereGeometry(world.radius + world.cloudHeight + 4, 128, 80), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: DECK_VERTEX, fragmentShader: DECK_FRAGMENT,
    uniforms: { ...map, time: sky.time, sunPosition: { value: sunPosition }, centre: { value: world.group.position }, haze: { value: sky.haze }, flash: { value: sky.flash } },
  }))
  layer.name = 'weather-layer'
  // After the stars, the air and the Sun, and before the other clear things.
  layer.renderOrder = -0.5
  group.add(layer)
  return sky
}
