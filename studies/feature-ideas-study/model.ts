/**
 * The ten feature ideas of the study, the findings in the game of today, and the decisions.
 * The page (main.ts) shows them; each feature has a clip from the lab (features/).
 */
export type FeatureId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10'
export type Size = 'S' | 'M' | 'L'
export type Idea = {
  id: FeatureId
  name: string
  /** One line for the card. */
  line: string
  /** What the child sees and hears. */
  child: string
  /** Where the feature goes in the game code. */
  where: string
  /** What the game has already. */
  ready: string
  size: Size
  /** A new npm package, or null. */
  dependency: string | null
  /** A limit or a risk to know before the work starts. */
  limit: string
  /** The main idea of the code, in TypeScript. */
  snippet: string
  proposed: boolean
}

export const SIZES: Record<Size, string> = { S: 'Less than one day', M: 'One to three days', L: 'More than three days' }

export const IDEAS: Idea[] = [
  {
    id: 'F1', name: 'Search stars', proposed: true, size: 'M', dependency: null,
    line: 'A shiny star for one small task on each world.',
    child: 'After the hello sticker, the note gives one small task, such as "Find a duck on the water." When the fairy does it, a gold star pops up and goes on the sticker.',
    where: 'A new <code>searchDone()</code> in <code>src/stickers.ts</code>, called from <code>updateNearestWorld()</code> in <code>src/main.ts</code>. The note uses the sticker toast of <code>src/sticker-book.ts</code>.',
    ready: 'Each sticker in <code>STICKERS</code> has a <code>search</code> task, a found line and a check rule. The saved <code>Book</code> has a <code>found</code> list. The sticker book study designed it (option B).',
    limit: 'The terrain checks (Mercury craters, the dark seas of the Moon) need new exports from <code>src/terrain.ts</code>. Start with the six altitude checks.',
    snippet: `// src/stickers.ts: one check for each kind of task
export function searchDone(sticker: Sticker, at: SearchState) {
  switch (sticker.search.check) {
    case 'altitude': return at.clearance < SEARCH_LIMIT[sticker.id]
    case 'place': return at.local.y < -0.8          // Vesta: the south pole
    case 'creature': return at.nearestDuck < 12     // Earth: a duck
    default: return false                           // terrain checks come later
  }
}

// src/main.ts, updateNearestWorld()
if (near && !book.found.includes(world.kind) && searchDone(stickerById(world.kind), at)) {
  stickerBook.find(world.kind)   // the gold star and the note
}`,
  },
  {
    id: 'F2', name: 'Spoken facts', proposed: true, size: 'S', dependency: null,
    line: 'A soft voice says the fact of each new sticker.',
    child: 'A new sticker shows, and a voice says its name and its fact. A child who cannot read yet hears it. The voice speaks only when Sound is on, and it stops at a pause.',
    where: 'The <code>chime</code> action of <code>createStickerBook()</code> in <code>src/main.ts</code>, next to <code>playChime()</code>.',
    ready: '153 recorded lines in English and 153 in European Portuguese are in <code>public/voice/</code> (5.9 MB). The sticker book study plays them.',
    limit: 'The recordings follow the fact text. A change of a fact needs a new recording (<code>studies/sticker-book-study/sticker-voice.mjs</code>).',
    snippet: `// src/main.ts
const voice = new Audio()
function say(key: string) {
  if (!soundOn || paused) return
  voice.src = \`/voice/en/af_heart/\${key}.mp3\`
  void voice.play().catch(() => {})
}

const stickerBook = createStickerBook(worlds, {
  chime: (milestone, id) => { playChime(...); say(\`hello-\${id}\`) },
})
// setPaused(true) and visibilitychange: voice.pause()`,
  },
  {
    id: 'F3', name: 'Creature hello', proposed: true, size: 'M', dependency: null,
    line: 'Creatures hop and show hearts when the fairy comes near.',
    child: 'The fairy flies low near a unicorn, a dragonling or a duck. The creature hops, and small hearts float up. A soft note plays. Each creature says hello again only after a short rest.',
    where: 'A new <code>greet()</code> in <code>createPopulation()</code>, <code>src/creatures/population.ts</code>. <code>animate()</code> in <code>src/main.ts</code> calls it next to <code>world.creatures?.update()</code>.',
    ready: 'The population keeps one model for each resident index, with its position on the ground. The models of Earth and of Blossom Haven both work.',
    limit: 'A hop must stay on the ground of the world. The models are joined into 14 to 21 meshes, so a hop moves the whole creature, not one leg.',
    snippet: `// src/creatures/population.ts, inside createPopulation()
function greet(localFairy: THREE.Vector3, time: number) {
  for (const [index, model] of models) {
    if (!model.root.visible) continue
    if (model.root.position.distanceTo(localFairy) > 4.5) continue
    if (time - (lastHello.get(index) ?? -99) < 8) continue
    lastHello.set(index, time)
    model.root.userData.hopUntil = time + 0.6   // update() lifts it
    hearts.burst(model.root.position)
    onHello()                                   // the chime
  }
}`,
  },
  {
    id: 'F4', name: 'Sparkle rings', proposed: false, size: 'M', dependency: null,
    line: 'Rings of light to fly through, with a burst and a longer trail.',
    child: 'A short line of glowing rings floats over the meadow and near each world. The fairy flies through a ring: a burst of sparkles, a two-note chime, and a longer trail for a few seconds. A ring comes back after 30 s. There is no score and no fail.',
    where: 'A new <code>src/rings.ts</code>. The rings are children of <code>world.group</code>, so they turn with the world. <code>updateFairy()</code> tests each ring; the trail is the trail of <code>src/main.ts</code>.',
    ready: 'The trail, <code>playChime()</code>, and the safe routes of the flower guide.',
    limit: 'Each world needs a safe line of rings: clear of the ground, the trees and the cottage. Earth makes a new landscape at each visit, so its rings need a new line each time.',
    snippet: `// src/rings.ts
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 10, 48), candyGlow)
world.group.add(ring)                       // it turns with the world

// src/main.ts, updateFairy()
ring.getWorldPosition(ringWorld)
if (ring.visible && fairy.position.distanceTo(ringWorld) < 2.4) {
  ring.visible = false
  sparkleBurst(ringWorld)
  trailBoostUntil = elapsed + 4                 // a longer trail
  playChime([659.25, 987.77])
  setTimeout(() => { ring.visible = true }, 30000)
}`,
  },
  {
    id: 'F5', name: 'Postcard camera', proposed: true, size: 'S', dependency: null,
    line: 'A framed picture of the fairy and the world, to keep.',
    child: 'A camera button. A tap makes a soft flash, and a postcard shows: the fairy, the world, a frame and the name of the world. Save keeps it on the device. The picture never leaves the device unless a grown-up shares it.',
    where: 'A new round button in the toolbar of <code>src/main.ts</code>, next to the fairy and Settings buttons. The renderer clears its picture after each frame, so the code draws the frame and reads it in the same call.',
    ready: 'The renderer, the name of the nearest world, and the world pictures of the sticker book.',
    limit: 'On an iPad, Share needs the Web Share API with files. A computer saves the file. A fourth round button makes the toolbar longer (screen study: four buttons).',
    snippet: `// src/main.ts
function takePostcard() {
  renderer.render(scene, camera)   // draw now; read before the picture clears
  renderer.domElement.toBlob(blob => {
    if (!blob) return
    const file = new File([blob], \`fairy-\${nearestWorld.name}.png\`, { type: 'image/png' })
    showPostcard(file, nearestWorld)   // the frame, the name, Save and Share
  })
}
// Share: navigator.canShare?.({ files: [file] }) ? navigator.share({ files: [file] }) : download`,
  },
  {
    id: 'F6', name: 'A song for each world', proposed: false, size: 'S', dependency: null,
    line: 'The soft hum changes to a chord for each world.',
    child: 'The hum changes slowly when the fairy comes near a new world. Blossom Haven sounds bright, the Moon calm, and the giants deep. The change is slow, so it never surprises the child.',
    where: '<code>createAmbience()</code> in <code>src/main.ts</code> keeps its three oscillators. <code>updateNearestWorld()</code> glides them to the chord of the new world.',
    ready: 'The hum (three oscillators), the Sound switch, and the nearest world.',
    limit: 'Today the hum keeps no reference to its oscillators. The change is small, but each chord needs a listen test on a phone speaker.',
    snippet: `// src/main.ts
const hum: OscillatorNode[] = []      // createAmbience() keeps them now
function playWorldChord(world: World) {
  const chord = WORLD_CHORDS[world.kind]
  hum.forEach((tone, i) => tone.frequency.setTargetAtTime(chord[i], audioContext!.currentTime, 0.5))
}
// updateNearestWorld(): if (world !== lastWorld) playWorldChord(world)`,
  },
  {
    id: 'F7', name: 'Game controller', proposed: false, size: 'S', dependency: null,
    line: 'Fly with a game controller on a computer or a TV.',
    child: 'A controller works with no setup. The left stick steers, A boosts, B pauses and X toggles hover. A grown-up can connect a computer to a TV and give the child a controller.',
    where: 'A third input source in <code>createFlightInput()</code>, <code>src/flight-input.ts</code>, next to the keyboard and the fingers. <code>updateFairy()</code> reads it through <code>keys.has()</code> with no other change.',
    ready: 'One input object for the keys and the touch buttons. <code>updateFairy()</code> reads only <code>keys.has()</code>.',
    limit: 'The stick gives a value from -1 to 1, and the keys give 0 or 1. A dead zone of 0.4 keeps the steering the same as the keys. Controllers differ in their button order.',
    snippet: `// src/flight-input.ts: a third source
const pad = new Set<string>()
function pollPad() {
  pad.clear()
  const p = navigator.getGamepads().find(Boolean)
  if (!p) return
  if (p.axes[0] < -0.4) pad.add('ArrowLeft')
  if (p.axes[0] > 0.4) pad.add('ArrowRight')
  if (p.axes[1] < -0.4) pad.add('ArrowUp')
  if (p.axes[1] > 0.4) pad.add('ArrowDown')
  if (p.buttons[0]?.pressed) pad.add('ShiftLeft')
}
// has(code): keyboard.has(code) || pointers... || pad.has(code)`,
  },
  {
    id: 'F8', name: 'Comets and shooting stars', proposed: false, size: 'L', dependency: null,
    line: 'A comet with a tail, and shooting stars at night.',
    child: 'A comet with a glowing tail crosses the solar system on a long orbit. The tail always points away from the Sun. At night on Earth, shooting stars cross the sky. The fairy can fly through the tail for a sparkle.',
    where: 'A new <code>src/comet.ts</code>, updated next to <code>orbits.update()</code> in <code>animate()</code>. The shooting stars use the sky light of <code>updateEnvironment()</code>, so they show only in a dark sky, as the stars do.',
    ready: 'The orbits, the star sky and its visibility (<code>skyVisibility</code>), and the soft disc texture of the trail.',
    limit: 'A comet on a long orbit crosses the paths of the planets and Blossom Haven. Relocation must keep the home clear of it, as for the Moon. A comet sticker needs a 14th sticker.',
    snippet: `// src/comet.ts: the tail points away from the Sun
comet.position.copy(orbitPoint(COMET_ORBIT, orbits.elapsed))
tailDirection.copy(comet.position).sub(sun.group.position).normalize()
tail.quaternion.setFromUnitVectors(UP, tailDirection)

// A shooting star: a short line that fades in 0.8 s, only in a dark sky
if (skyVisibility > 0.6 && Math.random() < delta / 20) launchShootingStar(camera)`,
  },
  {
    id: 'F9', name: 'Bedtime timer', proposed: false, size: 'S', dependency: null,
    line: 'After a set time, the fairy flies home and says good night.',
    child: 'After the time that a grown-up sets, a gentle note says "Time to fly home and rest". The flower guide takes the fairy to the cottage. There the game shows "Good night" and stops. There is no countdown on the screen.',
    where: 'A new field in <code>parseSettings()</code>, <code>src/settings.ts</code>, and a row in the Settings panel. The clock counts only active flight, as the relocation clock does. <code>followHome()</code> starts the flower guide.',
    ready: 'Settings and its saved switches, the flower guide, the fireflies and the cottage.',
    limit: 'A child can stop the guide with the arrows. The timer must start the guide again after a short time, or it is easy to ignore.',
    snippet: `// src/settings.ts: rest is 0 (off), 10, 20 or 30 minutes
return { stars: saved.stars === true, orbits: saved.orbits === true, rest: restMinutes(saved.rest) }

// src/main.ts, animate(): only active flight counts
played += delta
if (settings.rest && played > settings.rest * 60 && !homeGuide.enabled) {
  showNotice('Time to fly home and rest')
  followHome()
}
// at the cottage: setPaused(true) and show the Good night card`,
  },
  {
    id: 'F10', name: 'Install and fly offline', proposed: false, size: 'M', dependency: 'vite-plugin-pwa, or a service worker by hand',
    line: 'A home-screen icon, full screen, and play with no Wi-Fi.',
    child: 'An icon on the home screen of the iPad. The game opens full screen, and it plays with no Wi-Fi.',
    where: 'A web manifest and a service worker. <code>vite-plugin-pwa</code> makes both from <code>vite.config.ts</code>.',
    ready: 'The build in <code>dist/</code> (12 MB) and the icon <code>public/favicon.svg</code>.',
    limit: 'A service worker needs HTTPS. The home Wi-Fi address of <code>npm run play:lan</code> is <code>http://</code>, so this needs an HTTPS host. <code>docs/mobile-play.md</code> says that the game has no public host and no offline cache: this changes that decision. The clip is a drawing of the iPad around the real game.',
    snippet: `// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

plugins: [VitePWA({
  registerType: 'autoUpdate',
  manifest: { name: 'Fly Me to the Moon', display: 'fullscreen', background_color: '#02030f',
    icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }] },
  workbox: { globIgnores: ['voice/**'] },   // the 5.9 MB voice stays out of the first cache
})]`,
  },
]

