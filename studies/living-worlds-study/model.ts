import bench from '../../public/studies/living-worlds/bench.json'
import { JETS, jet, WIND_SCALE } from './skies/data'

/**
 * The living worlds study: the real clouds of each world, and things that move and happen there.
 * The page (main.ts) shows the clips, the three options and their measured cost, the worlds one by
 * one with their sources, the findings, the plan and the decisions. The first option of each
 * decision is the recommendation.
 */
export type OptionId = 'A' | 'B' | 'C'
export type ClipId = 'T' | OptionId | 'V' | 'M' | 'N' | 'L'
export type Size = 'S' | 'M' | 'L'
export const SIZES: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

// ---- The measurements ----------------------------------------------------------------------------------

export type BenchRow = { view: string; option: string; clip: string; calls: number; triangles: number; ms: number; p90: number; extraCalls: number }
export type BenchDevice = { gpu: string; width: number; height: number; pixelRatio: number; throttle: number; views: { id: string; name: string }[]; rows: BenchRow[] }
export const BENCH = bench as unknown as { date: string; frames: number; desktop: BenchDevice; phone: BenchDevice; phoneSlow: BenchDevice }
export const DEVICES = [
  { id: 'desktop', name: 'Computer, 1280 × 720' },
  { id: 'phone', name: 'Phone page, 390 × 844' },
  { id: 'phoneSlow', name: 'Phone page, CPU 4 × slower' },
] as const
export type DeviceId = typeof DEVICES[number]['id']
export const BENCH_OPTIONS = ['today', 'A', 'B', 'C'] as const
export const benchRow = (device: DeviceId, view: string, option: string) => BENCH[device].rows.find(row => row.view === view && row.option === option)
/** The most extra draw calls and the longest frame of an option over the views. */
export function worst(device: DeviceId, option: string) {
  const rows = BENCH[device].rows.filter(row => row.option === option)
  return { extraCalls: Math.max(...rows.map(row => row.extraCalls)), ms: Math.max(...rows.map(row => row.ms)), triangles: Math.max(...rows.map(row => row.triangles)) }
}

// ---- The options ---------------------------------------------------------------------------------------

export type Option = {
  id: OptionId
  name: string
  line: string
  size: Size
  recommended?: boolean
  drawing: string
  child: string
  strong: string[]
  weak: string[]
  risks: string[]
}

