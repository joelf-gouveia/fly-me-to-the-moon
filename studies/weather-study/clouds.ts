import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { seededRandom } from '../../src/terrain'
import type { World } from '../../src/worlds'

/**
 * The new clouds of Earth for the weather study (docs/weather-study.md). They take the place of the
 * 1,050 puffs of buildClouds() in src/worlds.ts. Each cloud reads the weather map, so the kind of
 * cloud follows the weather:
 *
 * - Heap clouds: solid, low-poly clouds with a flat base. They are small in fair weather and tall
 *   and grey in the rain.
 * - High wisps: one thin layer above the heap clouds.
 * - Rain curtains: soft columns from a rain cloud to the ground, so rain shows from far away.
 *
 * The grey layer of a front (weather.ts) closes the sky between the heap clouds.
 */
const TAU = Math.PI * 2

/** The GLSL that reads the weather map. weather.ts has the same lines. */
const MAP = /* glsl */`
uniform sampler2D weatherMap; uniform float weatherOn;
vec2 weatherUv(vec3 d) { return vec2(atan(d.z, d.x) / 6.2831853 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5); }`
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

type MapUniforms = { weatherMap: THREE.IUniform<THREE.Texture>; weatherOn: THREE.IUniform<number> }

export function createClouds(world: World, map: MapUniforms, sunPosition: THREE.Vector3) {
  const group = new THREE.Group()
  group.name = 'weather-clouds'
  world.group.add(group)
  const uniforms = { ...map, cloudSun: { value: sunPosition }, cloudTime: { value: 0 } }
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
  const heapSites = sites(CLOUDS.heaps, world.seed + 4101)
  const heaps = Array.from({ length: CLOUDS.shapes }, (_, shape) => {
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
    return mesh
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
        float alpha = smoothstep(0.5, 0.82, streaks) * groups * 0.55 * weatherOn;
        vec3 colour = mix(vec3(0.05, 0.06, 0.1), vec3(1.0), vCloudLight.x) * mix(vec3(1.0), vec3(1.0, 0.72, 0.58), vCloudLight.y * 0.8);
        gl_FragColor = vec4(colour, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const wisps = new THREE.Mesh(new THREE.SphereGeometry(world.radius + world.cloudHeight + CLOUDS.wispLift, 96, 64), wispMaterial)
  wisps.name = 'weather-wisps'
  // After the stars, the air and the Sun, and before the grey layer.
  wisps.renderOrder = -0.6
  group.add(wisps)

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

  return {
    group, heaps, wisps, curtains,
    /** The triangles of the heap clouds. */
    triangles: heaps.reduce((sum, mesh) => sum + mesh.count * mesh.geometry.attributes.position.count / 3, 0),
    update(time: number, shown: boolean) {
      uniforms.cloudTime.value = time
      group.visible = shown
    },
  }
}
