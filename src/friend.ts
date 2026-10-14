import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { fairytale } from './creatures/fairytale'
import type { Fairytale } from './creatures/fairytale'
import { createFairytaleCreature } from './creatures/fairytale-models'
import { species } from './creatures/habitat'
import type { Species } from './creatures/habitat'
import { createCreature } from './creatures/models'

/**
 * F19 · Fairy friend (docs/learn-and-play-study.md). After five hellos, a small friend flies with
 * the fairy. The child selects the friend from the creatures that said hello to her. The friend
 * has no task and no health: it is company.
 *
 * This file has three parts: the saved state, the follow rules (the two work without a browser),
 * and the object in the scene.
 */

/** The creatures that can be a friend: four animals of Earth, then five story creatures of Blossom Haven. */
export const FRIEND_KINDS = ['cow', 'rabbit', 'sheep', 'duck', 'unicorn', 'dragonling', 'kitsune', 'frogPrince', 'pegasus'] as const
export type FriendKind = typeof FRIEND_KINDS[number]

export function isFriendKind(value: unknown): value is FriendKind {
  return FRIEND_KINDS.includes(value as FriendKind)
}
const isEarthKind = (kind: FriendKind): kind is Species => Object.hasOwn(species, kind)
/** The name of a kind, as the creature studies give it. */
export function friendName(kind: FriendKind) {
  return isEarthKind(kind) ? species[kind].name : fairytale[kind as Fairytale].name
}
/** A kind with wings flies with its wings. Each other kind rides in a bubble that the fairy made. */
export function friendFlies(kind: FriendKind) {
  return kind === 'duck' || kind === 'dragonling' || kind === 'pegasus'
}

export const FRIEND = {
  /** The friend comes at this number of hellos. */
  hellos: 5,
  /** How fast the friend comes to its place, and how fast it turns to her heading, in 1/s. */
  follow: 3.2, turn: 4,
  /** A move of the fairy of more than this in one frame, in metres, is a jump: the friend goes to its place at once. */
  jump: 150,
  /** A turn of the fairy of more than this in one frame, in radians, is a jump too. */
  twist: 0.5,
  /** The happy loop: its time in seconds, the rest time between two loops, and the follow rate in the loop. */
  loopFor: 1.6, loopRest: 20, loopFollow: 9,
  /** The height of the bob in metres, and its rate. */
  bob: 0.13, bobRate: 2.6,
  /** The middle of the friend stays this far over the ground and the water, in metres. */
  ground: 1.05,
  /** The friend stays this far from the line between the camera and the fairy, and this far from the camera, in metres. */
  lane: 0.95, near: 2.2,
  /** The friend is never farther than this from the fairy, in metres. The unit tests hold this limit at each speed. */
  limit: 4,
  /** The radius of the bubble, and of the body in it, in metres. */
  bubble: 0.74, body: 0.56,
} as const

// ---- The saved state -----------------------------------------------------------------------------

/**
 * `hellos` counts to FRIEND.hellos and stops there: it is not a score. `met` has the kinds that
 * said hello, in the order of the first hello. `friend` is the selected kind, or null for no friend.
 */
export type FriendState = { hellos: number; met: FriendKind[]; friend: FriendKind | null }

export function emptyFriend(): FriendState {
  return { hellos: 0, met: [], friend: null }
}

/** True when the friend came: the child can select a friend. */
export function hasFriendGift(state: FriendState) {
  return state.hellos >= FRIEND.hellos
}

/** Reads a saved state. A missing or broken value gives the empty state, and each bad part is ignored. */
export function parseFriend(value: unknown): FriendState {
  if (!value || typeof value !== 'object') return emptyFriend()
  const saved = value as Record<string, unknown>
  const met = Array.isArray(saved.met) ? [...new Set(saved.met.filter(isFriendKind))] : []
  const count = typeof saved.hellos === 'number' && Number.isFinite(saved.hellos) ? Math.floor(saved.hellos) : 0
  // Each hello adds its kind, so a count with no kind is a broken value.
  const hellos = met.length ? THREE.MathUtils.clamp(count, 1, FRIEND.hellos) : 0
  const friend = hellos >= FRIEND.hellos && isFriendKind(saved.friend) && met.includes(saved.friend) ? saved.friend : null
  return { hellos, met, friend }
}

/**
 * Adds the hellos of one frame. `gift` is the kind of the fifth hello: the friend comes, and this
 * kind is the first friend. `fresh` has the kinds that she met for the first time.
 */
export function sayHello(state: FriendState, kinds: readonly unknown[]) {
  const next: FriendState = { hellos: state.hellos, met: [...state.met], friend: state.friend }
  const fresh: FriendKind[] = []
  let gift: FriendKind | null = null
  for (const kind of kinds) {
    if (!isFriendKind(kind)) continue
    if (!next.met.includes(kind)) { next.met.push(kind); fresh.push(kind) }
    if (next.hellos >= FRIEND.hellos) continue
    next.hellos++
    if (next.hellos === FRIEND.hellos) { gift = kind; next.friend = kind }
  }
  return { state: next, gift, fresh }
}

/** Selects a friend that she met, or null for no friend. Before the gift, and for a kind that she did not meet, nothing changes. */
export function chooseFriend(state: FriendState, kind: FriendKind | null): FriendState {
  if (!hasFriendGift(state) || (kind !== null && !state.met.includes(kind))) return state
  return { ...state, friend: kind }
}

