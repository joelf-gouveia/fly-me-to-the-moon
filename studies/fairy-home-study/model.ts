import { MOMENTS } from './fairy-home-study-capture.mjs'

/**
 * The text of the fairy home study page: the clips, the parts that make sense, the findings, the
 * plan and the decisions. The numbers of the parts come from parts.ts; the page measures them.
 */
export type ClipId = 'B' | 'R' | 'W' | 'D' | 'Y' | 'C' | 'G'
export type Clip = {
  id: ClipId; name: string; question: string; line: string; child: string; rules: string[]
  moments: { t: number; caption: string }[]
}

const clip = (id: ClipId, name: string, question: string, line: string, child: string, rules: string[], captions: [string, string, string]): Clip =>
  ({ id, name, question, line, child, rules, moments: MOMENTS[id].map((t, index) => ({ t, caption: captions[index] })) })

export const CLIPS: Clip[] = [
  clip('B', 'B · Build mode', 'How does she get into build mode, and how does she leave it?',
    'She flies home. Near the cottage a button shows. The panel has four tabs, the pictures of the options and twelve colours.',
    'She lands near her cottage. A button "Build your home" shows. She taps it. The camera turns slowly around the home, and the panel opens. She taps a tab, then a picture: the part changes with a puff of petals. She taps Done and flies away. The home stays as she made it.',
    [
      'The button shows when she is 25 m or less from the cottage. It hides when she flies away.',
      'Build mode stops the flight, as the fairy panel does today (setCustomizerOpen() in src/main.ts).',
      'The panel has the look and the classes of the fairy panel: an option grid and a swatch grid.',
      'A tap on a picture changes the part at once. There is no Save button: the game saves each change.',
      'Done, the close button and the Escape key close build mode. The camera goes back behind her.',
    ],
    ['The approach: the button shows only near the cottage', 'Roof: the toadstool comes in its own red', 'Colour: the roof becomes lilac']),
  clip('R', 'R · Roofs', 'Which roofs fit a fairy home, and does each one fit each wall?',
    'Six roofs: the petal crown of today, a toadstool, an acorn cap, a star spire, a frosting swirl and a leaf thatch.',
    'The roof is the first part that she sees from the air. Each roof gives the home a new outline in the sky.',
    [
      'A roof scales to the top of the walls: the walls give the radius and the height of their top.',
      'A roof stays under 7.5 m. A tall roof gets lower, not narrower (the table "Each roof on each walls").',
      'A topper (the star, the cherry, the stem) keeps its shape when the roof gets lower.',
    ],
    ['The toadstool', 'The star spire', 'The leaf thatch']),
  clip('W', 'W · Walls', 'Which walls make the type of the home?',
    'Six walls: the flower cottage of today, a tree stump, a teapot, a pumpkin, a pebble tower and a honey hive.',
    'The walls tell what the home is. Each walls has its own two windows, which light up after sunset.',
    [
      'The walls give the socket: the height and the radius of the top, and the radius of the front at each height.',
      'The roof and the door build again when the walls change, because they sit on the walls.',
      'The windows are part of the walls: a window must follow the shape of its wall.',
      'All the windows use one material. src/main.ts lights it after sunset.',
    ],
    ['The tree stump', 'The teapot', 'The pebble tower']),
  clip('D', 'D · Doors', 'Is the door a part of its own?',
    'Five doors: the round door of today, a plank arch, a heart, a leaf curtain and a star door.',
    'The door is the face of the home. She sees it when she lands at the front.',
    [
      'A door stands on the ground at the front (+z) of the walls.',
      'A door leans with the wall: the lean comes from the radius of the front at two heights.',
      'A door is small: it costs few triangles, and it gives much character.',
    ],
    ['The plank arch', 'The heart door', 'The star door']),
  clip('Y', 'Y · Yards', 'What is around a fairy home?',
    'Six yards: the flower ring of today, a fairy ring of mushrooms, a path and fence, lanterns, a lily pond and a candy garden.',
    'The yard is the ring around the home. From the air it makes the home easy to find.',
    [
      'A yard stays from 4.5 m to 11 m from the middle: the creatures keep 12 m free.',
      'A yard follows the round ground of the clearing.',
      'The lanterns and the flower ring glow a little in the colour of the yard.',
    ],
    ['The fairy ring', 'The lantern garden', 'The lily pond']),
  clip('C', 'C · Colours', 'How does she give the home her colours?',
    'One colour for each part, from twelve colours. A new colour changes only the colour of the material.',
    'She picks a part, then a colour dot. The part changes colour with a small puff.',
    [
      'Twelve colours for all parts: the same dots in each tab.',
      'A new colour builds nothing again. It changes the colour of one material.',
      'A new shape comes in its own colour (a red toadstool, an orange pumpkin). Then she can paint it.',
    ],
    ['The roof: cherry to lilac', 'The walls: cocoa to mint', 'The yard: cherry to sky']),
  clip('G', 'G · Eight homes', 'Do four parts make the fairy homes of stories?',
    'Eight homes from stories, gardens and games. Each is a roof, walls, a door and a yard of the same set.',
    'The set makes the homes that she knows from books, and many more of her own.',
    [
      'Each home of the clip is a look of parts.ts: four options and four colours.',
      'With 6 roofs, 6 walls, 5 doors and 6 yards, there are 1,080 shapes of home before the colours.',
    ],
    ['The toadstool house', 'The teapot house', 'The honey hive']),
]
export const clipById = (id: ClipId) => CLIPS.find(item => item.id === id)!

