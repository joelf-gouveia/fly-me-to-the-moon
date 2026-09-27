import * as THREE from 'three'
import { createFairyRig, skyDancer } from '../../src/fairy'
import type { Direction } from '../../src/fairy'
import { buildBody, jointRadii, neckBase, neckRadii, storybookBody } from '../../src/fairy-body'
import type { BodyOptions, Joints, Solid } from '../../src/fairy-body'
import { addClassicBody } from './classic-body'

type Rig = ReturnType<typeof createFairyRig>

// The study compares the body of the game from before the study with three new
// bodies. The game now uses C. Every body keeps the head, the hair, the ears,
// the wings and the Sky Dancer pose of the game, so the hair styles and the
// customization stay valid.
export const bodyIds = ['today', 'joined', 'smooth', 'storybook'] as const
export type BodyId = typeof bodyIds[number]
export type BodyInfo = { id: BodyId; letter: string; label: string; note: string; changes: string[]; turning: string[] }

export const bodies: BodyInfo[] = [
  {
    id: 'today', letter: '–', label: 'Today',
    note: 'The body of the game before this study: 26 separate shapes. Each limb is a cylinder between two points. The points move, so the limbs stretch, and the flat ends open at a bent joint.',
    changes: ['No change'],
    turning: ['Shoulders', 'Elbows', 'Hips', 'Knees'],
  },
  {
    id: 'joined', letter: 'A', label: 'Joined joints',
    note: 'Every shape of today stays. A ball fills each joint, puff sleeves close the shoulders, the hands and feet turn with the limbs, and a bow holds the wings.',
    changes: ['Balls at the shoulders, elbows, wrists, knees and ankles', 'Puff sleeves over the shoulders', 'Hands and feet turn with the limb', 'A petal bow between the wing roots'],
    turning: ['Shoulders', 'Elbows', 'Wrists', 'Hips', 'Knees', 'Ankles'],
  },
  {
    id: 'smooth', letter: 'B', label: 'One smooth body',
    note: 'A new body in the same pose. The torso and the hips are one surface with a waist. Each limb is a tapered capsule with a fixed length, and the radii meet at each joint. She has a face, mitten hands and slippers.',
    changes: ['One bodice with a waist and a sash', 'Tapered limbs with fixed bones (two-bone solve)', 'Petal skirt that starts at the waist', 'Mitten hands, slippers and a face', 'The petal bow of A'],
    turning: ['Shoulders', 'Elbows', 'Wrists', 'Hips', 'Knees', 'Ankles'],
  },
  {
    id: 'storybook', letter: 'C', label: 'Storybook fairy',
    note: 'Now in the game. B with fairy proportions and more joints. Longer, slimmer legs, a pointed petal skirt that moves with the wings, arms that float, soft wrists, pointed toes, and a head that looks where she flies.',
    changes: ['The body of B, with a smaller waist', 'Legs 12% longer and slimmer limbs', 'Arms that float: soft elbows, the hands follow the elbows', 'Pointed petals that move with the wingbeat', 'Soft wrists and pointed toes', 'The head lifts to look ahead and stays level', 'Curled slippers with a gold pom'],
    turning: ['Neck', 'Shoulders', 'Elbows', 'Wrists', 'Hips', 'Knees', 'Ankles'],
  },
]

// B: the body builder of the game with round petals, puff sleeves, the arm pose
// of the Sky Dancer study, and no head lift.
export const smoothBody: BodyOptions = {
  waist: 0.135,
  limbs: { upper: [0.054, 0.045], fore: [0.045, 0.037], thigh: [0.075, 0.059], shin: [0.059, 0.041], palm: [0.047, 0.074, 0.031] },
  legScale: 1,
  arms: { mode: 'pose' },
  skirt: [
    { count: 7, radius: 0.12, flare: 0.42, scale: [0.12, 0.26, 0.04], material: 'dress', offset: 0 },
    { count: 7, radius: 0.1, flare: 0.25, scale: [0.1, 0.23, 0.035], material: 'petals', offset: 0.5 },
  ],
  pointed: false,
  slipper: [0.056, 0.05, 0.13],
  headLift: false,
}

