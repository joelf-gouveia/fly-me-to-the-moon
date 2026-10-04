/**
 * The text and the numbers of the fairy trail study: the trail of the game of today, the fifteen
 * options, the findings and the decisions. The page (main.ts) shows them. The drawing of each
 * option is in trails.ts.
 */
import { CAP, emitCount, inherit } from '../../src/fairy-trail'

// ---- The numbers of the game of today (src/main.ts) -------------------------------------------
/** The game adds one point to the trail on each frame, and shows the newest 72 points. */
export const TODAY = { points: 72, bonusPoints: 144, size: 0.2, jitter: 0.34, boostPoints: 3 } as const
/** The spin of each world of the clips, and the orbit of each world around the Sun, in seconds. */
export const SPIN_SECONDS = { earth: 240, fairy: 300 } as const
export const ORBIT_SECONDS = 3600

/** The speed of a point on a circle of `radius` metres that turns one time in `seconds`. */
export function circleSpeed(radius: number, seconds: number) { return Math.PI * 2 * radius / seconds }

/** The length of the trail of today in metres. It changes with the frames in each second. */
export function todayLength(speed: number, fps: number, boost = false) {
  return TODAY.points / (fps * (boost ? TODAY.boostPoints : 1)) * speed
}

/** The distance between two points of the trail of today, in metres. */
export function todayGap(speed: number, fps: number) { return speed / fps }

/**
 * The angle between the trail of today and the flight path, in degrees. The world carries the
 * fairy at `carry` metres in each second, across her path in the worst condition. The points
 * of the trail stay behind in space.
 */
export function todayAngle(speed: number, carry: number) { return Math.atan2(carry, speed) * 180 / Math.PI }

// ---- The rules of the new trails ---------------------------------------------------------------
// The game has the rules now (src/fairy-trail.ts).
export { CAP, emitCount, inherit }

/** The length of a new trail in metres: the same at each frame rate, and it has a limit. */
export function trailLength(speed: number, life: number, cap = CAP) { return life * Math.min(speed, cap) }

// ---- The flight of each clip -------------------------------------------------------------------
export type Phase = { until: number; label: string; yaw: number; boost: boolean; hover: boolean; bonus: boolean }
/** The same flight in each clip: 14 s. */
export const TOUR: Phase[] = [
  { until: 2.5, label: 'Cruise', yaw: 0, boost: false, hover: false, bonus: false },
  { until: 4.5, label: 'Turn', yaw: 1, boost: false, hover: false, bonus: false },
  { until: 6.5, label: 'Turn', yaw: -1, boost: false, hover: false, bonus: false },
  { until: 9, label: 'Boost', yaw: 0, boost: true, hover: false, bonus: false },
  { until: 11.5, label: 'Hover', yaw: 0, boost: false, hover: true, bonus: false },
  { until: 14, label: 'After a sparkle ring', yaw: 0, boost: false, hover: false, bonus: true },
]
export const TOUR_SECONDS = TOUR[TOUR.length - 1].until
export function phaseAt(t: number) { return TOUR.find(phase => t < phase.until) ?? TOUR[TOUR.length - 1] }
/** The start of a phase of the flight, by its label. */
export function startOf(label: string) {
  const index = TOUR.findIndex(phase => phase.label === label)
  return index > 0 ? TOUR[index - 1].until : 0
}

// ---- The options -------------------------------------------------------------------------------
export type Option = {
  id: string
  name: string
  family: 'No trail' | 'Dots' | 'Sparkles' | 'Ribbon' | 'On the fairy' | 'Magic'
  /** What holds the points: the world below her, the fairy, or space (today). */
  frame: 'The world' | 'The fairy' | 'Space' | 'None'
  line: string
  child: string
  limit: string
  /** The time of the picture in the clip. The default is in the second turn. */
  still?: number
  /** The world of the clip. The default is Earth. */
  world?: 'fairy'
}