/**
 * A note in the flight. A card note shows at the first hello of a kind: the kind is new in the
 * animal book. `hearts` is the count of the hellos at that hello, before the gift, and null after
 * it. The gift note shows at the fifth hello.
 */
export type FriendNote = { kind: FriendKind; gift: boolean; hearts: number | null }

/**
 * The hellos of one frame, one at a time, with their notes. A hello to a kind that she met adds a
 * heart and gives no note. At the fifth hello of a new kind, the gift note takes the place of the card note.
 */
export function helloNotes(state: FriendState, kinds: readonly unknown[]) {
  let next = state
  const notes: FriendNote[] = []
  for (const kind of kinds) {
    const result = sayHello(next, [kind])
    next = result.state
    if (result.gift) notes.push({ kind: result.gift, gift: true, hearts: FRIEND.hellos })
    else if (result.fresh.length) notes.push({ kind: result.fresh[0], gift: false, hearts: hasFriendGift(next) ? null : next.hellos })
  }
  return { state: next, notes }
}

// ---- The follow rules ----------------------------------------------------------------------------

/**
 * The place of the friend in the frame of the fairy: x is her right, y is up, z is behind her.
 * The friend is at her right side. A narrow screen shows less than 2 m to each side of her, so
 * there the place is nearer and higher. In the look menu the camera is close, so the place is close.
 */
export function friendPlace(aspect: number, menu: boolean, out = new THREE.Vector3()) {
  const wide = THREE.MathUtils.smoothstep(aspect, 0.6, 1.3)
  if (menu) return out.set(THREE.MathUtils.lerp(0.78, 1.35, wide), THREE.MathUtils.lerp(0.5, 0.7, wide), 0.3)
  return out.set(THREE.MathUtils.lerp(1.2, 2.2, wide), THREE.MathUtils.lerp(1.3, 0.5, wide), 0.4)
}

/** The size of the friend: a little smaller on a narrow screen, and smaller in the look menu, where the camera is close. */
export function friendSize(aspect: number, menu = false) {
  return THREE.MathUtils.lerp(0.8, 1, THREE.MathUtils.smoothstep(aspect, 0.6, 1.3)) * (menu ? 0.62 : 1)
}

