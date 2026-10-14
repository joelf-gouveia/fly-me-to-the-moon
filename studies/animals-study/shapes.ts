import { Euler, Quaternion, Vector3 } from 'three'

/**
 * The prototype models of the animals study, as lists of parts: soft balls, cones and short
 * cylinders, as the models of src/creatures/. A part has a colour, a place, a size and a turn in
 * metres, and the moving part that it belongs to: a leg, the head, the tail, a wing or a fin. One
 * list gives each look of a species (build.ts): one mesh for each part (option A), one joined mesh
 * that the graphics card moves (options B and C), and a simple far model.
 *
 * The ground is y = 0 and the head looks along +z. A swimmer has the water at y = 0.
 */
export type Code = 0 | 1 | 2 | 3 | 4 | 5 | 6
/** The moving parts: 0 the body, 1 and 2 the two diagonal pairs of legs, 3 the head, 4 the tail, 5 a wing, 6 a fin or a wave. */
export const CODES = { body: 0, legsA: 1, legsB: 2, head: 3, tail: 4, wing: 5, fin: 6 } as const
export type PartShape = 'ball' | 'cone' | 'cyl'
export type Part = {
  shape: PartShape
  colour: number
  p: [number, number, number]
  s: [number, number, number]
  r: [number, number, number]
  code: Code
  /** The point that the part turns about: [y, z] for a leg, the head, the tail or a fin; [y, x] for a wing (x is the shoulder). */
  pivot: [number, number]
  /** -1 or 1 for a wing: the side. */
  side: number
  /** A small part that the far model leaves out (eyes, spots, toes). */
  detail: boolean
}
/** How much each moving part moves, in radians, and the speed of the gait. */
export type Gait = { leg: number; nod: number; wing: number; tail: number; rate: number }
export type Shape = { id: string; parts: Part[]; gait: Gait; flat: boolean; shine: number }

const INK = 0x2e2a33, WHITE = 0xffffff, BLUSH = 0xf3a9b9

class Builder {
  parts: Part[] = []
  private code: Code = 0
  private pivot: [number, number] = [0, 0]
  private side = 0
  /** The parts that `draw` adds belong to a moving part. */
  on(code: Code, pivot: [number, number], draw: () => void, side = 0) {
    const saved = [this.code, this.pivot, this.side] as const
    this.code = code; this.pivot = pivot; this.side = side
    draw()
    ;[this.code, this.pivot, this.side] = saved
  }
  add(shape: PartShape, colour: number, p: [number, number, number], s: [number, number, number], r: [number, number, number] = [0, 0, 0], detail = false) {
    this.parts.push({ shape, colour, p, s, r, code: this.code, pivot: this.pivot, side: this.side, detail })
    return this
  }
  ball(colour: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, r: [number, number, number] = [0, 0, 0], detail = false) {
    return this.add('ball', colour, [x, y, z], [sx, sy, sz], r, detail)
  }
  /** A ball on each side: x and -x. `r` turns about z with the sign of the side. */
  pair(colour: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, r: [number, number, number] = [0, 0, 0], detail = false) {
    for (const side of [-1, 1]) this.ball(colour, side * x, y, z, sx, sy, sz, [r[0], r[1] * side, r[2] * side], detail)
    return this
  }
  cone(colour: number, x: number, y: number, z: number, radius: number, height: number, r: [number, number, number] = [0, 0, 0], detail = false) {
    return this.add('cone', colour, [x, y, z], [radius, height, radius], r, detail)
  }
  /** Big round eyes with a small white shine, as the creatures of Blossom Haven and the friend. */
  eyes(x: number, y: number, z: number, size: number, turn = 0.35) {
    for (const side of [-1, 1]) {
      this.ball(INK, side * x, y, z, size * 0.8, size, size * 0.6, [0, side * turn, 0], true)
      this.ball(WHITE, side * (x - size * 0.05), y + size * 0.4, z + size * 0.35, size * 0.3, size * 0.3, size * 0.2, [0, 0, 0], true)
    }
    return this
  }
  cheeks(x: number, y: number, z: number, size: number) {
    return this.pair(BLUSH, x, y, z, size, size * 0.6, size * 0.4, [0, 0, 0], true)
  }
  /** A leg from the hip to the ground, with a hoof or a paw. The diagonal legs move together. */
  leg(side: number, z: number, hip: number, radius: number, colour: number, foot: number, footSize = 1) {
    const code: Code = (side < 0) === (z > 0) ? 1 : 2
    this.on(code, [hip, z], () => {
      const x = this.legX * side
      this.ball(colour, x, hip / 2 + 0.02, z, radius, hip / 2 + 0.03, radius * 1.1)
      this.ball(foot, x, 0.05, z + 0.01, radius * 1.15 * footSize, 0.06, radius * 1.25 * footSize)
    })
    return this
  }
  legX = 0.2
  legs(x: number, front: number, back: number, hip: number, radius: number, colour: number, foot: number, footSize = 1) {
    this.legX = x
    for (const side of [-1, 1]) for (const z of [front, back]) this.leg(side, z, hip, radius, colour, foot, footSize)
    return this
  }
  /** One long soft part from one point to another: a neck, a leg, a tail. */
  limb(colour: number, from: [number, number, number], to: [number, number, number], radius: number, end = radius, detail = false) {
    const a = new Vector3(...from), b = new Vector3(...to), direction = b.clone().sub(a)
    const length = direction.length()
    const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()))
    const middle = a.clone().add(b).multiplyScalar(0.5)
    this.ball(colour, middle.x, middle.y, middle.z, (radius + end) / 2, length / 2 + Math.min(radius, end) * 0.6, (radius + end) / 2, [turn.x, turn.y, turn.z], detail)
    if (end !== radius) this.ball(colour, b.x, b.y, b.z, end * 1.05)
    return this
  }
  /** A chain of balls from one point to another: a neck, a trunk, a tail. */
  chain(colour: number, from: [number, number, number], to: [number, number, number], radius: [number, number], count: number, bend = 0) {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      const lift = Math.sin(t * Math.PI) * bend
      this.ball(colour, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + lift, from[2] + (to[2] - from[2]) * t, radius[0] + (radius[1] - radius[0]) * t)
    }
    return this
  }
}

