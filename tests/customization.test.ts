import { describe, expect, it } from 'vitest'
import { defaultFairyLook, lookColors, lookOptions, parseFairyLook } from '../src/customization'
import { trailIds } from '../src/fairy-trail'

describe('fairy customization', () => {
  it('offers ten colors for the hair, dress, wings and skin', () => {
    for (const part of ['hairColor', 'dress', 'wingColor', 'skin'] as const) {
      const ids = lookOptions[part].map(({ id }) => id)
      expect(ids).toHaveLength(10)
      expect(new Set(ids).size).toBe(10)
    }
  })

  it('keeps valid saved parts and uses the default for the others', () => {
    expect(parseFairyLook({ hair: 'tails', dress: 'berry', skin: 'glitter' })).toEqual({
      ...defaultFairyLook, hair: 'tails', dress: 'berry',
    })
    expect(parseFairyLook({ hair: 'longWaves' })).toEqual({ ...defaultFairyLook, hair: 'longWaves' })
    expect(parseFairyLook({ hair: 'pixie' })).toEqual(defaultFairyLook)
    expect(parseFairyLook(null)).toEqual(defaultFairyLook)
    expect(parseFairyLook('rose')).toEqual(defaultFairyLook)
  })

  it('converts a look saved with an old palette', () => {
    expect(parseFairyLook({ hair: 'bob', wings: 'luna', palette: 'moon' })).toEqual({
      hair: 'bob', hairColor: 'moonlight', dress: 'moon', wings: 'glitter', wingColor: 'moonbeam', trail: 'pixie', skin: 'peach',
    })
  })

  it('offers the four trails of the trail study, and a saved look with no trail gets Pixie dust', () => {
    expect(lookOptions.trail.map(({ id }) => id)).toEqual([...trailIds])
    expect(parseFairyLook({ hair: 'bob' }).trail).toBe('pixie')
    expect(parseFairyLook({ trail: 'halo' }).trail).toBe('halo')
    expect(parseFairyLook({ trail: 'ribbon' }).trail).toBe('pixie')
  })

  it('gives the default look the colors of the original Rose palette', () => {
    expect(lookColors(defaultFairyLook)).toMatchObject({
      hair: 0x422b45, dress: 0xe88eae, wings: 0xc6f3ff, sparkle: 0xffc786, skin: 0xefba9f,
    })
  })
})