export type FriendGround = { centre: THREE.Vector3; radiusAt: (direction: THREE.Vector3) => number }
export type FriendStep = {
  /** The fairy: her place and her heading in the scene. */
  fairy: THREE.Vector3
  heading: THREE.Quaternion
  delta: number
  /** The place of the friend in her frame (friendPlace()). */
  place: THREE.Vector3
  /** The part of her move of this frame that a world gave her (its orbit and its spin). It is not a jump. */
  carry?: THREE.Vector3 | null
  /** Reduced motion: no loop and no bob. */
  still?: boolean
  /** The nearest world, to keep the friend out of the ground and the water. */
  ground?: FriendGround | null
  /** The camera, to keep the friend out of the line between the camera and the fairy. */
  camera?: THREE.Vector3 | null
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * The follow rule. In each frame the friend takes the full move of the fairy, and then it comes to
 * its place at her side. Thus the friend never falls behind, at 11 m/s and at 2,226 m/s, and it
 * comes a little late only in a turn. A jump of the fairy puts the friend at its place at once.
 */
export function createFriendFollow() {
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion()
  const last = new THREE.Vector3(), lastHeading = new THREE.Quaternion()
  const move = new THREE.Vector3(), goal = new THREE.Vector3(), offset = new THREE.Vector3()
  const line = new THREE.Vector3(), nearest = new THREE.Vector3(), out = new THREE.Vector3()
  let started = false, clock = 0, loopAt = -Infinity, loopAngle = 0

  /** Keeps `position` out of the ground: the nearest world is a centre and a radius in each direction. */
  function overGround(ground: FriendGround) {
    out.copy(position).sub(ground.centre)
    const distance = out.length()
    if (distance < 1e-6) return
    const minimum = ground.radiusAt(out.divideScalar(distance)) + FRIEND.ground
    if (distance < minimum) position.copy(ground.centre).addScaledVector(out, minimum)
  }
  /** Keeps `position` away from the camera, and out of the line from the camera to the fairy. */
  function outOfView(camera: THREE.Vector3, fairy: THREE.Vector3, heading: THREE.Quaternion) {
    line.copy(fairy).sub(camera)
    const length = line.lengthSq()
    const along = length > 1e-6 ? THREE.MathUtils.clamp(out.copy(position).sub(camera).dot(line) / length, 0, 1) : 0
    nearest.copy(camera).addScaledVector(line, along)
    out.copy(position).sub(nearest)
    if (out.length() < FRIEND.lane) {
      // On the line itself, the friend goes out to her right.
      if (out.lengthSq() < 1e-6) out.set(1, 0, 0).applyQuaternion(heading)
      position.copy(nearest).addScaledVector(out.normalize(), FRIEND.lane)
    }
    out.copy(position).sub(camera)
    if (out.length() < FRIEND.near) position.copy(camera).addScaledVector(out.lengthSq() < 1e-6 ? out.set(1, 0, 0).applyQuaternion(heading) : out.normalize(), FRIEND.near)
  }

  return {
    position, quaternion,
    /** The angle of the loop around her in radians, or 0 when no loop runs. */
    get loop() { return loopAngle },
    get clock() { return clock },
    /** The next step puts the friend at its place at once. */
    reset() { started = false },
    /**
     * Starts a happy loop around her. It returns false when the last loop started less than
     * FRIEND.loopRest seconds before, or with reduced motion.
     */
    cheer(still = false, force = false) {
      if (still || (!force && clock - loopAt < FRIEND.loopRest)) return false
      loopAt = clock
      return true
    },
    /** One frame. It returns true when the friend went to its place at once. */
    step({ fairy, heading, delta, place, carry, still = false, ground, camera }: FriendStep) {
      clock += delta
      const progress = still ? 1 : (clock - loopAt) / FRIEND.loopFor
      const looping = progress >= 0 && progress < 1
      loopAngle = looping ? smooth(progress) * Math.PI * 2 : 0
      // The loop goes around her body: over her head, to her left, below her, and back to its place.
      const centre = 0.35, cos = Math.cos(loopAngle), sin = Math.sin(loopAngle), x = place.x, y = place.y - centre
      offset.set(x * cos - y * sin, centre + (x * sin + y * cos) * (looping ? 0.85 + 0.15 * cos : 1), place.z)
      if (!still) offset.y += Math.sin(clock * FRIEND.bobRate) * FRIEND.bob
      goal.copy(offset).applyQuaternion(heading).add(fairy)

      move.copy(fairy).sub(last)
      const flown = carry ? out.copy(move).sub(carry).length() : move.length()
      const snapped = !started || flown > FRIEND.jump || heading.angleTo(lastHeading) > FRIEND.twist
      if (snapped) {
        position.copy(goal)
        quaternion.copy(heading)
        started = true
      } else {
        // The full move of the fairy first: the orbit and the spin of a world, a boost, a guided flight.
        position.add(move).lerp(goal, 1 - Math.exp(-delta * (looping ? FRIEND.loopFollow : FRIEND.follow)))
        quaternion.slerp(heading, 1 - Math.exp(-delta * FRIEND.turn))
      }
      last.copy(fairy)
      lastHeading.copy(heading)
      if (camera) outOfView(camera, fairy, heading)
      if (ground) overGround(ground)
      return snapped
    },
  }
}

export type FriendFollow = ReturnType<typeof createFriendFollow>

// ---- The object in the scene ---------------------------------------------------------------------

/** The wings of a baked model stand at this angle over the level, in radians. The beat changes the height of the wing mesh. */
const WING_REST = 0.6
/** The points of the fairy dust, and the points of a puff of sparkles when a friend comes or goes. The puff is the same draw call. */
const DUST = 10, PUFF = 28

/** One part of a model as a geometry in the frame of the model, with its colour in each vertex. */
function piece(mesh: THREE.Mesh) {
  const material = mesh.material as THREE.MeshStandardMaterial
  const placed = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
  const geometry = placed.index ? placed.toNonIndexed() : placed
  if (geometry !== placed) placed.dispose()
  // A part with flat shading gets the normal of each face.
  if (material.flatShading) geometry.computeVertexNormals()
  for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name)
  const colours = new Float32Array(geometry.attributes.position.count * 3)
  for (let i = 0; i < colours.length; i += 3) colours.set([material.color.r, material.color.g, material.color.b], i)
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  return geometry
}

function join(parts: THREE.BufferGeometry[]) {
  const joined = mergeGeometries(parts)
  parts.forEach(part => part.dispose())
  return joined
}

/** A wing for the duck, which has only a wing patch on its side: a flat oval from the shoulder, with a cream tip. */
function duckWing(side: number) {
  const wing = new THREE.Group()
  wing.name = 'wing'
  wing.position.set(side * 0.27, 0.3, -0.08)
  const sphere = new THREE.SphereGeometry(1, 10, 6)
  const add = (colour: number, x: number, z: number, sx: number, sz: number) => {
    const mesh = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: colour, flatShading: true }))
    mesh.position.set(side * x, 0, z); mesh.scale.set(sx, 0.035, sz)
    wing.add(mesh)
  }
  add(0xe6bb77, 0.3, 0, 0.32, 0.2)
  add(0xfff6e2, 0.5, -0.05, 0.16, 0.15)
  return wing
}

/**
 * The model of a kind with its parts joined: one mesh for the body, and one mesh for the two
 * wings of a kind that flies. The model stands still (no walk, no magic particles), so a phone
 * and a computer draw it in two calls. The body has its middle at the origin and the radius FRIEND.body.
 */