export const OPTIONS: Option[] = [
  {
    id: 'A', name: 'True clouds', size: 'M',
    line: 'Each world gets the kind of cloud that it really has, and its clouds move with its real winds. Nothing else happens.',
    drawing: 'The puffs of today go. Each world gets one to three cloud shells (one sphere and one draw call for each layer, as the layers of the EVE mod of Kerbal Space Program) and one or two sets of soft tufts (one InstancedMesh for each set). A shader turns each band about the axis of the world at the speed of its real jet, scaled to the game.',
    child: 'Jupiter has white bands and brown gaps, and the bands slide past each other. Saturn is soft and creamy. Neptune has long white streaks with shadows. Mars has thin wisps in an orange sky. Venus is a sea of cloud.',
    strong: ['Each world looks different from inside its air, as it does from space.', 'The motion is real: the bands of Jupiter go in opposite directions, and the equator of Neptune goes backwards.', 'The cost is small and fixed: the clouds do not need code on each frame.'],
    weak: ['Nothing happens: the worlds look right, but they do not feel alive.', 'A child sees the change only on a second look.'],
    risks: ['A shell fills the screen when the fairy is inside it: measure the phone.', 'The look of the tufts must match the heap clouds of Earth.'],
  },
  {
    id: 'B', name: 'The weather of each world', size: 'L', recommended: true,
    line: 'A, and one or two real events on each world: the Great Red Spot turns, storm towers flash with lightning, dust devils walk over Mars, acid rain hangs under the deck of Venus, and small stones spark on the night side of the Moon.',
    drawing: 'The shells and tufts of A, and for each event one small part: a storm shell that turns in place on the painted storm, five tall tufts with a flash of light, points for the dust devils, a set of curtains for the rain of Venus, and a set of points for the sparks. Each event is local and keeps to its place, as the calm weather of Earth.',
    child: 'Each world has a thing to find and watch: a red storm that turns, lightning in a tall cloud, a dust tornado, a spark of light on the dark Moon. The things are real, so the friend can tell a true fact about each one.',
    strong: ['The worlds feel alive, and each event is a true fact for a child.', 'The events fit the search stars and the sticker book of today: a task can ask for each one.', 'The events are local, so the sky stays calm, as the weather of Earth.'],
    weak: ['More work than A: one event for each world, with its own look.', 'Some facts are not certain (the lightning of Venus): the page says so.'],
    risks: ['Lightning must stay soft: no fast flicker for a child (reduced motion stops it).', 'The dust devils move points on the CPU on each frame: keep their number small on a phone.'],
  },
  {
    id: 'C', name: 'Imagined sky life', size: 'L',
    line: 'B, and gentle floating creatures that scientists imagined: the floaters of Carl Sagan and Edwin Salpeter (1976) drift in the clouds of Jupiter.',
    drawing: 'The parts of B, and one InstancedMesh of see-through bags with a soft rim light and one set of lines for their threads. Ten floaters drift with the jet of their latitude and pulse slowly.',
    child: 'Jupiter has big, soft, glowing balloons that float in the clouds. The friend says: "Scientists dreamed of these. No one has seen one."',
    strong: ['The giants get life, as Earth and Blossom Haven have.', 'The idea is real science history, not a fantasy of the game.', 'Two draw calls.'],
    weak: ['The floaters are not real. A child can think that they are.', 'It goes against the rule "Earth follows the real world": the other planets are real too.'],
    risks: ['The book must mark the floaters as imagined.', 'The game has no animals on the giants today; this starts a new kind of card.'],
  },
]
export const optionById = (id: OptionId) => OPTIONS.find(option => option.id === id)!

// ---- The clips -----------------------------------------------------------------------------------------

