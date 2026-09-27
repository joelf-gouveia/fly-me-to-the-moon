import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  coolerRatio, LIMB_ALPHA, limbDarkening, limbExponent, muAt, PROMINENCES, REAL, relativeRate, rotationRate, SHELL_RADII, SPOTS, SUN_SPIN,
} from './sun-look'
import { createSunLook, spinAngle } from './sun-paint'

import worldsSource from './worlds.ts?raw'
import mainSource from './main.ts?raw'

/** Game metres of a real length in km, for the Sun of radius 960 m. */
const scaled = (km: number) => km / REAL.radiusKm * 960

describe('sun look', () => {
  it('uses the limb darkening of Hestroffer and Magnan: a darker and redder edge', () => {
    // Their table: α = 0.628 at 457 nm and 0.447 at 611 nm (Neckel and Labs data).
    expect(limbExponent(457)).toBeCloseTo(0.616, 2)
    expect(limbExponent(611)).toBeCloseTo(0.455, 2)
    expect(LIMB_ALPHA[0]).toBeLessThan(LIMB_ALPHA[1])
    expect(LIMB_ALPHA[1]).toBeLessThan(LIMB_ALPHA[2])
    expect(limbDarkening(1)).toEqual([1, 1, 1])
    const edge = limbDarkening(muAt(0.99))
    expect(edge[0]).toBeGreaterThan(0.38)
    expect(edge[2]).toBeLessThan(0.33)
    expect(edge[0] / edge[2]).toBeGreaterThan(1.3)
  })

  it('turns faster at the equator, and has sunspots at their real temperatures', () => {
    expect(360 / rotationRate(0)).toBeCloseTo(25.05, 2)
    expect(360 / rotationRate(90)).toBeCloseTo(34.35, 2)
    expect(relativeRate(90)).toBeCloseTo(0.729, 3)
    // A sunspot core has about a fifth of the green light, and it is redder.
    const umbra = coolerRatio(REAL.umbra), penumbra = coolerRatio(REAL.penumbra)
    expect(umbra[1]).toBeCloseTo(0.21, 2)
    expect(penumbra[1]).toBeCloseTo(0.5, 1)
    expect(umbra[0]).toBeGreaterThan(umbra[2])
    for (const spot of SPOTS) expect(Math.abs(spot.latitude)).toBeGreaterThanOrEqual(8)
    for (const spot of SPOTS) expect(Math.abs(spot.latitude)).toBeLessThanOrEqual(30)
  })

  it('has prominences from their typical height to less than three times it', () => {
    const typical = scaled(REAL.prominenceKm[0]) / 960
    for (const loop of PROMINENCES) {
      expect(loop.height).toBeGreaterThanOrEqual(typical)
      expect(loop.height).toBeLessThan(typical * 3)
    }
  })

  it('builds the disc, the glare shell and the prominences, and turns them', () => {
    const look = createSunLook(960, new THREE.Vector3(), true)
    const meshes = look.root.children.flatMap(child => child instanceof THREE.Mesh ? [child] : child.children) as THREE.Mesh[]
    expect(meshes).toHaveLength(3)
    const shell = meshes[1]
    expect((shell.geometry as THREE.SphereGeometry).parameters.radius).toBeCloseTo(960 * SHELL_RADII)
    expect(shell.frustumCulled).toBe(false)
    for (const mesh of meshes) expect((mesh.material as THREE.ShaderMaterial).fog).toBe(false)
    // The Sun draws after the air shells (renderOrder −2), so it shows in the sky of a world.
    for (const mesh of meshes) expect(mesh.renderOrder).toBe(-1)
    look.update({ time: SUN_SPIN / 4, air: 1, tint: new THREE.Color(1, 0.5, 0.3), boost: 1 })
    expect(look.prominences!.rotation.y).toBeCloseTo(spinAngle(SUN_SPIN / 4))
    expect(spinAngle(SUN_SPIN)).toBeCloseTo(Math.PI * 2)
    expect((shell.material as THREE.ShaderMaterial).uniforms.air.value).toBe(1)
    look.dispose()
  })

  it('is the Sun of the game, with the phone shader on a touch device', () => {
    expect(worldsSource).toContain('const sunLook = createSunLook(sunRadius, sun.position, true, mobile)')
    expect(worldsSource).not.toContain('MeshBasicMaterial({ color: 0xffd78d })')
    expect(mainSource).not.toContain('sunGlow')
    expect(mainSource).toContain("sun.sunLook!.update({ time: reducedMotion.matches ? 0 : elapsed, air: density, tint: sunTint, boost: 1 })")
  })
})