const gait = (leg: number, nod: number, rate: number, more: Partial<Gait> = {}): Gait => ({ leg, nod, rate, wing: 0, tail: 0.25, ...more })

// ---- The animals with four legs ------------------------------------------------------------------

type Quad = {
  coat: number; belly?: number; hoof: number
  body: [y: number, z: number, sx: number, sy: number, sz: number]
  legs: { x: number; front: number; back: number; hip: number; r: number; colour?: number; foot?: number }
  neck?: { from: [number, number]; to: [number, number]; r: [number, number]; n: number }
  head: { y: number; z: number; s: [number, number, number]; rx?: number }
  muzzle?: { y: number; z: number; s: [number, number, number]; colour: number }
  ears?: { x: number; y: number; z: number; s: [number, number, number]; rz: number; colour?: number }
  eyes: { x: number; y: number; z: number; size: number }
  tail?: { y: number; z: number; s: [number, number, number]; rx?: number; tuft?: number }
  /** The base of the neck: the point that the head and neck turn about. */
  shoulder: [number, number]
}

function quadruped(b: Builder, q: Quad, head?: () => void) {
  const [by, bz, sx, sy, sz] = q.body
  b.ball(q.coat, 0, by, bz, sx, sy, sz)
  if (q.belly !== undefined) b.ball(q.belly, 0, by - sy * 0.35, bz + sz * 0.05, sx * 0.82, sy * 0.62, sz * 0.82)
  b.legs(q.legs.x, q.legs.front, q.legs.back, q.legs.hip, q.legs.r, q.legs.colour ?? q.coat, q.legs.foot ?? q.hoof)
  b.on(3, q.shoulder, () => {
    if (q.neck) b.limb(q.coat, [0, ...q.neck.from], [0, ...q.neck.to], q.neck.r[0], q.neck.r[1])
    b.ball(q.coat, 0, q.head.y, q.head.z, ...q.head.s, [q.head.rx ?? 0, 0, 0])
    if (q.muzzle) b.ball(q.muzzle.colour, 0, q.muzzle.y, q.muzzle.z, ...q.muzzle.s)
    if (q.ears) b.pair(q.ears.colour ?? q.coat, q.ears.x, q.ears.y, q.ears.z, ...q.ears.s, [0, 0, -q.ears.rz])
    b.eyes(q.eyes.x, q.eyes.y, q.eyes.z, q.eyes.size)
    head?.()
  })
  if (q.tail) {
    const tail = q.tail
    b.on(4, [tail.y, tail.z], () => {
      b.ball(q.coat, 0, tail.y - tail.s[1] * 0.6, tail.z - 0.03, ...tail.s, [tail.rx ?? 0.3, 0, 0])
      if (tail.tuft !== undefined) b.ball(tail.tuft, 0, tail.y - tail.s[1] * 1.5, tail.z - 0.06, tail.s[0] * 1.6, tail.s[1] * 0.45, tail.s[2] * 1.6, [0, 0, 0], true)
    })
  }
}

// ---- The birds -------------------------------------------------------------------------------------

type Bird = {
  body: number; wing: number; tip?: number; belly?: number; beak: number
  size: number; long?: number
  /** A long neck (the stork), from 0 to 1, and the colour of the neck (the goose). */
  neck?: number; neckColour?: number; tail?: number; crest?: number
}
/** A bird in flight: a round body, a head, a beak, two wings that flap at the shoulder, and a tail fan. */
function flyingBird(b: Builder, w: Bird) {
  const s = w.size, long = w.long ?? 1
  b.ball(w.body, 0, 0, 0, 0.22 * s, 0.2 * s, 0.42 * s * long)
  if (w.belly !== undefined) b.ball(w.belly, 0, -0.06 * s, 0.03 * s, 0.18 * s, 0.13 * s, 0.34 * s * long)
  const neck = w.neck ?? 0
  b.ball(w.neckColour ?? w.body, 0, 0.08 * s, (0.4 + neck * 0.2) * s * long, 0.12 * s, 0.12 * s, 0.2 * s + neck * 0.18 * s)
  b.ball(w.neckColour ?? w.body, 0, 0.12 * s, (0.55 + neck * 0.4) * s * long, 0.15 * s)
  b.cone(w.beak, 0, 0.09 * s, (0.75 + neck * 0.4) * s * long, 0.05 * s, 0.3 * s * (w.long ?? 1), [Math.PI / 2, 0, 0])
  b.eyes(0.1 * s, 0.17 * s, (0.62 + neck * 0.4) * s * long, 0.04 * s)
  if (w.crest !== undefined) b.ball(w.crest, 0, 0.27 * s, (0.5 + neck * 0.4) * s * long, 0.05 * s, 0.1 * s, 0.08 * s, [-0.5, 0, 0], true)
  for (const side of [-1, 1]) {
    b.on(5, [0.05 * s, 0.15 * s], () => {
      b.ball(w.wing, side * 0.48 * s, 0.05 * s, 0, 0.42 * s, 0.04 * s, 0.24 * s)
      if (w.tip !== undefined) b.ball(w.tip, side * 0.82 * s, 0.05 * s, -0.04 * s, 0.16 * s, 0.035 * s, 0.17 * s)
    }, side)
  }
  b.on(4, [0, -0.35 * s * long], () => b.ball(w.tail ?? w.wing, 0, 0.02 * s, -0.5 * s * long, 0.16 * s, 0.03 * s, 0.2 * s))
}

// ---- The species -------------------------------------------------------------------------------------

