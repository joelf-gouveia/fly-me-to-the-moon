import * as THREE from 'three'
import { TODAY } from './model'
import { PIXIE, SHIMMER, TRAIL_DESIGNS, dust, emitCount, inherit, white } from '../../src/fairy-trail'
import type { Emit, Trail, TrailEnv as GameTrailEnv } from '../../src/fairy-trail'

/**
 * The trails of the study. `today` is a copy of the trail that the game had before the study.
 * The sparkles, the rules and the four trails of the menu of the game are in src/fairy-trail.ts.
 * The ribbons and the other options of the study are here.
 */
export type { Emit, Trail }
/** The study adds the soft disc of the trail of today. */
export type TrailEnv = GameTrailEnv & { disc: THREE.Texture }

// ---- The trail of the game of today -------------------------------------------------------------
function today(env: TrailEnv): Trail {
  const capacity = TODAY.bonusPoints
  const positions = new Float32Array(capacity * 3).fill(1e6), colours = new Float32Array(capacity * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  const material = new THREE.PointsMaterial({ size: TODAY.size, map: env.disc, vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  env.scene.add(points)
  const colour = new THREE.Color(), previous = new THREE.Vector3(), at = new THREE.Vector3()
  let cursor = 0, pool = 0, started = false, painted = -1
  return {
    points: capacity, calls: 1,
    update(time, delta, emit) {
      if (painted !== env.sparkle()) {
        painted = env.sparkle()
        for (let i = 0; i < capacity; i++) {
          colour.setHex(painted).offsetHSL(0, 0, (i / capacity - 0.5) * 0.12)
          colours.set([colour.r, colour.g, colour.b], i * 3)
        }
        geometry.attributes.color.needsUpdate = true
      }
      if (!started) { previous.copy(env.fairy.position); started = true }
      // The game adds a point on each frame. The study adds 60 in each second, as a 60 Hz screen does.
      const [frames, rest] = emit.hover ? [0, 0] : emitCount(pool, 60, delta)
      pool = rest
      for (let frame = 1; frame <= frames; frame++) {
        at.lerpVectors(previous, env.fairy.position, frame / frames)
        for (let i = 0; i < (emit.boost ? TODAY.boostPoints : 1); i++) {
          const index = cursor++ % capacity
          positions[index * 3] = at.x + (Math.random() - 0.5) * TODAY.jitter
          positions[index * 3 + 1] = at.y + (Math.random() - 0.5) * TODAY.jitter
          positions[index * 3 + 2] = at.z + (Math.random() - 0.5) * TODAY.jitter
        }
      }
      previous.copy(env.fairy.position)
      // trimTrail() of the game: hide the points that are older than the length of the trail now.
      const shown = Math.round(THREE.MathUtils.lerp(TODAY.points, capacity, emit.bonus))
      for (let age = shown; age < capacity; age++) {
        const index = ((cursor - 1 - age) % capacity + capacity) % capacity
        positions[index * 3] = positions[index * 3 + 1] = positions[index * 3 + 2] = 1e6
      }
      geometry.attributes.position.needsUpdate = true
      material.opacity = 0.56 + Math.sin(time * 3) * 0.12 + emit.bonus * 0.22
      material.size = TODAY.size + emit.bonus * 0.16
    },
    dispose() { env.scene.remove(points); geometry.dispose(); material.dispose() },
  }
}

// ---- A ribbon: a band of light on the path of one place of the fairy ---------------------------------
const RIBBON_VERTEX = /* glsl */`
attribute float aK, aSide;
varying float vK, vSide;
void main() { vK = aK; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const RIBBON_FRAGMENT = /* glsl */`
uniform vec3 uA, uB;
uniform float uGain, uTime, uShimmer, uCover;
varying float vK, vSide;
void main() {
  float edge = max(0.0, 1.0 - vSide * vSide);
  float alpha = pow(max(0.0, 1.0 - vK), 1.5) * edge * sqrt(edge) * uGain * (1.0 - uShimmer * (0.5 + 0.5 * sin(vK * 46.0 - uTime * 9.0)));
  alpha = min(alpha, 1.0);
  gl_FragColor = vec4(mix(uA, uB, smoothstep(0.0, 0.55, vK)) * alpha, alpha * uCover);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
type RibbonOptions = { source: 0 | 1 | 2; life: number; width: number; samples?: number; gain?: number }

function ribbon(env: TrailEnv, options: RibbonOptions): Trail {
  const parent = env.frame, count = options.samples ?? 40
  const positions = new Float32Array(count * 6), ages = new Float32Array(count * 2), sides = new Float32Array(count * 2)
  const index: number[] = []
  for (let i = 0; i < count; i++) {
    sides[i * 2] = -1; sides[i * 2 + 1] = 1
    if (i < count - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aK', new THREE.BufferAttribute(ages, 1))
  geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1))
  geometry.setIndex(index)
  const uniforms = { uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uGain: { value: options.gain ?? 0.8 }, uTime: { value: 0 }, uShimmer: { value: 0.22 }, uCover: { value: 0.5 } }
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: RIBBON_VERTEX, fragmentShader: RIBBON_FRAGMENT, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.name = 'fairy-trail-ribbon'
  parent.add(mesh)
  type Sample = { place: THREE.Vector3; speed: THREE.Vector3; birth: number }
  const samples: Sample[] = []
  const inverse = new THREE.Quaternion(), head = new THREE.Vector3(), kept = new THREE.Vector3(), eye = new THREE.Vector3()
  const tangent = new THREE.Vector3(), across = new THREE.Vector3(), lastAcross = new THREE.Vector3(1, 0, 0)
  return {
    points: count * 2, calls: 1,
    update(time, delta, emit) {
      parent.getWorldQuaternion(inverse).invert()
      parent.worldToLocal(head.copy([emit.centre, emit.left, emit.right][options.source]))
      kept.copy(emit.velocity).applyQuaternion(inverse).multiplyScalar(inherit(emit.velocity.length()))
      const life = options.life * (1 + emit.bonus)
      for (const sample of samples) sample.place.addScaledVector(sample.speed, delta)
      if (!samples.length || time - samples[0].birth >= life / (count - 2)) samples.unshift({ place: head.clone(), speed: kept.clone(), birth: time })
      while (samples.length && (time - samples[samples.length - 1].birth > life || samples.length > count - 1)) samples.pop()
      // The band: the place of the fairy now, then each sample. Each pair of points looks at the camera.
      const chain = [head, ...samples.map(sample => sample.place)]
      const width = options.width * (1 + emit.bonus * 0.5)
      parent.worldToLocal(eye.copy(env.camera.position))
      for (let i = 0; i < count; i++) {
        const at = Math.min(i, chain.length - 1)
        const k = at === 0 ? 0 : Math.min((time - samples[at - 1].birth) / life, 1)
        tangent.copy(chain[Math.max(at - 1, 0)]).sub(chain[Math.min(at + 1, chain.length - 1)])
        across.crossVectors(tangent, eye.clone().sub(chain[at]))
        if (across.lengthSq() > 1e-10) lastAcross.copy(across.normalize())
        const half = i > at ? 0 : width * 0.5 * (0.3 + 0.7 * Math.min(1, k * 8)) * (1 - k) ** 0.7
        positions.set([chain[at].x - lastAcross.x * half, chain[at].y - lastAcross.y * half, chain[at].z - lastAcross.z * half,
          chain[at].x + lastAcross.x * half, chain[at].y + lastAcross.y * half, chain[at].z + lastAcross.z * half], i * 6)
        ages[i * 2] = ages[i * 2 + 1] = k
      }
      geometry.attributes.position.needsUpdate = geometry.attributes.aK.needsUpdate = true
      uniforms.uTime.value = env.still() ? 0 : time
      uniforms.uB.value.setHex(env.sparkle())
      uniforms.uA.value.copy(uniforms.uB.value).lerp(white, 0.5)
    },
    dispose() { parent.remove(mesh); geometry.dispose(); material.dispose() },
  }
}

function together(...trails: Trail[]): Trail {
  return {
    points: trails.reduce((sum, trail) => sum + trail.points, 0), calls: trails.reduce((sum, trail) => sum + trail.calls, 0),
    update(time, delta, emit) { for (const trail of trails) trail.update(time, delta, emit) },
    dispose() { for (const trail of trails) trail.dispose() },
  }
}

/** The trail of each option of the study, by the id of the option in model.ts. */
export const TRAILS: Record<string, (env: TrailEnv) => Trail> = {
  today,
  none: () => ({ points: 0, calls: 0, update() {}, dispose() {} }),
  fixed: env => dust(env, { capacity: 160, rate: 60, boostRate: 1.4, hoverRate: 0, life: [1.2, 1.2], size: [0.2, 0.2], jitter: TODAY.jitter, scatter: 0, fall: 0, shape: 'disc', twinkle: 0, gain: 0.8, cover: 0 }),
  pixie: TRAIL_DESIGNS.pixie,
  glints: env => dust(env, { capacity: 90, rate: 24, life: [0.8, 1.4], size: [0.4, 0.85], jitter: 0.55, scatter: 0.2, fall: 0.15, shape: 'glint', twinkle: 11, max: 0.1 }),
  ribbon: env => ribbon(env, { source: 0, life: 1.1, width: 0.42 }),
  tips: env => together(
    ribbon(env, { source: 1, life: 0.9, width: 0.11, gain: 1 }), ribbon(env, { source: 2, life: 0.9, width: 0.11, gain: 1 }),
    dust(env, { capacity: 140, rate: 46, life: [0.6, 1.2], size: [0.05, 0.16], jitter: 0.08, scatter: 0.25, fall: 0.5, shape: 'dust', twinkle: 9, from: 'tips' }),
  ),
  tail: TRAIL_DESIGNS.tail,
  halo: TRAIL_DESIGNS.halo,
  'ribbon-stars': env => together(
    ribbon(env, { source: 0, life: 1.1, width: 0.24, gain: 0.7 }),
    dust(env, { capacity: 90, rate: 30, life: [0.7, 1.3], size: [0.22, 0.6], jitter: 0.3, scatter: 0.3, fall: 0.2, shape: 'glint', twinkle: 11, max: 0.08 }),
  ),
  rainbow: env => dust(env, { ...PIXIE, tint: 'rainbow', size: [0.09, 0.34], cover: 0.9 }),
  candy: env => together(
    dust(env, { capacity: 160, rate: 44, life: [1.1, 2], size: [0.2, 0.4], jitter: 0.4, scatter: 0.6, fall: 0.9, shape: 'candy', tint: 'candy', twinkle: 0, cover: 1, gain: 0.95, max: 0.07 }),
    dust(env, { ...PIXIE, capacity: 200, rate: 60 }),
  ),
  bursts: env => dust(env, { ...PIXIE, capacity: 480, rate: 170, boostRate: 1, onlyAction: true, burst: 60 }),
  shimmer: env => dust(env, SHIMMER),
  // The same shimmer from her two feet. The box where a point starts is small, so each foot leaves its own line.
  'shimmer-feet': TRAIL_DESIGNS.feet,
  // The same shimmer from places on all the surface of her wings: a wide cloud of points, not a line.
  'shimmer-wings': env => dust(env, { ...SHIMMER, from: 'wings', jitter: 0.04, rate: 110, scatter: 0.22, fall: 0.5 }),
}