export type Moment = { t: number; caption: string }
export type Clip = { id: ClipId; name: string; option: OptionId | 'today'; world: string; question: string; moments: Moment[]; today?: string }
export const CLIPS: Clip[] = [
  {
    id: 'T', name: 'Today · Jupiter', option: 'today', world: 'Jupiter', question: 'What does the fairy see when she flies into Jupiter today?',
    moments: [
      { t: 2, caption: 'From high up: the painted map of the planet look study, with flat puffs on it.' },
      { t: 7, caption: 'In the cloud layer: grey puffs with the same shape on each world.' },
      { t: 12, caption: 'Under the puffs: a beige fog and the map. Nothing moves.' },
    ],
  },
  {
    id: 'A', name: 'A · True clouds on Jupiter', option: 'A', world: 'Jupiter', question: 'Can the clouds of Jupiter look like the real ones: white zones, brown belts, and bands that move?',
    moments: [
      { t: 2, caption: 'The white zones are high clouds of ammonia ice. The belts are gaps where the deeper, browner clouds show.' },
      { t: 7, caption: 'In the top layer: the tufts are in rows along the bands.' },
      { t: 12, caption: 'Under the top layer: its underside is above, and the brown clouds of the deeper layer are around her.' },
    ],
  },
  {
    id: 'B', name: 'B · The weather of Jupiter', option: 'B', world: 'Jupiter', question: 'Can Jupiter feel alive: a storm that turns, and lightning in tall clouds?',
    moments: [
      { t: 2, caption: 'The Great Red Spot turns in place, where the map paints it. The tufts keep out of it.' },
      { t: 7, caption: 'Along the north edge of the storm, in the top layer.' },
      { t: 9.1, caption: 'Storm towers rise from the belt, and lightning lights them from inside.' },
    ],
  },
  {
    id: 'C', name: 'C · Floaters on Jupiter', option: 'C', world: 'Jupiter', question: 'What if Jupiter had the gentle creatures that scientists imagined in 1976?',
    moments: [
      { t: 2, caption: 'The same flight as B.' },
      { t: 7, caption: 'Floaters drift in the clouds with the wind of their band.' },
      { t: 12, caption: 'A floater near the fairy: a see-through bag with threads, which pulses slowly.' },
    ],
  },
  {
    id: 'V', name: 'B · Venus', option: 'B', world: 'Venus', today: 'V-today', question: 'Can Venus show its fast clouds and its acid rain?',
    moments: [
      { t: 2, caption: 'Above the deck: the dark streaks and chevrons go around the planet in about 4 days.' },
      { t: 7, caption: 'Down through the deck: no puffs, one closed layer.' },
      { t: 12, caption: 'Under the deck: curtains of acid rain fade before they get to the ground.' },
    ],
  },
  {
    id: 'M', name: 'B · Mars', option: 'B', world: 'Mars', today: 'M-today', question: 'Can Mars show thin ice clouds and dust devils?',
    moments: [
      { t: 2, caption: 'From high up: thin wisps of water ice in patches, and no puffs.' },
      { t: 7, caption: 'Down to the plain under a butterscotch sky.' },
      { t: 12, caption: 'Dust devils turn and walk slowly over the plain.' },
    ],
  },
  {
    id: 'N', name: 'B · Neptune', option: 'B', world: 'Neptune', today: 'N-today', question: 'Can Neptune show its high white streaks, their shadows and its dark storm?',
    moments: [
      { t: 2, caption: 'From high up: white streaks of methane ice, each with its shadow on the blue deck below.' },
      { t: 7, caption: 'The Great Dark Spot turns where the map paints it, with bright clouds at its south edge.' },
      { t: 12, caption: 'Between the streaks: the fastest winds of the Solar System carry them west.' },
    ],
  },
  {
    id: 'L', name: 'B · The Moon', option: 'B', world: 'The Moon', today: 'L-today', question: 'Can an airless world have a small event, with no clouds at all?',
    moments: [
      { t: 2, caption: 'The night side of the Moon: a black sky and no clouds, as today.' },
      { t: 7.3, caption: 'A spark on the horizon: a small stone from space hits the ground.' },
      { t: 11.6, caption: 'The sparks are short and far apart, as the flashes that telescopes see.' },
    ],
  },
]
export const clipById = (id: ClipId) => CLIPS.find(clip => clip.id === id)!

// ---- The worlds one by one ----------------------------------------------------------------------------

export type Source = { label: string; url: string }
export type WorldRow = {
  id: string
  name: string
  today: string
  real: string
  events: string
  proposal: string
  sky: string
  facts: string[]
  sources: Source[]
  /** The pictures: today and the proposal, as files of public/studies/living-worlds/. */
  pictures?: [string, string]
}

const NASA = (planet: string) => ({ label: `NASA ${planet} facts`, url: `https://science.nasa.gov/${planet.toLowerCase()}/${planet === 'Saturn' || planet === 'Mars' || planet === 'Uranus' || planet === 'Mercury' ? 'facts' : `${planet.toLowerCase()}-facts`}/` })

