/**
 * The twelve landmarks of the study, the findings in the Earth of the game, and the decisions.
 * The page (main.ts) shows them. shapes.ts gives the ground of each landmark, scenery.ts
 * gives its objects, and tours.ts gives its clip.
 */
export type LandmarkId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10' | 'L11' | 'L12'
export type Size = 'S' | 'M' | 'L'
/** The ground that the landmark needs: dry land, open sea, a coast with the sea to the south, or the snow near a pole. */
export type Ground = 'land' | 'sea' | 'coast' | 'polar'
export type Photo = { title: string; artist: string; licence: string; licenceUrl: string; page: string }
export type Landmark = {
  id: LandmarkId
  name: string
  /** The real place and its country. */
  real: string
  ground: Ground
  /** The radius of the patch in metres, and the size of one cell of its mesh. */
  radius: number
  cell: number
  /** The landmark has its own water inside this radius; the water of the game goes down there. */
  ownWater?: number
  /** One line for the card. */
  line: string
  /** Why the real place is famous. */
  iconic: string
  /** What the child sees in the game. */
  child: string
  /** How the study makes it. */
  build: string
  /** The parts that the game needs: ground only, objects, own water, motion. */
  parts: string
  size: Size
  limit: string
  proposed: boolean
  photo: Photo
}

export const SIZES: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }
/** Earth in the game: 220 base units × 1.25 (src/worlds.ts, src/proportions.ts). */
export const EARTH = { radius: 275, groundCell: 3.4, seed: 20261003 }

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

