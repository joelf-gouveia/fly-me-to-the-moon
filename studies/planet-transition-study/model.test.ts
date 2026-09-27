import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain } from '../../src/terrain'
import type { World } from '../../src/worlds'
import { altitudeForAngle, BRAKE, boundariesToday, levelCeiling, runScenario, SCENARIO_IDS, skyWeight, steerShell, TRANSITION_OPTIONS } from './model'
import type { Option, ScenarioId } from './model'

/** Earth at the size of the game (src/proportions.ts): radius 275 m, air 97.5 m, clouds 42.5 m. */
function earth(): World {
  return {
    name: 'Earth', kind: 'earth', radius: 275, atmosphere: 97.5, cloudHeight: 42.5,
    color: 0x83c5e8, sky: new THREE.Color(), group: new THREE.Group(),
    surface: new THREE.Group(), clouds: new THREE.Group(), sample: createTerrain('earth', 1234),
    seed: 1234, visit: 1, armed: false, gas: false,
  }
}
const meadow = new THREE.Vector3(1, 0.2, 0.3).normalize()
const run = (option: Option, id: ScenarioId) => runScenario(option, id, earth(), meadow).summary

describe('the transition today', () => {
  it('keeps a fairy that lets go above the clouds at the edge of space', () => {
    const today = run('today', 'leave-release')
    expect(today.spaceAt).toBeNull()
    expect(today.endAltitude).toBeGreaterThan(97.5)
    expect(today.endAltitude).toBeLessThan(steerShell(earth()))
  })

  it('loops a fairy that holds W back to the world, upside down', () => {
    const today = run('today', 'leave-hold')
    expect(today.highest).toBeLessThan(1000)
    expect(today.maxTurn).toBeGreaterThan(150)
  })

  it('never takes a fairy with no keys into the air', () => {
    const today = run('today', 'dive')
    expect(today.airAt).toBeNull()
    expect(today.maxTurn).toBeGreaterThan(10)
    expect(today.peakBrake).toBeGreaterThan(900)
  })

  it('turns a fairy that holds S in space away from the world', () => {
    expect(run('today', 'space-down').lowest).toBeGreaterThan(900)
  })

  it('snaps the heading at the end of a guided arrival', () => {
    expect(run('today', 'guided-in').maxTurn).toBeGreaterThan(60)
  })
})

describe('the options', () => {
  const options = TRANSITION_OPTIONS.filter(option => option !== 'today')

  it('turn the fairy less than 2.5° in a frame, except on the ground', () => {
    for (const option of options) for (const id of SCENARIO_IDS) {
      if (id === 'space-down' || (option === 'retune' && id === 'leave-hold')) continue
      expect(run(option, id).maxTurn, `${option} ${id}`).toBeLessThan(2.5)
    }
  })

  it('pull up before the ground when S is held', () => {
    for (const option of options) {
      const summary = run(option, 'space-down')
      expect(summary.groundAt, option).not.toBeNull()
      expect(summary.maxTurn, option).toBeLessThan(8)
    }
  })

  it('brake near BRAKE on the approach, not at about 1,000 m/s²', () => {
    for (const option of options) for (const id of ['dive', 'guided-in'] as const) {
      expect(run(option, id).peakBrake, `${option} ${id}`).toBeLessThan(BRAKE * 1.15)
    }
  })

  it('take a fairy with no keys into the air, and level her there', () => {
    for (const option of options) {
      const summary = run(option, 'dive')
      expect(summary.airAt, option).not.toBeNull()
      expect(summary.endMode, option).toBe('air')
    }
  })

  it('let a fairy that lets go above the clouds leave for space', () => {
    for (const option of options) expect(run(option, 'leave-release').spaceAt, option).not.toBeNull()
  })

  it('B and C: holding W goes to space and does not loop back', () => {
    for (const option of ['onesky', 'door'] as const) {
      const summary = run(option, 'leave-hold')
      expect(summary.spaceAt, option).toBeLessThan(9)
      expect(summary.endAltitude, option).toBeGreaterThan(10000)
    }
  })

  it('A keeps the loop of the space rule', () => {
    expect(run('retune', 'leave-hold').endAltitude).toBeLessThan(3000)
  })

  it('C builds the new landscape inside the cloud veil', () => {
    const trace = runScenario('door', 'dive', earth(), meadow)
    const rebuild = trace.samples.find(sample => sample.events.includes('rebuild'))!
    expect(rebuild.veil).toBeGreaterThan(0.8)
    expect(trace.summary.doorTime).toBeGreaterThan(3)
  })
})

describe('the sky of option B', () => {
  it('is space up far away and the world up when the world fills the view', () => {
    const world = earth()
    expect(skyWeight(world, new THREE.Vector3(0, 0, world.radius + altitudeForAngle(world, 7)))).toBe(0)
    expect(skyWeight(world, new THREE.Vector3(0, 0, world.radius + altitudeForAngle(world, 21)))).toBe(1)
    expect(levelCeiling(world)).toBeCloseTo(54.5)
  })

  it('replaces at least eight separate heights of today', () => {
    const heights = boundariesToday(earth()).map(boundary => Math.round(boundary.altitude))
    expect(new Set(heights).size).toBeGreaterThanOrEqual(8)
  })
})