/** The parts that a fairy home could have, and the verdict of the study for each. */
export const CANDIDATES: { part: string; verdict: 'own' | 'inside' | 'later' | 'no'; where: string; why: string }[] = [
  { part: 'Roof', verdict: 'own', where: 'Part 1', why: 'It makes the outline of the home. She sees it first, from the air. The homes of stories differ most in the roof: a toadstool, a petal crown, a pointed hat.' },
  { part: 'Walls', verdict: 'own', where: 'Part 2', why: 'They tell what the home is: a stump, a teapot, a pumpkin. They give the socket for the roof and the door.' },
  { part: 'Door', verdict: 'own', where: 'Part 3', why: 'It is the face of the home and the part she sees when she lands. It is small and cheap, and the "fairy door" is a known fairy object of its own.' },
  { part: 'Yard', verdict: 'own', where: 'Part 4', why: 'It fills the clearing around the home and makes the home easy to find from the air. The fairy ring is a fairy motif of the old stories.' },
  { part: 'Windows', verdict: 'inside', where: 'In the walls', why: 'A window must follow the shape of its wall: a knot in a stump, a round window in a teapot. A free window gives pairs that do not fit.' },
  { part: 'Chimney, star, cherry', verdict: 'inside', where: 'In the roof', why: 'A topper sits on one roof only: a chimney has no place on a petal crown or on a toadstool.' },
  { part: 'Path, fence, lights', verdict: 'inside', where: 'In the yard', why: 'They are kinds of yard. Two yards at the same time would fill the clearing and cover each other.' },
  { part: 'Colours', verdict: 'own', where: 'One for each part', why: 'Four colours, one for each part, from twelve colours. A child can make a home that is truly hers with few taps.' },
  { part: 'Inside of the home', verdict: 'later', where: 'Not in this mode', why: 'The fairy does not go into the home, and the camera stays outside. A room needs a new scene and new controls.' },
  { part: 'Free placement', verdict: 'no', where: 'No', why: 'To put objects anywhere is hard for a young child, and it breaks the limits of the creatures, the rings and the flower of the guide.' },
]

/** What the game has today, from the code. */
export const FINDINGS: [string, string][] = [
  ['One fixed cottage', '<code>buildFlowerCottage()</code> in <code>src/worlds.ts</code> builds walls, seven petals, a gold heart, a door, a knob, two windows and a garden of 32 flowers. Nothing changes after the build.'],
  ['Two names that other code reads', 'The ring obstacles find the group <code>flower-cottage</code> (<code>src/rings.ts</code>). <code>src/main.ts</code> finds the material of <code>cottage-window</code> and lights it after sunset. A new home must keep both names and one window material.'],
  ['The flower of the guide is at 8 m', '<code>homeMarkerPosition()</code> in <code>src/journey.ts</code> marks a point 8 m over the cottage. The cottage of today is 6.65 m high. A taller home covers the marker, so each home stays under 7.5 m.'],
  ['The creatures keep 12 m free', '<code>obstacles.add()</code> in <code>src/worlds.ts</code> keeps the animals 12 m from the cottage. The pegasus foals circle 15 m away (<code>src/candy.ts</code>). The yard stays inside 11 m.'],
  ['The ground is flat for 15 m', 'The clearing of the cottage has a fixed height to about 0.11 of the radius from the pole (<code>src/terrain.ts</code>): about 15 m. The ground is round, so the yard follows its curve.'],
  ['The Sun stays low at the cottage', 'The cottage is at the south pole (<code>homeCottageNormal()</code>), and Blossom Haven turns about its pole. The Sun is near the horizon there: about 5° at the start place of the lab. The clips turn the planet so the Sun is 38° high; the game does not.'],
  ['The fairy panel is the model', 'The panel "Your fairy" (<code>#customizer</code> in <code>src/main.ts</code>) has option grids, colour dots and an automatic save as <code>fairy-look</code> with <code>parseFairyLook()</code>. Build mode can use the same parts.'],
  ['The home moves with its planet', 'The cottage is a child of <code>home.surface</code>. A hop of the home (<code>relocateHome()</code>) moves the whole group, so a built home goes with the planet with no more work.'],
]