function bake(kind: FriendKind) {
  const flies = friendFlies(kind)
  let root: THREE.Object3D, dispose: () => void
  if (isEarthKind(kind)) {
    const model = createCreature(kind, false)
    // The friend duck gets real wings in place of its wing patches.
    model.animate(0, false, { details: kind !== 'duck', tails: true, motion: false })
    if (kind === 'duck') model.root.children[0].add(duckWing(-1), duckWing(1))
    root = model.root; dispose = model.dispose
  } else {
    const model = createFairytaleCreature(kind)
    model.animate(0, false, { details: true, magic: false, motion: false })
    root = model.root; dispose = model.dispose
  }
  const wingRoots: number[] = []
  root.traverse(object => {
    if (object.name !== 'wing') return
    object.rotation.z = Math.sign(object.position.x) * WING_REST
    // The small wings of the dragonling are larger for the flight, so they show from behind.
    if (kind === 'dragonling') object.scale.setScalar(1.7)
    wingRoots.push(object.position.y)
  })
  root.updateMatrixWorld(true)
  const bodyParts: THREE.BufferGeometry[] = [], wingParts: THREE.BufferGeometry[] = []
  const visit = (object: THREE.Object3D, wing: boolean) => {
    if (!object.visible) return
    wing ||= object.name === 'wing'
    // The magic particles and the glass parts are transparent: they are not part of the joined model.
    if (object instanceof THREE.Mesh && !(object.material as THREE.Material).transparent) (wing ? wingParts : bodyParts).push(piece(object))
    object.children.forEach(child => visit(child, wing))
  }
  visit(root, false)
  dispose()
  if (kind === 'duck') root.traverse(object => { if (object instanceof THREE.Mesh && object.parent?.name === 'wing') { object.geometry.dispose(); (object.material as THREE.Material).dispose() } })
  const body = join(bodyParts)
  body.computeBoundingSphere()
  const centre = body.boundingSphere!.center.clone(), scale = FRIEND.body / body.boundingSphere!.radius
  body.translate(-centre.x, -centre.y, -centre.z).scale(scale, scale, scale)
  body.computeBoundingSphere()
  let wings: THREE.BufferGeometry | null = null, wingHeight = 0
  if (flies && wingParts.length) {
    wingHeight = (wingRoots.reduce((sum, y) => sum + y, 0) / wingRoots.length - centre.y) * scale
    wings = join(wingParts)
    // The wing mesh has its origin at the wing roots, so a change of its height is a beat of the two wings.
    wings.translate(-centre.x, -centre.y, -centre.z).scale(scale, scale, scale).translate(0, -wingHeight, 0)
    wings.computeBoundingSphere()
  }
  return { body, wings, wingHeight }
}

const bubbleGeometry = new THREE.SphereGeometry(1, 28, 18)

/** The soap bubble that the fairy makes for a friend with no wings: clear in the middle, bright at the edge, with the colours of a soap film. */
function createBubbleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTint: { value: new THREE.Color(0xffc786) }, uTime: { value: 0 }, uLight: { value: 1 },
    },
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      #include <fog_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uTint; uniform float uTime; uniform float uLight; varying vec3 vNormal; varying vec3 vView;
      #include <fog_pars_fragment>
      void main() {
        vec3 n = normalize(vNormal);
        float rim = pow(1.0 - abs(dot(n, normalize(vView))), 2.0);
        // The soap film: its colour changes along the edge and slowly with the time.
        vec3 film = 0.5 + 0.5 * cos(6.2832 * (rim * 1.2 + n.y * 0.4 + uTime * 0.05) + vec3(0.0, 2.1, 4.2));
        vec3 colour = mix(uTint, film, 0.4) * (0.6 + rim * 0.7);
        // Two soft highlights, as the window light on a soap bubble.
        float high = smoothstep(0.982, 0.995, dot(n, normalize(vec3(-0.6, 0.66, 0.45)))) * 0.8;
        float low = smoothstep(0.965, 0.99, dot(n, normalize(vec3(0.42, -0.5, 0.75)))) * 0.5;
        gl_FragColor = vec4((colour + high + low) * uLight, clamp(0.06 + rim * 0.62 + high * 0.7 + low * 0.5, 0.0, 1.0));
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  })
}

/**
 * `puff` is the friend in a puff of sparkles, from 0 (no puff) to 1: the body shrinks to nothing,
 * and the dust spreads out and fades. A friend that goes home ends in a puff, and a new friend
 * comes out of one.
 */
export type FriendPose = { loop: number; still: boolean; fast: boolean; light: number; puff?: number }

/**
 * The friend as three draw calls: the body, the wings or the bubble, and the fairy dust. `sparkle` is the
 * soft disc of the dust; without it the model has no dust (the pictures of the look menu).
 */