const sphere = new THREE.SphereGeometry(1, 16, 12)
const up = new THREE.Vector3(0, 1, 0)

function insideSolid(solid: Solid, p: THREE.Vector3) {
  if (solid.kind === 'sphere') return p.lengthSq() < 1
  const radial = Math.hypot(p.x, p.z)
  if (solid.kind === 'cylinder') return Math.abs(p.y) <= 0.5 && radial <= THREE.MathUtils.lerp(solid.r0, solid.r1, p.y + 0.5)
  if (solid.kind === 'capsule') {
    const { r0, r1, length } = solid
    if (p.y >= 0 && p.y <= length && radial <= THREE.MathUtils.lerp(r0, r1, p.y / length)) return true
    return radial ** 2 + p.y ** 2 <= r0 ** 2 || radial ** 2 + (p.y - length) ** 2 <= r1 ** 2
  }
  const profile = solid.profile
  if (p.y < profile[0][1] || p.y > profile[profile.length - 1][1]) return false
  for (let i = 1; i < profile.length; i++) {
    const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]
    if (p.y <= y1) return radial <= THREE.MathUtils.lerp(r0, r1, (p.y - y0) / Math.max(1e-6, y1 - y0))
  }
  return false
}

// A mesh with a sphere or cylinder geometry is detected from its geometry. The
// capsules and the bodice carry their solid in userData.
function solidOf(mesh: THREE.Mesh): Solid | undefined {
  if (mesh.userData.solid === false) return undefined
  if (mesh.userData.solid) return mesh.userData.solid as Solid
  const geometry = mesh.geometry
  if (geometry instanceof THREE.SphereGeometry) return { kind: 'sphere' }
  if (geometry instanceof THREE.CylinderGeometry) return { kind: 'cylinder', r0: geometry.parameters.radiusBottom, r1: geometry.parameters.radiusTop }
  return undefined
}

// Joint names. The hips are under the skirt in every body, so the fill check leaves them out.
export const sides = ['L', 'R'] as const
export const bones = [
  ['neck base', 'neck top'],
  ...sides.flatMap(s => [[`shoulder ${s}`, `elbow ${s}`], [`elbow ${s}`, `wrist ${s}`], [`hip ${s}`, `knee ${s}`], [`knee ${s}`, `ankle ${s}`]]),
] as [string, string][]
export type JointSample = { name: string; world: THREE.Vector3; radius: number; hidden?: boolean }
type Radii = ReturnType<typeof jointRadii> & { neckBase: number; neckTop: number }

// The radii of today are the ends of the cylinders: CylinderGeometry(0.82 r, r), top at the end joint.
const todayRadii: Radii = { shoulder: 0.064, elbow: 0.052, wrist: 0.0426, hip: 0.085, knee: 0.062, ankle: 0.0508, neckBase: 0.04, neckTop: 0.045 }
const builtRadii = (options: BodyOptions): Radii => ({ ...jointRadii(options), neckBase: neckRadii.base, neckTop: neckRadii.top })