export const WORLDS: WorldRow[] = [
  {
    id: 'mercury', name: 'Mercury', today: 'No air, no clouds.', real: 'No clouds. A thin exosphere of atoms knocked off the ground.',
    events: 'A sodium tail, longer than 1,000 Mercury radii, that streams away from the Sun. It shows only to special cameras.',
    proposal: 'Keep as today. B: the sparks of small stones on the night side, as on the Moon.',
    sky: 'Black. The Sun looks 3 times as large as from Earth.',
    facts: ['Mercury has a tail, like a comet!', 'The Sun looks three times bigger here.'],
    sources: [NASA('Mercury'), { label: 'NASA, the sodium tail of Mercury', url: 'https://ntrs.nasa.gov/citations/20110004922' }],
  },
  {
    id: 'venus', name: 'Venus', today: '1,500 golden puffs under a closed painted deck.', real: 'One closed deck of sulfuric acid, 45 to 70 km up, with haze above and below. No puffs.',
    events: 'The super-rotation: the cloud tops go around the planet in about 4 days; the ground turns once in 243 days. Acid rain falls from the deck and goes back to gas. Lightning: not certain.',
    proposal: 'A: streaks and chevrons above the deck that move fast, a thin lower haze, no puffs. B: the acid rain and faint flashes, marked "not certain".',
    sky: 'Under the deck: dim, sulfur yellow to orange. The Sun is a bright smear or not visible.',
    facts: ['The clouds of Venus race around the planet in 4 days, but the planet takes 243 days to turn!', 'The clouds of Venus are acid, not water.'],
    sources: [NASA('Venus'), { label: 'Parker Solar Probe and the lightning of Venus', url: 'https://earthsky.org/space/lightning-on-venus-whistler-waves-parker-solar-probe/' }],
    pictures: ['V-today-0.jpg', 'V-0.jpg'],
  },
  {
    id: 'mars', name: 'Mars', today: '70 white puffs, a quarter opaque.', real: 'Thin wisps of water ice; morning fog in canyons; long wave clouds on the lee side of the volcanoes; high clouds of CO₂ ice; a polar hood in winter.',
    events: 'Dust devils, one of them about 2 km tall and 60 m wide. Dust storms that can cover the planet (2018). Geysers of CO₂ in spring. A blue sunset.',
    proposal: 'A: thin wisps in patches, no puffs. B: dust devils that walk over the plains. Later: the long cloud of Arsia Mons in the morning, a dust storm far away.',
    sky: 'Butterscotch by day, blue around a low Sun. The Sun has 43% of its light on Earth.',
    facts: ['On Mars the sky is orange and the sunset is blue, the opposite of home!', 'Mars has dust tornadoes taller than mountains.'],
    sources: [NASA('Mars'), { label: 'ESA, the long cloud of Arsia Mons', url: 'https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Mars_Express_unlocks_the_secrets_of_curious_cloud' }, { label: 'Perseverance sees a 2 km dust devil', url: 'https://www.theweathernetwork.com/en/news/science/space/nasa-perseverance-spots-2-km-tall-dust-devil-on-mars' }, { label: 'JPL, the dust storm of 2018', url: 'https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/' }],
    pictures: ['M-today-1.jpg', 'M-2.jpg'],
  },
  {
    id: 'moon', name: 'The Moon', today: 'No air, no clouds.', real: 'No clouds.',
    events: 'Flashes on the night side when small stones from space hit the ground; telescopes on Earth see them. A glow of floating dust at the horizon: not certain (LADEE found much less dust than expected).',
    proposal: 'Keep the black sky. B: short sparks on the night side.',
    sky: 'Black, with stars at each hour.',
    facts: ['Tiny space pebbles hit the Moon and make little sparks of light.'],
    sources: [{ label: 'Universe Today, impact flashes on the Moon', url: 'https://www.universetoday.com/articles/how-amateur-astronomers-can-help-ladee' }, { label: 'Live Science, LADEE and the dust of the Moon', url: 'https://www.livescience.com/24993-moon-dust-ladee-lunar-mission.html' }],
    pictures: ['L-today-1.jpg', 'L-2.jpg'],
  },
  {
    id: 'ceres', name: 'Ceres and Vesta', today: 'No air, no clouds.', real: 'No clouds. Ceres let out some water vapour in 2014; a faint daily haze over Occator crater is not certain.',
    events: 'The bright spots of Ceres are salt from water that came up from below.',
    proposal: 'Keep as today.',
    sky: 'Black. The Sun has 13% to 18% of its light on Earth.',
    facts: ['Ceres has shiny white spots made of salt, like baking soda!'],
    sources: [{ label: 'The Planetary Society, a haze in Occator', url: 'https://www.planetary.org/articles/0721-dawn-at-ceres-a-haze-in-occator-rivkin' }],
  },
  {
    id: 'jupiter', name: 'Jupiter', today: '1,500 grey puffs in groups of 7, the same shape as on each world.', real: 'Three layers in about 71 km: ammonia ice on top (white zones), ammonium hydrosulfide (tan and brown), water deep down. Belts are gaps where the deeper layers show.',
    events: 'More than a dozen jets that change direction, up to 539 km/h. The Great Red Spot turns in about 6 days. Lightning in the water clouds, and slushy hail of ammonia ("mushballs"). Rings of cyclones at the poles: 8 in the north, 5 in the south. Large aurorae.',
    proposal: 'A: white zones and brown gaps, bands that move with the real jets. B: the Great Red Spot turns where the map paints it, storm towers flash with lightning. C: floaters.',
    sky: 'Cream to tan haze. The Sun has 1/27 of its light on Earth. There is no ground.',
    facts: ['The Great Red Spot is a storm bigger than Earth that has blown for more than 300 years.', 'Jupiter has slushy ammonia snowballs called mushballs!'],
    sources: [NASA('Jupiter'), { label: 'JPL, shallow lightning and mushballs', url: 'https://www.jpl.nasa.gov/news/shallow-lightning-and-mushballs-reveal-ammonia-to-nasas-juno-scientists/' }, { label: 'JPL, the Great Red Spot gets smaller', url: 'https://www.jpl.nasa.gov/images/pia23436-a-storm-of-change/' }],
    pictures: ['T-0.jpg', 'B-0.jpg'],
  },
  {
    id: 'saturn', name: 'Saturn', today: '1,500 cream puffs in groups of 7.', real: 'Layers as on Jupiter, but deeper and under a thicker haze, so the bands are soft yellow, brown and grey.',
    events: 'Winds up to 500 m/s at the equator. The hexagon at the north pole. The Great White Spot storm about each 30 years (2010 to 2011), with lightning up to 10 times each second. Ring rain: dust from the rings falls into the air.',
    proposal: 'A: a soft haze over the bands, cream tufts. B: storm towers with lightning in "storm alley" (35° N).',
    sky: 'Hazy butter yellow, with the rings as a large arch. The Sun has 1/91 of its light on Earth.',
    facts: ['Saturn has a giant hexagon storm at the top, like a honeycomb!', 'Bits of the rings of Saturn rain down into its air.'],
    sources: [NASA('Saturn'), { label: 'ESA, the greatest storm of Saturn', url: 'https://www.esa.int/About_Us/ESAC/Saturn_s_greatest_storm' }, { label: 'University of Colorado, ring rain', url: 'https://www.colorado.edu/today/2018/10/04/its-final-days-cassini-bathed-ring-rain' }],
    pictures: ['S-today-0.jpg', 'S-B-0.jpg'],
  },
  {
    id: 'uranus', name: 'Uranus', today: '1,500 pale cyan puffs in groups of 7.', real: 'Almost no features: a pale haze over a deck of hydrogen sulfide, and a few thin, bright clouds of methane.',
    events: 'Winds up to 900 km/h, backwards at the equator. The planet lies on its side, so one half has a dark winter of 21 years. The aurorae are far from the poles.',
    proposal: 'A: a pale haze with soft bands and a few bright clouds, no puffs.',
    sky: 'Soft cyan. The Sun has 1/368 of its light on Earth.',
    facts: ['Uranus rolls around the Sun on its side.', 'Its clouds smell like rotten eggs!'],
    sources: [NASA('Uranus'), { label: 'Chemistry World, the clouds of Uranus', url: 'https://www.chemistryworld.com/3008937.article' }],
    pictures: ['U-today-0.jpg', 'U-A-0.jpg'],
  },
  {
    id: 'neptune', name: 'Neptune', today: '1,500 white puffs in groups of 7.', real: 'White streaks of methane ice high above a deeper deck. Voyager 2 saw their shadows on the deck about 50 km below.',
    events: 'The fastest winds of the Solar System, more than 2,000 km/h, backwards at the equator. The Great Dark Spot (1989) with a bright companion cloud; a new dark spot in 2016. The "Scooter" cloud.',
    proposal: 'A: high streaks with their shadows, no puffs. B: the Great Dark Spot turns where the map paints it, with bright clouds at its south edge.',
    sky: 'Noon looks like a dim dusk: the Sun has about 1/900 of its light on Earth.',
    facts: ['Neptune has the fastest winds anywhere, faster than a jet plane.', 'Its white clouds float so high that they make shadows on the clouds below.'],
    sources: [NASA('Neptune'), { label: 'JPL, the clouds of Neptune and their shadows', url: 'https://www.jpl.nasa.gov/images/pia00058-neptune-clouds-showing-vertical-relief/' }],
    pictures: ['N-today-0.jpg', 'N-0.jpg'],
  },
]