export function createFriendModel(kind: FriendKind, sparkle: THREE.Texture | null) {
  const root = new THREE.Group()
  root.name = `friend-${kind}`
  const baked = bake(kind)
  // The Frog Prince has a crown that is open at the top, so its inner side shows.
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: kind === 'frogPrince' ? THREE.DoubleSide : THREE.FrontSide })
  const body = new THREE.Mesh(baked.body, material)
  root.add(body)
  const wings = baked.wings ? new THREE.Mesh(baked.wings, material) : null
  if (wings) { wings.position.y = baked.wingHeight; body.add(wings) }
  const bubbleMaterial = wings ? null : createBubbleMaterial()
  const bubble = bubbleMaterial ? new THREE.Mesh(bubbleGeometry, bubbleMaterial) : null
  if (bubble) { bubble.scale.setScalar(FRIEND.bubble); bubble.renderOrder = 1; root.add(bubble) }

  // The fairy dust, in the sparkle colour of her wings: her magic keeps the friend with her.
  const places = new Float32Array(PUFF * 3), shades = new Float32Array(PUFF * 3)
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(places, 3).setUsage(THREE.DynamicDrawUsage))
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(shades, 3).setUsage(THREE.DynamicDrawUsage))
  dustGeometry.setDrawRange(0, DUST)
  const dustMaterial = new THREE.PointsMaterial({ size: 0.2, map: sparkle, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const dust = sparkle ? new THREE.Points(dustGeometry, dustMaterial) : null
  if (dust) { dust.frustumCulled = false; dust.renderOrder = 2; root.add(dust) }
  const tint = new THREE.Color(0xffc786)
  const rate = kind === 'pegasus' ? 8 : kind === 'dragonling' ? 15 : 12

  function animate(time: number, pose: FriendPose) {
    const puff = THREE.MathUtils.clamp(pose.puff ?? 0, 0, 1)
    // In a puff the body and its bubble shrink to nothing in the first 60% of the puff.
    const shrink = Math.max(1e-3, 1 - smooth(Math.min(1, puff / 0.6)))
    body.scale.setScalar(shrink)
    if (wings) {
      // The beat: the angle of the wings goes from a little below the level to high over the back.
      const angle = pose.still ? 0.3 : 0.38 + Math.sin(time * rate * (pose.fast ? 1.5 : 1)) * 0.6
      wings.scale.y = Math.tan(angle) / Math.tan(WING_REST)
      body.position.y = pose.still ? 0 : -Math.sin(time * rate * (pose.fast ? 1.5 : 1)) * 0.035
      body.rotation.set(pose.still ? 0 : Math.sin(time * 1.7) * 0.05 - 0.08, 0, 0)
    } else {
      // The friend floats in its bubble, and the bubble wobbles as soap does.
      body.position.y = pose.still ? 0 : Math.sin(time * 2.1) * 0.045
      body.rotation.set(pose.still ? 0 : Math.sin(time * 1.3 + 1) * 0.07, 0, pose.still ? 0 : Math.sin(time * 1.7) * 0.09)
      const wobble = pose.still ? 0 : Math.sin(time * 3.1) * 0.035
      bubble!.scale.set(FRIEND.bubble * (1 + wobble), FRIEND.bubble * (1 - wobble), FRIEND.bubble * (1 + wobble)).multiplyScalar(shrink)
      bubbleMaterial!.uniforms.uTime.value = time
      bubbleMaterial!.uniforms.uLight.value = THREE.MathUtils.lerp(0.5, 1, pose.light)
    }
    if (!dust) return
    dustGeometry.setDrawRange(0, puff > 0 ? PUFF : DUST)
    if (puff > 0) {
      // The puff: a ball of sparkles that grows from the bubble to 2.5 times its size. It is brightest
      // in the middle of the puff, and it fades at the end.
      const glow = (1 + 1.4 * Math.sin(puff * Math.PI)) * (1 - smooth(THREE.MathUtils.clamp((puff - 0.75) / 0.25, 0, 1)))
      for (let i = 0; i < PUFF; i++) {
        // The points are on a sphere, each one in its own direction (a Fibonacci sphere), with a little twinkle.
        const y = 1 - (i + 0.5) / PUFF * 2, ring = Math.sqrt(1 - y * y), turn = i * 2.39996 + time * 0.8
        const reach = FRIEND.bubble * (1 + puff * 1.5) * (0.8 + 0.2 * Math.sin(i * 7.1))
        places.set([Math.cos(turn) * ring * reach, y * reach, Math.sin(turn) * ring * reach], i * 3)
        const shine = glow * (0.6 + 0.4 * Math.sin(time * 9 + i * 3.3) ** 2)
        shades.set([tint.r * shine, tint.g * shine, tint.b * shine], i * 3)
      }
      dustGeometry.attributes.position.needsUpdate = true
      dustGeometry.attributes.color.needsUpdate = true
      return
    }
    for (let i = 0; i < DUST; i++) {
      const phase = i / DUST, seed = i * 2.39996
      let glow: number
      if (wings) {
        // A short line of dust behind the wings. The model faces +z.
        const life = (time * 0.9 + phase) % 1
        places.set([Math.cos(seed) * 0.22 * (0.4 + life), Math.sin(seed * 1.7) * 0.16 - life * 0.25, -0.45 - life * 1.25], i * 3)
        glow = Math.sin(life * Math.PI)
      } else {
        // The dust turns on the skin of the bubble.
        const turn = seed + time * (0.7 + (i % 3) * 0.25), lift = Math.sin(seed * 3.1 + time * 0.6) * 0.75
        const reach = Math.sqrt(1 - lift * lift) * FRIEND.bubble * 1.04
        places.set([Math.cos(turn) * reach, lift * FRIEND.bubble * 1.04, Math.sin(turn) * reach], i * 3)
        glow = 0.45 + 0.55 * Math.sin(time * 3.3 + seed * 5) ** 2
      }
      shades.set([tint.r * glow, tint.g * glow, tint.b * glow], i * 3)
    }
    dustGeometry.attributes.position.needsUpdate = true
    dustGeometry.attributes.color.needsUpdate = true
  }
  return {
    root, kind, animate,
    /** The number of draw calls of the model. */
    get calls() { let count = 0; root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points) count++ }); return count },
    /** The bubble and the dust take the sparkle colour of the look. */
    setColour(colour: number) {
      tint.setHex(colour)
      bubbleMaterial?.uniforms.uTint.value.setHex(colour)
    },
    dispose() {
      baked.body.dispose(); baked.wings?.dispose()
      material.dispose(); bubbleMaterial?.dispose()
      dustGeometry.dispose(); dustMaterial.dispose()
    },
  }
}

