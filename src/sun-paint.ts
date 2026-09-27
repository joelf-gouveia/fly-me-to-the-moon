import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { NOISE } from './planet-paint'
import {
  CORE, coolerRatio, GEOMETRY, GLARE, MU_FLOOR, GRANULE_LIFE, GRANULE_PART, LIMB_ALPHA, PROMINENCES, REAL, relativeRate, SHELL_RADII, SPOTS, STRANDS, SUN_SPIN,
} from './sun-look'

/*
 * The look of the Sun: option B, Living Sun, of the Sun study (docs/sun-study.md). The numbers are in
 * src/sun-look.ts. src/worlds.ts builds it; updateEnvironment() in src/main.ts updates it each frame.
 * The study also builds option A (living false) and option C (B with a brighter disc) from it.
 * All parts are children of the Sun group. The group does not turn: the shaders turn the surface.
 */

export type SunLookState = {
  /** Game seconds; 0 keeps the Sun still. */
  time: number
  /** 0 in space, 1 at the ground of a world with air. */
  air: number
  /** The sunlight colour through the air, against the sunlight colour in space. */
  tint: THREE.Color
  /** Option C: the disc is brighter for the bloom. */
  boost: number
}

export type SunLook = {
  root: THREE.Group
  /** The prominence group, so a view can follow a prominence. */
  prominences: THREE.Group | null
  update(state: SunLookState): void
  dispose(): void
}

const TAU = Math.PI * 2
const vec3 = (values: number[]) => `vec3(${values.map(value => value.toFixed(4)).join(', ')})`

/** Direction on the unit sphere of the Sun at a latitude and a longitude in degrees. Longitude 0 is +X, 90 is −Z. */
export function sunDirection(latitude: number, longitude: number, target = new THREE.Vector3()) {
  const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude)
  return target.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
}

/** The angle of the equator after `time` seconds. */
export const spinAngle = (time: number) => time * TAU / SUN_SPIN

// ---- The disc ------------------------------------------------------------------------------------

const DISC_VERTEX = /* glsl */`
varying vec3 vWorld;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`

/** A hash with no sine: Dave Hoskins, "Hash without Sine", MIT license. */
const HASH = /* glsl */`
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}`

/** Worley cells with points that move: F1 and F2. A phone searches 2 × 2 × 2 cells, a computer 3 × 3 × 3. */
const CELLS = /* glsl */`
vec3 cells(vec3 p, float t) {
  vec3 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
#ifdef PHONE
  vec3 s = step(0.5, f) - 1.0;
  for (int z = 0; z <= 1; z++) for (int y = 0; y <= 1; y++) for (int x = 0; x <= 1; x++) {
    vec3 g = s + vec3(float(x), float(y), float(z));
#else
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
#endif
    vec3 h = hash33(i + g);
    vec3 r = g + 0.5 + 0.36 * sin(t + ${TAU.toFixed(5)} * h) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = h.x; } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(vec2(d1, d2)), id);
}`

