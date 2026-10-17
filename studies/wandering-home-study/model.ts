/**
 * The wandering home study: a hop of Blossom Haven each 2 minutes, with a nova, a place as a moon
 * of a planet, and a new size. The page (main.ts) shows the clips, the options, the numbers of
 * numbers.ts and the bench, and the decisions. The first option of each decision is the
 * recommendation.
 */
export type OptionId = 'A' | 'B' | 'C'
/** The clips: one for each look of the nova, then the moon, the sizes and the hop on board. */
export type ClipId = OptionId | 'S' | 'Z' | 'H'
export type Size = 'S' | 'M' | 'L'
export const SIZES_OF_WORK: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

export type Moment = { t: number; caption: string }
export type Clip = { id: ClipId; name: string; question: string; moments: [Moment, Moment, Moment] }

/** The moments are the times of MOMENTS in wandering-home-study-capture.mjs. */
export const CLIPS: Clip[] = [
  {
    id: 'A', name: 'A · Blossom nova', question: 'What does the hop look like with a nova of petals and rings of light?',
    moments: [
      { t: 1.5, caption: 'Blossom Haven, 900 m from the fairy, before the hop.' },
      { t: 2.6, caption: 'A pink flash and two rings where it leaves. The second nova, 5.7 km away, shows where it arrives.' },
      { t: 4.4, caption: 'The petals go out and fade. The home is a small disc at its new place.' },
    ],
  },
  {
    id: 'B', name: 'B · Star nova', question: 'What does the hop look like with the nova of a real star?',
    moments: [
      { t: 1.5, caption: 'Blossom Haven, 900 m from the fairy, before the hop.' },
      { t: 2.6, caption: 'A white flash with four spikes, and a shell of light that grows.' },
      { t: 4.4, caption: 'The shell turns blue and violet and fades.' },
    ],
  },
  {
    id: 'C', name: 'C · Brighter glow', question: 'Is the glow of today enough, if it is brighter?',
    moments: [
      { t: 1.5, caption: 'Blossom Haven, 900 m from the fairy, before the hop.' },
      { t: 2.6, caption: 'The pink glow of today, more than twice as bright, and a few gold sparkles.' },
      { t: 4.4, caption: 'The glow is gone. The far glow is a small pink spot.' },
    ],
  },
  {
    id: 'S', name: 'S · A moon of Saturn', question: 'What does Blossom Haven look like as a moon of a planet?',
    moments: [
      { t: 1.6, caption: 'The nova next to Saturn: Blossom Haven arrives.' },
      { t: 3.6, caption: 'Blossom Haven on its path, 1,518 m from the middle of Saturn.' },
      { t: 10.5, caption: '13 times faster: the home goes around Saturn. The line is its path.' },
    ],
  },
  {
    id: 'Z', name: 'Z · The sizes', question: 'How small and how big can the home be?',
    moments: [
      { t: 1.5, caption: 'Today: radius 138 m.' },
      { t: 4.5, caption: 'As big as Ceres: radius 33 m. The gold circle is the size of today.' },
      { t: 10.5, caption: 'As big as Jupiter: radius 588 m.' },
    ],
  },
  {
    id: 'H', name: 'H · On board', question: 'What does the fairy see when the hop takes her with the home?',
    moments: [
      { t: 2.5, caption: 'She flies over the flower cottage.' },
      { t: 4.4, caption: 'The hop: a soft pink flash in her sky, and petals.' },
      { t: 10, caption: 'The home is as big as Earth, and a moon of Saturn. Saturn rises in front of her.' },
    ],
  },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

// ---- The looks of the nova -----------------------------------------------------------------------

export type Option = {
  id: OptionId
  name: string
  line: string
  /** What the child sees, near and far. */
  child: string
  strong: string[]
  weak: string[]
  size: Size
  recommended: boolean
}

export const OPTIONS: Option[] = [
  {
    id: 'A', name: 'Blossom nova', recommended: true, size: 'S',
    line: 'A pink and gold flash, two rings of light and petals in the colours of the four magic seasons. 3.4 s.',
    child: 'Near the home she sees a soft pink flash, a gold ring and a pink ring that grow, and petals that fly out and fade. Far away she sees a small pink star that flashes and a ring around it.',
    strong: [
      'It is magic, as the rule for Blossom Haven asks: petals, candy colours, no white light.',
      'The rings show the place well from far away.',
      'The petals have the colours of the four seasons: the hop also brings the next season.',
    ],
    weak: [
      'The most parts: five for each nova (two sprites, two rings and the petals).',
      'Near the home the rings fill the view for about 1 s.',
    ],
  },
  {
    id: 'B', name: 'Star nova', recommended: false, size: 'S',
    line: 'A white flash with four spikes, and a shell of light that grows and turns blue and violet. 4.2 s.',
    child: 'She sees a bright white star with four spikes, and a large clear bubble of light that grows around it and fades.',
    strong: [
      'It is near to a real nova: a child can learn the word from it.',
      'It is the easiest to see from far away.',
    ],
    weak: [
      'It is not magic: the same look can be on Earth.',
      'The white flash is the brightest of the three. Near the home it covers the view.',
      'It is the longest (4.2 s).',
    ],
  },
  {
    id: 'C', name: 'Brighter glow', recommended: false, size: 'S',
    line: 'The pink glow of today (createRelocationGlow()), at 0.55 in place of 0.22, and a few gold sparkles. 2.6 s.',
    child: 'She sees a pink glow over the home and a few sparkles. Far away it is a small pink spot.',
    strong: [
      'The smallest change: the glow is in the game today.',
      'The calmest of the three.',
    ],
    weak: [
      'It is not a nova: there is no flash and no ring.',
      'From far away it is hard to see.',
    ],
  },
]
export const optionById = (id: OptionId) => OPTIONS.find(option => option.id === id)!

/** One row for each fact of the comparison table. */
export const COMPARE: { row: string; values: Record<OptionId, string> }[] = [
  { row: 'Look', values: { A: 'Petals, rings, pink and gold', B: 'White flash, spikes, a shell', C: 'Pink glow, sparkles' } },
  { row: 'Magic (the rule for Blossom Haven)', values: { A: 'Yes', B: 'No: a real nova', C: 'A little' } },
  { row: 'Near (900 m)', values: { A: 'Fills the view for about 1 s', B: 'Fills the view for about 1.5 s', C: 'A glow over the home' } },
  { row: 'Far (5.7 km)', values: { A: 'A pink star and a ring', B: 'A white star with spikes', C: 'A small pink spot' } },
  { row: 'Length', values: { A: '3.4 s', B: '4.2 s', C: '2.6 s' } },
  { row: 'Parts for each nova', values: { A: '5 (two sprites, two rings, petals)', B: '4 (shell, two sprites, sparkles)', C: '2 (one sprite, sparkles)' } },
  { row: 'Size of the work', values: { A: 'S', B: 'S', C: 'S' } },
]

// ---- The three other clips -------------------------------------------------------------------------

export type Part = { id: 'S' | 'Z' | 'H'; name: string; line: string; child: string; detail: string[] }
export const PARTS: Record<'S' | 'Z' | 'H', Part> = {
  S: {
    id: 'S', name: 'A moon of a planet',
    line: 'At a hop, Blossom Haven can go on a path around a planet, as the Moon goes around Earth.',
    child: 'She sees her home next to a big planet. The home goes around it. In the Worlds map the home has a small path around that planet.',
    detail: [
      'The path is tilted 20° to the plane of the planets. The Moon has 28°.',
      'The nearest path is clear of the air and the rings of the planet, by the margin of the hop rule of today (250 m). Around Earth it is also clear of the path of the Moon.',
      'The whole path must stay clear of the asteroid belt, the comet, the Sun and the circles of the other planets. These are the tests of clearHomePosition() in src/relocation.ts, for each point of the path.',
      'With these tests only Earth, Saturn, Uranus and Neptune have room (the table below). Mars never has room: the belt starts 875 m outside its orbit.',
      'A turn of the path takes 4 minutes: half a turn in each stay of 2 minutes. On a path of 1,518 m around Saturn that is 40 m/s. The Moon goes at 18 m/s and Neptune at 59 m/s on its orbit, and the fairy can catch both.',
      'The planet in the sky needs the material rule of the Moon: no fog. Clip H shows it. With fog, the air of the home paints the planet pink.',
    ],
  },
  Z: {
    id: 'Z', name: 'Ten sizes',
    line: 'At a hop, the home can grow or shrink. Each size is the size of a real world: from Ceres to Jupiter.',
    child: 'The note of the hop says the size: "Blossom Haven is as big as Mars now!" She sees a small world that she can fly around in 20 s, or a big world with a flat horizon.',
    detail: [
      'The ten sizes are Ceres, the Moon, Mercury, today, Mars, Venus, Earth, Neptune, Saturn and Jupiter (radius 33 m to 588 m in the game).',
      'At a hop the size goes one or two steps up or down, or it stays. Two hops of three get a new size. Over many hops each size has about one hop in ten.',
      'The air and the clouds grow with the square root of the radius: 32 m of air and clouds at 15 m on the smallest home, 134 m of air and clouds at 62 m on the biggest.',
      'The hills keep their places: the terrain has the same seed. The cottage, the candy and the plants keep their size; there are more plants on a bigger home.',
      'A new size is a new build of the ground, the plants, the candy, the clouds and the animals: 0.3 to 0.7 s on the computer of the bench, and 0.9 to 1.9 s on the slow phone page. The game must build it before the hop, in parts, or the flight stops.',
    ],
  },
  H: {
    id: 'H', name: 'The hop with her on board',
    line: 'When she is on the home at the hop, the home takes her with it, as today. Now the size and the place can change too.',
    child: 'A soft pink flash fills her sky, and petals rise around her. Then the ground is the same garden, but the horizon is farther and a planet hangs in the sky.',
    detail: [
      'She keeps her place on the home: the same direction from the middle and the same height over the ground. The camera, the trail and the guide move with her, as relocateHome() does today.',
      'The flash in her sky is pink, never white. It comes in 0.3 s and goes in 1.7 s. It is one flash, not a series.',
      'The new home is built before the hop, so at the flash there is only a swap of two groups.',
      'The animals of the new home are new: a herd that she follows is gone after the hop.',
    ],
  },
}

// ---- The findings ------------------------------------------------------------------------------------

export const FINDINGS: [title: string, text: string][] = [
  ['The clock is one number, but other parts count on it', '<code>HOME_MOVE_SECONDS</code> in <code>src/relocation.ts</code> is 300. Each hop also gives the next magic season (<code>MAGIC_STEP</code>), so a change to 120 makes a magic year of 8 minutes in place of 20. The test "makes a year of 20 minutes" fails (<code>tests/magic-seasons.test.ts</code>). The Worlds map says "every five minutes" (<code>src/adventure.ts</code>).'],
  ['More trips by hand end with the home gone', 'From a planet, a straight trip to the home takes 28 s on average and 71 s at most (4,000 trips with the hop rule of the game, at the space speed of 967.5 m/s). The chance that the home hops before she arrives goes from 9% to 23%. A real trip has turns and a slow approach, so the real chance is higher. The flower guide stops the clock, so a trip with the guide is safe.'],
  ['The glow of today does not show from far away', '<code>createRelocationGlow()</code> puts a pink sprite at each place, at an opacity of 0.22 for 2.5 s. With reduced motion it does not show. From 6 km it is a few faint pixels (clip C). A nova that the child sees from across the system needs a smallest size on the screen: 14 px in the clips.'],
  ['Four planets have room for a moon home', 'The tests of the hop rule of today, for the whole path, leave Earth, Saturn, Uranus and Neptune. Mercury, Venus and Jupiter are in the reach of the comet path at some time; the belt is 875 m from the orbit of Mars. A rule that tests the comet only for the stay (2 minutes and 30 s) adds Mercury, Venus and Jupiter in 87% to 99% of the hops.'],
  ['The orbits know one moon', '<code>rebase()</code> in <code>src/orbits.ts</code> puts the home on a new circle around the Sun. Only the Moon has a path around a planet (<code>syncMoon()</code>). A moon home needs a second kind of orbit, and a path line that moves with its planet. The Moon has <code>fog: false</code> so that it shows from Earth; a planet in the sky of a moon home needs the same.'],
  ['A new size is a new build', '<code>regenerateWorld()</code> keeps one landscape for Blossom Haven: it returns at the second visit. A new size needs a forced build, and the shell of the air (<code>addAtmosphere()</code>) is outside it. The build takes 0.3 to 0.7 s on the bench computer and 0.9 to 1.9 s on the slow phone page.'],
  ['The plants grow with the area', 'The plan of the plants (<code>src/foliage/planting.ts</code>) has a number of places for each square metre. At Jupiter size the home has 113,823 plant and candy instances in place of 10,904, and 16.9 million triangles from space in place of 2.6 million. The animals stay at about 800 (the herd limits), and 415 at Ceres size.'],
  ['A small home needs its own air', 'With the ratio of today a home as big as Ceres has 15 m of air and clouds at 7 m: the clouds are in the lollipops. With the square root of the radius it has 32 m of air and clouds at 15 m.'],
]

// ---- The plan --------------------------------------------------------------------------------------

export const CHANGES: [title: string, text: string, size: Size][] = [
  ['The clock and the seasons', 'Set <code>HOME_MOVE_SECONDS</code> to 120. Give a new magic season at each second hop, so the magic year is 16 minutes. Change the text of the Worlds map and the test of the magic year.', 'S'],
  ['The nova', 'A new <code>src/hop-nova.ts</code> in place of <code>createRelocationGlow()</code>: the look of A, at the old place and at the new place, with a smallest size of 14 px. With reduced motion, only a soft glow with no rings and no petals. A soft chime when she is nearer than 3 km or on the home.', 'S'],
  ['The sizes', 'A size walk in <code>src/relocation.ts</code>. A <code>rebuildHome()</code> in <code>src/worlds.ts</code> that builds the ground, the plants, the candy, the cottage, the clouds, the animals and the air at a new radius. Keep the plants at the density of today up to the count of an Earth-size home, then fewer. The note of the hop says the size.', 'L'],
  ['Build before the hop', 'Choose the next size and place at the start of a stay, and build the new home in parts over the next frames (or in a worker for the plan of the plants). At the hop, swap the two groups under the flash.', 'L'],
  ['The moon home', 'A moon slot in <code>src/relocation.ts</code> with the tests of the whole path. A second kind of orbit in <code>src/orbits.ts</code>: a path around the planet, tilted 20°, a turn in 4 minutes, and its line in the sky and in the Worlds map. No fog on the planet while the home is its moon.', 'M'],
  ['The carry and the checks', 'At a new size, keep her direction and her height over the ground. Update the guide point. Add a hop of 2 minutes, a new size and a moon hop to <code>scripts/blossom-smoke.mjs</code>, and tests for the walk and the moon slots.', 'M'],
]

// ---- The decisions -----------------------------------------------------------------------------------

export type Decision = { id: string; title: string; why: string; options: string[] }
export const DECISIONS: Decision[] = [
  { id: 'look', title: '1. The look of the nova', why: 'The three clips A, B and C show the same hop.', options: ['A · Blossom nova: petals, rings, pink and gold', 'B · Star nova: a white flash and a shell', 'C · Brighter glow: the glow of today, brighter'] },
  { id: 'where', title: '2. Where the nova shows', why: 'A nova at the new place shows the child where her home went.', options: ['At the old place and at the new place', 'Only at the new place', 'Only at the old place'] },
  { id: 'far', title: '3. A nova far away', why: 'Without a smallest size, a nova 20 km away is about 4 px.', options: ['A smallest size of 14 px: she sees it from across the system', 'The real size only'] },
  { id: 'moon', title: '4. How often the home is a moon', why: 'Only when a planet has room for the size of the home.', options: ['One hop in two', 'One hop in three', 'Each hop, when a planet has room'] },
  { id: 'comet', title: '5. The rule for the comet', why: 'The rule of the whole path leaves four planets. The rule for the stay adds Mercury, Venus and Jupiter, but it needs a new test while the guide stops the clock.', options: ['The whole path: Earth, Saturn, Uranus and Neptune', 'The stay: also Mercury, Venus and Jupiter'] },
  { id: 'bigger', title: '6. A home bigger than its planet', why: 'A home as big as Jupiter is bigger than Saturn, Uranus and Neptune.', options: ['Not a moon: a moon is smaller than its planet', 'A moon also when it is bigger'] },
  { id: 'walk', title: '7. How the size changes', why: 'The size walk sets how often the home is very small or very big.', options: ['One or two steps up or down, or the same size', 'Any size at each hop', 'Only the sizes from Mercury to Earth'] },
  { id: 'plants', title: '8. The plants on a big home', why: 'At Jupiter size the plants of today give 10 times the instances and 6 times the triangles.', options: ['The density of today up to the count of an Earth-size home, then fewer', 'The density of today on each size', 'The count of today on each size'] },
  { id: 'aboard', title: '9. A hop with her on the home', why: 'Clip H shows the full hop with her on board.', options: ['The full hop: a new place and a new size', 'A new place; the size waits until she leaves', 'No hop while she is on the home'] },
  { id: 'seasons', title: '10. The magic seasons', why: 'Each hop gives the next season today. With 2 minutes that is a magic year of 8 minutes.', options: ['A season each two hops: a year of 16 minutes', 'A season each hop: a year of 8 minutes'] },
  { id: 'trip', title: '11. A trip to the home by hand', why: 'With 2 minutes, about one trip in four ends with the home gone.', options: ['The hop waits while she is nearer than 3 km (outside its air)', 'No change: the hop does not wait'] },
  { id: 'turn', title: '12. The turn of a moon home', why: 'A turn in 4 minutes is half a turn in each stay.', options: ['A turn in 4 minutes', 'A turn in 327 s, as the Moon', 'A turn in 2 minutes: one turn in each stay'] },
]
