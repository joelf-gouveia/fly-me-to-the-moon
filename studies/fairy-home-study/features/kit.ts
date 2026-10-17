import * as THREE from 'three'
import type { Lab } from '../../feature-ideas-study/lab'
import { HOME_CLEARING_HEIGHT } from '../../../src/terrain'
import { colorOf, createHomeBuilder, TODAY } from '../parts'
import type { ColorId, HomeLook, PartId } from '../parts'
import './features.css'

/** The parts that the clips of the fairy home study share. */
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
export const ramp = (t: number, from: number, to: number) => clamp01((t - from) / (to - from))
export const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * A layer of 1280 × 720 px over the 3D view. It has the size of the clip, and it scales to the
 * live view of the page, so a caption has the same place in the clip and in the live view.
 */
export function createLayer(lab: Lab) {
  const layer = document.createElement('div')
  layer.className = 'fh-layer'
  lab.overlay.append(layer)
  return {
    layer,
    scale: () => (lab.host.clientWidth || 1280) / 1280,
    /** Fits the layer to the view. Call it in each frame: the live view can change its size. */
    fit() { layer.style.transform = `scale(${(lab.host.clientWidth || 1280) / 1280})` },
  }
}

/** A caption at the bottom of the clip, from `from` to `to` seconds of the clip. */
export function createCaption(layer: HTMLElement, lines: [from: number, to: number, html: string][]) {
  const caption = document.createElement('p')
  caption.className = 'fh-caption'
  layer.append(caption)
  let shown = ''
  return (t: number) => {
    const line = lines.find(([from, to]) => t >= from && t < to)
    if (!line) { caption.style.visibility = 'hidden'; return }
    if (line[2] !== shown) { caption.innerHTML = line[2]; shown = line[2] }
    caption.style.visibility = 'visible'
    caption.style.opacity = String(Math.min(1, (t - line[0]) / 0.3, (line[1] - t) / 0.3))
  }
}

/** A label at the top of the clip: the name of the option on show. */
export function createTag(layer: HTMLElement) {
  const tag = document.createElement('p')
  tag.className = 'fh-tag'
  layer.append(tag)
  let shown = ''
  return (html: string | null) => {
    tag.style.visibility = html ? 'visible' : 'hidden'
    if (html && html !== shown) { tag.innerHTML = html; shown = html }
  }
}

// ---- The home in the lab --------------------------------------------------------------------------
type Builder = ReturnType<typeof createHomeBuilder>
const builders = new WeakMap<Lab, Builder>()
/** The live home of the lab. The first call puts the built home in place of the cottage of today. */
export function homeOf(lab: Lab) {
  if (!builders.has(lab)) builders.set(lab, createHomeBuilder(lab.home.surface, lab.home.radius + HOME_CLEARING_HEIGHT))
  return builders.get(lab)!
}

/** The frame of the home in the world: its ground point, its up, its front (+z) and its side (+x). */
export function homeFrame(lab: Lab) {
  const group = homeOf(lab).group
  group.updateWorldMatrix(true, false)
  const centre = new THREE.Vector3().setFromMatrixPosition(group.matrixWorld)
  const basis = new THREE.Matrix3().setFromMatrix4(group.matrixWorld)
  const side = new THREE.Vector3(1, 0, 0).applyMatrix3(basis).normalize()
  const up = new THREE.Vector3(0, 1, 0).applyMatrix3(basis).normalize()
  const front = new THREE.Vector3(0, 0, 1).applyMatrix3(basis).normalize()
  /** A point of the home frame: `x` to the side, `y` up and `z` to the front, in metres. */
  const at = (x: number, y: number, z: number) => centre.clone().addScaledVector(side, x).addScaledVector(up, y).addScaledVector(front, z)
  return { centre, up, front, side, at }
}

/**
 * A camera that turns around the home. `angle` is 0 at the front and grows to the right (radians);
 * `distance` and `height` are in metres; `look` is the height of the point it looks at, and
 * `shift` moves that point to the side, so the home stands left of the middle of the view.
 */
