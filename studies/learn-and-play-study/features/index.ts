import type { Feature } from '../../feature-ideas-study/lab'
import { animalBook } from './f11-animal-book'
import { countRings } from './f12-count-rings'
import { sizeLineup } from './f13-size-lineup'
import { moonDiary } from './f14-moon-diary'
import { natureStamps } from './f15-nature-stamps'
import { thermometer } from './f16-thermometer'
import { cottageGarden } from './f17-cottage-garden'
import { looksToEarn } from './f18-looks-to-earn'
import { fairyFriend } from './f19-fairy-friend'
import { postcardAlbum } from './f20-postcard-album'

/** The ten features of the study, in the order of the page. Each one runs in the lab of the feature ideas study. */
export const FEATURES: Record<string, Feature> = {
  F11: animalBook,
  F12: countRings,
  F13: sizeLineup,
  F14: moonDiary,
  F15: natureStamps,
  F16: thermometer,
  F17: cottageGarden,
  F18: looksToEarn,
  F19: fairyFriend,
  F20: postcardAlbum,
}
