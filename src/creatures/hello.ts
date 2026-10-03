import * as THREE from 'three'

/**
 * Creature hello (F3 of docs/feature-ideas-study.md). The fairy flies near a creature. The
 * creature turns to her, hops (or bobs on the water), and small pink hearts float up.
 */
export const HELLO = {
  /** The fairy, or the point where she is after the lead time, is this near to the feet of the creature, in metres. */
  distance: 6,
  /** The creature looks this far ahead on the path of the fairy, in seconds, so the hello starts before she arrives. */
  lead: 1.1,
  /** The longest look ahead, in metres. A boost does not start a hello from far away. */
  leadLimit: 16,
  /** The rest time of each creature between two hellos, in seconds of the creature clock. */
  rest: 8,
  /** The life of one heart, in seconds. */
  heartLife: 2,
  /** The time between the starts of two hearts of one hello, in seconds. */
  heartGap: 0.2,
  /** The most hearts of one hello on a computer. A phone shows half. */
  hearts: 3,
  /** The most hellos that show hearts at the same time. */
  pool: 8,
}

/** True when the fairy is near and the creature has rested since its last hello. */
export function canSayHello(distance: number, time: number, last?: number) {
  return distance <= HELLO.distance && (last === undefined || time - last >= HELLO.rest)
}

/**
 * The point where the fairy is after the lead time, at her speed now. A creature near this
 * point says hello while she comes, not after she is past. It writes into `out`.
 */
export function helloPoint(position: THREE.Vector3, velocity: THREE.Vector3, out: THREE.Vector3) {
  out.copy(velocity).multiplyScalar(HELLO.lead)
  if (out.length() > HELLO.leadLimit) out.setLength(HELLO.leadLimit)
  return out.add(position)
}

/** The number of hearts of one hello: 2 or 3 on a computer, 1 or 2 on a phone. */
export function heartCount(index: number, mobile: boolean) {
  const count = HELLO.hearts - 1 + (index % 2)
  return mobile ? Math.ceil(count / 2) : count
}

/** The size of the heart pool: half on a phone. */
export function heartPool(mobile: boolean) {
  return HELLO.pool * HELLO.hearts / (mobile ? 2 : 1)
}

/** The time from the start of a hello to the end of its last heart. */
export function helloLength(hearts: number) {
  return 0.12 + (hearts - 1) * HELLO.heartGap + HELLO.heartLife
}

/**
 * The lift of a creature along its ground normal, before the scale of the model. A land
 * creature hops two times. A creature on the water bobs two times, lower.
 */
export function helloLift(age: number, water: boolean) {
  if (age <= 0 || age >= 0.9) return 0
  const wave = Math.abs(Math.sin(age / 0.45 * Math.PI))
  return wave * (water ? (age < 0.45 ? 0.12 : 0.08) : (age < 0.45 ? 0.55 : 0.35))
}

/** How much the creature faces the fairy: 0 is its own heading, 1 is the fairy. */
export function helloTurn(age: number) {
  return THREE.MathUtils.smoothstep(age, 0, 0.3) * (1 - THREE.MathUtils.smoothstep(age, 1.5, 2))
}

export type HeartPose = { rise: number; sway: number; size: number; alpha: number; spin: number }

/**
 * The pose of heart k at an age of the hello. It writes into `out` and returns false
 * before the heart starts and after it fades. The rise is over the head, in metres.
 */
export function heartPose(age: number, k: number, out: HeartPose) {
  const life = age - 0.12 - k * HELLO.heartGap
  if (life < 0 || life > HELLO.heartLife) return false
  out.rise = 0.15 + life * 0.85
  out.sway = Math.sin(life * 4 + k) * 0.18
  out.size = 0.32 + Math.min(life, 0.4) * 0.6
  out.alpha = Math.min(life / 0.15, 1) * (1 - THREE.MathUtils.smoothstep(life, HELLO.heartLife - 0.9, HELLO.heartLife - 0.3))
  out.spin = Math.sin(life * 3 + k) * 0.25
  return out.alpha > 0.001
}

