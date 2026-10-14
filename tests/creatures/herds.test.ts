import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createTerrain, HOME_SEED } from '../../src/terrain'
import { createFields } from '../../src/foliage/zones'
import { footprintOf, placeHerds } from '../../src/creatures/herds'
import type { Herd } from '../../src/creatures/herds'
import { fits, placeAt } from '../../src/creatures/rules'
import { CreatureObstacles, SphericalHabitat } from '../../src/creatures/spherical'

/** The ground mesh of a world, as buildGround() of src/worlds.ts makes it. */
function site(world: 'earth' | 'fairy', seed: number) {
  const radius = world === 'earth' ? 275 : 137.5
  const sample = createTerrain(world, seed)
  const geometry = new THREE.SphereGeometry(1, 512, 256), n = new THREE.Vector3()
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(position, i).normalize()
    n.multiplyScalar(radius + sample(n.x, n.y, n.z).height)
    position.setXYZ(i, n.x, n.y, n.z)
  }
  const obstacles = new CreatureObstacles()
  if (world === 'fairy') obstacles.add(new THREE.Vector3(0, -1, 0), radius, 12)
  return { world, seed, radius, sample, ground: new SphericalHabitat(geometry, radius), obstacles, anchor: new THREE.Vector3(0.6, 0.48, 0.64).normalize() }
}

const earth = site('earth', 11), haven = site('fairy', HOME_SEED)
const earthHerds = placeHerds(earth), havenHerds = placeHerds(haven)
const where = (herd: Herd, east: number, north: number, radius: number) => herd.route[0].clone().multiplyScalar(radius).addScaledVector(herd.east, east).addScaledVector(herd.north, north).normalize()

describe('the herds', () => {
  it('puts most kinds of each world on the planet, with many animals', () => {
    const kinds = (herds: Herd[]) => new Set(herds.map(herd => herd.species.id))
    expect(kinds(earthHerds).size).toBeGreaterThanOrEqual(27)
    expect(kinds(havenHerds).size).toBeGreaterThanOrEqual(10)
    const animals = (herds: Herd[]) => herds.reduce((sum, herd) => sum + herd.members.length, 0)
    expect(animals(earthHerds)).toBeGreaterThan(1500)
    expect(animals(havenHerds)).toBeGreaterThan(150)
  })

  it('places each herd where its rule allows: its zone, its surface and its half of the planet', () => {
    for (const [herds, s] of [[earthHerds, earth], [havenHerds, haven]] as const) {
      const fields = createFields(s.seed)
      for (const herd of herds) {
        const c = herd.route[0], place = placeAt(s.world, c.x, c.y, c.z, s.sample, fields, s.radius)
        expect(fits(herd.species.rule, place), `${herd.species.id} at ${place.zone} ${place.surface}`).toBe(true)
      }
    }
  })

  it('stands each walking member on dry ground, and each swimmer on deep enough water, at each point of its route', () => {
    for (const herds of [earthHerds, havenHerds]) for (const herd of herds) {
      if (herd.kind === 'air' || herd.kind === 'leap') continue
      for (const member of herd.members) for (const [index, height] of member.ground.entries()) {
        const id = herd.species.id
        if (herd.kind === 'water') expect(height, id).toBeLessThan(-0.4)
        else if (herd.species.rule.surfaces.includes('sea')) expect(height, id).toBeGreaterThan(-0.7)
        else if (herd.species.rule.surfaces.includes('shore')) expect(height, id).toBeGreaterThan(0.1)
        else expect(height, `${id} at route point ${index}`).toBeGreaterThan(0.6)
      }
    }
  })

  it('keeps the herds apart: no two herds of different kinds on one place, and a gap between herds of one kind', () => {
    for (const [herds, s] of [[earthHerds, earth], [havenHerds, haven]] as const) {
      const ground = herds.filter(herd => herd.kind !== 'air')
      for (let i = 0; i < ground.length; i++) for (let j = i + 1; j < ground.length; j++) {
        const a = ground[i], b = ground[j], distance = a.route[0].angleTo(b.route[0]) * s.radius
        if (a.species.id === b.species.id) expect(distance, a.species.id).toBeGreaterThanOrEqual(12)
        else expect(distance, `${a.species.id} and ${b.species.id}`).toBeGreaterThan(footprintOf(a.species) + footprintOf(b.species))
      }
    }
  })

  it('gives the same herds for the same seed, and new herds for a new Earth', () => {
    const again = placeHerds({ ...earth, only: ['zebra', 'cow', 'dolphin'] })
    const first = earthHerds.filter(herd => ['zebra', 'cow', 'dolphin'].includes(herd.species.id))
    expect(again.map(herd => herd.route[0].toArray())).toEqual(first.map(herd => herd.route[0].toArray()))
    const other = site('earth', 12)
    const next = placeHerds({ ...other, only: ['zebra', 'cow', 'dolphin'] })
    expect(next.map(herd => herd.route[0].toArray())).not.toEqual(first.map(herd => herd.route[0].toArray()))
  })

  it('puts a herd of a start kind near the anchor', () => {
    const near = earthHerds.filter(herd => ['cow', 'sheep', 'rabbit', 'deer'].includes(herd.species.id) && herd.route[0].angleTo(earth.anchor) * earth.radius < 32)
    expect(near.length).toBeGreaterThan(0)
    // Each member of a herd is near the centre of its herd.
    for (const herd of earthHerds) for (const member of herd.members) expect(where(herd, member.east, member.north, earth.radius).angleTo(herd.route[0]) * earth.radius).toBeLessThan(20)
  })
})