export type Orbit = { angle: number; distance: number; height: number; look: number; shift?: number }
export function orbitPose(frame: ReturnType<typeof homeFrame>, orbit: Orbit) {
  const across = frame.front.clone().multiplyScalar(Math.cos(orbit.angle)).addScaledVector(frame.side, Math.sin(orbit.angle))
  const eye = frame.centre.clone().addScaledVector(across, orbit.distance).addScaledVector(frame.up, orbit.height)
  const right = new THREE.Vector3().crossVectors(frame.up, across).normalize()
  const target = frame.centre.clone().addScaledVector(frame.up, orbit.look).addScaledVector(right, orbit.shift ?? 0)
  return { eye, target, up: frame.up.clone() }
}
export function setPose(camera: THREE.PerspectiveCamera, pose: { eye: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3 }) {
  camera.position.copy(pose.eye)
  camera.up.copy(pose.up)
  camera.lookAt(pose.target)
}
export const mixOrbit = (a: Orbit, b: Orbit, k: number): Orbit => ({
  angle: THREE.MathUtils.lerp(a.angle, b.angle, k), distance: THREE.MathUtils.lerp(a.distance, b.distance, k),
  height: THREE.MathUtils.lerp(a.height, b.height, k), look: THREE.MathUtils.lerp(a.look, b.look, k), shift: THREE.MathUtils.lerp(a.shift ?? 0, b.shift ?? 0, k),
})

/** Points the fairy from `from` to `to` and keeps her there: a hover. */
export function hoverFairy(lab: Lab, from: THREE.Vector3, to: THREE.Vector3, start = 0, end?: number) {
  lab.setRailPoints(lab.home, [from.clone(), from.clone().lerp(to, 0.0004), from.clone().lerp(to, 0.0008)], start, end)
}

/** Turns Blossom Haven so that the home has the Sun at `elevation` degrees and in the direction `toward` of the home frame. */
export function lightHome(lab: Lab, elevation = 38, toward: [number, number] = [0.55, 0.8]) {
  const home = lab.home, frame = homeFrame(lab)
  const sun = lab.sun.group.position.clone().sub(frame.centre).normalize()
  const e = THREE.MathUtils.degToRad(elevation)
  const flat = frame.side.clone().multiplyScalar(toward[0]).addScaledVector(frame.front, toward[1]).normalize()
  const wanted = frame.up.clone().multiplyScalar(Math.sin(e)).addScaledVector(flat, Math.cos(e)).normalize()
  // The turn that takes the wanted direction (in the frame of the home now) to the Sun.
  const turn = new THREE.Quaternion().setFromUnitVectors(wanted, sun)
  home.group.quaternion.premultiply(turn)
  home.group.updateMatrixWorld(true)
}

/** Keeps the turn of Blossom Haven and the look of the home, and gives them back at the end of a clip. */
export function keepHome(lab: Lab) {
  const quaternion = lab.home.group.quaternion.clone()
  return () => {
    lab.home.group.quaternion.copy(quaternion)
    lab.home.group.updateMatrixWorld(true)
    homeOf(lab).apply(TODAY)
  }
}

// ---- The change of a part -----------------------------------------------------------------------
/** The new part grows from small with a small bounce in 0.5 s, and a puff of petals in its colour goes out. */
const backOut = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)
export function createChanges(lab: Lab) {
  const pops: { group: THREE.Object3D; start: number }[] = []
  const puffs = createPuffs(lab.scene, lab.softDisc())
  return {
    /** Starts the pop of each group at the time `t`, and a puff at the place of the first group. */
    pop(groups: THREE.Object3D[], t: number, color: number, size = 1) {
      for (const group of groups) { pops.push({ group, start: t }); group.scale.setScalar(0.01) }
      const box = new THREE.Box3().setFromObject(groups[0])
      puffs.fire(box.getCenter(new THREE.Vector3()), Math.max(1.2, box.getSize(new THREE.Vector3()).length() * 0.3) * size, color, t)
    },
    puff(at: THREE.Vector3, radius: number, color: number, t: number) { puffs.fire(at, radius, color, t) },
    update(t: number, camera: THREE.Camera) {
      for (const pop of pops) {
        const k = clamp01((t - pop.start) / 0.5)
        pop.group.scale.setScalar(Math.max(0.01, backOut(k)))
      }
      puffs.update(t, camera)
    },
    reset() { pops.length = 0; puffs.clear() },
    dispose() { puffs.dispose() },
  }
}

