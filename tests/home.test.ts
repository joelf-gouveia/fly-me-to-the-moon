import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildHome, buildPart, createHomeBuilder, HOME_PRESETS, HOME_STORAGE_KEY, homeLook, loadHomeLook, onWall, saveHomeLook, setHomeLook, surpriseLook, DOORS, HOME_COLORS, homeStats, MAX_TOP, OPTIONS, parseHomeLook, PART_IDS, ROOFS, TODAY, WALLS, YARD_REACH, YARDS } from '../src/home'
import type { HomeLook } from '../src/home'

// The ground of the clearing of Blossom Haven: a radius of 110 base units × 1.25, plus HOME_CLEARING_HEIGHT.
const GROUND = 110 * 1.25 + 3
/** The walls, the roof and the door stay inside this radius; the yard is outside it. */
const HOUSE_REACH = 6.2
const look = (change: Partial<HomeLook>): HomeLook => ({ ...structuredClone(TODAY), ...change })
const window = new THREE.MeshStandardMaterial()
const partStats = (part: 'roof' | 'walls' | 'door' | 'yard', value: HomeLook) => {
  const walls = buildPart('walls', value, null, { groundRadius: GROUND, windowMaterial: window })
  const built = part === 'walls' ? walls.group : buildPart(part, value, walls.socket, { groundRadius: GROUND, windowMaterial: window }).group
  const holder = new THREE.Group().add(built)
  return { ...homeStats(holder), built, socket: walls.socket! }
}

