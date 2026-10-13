/**
 * The ten ideas of the learn and play study (F11 to F20), the findings in the game of today, and
 * the decisions. The page (main.ts) shows them; each idea has a clip from the lab (features/).
 * The numbers continue the feature ideas study (F1 to F10).
 */
export type FeatureId = 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18' | 'F19' | 'F20'
export type Size = 'S' | 'M' | 'L'
export type Group = 'Learn' | 'Play'
export type Idea = {
  id: FeatureId
  name: string
  group: Group
  /** One line for the card. */
  line: string
  /** What the child sees and does. */
  child: string
  /** What the child learns, or why the child comes back. */
  gain: string
  /** Where the feature goes in the game code. */
  where: string
  /** What the game has already. */
  ready: string
  size: Size
  /** A limit or a risk to know before the work starts. */
  limit: string
  /** The main idea of the code, in TypeScript. */
  snippet: string
  proposed: boolean
}

export const SIZES: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

export const IDEAS: Idea[] = [
  {
    id: 'F11', name: 'Animal book', group: 'Learn', proposed: true, size: 'M',
    line: 'The first hello to each kind of animal puts its card in a book.',
    child: 'The fairy flies near a sheep. The sheep says hello, and a card shows: a picture of the sheep, its name and three picture facts. The card goes into a book with one place for each animal. Earth has four animals, and Blossom Haven has five story creatures.',
    gain: 'The names of the animals, what each one eats and gives, and which animals are real and which are from stories.',
    where: '<code>greet()</code> in <code>src/creatures/population.ts</code> returns the number of new hellos. It can return the kind of each creature too. A new <code>src/animal-book.ts</code> keeps the book, as <code>src/sticker-book.ts</code> keeps the stickers.',
    ready: 'The creature hello, the four animals of Earth (<code>src/creatures/habitat.ts</code>) and the five fairytale creatures (<code>src/creatures/fairytale.ts</code>), each with a name and a note. The pictures of the cards come from the creature models.',
    limit: 'A child of 5 reads little, and the voice (F2) is rejected. The card must work with pictures only. Nine cards are a small book: more animals need new models.',
    snippet: `// src/creatures/population.ts: greet() also says who said hello
const kinds: Species[] = []
// ... inside the loop of greet(), when a hello starts:
kinds.push(residents[index].kind)
return kinds

// src/main.ts, animate()
for (const kind of world.creatures?.greet(delta, fairy.position) ?? []) {
  if (animalBook.add(world.kind, kind)) showAnimalCard(kind)   // the first hello only
}`,
  },
  {
    id: 'F12', name: 'Count and shape rings', group: 'Learn', proposed: true, size: 'S',
    line: 'The sparkle rings count from one to five with the child.',
    child: 'A line of rings has dots: one dot on the first ring, two on the next, to five. When the fairy flies through a ring, its number shows large with the same dots, and one note of a rising scale plays. Other lines can use shapes: a circle, a triangle, a square, a star.',
    gain: 'To count to five, to join a number of dots with a numeral, and later the names of the shapes.',
    where: '<code>createSparkleRings()</code> in <code>src/rings.ts</code>. A line of rings keeps the order of its rings (<code>RingPlacement</code>), so a ring knows its number in the line. The note uses <code>playChime()</code> in <code>src/main.ts</code>.',
    ready: 'The lines of rings on Earth (five lines), the Moon and Blossom Haven (three lines each), the burst, the chime and the longer trail.',
    limit: 'A line has three to seven rings (<code>RING_LINE_MAX</code>), and a child can enter a line in the middle or from the far end. The count must follow the order in which she takes the rings, not the place of a ring in the line.',
    snippet: `// src/rings.ts: the count follows the order in which she takes the rings of one line
if (ringPass(from, to, ring.centre, ring.axis)) {
  const line = lines[ring.line]
  line.count = time - line.lastAt < COUNT_GAP ? line.count + 1 : 1
  line.lastAt = time
  onTake(ring, line.count)       // src/main.ts shows the number and the dots
  playChime([SCALE[(line.count - 1) % SCALE.length]])
}`,
  },
  {
    id: 'F13', name: 'Size line-up', group: 'Learn', proposed: false, size: 'S',
    line: 'Two worlds side by side at their real proportions.',
    child: 'A card in Worlds shows the Moon and Earth at the same size. Then the Moon gets small, to its real proportion, and a row of Moons goes across Earth: one, two, three, four. The next cards do the same for Earth and Jupiter, and for Jupiter and the Sun.',
    gain: 'Big and small, and how many of one world go across a larger one. The sizes in the flight of the game are not real, so the card is the place where the child sees the real proportions.',
    where: 'A new part of the card of a world in <code>src/adventure.ts</code> (Worlds), with the real diameters in <code>src/stickers.ts</code>.',
    ready: 'The cards of Worlds and the pictures of the worlds. The clip takes each picture from the engine: the world from space, on its day side.',
    limit: 'In the flight, Jupiter is 2.1 times Earth, not 11 times. The card must say that these are the real sizes, or the child sees two different answers. The Sun is 109 times Earth: a pair must stay near 10 to 1 to show both worlds.',
    snippet: `// src/stickers.ts: the real diameter of each world, in km
export const DIAMETER_KM: Record<StickerId, number> = { moon: 3475, earth: 12742, jupiter: 139820, sun: 1392700, /* ... */ }

// src/adventure.ts: the card of a world compares it with the next larger world
const count = Math.round(DIAMETER_KM[large] / DIAMETER_KM[small])   // 4 Moons across Earth
row.replaceChildren(...Array.from({ length: count }, () => picture(small)))`,
  },
  {
    id: 'F14', name: 'Moon shapes diary', group: 'Learn', proposed: false, size: 'M',
    line: 'A diary keeps each shape of the Moon that the child sees.',
    child: 'The child looks at the Moon from Earth. The diary has five places: new Moon, crescent, half Moon, almost full and full Moon. A shape that she sees gets its place, with a soft chime. The Moon of the game changes shape in 300 s, so one or two visits fill the diary.',
    gain: 'The Moon changes shape in a cycle, and the bright side is the side toward the Sun.',
    where: '<code>updateNearestWorld()</code> in <code>src/main.ts</code> has the Sun, Earth and the Moon. The angle between the Moon and the Sun, seen from the fairy, gives the shape. A new <code>src/moon-diary.ts</code> keeps the diary.',
    ready: 'The Moon has real phases (<code>src/moon.ts</code>, <code>src/sun-shading.ts</code>): its night side is dark from far away, and the fog does not hide it. A lunar month is 300 s at 1× World speed.',
    limit: 'A new Moon is in the day sky, near the Sun, and is almost invisible. The diary needs a rule for it, for example "the Moon hides today". Clouds and the day sky hide the Moon too.',
    snippet: `// src/moon-diary.ts
export function moonShape(fairy: Vector3, moon: Vector3, sun: Vector3) {
  const angle = degrees(moon.clone().sub(fairy).angleTo(sun.clone().sub(fairy)))
  return angle < 18 ? 'new' : angle < 68 ? 'crescent' : angle < 112 ? 'half' : angle < 158 ? 'gibbous' : 'full'
}

// src/main.ts: the Moon is in the view, the fairy is on Earth, and the sky is clear
if (nearestWorld.kind === 'earth' && moonInView() && skyVisibility > 0.5) diary.see(moonShape(fairy.position, moon, sun))`,
  },
  {
    id: 'F15', name: 'Nature stamps', group: 'Learn', proposed: true, size: 'M',
    line: 'A stamp for each climate belt of Earth and each garden of Blossom Haven.',
    child: 'The fairy flies from the palm beach to the north. Over each new belt a round stamp shows, with a picture and the name: palm beach, jungle, savanna, desert, leaf forest, pine forest, snow line. Blossom Haven gives a stamp for each of its four gardens and each of its four magic seasons.',
    gain: 'The plants and the animals change with the place: warm near the equator and cold near the poles. On Blossom Haven the stamps are magic, not a copy of Earth.',
    where: '<code>zoneNameAt()</code> in <code>src/foliage/build.ts</code> gives the belt below the fairy, and <code>magicAt()</code> in <code>src/magic-seasons.ts</code> gives the magic season. <code>updateNearestWorld()</code> calls them now for the flight panel.',
    ready: 'The seven belts of Earth (<code>BELTS</code> in <code>src/foliage/zones.ts</code>), the four gardens (<code>GARDENS</code>), the four seasons of Earth and the four magic seasons. The flight panel shows the belt name.',
    limit: '<code>TODO.md</code> has "a sticker for each season" as an open step of the weather: this idea includes it. The belts follow a rule, so each new Earth has them, but a small Earth can have a belt with little land. 7 belts, 4 seasons, 4 gardens and 4 magic seasons are 19 stamps.',
    snippet: `// src/main.ts, updateNearestWorld(): the flight panel has the name already
const zone = zoneNameAt(world, fairy.position)
regionLabel.textContent = zone ?? 'Below the clouds'
if (zone && flying && stampBook.add(world.kind, zone)) showStamp(zone)   // the first time only`,
  },
  {
    id: 'F16', name: 'Picture thermometer', group: 'Learn', proposed: false, size: 'S',
    line: 'A thermometer with a face says if a world is hot or cold.',
    child: 'Near Venus the thermometer goes up and turns red, and the face is hot. Near Uranus it goes down and turns blue, and the face is cold. It has no numbers. On Earth and on Blossom Haven the face is happy.',
    gain: 'A world can be hot or cold, and the worlds near the Sun are hot. Venus is hotter than Mercury, because its clouds hold the heat.',
    where: 'A small part of the nearest-world panel in <code>index.html</code>, with its level set in <code>updateNearestWorld()</code> in <code>src/main.ts</code>. The levels are a table in <code>src/stickers.ts</code>.',
    ready: 'The nearest-world panel and the near test. The sticker facts say that Venus is the hottest planet and Uranus the coldest.',
    limit: 'The screen study removed parts from the screen, and this adds one. On a phone the panel is small. A place for it in the card of a world in Worlds is the other option.',
    snippet: `// src/stickers.ts: from 0 (the coldest) to 1 (the hottest)
export const WARMTH: Record<StickerId, number> = { sun: 1, venus: 0.92, mercury: 0.8, earth: 0.55, /* ... */ uranus: 0.04 }

// src/main.ts, updateNearestWorld()
const goal = near ? WARMTH[world.kind] : 0.5
warmth += (goal - warmth) * (1 - Math.exp(-delta * 2.2))
thermometer.style.setProperty('--level', String(warmth))`,
  },
  {
    id: 'F17', name: 'Cottage garden', group: 'Play', proposed: true, size: 'M',
    line: 'Each new sticker grows a flower of that world next to the cottage.',
    child: 'A new sticker gives a seed. The fairy brings it home, the seed falls to its bed, and a flower grows with sparkles. The middle of the flower is the world: the flower of Saturn has a ring. Thirteen stickers make a garden of thirteen flowers.',
    gain: 'A reason to fly home after each new world, and a picture of the progress with no number and no score.',
    where: '<code>buildCandyEcosystem()</code> in <code>src/candy.ts</code> builds the cottage and its scenery. A new <code>src/cottage-garden.ts</code> adds one flower for each sticker of the saved book, and grows a new one at the arrival.',
    ready: 'The cottage, the saved sticker book, the flower guide that leads home, and the arrival test at the cottage. Blossom Haven keeps one landscape, so the garden has a fixed place.',
    limit: 'The lollipop grove is around the cottage, and the pegasus foals circle 15 m from it. Thirteen flowers need a clear bed. The home moves in the solar system each 5 minutes: the garden moves with it.',
    snippet: `// src/cottage-garden.ts
export function createCottageGarden(home: World, book: Book) {
  const beds = gardenBeds(home)                       // 13 clear places near the door
  const flowers = book.arrived.map((id, index) => plant(id, beds[index]))
  return {
    /** A new sticker waits as a seed until the fairy is at the cottage. */
    arrive(book: Book) { for (const id of book.arrived.slice(flowers.length)) flowers.push(grow(id, beds[flowers.length])) },
  }
}`,
  },
  {
    id: 'F18', name: 'Looks to earn', group: 'Play', proposed: false, size: 'M',
    line: 'A search star opens a new look that comes from its world.',
    child: 'The fairy flies over the rings of Saturn and gets its search star. A gift opens: the Ring trail, a trail of small gold rings. Each world has one gift, for example moonlight wings from the Moon. All the looks of today stay open from the start.',
    gain: 'A second reason to do each search task, and a gift that the child can show: the look stays on the fairy.',
    where: '<code>lookOptions</code> in <code>src/customization.ts</code> gets a <code>gift</code> field for a look that a world opens. The look menu shows a closed gift for it. <code>stickerBook.find()</code> opens it.',
    ready: 'The look menu with nine hair styles, twelve wings, four trails and ten colours for each part, and the thirteen search stars.',
    limit: 'Thirteen gifts are thirteen new looks to design and build: this is most of the work. A trail is the smallest (<code>TRAIL_DESIGNS</code> in <code>src/fairy-trail.ts</code>), and a wing is the largest. A child must never lose a look that she has.',
    snippet: `// src/customization.ts
export const trailOptions = [
  { id: 'pixie', name: 'Pixie dust' },
  // ...
  { id: 'rings', name: 'Ring trail', gift: 'saturn' },     // open after the search star of Saturn
]
export const isOpen = (option: { gift?: StickerId }, book: Book) => !option.gift || book.found.includes(option.gift)`,
  },
  {
    id: 'F19', name: 'Fairy friend', group: 'Play', proposed: false, size: 'L',
    line: 'A small friend flies with the fairy.',
    child: 'After five hellos, a pegasus foal comes to fly with the fairy. It keeps a place at her side, comes a little late in each turn, and at times makes a happy loop around her. The friend has no task and no health. Later the child can select a different friend.',
    gain: 'Company in open space, where there is little to see, and a reason to say hello to the creatures.',
    where: 'A new <code>src/friend.ts</code>, updated after <code>updateFairy()</code> in <code>animate()</code>. The model comes from <code>createFairytaleCreature()</code> in <code>src/creatures/fairytale-models.ts</code>.',
    ready: 'The creature models, with their wing beat, and the hello count of <code>greet()</code>.',
    limit: 'One creature is 14 to 21 draw calls, and <code>TODO.md</code> has an open decision about a creature limit on a phone. The friend must keep up at 968 m/s in open space and must not go into the ground or into the camera. The foals live on Blossom Haven: a friend for Earth needs a bird model.',
    snippet: `// src/friend.ts
const offset = new THREE.Vector3(2.2, 0.5, 0.4)             // at her right side
export function updateFriend(friend: Friend, fairy: THREE.Object3D, moved: THREE.Vector3, delta: number) {
  goal.copy(offset).applyQuaternion(fairy.quaternion).add(fairy.position)
  // The friend moves with her, and comes to its place a little late.
  friend.root.position.add(moved).lerp(goal, 1 - Math.exp(-delta * 3.2))
  friend.root.quaternion.slerp(fairy.quaternion, 1 - Math.exp(-delta * 4))
}`,
  },
  {
    id: 'F20', name: 'Postcard album', group: 'Play', proposed: false, size: 'M',
    line: 'The game keeps the postcards, and the album asks for pictures.',
    child: 'The album has places with a small picture and a name: a duck, the Moon, a rainbow, a unicorn, the rings. The child takes a postcard near a duck. The postcard gets small and goes into its place. A picture with no place goes to the free pages.',
    gain: 'A reason to look for things and to use the camera, and pictures that the child can show later.',
    where: '<code>src/postcard-camera.ts</code> gets a Keep button next to Save. A new <code>src/album.ts</code> keeps the pictures in IndexedDB. The test "the picture shows a duck" uses the creature check of <code>searchProbe()</code> in <code>src/search-stars.ts</code>.',
    ready: 'The postcard camera (it downloads a PNG and keeps no picture), the stamp of the world on the card, and the checks of the search stars.',
    limit: 'A picture is large: the album needs a small copy (640 px) and a maximum, for example 24 pictures. <code>localStorage</code> is too small for pictures. The album stays on the device, as the postcards do. A rainbow is rare, because the weather is mostly sunny.',
    snippet: `// src/album.ts
export const ALBUM_LIMIT = 24
export async function keep(card: HTMLCanvasElement, world: StickerId, probe: SearchProbe) {
  const subject = ALBUM.find(item => item.shows(world, probe))?.id ?? null   // 'duck', 'moon', ...
  const picture = await smallCopy(card, 640)
  await store.put({ id: crypto.randomUUID(), subject, world, picture, at: Date.now() })
  await store.trim(ALBUM_LIMIT)                                              // the oldest free picture goes
  return subject
}`,
  },
]

