import * as THREE from 'three'
import { seededRandom } from '../../src/terrain'
import type { World } from '../../src/worlds'
import type { LandmarkId } from './model'
import type { Site } from './stamp'
import {
  atollRing, BERGS, causewayMask, causewayTop, fjordPath, fjordWidth, FUJI_LAKE, GEYSER, iceFront, OASIS, SHAPES, TEPUI, TEPUI_POOL, tepuiEdge, TOWERS,
} from './shapes'

/**
 * The objects of each landmark that a height and a colour cannot make: trees, stone columns,
 * boats, penguins, water above the sea, waterfalls, steam and a geyser. All objects are
 * children of the surface of Earth, so they turn with the world.
 */
export type Scenery = { update(time: number): void; objects: Record<LandmarkId, number> }

const smooth = (x: number, a: number, b: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; local?: THREE.Matrix4 }
const move = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz))
const lit = (color: number, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, ...options })

export function buildScenery(earth: World, sites: Site[]): Scenery {
  const root = new THREE.Group()
  root.name = 'landmark-scenery'
  earth.surface.add(root)
  const site = (id: LandmarkId) => sites.find(item => item.landmark.id === id)!
  const objects = Object.fromEntries(sites.map(item => [item.landmark.id, 0])) as Record<LandmarkId, number>
  const updates: ((time: number) => void)[] = []
  const east = new THREE.Vector3(), south = new THREE.Vector3(), up = new THREE.Vector3(), position = new THREE.Vector3()

  /** The matrix of an object that stands on the ground at (u, v). `top` gives a height above the sea in place of the ground. */
  function stand(at: Site, u: number, v: number, scale = 1, spin = 0, top?: number) {
    at.dir(u, v, up)
    east.copy(at.east).addScaledVector(up, -at.east.dot(up)).normalize()
    south.crossVectors(east, up)
    const basis = new THREE.Matrix4().makeBasis(east, up, south).multiply(new THREE.Matrix4().makeRotationY(spin))
    position.copy(up).multiplyScalar(earth.radius + (top ?? at.heightAt(u, v)))
    return basis.setPosition(position).scale(new THREE.Vector3(scale, scale, scale))
  }
  function instances(at: Site, name: string, parts: Part[], bases: THREE.Matrix4[]) {
    for (const part of parts) {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, bases.length)
      mesh.name = name
      bases.forEach((base, index) => mesh.setMatrixAt(index, part.local ? base.clone().multiply(part.local) : base))
      root.add(mesh)
    }
    objects[at.landmark.id] += bases.length
  }
  /** Up to `count` places from `pick`, which gives a place or null for each try. */
  function places(seed: number, count: number, pick: (random: () => number) => { u: number; v: number } | null) {
    const random = seededRandom(seed), found: { u: number; v: number; random: number }[] = []
    for (let tries = 0; tries < count * 30 && found.length < count; tries++) {
      const place = pick(random)
      if (place) found.push({ ...place, random: random() })
    }
    return found
  }

  // ---- Trees -----------------------------------------------------------------------------------------
  const conifer: Part[] = [
    { geometry: new THREE.ConeGeometry(1.2, 3.8, 6), material: lit(0x2f6a45), local: move(0, 2.4, 0) },
    { geometry: new THREE.CylinderGeometry(0.16, 0.23, 1.4, 5), material: lit(0x715c40), local: move(0, 0.6, 0) },
  ]
  const trunk = new THREE.CylinderGeometry(0.14, 0.2, 1.6, 5), crown = new THREE.IcosahedronGeometry(1.3, 1)
  const cherry: Part[] = [{ geometry: crown, material: lit(0xffb4d4), local: move(0, 2.3, 0, 1, 0.85, 1) }, { geometry: trunk, material: lit(0x6b4a3a), local: move(0, 0.8, 0) }]
  const jungle: Part[] = [{ geometry: crown, material: lit(0x2f7a3c), local: move(0, 2.1, 0, 1.15, 0.8, 1.15) }, { geometry: trunk, material: lit(0x5d4a36), local: move(0, 0.8, 0) }]
  const palm: Part[] = [
    { geometry: new THREE.ConeGeometry(1.7, 0.8, 7, 1, true), material: lit(0x4f9a3a, { side: THREE.DoubleSide }), local: move(0, 3.5, 0) },
    { geometry: new THREE.CylinderGeometry(0.1, 0.17, 3.3, 5), material: lit(0x9a7a4f), local: move(0, 1.65, 0) },
  ]
  const trees = (at: Site, name: string, parts: Part[], list: { u: number; v: number; random: number }[], size = 1) =>
    instances(at, name, parts, list.map(place => stand(at, place.u, place.v, size * (0.75 + place.random * 0.6), place.random * 6)))

  // L2 · cherry trees around the lake, and a dark forest on the lower slopes.
  const fuji = site('L2')
  trees(fuji, 'cherry-trees', cherry, places(21, 36, random => {
    const angle = random() * Math.PI * 2, reach = 1.25 + random() * 0.5
    const u = FUJI_LAKE.u + Math.cos(angle) * FUJI_LAKE.a * reach, v = FUJI_LAKE.v + Math.sin(angle) * FUJI_LAKE.b * reach
    const h = fuji.heightAt(u, v)
    return h > 0.9 && h < 6 ? { u, v } : null
  }))
  trees(fuji, 'fuji-forest', conifer, places(22, 170, random => {
    const angle = random() * Math.PI * 2, r = 27 + random() * 26, u = Math.cos(angle) * r, v = Math.sin(angle) * r
    const h = fuji.heightAt(u, v)
    return h > 1.2 && h < 15 ? { u, v } : null
  }))

  // L3 · palms around the pond of the oasis.
  const dunes = site('L3')
  trees(dunes, 'oasis-palms', palm, places(31, 13, random => {
    const angle = random() * Math.PI * 2, r = OASIS.pond * 1.4 + random() * (OASIS.green - OASIS.pond * 1.6)
    return { u: OASIS.u + Math.cos(angle) * r, v: OASIS.v + Math.sin(angle) * r }
  }))

  // L4 · three junk boats with orange sails on the water between the towers.
  const bay = site('L4')
  const sail = new THREE.BoxGeometry(0.08, 2.1, 1.25), sailMaterial = lit(0xd9722e)
  instances(bay, 'junk-boats', [
    { geometry: new THREE.BoxGeometry(1.2, 0.6, 3.6), material: lit(0x5a3f2c), local: move(0, 0.2, 0) },
    { geometry: sail, material: sailMaterial, local: move(0, 1.6, 0.8) },
    { geometry: sail, material: sailMaterial, local: move(0, 1.4, -0.8, 1, 0.8, 0.8) },
  ], places(41, 3, random => {
    const u = (random() * 2 - 1) * 32, v = (random() * 2 - 1) * 32
    return TOWERS.every(tower => Math.hypot(tower.u - u, tower.v - v) > tower.b + 7) ? { u, v } : null
  }).map(place => stand(bay, place.u, place.v, 1.5, place.random * 6, 0)))

  // L5 · the water of the lagoon: shallow water is pale, deep water has the colour of the sea of the game.
  const atoll = site('L5')
  {
    const rings = 40, sectors = 96, reach = 52
    const positions: number[] = [], colours: number[] = [], indices: number[] = []
    const pale = new THREE.Color(0xb4f5e6), turquoise = new THREE.Color(0x35d0c6), deep = new THREE.Color(0x208dad), colour = new THREE.Color()
    for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector <= sectors; sector++) {
      const r = ring / rings * reach, angle = sector / sectors * Math.PI * 2, u = Math.cos(angle) * r, v = Math.sin(angle) * r
      atoll.at(u, v, 0.06, position)
      positions.push(position.x, position.y, position.z)
      const depth = -SHAPES.L5.height(u, v)
      colour.copy(pale).lerp(turquoise, smooth(depth, 0.3, 1.2)).lerp(deep, smooth(depth, 1.6, 4))
      // Clear over the shallow floor; solid where the water is deep, so the edge of the lagoon water does not show.
      colours.push(colour.r, colour.g, colour.b, 0.75 + 0.25 * smooth(depth, 2, 3.6))
      if (ring < rings && sector < sectors) {
        const a = ring * (sectors + 1) + sector, b = a + 1, c = a + sectors + 1
        indices.push(a, c, b, b, c, c + 1)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const lagoon = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.12, transparent: true, depthWrite: false }))
    lagoon.name = 'lagoon-water'
    root.add(lagoon)
  }
  trees(atoll, 'atoll-palms', palm, places(51, 30, random => {
    const angle = random() * Math.PI * 2, r = atollRing(angle) + (random() - 0.5) * 3, u = Math.cos(angle) * r, v = Math.sin(angle) * r
    return atoll.heightAt(u, v) > 1.25 ? { u, v } : null
  }), 0.8)

  // L6 · penguins on the edge of the ice shelf and on two flat icebergs.
  const ice = site('L6')
  const flat = BERGS.filter(berg => !berg.peak && berg.size > 6).slice(0, 2)
  instances(ice, 'penguins', [
    { geometry: new THREE.CapsuleGeometry(0.22, 0.35, 4, 8), material: lit(0x20242c), local: move(0, 0.4, 0) },
    { geometry: new THREE.SphereGeometry(0.19, 8, 6), material: lit(0xf7f7f2), local: move(0, 0.38, 0.12, 1, 1.25, 0.6) },
    { geometry: new THREE.ConeGeometry(0.05, 0.16, 5), material: lit(0xf0a030), local: move(0, 0.63, 0.25).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)) },
  ], [
    ...places(61, 22, random => { const u = (random() * 2 - 1) * 26; return { u, v: iceFront(u) + 2.5 + random() * 5 } }),
    ...flat.flatMap((berg, index) => places(62 + index, 4, random => ({ u: berg.u + (random() - 0.5) * berg.size * 0.7, v: berg.v + (random() - 0.5) * berg.size * 0.7 }))),
  ].map(place => stand(ice, place.u, place.v, 1.7, Math.PI + (place.random - 0.5) * 2)))

  // ---- Moving water ------------------------------------------------------------------------------------
  /** White streaks on pale blue. The picture moves along each ribbon, so the water falls. */
  const streaks = (() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 256
    const ctx = canvas.getContext('2d')!, random = seededRandom(7)
    ctx.fillStyle = 'rgba(214,238,250,0.72)'
    ctx.fillRect(0, 0, 64, 256)
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.6})`
      ctx.fillRect(random() * 64, random() * 256, 1 + random() * 3, 20 + random() * 70)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    return texture
  })()
  const waterMaterial = new THREE.MeshStandardMaterial({ map: streaks, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.5, emissive: 0xbfdfee, emissiveIntensity: 0.25 })
  // Each ribbon starts at its top. A smaller offset moves the picture toward the end of the ribbon: down.
  updates.push(time => { streaks.offset.y = -time * 0.55 })
  /** A strip of water through `points`, `width(s)` metres wide across the unit vector `across`. */
  function ribbon(at: Site, points: THREE.Vector3[], across: THREE.Vector3, width: (s: number) => number) {
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    let length = 0
    points.forEach((point, index) => {
      if (index) length += point.distanceTo(points[index - 1])
      const half = width(index / (points.length - 1)) / 2
      positions.push(point.x - across.x * half, point.y - across.y * half, point.z - across.z * half, point.x + across.x * half, point.y + across.y * half, point.z + across.z * half)
      uvs.push(0, length / 9, 1, length / 9)
      if (index) indices.push(index * 2 - 2, index * 2 - 1, index * 2, index * 2 - 1, index * 2 + 1, index * 2)
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, waterMaterial)
    mesh.name = 'falling-water'
    root.add(mesh)
    objects[at.landmark.id]++
  }
  // White to clear white: a dark edge shows when the colour fades to black.
  const mistMap = (() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })()
  /** Soft white puffs that grow, rise and fade, again and again. */
  function puffs(at: Site, count: number, seed: number, place: (random: () => number) => { u: number; v: number; height: number }, rise: number, size: number, opacity: number) {
    const random = seededRandom(seed)
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistMap, transparent: true, depthWrite: false, opacity: 0 }))
      const start = place(random), phase = random(), life = 4 + random() * 3, drift = (random() - 0.5) * 3
      root.add(sprite)
      updates.push(time => {
        const age = (time / life + phase) % 1
        at.at(start.u + drift * age, start.v + age * 2, start.height + rise * age, sprite.position)
        sprite.scale.setScalar(size * (0.5 + age))
        sprite.material.opacity = opacity * Math.sin(age * Math.PI)
      })
    }
    objects[at.landmark.id] += count
  }

  // L7 · the stream on the table mountain, the waterfall, the mist at its foot, and the jungle.
  const tepui = site('L7')
  {
    const edge = tepuiEdge(TEPUI.fallAngle), lip = -edge + 0.8, lipHeight = tepui.heightAt(0, lip) + 0.5
    ribbon(tepui, Array.from({ length: 14 }, (_, i) => { const v = 4 + (lip - 4) * i / 13; return tepui.at(0, v, tepui.heightAt(0, v) + 0.3) }), tepui.east, () => 1.5)
    ribbon(tepui, Array.from({ length: 16 }, (_, i) => { const s = i / 15; return tepui.at(0, lip - 5 * Math.sqrt(s), lipHeight * (1 - s * s) + 0.1) }), tepui.east, s => 2.4 + s * 2.6)
    puffs(tepui, 7, 71, random => ({ u: TEPUI_POOL.u + (random() - 0.5) * 5, v: TEPUI_POOL.v + 1 + random() * 3, height: 0.5 }), 7, 6, 0.8)
    trees(tepui, 'tepui-jungle', jungle, places(72, 190, random => {
      const angle = random() * Math.PI * 2, r = random() * 46, u = Math.cos(angle) * r, v = Math.sin(angle) * r, x = r - tepuiEdge(angle)
      const h = tepui.heightAt(u, v)
      // On the top, clear of the stream, and on the slope under the cliff.
      return (x < -2.5 && Math.abs(u) > 3) || (x > 4 && h > 1.2) ? { u, v } : null
    }))
  }

  // L9 · the stone columns: one prism with six sides for each cell of a honeycomb grid.
  const causeway = site('L9')
  {
    const pitch = 1.4, cells: { u: number; v: number; top: number }[] = []
    const random = seededRandom(91)
    for (let j = -24; j <= 12; j++) for (let i = -17; i <= 17; i++) {
      const u = pitch * (i + (j & 1) * 0.5), v = pitch * 0.866 * j, mask = causewayMask(u, v)
      if (mask < 0.5) { random(); continue }
      // Each column stops at its own height, in steps of 0.3 m. The columns of the edge are lower.
      cells.push({ u, v, top: causewayTop(u, v) + Math.round((random() - 0.6) * 3) * 0.3 - (1 - smooth(mask, 0.5, 0.95)) })
    }
    const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 0.8, 5, 6), lit(0xffffff, { roughness: 0.85 }), cells.length)
    columns.name = 'basalt-columns'
    const dark = new THREE.Color(0x4a4744), ochre = new THREE.Color(0xa88a55), wet = new THREE.Color(0x2c2b2b), colour = new THREE.Color()
    cells.forEach((cell, index) => {
      columns.setMatrixAt(index, stand(causeway, cell.u, cell.v, 1, 0, cell.top - 2.5))
      colour.copy(dark).lerp(ochre, smooth(cell.top, 3.6, 5.4) * 0.8).lerp(wet, 1 - smooth(cell.top, 0.2, 1)).multiplyScalar(0.8 + ((index * 7919) % 100) / 250)
      columns.setColorAt(index, colour)
    })
    root.add(columns)
    objects.L9 += cells.length
  }

  // L10 · four thin waterfalls on the walls of the fjord, and trees on the gentle ground of the lower slopes.
  const fjord = site('L10')
  for (const [v, side] of [[-44, 1], [-30, -1], [-10, 1], [16, -1]] as const) {
    const points = Array.from({ length: 16 }, (_, i) => {
      const u = fjordPath(v) + side * (fjordWidth(v) + 10.5 - i * 0.68)
      return fjord.at(u, v, Math.max(0.1, fjord.heightAt(u, v)) + 0.4)
    })
    ribbon(fjord, points, fjord.north, () => 1.3)
  }
  trees(fjord, 'fjord-forest', conifer, places(101, 260, random => {
    const u = (random() * 2 - 1) * 55, v = (random() * 2 - 1) * 55, h = fjord.heightAt(u, v)
    return Math.hypot(u, v) < 56 && h > 1 && h < 19 && Math.abs(fjord.heightAt(u + 1, v) - h) < 2.2 ? { u, v } : null
  }), 0.8)

  // L11 · steam over the hot spring, and a geyser that goes up every 8 s.
  const spring = site('L11')
  puffs(spring, 14, 111, random => { const angle = random() * Math.PI * 2, r = random() * 9; return { u: Math.cos(angle) * r, v: Math.sin(angle) * r, height: 3 } }, 12, 5.5, 0.75)
  {
    const count = 110, random = seededRandom(112)
    const jets = Array.from({ length: count }, () => ({ phase: random(), speed: 9.5 + random() * 4, side: (random() - 0.5) * 1.6, far: (random() - 0.5) * 1.6 }))
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 1.1, map: mistMap, transparent: true, depthWrite: false, opacity: 0.75, color: 0xf2fbff }))
    points.name = 'geyser'
    points.frustumCulled = false
    root.add(points)
    objects.L11 += 1
    const foot = spring.heightAt(GEYSER.u, GEYSER.v), flight = 2.7, cycle = 8, active = 4.2
    updates.push(time => {
      jets.forEach((jet, index) => {
        const age = (time / flight + jet.phase) % 1 * flight, launch = ((time - age) % cycle + cycle) % cycle
        // A drop that left the ground when the geyser was at rest stays under the ground.
        const height = launch < active ? jet.speed * age - 4.2 * age * age : -3
        spring.at(GEYSER.u + jet.side * age, GEYSER.v + jet.far * age, foot + height, position)
        geometry.attributes.position.setXYZ(index, position.x, position.y, position.z)
      })
      geometry.attributes.position.needsUpdate = true
    })
  }

  return { update(time) { updates.forEach(update => update(time)) }, objects }
}
