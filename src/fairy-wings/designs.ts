import { hsl, mix, noise, ramp, smooth, toHsl, tone } from './shapes'
import type { Panel, RGB, RGBA } from './shapes'

/**
 * The wings of the fairy. Each wing has its panels (the shape), a `base` function
 * that gives the colour of each pixel of the membrane, a list of drawn layers (veins, spots,
 * edges), and the amounts of the four effects of the wing shader. paint.ts makes the
 * pictures; wings.ts puts them on the fairy.
 */
export type Pixel = {
  /** The place in the panel: see shapes.ts. */
  u: number; rho: number
  /** The place in the frame of the wing. */
  x: number; y: number
  /** 0 at the top of the wing pair and 1 at the bottom, for colours that go down the two wings. */
  v: number
  /** The offset from the middle of the panel, as a part of its length. */
  dx: number; dy: number
  /** The index of the panel in the design. */
  panel: number
}
/** The colours of the look of the fairy: the wing colour and its sparkle colour. */
export type Colours = { wing: RGB; sparkle: RGB }
/** The line of a layer. `width` is in the units of the rig. `glitter` and `glow` go to the wing shader. */
type Ink = { colour: RGB; alpha?: number; width: number; glitter?: number; glow?: number; only?: number[] }
export type Layer =
  /** Main veins from the root to the edge, each with twigs to the two sides. */
  | ({ kind: 'veins'; count: number; twigs: number } & Ink)
  /** One middle vein with side veins, as in a leaf. */
  | ({ kind: 'leaf'; twigs: number } & Ink)
  /** Straight rays and bands: the cells of a cartoon wing, a window or a dragonfly. */
  | ({ kind: 'grid'; rays: number; rhos: number[] } & Ink)
  | ({ kind: 'spots'; count: number; size: [number, number]; rho: [number, number]; ring?: boolean } & Ink)
  | ({ kind: 'eye'; u: number; rho: number; size: number; rings: RGB[] } & Ink)
  | ({ kind: 'swirls'; count: number; gem?: RGB } & Ink)
  | ({ kind: 'stars'; count: number; links?: boolean } & Ink)
  /** A spiral at the tip of a panel, outside its outline. */
  | ({ kind: 'curl'; size: number } & Ink)
  | ({ kind: 'edge' } & Ink)
export type Family = 'Glass' | 'Butterfly' | 'Fabric' | 'Nature' | 'Magic'
export type Design = {
  id: string
  name: string
  family: Family
  /** One line for the card. */
  line: string
  /** What the child sees. */
  child: string
  /** A limit or a risk to know before the work starts. */
  limit: string
  /** How the wing uses the wing colour of the menu. */
  colour: 'Wing colour' | 'Own colours'
  panels: Panel[]
  base(pixel: Pixel, colours: Colours): RGBA
  /** The amounts for the shader at a pixel: glitter, glow and iridescence. The default is [0.25, 0, 1]. */
  mask?(pixel: Pixel): [number, number, number]
  layers(colours: Colours): Layer[]
  /** The effects of the shader, each from 0 to 1: the colour shift with the view angle, the sparkles, the own light, and the light that comes through the wing. */
  fx: { irid: number; glitter: number; glow: number; back: number }
}

export const WHITE: RGB = [1, 1, 1], INK: RGB = [0.16, 0.12, 0.22], SILVER: RGB = [0.94, 0.94, 0.98], GOLD: RGB = [0.96, 0.84, 0.48]
export const paint = (colour: RGB, alpha: number): RGBA => [colour[0], colour[1], colour[2], alpha]
export const bump = (value: number, at: number, width: number) => Math.exp(-(((value - at) / width) ** 2))
export const fract = (value: number) => value - Math.floor(value)
/** The part of the colour circle that Rainbow cells shows, in turns: half a rainbow around the wing colour. */
const RAINBOW_SPAN = 0.5
/** The hue of each band of Swirl and gems, in turns from the hue of the wing colour. */
const PASTEL_TURNS: [number, RGB][] = [[0, [-0.1, 0, 0]], [0.25, [0.1, 0, 0]], [0.5, [0, 0, 0]], [0.75, [0.16, 0, 0]], [1, [-0.1, 0, 0]]]
const AUTUMN: [number, RGB][] = [[0, [0.98, 0.82, 0.3]], [0.45, [0.96, 0.55, 0.2]], [0.8, [0.82, 0.25, 0.16]], [1, [0.5, 0.18, 0.12]]]
/** The hue of the curtains of Aurora, in turns from the hue of the wing colour. */
const AURORA_TURNS: [number, RGB][] = [[0, [-0.14, 0, 0]], [0.35, [0, 0, 0]], [0.65, [0.16, 0, 0]], [1, [0.3, 0, 0]]]

