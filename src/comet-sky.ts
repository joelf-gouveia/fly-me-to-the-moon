import * as THREE from 'three'
import { seededRandom } from './terrain'
import { COMET, COMET_LAYERS, cometState, tailHit } from './comet'
import type { CometState, Tail } from './comet'

/** A soft round dot, made without a canvas, so the unit tests can make it too. */
export function softDotTexture(size = 64) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2)
    const alpha = d < 0.18 ? 1 : Math.max(0, 1 - (d - 0.18) / 0.82) ** 2
    data.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4)
  }
  const texture = new THREE.DataTexture(data, size, size)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

const tailVertex = /* glsl */`
  attribute vec4 aSeed;
  uniform float uTime, uLength, uHead, uEnd, uBend, uScale, uFlow;
  uniform vec2 uSize;
  varying float vFade;
  void main() {
    // aSeed: x = start along the tail, y = angle, z = distance from the axis (0..1), w = speed.
    float u = fract(aSeed.x + uTime * uFlow * aSeed.w);
    float radius = mix(uHead, uEnd, pow(u, 0.75)) * aSeed.z;
    vec3 local = vec3(cos(aSeed.y) * radius, sin(aSeed.y) * radius + uBend * u * u * uLength, u * uLength);
    vec4 view = modelViewMatrix * vec4(local, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(mix(uSize.x, uSize.y, u) * uScale / max(-view.z, 1.0), 1.0, 180.0);
    // Particles near the camera fade out, so the inside of the tail is a soft haze, not a white wall.
    vFade = smoothstep(0.0, 0.04, u) * pow(1.0 - u, 1.35) * (1.0 - 0.6 * aSeed.z) * smoothstep(12.0, 140.0, -view.z);
  }`
const tailFragment = /* glsl */`
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float soft = pow(max(0.0, 1.0 - d), 2.0);
    gl_FragColor = vec4(uColour, soft * vFade * uOpacity);
    #include <colorspace_fragment>
  }`

type TailLook = { count: number; colour: THREE.Color; size: [number, number]; opacity: number; flow: number }

