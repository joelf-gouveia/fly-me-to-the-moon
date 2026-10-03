import { describe, expect, it } from 'vitest'
import { DESIGNS, numberOf } from './designs'
import { DESIGNS as GAME_DESIGNS } from '../../src/fairy-wings/designs'
import type { Pixel } from '../../src/fairy-wings/designs'
import { BEFORE_OPTIONS, DECISIONS, FINDINGS, FROM_PICTURE, LEVERS, SELECTED } from './model'
import { coverage } from '../../src/fairy-wings/paint'
import { boxOf, hsl, locate, outline, point, radius, ramp, rgb, toHsl, tone } from '../../src/fairy-wings/shapes'
import type { Panel, RGB } from '../../src/fairy-wings/shapes'
import { ALL_LEVERS } from '../../src/fairy-wings/wings'
import { classicWings } from '../../src/fairy'
import { BEFORE } from './wings'
import { wingColorOptions, wingOptions } from '../../src/customization'

const petal: Panel = { from: 0, to: 80, length: 1.5, peak: 0.5, round: 0.8 }
const colours = { wing: rgb(0xc6f3ff), sparkle: rgb(0xffc786) }
const samples = [0.1, 0.3, 0.5, 0.7, 0.9]

describe('a wing panel', () => {
  it('starts at the root and has its longest radius at the peak', () => {
    expect(radius(petal, 0)).toBe(0)
    expect(radius(petal, 1)).toBe(0)
    expect(radius(petal, 0.5)).toBeCloseTo(1.5)
    expect(radius({ ...petal, peak: 0.7 }, 0.7)).toBeCloseTo(1.5)
    expect(radius(petal, 0.5)).toBeGreaterThan(radius(petal, 0.3))
  })
  it('is broad with a low round value and slim with a high one', () => {
    expect(radius({ ...petal, round: 0.4 }, 0.15)).toBeGreaterThan(radius({ ...petal, round: 1.2 }, 0.15))
  })
  it('adds a point, a notch, scallops and a tail', () => {
    expect(radius({ ...petal, tip: 0.1 }, 0.5)).toBeCloseTo(1.65)
    expect(radius({ ...petal, tip: -0.1 }, 0.5)).toBeCloseTo(1.35)
    // Round scallops are deep between two lobes; spikes are long at the same places.
    expect(radius({ ...petal, scallop: [5, 0.2] }, 0.4)).toBeLessThan(radius(petal, 0.4))
    expect(radius({ ...petal, scallop: [5, 0.2, 'spike'] }, 0.4)).toBeCloseTo(radius(petal, 0.4))
    expect(radius({ ...petal, tail: [0.3, 1, 0.05] }, 0.3)).toBeGreaterThan(1.5 + radius(petal, 0.3) - 0.01)
  })
  it('finds the place of a point again', () => {
    const [x, y] = point(petal, 0.35, 0.6)
    const place = locate(petal, x, y)
    expect(place.u).toBeCloseTo(0.35)
    expect(place.rho).toBeCloseTo(0.6)
    expect(locate(petal, -1, 0).r).toBe(0)
  })
  it('has a square picture that holds all the outline', () => {
    const box = boxOf(petal)
    for (const [x, y] of outline(petal)) {
      expect(x).toBeGreaterThan(box.x)
      expect(x).toBeLessThan(box.x + box.side)
      expect(y).toBeGreaterThan(box.y)
      expect(y).toBeLessThan(box.y + box.side)
    }
  })
})

describe('the colours', () => {
  it('go to HSL and back', () => {
    const colour: RGB = [0.2, 0.6, 0.9]
    const back = hsl(...toHsl(colour))
    colour.forEach((part, index) => expect(back[index]).toBeCloseTo(part))
  })
  it('make a deeper shade of the same hue', () => {
    const deep = tone(colours.wing, -0.2)
    expect(toHsl(deep)[0]).toBeCloseTo(toHsl(colours.wing)[0])
    expect(toHsl(deep)[2]).toBeCloseTo(toHsl(colours.wing)[2] - 0.2)
  })
  it('read a ramp at its stops and between them', () => {
    const stops: [number, RGB][] = [[0, [0, 0, 0]], [1, [1, 1, 1]]]
    expect(ramp(stops, -1)).toEqual([0, 0, 0])
    expect(ramp(stops, 0.25)).toEqual([0.25, 0.25, 0.25])
    expect(ramp(stops, 2)).toEqual([1, 1, 1])
  })
})