export type FriendModel = ReturnType<typeof createFriendModel>

/** The colour behind a picture: the sky of Earth for an animal, the candy sky of Blossom Haven for a story creature. */
const pictureSky = (kind: FriendKind) => isEarthKind(kind) ? 0x9fd3ee : 0xf3c6e4

/**
 * The look of a picture: 'sky' has the sky of its world behind the friend and its bubble. 'clear'
 * is the creature alone with a clear background, for a card of the animal book. 'shadow' is the
 * shape of the creature in one soft lilac colour, for a kind that she did not meet.
 */
export type PictureLook = 'sky' | 'clear' | 'shadow'
/** The colour of a shadow picture, and how much it covers, from 0 to 255. */
const SHADOW = [150, 132, 196, 165]

/**
 * A small picture of a friend from its model: one render into a texture. It returns the address of
 * a PNG picture.
 */
export function friendPicture(renderer: THREE.WebGLRenderer, kind: FriendKind, size = 112, look: PictureLook = 'sky') {
  const clear = look !== 'sky'
  const scene = new THREE.Scene()
  if (!clear) scene.background = new THREE.Color(pictureSky(kind))
  // A render into a texture has no tone map, so the light is softer than the light of the game.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcbb9a6, 2.3))
  const key = new THREE.DirectionalLight(0xfff4e4, 1.5)
  key.position.set(2, 3, 4)
  scene.add(key)
  const model = createFriendModel(kind, null)
  model.animate(0, { loop: 0, still: true, fast: false, light: 1 })
  // A card shows the creature: the bubble is not in the picture.
  if (clear) model.root.traverse(object => { if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) object.visible = false })
  model.root.rotation.y = 0.6
  scene.add(model.root)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30)
  // With no bubble, the camera comes nearer, so the creature fills the picture.
  camera.position.set(0, 0.25, clear ? 2.6 : 3.05)
  camera.lookAt(0, 0, 0)
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4 })
  const before = renderer.getRenderTarget(), clearColour = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha()
  renderer.setRenderTarget(target)
  if (clear) { renderer.setClearColor(0x000000, 0); renderer.clear() }
  renderer.render(scene, camera)
  const pixels = new Uint8Array(size * size * 4)
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels)
  renderer.setRenderTarget(before)
  if (clear) renderer.setClearColor(clearColour, clearAlpha)
  target.dispose(); model.dispose(); key.dispose()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)
  // The texture has its first row at the bottom and linear colours: turn it, and give it the colours of the screen.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const from = ((size - 1 - y) * size + x) * 4, to = (y * size + x) * 4, cover = clear ? pixels[from + 3] / 255 : 1
    if (look === 'shadow') { image.data.set([SHADOW[0], SHADOW[1], SHADOW[2], Math.round(cover * SHADOW[3])], to); continue }
    // At the edge of a clear picture a pixel has its colour times its cover: divide by the cover.
    for (let c = 0; c < 3; c++) image.data[to + c] = cover > 0 ? Math.round(255 * Math.pow(Math.min(1, pixels[from + c] / 255 / cover), 1 / 2.2)) : 0
    image.data[to + 3] = Math.round(cover * 255)
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

/** The friend turns its nose this far toward the fairy, and this much more when it looks back at her, in radians. */
const INWARD = 0.3, LOOK_BACK = 2.2

/** How much the friend looks back at the fairy: 0 is ahead, 1 is at her. It looks back for 2 s in each 12 s. */
export function friendGlance(time: number) {
  const t = time % 12
  return THREE.MathUtils.smoothstep(t, 8, 8.5) * (1 - THREE.MathUtils.smoothstep(t, 9.6, 10.1))
}

// ---- The swap ------------------------------------------------------------------------------------

/**
 * The swap of a friend, in seconds of flight (docs/friend-book-study.md). The old friend turns to her
 * and waves, then it flies home, faster and faster, and goes in a puff of sparkles. The new friend
 * comes out of a puff in the sky ahead of her, flies to its place at her side and makes the happy loop.
 */
export const SWAP = {
  wave: 0.9, home: 2.1,
  /** The new friend leaves the sky at this time of the swap. With no old friend, it leaves at once. */
  arrive: 1.5,
  /** The flight of the new friend from the sky to its place. */
  sky: 1.5,
  /** The way home in metres: a kind with wings flies farther than a friend in a bubble. */
  wings: 34, bubble: 20,
  /** The old friend goes in a puff in the last part of its way home, from this part. */
  puffAt: 0.72,
} as const
/** The puff in the sky where the new friend comes from, in the frame of the fairy: 1.5 m to her left, 5.5 m up and 15 m ahead. */
const SKY = new THREE.Vector3(-1.5, 5.5, -15)

export type SwapPart = {
  /** The old friend waves, flies home, or is gone. `oldK` is the done part of the wave or of the way home, from 0 to 1. */
  old: 'wave' | 'home' | 'gone'; oldK: number
  /** The new friend waits, flies from the sky, or is at its place. `nextK` is the done part of the flight from the sky. */
  next: 'wait' | 'sky' | 'here'; nextK: number
  /** True at the end of the swap. */
  done: boolean
}

