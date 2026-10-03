import { DESIGNS as GAME_DESIGNS, bump, fract, GOLD, INK, paint, WHITE } from '../../src/fairy-wings/designs'
import type { Design } from '../../src/fairy-wings/designs'
import { hash, hsl, mix, noise, ramp, smooth, toHsl, tone } from '../../src/fairy-wings/shapes'

/**
 * The twenty wings of the study, in the order of the study. Twelve are in the game
 * (src/fairy-wings/designs.ts). The eight wings of this file stay in the study.
 */
const WINDOW_BANDS = [0.35, 0.62, 0.84], FEATHER_TIERS = [0, 0.38, 0.68, 1], FEATHER_COUNTS = [5, 8, 11]

const STUDY_DESIGNS: Design[] = [
  {
    id: 'peacock', name: 'Peacock eye', family: 'Butterfly', colour: 'Wing colour',
    line: 'Round wings with one large eye on each.',
    child: 'Each wing has a large round eye with rings of dark, light and blue. The eyes look out at the player from the back of the fairy.',
    limit: 'Four eyes on her back can look strange to a small child. Test it with a child.',
    panels: [{ from: 0, to: 84, length: 1.55, peak: 0.5, round: 0.4 }, { lower: true, from: -84, to: 0, length: 1.15, peak: 0.5, round: 0.4 }],
    base: ({ rho }, { wing }) => paint(mix(tone(wing, -0.1, 0.3), tone(wing, -0.34, 0.35), rho ** 1.3), 0.74),
    layers: ({ wing }) => [
      { kind: 'veins', count: 5, twigs: 0, colour: tone(wing, -0.42, 0.2), alpha: 0.7, width: 0.01 },
      { kind: 'eye', u: 0.52, rho: 0.66, size: 0.21, rings: [INK, tone(wing, 0.06), hsl(0.6, 0.8, 0.55), WHITE], colour: INK, width: 0, only: [0] },
      { kind: 'eye', u: 0.5, rho: 0.64, size: 0.14, rings: [INK, tone(wing, 0.06), hsl(0.6, 0.8, 0.55), WHITE], colour: INK, width: 0, only: [1] },
      { kind: 'edge', colour: tone(wing, -0.45, 0.2), width: 0.024 },
    ],
    fx: { irid: 0.5, glitter: 0.15, glow: 0.1, back: 0.45 },
  },
  {
    id: 'dragonfly', name: 'Dragonfly', family: 'Glass', colour: 'Wing colour',
    line: 'Four long narrow wings, almost clear, with a net of small cells.',
    child: 'The wings are long and thin, like the wings of a dragonfly. A net of fine lines covers them. They are almost clear, and they flash with colour when they move.',
    limit: 'The thinnest shape. At flight distance the wings are four pale lines.',
    panels: [{ from: 12, to: 46, length: 2, peak: 0.5, round: 0.55 }, { lower: true, from: -30, to: 4, length: 1.75, peak: 0.5, round: 0.55 }],
    base: ({ u, rho }, { wing }) => {
      const mark = smooth(0.8, 0.83, rho) * (1 - smooth(0.92, 0.95, rho)) * smooth(0.62, 0.66, u) * (1 - smooth(0.86, 0.9, u))
      return paint(mix(tone(wing, 0.04), tone(wing, -0.5, 0.2), mark), 0.1 + 0.2 * rho ** 3 + 0.65 * mark)
    },
    layers: ({ wing }) => [
      { kind: 'grid', rays: 5, rhos: Array.from({ length: 15 }, (_, index) => 0.1 + index * 0.06), colour: tone(wing, -0.4, 0.15), alpha: 0.8, width: 0.006 },
      { kind: 'edge', colour: tone(wing, -0.4, 0.15), width: 0.014 },
    ],
    fx: { irid: 1, glitter: 0.05, glow: 0.15, back: 0.4 },
  },
  {
    id: 'moth', name: 'Moon moth', family: 'Butterfly', colour: 'Wing colour',
    line: 'Pale wings with long tails that glow at night.',
    child: 'The wings are pale and soft, with a small eye on each. Each lower wing has a long tail that streams behind her. At night the wings give a soft light.',
    limit: 'The tails are long. They can go through the hair or the skirt in a turn.',
    panels: [{ from: 22, to: 86, length: 1.75, peak: 0.5, round: 0.6 }, { lower: true, from: -82, to: -22, length: 0.8, peak: 0.4, round: 0.6, tail: [0.42, 0.95, 0.05] }],
    base: ({ rho }, { wing }) => paint(mix(WHITE, tone(wing, -0.05, 0.12), smooth(0.15, 1, rho)), 0.52 + 0.15 * rho),
    mask: () => [0.2, 0.45, 1],
    layers: ({ wing }) => [
      { kind: 'veins', count: 6, twigs: 1, colour: tone(wing, -0.22, 0.1), alpha: 0.5, width: 0.008 },
      { kind: 'eye', u: 0.5, rho: 0.6, size: 0.085, rings: [tone(wing, -0.5, 0.2), [1, 0.96, 0.8], tone(wing, -0.2, 0.3, 0.45)], colour: INK, width: 0, only: [0] },
      { kind: 'edge', colour: tone(wing, -0.12, 0, 0.42), alpha: 0.75, width: 0.018 },
    ],
    fx: { irid: 0.2, glitter: 0.1, glow: 0.7, back: 0.7 },
  },
  {
    id: 'window', name: 'Stained glass', family: 'Magic', colour: 'Wing colour',
    line: 'Panes of coloured glass between dark lines, with light that comes through.',
    child: 'Dark lines divide the wing into panes, as in a church window. Each pane has its own colour near the wing colour. The panes shine when the Sun is behind her.',
    limit: 'The panes need the light through the wing. With no such light, the wing looks heavy.',
    panels: [{ from: 4, to: 80, length: 1.7, peak: 0.55, round: 0.55, tip: 0.05 }, { lower: true, from: -78, to: 2, length: 1.15, peak: 0.5, round: 0.55 }],
    base: ({ u, rho, panel }, { wing }) => {
      const row = WINDOW_BANDS.filter(band => rho > band).length
      const hue = toHsl(wing)[0] + (hash(Math.floor(u * 5) * 3 + panel * 17, row) - 0.5) * 0.45
      return paint(mix(hsl(hue, 0.75, 0.64), WHITE, 0.28 * Math.sin(Math.PI * fract(u * 5))), 0.8)
    },
    mask: () => [0.1, 0.4, 0.3],
    layers: () => [
      { kind: 'grid', rays: 5, rhos: WINDOW_BANDS, colour: INK, width: 0.024 },
      { kind: 'edge', colour: INK, width: 0.034 },
    ],
    fx: { irid: 0.1, glitter: 0.05, glow: 0.5, back: 0.9 },
  },
  {
    id: 'blossom', name: 'Petal bloom', family: 'Nature', colour: 'Wing colour',
    line: 'Four flower petals for each side, white in the middle.',
    child: 'Each wing is a petal of a flower, with a small notch at its tip. The petal is white in the middle and has the wing colour at its edge. Gold points lie near the back, like the heart of a flower.',
    limit: 'Four panels for each side: eight pictures and eight draw calls.',
    panels: [
      { from: 50, to: 104, length: 1.35, peak: 0.5, round: 0.45, tip: -0.1 },
      { from: 4, to: 58, length: 1.5, peak: 0.5, round: 0.45, tip: -0.1 },
      { lower: true, from: -42, to: 12, length: 1.3, peak: 0.5, round: 0.45, tip: -0.1 },
      { lower: true, from: -90, to: -36, length: 1.05, peak: 0.5, round: 0.45, tip: -0.1 },
    ],
    base: ({ rho }, { wing }) => paint(ramp([[0, [1, 0.85, 0.55]], [0.16, tone(wing, -0.22, 0.4)], [0.42, WHITE], [1, tone(wing, -0.08, 0.3)]], rho), 0.76),
    layers: ({ wing }) => [
      { kind: 'leaf', twigs: 4, colour: tone(wing, -0.2, 0.25), alpha: 0.45, width: 0.008 },
      { kind: 'spots', count: 9, size: [0.01, 0.018], rho: [0.12, 0.3], colour: GOLD, width: 0, glitter: 1 },
      { kind: 'edge', colour: tone(wing, -0.18, 0.3), alpha: 0.8, width: 0.016 },
    ],
    fx: { irid: 0.15, glitter: 0.15, glow: 0.15, back: 0.7 },
  },
  {
    id: 'feather', name: 'Feather', family: 'Fabric', colour: 'Wing colour',
    line: 'White wings of three rows of feathers, with a pearl shine.',
    child: 'Three rows of feathers make each wing, small feathers near the back and long feathers at the edge. The feathers are white, with the wing colour in their shadows.',
    limit: 'Not clear: the most solid wing of the twenty. It hides what is behind it.',
    panels: [{ from: 20, to: 88, length: 1.9, peak: 0.6, round: 0.6, scallop: [11, 0.1] }, { lower: true, from: -50, to: 30, length: 1.1, peak: 0.4, round: 0.5, scallop: [11, 0.1] }],
    base: ({ u, rho }, { wing }) => {
      const tier = rho < FEATHER_TIERS[1] ? 0 : rho < FEATHER_TIERS[2] ? 1 : 2
      const along = (rho - FEATHER_TIERS[tier]) / (FEATHER_TIERS[tier + 1] - FEATHER_TIERS[tier]), across = fract(u * FEATHER_COUNTS[tier] + tier * 0.5)
      const border = 1 - smooth(0, 0.3, Math.min(across, 1 - across) * 2), barbs = 0.5 + 0.5 * Math.sin((across - 0.5) * 60 + along * 26)
      return paint(mix(WHITE, tone(wing, -0.22, 0.12), border * 0.55 + (1 - smooth(0, 0.22, along)) * 0.4 + barbs * 0.08), 0.94)
    },
    mask: () => [0.15, 0.15, 0.6],
    layers: ({ wing }) => [{ kind: 'edge', colour: tone(wing, -0.2, 0.12), alpha: 0.8, width: 0.014 }],
    fx: { irid: 0.35, glitter: 0.15, glow: 0.2, back: 0.3 },
  },
  {
    id: 'bubble', name: 'Soap bubble', family: 'Magic', colour: 'Own colours',
    line: 'Round wings as clear as a soap bubble, with moving colours.',
    child: 'The wings are almost not there: a thin white rim and a film of colours that move, as on a soap bubble. A few small bubbles sit on each wing.',
    limit: 'Almost invisible on a bright sky. It does not use the wing colour of the menu.',
    panels: [{ from: 0, to: 90, length: 1.5, peak: 0.5, round: 0.3 }, { lower: true, from: -90, to: 0, length: 1.1, peak: 0.5, round: 0.3 }],
    base: ({ u, rho, x, y, dx, dy }) => {
      const rim = smooth(0.86, 1, rho), shine = bump(Math.hypot(dx + 0.16, dy - 0.2), 0, 0.12)
      return paint(mix(hsl(rho * 1.3 + u * 0.7 + noise(x * 2, y * 2) * 0.6, 0.85, 0.72), WHITE, Math.max(rim * 0.5, shine)), 0.12 + 0.32 * rim + 0.5 * shine)
    },
    layers: () => [
      { kind: 'spots', count: 6, size: [0.03, 0.07], rho: [0.3, 0.8], ring: true, colour: WHITE, alpha: 0.8, width: 0.008 },
      { kind: 'edge', colour: WHITE, alpha: 0.9, width: 0.014, glow: 0.3 },
    ],
    fx: { irid: 1, glitter: 0, glow: 0.2, back: 0.3 },
  },
  {
    id: 'candy', name: 'Candy swirl', family: 'Magic', colour: 'Wing colour',
    line: 'Round wings with the spiral stripes of a lollipop and sugar glitter.',
    child: 'Each wing is a lollipop from Blossom Haven: white and the wing colour turn in a spiral. A thick white edge goes around it, and sugar sparkles on it.',
    limit: 'A strong pattern on four wings. It fits Blossom Haven more than Earth.',
    panels: [{ from: 2, to: 88, length: 1.5, peak: 0.5, round: 0.33 }, { lower: true, from: -86, to: -2, length: 1.1, peak: 0.5, round: 0.36 }],
    base: ({ dx, dy }, { wing }) => paint(mix(WHITE, tone(wing, -0.26, 0.6), smooth(-0.15, 0.15, Math.sin(5 * Math.atan2(dy, dx) + Math.hypot(dx, dy) * 9))), 0.88),
    mask: () => [0.55, 0, 0.4],
    layers: () => [
      { kind: 'spots', count: 40, size: [0.005, 0.011], rho: [0.15, 0.95], colour: WHITE, width: 0, glitter: 1 },
      { kind: 'edge', colour: WHITE, width: 0.036 },
    ],
    fx: { irid: 0.15, glitter: 0.7, glow: 0.1, back: 0.5 },
  },
]

const ORDER = ['dew', 'glitter', 'leaf', 'silk', 'rainbow', 'swirl', 'monarch', 'peacock', 'dragonfly', 'moth', 'swallowtail', 'window', 'frost', 'star', 'blossom', 'autumn', 'feather', 'bubble', 'candy', 'aurora']
export const DESIGNS: Design[] = ORDER.map(id => [...GAME_DESIGNS, ...STUDY_DESIGNS].find(design => design.id === id)!)
export const designById = (id: string) => DESIGNS.find(design => design.id === id)
/** The number of a design on the page: 01 to 20. */
export const numberOf = (id: string) => String(ORDER.indexOf(id) + 1).padStart(2, '0')
