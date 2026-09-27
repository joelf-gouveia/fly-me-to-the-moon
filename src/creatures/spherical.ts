import * as THREE from 'three'
import { seededRandom } from '../terrain'
import { species } from './habitat'
import type { Species } from './habitat'

const TAU = Math.PI * 2
const wrap = (value: number, size: number) => ((value % size) + size) % size

/** Reads the actual displaced SphereGeometry, not a second noise approximation. */
export class SphericalHabitat {
  readonly geometry: THREE.SphereGeometry
  readonly radius: number
  readonly width: number
  readonly height: number
  readonly radii: Float32Array
  private ray = new THREE.Ray()
  private a = new THREE.Vector3()
  private b = new THREE.Vector3()
  private c = new THREE.Vector3()
  private hit = new THREE.Vector3()

  constructor(geometry: THREE.SphereGeometry, radius: number) {
    this.geometry = geometry
    this.radius = radius
    this.width = geometry.parameters.widthSegments
    this.height = geometry.parameters.heightSegments
    const positions = geometry.attributes.position
    this.radii = new Float32Array(positions.count)
    for (let i = 0; i < positions.count; i++) this.radii[i] = this.a.fromBufferAttribute(positions, i).length()
  }

  radiusAt(normal: THREE.Vector3) {
    const row = Math.min(this.height - 1, Math.floor(Math.acos(THREE.MathUtils.clamp(normal.y, -1, 1)) / Math.PI * this.height))
    const col = Math.floor(wrap(Math.atan2(normal.z, -normal.x), TAU) / TAU * this.width)
    const positions = this.geometry.attributes.position
    this.ray.direction.copy(normal)
    // Adjacent cells cover the curved projection of the triangular grid edges.
    for (let y = Math.max(0, row - 1); y <= Math.min(this.height - 1, row + 1); y++) {
      for (let x = col - 1; x <= col + 1; x++) {
        const b = y * (this.width + 1) + wrap(x, this.width), a = b + 1
        const c = b + this.width + 1, d = c + 1
        for (const indices of [[a, b, d], [b, c, d]]) {
          this.a.fromBufferAttribute(positions, indices[0]); this.b.fromBufferAttribute(positions, indices[1]); this.c.fromBufferAttribute(positions, indices[2])
          if (this.ray.intersectTriangle(this.a, this.b, this.c, false, this.hit)) return this.hit.length()
        }
      }
    }
    return NaN // Never substitute a potentially unsafe elevation.
  }

  safeSegment(kind: Species, from: THREE.Vector3, to: THREE.Vector3) {
    const separation = from.angleTo(to)
    if (separation > 0.08) return false
    const midpoint = from.clone().add(to).normalize()
    const cap = separation / 2 + (species[kind].footprint + 0.2) / this.radius
    const theta = Math.acos(THREE.MathUtils.clamp(midpoint.y, -1, 1))
    // Polar singularities are excluded; creatures still live near the home clearing.
    if (theta <= cap || theta >= Math.PI - cap) return false
    const longitude = wrap(Math.atan2(midpoint.z, -midpoint.x), TAU)
    const span = Math.asin(Math.min(1, Math.sin(cap) / Math.sin(theta)))
    const minRow = Math.floor((theta - cap) / Math.PI * this.height)
    const maxRow = Math.ceil((theta + cap) / Math.PI * this.height)
    const minCol = Math.floor((longitude - span) / TAU * this.width)
    const maxCol = Math.ceil((longitude + span) / TAU * this.width)
    let low = Infinity, high = -Infinity
    for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
      const value = this.radii[row * (this.width + 1) + wrap(col, this.width)] - this.radius
      low = Math.min(low, value); high = Math.max(high, value)
    }
    // Includes a faceting margin: even the inscribed ground/water triangles stay separate.
    if (species[kind].habitat === 'water') return high < -0.5
    return low > 0.65 && high < 8 && high - low < 1.35
  }
}

export type CreatureObstacle = { center: THREE.Vector3; radius: number }