/**
 * The parts of a swap `age` seconds after its start. `old` is true when a friend leaves, and `next`
 * is true when a friend comes. With no old friend the new one comes at once; with no new friend
 * ("No friend") the old one only goes home.
 */
export function swapAt(age: number, old: boolean, next: boolean): SwapPart {
  const part: SwapPart = { old: 'gone', oldK: 1, next: 'here', nextK: 1, done: false }
  if (old && age < SWAP.wave) { part.old = 'wave'; part.oldK = Math.max(0, age) / SWAP.wave }
  else if (old && age < SWAP.wave + SWAP.home) { part.old = 'home'; part.oldK = (age - SWAP.wave) / SWAP.home }
  const start = old ? SWAP.arrive : 0
  if (next && age < start) { part.next = 'wait'; part.nextK = 0 }
  else if (next && age < start + SWAP.sky) { part.next = 'sky'; part.nextK = Math.max(0, age - start) / SWAP.sky }
  part.done = part.old === 'gone' && part.next === 'here'
  return part
}

export type FriendFrame = FriendStep & {
  /** The look menu is open: the friend turns to the camera. */
  menu: boolean
  /** A boost or open space: the wings beat faster. */
  fast: boolean
  /** The daylight at the fairy, from 0 to 1, for the bubble. */
  light: number
  /** The size of the friend (friendSize()). */
  size: number
}

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1)
const easeIn = (t: number) => t * t * t
const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * The friend in the scene: the follow rule, the model of the selected kind, and its life. In a swap
 * the group has two friends for about 3 s: the friend that goes home and the friend that comes.
 */
