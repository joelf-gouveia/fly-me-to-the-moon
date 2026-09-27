import { describe, expect, it } from 'vitest'
import { PLANET_LOOKS } from '../planet-look'
import {
  BAKE_SIZE, BASE_PROPORTIONS, beyondSun, inGame, budget, dayNightContrast, farSideShadows, gameRingRadius, GAS_GIANTS, MAP_BYTES, oklch, PLANET_IDS, PLANETS,
  referenceMeasure, RELOCATION_RING_LIMIT, retuneMeasure, RING_SPAN, RING_ZONES, ringOpacity, SPACE_LIGHT, spaceLightAt, textureBytes,
  todayMeasure, todayRingTilt,
} from './model'

import worldsSource from '../worlds.ts?raw'
import mainSource from '../main.ts?raw'
import relocationSource from '../relocation.ts?raw'

const sources: Record<string, string> = { 'worlds.ts': worldsSource, 'main.ts': mainSource, 'relocation.ts': relocationSource }
const source = (path: string) => sources[path]
/** The map files as data URLs, so the test can count their bytes. */
const files = import.meta.glob('../../public/planets/ssc/*', { query: '?inline', import: 'default', eager: true }) as Record<string, string>
const fileBytes = (name: string) => {
  const data = files[`../../public/planets/ssc/${name}`].split(',')[1]
  return data.length * 3 / 4 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0)
}

