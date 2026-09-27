import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Fairytale } from './fairytale'

export type FairytaleFeatures = { details: boolean; magic: boolean; motion: boolean }

const TAU = Math.PI * 2
// The planet's candy colors (src/candy.ts and the Blossom Haven terrain), softened for small bodies.
const candy = { pink: 0xf49ac1, peach: 0xf8c38e, butter: 0xf6e39a, mint: 0x9ed8c4, sky: 0x9fc3ec, lilac: 0xc3a6e6 }
const rainbow = [candy.pink, candy.peach, candy.butter, candy.mint, candy.sky, candy.lilac]
const ink = 0x3a2f45, blushColor = 0xf6b3c9, cream = 0xfff2dc

type Swap = { mesh: THREE.Mesh; on: THREE.Material; off: THREE.Material }
type Effect = (time: number) => void

/**
 * Builds one fairytale resident from shared primitives. Ground is y = 0 and the head faces +z.
 * `merge` is for the game: every detail stays on, and the static parts join into few meshes.
 */
export function createFairytaleCreature(kind: Fairytale, { merge = false } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(), magic = new THREE.Group()
  root.add(body); body.add(magic)
  root.name = `fairytale-${kind}`
  magic.userData.effect = true
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
  const own = <T extends THREE.BufferGeometry>(geometry: T) => { geometries.add(geometry); return geometry }
  const sphere = own(new THREE.SphereGeometry(1, 14, 10)), cone = own(new THREE.ConeGeometry(1, 1, 8))
  const sparkle = own(new THREE.OctahedronGeometry(1, 0))
  const glows: THREE.MeshStandardMaterial[] = [], swaps: Swap[] = [], detailOnly: THREE.Object3D[] = []
  const legs: THREE.Object3D[] = [], effects: Effect[] = []
  const material = (color: number, options: { glow?: number; opacity?: number; flat?: boolean } = {}) => {
    const value = new THREE.MeshStandardMaterial({
      color, roughness: 0.72, flatShading: options.flat ?? false,
      transparent: options.opacity !== undefined, opacity: options.opacity ?? 1, depthWrite: options.opacity === undefined,
      emissive: options.glow ? color : 0x000000, emissiveIntensity: 0,
    })
    if (options.glow) { value.userData.glow = options.glow; glows.push(value) }
    materials.add(value)
    return value
  }
  const dark = material(ink), shine = material(0xffffff), blush = material(blushColor)
  function blob(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz = sx) {
    const mesh = new THREE.Mesh(sphere, mat)
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz)
    parent.add(mesh)
    return mesh
  }
  function spike(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, radius: number, height: number) {
    const mesh = new THREE.Mesh(cone, mat)
    mesh.position.set(x, y, z); mesh.scale.set(radius, height, radius)
    parent.add(mesh)
    return mesh
  }
  // Big dark eyes with a white highlight read as "cute" even at flight distance.
  function eyes(parent: THREE.Object3D, x: number, y: number, z: number, size: number) {
    for (const side of [-1, 1]) {
      blob(parent, dark, side * x, y, z, size * 0.75, size, size * 0.55)
      blob(parent, shine, side * (x + size * 0.12), y + size * 0.42, z + size * 0.42, size * 0.28, size * 0.3, size * 0.18)
    }
  }
  function cheeks(parent: THREE.Object3D, x: number, y: number, z: number, size: number) {
    for (const side of [-1, 1]) blob(parent, blush, side * x, y, z, size, size * 0.6, size * 0.4)
  }
  function leg(x: number, y: number, z: number) {
    const pivot = new THREE.Group()
    pivot.position.set(x, y, z); body.add(pivot); legs.push(pivot)
    return pivot
  }
  function swap(mesh: THREE.Mesh, off: THREE.Material) { swaps.push({ mesh, on: mesh.material as THREE.Material, off }) }
  /** Small looping particles. Life runs 0 → 1; each particle has its own phase and heading. */
  function particles(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, count: number,
    origin: THREE.Vector3, drift: THREE.Vector3, spread: number, size: number, rate = 0.45, grow = false) {
    const items = Array.from({ length: count }, (_, i) => {
      const mesh = new THREE.Mesh(geometry, mat)
      parent.add(mesh)
      return { mesh, phase: i / count, angle: i * 2.39996 }
    })
    effects.push(time => items.forEach(({ mesh, phase, angle }) => {
      const life = (time * rate + phase) % 1, turn = angle + life * 2, reach = spread * (0.35 + life)
      mesh.position.set(origin.x + drift.x * life + Math.cos(turn) * reach, origin.y + drift.y * life, origin.z + drift.z * life + Math.sin(turn) * reach)
      mesh.scale.setScalar(size * (grow ? Math.min(1, life * 3) * (1.15 - life) : Math.sin(life * Math.PI)))
      mesh.rotation.set(0, time * 2 + angle, 0.6)
    }))
  }

  const head = new THREE.Group(), tail = new THREE.Group(), front = new THREE.Group()
  const wings: THREE.Object3D[] = []
  let puffs: THREE.Group | undefined, frog: THREE.Group | undefined, belly: THREE.Mesh | undefined

  if (kind === 'unicorn') {
    const coat = material(0xfff6f8), hoof = material(candy.lilac), plain = material(0xdccdf3)
    const gold = material(0xf4c67f, { glow: 1, flat: true })
    // Chibi proportions: a short round body, short legs, and a large head.
    blob(body, coat, 0, 0.7, -0.06, 0.4, 0.36, 0.5)
    blob(body, coat, 0, 0.76, 0.24, 0.33, 0.33, 0.28)
    blob(body, coat, 0, 0.74, -0.34, 0.34, 0.32, 0.28)
    front.position.set(0, 0.9, 0.32); body.add(front)
    blob(front, coat, 0, 0.18, 0.08, 0.16, 0.3, 0.17).rotation.x = 0.35
    head.position.set(0, 0.45, 0.24); head.scale.setScalar(1.25); front.add(head)
    blob(head, coat, 0, 0, 0, 0.28, 0.27, 0.3)
    blob(head, blush, 0, -0.09, 0.24, 0.18, 0.15, 0.15)
    eyes(head, 0.15, 0.04, 0.23, 0.075); cheeks(head, 0.2, -0.06, 0.19, 0.055)
    for (const side of [-1, 1]) {
      blob(head, dark, side * 0.07, -0.07, 0.38, 0.018, 0.014, 0.01)
      blob(head, coat, side * 0.13, 0.26, -0.06, 0.06, 0.13, 0.05).rotation.z = side * -0.3
      blob(head, blush, side * 0.13, 0.26, -0.03, 0.035, 0.09, 0.03).rotation.z = side * -0.3
    }
    // A twisted cone: flat shading turns the twist into a visible spiral.
    const hornGeometry = own(new THREE.ConeGeometry(0.075, 0.44, 6, 8)), hornPositions = hornGeometry.attributes.position
    for (let i = 0; i < hornPositions.count; i++) {
      const x = hornPositions.getX(i), y = hornPositions.getY(i), z = hornPositions.getZ(i), turn = (y + 0.22) / 0.44 * Math.PI * 2.5
      hornPositions.setXYZ(i, x * Math.cos(turn) - z * Math.sin(turn), y, x * Math.sin(turn) + z * Math.cos(turn))
    }
    hornGeometry.computeVertexNormals()
    const horn = new THREE.Mesh(hornGeometry, gold)
    horn.position.set(0, 0.36, 0.1); horn.rotation.x = 0.35; head.add(horn)
    const stripes = rainbow.map(color => material(color))
    swap(blob(head, stripes[0], 0, 0.23, 0.13, 0.12, 0.08, 0.09), plain)
    // The crest is wider than the neck, so the rainbow shows from both sides and from the front.
    for (let i = 0; i < 7; i++) {
      const t = i / 6
      swap(blob(front, stripes[i % 6], 0, 0.72 - 0.72 * t, 0.02 - 0.26 * t - Math.sin(t * Math.PI) * 0.05, 0.2, 0.12, 0.1), plain)
    }
    tail.position.set(0, 0.85, -0.58); body.add(tail)
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      swap(blob(tail, stripes[i], 0, -t * 0.55, -0.08 - Math.sin(t * 1.4) * 0.14, 0.12 - t * 0.03, 0.13, 0.11), plain)
    }
    for (const side of [-1, 1]) for (const z of [0.28, -0.36]) {
      const pivot = leg(side * 0.2, 0.5, z)
      blob(pivot, coat, 0, -0.22, 0, 0.11, 0.25, 0.12)
      blob(pivot, hoof, 0, -0.45, 0.01, 0.12, 0.07, 0.13)
    }
    head.add(magic)
    particles(magic, sparkle, material(candy.butter, { glow: 1 }), 5, new THREE.Vector3(0, 0.56, 0.18), new THREE.Vector3(0, 0.35, 0.05), 0.14, 0.035)
  } else if (kind === 'dragonling') {
    const scales = material(0x9fd9c3), tummy = material(cream), wing = material(0xf5a9c8), horn = material(0xfff3dc)
    const spikes = material(0xf6c982)
    blob(body, scales, 0, 0.5, -0.06, 0.4, 0.38, 0.46)
    blob(body, tummy, 0, 0.45, 0.14, 0.3, 0.3, 0.3)
    head.position.set(0, 1, 0.24); body.add(head)
    blob(head, scales, 0, 0, 0, 0.34, 0.3, 0.3)
    blob(head, scales, 0, -0.1, 0.24, 0.2, 0.14, 0.14)
    eyes(head, 0.17, 0.05, 0.24, 0.095); cheeks(head, 0.23, -0.07, 0.18, 0.06)
    for (const side of [-1, 1]) {
      blob(head, dark, side * 0.06, -0.06, 0.37, 0.02, 0.015, 0.01)
      const nub = spike(head, horn, side * 0.13, 0.31, -0.06, 0.05, 0.18)
      nub.rotation.set(-0.4, 0, side * -0.2)
      blob(head, wing, side * 0.32, 0.06, -0.08, 0.13, 0.05, 0.08).rotation.z = side * 0.5
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.28, 0.78, -0.18); body.add(pivot); wings.push(pivot)
      blob(pivot, wing, side * 0.22, 0.14, -0.04, 0.24, 0.035, 0.17).rotation.z = side * 0.45
      blob(pivot, wing, side * 0.16, 0.06, -0.18, 0.17, 0.03, 0.12).rotation.z = side * 0.35
      blob(pivot, scales, side * 0.18, 0.17, 0.06, 0.2, 0.04, 0.04).rotation.z = side * 0.45
      for (const z of [0.2, -0.24]) {
        const foot = leg(side * 0.24, 0.24, z)
        blob(foot, scales, 0, -0.1, 0, 0.12, 0.14, 0.13)
        blob(foot, tummy, 0, -0.2, 0.06, 0.08, 0.04, 0.06)
      }
    }
    const ridge = new THREE.Group(); body.add(ridge); detailOnly.push(ridge)
    for (const [y, z] of [[0.9, -0.08], [0.84, -0.3], [0.7, -0.46]]) spike(ridge, spikes, 0, y, z, 0.06, 0.15).rotation.x = -0.5
    tail.position.set(0, 0.36, -0.4); body.add(tail)
    blob(tail, scales, 0, 0, -0.08, 0.14, 0.13, 0.16)
    blob(tail, scales, 0, 0.05, -0.26, 0.1, 0.1, 0.13)
    blob(tail, scales, 0, 0.14, -0.38, 0.07, 0.08, 0.09)
    const heart = new THREE.Group(); tail.add(heart); detailOnly.push(heart)
    for (const side of [-1, 1]) blob(heart, wing, side * 0.04, 0.25, -0.44, 0.05, 0.05, 0.04)
    spike(heart, wing, 0, 0.19, -0.44, 0.07, 0.09).rotation.x = Math.PI
    // Puffs only show while it rests: a small, readable "breath" instead of fire.
    puffs = new THREE.Group(); magic.add(puffs)
    particles(puffs, sphere, material(0xffd6ea, { opacity: 0.75 }), 3, new THREE.Vector3(0, 0.98, 0.64), new THREE.Vector3(0, 0.4, 0.34), 0.05, 0.11, 0.35, true)
  } else if (kind === 'kitsune') {
    const coat = material(0xf7c49c), fluff = material(cream), ear = material(0xf6a8c0)
    const tip = material(0xfff0f6, { glow: 0.35 })
    blob(body, coat, 0, 0.32, -0.04, 0.24, 0.23, 0.33)
    blob(body, fluff, 0, 0.38, 0.17, 0.17, 0.19, 0.15)
    head.position.set(0, 0.66, 0.24); head.scale.setScalar(1.12); body.add(head)
    blob(head, coat, 0, 0, 0, 0.25, 0.22, 0.22)
    blob(head, fluff, 0, -0.06, 0.19, 0.1, 0.08, 0.11)
    blob(head, dark, 0, -0.03, 0.3, 0.03, 0.025, 0.02)
    eyes(head, 0.11, 0.03, 0.18, 0.06)
    for (const side of [-1, 1]) {
      blob(head, fluff, side * 0.15, -0.07, 0.07, 0.13, 0.1, 0.12)
      spike(head, coat, side * 0.13, 0.27, -0.02, 0.1, 0.3).rotation.z = side * -0.25
      spike(head, ear, side * 0.13, 0.25, 0.025, 0.06, 0.2).rotation.z = side * -0.25
      for (const z of [0.18, -0.18]) {
        const paw = leg(side * 0.14, 0.17, z)
        blob(paw, coat, 0, -0.07, 0, 0.075, 0.1, 0.08)
        blob(paw, fluff, 0, -0.15, 0.02, 0.07, 0.04, 0.08)
      }
    }
    tail.position.set(0, 0.4, -0.25); body.add(tail)
    for (const spread of [-0.62, 0, 0.62]) {
      const plume = new THREE.Group()
      plume.rotation.set(-0.35, 0, spread); tail.add(plume)
      if (spread) detailOnly.push(plume)
      blob(plume, coat, 0, 0.16, 0, 0.08, 0.18, 0.08)
      blob(plume, coat, 0, 0.36, -0.04, 0.12, 0.2, 0.12)
      blob(plume, coat, 0, 0.56, -0.02, 0.1, 0.14, 0.1)
      blob(plume, tip, 0, 0.7, 0, 0.075, 0.08, 0.075)
    }
    // Fox-fire: two soft lights that circle above the tails.
    const fire = material(0xcdb4ff, { glow: 1, opacity: 0.85 })
    const wisps = [0, 1].map(() => blob(magic, fire, 0, 0, 0, 0.05, 0.05, 0.05))
    effects.push(time => wisps.forEach((wisp, i) => {
      const angle = time * 1.8 + i * Math.PI
      wisp.position.set(Math.cos(angle) * 0.3, 0.9 + Math.sin(time * 2.4 + i) * 0.06, -0.5 + Math.sin(angle) * 0.3)
    }))
  } else if (kind === 'frogPrince') {
    const skin = material(0xb9e58c), feet = material(0x9fd07a), tummy = material(0xfff5d8)
    const gold = material(0xf4c67f, { glow: 1, flat: true }), pad = material(0x6fbf8a, { flat: true })
    const padGeometry = own(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 22, 1, false, 0.35, TAU - 0.7))
    const lily = new THREE.Mesh(padGeometry, pad)
    lily.position.y = 0.02; lily.rotation.y = Math.PI; body.add(lily)
    const lotus = new THREE.Group(); lotus.position.set(0.36, 0.06, -0.3); body.add(lotus); detailOnly.push(lotus)
    const petal = material(0xf7a8c8)
    for (let i = 0; i < 5; i++) {
      const bloom = blob(lotus, petal, Math.cos(i / 5 * TAU) * 0.06, 0.03, Math.sin(i / 5 * TAU) * 0.06, 0.05, 0.035, 0.09)
      bloom.rotation.set(0.5, -i / 5 * TAU + Math.PI / 2, 0)
    }
    blob(lotus, material(candy.butter), 0, 0.05, 0, 0.035, 0.03, 0.035)
    frog = new THREE.Group(); frog.position.set(0, 0.05, 0.05); body.add(frog)
    blob(frog, skin, 0, 0.24, -0.04, 0.28, 0.23, 0.28)
    belly = blob(frog, tummy, 0, 0.2, 0.1, 0.21, 0.17, 0.2)
    blob(frog, skin, 0, 0.42, 0.08, 0.3, 0.18, 0.24)
    for (const side of [-1, 1]) {
      blob(frog, skin, side * 0.16, 0.56, 0.1, 0.1, 0.1, 0.1)
      const back = leg(side * 0.25, 0.1, -0.06)
      frog.add(back)
      blob(back, skin, 0, 0, 0, 0.12, 0.09, 0.2)
      blob(back, feet, side * 0.05, -0.07, 0.18, 0.08, 0.025, 0.1)
      blob(frog, skin, side * 0.13, 0.05, 0.25, 0.06, 0.04, 0.08)
    }
    eyes(frog, 0.17, 0.58, 0.18, 0.065); cheeks(frog, 0.21, 0.4, 0.23, 0.05)
    const smile = new THREE.Mesh(own(new THREE.TorusGeometry(0.08, 0.009, 4, 12, Math.PI)), dark)
    smile.position.set(0, 0.39, 0.305); smile.rotation.z = Math.PI; frog.add(smile)
    const crown = new THREE.Group(); crown.position.set(0, 0.62, 0.02); crown.rotation.z = 0.15; frog.add(crown); detailOnly.push(crown)
    const band = new THREE.Mesh(own(new THREE.CylinderGeometry(0.1, 0.11, 0.07, 12, 1, true)), gold)
    gold.side = THREE.DoubleSide; crown.add(band)
    for (let i = 0; i < 5; i++) spike(crown, gold, Math.cos(i / 5 * TAU) * 0.1, 0.075, Math.sin(i / 5 * TAU) * 0.1, 0.028, 0.08)
    blob(crown, material(candy.pink, { glow: 1 }), 0, 0.005, 0.105, 0.022, 0.022, 0.015)
    // The planet already has rising soda bubbles; these are the frog's wishes.
    particles(magic, sphere, material(0xe5ffff, { opacity: 0.55 }), 5, new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0.95, 0), 0.45, 0.06, 0.3)
  } else {
    const coat = material(0xfbf6ff), hoof = material(0xb9a8e8), mane = material(0xa9b6ee)
    const feather = material(0xd9c8ff), under = material(0xf0c2de), featherTip = material(0xee9cc4), star = material(candy.butter, { glow: 1, flat: true })
    blob(body, coat, 0, 0, 0, 0.26, 0.24, 0.4)
    blob(body, coat, 0, 0.05, 0.26, 0.22, 0.22, 0.2)
    blob(body, coat, 0, 0.22, 0.34, 0.12, 0.2, 0.12).rotation.x = 0.5
    head.position.set(0, 0.44, 0.46); body.add(head)
    blob(head, coat, 0, 0, 0, 0.2, 0.19, 0.22)
    blob(head, blush, 0, -0.07, 0.17, 0.13, 0.11, 0.11)
    eyes(head, 0.11, 0.03, 0.165, 0.055)
    for (const side of [-1, 1]) {
      blob(head, coat, side * 0.09, 0.19, -0.05, 0.045, 0.1, 0.04).rotation.z = side * -0.3
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.2, 0.16, 0.06); body.add(pivot); wings.push(pivot)
      blob(pivot, feather, side * 0.32, 0.04, 0.02, 0.32, 0.04, 0.14)
      blob(pivot, under, side * 0.3, 0.02, -0.13, 0.29, 0.035, 0.12)
      blob(pivot, under, side * 0.24, 0, -0.26, 0.22, 0.03, 0.1)
      blob(pivot, featherTip, side * 0.56, 0.05, 0.02, 0.08, 0.035, 0.1)
      for (const [z, fold] of [[0.25, -1.3], [-0.25, 0.9]]) {
        const hock = leg(side * 0.12, -0.12, z)
        hock.rotation.x = fold
        blob(hock, coat, 0, -0.09, 0, 0.055, 0.11, 0.06)
        blob(hock, hoof, 0, -0.19, 0, 0.06, 0.04, 0.065)
      }
    }
    for (let i = 0; i < 4; i++) {
      const t = i / 3
      blob(body, mane, 0, 0.62 - 0.4 * t, 0.38 - 0.2 * t, 0.07, 0.09, 0.08)
    }
    const stars = new THREE.Group(); body.add(stars); detailOnly.push(stars)
    for (let i = 0; i < 5; i++) {
      const t = i / 4, speck = new THREE.Mesh(sparkle, star)
      speck.position.set((i % 2 ? 1 : -1) * 0.07, 0.62 - 0.4 * t, 0.4 - 0.2 * t); speck.scale.setScalar(0.028); stars.add(speck)
    }
    const blaze = new THREE.Mesh(sparkle, star)
    blaze.position.set(0, 0.1, 0.19); blaze.scale.setScalar(0.035); head.add(blaze); detailOnly.push(blaze)
    tail.position.set(0, 0.05, -0.4); body.add(tail)
    blob(tail, mane, 0, -0.02, -0.08, 0.07, 0.08, 0.1)
    blob(tail, mane, 0, -0.08, -0.2, 0.06, 0.07, 0.09)
    blob(tail, mane, 0, -0.16, -0.3, 0.05, 0.06, 0.08)
    particles(magic, sparkle, material(0xffd9ec, { glow: 1 }), 6, new THREE.Vector3(0, 0, -0.45), new THREE.Vector3(0, -0.25, -0.9), 0.12, 0.04, 0.6)
  }

  if (merge) {
    // Each group moves as one piece, so its static parts can join into one mesh per
    // shading style. Vertex colors keep the colors. Glow, transparent and animated parts stay separate.
    swaps.length = 0
    const join = (node: THREE.Object3D) => {
      if (node === magic) return
      const groups = node.children.filter(child => !(child instanceof THREE.Mesh))
      const buckets = new Map<string, THREE.Mesh[]>()
      for (const child of node.children) {
        if (!(child instanceof THREE.Mesh) || child === belly) continue
        const mat = child.material as THREE.MeshStandardMaterial
        if (mat.transparent || mat.userData.glow) continue
        const key = `${mat.flatShading}|${mat.side}`
        buckets.set(key, [...(buckets.get(key) ?? []), child])
      }
      for (const parts of buckets.values()) {
        if (parts.length < 2) continue
        const pieces = parts.map(part => {
          part.updateMatrix()
          const piece = part.geometry.clone().applyMatrix4(part.matrix), color = (part.material as THREE.MeshStandardMaterial).color
          const colors = new Float32Array(piece.attributes.position.count * 3)
          for (let i = 0; i < colors.length; i += 3) colors.set([color.r, color.g, color.b], i)
          piece.setAttribute('color', new THREE.BufferAttribute(colors, 3))
          return piece
        })
        const flat = pieces.some(piece => !piece.index) ? pieces.map(piece => piece.toNonIndexed()) : pieces
        const first = parts[0].material as THREE.MeshStandardMaterial
        const joined = new THREE.Mesh(own(mergeGeometries(flat)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, flatShading: first.flatShading, side: first.side }))
        materials.add(joined.material)
        new Set([...pieces, ...flat]).forEach(piece => piece.dispose())
        parts.forEach(part => node.remove(part))
        node.add(joined)
      }
      groups.forEach(join)
    }
    join(root)
  }
  const legRest = legs.map(pivot => pivot.rotation.x)
  let graze = 0, last: number | undefined
  function animate(time: number, moving: boolean, features: FairytaleFeatures) {
    const delta = last === undefined ? 0 : Math.min(0.1, Math.max(0, time - last)); last = time
    swaps.forEach(({ mesh, on, off }) => { mesh.material = features.details ? on : off })
    detailOnly.forEach(part => { part.visible = features.details })
    magic.visible = features.magic
    const pulse = features.magic ? 0.55 + Math.sin(time * 3) * 0.25 : 0
    glows.forEach(glow => { glow.emissiveIntensity = pulse * glow.userData.glow })
    body.position.y = 0; body.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); tail.rotation.set(0, 0, 0)
    legs.forEach((pivot, i) => { pivot.rotation.x = legRest[i] })
    wings.forEach((wing, i) => { wing.rotation.z = kind === 'pegasus' ? (i ? 0.7 : -0.7) : 0 })
    if (frog) { frog.position.y = 0.05; belly!.scale.set(0.21, 0.17, 0.2) }
    if (puffs) puffs.visible = !moving
    if (!features.motion) { front.rotation.x = 0; return }
    effects.forEach(effect => effect(time))
    const side = (i: number) => (i % 2 ? 1 : -1)
    if (kind === 'unicorn') {
      graze += ((moving ? 0 : 1) - graze) * Math.min(1, delta * 2.5)
      front.rotation.x = graze * (0.95 + Math.sin(time * 2) * 0.05)
      head.rotation.x = graze * 0.35
      tail.rotation.z = Math.sin(time * 1.6) * 0.16
      if (moving) {
        body.position.y = Math.abs(Math.sin(time * 3.5)) * 0.03
        legs.forEach((pivot, i) => { pivot.rotation.x = Math.sin(time * 3.5 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.3 })
      }
    } else if (kind === 'dragonling') {
      wings.forEach((wing, i) => { wing.rotation.z = side(i) * Math.sin(time * (moving ? 7 : 3)) * (moving ? 0.35 : 0.15) })
      tail.rotation.y = Math.sin(time * 2.2) * 0.3
      if (moving) {
        body.rotation.z = Math.sin(time * 6) * 0.08
        legs.forEach((pivot, i) => { pivot.rotation.x = Math.sin(time * 6 + i * Math.PI) * 0.35 })
      } else head.rotation.x = -0.15 + Math.sin(time * 1.5) * 0.06
    } else if (kind === 'kitsune') {
      tail.rotation.y = Math.sin(time * 3) * 0.25
      if (moving) {
        body.position.y = Math.max(0, Math.sin(time * 9)) * 0.12
        legs.forEach((pivot, i) => { pivot.rotation.x = Math.sin(time * 9 + (i % 2) * Math.PI) * 0.35 })
      } else head.rotation.z = Math.sin(time * 0.9) * 0.12
    } else if (kind === 'frogPrince') {
      body.position.y = Math.sin(time * 2) * 0.015
      body.rotation.z = Math.sin(time * 1.4) * 0.03
      belly!.scale.y = 0.17 * (1 + Math.max(0, Math.sin(time * 5)) * 0.12)
      if (moving) legs.forEach((pivot, i) => { pivot.rotation.x = Math.sin(time * 4 + i * Math.PI) * 0.3 })
      else frog!.position.y = 0.05 + Math.pow(Math.max(0, Math.sin(time * 1.2)), 12) * 0.28
    } else {
      body.position.y = Math.sin(time * 2) * 0.06
      body.rotation.x = Math.sin(time * 2 + 1) * 0.05
      wings.forEach((wing, i) => { wing.rotation.z = side(i) * (0.7 + Math.sin(time * 4.5) * 0.4) })
      tail.rotation.x = Math.sin(time * 2.5) * 0.15
    }
  }
  const meshes = () => { let count = 0; root.traverse(o => { if (o instanceof THREE.Mesh) count++ }); return count }
  return { root, animate, meshes, dispose: () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()) } }
}