export function createFriend(scene: THREE.Scene, sparkle: THREE.Texture) {
  const group = new THREE.Group()
  group.name = 'fairy-friend'
  scene.add(group)
  // The friend now, and the friend that goes home in a swap.
  const holder = new THREE.Group(), leaver = new THREE.Group()
  holder.name = 'friend-now'
  leaver.name = 'friend-leaving'
  holder.visible = leaver.visible = false
  group.add(holder, leaver)
  const follow = createFriendFollow()
  let model: FriendModel | null = null, leaving: FriendModel | null = null
  let colour = 0xffc786, time = 0, born = -Infinity, face = 0, leaveFace = 0, size = NaN
  // The swap: its age in seconds of flight, or -1 with no swap. `old` and `next` are the arguments of swapAt().
  let age = -1, old = false, next = false, landed = false
  const up = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), path = new THREE.Vector3()
  const origin = new THREE.Vector3(), start = new THREE.Vector3(), aim = new THREE.Matrix4(), turn = new THREE.Quaternion()
  const rock = new THREE.Quaternion(), nose = new THREE.Vector3(0, 0, 1)

  /** The friend that goes home is gone, and the swap ends. */
  function endSwap() {
    if (leaving) { leaver.remove(leaving.root); leaving.dispose(); leaving = null }
    leaver.visible = false
    age = -1
  }

  /** The friend that goes home: it waves at her side, then it flies up, forward and out to her right, and goes in a puff. */
  function placeLeaving(part: SwapPart, frame: FriendFrame) {
    const flies = friendFlies(leaving!.kind)
    leaver.position.copy(follow.position)
    leaver.quaternion.copy(follow.quaternion)
    let puff = 0, look = 0
    if (part.old === 'wave') {
      // It turns to her, rocks from side to side and makes a small hop.
      const k = part.oldK
      leaver.position.addScaledVector(up, Math.sin(k * Math.PI) * 0.35)
      leaver.quaternion.multiply(rock.setFromAxisAngle(nose, Math.sin(k * Math.PI * 4) * 0.42 * (1 - k * 0.5)))
      look = 1
    } else {
      // Faster and faster: a kind with wings flies farther and less high than a friend in a bubble.
      const k = part.oldK
      path.copy(up).multiplyScalar(flies ? 0.5 : 0.85).addScaledVector(forward, flies ? 0.75 : 0.35).addScaledVector(right, 0.55).normalize()
      leaver.position.addScaledVector(path, easeIn(k) * (flies ? SWAP.wings : SWAP.bubble))
      // Its nose turns along its way home.
      turn.setFromRotationMatrix(aim.lookAt(origin, path, up))
      leaver.quaternion.slerp(turn, smooth(clamp01(k / 0.3)))
      puff = clamp01((k - SWAP.puffAt) / (1 - SWAP.puffAt))
    }
    leaveFace += (look - leaveFace) * (1 - Math.exp(-frame.delta * 6))
    leaver.scale.setScalar(size)
    leaving!.root.rotation.set(0, Math.PI + INWARD + leaveFace * LOOK_BACK, 0)
    leaving!.animate(time, { loop: 0, still: false, fast: part.old === 'home', light: frame.light, puff })
  }

  return {
    /** The friend now and, in a swap, the friend that goes home. A browser check hides it to count the draw calls. */
    group,
    /** The friend now. It is hidden while the new friend of a swap waits in the sky. */
    holder, follow,
    /** The friend now, or the friend that comes in a swap. */
    get kind() { return model?.kind ?? null },
    /** The friend that goes home in a swap. */
    get leaving() { return leaving?.kind ?? null },
    get swapping() { return age >= 0 },
    /** The draw calls of the friends in the picture: 3 for one friend, 6 in the middle of a swap. */
    get calls() { return (model && holder.visible ? model.calls : 0) + (leaving && leaver.visible ? leaving.calls : 0) },
    /**
     * Shows the friend of a kind, or no friend, at once, and ends a swap. A new friend grows at its
     * place; the friend of a saved game is there at once (`grow` is false). With reduced motion the
     * game uses it in place of swap().
     */
    setKind(kind: FriendKind | null, grow = true) {
      endSwap()
      if (kind === (model?.kind ?? null)) { holder.visible = Boolean(model); return }
      if (!model) follow.reset()
      if (model) { holder.remove(model.root); model.dispose() }
      model = kind ? createFriendModel(kind, sparkle) : null
      model?.setColour(colour)
      if (model) holder.add(model.root)
      holder.visible = Boolean(model)
      born = grow ? time : -Infinity
    },
    /**
     * Changes the friend with a goodbye and an arrival (SWAP). null is "No friend": the friend only
     * goes home. The swap runs in the time of the flight, so it waits while Worlds is open. It
     * returns false when the kind is the friend already.
     */
    swap(kind: FriendKind | null) {
      if (kind === (model?.kind ?? null)) return false
      // A swap that runs ends: the friend that goes home is gone at once.
      if (leaving) { leaver.remove(leaving.root); leaving.dispose(); leaving = null }
      // The friend at her side goes home. A friend that is not out of the sky yet just goes.
      if (model && holder.visible) {
        holder.remove(model.root)
        leaver.add(model.root)
        leaving = model
        leaveFace = face
        leaver.visible = true
      } else if (model) { holder.remove(model.root); model.dispose() }
      // With no friend at her side, the place at her side starts again from the fairy.
      if (!leaving) follow.reset()
      model = kind ? createFriendModel(kind, sparkle) : null
      model?.setColour(colour)
      if (model) holder.add(model.root)
      holder.visible = false
      born = -Infinity
      old = Boolean(leaving); next = Boolean(model); age = 0; landed = false
      return true
    },
    setColour(next: number) { colour = next; model?.setColour(next); leaving?.setColour(next) },
    /** A happy loop around her, not more often than each FRIEND.loopRest seconds. `force` is for the moment when the friend comes. No loop starts in a swap. */
    cheer(still: boolean, force = false) { return Boolean(model) && holder.visible && (force || age < 0) && follow.cheer(still, force) },
    /** One frame of the friend. A delta of 0 holds its pose and keeps it with the fairy. It returns true when a new friend comes to its place. */
    update(frame: FriendFrame) {
      if (!model && !leaving) return false
      // Reduced motion has no swap: the change is at once.
      if (frame.still && age >= 0) { endSwap(); holder.visible = Boolean(model) }
      follow.step(frame)
      time += frame.delta
      size = frame.still || Number.isNaN(size) ? frame.size : size + (frame.size - size) * (1 - Math.exp(-frame.delta * 6))
      let part: SwapPart | null = null, arrived = false
      if (age >= 0) {
        age += frame.delta
        part = swapAt(age, old, next)
        up.set(0, 1, 0).applyQuaternion(frame.heading)
        forward.set(0, 0, -1).applyQuaternion(frame.heading)
        right.set(1, 0, 0).applyQuaternion(frame.heading)
        if (leaving && part.old === 'gone') { leaver.remove(leaving.root); leaving.dispose(); leaving = null; leaver.visible = false }
        if (leaving) placeLeaving(part, frame)
        if (part.done) age = -1
      }
      if (!model) return false
      let scale = size, puff = 0
      holder.quaternion.copy(follow.quaternion)
      if (part && part.next !== 'here') {
        holder.visible = part.next === 'sky'
        // The new friend comes out of a puff in the sky ahead of her, and it grows from 35% to its size on the way.
        const k = part.nextK
        start.copy(SKY).applyQuaternion(frame.heading).add(frame.fairy)
        holder.position.lerpVectors(start, follow.position, easeOut(k))
        scale *= 0.35 + 0.65 * smooth(clamp01(k / 0.6))
        puff = 1 - smooth(clamp01(k / 0.35))
      } else {
        holder.visible = true
        holder.position.copy(follow.position)
        // A new friend grows in 0.4 s, a little over its size and back.
        const grow = frame.still ? 1 : clamp01((time - born) / 0.4)
        if (!frame.still) scale *= smooth(grow) * (1 + Math.sin(grow * Math.PI) * 0.18)
        // At its place, the new friend of a swap makes the happy loop.
        if (part && !landed) { landed = true; arrived = true; follow.cheer(false, true) }
      }
      holder.scale.setScalar(scale)
      // The friend looks where she flies, with its nose a little toward her. At times it looks back at her.
      const target = frame.menu ? 1 : frame.still || follow.loop ? 0 : friendGlance(time)
      face += (target - face) * (1 - Math.exp(-frame.delta * 6))
      model.root.rotation.set(0, Math.PI + INWARD + face * LOOK_BACK, Math.sin(follow.loop) * 0.5)
      model.animate(frame.still ? 0 : time, { loop: follow.loop, still: Boolean(frame.still), fast: frame.fast, light: frame.light, puff })
      return arrived
    },
    dispose() {
      endSwap()
      if (model) { holder.remove(model.root); model.dispose() }
      scene.remove(group)
    },
  }
}

export type Friend = ReturnType<typeof createFriend>
