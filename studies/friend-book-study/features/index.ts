import type { Feature } from '../../feature-ideas-study/lab'
import { bookInWorlds } from './a-book-in-worlds'
import { bookByFairy } from './b-book-by-fairy'
import { chooseInFlight } from './c-choose-in-flight'
import { gift } from './g-gift'
import { phone } from './p-phone'

/** The clips of the friend book study, in the order of the page. Each one runs in the lab of the feature ideas study. */
export const FEATURES: Record<string, Feature> = {
  A: bookInWorlds,
  B: bookByFairy,
  C: chooseInFlight,
  G: gift,
  P: phone,
}