export const BEFORE: Option = {
  id: 'today', name: 'The trail of today', family: 'Dots', frame: 'Space',
  line: '72 soft dots, one for each frame, that stay in space.',
  child: 'A line of round dots of one size. The line goes off to one side, because the world moves below it. In a hover the dots move away as one group.',
  limit: 'See the findings in section 02.',
}

export const OPTIONS: Option[] = [
  {
    id: 'none', name: 'No trail', family: 'No trail', frame: 'None',
    line: 'Remove the trail. The glitter of the wings stays.',
    child: 'The fairy and her wings, and no trail. The view is clean.',
    limit: 'A sparkle ring and a comet tail have no trail to make longer. They need a different reward, for example a flash on the wings.',
    still: 7.6,
  },
  {
    id: 'fixed', name: 'Today, repaired', family: 'Dots', frame: 'The world',
    line: 'The same dots, with the three rules: they stay behind her, and they fade.',
    child: 'The same round dots as today. They stay in a line behind her at each speed and each frame rate. The oldest dots fade.',
    limit: 'The smallest change. It is not more sparkly: the dots have one size and no twinkle.',
  },
  {
    id: 'pixie', name: 'Pixie dust', family: 'Sparkles', frame: 'The world',
    line: 'Fine dust that twinkles and falls slowly.',
    child: 'A cloud of small points of light. Each one flashes, becomes smaller and falls slowly to the ground. One point in four is a small star.',
    limit: '520 points at most. In a hover a little dust continues to fall from her.',
  },
  {
    id: 'glints', name: 'Star glints', family: 'Sparkles', frame: 'The world',
    line: 'A few large four-point stars that flash.',
    child: 'About 25 stars behind her. Each star flashes on and off and turns slowly.',
    limit: 'Few and large: it reads as a row of stars, not as a line.',
  },
  {
    id: 'ribbon', name: 'Ribbon of light', family: 'Ribbon', frame: 'The world',
    line: 'One smooth band of light that follows her path.',
    child: 'A soft band of light. It is wide at her back and thin at its end, and it bends in each turn.',
    limit: 'Smooth, with no sparkle. It is the easiest trail to read in a turn.',
  },
  {
    id: 'tips', name: 'Wing-tip streams', family: 'Ribbon', frame: 'The world',
    line: 'Two thin lines of light from the wing tips, with dust.',
    child: 'Two thin lines, one from each wing, with small sparkles on them. In a turn the two lines show the bank.',
    limit: 'The lines start at a fixed place near each wing tip. They do not follow each wing beat.',
  },
  {
    id: 'tail', name: 'Comet tail', family: 'On the fairy', frame: 'The fairy',
    line: 'A cone of sparkles that is fixed to her back.',
    child: 'A short tail of stars straight behind her. It is longer in a boost. It can not go to one side.',
    limit: 'The tail does not bend in a turn: it turns with her as one piece.',
  },
  {
    id: 'halo', name: 'Sparkle halo', family: 'On the fairy', frame: 'The fairy',
    line: 'No trail: stars that flash around her.',
    child: 'Small stars come and go around her body and her wings. It is the same in flight and in a hover.',
    limit: 'It does not show where she came from.',
    still: 10.6,
  },
  {
    id: 'ribbon-stars', name: 'Ribbon and stars', family: 'Ribbon', frame: 'The world',
    line: 'A thin ribbon with star glints along it.',
    child: 'A thin band of light shows her path, and stars flash along it.',
    limit: 'Two draw calls. It is the brightest option on a dark sky.',
  },
  {
    id: 'rainbow', name: 'Rainbow dust', family: 'Sparkles', frame: 'The world',
    line: 'Pixie dust that goes through the colours of the rainbow.',
    child: 'The dust starts in the sparkle colour of her wings. Then each point goes through the rainbow as it becomes older.',
    limit: 'It uses the wing colour only at the start of the trail.',
  },
  {
    id: 'candy', name: 'Blossom confetti', family: 'Magic', frame: 'The world', world: 'fairy',
    line: 'Hearts, flowers and stars in candy colours.',
    child: 'Small hearts, flowers and stars in pink, lemon, mint and lilac. They turn and fall slowly, with a little dust between them.',
    limit: 'A magic trail for Blossom Haven. It has its own colours, not the wing colour.',
  },
  {
    id: 'bursts', name: 'Only when it counts', family: 'Sparkles', frame: 'The world',
    line: 'No trail in a cruise. Sparkles in a boost and after a ring.',
    child: 'The view is clean in a cruise. A boost starts with a burst of stars and leaves dust. A sparkle ring gives dust for 4 s.',
    limit: 'In a cruise it is the same as option 01.',
    still: 7.6,
  },
  {
    id: 'shimmer', name: 'Shimmer to sparkle', family: 'Sparkles', frame: 'The world',
    line: 'A faint shimmer in a cruise. It becomes strong in a boost.',
    child: 'In a cruise, a few small, faint points come from her. A boost makes more points, larger points and brighter points, in about half a second. A sparkle ring does the same for 4 s.',
    limit: 'The trail is always there, so it is not as clean as option 12 in a cruise. In a hover the shimmer continues.',
    still: 8.2,
  },
  {
    id: 'shimmer-feet', name: 'Shimmer from her feet', family: 'Sparkles', frame: 'The world',
    line: 'The shimmer of option 13, from her two feet.',
    child: 'A faint line of small points comes from each foot. In a boost the two lines become strong and bright, as in option 13.',
    limit: 'Her feet are the lowest part of her, so the trail is lower in the picture than in option 13. The two lines move with her legs.',
    still: 8.2,
  },
  {
    id: 'shimmer-wings', name: 'Shimmer from her wings', family: 'Sparkles', frame: 'The world',
    line: 'The shimmer of option 13, from all the surface of her wings.',
    child: 'Small points come off her wings at many different places, so the dust is a wide, soft cloud and not a line. In a boost the cloud becomes strong and bright, as in option 13.',
    limit: 'The cloud is as wide as her wings, so it shows her path less clearly than a line. The study puts the points on the shape of the four wing panels of the rig, not on the outline of each wing design.',
    still: 8.2,
  },
]