/** One pink heart on a canvas. All the hearts of all the worlds share it. */
let heartTexture: THREE.CanvasTexture | null = null
function sharedHeartTexture() {
  if (heartTexture) return heartTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const heart = new Path2D('M64 112 C20 80 6 56 14 34 C22 12 52 10 64 34 C76 10 106 12 114 34 C122 56 108 80 64 112 Z')
  const fill = ctx.createLinearGradient(0, 10, 0, 112)
  fill.addColorStop(0, '#ffb3d6')
  fill.addColorStop(1, '#ff5c9f')
  ctx.shadowColor = '#ffffffaa'
  ctx.shadowBlur = 10
  ctx.fillStyle = fill
  ctx.fill(heart)
  ctx.shadowBlur = 0
  ctx.lineWidth = 5
  ctx.strokeStyle = '#fff2f8'
  ctx.stroke(heart)
  ctx.fillStyle = '#ffffffb0'
  ctx.beginPath()
  ctx.ellipse(40, 36, 11, 7, -0.6, 0, Math.PI * 2)
  ctx.fill()
  heartTexture = new THREE.CanvasTexture(canvas)
  heartTexture.colorSpace = THREE.SRGBColorSpace
  return heartTexture
}

const bufferSize = new THREE.Vector2()

/**
 * A pool of hearts in one draw call: one point for each heart, with its own size, fade and
 * spin. The texture loads at the first draw, so the unit tests run without a canvas.
 */
export function createHeartPool(limit: number) {
  const positions = new Float32Array(limit * 3), looks = new Float32Array(limit * 3)
  const geometry = new THREE.BufferGeometry()
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  const look = new THREE.BufferAttribute(looks, 3).setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('look', look)
  geometry.setDrawRange(0, 0)
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: null }, uHalfHeight: { value: 450 } },
    // look: x is the size in metres, y the alpha, z the spin in radians.
    vertexShader: `attribute vec3 look; uniform float uHalfHeight; varying float vAlpha; varying float vSpin;
      void main() {
        vAlpha = look.y; vSpin = look.z;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(look.x * projectionMatrix[1][1] * uHalfHeight / -mv.z, 1.0, 160.0);
      }`,
    fragmentShader: `uniform sampler2D uMap; varying float vAlpha; varying float vSpin;
      void main() {
        // A point has y down, and the texture has y up: turn y, so the heart is the right way up.
        vec2 p = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) - 0.5;
        float c = cos(vSpin), s = sin(vSpin);
        vec4 heart = texture2D(uMap, vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5);
        if (heart.a * vAlpha < 0.01) discard;
        gl_FragColor = vec4(heart.rgb, heart.a * vAlpha);
        #include <colorspace_fragment>
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.name = 'creature-hearts'
  points.frustumCulled = false
  points.visible = false
  points.renderOrder = 2
  points.onBeforeRender = renderer => {
    material.uniforms.uMap.value ??= sharedHeartTexture()
    material.uniforms.uHalfHeight.value = renderer.getDrawingBufferSize(bufferSize).y / 2
  }
  let count = 0
  return {
    points,
    get count() { return count },
    begin() { count = 0 },
    /** Adds one heart at a local point. It returns false when the pool is full. */
    add(point: THREE.Vector3, pose: HeartPose) {
      if (count >= limit) return false
      positions.set([point.x, point.y, point.z], count * 3)
      looks.set([pose.size, pose.alpha, pose.spin], count * 3)
      count++
      return true
    },
    end() {
      geometry.setDrawRange(0, count)
      points.visible = count > 0
      if (count) { position.needsUpdate = true; look.needsUpdate = true }
    },
    dispose() {
      points.removeFromParent()
      geometry.dispose(); material.dispose()
    },
  }
}