/** The twelve wings of the menu, in the order of the menu. The study has eight more (studies/fairy-wing-study/designs.ts). */
export const DESIGNS: Design[] = [
  {
    id: 'dew', name: 'Dew glass', family: 'Glass', colour: 'Wing colour',
    line: 'The Petal shape of today, as clear glass with fine veins.',
    child: 'A clear wing with a soft colour that gets deeper at the edge. Thin veins branch from the back to the edge. The colour shifts a little when the wing moves.',
    limit: 'The quietest of the twenty. It shows the new rendering more than a new shape.',
    panels: [{ from: -6, to: 74, length: 1.6, peak: 0.5, round: 0.8 }, { lower: true, from: -80, to: 4, length: 1.05, peak: 0.5, round: 0.75 }],
    base: ({ rho }, { wing }) => {
      const sheen = bump(rho, 0.55, 0.12) * 0.25
      return paint(mix(mix(tone(wing, 0.05), tone(wing, -0.12, 0.15), rho ** 1.5), WHITE, sheen), 0.2 + 0.26 * rho * rho + sheen * 0.2)
    },
    layers: ({ wing }) => [
      { kind: 'veins', count: 5, twigs: 2, colour: tone(wing, -0.3, 0.1), alpha: 0.75, width: 0.011 },
      { kind: 'edge', colour: tone(wing, -0.24, 0.1), alpha: 0.9, width: 0.02 },
    ],
    fx: { irid: 0.5, glitter: 0.15, glow: 0.15, back: 0.35 },
  },
  {
    id: 'glitter', name: 'Glitter vein', family: 'Glass', colour: 'Wing colour',
    line: 'Tall pointed wings with silver glitter veins and white dots.',
    child: 'The colour is deep at the back and pale at the tips. Silver veins sparkle when she turns. White dots lie between the veins, as on the wings of a costume.',
    limit: 'The glitter needs the new shader. With no glitter, the veins are plain grey lines.',
    panels: [{ from: 20, to: 88, length: 1.9, peak: 0.55, round: 1, tip: 0.1, scallop: [5, 0.05] }, { lower: true, from: -62, to: 6, length: 1.25, peak: 0.42, round: 0.9, tip: 0.08, scallop: [4, 0.06] }],
    base: ({ rho }, { wing }) => paint(ramp([[0, tone(wing, -0.34, 0.3)], [0.45, tone(wing, -0.16, 0.22)], [1, tone(wing, 0.03)]], rho), 0.64 - 0.22 * rho),
    layers: ({ wing }) => [
      { kind: 'spots', count: 30, size: [0.012, 0.03], rho: [0.3, 0.95], colour: WHITE, alpha: 0.9, width: 0, glitter: 0.6 },
      { kind: 'veins', count: 4, twigs: 3, colour: SILVER, alpha: 0.95, width: 0.02, glitter: 1 },
      { kind: 'edge', colour: tone(wing, -0.3, 0.3), width: 0.022 },
    ],
    fx: { irid: 0.2, glitter: 0.7, glow: 0.1, back: 0.4 },
  },
  {
    id: 'leaf', name: 'Leaf glass', family: 'Glass', colour: 'Wing colour',
    line: 'Three leaf-shaped lobes with gold veins and a strong colour shift.',
    child: 'Each side has three lobes with wavy edges. The colour goes from one hue to the next across each lobe. Thin gold veins glow. The colours move like oil on water.',
    limit: 'Three panels for each side: six pictures and six draw calls in place of four.',
    panels: [
      { from: 40, to: 94, length: 1.6, peak: 0.5, round: 0.9, tip: 0.07, scallop: [4, 0.07] },
      { from: -12, to: 52, length: 1.7, peak: 0.5, round: 0.62, scallop: [5, 0.08] },
      { lower: true, from: -72, to: -4, length: 1.15, peak: 0.5, round: 0.7, scallop: [4, 0.1] },
    ],
    base: ({ u, rho }, { wing }) => paint(mix(tone(wing, 0.06), mix(tone(wing, -0.08, 0.2, -0.08), tone(wing, -0.04, 0.2, 0.1), u), smooth(0.1, 0.9, rho)), 0.22 + 0.3 * rho),
    layers: ({ wing }) => [
      { kind: 'veins', count: 7, twigs: 1, colour: GOLD, alpha: 0.5, width: 0.005 },
      { kind: 'leaf', twigs: 5, colour: GOLD, alpha: 0.95, width: 0.009, glow: 0.5 },
      { kind: 'edge', colour: tone(wing, -0.2, 0.25), width: 0.014 },
    ],
    fx: { irid: 0.9, glitter: 0.1, glow: 0.4, back: 0.5 },
  },
  {
    id: 'silk', name: 'Silk pleats', family: 'Fabric', colour: 'Wing colour',
    line: 'Broad fans of sheer cloth with pleats and a scalloped edge.',
    child: 'The wings look like thin cloth. Fine pleats go from the back to the edge, and two rows of scallops go across. Small gold points sparkle near the back.',
    limit: 'The pleats are fine lines. At flight distance they become one soft colour.',
    panels: [{ from: -4, to: 86, length: 1.75, peak: 0.55, round: 0.42, scallop: [6, 0.09] }, { lower: true, from: -86, to: 0, length: 1.3, peak: 0.5, round: 0.45, scallop: [5, 0.1] }],
    base: ({ u, rho }, { wing }) => {
      const pleat = 0.5 + 0.5 * Math.sin(u * Math.PI * 40), tier = Math.max(bump(rho, 0.45, 0.03), bump(rho, 0.72, 0.03))
      return paint(mix(tone(wing, 0.06), tone(wing, -0.3, 0.12), pleat * 0.6 + tier * 0.4), 0.34 + 0.22 * rho + 0.16 * pleat)
    },
    layers: ({ wing }) => [
      { kind: 'grid', rays: 9, rhos: [0.45, 0.72], colour: tone(wing, -0.24, 0.1), alpha: 0.55, width: 0.008 },
      { kind: 'spots', count: 34, size: [0.006, 0.012], rho: [0.2, 0.6], colour: GOLD, width: 0, glitter: 1 },
      { kind: 'edge', colour: tone(wing, -0.22, 0.1), alpha: 0.8, width: 0.016 },
    ],
    fx: { irid: 0.25, glitter: 0.4, glow: 0.1, back: 0.55 },
  },
  {
    id: 'rainbow', name: 'Rainbow cells', family: 'Butterfly', colour: 'Wing colour',
    line: 'Half a rainbow around the wing colour, with dark lines and a curl.',
    child: 'The colours go down the wings as a rainbow. The wing colour of the menu is in the middle, with its neighbour colours above and below it. Dark lines divide each wing into cells, as in a cartoon. Each lower wing ends in a curl.',
    limit: 'It shows half of the rainbow for each wing colour, not all the colours. The curl is outside the outline of the wing.',
    panels: [{ from: 8, to: 80, length: 1.75, peak: 0.6, round: 0.7 }, { lower: true, from: -70, to: 4, length: 1.1, peak: 0.45, round: 0.8, pad: 0.3 }],
    base: ({ u, rho, v }, { wing }) => {
      const cell = Math.sin(Math.PI * fract(u * 4)) * Math.sin(Math.PI * fract(rho * 3))
      return paint(mix(hsl(toHsl(wing)[0] + (v - 0.5) * RAINBOW_SPAN, 0.95, 0.63), WHITE, 0.25 * cell), 0.84)
    },
    layers: ({ wing }) => [
      { kind: 'grid', rays: 4, rhos: [0.34, 0.67], colour: INK, width: 0.018 },
      { kind: 'stars', count: 5, colour: WHITE, width: 0.05, glow: 0.8 },
      { kind: 'curl', size: 0.2, colour: hsl(toHsl(wing)[0] + RAINBOW_SPAN / 2, 0.8, 0.74), width: 0.07, only: [1] },
      { kind: 'edge', colour: INK, width: 0.03 },
    ],
    fx: { irid: 0.15, glitter: 0.35, glow: 0.3, back: 0.6 },
  },
  {
    id: 'swirl', name: 'Swirl and gems', family: 'Butterfly', colour: 'Wing colour',
    line: 'Round pastel wings with swirls and a gem in each swirl.',
    child: 'Soft bands of the wing colour and its neighbour colours go across the round wings. Thin swirls curl on each wing, and each swirl holds a small gem.',
    limit: 'It looks like a toy, which can be good or bad.',
    panels: [{ from: 2, to: 92, length: 1.45, peak: 0.5, round: 0.35 }, { lower: true, from: -88, to: -2, length: 1.1, peak: 0.5, round: 0.38 }],
    base: ({ v, rho }, { wing }) => paint(mix(hsl(toHsl(wing)[0] + ramp(PASTEL_TURNS, v)[0], 0.95, 0.7), WHITE, 0.2 * (1 - rho)), 0.82),
    layers: ({ wing }) => [
      { kind: 'swirls', count: 3, colour: tone(wing, -0.16, 0.2, -0.08), width: 0.014, gem: tone(wing, -0.1, 0.2, 0.14), only: [0] },
      { kind: 'swirls', count: 2, colour: tone(wing, -0.16, 0.2, 0.08), width: 0.014, gem: tone(wing, -0.1, 0.2, 0.14), only: [1] },
      { kind: 'edge', colour: WHITE, alpha: 0.9, width: 0.03 },
    ],
    fx: { irid: 0.1, glitter: 0.3, glow: 0.1, back: 0.6 },
  },
  {
    id: 'monarch', name: 'Monarch', family: 'Butterfly', colour: 'Wing colour',
    line: 'A butterfly wing with a dark border and white dots.',
    child: 'The wing has a strong colour, dark veins and a dark border. White dots lie in the border, as on a monarch butterfly.',
    limit: 'The dark parts hide the body of the fairy more than a clear wing does.',
    panels: [{ from: 0, to: 78, length: 1.7, peak: 0.58, round: 0.5 }, { lower: true, from: -84, to: 2, length: 1.2, peak: 0.5, round: 0.4, scallop: [6, 0.05] }],
    base: ({ rho }, { wing }) => {
      const border = smooth(0.76, 0.84, rho)
      return paint(mix(mix(tone(wing, -0.2, 0.6), tone(wing, -0.34, 0.6), rho), INK, border), 0.72 + 0.2 * border)
    },
    layers: () => [
      { kind: 'veins', count: 6, twigs: 1, colour: INK, width: 0.02 },
      { kind: 'spots', count: 24, size: [0.014, 0.028], rho: [0.87, 0.95], colour: WHITE, width: 0 },
      { kind: 'edge', colour: INK, width: 0.03 },
    ],
    fx: { irid: 0.1, glitter: 0.1, glow: 0, back: 0.5 },
  },
  {
    id: 'swallowtail', name: 'Swallowtail', family: 'Butterfly', colour: 'Wing colour',
    line: 'Pointed wings with dark stripes, a dark border and short tails.',
    child: 'Dark stripes cross the pale wing from the front edge. A dark border with blue dots goes around it. Each lower wing has a short tail.',
    limit: 'A busy pattern. The stripes compete with the hair for the eye of the player.',
    panels: [{ from: 10, to: 78, length: 1.85, peak: 0.62, round: 0.7, tip: 0.08 }, { lower: true, from: -76, to: 0, length: 1, peak: 0.5, round: 0.5, scallop: [5, 0.08], tail: [0.38, 0.5, 0.05] }],
    base: ({ u, rho }, { wing }) => {
      const stripe = smooth(0.55, 0.8, Math.sin(u * Math.PI * 6 + rho * 1.5)) * smooth(0.2, 0.32, rho) * (1 - smooth(0.6, 0.8, rho))
      return paint(mix(tone(wing, -0.04, 0.3), INK, Math.max(stripe, smooth(0.8, 0.86, rho))), 0.82)
    },
    layers: ({ wing }) => [
      { kind: 'veins', count: 6, twigs: 0, colour: INK, alpha: 0.7, width: 0.012 },
      { kind: 'spots', count: 18, size: [0.016, 0.026], rho: [0.89, 0.95], colour: hsl(toHsl(wing)[0] + 0.5, 0.85, 0.7), width: 0, glow: 0.4 },
      { kind: 'edge', colour: INK, width: 0.026 },
    ],
    fx: { irid: 0.15, glitter: 0.1, glow: 0.2, back: 0.5 },
  },
  {
    id: 'frost', name: 'Frost', family: 'Nature', colour: 'Wing colour',
    line: 'Sharp wings of ice with white frost ferns and much glitter.',
    child: 'The edge of each wing has sharp points, like ice. White frost grows from the middle of each wing in the shape of a fern. The wing sparkles like snow in the Sun.',
    limit: 'It fits a cold wing colour. With Peach or Lemon it does not look like ice.',
    panels: [{ from: 18, to: 82, length: 1.85, peak: 0.55, round: 1.1, scallop: [5, 0.16, 'spike'] }, { lower: true, from: -70, to: 0, length: 1.3, peak: 0.45, round: 1, scallop: [4, 0.16, 'spike'] }],
    base: ({ x, y, rho }, { wing }) => {
      const crystal = smooth(0.58, 0.8, noise(x * 9, y * 9))
      return paint(mix(mix(WHITE, tone(wing, -0.08, 0.2), rho * 0.7), WHITE, crystal * 0.6), 0.28 + 0.3 * rho + 0.2 * crystal)
    },
    mask: ({ x, y }) => [0.35 + 0.5 * smooth(0.58, 0.8, noise(x * 9, y * 9)), 0, 1],
    layers: () => [
      { kind: 'veins', count: 6, twigs: 3, colour: WHITE, alpha: 0.7, width: 0.006, glitter: 0.8 },
      { kind: 'leaf', twigs: 7, colour: WHITE, width: 0.013, glitter: 1 },
      { kind: 'stars', count: 4, colour: WHITE, width: 0.06, glow: 0.6 },
      { kind: 'edge', colour: WHITE, width: 0.02, glitter: 1 },
    ],
    fx: { irid: 0.5, glitter: 0.9, glow: 0.3, back: 0.4 },
  },
  {
    id: 'star', name: 'Starlight', family: 'Magic', colour: 'Wing colour',
    line: 'A piece of the night sky, with stars that give light.',
    child: 'The wings are dark blue, like the night sky. Small stars and a few large stars shine on them, with thin lines between the large stars. The edge has the wing colour. In the dark, the stars are bright.',
    limit: 'Dark wings on a dark sky: at night, only the stars and the edge show. That is the idea, but it is a risk.',
    panels: [{ from: 14, to: 84, length: 1.75, peak: 0.55, round: 0.75, tip: 0.08 }, { lower: true, from: -72, to: 4, length: 1.15, peak: 0.45, round: 0.8 }],
    base: ({ u, rho, x, y }, { wing }) => {
      const milky = bump(u + (rho - 0.5) * 0.3, 0.5, 0.14) * (0.2 + 0.5 * noise(x * 6, y * 6))
      return paint(mix(mix([0.1, 0.1, 0.3], tone(wing, -0.5, 0.3), rho * 0.6), [0.75, 0.7, 1], milky * 0.6), 0.8)
    },
    mask: ({ u, rho }) => [0.3, bump(u + (rho - 0.5) * 0.3, 0.5, 0.14) * 0.3, 0.3],
    layers: ({ wing }) => [
      { kind: 'spots', count: 70, size: [0.004, 0.01], rho: [0.12, 0.96], colour: WHITE, width: 0, glow: 0.9, glitter: 1 },
      { kind: 'stars', count: 7, links: true, colour: [1, 0.95, 0.75], width: 0.075, glow: 1 },
      { kind: 'edge', colour: tone(wing, -0.05, 0.2), width: 0.018, glow: 0.7 },
    ],
    fx: { irid: 0.1, glitter: 0.5, glow: 1, back: 0.2 },
  },
  {
    id: 'autumn', name: 'Autumn leaf', family: 'Nature', colour: 'Own colours',
    line: 'A leaf in gold, orange and red, with pointed lobes.',
    child: 'Each wing is a leaf of autumn with pointed lobes. It is gold near the back and red at the edge. A dark middle vein has side veins. The Sun shines through it.',
    limit: 'It does not use the wing colour of the menu. It looks like Earth, not like Blossom Haven.',
    panels: [{ from: 10, to: 82, length: 1.75, peak: 0.5, round: 0.5, scallop: [5, 0.3, 'spike'] }, { lower: true, from: -76, to: 0, length: 1.15, peak: 0.5, round: 0.5, scallop: [3, 0.3, 'spike'] }],
    base: ({ x, y, rho }) => paint(ramp(AUTUMN, rho * 0.75 + noise(x * 3 + 7, y * 3) * 0.4), 0.88),
    layers: () => [
      { kind: 'leaf', twigs: 5, colour: [0.36, 0.15, 0.1], width: 0.016 },
      { kind: 'edge', colour: [0.4, 0.16, 0.1], width: 0.02 },
    ],
    fx: { irid: 0, glitter: 0.05, glow: 0, back: 0.8 },
  },
  {
    id: 'aurora', name: 'Aurora', family: 'Magic', colour: 'Wing colour',
    line: 'Tall wings of light in the wing colour and its neighbour colours, with no solid edge.',
    child: 'The wings are curtains of light, as the lights of the north. The wing colour is in the middle of each curtain, with its neighbour colours at the sides. They have no line at the edge; the light fades. Small stars lie in them. At night they are the brightest wings.',
    limit: 'Pale in the day. With no line at the edge, the shape is soft at flight distance.',
    panels: [{ from: 28, to: 92, length: 2, peak: 0.5, round: 0.7, scallop: [3, 0.08] }, { lower: true, from: -60, to: 14, length: 1.45, peak: 0.4, round: 0.8, tail: [0.3, 0.3, 0.1] }],
    base: ({ u, rho, x, y, panel }, { wing }) => {
      const wave = u + 0.08 * Math.sin(rho * 7 + panel), streak = 0.5 + 0.5 * Math.sin(wave * 40 + noise(x * 3, y * 3) * 4)
      return paint(hsl(toHsl(wing)[0] + ramp(AURORA_TURNS, wave)[0], 0.9, 0.56), (0.2 + 0.6 * streak) * (0.4 + 0.6 * rho) * (1 - smooth(0.8, 1, rho)))
    },
    mask: ({ u, rho, x, y, panel }) => [0.3, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((u + 0.08 * Math.sin(rho * 7 + panel)) * 40 + noise(x * 3, y * 3) * 4)), 0.5],
    layers: () => [{ kind: 'spots', count: 26, size: [0.005, 0.012], rho: [0.2, 0.9], colour: WHITE, width: 0, glow: 1, glitter: 1 }],
    fx: { irid: 0.3, glitter: 0.3, glow: 1, back: 0.3 },
  },
]

export const designById = (id: string) => DESIGNS.find(design => design.id === id)
