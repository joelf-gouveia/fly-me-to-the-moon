import { boxOf, clamp01, hash, locate, outline, point, seeded } from './shapes'
import type { Panel, RGB } from './shapes'
import type { Colours, Design, Layer } from './designs'

/**
 * Paints the two pictures of each panel of a wing. The colour picture holds the membrane,
 * its transparency and the drawn layers. The data picture holds the amounts for the wing
 * shader: red is the glitter, green is the own light, blue is the colour shift.
 * The outline is in the transparency of the colour picture, so the mesh is a plain square.
 */
/** The side of each picture of the fairy, in pixels. The menu paints small pictures. */
export const SIZE = 512
export type PanelPicture = { colour: HTMLCanvasElement; data: HTMLCanvasElement; box: { x: number; y: number; side: number } }
/** `paint` off gives the flat colour of the game of today. `lines` off leaves out the drawn layers. */
export type PaintOptions = { paint: boolean; lines: boolean }

const css = (colour: RGB, alpha = 1) => `rgba(${colour.map(part => Math.round(clamp01(part) * 255)).join(',')},${alpha})`

export function paintDesign(design: Design, colours: Colours, options: PaintOptions, SIZE = 512): PanelPicture[] {
  const ys = design.panels.flatMap(panel => outline(panel, 80).map(p => p[1]))
  const top = Math.max(...ys), bottom = Math.min(...ys)
  const layers = options.lines ? design.layers(colours) : []
  return design.panels.map((panel, index) => {
    const box = boxOf(panel), unit = box.side / SIZE, centre = point(panel, panel.peak, 0.55)
    const colour = document.createElement('canvas'), data = document.createElement('canvas')
    colour.width = colour.height = data.width = data.height = SIZE
    const ink = colour.getContext('2d')!, amounts = data.getContext('2d')!
    const pixels = ink.createImageData(SIZE, SIZE), values = amounts.createImageData(SIZE, SIZE)
    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const at = (py * SIZE + px) * 4
        values.data[at + 3] = 255
        const x = box.x + (px + 0.5) * unit, y = box.y + box.side - (py + 0.5) * unit
        const place = locate(panel, x, y)
        if (!(place.r > 0)) continue
        const cover = clamp01((place.r - place.distance) / unit + 0.5)
        if (cover <= 0) continue
        const pixel = { u: place.u, rho: Math.min(place.rho, 1), x, y, v: (top - y) / (top - bottom), dx: (x - centre[0]) / panel.length, dy: (y - centre[1]) / panel.length, panel: index }
        const [r, g, b, a] = options.paint ? design.base(pixel, colours) : [...colours.wing, 0.57]
        const [glitter, glow, irid] = options.paint ? design.mask?.(pixel) ?? [0.25, 0, 1] : [0.25, 0, 1]
        pixels.data[at] = clamp01(r) * 255; pixels.data[at + 1] = clamp01(g) * 255; pixels.data[at + 2] = clamp01(b) * 255
        pixels.data[at + 3] = clamp01(a) * cover * 255
        values.data[at] = clamp01(glitter) * 255; values.data[at + 1] = clamp01(glow) * 255; values.data[at + 2] = clamp01(irid) * 255
      }
    }
    ink.putImageData(pixels, 0, 0)
    amounts.putImageData(values, 0, 0)

    // The drawn layers, in the units of the rig, with y up.
    const scale = SIZE / box.side
    for (const context of [ink, amounts]) {
      context.setTransform(scale, 0, 0, -scale, -box.x * scale, (box.y + box.side) * scale)
      context.lineCap = context.lineJoin = 'round'
    }
    const edge = outline(panel)
    const trace = (context: CanvasRenderingContext2D, points: [number, number][], close = false) => {
      context.beginPath()
      points.forEach(([x, y], at) => at ? context.lineTo(x, y) : context.moveTo(x, y))
      if (close) context.closePath()
    }
    const clip = (context: CanvasRenderingContext2D) => { context.save(); trace(context, edge, true); context.clip() }
    /** Draws one shape on the two pictures. `width` 0 fills the shape. */
    const draw = (layer: Layer, shape: (context: CanvasRenderingContext2D) => void, width = layer.width, colourOf = layer.colour) => {
      ink.strokeStyle = ink.fillStyle = css(colourOf, layer.alpha ?? 1)
      ink.lineWidth = width
      shape(ink)
      if (width) ink.stroke(); else ink.fill()
      // A drawn line is not membrane: first it removes the colour shift (blue), then it adds its glitter and its light.
      amounts.lineWidth = width
      for (const [mode, amount] of [['multiply', [1, 1, 0]], ['lighter', [layer.glitter ?? 0, layer.glow ?? 0, 0]]] as const) {
        amounts.globalCompositeOperation = mode
        amounts.strokeStyle = amounts.fillStyle = css([...amount])
        shape(amounts)
        if (width) amounts.stroke(); else amounts.fill()
      }
    }
    const line = (layer: Layer, points: [number, number][], width = layer.width) => draw(layer, context => trace(context, points), width)
    const disc = (layer: Layer, [x, y]: [number, number], size: number, colourOf = layer.colour, ring = false) =>
      draw(layer, context => { context.beginPath(); context.arc(x, y, size, 0, Math.PI * 2) }, ring ? layer.width : 0, colourOf)
    const path = (place: (t: number) => [number, number], steps: number) => Array.from({ length: steps + 1 }, (_, at) => point(panel, ...place(at / steps)))

    clip(ink); clip(amounts)
    layers.forEach((layer, layerIndex) => {
      if (layer.only && !layer.only.includes(index)) return
      const random = seeded(Math.floor(hash(design.id.length * 7 + design.id.charCodeAt(0), index * 13 + layerIndex) * 1e6))
      if (layer.kind === 'veins') {
        for (let i = 0; i < layer.count; i++) {
          const ui = (i + 0.5) / layer.count
          const main = (rho: number) => panel.peak + (ui - panel.peak) * (0.35 + 0.65 * rho ** 0.7)
          line(layer, path(t => [main(0.03 + 0.97 * t), 0.03 + 0.97 * t], 20))
          for (let k = 1; k <= layer.twigs; k++) {
            const from = 0.25 + 0.55 * (k - 0.5 + (random() - 0.5) * 0.4) / layer.twigs, to = Math.min(1, from + 0.28 + 0.15 * random())
            const turn = ((k + i) % 2 ? 1 : -1) * 0.42 / layer.count * (0.7 + 0.5 * random())
            line(layer, path(t => [main(from + (to - from) * t) + turn * t ** 1.5, from + (to - from) * t], 10), layer.width * 0.6)
          }
        }
      } else if (layer.kind === 'leaf') {
        line(layer, path(t => [panel.peak, 0.02 + 0.98 * t], 4))
        for (let k = 1; k <= layer.twigs; k++) {
          const from = k / (layer.twigs + 1) * 0.85, to = Math.min(1, from + 0.45)
          for (const side of [-1, 1]) line(layer, path(t => [panel.peak + side * 0.36 * t ** 0.8, from + (to - from) * t], 10), layer.width * 0.6)
        }
      } else if (layer.kind === 'grid') {
        for (let k = 1; k < layer.rays; k++) line(layer, path(t => [k / layer.rays, 0.02 + 0.98 * t], 2))
        for (const rho of layer.rhos) line(layer, path(t => [0.005 + 0.99 * t, rho], 72))
      } else if (layer.kind === 'spots') {
        for (let i = 0; i < layer.count; i++) {
          const at = point(panel, 0.08 + 0.84 * random(), layer.rho[0] + (layer.rho[1] - layer.rho[0]) * random())
          disc(layer, at, layer.size[0] + (layer.size[1] - layer.size[0]) * random(), layer.colour, layer.ring)
        }
      } else if (layer.kind === 'eye') {
        const at = point(panel, layer.u, layer.rho)
        layer.rings.forEach((ring, i) => disc(layer, at, layer.size * (1 - i / layer.rings.length), ring))
      } else if (layer.kind === 'swirls') {
        for (let k = 0; k < layer.count; k++) {
          const [cx, cy] = point(panel, 0.18 + 0.64 * (k + 0.5) / layer.count, k % 2 ? 0.68 : 0.52), reach = 0.13 * panel.length, turn = k % 2 ? -1 : 1
          const start = Math.atan2(-cy, -cx)
          // A stem from the direction of the root, then a spiral that closes on the gem.
          const spiral: [number, number][] = Array.from({ length: 41 }, (_, at) => {
            const t = at / 40, angle = start + turn * t * Math.PI * 3.2, size = reach * (1.9 - 1.75 * t ** 0.6)
            return [cx + Math.cos(angle) * size, cy + Math.sin(angle) * size]
          })
          line(layer, spiral)
          if (layer.gem) {
            disc(layer, [cx, cy], 0.03, layer.gem)
            disc({ ...layer, glitter: 1 }, [cx - 0.009, cy + 0.009], 0.01, [1, 1, 1])
          }
        }
      } else if (layer.kind === 'stars') {
        const places = Array.from({ length: layer.count }, () => point(panel, 0.2 + 0.6 * random(), 0.3 + 0.55 * random()))
        if (layer.links) line({ ...layer, alpha: 0.45, glow: 0.3 }, places, 0.005)
        for (const [x, y] of places) {
          const size = layer.width * (0.55 + 0.6 * random())
          draw(layer, context => trace(context, Array.from({ length: 8 }, (_, at) => {
            const angle = at * Math.PI / 4, reach = at % 2 ? size * 0.26 : size
            return [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach] as [number, number]
          }), true), 0)
        }
      } else if (layer.kind === 'edge') {
        // The clip cuts the outer half of the line, so the line has two times its width.
        draw(layer, context => trace(context, edge, true), layer.width * 2)
      }
    })
    ink.restore(); amounts.restore()
    // Parts outside the outline.
    for (const layer of layers) {
      if (layer.kind !== 'curl' || (layer.only && !layer.only.includes(index))) continue
      const tip = point(panel, panel.peak, 0.94), reach = Math.hypot(...tip), out: [number, number] = [tip[0] / reach, tip[1] / reach]
      const centre: [number, number] = [tip[0] + out[0] * layer.size + out[1] * layer.size * 0.5, tip[1] + out[1] * layer.size - out[0] * layer.size * 0.5]
      const start = Math.atan2(tip[1] - centre[1], tip[0] - centre[0]), first = Math.hypot(tip[0] - centre[0], tip[1] - centre[1])
      const spiral = (t: number): [number, number] => {
        const angle = start + t * Math.PI * 3, size = first * (1 - 0.82 * t)
        return [centre[0] + Math.cos(angle) * size, centre[1] + Math.sin(angle) * size]
      }
      // Short parts with a width that gets smaller, so the curl ends in a point.
      for (let at = 0; at < 36; at++) line(layer, [spiral(at / 36), spiral((at + 1.2) / 36)], layer.width * (1 - 0.75 * at / 36))
    }
    return { colour, data, box }
  })
}

/** The shape of each panel for a test or a number: its part of the square that is inside the outline. */
export function coverage(panel: Panel, steps = 64) {
  const box = boxOf(panel)
  let inside = 0
  for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) {
    const place = locate(panel, box.x + (i + 0.5) / steps * box.side, box.y + (j + 0.5) / steps * box.side)
    if (place.r > 0 && place.rho <= 1) inside++
  }
  return inside / (steps * steps)
}
