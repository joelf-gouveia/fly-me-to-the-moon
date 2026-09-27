import { describe, expect, it } from 'vitest'
import { createLocationPreview, dimensions, ecosystem } from './model'

describe('candy-world study', () => {
  it('means half the diameter, not half the volume', () => {
    expect(dimensions.homeRadius / dimensions.earthRadius).toBe(0.5)
    expect((dimensions.homeRadius / dimensions.earthRadius) ** 3).toBe(0.125)
    expect(new Set(ecosystem.map(item => item.id)).size).toBe(7)
  })
  it('keeps the recommended outer-rim home fixed', () => {
    const preview = createLocationPreview()
    preview.advance(1200)
    expect(preview.state.location).toBe(0)
    preview.setMode('rim'); preview.advance(5000)
    expect(preview.state.location).toBe(0)
  })
  it('moves a wandering world only after active time and while away', () => {
    const preview = createLocationPreview()
    preview.setMode('roaming')
    preview.advance(1200, false)
    expect(preview.state.activeSeconds).toBe(0)
    preview.advance(1199)
    expect(preview.state.location).toBe(0)
    preview.advance(1)
    expect(preview.state.location).toBe(1)
  })
  it.each(['travelling', 'home'] as const)('defers a move while %s and never strands the fairy', visitor => {
    const preview = createLocationPreview()
    preview.setMode('roaming'); preview.setVisitor(visitor); preview.advance(1200)
    expect(preview.state.pending).toBe(true)
    expect(preview.state.location).toBe(0)
    preview.advance(10000)
    expect(preview.state.location).toBe(0)
    preview.setVisitor('away')
    expect(preview.state.location).toBe(1)
    expect(preview.state.pending).toBe(false)
    preview.advance(1)
    expect(preview.state.location).toBe(1)
  })
})