const BUILDERS: Record<string, (b: Builder) => Gait> = {
  zebra(b) {
    const white = 0xf2f0ea, black = 0x2c2a2e
    quadruped(b, {
      coat: white, hoof: black, body: [0.85, -0.05, 0.36, 0.34, 0.6],
      legs: { x: 0.2, front: 0.38, back: -0.44, hip: 0.75, r: 0.075 },
      shoulder: [1.0, 0.42],
      neck: { from: [1.02, 0.45], to: [1.32, 0.68], r: [0.17, 0.13], n: 3 },
      head: { y: 1.38, z: 0.82, s: [0.15, 0.16, 0.28], rx: 0.55 },
      muzzle: { y: 1.24, z: 1.02, s: [0.12, 0.11, 0.12], colour: black },
      ears: { x: 0.08, y: 1.56, z: 0.74, s: [0.045, 0.12, 0.035], rz: 0.25 },
      eyes: { x: 0.12, y: 1.43, z: 0.9, size: 0.045 },
      tail: { y: 0.98, z: -0.62, s: [0.035, 0.24, 0.035], rx: 0.25, tuft: black },
    }, () => {
      // The mane: a black crest along the top of the neck.
      for (let i = 0; i < 4; i++) b.ball(black, 0, 1.18 + i * 0.1, 0.42 + i * 0.1, 0.05, 0.08, 0.08)
    })
    // The stripes: thin rings a little wider than the body.
    for (let i = 0; i < 6; i++) b.ball(black, 0, 0.86, -0.5 + i * 0.19, 0.366, 0.346, 0.03, [0, 0, 0])
    for (let i = 0; i < 2; i++) b.ball(black, 0, 1.12 + i * 0.12, 0.5 + i * 0.1, 0.176, 0.05, 0.14, [0.7, 0, 0], true)
    return gait(0.35, 0.95, 3.5)
  },
  giraffe(b) {
    const coat = 0xf0c76a, spot = 0xb06a32, hoof = 0x4a3a2e
    quadruped(b, {
      coat, belly: 0xf7e2b0, hoof, body: [1.62, -0.05, 0.34, 0.36, 0.58],
      legs: { x: 0.2, front: 0.35, back: -0.38, hip: 1.5, r: 0.075 },
      shoulder: [1.85, 0.4],
      neck: { from: [1.9, 0.42], to: [2.85, 0.7], r: [0.17, 0.1], n: 6 },
      head: { y: 3.0, z: 0.82, s: [0.14, 0.14, 0.26], rx: 0.4 },
      muzzle: { y: 2.92, z: 1.02, s: [0.1, 0.09, 0.1], colour: 0xe9b77a },
      ears: { x: 0.14, y: 3.08, z: 0.72, s: [0.08, 0.035, 0.04], rz: -0.3 },
      eyes: { x: 0.11, y: 3.06, z: 0.88, size: 0.045 },
      tail: { y: 1.7, z: -0.6, s: [0.03, 0.3, 0.03], rx: 0.15, tuft: 0x4a3a2e },
    }, () => {
      for (const side of [-1, 1]) {
        b.cone(coat, side * 0.06, 3.2, 0.74, 0.03, 0.18)
        b.ball(spot, side * 0.06, 3.3, 0.74, 0.04)
      }
      for (let i = 0; i < 4; i++) b.pair(spot, 0.1 - i * 0.012, 2.05 + i * 0.22, 0.45 + i * 0.07, 0.045, 0.07, 0.07, [0, 0, 0], true)
    })
    // The spots: flat patches on both sides of the body.
    for (const [y, z] of [[1.75, 0.3], [1.55, 0.15], [1.78, -0.05], [1.5, -0.2], [1.72, -0.35], [1.48, 0.38]]) {
      b.pair(spot, 0.3, y, z, 0.06, 0.09, 0.1, [0, 0, 0], false)
    }
    return gait(0.28, -0.2, 2.6)
  },
  elephant(b) {
    const grey = 0x9aa3ad, dark = 0x7f8893, ivory = 0xfff3dc
    quadruped(b, {
      coat: grey, hoof: 0xd9d2c4, body: [1.3, -0.05, 0.62, 0.6, 0.86],
      legs: { x: 0.36, front: 0.48, back: -0.5, hip: 1.0, r: 0.2 },
      shoulder: [1.5, 0.7],
      head: { y: 1.62, z: 0.92, s: [0.42, 0.42, 0.38] },
      eyes: { x: 0.26, y: 1.7, z: 1.18, size: 0.055 },
      tail: { y: 1.4, z: -0.88, s: [0.04, 0.3, 0.04], rx: 0.2, tuft: dark },
    }, () => {
      // The big ears, the trunk and the tusks.
      b.pair(grey, 0.46, 1.66, 0.82, 0.07, 0.42, 0.34, [0, -0.35, 0])
      b.pair(0xe5b8bd, 0.5, 1.66, 0.84, 0.03, 0.3, 0.24, [0, -0.35, 0], true)
      b.chain(grey, [0, 1.48, 1.22], [0, 0.6, 1.38], [0.15, 0.08], 6, 0.04)
      b.ball(dark, 0, 0.54, 1.39, 0.09, 0.05, 0.09, [0, 0, 0], true)
      b.cone(ivory, -0.16, 1.32, 1.28, 0.045, 0.32, [2.4, 0, 0.2], true)
      b.cone(ivory, 0.16, 1.32, 1.28, 0.045, 0.32, [2.4, 0, -0.2], true)
    })
    return gait(0.22, 0.12, 2.6, { tail: 0.35 })
  },
  camel(b) {
    const coat = 0xd9a96a, foot = 0x8a6a4e
    quadruped(b, {
      coat, belly: 0xe8c48e, hoof: foot, body: [1.25, -0.05, 0.34, 0.32, 0.58],
      legs: { x: 0.2, front: 0.36, back: -0.4, hip: 1.12, r: 0.075 },
      shoulder: [1.3, 0.45],
      neck: { from: [1.28, 0.55], to: [1.62, 0.88], r: [0.15, 0.11], n: 4 },
      head: { y: 1.82, z: 1.02, s: [0.13, 0.13, 0.25], rx: 0.15 },
      muzzle: { y: 1.76, z: 1.22, s: [0.1, 0.09, 0.09], colour: 0xe8c48e },
      ears: { x: 0.1, y: 1.92, z: 0.92, s: [0.04, 0.06, 0.03], rz: 0.4 },
      eyes: { x: 0.11, y: 1.88, z: 1.08, size: 0.042 },
      tail: { y: 1.3, z: -0.6, s: [0.03, 0.22, 0.03], rx: 0.2, tuft: foot },
    })
    // One soft hump, and the low curve of the neck.
    b.ball(coat, 0, 1.58, -0.04, 0.24, 0.26, 0.3)
    b.ball(coat, 0, 1.3, 0.48, 0.15, 0.16, 0.16)
    return gait(0.3, 0.3, 2.8)
  },
  deer(b) { deer(b, { coat: 0xc08a5a, belly: 0xf3e2c8, antler: 0x8a6a4e, ruff: undefined, size: 1, crystal: false }); return gait(0.35, 0.9, 4) },
  reindeer(b) { deer(b, { coat: 0x8b6a4e, belly: 0xe9dfcf, antler: 0xd9c39b, ruff: 0xf1eadf, size: 1.12, crystal: false }); return gait(0.32, 0.9, 3.6) },
  crystalDeer(b) { deer(b, { coat: 0xe6f6f4, belly: 0xffffff, antler: 0x9fe8f0, ruff: 0xd8d0f6, size: 1.05, crystal: true }); return gait(0.33, 0.85, 3.8) },
  moose(b) {
    const coat = 0x6e4c35, legs = 0xb08a63, antler = 0xd9c39b
    quadruped(b, {
      coat, hoof: 0x3a2c22, body: [1.3, -0.05, 0.42, 0.42, 0.68],
      legs: { x: 0.24, front: 0.4, back: -0.45, hip: 1.1, r: 0.085, colour: legs },
      shoulder: [1.45, 0.5],
      neck: { from: [1.48, 0.55], to: [1.6, 0.72], r: [0.2, 0.17], n: 2 },
      head: { y: 1.58, z: 0.92, s: [0.16, 0.18, 0.34], rx: 0.4 },
      muzzle: { y: 1.42, z: 1.18, s: [0.14, 0.13, 0.13], colour: 0x5a3c2a },
      ears: { x: 0.14, y: 1.78, z: 0.78, s: [0.05, 0.1, 0.03], rz: 0.6 },
      eyes: { x: 0.13, y: 1.66, z: 0.98, size: 0.045 },
      tail: { y: 1.45, z: -0.68, s: [0.05, 0.08, 0.05] },
    }, () => {
      // Wide flat antlers: the shape of a moose from far.
      for (const side of [-1, 1]) {
        b.ball(antler, side * 0.2, 1.84, 0.78, 0.09, 0.06, 0.06)
        b.ball(antler, side * 0.42, 1.92, 0.76, 0.26, 0.05, 0.17, [0, 0, side * -0.35])
        for (let i = 0; i < 3; i++) b.cone(antler, side * (0.48 + i * 0.09), 2.02 + i * 0.02, 0.7 + i * 0.05, 0.03, 0.14, [0, 0, side * -0.4], true)
      }
      b.ball(coat, 0, 1.3, 0.94, 0.06, 0.12, 0.06, [0, 0, 0], true)
    })
    b.ball(coat, 0, 1.62, 0.25, 0.32, 0.22, 0.3)
    return gait(0.3, 0.55, 2.8)
  },
  fox(b) {
    const coat = 0xe8833a, white = 0xfff3e4, dark = 0x3b2a22
    quadruped(b, {
      coat, belly: white, hoof: dark, body: [0.36, -0.02, 0.15, 0.14, 0.3],
      legs: { x: 0.09, front: 0.18, back: -0.2, hip: 0.3, r: 0.04, colour: dark, foot: dark },
      shoulder: [0.42, 0.2],
      head: { y: 0.52, z: 0.34, s: [0.13, 0.12, 0.13] },
      muzzle: { y: 0.48, z: 0.47, s: [0.06, 0.05, 0.1], colour: white },
      eyes: { x: 0.07, y: 0.55, z: 0.44, size: 0.025 },
      tail: { y: 0.42, z: -0.28, s: [0.08, 0.2, 0.08], rx: 1.0, tuft: white },
    }, () => {
      for (const side of [-1, 1]) {
        b.cone(coat, side * 0.07, 0.68, 0.31, 0.045, 0.14, [0, 0, side * -0.2])
        b.cone(dark, side * 0.077, 0.74, 0.31, 0.022, 0.05, [0, 0, side * -0.2], true)
      }
      b.ball(dark, 0, 0.5, 0.57, 0.022, 0.018, 0.016, [0, 0, 0], true)
      b.ball(white, 0, 0.42, 0.42, 0.08, 0.08, 0.06)
    })
    return gait(0.45, 0.3, 7)
  },
  bear(b) {
    const coat = 0x8a5a3a, muzzle = 0xd9b48a
    quadruped(b, {
      coat, hoof: 0x5a3a26, body: [0.72, -0.05, 0.4, 0.38, 0.58],
      legs: { x: 0.24, front: 0.32, back: -0.36, hip: 0.5, r: 0.13 },
      shoulder: [0.85, 0.45],
      head: { y: 0.95, z: 0.62, s: [0.25, 0.23, 0.24] },
      muzzle: { y: 0.88, z: 0.82, s: [0.12, 0.1, 0.1], colour: muzzle },
      ears: { x: 0.17, y: 1.16, z: 0.56, s: [0.08, 0.08, 0.05], rz: 0.2 },
      eyes: { x: 0.11, y: 1.0, z: 0.8, size: 0.04 },
    }, () => {
      b.ball(INK, 0, 0.92, 0.92, 0.04, 0.03, 0.03, [0, 0, 0], true)
      b.pair(muzzle, 0.17, 1.15, 0.58, 0.04, 0.04, 0.03, [0, 0, 0], true)
    })
    b.ball(coat, 0, 0.92, 0.2, 0.3, 0.2, 0.25)
    return gait(0.3, 0.35, 3.4)
  },
  capybara(b) {
    const coat = 0xa0714a
    quadruped(b, {
      coat, hoof: 0x5a3a26, body: [0.32, -0.04, 0.22, 0.2, 0.36],
      legs: { x: 0.13, front: 0.2, back: -0.22, hip: 0.2, r: 0.06 },
      shoulder: [0.4, 0.25],
      head: { y: 0.44, z: 0.38, s: [0.13, 0.14, 0.18] },
      muzzle: { y: 0.42, z: 0.52, s: [0.11, 0.1, 0.07], colour: 0x8a5e3c },
      ears: { x: 0.09, y: 0.58, z: 0.31, s: [0.035, 0.035, 0.025], rz: 0 },
      eyes: { x: 0.1, y: 0.5, z: 0.44, size: 0.025 },
    })
    return gait(0.3, 0.25, 4)
  },
  monkey(b) {
    const coat = 0x8a5a3a, face = 0xf0d2b0
    b.ball(coat, 0, 0.36, 0, 0.16, 0.19, 0.17, [-0.3, 0, 0])
    b.ball(face, 0, 0.32, 0.08, 0.11, 0.14, 0.1, [-0.3, 0, 0], true)
    b.legs(0.11, 0.1, -0.08, 0.26, 0.05, coat, face, 1.2)
    b.on(3, [0.48, 0.05], () => {
      b.ball(coat, 0, 0.62, 0.1, 0.16, 0.15, 0.15)
      b.ball(face, 0, 0.6, 0.2, 0.12, 0.1, 0.07)
      b.pair(face, 0.16, 0.63, 0.08, 0.06, 0.07, 0.03)
      b.eyes(0.05, 0.64, 0.24, 0.025)
      b.ball(INK, 0, 0.57, 0.27, 0.02, 0.012, 0.01, [0, 0, 0], true)
    })
    // A long tail that curls up at the end.
    b.on(4, [0.3, -0.15], () => {
      b.limb(coat, [0, 0.28, -0.16], [0, 0.42, -0.42], 0.035, 0.032)
      b.limb(coat, [0, 0.42, -0.42], [0, 0.62, -0.46], 0.032, 0.03)
      b.limb(coat, [0, 0.62, -0.46], [0, 0.68, -0.34], 0.03, 0.028)
    })
    return gait(0.5, 0.15, 7, { tail: 0.4 })
  },
  meerkat(b) {
    const coat = 0xd9b98a, dark = 0x5a4632
    b.ball(coat, 0, 0.22, 0, 0.09, 0.17, 0.09)
    b.ball(0xf0dcb8, 0, 0.2, 0.05, 0.065, 0.13, 0.05, [0, 0, 0], true)
    b.legs(0.05, 0.03, -0.02, 0.07, 0.03, coat, dark)
    b.pair(coat, 0.07, 0.3, 0.06, 0.025, 0.06, 0.025, [0.3, 0, 0.2])
    b.on(3, [0.36, 0], () => {
      b.ball(coat, 0, 0.44, 0.02, 0.07, 0.07, 0.08)
      b.ball(coat, 0, 0.42, 0.09, 0.035, 0.03, 0.05)
      b.pair(dark, 0.035, 0.455, 0.075, 0.025, 0.025, 0.012, [0, 0, 0], true)
      b.eyes(0.035, 0.455, 0.08, 0.014)
      b.ball(INK, 0, 0.42, 0.135, 0.012, 0.01, 0.008, [0, 0, 0], true)
    })
    b.on(4, [0.08, -0.06], () => b.limb(coat, [0, 0.08, -0.07], [0, 0.03, -0.26], 0.028, 0.014))
    return gait(0.5, -0.1, 9, { tail: 0.15 })
  },
  hare(b) {
    const coat = 0xf4f6f8, dark = 0x3a3a40
    b.ball(coat, 0, 0.25, -0.04, 0.17, 0.17, 0.24)
    b.legs(0.11, 0.14, -0.12, 0.16, 0.05, coat, coat, 1.4)
    b.on(3, [0.36, 0.12], () => {
      b.ball(coat, 0, 0.45, 0.2, 0.12, 0.12, 0.13)
      for (const side of [-1, 1]) {
        b.ball(coat, side * 0.06, 0.66, 0.16, 0.035, 0.15, 0.03, [0, 0, side * -0.18])
        b.ball(dark, side * 0.083, 0.8, 0.16, 0.025, 0.035, 0.022, [0, 0, side * -0.18], true)
      }
      b.eyes(0.07, 0.48, 0.29, 0.025)
      b.ball(0xe7a6b4, 0, 0.43, 0.33, 0.02, 0.015, 0.012, [0, 0, 0], true)
    })
    b.on(4, [0.28, -0.25], () => b.ball(coat, 0, 0.3, -0.3, 0.06))
    return gait(0.4, 0.2, 9)
  },
  beaver(b) {
    const coat = 0x8b5e3c, tail = 0x4a3a32
    b.ball(coat, 0, 0.22, 0, 0.17, 0.17, 0.25)
    b.legs(0.11, 0.12, -0.12, 0.12, 0.05, coat, tail)
    b.on(3, [0.3, 0.15], () => {
      b.ball(coat, 0, 0.32, 0.24, 0.12, 0.11, 0.12)
      b.ball(0xa87a56, 0, 0.29, 0.34, 0.07, 0.06, 0.05)
      b.ball(WHITE, 0, 0.25, 0.37, 0.025, 0.03, 0.01, [0, 0, 0], true)
      b.pair(coat, 0.09, 0.42, 0.2, 0.03, 0.03, 0.02)
      b.eyes(0.07, 0.36, 0.33, 0.022)
    })
    b.on(4, [0.12, -0.22], () => b.ball(tail, 0, 0.06, -0.38, 0.1, 0.025, 0.17))
    return gait(0.4, 0.2, 6, { tail: 0.12 })
  },
  // ---- Birds and the shore ------------------------------------------------------------------------
  flamingo(b) {
    const pink = 0xf59cb0, deep = 0xe8738f, legs = 0xe98aa0
    b.ball(pink, 0, 0.84, -0.02, 0.16, 0.14, 0.24)
    b.pair(deep, 0.11, 0.86, -0.06, 0.06, 0.1, 0.19, [0, 0, 0], true)
    b.ball(deep, 0, 0.86, -0.27, 0.07, 0.06, 0.1)
    b.legX = 0.05
    for (const side of [-1, 1]) b.on(side < 0 ? 1 : 2, [0.75, 0], () => {
      b.ball(legs, side * 0.05, 0.38, 0, 0.018, 0.38, 0.018)
      b.ball(legs, side * 0.05, 0.03, 0.04, 0.04, 0.02, 0.06)
    })
    b.on(3, [0.92, 0.18], () => {
      b.limb(pink, [0, 0.9, 0.16], [0, 1.1, 0.28], 0.045, 0.04)
      b.limb(pink, [0, 1.1, 0.28], [0, 1.24, 0.16], 0.04, 0.04)
      b.ball(pink, 0, 1.27, 0.16, 0.06, 0.055, 0.07)
      b.cone(0xf5e6e0, 0, 1.24, 0.25, 0.025, 0.1, [2.0, 0, 0])
      b.cone(INK, 0, 1.2, 0.29, 0.016, 0.05, [2.6, 0, 0], true)
      b.eyes(0.04, 1.29, 0.19, 0.016)
    })
    return gait(0.3, 0.7, 3.5)
  },
  penguin(b) {
    const navy = 0x2f3a4a, white = 0xf7f7f2, orange = 0xf3a23a
    b.ball(navy, 0, 0.34, -0.02, 0.21, 0.3, 0.19)
    b.ball(white, 0, 0.32, 0.06, 0.17, 0.25, 0.14)
    b.legX = 0.08
    for (const side of [-1, 1]) b.on(side < 0 ? 1 : 2, [0.12, 0.04], () => b.ball(orange, side * 0.08, 0.03, 0.08, 0.06, 0.025, 0.09))
    for (const side of [-1, 1]) b.on(5, [0.48, 0.18], () => b.ball(navy, side * 0.22, 0.36, 0, 0.035, 0.17, 0.08, [0, 0, side * 0.25]), side)
    b.on(3, [0.55, 0], () => {
      b.ball(navy, 0, 0.66, 0.01, 0.15, 0.14, 0.14)
      b.pair(white, 0.07, 0.65, 0.09, 0.05, 0.06, 0.04)
      b.cone(orange, 0, 0.63, 0.17, 0.03, 0.09, [Math.PI / 2, 0, 0])
      b.eyes(0.06, 0.68, 0.11, 0.02)
      b.cheeks(0.09, 0.61, 0.1, 0.022)
    })
    b.on(4, [0.08, -0.15], () => b.ball(navy, 0, 0.08, -0.2, 0.07, 0.03, 0.07))
    return gait(0.25, 0.1, 6, { wing: 0.4, tail: 0.15 })
  },
  seal(b) {
    const grey = 0x9aa4ad, light = 0xc9d0d6
    b.ball(grey, 0, 0.2, -0.05, 0.22, 0.19, 0.48)
    b.ball(light, 0, 0.13, 0, 0.18, 0.11, 0.4)
    b.on(3, [0.25, 0.3], () => {
      b.ball(grey, 0, 0.36, 0.42, 0.15, 0.14, 0.15)
      b.ball(light, 0, 0.32, 0.54, 0.08, 0.06, 0.06)
      b.eyes(0.07, 0.4, 0.53, 0.028)
      b.pair(INK, 0.04, 0.33, 0.6, 0.008, 0.008, 0.008, [0, 0, 0], true)
    })
    for (const side of [-1, 1]) b.on(5, [0.15, 0.17], () => b.ball(grey, side * 0.22, 0.08, 0.2, 0.08, 0.025, 0.12, [0, side * 0.5, 0]), side)
    b.on(6, [0.15, -0.45], () => b.pair(grey, 0.07, 0.12, -0.58, 0.07, 0.025, 0.12, [0, 0.4, 0]))
    for (const [x, z] of [[0.12, 0.1], [-0.15, -0.15], [0.08, -0.3]]) b.ball(0x7c8690, x, 0.36, z, 0.03, 0.01, 0.03, [0, 0, 0], true)
    return gait(0.1, 0.2, 3, { wing: 0.35 })
  },
  turtle(b) {
    const shell = 0x6f8f4a, skin = 0xb7c98a, pattern = 0x587a3a
    b.ball(shell, 0, 0.12, 0, 0.3, 0.13, 0.36)
    for (const [x, z] of [[0, 0.1], [0, -0.14], [0.14, 0], [-0.14, 0], [0.1, 0.2], [-0.1, 0.2], [0.1, -0.2], [-0.1, -0.2]]) b.ball(pattern, x, 0.2, z, 0.07, 0.05, 0.07, [0, 0, 0], true)
    b.on(3, [0.1, 0.3], () => {
      b.ball(skin, 0, 0.13, 0.42, 0.09, 0.08, 0.11)
      b.eyes(0.055, 0.16, 0.48, 0.02)
    })
    for (const side of [-1, 1]) {
      b.on(5, [0.08, 0.22], () => b.ball(skin, side * 0.32, 0.06, 0.18, 0.16, 0.025, 0.08, [0, side * -0.4, 0]), side)
      b.on(5, [0.06, 0.12], () => b.ball(skin, side * 0.24, 0.05, -0.28, 0.09, 0.02, 0.06, [0, side * 0.4, 0]), side)
    }
    return gait(0.1, 0.15, 3, { wing: 0.3 })
  },
  parrot(b) { flyingBird(b, { body: 0xe8473a, wing: 0x3a7be0, tip: 0xf6c33f, beak: 0xf2e3c8, size: 0.55, tail: 0x3a7be0 }); return gait(0, 0, 9, { wing: 0.7 }) },
  seagull(b) { flyingBird(b, { body: 0xf6f6f2, wing: 0xb9c2cc, tip: 0x3a3a40, beak: 0xf3c23a, size: 0.5, long: 1.05 }); return gait(0, 0, 5, { wing: 0.45 }) },
  stork(b) { flyingBird(b, { body: 0xf4f1ea, wing: 0xf4f1ea, tip: 0x2c2a2e, beak: 0xe0533a, size: 0.8, long: 1.1, neck: 1 }); return gait(0, 0, 4, { wing: 0.4 }) },
  goose(b) { flyingBird(b, { body: 0x8d8172, wing: 0x9a8d7c, tip: 0x5a5048, beak: 0x2c2a2e, size: 0.55, neckColour: 0x2c2a2e }); return gait(0, 0, 6, { wing: 0.55 }) },
  // ---- The sea ----------------------------------------------------------------------------------------
  dolphin(b) {
    const top = 0x7f9fb8, belly = 0xdfe8ee
    b.ball(top, 0, 0, 0, 0.24, 0.24, 0.8)
    b.ball(belly, 0, -0.07, 0.08, 0.2, 0.17, 0.66)
    b.on(3, [0, 0.6], () => {
      b.ball(top, 0, 0.04, 0.72, 0.19, 0.18, 0.22)
      b.ball(belly, 0, -0.02, 0.93, 0.08, 0.06, 0.12)
      b.eyes(0.15, 0.06, 0.82, 0.035)
    })
    b.cone(top, 0, 0.27, -0.05, 0.08, 0.26, [-0.5, 0, 0])
    b.pair(top, 0.24, -0.1, 0.25, 0.14, 0.025, 0.08, [0, 0.5, -0.3])
    b.on(6, [0, -0.6], () => {
      b.ball(top, 0, 0.0, -0.82, 0.08, 0.08, 0.2)
      b.pair(top, 0.14, 0.0, -1.0, 0.16, 0.025, 0.08, [0, -0.5, 0])
    })
    return gait(0, 0, 3)
  },
  whale(b) {
    const top = 0x5d7fa8, belly = 0xe9e4d6
    b.ball(top, 0, 0, 0, 1.4, 1.2, 4.2)
    b.ball(belly, 0, -0.45, 0.5, 1.15, 0.85, 3.6)
    b.on(3, [0, 3], () => b.eyes(1.2, 0.05, 2.6, 0.16))
    b.cone(top, 0, 1.15, -1.6, 0.22, 0.5, [-0.6, 0, 0])
    b.pair(top, 1.35, -0.5, 1.4, 0.9, 0.12, 0.4, [0, 0.5, -0.3])
    b.on(6, [0, -3.6], () => {
      b.ball(top, 0, 0.1, -4.4, 0.4, 0.35, 0.9)
      b.pair(top, 0.75, 0.15, -5.2, 0.9, 0.1, 0.42, [0, -0.45, 0])
    })
    return gait(0, 0, 0.8)
  },
  fish(b) {
    const silver = 0xbfd6e6, blue = 0x6f9fc8
    b.ball(silver, 0, 0, 0, 0.05, 0.08, 0.15)
    b.ball(blue, 0, 0.03, -0.01, 0.045, 0.05, 0.13)
    b.on(6, [0, -0.1], () => b.ball(blue, 0, 0, -0.18, 0.012, 0.07, 0.06))
    b.eyes(0.035, 0.02, 0.09, 0.012)
    return gait(0, 0, 8)
  },
  // ---- Blossom Haven ---------------------------------------------------------------------------------
  gummyBear(b) {
    // A white body: each cub gets its candy colour from the colour of its instance.
    const jelly = 0xf6f6f6
    b.ball(jelly, 0, 0.42, 0, 0.25, 0.28, 0.21)
    b.ball(0xffffff, 0, 0.4, 0.13, 0.15, 0.17, 0.1, [0, 0, 0], true)
    b.legs(0.12, 0.04, -0.04, 0.2, 0.09, jelly, jelly)
    b.pair(jelly, 0.24, 0.5, 0.08, 0.07, 0.12, 0.07, [0.4, 0, 0.5])
    b.on(3, [0.66, 0], () => {
      b.ball(jelly, 0, 0.82, 0.03, 0.22, 0.2, 0.19)
      b.pair(jelly, 0.15, 0.99, 0, 0.07, 0.07, 0.05)
      b.ball(0xffffff, 0, 0.77, 0.19, 0.08, 0.06, 0.05)
      b.eyes(0.08, 0.86, 0.18, 0.035)
      b.ball(INK, 0, 0.79, 0.24, 0.025, 0.018, 0.014, [0, 0, 0], true)
    })
    return gait(0.35, 0.15, 7)
  },
  flossLamb(b) {
    const pink = 0xf7b8d8, blue = 0xb8d8f7, lilac = 0xd8c3ef, face = 0xfff2dc
    // The fleece: soft puffs in two candy-floss colours.
    const puffs: [number, number, number, number, number][] = [[0, 0.58, 0, 0.32, pink], [0.18, 0.62, 0.15, 0.2, blue], [-0.18, 0.62, 0.15, 0.2, pink], [0.2, 0.58, -0.17, 0.2, pink], [-0.2, 0.58, -0.17, 0.2, blue], [0, 0.8, -0.05, 0.22, pink], [0, 0.72, 0.22, 0.18, blue], [0, 0.55, -0.32, 0.17, lilac]]
    for (const [x, y, z, r, c] of puffs) b.ball(c, x, y, z, r)
    b.legs(0.13, 0.16, -0.16, 0.35, 0.045, lilac, lilac)
    b.on(3, [0.62, 0.3], () => {
      b.ball(face, 0, 0.66, 0.42, 0.14, 0.15, 0.13)
      b.ball(pink, 0, 0.8, 0.38, 0.12, 0.08, 0.1)
      b.pair(face, 0.15, 0.68, 0.38, 0.08, 0.035, 0.05, [0, 0, -0.3])
      b.eyes(0.06, 0.69, 0.51, 0.028)
      b.cheeks(0.09, 0.63, 0.5, 0.025)
    })
    return gait(0.4, 0.3, 6)
  },
  jelly(b) {
    const bell = 0xf6f6f6
    b.ball(bell, 0, 0.18, 0, 0.32, 0.26, 0.32)
    b.ball(0xffffff, 0, 0.3, 0.1, 0.12, 0.08, 0.1, [0, 0, 0], true)
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2
      b.ball(bell, Math.cos(a) * 0.27, -0.02, Math.sin(a) * 0.27, 0.09, 0.06, 0.09)
    }
    b.on(6, [0, 0], () => {
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + 0.3
        b.limb(bell, [Math.cos(a) * 0.14, -0.06, Math.sin(a) * 0.14], [Math.cos(a) * 0.2, -0.5, Math.sin(a) * 0.2], 0.04, 0.022)
      }
    })
    b.eyes(0.1, 0.2, 0.27, 0.035)
    b.cheeks(0.17, 0.13, 0.25, 0.03)
    return gait(0, 0, 2)
  },
  serpent(b) {
    const mint = 0x9ed8c4, cream = 0xfff2dc, lilac = 0xc3a6e6
    // Three humps over the soda, then the head. The humps are rings of balls that rise out of the soda.
    for (const [z, h] of [[-2.6, 0.45], [-1.6, 0.55], [-0.6, 0.6]] as [number, number][]) {
      for (let i = 0; i < 9; i++) {
        const t = i / 8, a = t * Math.PI
        b.ball(i % 3 === 1 ? lilac : mint, 0, Math.sin(a) * h - 0.05, z - 0.42 + t * 0.84, 0.19, 0.19, 0.19)
      }
    }
    b.on(3, [0.2, 0.3], () => {
      b.limb(mint, [0, -0.05, 0.25], [0, 0.85, 0.52], 0.19, 0.16)
      b.ball(mint, 0, 1.0, 0.62, 0.24, 0.21, 0.28)
      b.ball(cream, 0, 0.92, 0.82, 0.14, 0.1, 0.1)
      b.eyes(0.13, 1.08, 0.78, 0.055)
      b.cheeks(0.18, 0.95, 0.75, 0.04)
      for (const side of [-1, 1]) b.ball(lilac, side * 0.2, 1.18, 0.5, 0.05, 0.15, 0.1, [0, 0, side * -0.5])
      for (let i = 0; i < 3; i++) b.cone(cream, 0, 1.2 - i * 0.14, 0.42 - i * 0.12, 0.05, 0.12, [-0.6, 0, 0], true)
    })
    return gait(0, 0, 1.2)
  },
  lanternMoth(b) {
    const fuzz = 0xfff2dc, wing = 0xffd27a, glow = 0xffb347
    b.ball(fuzz, 0, 0, 0, 0.07, 0.07, 0.13)
    b.ball(fuzz, 0, 0.02, 0.12, 0.07)
    b.eyes(0.04, 0.04, 0.17, 0.02)
    for (const side of [-1, 1]) {
      b.ball(fuzz, side * 0.03, 0.1, 0.16, 0.01, 0.06, 0.01, [0.3, 0, side * -0.4], true)
      b.on(5, [0.02, 0.04], () => {
        b.ball(wing, side * 0.17, 0.02, 0.03, 0.15, 0.02, 0.12)
        b.ball(glow, side * 0.19, 0.035, 0.03, 0.06, 0.015, 0.05, [0, 0, 0], true)
        b.ball(wing, side * 0.13, 0.01, -0.1, 0.09, 0.02, 0.07)
      }, side)
    }
    return gait(0, 0, 6, { wing: 0.6 })
  },
}

