import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { starPictures } from '../star-data'
import { resolvedPictures } from '../star-map'
import { beforeCatalogHr, beforePictureIds, beforePictures, createLegacySky } from './legacy-sky'
import { budget } from './model'
import type { StudySettings } from './model'

const settings: StudySettings = {
  figures: 'proposed', asterisms: true, background: 'real', limit: 5.5,
  milkyWay: true, webb: true, placement: 'beside', postcardDegrees: 6, labels: true,
}

describe('star map study', () => {
  it('keeps every line of the three pictures from before the change', () => {
    for (const [index, picture] of beforePictures.entries()) {
      const proposed = resolvedPictures.find(figure => figure.id === beforePictureIds[index])!
      expect(proposed.name).toBe(picture.name)
      const segments = new Set(proposed.segments.map(pair => [...pair].sort().join()))
      for (const path of picture.paths) for (let i = 1; i < path.length; i++) {
        expect(segments.has([path[i - 1], path[i]].sort().join())).toBe(true)
      }
    }
  })

  it('rebuilds the sky from before: 3,000 random stars, 22 catalog stars, three pictures', () => {
    const scene = new THREE.Scene(), sky = createLegacySky(scene)
    const count = (name: string) => (sky.group.getObjectByName(name) as THREE.Points).geometry.getAttribute('position').count
    expect(count('decorative-stars')).toBe(3000)
    expect([0, 1, 2].reduce((total, bucket) => total + count(`catalog-stars-${bucket}`), 0)).toBe(beforeCatalogHr.length)
    expect(sky.pictures.children).toHaveLength(3)
    sky.dispose()
    expect(scene.children).toHaveLength(0)
  })

  it('reports a budget that follows the settings', () => {
    expect(budget(settings)).toMatchObject({ stars: 2887, figures: starPictures.length, segments: 147 })
    expect(budget({ ...settings, asterisms: false }).figures).toBe(starPictures.filter(f => f.kind === 'constellation').length)
    expect(budget({ ...settings, figures: 'today', background: 'today', webb: false })).toMatchObject({ figures: 3, stars: 3022, webbImages: 0 })
  })
})
