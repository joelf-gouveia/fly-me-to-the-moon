import type { Feature } from '../lab'
import { searchStars } from './f1-search-stars'
import { spokenFacts } from './f2-spoken-facts'
import { creatureHello } from './f3-creature-hello'
import { postcard } from './f5-postcard'
import { worldSongs } from './f6-world-songs'
import { controller } from './f7-controller'
import { comets } from './f8-comets'
import { bedtime } from './f9-bedtime'
import { installOffline } from './f10-install'
import { sparkleRings } from './f4-rings'

/** The ten features of the study, in the order of the page. */
export const FEATURES: Record<string, Feature> = {
  F1: searchStars,
  F2: spokenFacts,
  F3: creatureHello,
  F4: sparkleRings,
  F5: postcard,
  F6: worldSongs,
  F7: controller,
  F8: comets,
  F9: bedtime,
  F10: installOffline,
}