function discMaterial(living: boolean, phone: boolean) {
  const umbra = coolerRatio(REAL.umbra), penumbra = coolerRatio(REAL.penumbra)
  return new THREE.ShaderMaterial({
    // In the transparent pass after the air shells (renderOrder −2), so the Sun shows through the sky of a world.
    transparent: true, depthWrite: true, fog: false, blending: THREE.NoBlending,
    defines: { ...(living ? { LIVING: '' } : {}), ...(phone ? { PHONE: '' } : {}), SPOTS: SPOTS.length },
    uniforms: {
      centre: { value: new THREE.Vector3() }, core: { value: new THREE.Vector3(...CORE) },
      tint: { value: new THREE.Color(1, 1, 1) }, spin: { value: 0 }, time: { value: 0 },
      spots: { value: SPOTS.map(() => new THREE.Vector4()) },
    },
    vertexShader: DISC_VERTEX,
    fragmentShader: /* glsl */`
      uniform vec3 centre; uniform vec3 core; uniform vec3 tint; uniform float spin; uniform float time;
      uniform vec4 spots[SPOTS];
      varying vec3 vWorld;
      ${living ? NOISE + HASH + CELLS : ''}
      void main() {
        vec3 n = normalize(vWorld - centre);
        float mu = clamp(dot(n, normalize(cameraPosition - vWorld)), 0.0, 1.0);
        // Limb darkening, I = mu^alpha per channel: Hestroffer and Magnan (1998). The last pixels of the
        // polygon edge have mu near 0; ${MU_FLOOR} keeps them at the brightness of the limb at r = 0.995.
        vec3 colour = core * pow(vec3(max(mu, ${MU_FLOOR})), ${vec3(LIMB_ALPHA)});
#ifdef LIVING
        // The surface in the frame of the turning Sun.
        float c = cos(spin), s = sin(spin);
        vec3 p = vec3(c * n.x - s * n.z, n.y, s * n.x + c * n.z);
        // Granules: bright cells, dark lanes. They fade where a cell is smaller than about two pixels.
        vec3 q = p * ${(1 / GRANULE_PART).toFixed(1)};
        float px = length(fwidth(q));
        float detail = 1.0 - smoothstep(0.45, 1.3, px);
        float t = time * ${(TAU / GRANULE_LIFE).toFixed(4)};
        // Soft, wide lanes; each cell has its own brightness, and its centre is brighter.
        vec3 f = cells(q, t);
        float granule = smoothstep(0.02, 0.45, f.y - f.x) * (0.75 + 0.35 * f.z) * (1.0 - 0.3 * f.x);
#ifndef PHONE
        vec3 g = cells(q * 2.3 + 11.0, t * 1.4);
        granule = mix(granule, granule * smoothstep(0.0, 0.35, g.y - g.x), 0.3 * (1.0 - smoothstep(0.15, 0.45, px)));
#endif
        // Mottling at two larger scales, so the disc has a texture from far away too.
        float mottle = snoise(p * 3.0 + vec3(0.0, 0.0, time * 0.004)) + 0.6 * snoise(p * 17.0 + vec3(time * 0.01)) * (1.0 - smoothstep(0.1, 0.3, px));
        colour *= mix(1.0, 0.62 + 0.52 * granule, detail * mix(0.6, 1.0, mu)) * (1.0 + 0.05 * mottle);
        // Sunspots: umbra and penumbra at their temperatures, with radial filaments. Faculae near the limb around them.
        float faculae = 0.0;
        for (int i = 0; i < SPOTS; i++) {
          vec3 d = spots[i].xyz;
          float angle = acos(clamp(dot(n, d), -1.0, 1.0)) / spots[i].w;
          vec3 radial = normalize(n - d * dot(n, d) + 0.00001);
          float filament = 0.5 + 0.5 * snoise(radial * 9.0 + d * 13.0);
          float penumbra = 1.0 - smoothstep(0.85, 1.05, angle);
          float umbra = 1.0 - smoothstep(0.36, 0.5, angle + 0.05 * filament);
          colour *= mix(vec3(1.0), ${vec3(penumbra)} * (0.8 + 0.4 * filament), penumbra);
          colour *= mix(vec3(1.0), ${vec3(umbra)} / ${vec3(penumbra)}, umbra);
          faculae += (1.0 - smoothstep(1.2, 3.2, angle)) * (1.0 - penumbra);
        }
        colour *= 1.0 + 0.9 * min(faculae, 1.0) * pow(1.0 - mu, 1.6) * (0.6 + 0.4 * snoise(p * 40.0));
#endif
        gl_FragColor = vec4(colour * tint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

// ---- Glare, corona and chromosphere ----------------------------------------------------------------

function shellMaterial(living: boolean, phone: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    defines: { ...(living ? { LIVING: '' } : {}), ...(phone ? { PHONE: '' } : {}) },
    uniforms: {
      centre: { value: new THREE.Vector3() }, radius: { value: 1 }, air: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) },
      spin: { value: 0 }, time: { value: 0 }, boost: { value: 1 },
    },
    vertexShader: DISC_VERTEX,
    fragmentShader: /* glsl */`
      uniform vec3 centre; uniform float radius; uniform float air; uniform vec3 tint; uniform float spin; uniform float time; uniform float boost;
      varying vec3 vWorld;
      ${living ? NOISE : ''}
      void main() {
        vec3 ray = normalize(vWorld - cameraPosition);
        vec3 toCentre = centre - cameraPosition;
        float distance = length(toCentre);
        float along = dot(toCentre, ray);
        // The nearest point of the ray to the Sun. A ray that points away starts at its nearest point: half the line of sight.
        vec3 nearest = cameraPosition + ray * max(along, 0.0) - centre;
        float b = max(length(nearest) / radius, 1.0);
        float sight = mix(0.5, 1.0, smoothstep(-0.25, 0.25, along / distance));
        float h = b - 1.0;
        float fade = 1.0 - smoothstep(${(SHELL_RADII * 0.68).toFixed(3)}, ${(SHELL_RADII * 0.98).toFixed(3)}, b);
        // Glare of the eye or the camera: from far away only. Close by, the disc fills the view.
        float far = smoothstep(1.15, 2.6, distance / radius);
        float glare = (${GLARE.halo.toFixed(2)} * exp(-h / 0.045) + ${GLARE.wide.toFixed(2)} * pow(b, -2.6)) * fade * far;
        // Option C: the bloom of the frame is the glare, so the shell adds none.
        vec3 colour = vec3(1.0, 0.74, 0.42) * glare * tint * (boost > 1.0 ? 0.0 : 1.0);
#ifdef LIVING
        // The corona: streamers near the equator and thin plumes at the poles. The blue sky of a world hides it.
        vec3 d = normalize(nearest);
        float c = cos(spin * 0.5), s = sin(spin * 0.5);
        vec3 p = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
        float equator = 1.0 - abs(p.y);
        // The pattern depends on the direction only, so each streamer is a ray out from the Sun.
        float streamers = smoothstep(-0.15, 0.85, snoise(vec3(p.x * 3.0, p.y * 7.0, p.z * 3.0) + vec3(0.0, time * 0.002, 0.0))) * equator * equator;
        float fine = 0.82 + 0.18 * snoise(vec3(p.x * 14.0, p.y * 30.0, p.z * 14.0));
        float plumes = pow(abs(p.y), 4.0) * smoothstep(0.1, 0.9, snoise(vec3(p.x * 18.0, p.y * 2.0, p.z * 18.0)));
        float corona = (0.42 * pow(b, -5.0) + (0.12 * streamers + 0.06 * plumes) * pow(b, -2.6) + 0.01 * pow(b, -2.0)) * fine * fade;
        // Inside the corona, most of it is behind the camera: keep it faint, so space stays dark.
        corona *= mix(0.35, 1.0, smoothstep(1.3, 3.0, distance / radius));
        colour += vec3(1.0, 0.8, 0.56) * corona * sight * (1.0 - air);
        // Close to the surface, the corona is the sky: a warm gold that is brightest at the horizon.
        float near = 1.0 - smoothstep(1.02, 1.2, distance / radius);
        colour += vec3(1.0, 0.45, 0.16) * near * 0.3 * (0.08 + 0.92 * exp(-h / 0.015)) * (1.0 - air);
        // The chromosphere: a thin red rim at the limb, with spicules.
        float rim = exp(-h / 0.006) * (0.7 + 0.3 * snoise(d * 40.0 + vec3(time * 0.2)));
        colour += vec3(1.0, 0.22, 0.28) * 1.4 * rim * (1.0 - air) * boost;
#endif
        gl_FragColor = vec4(colour, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

// ---- Prominences -----------------------------------------------------------------------------------

/** A loop above the surface from one foot to the other, in radii of the Sun. */
class LoopCurve extends THREE.Curve<THREE.Vector3> {
  from: THREE.Vector3; to: THREE.Vector3; height: number; side: THREE.Vector3; lean: number
  constructor(from: THREE.Vector3, to: THREE.Vector3, height: number, side: THREE.Vector3, lean: number) {
    super()
    this.from = from; this.to = to; this.height = height; this.side = side.clone(); this.lean = lean
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const angle = this.from.angleTo(this.to)
    const a = Math.sin((1 - t) * angle) / Math.sin(angle), b = Math.sin(t * angle) / Math.sin(angle)
    const arch = Math.sin(Math.PI * t)
    return target.copy(this.from).multiplyScalar(a).addScaledVector(this.to, b)
      .multiplyScalar(1 + this.height * arch ** 0.85).addScaledVector(this.side, this.lean * arch * arch)
  }
}

function prominenceGeometry(radius: number) {
  const parts: THREE.BufferGeometry[] = []
  const centre = new THREE.Vector3(), east = new THREE.Vector3(), north = new THREE.Vector3(), axis = new THREE.Vector3(), side = new THREE.Vector3()
  PROMINENCES.forEach((loop, index) => {
    sunDirection(loop.latitude, loop.longitude, centre)
    east.set(0, 1, 0).cross(centre).normalize()
    north.crossVectors(centre, east).normalize()
    const tilt = THREE.MathUtils.degToRad(loop.tilt)
    axis.copy(east).multiplyScalar(Math.cos(tilt)).addScaledVector(north, Math.sin(tilt))
    side.crossVectors(centre, axis).normalize()
    for (let strand = 0; strand < STRANDS; strand++) {
      const spread = (strand - (STRANDS - 1) / 2) * loop.width * 0.09
      const half = loop.width / 2 * (1 - Math.abs(spread) * 0.8)
      const from = centre.clone().multiplyScalar(Math.cos(half)).addScaledVector(axis, -Math.sin(half)).addScaledVector(side, spread).normalize()
      const to = centre.clone().multiplyScalar(Math.cos(half)).addScaledVector(axis, Math.sin(half)).addScaledVector(side, spread * 0.6).normalize()
      const curve = new LoopCurve(from, to, loop.height * (1 - strand * 0.1), side, loop.height * 0.18 * (strand % 2 ? -1 : 1))
      const geometry = new THREE.TubeGeometry(curve, GEOMETRY.tube[0], 0.0075 - strand * 0.0015, GEOMETRY.tube[1], false)
      geometry.scale(radius, radius, radius)
      geometry.setAttribute('loop', new THREE.Float32BufferAttribute(new Array(geometry.attributes.position.count).fill(index + strand * 0.37), 1))
      parts.push(geometry)
    }
  })
  return mergeGeometries(parts)!
}

function prominenceMaterial() {
  return new THREE.ShaderMaterial({
    // Normal blending: bright loops against space, dark red filaments against the disc, as in the pictures.
    transparent: true, depthWrite: false, fog: false, blending: THREE.NormalBlending,
    uniforms: { time: { value: 0 }, air: { value: 0 }, boost: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float loop;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying float vLoop;
      void main() {
        vUv = uv; vLoop = loop;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float time; uniform float air; uniform float boost;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying float vLoop;
      ${NOISE}
      void main() {
        // Soft tube edges, knots of plasma that flow along the loop, and feet that go into the surface.
        float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
        float flow = smoothstep(-0.3, 0.8, snoise(vec3(vUv.x * 14.0 - time * 0.22, vUv.y * 1.3, vLoop * 3.1)));
        float feet = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x);
        float glow = pow(facing, 1.2) * (0.4 + 0.9 * flow) * feet * (1.0 - air);
        gl_FragColor = vec4(vec3(1.35, 0.32, 0.12) * (0.6 + 0.6 * flow) * boost, clamp(glow, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

// ---- The look ----------------------------------------------------------------------------------

/** Option A (living false) or B (living true) around a Sun of `radius` at `centre`. */
export function createSunLook(radius: number, centre: THREE.Vector3, living: boolean, phone = false): SunLook {
  const root = new THREE.Group()
  root.name = living ? `sun-living${phone ? '-phone' : ''}` : 'sun-retune'
  const disc = discMaterial(living, phone)
  const discMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, ...GEOMETRY.disc), disc)
  discMesh.renderOrder = -1
  const shell = shellMaterial(living, phone)
  const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * SHELL_RADII, ...GEOMETRY.shell), shell)
  shellMesh.renderOrder = -1
  // The shell is large: never cull it while the camera is inside.
  shellMesh.frustumCulled = false
  root.add(discMesh, shellMesh)
  disc.uniforms.centre.value = centre
  shell.uniforms.centre.value = centre
  shell.uniforms.radius.value = radius

  let prominences: THREE.Group | null = null
  let loops: THREE.ShaderMaterial | null = null
  if (living) {
    prominences = new THREE.Group()
    prominences.name = 'prominences'
    loops = prominenceMaterial()
    const mesh = new THREE.Mesh(prominenceGeometry(radius), loops)
    mesh.renderOrder = -1
    prominences.add(mesh)
    root.add(prominences)
  }
  const direction = new THREE.Vector3()
  return {
    root, prominences,
    update({ time, air, tint, boost }) {
      const spin = spinAngle(time)
      disc.uniforms.spin.value = spin
      disc.uniforms.time.value = time
      ;(disc.uniforms.tint.value as THREE.Color).copy(tint).multiplyScalar(boost)
      shell.uniforms.spin.value = spin
      shell.uniforms.time.value = time
      shell.uniforms.air.value = air
      shell.uniforms.boost.value = boost
      ;(shell.uniforms.tint.value as THREE.Color).copy(tint)
      if (!living) return
      // Each sunspot turns at the rate of its latitude: the equator is faster than the poles.
      SPOTS.forEach((spot, i) => {
        sunDirection(spot.latitude, spot.longitude + THREE.MathUtils.radToDeg(spin) * relativeRate(spot.latitude), direction)
        ;(disc.uniforms.spots.value as THREE.Vector4[])[i].set(direction.x, direction.y, direction.z, spot.size)
      })
      prominences!.rotation.y = spin
      loops!.uniforms.time.value = time
      loops!.uniforms.air.value = air
      loops!.uniforms.boost.value = boost
    },
    dispose() {
      root.traverse(object => {
        if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose() }
      })
    },
  }
}
