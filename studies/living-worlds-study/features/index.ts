import type { Feature } from '../../feature-ideas-study/lab'
import { giantClip } from './giants'
import { FLOATERS, MARS, MOON, VENUS } from './worlds'

/**
 * The clips of the living worlds study, in the order of the page. Each one runs in the lab of the
 * feature ideas study. T, A, B and C fly the same route on Jupiter. V, M, N and L show option B on
 * Venus, Mars, Neptune and the Moon; each has a "today" clip on the same route for the pictures.
 */
export const FEATURES: Record<string, Feature> = {
  T: giantClip('T', 'jupiter', 'today', 'Today · Jupiter'),
  A: giantClip('A', 'jupiter', 'A', 'Option A · the clouds of Jupiter in their bands'),
  B: giantClip('B', 'jupiter', 'B', 'Option B · the weather of Jupiter: the Great Red Spot and lightning'),
  C: FLOATERS,
  V: VENUS.B,
  M: MARS.B,
  N: giantClip('N', 'neptune', 'B', 'Option B · Neptune: high streaks, their shadows and a dark spot'),
  L: MOON.B,
  'V-today': VENUS.today,
  'V-A': VENUS.A,
  'M-today': MARS.today,
  'M-A': MARS.A,
  'N-today': giantClip('N-today', 'neptune', 'today', 'Today · Neptune'),
  'N-A': giantClip('N-A', 'neptune', 'A', 'Option A · Neptune: high streaks and their shadows'),
  'L-today': MOON.today,
  'S-today': giantClip('S-today', 'saturn', 'today', 'Today · Saturn'),
  'S-A': giantClip('S-A', 'saturn', 'A', 'Option A · Saturn: soft bands under a haze'),
  'S-B': giantClip('S-B', 'saturn', 'B', 'Option B · Saturn: storm towers with lightning in storm alley'),
  'U-today': giantClip('U-today', 'uranus', 'today', 'Today · Uranus'),
  'U-A': giantClip('U-A', 'uranus', 'A', 'Option A · Uranus: a pale haze and a few bright clouds'),
}
