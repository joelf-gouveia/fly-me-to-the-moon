import * as THREE from 'three'
import type { Direction } from './fairy'

type Vec3 = [number, number, number]
export type Materials = Record<'skin' | 'dress' | 'petals' | 'tights' | 'shoes' | 'hair' | 'gold', THREE.MeshStandardMaterial>
export type Joints = { shoulder: THREE.Vector3; elbow: THREE.Vector3; wrist: THREE.Vector3; hip: THREE.Vector3; knee: THREE.Vector3; ankle: THREE.Vector3 }

// The volume of a part, for the measurements of the body study (src/body-study).
export type Solid =
  | { kind: 'sphere' }
  | { kind: 'cylinder'; r0: number; r1: number }
  | { kind: 'capsule'; r0: number; r1: number; length: number }
  | { kind: 'lathe'; profile: readonly (readonly [number, number])[] }

const sphere = new THREE.SphereGeometry(1, 16, 12)
const up = new THREE.Vector3(0, 1, 0)

// A sphere-swept cone along +y: radius r0 at y = 0 and r1 at y = length. Two
// capsules that share a point and a radius meet with no seam at any angle.
const capsules = new Map<string, THREE.BufferGeometry>()
export function taperedCapsule(r0: number, r1: number, length: number) {
  const key = `${r0}|${r1}|${length}`
  let geometry = capsules.get(key)
  if (!geometry) {
    const points: THREE.Vector2[] = []
    for (let i = 0; i <= 6; i++) {
      const angle = -Math.PI / 2 + i / 6 * Math.PI / 2
      points.push(new THREE.Vector2(Math.cos(angle) * r0, Math.sin(angle) * r0))
    }
    for (let i = 0; i <= 6; i++) {
      const angle = i / 6 * Math.PI / 2
      points.push(new THREE.Vector2(Math.cos(angle) * r1, length + Math.sin(angle) * r1))
    }
    geometry = new THREE.LatheGeometry(points, 14)
    capsules.set(key, geometry)
  }
  return geometry
}

// A petal with a pointed tip at the bottom: the lower half of a sphere narrows to a point.
let pointedPetal: THREE.BufferGeometry | undefined
function petalGeometry() {
  if (pointedPetal) return pointedPetal
  const geometry = new THREE.SphereGeometry(1, 16, 12)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    const narrow = y < 0 ? Math.pow(1 + y, 0.75) : 1
    position.setX(i, position.getX(i) * narrow)
    position.setZ(i, position.getZ(i) * narrow + position.getX(i) ** 2 * 0.35)
  }
  geometry.computeVertexNormals()
  pointedPetal = geometry
  return geometry
}

// Two-bone solve: the middle joint lies on the side of the pole, and the bone
// lengths never change. A target out of reach gives a straight limb.
export function solveLimb(root: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3, l1: number, l2: number, mid: THREE.Vector3, end: THREE.Vector3) {
  const direction = target.clone().sub(root)
  const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4)
  direction.normalize()
  const bend = pole.clone().sub(root)
  bend.addScaledVector(direction, -bend.dot(direction))
  if (bend.lengthSq() < 1e-10) bend.set(0, 0, 1).addScaledVector(direction, -direction.z)
  bend.normalize()
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance)
  const height = Math.sqrt(Math.max(0, l1 * l1 - along * along))
  mid.copy(root).addScaledVector(direction, along).addScaledVector(bend, height)
  end.copy(root).addScaledVector(direction, distance)
}

export function createJoints(): Joints[] {
  return [0, 1].map(() => ({ shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), wrist: new THREE.Vector3(), hip: new THREE.Vector3(), knee: new THREE.Vector3(), ankle: new THREE.Vector3() }))
}

// The joint targets of a flight direction, in the body frame, left side first.
// These are the limb points of the flight pose study. The legs of every body
// and the arms of a body with the 'pose' arms reach them.
export function poseTargets(preset: Direction, boost: number, time: number, out: Joints[]) {
  const dancer = preset.id === 'swimmer' ? 1 : 0
  const compact = preset.id === 'dart' ? 1 : 0
  const spread = THREE.MathUtils.lerp(0.53 + dancer * 0.13 - compact * 0.12, dancer ? 0.62 : 0.31, boost)
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1, joint = out[i]
    joint.shoulder.set(side * 0.23, 0.71, 0)
    joint.elbow.set(side * (spread - 0.07), 0.34 + dancer * boost * 0.36, 0.03 - dancer * boost * 0.28)
    joint.wrist.set(side * spread, 0.07 + dancer * boost * 0.66, 0.02 + boost * 0.17 - dancer * boost * 0.95)
    const stagger = (i === 0 ? 0.12 : -0.04) * (1 - boost) + Math.sin(time * 1.8 + i) * dancer * 0.035
    joint.hip.set(side * 0.13, -0.1, 0)
    joint.knee.set(side * (0.17 - boost * 0.03), -0.48 + stagger, 0.08)
    joint.ankle.set(side * (0.22 - boost * 0.08), -0.86 - boost * 0.12 + stagger, 0.31 * (1 - boost) + 0.04)
  }
  return out
}

