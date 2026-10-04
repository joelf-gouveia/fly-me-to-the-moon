import * as THREE from 'three'

/**
 * The sparkle trail of the fairy, from the fairy trail study (docs/fairy-trail-study.md). The
 * player selects one of four trails in the menu. The points of a trail stay in a frame: the
 * world that carries the fairy, the scene in open space, or the fairy. The graphics card
 * moves, fades and twinkles each point, so a trail is one draw call.
 */

// ---- The rules of the trail ----------------------------------------------------------------------
/** A new point moves away from the fairy at this speed at most, in metres in each second. */
export const CAP = 12

/**
 * The part of the speed of the fairy that a new point keeps. Below the cap a point stays where
 * it starts. Above the cap it follows her, so it moves away from her at the cap speed.
 */
export function inherit(speed: number, cap = CAP) { return speed <= cap ? 0 : 1 - cap / speed }

/** New points in a frame of `delta` seconds at `rate` points in each second. Returns the count and the rest. */
export function emitCount(pool: number, rate: number, delta: number): [number, number] {
  const total = pool + rate * delta
  const count = Math.floor(total)
  return [count, total - count]
}

export type Emit = {
  /** The places where points start, in the scene: behind her waist, and near each wing tip. */
  centre: THREE.Vector3; left: THREE.Vector3; right: THREE.Vector3
  /** The left foot and the right foot, from the live ankle joints of the rig. */
  feet: [THREE.Vector3, THREE.Vector3]
  /** Writes a random place on the surface of one of her four wing panels, in the scene, at this time of the wing beat. */
  wing(out: THREE.Vector3, random: () => number): THREE.Vector3
  /** The velocity of the fairy in the frame of the world that carries her, in the axes of the scene. */
  velocity: THREE.Vector3
  /** The direction to the ground, in the axes of the scene. */
  down: THREE.Vector3
  boost: boolean
  hover: boolean
  /** 1 for the 4 s after a sparkle ring, then 0. */
  bonus: number
  /**
   * The velocity that a world gives to the fairy when the points are in the scene, in the axes of the
   * scene. A new point keeps it, so the trail does not go off to one side.
   */
  drift?: THREE.Vector3
}
export type TrailEnv = {
  scene: THREE.Scene
  /** The world that carries the fairy. */
  frame: THREE.Object3D
  fairy: THREE.Object3D
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  /** The sparkle colour of the wing colour of the look. */
  sparkle: () => number
  /** With reduced motion, the points do not twinkle. */
  still: () => boolean
  /** The camera of the look menu is near the fairy. Then a point near the camera does not fade. */
  close?: () => boolean
}
export type Trail = {
  points: number
  calls: number
  update(time: number, delta: number, emit: Emit): void
  dispose(): void
  /** Moves the points to a different frame: a world, or the scene. The points that are alive keep their places. */
  setFrame?(frame: THREE.Object3D): void
  /** Moves the points with the fairy when the game moves her and her world to a new place. */
  shift?(offset: THREE.Vector3): void
  /** Removes each point, after a jump of the fairy. */
  clear?(): void
}

export function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed)
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x
    return ((x ^ x >>> 14) >>> 0) / 4294967296
  }
}
export const white = new THREE.Color(0xffffff)

// ---- Sparkles: points that the graphics card moves, fades and twinkles -----------------------------
const SHAPES = { disc: 0, glint: 1, dust: 2, candy: 3 } as const
const TINTS = { sparkle: 0, rainbow: 1, candy: 2 } as const
export type SparkleLook = {
  capacity: number
  /** disc: the soft disc of today. glint: a four-point star. dust: discs, and one glint in four. candy: stars, hearts and flowers. */
  shape: keyof typeof SHAPES
  /** The flash rate of a point, in radians in each second. 0 gives one brightness. */
  twinkle: number
  /** The fall to the ground, in metres in each second squared. */
  fall: number
  tint?: keyof typeof TINTS
  /**
   * How much a point covers the picture behind it. 0: its light adds to the picture, as today, so
   * its colour goes white on a bright sky. 1: the point is paint. The default is 0.6.
   */
  cover?: number
  gain?: number
  /** The largest size of a point on the screen, as a part of the height of the picture. */
  max?: number
}

