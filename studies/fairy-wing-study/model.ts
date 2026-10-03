import { DESIGNS, numberOf } from './designs'
import type { Levers } from '../../src/fairy-wings/wings'

/**
 * The text of the fairy wing study: the three wings of the game of before, the levers of the
 * new rendering, the findings in the game of before, and the decisions. The page (main.ts)
 * shows them. The twenty wings are in designs.ts.
 */
export const BEFORE_OPTIONS = [
  { id: 'B1', name: 'Petal', line: 'Two leaf shapes for each side. The only wing with a vein.' },
  { id: 'B2', name: 'Luna', line: 'A tall upper wing and a narrow lower wing.' },
  { id: 'B3', name: 'Flutter', line: 'A short, round upper wing and a round lower wing.' },
] as const

/** The wings that started from a picture of Joel, with the number of the picture. */
export const FROM_PICTURE: Record<string, number> = { glitter: 1, leaf: 2, silk: 3, rainbow: 4, swirl: 5 }

/** The wings that Joel selected on 3 October 2026, now in the game: four rows of three in the menu. Autumn leaf has fixed colours; each other wing takes the wing colour of the menu. */
export const SELECTED = ['dew', 'glitter', 'leaf', 'silk', 'rainbow', 'swirl', 'monarch', 'swallowtail', 'frost', 'star', 'autumn', 'aurora']

export const LEVERS: { id: keyof Levers; name: string; text: string }[] = [
  { id: 'paint', name: 'Painted membrane', text: 'Each wing gets a picture: the colour changes from the back to the edge, and each part has its own transparency. The outline is in the picture, so a wing can have scallops, points, tails and soft edges. The wing colour of the menu becomes deeper, so it does not go white in the Sun.' },
  { id: 'lines', name: 'Veins, spots and edges', text: 'Veins, cells, dots, eyes, stars and the edge line are drawn in the picture, with a real width. They follow the shape of each wing.' },
  { id: 'irid', name: 'Colour shift', text: 'The colour of the membrane shifts with the view angle, as on a soap bubble or the wing of a dragonfly. It moves at each wing beat.' },
  { id: 'glitter', name: 'Glitter', text: 'Small points flash and go out when the wing or the camera moves. A wing says where it has glitter: on the veins, on the dots or on all of it.' },
  { id: 'glow', name: 'Light through the wing', text: 'The Sun shines through the wing, so the side away from the Sun is not grey. Some wings also give their own light, which shows at night.' },
  { id: 'flex', name: 'Soft wing beat', text: 'The tip of the wing follows the root a moment later, so the wing bends in each beat. Today the wing turns as a stiff plate.' },
]

export const FINDINGS: [string, string][] = [
  ['One flat colour', 'All the wings use one <code>MeshStandardMaterial</code> with an opacity of 0.57 and no picture (<code>src/fairy.ts:93</code>). Each wing has one colour from the back to the edge.'],
  ['The outline is 1 pixel wide', 'The edge is a <code>LineLoop</code> (<code>src/fairy.ts:97</code>, <code>:130</code>). WebGL draws each line 1 pixel wide. On a phone with small pixels, the edge almost goes away.'],
  ['One vein, on one wing', 'Petal has one vein for each panel (<code>src/fairy.ts:131</code>). Luna and Flutter have no vein and no pattern.'],
  ['Three shapes that look the same in flight', 'Each of the three wings is two smooth lobes. In flight, a wing is about 150 pixels tall in a window of 900 pixels. At that size the three outlines are hard to tell apart.'],
  ['The colours go white', 'The ten wing colours of the menu are pale. With an opacity of 0.57 and the Sun of the game, each colour is almost white on the sky. The picture of Petal below has the colour Dewdrop.'],
  ['No answer to the light', 'The wing has an own light of 12% of its colour (<code>src/fairy.ts:154</code>). It does not change with the view angle, it has no sparkle, and at night it is grey.'],
  ['A stiff wing', 'The geometry has points only on the outline (<code>src/fairy.ts:127</code>). The wing turns on its pivot as one plate (<code>src/fairy.ts:187</code>).'],
  ['The menu shows three small shapes', 'The buttons of the menu draw the wings with CSS (<code>src/style.css:336</code>). Each new wing needs a new CSS shape. A small picture of the real wing is a better button.'],
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  {
    id: 'wings', title: 'Which wings go in the game?', multi: true,
    why: `Select each wing that you want in the menu. On 3 October 2026 you selected twelve: ${SELECTED.map(id => DESIGNS.find(design => design.id === id)!.name).join(', ')}.`,
    options: DESIGNS.map(design => `${numberOf(design.id)} ${design.name}`),
  },
  {
    id: 'today', title: 'The three wings of before',
    why: 'On 3 October 2026 you removed Petal, Luna and Flutter from the menu. A saved look with one of them gets Dew glass, Glitter vein or Swirl and gems.',
    options: ['They are gone from the menu, and the saved looks get a new wing (done)', 'Bring the three shapes back, with the new rendering'],
  },
  {
    id: 'levers', title: 'Which parts of the new rendering?', multi: true,
    why: 'Each part works alone. The study recommends all six. The switches of the live view show each one.',
    options: LEVERS.map(lever => lever.name),
  },
  {
    id: 'colour', title: 'How the wing colour works',
    why: `${DESIGNS.filter(design => design.colour === 'Wing colour').length} wings take the wing colour of the menu. These wings have their own colours: ${DESIGNS.filter(design => design.colour === 'Own colours').map(design => design.name).join(', ')}.`,
    options: ['Each wing uses the wing colour where it can; the others ignore it (recommended)', 'Only wings that use the wing colour go in the game', 'Each wing has fixed colours; remove the wing colour from the menu'],
  },
  {
    id: 'count', title: 'How many wings in the menu?',
    why: 'The menu shows three buttons in a row. The hair has nine styles in three rows.',
    options: ['Nine (three rows, as the hair)', 'Twelve: each selected wing, in four full rows (done)', 'Fifteen (five rows): the twelve selected wings and the three wings of today'],
  },
  {
    id: 'night', title: 'Wings that give light at night',
    why: 'Moon moth, Starlight and Aurora give their own light. On Blossom Haven, the magic world, each wing can give light.',
    options: ['Only the wings with their own light (recommended)', 'Each wing gives light on Blossom Haven', 'No wing gives light'],
  },
]