// ---- The winds in the game ------------------------------------------------------------------------------

/** The wind of the clouds in the game at some latitudes, from the real jets. */
export const WIND_TABLE = (['jupiter', 'saturn', 'uranus', 'neptune', 'venus'] as const).map(kind => ({
  kind,
  rows: [0, 12, 23, 45, 65].map(lat => ({ lat, real: Math.round(jet(JETS[kind], lat)), game: +(jet(JETS[kind], lat) * WIND_SCALE).toFixed(1) })),
}))

// ---- What the game has today ------------------------------------------------------------------------------

export const FINDINGS: [string, string][] = [
  ['The airless worlds already have no clouds', 'Mercury, the Moon, Ceres and Vesta have no air and no clouds today: their cloud height is 0 in WORLD_DATA and in createWorlds() of src/worlds.ts. The worlds with air are the problem: they all get the same kind of cloud.'],
  ['One puff for six worlds', 'buildClouds() in src/worlds.ts gives Venus, Mars and the four giants the same puff: one icosahedron of 80 triangles, flattened, in groups of 7 at random places. Only the colour, the number (70 on Mars, 1,500 on the others) and the opacity change.'],
  ['The puffs are not the clouds of these worlds', 'Venus has one closed deck and no puffs. Mars has thin wisps. Jupiter and Saturn have bands. Uranus has almost nothing. Neptune has long streaks. No world has groups of round puffs at random places.'],
  ['The clouds do not move with the winds', 'All the cloud groups turn at the same slow rate (0.001 rad/s in the loop of src/main.ts). The real winds go in opposite directions in bands, and the equators of Uranus and Neptune go backwards.'],
  ['The far look is good', 'The painted maps of the planet look study (src/planet-paint.ts) are right from space: the bands, the Great Red Spot, the hexagon, the Great Dark Spot. The puffs show only inside the air (puffsVisibleAt() in src/planet-look.ts). So the work is only inside the air.'],
  ['Nothing happens on the other worlds', 'Earth has weather, seasons and 31 kinds of animals; Blossom Haven has magic seasons and 17 creatures. The other eleven worlds have nothing that moves or happens, except the slow turn of the clouds.'],
  ['The storm tasks have no storm inside the air', 'The search stars of Jupiter and Neptune ask the child to find the red storm and the dark storm under the clouds (searchDone() in src/stickers.ts). Inside the air the storm is only paint on the map, under grey puffs.'],
  ['The colour of Neptune is a choice', 'NASA processed the pictures of Voyager 2 again in 2024: the real Neptune is pale blue, close to Uranus. The game has the deep blue of the older pictures. The study keeps the deep blue and asks you.'],
]

