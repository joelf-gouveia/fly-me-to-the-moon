import * as THREE from 'three'
import { hairOptions, wingOptions } from '../../src/customization'
import type { FairyLook, HairStyle, WingStyle } from '../../src/customization'
import { skyDancer } from '../../src/fairy'
import type { createFairyRig } from '../../src/fairy'
import { createHairKit, hairMotion, onCap } from '../../src/fairy-hair'

type Rig = ReturnType<typeof createFairyRig>

// The study compares the three original styles with eight candidates. Six of
// the candidates are now in the game; Pixie and Crown braid stay in the study.
export const originalIds = ['bun', 'bob', 'tails'] as const
export const candidateIds = ['pixie', 'spaceBuns', 'cloudCurls', 'ponytail', 'crownBraid', 'braid', 'twinBraids', 'longWaves'] as const
const studyOnlyIds = ['pixie', 'crownBraid'] as const
export type CandidateId = typeof candidateIds[number]
type StudyOnly = typeof studyOnlyIds[number]
export type StudyStyle = HairStyle | CandidateId
export type Family = 'Short' | 'Up' | 'Down'

// inGame: one of the three original styles. adopted: a candidate that the game now has.
export type StyleInfo = { id: StudyStyle; label: string; family: Family; inGame: boolean; adopted: boolean; moves: boolean; note: string }

const originalInfo: Record<typeof originalIds[number], Omit<StyleInfo, 'id' | 'label' | 'inGame' | 'adopted'>> = {
  bun: { family: 'Up', moves: false, note: 'The first look. One round bun on the crown with a gold band.' },
  bob: { family: 'Short', moves: false, note: 'Two soft sides frame the face. From behind, the head is wide and round.' },
  tails: { family: 'Down', moves: false, note: 'Two short tails with gold ties at the sides of the head.' },
}

export const candidateInfo: Record<CandidateId, Omit<StyleInfo, 'id' | 'inGame' | 'adopted'>> = {
  pixie: { label: 'Pixie', family: 'Short', moves: false, note: 'A short crop with small tufts at the crown and the nape, and a swept fringe at the front.' },
  spaceBuns: { label: 'Space buns', family: 'Up', moves: false, note: 'Two buns high on the head, each with a gold band. From behind, they look like two small ears.' },
  cloudCurls: { label: 'Cloud curls', family: 'Short', moves: false, note: 'A full cloud of round curls around the head. The ears stay out of the cloud.' },
  ponytail: { label: 'Ponytail', family: 'Up', moves: true, note: 'A tail from high on the back of the head. It swings behind her and straightens in boost.' },
  crownBraid: { label: 'Crown braid', family: 'Up', moves: false, note: 'A braid around the head like a crown, with three gold pearls at the back.' },
  braid: { label: 'Long braid', family: 'Down', moves: true, note: 'One braid down the middle of the back, between the wing roots, with a gold tie.' },
  twinBraids: { label: 'Twin braids', family: 'Down', moves: true, note: 'Two braids from the nape to the shoulder blades. They swing a little out of step.' },
  longWaves: { label: 'Long waves', family: 'Down', moves: true, note: 'Long wavy hair that narrows to a point between the wing roots.' },
}

const inGame = (id: string) => hairOptions.some(option => option.id === id)
export const studyStyles: StyleInfo[] = [
  ...originalIds.map(id => ({ id, label: hairOptions.find(option => option.id === id)!.label, inGame: true, adopted: false, ...originalInfo[id] })),
  ...candidateIds.map(id => ({ id, inGame: false, adopted: inGame(id), ...candidateInfo[id] })),
]

export const motionLevels = hairMotion
export type Motion = keyof typeof hairMotion

function isStudyOnly(id: string): id is StudyOnly {
  return (studyOnlyIds as readonly string[]).includes(id)
}