export function createBodyFairy(id: BodyId) {
  // C is the rig of the game. The other bodies start from a rig without a body.
  const rig: Rig = createFairyRig({ withTrail: false, body: id === 'storybook' })
  const body = rig.root.getObjectByName('fairy-body') as THREE.Group
  const pivot = rig.root.getObjectByName('fairy-head-pivot') as THREE.Group
  const frame = rig.root.getObjectByName('fairy-head') as THREE.Group
  const m = rig.materials
  const before = new Set<THREE.Object3D>()
  body.traverse(object => before.add(object))
  const named = (name: string) => body.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.name === name)
  const part = (material: THREE.Material, scale: [number, number, number], position: [number, number, number], name: string) => {
    const mesh = new THREE.Mesh(sphere, material)
    mesh.name = name
    mesh.scale.set(...scale)
    mesh.position.set(...position)
    body.add(mesh)
    return mesh
  }

  let update: (boost: number, time: number, beat: number, lean: number) => void = () => {}
  let joints: Joints[] = rig.joints, radii = builtRadii(storybookBody)
  const toWorld = (v: THREE.Vector3) => body.localToWorld(v.clone())
  let neckBottom = () => toWorld(neckBase), neckTop = () => pivot.localToWorld(new THREE.Vector3())

  if (id === 'today' || id === 'joined') {
    const classic = addClassicBody(body, m)
    joints = rig.targets
    radii = todayRadii
    neckBottom = () => toWorld(new THREE.Vector3(0, 0.74, 0))
    neckTop = () => toWorld(new THREE.Vector3(0, 0.96, 0))
    update = boost => classic.update(rig.targets, boost)
  }

  if (id === 'joined') {
    for (const side of [-1, 1]) part(m.petals, [0.095, 0.07, 0.085], [side * 0.19, 0.715, 0], 'puff-sleeve')
    const ball = (material: THREE.Material, radius: number, name: string) => part(material, [radius, radius, radius], [0, 0, 0], name)
    const balls = rig.targets.map(() => ({
      shoulder: ball(m.skin, 0.064, 'shoulder-ball'), elbow: ball(m.skin, 0.054, 'elbow-ball'), wrist: ball(m.skin, 0.045, 'wrist-ball'),
      knee: ball(m.tights, 0.066, 'knee-ball'), ankle: ball(m.tights, 0.052, 'ankle-ball'),
    }))
    for (const side of [-1, 1]) part(m.petals, [0.105, 0.05, 0.03], [side * 0.1, 0.61, 0.15], 'wing-bow').rotation.set(0, -side * 0.2, side * 0.08)
    part(m.gold, [0.035, 0.04, 0.03], [0, 0.61, 0.155], 'wing-knot')
    const hands = named('hand'), feet = named('foot')
    const classicUpdate = update
    const axis = new THREE.Vector3(), across = new THREE.Vector3(), toe = new THREE.Vector3(), back = new THREE.Vector3(), top = new THREE.Vector3(), basis = new THREE.Matrix4()
    update = (boost, time, beat, lean) => {
      classicUpdate(boost, time, beat, lean)
      rig.targets.forEach((joint, i) => {
        for (const key of ['shoulder', 'elbow', 'wrist', 'knee', 'ankle'] as const) balls[i][key].position.copy(joint[key])
        // The hand hangs from the wrist along the forearm.
        axis.copy(joint.wrist).sub(joint.elbow).normalize()
        hands[i].quaternion.setFromUnitVectors(up, axis)
        hands[i].position.copy(joint.wrist).addScaledVector(axis, 0.06)
        // The foot turns with the shin: the toes at a right angle to it, then down by the pointe.
        axis.copy(joint.ankle).sub(joint.knee).normalize()
        across.set(1, 0, 0).addScaledVector(axis, -axis.x).normalize()
        const pointe = 0.25 + boost * 0.35
        toe.crossVectors(across, axis).multiplyScalar(Math.cos(pointe)).addScaledVector(axis, Math.sin(pointe))
        back.copy(toe).negate()
        top.crossVectors(back, across)
        basis.makeBasis(across, top, back)
        feet[i].quaternion.setFromRotationMatrix(basis)
        feet[i].position.copy(joint.ankle).addScaledVector(toe, 0.06).addScaledVector(top, -0.02)
      })
    }
  }

  if (id === 'smooth') {
    const built = buildBody(body, { pivot, frame }, m, smoothBody, skyDancer)
    joints = built.joints
    radii = builtRadii(smoothBody)
    update = (boost, time, beat, lean) => built.update(boost, time, beat, lean, rig.targets)
  }

  const jointSamples = (): JointSample[] => [
    { name: 'neck base', world: neckBottom(), radius: radii.neckBase },
    { name: 'neck top', world: neckTop(), radius: radii.neckTop },
    ...joints.flatMap((limb, i) => {
      const s = sides[i]
      return [
        { name: `shoulder ${s}`, world: toWorld(limb.shoulder), radius: radii.shoulder },
        { name: `elbow ${s}`, world: toWorld(limb.elbow), radius: radii.elbow },
        { name: `wrist ${s}`, world: toWorld(limb.wrist), radius: radii.wrist },
        { name: `hip ${s}`, world: toWorld(limb.hip), radius: radii.hip, hidden: true },
        { name: `knee ${s}`, world: toWorld(limb.knee), radius: radii.knee },
        { name: `ankle ${s}`, world: toWorld(limb.ankle), radius: radii.ankle },
      ]
    }),
  ]

  function pose(preset: Direction, boost: number, time: number, leanOverride?: number, wingPhase?: number) {
    rig.pose(preset, boost, time, leanOverride, wingPhase)
    const lean = leanOverride ?? THREE.MathUtils.lerp(preset.normal, preset.boost, boost)
    const beat = wingPhase ?? time * Math.PI * 2 * THREE.MathUtils.lerp(preset.rate, preset.fastRate, boost)
    update(boost, time, beat, lean)
  }

  // The rig swaps its own meshes; the study swaps the meshes that it added.
  const added: THREE.Mesh[] = []
  body.traverse(object => { if (object instanceof THREE.Mesh && !before.has(object)) added.push(object) })
  const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0xf3efdf, side: THREE.DoubleSide })
  const originals = new Map(added.map(mesh => [mesh, mesh.material]))
  function setSilhouette(enabled: boolean) {
    rig.setSilhouette(enabled)
    originals.forEach((material, mesh) => { mesh.material = enabled ? silhouetteMaterial : material })
  }

  pose(skyDancer, 0, 0, undefined, 0)
  return { ...rig, id, pose, setSilhouette, jointSamples }
}