describe('planet look study', () => {
  it('copies the planet values of the game', () => {
    const worlds = source('worlds.ts'), main = source('main.ts')
    for (const id of PLANET_IDS) {
      const planet = PLANETS[id]
      const color = `0x${planet.color.toString(16).padStart(6, '0')}`
      expect(worlds).toContain(`['${planet.name}', '${id}', ${planet.radius}, ${planet.orbit}, ${planet.angle}, ${color}, ${planet.atmosphere}, ${planet.cloudHeight}]`)
      expect(main).toContain(`${id}: ${planet.spin}`)
    }
  })

  it('scales the planets as the game does', () => {
    const worlds = source('worlds.ts')
    expect(worlds).toContain('const radius = baseRadius * PROPORTIONS.size, orbit = baseOrbit * PROPORTIONS.spacing')
    expect(worlds).toContain('const atmosphere = baseAtmosphere * PROPORTIONS.size, cloudHeight = baseCloudHeight * PROPORTIONS.size')
    expect(inGame('jupiter', BASE_PROPORTIONS).radius).toBe(470)
  })

  it('uses the game look of option B: the same tilts, sky and cloud colours, and ring limit', () => {
    for (const id of PLANET_IDS) {
      expect(PLANET_LOOKS[id].obliquity).toBe(PLANETS[id].obliquity)
      expect(PLANET_LOOKS[id].sky).toBe(PLANETS[id].retune.sky)
      expect(PLANET_LOOKS[id].cloud).toBe(PLANETS[id].retune.cloud)
    }
    // The study's Before option copies the old air; the game shader keeps its old depth rule inside the air.
    expect(source('worlds.ts')).toContain('float alpha = 1.0-exp(-depth*0.028*mix(1.0, ${HALO_THIN.toFixed(2)}, haloFar));')
    expect(source('relocation.ts')).toContain(`world.radius * ${RELOCATION_RING_LIMIT}`)
  })

  it('measures less band contrast today than in the pictures, and gets closer in option A', () => {
    for (const id of PLANET_IDS) expect(PLANETS[id].reference.bands).toHaveLength(18)
    for (const id of ['jupiter', 'saturn', 'neptune'] as const) {
      expect(todayMeasure(id).range).toBeLessThan(referenceMeasure(id).range * 0.6)
      expect(retuneMeasure(id).range).toBeGreaterThan(Math.max(todayMeasure(id).range, referenceMeasure(id).range * 0.6))
    }
    // Neptune and Mars have weaker colour today than in their pictures.
    for (const id of ['neptune', 'mars'] as const) expect(todayMeasure(id).chroma).toBeLessThan(referenceMeasure(id).chroma * 0.7)
    // A mean colour hides the bands: Jupiter's mean map colour is almost grey.
    expect(oklch(PLANETS.jupiter.reference.mean).chroma).toBeLessThan(0.02)
  })

  it('computes OKLCH as expected', () => {
    expect(oklch(0xffffff).lightness).toBeCloseTo(1, 3)
    expect(oklch(0xffffff).chroma).toBeLessThan(0.001)
    expect(oklch(0x000000).lightness).toBeCloseTo(0, 5)
    expect(oklch(0xff0000).hue).toBeCloseTo(29.2, 0)
  })

  it('gives the day side about 13 times the light of the night side with the space light', () => {
    expect(dayNightContrast()).toBeCloseTo(3.18, 2)
    expect(dayNightContrast(SPACE_LIGHT)).toBeGreaterThan(12)
    for (const id of PLANET_IDS) {
      const planet = PLANETS[id]
      expect(spaceLightAt(0, planet)).toBe(1)
      expect(spaceLightAt(planet.atmosphere, planet)).toBe(1)
      expect(spaceLightAt(planet.radius * 3, planet)).toBeCloseTo(SPACE_LIGHT)
      let previous = 2
      for (let altitude = 0; altitude < planet.radius * 3; altitude += 10) {
        const light = spaceLightAt(altitude, planet)
        expect(light).toBeLessThanOrEqual(previous)
        previous = light
      }
    }
  })

  it('finds the shadows that come from behind the Sun', () => {
    expect(beyondSun({ x: 10, z: 0 }, { x: -5, z: 0 })).toBe(true)
    expect(beyondSun({ x: 10, z: 0 }, { x: 5, z: 0 })).toBe(false)
    expect(beyondSun({ x: 10, z: 0 }, { x: 20, z: 0 })).toBe(false)
    expect(farSideShadows(BASE_PROPORTIONS)).toEqual([{ target: 'venus', occluder: 'jupiter' }, { target: 'jupiter', occluder: 'venus' }])
    // Planets ×1.25 and distances ×2.5: the lines from Jupiter now pass Venus at a safe distance.
    expect(farSideShadows()).toEqual([])
  })

  it('puts the ring gaps at their real places, inside the relocation limit', () => {
    expect(todayRingTilt()).toBeCloseTo(11.74, 2)
    expect(RING_SPAN.outer).toBeLessThan(RELOCATION_RING_LIMIT)
    expect(gameRingRadius(RING_ZONES[0].from)).toBeCloseTo(RING_SPAN.inner)
    expect(gameRingRadius(RING_ZONES.at(-1)!.to)).toBeCloseTo(RING_SPAN.outer)
    const middle = (name: string) => { const zone = RING_ZONES.find(item => item.name === name)!; return gameRingRadius((zone.from + zone.to) / 2) }
    expect(ringOpacity(middle('B ring'))).toBeGreaterThan(0.7)
    expect(ringOpacity(middle('Cassini division'))).toBeLessThan(0.15)
    expect(ringOpacity(middle('Encke gap'))).toBeLessThan(0.3)
    expect(ringOpacity(middle('C ring'))).toBeLessThan(0.25)
    expect(ringOpacity(RING_SPAN.inner - 0.05)).toBe(0)
    expect(ringOpacity(RING_SPAN.outer + 0.05)).toBe(0)
  })

  it('counts the texture cost of each option', () => {
    expect(textureBytes(512, 256)).toBe(Math.round(512 * 256 * 4 * 4 / 3))
    expect(budget('today').planets).toBe(GAS_GIANTS.length)
    expect(budget('retune').memory).toBe(budget('today').memory)
    expect(budget('paint', true).memory * 4).toBeLessThan(budget('paint').memory * 1.01)
    expect(budget('paint').width).toBe(BAKE_SIZE.desktop[0])
    expect(budget('paint').download).toBe(0)
    expect(budget('photo').planets).toBe(PLANET_IDS.length)
    // The download matches the files in public/planets/ssc/.
    expect(Object.keys(files)).toHaveLength(Object.keys(MAP_BYTES).length)
    for (const [file, bytes] of Object.entries(MAP_BYTES)) expect(fileBytes(file)).toBe(bytes)
  })
})