export const ideaById = (id: FeatureId) => IDEAS.find(idea => idea.id === id)!

export const FINDINGS: [string, string][] = [
  ['The search stars have data, but no game code', 'Each sticker in <code>STICKERS</code> (<code>src/stickers.ts</code>) has a <code>search</code> task with a check kind and a rule. The saved <code>Book</code> already has a <code>found</code> list. Only the sticker book study uses them.'],
  ['153 voice lines wait in the repo', '<code>public/voice/manifest.json</code> lists 153 lines in English and 153 in European Portuguese: a hello, a task and a found line for each world. Only the sticker book study plays them. The game shows the fact as text.'],
  ['The sound is one hum and one chime', '<code>createAmbience()</code> in <code>src/main.ts</code> starts three oscillators at 110, 164.81 and 220 Hz and keeps no reference to them. The hum is the same on each world.'],
  ['No controller, no picture save, no install', 'A search of <code>src/</code> and <code>index.html</code> finds no <code>getGamepads</code>, no <code>toBlob</code>, no <code>preserveDrawingBuffer</code> and no web manifest.'],
  ['Each frame has a place for each idea', '<code>animate()</code> calls the near test, the flight step, <code>creatures.update()</code> and the render in a fixed order. The flight step reads the input only through <code>keys.has()</code>. No idea needs a new frame loop.'],
  ['The creatures keep one model for each resident', '<code>createPopulation()</code> keeps a map from the resident index to its model, with its place on the ground. A hello can find the creatures near the fairy without a new search.'],
  ['Settings saves two switches', '<code>parseSettings()</code> reads only <code>stars</code> and <code>orbits</code>. A bedtime setting adds one field. <code>followHome()</code> already flies the fairy home.'],
  ['The game has no host and no offline cache', '<code>docs/mobile-play.md</code>: phones and iPads play from the computer on the home Wi-Fi, at an <code>http://</code> address. A service worker needs HTTPS.'],
]

export type Decision = { id: string; title: string; why: string; options: string[]; multi?: boolean }
export const DECISIONS: Decision[] = [
  { id: 'features', multi: true, title: '1 / Which ideas do you want in the game?', why: 'Select each idea to build. The four ideas marked "proposed" give the most to a young player for the least new code.', options: IDEAS.map(idea => `${idea.id} — ${idea.name}${idea.proposed ? ' (proposed)' : ''}`) },
  { id: 'start', title: '2 / How do we start each idea?', why: 'The game adds most features through a study page first. F1 and F2 already have a design from the sticker book study.', options: ['Mixed: F1 and F2 straight into the game, a study for the others (recommended)', 'A study page first for each idea', 'Straight into the game for each idea'] },
  { id: 'first', title: '3 / Which idea comes first?', why: 'Claude builds one idea at a time, and shows you each one before the next.', options: ['F1 — Search stars (recommended)', 'F2 — Spoken facts', 'F3 — Creature hello', 'F5 — Postcard camera', 'Another idea: say which in the notes'] },
]