describe('the twenty wings', () => {
  it('are twenty, each with its own id and name', () => {
    expect(DESIGNS).toHaveLength(20)
    expect(new Set(DESIGNS.map(design => design.id)).size).toBe(20)
    expect(new Set(DESIGNS.map(design => design.name)).size).toBe(20)
    expect(numberOf('dew')).toBe('01')
    expect(numberOf('aurora')).toBe('20')
    for (const id of Object.keys(BEFORE)) expect(DESIGNS.some(design => design.id === id)).toBe(false)
  })
  it('have two to four panels, with an upper and a lower panel', () => {
    for (const design of DESIGNS) {
      expect(design.panels.length, design.id).toBeGreaterThanOrEqual(2)
      expect(design.panels.length, design.id).toBeLessThanOrEqual(4)
      expect(design.panels.some(panel => panel.lower), design.id).toBe(true)
      expect(design.panels.some(panel => !panel.lower), design.id).toBe(true)
    }
  })
  it('go out from the back: no panel crosses the middle of the fairy by more than her head', () => {
    // The root of a wing is 0.19 from the middle of the back, and the head is 0.23 wide on each side.
    for (const design of DESIGNS) for (const panel of design.panels) {
      const reach = Math.min(...outline(panel).map(p => p[0]))
      expect(reach, design.id).toBeGreaterThan(-0.42)
    }
  })
  it('are not longer than 2.1 units, and fill a useful part of their picture', () => {
    for (const design of DESIGNS) for (const panel of design.panels) {
      expect(Math.max(...outline(panel).map(p => Math.hypot(...p))), design.id).toBeLessThanOrEqual(2.1)
      expect(coverage(panel), design.id).toBeGreaterThan(0.12)
    }
  })
  it('paint a valid colour at each place, for each wing colour of the menu', () => {
    for (const design of DESIGNS) for (const option of wingColorOptions) {
      const wing = rgb(option.color)
      design.panels.forEach((panel, index) => {
        for (const u of samples) for (const rho of samples) {
          const [x, y] = point(panel, u, rho)
          const pixel: Pixel = { u, rho, x, y, v: 0.5, dx: 0.1, dy: -0.1, panel: index }
          const colour = design.base(pixel, { wing, sparkle: rgb(option.sparkle) })
          const amounts = design.mask?.(pixel) ?? [0, 0, 0]
          for (const part of [...colour, ...amounts]) expect(Number.isFinite(part), `${design.id} ${option.id}`).toBe(true)
          expect(colour[3], design.id).toBeGreaterThanOrEqual(0)
          expect(colour[3], design.id).toBeLessThanOrEqual(1)
        }
      })
    }
  })
  it('have layers for panels that exist, and effects from 0 to 1', () => {
    for (const design of DESIGNS) {
      for (const layer of design.layers(colours)) {
        for (const index of layer.only ?? []) expect(index, design.id).toBeLessThan(design.panels.length)
        expect(layer.width, design.id).toBeGreaterThanOrEqual(0)
      }
      for (const amount of Object.values(design.fx)) {
        expect(amount, design.id).toBeGreaterThanOrEqual(0)
        expect(amount, design.id).toBeLessThanOrEqual(1)
      }
    }
  })
  it('say if they use the wing colour, and the base agrees', () => {
    const pixels: Pixel[] = samples.map(at => ({ u: at, rho: 1 - at * 0.8, x: 0.5, y: 0.4, v: at, dx: 0.05, dy: at - 0.5, panel: 0 }))
    const all = (design: typeof DESIGNS[number], wing: RGB) => pixels.map(pixel => design.base(pixel, { ...colours, wing }).join()).join()
    for (const design of DESIGNS) {
      expect(all(design, rgb(0xb5c4ff)) !== all(design, rgb(0xffcfe2)), design.id).toBe(design.colour === 'Wing colour')
    }
  })
})

describe('the text of the study', () => {
  it('shows the three wings of the game as Before', () => {
    expect(BEFORE_OPTIONS.map(option => BEFORE[option.id])).toEqual([...classicWings])
    expect(BEFORE_OPTIONS.map(option => option.name.toLowerCase())).toEqual([...classicWings])
  })
  it('has the twelve selected wings, with the five wings from the pictures, and each but Autumn leaf takes the wing colour', () => {
    expect(SELECTED.map(numberOf)).toEqual(['01', '02', '03', '04', '05', '06', '07', '11', '13', '14', '16', '20'])
    for (const id of SELECTED) expect(DESIGNS.find(design => design.id === id)!.colour, id).toBe(id === 'autumn' ? 'Own colours' : 'Wing colour')
    expect(Object.values(FROM_PICTURE).sort()).toEqual([1, 2, 3, 4, 5])
    for (const id of Object.keys(FROM_PICTURE)) expect(SELECTED).toContain(id)
  })
  it('has the selected wings in the game, in the order of the menu', () => {
    expect(GAME_DESIGNS.map(design => design.id)).toEqual(SELECTED)
    expect(wingOptions.map(option => option.id)).toEqual(SELECTED)
    expect(wingOptions.map(option => option.label)).toEqual(GAME_DESIGNS.map(design => design.name))
  })
  it('has a lever for each switch of the rendering', () => {
    expect(LEVERS.map(lever => lever.id).sort()).toEqual(Object.keys(ALL_LEVERS).sort())
  })
  it('asks for each wing and each lever, and marks one answer as recommended or done in each single choice', () => {
    expect(FINDINGS).toHaveLength(8)
    expect(DECISIONS[0].options).toHaveLength(20)
    expect(DECISIONS.find(decision => decision.id === 'levers')!.options).toEqual(LEVERS.map(lever => lever.name))
    for (const decision of DECISIONS.filter(decision => !decision.multi)) {
      expect(decision.options.filter(option => /\((recommended|done)\)/.test(option)), decision.id).toHaveLength(1)
    }
  })
})
