import { describe, expect, it } from 'vitest'
import { BORDER, CAPTION, PHOTO_LONG, postcardFileName, postcardLayout, postcardTitle, STAMP } from '../src/postcard'
import { STICKERS } from '../src/stickers'

describe('postcard', () => {
  it('names the file for the world', () => {
    expect(postcardFileName('Earth')).toBe('fairy-postcard-earth.png')
    expect(postcardFileName('Blossom Haven')).toBe('fairy-postcard-blossom-haven.png')
    expect(postcardFileName('  Moon! ')).toBe('fairy-postcard-moon.png')
    expect(postcardFileName('')).toBe('fairy-postcard-space.png')
    for (const { name } of STICKERS) expect(postcardFileName(name)).toMatch(/^fairy-postcard-[a-z0-9]+(-[a-z0-9]+)*\.png$/)
  })

  it('says "The Sun" and "The Moon", but "Mars"', () => {
    expect(postcardTitle('sun')).toBe('The Sun')
    expect(postcardTitle('moon')).toBe('The Moon')
    expect(postcardTitle('mars')).toBe('Mars')
    expect(postcardTitle('fairy')).toBe('Blossom Haven')
  })

  it('keeps the whole view of a 16:9 computer screen on a wide card', () => {
    const layout = postcardLayout(1600, 900)
    expect(layout.crop).toEqual({ x: 0, y: 0, width: 1600, height: 900 })
    expect(layout.photo).toEqual({ x: BORDER, y: BORDER, width: PHOTO_LONG, height: 675 })
    expect(layout.width).toBe(PHOTO_LONG + 2 * BORDER)
    expect(layout.height).toBe(BORDER + 675 + CAPTION)
  })

  it('cuts a tall phone view to 3:4 at its middle, on a tall card', () => {
    const layout = postcardLayout(390, 844)
    expect(layout.crop).toEqual({ x: 0, y: 162, width: 390, height: 520 })
    expect(layout.photo.width / layout.photo.height).toBeCloseTo(3 / 4)
    expect(layout.photo.height).toBe(PHOTO_LONG)
    expect(layout.height).toBeGreaterThan(layout.width)
  })

  it('cuts the sides of a very wide view', () => {
    const layout = postcardLayout(3200, 900)
    expect(layout.crop.height).toBe(900)
    expect(layout.crop.width).toBe(1600)
    expect(layout.crop.x).toBe(800)
  })

  it('puts the name, the line and the stamp on the strip under the picture, inside the card', () => {
    for (const [width, height] of [[1600, 900], [390, 844], [320, 568], [1024, 768], [844, 390]]) {
      const layout = postcardLayout(width, height)
      const bottom = layout.photo.y + layout.photo.height
      for (const text of [layout.name, layout.line]) {
        expect(text.y - text.size * 0.8).toBeGreaterThan(bottom)
        expect(text.y).toBeLessThan(layout.height)
        expect(text.x + text.maxWidth).toBeLessThan(layout.stamp.x)
      }
      expect(layout.stamp.size).toBe(STAMP)
      expect(layout.stamp.y).toBeGreaterThan(bottom)
      expect(layout.stamp.y + layout.stamp.size).toBeLessThan(layout.height)
      expect(layout.stamp.x + layout.stamp.size).toBeLessThanOrEqual(layout.width - BORDER)
      expect(layout.crop.x + layout.crop.width).toBeLessThanOrEqual(width)
      expect(layout.crop.y + layout.crop.height).toBeLessThanOrEqual(height)
    }
  })

  it('does not break on an empty view', () => {
    const layout = postcardLayout(0, 0)
    expect(layout.photo.width).toBeGreaterThan(0)
    expect(layout.crop.width).toBeGreaterThan(0)
  })
})
