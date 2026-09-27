import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createStarSky, STAR_SKY_RADIUS, starDirection } from '../src/stars'
import { webbImages } from '../src/star-data'

function fakeLoader() {
  const urls: string[] = []
  const pending: Array<() => void> = []
  return {
    urls,
    finish() { for (const done of pending.splice(0)) done() },
    load(url: string, done: (texture: THREE.Texture) => void) {
      urls.push(url)
      const texture = new THREE.Texture({ width: 520, height: 300 } as never)
      pending.push(() => done(texture))
    },
  }
}

describe('directional star sky', () => {
  it('maps equatorial coordinates consistently', () => {
    expect(starDirection(0, 0).distanceTo(new THREE.Vector3(1, 0, 0))).toBeLessThan(1e-8)
    expect(starDirection(90, 0).distanceTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(1e-8)
    expect(starDirection(0, 90).distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-8)
  })

  it('draws the whole catalog in one points object on the sky sphere', () => {
    const scene = new THREE.Scene(), sky = createStarSky(scene, { loadTexture: fakeLoader().load })
    const stars = sky.group.getObjectByName('catalog-stars') as THREE.Points
    const position = stars.geometry.getAttribute('position')
    expect(position.count).toBe(2887)
    expect(new THREE.Vector3().fromBufferAttribute(position, 0).length()).toBeCloseTo(STAR_SKY_RADIUS, 1)
    expect(sky.group.getObjectByName('milky-way')).toBeDefined()
    for (const name of ['catalog-stars', 'milky-way', 'constellation-lines', 'asterism-lines', 'webb-pointers']) {
      expect(sky.group.getObjectByName(name)!.renderOrder).toBeLessThan(0)
    }
  })

  it('follows camera translation without rotation, fades everything, and scales stars by pixel ratio', () => {
    const scene = new THREE.Scene(), sky = createStarSky(scene, { loadTexture: fakeLoader().load })
    const position = new THREE.Vector3(300000, -60000, 123456)
    const stars = sky.group.getObjectByName('catalog-stars') as THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
    const lines = sky.group.getObjectByName('constellation-lines') as THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
    sky.update(position, 0.5, 2)
    expect(sky.group.position.equals(position)).toBe(true)
    expect(sky.group.quaternion.equals(new THREE.Quaternion())).toBe(true)
    expect(stars.material.uniforms.uOpacity.value).toBeCloseTo(0.5)
    expect(stars.material.uniforms.uScale.value).toBe(2)
    expect(lines.material.opacity).toBeCloseTo(0.17)
    expect(sky.visibility).toBeCloseTo(0.5)
    sky.update(position, 0)
    expect(sky.group.visible).toBe(false)
    sky.update(position, 4)
    expect(stars.material.uniforms.uOpacity.value).toBe(1)
    sky.update(position, Number.NaN)
    expect(sky.group.visible).toBe(false)
  })

  it('shows lines and Webb pictures only with the toggle, and loads the images once', () => {
    const scene = new THREE.Scene(), loader = fakeLoader()
    const sky = createStarSky(scene, { loadTexture: loader.load, imageBase: '/sky/webb/' })
    const pictures = sky.group.getObjectByName('star-pictures')!
    expect(pictures.visible).toBe(false)
    expect(sky.picturesShown).toBe(false)
    expect(loader.urls).toHaveLength(0)
    sky.setConstellations(true)
    expect(pictures.visible).toBe(true)
    expect(loader.urls).toEqual(webbImages.map(image => `/sky/webb/${image.id}.jpg`))
    const card = sky.group.getObjectByName('weic2212a') as THREE.Mesh
    expect(card.visible).toBe(false)
    loader.finish()
    expect(card.visible).toBe(true)
    expect(card.scale.x / card.scale.y).toBeCloseTo(520 / 300)
    // The picture faces the camera at the centre of the sky group.
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(card.quaternion)
    expect(normal.dot(card.position.clone().normalize())).toBeCloseTo(-1, 5)
    sky.setConstellations(false)
    expect(pictures.visible).toBe(false)
    sky.setConstellations(true)
    expect(loader.urls).toHaveLength(webbImages.length)
    sky.dispose()
    expect(scene.children).not.toContain(sky.group)
  })
})
