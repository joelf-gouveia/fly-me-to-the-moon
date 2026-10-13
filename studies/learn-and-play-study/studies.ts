import type { FeatureId } from './model'

/**
 * One study for each idea of the learn and play study: three moments of its clip, what the game
 * has today for it, the design decisions, the build steps, and the checks. The page (main.ts)
 * shows the study of the selected idea. The first option of each decision is the recommendation.
 */
export type Moment = { t: number; caption: string }
export type Question = { id: string; title: string; why: string; options: string[] }
export type Study = {
  /** The question that the study answers. */
  question: string
  /** Three times of the clip, in seconds, each with a picture from the engine. */
  moments: [Moment, Moment, Moment]
  findings: [string, string][]
  questions: Question[]
  steps: string[]
  checks: string[]
}

export const STUDIES: Record<FeatureId, Study> = {
  F11: {
    question: 'How does a hello become a card that a child of 5 can read?',
    moments: [
      { t: 3, caption: 'The fairy flies low to the animals of the meadow.' },
      { t: 6.4, caption: 'The first hello to a sheep: its card shows, with a picture from the sheep model.' },
      { t: 8.6, caption: 'The sheep has its place in the book: 2 of 4.' },
    ],
    findings: [
      ['A hello has no memory', '<code>greet()</code> in <code>src/creatures/population.ts</code> returns the number of new hellos. <code>src/main.ts:1052</code> uses the number only to play the chime. The game does not record which kind of creature said hello.'],
      ['Nine kinds live in the game', 'Earth has the cow, the rabbit, the sheep and the duck (<code>src/creatures/habitat.ts</code>). Blossom Haven changes each one for a story creature and adds the pegasus foal (<code>replacements</code> in <code>src/creatures/fairytale.ts</code>): unicorn, kitsune kit, dragonling, Frog Prince.'],
      ['Each kind has its text', 'Each animal has a name and a note in <code>habitat.ts</code>, and each story creature has a name, a note and a story line in <code>fairytale.ts</code>. The creature study wrote them for a grown-up, not for a child.'],
      ['A creature says hello again after a rest', '<code>canSayHello()</code> in <code>src/creatures/hello.ts</code> allows a new hello after the rest time of <code>HELLO.rest</code>. So a card that needs three hellos is possible with no new rule.'],
    ],
    questions: [
      { id: 'F11-start', title: 'What starts a card?', why: 'The first hello is the simplest rule. More hellos give the child a reason to come back to the same animal.', options: ['The first hello to a kind of animal (recommended)', 'Three hellos: each hello adds a heart to the card, and three hearts complete it', 'A flight near the animal, with no hello'] },
      { id: 'F11-card', title: 'What does a card show?', why: 'A child of 5 reads little. The clip shows a picture, the name and three picture facts.', options: ['A picture, the name and three picture facts (recommended)', 'A picture and the name only', 'A picture, the name and one sentence'] },
      { id: 'F11-real', title: 'How does the book show real animals and story creatures?', why: 'The Blossom Haven sticker says that unicorns live only in stories. The book can teach the same difference.', options: ['Two pages: "Real animals" for Earth and "Story creatures" for Blossom Haven (recommended)', 'One page, with a mark on each card', 'One page, with no mark'] },
    ],
    steps: [
      '<code>greet()</code> returns the kinds of the creatures that say hello, not only their number.',
      'A new <code>src/animal-book.ts</code> keeps the kinds that the child has met, saved in <code>localStorage</code> as the sticker book is.',
      'The pictures of the cards come from the creature models, made one time at the start: <code>createCreature()</code> and <code>createFairytaleCreature()</code>.',
      'The card is a note in the look of the sticker note. The book is a page in Worlds.',
      '<strong>Reset sticker book</strong> in Settings removes the animal cards too.',
    ],
    checks: [
      'Unit tests: the first hello of a kind adds one card, a second hello adds none, and a saved book loads again.',
      'A browser check: a flight to a sheep gives the card, the book shows 1 of 4, and a reload keeps it.',
      'On a phone at 390 px: the card does not cover the arrows.',
    ],
  },
  F12: {
    question: 'How do the sparkle rings count with the child, from each direction?',
    moments: [
      { t: 1, caption: 'The dots over each ring show its number before the fairy arrives.' },
      { t: 4.3, caption: 'Two rings are done. The next ring shows three dots.' },
      { t: 7.2, caption: 'Five rings, five notes. The row at the bottom is full.' },
    ],
    findings: [
      ['A line has three to seven rings', '<code>RING_LINE_MAX</code> in <code>src/rings.ts</code> is 7. Earth has five lines, and Blossom Haven and the Moon have three lines each (<code>RING_WORLDS</code>). The rings of a line are 16 m apart (<code>RING.spacing</code>).'],
      ['Each ring plays the same two notes', '<code>RING_CHIME</code> is E5 and B5 for each ring. A ring comes back after 30 s of flight (<code>RING.returnSeconds</code>).'],
      ['The game knows the pass, not the order', '<code>ringPass()</code> tests if the fairy went through a ring in this frame. No code records which ring of a line came before.'],
      ['Earth gets new lines at each visit', '<code>sparkleRings.rebuild()</code> in <code>src/main.ts</code> makes a new safe line of rings after a new landscape. A count must not depend on a fixed place.'],
    ],
    questions: [
      { id: 'F12-length', title: 'How far does the count go?', why: 'The lines of the game have three to seven rings. A count to five is a good first goal for a child of 5.', options: ['Each line counts to its own length, from 3 to 7 (recommended)', 'Each line has five rings', 'The count goes on from line to line, to 10'] },
      { id: 'F12-show', title: 'What shows the number?', why: 'Dots teach the quantity, and a numeral teaches the sign. The clip shows the two.', options: ['Dots over the ring, and the numeral with the dots at the pass (recommended)', 'The numeral only', 'The dots only'] },
      { id: 'F12-order', title: 'What if she enters a line in the middle, or from the far end?', why: 'A child does not always start at the first ring.', options: ['The count follows the order in which she takes the rings: the first ring she takes is 1 (recommended)', 'Each ring keeps its number, so a line from the far end counts down', 'A line counts only from its first ring'] },
    ],
    steps: [
      'Each line of rings gets a count and the time of its last ring (<code>createSparkleRings()</code> in <code>src/rings.ts</code>).',
      'A pass gives the count to <code>src/main.ts</code>, which shows the numeral and the dots for one second.',
      'The note of a ring comes from a scale, with the count as its index. The two notes of today stay for a ring with no count.',
      'The dots over a ring are one sprite for each ring, from one small texture atlas, so a phone gets no extra draw call for each ring.',
    ],
    checks: [
      'Unit tests: the count from each end of a line, the count after a pause of more than the gap time, and the note for each count.',
      'The sparkle rings browser check gets a step: three rings in order give 1, 2 and 3.',
      'With reduced motion: the numeral shows with no bounce.',
    ],
  },
  F13: {
    question: 'How does a child see the real sizes of the worlds, when the flight sizes are not real?',
    moments: [
      { t: 1.6, caption: 'The Moon starts as large as Earth, then gets small to its real proportion.' },
      { t: 3.9, caption: 'A row of Moons goes across Earth and counts: four.' },
      { t: 10.9, caption: 'Ten Jupiters go across the Sun. Each picture comes from the engine.' },
    ],
    findings: [
      ['The flight sizes are for flight', '<code>WORLD_DATA</code> in <code>src/worlds.ts</code>: Jupiter has radius 470 and Earth 220, so Jupiter is 2.1 times Earth. In the real Solar System it is 11 times. The proportions study chose these sizes so that a child can fly around each world.'],
      ['The Moon is the one real proportion', '<code>MOON.radius</code> in <code>src/moon.ts</code> is 0.273 of Earth, as in the real Solar System.'],
      ['The facts speak of size', 'The Jupiter sticker says "All the other planets could fit inside it", and the Saturn sticker says that it could float in a giant bath (<code>STICKERS</code> in <code>src/stickers.ts</code>). No picture shows it.'],
      ['Worlds has a card for each world', '<code>src/adventure.ts</code> draws the card with the fact, the task and <strong>Fly there</strong>. Its picture is a coloured disc (<code>.planet-picture</code>), not a picture from the engine.'],
    ],
    questions: [
      { id: 'F13-place', title: 'Where is the size card?', why: 'The screen study made one book: Worlds.', options: ['In the card of a world in Worlds, as a "How big?" part (recommended)', 'A page of its own in Worlds, with all the pairs', 'A note in the flight, at the arrival at a world'] },
      { id: 'F13-pairs', title: 'Which worlds does a card compare?', why: 'A pair near 10 to 1 shows the two worlds. The Sun is 109 times Earth: Earth is then a dot.', options: ['Each world with the next larger step: the Moon and Earth, Earth and Jupiter, Jupiter and the Sun (recommended)', 'Each world with Earth', 'Each world with Blossom Haven, the home of the fairy'] },
      { id: 'F13-truth', title: 'How does the card agree with the flight?', why: 'In the flight Jupiter is 2.1 times Earth. A child can see two different answers.', options: ['The card says "real size", and the flight keeps its sizes (recommended)', 'No card for the giant planets and the Sun', 'Change the sizes of the flight (the proportions study decided against this)'] },
    ],
    steps: [
      'The real diameter of each world goes into <code>src/stickers.ts</code>, next to its fact.',
      'A picture of each world from the engine replaces the coloured disc of Worlds. The game makes the 13 pictures one time at the start.',
      'The card of a world gets the "How big?" part: the two pictures, the change of size and the row with its count.',
      'With reduced motion, the card shows the end state: the real proportion and the full row.',
    ],
    checks: [
      'Unit tests: the count of each pair from the real diameters (4, 11 and 10).',
      'The sticker book browser check gets a step: the card of Earth shows four Moons.',
      'On a phone at 320 px: the two pictures and the row stay inside the card.',
    ],
  },
  F14: {
    question: 'How does the child collect the shapes of a Moon that has real phases?',
    moments: [
      { t: 1.5, caption: 'Evening on Earth. The Moon is near the sunset: a crescent.' },
      { t: 5.5, caption: 'The Moon is a quarter of the sky from the Sun: a half Moon.' },
      { t: 9.5, caption: 'The Moon is far from the Sun: almost full. Three places of the diary are full.' },
    ],
    findings: [
      ['The phases are real', 'The night side of the Moon is dark from far away (<code>createMoonMaterial()</code> in <code>src/moon.ts</code>). The fog does not hide the Moon, so it shows from the ground of Earth.'],
      ['One cycle is 300 s', '<code>MOON.synodic</code> is 300 s at 1× World speed: 12 new Moons in a game year. World speed in Settings goes to 64×.'],
      ['The Moon lights the night', '<code>moonlightAt()</code> gives the night light of Earth from the place and the phase of the Moon. So the game has the angle between the Moon and the Sun at each frame.'],
      ['The weather can hide the sky', 'The stars show only where the night sky is clear (<code>skyVisibility</code> in <code>updateEnvironment()</code>). The same value can say if the Moon shows.'],
    ],
    questions: [
      { id: 'F14-see', title: 'When does a shape count?', why: 'The child must see the Moon, or the diary fills with no effort.', options: ['The fairy is on Earth, the Moon is in the view, and the sky is clear (recommended)', 'The fairy is near Earth, at each time', 'Only at night'] },
      { id: 'F14-new', title: 'What is the rule for the new Moon?', why: 'A new Moon is near the Sun in the day sky, and is almost invisible.', options: ['The diary fills it when the Moon is next to the Sun, with the line "The Moon hides today" (recommended)', 'The diary has four places, with no new Moon', 'The child flies to the Moon and finds its dark side'] },
      { id: 'F14-count', title: 'How many shapes?', why: 'The real names are eight, with a different name while the Moon grows and while it gets small.', options: ['Five: new, crescent, half, almost full, full (recommended)', 'Eight: the growing shapes and the shapes that get small', 'Three: crescent, half and full'] },
    ],
    steps: [
      'A new <code>src/moon-diary.ts</code>: the shape from the angle between the Moon and the Sun, seen from the fairy.',
      '<code>updateNearestWorld()</code> in <code>src/main.ts</code> tells the diary the shape when the Moon is in the view of the camera.',
      'A note in the look of the sticker note shows the new shape. The diary is a part of the Moon card in Worlds.',
      'The diary saves with the sticker book, and <strong>Reset sticker book</strong> removes it.',
    ],
    checks: [
      'Unit tests: the shape for each angle, and no shape when the Moon is below the horizon or behind clouds.',
      'The Moon browser check gets a step: a test time gives a full Moon over the meadow, and the diary gets it.',
      'A flight of one lunar month at 1×: count the shapes that a child gets with no help.',
    ],
  },
  F15: {
    question: 'How do the belt names of the flight panel become a thing to collect?',
    moments: [
      { t: 2, caption: 'The flight starts near the equator. The first stamps come fast.' },
      { t: 5, caption: 'A stamp shows over each new belt, with a picture and the name.' },
      { t: 9.5, caption: 'In the north: the pine forest and the snow line.' },
    ],
    findings: [
      ['The game names the belt at each frame', '<code>zoneNameAt()</code> in <code>src/foliage/build.ts</code> gives the belt of Earth and the garden of Blossom Haven below the fairy. <code>updateNearestWorld()</code> writes it in the flight panel as small text.'],
      ['Seven belts and four gardens', '<code>BELTS</code> in <code>src/foliage/zones.ts</code>: palm beach, jungle, savanna, desert, leaf forest, pine forest, snow line. <code>GARDENS</code>: lollipop grove, cotton candy orchard, mushroom glade, crystal peaks.'],
      ['Two sets of seasons', 'Earth has four seasons from the real date (<code>src/seasons.ts</code>). Blossom Haven has four magic seasons: Blossom time, Bubble time, Lantern time and Crystal time (<code>src/magic-seasons.ts</code>).'],
      ['A belt is a rule', '<code>zoneAt()</code> finds a belt from the cold and the moisture of a place. Each new Earth has the seven belts, at new places. A lap of Earth is 1,700 m.'],
    ],
    questions: [
      { id: 'F15-set', title: 'Which stamps come first?', why: 'The two worlds have 19 stamps: 7 belts, 4 gardens, 4 seasons and 4 magic seasons. The season stamps need a wait.', options: ['The 7 belts and the 4 gardens first, the seasons later (recommended)', 'All 19 stamps', 'The 7 belts of Earth only'] },
      { id: 'F15-count', title: 'When does a belt count?', why: 'In a fast flight the belt changes each few seconds. In the clip a stamp shows as soon as the belt changes.', options: ['After 2 s of flight below the clouds over the belt (recommended)', 'As soon as the name shows in the flight panel', 'Only in a low flight, less than 20 m above the ground'] },
      { id: 'F15-magic', title: 'What does Blossom Haven give?', why: 'Blossom Haven gets a magic version of each feature, not a copy of Earth.', options: ['A stamp for each garden and each magic season, with candy pictures (recommended)', 'A stamp for each garden only', 'No stamps: the book is for Earth'] },
    ],
    steps: [
      'A new <code>src/stamp-book.ts</code> keeps the stamps, with a picture and a colour for each belt and garden.',
      '<code>updateNearestWorld()</code> gives the belt name to the book, and the book counts the time over that belt.',
      'A round stamp shows over the flight for a moment. The book is a page in Worlds, under the cards of Earth and Blossom Haven.',
      'The season stamps come later, with the open step "a sticker for each season" of <code>TODO.md</code>.',
    ],
    checks: [
      'Unit tests: a belt counts after its time, a short crossing does not count, and a saved book loads again.',
      'A simulated lap of Earth on ten seeds: count the belts that a lap gives. A belt with little land must be possible to find.',
      'A browser check: a test move over the jungle gives its stamp.',
    ],
  },
  F16: {
    question: 'How does a child with no numbers see that a world is hot or cold?',
    moments: [
      { t: 0.6, caption: 'In open space the thermometer is in the middle, and the face is happy.' },
      { t: 3.6, caption: 'At Venus the level goes up and turns red, and the face is hot.' },
      { t: 9, caption: 'At Uranus the level goes down and turns blue, and the face is cold.' },
    ],
    findings: [
      ['The facts say hot and cold', 'The Venus sticker: "Venus is the hottest planet. Its thick clouds hold the heat in, like a blanket." The Uranus sticker: "Uranus is the coldest planet of all, even colder than Neptune." (<code>STICKERS</code> in <code>src/stickers.ts</code>)'],
      ['The flight shows no temperature', 'Venus has a golden haze and Mars has dusty air, but no part of the screen tells warm from cold. A flight to the Sun is the same as a flight to Neptune.'],
      ['The nearest-world panel has three lines', 'The name, the distance and the region (<code>index.html</code>). On a touch screen the panel is in <strong>Menu</strong> (<code>src/mobile.css</code>), so a child on a phone does not see it in the flight.'],
      ['The screen study removed parts', 'The screen study (<code>docs/ui-simplify-study.md</code>) moved the grown-up controls into Settings and kept four buttons. A new part on the flight screen goes against that direction.'],
    ],
    questions: [
      { id: 'F16-place', title: 'Where is the thermometer?', why: 'The clip shows it under the nearest-world panel. A phone has that panel in Menu.', options: ['In the card of a world in Worlds, and for a moment at the arrival at a new world (recommended)', 'Always on the flight screen, near a world', 'In the card of a world in Worlds only'] },
      { id: 'F16-sign', title: 'What gives the answer?', why: 'The clip uses a level, a colour, a face and one word.', options: ['The level, the colour and the face, with one word: HOT, WARM, NICE, COOL or COLD (recommended)', 'The level, the colour and the face, with no word', 'The same, and the degrees for a grown-up in Worlds'] },
      { id: 'F16-sides', title: 'Does a world have one level?', why: 'Mercury is very hot by day and very cold by night, because it has no air.', options: ['One level for each world (recommended)', 'The level follows day and night on the worlds with no air: Mercury and the Moon', 'One level, and the fact of Mercury tells about its night'] },
    ],
    steps: [
      'A level for each world goes into <code>src/stickers.ts</code>, in the order of the real temperatures.',
      'The thermometer is one small SVG, with its level and colour as CSS variables.',
      'The card of a world in Worlds shows it. The arrival note of a new world shows it for a moment.',
      'The faces are drawings of the game, not emoji: an emoji has a different look on each device.',
    ],
    checks: [
      'Unit tests: Venus is the hottest planet and Uranus the coldest, as the sticker facts say.',
      'A contrast check of the red and the blue on the dark panel and on the pink card.',
      'On a phone at 320 px: the thermometer stays inside the card of the world.',
    ],
  },
  F17: {
    question: 'How does the sticker book become a garden that grows at the cottage?',
    moments: [
      { t: 3, caption: 'The fairy flies home with a new sticker. Four flowers stand next to the cottage.' },
      { t: 6, caption: 'The seed of Saturn falls to its bed.' },
      { t: 9, caption: 'The flower of Saturn grows, with its ring. The garden has 5 of 13.' },
    ],
    findings: [
      ['Blossom Haven keeps one landscape', 'Earth and the planets get a new landscape at each visit. Blossom Haven does not (<code>updateNearestWorld()</code> in <code>src/main.ts</code>), so a garden has a fixed place there.'],
      ['The cottage has a clear zone', '<code>sceneryObstacles()</code> in <code>src/rings.ts</code> keeps a radius of 24 m around the cottage clear, for its garden and for the pegasus foals that circle 15 m from it.'],
      ['The home moves each 5 minutes', 'Blossom Haven moves to a new place in the solar system after 5 minutes of flight with no guide (<code>src/relocation.ts</code>). The flower guide leads the fairy home from each place.'],
      ['A sticker gives a note and no more', 'A new sticker shows a note and a fact (<code>src/sticker-book.ts</code>). The saved book has the list <code>arrived</code>, in the order of the visits.'],
    ],
    questions: [
      { id: 'F17-when', title: 'When does a flower grow?', why: 'A flower that grows at home gives a reason to fly home. A flower that grows at once needs no flight.', options: ['When the fairy comes to the cottage with a new sticker (recommended)', 'At once, with the new sticker: the garden is a surprise at the next visit', 'When the child drops the seed with a key or a button'] },
      { id: 'F17-beds', title: 'Where are the 13 beds?', why: 'The lollipop grove is around the cottage, and the creatures have paths there.', options: ['An arc in front of the door, in the order of the visits (recommended)', 'A ring around the cottage', 'Two rows along the path to the door'] },
      { id: 'F17-touch', title: 'What does a flower do?', why: 'A child wants to touch the things that she made.', options: ['It turns to the fairy and gives sparkles when she flies near (recommended)', 'It opens the card of its world', 'It stands still'] },
    ],
    steps: [
      'A new <code>src/cottage-garden.ts</code>: 13 beds near the door, clear of the candy and of the paths of the creatures.',
      'One flower model with a colour and a middle for each world. The flowers are one instanced mesh, so a phone gets few draw calls.',
      'The garden grows the flowers of the saved book at the start, and one new flower at an arrival with a new sticker.',
      '<strong>Reset sticker book</strong> removes the flowers.',
    ],
    checks: [
      'Unit tests: a bed for each of the 13 worlds, no bed in a plant or on a creature path, and one flower for each sticker of a saved book.',
      'The Blossom Haven browser check gets a step: an arrival with a new sticker grows one flower.',
      'The phone budget at 390 px with 13 flowers.',
    ],
  },
  F18: {
    question: 'How does a search star give a look, with no look taken away?',
    moments: [
      { t: 2, caption: 'The fairy flies over the rings of Saturn, with the trail of today.' },
      { t: 4, caption: 'The search star of Saturn opens a gift: the Ring trail.' },
      { t: 8, caption: 'The new trail: small gold rings that grow and fade behind her.' },
    ],
    findings: [
      ['Each look is open', '<code>lookOptions</code> in <code>src/customization.ts</code> has nine hair styles, twelve wings, four trails and ten colours for each part. No look has a lock.'],
      ['A search star gives a gold star', 'A search star puts a gold star on the sticker and plays a chime (<code>src/search-stars.ts</code>). The saved book has the list <code>found</code>.'],
      ['A trail is the smallest look', 'A trail is one entry of <code>TRAIL_DESIGNS</code> in <code>src/fairy-trail.ts</code>, made from options such as the rate, the size and the shape. A wing is a set of painted panels and a shader (<code>src/fairy-wings/</code>).'],
      ['The look saves in the browser', 'The look is in <code>localStorage</code> as <code>fairy-look</code>, and the book as <code>fairy-sticker-book</code>. A reset of the book removes the stars: a gift must have a rule for that.'],
    ],
    questions: [
      { id: 'F18-open', title: 'What opens a gift?', why: 'Each world has a hello sticker and a search star.', options: ['The search star of the world (recommended)', 'The hello sticker of the world', 'Two gifts for each world: one for the sticker and one for the star'] },
      { id: 'F18-first', title: 'How many gifts come first?', why: 'Thirteen gifts are thirteen new looks. A trail is the smallest look to build.', options: ['Three trails first: the Ring trail of Saturn, a rainbow trail of Earth and a bubble trail of Blossom Haven (recommended)', 'All 13 gifts in one step', 'One gift, to test the idea'] },
      { id: 'F18-menu', title: 'How does the look menu show a gift that is not open?', why: 'A child must see that there is more, and must not think that a thing is broken.', options: ['A gift box with the picture of its world (recommended)', 'Not at all: the gift is a surprise', 'The look in grey, with a lock'] },
    ],
    steps: [
      'A look in <code>src/customization.ts</code> gets a <code>gift</code> field with the world that opens it.',
      'The look menu shows a gift box for a look that is not open. A tap shows the task of that world.',
      '<code>stickerBook.find()</code> opens the gift, and the note of the search star shows it.',
      'A look that the child wears stays on her after a reset of the sticker book.',
    ],
    checks: [
      'Unit tests: a gift is open only with its star, each look of today is open with an empty book, and an old saved look loads.',
      'The search stars browser check gets a step: the star of Saturn opens the Ring trail in the look menu.',
      'The trail budget on a phone: the new trail uses the point pool of the trail of today.',
    ],
  },
  F19: {
    question: 'How does a friend fly with the fairy at each speed, and stay cheap on a phone?',
    moments: [
      { t: 2.5, caption: 'After five hellos, a pegasus foal comes to fly with the fairy.' },
      { t: 7.1, caption: 'The friend makes a happy loop around her.' },
      { t: 9.5, caption: 'In each turn the friend comes to its place a little late.' },
    ],
    findings: [
      ['A creature costs draw calls', '<code>TODO.md</code>: one creature is 14 to 21 draw calls, and eight runs of the same code gave 111 to 237 draw calls at 390 px. The decision about a creature limit on a phone is open.'],
      ['The foals stay at the cottage', 'Five pegasus foals circle over the cottage garden (<code>src/candy.ts</code>). They do not leave Blossom Haven.'],
      ['The speed changes by 90 times', 'The fairy flies 11 to 32 m/s near a world and up to 968 m/s in open space, or 2,226 m/s with Shift (<code>src/flight.ts</code>). A friend that follows with a delay falls far behind at that speed.'],
      ['A world carries the fairy', 'Near a world the fairy moves with its orbit and its spin (<code>WORLD_CARRY</code> in <code>src/flight.ts</code>). The trail study found that a thing that does not move with her goes off at an angle.'],
    ],
    questions: [
      { id: 'F19-who', title: 'Who is the friend?', why: 'The pegasus foal has a model with wings. Earth has no flying animal.', options: ['A pegasus foal, on each world (recommended)', 'A friend of each world: a foal on Blossom Haven, a new bird on Earth', 'The child selects a friend from the creatures that she met'] },
      { id: 'F19-when', title: 'When does the friend come?', why: 'A gift after some hellos gives the hello a purpose.', options: ['After five hellos (recommended)', 'From the start', 'After the sticker of Blossom Haven, as a gift of the home'] },
      { id: 'F19-phone', title: 'What does a phone get?', why: 'A phone has a draw-call budget, and the friend is always in the view.', options: ['A friend model with its parts joined: about 3 draw calls (recommended)', 'The same model as a computer', 'No friend on a phone'] },
    ],
    steps: [
      'A new <code>src/friend.ts</code>: the friend takes the move of the fairy in each frame, then comes to its place at her side.',
      'In open space the friend stays close, with no delay, and its wings beat faster.',
      'The friend stays out of the ground and out of the camera, with the same rules as the camera of <code>updateCamera()</code>.',
      'A switch in <strong>Your fairy</strong> shows or hides the friend.',
    ],
    checks: [
      'Unit tests: the distance from the friend to the fairy stays below a limit at each speed, also when a world carries her.',
      'A browser check: a climb from the meadow to open space and back, with the friend in the view.',
      'The draw calls at 390 px with the friend, against the phone budget of <code>docs/mobile-play.md</code>.',
    ],
  },
  F20: {
    question: 'How do the postcards stay in the game, and stay small on the device?',
    moments: [
      { t: 4.5, caption: 'The album asks for a duck. The fairy flies to one.' },
      { t: 6.2, caption: 'The camera: a flash, and the postcard with the real picture of the view.' },
      { t: 9, caption: 'The postcard goes into its place in the album: 2 of 5.' },
    ],
    findings: [
      ['A postcard is a file', '<code>src/postcard-camera.ts</code> downloads a PNG, or opens the share sheet where the device can share a file. The game keeps no picture.'],
      ['A card is large', 'A card is 1280 pixels wide from a wide screen, and 980 × 1400 pixels from a phone (the Postcard camera part of the README). <code>localStorage</code> holds about 5 MB for the whole game.'],
      ['The game can name the subject', '<code>searchProbe()</code> in <code>src/search-stars.ts</code> has the nearest world, the height and the weather. Its creature check exists (<code>SEARCH_CREATURE</code>), and no task uses it now.'],
      ['The picture stays on the device', 'The README says: "Nothing leaves the device without a tap on Save or Share." An album in the browser keeps that rule.'],
    ],
    questions: [
      { id: 'F20-keep', title: 'How does a picture get into the album?', why: 'The postcard has Save and Share today.', options: ['A Keep button on the postcard, next to Save (recommended)', 'Each postcard goes into the album', 'Only a picture that shows a thing of the album'] },
      { id: 'F20-subject', title: 'How does the game know what a picture shows?', why: 'The game cannot look at a picture, but it knows where the fairy is.', options: ['From the place of the fairy at the time of the picture: the nearest creature, the world, the rainbow (recommended)', 'The child puts the picture in its place', 'No places: the album is free pages only'] },
      { id: 'F20-limit', title: 'How many pictures does the album keep?', why: 'A small copy of 640 px is about 60 KB. A phone gives limited space.', options: ['24 pictures. The oldest free picture goes when the album is full (recommended)', '12 pictures', 'No limit'] },
    ],
    steps: [
      'A new <code>src/album.ts</code> with a store in IndexedDB: a small copy of the card, the world, the subject and the time.',
      'The postcard gets <strong>Keep</strong>. The camera reads <code>searchProbe()</code> at the time of the picture.',
      'The album is a page in Worlds: the places with their small pictures, then the free pages.',
      'A grown-up can remove one picture, or all of them, in Settings.',
    ],
    checks: [
      'Unit tests: the limit, the oldest free picture goes first, and a picture with a subject goes into its place.',
      'The postcard browser check gets steps: Keep, the album after a reload, and a private window with no store.',
      'The size of 24 pictures in the store on a phone.',
    ],
  },
}

/** Each decision of each study, for the saved answers. */
export const STUDY_QUESTIONS = Object.values(STUDIES).flatMap(study => study.questions)