export type BodyFairy = ReturnType<typeof createBodyFairy>

// Body parts for the measurements: every visible mesh except the hair and the wings.
function bodyMeshes(body: THREE.Object3D) {
  const list: THREE.Mesh[] = []
  const visit = (object: THREE.Object3D) => {
    if (!object.visible || object.name.startsWith('hair-') || object.name.startsWith('wings-')) return
    if (object instanceof THREE.Mesh) list.push(object)
    object.children.forEach(visit)
  }
  body.children.forEach(visit)
  return list
}

function solidTester(body: THREE.Object3D) {
  const solids = bodyMeshes(body).flatMap(mesh => {
    const solid = solidOf(mesh)
    if (!solid) return []
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere()
    const bound = mesh.geometry.boundingSphere!.clone().applyMatrix4(mesh.matrixWorld)
    return [{ solid, inverse: mesh.matrixWorld.clone().invert(), bound }]
  })
  const local = new THREE.Vector3()
  return (world: THREE.Vector3) => solids.some(({ solid, inverse, bound }) =>
    bound.containsPoint(world) && insideSolid(solid, local.copy(world).applyMatrix4(inverse)))
}

// Fixed points in a unit ball, so every run gives the same numbers.
const ball = (() => {
  const points: THREE.Vector3[] = []
  let seed = 7
  const random = () => (seed = seed * 16807 % 2147483647) / 2147483647
  while (points.length < 160) {
    const point = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1)
    if (point.lengthSq() <= 1) points.push(point)
  }
  return points
})()

export type BodyMeasurement = {
  meshes: number
  triangles: number
  // fill: the smallest part of a ball at the joint that is inside the body, through the flight cycle.
  joints: { name: string; fill: number }[]
  openJoints: number
  // stretch: the largest change of a bone length through the cycle, as a part of its mean length.
  stretch: number
  // wingGap: the distance from each upper wing root to the body, in rig units.
  wingGap: number
  // The angle of the face below the flight line, in degrees.
  faceCruise: number
  faceBoost: number
  // handTravel: the largest distance between two positions of the right hand in the body frame, through 4 s of cruise.
  handTravel: number
}

