import type { Feature } from '../../feature-ideas-study/lab'
import { acrossBelts, havenGardens, lanternTime, savannaHerd, seaAndShore } from './clips'

/** The clips of the animals study, in the order of the page. Each one runs in the lab of the feature ideas study. */
export const FEATURES: Record<string, Feature> = {
  A: acrossBelts('A'),
  B: acrossBelts('B'),
  C: acrossBelts('C'),
  S: savannaHerd,
  W: seaAndShore,
  H: havenGardens,
  L: lanternTime,
}