const SPARKLE_VERTEX = /* glsl */`
attribute vec3 velocity;
attribute vec4 data; // The time of birth, the life, a random number and the size in metres.
uniform float uTime, uScale, uFall, uTwinkle, uMax, uNear;
uniform vec3 uDown;
varying float vK, vSeed, vFlash;
void main() {
  float age = uTime - data.x;
  float k = age / data.y;
  vK = k; vSeed = data.z;
  if (k < 0.0 || k >= 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vFlash = 0.0; return; }
  vec3 p = position + velocity * age + uDown * (uFall * age * age * 0.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float wave = 0.5 + 0.5 * sin(data.z * 61.0 + uTime * uTwinkle * (0.6 + fract(data.z * 7.3)));
  vFlash = uTwinkle > 0.0 ? 0.16 + 1.7 * wave * wave * wave : 1.0;
  // A point grows in its first sixth, then it becomes smaller.
  float size = data.w * (0.4 + 0.6 * sin(min(k * 6.0, 1.0) * 1.5708)) * (1.0 - k * 0.5);
  // A point near the camera has a limit on its size, and it fades, so the trail does not cover the view.
  gl_PointSize = clamp(size * uScale / -mv.z, 1.5, uScale * uMax);
  vFlash *= smoothstep(1.2 * uNear, 3.6 * uNear, -mv.z);
  gl_Position = projectionMatrix * mv;
}`
const SPARKLE_FRAGMENT = /* glsl */`
uniform vec3 uA, uB;
uniform int uShape, uTint;
uniform float uGain, uTime, uCover;
varying float vK, vSeed, vFlash;
vec3 hue(float h) { return clamp(abs(fract(h + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
float disc(vec2 c) {
  float r = length(c), core = exp(-r * r * 11.0), halo = max(0.0, 1.0 - r);
  return core + halo * halo * 0.3 * (1.0 - core);
}
float glint(vec2 c) {
  float r = length(c);
  return clamp(exp(-r * r * 16.0) + 0.05 / (abs(c.x * c.y) * 16.0 + 0.05) * max(0.0, 1.0 - r), 0.0, 1.0);
}
float star(vec2 p) {
  const vec2 k1 = vec2(0.809016994, -0.587785252);
  const vec2 k2 = vec2(-0.809016994, -0.587785252);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= 0.82;
  vec2 ba = 0.45 * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, 0.82);
  return smoothstep(0.05, -0.05, length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y));
}
float heart(vec2 c) {
  vec2 q = vec2(c.x, 0.2 - c.y) * 1.3;
  float h = q.x * q.x + q.y * q.y - 1.0;
  return smoothstep(0.06, -0.06, h * h * h - q.x * q.x * q.y * q.y * q.y);
}
float flower(vec2 c) {
  float edge = 0.56 + 0.3 * cos(5.0 * atan(c.y, c.x));
  return smoothstep(edge + 0.07, edge - 0.07, length(c));
}
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float kind = fract(vSeed * 97.0);
  float turn = uShape == 0 ? 0.0 : vSeed * 6.283 + uTime * (fract(vSeed * 13.0) - 0.5) * (uShape == 3 ? 3.0 : 1.2);
  float co = cos(turn), si = sin(turn);
  vec2 d = vec2(c.x * co - c.y * si, c.x * si + c.y * co);
  float a;
  if (uShape == 0) { float soft = smoothstep(1.0, 0.18, length(c)); a = soft * soft; }
  else if (uShape == 1) a = glint(d);
  else if (uShape == 2) a = kind < 0.25 ? glint(d) : disc(c);
  else a = kind < 0.34 ? star(d) : kind < 0.67 ? heart(d) : flower(d);
  vec3 colour = mix(uA, uB, smoothstep(0.0, 0.7, vK));
  if (uTint == 1) colour = mix(colour, mix(vec3(1.0), hue(vK * 0.8 + 0.02), 0.92), smoothstep(0.04, 0.2, vK));
  if (uTint == 2) {
    float pick = fract(vSeed * 41.0);
    colour = pick < 0.25 ? vec3(1.0, 0.2, 0.5) : pick < 0.5 ? vec3(1.0, 0.62, 0.08) : pick < 0.75 ? vec3(0.12, 0.72, 0.5) : vec3(0.45, 0.24, 1.0);
  }
  float alpha = a * (1.0 - smoothstep(0.5, 1.0, vK)) * vFlash * uGain;
  if (alpha < 0.004) discard;
  alpha = min(alpha, 1.0);
  gl_FragColor = vec4(colour * alpha, alpha * uCover);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function createSparkles(env: TrailEnv, parent: THREE.Object3D, look: SparkleLook) {
  const { capacity } = look
  const position = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3)
  const velocity = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3)
  const data = new THREE.BufferAttribute(new Float32Array(capacity * 4).fill(-1000), 4)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', position)
  geometry.setAttribute('velocity', velocity)
  geometry.setAttribute('data', data)
  const uniforms = {
    uTime: { value: 0 }, uScale: { value: 1 }, uFall: { value: look.fall }, uTwinkle: { value: look.twinkle },
    uDown: { value: new THREE.Vector3() }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() },
    uShape: { value: SHAPES[look.shape] }, uTint: { value: TINTS[look.tint ?? 'sparkle'] }, uGain: { value: look.gain ?? 1 }, uMax: { value: look.max ?? 0.045 }, uNear: { value: 1 }, uCover: { value: look.cover ?? 0.6 },
  }
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: SPARKLE_VERTEX, fragmentShader: SPARKLE_FRAGMENT, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.name = 'fairy-trail-sparkles'
  parent.add(points)
  const random = seeded(capacity)
  let cursor = 0, dirty = false
  return {
    points,
    /** A new point. The place and the velocity are in the frame of `points`. */
    spawn(time: number, place: THREE.Vector3, speed: THREE.Vector3, life: number, size: number) {
      position.setXYZ(cursor, place.x, place.y, place.z)
      velocity.setXYZ(cursor, speed.x, speed.y, speed.z)
      data.setXYZW(cursor, time, life, random(), size)
      cursor = (cursor + 1) % capacity
      dirty = true
    },
    frame(time: number, down: THREE.Vector3) {
      uniforms.uTime.value = time
      uniforms.uDown.value.copy(down)
      uniforms.uTwinkle.value = env.still() ? 0 : look.twinkle
      uniforms.uNear.value = env.close?.() ? 0.2 : 1
      uniforms.uScale.value = env.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(env.camera.fov) / 2))
      uniforms.uB.value.setHex(env.sparkle())
      uniforms.uA.value.copy(uniforms.uB.value).lerp(white, 0.45)
      if (dirty) position.needsUpdate = velocity.needsUpdate = data.needsUpdate = true
      dirty = false
    },
    setGain(gain: number) { uniforms.uGain.value = gain },
    clear() { (data.array as Float32Array).fill(-1000); dirty = true },
    dispose() { points.removeFromParent(); geometry.dispose(); material.dispose() },
  }
}

export type DustOptions = SparkleLook & {
  /** The points in each second in a cruise. */
  rate: number
  /** The factor of the rate in a boost (default 1.6) and in a hover (default 0.2). */
  boostRate?: number
  hoverRate?: number
  /** The shortest and the longest life, in seconds, and the smallest and the largest size, in metres. */
  life: [number, number]
  size: [number, number]
  /** The width of the box where a point starts, in metres. */
  jitter: number
  /** The speed of a point away from its start, in metres in each second. */
  scatter: number
  /** Where the points start: behind her waist, near the wing tips, the two, her feet, or places on all the surface of her wings. */
  from?: 'centre' | 'tips' | 'all' | 'feet' | 'wings'
  /** No points in a cruise: only in a boost and after a sparkle ring. */
  onlyAction?: boolean
  /** More points in the first frame of a boost. */
  burst?: number
  /**
   * A faint trail that becomes strong: the factors of the rate, of the size and of the brightness in a
   * boost and after a sparkle ring. The change takes about 0.5 s. It replaces `boostRate`.
   */
  strong?: { rate: number; size: number; gain: number }
}

/** Sparkles that stay in the frame of the world that carries the fairy, or in the scene in open space. */
export function dust(env: TrailEnv, options: DustOptions): Trail {
  const sparkles = createSparkles(env, env.frame, options)
  // The points object holds the frame. After setFrame() it can have its own place in its parent.
  const parent = sparkles.points
  const random = seeded(7)
  const sources = options.from === 'feet' ? [3, 4] : options.from === 'tips' ? [1, 2] : options.from === 'all' ? [0, 1, 2] : [0]
  const previous = Array.from({ length: 5 }, () => new THREE.Vector3()), now = Array.from({ length: 5 }, () => new THREE.Vector3())
  const inverse = new THREE.Quaternion(), kept = new THREE.Vector3(), place = new THREE.Vector3(), speed = new THREE.Vector3(), down = new THREE.Vector3(), step = new THREE.Vector3()
  let started = false, pool = 0, boosted = false, level = 0
  return {
    points: options.capacity, calls: 1,
    update(time, delta, emit) {
      parent.getWorldQuaternion(inverse).invert()
      ;[emit.centre, emit.left, emit.right, ...emit.feet].forEach((point, index) => parent.worldToLocal(now[index].copy(point)))
      if (!started) { previous.forEach((point, index) => point.copy(now[index])); started = true }
      // Rule 3: above the cap speed, a point keeps a part of the speed of the fairy.
      kept.copy(emit.velocity).multiplyScalar(inherit(emit.velocity.length()))
      if (emit.drift) kept.add(emit.drift)
      kept.applyQuaternion(inverse)
      const strong = options.strong
      level += (Math.max(emit.boost ? 1 : 0, emit.bonus) - level) * (1 - Math.exp(-delta * 4))
      let rate = strong
        ? options.rate * (emit.hover ? options.hoverRate ?? 0.2 : 1) * THREE.MathUtils.lerp(1, strong.rate, level)
        : options.rate * (emit.hover ? options.hoverRate ?? 0.2 : emit.boost ? options.boostRate ?? 1.6 : 1) * (1 + emit.bonus)
      if (strong) sparkles.setGain((options.gain ?? 1) * THREE.MathUtils.lerp(1, strong.gain, level))
      const grow = strong ? THREE.MathUtils.lerp(1, strong.size, level) : 1 + emit.bonus * 0.5
      if (options.onlyAction && !emit.boost && emit.bonus <= 0) rate = 0
      // Rule 2: time makes the points.
      let [count, rest] = emitCount(pool, rate, delta)
      pool = rest
      if (options.burst && emit.boost && !boosted) count += options.burst
      boosted = emit.boost
      step.copy(previous[0]).sub(now[0])
      for (let i = 0; i < count; i++) {
        const source = sources[Math.floor(random() * sources.length)], along = random()
        if (options.from === 'wings') {
          // A place on a wing now, moved back along her path for the part of the frame that is gone.
          parent.worldToLocal(emit.wing(place, random)).addScaledVector(step, 1 - along)
        } else place.lerpVectors(previous[source], now[source], along)
        place.x += (random() - 0.5) * options.jitter
        place.y += (random() - 0.5) * options.jitter
        place.z += (random() - 0.5) * options.jitter
        speed.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(options.scatter * (0.3 + random() * 0.7)).add(kept)
        const life = THREE.MathUtils.lerp(options.life[0], options.life[1], random()) * (1 + emit.bonus * 0.6)
        const size = THREE.MathUtils.lerp(options.size[0], options.size[1], random() ** 2) * grow
        sparkles.spawn(time - (1 - along) * delta, place, speed, life, size)
      }
      previous.forEach((point, index) => point.copy(now[index]))
      sparkles.frame(time, down.copy(emit.down).applyQuaternion(inverse))
    },
    setFrame(frame) {
      if (parent.parent === frame) return
      frame.attach(parent)
      started = false
    },
    shift(offset) {
      if (parent.parent !== env.scene) return
      parent.position.add(offset)
      started = false
    },
    clear() { sparkles.clear(); started = false },
    dispose: sparkles.dispose,
  }
}

/** Sparkles in the frame of the fairy: a tail that is fixed to her back, or a halo around her. */
export function onFairy(env: TrailEnv, kind: 'tail' | 'halo'): Trail {
  const tail = kind === 'tail'
  const capacity = tail ? 260 : 160
  const sparkles = createSparkles(env, env.fairy, { capacity, shape: tail ? 'dust' : 'glint', twinkle: tail ? 9 : 12, fall: 0, max: tail ? 0.045 : 0.08 })
  const random = seeded(11)
  const place = new THREE.Vector3(), speed = new THREE.Vector3(), direction = new THREE.Vector3(), none = new THREE.Vector3()
  let pool = 0
  return {
    points: capacity, calls: 1,
    update(time, delta, emit) {
      const rate = (tail ? emit.hover ? 50 : emit.boost ? 190 : 130 : emit.boost ? 90 : 60) * (1 + emit.bonus)
      const [count, rest] = emitCount(pool, rate, delta)
      pool = rest
      // In the frame of the fairy, +z is behind her.
      const back = emit.hover ? 0.6 : THREE.MathUtils.lerp(3, 7.5, THREE.MathUtils.clamp(emit.velocity.length() / 26, 0, 1)) * (1 + emit.bonus * 0.5)
      for (let i = 0; i < count; i++) {
        if (tail) {
          place.set((random() - 0.5) * 0.3, 0.1 + random() * 0.35, 0.45)
          speed.set((random() - 0.5) * 0.9, (random() - 0.5) * 0.9, back * (0.7 + random() * 0.5))
          sparkles.spawn(time - random() * delta, place, speed, 0.7 + random() * 0.45, (0.1 + random() ** 2 * 0.24) * (1 + emit.bonus * 0.5))
        } else {
          direction.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
          place.copy(direction).multiplyScalar(0.7 + random() * 0.55)
          place.x *= 1.45
          place.y += 0.6
          place.z += 0.15
          speed.set(direction.z, 0, -direction.x).multiplyScalar(0.5).addScaledVector(direction, 0.2)
          sparkles.spawn(time - random() * delta, place, speed, 0.6 + random() * 0.6, (0.2 + random() ** 2 * 0.3) * (1 + emit.bonus * 0.5))
        }
      }
      sparkles.frame(time, none)
    },
    clear: sparkles.clear,
    dispose: sparkles.dispose,
  }
}

export const PIXIE: DustOptions = { capacity: 520, rate: 190, hoverRate: 0.3, life: [0.8, 1.7], size: [0.07, 0.3], jitter: 0.3, scatter: 0.5, fall: 1, shape: 'dust', twinkle: 8 }

export const SHIMMER: DustOptions = { ...PIXIE, capacity: 560, rate: 85, size: [0.05, 0.17], life: [0.7, 1.3], scatter: 0.3, gain: 0.7, hoverRate: 0.4, burst: 30, strong: { rate: 2.8, size: 1.8, gain: 1.45 } }

// ---- The four trails of the menu -------------------------------------------------------------------
export const trailIds = ['pixie', 'tail', 'halo', 'feet'] as const
export type TrailId = typeof trailIds[number]

/** The trails of the game, by the id of the menu: options 03, 07, 08 and 14 of the study. */
export const TRAIL_DESIGNS: Record<TrailId, (env: TrailEnv) => Trail> = {
  pixie: env => dust(env, PIXIE),
  tail: env => onFairy(env, 'tail'),
  halo: env => onFairy(env, 'halo'),
  // The shimmer from her two feet. The box where a point starts is small, so each foot leaves its own line.
  feet: env => dust(env, { ...SHIMMER, from: 'feet', jitter: 0.1 }),
}

/** A jump of the fairy (a teleport) is faster than each flight speed. It removes the trail. */
const JUMP_SPEED = 4000

export type TrailState = {
  /** The world that carries the fairy, or null in open space. */
  frame: THREE.Object3D | null
  /** The velocity of her own flight, in the axes of the scene. */
  velocity: THREE.Vector3
  /** The velocity that a world gives her in open space, in the axes of the scene. */
  drift: THREE.Vector3
  /** The direction to the ground. A zero vector in open space: the points do not fall. */
  down: THREE.Vector3
  boost: boolean
  hover: boolean
  /** 1 after a sparkle ring or in a comet tail, then 0. */
  bonus: number
  /** Reduced motion: the points do not twinkle. */
  still: boolean
  /**
   * The look menu: the fairy is still, and the trail shows how it looks. The points move away from
   * her with `drift`, and the points near the camera of the menu do not fade.
   */
  preview?: boolean
}

/** The trail of the fairy in the game. `rig` gives the live ankle joints of her body. */
export function createFairyTrail(scene: THREE.Scene, fairy: THREE.Object3D, rig: { joints: { ankle: THREE.Vector3 }[] }, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  const body = fairy.getObjectByName('fairy-body') ?? fairy
  let design: TrailId = 'pixie', colour = 0xffc786, still = false, bonus = 0, preview = false
  let frame: THREE.Object3D = scene
  const env: TrailEnv = { scene, get frame() { return frame }, fairy, camera, renderer, sparkle: () => colour, still: () => still, close: () => preview }
  let trail = TRAIL_DESIGNS[design](env)
  const none = new THREE.Vector3()
  const emit: Emit = {
    centre: new THREE.Vector3(), left: new THREE.Vector3(), right: new THREE.Vector3(), feet: [new THREE.Vector3(), new THREE.Vector3()],
    wing: out => out.copy(emit.centre), velocity: new THREE.Vector3(), down: new THREE.Vector3(), boost: false, hover: false, bonus: 0, drift: new THREE.Vector3(),
  }
  return {
    get design() { return design },
    get bonus() { return bonus },
    get points() { return trail.points },
    /** What holds the points now: a world, the scene or the fairy. */
    get frame() { return trail.setFrame ? frame === scene ? 'scene' : 'world' : 'fairy' },
    setDesign(id: TrailId) {
      if (id === design) return
      trail.dispose()
      design = id
      trail = TRAIL_DESIGNS[id](env)
    },
    /** The sparkle colour of the wing colour of the look. */
    setColour(hex: number) { colour = hex },
    update(time: number, delta: number, state: TrailState) {
      frame = state.frame ?? scene
      trail.setFrame?.(frame)
      still = state.still
      bonus = state.bonus
      preview = !!state.preview
      fairy.updateMatrixWorld(true)
      body.localToWorld(emit.centre.set(0, 0.15, 0.3))
      emit.left.copy(emit.centre)
      emit.right.copy(emit.centre)
      rig.joints.forEach((joint, side) => { if (side < 2) body.localToWorld(emit.feet[side].copy(joint.ankle)) })
      emit.velocity.copy(state.velocity)
      emit.drift!.copy(state.frame && !preview ? none : state.drift)
      if (emit.velocity.length() > JUMP_SPEED) { trail.clear?.(); emit.velocity.set(0, 0, 0) }
      emit.down.copy(state.down)
      emit.boost = state.boost
      emit.hover = state.hover
      emit.bonus = state.bonus
      trail.update(time, delta, emit)
    },
    shift(offset: THREE.Vector3) { trail.shift?.(offset) },
    clear() { trail.clear?.() },
    dispose() { trail.dispose() },
  }
}

/** A small picture of a trail for its button of the menu, in the sparkle colour of the look. */
export function drawTrailIcon(canvas: HTMLCanvasElement, id: TrailId, colour: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas, random = seeded(trailIds.indexOf(id) + 3)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = `#${colour.toString(16).padStart(6, '0')}`
  const dot = (x: number, y: number, radius: number, alpha: number, star = false) => {
    ctx.globalAlpha = alpha
    ctx.beginPath()
    if (star) {
      // A four-point star.
      for (let i = 0; i < 8; i++) {
        const reach = i % 2 ? radius * 0.32 : radius * 1.5, angle = i * Math.PI / 4
        ctx.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach)
      }
    } else ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  // The fairy is a small white dot. The trail goes down from her, or around her.
  const top = height * 0.2, middle = width / 2
  if (id === 'pixie') for (let i = 0; i < 26; i++) { const k = random(); dot(middle + (random() - 0.5) * width * (0.1 + k * 0.3), top + k * height * 0.72, 1.2 + random() * 2.4, 1 - k * 0.75, random() < 0.25) }
  if (id === 'tail') for (let i = 0; i < 30; i++) { const k = random(); dot(middle + (random() - 0.5) * width * k * 0.62, top + 3 + k * height * 0.7, 1.1 + random() * 2.2, 1 - k * 0.7, random() < 0.25) }
  if (id === 'halo') for (let i = 0; i < 13; i++) { const angle = i / 13 * Math.PI * 2 + random(), reach = height * (0.24 + random() * 0.12); dot(middle + Math.cos(angle) * reach * 1.35, height / 2 + Math.sin(angle) * reach, 1.6 + random() * 2.4, 0.55 + random() * 0.45, true) }
  if (id === 'feet') for (const side of [-1, 1]) for (let i = 0; i < 11; i++) { const k = random(); dot(middle + side * width * 0.09 + (random() - 0.5) * 4, top + 6 + k * height * 0.68, 0.9 + random() * 1.8, 1 - k * 0.75, random() < 0.2) }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(middle, id === 'halo' ? height / 2 : top, 3.2, 0, Math.PI * 2)
  ctx.fill()
}