export const openBelow = 0.9

// Measures one body with the Petal wings, through a cruise and a boost wingbeat.
export function measureBody(fairy: BodyFairy): BodyMeasurement {
  const body = fairy.root.getObjectByName('fairy-body')!
  const fills = new Map<string, number>()
  const lengths = new Map<string, number[]>()
  const point = new THREE.Vector3()
  let wingGap = 0, faceCruise = 0, faceBoost = 0
  const head = fairy.root.getObjectByName('head')!
  const face = new THREE.Vector3(), quaternion = new THREE.Quaternion()
  for (let step = 0; step < 16; step++) {
    const boost = step < 8 ? 0 : 1
    fairy.pose(skyDancer, boost, step * 0.37, undefined, (step % 8) / 8 * Math.PI * 2)
    fairy.root.updateMatrixWorld(true)
    const inside = solidTester(body)
    const joints = fairy.jointSamples()
    for (const joint of joints) {
      if (joint.hidden) continue
      let count = 0
      for (const offset of ball) if (inside(point.copy(offset).multiplyScalar(joint.radius * 0.85).add(joint.world))) count++
      fills.set(joint.name, Math.min(fills.get(joint.name) ?? 1, count / ball.length))
    }
    const at = new Map(joints.map(joint => [joint.name, joint.world]))
    for (const [a, b] of bones) {
      const list = lengths.get(`${a}–${b}`) ?? []
      list.push(at.get(a)!.distanceTo(at.get(b)!))
      lengths.set(`${a}–${b}`, list)
    }
    // Wing roots: walk from each upper root toward the middle of the body until the walk is inside it.
    const wings = fairy.root.getObjectByName('wings-petal')!
    for (const pivot of [wings.children[0], wings.children[2]]) {
      const start = pivot.getWorldPosition(new THREE.Vector3())
      const goal = body.localToWorld(new THREE.Vector3(0, pivot.position.y, 0))
      const walk = goal.clone().sub(start)
      const total = walk.length()
      walk.normalize()
      let gap = 0
      while (gap < total && !inside(point.copy(start).addScaledVector(walk, gap))) gap += 0.004
      wingGap = Math.max(wingGap, gap)
    }
    head.getWorldQuaternion(quaternion)
    face.set(0, 0, -1).applyQuaternion(quaternion)
    const below = THREE.MathUtils.radToDeg(Math.atan2(-face.y, -face.z))
    if (step === 0) faceCruise = below
    if (step === 8) faceBoost = below
  }
  const hands: THREE.Vector3[] = []
  for (let step = 0; step < 24; step++) {
    fairy.pose(skyDancer, 0, step * 0.17)
    fairy.root.updateMatrixWorld(true)
    hands.push(body.worldToLocal(fairy.jointSamples().find(joint => joint.name === 'wrist R')!.world))
  }
  const handTravel = Math.max(...hands.flatMap(a => hands.map(b => a.distanceTo(b))))
  fairy.pose(skyDancer, 0, 0, undefined, 0)
  fairy.root.updateMatrixWorld(true)
  let stretch = 0
  for (const list of lengths.values()) {
    const mean = list.reduce((sum, value) => sum + value, 0) / list.length
    stretch = Math.max(stretch, (Math.max(...list) - Math.min(...list)) / mean)
  }
  const meshes = bodyMeshes(body)
  const triangles = meshes.reduce((sum, mesh) => {
    const index = mesh.geometry.getIndex()
    return sum + (index ? index.count : mesh.geometry.getAttribute('position').count) / 3
  }, 0)
  const joints = [...fills].map(([name, fill]) => ({ name, fill }))
  return { meshes: meshes.length, triangles, joints, openJoints: joints.filter(joint => joint.fill < openBelow).length, stretch, wingGap, faceCruise, faceBoost, handTravel }
}
