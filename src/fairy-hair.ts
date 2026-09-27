import * as THREE from 'three'
import { hairOptions } from './customization'
import type { HairStyle } from './customization'

type Vec3 = [number, number, number]
export type Segment = { length: number; scale: Vec3; rest: number; bend?: number; tilt?: number; accent?: boolean }
type Link = { pivot: THREE.Group; restX: number; restZ: number; depth: number; count: number; phase: number; side: number }

// Swing amounts for the long styles. The game uses gentle; the hair study also shows still and lively.
export const hairMotion = { still: 0, gentle: 1, lively: 1.8 } as const

// The hair cap of the rig. Every style sits on this ellipsoid.
export const hairCap = { center: new THREE.Vector3(0, 1.22, 0.07), radii: new THREE.Vector3(0.24, 0.21, 0.19) }

export function onCap(direction: Vec3, lift = 1) {
  const d = new THREE.Vector3(...direction).normalize()
  return hairCap.center.clone().add(d.multiply(hairCap.radii).multiplyScalar(lift))
}

// Parts for hair styles: scaled unit spheres in the hair or gold material, and
// strands of segments that swing. Each segment is a child of the one before,
// so one swing bends the whole strand.
export function createHairKit(hair: THREE.Material, gold: THREE.Material) {
  const sphere = new THREE.SphereGeometry(1, 16, 12)
  const links: Link[] = []

  function blob(parent: THREE.Object3D, material: THREE.Material, scale: Vec3, position: THREE.Vector3 | Vec3, rotation: Vec3 = [0, 0, 0]) {
    const mesh = new THREE.Mesh(sphere, material)
    mesh.scale.set(...scale)
    if (position instanceof THREE.Vector3) mesh.position.copy(position)
    else mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    parent.add(mesh)
    return mesh
  }

  function strand(parent: THREE.Object3D, origin: THREE.Vector3, segments: Segment[], side = 0, phase = 0) {
    let host = parent
    segments.forEach((segment, depth) => {
      const pivot = new THREE.Group()
      if (depth === 0) pivot.position.copy(origin)
      else pivot.position.y = -segments[depth - 1].length
      const restZ = side * (segment.bend ?? 0)
      pivot.rotation.set(segment.rest, 0, restZ)
      host.add(pivot)
      blob(pivot, segment.accent ? gold : hair, segment.scale, [0, -segment.length / 2, 0], [0, 0, segment.tilt ?? 0])
      links.push({ pivot, restX: segment.rest, restZ, depth, count: segments.length, phase, side })
      host = pivot
    })
  }

  // In flight, gravity and the air stream together point along her body to the
  // feet, at cruise and in boost. So a strand straightens toward that line as
  // boost grows, and swings with the body bob of the pose (2.3 rad/s). The swing
  // is shared between the segments, so a long strand does not swing more at the tip.
  function animate(time: number, boost: number, amount: number) {
    const straighten = 1 - boost * 0.55
    for (const { pivot, restX, restZ, depth, count, phase, side } of links) {
      const wave = time * 2.3 - depth * 0.75 + phase
      pivot.rotation.x = restX * straighten + amount * 0.3 / count * Math.sin(wave)
      pivot.rotation.z = restZ + amount * (0.22 + boost * 0.1) / count * Math.sin(wave * 0.8 + side)
    }
  }

  return { blob, strand, animate }
}

