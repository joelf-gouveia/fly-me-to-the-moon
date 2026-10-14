import { describe, expect, it } from 'vitest'
import { STICKERS } from '../src/stickers'
import type { StickerId } from '../src/stickers'
import { newWarmthNote, thermometer, thermometerAt, WARMTH, WARMTH_NOTE, WARMTH_STEPS, warmthMeter, warmthNoteStep, warmthOf, warmthStep } from '../src/warmth'

const planets: StickerId[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

describe('picture thermometer', () => {
  it('has one level for each of the 13 worlds, from 0 to 1', () => {
    expect(Object.keys(WARMTH).sort()).toEqual(STICKERS.map(sticker => sticker.id).sort())
    for (const level of Object.values(WARMTH)) { expect(level).toBeGreaterThan(0); expect(level).toBeLessThanOrEqual(1) }
  })

  it('agrees with the sticker facts: Venus is the hottest planet, and Uranus the coldest, below Neptune', () => {
    const byWarmth = planets.toSorted((a, b) => WARMTH[b] - WARMTH[a])
    expect(byWarmth[0]).toBe('venus')
    expect(byWarmth.at(-1)).toBe('uranus')
    expect(WARMTH.uranus).toBeLessThan(WARMTH.neptune)
    expect(STICKERS.find(sticker => sticker.id === 'venus')!.fact).toContain('hottest planet')
    expect(STICKERS.find(sticker => sticker.id === 'uranus')!.fact).toContain('coldest planet')
  })

  it('follows the order of the real temperatures, with the Sun at the top', () => {
    const order = (Object.keys(WARMTH) as StickerId[]).filter(id => id !== 'fairy').toSorted((a, b) => WARMTH[b] - WARMTH[a])
    expect(order).toEqual(['sun', 'venus', 'mercury', 'earth', 'moon', 'mars', 'vesta', 'ceres', 'jupiter', 'saturn', 'neptune', 'uranus'])
    expect(WARMTH.sun).toBe(1)
    // No two real worlds have the same level, so the levels always show an order.
    expect(new Set(order.map(id => WARMTH[id])).size).toBe(order.length)
  })

  it('gives one word for each step: HOT, WARM, NICE, COOL or COLD', () => {
    expect(WARMTH_STEPS.map(step => step.word)).toEqual(['HOT', 'WARM', 'NICE', 'COOL', 'COLD'])
    expect([1, 0.7, 0.5, 0.3, 0.1, 0].map(level => warmthStep(level).word)).toEqual(['HOT', 'WARM', 'NICE', 'COOL', 'COLD', 'COLD'])
  })

  it('says HOT for Venus, NICE for Earth and Blossom Haven, and COLD for Uranus', () => {
    const words = Object.fromEntries(STICKERS.map(sticker => [sticker.id, warmthOf(sticker.id).word]))
    expect(words).toEqual({
      sun: 'HOT', mercury: 'HOT', venus: 'HOT', earth: 'NICE', fairy: 'NICE', moon: 'COOL', mars: 'COOL', vesta: 'COOL', ceres: 'COOL',
      jupiter: 'COLD', saturn: 'COLD', uranus: 'COLD', neptune: 'COLD',
    })
  })

  it('draws a different face for each step, with no emoji and no number', () => {
    // No world is WARM now, so the levels give the five faces.
    const drawings = Object.entries({ hot: 0.9, warm: 0.7, nice: 0.5, cool: 0.3, cold: 0.1 }).map(([step, level]) => {
      const svg = thermometerAt(level)
      expect(svg).toContain(`is-${step}`)
      expect(svg).toContain(`--warmth-level:${level}`)
      expect(svg).toContain(`--warmth-colour:${warmthStep(level).colour}`)
      expect(svg).not.toMatch(/\p{Extended_Pictographic}/u)
      // The face: the part after the bulb.
      return svg.slice(svg.indexOf('stroke-width="2"/>', svg.indexOf('<circle')))
    })
    expect(new Set(drawings).size).toBe(5)
    expect(thermometer('venus')).toBe(thermometerAt(WARMTH.venus))
    // The meter has the word, and no digit shows as text.
    expect(warmthMeter('venus').replace(/<[^>]+>/g, '')).toBe('HOT')
    expect(warmthMeter('uranus').replace(/<[^>]+>/g, '')).toBe('COLD')
  })

  it('has colours with a contrast of 3 or more on the dark panel and on the pink sticker card', () => {
    // The two ends of the Worlds panel, the arrival note, and the two ends of the sticker card.
    const grounds = ['#28314d', '#161929', '#182335', '#fff7fb', '#ffe6f1']
    for (const step of WARMTH_STEPS) {
      for (const ground of grounds) expect(contrast(step.colour, ground), `${step.word} on ${ground}`).toBeGreaterThanOrEqual(3)
      // The dark lines of the face on the bulb.
      expect(contrast(step.colour, '#2a1b3d'), `face on ${step.word}`).toBeGreaterThanOrEqual(3)
    }
    expect(new Set(WARMTH_STEPS.map(step => step.colour)).size).toBe(5)
  })
})

describe('arrival moment of the thermometer', () => {
  const run = (state: ReturnType<typeof newWarmthNote>, near: StickerId | null, seconds: number, flying = true, busy = false) => {
    for (let i = 0; i < Math.round(seconds * 10); i++) warmthNoteStep(state, near, 0.1, flying, busy)
    return state
  }

  it('does not show at the start on Earth', () => {
    expect(run(newWarmthNote(), 'earth', 3).shown).toBeNull()
  })

  it('shows at an arrival for 5 s, then fades and goes', () => {
    const state = run(newWarmthNote(), null, 2)
    expect(run(state, 'venus', 0.1).shown).toBe('venus')
    expect(run(state, 'venus', WARMTH_NOTE.show - 0.5).left).toBeGreaterThan(0)
    expect(run(state, 'venus', 0.7).left).toBeLessThanOrEqual(0)
    expect(state.shown).toBe('venus')
    expect(run(state, 'venus', WARMTH_NOTE.fade + 0.1).shown).toBeNull()
    // It does not come back while she stays.
    expect(run(state, 'venus', 30).shown).toBeNull()
  })

  it('waits for the sticker note, and leaves when a note comes', () => {
    const state = run(newWarmthNote(), null, 2)
    expect(run(state, 'moon', 7, true, true).shown).toBeNull()
    expect(state.pending).toBe('moon')
    expect(run(state, 'moon', 0.1).shown).toBe('moon')
    expect(run(state, 'moon', 0.1, true, true).shown).toBeNull()
    // The note is gone, and the same arrival does not show again.
    expect(run(state, 'moon', 3).shown).toBeNull()
  })

  it('drops a waiting thermometer when the fairy leaves the world', () => {
    const state = run(newWarmthNote(), null, 2)
    run(state, 'moon', 2, true, true)
    expect(run(state, null, 1).pending).toBeNull()
    expect(state.shown).toBeNull()
  })

  it('waits behind Worlds and the pause: no flight, no time', () => {
    const state = run(newWarmthNote(), null, 2)
    expect(run(state, 'mars', 1, false).shown).toBeNull()
    expect(run(state, 'mars', 0.1).shown).toBe('mars')
  })

  it('shows the same world again only after 10 s away from it', () => {
    const state = run(newWarmthNote(), null, 2)
    run(state, 'venus', 8)
    run(state, null, WARMTH_NOTE.again - 2)
    expect(run(state, 'venus', 1).shown).toBeNull()
    run(state, null, WARMTH_NOTE.again + 1)
    expect(run(state, 'venus', 0.1).shown).toBe('venus')
    // A different world shows at once.
    expect(run(state, 'earth', 0.1).shown).toBe('earth')
  })
})