type DeerLook = { coat: number; belly: number; antler: number; ruff?: number; size: number; crystal: boolean }
function deer(b: Builder, d: DeerLook) {
  const k = d.size
  quadruped(b, {
    coat: d.coat, belly: d.belly, hoof: d.crystal ? 0x9fe8f0 : 0x3a2c22, body: [0.82 * k, -0.04, 0.24 * k, 0.26 * k, 0.46 * k],
    legs: { x: 0.14 * k, front: 0.28 * k, back: -0.32 * k, hip: 0.74 * k, r: 0.05 * k },
    shoulder: [0.95 * k, 0.32 * k],
    neck: { from: [0.98 * k, 0.36 * k], to: [1.18 * k, 0.48 * k], r: [0.12 * k, 0.09 * k], n: 3 },
    head: { y: 1.26 * k, z: 0.56 * k, s: [0.12 * k, 0.13 * k, 0.19 * k], rx: 0.35 },
    muzzle: { y: 1.2 * k, z: 0.7 * k, s: [0.07 * k, 0.065 * k, 0.07 * k], colour: d.crystal ? 0xd8c3ef : 0x3a2c22 },
    ears: { x: 0.12 * k, y: 1.36 * k, z: 0.5 * k, s: [0.09 * k, 0.04 * k, 0.03 * k], rz: -0.5 },
    eyes: { x: 0.085 * k, y: 1.3 * k, z: 0.64 * k, size: 0.032 * k },
    tail: { y: 0.98 * k, z: -0.46 * k, s: [0.05 * k, 0.07 * k, 0.04 * k], rx: 0.4, tuft: 0xffffff },
  }, () => {
    if (d.ruff !== undefined) b.ball(d.ruff, 0, 1.04 * k, 0.42 * k, 0.12 * k, 0.12 * k, 0.1 * k)
    // Antlers: a stem and three tines on each side. The crystal deer has sugar crystals.
    for (const side of [-1, 1]) {
      const x = side * 0.06 * k
      if (d.crystal) {
        b.cone(d.antler, x, 1.48 * k, 0.5 * k, 0.04 * k, 0.32 * k, [-0.2, 0, side * -0.3])
        b.cone(d.antler, x * 2.4, 1.52 * k, 0.48 * k, 0.03 * k, 0.24 * k, [-0.1, 0, side * -0.9])
        b.cone(0xd8c3ef, x * 1.6, 1.62 * k, 0.42 * k, 0.03 * k, 0.22 * k, [-0.5, 0, side * -0.4])
      } else {
        b.ball(d.antler, x * 2, 1.5 * k, 0.48 * k, 0.025 * k, 0.17 * k, 0.025 * k, [-0.3, 0, side * -0.5])
        b.ball(d.antler, x * 3.6, 1.66 * k, 0.42 * k, 0.022 * k, 0.12 * k, 0.022 * k, [-0.5, 0, side * -0.2])
        b.ball(d.antler, x * 2.8, 1.62 * k, 0.56 * k, 0.02 * k, 0.09 * k, 0.02 * k, [0.4, 0, side * -0.3], true)
        b.ball(d.antler, x * 4.2, 1.56 * k, 0.4 * k, 0.02 * k, 0.08 * k, 0.02 * k, [0, 0, side * -1.1], true)
      }
    }
  })
  if (d.crystal) for (const [x, y, z] of [[0.18, 0.92, 0.1], [-0.2, 0.86, -0.15], [0.15, 0.8, -0.3]]) b.cone(0xd8c3ef, x * k, y * k, z * k, 0.03 * k, 0.08 * k, [0, 0, Math.sign(x) * -1.2], true)
}

/** The ids of the species that have a prototype model in this file. */
export const SHAPE_IDS = Object.keys(BUILDERS)

const cache = new Map<string, Shape>()
/** The parts of a species. Unknown ids throw. */
export function shapeOf(id: string): Shape {
  const known = cache.get(id)
  if (known) return known
  const make = BUILDERS[id]
  if (!make) throw new Error(`No shape for ${id}`)
  const b = new Builder()
  const gaitOf = make(b)
  // The jelly creatures of Blossom Haven are smooth and shiny; the animals of Earth are faceted, as today.
  const smooth = ['gummyBear', 'jelly', 'flossLamb', 'serpent', 'lanternMoth', 'crystalDeer'].includes(id)
  const shape = { id, parts: b.parts, gait: gaitOf, flat: !smooth, shine: id === 'gummyBear' || id === 'jelly' ? 0.25 : smooth ? 0.6 : 0.92 }
  cache.set(id, shape)
  return shape
}