export type Size = 'S' | 'M' | 'L'
export const SIZES_OF_WORK: Record<Size, string> = { S: 'small, less than a day', M: 'medium, one to three days', L: 'large, more than three days' }
/** The plan: [title, text, size]. */
export const CHANGES: [string, string, Size][] = [
  ['A home of four parts', 'Move the cottage from <code>buildFlowerCottage()</code> to a new <code>src/home.ts</code> with the parts and the socket of <code>studies/fairy-home-study/parts.ts</code>. The default look is the cottage of today.', 'S'],
  ['The options and the colours', 'Add the 23 options and the 12 colours of the study. Each option merges its pieces by paint: at most 22 draw calls for a home.', 'M'],
  ['The save', 'Save the look as <code>fairy-home</code> with <code>parseHomeLook()</code>, as the fairy look is saved. Build the saved home at the start.', 'S'],
  ['Build mode', 'Show the Build button near the cottage. Stop the flight, turn the camera around the home (a drag turns it), and open the panel: at the side on a computer, at the bottom on a phone. Done closes it.', 'M'],
  ['The change', 'Pop the new part with a small bounce, a puff of petals in its colour and a soft chime. With reduced motion, the part changes with no bounce and no puff.', 'S'],
  ['Keep the neighbours', 'Keep the names <code>flower-cottage</code> and <code>cottage-window</code>, the window material, the top under 7.5 m and the yard inside 11 m. The tests of <code>tests/home.test.ts</code> check each roof on each walls and each door on each walls.', 'S'],
  ['Checks in the browser', 'Add a check of build mode on a computer page and on a phone page: open, change each part, close, and load the saved home again.', 'S'],
]

export type Decision = { id: string; title: string; why: string; options: string[] }
export const DECISIONS: Decision[] = [
  { id: 'parts', title: 'The parts', why: 'The study finds four parts. Windows go with the walls, toppers with the roof.', options: ['Four parts: roof, walls, door and yard', 'Three parts: roof, walls and yard (the door goes with the walls)', 'Six parts: also windows and a chimney'] },
  { id: 'colours', title: 'The colours', why: 'One colour for each part keeps the panel small for a child.', options: ['One colour for each part, from 12 colours', 'Two colours for each part: a main colour and a trim', 'A free colour wheel'] },
  { id: 'newShape', title: 'The colour of a new shape', why: 'Some shapes have a known colour: a red toadstool, an orange pumpkin.', options: ['A new shape comes in its own colour; then she can paint it', 'A new shape keeps the colour that she chose'] },
  { id: 'entry', title: 'Where she builds', why: 'A button at the cottage gives her a reason to fly home.', options: ['A Build button near her cottage', 'A button in the toolbar, from anywhere', 'From the Worlds book'] },
  { id: 'unlock', title: 'The options at the start', why: 'All options open is the simplest. Gifts give a reason to explore, but some children never see them.', options: ['All options open from the start', 'One new option for each new world that she visits', 'Options as gifts from the animal friends'] },
  { id: 'camera', title: 'The camera in build mode', why: 'A slow turn shows each side of the home. A drag lets her look where she wants.', options: ['A slow turn around the home; a drag turns it', 'A fixed view of the front', 'She flies around the home herself'] },
  { id: 'change', title: 'The change of a part', why: 'A small effect tells her that the tap worked.', options: ['A puff of petals and a small bounce (none with reduced motion)', 'The part changes at once', 'The part builds piece by piece'] },
  { id: 'first', title: 'The options to build first', why: 'The study has 23 options that pass the tests.', options: ['All 23 options of the study', 'Three options for each part first', 'Only the eight homes, as whole homes'] },
  { id: 'surprise', title: 'A surprise button', why: 'A child that does not know what she wants can start from a surprise.', options: ['A Surprise button that picks a whole home', 'No surprise button'] },
]