export const LANDMARKS: Landmark[] = [
  {
    id: 'L1', name: 'Grand Canyon', real: 'Grand Canyon, Arizona, United States', ground: 'land', radius: 78, cell: 1, size: 'S', proposed: true,
    line: 'A river at the bottom of red rock steps.',
    iconic: 'The Colorado River cut this canyon 446 km long and more than 1,800 m deep. Each step of its walls is one layer of rock with its own colour.',
    child: 'The meadow stops at an edge. The fairy flies down between red and cream walls, and follows the river along its bends.',
    build: 'Ground only. A bent line gives the river. The height goes up in seven steps with the distance from the line, and each step has the colour of its rock layer. The river bed is below the sea level of the game, so the water of the game fills it.',
    parts: 'Ground', limit: 'The river starts and stops inside the patch. A river that reaches the sea needs a place next to a coast.',
    photo: { title: 'Grand Canyon (Arizona, USA), Luftaufnahme -- 2012 -- 5964.jpg', artist: 'Dietmar Rabich', licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0', page: commons('Grand_Canyon_(Arizona,_USA),_Luftaufnahme_--_2012_--_5964.jpg') },
  },
  {
    id: 'L2', name: 'Mount Fuji', real: 'Mount Fuji and Lake Kawaguchi, Japan', ground: 'land', radius: 86, cell: 1.1, size: 'M', proposed: true,
    line: 'One snow cone above the clouds, with cherry trees at a lake.',
    iconic: 'Fuji is a volcano of 3,776 m, the highest mountain of Japan. Its cone is almost the same from each side, and it has snow for most of the year.',
    child: 'A white top shows above the clouds from far away. At its foot the fairy finds a lake with pink cherry trees.',
    build: 'One cone 44 m high with a small crater, gullies, a snow line that comes lower in the gullies, and a lake below sea level. 36 cherry trees and 170 dark trees are instances.',
    parts: 'Ground, trees', limit: 'The top is in the cloud layer of Earth, which starts at 42.5 m. In a cloud the view from the top is white mist.',
    photo: { title: 'Lake Kawaguchiko Sakura Mount Fuji 4.JPG', artist: 'Midori', licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/3.0', page: commons('Lake_Kawaguchiko_Sakura_Mount_Fuji_4.JPG') },
  },
  {
    id: 'L3', name: 'Sahara dunes', real: 'Erg Chebbi, Sahara, Morocco', ground: 'land', radius: 75, cell: 1, size: 'S', proposed: false,
    line: 'Gold dunes with sharp crests, and one oasis.',
    iconic: 'The wind makes dunes up to 150 m high in this sea of sand. Each dune has a gentle side toward the wind and a steep side away from it.',
    child: 'The fairy glides over waves of gold sand. A small pond with palm trees is between the dunes.',
    build: 'A wave with a gentle side and a steep side gives the dunes, and a noise field bends the crests. The steep side has a darker colour. The oasis is a pond below sea level with 13 palm trees.',
    parts: 'Ground, trees', limit: 'The game has no shadows from the ground, so the dunes show less contrast than the real ones at a low Sun.',
    photo: { title: 'Erg Chebbi in the evening light.jpg', artist: 'Thomas Fuhrmann', licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0', page: commons('Erg_Chebbi_in_the_evening_light.jpg') },
  },
  {
    id: 'L4', name: 'Ha Long Bay', real: 'Ha Long Bay, Vietnam', ground: 'sea', radius: 78, cell: 0.9, size: 'M', proposed: false,
    line: 'Stone towers with jungle tops, in a quiet sea.',
    iconic: 'About 1,600 limestone islands stand in this bay. Rain and sea made their steep walls during millions of years.',
    child: 'The fairy flies low over the water, between 22 grey towers with green tops. Three boats with orange sails are on the water.',
    build: '22 towers at fixed places. Each tower is an oval with steep sides, 13 to 32 m high, grey on the walls and green on the top. Three boats are instances.',
    parts: 'Ground, boats', limit: 'The walls are steep slopes, not vertical, so a tower looks like a cloth over a post. Real towers have caves and trees on ledges. This landmark needs rock objects to look right.',
    photo: { title: 'Vietnam 08 - 53 - Halong Bay (3171040702).jpg', artist: 'McKay Savage', licence: 'CC BY 2.0', licenceUrl: 'https://creativecommons.org/licenses/by/2.0', page: commons('Vietnam_08_-_53_-_Halong_Bay_(3171040702).jpg') },
  },
  {
    id: 'L5', name: 'Coral atoll', real: 'Lhaviyani Atoll, Maldives', ground: 'sea', radius: 72, cell: 1, ownWater: 42, size: 'M', proposed: true,
    line: 'A ring of white sand around a turquoise lagoon.',
    iconic: 'The Maldives have 26 atolls. An atoll is a ring of coral reef around a lagoon; its islands are only a few metres above the sea.',
    child: 'In the dark sea the fairy finds a bright ring: white islands with palm trees, and clear water with coral in pink, orange and purple.',
    build: 'A ring of sand islands, a shallow lagoon floor with coral colours, and a lagoon water of its own: a clear disc that is pale over shallow ground. The water of the game goes down under the disc.',
    parts: 'Ground, own water, trees', limit: 'The water of the game is one sphere with one colour. A lagoon needs a second water mesh, and the ducks of the game do not know it.',
    photo: { title: 'Maledives Atoll Lhaviyani (28800519036).jpg', artist: 'dronepicr', licence: 'CC BY 2.0', licenceUrl: 'https://creativecommons.org/licenses/by/2.0', page: commons('Maledives_Atoll_Lhaviyani_(28800519036).jpg') },
  },
  {
    id: 'L6', name: 'Antarctic ice', real: 'Weddell Sea, Antarctica', ground: 'polar', radius: 75, cell: 0.9, size: 'M', proposed: true,
    line: 'An ice shelf, blue icebergs and penguins.',
    iconic: 'A table iceberg breaks from an ice shelf. It has a flat top and steep sides, and about nine tenths of it are below the water.',
    child: 'Near the pole the fairy finds a white wall of ice, icebergs with blue sides in the sea, and penguins that stand at the edge.',
    build: 'A flat shelf 8 m high with a wavy front, and 15 icebergs: polygons with flat or pointed tops. The sides are blue and the tops are white. 30 penguins are instances of three parts.',
    parts: 'Ground, penguins', limit: 'The penguins stand still. The icebergs do not move, because they are part of the ground.',
    photo: { title: 'Tabular-iceberg weddellsea hg.jpg', artist: 'Hannes Grobe', licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0', page: commons('Tabular-iceberg_weddellsea_hg.jpg') },
  },
  {
    id: 'L7', name: 'Angel Falls', real: 'Angel Falls, Auyán-tepui, Venezuela', ground: 'land', radius: 74, cell: 0.9, size: 'L', proposed: true,
    line: 'A table mountain with the highest waterfall.',
    iconic: 'Angel Falls is the highest waterfall on Earth: 979 m from the edge of a table mountain. Much of the water becomes mist before it reaches the ground.',
    child: 'A mountain with a flat jungle top and pink walls stands over the forest. A white waterfall drops from its edge into a pool, in a cloud of mist.',
    build: 'A plateau 28 m high with a cliff around it. A stream, the waterfall and the mist are objects: two strips with a moving picture of streaks, and seven soft puffs. The pool and the river are below sea level. 190 jungle trees are instances.',
    parts: 'Ground, moving water, mist, trees', limit: 'This is the first water above the sea level of the game. The fairy flies through the waterfall with no effect.',
    photo: { title: 'Salto del Angel-Canaima-Venezuela18.JPG', artist: 'Diego Delso', licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/3.0', page: commons('Salto_del_Angel-Canaima-Venezuela18.JPG') },
  },
  {
    id: 'L8', name: 'Monument Valley', real: 'Monument Valley, Arizona and Utah, United States', ground: 'land', radius: 82, cell: 0.9, size: 'S', proposed: true,
    line: 'Red rock towers on a flat red desert.',
    iconic: 'Sandstone buttes stand up to 300 m above the valley floor. West Mitten and East Mitten each have a thin "thumb" of rock next to them.',
    child: 'Three great red towers and two thin spires stand on a red plain. The fairy flies between the two Mittens.',
    build: 'Ground only. Eight blocks with a square outline: each has a slope of fallen rock and a steep cap with dark layers. The floor has dots of grey-green bush.',
    parts: 'Ground', limit: 'The walls are steep, not vertical, as for Ha Long Bay.',
    photo: { title: 'Mittens at monument valley.jpg', artist: 'Jon Sullivan', licence: 'Public domain', licenceUrl: '', page: commons('Mittens_at_monument_valley.jpg') },
  },
  {
    id: 'L9', name: "Giant's Causeway", real: "Giant's Causeway, Northern Ireland", ground: 'coast', radius: 48, cell: 0.8, size: 'M', proposed: false,
    line: 'Stone columns with six sides, like steps into the sea.',
    iconic: 'About 40,000 basalt columns stand side by side. Most have six sides. They formed when lava cooled slowly, about 60 million years ago.',
    child: 'Dark stone steps go from a green cliff down into the sea. Each step is the top of a column with six sides.',
    build: '427 columns: one prism with six sides for each cell of a honeycomb grid, each with its own height in steps of 0.3 m and its own grey. The ground gives the cliff and the flight height.',
    parts: 'Ground, columns', limit: 'One column is 1.4 m wide, three times the real size, because the fairy is small. The mesh of the ground cannot make the columns; they must be objects.',
    photo: { title: 'Causeway-code poet-4.jpg', artist: 'code poet on Flickr', licence: 'CC BY-SA 2.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0', page: commons('Causeway-code_poet-4.jpg') },
  },
  {
    id: 'L10', name: 'Geirangerfjord', real: 'Geirangerfjord, Norway', ground: 'coast', radius: 84, cell: 1.1, size: 'M', proposed: false,
    line: 'A narrow arm of the sea between high walls.',
    iconic: 'A glacier cut this valley, and the sea filled it. The fjord is 15 km long, and waterfalls such as the Seven Sisters drop from its walls.',
    child: 'The fairy flies in from the sea along a winding water path. Walls with forest, thin waterfalls and snow tops stand on each side.',
    build: 'A mountain block with a bent channel below sea level, open to the sea at one end. Four thin waterfalls are strips on the walls. 27 dark trees stand on the gentle ground.',
    parts: 'Ground, moving water, trees', limit: 'It needs a coast with the sea to one side. On an Earth with no good coast the fjord opens to a lake.',
    photo: { title: 'Geirangerfjord from Ørnesvingen, 2013 June.jpg', artist: 'Ximonic (Simo Räsänen)', licence: 'CC BY-SA 3.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0', page: commons('Geirangerfjord_from_%C3%98rnesvingen,_2013_June.jpg') },
  },
  {
    id: 'L11', name: 'Rainbow hot spring', real: 'Grand Prismatic Spring, Yellowstone, United States', ground: 'land', radius: 52, cell: 0.6, size: 'M', proposed: true,
    line: 'A pool with rings of colour, steam and a geyser.',
    iconic: 'This is the largest hot spring of the United States, about 110 m wide. Tiny living things that like heat make the yellow, orange and red rings.',
    child: 'A round pool shines blue in the middle, then green, yellow, orange and red. Steam floats over it, and a geyser shoots water up every 8 s.',
    build: 'The colours are the ground: a colour for each distance from the centre, with thin arms at the edge. Twelve soft puffs make the steam. The geyser is 110 points on a simple throw path.',
    parts: 'Ground, steam, geyser', limit: 'The pool has no water surface; it is coloured ground. The steam does not change with the light of the night.',
    photo: { title: 'Grand prismatic spring.jpg', artist: 'Jim Peaco, National Park Service', licence: 'Public domain', licenceUrl: '', page: commons('Grand_prismatic_spring.jpg') },
  },
  {
    id: 'L12', name: 'Rainbow mountains', real: 'Zhangye Danxia, Gansu, China', ground: 'land', radius: 74, cell: 1, size: 'S', proposed: true,
    line: 'Hills with stripes of red, cream, gold and teal.',
    iconic: 'Layers of sandstone and minerals have different colours. The movement of the ground tilted the layers, and rain and wind cut the hills.',
    child: 'The fairy flies along ridges with bright stripes, as a layer cake that someone tilted.',
    build: 'Ground only. Ridges from a noise field, and a stripe colour that changes with the height and along one direction.',
    parts: 'Ground', limit: 'The stripes are as wide as two or three cells of the mesh. From far away they blend.',
    photo: { title: 'Colorful strata (Zhangye National Geopark).jpg', artist: 'Terry Wu', licence: 'CC BY-SA 2.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0', page: commons('Colorful_strata_(Zhangye_National_Geopark).jpg') },
  },
]

export const landmarkById = (id: LandmarkId) => LANDMARKS.find(landmark => landmark.id === id)!
/** The number of triangles of a patch: two for each cell inside the circle. */
export const patchTriangles = (landmark: Landmark, cell = landmark.cell) => Math.round(Math.PI * landmark.radius ** 2 / cell ** 2 * 2)

/** More real places with a shape that the same method can make. The study did not build them. */
export const NOT_BUILT: [string, string, string][] = [
  ['Uluru', 'Australia', 'One red rock on a flat plain. Ground only.'],
  ['Salar de Uyuni', 'Bolivia', 'A white salt plain that mirrors the sky. Needs a mirror material.'],
  ['Victoria Falls', 'Zambia and Zimbabwe', 'A river that drops into a long gap. Needs water above the sea, as Angel Falls.'],
  ['Cappadocia', 'Türkiye', 'Thin rock cones with stone caps. Ground and objects.'],
  ['Pamukkale', 'Türkiye', 'White steps with blue pools. Needs water above the sea.'],
  ['Great Blue Hole', 'Belize', 'A dark round hole in a pale reef. Uses the lagoon water of the atoll.'],
  ['Matterhorn', 'Switzerland and Italy', 'A sharp peak with four faces. Ground only.'],
  ['Kīlauea', 'Hawaii, United States', 'A crater with a lake of lava that glows at night. Ground and a glow material.'],
  ['Amazon River', 'Brazil', 'A wide river with loops in a flat forest. Ground and many trees.'],
  ['Rice terraces of Yuanyang', 'China', 'Hundreds of small flat steps with water. Needs water above the sea.'],
]

export const FINDINGS: [string, string][] = [
  ['One terrain rule for all of Earth', 'The Earth branch of <code>createTerrain()</code> (<code>src/terrain.ts:32-40</code>) adds three noise layers, river channels and ridges. Each place on Earth is a mix of the same five things: sea, meadow, river, hill and mountain.'],
  ['Four ground colours', '<code>buildGround()</code> (<code>src/worlds.ts:294-297</code>) uses sand below 0.7 m, grass, stone above 8.5 m, and snow above 12 m and near the poles. Earth has no red rock, no ice and no desert.'],
  ['One tree', '<code>buildVegetation()</code> (<code>src/worlds.ts:342-387</code>) puts one green cone tree and grass on ground from 1.1 to 8.5 m, with the same density everywhere.'],
  ['Cells of 3.4 m', 'The ground is a sphere of 512 × 256 cells (<code>src/worlds.ts:279</code>). On a radius of 275 m one cell is 3.4 m at the equator. A cliff, a rock tower or a stone column is smaller than one cell.'],
  ['One water, at the sea level', 'The water is one sphere at height 0 with one colour (<code>src/worlds.ts:317-328</code>). Ground below 0 is under water. A lake on a mountain, a waterfall and a pale lagoon are not possible today.'],
  ['The flight reads the same terrain', '<code>surfaceRadius()</code> (<code>src/worlds.ts:105-109</code>) reads <code>world.sample</code> for the flight and the camera. A landmark in the terrain rule stops the fairy with no new collision code.'],
  ['A new landscape at each visit', '<code>regenerateWorld()</code> (<code>src/worlds.ts:464-477</code>) gives Earth a new random seed when the fairy comes back from space. The Moon and Blossom Haven keep one landscape. A landmark needs a rule for its place on each new Earth.'],
  ['A small world', 'Earth is 1,728 m around. A patch of 150 m is one eleventh of the way around it. The study makes Mount Fuji 44 m high: 1 m in the game for 86 m of the real mountain.'],
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  { id: 'landmarks', multi: true, title: '1 / Which landmarks do you want on Earth?', why: 'Select each landmark to build in the game. The study proposes eight for the first step.', options: LANDMARKS.map(landmark => `${landmark.id} — ${landmark.name}${landmark.proposed ? ' (proposed)' : ''}`) },
  { id: 'places', title: '2 / Where do the landmarks stand?', why: 'Earth makes a new landscape at each visit. The study finds a place for each landmark on one fixed Earth.', options: ['All landmarks on each new Earth, at places that a rule finds (recommended)', 'Earth keeps one landscape, as the Moon and Blossom Haven, with each landmark at a fixed place', 'Three or four landmarks on each new Earth, a different set at each visit'] },
  { id: 'mesh', title: '3 / How sharp are the landmarks?', why: 'A patch with a fine mesh shows cliffs and towers. The ground of the game alone makes soft hills. Compare the two pictures in section 03.', options: ['A fine patch for each landmark, about 39,000 triangles each (recommended)', 'Only the ground of the game, with cells of 3.4 m, and the colours', 'A finer ground for all of Earth'] },
]
