import * as THREE from 'three'
import { seededRandom } from '../../src/terrain'
import type { TerrainSample } from '../../src/terrain'
import { createPopulation } from '../../src/creatures/population'
import { meadowNormal } from '../../src/worlds'
import type { World } from '../../src/worlds'
import { LANDMARKS } from './model'
import type { Landmark } from './model'
import { SHAPES } from './shapes'
import type { Shape } from './shapes'

/**
 * Puts the landmarks on the Earth of the game. Each landmark is a patch: a round piece of
 * ground with its own fine mesh, at a place that the study finds on the landscape. Inside
 * the patch the terrain of the landmark replaces the terrain of src/terrain.ts. At the edge
 * the two blend, so the patch has no seam.
 */

/** The landmark has its full shape inside `from` × radius. The ground of the game starts at `to` × radius. */
export const BLEND = { from: 0.66, to: 0.9 }

export type Site = {
  landmark: Landmark
  shape: Shape
  /** The centre and the local east and north, as unit vectors in the frame of Earth. */
  centre: THREE.Vector3
  east: THREE.Vector3
  north: THREE.Vector3
  /** The unit direction of the local place (u, v). */
  dir(u: number, v: number, out?: THREE.Vector3): THREE.Vector3
  /** The ground height at (u, v) in metres above the sea, with the blend at the edge. */
  heightAt(u: number, v: number): number
  /** The position, in the frame of Earth, `alt` metres above the ground or the water at (u, v). */
  above(u: number, v: number, alt?: number, out?: THREE.Vector3): THREE.Vector3
  /** The position `height` metres above the sea at (u, v). */
  at(u: number, v: number, height: number, out?: THREE.Vector3): THREE.Vector3
}