export const ideaById = (id: FeatureId) => IDEAS.find(idea => idea.id === id)!

export const FINDINGS: [string, string][] = [
  ['The game has one book', 'The sticker book has 13 hello stickers and 13 search stars. The creatures, the belts, the Moon and the postcards give nothing to keep. Five of the ten ideas add a collection.'],
  ['The creatures say hello, and the game does not count it', '<code>greet()</code> in <code>src/creatures/population.ts</code> returns the number of new hellos. <code>src/main.ts</code> uses it only for the chime. Nine kinds of creature live in the game: four on Earth and five on Blossom Haven.'],
  ['The flight panel names the belt, and the name is small text', '<code>zoneNameAt()</code> gives the climate belt of Earth and the garden of Blossom Haven below the fairy. A child who does not read does not see it.'],
  ['The Moon has real phases', 'The night side of the Moon is dark from far away, a lunar month is 300 s, and the Moon shows from the ground of Earth (<code>src/moon.ts</code>). No part of the game tells the child about the shapes.'],
  ['The sizes in the flight are not real', 'Jupiter is 2.1 times Earth in the game (<code>WORLD_DATA</code> in <code>src/worlds.ts</code>), and 11 times in the real Solar System. The fact of the Jupiter sticker says that all the other planets fit inside it.'],
  ['Each look is open from the start', '<code>lookOptions</code> in <code>src/customization.ts</code> has no lock. A search star gives a gold star on a sticker and no other thing.'],
  ['The postcard leaves the game', '<code>src/postcard-camera.ts</code> downloads a PNG or opens the share sheet. The game keeps no picture.'],
  ['The text of the game needs a reader', 'The facts, the tasks and the names are text. The voice (F2) and the songs (F6) are rejected as built. Each clip of this study gives its message with a picture, a colour or a count first, and with a short word second.'],
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  { id: 'features', multi: true, title: '1 / Which ideas do you want in the game?', why: 'Select each idea to build. The four ideas marked "proposed" use parts that the game has, and each one gives the child a thing to keep.', options: IDEAS.map(idea => `${idea.id} — ${idea.name}${idea.proposed ? ' (proposed)' : ''}`) },
  { id: 'first', title: '2 / Which idea comes first?', why: 'Claude builds one idea at a time, on its own branch, and shows you each one before the next.', options: ['F12 — Count and shape rings (recommended: the smallest)', 'F15 — Nature stamps', 'F11 — Animal book', 'F17 — Cottage garden', 'Another idea: say which in the notes'] },
  { id: 'books', title: '3 / Where do the new books go?', why: 'The animal book, the Moon diary, the nature stamps and the album are four new collections. The screen study and the world book study made one book: Worlds.', options: ['Pages in Worlds, next to the stickers (recommended)', 'One new button: a "My books" book with a page for each collection', 'At the cottage: the child flies home to see the books'] },
  { id: 'words', title: '4 / How much text can a card have?', why: 'A child of 5 reads little. The voice is rejected as built, and a new voice needs its own study.', options: ['A picture, a name and picture facts, as in the clips (recommended)', 'Pictures only, with no words', 'Full sentences, and wait for the new voice study'] },
  { id: 'strip', title: '5 / Does a book show during the flight?', why: 'The clips show each book as a strip at the bottom of the screen, to make the idea clear. The screen study removed parts from the flight screen.', options: ['Only the note of a new card. The book is in Worlds (recommended)', 'The strip shows for a few seconds after a new card', 'The strip stays on the screen'] },
]