// Adds Pixie and Crown braid to a rig built by createFairyRig. The groups go in
// the head frame, so they turn with the head, and they use the rig's own hair
// and gold materials, so applyLook colors them too. The rig already has every
// other style.
export function addStudyHair(rig: Rig) {
  const body = rig.root.getObjectByName('fairy-head') as THREE.Group
  const bun = rig.root.getObjectByName('hair-bun')!
  const hair = (bun.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial
  const gold = (bun.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial
  const { blob } = createHairKit(hair, gold)
  const groups = Object.fromEntries(studyOnlyIds.map(id => {
    const group = new THREE.Group()
    group.name = `hair-${id}`
    group.visible = false
    body.add(group)
    return [id, group]
  })) as Record<StudyOnly, THREE.Group>

  // Pixie: small tufts that break the round outline of the cap.
  blob(groups.pixie, hair, [0.075, 0.05, 0.1], onCap([0, 1, 0.75], 1.02), [-0.65, 0, 0])
  for (const side of [-1, 1]) {
    blob(groups.pixie, hair, [0.065, 0.045, 0.09], onCap([side * 0.55, 0.9, 0.6], 1.02), [-0.5, 0, side * 0.45])
    blob(groups.pixie, hair, [0.07, 0.06, 0.05], onCap([side * 0.45, -0.55, 0.75], 1.03), [0, 0, side * 0.3])
  }
  blob(groups.pixie, hair, [0.06, 0.06, 0.05], onCap([0, -0.6, 1], 1.03))
  blob(groups.pixie, hair, [0.16, 0.065, 0.07], [0.07, 1.31, -0.155], [0, 0.2, -0.35])

  // Crown braid: beads around the head that twist in turn, higher at the front.
  const beads = 16
  for (let i = 0; i < beads; i++) {
    const angle = i / beads * Math.PI * 2
    const [rx, rz, cz] = [0.245, 0.22, 0.03]
    const position = new THREE.Vector3(Math.sin(angle) * rx, 1.3 - Math.cos(angle) * 0.035, cz + Math.cos(angle) * rz)
    const heading = Math.atan2(Math.cos(angle) * rx, -Math.sin(angle) * rz)
    blob(groups.crownBraid, hair, [0.048, 0.04, 0.066], position, [0, heading, i % 2 ? 0.55 : -0.55])
  }
  for (const angle of [-0.38, 0, 0.38]) {
    blob(groups.crownBraid, gold, [0.026, 0.026, 0.026], [Math.sin(angle) * 0.29, 1.265, 0.03 + Math.cos(angle) * 0.265])
  }

  function show(style: StudyStyle, look: FairyLook) {
    rig.applyLook({ ...look, hair: isStudyOnly(style) ? 'bun' : style })
    if (isStudyOnly(style)) rig.root.getObjectByName('hair-bun')!.visible = false
    for (const id of studyOnlyIds) groups[id].visible = id === style
  }

  // The swing of the game, at the chosen amount (pose() applies gentle).
  function animate(time: number, boost: number, motion: Motion) {
    rig.animateHair(time, boost, hairMotion[motion])
  }

  const silhouetteMaterial = new THREE.MeshBasicMaterial({ color: 0xf3efdf, side: THREE.DoubleSide })
  const meshes: [THREE.Mesh, THREE.Material][] = []
  for (const id of studyOnlyIds) groups[id].traverse(object => { if (object instanceof THREE.Mesh) meshes.push([object, object.material as THREE.Material]) })
  function setSilhouette(enabled: boolean) {
    rig.setSilhouette(enabled)
    for (const [mesh, material] of meshes) mesh.material = enabled ? silhouetteMaterial : material
  }

  return { show, animate, setSilhouette }
}

export type StudyHair = ReturnType<typeof addStudyHair>

function styleGroup(rig: Rig, style: StudyStyle) {
  return rig.root.getObjectByName(`hair-${style}`)!
}

function meshesOf(object: THREE.Object3D) {
  const list: THREE.Mesh[] = []
  object.traverse(child => { if (child instanceof THREE.Mesh) list.push(child) })
  return list
}

// Every hair part is a scaled unit sphere: a point is inside a part when its
// local length is less than one. Call again after each pose.
function partTester(parts: THREE.Mesh[]) {
  const inverses = parts.map(part => part.matrixWorld.clone().invert())
  const bounds = new THREE.Box3()
  parts.forEach(part => bounds.expandByObject(part))
  const point = new THREE.Vector3()
  return (world: THREE.Vector3) => bounds.containsPoint(world)
    && inverses.some(inverse => point.copy(world).applyMatrix4(inverse).lengthSq() < 1)
}

function settle(rig: Rig, hair: StudyHair, boost: number, time: number, motion: Motion, wingPhase?: number) {
  rig.pose(skyDancer, boost, time, undefined, wingPhase)
  hair.animate(time, boost, motion)
  rig.root.updateMatrixWorld(true)
}

// earsVisible: the outer half of each ear is outside the hair. attached: every part joins the
// cap, directly or through other parts. hairArea: all hair that the rear camera sees.
// beyondCap: the part of it that is not over the cap.
export type Measurement = { meshes: number; earsVisible: boolean; attached: boolean; wingContact: WingStyle[]; hairArea: number; beyondCap: number }

// Points on the outer half of an ear cone (height 0.17, radius 0.06), from the middle to the tip.
function outerEar(ear: THREE.Mesh) {
  const points: THREE.Vector3[] = []
  for (const t of [0.5, 0.625, 0.75, 0.875, 1]) {
    const y = -0.085 + 0.17 * t, radius = 0.06 * (1 - t)
    points.push(ear.localToWorld(new THREE.Vector3(0, y, 0)))
    for (let k = 0; radius > 0 && k < 5; k++) {
      const angle = k / 5 * Math.PI * 2
      points.push(ear.localToWorld(new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius)))
    }
  }
  return points
}

// Two parts join when the center or a surface point of one is inside the other.
function joined(a: THREE.Mesh, b: THREE.Mesh) {
  const inverse = b.matrixWorld.clone().invert(), point = new THREE.Vector3()
  const position = a.geometry.getAttribute('position')
  if (point.setFromMatrixPosition(a.matrixWorld).applyMatrix4(inverse).lengthSq() < 1) return true
  for (let i = 0; i < position.count; i++) {
    if (point.fromBufferAttribute(position, i).applyMatrix4(a.matrixWorld).applyMatrix4(inverse).lengthSq() < 1) return true
  }
  return false
}

function allJoined(capMesh: THREE.Mesh, parts: THREE.Mesh[]) {
  const reached = new Set<THREE.Mesh>([capMesh]), queue = [capMesh]
  while (queue.length) {
    const current = queue.shift()!
    for (const part of parts) {
      if (!reached.has(part) && (joined(part, current) || joined(current, part))) { reached.add(part); queue.push(part) }
    }
  }
  return parts.every(part => reached.has(part))
}

function capOf(body: THREE.Object3D) {
  return body.getObjectByName('hair-cap') as THREE.Mesh
}

// Measures one style on the given rig, then restores the look and the rest pose.
export function measureStyle(rig: Rig, hair: StudyHair, style: StudyStyle, look: FairyLook): Measurement {
  hair.show(style, look)
  const parts = meshesOf(styleGroup(rig, style))
  const body = rig.root.getObjectByName('fairy-body')!

  // Ears: the outer half of each cone must stay outside every hair part.
  settle(rig, hair, 0, 0, 'still')
  const ears = meshesOf(body).filter(mesh => mesh.name === 'ear')
  const insideHair = partTester(parts)
  const earsVisible = ears.every(ear => outerEar(ear).every(point => !insideHair(point)))
  const attached = allJoined(capOf(body), parts)
  const { hairArea, beyondCap } = areaFromBehind(body, parts)

  // Wings: sample each wing surface through a full beat, at cruise and boost, with lively motion.
  const wingContact: WingStyle[] = []
  for (const { id: wings } of wingOptions) {
    hair.show(style, { ...look, wings })
    const wingMeshes = meshesOf(rig.root.getObjectByName(`wings-${wings}`)!)
    const samples = wingMeshes.map(surfaceSamples)
    let touches = false
    for (let step = 0; step < 48 && !touches; step++) {
      const boost = step % 2
      settle(rig, hair, boost, step * 0.37, 'lively', step / 48 * Math.PI * 2)
      const test = partTester(parts)
      const world = new THREE.Vector3()
      touches = wingMeshes.some((mesh, i) => samples[i].some(point => test(world.copy(point).applyMatrix4(mesh.matrixWorld))))
    }
    if (touches) wingContact.push(wings)
  }
  hair.show(style, look)
  settle(rig, hair, 0, 0, 'still')
  return { meshes: parts.length, earsVisible, attached, wingContact, hairArea, beyondCap }
}

// Triangle corners, centers and edge midpoints of a mesh, in local space.
function surfaceSamples(mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute('position')
  const index = mesh.geometry.getIndex()
  const points: THREE.Vector3[] = []
  const count = index ? index.count : position.count
  for (let i = 0; i < count; i += 3) {
    const [a, b, c] = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i + k) : i + k))
    points.push(a, b, c, a.clone().add(b).add(c).divideScalar(3), a.clone().lerp(b, 0.5), b.clone().lerp(c, 0.5), c.clone().lerp(a, 0.5))
  }
  return points
}