describe('the parts of the fairy home', () => {
  it('builds the flower cottage of today as the default look', () => {
    const home = buildHome(TODAY, { groundRadius: GROUND })
    const stats = homeStats(home.group)
    expect(home.group.name).toBe('flower-cottage')
    // Today: the gold heart of the petal roof is 6.65 m high, and the roof here sits 5 cm lower (buildFlowerCottage() in src/worlds.ts).
    expect(stats.top).toBeCloseTo(6.6, 1)
  })

  it('fits each roof on each walls under the flower of the guide', () => {
    for (const walls of WALLS) for (const roof of ROOFS) {
      const value = look({ walls: walls.id, roof: roof.id })
      const stats = partStats('roof', value)
      expect(stats.top, `${roof.id} on ${walls.id}`).toBeLessThanOrEqual(MAX_TOP + 0.01)
      expect(stats.reach, `${roof.id} on ${walls.id}`).toBeLessThanOrEqual(HOUSE_REACH)
      // The roof covers the top of the walls: its lowest piece is at the top, and it is wider than the top.
      expect(stats.box.min.y, `${roof.id} on ${walls.id}`).toBeLessThan(stats.socket.topY + 0.2)
      expect(stats.reach, `${roof.id} on ${walls.id}`).toBeGreaterThanOrEqual(stats.socket.topRadius * 0.98)
    }
  })

  it('keeps the walls inside the house radius, with two lit windows', () => {
    for (const walls of WALLS) {
      const stats = partStats('walls', look({ walls: walls.id }))
      expect(stats.reach, walls.id).toBeLessThanOrEqual(HOUSE_REACH)
      expect(stats.top, walls.id).toBeLessThan(MAX_TOP)
      const windows: THREE.Mesh[] = []
      stats.built.traverse(object => { if (object.name === 'cottage-window') windows.push(object as THREE.Mesh) })
      expect(windows, walls.id).toHaveLength(1)
      expect(windows[0].material, walls.id).toBe(window)
    }
  })

  it('stands each door on the ground against the front of each walls', () => {
    for (const walls of WALLS) for (const door of DOORS) {
      const stats = partStats('door', look({ walls: walls.id, door: door.id }))
      const name = `${door.id} on ${walls.id}`
      expect(stats.box.min.y, name).toBeGreaterThan(-0.45)
      expect(stats.box.min.y, name).toBeLessThan(0.15)
      // The back of the door is in the wall, and the front is at most 0.35 m out of it.
      expect(stats.box.max.z - stats.socket.frontAt(1.2), name).toBeLessThan(0.45)
      expect(stats.box.min.z, name).toBeLessThan(stats.socket.frontAt(1.2))
      expect(stats.top, name).toBeLessThan(stats.socket.topY)
      // The leaf of the door is before the wall, not in it.
      const leaf = new THREE.Box3().setFromObject(stats.built.getObjectByName('home-door-main')!)
      expect(leaf.max.z, name).toBeGreaterThan(stats.socket.frontAt(1.2) + 0.01)
    }
  })

  it('puts the front of a flat piece before each point of a round wall', () => {
    const walls = [(y: number) => 3.7 - 0.13 * y, (y: number) => 3.85 - 0.12 * (y - 1.8) ** 2, (y: number) => 3.6 + 0.2 * Math.sin(y * 3)]
    for (const radiusAt of walls) {
      const { lean, base } = onWall(radiusAt, 0, 2.8, 0.1)
      for (let y = 0; y <= 2.8; y += 0.05) expect(base + y * Math.tan(lean) + 0.1 / Math.cos(lean)).toBeGreaterThanOrEqual(radiusAt(y) + 0.025)
    }
  })

  it('keeps each yard inside the 12 m that the creatures keep free', () => {
    for (const yard of YARDS) {
      const stats = partStats('yard', look({ yard: yard.id }))
      expect(stats.reach, yard.id).toBeLessThanOrEqual(YARD_REACH)
      expect(stats.top, yard.id).toBeLessThan(3.5)
    }
  })

  it('gives a whole home at most 18 draw calls', () => {
    const most = (part: 'roof' | 'walls' | 'door' | 'yard') => Math.max(...OPTIONS[part].map(option => partStats(part, look({ [part]: option.id } as Partial<HomeLook>)).calls))
    expect(most('roof') + most('walls') + most('door') + most('yard')).toBeLessThanOrEqual(18)
  })

  it('reads a saved look and gives the look of today for a value it does not know', () => {
    expect(parseHomeLook(null)).toEqual(TODAY)
    expect(parseHomeLook({ roof: 'castle', walls: 'teapot', colors: { walls: 'gold', roof: 'mint' } })).toEqual({ ...TODAY, walls: 'teapot', colors: { ...TODAY.colors, roof: 'mint' } })
    for (const part of PART_IDS) expect(OPTIONS[part].map(option => option.id)).toContain(TODAY[part])
    for (const part of PART_IDS) for (const option of OPTIONS[part]) expect(HOME_COLORS.map(color => color.id)).toContain(option.color)
  })

  it('swaps a part in place and keeps the window material of the game', () => {
    const surface = new THREE.Group()
    const old = new THREE.Group()
    old.name = 'flower-cottage'
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshStandardMaterial())
    lamp.name = 'cottage-window'
    old.add(lamp)
    surface.add(old)
    const builder = createHomeBuilder(surface, GROUND)
    expect(surface.getObjectByName('flower-cottage')).toBe(builder.group)
    const roof = builder.parts.roof
    const changed = builder.set('walls', 'pumpkin')
    expect(changed).toHaveLength(3)
    expect(builder.parts.roof).not.toBe(roof)
    expect(builder.look.colors.walls).toBe('apricot')
    expect((surface.getObjectByName('cottage-window') as THREE.Mesh).material).toBe(lamp.material)
    const door = builder.parts.door
    builder.paint('door', 'sky')
    expect(builder.parts.door).toBe(door)
    expect((door.userData.main as THREE.MeshStandardMaterial).color.getHex()).toBe(0x8fcbef)
    builder.set('roof', 'toadstool', true)
    expect(builder.look.colors.roof).toBe(TODAY.colors.roof)
  })

  it('saves the home and reads it again, and keeps the cottage of today when the storage fails', () => {
    const data = new Map<string, string>()
    const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    expect(loadHomeLook(store)).toEqual(TODAY)
    expect(saveHomeLook(HOME_PRESETS.teapot, store)).toBe(true)
    expect(JSON.parse(data.get(HOME_STORAGE_KEY)!)).toEqual(HOME_PRESETS.teapot)
    expect(loadHomeLook(store)).toEqual(HOME_PRESETS.teapot)
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadHomeLook(broken)).toEqual(TODAY)
    expect(saveHomeLook(TODAY, broken)).toBe(false)
    expect(loadHomeLook(undefined)).toEqual(TODAY)
  })

  it('gives the look of the home to each new build', () => {
    setHomeLook(HOME_PRESETS.tower)
    const look = homeLook()
    look.roof = 'petals'
    expect(homeLook()).toEqual(HOME_PRESETS.tower)
    setHomeLook(TODAY)
  })

  it('makes each surprise a whole home that differs from the home of now', () => {
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const presets = Object.values(HOME_PRESETS).map(look => JSON.stringify(look))
    let stories = 0
    for (let i = 0; i < 200; i++) {
      const now = i % 2 ? TODAY : HOME_PRESETS.candy
      const look = surpriseLook(random, now)
      expect(look).toEqual(parseHomeLook(look))
      expect(JSON.stringify(look)).not.toBe(JSON.stringify(now))
      if (presets.includes(JSON.stringify(look))) stories++
    }
    expect(stories).toBeGreaterThan(60)
    expect(stories).toBeLessThan(140)
  })
})
