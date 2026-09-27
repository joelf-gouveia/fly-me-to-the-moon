import { describe, expect, it } from 'vitest'
import { parseSettings, WORLD_SPEEDS } from '../src/settings'

describe('settings', () => {
  it('keeps only the two sky switches, and only true values', () => {
    expect(parseSettings(null)).toEqual({ stars: false, orbits: false })
    expect(parseSettings('broken')).toEqual({ stars: false, orbits: false })
    expect(parseSettings({ stars: true, orbits: 'yes', sound: true, speed: 64 })).toEqual({ stars: true, orbits: false })
  })

  it('offers the five world speeds of the game', () => {
    expect(WORLD_SPEEDS).toEqual([1, 8, 16, 32, 64])
  })
})
