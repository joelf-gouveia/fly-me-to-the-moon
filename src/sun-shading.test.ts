import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createSunShading, MAX_SUN_OCCLUDERS, occluderRadius, patchSunShader } from './sun-shading'
import type { World } from './worlds'

const shaderFor = (name: 'physical' | 'basic') => ({
  vertexShader: THREE.ShaderLib[name].vertexShader,
  fragmentShader: THREE.ShaderLib[name].fragmentShader,
  uniforms: {},
}) as unknown as THREE.WebGLProgramParametersWithUniforms

describe('sun shader patch', () => {
  const shading = createSunShading(new THREE.Vector3())
  it('masks only unbounded point lights in lit materials', () => {
    const shader = shaderFor('physical')
    expect(patchSunShader(shader, shading.uniforms)).toBe(true)
    expect(shader.fragmentShader).toContain('if ( pointLight.distance == 0.0 ) directLight.color *= sunVisibility;')
    expect(shader.fragmentShader).not.toContain('#include <lights_fragment_begin>')
    expect(shader.vertexShader).toContain('vSunShadowPosition = ( modelMatrix * sunShadowPosition ).xyz;')
    expect(shader.uniforms).toHaveProperty('sunOccluders')
  })
  it('leaves unlit materials unchanged', () => {
    const shader = shaderFor('basic')
    const before = shader.fragmentShader
    expect(patchSunShader(shader, shading.uniforms)).toBe(false)
    expect(shader.fragmentShader).toBe(before)
  })
  it('keeps an existing shader change and gives the patched program its own key', () => {
    const material = new THREE.MeshStandardMaterial()
    let ripples = 0
    material.onBeforeCompile = () => { ripples++ }
    const key = material.customProgramCacheKey()
    shading.track(new THREE.Mesh(new THREE.BufferGeometry(), material))
    const shader = shaderFor('physical')
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    expect(ripples).toBe(1)
    expect(shader.fragmentShader).toContain('sunShadow(')
    expect(material.customProgramCacheKey()).toBe(`${key}|sun-shadow`)
  })
})

describe('sun occluders', () => {
  const world = (x: number, radius: number, gas = false, kind: World['kind'] = 'earth') =>
    ({ kind, radius, gas, group: { position: new THREE.Vector3(x, 0, 0) } }) as unknown as World
  it('follows each planet and uses the cloud deck for gas worlds', () => {
    const shading = createSunShading(new THREE.Vector3())
    shading.update([world(3300, 220), world(6300, 470, true), world(0, 600, false, 'sun')])
    const [earth, jupiter, unused] = shading.uniforms.sunOccluders.value
    expect(earth.toArray()).toEqual([3300, 0, 0, 220])
    expect(jupiter.w).toBe(occluderRadius({ radius: 470, gas: true }))
    expect(unused.w).toBe(0)
    expect(shading.uniforms.sunOccluders.value).toHaveLength(MAX_SUN_OCCLUDERS)
  })
})