export type FairytaleModel = ReturnType<typeof createFairytaleCreature>

/** The ribbon butterfly as `buildCandyEcosystem` draws it today, for the "Today" comparison. */
export function createRibbonButterfly(index: number) {
  const root = new THREE.Group()
  root.name = 'ribbon-butterfly'
  const geometry = new THREE.SphereGeometry(1, 8, 6)
  const cream = new THREE.MeshStandardMaterial({ color: 0xffedcf, roughness: 0.75 })
  const wing = new THREE.MeshStandardMaterial({ color: [0xeb8cb3, 0xf4c67f, 0xb3a0d0, 0x92c8b4][index % 4], roughness: 0.8 })
  const body = new THREE.Mesh(geometry, cream)
  body.scale.set(0.1, 0.12, 0.45); root.add(body)
  const wings = [-1, 1].map(side => {
    const mesh = new THREE.Mesh(geometry, wing)
    mesh.position.x = side * 0.43; mesh.scale.set(0.52, 0.05, 0.64); root.add(mesh)
    return mesh
  })
  return {
    root,
    animate: (time: number) => wings.forEach((mesh, j) => { mesh.rotation.z = (j ? 1 : -1) * Math.sin(time * 7 + index) * 0.55 }),
    dispose: () => { geometry.dispose(); cream.dispose(); wing.dispose() },
  }
}