export const ALL = [BEFORE, ...OPTIONS]
export const numberOf = (id: string) => String(OPTIONS.findIndex(option => option.id === id) + 1).padStart(2, '0')
export const optionById = (id: string) => ALL.find(option => option.id === id)

/** The recommendation of the study. */
export const RECOMMENDED = 'pixie'

/** The options that Joel selected on 4 October 2026. The game has them, and the player selects one in the look menu. */
export const SELECTED = ['pixie', 'tail', 'halo', 'shimmer-feet']

/** The pictures of the findings: the trail of today and the repaired trail, in the same flight. */
export const FINDING_SHOTS = [
  { id: 'F-today-above', trail: 'today', camera: 'above', time: 2.3, title: 'Today, from above.', text: 'She flies up the picture. The dots are in front of her, not behind her.' },
  { id: 'F-fixed-above', trail: 'fixed', camera: 'above', time: 2.3, title: 'With the three rules.', text: 'The same flight. The dots stay on her path.' },
  { id: 'F-today-hover', trail: 'today', camera: 'game', time: 9.4, title: 'Today, in a hover.', text: 'She is still. The dots move away as one group.' },
  { id: 'F-fixed-hover', trail: 'fixed', camera: 'game', time: 9.4, title: 'With the three rules.', text: 'The dots stay where she left them, and they fade.' },
] as const