const smooth = (x: number, a: number, b: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const UP = new THREE.Vector3(0, 1, 0)

/** The ground colour of Earth in buildGround() of src/worlds.ts. */
const grass = new THREE.Color(0x679a43), sand = new THREE.Color(0xd5c395), stone = new THREE.Color(0x85817a), snow = new THREE.Color(0xdfe7e5)
export function earthColor(sample: TerrainSample, y: number, out: THREE.Color) {
  out.copy(sample.height < 0.7 ? sand : sample.height > 8.5 ? stone : grass)
  if (Math.abs(y) > 0.9 || sample.height > 12) out.copy(snow)
  return out.multiplyScalar(0.87 + sample.detail * 0.22 + Math.max(0, sample.height) * 0.014)
}

type Sampler = World['sample']

/** The local frame at `centre`, turned by `turn` radians about the centre. */
function frame(centre: THREE.Vector3, turn: number) {
  const east0 = new THREE.Vector3().crossVectors(Math.abs(centre.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : UP, centre).normalize()
  const north0 = new THREE.Vector3().crossVectors(centre, east0)
  return {
    east: east0.clone().multiplyScalar(Math.cos(turn)).addScaledVector(north0, Math.sin(turn)),
    north: north0.clone().multiplyScalar(Math.cos(turn)).addScaledVector(east0, -Math.sin(turn)),
  }
}

const RINGS = [0.3, 0.58, 0.85], SPOKES = 12
/**
 * Finds a place for each landmark. A land landmark wants dry ground, a sea landmark wants water, and a coast
 * landmark wants land to its north and water to its south. The ice goes near a pole, in the snow of Earth.
 * The search uses a fixed list of random places, so one Earth always gives the same places.
 */
export function findPlaces(base: Sampler, worldRadius: number) {
  const random = seededRandom(0x51735)
  const candidates = Array.from({ length: 900 }, () => {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2
    return new THREE.Vector3(Math.sqrt(1 - y * y) * Math.cos(angle), y, Math.sqrt(1 - y * y) * Math.sin(angle))
  })
  const order = { polar: 0, coast: 1, sea: 2, land: 3 }
  const placed: { landmark: Landmark; centre: THREE.Vector3; turn: number }[] = []
  const point = new THREE.Vector3()
  for (const landmark of [...LANDMARKS].sort((a, b) => order[a.ground] - order[b.ground])) {
    let best = -1, bestCentre = candidates[0], bestTurn = 0
    for (const centre of candidates) {
      const polar = Math.abs(centre.y) > 0.97
      if (polar !== (landmark.ground === 'polar') || (!polar && Math.abs(centre.y) > 0.72)) continue
      if (placed.some(other => other.centre.angleTo(centre) < (other.landmark.radius + landmark.radius) / worldRadius + 0.05)) continue
      const { east, north } = frame(centre, 0)
      // Heights on three rings around the centre. A turn of the frame is a shift along each ring.
      const heights = RINGS.map(ring => Array.from({ length: SPOKES }, (_, spoke) => {
        const angle = spoke / SPOKES * Math.PI * 2, r = ring * landmark.radius
        point.copy(centre).multiplyScalar(worldRadius).addScaledVector(east, Math.cos(angle) * r).addScaledVector(north, Math.sin(angle) * r).normalize()
        return base(point.x, point.y, point.z).height
      }))
      const middle = base(centre.x, centre.y, centre.z).height
      const dry = (h: number) => h > 1 && h < 11 ? 1 : h > 0 ? 0.5 : 0, wet = (h: number) => h < -1 ? 1 : 0
      for (let shift = 0; shift < (landmark.ground === 'coast' ? SPOKES : 1); shift++) {
        let score = 0
        for (const ring of heights) for (let spoke = 0; spoke < SPOKES; spoke++) {
          const h = ring[(spoke + shift) % SPOKES]
          // After the turn, the spoke points north when sin > 0.
          const side = Math.sin(spoke / SPOKES * Math.PI * 2)
          score += landmark.ground === 'land' ? dry(h) : landmark.ground === 'coast' ? (side > 0.3 ? dry(h) : side < -0.3 ? wet(h) : 0.5) : wet(h)
        }
        score = score / (RINGS.length * SPOKES) + (landmark.ground === 'land' ? dry(middle) : 0) * 0.1
        if (score > best) { best = score; bestCentre = centre; bestTurn = shift / SPOKES * Math.PI * 2 }
      }
    }
    placed.push({ landmark, centre: bestCentre, turn: bestTurn })
  }
  return placed
}

function createSite(landmark: Landmark, centre: THREE.Vector3, turn: number, world: World): Site {
  const { east, north } = frame(centre, turn)
  const scratch = new THREE.Vector3()
  const site: Site = {
    landmark, shape: SHAPES[landmark.id], centre, east, north,
    dir: (u, v, out = new THREE.Vector3()) => out.copy(centre).multiplyScalar(world.radius).addScaledVector(east, u).addScaledVector(north, v).normalize(),
    heightAt(u, v) { site.dir(u, v, scratch); return world.sample(scratch.x, scratch.y, scratch.z).height },
    above: (u, v, alt = 0, out = new THREE.Vector3()) => site.dir(u, v, out).multiplyScalar(world.radius + Math.max(0, site.heightAt(u, v)) + alt),
    at: (u, v, height, out = new THREE.Vector3()) => site.dir(u, v, out).multiplyScalar(world.radius + height),
  }
  return site
}

/** The local place (u, v) of a unit direction, or null when the direction is outside the patch of the site. */
function localPlace(site: Site, radius: number, x: number, y: number, z: number, out: { u: number; v: number; r: number }) {
  const along = x * site.centre.x + y * site.centre.y + z * site.centre.z
  if (along < 0.5) return null
  const scale = radius / along
  out.u = scale * (x * site.east.x + y * site.east.y + z * site.east.z)
  out.v = scale * (x * site.north.x + y * site.north.y + z * site.north.z)
  out.r = Math.hypot(out.u, out.v)
  return out.r < site.landmark.radius ? out : null
}

/**
 * Stamps each landmark on Earth. `cell` is the size of one cell of the patch mesh in metres;
 * 0 uses the cell of each landmark. The ground of the game has cells of about 3.4 m.
 */
export function stampLandmarks(earth: World, cell = 0) {
  const base = earth.sample, radius = earth.radius
  const anchor = meadowNormal(earth)
  const sites = findPlaces(base, radius).map(place => createSite(place.landmark, place.centre, place.turn, earth))
  const local = { u: 0, v: 0, r: 0 }
  const weight = (site: Site, r: number) => 1 - smooth(r, BLEND.from * site.landmark.radius, BLEND.to * site.landmark.radius)

  // 1. The terrain of the flight, the camera and the rails.
  earth.sample = (x, y, z) => {
    const sample = base(x, y, z)
    for (const site of sites) {
      if (!localPlace(site, radius, x, y, z, local)) continue
      const w = weight(site, local.r)
      return w ? { ...sample, height: sample.height + (site.shape.height(local.u, local.v) - sample.height) * w, river: sample.river * (1 - w) } : sample
    }
    return sample
  }
  const inside = (direction: THREE.Vector3, part: number) => sites.find(site => localPlace(site, radius, direction.x, direction.y, direction.z, local) && local.r < site.landmark.radius * part)

  // 2. The ground and the water of the game go down under each patch.
  const meshes = earth.surface.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh))
  const ground = meshes.find(mesh => mesh.geometry.hasAttribute('color'))!, water = meshes.find(mesh => !mesh.geometry.hasAttribute('color'))!
  const direction = new THREE.Vector3()
  const sink = (geometry: THREE.BufferGeometry, depth: number, part: (site: Site) => number) => {
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      direction.fromBufferAttribute(positions, i).normalize()
      const site = inside(direction, 1)
      if (!site || local.r > part(site)) continue
      positions.setXYZ(i, direction.x * (radius - depth), direction.y * (radius - depth), direction.z * (radius - depth))
    }
    positions.needsUpdate = true
  }
  sink(ground.geometry, 40, site => site.landmark.radius * BLEND.to - 1)
  ground.geometry.computeVertexNormals()
  sink(water.geometry, 9, site => site.landmark.ownWater ?? 0)

  // 3. The trees and the grass of the game go away inside each patch.
  const matrix = new THREE.Matrix4(), empty = new THREE.Matrix4().makeScale(0, 0, 0)
  for (const child of earth.surface.children) {
    if (!(child instanceof THREE.InstancedMesh)) continue
    for (let i = 0; i < child.count; i++) {
      child.getMatrixAt(i, matrix)
      direction.setFromMatrixPosition(matrix).normalize()
      if (inside(direction, BLEND.to)) child.setMatrixAt(i, empty)
    }
    child.instanceMatrix.needsUpdate = true
  }

  // 4. The animals keep away from the patches: their ground is the ground that went down.
  if (earth.creatures) {
    const obstacles = earth.creatures.obstacles
    earth.creatures.dispose()
    earth.creatures = createPopulation(earth.group, ground.geometry as THREE.SphereGeometry, water.geometry as THREE.SphereGeometry, radius, false, obstacles, earth.seed ^ 0x71ac, anchor, 28)
  }

  // 5. The patch of each landmark.
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 })
  const colour = new THREE.Color(), landColour = new THREE.Color()
  let triangles = 0
  for (const site of sites) {
    const size = site.landmark.radius, step = cell || site.landmark.cell, cells = Math.ceil(size * 2 / step), row = cells + 1
    const positions = new Float32Array(row * row * 3), colours = new Float32Array(row * row * 3), distance = new Float32Array(row * row)
    for (let j = 0; j < row; j++) for (let i = 0; i < row; i++) {
      const u = -size + i * step, v = -size + j * step, r = Math.hypot(u, v), index = j * row + i
      site.dir(u, v, direction)
      const sample = base(direction.x, direction.y, direction.z), w = weight(site, r)
      const high = (site.shape.visual ?? site.shape.height)(u, v), flight = site.shape.visual ? site.shape.height(u, v) : high
      // A small lift at the edge keeps the patch above the coarse ground of the game.
      const height = sample.height + (high - sample.height) * w + 0.3 * (1 - smooth(r, size * 0.93, size))
      positions.set([direction.x * (radius + height), direction.y * (radius + height), direction.z * (radius + height)], index * 3)
      earthColor(sample, direction.y, landColour)
      if (w) { site.shape.color(u, v, flight, colour); landColour.lerp(colour, smooth(w, 0, 0.6)) }
      colours.set([landColour.r, landColour.g, landColour.b], index * 3)
      distance[index] = r
    }
    const indices: number[] = []
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1
      if (Math.max(distance[a], distance[b], distance[c], distance[d]) < size) indices.push(a, b, c, b, d, c)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `landmark-${site.landmark.id}`
    earth.surface.add(mesh)
    triangles += indices.length / 3
  }
  return { sites, triangles }
}