/** Hash static obstacles in planet-local base-radius coordinates. */
export class CreatureObstacles {
  private cells = new Map<string, CreatureObstacle[]>()
  private largest = 0
  private cellSize = 10
  add(normal: THREE.Vector3, planetRadius: number, radius: number) {
    const obstacle = { center: normal.clone().multiplyScalar(planetRadius), radius }
    const key = this.key(obstacle.center)
    const cell = this.cells.get(key) ?? []
    cell.push(obstacle); this.cells.set(key, cell)
    this.largest = Math.max(this.largest, radius)
  }
  private key(p: THREE.Vector3) { return `${Math.floor(p.x / this.cellSize)},${Math.floor(p.y / this.cellSize)},${Math.floor(p.z / this.cellSize)}` }
  clearSegment(a: THREE.Vector3, b: THREE.Vector3, radius: number, footprint: number) {
    const start = a.clone().multiplyScalar(radius), end = b.clone().multiplyScalar(radius)
    const line = new THREE.Line3(start, end), closest = new THREE.Vector3()
    const margin = this.largest + footprint + 0.3
    const min = start.clone().min(end).addScalar(-margin).divideScalar(this.cellSize).floor()
    const max = start.clone().max(end).addScalar(margin).divideScalar(this.cellSize).floor()
    for (let x = min.x; x <= max.x; x++) for (let y = min.y; y <= max.y; y++) for (let z = min.z; z <= max.z; z++) {
      for (const obstacle of this.cells.get(`${x},${y},${z}`) ?? []) {
        line.closestPointToPoint(obstacle.center, true, closest)
        // Extra margin covers the tiny difference between the short arc and its chord.
        if (closest.distanceTo(obstacle.center) < obstacle.radius + footprint + 0.3) return false
      }
    }
    return true
  }
}

export type SphericalResident = {
  kind: Species
  route: THREE.Vector3[]
  durations: number[]
  cycle: number
  phase: number
  scale: number
}

export function offsetNormal(normal: THREE.Vector3, angle: number, distance: number, radius: number) {
  const east = new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
  const north = new THREE.Vector3().crossVectors(normal, east)
  const tangent = east.multiplyScalar(Math.cos(angle)).addScaledVector(north, Math.sin(angle))
  return normal.clone().multiplyScalar(Math.cos(distance / radius)).addScaledVector(tangent, Math.sin(distance / radius)).normalize()
}

export function populateSphere(ground: SphericalHabitat, obstacles: CreatureObstacles, seed: number, anchor: THREE.Vector3, perSpecies = 32) {
  const random = seededRandom(seed), residents: SphericalResident[] = []
  const safe = (kind: Species, a: THREE.Vector3, b: THREE.Vector3) => ground.safeSegment(kind, a, b)
    && obstacles.clearSegment(a, b, ground.radius, species[kind].footprint)
  for (const kind of Object.keys(species) as Species[]) {
    let count = 0
    for (let attempt = 0; attempt < perSpecies * 160 && count < perSpecies; attempt++) {
      let start: THREE.Vector3
      if (kind !== 'duck' && count < 4 && attempt < 600) {
        start = offsetNormal(anchor, random() * TAU, 8 + random() * 24, ground.radius)
      } else {
        const y = random() * 1.98 - 0.99, phi = random() * TAU, ring = Math.sqrt(1 - y * y)
        start = new THREE.Vector3(ring * Math.cos(phi), y, ring * Math.sin(phi))
      }
      if (!safe(kind, start, start)) continue
      if (residents.some(r => r.route[0].distanceTo(start) * ground.radius < 4)) continue
      const points = [start]
      for (let step = 0; step < 3; step++) {
        const from = points[points.length - 1]
        for (let choice = 0; choice < 12; choice++) {
          const next = offsetNormal(from, random() * TAU, 1.5 + random() * 2, ground.radius)
          if (next.distanceTo(start) * ground.radius > 7 || !safe(kind, from, next)) continue
          points.push(next); break
        }
      }
      if (points.length < 3) continue
      const route = [...points, ...points.slice(0, -1).reverse()]
      const durations = route.slice(1).map((p, i) => p.angleTo(route[i]) * ground.radius / species[kind].speed)
      residents.push({ kind, route, durations, cycle: durations.reduce((sum, d) => sum + d + 1.4, 0), phase: random() * 30, scale: 0.86 + random() * 0.14 })
      count++
    }
  }
  return residents
}

export function sampleResident(resident: SphericalResident, time: number, normal: THREE.Vector3, forward: THREE.Vector3) {
  let remaining = (time + resident.phase) % resident.cycle
  for (let i = 0; i < resident.durations.length; i++) {
    const duration = resident.durations[i]
    if (remaining <= duration + 1.4 || i === resident.durations.length - 1) {
      const a = resident.route[i], b = resident.route[i + 1]
      normal.copy(a).lerp(b, Math.min(1, remaining / duration)).normalize()
      forward.copy(b).sub(a).addScaledVector(normal, -forward.dot(normal)).normalize()
      return remaining < duration
    }
    remaining -= duration + 1.4
  }
  return false
}
