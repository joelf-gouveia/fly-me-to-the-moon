import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createTerrain } from '../../src/terrain'
import { DECISIONS, EARTH, LANDMARKS, patchTriangles } from './model'
import { BUTTES, canyonPath, causewayMask, fjordPath, FUJI_LAKE, GEYSER, iceFront, SHAPES, TEPUI, TEPUI_POOL, atollRing } from './shapes'
import { BLEND, findPlaces } from './stamp'

describe('the Earth landmarks study', () => {
  it('has twelve landmarks, L1 to L12, and proposes eight of them', () => {
    expect(LANDMARKS.map(landmark => landmark.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12'])
    expect(LANDMARKS.filter(landmark => landmark.proposed).map(landmark => landmark.id)).toEqual(['L1', 'L2', 'L5', 'L6', 'L7', 'L8', 'L11', 'L12'])
  })

  it('offers each landmark in the first decision', () => {
    expect(DECISIONS[0].options).toHaveLength(LANDMARKS.length)
    LANDMARKS.forEach((landmark, index) => expect(DECISIONS[0].options[index].startsWith(`${landmark.id} — ${landmark.name}`)).toBe(true))
  })

  it('gives each real photo an author, a licence and a page on Wikimedia Commons', () => {
    for (const { photo, id } of LANDMARKS) {
      expect(photo.artist, id).not.toBe('')
      expect(photo.page.startsWith('https://commons.wikimedia.org/wiki/File:'), id).toBe(true)
      // A photo in the public domain has no licence page.
      expect(photo.licence === 'Public domain' ? photo.licenceUrl === '' : photo.licenceUrl.startsWith('https://creativecommons.org/licenses/'), id).toBe(true)
    }
  })

  it('has a clip, a picture and a real photo for each landmark, and a clip of the whole Earth', () => {
    const media = Object.keys(import.meta.glob('../../public/studies/earth-landmarks/*.{webm,jpg}')).map(path => path.split('/').at(-1))
    const photos = Object.keys(import.meta.glob('../../public/studies/earth-landmarks/real/*.jpg')).map(path => path.split('/').at(-1))
    for (const id of [...LANDMARKS.map(landmark => landmark.id), 'EARTH']) {
      expect(media).toContain(`${id}.webm`)
      expect(media).toContain(`${id}.jpg`)
    }
    for (const landmark of LANDMARKS) expect(photos).toContain(`${landmark.id}.jpg`)
    expect(media).toContain('L8-coarse.jpg')
  })

  it('gives each landmark a finite ground and a colour on its whole patch', () => {
    const colour = new THREE.Color()
    for (const landmark of LANDMARKS) {
      const shape = SHAPES[landmark.id]
      for (let u = -landmark.radius; u <= landmark.radius; u += 7) for (let v = -landmark.radius; v <= landmark.radius; v += 7) {
        const height = shape.height(u, v)
        expect(Number.isFinite(height), `${landmark.id} at ${u}, ${v}`).toBe(true)
        expect(height).toBeGreaterThan(-9)
        expect(height).toBeLessThan(46)
        // The patch mesh is never above the flight height.
        if (shape.visual) expect(shape.visual(u, v)).toBeLessThanOrEqual(height + 1e-9)
        shape.color(u, v, height, colour)
        expect(Number.isFinite(colour.r + colour.g + colour.b), landmark.id).toBe(true)
      }
    }
  })

  it('makes the main feature of each landmark', () => {
    // L1: the river is under the water of the game, and the rim is a plateau.
    expect(SHAPES.L1.height(canyonPath(0), 0)).toBeLessThan(0)
    expect(SHAPES.L1.height(canyonPath(0) + 45, 0)).toBeGreaterThan(14)
    // L2: the top is higher than the cloud base of Earth (42.5 m), and the lake is water.
    expect(SHAPES.L2.height(0, 3.4)).toBeGreaterThan(42.5)
    expect(SHAPES.L2.height(FUJI_LAKE.u, FUJI_LAKE.v)).toBeLessThan(0)
    // L3: sand above the sea.
    expect(SHAPES.L3.height(30, 30)).toBeGreaterThan(1)
    // L5: islands on the ring, a shallow lagoon, and deep water outside.
    const ring = Array.from({ length: 72 }, (_, i) => i / 72 * Math.PI * 2).map(angle => SHAPES.L5.height(Math.cos(angle) * atollRing(angle), Math.sin(angle) * atollRing(angle)))
    expect(Math.max(...ring)).toBeGreaterThan(1.5)
    expect(SHAPES.L5.height(0, 0)).toBeLessThan(-1)
    expect(SHAPES.L5.height(0, 0)).toBeGreaterThan(-3.5)
    expect(SHAPES.L5.height(55, 0)).toBeLessThan(-6)
    // L6: the shelf behind its front, and the sea before it.
    expect(SHAPES.L6.height(0, iceFront(0) + 6)).toBeGreaterThan(6.5)
    expect(SHAPES.L6.height(55, -55)).toBeLessThan(-4)
    // L7: the flat top, and the pool under the fall.
    expect(SHAPES.L7.height(8, 0)).toBeGreaterThan(TEPUI.top - 2)
    expect(SHAPES.L7.height(TEPUI_POOL.u, TEPUI_POOL.v)).toBeLessThan(0)
    // L8: each butte stands above the floor.
    for (const butte of BUTTES) expect(SHAPES.L8.height(butte.u, butte.v)).toBeGreaterThan(butte.height)
    expect(SHAPES.L8.height(60, -40)).toBeLessThan(4)
    // L9: the columns reach into the sea.
    expect(causewayMask(5 * Math.sin(-20 / 9), -20)).toBeGreaterThan(0.9)
    expect(SHAPES.L9.height(30, -20)).toBeLessThan(0)
    // L10: water along the fjord, high ground at each side.
    for (const v of [-60, -20, 20]) {
      expect(SHAPES.L10.height(fjordPath(v), v)).toBeLessThan(0)
      expect(SHAPES.L10.height(fjordPath(v) + 28, v)).toBeGreaterThan(15)
    }
    // L11: the spring is ground above the sea, so the water of the game does not cover its colours.
    expect(SHAPES.L11.height(0, 0)).toBeGreaterThan(1)
    expect(SHAPES.L11.height(GEYSER.u, GEYSER.v)).toBeGreaterThan(SHAPES.L11.height(GEYSER.u + 8, GEYSER.v))
  })

  it('finds a place for each landmark on the Earth of the study, with no overlap', () => {
    const base = createTerrain('earth', EARTH.seed), places = findPlaces(base, EARTH.radius)
    expect(places).toHaveLength(LANDMARKS.length)
    for (const place of places) {
      const height = base(place.centre.x, place.centre.y, place.centre.z).height
      if (place.landmark.ground === 'land') expect(height, place.landmark.id).toBeGreaterThan(0)
      if (place.landmark.ground === 'sea') expect(height, place.landmark.id).toBeLessThan(0)
      expect(Math.abs(place.centre.y) > 0.97, place.landmark.id).toBe(place.landmark.ground === 'polar')
      for (const other of places) {
        if (other === place) continue
        expect(place.centre.angleTo(other.centre) * EARTH.radius, `${place.landmark.id} and ${other.landmark.id}`).toBeGreaterThan(place.landmark.radius + other.landmark.radius)
      }
    }
    // The search gives the same places each time.
    expect(findPlaces(base, EARTH.radius).map(place => place.centre.toArray())).toEqual(places.map(place => place.centre.toArray()))
  })

  it('keeps the patches small: the landmark has its full shape in the middle, and a mesh of 16,000 to 55,000 triangles', () => {
    expect(BLEND.from).toBeLessThan(BLEND.to)
    for (const landmark of LANDMARKS) {
      expect(patchTriangles(landmark), landmark.id).toBeGreaterThan(16000)
      expect(patchTriangles(landmark), landmark.id).toBeLessThan(55000)
    }
  })
})