// Builds every hair style of the game into its own hidden group on the body.
// Rules for the newer styles: every part joins the cap, the outer half of each
// ear stays clear, and hair below the ears stays inside x = ±0.19, the line of
// the wing roots. Each wing only goes out from its root, so hair inside that
// line cannot touch a wing.
export function buildHairStyles(body: THREE.Group, hair: THREE.Material, gold: THREE.Material) {
  const kit = createHairKit(hair, gold)
  const { blob, strand } = kit
  const groups = Object.fromEntries(hairOptions.map(({ id }) => {
    const group = new THREE.Group()
    group.name = `hair-${id}`
    group.visible = id === 'bun'
    body.add(group)
    return [id, group]
  })) as Record<HairStyle, THREE.Group>

  // Bun: one round bun on the crown with a gold band.
  blob(groups.bun, hair, [0.14, 0.14, 0.13], [0, 1.44, 0.11])
  blob(groups.bun, gold, [0.145, 0.027, 0.135], [0, 1.39, 0.11])

  // Bob and Tails keep their first shape. Their outer parts pass through the
  // transparent wings in the wingbeat, and the sides of Bob cover the inner half
  // of each ear. The newer styles follow the wing and ear rules above.
  for (const side of [-1, 1]) {
    // Bob: two soft sides that frame the face.
    blob(groups.bob, hair, [0.1, 0.23, 0.15], [side * 0.19, 1.06, 0.085])
    // Tails: two short tails with gold ties at the sides of the head.
    blob(groups.tails, gold, [0.066, 0.035, 0.07], [side * 0.25, 1.16, 0.07])
    blob(groups.tails, hair, [0.085, 0.22, 0.095], [side * 0.3, 0.99, 0.1], [0, 0, side * 0.28])
  }

  // Space buns: two buns with gold bands, tilted out from the crown.
  for (const side of [-1, 1]) {
    const direction: Vec3 = [side * 0.62, 0.78, 0.12]
    const tilt = -side * Math.atan2(0.62, 0.78)
    blob(groups.spaceBuns, hair, [0.1, 0.1, 0.095], onCap(direction, 1.28), [0, 0, tilt])
    blob(groups.spaceBuns, gold, [0.098, 0.022, 0.093], onCap(direction, 1.02), [0, 0, tilt])
  }

  // Cloud curls: rows of curls around the cap. Curls near the face or the ears are left out.
  const rows = [[-0.3, 8, 0.072], [0.1, 10, 0.082], [0.5, 9, 0.088], [0.9, 6, 0.09], [1.3, 2, 0.09]] as const
  for (const [elevation, count, radius] of rows) {
    for (let i = 0; i < count; i++) {
      const angle = (i + (count % 2 ? 0 : 0.5)) / count * Math.PI * 2
      const d = new THREE.Vector3(Math.cos(elevation) * Math.sin(angle), Math.sin(elevation), Math.cos(elevation) * Math.cos(angle))
      if (d.z < -0.3 && elevation < 1) continue
      if (Math.abs(d.x) > 0.8 && elevation < 0.3) continue
      blob(groups.cloudCurls, hair, [radius, radius, radius], onCap([d.x, d.y, d.z], 1.12))
    }
  }

  // Ponytail: a gold band high at the back, then a strand that hangs behind the nape.
  blob(groups.ponytail, hair, [0.085, 0.07, 0.075], onCap([0, 0.6, 1], 1.0))
  blob(groups.ponytail, gold, [0.07, 0.04, 0.066], onCap([0, 0.6, 1], 1.16), [-0.6, 0, 0])
  strand(groups.ponytail, onCap([0, 0.6, 1], 1.22), [
    { length: 0.11, scale: [0.078, 0.078, 0.07], rest: -0.6 },
    { length: 0.11, scale: [0.074, 0.076, 0.066], rest: 0.2 },
    { length: 0.11, scale: [0.066, 0.074, 0.058], rest: 0.15 },
    { length: 0.1, scale: [0.056, 0.07, 0.05], rest: 0.1 },
    { length: 0.09, scale: [0.042, 0.064, 0.04], rest: 0.08 },
  ])

  // Long braid: from the nape down the middle of the back, with a gold tie.
  strand(groups.braid, onCap([0, -0.5, 1], 1.02), [
    ...Array.from({ length: 6 }, (_, i) => ({
      length: 0.08, scale: [0.06, 0.055, 0.048] as Vec3, rest: i ? 0.045 : -0.22, tilt: i % 2 ? 0.42 : -0.42,
    })),
    { length: 0.025, scale: [0.036, 0.02, 0.036], rest: 0, accent: true },
    { length: 0.085, scale: [0.045, 0.055, 0.036], rest: 0 },
  ])

  // Twin braids: from the nape, one each side of the middle, a little out of step.
  for (const side of [-1, 1]) {
    strand(groups.twinBraids, onCap([side * 0.42, -0.6, 0.8], 1.02), [
      ...Array.from({ length: 5 }, (_, i) => ({
        length: 0.07, scale: [0.046, 0.044, 0.04] as Vec3, rest: i ? 0.035 : -0.18, tilt: i % 2 ? 0.42 : -0.42,
      })),
      { length: 0.02, scale: [0.03, 0.017, 0.03], rest: 0, accent: true },
      { length: 0.055, scale: [0.034, 0.04, 0.028], rest: 0 },
    ], side, side * 0.9)
  }

  // Long waves: three columns. The outer columns lean in to clear the wing roots.
  for (const column of [-1, 0, 1]) {
    strand(groups.longWaves, onCap([column * 0.55, -0.35, 1], 1.02), Array.from({ length: 5 }, (_, i) => ({
      length: 0.085,
      scale: [column ? 0.075 : 0.085, 0.065, 0.05] as Vec3,
      rest: i ? 0.035 : -0.2,
      bend: i ? (i % 2 ? 0.14 : -0.14) : (column ? -0.2 : 0),
    })), column || 1, column * 0.6)
  }

  return { groups, animate: kit.animate }
}