/** Puffs of soft petals. Each petal goes out and up, slows, falls a little and fades in 1.3 s. */
function createPuffs(scene: THREE.Scene, texture: THREE.Texture) {
  const COUNT = 220
  const positions = new Float32Array(COUNT * 3), colors = new Float32Array(COUNT * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({ size: 0.42, map: texture, vertexColors: true, transparent: true, depthWrite: false, opacity: 1 })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = 4
  scene.add(points)
  type Petal = { from: THREE.Vector3; way: THREE.Vector3; start: number; color: THREE.Color }
  let petals: Petal[] = []
  const tint = new THREE.Color(), white = new THREE.Color(0xffffff)
  return {
    fire(at: THREE.Vector3, radius: number, color: number, t: number) {
      const base = new THREE.Color(color)
      for (let i = 0; i < 44; i++) {
        const way = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(radius * (0.7 + Math.random() * 0.8))
        petals.push({ from: at.clone(), way, start: t + Math.random() * 0.08, color: base.clone().lerp(white, Math.random() * 0.45) })
      }
      if (petals.length > COUNT) petals = petals.slice(-COUNT)
    },
    update(t: number, camera: THREE.Camera) {
      // The up of the puff is the up of the camera: near the home, that is the up of the ground.
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
      let n = 0
      for (const petal of petals) {
        const age = (t - petal.start) / 1.3
        if (age < 0 || age > 1) continue
        const out = 1 - Math.pow(1 - age, 3)
        const p = petal.from.clone().addScaledVector(petal.way, out).addScaledVector(up, -age * age * 0.9)
        positions.set([p.x, p.y, p.z], n * 3)
        tint.copy(petal.color).multiplyScalar(1 - age * age)
        colors.set([tint.r, tint.g, tint.b], n * 3)
        n++
      }
      geometry.setDrawRange(0, n)
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
    },
    clear() { petals = []; geometry.setDrawRange(0, 0) },
    dispose() { scene.remove(points); geometry.dispose(); material.dispose() },
  }
}

// ---- The steps of a clip --------------------------------------------------------------------------
/** A step of a clip: at the time `t`, a new option of a part, a new colour, or a whole new look. */
export type Step = { t: number; set?: [PartId, string]; paint?: [PartId, ColorId]; look?: HomeLook; tag?: string; quiet?: boolean }
/**
 * Plays the steps of a clip on the home of the lab. A clip that goes back to its start (the live
 * view plays it again) gets its first look again.
 */
export function createSteps(lab: Lab, first: HomeLook, steps: Step[]) {
  const builder = homeOf(lab)
  const changes = createChanges(lab)
  let done = 0, last = -1, tag: string | null = null
  function reset() {
    builder.apply(first)
    for (const part of Object.values(builder.parts)) part.scale.setScalar(1)
    changes.reset()
    done = 0; tag = steps[0]?.t === 0 ? steps[0].tag ?? null : null
  }
  function play(step: Step) {
    if (step.tag !== undefined) tag = step.tag
    if (step.look) {
      builder.apply(step.look)
      if (!step.quiet) changes.pop(Object.values(builder.parts), step.t, colorOf(step.look.colors.roof), 1.2)
    } else if (step.set) {
      const groups = builder.set(step.set[0], step.set[1])
      if (!step.quiet) changes.pop(groups, step.t, colorOf(builder.look.colors[step.set[0]]))
    } else if (step.paint) {
      builder.paint(step.paint[0], step.paint[1])
      const part = builder.parts[step.paint[0]]
      if (!step.quiet) changes.puff(new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3()), 1.6, colorOf(step.paint[1]), step.t)
    }
  }
  reset()
  return {
    builder,
    get tag() { return tag },
    /** Plays a step now: the live build mode of the page. */
    run(step: Omit<Step, 't'>) { play({ ...step, t: Math.max(last, 0) }) },
    update(t: number, camera: THREE.Camera) {
      if (t < last) reset()
      last = t
      while (done < steps.length && steps[done].t <= t) play(steps[done++])
      changes.update(t, camera)
    },
    dispose() { changes.dispose() },
  }
}