function createTail(random: () => number, look: TailLook) {
  const seeds = new Float32Array(look.count * 4)
  for (let i = 0; i < look.count; i++) {
    // More particles near the axis: the tail is bright in the middle and soft at the edge.
    seeds.set([random(), random() * Math.PI * 2, Math.pow(random(), 0.9), 0.75 + random() * 0.5], i * 4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(look.count * 3), 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uLength: { value: 1 }, uHead: { value: 1 }, uEnd: { value: 1 }, uBend: { value: 0 },
      uScale: { value: 600 }, uFlow: { value: look.flow }, uSize: { value: new THREE.Vector2(...look.size) },
      uColour: { value: look.colour }, uOpacity: { value: look.opacity },
    },
    vertexShader: tailVertex, fragmentShader: tailFragment,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return {
    points, count: look.count, opacity: look.opacity,
    set(tail: Tail, time: number, scale: number, visibility: number) {
      const u = material.uniforms
      u.uLength.value = tail.length; u.uHead.value = tail.head; u.uEnd.value = tail.end; u.uBend.value = tail.bend
      u.uTime.value = time; u.uScale.value = scale; u.uOpacity.value = look.opacity * visibility
    },
  }
}

const toVector = (point: { x: number; y: number; z: number }, target: THREE.Vector3) => target.set(point.x, point.y, point.z)

/**
 * The comet of F8: an icy nucleus, a glowing coma, a warm dust tail and a faint blue ion
 * tail. It is scenery, not a World: flight, landing, stickers and Worlds do not see it.
 * When the fairy flies through a tail, sparkles stream behind her.
 */
export function createComet(scene: THREE.Scene, mobile = false) {
  const layer = COMET_LAYERS[mobile ? 'phone' : 'desktop']
  const random = seededRandom(0xc0e7)
  const group = new THREE.Group()
  group.name = 'comet'
  scene.add(group)

  // A lumpy, icy nucleus.
  const nucleusGeometry = new THREE.IcosahedronGeometry(COMET.nucleus, 2)
  const position = nucleusGeometry.attributes.position as THREE.BufferAttribute
  const point = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i)
    const p = point.clone().divideScalar(COMET.nucleus / 3)
    point.multiplyScalar(1 + Math.sin(p.x * 1.7) * 0.08 + Math.cos(p.y * 2.3 + p.z) * 0.07)
    position.setXYZ(i, point.x, point.y, point.z)
  }
  nucleusGeometry.computeVertexNormals()
  const nucleusMaterial = new THREE.MeshStandardMaterial({ color: 0xc9d6e2, roughness: 0.85, emissive: 0x6f8fb0, emissiveIntensity: 0.35, flatShading: true, transparent: true })
  const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial)
  nucleus.name = 'comet-nucleus'
  group.add(nucleus)

  const dot = softDotTexture()
  const sprite = (colour: number, scale: number, opacity: number) => {
    const material = new THREE.SpriteMaterial({ map: dot, color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    const object = new THREE.Sprite(material)
    object.scale.setScalar(scale)
    group.add(object)
    return { material, opacity }
  }
  const comaOuter = sprite(0x96cdff, COMET.coma * 2, 0.3)
  const comaInner = sprite(0xebf8ff, COMET.coma * 0.45, 0.85)

  // The tails live in a frame where +Z points away from the Sun and +Y points behind the motion.
  const tails = new THREE.Group()
  tails.name = 'comet-tails'
  group.add(tails)
  const dust = createTail(random, { count: layer.dust, colour: new THREE.Color(1.0, 0.76, 0.48), size: [26, 90], opacity: 0.16, flow: 0.05 })
  const ion = createTail(random, { count: layer.ion, colour: new THREE.Color(0.22, 0.48, 1.0), size: [16, 40], opacity: 0.42, flow: 0.12 })
  dust.points.name = 'comet-dust-tail'
  ion.points.name = 'comet-ion-tail'
  tails.add(dust.points, ion.points)

  // Sparkles around the fairy in a tail. They drift back behind her as a longer trail.
  const sparkleCount = layer.sparkles
  const sparklePositions = new Float32Array(sparkleCount * 3).fill(1e7)
  const sparkleOffsets = new Float32Array(sparkleCount * 3)
  const sparkleVelocity = new Float32Array(sparkleCount * 3)
  const sparkleBorn = new Float32Array(sparkleCount).fill(-10)
  const sparkleGeometry = new THREE.BufferGeometry()
  sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3))
  const sparkleMaterial = new THREE.PointsMaterial({ size: 0.45, map: dot, color: 0xeaf6ff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial)
  sparkles.name = 'comet-sparkles'
  sparkles.frustumCulled = false
  scene.add(sparkles)
  const SPARKLE_LIFE = 1.6, GLOW_SECONDS = 4

  const basis = new THREE.Matrix4(), x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3()
  let state: CometState = cometState(0)
  let inside = false, entered = false, glow = 0, clock = 0, cursor = 0, emit = 0, lastChime = -Infinity, alive = 0
  let hit: ReturnType<typeof tailHit> = { inside: false, tail: null, along: 0 }

  function spark(fairy: THREE.Vector3, back: THREE.Vector3, still: boolean) {
    const i = cursor++ % sparkleCount
    sparkleBorn[i] = clock
    sparkleOffsets.set([(random() - 0.5) * 1.4, (random() - 0.5) * 1.4 + 0.3, (random() - 0.5) * 1.4], i * 3)
    // Out from her, and back along her path, so the sparkles make a trail at every speed.
    const speed = still ? 0 : 1
    sparkleVelocity.set([
      ((random() - 0.5) * 1.6 + back.x * 4.5) * speed,
      ((random() - 0.5) * 1.6 + back.y * 4.5) * speed,
      ((random() - 0.5) * 1.6 + back.z * 4.5) * speed,
    ], i * 3)
    sparklePositions.set([fairy.x, fairy.y, fairy.z], i * 3)
  }

  const back = new THREE.Vector3()
  return {
    group,
    get state() { return state },
    /** True while the fairy is inside a tail. */
    get inTail() { return inside },
    /** True on the first frame in a tail, at most once in 4 s: the chime. */
    get entered() { return entered },
    /** 1 in a tail, then down to 0 in 4 s: the sparkles and the longer trail. */
    get glow() { return glow },
    get hit() { return hit },
    get stats() { return { dust: dust.count, ion: ion.count, sparkles: alive, sparkleCapacity: sparkleCount } },
    /**
     * `orbitTime` is orbits.elapsed, so World speed makes the comet faster. `time` moves the
     * tail; reduced motion gives 0 for a still tail. `visibility` fades the comet in the air.
     */
    update(orbitTime: number, sunPosition: THREE.Vector3, view: THREE.PerspectiveCamera, fairy: THREE.Vector3, forward: THREE.Vector3,
      time: number, delta: number, bufferHeight: number, visibility = 1, still = false) {
      state = cometState(orbitTime, sunPosition)
      toVector(state.position, group.position)
      z.set(state.away.x, state.away.y, state.away.z)
      y.set(state.trailing.x, state.trailing.y, state.trailing.z)
      x.crossVectors(y, z)
      tails.quaternion.setFromRotationMatrix(basis.makeBasis(x, y, z))
      nucleus.rotation.set(time * 0.13, time * 0.21, 0)

      const scale = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(view.fov) / 2))
      // The tails are a little brighter near the Sun.
      const activity = THREE.MathUtils.clamp(1.25 - state.distance / 16000, 0.55, 1.15) * visibility
      dust.set(state.dust, time, scale, activity)
      ion.set(state.ion, time, scale, activity)
      comaOuter.material.opacity = comaOuter.opacity * activity * (1 + Math.sin(time * 1.4) * 0.08)
      comaInner.material.opacity = comaInner.opacity * visibility
      nucleusMaterial.opacity = visibility
      group.visible = visibility > 0.002

      // The fairy in a tail: a chime on entry, sparkles and a longer trail.
      clock += delta
      hit = tailHit(fairy, state)
      const was = inside
      inside = hit.inside && visibility > 0.5
      entered = inside && !was && clock - lastChime > GLOW_SECONDS
      if (entered) lastChime = clock
      glow = inside ? 1 : Math.max(0, glow - delta / GLOW_SECONDS)
      back.copy(forward).negate()
      if (delta > 0) {
        if (inside && !was) for (let k = 0; k < 40; k++) spark(fairy, back, still)
        emit += glow * 70 * delta
        while (emit >= 1) { spark(fairy, back, still); emit-- }
      }
      alive = 0
      for (let i = 0; i < sparkleCount; i++) {
        const age = clock - sparkleBorn[i]
        if (age > SPARKLE_LIFE) { sparklePositions[i * 3] = 1e7; continue }
        alive++
        for (let axis = 0; axis < 3; axis++) {
          sparklePositions[i * 3 + axis] = fairy.getComponent(axis) + sparkleOffsets[i * 3 + axis] + sparkleVelocity[i * 3 + axis] * age
        }
      }
      sparkleGeometry.attributes.position.needsUpdate = true
      return state
    },
  }
}
export type Comet = ReturnType<typeof createComet>
