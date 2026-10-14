import * as THREE from 'three'
import { snowCover } from '../seasons'
import type { TerrainSample } from '../terrain'
import { createFields } from '../foliage/zones'
import type { Fields } from '../foliage/zones'
import type { KindId, Species } from './catalog'
import { canSayHello, createHeartPool, heartCount, heartPool, heartPose, helloLength, helloLift, helloPoint, helloTurn } from './hello'
import type { HeartPose } from './hello'
import { lateralOf, placeHerds } from './herds'
import type { Herd } from './herds'
import { farMaterial, gaitOf, joinedGeometry, RIG_TIME, rigMaterial } from './joined'
import { fits, magicFits, placeAt, seasonFor, seasonsOf } from './rules'
import { createPointLayer } from './points'
import { CreatureObstacles, SphericalHabitat } from './spherical'

/**
 * The limits of the herds (option B of docs/animals-study.md, and the phone limit of TODO item 4).
 * `cap` is the most animals drawn as models, `near` the distance of the moving model, `far` the
 * distance of the far model. `calls` is the most draw calls of the animal models: the limit of the
 * draw calls of the animals (40 on a computer, 20 on a phone) keeps three more for the hearts and the
 * two kinds of points of the small life. The small life (option C) is a tiny model to `smallNear` m,
 * at most `smallModels` of them, and a point to `dots` m. `pose` is the time between two pose
 * updates of a far herd, in seconds.
 */
export const HERD_LIMITS = {
  computer: { cap: 260, near: 45, far: 170, calls: 37, smallNear: 60, smallModels: 90, dots: 220 },
  phone: { cap: 130, near: 32, far: 170, calls: 17, smallNear: 40, smallModels: 45, dots: 220 },
  pose: 0.1,
} as const

/**
 * One animal, for the search star, the studies and the browser checks. `route` is the route of the
 * centre of its herd. The fields of the residents of the first game stay, so the old studies still run.
 */
export type Resident = { kind: KindId; route: THREE.Vector3[]; durations: number[]; cycle: number; phase: number; scale: number; herd: Herd; member: number }

/**
 * The time of the world for the herds: the year of Earth and the tilt of its axis (src/seasons.ts),
 * the magic year of Blossom Haven (src/magic-seasons.ts), the direction of the Sun in the frame of
 * the world, and the camera for the culling. A value that is not given shows each kind in each season.
 */
export type LifeState = { year?: number; tilt?: number; magic?: number; sun?: THREE.Vector3; view?: THREE.Camera }
export type PopulationWorld = { kind: 'earth' | 'fairy'; radius: number; seed: number; sample: (x: number, y: number, z: number) => TerrainSample; mobile?: boolean }

/** The pose cache of one herd: a matrix, a place, a motion, a hop and a flag "shown" for each member, made at the time `at`. */
type Cache = { at: number; resting: number; matrices: Float32Array; places: Float32Array; moving: Float32Array; hops: Float32Array; shown: Uint8Array }
type Batch = { mesh: THREE.InstancedMesh; move: THREE.InstancedBufferAttribute | null; used: number }
/** One animal drawn in this frame. */
type Drawn = { herd: Herd; cache: Cache; member: number; resident: number; distance: number; near: boolean; slot: number; batch: Batch | null }

const HARE_SUMMER = new THREE.Color(0xa98463), WHITE = new THREE.Color(1, 1, 1)

