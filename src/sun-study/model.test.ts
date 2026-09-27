import { describe, expect, it } from 'vitest'
import {
  acesFilmic, apparentWidth, budget, CORE, EARTH, edgeContrast, fogOnSun, glare, GLOW, glowEdge, glowToday,
  linear, luminance, profile, REAL, SHELL_RADII, SUN_COLOR, SUN_OPTIONS, SUN_RADIUS, sunlitCloud, toGame,
} from './model'

import worldsSource from '../worlds.ts?raw'
import mainSource from '../main.ts?raw'
import flightSource from '../flight.ts?raw'
import legacySource from './legacy.ts?raw'

describe('sun study', () => {
  it('copies the Sun before this study, and the lights of the game', () => {
    expect(legacySource).toContain(`new THREE.MeshBasicMaterial({ color: 0x${SUN_COLOR.toString(16)} })`)
    expect(legacySource).toContain('const sunRadius = 600 * PROPORTIONS.sun')
    expect(legacySource).toContain('new THREE.SphereGeometry(sunRadius, 64, 40)')
    expect(SUN_RADIUS).toBe(960)
    expect(legacySource).toContain(`sunGlow.scale.setScalar(${GLOW.baseScale} * PROPORTIONS.sun)`)
    expect(legacySource).toContain(`map: makeSoftDiscTexture('rgba(255,185,90,1)'), color: 0x${GLOW.color.toString(16)},`)
    expect(legacySource).toContain(`transparent: true, opacity: ${GLOW.opacity}, blending: THREE.AdditiveBlending`)
    expect(legacySource).toContain(`gradient.addColorStop(${GLOW.solid}, color)`)
    // The old texture is still the soft disc of the fireflies and the relocation glow.
    expect(mainSource).toContain(`gradient.addColorStop(${GLOW.solid}, color)`)
    expect(worldsSource).toContain('gl_FragColor = vec4(color, alpha * 0.96);')
    expect(worldsSource).toContain('const sunRadius = 600 * PROPORTIONS.sun')
    expect(mainSource).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping')
    expect(mainSource).toContain('renderer.toneMappingExposure = 1.15')
    expect(mainSource).toContain('const sunlight = new THREE.PointLight(0xffebcc, 2.4, 0, 0)')
    expect(mainSource).toContain('ambient.intensity = THREE.MathUtils.lerp(1.1, THREE.MathUtils.lerp(0.85, 2.1, light.day), density)')
    expect(mainSource).toContain('const dayAmbientSky = new THREE.Color(0xd9efff)')
    expect(mainSource).toContain('/ PROPORTIONS.size')
    expect(flightSource).toContain('(world.gas ? 8 : 2.3)')
  })

  it('tone maps as three.js does', () => {
    expect(acesFilmic([0, 0, 0])).toEqual([0, 0, 0])
    expect(acesFilmic([100, 100, 100]).every(value => value > 0.99)).toBe(true)
    let previous = -1
    for (let value = 0; value < 5; value += 0.25) {
      const out = luminance(acesFilmic([value, value, value]))
      expect(out).toBeGreaterThanOrEqual(previous)
      previous = out
    }
  })

  it('finds a Sun that is flat and dimmer than a sunlit cloud today', () => {
    expect(edgeContrast('today')).toBe(1)
    expect(edgeContrast('retune')).toBeLessThan(0.9)
    expect(luminance(linear(SUN_COLOR))).toBeLessThan(luminance(sunlitCloud()))
    expect(luminance(CORE)).toBeGreaterThan(luminance(sunlitCloud()) * 1.2)
    expect(luminance(acesFilmic(CORE))).toBeGreaterThan(luminance(acesFilmic(sunlitCloud())))
  })

  it('finds a glow with an edge today, and a glare with none in the proposal', () => {
    expect(glowEdge()).toBeCloseTo(2.04, 2)
    expect(luminance(glowToday(glowEdge() - 0.01))).toBeGreaterThan(0)
    expect(luminance(glowToday(glowEdge() + 0.01))).toBe(0)
    let previous = Infinity
    for (let b = 1; b < SHELL_RADII; b += 0.05) {
      expect(glare(b)).toBeLessThanOrEqual(previous)
      previous = glare(b)
    }
    expect(glare(SHELL_RADII)).toBeLessThan(0.002)
    expect(profile('today')).toHaveLength(16)
    expect(profile('real').at(-1)).toBe('#000000')
  })

  it('finds the Sun hidden from the meadow, 13° wide, and a granule of 1.4 m', () => {
    expect(toGame(REAL.granuleKm)).toBeCloseTo(1.38, 2)
    expect(toGame(REAL.chromosphereKm)).toBeCloseTo(3.45, 2)
    expect(fogOnSun()).toBeGreaterThan(0.999)
    expect(apparentWidth(EARTH.orbit - EARTH.radius)).toBeCloseTo(13.8, 1)
    expect(apparentWidth(EARTH.orbit)).toBeCloseTo(13.36, 2)
    expect(apparentWidth(REAL.auKm, REAL.radiusKm)).toBeCloseTo(0.533, 3)
  })

  it('counts the cost of each option', () => {
    expect(budget('today').calls).toBe(2)
    expect(budget('retune').calls).toBe(2)
    for (const option of SUN_OPTIONS) if (option !== 'camera') expect(budget(option).targets).toBe(0)
    expect(budget('living', 0, 0, true).noise).toBeLessThan(budget('living').noise)
    // C: two half-float frame targets with depth, and the bloom mips: about 27 bytes per pixel.
    expect(budget('camera', 1000, 1000).targets / 1e6).toBeCloseTo(27.33, 1)
    expect(budget('camera').passes).toBe(14)
  })
})