type Ring = { count: number; radius: number; flare: number; scale: Vec3; material: 'dress' | 'petals'; offset: number }
export type BodyOptions = {
  waist: number
  limbs: { upper: [number, number]; fore: [number, number]; thigh: [number, number]; shin: [number, number]; palm: Vec3 }
  legScale: number
  // float: the arms have their own soft pose and move; pose: the arms reach the pose targets.
  arms: { mode: 'float'; length: [number, number] } | { mode: 'pose' }
  skirt: Ring[]
  pointed: boolean
  slipper: Vec3
  headLift: boolean
}

// The body of the game: C of the body study (docs/fairy-body-study.md).
export const storybookBody: BodyOptions = {
  waist: 0.118,
  limbs: { upper: [0.05, 0.041], fore: [0.041, 0.033], thigh: [0.07, 0.053], shin: [0.053, 0.036], palm: [0.043, 0.068, 0.028] },
  legScale: 1.12,
  arms: { mode: 'float', length: [0.34, 0.3] },
  skirt: [
    { count: 8, radius: 0.12, flare: 0.5, scale: [0.11, 0.27, 0.035], material: 'dress', offset: 0 },
    { count: 8, radius: 0.1, flare: 0.3, scale: [0.09, 0.22, 0.03], material: 'petals', offset: 0.5 },
  ],
  pointed: true,
  slipper: [0.046, 0.043, 0.12],
  headLift: true,
}

export const neckRadii = { base: 0.055, top: 0.05 }
export const neckBase = new THREE.Vector3(0, 0.7, 0)

// The radius of each limb at each joint.
export function jointRadii(options: BodyOptions) {
  const { upper, fore, thigh, shin } = options.limbs
  return { shoulder: upper[0], elbow: fore[0], wrist: fore[1], hip: thigh[0], knee: shin[0], ankle: shin[1] }
}