// Areas that the rear game camera sees (2.8 up and 8 back: 19° above), in the cruise pose, in rig units
// squared, from parallel rays through a 0.01 grid. The skin of the head and the
// hands hides hair behind it (the ray test is for unit spheres, so the capsule neck is not in it).
export function areaFromBehind(body: THREE.Object3D, parts: THREE.Mesh[]) {
  body.updateMatrixWorld(true)
  const capMesh = capOf(body)
  const skinMaterial = (body.getObjectByName('head') as THREE.Mesh).material
  const skin = meshesOf(body).filter(mesh => mesh.visible && mesh.material === skinMaterial && mesh.geometry instanceof THREE.SphereGeometry)
  const elevation = Math.atan2(2.8, 8)
  const toCamera = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation))
  const right = new THREE.Vector3(1, 0, 0)
  const up = toCamera.clone().cross(right)
  const ray = new THREE.Ray(), local = new THREE.Ray(), hitPoint = new THREE.Vector3()
  const origin = new THREE.Vector3(), unit = new THREE.Sphere(new THREE.Vector3(), 1)
  const nearest = (meshes: THREE.Mesh[]) => {
    const tests = meshes.map(mesh => {
      const inverse = mesh.matrixWorld.clone().invert()
      return () => {
        local.copy(ray).applyMatrix4(inverse)
        if (local.distanceSqToPoint(origin) >= 1 || !local.intersectSphere(unit, hitPoint)) return Infinity
        return hitPoint.applyMatrix4(mesh.matrixWorld).distanceTo(ray.origin)
      }
    })
    return () => tests.reduce((best, test) => Math.min(best, test()), Infinity)
  }
  const style = nearest(parts), capHit = nearest([capMesh]), skinHit = nearest(skin)
  const step = 0.01
  let hair = 0, outside = 0
  for (let u = -0.6; u <= 0.6; u += step) {
    for (let v = 0.1; v <= 1.8; v += step) {
      ray.origin.copy(right).multiplyScalar(u).addScaledVector(up, v).addScaledVector(toCamera, 5)
      ray.direction.copy(toCamera).negate()
      const styleDistance = style(), capDistance = capHit(), skinDistance = skinHit()
      const hairDistance = Math.min(styleDistance, capDistance)
      if (hairDistance === Infinity || skinDistance < hairDistance) continue
      hair++
      if (capDistance === Infinity) outside++
    }
  }
  return { hairArea: hair * step * step, beyondCap: outside * step * step }
}