// ---- Research: life in the clouds and how games do it --------------------------------------------------

export const LIFE: { year: string; title: string; text: string; source: Source }[] = [
  { year: '1967', title: 'Life in the clouds of Venus?', text: 'Harold Morowitz and Carl Sagan wrote in Nature about small floating cells in the mild layer of the clouds of Venus, 48 to 60 km up.', source: { label: 'ScienceDaily', url: 'https://www.sciencedaily.com/releases/2018/03/180330171302.htm' } },
  { year: '1976', title: 'Floaters, sinkers and hunters', text: 'Carl Sagan and Edwin Salpeter calculated if life could float in the air of Jupiter: tiny "sinkers", gas bags a kilometre wide ("floaters"), and "hunters". It was a calculation, not a detection. Adolf Schaller painted them for Cosmos (1980).', source: { label: 'Astronomy', url: 'https://www.astronomy.com/science/hunters-floaters-and-sinkers/' } },
  { year: '2020', title: 'Phosphine on Venus', text: 'A team reported phosphine in the clouds of Venus, a possible sign of life. A new analysis found much less, and other teams found other causes. Most scientists doubt it.', source: { label: 'Universe Today', url: 'https://www.universetoday.com/148865/scientists-have-re-analyzed-their-data-and-still-see-a-signal-of-phosphine-at-venus-just-less-of-it/' } },
]