// Builds a body of one piece on the body group of the rig. The head pivot turns
// at the top of the neck; the head frame inside it holds the head, the hair and
// the face in body coordinates. Every part uses the shared materials, so
// applyLook colors it.
export function buildBody(body: THREE.Group, head: { pivot: THREE.Group; frame: THREE.Group }, m: Materials, options: BodyOptions, preset: Direction) {
  function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, scale: Vec3, position: Vec3 | THREE.Vector3, name = '') {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    mesh.scale.set(...scale)
    if (position instanceof THREE.Vector3) mesh.position.copy(position)
    else mesh.position.set(...position)
    parent.add(mesh)
    return mesh
  }
  function capsule(parent: THREE.Object3D, material: THREE.Material, r0: number, r1: number, length: number, name: string) {
    const mesh = part(parent, taperedCapsule(r0, r1, length), material, [1, 1, 1], [0, 0, 0], name)
    mesh.userData.solid = { kind: 'capsule', r0, r1, length } satisfies Solid
    return mesh
  }
  const direction = new THREE.Vector3()
  function place(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
    mesh.position.copy(a)
    mesh.quaternion.setFromUnitVectors(up, direction.copy(b).sub(a).normalize())
  }

  // Bodice: one lathe surface from the hips to the neck, flattened front to back.
  const waist = options.waist
  const profile = [[0, -0.1], [0.12, -0.09], [0.165, 0], [0.17, 0.08], [waist + 0.005, 0.2], [waist, 0.27], [0.16, 0.4], [0.19, 0.52], [0.198, 0.6], [0.19, 0.66], [0.15, 0.71], [0.08, 0.755], [0, 0.775]] as const
  const bodice = part(body, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), m.dress, [1, 1, 0.68], [0, 0, 0], 'bodice')
  bodice.userData.solid = { kind: 'lathe', profile } satisfies Solid
  const sash = part(body, new THREE.TorusGeometry(waist + 0.004, 0.014, 6, 28), m.gold, [1, 0.68, 1], [0, 0.245, 0], 'sash')
  sash.rotation.x = Math.PI / 2
  sash.userData.solid = false

  // A bow between the wing roots. Each lobe reaches its wing root, and the knot touches the back.
  for (const side of [-1, 1]) {
    const lobe = part(body, sphere, m.petals, [0.105, 0.05, 0.03], [side * 0.1, 0.61, 0.15], 'wing-bow')
    lobe.rotation.set(0, -side * 0.2, side * 0.08)
  }
  part(body, sphere, m.gold, [0.035, 0.04, 0.03], [0, 0.61, 0.155], 'wing-knot')

  // A face on the front (-z) of the head. The rear camera of the game rarely sees it.
  const faceCenter = new THREE.Vector3(0, 1.12, -0.015), faceRadii = new THREE.Vector3(0.23, 0.26, 0.21)
  const eye = new THREE.MeshStandardMaterial({ color: 0x33243a, roughness: 0.35 })
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const blush = new THREE.MeshStandardMaterial({ color: 0xff8fa8, roughness: 0.9, transparent: true, opacity: 0.4, depthWrite: false })
  const lips = new THREE.MeshStandardMaterial({ color: 0xa8506a, roughness: 0.6 })
  const face = (d: Vec3, material: THREE.Material, scale: Vec3, lift = 1) => {
    const n = new THREE.Vector3(...d).normalize()
    const mesh = part(head.frame, sphere, material, scale, n.clone().multiply(faceRadii).multiplyScalar(lift).add(faceCenter), 'face')
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.divide(faceRadii).normalize())
    mesh.userData.solid = false
  }
  for (const side of [-1, 1]) {
    face([side * 0.36, -0.06, -1], eye, [0.028, 0.04, 0.014], 0.99)
    face([side * 0.33, 0.0, -1], shine, [0.009, 0.011, 0.006], 1.03)
    face([side * 0.56, -0.3, -1], blush, [0.042, 0.024, 0.01], 1.0)
  }
  face([0, -0.4, -1], lips, [0.022, 0.009, 0.008], 0.995)

  // Petal skirt: pivots on a ring at the waist. Each petal starts inside the bodice.
  const petals: { tilt: THREE.Group; flare: number; phase: number }[] = []
  for (const ring of options.skirt) {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i + ring.offset) / ring.count * Math.PI * 2
      const turn = new THREE.Group()
      turn.position.set(Math.sin(angle) * ring.radius, 0.2, Math.cos(angle) * ring.radius * 0.68)
      turn.rotation.y = angle
      const tilt = new THREE.Group()
      tilt.rotation.x = -ring.flare
      turn.add(tilt)
      body.add(turn)
      const petal = part(tilt, options.pointed ? petalGeometry() : sphere, m[ring.material], ring.scale, [0, -ring.scale[1] * 0.78, 0], 'skirt-petal')
      petal.userData.solid = false
      petals.push({ tilt, flare: ring.flare, phase: angle })
    }
  }
  // Sleeves: soft puffs, or two pointed petals over each shoulder.
  for (const side of [-1, 1]) {
    if (!options.pointed) part(body, sphere, m.petals, [0.085, 0.065, 0.08], [side * 0.19, 0.715, 0], 'puff-sleeve')
    else for (const [k, material] of [[0, m.dress], [1, m.petals]] as const) {
      const sleeve = part(body, petalGeometry(), material, [0.06, 0.1, 0.03], [side * (0.2 + k * 0.01), 0.7, k ? 0.03 : -0.03], 'petal-sleeve')
      sleeve.rotation.set(k ? 0.35 : -0.35, 0, side * 1.15)
      sleeve.userData.solid = false
    }
  }

  // Neck: a capsule from the bodice to the head pivot, then one in the pivot up into the head.
  capsule(body, m.skin, neckRadii.base, neckRadii.top, 0.2, 'neck').position.copy(neckBase)
  capsule(head.pivot, m.skin, neckRadii.top, 0.047, 0.1, 'neck-top')

  // Bones with fixed lengths. The legs reach the pose targets, 12% further from
  // the hip in the storybook body. The bone lengths are the mean lengths of the
  // targets, a little longer when the longest reach needs it.
  const r = options.limbs
  const shoulders = [-1, 1].map(side => new THREE.Vector3(side * 0.19, 0.7, 0))
  const hips = [-1, 1].map(side => new THREE.Vector3(side * 0.09, -0.04, 0))
  const legTarget = (targets: Joints[], i: number, key: 'knee' | 'ankle', out: THREE.Vector3) =>
    out.copy(targets[i][key]).sub(targets[i].hip).multiplyScalar(options.legScale).add(hips[i])
  const probe = createJoints(), point = new THREE.Vector3()
  let arm = [0, 0], leg = [0, 0], reachArm = 0, reachLeg = 0
  const samples = 24
  for (let k = 0; k < samples; k++) {
    poseTargets(preset, k % 2, k * 0.29, probe)
    for (let i = 0; i < 2; i++) {
      const j = probe[i]
      arm = [arm[0] + j.shoulder.distanceTo(j.elbow), arm[1] + j.elbow.distanceTo(j.wrist)]
      leg = [leg[0] + j.hip.distanceTo(j.knee) * options.legScale, leg[1] + j.knee.distanceTo(j.ankle) * options.legScale]
      reachArm = Math.max(reachArm, shoulders[i].distanceTo(j.wrist))
      reachLeg = Math.max(reachLeg, hips[i].distanceTo(legTarget(probe, i, 'ankle', point)))
    }
  }
  const fit = (sum: number[], reach: number) => {
    const mean = sum.map(value => value / (samples * 2))
    const scale = Math.max(1, reach * 1.01 / (mean[0] + mean[1]))
    return mean.map(value => value * scale)
  }
  const armLength = options.arms.mode === 'float' ? options.arms.length : fit(arm, reachArm)
  const legLength = fit(leg, reachLeg)
  const joints: Joints[] = [0, 1].map(i => ({ shoulder: shoulders[i], elbow: new THREE.Vector3(), wrist: new THREE.Vector3(), hip: hips[i], knee: new THREE.Vector3(), ankle: new THREE.Vector3() }))

  // Hands: a mitten and a thumb that turn with the forearm. flex bends the fingers toward the palm.
  const basis = new THREE.Matrix4(), axisX = new THREE.Vector3(), axisY = new THREE.Vector3(), axisZ = new THREE.Vector3()
  function poseHand(group: THREE.Object3D, elbow: THREE.Vector3, wrist: THREE.Vector3, side: number, flex: number) {
    axisY.copy(wrist).sub(elbow).normalize()
    axisZ.set(0, axisY.z * side, -axisY.y * side).normalize()
    const fingers = axisY.clone().multiplyScalar(Math.cos(flex)).addScaledVector(axisZ, Math.sin(flex))
    axisZ.multiplyScalar(Math.cos(flex)).addScaledVector(axisY, -Math.sin(flex))
    axisX.crossVectors(fingers, axisZ)
    basis.makeBasis(axisX, fingers, axisZ)
    group.quaternion.setFromRotationMatrix(basis)
    group.position.copy(wrist)
  }
  // Feet: the toes point at a right angle to the shin, then turn down toward the shin line by pointe.
  function poseFoot(group: THREE.Object3D, knee: THREE.Vector3, ankle: THREE.Vector3, pointe: number) {
    const shin = ankle.clone().sub(knee).normalize()
    axisX.set(1, 0, 0).addScaledVector(shin, -shin.x).normalize()
    const toe = new THREE.Vector3().crossVectors(axisX, shin)
    toe.multiplyScalar(Math.cos(pointe)).addScaledVector(shin, Math.sin(pointe))
    axisZ.copy(toe).negate()
    axisY.crossVectors(axisZ, axisX)
    basis.makeBasis(axisX, axisY, axisZ)
    group.quaternion.setFromRotationMatrix(basis)
    group.position.copy(ankle)
  }
  const limbs = [0, 1].map(i => {
    const side = i ? 1 : -1
    const hand = new THREE.Group()
    hand.name = 'hand'
    body.add(hand)
    part(hand, sphere, m.skin, r.palm, [0, r.palm[1] * 0.85, 0])
    part(hand, sphere, m.skin, [r.palm[0] * 0.38, r.palm[1] * 0.45, r.palm[2] * 0.6], [side * r.palm[0] * 0.9, r.palm[1] * 0.55, -r.palm[2] * 0.4])
    const foot = new THREE.Group()
    foot.name = 'slipper'
    body.add(foot)
    part(foot, sphere, m.shoes, options.slipper, [0, -0.02, -0.055])
    if (options.pointed) {
      const tip = part(foot, new THREE.ConeGeometry(0.02, 0.07, 8), m.shoes, [1, 1, 1], [0, 0, -0.18])
      tip.rotation.x = -Math.PI / 2 + 0.75
      part(foot, sphere, m.gold, [0.017, 0.017, 0.017], [0, 0.028, -0.212])
    }
    return {
      upper: capsule(body, m.skin, r.upper[0], r.upper[1], armLength[0], 'upper-arm'),
      fore: capsule(body, m.skin, r.fore[0], r.fore[1], armLength[1], 'forearm'),
      thigh: capsule(body, m.tights, r.thigh[0], r.thigh[1], legLength[0], 'thigh'),
      shin: capsule(body, m.tights, r.shin[0], r.shin[1], legLength[1], 'shin'),
      hand,
      foot,
    }
  })

  // Floating arms: in cruise the arms rest low and a little out, with the elbows
  // down, out and back. In boost the hands reach ahead along the flight line,
  // diagonally out; at 66° of lean the flight line is mostly up along the body.
  // Each arm follows a slow wave of two frequencies, the left and the right out
  // of step. The hand follows the elbow 0.45 s later and trails the body bob, so
  // the arm bends and flows. Boost calms the motion.
  const float = options.arms.mode === 'float'
  const wave = (t: number, phase: number) => Math.sin(t * 1.55 + phase) + 0.45 * Math.sin(t * 2.6 + phase * 1.7)
  const reach = new THREE.Vector3(), drift = new THREE.Vector3(), wristTarget = new THREE.Vector3(), elbowPole = new THREE.Vector3()
  function armTargets(targets: Joints[], i: number, boost: number, time: number) {
    if (!float) {
      wristTarget.copy(targets[i].wrist)
      elbowPole.copy(targets[i].elbow)
      return
    }
    const side = i ? 1 : -1, phase = i * 2.2, calm = 1 - boost * 0.65
    wristTarget.set(side * 0.26, -0.44, -0.06).lerp(reach.set(side * 0.4, 0.62, -0.68).setLength(0.62), boost).add(shoulders[i])
    elbowPole.set(side * 0.4, -0.4, 0.3).lerp(reach.set(side * 0.45, 0.1, 0.1), boost).add(shoulders[i])
    const swing = wave(time, phase), follow = wave(time - 0.45, phase), rise = wave(time - 0.45, phase + 1.3)
    elbowPole.add(drift.set(side * 0.03 * swing, 0.045 * swing, -0.05 * swing).multiplyScalar(calm))
    wristTarget.add(drift.set(side * 0.05 * follow, 0.07 * rise, -0.09 * follow).multiplyScalar(calm))
    wristTarget.y += (Math.sin((time - 0.5) * 2.3) - Math.sin(time * 2.3)) * 0.025 * (1 - boost * 0.7)
  }

  let lift = 0
  const ankleTarget = new THREE.Vector3(), kneePole = new THREE.Vector3()
  function update(boost: number, time: number, beat: number, lean: number, targets: Joints[]) {
    for (let i = 0; i < 2; i++) {
      const limb = joints[i], mesh = limbs[i], side = i ? 1 : -1
      armTargets(targets, i, boost, time)
      solveLimb(limb.shoulder, wristTarget, elbowPole, armLength[0], armLength[1], limb.elbow, limb.wrist)
      solveLimb(limb.hip, legTarget(targets, i, 'ankle', ankleTarget), legTarget(targets, i, 'knee', kneePole), legLength[0], legLength[1], limb.knee, limb.ankle)
      place(mesh.upper, limb.shoulder, limb.elbow)
      place(mesh.fore, limb.elbow, limb.wrist)
      place(mesh.thigh, limb.hip, limb.knee)
      place(mesh.shin, limb.knee, limb.ankle)
      // The wrist bends last, after the hand: a soft follow-through.
      const flex = float ? 0.45 - boost * 0.3 + wave(time - 0.8, i * 2.2) * 0.1 * (1 - boost * 0.6) : 0.15
      poseHand(mesh.hand, limb.elbow, limb.wrist, side, flex)
      poseFoot(mesh.foot, limb.knee, limb.ankle, options.pointed ? 0.75 + boost * 0.45 : 0.25 + boost * 0.35)
    }
    if (options.headLift) {
      // The head looks where she flies: it lifts half the lean, up to 30°, and stays level in the sway.
      lift = Math.min(THREE.MathUtils.degToRad(lean) * 0.5, THREE.MathUtils.degToRad(30))
      head.pivot.rotation.set(lift, 0, -body.rotation.z * 0.8)
    }
    if (options.pointed) petals.forEach(({ tilt, flare, phase }) => { tilt.rotation.x = -flare - Math.sin(beat + phase) * 0.06 * (1 - boost * 0.5) })
  }

  return { joints, update, get lift() { return lift } }
}
