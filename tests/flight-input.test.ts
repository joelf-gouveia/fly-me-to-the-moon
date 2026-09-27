import { describe, expect, it } from 'vitest'
import { createFlightInput } from '../src/flight-input'
import { createMobileQuality } from '../src/mobile-quality'

describe('flight input ownership', () => {
  it('can climb, turn and boost together, releasing only the lifted finger', () => {
    const input = createFlightInput()
    input.press(1, 'ArrowUp'); input.press(2, 'ArrowLeft'); input.press(3, 'ShiftLeft')
    input.release(2)
    expect(input.has('ArrowUp')).toBe(true)
    expect(input.has('ArrowLeft')).toBe(false)
    expect(input.has('ShiftLeft')).toBe(true)
    input.clear()
    expect(input.has('ArrowUp')).toBe(false)
    expect(input.has('ShiftLeft')).toBe(false)
  })
  it('does not cancel another finger or a held keyboard key on the same action', () => {
    const input = createFlightInput()
    input.press(1, 'ArrowUp'); input.press(2, 'ArrowUp'); input.setKey('ArrowUp', true)
    input.release(1); input.setKey('ArrowUp', false)
    expect(input.has('ArrowUp')).toBe(true)
    input.release(2)
    expect(input.has('ArrowUp')).toBe(false)
  })
  it('ignores stale releases after an interruption', () => {
    const input = createFlightInput()
    input.press(1, 'ShiftLeft'); input.clear(); input.press(2, 'ShiftLeft'); input.release(1)
    expect(input.has('ShiftLeft')).toBe(true)
  })
})

describe('mobile resolution budget', () => {
  it('bounds high-DPI iPad pixel cost without enlarging a low-DPI display', () => {
    const quality = createMobileQuality()
    const ratio = quality.ratio(1366, 1024, 3)
    expect(1366 * 1024 * ratio * ratio).toBeLessThanOrEqual(1_500_001)
    expect(quality.ratio(390, 844, 1)).toBe(1)
  })
  it('lowers sustained slow rendering and recovers slowly after sustained headroom', () => {
    const quality = createMobileQuality()
    for (let i = 0; i < 70; i++) quality.sample(1 / 30, true)
    expect(quality.ratio(390, 844, 3)).toBeCloseTo(1.1)
    for (let i = 0; i < 600; i++) quality.sample(1 / 60, true)
    expect(quality.ratio(390, 844, 3)).toBeCloseTo(1.2)
  })
  it('does not punish pauses or a background-tab time jump', () => {
    const quality = createMobileQuality()
    for (let i = 0; i < 1000; i++) quality.sample(1 / 30, false)
    quality.sample(30, true)
    expect(quality.ratio(390, 844, 3)).toBe(1.25)
  })
})
