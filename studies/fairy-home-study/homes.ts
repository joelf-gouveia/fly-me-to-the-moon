import { HOME_PRESETS, OPTIONS, PART_IDS, TODAY } from './parts'
import type { HomeLook, PartId } from './parts'

/**
 * Eight fairy homes of stories, gardens and games, each made from the parts of parts.ts. The page
 * shows them in "How fairy homes look", and the clip G shows them one after another. Each home
 * says where its idea comes from: this is the study of the look, not a list of sources to copy.
 * The looks are HOME_PRESETS of src/home.ts: the Surprise button of the game picks from them.
 */
export type Home = { id: string; name: string; look: HomeLook; from: string; parts: string }

export const HOMES: Home[] = [
  {
    id: 'flower', name: 'Flower cottage', look: HOME_PRESETS.flower,
    from: 'Fairies that live in and under flowers, as in the Flower Fairies books of Cicely Mary Barker. This is the cottage of the game today.',
    parts: 'Petal crown, flower cottage walls, round door, flower ring',
  },
  {
    id: 'toadstool', name: 'Toadstool house', look: HOME_PRESETS.toadstool,
    from: 'The red cap with white spots of the fly agaric: the best-known fairy house of picture books. The ring of mushrooms is the "fairy ring" of the old stories.',
    parts: 'Toadstool, flower cottage walls, plank arch, fairy ring',
  },
  {
    id: 'stump', name: 'Tree stump house', look: HOME_PRESETS.stump,
    from: 'Homes in hollow trees and roots, as in Brambly Hedge and the garden fairy houses made from old logs.',
    parts: 'Leaf thatch, tree stump, plank arch, path and fence',
  },
  {
    id: 'teapot', name: 'Teapot house', look: HOME_PRESETS.teapot,
    from: 'Garden fairy houses made from old teapots and kettles, and the tea party of Alice in Wonderland. The acorn cap is the lid.',
    parts: 'Acorn cap, teapot, star door, lantern garden',
  },
  {
    id: 'pumpkin', name: 'Pumpkin house', look: HOME_PRESETS.pumpkin,
    from: 'The pumpkin coach of Cinderella, and the gourd houses of gardens.',
    parts: 'Leaf thatch, pumpkin, round door, path and fence',
  },
  {
    id: 'tower', name: 'Star tower', look: HOME_PRESETS.tower,
    from: 'The towers of fairy tales, as the tower of Rapunzel, with the pointed hat of the story wizard.',
    parts: 'Star spire, pebble tower, star door, lantern garden',
  },
  {
    id: 'hive', name: 'Honey hive', look: HOME_PRESETS.hive,
    from: 'The woven straw hives (skeps) of old gardens, and the bee fairies of flower stories.',
    parts: 'Petal crown, honey hive, round door, flower ring',
  },
  {
    id: 'candy', name: 'Candy house', look: HOME_PRESETS.candy,
    from: 'The gingerbread house of Hansel and Gretel. Blossom Haven is a candy planet: its trees are candy, and its rivers are soda.',
    parts: 'Frosting swirl, flower cottage walls, heart door, candy garden',
  },
]

/**
 * The picture sheet: one look for each option of each part, in the order of PART_IDS and of the
 * options. The other parts are the parts of today, so only the option changes. The clip P makes
 * one picture of each (P-0.jpg to P-22.jpg); the build panel uses them as its pictures.
 */
export const SHEET: { part: PartId; option: string; look: HomeLook }[] = PART_IDS.flatMap(part => OPTIONS[part].map(option => ({
  part, option: option.id as string,
  look: { ...structuredClone(TODAY), [part]: option.id, colors: { ...TODAY.colors, [part]: option.color } } as HomeLook,
})))