export const GAMES: [string, string][] = [
  ['Outer Wilds', 'One large, slow event for each world that a player can read: the cyclones of Giant\'s Deep throw islands into space, the sand of Ash Twin pours to its twin. The lesson: one event for each world, and it changes in time.'],
  ['No Man\'s Sky (Origins, 2020)', 'Weather moves across a planet; it does not cover all of it. Storms make the clouds dark and bring lightning. The cover of clouds changes from planet to planet.'],
  ['Kerbal Space Program with EVE', 'Cloud layers are shells with a texture that moves, one draw call for each layer; near clouds are particles. The study uses the same plan: shells for the layers and tufts for the near clouds.'],
  ['Horizon Zero Dawn and Flight Simulator', 'Clouds made by ray marching through a volume look the most real, but they need about 2 ms of a console graphics card. That is too much for the phone of a child; the study does not use them.'],
]

// ---- The plan and the decisions --------------------------------------------------------------------------------

export const PLAN: [string, string][] = [
  ['The cloud layers of A', 'Move the shells, the tufts and the data of the jets from the study to src/ (for example src/skies/), with tests for the jets and the bands. Replace the puffs of buildClouds() for Venus, Mars and the giants. Keep the painted maps for the far look.'],
  ['The events of B, one world at a time', 'Jupiter first (the Great Red Spot and the storm towers), then Mars (dust devils), Neptune (the dark spot), Venus (the acid rain), Saturn (the storm towers) and the Moon and Mercury (the sparks). Each event stops with reduced motion, and a phone gets half of it.'],
  ['The words of the friend and the book', 'One true fact for each event, as on this page, in the notes of the fairy friend. The Jupiter and Neptune search stars then find a storm that turns.'],
  ['The browser checks', 'A check for each world: the right parts show inside the air and not from space, the draw calls stay inside the budget, and the bench numbers of the phone page do not go up.'],
]

export type Decision = { id: string; title: string; why: string; options: string[] }
export const DECISIONS: Decision[] = [
  { id: 'option', title: 'Which option do we build?', why: 'B gives each world its real clouds and one real event. A is only the clouds. C adds imagined life to B.', options: ['B · the weather of each world (recommended)', 'A · true clouds only', 'C · B and the floaters', 'None of them for now'] },
  { id: 'floaters', title: 'The floaters of Jupiter', why: 'They are real science history, but they are not real. Earth follows the real world; Blossom Haven is the place of magic.', options: ['Leave them out: the planets stay real', 'Add them, with "imagined by scientists" in the book and the friend', 'Only a page in the book, not in the flight'] },
  { id: 'uncertain', title: 'Things that science is not sure of', why: 'The lightning of Venus and the dust glow of the Moon are not certain.', options: ['Leave them out', 'Keep them, and the friend says "scientists are not sure"'] },
  { id: 'first', title: 'Which world first?', why: 'Jupiter is the largest change and has a search task for its storm. Mars is the closest to Earth in the book.', options: ['Jupiter, then Mars', 'Mars, then Jupiter', 'All the giants, then Venus and Mars'] },
  { id: 'wind', title: 'The speed of the winds', why: `The clips show the real jets at ${WIND_SCALE * 100}% of their speed: a jet of 100 m/s moves the clouds 4 m/s, and the fairy flies 11 to 32 m/s.`, options: ['As in the clips', 'Faster, so a child sees the bands slide', 'Slower and calmer'] },
  { id: 'neptune', title: 'The colour of Neptune', why: 'The real Neptune is pale blue, close to Uranus (NASA, 2024). The game has the deep blue of the older pictures.', options: ['Keep the deep blue', 'Change to the pale blue of the new pictures'] },
]