export const FINDINGS: [string, string][] = [
  ['The dots stay in space, and the world moves', 'Near a world, the game carries the fairy with the spin and the orbit of the world (<code>src/main.ts:1001</code>). The dots of the trail do not move with her (<code>src/main.ts:840</code>). They go away at the speed of the world. This is the cause of the weird angles.'],
  ['The angle changes with her heading', 'The speed of the world has one direction in space. When she turns, the trail does not turn with her: it can be behind her, at one side, or in front of her.'],
  ['In a hover the trail moves away', 'A hover adds no dots (<code>src/main.ts:793</code>). The old dots stay in space, and the world carries her away from them. The trail moves off as one group.'],
  ['The length depends on the screen', 'The game adds one dot for each frame and shows 72. At 60 frames in each second the trail lasts 1.2 s. At 120 it lasts 0.6 s, and at 30 it lasts 2.4 s.'],
  ['In space the dots are far apart', 'The gap between two dots is the distance of one frame. In open space that gap is larger than the distance from the camera to the fairy, so the trail is almost empty.'],
  ['A boost makes groups of three', 'A boost adds three dots in a frame, all at the same place (<code>src/main.ts:838</code>). The trail lasts one third of the time, and it has small groups, not more length.'],
  ['The end of the trail is as bright as its start', 'Each dot has the same size and the same opacity. The oldest dot goes out in one frame. The colour of a dot follows its place in the buffer, not its age (<code>src/main.ts:369</code>).'],
  ['No twinkle, and no colour by day', 'The opacity of all the dots changes together, on one slow wave (<code>src/main.ts:1040</code>). No dot flashes alone, so the trail does not sparkle. Each dot adds its light to the picture, so on a bright sky the sparkle colour of the wings goes white.'],
]

export const RULES: [string, string][] = [
  ['The trail belongs to the world below her', 'The points are children of the world that carries the fairy. They turn and move with it, so the trail is always on the path that she flew. In open space no world carries her, and the points stay in space.'],
  ['Time makes the points, not frames', 'Each option makes a number of points in each second. The trail has the same length and the same density at 30, 60 and 120 frames in each second.'],
  ['A limit on the length', `A point moves away from her at ${CAP} m in each second at most. In a boost and in open space the points keep a part of her speed, so the trail has the same length at each speed.`],
  ['Each point fades with its age', 'A point becomes smaller and fainter before it goes out. The end of the trail is soft.'],
  ['Each point twinkles alone, in the sparkle colour', 'Each point has its own flash rate. This gives the sparkle. With reduced motion, the points keep one brightness. A point covers a part of the picture behind it, so its colour shows by day and it shines at night.'],
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  {
    id: 'trail', title: 'Which trail goes in the game?',
    why: 'The study recommends 03 Pixie dust: it is the nearest to the trail of today, it sparkles, and it follows the three rules. On 4 October 2026 you selected four trails for the look menu of the game: 03, 07, 08 and 14.',
    options: [...OPTIONS.map(option => `${numberOf(option.id)} ${option.name}${option.id === RECOMMENDED ? ' (recommended)' : ''}`), 'Keep the trail of today'],
  },
  {
    id: 'also', title: 'Which other options do you like?', multi: true,
    why: 'Two options can go together, for example a ribbon with the pixie dust. Select each option that you want to see in a second round.',
    options: OPTIONS.map(option => `${numberOf(option.id)} ${option.name}`),
  },
  {
    id: 'blossom', title: 'A magic trail on Blossom Haven',
    why: 'Blossom Haven is the magic world. Option 11 gives it a trail of its own.',
    options: ['The same trail on each world (recommended)', '11 Blossom confetti near Blossom Haven, and the selected trail on the other worlds', '11 Blossom confetti on each world'],
  },
  {
    id: 'bonus', title: 'After a sparkle ring or a comet tail',
    why: 'Today the trail is two times as long and brighter for 4 s. Each option of the study does the same: more points, larger points and a longer life.',
    options: ['Keep it: a longer, brighter trail for 4 s (recommended)', 'A burst of stars only, and no change to the trail', 'No reward on the trail'],
  },
  {
    id: 'hover', title: 'The trail in a hover',
    why: 'Today a hover adds no dots. In the study, the sparkle options let a little dust fall from her in a hover.',
    options: ['A little dust in a hover (recommended)', 'No points in a hover', 'The same amount as in flight'],
  },
  {
    id: 'colour', title: 'The colour of the trail',
    why: 'Each wing colour of the menu has a sparkle colour. Today the trail uses it.',
    options: ['The sparkle colour of the wings, from white to the colour (recommended)', 'One gold colour for each fairy', 'The player selects a trail colour in the menu'],
  },
]
