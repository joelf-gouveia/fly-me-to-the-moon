import { describe, expect, it } from 'vitest'
import { starDirection } from '../src/stars'
import { designations } from '../src/star-catalog'
import { starNames, starPictures, webbImages } from '../src/star-data'
import {
  angleBetween, bvColor, byHr, distanceToArc, findStar, offset, placeWebbPictures, raDec,
  resolvedPictures, skyStars, starDirectionOf, starPointSize, starsBrighterThan, unitVector,
} from '../src/star-map'

describe('star map data and geometry', () => {
  it('uses the same sky axes as starDirection()', () => {
    for (const [ra, dec] of [[0, 0], [90, 0], [88.79, 7.41], [300, -60]]) {
      const [x, y, z] = unitVector(ra, dec)
      expect(starDirection(ra, dec).distanceTo({ x, y, z } as never)).toBeLessThan(1e-9)
      expect(raDec(unitVector(ra, dec)).ra).toBeCloseTo(ra, 6)
      expect(raDec(unitVector(ra, dec)).dec).toBeCloseTo(dec, 6)
    }
  })

  it('holds the whole catalog to magnitude 5.5 with unique HR numbers', () => {
    expect(skyStars).toHaveLength(2887)
    expect(byHr.size).toBe(skyStars.length)
    expect(skyStars.every(star => star.magnitude <= 5.5)).toBe(true)
    expect(byHr.get(2061)).toMatchObject({ ra: 88.7929, dec: 7.4069, magnitude: 0.5, bv: 1.85 })
    expect(findStar('Alp CMa')!.hr).toBe(2491)
    // Double stars resolve to the brighter row: Alnitak and Mizar, not their companions.
    expect(designations['Zet Ori']).toBe(1948)
    expect(designations['Zet UMa']).toBe(5054)
  })

  it('resolves every picture to short arcs between catalog stars', () => {
    expect(resolvedPictures).toHaveLength(starPictures.length)
    expect(new Set(starPictures.map(picture => picture.id)).size).toBe(starPictures.length)
    for (const picture of resolvedPictures) for (const [a, b] of picture.segments) {
      expect(angleBetween(starDirectionOf(byHr.get(a)!), starDirectionOf(byHr.get(b)!))).toBeLessThan(40)
    }
    for (const key of Object.keys(starNames)) expect(findStar(key)).toBeDefined()
    expect(resolvedPictures.reduce((total, picture) => total + picture.segments.length, 0)).toBe(147)
  })

  it('measures arcs, offsets, sizes and colours', () => {
    const a = unitVector(0, 0), b = unitVector(20, 0)
    expect(distanceToArc(unitVector(10, 5), a, b)).toBeCloseTo(5, 6)
    expect(distanceToArc(unitVector(30, 0), a, b)).toBeCloseTo(10, 6)
    expect(angleBetween(offset(10, 20, 7, 135), unitVector(10, 20))).toBeCloseTo(7, 6)
    expect(raDec(offset(10, 20, 5, 0)).dec).toBeCloseTo(25, 6)
    expect(starPointSize(-1.46)).toBeGreaterThan(starPointSize(2))
    expect(starPointSize(5.5)).toBeCloseTo(2.4)
    expect(bvColor(-0.2)[2]).toBeGreaterThan(bvColor(-0.2)[0])
    expect(bvColor(1.85)[0]).toBeGreaterThan(bvColor(1.85)[2])
    expect(starsBrighterThan(3)).toBe(174)
  })

  it('keeps the enlarged Webb pictures clear of the lines and of each other', () => {
    const placed = placeWebbPictures()
    expect(placed.map(p => p.image.id)).toEqual(webbImages.map(image => image.id))
    expect(placed.find(p => p.image.id === 'weic2411a')!.moved).toBe(true)
    for (const [index, card] of placed.entries()) {
      for (const picture of resolvedPictures) for (const [x, y] of picture.segments) {
        expect(distanceToArc(card.centre, starDirectionOf(byHr.get(x)!), starDirectionOf(byHr.get(y)!))).toBeGreaterThan(3)
      }
      for (const other of placed.slice(index + 1)) expect(angleBetween(card.centre, other.centre)).toBeGreaterThan(6)
      expect(angleBetween(card.centre, card.anchor)).toBeLessThan(22)
    }
    expect(placeWebbPictures(6, 'true').every(card => !card.moved)).toBe(true)
  })
})