/** A world's animals survive camera movement; only terrain regeneration replaces them. */
export function createPopulation(
  parent: THREE.Group, groundGeometry: THREE.SphereGeometry, waterGeometry: THREE.SphereGeometry,
  world: PopulationWorld, obstacles: CreatureObstacles, seed: number, anchor: THREE.Vector3,
) {
  const radius = world.radius, mobile = Boolean(world.mobile), fairy = world.kind === 'fairy'
  const limits = mobile ? HERD_LIMITS.phone : HERD_LIMITS.computer
  const ground = new SphericalHabitat(groundGeometry, radius), water = new SphericalHabitat(waterGeometry, radius)
  const herds = placeHerds({ world: world.kind, seed: world.seed, random: seed, radius, sample: world.sample, ground, obstacles, anchor })
  // One resident for each animal, in the order of the herds.
  const residents: Resident[] = [], firstResident: number[] = []
  for (const herd of herds) {
    firstResident.push(residents.length)
    herd.members.forEach((member, index) => residents.push({ kind: herd.species.id, route: herd.route, durations: herd.durations, cycle: herd.cycle, phase: herd.phase, scale: member.scale, herd, member: index }))
  }
  // The markers: one empty object for each near animal, with the name and the kind of the animal.
  const group = new THREE.Group(); group.name = 'wildlife'; parent.add(group)
  // The instanced models of the herds.
  const layer = new THREE.Group(); layer.name = 'wildlife-herds'; parent.add(layer)
  const caches = herds.map((herd): Cache => ({
    at: -Infinity, resting: -1,
    matrices: new Float32Array(herd.members.length * 16), places: new Float32Array(herd.members.length * 3),
    moving: new Float32Array(herd.members.length), hops: new Float32Array(herd.members.length), shown: new Uint8Array(herd.members.length),
  }))
  let time = 0, disposed = false, seasonClock = -Infinity, posed = 0
  // 1 when the season, the magic season and the light let a herd show.
  const out = new Uint8Array(herds.length).fill(1)

  // ---- Poses -------------------------------------------------------------------------------------
  const normal = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3(), basis = new THREE.Matrix4()
  const centreNow = new THREE.Vector3(), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), turnBy = new THREE.Quaternion(), pitchAxis = new THREE.Vector3(1, 0, 0)
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(), matrix = new THREE.Matrix4()
  const offset = (n: THREE.Vector3, herd: Herd, x: number, z: number, target: THREE.Vector3) =>
    target.copy(n).multiplyScalar(radius).addScaledVector(herd.east, x).addScaledVector(herd.north, z).normalize()

  /** The centre of a walking herd at a time and its heading; the step of its route, the part of the step, and 1 on a step or 0 at a rest. */
  function herdAt(herd: Herd, t: number) {
    let remaining = ((t + herd.phase) % herd.cycle + herd.cycle) % herd.cycle
    for (let i = 0; i < herd.durations.length; i++) {
      const duration = herd.durations[i]
      if (remaining <= duration + herd.rest || i === herd.durations.length - 1) {
        const a = herd.route[i], b = herd.route[i + 1], u = Math.min(1, remaining / Math.max(duration, 1e-3))
        centreNow.copy(a).lerp(b, u).normalize()
        forward.copy(b).sub(a)
        return { step: i, u, moving: remaining < duration ? 1 : 0 }
      }
      remaining -= duration + herd.rest
    }
    centreNow.copy(herd.route[0]); forward.copy(herd.north)
    return { step: 0, u: 0, moving: 0 }
  }

  /** Writes the pose of each member of a herd at the time `t` into its cache. A herd that rests where it rested before keeps its cache. */
  function pose(herd: Herd, cache: Cache, t: number) {
    const species = herd.species
    cache.at = t
    const loop = herd.kind === 'air' || herd.kind === 'leap' || herd.loop > 0
    let state = { step: 0, u: 0, moving: 1 }
    if (!loop && herd.durations.length) {
      state = herdAt(herd, t)
      const resting = state.moving ? -1 : state.step
      if (resting >= 0 && resting === cache.resting) return
      cache.resting = resting
    } else if (!loop) {
      if (cache.resting === 0) return
      cache.resting = 0; centreNow.copy(herd.route[0]); forward.copy(herd.north); state.moving = 0
    }
    posed++
    herd.members.forEach((member, index) => {
      let moving = 1, lift = 0, pitch = 0, shown = 1, hop = 0
      if (loop) {
        // A loop: each member follows the one before it, a little to the side.
        const a = t * herd.turn + herd.phase - index * (herd.kind === 'air' ? 0.32 : 0.45) / Math.max(1, herd.loop / 6)
        const ring = herd.loop + (index % 2 ? 1 : -1) * Math.ceil(index / 2) * lateralOf(species, herd.kind)
        offset(herd.route[0], herd, Math.cos(a) * ring, Math.sin(a) * ring, normal)
        forward.copy(herd.east).multiplyScalar(-Math.sin(a)).addScaledVector(herd.north, Math.cos(a)).multiplyScalar(Math.sign(herd.turn) || 1)
        if (herd.kind === 'air') { lift = herd.height + Math.sin(t * 1.3 + member.phase) * 0.4; moving = 0.5 + 0.5 * Math.sin(t * 0.7 + member.phase) }
        else if (herd.kind === 'leap') {
          // A leap of 1.3 s in each 3.2 s; under the water the rest of the time.
          const u = ((t + member.phase) % 3.2) / 1.3
          lift = u < 1 ? Math.sin(u * Math.PI) * (species.size > 1 ? 1.7 : 0.7) - 0.15 : -1.2
          pitch = u < 1 ? -Math.cos(u * Math.PI) * 0.9 : 0
          if (u >= 1) shown = 0
        } else lift = species.size > 4 ? -0.75 + Math.sin(t * 0.5 + herd.phase) * 0.12 : 0.05
      } else {
        moving = state.moving
        offset(centreNow, herd, member.east, member.north, normal)
        if (herd.kind === 'water') lift = species.id === 'jelly' ? Math.sin(t * 1.6 + member.phase) * 0.05 - 0.05 : 0.02
        else {
          const g = member.ground, a = g[state.step] ?? g[0], b = g[state.step + 1] ?? a
          if (moving && species.move === 'hop') hop = Math.max(0, Math.sin((t + member.phase) * 8)) * 0.1 * species.size
          lift = a + (b - a) * state.u + 0.02 + hop
        }
      }
      position.copy(normal).multiplyScalar(radius + lift)
      forward.addScaledVector(normal, -forward.dot(normal))
      if (forward.lengthSq() < 1e-8) forward.copy(herd.north)
      forward.normalize()
      right.crossVectors(normal, forward).normalize()
      quaternion.setFromRotationMatrix(basis.makeBasis(right, normal, forward))
      if (pitch) quaternion.multiply(turnBy.setFromAxisAngle(pitchAxis, pitch))
      else if (!loop) quaternion.multiply(turnBy.setFromAxisAngle(up, member.yaw * (moving ? 0.3 : 1)))
      matrix.compose(position, quaternion, scale.setScalar(member.scale))
      matrix.toArray(cache.matrices, index * 16)
      position.toArray(cache.places, index * 3)
      cache.moving[index] = moving
      cache.hops[index] = hop
      cache.shown[index] = shown
    })
  }

  // ---- The seasons --------------------------------------------------------------------------------
  /** Shows and hides the herds by the season of their place, the magic season and the night. Twice a second. */
  function seasons(life: LifeState) {
    if (time - seasonClock < 0.5 && time >= seasonClock) return
    seasonClock = time
    herds.forEach((herd, i) => {
      const rule = herd.species.rule
      let shown = true
      if (fairy) shown = life.magic === undefined || magicFits(rule, herd.route[0].y, life.magic)
      else {
        const list = seasonsOf(rule, herd.zone)
        if (life.year !== undefined && list) {
          const season = seasonFor(rule, herd.zone, herd.latitude, life.year)
          shown = !season || list.includes(season)
        }
        // The fireflies glow only at night: the Sun is under the horizon of the herd.
        if (rule.night && life.sun) shown &&= life.sun.dot(herd.route[0]) < 0.05
      }
      out[i] = shown ? 1 : 0
    })
    // The arctic hare: white in the snow, brown in summer.
    if (!fairy && life.year !== undefined) for (const herd of herds) {
      if (herd.species.id !== 'hare') continue
      const snow = snowCover(herd.latitude, life.year, life.tilt, herd.members[0].ground[0])
      for (const member of herd.members) (member.tint ??= new THREE.Color()).copy(WHITE).lerp(HARE_SUMMER, 1 - THREE.MathUtils.smoothstep(snow, 0.3, 0.6))
    }
  }

  // ---- The renderer -------------------------------------------------------------------------------
  const batches = new Map<string, Batch>()
  function batchOf(species: Species, near: boolean) {
    const key = `${species.id}-${near ? 'near' : 'far'}`
    let found = batches.get(key)
    if (!found) {
      const base = joinedGeometry(species.id, near ? 'near' : 'far')
      // The geometry shares the attributes of the joined model, and has its own motion for each instance.
      const geometry = new THREE.BufferGeometry()
      for (const [name, attribute] of Object.entries(base.attributes)) geometry.setAttribute(name, attribute)
      geometry.setIndex(base.index)
      const capacity = Math.min(limits.cap, species.herd[1] * 24)
      let move: THREE.InstancedBufferAttribute | null = null
      if (near) { move = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4); move.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute('aMove', move) }
      const mesh = new THREE.InstancedMesh(geometry, near ? rigMaterial(species.id) : farMaterial(species.id), capacity)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      // The population culls each animal; the mesh of a kind is drawn when one of its animals is in the view.
      mesh.frustumCulled = false
      mesh.name = `herd-${key}`
      mesh.visible = false
      layer.add(mesh)
      found = { mesh, move, used: 0 }
      batches.set(key, found)
    }
    return found
  }
  const rates = new Map<string, number>()
  const rateOf = (id: string) => rates.get(id) ?? rates.set(id, gaitOf(id).rate).get(id)!
  const tops = new Map<string, number>()
  /** The top of a kind over its feet, before its scale: the hearts start there. */
  const topOf = (id: string) => tops.get(id) ?? tops.set(id, joinedGeometry(id, 'far').boundingBox!.max.y).get(id)!

  const localCamera = new THREE.Vector3(), inverse = new THREE.Quaternion(), frustum = new THREE.Frustum(), viewMatrix = new THREE.Matrix4(), sphere = new THREE.Sphere()
  const pool: Drawn[] = [], drawn: Drawn[] = []
  // The near animals out of the view: they are not drawn, but they keep a marker and can say hello.
  const hiddenPool: Drawn[] = [], hidden: Drawn[] = []
  let callsNow = 0, culled = 0
  /** The animals near the camera, each with a marker: for the hellos, the search star and the checks. */
  const near: Drawn[] = []
  // The points of the small life and the lights of the fireflies and the lantern moths: two draw calls.
  const dots = createPointLayer(1600, false), lights = createPointLayer(500, true)
  layer.add(dots.points, lights.points)
  const dotColour = new THREE.Color()
  /** The fireflies and the lantern moths have a soft light around them. */
  const LIGHTS: Partial<Record<KindId, { size: number; colour: THREE.Color }>> = {
    firefly: { size: 1.2, colour: new THREE.Color(0xe8f070) },
    lanternMoth: { size: 1.6, colour: new THREE.Color(0xffc870) },
  }
  /** A point or a light of a small animal that is not a model in this frame, or the light of a model. */
  function smallPoint(item: Drawn, model: boolean) {
    const p = item.cache.places, m = item.member, species = item.herd.species, light = LIGHTS[species.id]
    if (light) lights.add(p[m * 3], p[m * 3 + 1], p[m * 3 + 2], light.colour, light.size)
    if (model || light) return
    dots.add(p[m * 3], p[m * 3 + 1], p[m * 3 + 2], item.herd.members[m].tint ?? dotColour.set(species.colour), Math.max(0.3, species.size * 1.4))
  }
  const markers = new Map<number, THREE.Object3D>()

  /**
   * One frame of the herds: the herds in reach get their pose (the near ones in each frame, the far
   * ones ten times a second), the nearest animals in the view go into the instances of their kind,
   * and the near animals get a marker. A delta of 0 (pause) holds each pose.
   */
  function update(delta: number, cameraPosition: THREE.Vector3, life: LifeState = {}) {
    if (disposed) return
    time += delta
    RIG_TIME.value = time
    posed = 0
    seasons(life)
    inverse.copy(parent.quaternion).invert()
    localCamera.copy(cameraPosition).sub(parent.position).applyQuaternion(inverse)
    let cull = false
    if (life.view) {
      // The view in the frame of the world: each animal is tested against it.
      life.view.updateMatrixWorld()
      parent.updateMatrixWorld()
      frustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(life.view.projectionMatrix, life.view.matrixWorldInverse).multiply(parent.matrixWorld))
      cull = true
    }
    drawn.length = 0
    hidden.length = 0
    culled = 0
    if (localCamera.length() < radius + limits.dots + 40) {
      herds.forEach((herd, i) => {
        if (!out[i]) return
        // The small life shows as points farther than the far models of the herds.
        const range = herd.species.layer === 'small' ? limits.dots : limits.far
        const centre = tmp.copy(herd.route[0]).multiplyScalar(radius).distanceTo(localCamera)
        if (centre > range + 25) return
        const cache = caches[i]
        const due = centre < limits.near + 20 || time - cache.at >= HERD_LIMITS.pose || time < cache.at
        if (due && (delta > 0 || cache.at === -Infinity)) pose(herd, cache, time)
        const p = cache.places
        for (let m = 0; m < herd.members.length; m++) {
          if (!cache.shown[m]) continue
          const distance = Math.hypot(p[m * 3] - localCamera.x, p[m * 3 + 1] - localCamera.y, p[m * 3 + 2] - localCamera.z)
          if (distance > range) continue
          if (cull) {
            sphere.center.set(p[m * 3], p[m * 3 + 1], p[m * 3 + 2])
            sphere.radius = herd.species.size * 1.2 + 1
            if (!frustum.intersectsSphere(sphere)) {
              culled++
              if (distance < limits.near) {
                const item = hiddenPool[hidden.length] ??= { herd, cache, member: m, resident: 0, distance: 0, near: true, slot: -1, batch: null }
                item.herd = herd; item.cache = cache; item.member = m; item.resident = firstResident[i] + m; item.distance = distance
                hidden.push(item)
              }
              continue
            }
          }
          const item = pool[drawn.length] ??= { herd, cache, member: m, resident: 0, distance: 0, near: false, slot: -1, batch: null }
          item.herd = herd; item.cache = cache; item.member = m; item.resident = firstResident[i] + m; item.distance = distance
          item.near = distance < limits.near; item.slot = -1; item.batch = null
          drawn.push(item)
        }
      })
    }
    drawn.sort((a, b) => a.distance - b.distance)
    // The draw calls: the kinds nearest to the camera first, up to the limit of the calls and the cap of
    // the models. A small animal far away, or past the most small models, is a point.
    for (const batch of batches.values()) batch.used = 0
    dots.begin(); lights.begin()
    const keep = new Set<Batch>()
    let kept = 0, models = 0, smallModels = 0
    for (const item of drawn) {
      if (item.herd.species.layer === 'small') {
        const model = item.distance < limits.smallNear && smallModels < limits.smallModels && models < limits.cap
        smallPoint(item, model)
        if (!model) continue
        smallModels++
      } else if (models >= limits.cap) continue
      const batch = batchOf(item.herd.species, item.near)
      if (!keep.has(batch)) {
        if (keep.size >= limits.calls) continue
        keep.add(batch)
      }
      if (batch.used >= batch.mesh.instanceMatrix.count) continue
      item.batch = batch; item.slot = batch.used++
      drawn[kept++] = item
      models++
    }
    drawn.length = kept
    dots.end(); lights.end()
    for (const item of drawn) write(item)
    callsNow = 0
    for (const batch of batches.values()) {
      batch.mesh.count = batch.used
      batch.mesh.visible = batch.used > 0
      if (!batch.used) continue
      callsNow++
      batch.mesh.instanceMatrix.needsUpdate = true
      if (batch.mesh.instanceColor) batch.mesh.instanceColor.needsUpdate = true
      if (batch.move) batch.move.needsUpdate = true
    }
    // The markers of the near animals.
    near.length = 0
    for (const item of drawn) if (item.near) near.push(item)
    near.push(...hidden)
    for (const marker of markers.values()) marker.visible = false
    for (const item of near) {
      let marker = markers.get(item.resident)
      if (!marker) {
        marker = new THREE.Object3D()
        marker.name = `creature-${item.herd.species.id}-${item.resident}`
        marker.userData.species = item.herd.species.id
        if (fairy) marker.userData.fairytale = item.herd.species.id
        markers.set(item.resident, marker); group.add(marker)
      }
      marker.visible = true
      if (item.batch) matrix.fromArray(item.batch.mesh.instanceMatrix.array, item.slot * 16)
      else matrixOf(item)
      matrix.decompose(marker.position, marker.quaternion, marker.scale)
    }
    // The markers far from the camera go.
    if (markers.size > 120) for (const [index, marker] of markers) {
      if (marker.visible || marker.position.distanceTo(localCamera) < 120) continue
      group.remove(marker); markers.delete(index)
    }
  }

  /** The matrix of a drawn or hidden animal into `matrix`. A near animal stands on the triangles of the ground or floats on the water mesh. */
  function matrixOf(item: Drawn) {
    const { herd, cache, member: m } = item
    matrix.fromArray(cache.matrices, m * 16)
    if (!item.near || (herd.kind !== 'ground' && herd.kind !== 'water')) return matrix
    matrix.decompose(position, quaternion, scale)
    normal.copy(position).normalize()
    const r = (herd.kind === 'water' ? water : ground).radiusAt(normal)
    if (!Number.isFinite(r)) return matrix
    // The jellyfish bob in the soda; the others stand 2.5 cm over the mesh, with the hop of a hopper.
    const lift = herd.species.id === 'jelly' ? position.length() - radius : 0.025
    return matrix.compose(position.copy(normal).multiplyScalar(r + lift + cache.hops[m]), quaternion, scale)
  }

  /** Writes one animal into the instances of its kind. A near animal stands on the triangles of the ground or floats on the water mesh. */
  function write(item: Drawn) {
    const { herd, cache, member: m } = item, batch = item.batch!
    matrixOf(item)
    matrix.toArray(batch.mesh.instanceMatrix.array, item.slot * 16)
    const tint = herd.members[m].tint
    if (tint || batch.mesh.instanceColor) batch.mesh.setColorAt(item.slot, tint ?? WHITE)
    if (batch.move) batch.move.setXYZW(item.slot, herd.members[m].phase, cache.moving[m], rateOf(herd.species.id), 0)
  }

  // ---- The hellos ------------------------------------------------------------------------------------
  // The hearts are children of the world, so they turn and move with it.
  const hearts = createHeartPool(heartPool(mobile)); parent.add(hearts.points)
  /** The hello of an animal has the key of its resident. A school or a swarm says hello as one animal: the key -1 - its herd. */
  const hellos = new Map<number, { at: number; hearts: number; side: THREE.Vector3 }>()
  const lastHello = new Map<number, number>()
  const localFairy = new THREE.Vector3(), toFairy = new THREE.Vector3(), side = new THREE.Vector3()
  const feet = new THREE.Vector3(), point = new THREE.Vector3(), facing = new THREE.Quaternion(), heart: HeartPose = { rise: 0, sway: 0, size: 0, alpha: 0, spin: 0 }
  const lastFairy = new THREE.Vector3(), velocity = new THREE.Vector3(), ahead = new THREE.Vector3()
  let helloCount = 0, hasLastFairy = false
  const keyOf = (item: Drawn) => item.herd.species.group ? -1 - item.herd.id : item.resident

  /**
   * The animals near the fairy say hello. Call it after update(), because update() puts each
   * animal back on its route. A delta of 0 (pause) starts no hello and holds each pose. It returns
   * the kind of each animal that starts a hello. The list is empty when no hello starts.
   */
  function greet(delta: number, fairyPosition: THREE.Vector3): KindId[] {
    const started: KindId[] = []
    if (disposed) return started
    inverse.copy(parent.quaternion).invert()
    localFairy.copy(fairyPosition).sub(parent.position).applyQuaternion(inverse)
    // The speed of the fairy in the frame of the world. A jump (a new place, a move of the home) gives no speed.
    if (delta > 0 && hasLastFairy && localFairy.distanceTo(lastFairy) < 8) velocity.copy(localFairy).sub(lastFairy).divideScalar(delta)
    else velocity.set(0, 0, 0)
    if (delta > 0) { lastFairy.copy(localFairy); hasLastFairy = true }
    helloPoint(localFairy, velocity, ahead)
    if (delta > 0) {
      for (const item of near) {
        const key = keyOf(item)
        if (hellos.has(key)) continue
        const marker = markers.get(item.resident)!
        // The nearer of the fairy and the point ahead of her: the hello starts before she arrives.
        const gap = Math.min(marker.position.distanceTo(localFairy), marker.position.distanceTo(ahead))
        if (!canSayHello(gap, time, lastHello.get(key))) continue
        lastHello.set(key, time)
        // The hearts sway at right angles to the line from the animal to the fairy.
        normal.copy(marker.position).normalize()
        side.crossVectors(normal, toFairy.copy(localFairy).sub(marker.position))
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0).applyQuaternion(marker.quaternion)
        hellos.set(key, { at: time, hearts: heartCount(helloCount, mobile), side: side.clone().normalize() })
        helloCount++; started.push(item.herd.species.id)
      }
    }
    hearts.begin()
    const touched = new Set<Batch>()
    for (const [key, hello] of hellos) {
      const item = near.find(other => keyOf(other) === key)
      const age = time - hello.at
      if (!item || age > helloLength(hello.hearts)) { hellos.delete(key); continue }
      const marker = markers.get(item.resident)!, herd = item.herd
      normal.copy(marker.position).normalize()
      // Turn toward the fairy on the ground and on the water, and back to the route after the hello.
      const turn = helloTurn(age)
      toFairy.copy(localFairy).sub(marker.position)
      toFairy.addScaledVector(normal, -toFairy.dot(normal))
      if ((herd.kind === 'ground' || herd.kind === 'water') && turn > 0 && toFairy.lengthSq() > 0.01) {
        forward.copy(toFairy).normalize()
        right.crossVectors(normal, forward).normalize()
        facing.setFromRotationMatrix(basis.makeBasis(right, normal, forward))
        marker.quaternion.slerp(facing, turn)
      }
      // The hop goes along the ground normal; the hearts start over the head.
      const size = marker.scale.y
      feet.copy(marker.position)
      marker.position.addScaledVector(normal, helloLift(age, herd.kind === 'water') * size * (herd.kind === 'air' ? 0.6 : 1))
      if (item.batch) {
        matrix.compose(marker.position, marker.quaternion, marker.scale).toArray(item.batch.mesh.instanceMatrix.array, item.slot * 16)
        touched.add(item.batch)
      }
      const top = topOf(herd.species.id) * size * (herd.kind === 'leap' ? 0.4 : 1)
      for (let k = 0; k < hello.hearts; k++) {
        if (!heartPose(age, k, heart)) continue
        const spread = (k - (hello.hearts - 1) / 2) * 0.42 + heart.sway
        if (!hearts.add(point.copy(feet).addScaledVector(normal, top + heart.rise).addScaledVector(hello.side, spread), heart)) break
      }
    }
    touched.forEach(batch => { batch.mesh.instanceMatrix.needsUpdate = true })
    hearts.end()
    return started
  }

  /** The state of the hellos, for the browser checks. `clearance` is the height of the animal over its ground or water. */
  function helloState() {
    return {
      count: helloCount,
      hearts: hearts.count,
      active: [...hellos].flatMap(([key, hello]) => {
        const item = near.find(other => keyOf(other) === key)
        if (!item) return []
        const marker = markers.get(item.resident)!
        normal.copy(marker.position).normalize()
        const elevation = (item.herd.kind === 'water' || item.herd.kind === 'leap' ? water : ground).radiusAt(normal)
        return [{ name: marker.name, age: time - hello.at, clearance: marker.position.length() - elevation }]
      }),
    }
  }

  /** The numbers of this frame, for the browser checks and the bench. `calls` counts the instanced models and the hearts. */
  function stats() {
    return {
      herds: herds.length, animals: residents.length, drawn: drawn.length, near: near.length, culled, posed,
      calls: callsNow + (hearts.count ? 1 : 0) + (dots.count ? 1 : 0) + (lights.count ? 1 : 0), batches: callsNow, points: dots.count, lights: lights.count,
      kinds: [...new Set(drawn.map(item => item.herd.species.id))],
    }
  }

  let fields: Fields | null = null
  /**
   * Each animal drawn in this frame, with the zone, the surface and the height of its place, and true
   * when its rule allows the place: a walker in a zone and on a surface of its rule, a leaper over
   * the water. A flier goes around a loop over its zone, so only its kind and its height count.
   */
  function audit() {
    fields ??= createFields(world.seed)
    return drawn.map(item => {
      const p = item.cache.places, m = item.member
      normal.set(p[m * 3], p[m * 3 + 1], p[m * 3 + 2])
      const height = normal.length() - radius
      normal.normalize()
      const place = placeAt(world.kind, normal.x, normal.y, normal.z, world.sample, fields!, radius)
      const kind = item.herd.kind
      // A swimmer of a loop (a pod, a whale, the soda serpent) needs only water under it: its loop can cross a river mouth.
      const ok = kind === 'air' ? height > 0.5 : kind === 'leap' || item.herd.loop > 0 ? place.height < -0.5 : fits(item.herd.species.rule, place)
      return { kind: item.herd.species.id, herd: kind, zone: place.zone, surface: place.surface, ground: +place.height.toFixed(2), height: +height.toFixed(2), distance: +item.distance.toFixed(1), near: item.near, ok }
    })
  }

  /** The places of the routes on the ground and on the water: the season plants of Blossom Haven keep clear of them. */
  function paths() {
    const points: THREE.Vector3[] = []
    for (const herd of herds) {
      if (herd.kind === 'air' || herd.kind === 'leap') continue
      for (const p of herd.route) for (const member of herd.members) points.push(offset(p, herd, member.east, member.north, new THREE.Vector3()))
    }
    return points
  }

  function dispose() {
    disposed = true
    hellos.clear(); hearts.dispose(); dots.dispose(); lights.dispose()
    for (const batch of batches.values()) {
      batch.mesh.dispose(); batch.mesh.geometry.dispose(); (batch.mesh.material as THREE.Material).dispose()
    }
    batches.clear(); markers.clear()
    layer.clear(); parent.remove(layer)
    group.clear(); parent.remove(group)
  }
  return {
    residents, herds, group, layer, ground, water, obstacles, limits, update, greet, helloState, stats, audit, paths, dispose,
    /** True when the season, the magic season and the light let the herd of this index show now. */
    shown: (index: number) => out[index] === 1,
    /** The objects that draw the animals: a browser check hides them to count their draw calls. */
    parts: [layer, hearts.points] as THREE.Object3D[],
  }
}

export type CreaturePopulation = ReturnType<typeof createPopulation>
