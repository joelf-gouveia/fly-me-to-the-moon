import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { createShootingStars, SHOOTING_STARS, shootingStarDark, shootingStarFade, shootingStarGap } from '../src/shooting-stars'
import { seededRandom } from '../src/terrain'
import type { SkyAtCamera } from '../src/shooting-stars'

const night: SkyAtCamera = { air: 97.5, altitude: 10, night: 1, visibility: 1, clarity: 1, reducedMotion: false }

describe('shooting stars', () => {
  it('come only at night, in a dark sky, inside the air', () => {
    expect(shootingStarDark(night)).toBe(1)
    // By day, at dusk with a bright sky, in open space, on a world with no air.
    expect(shootingStarDark({ ...night, night: 0 })).toBe(0)
    expect(shootingStarDark({ ...night, visibility: 0.3 })).toBe(0)
    expect(shootingStarDark({ ...night, altitude: 200 })).toBe(0)
    expect(shootingStarDark({ ...night, air: 0 })).toBe(0)
    // Reduced motion: none.
    expect(shootingStarDark({ ...night, reducedMotion: true })).toBe(0)
    // The haze of Venus lets 10% of the sky through, and its night is still dark.
    expect(shootingStarDark({ ...night, visibility: 0.1, clarity: 0.1 })).toBe(1)
    expect(shootingStarDark({ ...night, night: 0, visibility: 0.01, clarity: 0.1 })).toBe(0)
  })

  it('fade in about 0.8 s and come every few seconds', () => {
    expect(SHOOTING_STARS.life).toBeCloseTo(0.8)
    expect(shootingStarFade(-0.1)).toBe(0)
    expect(shootingStarFade(0.3)).toBeGreaterThan(0.9)
    expect(shootingStarFade(0.79)).toBeLessThan(0.05)
    expect(shootingStarFade(0.81)).toBe(0)
    const random = seededRandom(5)
    for (let i = 0; i < 200; i++) {
      const gap = shootingStarGap(random)
      expect(gap).toBeGreaterThanOrEqual(2.5)
      expect(gap).toBeLessThanOrEqual(6.5)
    }
  })

  it('show in a dark sky above the horizon, and stop in daylight', () => {
    const scene = new THREE.Scene(), stars = createShootingStars(scene, seededRandom(9))
    const camera = new THREE.PerspectiveCamera(58, 1.6, 0.08, 80000)
    const centre = new THREE.Vector3(0, -300, 0)
    camera.position.set(0, 5, 0); camera.lookAt(10, 5, 0); camera.updateMatrixWorld()
    let seen = 0
    for (let t = 0; t < 60; t += 1 / 30) {
      stars.update(t, camera, centre, 1)
      seen = Math.max(seen, stars.stats.active)
      for (const object of scene.children) {
        if (!object.visible || !(object instanceof THREE.Sprite)) continue
        // The head is above the local horizon.
        expect(object.position.clone().sub(camera.position).normalize().y).toBeGreaterThan(0.05)
      }
    }
    expect(stars.stats.launched).toBeGreaterThanOrEqual(60 / 6.5 - 1)
    expect(stars.stats.launched).toBeLessThanOrEqual(60 / 2.5 + 1)
    expect(seen).toBeGreaterThan(0)
    const launched = stars.stats.launched
    for (let t = 60; t < 90; t += 1 / 30) stars.update(t, camera, centre, 0)
    expect(stars.stats.launched).toBe(launched)
    expect(stars.stats.active).toBe(0)
  })
})
