# Fly me to the moon

A small browser flight game built with Three.js and TypeScript. Start over a
procedural Earth, drift along its surface, climb through clouds, and explore the
solar system.

Run `npm install`, then `npm run dev`. On Windows PowerShell, use `npm.cmd` if
the shell blocks npm's script wrapper. `npm run build` creates `dist/`;
`npm test` checks terrain generation, repeat visits, spherical flight, and fairy animation.

## Project layout

Rule: `src/` contains only the code of the website. Put all other files in the
folders below.

| Folder | Contents |
|---|---|
| `src/` | The code and the styles of the game. |
| `tests/` | The unit tests of the game. The folders are the same as in `src/`. |
| `scripts/` | The browser checks of the game and the data tools of the game. |
| `studies/` | One page for each study, for example `studies/moon-study.html`. |
| `studies/<study>/` | The code, the unit tests and the scripts of that study. The folder has the name of the page. |
| `docs/` | The documents of the game and of the studies. |
| `public/` | The images, the sounds and the other static files. |

A study can use code from `src/`. The code in `src/` does not use code from
`studies/`. Only a game test in `tests/` can compare the game with a study.

## Flight

- **Begin your adventure** starts the flight. There is one mode.
- The ✿ Blossom Haven card in **Worlds**, then **Fly there**, starts the flower guide. It shows
  the flower marker and the guiding fireflies to Blossom Haven. While the guide
  is on, **Stop following** shows under **Worlds** and returns to free flight.
- The flower cottage is always on Blossom Haven, with or without the guide.
  The first arrival shows the discovery celebration.

- W / Up: climb; S / Down: descend.
- A / Left and D / Right: turn.
- Release the controls near a planet to cruise along its curvature.
- Shift: faster flight; Q: hover; Space or the pause button: pause.
- On a computer the screen has **Worlds** at the top left, with the sticker
  count, and four round buttons at the bottom right: **Your fairy**, the camera
  (**Postcard**), **Settings** and pause. **Settings** has the sound, the sky switches,
  World speed and the keys. See [Postcard camera](#postcard-camera).
- Open **Worlds**, tap a world, then **Fly there** for a guided journey. A new book
  opens Earth, Blossom Haven and the Moon; each new sticker opens the next world
  (see [Sticker book](#sticker-book)). Steering takes
  over from normal world guidance. Touch devices have arrows at every width,
  a held **Boost** button and a **Hover / Fly** toggle. **Menu** holds the extra
  controls (**Your fairy**, **Postcard** and **Settings**) and flight details. Switching apps pauses until **Keep flying** is tapped.

For phone/iPad play on home Wi-Fi, run `npm run play:lan` and open the printed
Network URL on the device. See [Mobile play](docs/mobile-play.md) for controls,
performance settings and the remaining physical-device validation.

Earth has raised terrain, meadows, sea-level rivers and oceans, and a cloud layer. Its
plants follow the climate (look B of the [foliage study](#foliage-study)): palm beaches,
jungle, savanna and desert near the equator, then leaf forest, pine forest, and snow pines
near the snow. The trees stand in woods with glades between them, the grass has the
colour of its belt, and the plants move in the wind. The flight panel names the belt
below the fairy. The plants are in `src/foliage/`. Leaving well beyond the atmosphere arms a new visit; descending
back into the upper atmosphere regenerates the landscape once. Flying through
clouds alone does not change it. Other natural planets also regenerate on arrival;
Blossom Haven keeps the same familiar landscape.

Mercury is airless, Venus has dense golden haze, and Mars has thin dusty air.
The gas and ice giants offer cloud flight with a soft lower flight boundary,
rather than a rocky surface. All scales and atmospheric effects are stylized:
Earth is 550 game metres across, and cruising around it takes about 2.7 minutes.
Travel speed grows outside the atmosphere to keep the solar system reachable:
up to 968 m/s in open space, or 2,226 m/s with Shift.

A world carries the fairy along its orbit while she is close to it: fully below 600 m
above the world, and less and less up to 1,500 m. Near a world she flies as slowly as
32 m/s, and Blossom Haven moves at about 59 m/s on its orbit. Without the carry, a fairy
who follows a world from behind stays about 158 m above it. Inside the air of a world she
also turns with it, as before. The numbers are `WORLD_CARRY` in `src/flight.ts`.

The sizes and distances come from the [proportions study](#proportions-study).
World data is in base units; `src/proportions.ts` multiplies every radius, air and
cloud height by 1.25, every distance from the Sun by 2.5, the Sun by 1.6 and the
flight speed in open space by 2.25. Trees, grass and candy scenery grow in number
with the area of their world, so they keep their density.

The seven planets have the look of their pictures (option B of the
[planet look study](#planet-look-study)). The graphics card paints a map for each
giant and for the closed cloud deck of Venus: Jupiter's belts and Great Red Spot,
Saturn's bands and polar hexagon, the pale cyan of Uranus, and Neptune's dark spot and
white streaks. Mars has dark regions, ice caps and a long canyon; Mercury has dark
plains and bright ray craters. Mercury and Mars have half the relief, so they are
round from space; the flight ground is lower too. Each planet has its real axial
tilt, and Uranus lies on its side. Saturn's rings are on its equator, with the
Cassini gap and a shadow on the planet; Uranus has thin rings. From far away the
night sides are dark, the air is a thin rim, and the cloud puffs show only inside
the air. A new visit to a giant gives new storms. The maps are 2048 × 1024 on a
computer and 1024 × 512 on a phone. Earth, the Moon, Ceres, Vesta and Blossom Haven
keep their look. The recipes are in `src/planet-paint.ts`; the numbers are in
`src/planet-look.ts`.

The Sun is alive (option B of the [Sun study](#sun-study)). Its disc is cream in the
middle and darker and redder at the edge, as a real Sun is. Granules boil on its
surface, sunspots turn with it (faster at the equator than at the poles), and a corona
with streamers, a thin red rim and five prominence loops surround it. The fairy can fly
through the loops. From Earth the Sun shows in the blue sky: white by day and orange
when it is low. The blue sky hides the corona and the loops, as in the real sky. Phones
use a lighter shader, and reduced motion stops the Sun. The numbers are in
`src/sun-look.ts`; the shaders are in `src/sun-paint.ts`.

## Sparkle rings

Short lines of glowing rings in candy colours float 5 to 12 m over the ground of Earth,
Blossom Haven and the Moon. Fly through a ring: a burst of sparkles, a two-note chime
(when Sound is on), and a trail that is twice as long and brighter for 4 s. A taken ring
fades and comes back after 30 s of flight. There is no score, no fail and no counter.

- Each line has 5 to 7 rings on a smooth, gentle curve. Earth has five lines, Blossom
  Haven and the Moon have three. The first line of Earth starts near the first meadow,
  ahead of the fairy. The first line of Blossom Haven is behind the cottage. The first
  line of the Moon is on its near side.
- Each ring is clear of the ground, the trees, the candy, the cottage and the water edge.
  The rings of Blossom Haven are higher (9 to 11 m), over the candy canes.
- The rings are in the group of their world, so they turn and move with it, also when
  Blossom Haven moves. A new Earth landscape gets new lines. The same seed gives the same
  lines.
- The ring test uses the path of the fairy between two frames, so a fast fairy cannot skip
  a ring.
- One torus, one glow quad and three materials serve all rings: two draw calls for each
  world. A phone gets 24 sparkles in a burst instead of 48.

The placement and the ring test are in `src/rings.ts`; the tests are in
`tests/rings.test.ts`. Run `node scripts/sparkle-rings-smoke.mjs "path/to/chrome.exe"`
against the dev server for the rings on each world, a pass with the chime, the burst and
the longer trail, a pass at boost speed, the return after 30 s, the rings that move with
Blossom Haven, new rings after a new Earth landscape, and the phone layout. An optional
second argument sets the server origin.

## Asteroid belt

The asteroid belt fills the space between Mars and Jupiter, 12,125 to 13,875 m from
the Sun. From far away it is a ring of dust and a faint glow, with the dark
Kirkwood gaps where Jupiter clears the orbits. Inside the belt, tumbling rocks
come and go around the fairy, and the flight panel says **Asteroid belt**.
The rocks have no collisions: a rock that comes near the fairy or the camera
shrinks away. The belt turns with the planets and fades inside atmospheres,
as the stars do. Phones draw half of the dust and rocks.

**Ceres** and **Vesta**, two small airless worlds, orbit inside the belt at their
real distances. Both are in **Worlds**. Ceres has the bright salt spots of
Occator crater; Vesta has a giant crater at its south pole. Blossom Haven never
relocates into the belt. The belt data is in `src/belt.ts`; the scene is in
`src/asteroid-belt.ts`.

Run `node scripts/asteroid-belt-smoke.mjs "path/to/chrome.exe"` against the dev
server for a guided trip through the belt to Ceres and Vesta, the Worlds
pictures, the home check and the phone budget. An optional second argument sets
the server origin, for example a server without file watching.

## Comet and shooting stars

A comet goes around the Sun on a long ellipse through the inner solar system: from
2,200 m (between the Sun and Mercury) to 14,000 m (the outer edge of the asteroid belt).
Its orbit is tilted 20°, so it passes 1,900 m above or below the orbit of Earth. One pass
takes 600 s (10 minutes) at 1× World speed, so a child sees it often. Six passes fill one
game year, so the comet comes back with the planets. World speed makes it faster. It is
fast near the Sun and slow far from it. The first pass near Earth comes about 90 s after
the start.

The comet has an icy nucleus, a glowing coma, a warm dust tail and a faint blue ion tail.
Both tails point away from the Sun, and they are longer near the Sun (450 to 2,000 m for
the dust tail). The dust tail bends back along the orbit. The comet fades inside
atmospheres, as the stars and the belt do. It is not a world: it has no sticker, it is not
in **Worlds**, and the fairy flies through it.

When the fairy flies through a tail, sparkles burst around her and stream behind her, and
her trail grows. The sparkles and the larger trail stay for 4 s after the tail. A soft
chime plays when the sound is on. The flight panel says **Comet tail**.

Shooting stars cross the night sky inside the air of each world with air, for example
Earth, Blossom Haven, Mars and Venus. A shooting star is a thin bright streak with a
glowing head, and it fades in 0.8 s. One comes every 2.5 to 6.5 s, at random. There are
none by day, none in open space and none in a light sky. Venus counts as dark at night
under its haze.

Blossom Haven never relocates into the path of the comet or into its tails. The comet
does not turn with the planets, so the check uses the whole path. Phones draw half of the
tail particles and sparkles. With reduced motion, the tail is still and there are no
shooting stars. The comet data and rules are in `src/comet.ts`; the comet scene is in
`src/comet-sky.ts`; the shooting stars are in `src/shooting-stars.ts`.

Run `node scripts/comet-smoke.mjs "path/to/chrome.exe"` against the dev server for the
comet from space, the tails away from the Sun, a pass through the tail, shooting stars on
Earth at night and none by day, in open space or with reduced motion, and the phone budget
at 390 px. An optional second argument sets the server origin.

## The Moon

The Moon orbits Earth 963 m from its centre (3.5 Earth radii), on an orbit tilted
28°. It has radius 75 m, 0.273 of Earth, as in the real Solar System. A lunar month is 300 s
at 1× orbital speed, so there are 12 new moons in each game year. The Moon keeps
its near side, with the dark maria, toward Earth. It rises in the east, and it
is in **Worlds** after Earth; a guided trip from the meadow takes about 16 s.

The Moon shows phases, because its night side is dark from far away. The fog
does not hide it, so it shows from Earth's ground. On Earth the night light comes
from the Moon: a high full moon gives the brightest night, and a night with no Moon
keeps a gentle fill. Eclipses come in two seasons each game year. Near the Moon
the fairy moves with it, up to 85 m above its ground, at every orbital speed.
Blossom Haven never relocates into the Moon's path. The Moon data is in
`src/moon.ts`.

Run `node scripts/moon-smoke.mjs "path/to/chrome.exe"` against the dev server for
the orbit, the Worlds picture and map, a guided trip to the Moon, the carry at
8× and the phone layout. An optional second argument sets the server origin.

## Night sky

The sky has the 2,887 brightest real stars from the NASA Bright Star Catalog
and a soft Milky Way glow. Stars fade inside atmospheres and in daylight.
**Star pictures** shows or hides 24 star pictures (19 constellations and 5
well-known shapes such as the Big Dipper), the names of the pictures and bright
stars, and ten James Webb Space Telescope pictures near their real places. It is
a switch in **Settings**, off at the start, and it stays after a reload. The Webb
picture nearest the middle of the view shows a caption with its ESA/Webb credit;
**Settings** lists every credit. Sources and
limits are in [Star scenery data](docs/star-data.md).

## Seasons

Earth has seasons. Its axis leans 23.4°, as the axis of the real Earth does, and one orbit
is one year: 60 minutes at 1× World speed. The year starts at the real date of the device,
so in October the north of the game is in autumn. The place changes the season: the north
has summer while the south has winter, the lands near the equator have no season, and near
a pole the Sun does not set in summer and does not rise in winter. The noon Sun is high
in summer and low in winter, and the days are long in summer and short in winter.

The grass takes the colour of its season. The broadleaf trees, the birches and the bushes
get blossom in spring and gold and red leaves in autumn, and they are bare in winter. The
pines, the palms and the cactus stay green. The flowers are out in spring and summer. The
snow line comes down to 28° in winter, mountains get snow first, and the sea near a cold
pole has ice. Petals, leaves or snow fall near the fairy. The flight starts in the leaf
forest of the north, from 24° to 34°. The season code is in `src/seasons.ts` and
`src/season-air.ts`; the [seasons study](docs/seasons-study.md) gives the model and the
decisions.

Run `node scripts/seasons-smoke.mjs "path/to/chrome.exe"` against the dev server for the
lean, the year from the real date, the start in each season and the air. On the dev
server, `/?test&year=0.875` starts in the winter of the north.

Blossom Haven has magic seasons of its own. They are not the seasons of Earth: the planet
does not lean, and the Sun does not make them. There are four, in this order:

| Season | Ground | Plants that grow in this season | Air |
| --- | --- | --- | --- |
| Blossom time | The colours of the four gardens | Blossom trees and giant flowers | Petals |
| Bubble time | Mint green | Bubble blooms: clear bubbles on thin stems | Bubbles |
| Lantern time | Violet | Giant toadstools that glow | Fireflies |
| Crystal time | Frost white | Sugar crystals | Glitter |

A visit starts in Blossom time. Each hop of the planet (each 5 minutes) brings the next
season, so a magic year is 20 minutes, and the look changes in about 20 s. A new season
starts at the cottage and goes out over the planet in a ring: the far side gets it three
seasons later, so the planet shows two or three seasons at one time. The plants of a
season grow from the ground when it comes and go back when it leaves; the candy of the
four gardens stays all year. A season plant does not stand in a plant of the gardens or on
the path of a creature. The toadstools of Lantern time glow softly by day and fully at
night. The flight panel shows the season below the fairy, for example "Bubble time ·
Lollipop grove". A phone gets half of the season plants. The code is in
`src/magic-seasons.ts`.

Run `node scripts/magic-seasons-smoke.mjs "path/to/chrome.exe"` against the dev server for
the four seasons at the cottage, the next season after a hop, a pause and the phone. On
the dev server, `/?test&magic=0.5` starts in Lantern time.


## Weather

Earth has weather. Four things make the weather of a place: the place (the moisture of
its climate belt), the season, the hour and the fronts that move around the planet. So the
jungle has warm rain, the desert has a clear sky, the rain belt of the tropics follows
the Sun, and the rain is snow where the air is cold. The weather is calm: the planet has
only one or two fronts at a time, and about 87% of it has Sun, with groups of small clouds
in the clear sky. A front goes around the planet in 40 minutes, and a shower passes a
place in about 3 minutes. Each new Earth has new weather.

One small weather map (128 × 64, and 64 × 32 on a phone) holds the cloud, the rain, the
snow and the wet ground of each place. The game calculates one sixteenth of it on each
frame. Each part of Earth reads it:

- **Clouds.** Solid heap clouds with a flat base take the place of the puffs. They are
  small in fair weather and tall and grey in the rain. High wisps are above them, a grey
  layer closes the sky under a front, and a soft rain curtain shows the rain from far away.
- **Rain and snow.** Rain lines fall near the fairy, and the wind leans them. Snow falls
  only under a snow cloud.
- **Sky and light.** Under a cloud the sky is grey and the light is soft. Rain and mist
  make the view shorter. Mist lies on low ground at dawn. A rainbow stands opposite to a
  Sun that is lower than 42°. Thunder is a glow in a cloud far away.
- **Ground, water and plants.** A cloud makes a shadow. Rain makes the ground dark and
  wet and the water dull, and fresh snow stays in the cold. The wind of the plants is
  calm under a clear sky and strong in a front.
- **Stars.** The stars, the asteroid belt, the comet and the shooting stars show only
  where the night sky is clear.

With reduced motion the rain stands still and the thunder does not flash. A phone gets
half the heap clouds and half the rain lines, and no high wisps. The weather code is in
`src/weather.ts`, `src/weather-clouds.ts` and `src/weather-air.ts`; the
[weather study](docs/weather-study.md) gives the model and the decisions. The sound of
the weather, the creatures and the sticker tasks are the next step. The other worlds
keep their puffs.

Run `node scripts/weather-smoke.mjs "path/to/chrome.exe"` against the dev server for the
browser check. `/?test&weather=rain` gives the whole planet one weather (`clear`, `rain`,
`storm` or `mist`) on the dev server.

## Blossom Haven

The flower button leads to a candy home with half Earth's diameter (radius 137.5,
diameter 275 game metres), with mint-blue soda water and bubbles, and a flower cottage.
It has four gardens (look B of the [foliage study](#foliage-study)): a lollipop grove
with spiral lollipops and candy canes, also around the cottage; a cotton candy orchard
with ice cream trees; a mushroom glade with toadstools as tall as trees; and crystal
peaks on the high ground. The toadstools and the crystals glow at night. Fairytale
creatures live there: unicorns, dragonlings, kitsune kits, Frog Princes on lily
pads, and five pegasus foals that circle over the cottage garden.

The clouds are cotton candy: 50 round tufts of pink, blue and lilac floss with
spun-sugar strands, in one draw call (half on a phone). The mist in the cloud
layer is candy pink, and the sky over the cottage stays clear. The clouds are in
`src/cotton-candy.ts`; see the cotton candy cloud study below.

Home starts about **28 km from Earth** in the game's compressed solar system,
not beside it. The flower marks the cottage on Blossom Haven, including when
exploring its surface; fireflies show the safe route around intervening terrain.
Home teleports every **five minutes of active, unguided play** to a clear position
anywhere within the compact solar-system play area. Candidate positions avoid
other planets, their atmospheres, Saturn's rings, the Sun, the path and the tails of the
comet, and a nearby fairy.
The clock stops for the flower guide, including temporary
steering overrides while that guide remains enabled. Use **Stop following** to
return to manual flight and resume the relocation clock. Manual approach does
not stop relocation.

When she is visiting (inside the atmosphere plus a small margin), the fairy,
camera, trail, and home move together. The terrain seed, cottage, and discovery
remain unchanged. The flower guide updates immediately and a gentle notice
announces the move. No countdown or deadline is shown. Pause, customization,
the world map, and background tabs do not advance the clock. Reloading starts
a fresh interval and the initial distant location; discovery stays saved.

Run `node scripts/blossom-smoke.mjs "path/to/chrome.exe"` against the dev server
for the five-minute clock, guided lock, arrival, visitor/camera carry, and mobile
browser checks. Pure simulation tests cover placement and relocation safety.

## Sticker book

Each of the 13 worlds gives a sticker the first time the fairy arrives: the
Sun, the eight planets, the Moon, Ceres, Vesta and Blossom Haven. A world counts
as reached when the flight panel says the fairy is near it: closer than 85 m, or
1.5 times the atmosphere, whichever is larger. The fairy starts on Earth, so the
Earth sticker comes when she flies out to space and comes back: the same new
visit that makes a new landscape. A note shows the new sticker and one short fact, and the chime plays
when the sound is on. Every fourth sticker has a bigger note.

The stickers are in **Worlds**, under the map. The **Worlds** button shows the count,
for example "3/13". Flight waits while **Worlds** is open, and Escape closes it. Tap a
card to read its fact or a hint, then **Fly there** for a guided flight. A card with its
sticker looks like a sticker.

The worlds open one at a time. A new book opens Earth, Blossom Haven and the Moon. The
other worlds are mysteries: a grey "?" on the map and in the book, with no path. Each
new sticker opens the next door: the nearest empty space on the poster (`nextDoor()` in
`src/stickers.ts`). The order is the Moon, Venus, Mercury, the Sun, Mars, Vesta, Ceres,
Jupiter, Saturn, Uranus, Neptune, then Earth. A fairy who finds a world in free flight
gets its sticker, and that world opens too. The note at the top of **Worlds** always
says what is next. Earth and Blossom Haven are always open: the way home, and the flower
guide. The Sun is on the map from the start, but it opens in its turn.

The book is saved in this browser as `fairy-sticker-book`. Every player earns the
Blossom Haven sticker with a visit, also a player who found the home before. The
stickers, their facts and the rule of the open worlds are in `src/stickers.ts`; the book
is `src/sticker-book.ts`, and **Worlds** draws it (`src/adventure.ts`). This is option A of
the sticker book study below, without the voice, in the one book of option D of the world
book study.

Run `node scripts/sticker-book-smoke.mjs "path/to/chrome.exe"` against the dev
server for no sticker at the start, the book in **Worlds**, the next door and the
locks, **Fly there** to the Moon, the Earth sticker after the return, the saved book
and the phone layout. An optional second argument sets the server origin, for example a server
without file watching.

## Postcard camera

The camera button takes a picture of the flight (F5 of the
[feature ideas study](#feature-ideas-study)). A soft white flash shows, then a postcard:
the picture in a white border with a small tilt, the name of the nearest world in the
display font, "A POSTCARD FROM YOUR JOURNEY", and the sticker picture of the world as a
stamp. The picture is the 3D view only. The panels and the buttons of the screen are not
in it.

- On a computer the camera is the second round button of the toolbar. On a touch screen
  it is **Postcard** in **Menu**, as the other extra controls of the screen study. The
  top row of a phone has no space for a fourth button at 320 px.
- **Save** downloads a PNG of the whole card, for example `fairy-postcard-earth.png`. The
  card is 1280 pixels wide from a wide screen (1280 × 950 from a 16:10 screen), and
  980 × 1400 pixels from a phone that is upright.
- **Share** shows only when the device can share a picture file
  (`navigator.canShare({ files })`). It opens the share sheet of the device.
- Nothing leaves the device without a tap on **Save** or **Share**.
- Flight waits while the postcard is open. Escape, the × button or a tap outside the card
  closes it. The focus goes to **Save**, and then back to the camera button (to **Menu** on
  a touch screen).
- With reduced motion, the flash and the slide do not show. The card keeps its tilt.

The renderer clears its picture after each frame, so the camera renders a new frame and
copies the canvas in the same call. The game does not use `preserveDrawingBuffer`. The
picture keeps the shape of the view from 3:4 to 16:9 and cuts the rest at the middle. The
layout numbers, the file name and the drawing of the card are in `src/postcard.ts`; the
button and the dialog are in `src/postcard-camera.ts`.

Run `node scripts/postcard-smoke.mjs "path/to/chrome.exe"` against the dev server for the
button, the flash, a real picture, Save, Share, the wait of the flight, Escape, the focus,
reduced motion, a postcard from the Moon and the phone Menu at 390 and 320 px. An optional
second argument sets the server origin. Screenshots and the saved cards are written to
`artifacts.local/postcard/`.

## Settings

The gear button beside the camera button opens **Settings**, a panel for
grown-ups. On a touch screen, **Settings** is in Menu. Flight waits while it is
open, and Escape closes it. The panel is in `src/settings.ts`. It has five parts:

- **Sound**: the soft hum and the chimes. The switch is a tap, so the browser lets
  the sound start. It is off at each visit.
- **In the sky**: **Star pictures**, **Orbit paths** and **World speed** (1×, 8×,
  16×, 32× or 64×). **Orbit paths** shows the coloured lines in the sky only; the
  **Worlds** map always shows its paths. The two switches stay after a reload
  (`fairy-settings` in `localStorage`); World speed starts at 1× at each visit.
- **How to fly**: the keys on a computer, the touch buttons on a touch screen.
- **Sticker book**: the reset below.
- **Pictures in the sky: credits**: the star data and the ten Webb pictures.

**Reset sticker book** shows how many stickers the book has, then asks for a
confirmation before it removes them: "Remove all 5 stickers? This cannot be
undone." **Keep the stickers** has the focus, so an extra Enter changes nothing.
After a reset, the world where the fairy is gives no sticker until she leaves it.
The reset also closes the worlds again: only Earth, Blossom Haven and the Moon stay
open. The fairy look and the home discovery stay.

Run `node scripts/settings-smoke.mjs "path/to/chrome.exe"` against the dev server
for the panel, the confirmation, the reset at the Moon, Escape, the four toolbar
buttons, the sky switches, World speed, the sound, the saved switches and the phone menu.
An optional second argument sets the server origin.

## Character customization

Choose **Choose your look** on the welcome card, or the palette button during
flight. Pick one of nine hair styles (Bun, Bob, Tails, Space buns, Cloud curls,
Ponytail, Long braid, Twin braids, Long waves) and one of twelve wings (Dew glass,
Glitter vein, Leaf glass, Silk pleats, Rainbow cells, Swirl and gems, Monarch,
Swallowtail, Frost, Starlight, Autumn leaf, Aurora). Then pick one of ten colors each for the hair, dress, wings and skin.
Each choice applies instantly and is saved in this browser. The camera moves
closer and flight waits while the panel is open; close it or press Escape to return.

The fairy has the Storybook body of the [fairy body study](#fairy-body-study): one
bodice with a waist, a pointed petal skirt, capsule limbs with fixed bones, arms that
float and reach ahead in boost, soft wrists, pointed toes, a face, and a petal bow
that holds the wings. Her head lifts to look where she flies. The body is in
`src/fairy-body.ts`.

The leggings and shoes use a deep shade of the dress color. Each wing color
has a matching sparkle for the glow and trail. Option names, colors and
defaults live in `src/customization.ts`. Looks saved with the old Rose, Moon
and Fern palettes convert to the matching colors on load.
The body and hair geometry is built once in `createFairyRig` in `src/fairy.ts`; switching
styles changes visibility, and switching colors updates shared materials. The wings are
in `src/fairy-wings/` (see the [fairy wing study](#fairy-wing-study)): each wing is a set
of painted panels with a shader for the colour shift, the glitter and the light through
the wing. Each wing takes the wing color. A look saved
with Petal, Luna or Flutter gets Dew glass, Glitter vein or Swirl and gems. The hair
styles are in `src/fairy-hair.ts`. The Ponytail, Long braid, Twin braids and Long
waves swing gently with the flight and straighten along her body in boost. The six
newer styles stay clear of the wings and the pointed ears in every wing shape.

Run `node scripts/browser-smoke.mjs "path/to/chrome.exe" --customization`
for the focused desktop/mobile check, including saved selections after reload.

## Fairy flight pose study

Visit `/studies/fairy-flight-study.html` on the dev server for an interactive comparison
of three normal/boost animation directions. Inspect rear, three-quarter and side
views, adjust body lean and camera elevation, test silhouettes at gameplay size,
and download the preferred direction as JSON. The game now uses **B — Sky Dancer**:
32° normal flight with open arms and staggered legs, and a 66° forward-reaching
Shift boost. Transitions take 0.25 seconds into boost and 0.4 seconds back to cruise.
The study shares the game's character rig; its controls only change the preview.
With the Storybook body, the three directions change the lean, the legs and the
wingbeat; the arms use the floating arm pose in every direction.
Research and design notes are in
[docs/fairy-flight-study.md](docs/fairy-flight-study.md).

## Fairy hair study

Visit `/studies/hair-style-study.html` for **Hair that flies with her**, a study of eight
new hair styles on the fairy rig of the game: Pixie, Space buns, Cloud curls,
Ponytail, Crown braid, Long braid, Twin braids and Long waves. See each style from
the menu and flight cameras of the game, in cruise and in boost, with the hair in
motion. Compare all eleven styles at close range and at flight distance, see how the
customization menu would look, make a shortlist, and export it as JSON. The long
styles swing and straighten along the body in boost. The page measures each style
on the rig: the hair seen from behind, the ears, and contact with the wings.
The study controls do not change the game.

The game now has the six recommended styles: Space buns, Cloud curls, Ponytail,
Long braid, Twin braids and Long waves, with the gentle hair motion. The study also
found that Tails and Bob pass through the transparent wings; they keep their first
shape, because a position clear of the wings changed their look too much.
Pixie and Crown braid stay in the study. The study and the game share the hair
geometry in `src/fairy-hair.ts`. The [technical study](docs/hair-style-study.md)
gives the measurements, the rules, and the integration.

Run `node studies/hair-style-study/hair-study-smoke.mjs "path/to/chrome.exe"` against port 5174
for desktop/mobile checks, export checks, and screenshots.

## Fairy body study

Visit `/studies/fairy-body-study.html` for **A fairy in one piece**, a study of the body of
the fairy. Today she is 26 separate shapes: her shoulders stand away from her body,
her limbs stretch, and her wings float behind her back. Compare today with three
options on the same head, hair, wings and flight pose: **A — Joined joints** (balls
at the joints, puff sleeves, and a bow that holds the wings), **B — One smooth body**
(one bodice with a waist, tapered limbs with fixed bones, a petal skirt, a face) and
**C — Storybook fairy** (B, with longer legs, arms that float and reach ahead in
boost, pointed petals that move with the wings, soft wrists, pointed toes, and a
head that looks where she flies). Show the
joints, see each body beside today, compare all four in the line-up, and export the
settings. Its controls do not change the game.

The page measures each joint, the bone stretch, the gap at the wing roots, the
angle of the face and the hand motion. The game now uses option C; see
[Character customization](#character-customization). In the study, *Today* is the
body of the game before this change. The [technical study](docs/fairy-body-study.md)
gives the numbers, the two-bone solve, and the game integration.

Run `node studies/fairy-body-study/body-study-smoke.mjs "path/to/chrome.exe"` against port 5174
for desktop/mobile checks, export checks, and screenshots.

## Creature study

Visit `/studies/creature-study.html` for **Little lives**, an interactive proposal for
rabbits, sheep, ducks and cows on Earth and Blossom Haven. Compare simple animal
features, inspect close-ups, show safe walking/swimming paths, regenerate
terrain, and shuffle residents. Land animals stay on dry ground and ducks stay
on water; unsuitable spawns are skipped. Export your study settings as JSON.

All four animals now also live in the flight game on Earth. On Blossom Haven,
fairytale creatures take their slots (see the fairytale study below).
Rabbits, sheep, and cows wander on dry ground; ducks paddle on water. Spawns and
short routes adapt to the rendered terrain and avoid trees, candy scenery, and
the cottage. Earth gets new residents when its terrain regenerates; Blossom
Haven keeps its residents on return visits and when its world moves. Flight
pause also pauses wildlife. Distant animals are culled to keep rendering light.

The study remains an independent place to try optional features; its settings
do not change the game. [Design and habitat rules](docs/creature-study.md)
describe both versions.

Run `node studies/creature-study/creature-smoke.mjs "path/to/chrome.exe"` for its browser checks.
Run `node scripts/wildlife-smoke.mjs "path/to/chrome.exe"` to check creatures in
the actual game, including movement, pause, both populations, the fairytale
residents and pegasus foals after arrival at Blossom Haven, and mobile rendering.

### Creature hello

The creatures say hello to the fairy. Fly low near an animal on Earth or a
fairytale creature on Blossom Haven. When the fairy is 6 m or nearer, or comes that near in the next second, the
creature turns to her and hops two times on its ground. Ducks and Frog Princes
bob on the water. Two or three small pink hearts float up from the head, sway
and fade. A soft two-note chime plays when Sound is on. Hellos that come close
together share one chime. Each creature says hello again only after 8 s. The
pegasus foals in the air do not say hello.

- `greet()` of the population (`src/creatures/population.ts`) runs after
  `update()`, because `update()` puts each model back on its route. The hop goes
  along the ground normal in the frame of the world. Thus the creature stays on
  its ground when the world turns and when Blossom Haven moves.
- The rules and the hearts are in `src/creatures/hello.ts`. All the hearts of a
  world are one point cloud with one shared texture: one draw call. A phone
  shows half the hearts (1 or 2 for each hello, 12 in the pool instead of 24).
- Pause stops the hellos, as it stops the creatures.
- The test snapshot gives `hellos` (the total) and, for each world in
  `wildlife`, `hellos` with the count, the hearts and the active hellos.

Run `node scripts/creature-hello-smoke.mjs "path/to/chrome.exe" [origin]` against
the dev server to check the hello in the game: a low pass on Earth, the hop, the
hearts, the chime, the pause, the rest time, a fairytale creature on Blossom
Haven, a Frog Prince bob when one is near, and a phone at 390 px. The
screenshots go to `artifacts.local/creature-hello/`.

## Fairytale creature study

Visit `/studies/fairytale-creature-study.html` for **Once upon a meadow**, the study that
replaced every Blossom Haven creature with a fairytale creature. The unicorn
replaces the cow, the dragonling the sheep, the kitsune kit the rabbit, the Frog
Prince the duck, and the pegasus foal the ribbon butterflies. Each creature keeps
the habitat, footprint, speed and count of the creature it replaces. Compare the
animals from before with the fairytale creatures on the home terrain, by day and
by night. Inspect close-ups, turn off the details and the magic, and see the whole
cast beside the fairy at close range and at flight distance. Export the settings as JSON.

The game now uses these creatures on Blossom Haven, with every detail and all
the magic on. Earth keeps its animals. The models are in
`src/creatures/fairytale-models.ts`; the game builds them with `merge: true`, which
joins the static parts into 14 to 21 meshes per creature. The study controls change
only the study. The [technical study](docs/fairytale-creature-study.md) gives the
design rules, the draw cost, and the integration.

Run `node studies/fairytale-creature-study/fairytale-study-smoke.mjs "path/to/chrome.exe"` against port 5174
for desktop/mobile checks, export checks, and screenshots.

## Candy planet study

Visit `/studies/candy-planet-study.html` for the smaller candy-home concept: soda-water
rivers, lollipop trees, candy canes, clouds, butterflies, and a flower cottage.
Explore seven ecosystem notes in live 3D and compare a fixed outer-rim home,
a reliable flower doorway, and an optional 20-minute roaming planet. The time
simulator preserves the original comparison; changing study controls does not
change the game. The selected live version now uses the candy ecosystem and
the five-minute relocation rules above, not the original 20-minute proposal.
Details and research are in
[docs/candy-planet-study.md](docs/candy-planet-study.md).

Run `node studies/candy-planet-study/candy-study-smoke.mjs "path/to/chrome.exe"` for desktop/mobile
checks of the study, teleport safeguards, and JSON export.

## Day and night study

Visit `/studies/day-night-study.html` for **When the world turns**, an interactive lighting
proposal. Scrub dawn, noon, sunset and night in the same 3D garden, compare gentle
and deep nights, play a day, and export the settings. The
[technical study](docs/day-night-study.md) covers the existing light, solar
geometry, atmosphere, stars, planet differences, and the polar cottage edge case.

The game now has this day and night cycle. The Sun is the light source for every
world, so each planet has a day side and a night side. The local sky, fog, stars,
ambient light and atmosphere follow the Sun's elevation at the fairy. Axial spin,
orbits, flight and relocation all change that elevation; there is no separate day
clock. At 1× orbital speed a solar day is about 225 seconds on Earth and 277 on
Blossom Haven. Nights are gentle: a soft lilac fill keeps terrain readable, and
lit cottage windows glow brighter. Planets block sunlight to the far side and cast
eclipses (`src/sun-shading.ts`). Thresholds and night palettes are in
`src/daylight.ts`. The first flight starts in mid-morning on Earth.

The cottage is at Blossom Haven's south pole, so spin does not change its light.
Its sky depends on where home is: golden hour at the start position, and day or
night after a move.

Run `node studies/day-night-study/day-night-study-smoke.mjs "path/to/chrome.exe"` against port 5174
for desktop/mobile controls, export checks, and screenshots.

## Phone and iPad study

Visit `/studies/mobile-study.html` for the mobile compatibility review, a screen-size
comparison, and a 14-question brief covering devices, touch controls, layout,
performance and delivery. Answers save in this browser and export as Markdown.
The optional browser check reports WebGL 2 and touch capability, not game speed.

The study records the original gaps. The accepted controls, responsive layout,
background pause and mobile graphics budget are now implemented; see
[Mobile play](docs/mobile-play.md). The [technical study](docs/mobile-compatibility-study.md)
retains the baseline evidence and physical-device test matrix.

With Vite on port 5174, run
`node scripts/mobile-audit.mjs "path/to/chrome.exe"` to reproduce the layout
audit. On the same Wi-Fi, open `http://<computer-LAN-IP>:5174/studies/mobile-study.html`
after starting Vite with `npm run dev -- --host 0.0.0.0 --port 5174`.

## Star map study

Visit `/studies/star-map-study.html` for **A sky full of stories**, a proposal for a
larger star map. Compare the game sky of today with 24 star pictures, 2,887 real
stars from the Bright Star Catalog, a Milky Way glow, and ten James Webb Space
Telescope pictures. Turn to any picture, change the faintest star, and export
the settings. The game now uses this proposal; the study keeps the sky from
before the change as its comparison, and its controls do not change the game.

The Webb pictures are ESA/Webb images under CC BY 4.0; the page shows the full
credit for each one. The [technical study](docs/star-map-study.md) covers the
catalog, the picture set, the image license, placement, cost, and the steps to
bring it into the game. `node scripts/star-map-data.mjs` regenerates the star
data and downloads the image previews.

Run `node studies/star-map-study/star-map-study-smoke.mjs "path/to/chrome.exe"` against port 5174
for desktop/mobile checks, credits, export, and screenshots. Run
`node scripts/star-sky-smoke.mjs "path/to/chrome.exe"` to check the sky in the game:
the toggle, the names, the Webb caption credit and the Worlds credits.

## Asteroid belt study

Visit `/studies/asteroid-belt-study.html` for **Rocks between the worlds**, a proposal
for an asteroid belt between Mars and Jupiter. Compare three options in live 3D:
**A — Glitter ribbon** (dust and a faint glow), **B — Rock ring** (3,200 rocks
all around the Sun), and **C — Living belt** (the glow of A, rocks near the fairy,
and Ceres and Vesta to visit). See each option from the whole system, from Mars,
and inside the belt with the fairy. The study shows the cost of each option on
a computer and a phone, and exports the settings. Its controls do not change the
game. The game now uses option C; see [Asteroid belt](#asteroid-belt).

The [technical study](docs/asteroid-belt-study.md) covers the free space in the
gap, the relocation problem that every option must fix first, the files to
change, and the recommendation.

Run `node studies/asteroid-belt-study/asteroid-belt-study-smoke.mjs "path/to/chrome.exe"` against
port 5174 for desktop/mobile checks, export checks, and screenshots.

## Sticker book study

Visit `/studies/sticker-book-study.html` for **Every world, a sticker**, a proposal for
a sticker book for young players. Each world gives a sticker the first time the
fairy arrives, and a voice says one short fact. Compare three options:
**A — Stamp card** (one sticker for each world), **B — Hello and search**
(A, plus a shiny star for one search task on each world), and **C — Space poster**
(the child puts each sticker on its path around the Sun). Pretend to fly,
collect stickers, turn the voice and the words on or off, and export the
settings. The study saves its own book; its controls do not change the game.
The game now uses option A without the voice; see [Sticker book](#sticker-book).
The voice stays in the study for later.

The [technical study](docs/sticker-book-study.md) covers the arrival test, the
voice, every spoken line, the checks for the search tasks, and the steps to
bring the book into the game. The lines are in `studies/sticker-book-study/model.ts`;
a test keeps them short and free of numbers.

The voice is recorded with Kokoro-82M, an open neural voice (Apache-2.0), into
`public/voice/`. **Language of the book** switches between English and European
Portuguese. Kokoro has no European Portuguese voice, so espeak-ng makes the
European Portuguese phonemes and the English voice Heart says them; an accent can
remain. **Voice** compares the recorded voice with the browser voice.
After a change of text, record the changed lines again:
`npm install --no-save kokoro-js @breezystack/lamejs @echogarden/espeak-ng-emscripten`,
then `node studies/sticker-book-study/sticker-voice.mjs`. The first run downloads the model (about 330 MB).

Run `node studies/sticker-book-study/sticker-book-study-smoke.mjs "path/to/chrome.exe"` against
port 5174 for the stickers, the voice lines, the poster hints, the saved book,
export checks, and 390/320 px screenshots.

## Cotton candy cloud study

Visit `/studies/cotton-candy-study.html` for **Spun-sugar skies**, a proposal to make
the clouds of Blossom Haven into cotton candy. Compare the clouds from before with
three options over the real home terrain: **A — Candy tint** (the same clouds in
pink, blue and lilac), **B — Spun-sugar puffs** (round tufts with spun-sugar
strands and one draw call), and **C — Floss on a cone** (B, with striped paper
cones and sugar sparkles). See each option from the garden, in the cloud layer
behind the fairy, and from space, by day, at golden hour and at night. Change
the mist of the cloud layer from white to candy pink, and export the settings.
Its controls do not change the game. The game now uses option B with the pink
mist; the study keeps the clouds from before as **Before**.

The [technical study](docs/cotton-candy-cloud-study.md) covers the sun shading
limit on the cloud material, the white mist, the olive cloud bases, the clear
column above the cottage, the cost of each option, and the files that changed.

Run `node studies/cotton-candy-study/cotton-candy-study-smoke.mjs "path/to/chrome.exe"` against
port 5174 for desktop/mobile checks, export checks, and screenshots.
Run `node scripts/cotton-candy-smoke.mjs "path/to/chrome.exe"` to check the
clouds in the game: the puffs on a computer and a phone, the pink mist in the
cloud layer of Blossom Haven, the white mist on Earth, and shader errors.

## Moon study

Visit `/studies/moon-study.html` for **A moon for the fairy**, a proposal for a Moon that
orbits Earth. Compare three options in live 3D: **A — Sky Moon** (a picture in
Earth's sky), **B — Close Moon** (528 m from Earth, the same size as the Sun from
the ground), and **C — Journey Moon** (1,100 m, on an orbit tilted 28°). See each
option from space, from a meadow on Earth, and from the Moon behind the fairy.
Play one game year, jump to the next full moon or eclipse, change the orbit tilt,
and turn the proposed fixes on and off. Its controls do not change the game.

The [technical study](docs/moon-study.md) covers the month of 300 s, the tidal
lock, why Earth's wide shadow darkens each full moon at a small tilt, the
relocation and carry problems that a Moon world must fix first, the fog and light
fixes, and the files to change. The game now uses option C; see [The Moon](#the-moon).

Run `node studies/moon-study/moon-study-smoke.mjs "path/to/chrome.exe"` against port 5174
for the options, the views, the eclipse jumps, export checks, and 390/320 px
screenshots. An optional second argument sets the server origin.

## Proportions study

Visit `/studies/proportions-study.html` for **How big is a world?**, a study of the sizes
of the worlds and the space between them. From far away the Moon looks like one
more planet, because its orbit is 56% of the distance from Earth to Mercury.
Six sliders change the planet size, the spacing, the Moon's orbit and size, the
flight speed in open space and the Sun size. Twelve targets give a pass or a fail,
and a search finds the smallest change that meets every target for a planet size.
See the result from far away, as the whole system, as Earth and the Moon, and from
Earth's ground. Its controls do not change the game.

The [technical study](docs/proportions-study.md) explains the findings and lists
the constants to change. The recommendation is planets ×1.25, spacing ×2.5, the
Moon at 3.5 Earth radii with its real size, and 2.25 times the flight speed in
open space. No setting meets every target with planets 1.5 times as large.
The game now uses the recommendation, with the Sun at ×1.6 and trees at their
base density. In the study, *Today* is the game before this change.

Run `node studies/proportions-study/proportions-study-smoke.mjs "path/to/chrome.exe"` against port
5174 for the presets, the search, the views, export checks, and 390/320 px
screenshots. An optional second argument sets the server origin.

## Planet look study

Visit `/studies/planet-look-study.html` for **Worlds worth the trip**, a study of the look
of the seven planets. Earth and Blossom Haven stay as they are. Compare the planets
from before the study with three options: **A — Retune** (the same code with new numbers),
**B — Storybook paint** (A, plus a map for each planet that the graphics card paints
from the pictures), and **C — Photo maps** (A, plus the Solar System Scope maps,
CC BY 4.0, in `public/planets/ssc/`). See each planet as a portrait, on approach and
in flight, side by side with **Before**, beside its reference map and its measured
colours. Its controls do not change the game. The game now uses option B, with rounder
rocky worlds (see [Flight](#flight)); the study keeps the old look as **Before**, made
again from a copy of the old code in `studies/planet-look-study/legacy.ts`.

The study found six causes of the dull look: bands with half the contrast of the
pictures, a lit night side, cloud puffs that show as flakes from space, a thick air
halo, shadows cast from behind the Sun (Venus and Jupiter before the proportions
change; Blossom Haven after a move now), and Saturn's rings 11.7° off its equator. The [technical study](docs/planet-look-study.md)
gives the numbers, the cost and the files that changed.

Run `node studies/planet-look-study/planet-look-study-smoke.mjs "path/to/chrome.exe"` against port
5174 for all 21 looks, the views, export checks, and 390/320 px screenshots. It uses
the graphics card; add `--swiftshader` for software rendering. An optional second
argument sets the server origin.

## Sun study

Visit `/studies/sun-study.html` for **Here comes the Sun**, a study of the look of the Sun.
Compare the Sun from before the study with three options: **A — Retune** (limb darkening, a brighter
core, a glare with no edge, and a Sun that shows in the sky of Earth), **B — Living Sun**
(A, plus granules, sunspots, a turning surface, the corona, the chromosphere and
prominence loops, all made on the graphics card), and **C — Camera light** (B, plus
bloom and lens flare). See the Sun from space, at its edge, in flight 40 m above it and
from Earth's meadow at three Sun heights, side by side with **Before**. Measure the frame
time of the four options. Its controls do not change the game. The game now uses option B
(see [Flight](#flight)); the study keeps the old Sun as **Before**, made again from a copy
of the old code in `studies/sun-study/legacy.ts`.

The study found six causes of the flat look: one colour from the centre to the edge, a
disc dimmer than a sunlit cloud, a glow that stops at 2.04 radii, a Sun that the fog and
the air hide from the meadow, no motion, and no surface detail for the fairy to fly over.
The recommendation was A, then B with its phone shader, and not C. The
[technical study](docs/sun-study.md) gives the real values, the numbers, the cost and the
files that changed.

Run `node studies/sun-study/sun-study-smoke.mjs "path/to/chrome.exe"` against port 5174 for the
four views in four options, the pixel checks, the frame times, export checks, and 390/320
px screenshots. It uses the graphics card; add `--swiftshader` for software rendering.
An optional second argument sets the server origin.

Run `node scripts/sun-smoke.mjs "path/to/chrome.exe"` against the dev server for the Sun
in the game: the living Sun, the Sun in the sky of the meadow, its motion, a guided trip
to the Sun and the phone shader. Add `--swiftshader` for software rendering.

## Planet transition study

Visit `/studies/planet-transition-study.html` for **Into the air, out to the stars**, a
study of the flight into a world and out of it. The live view flies the Earth and the fairy
of the game with four rule sets: **Today** (the flight code of the game), **A — Retune**
(no snaps, a gentle brake, no trap at the edge of space), **B — One sky** (one steering
rule everywhere, with an up of the sky that turns from the solar system to the world) and
**C — Cloud door** (B, plus a short glide through a cloud veil and a lift to space). Play six
scripted moments, or fly from the meadow or from space with the keys. Charts compare the
altitude, the largest turn in one frame and the speed of the four rule sets. Its controls
do not change the game.

The study found nine causes of the jarring transition. The largest: W and S turn a loop
above 151 m, so a fairy that holds W comes back to Earth upside down (a turn of 169° in one
frame); a fairy that lets go above the clouds stays at the edge of space; a fairy with no
key never comes into the air; and the approach brakes at about 1,000 m/s². The
recommendation is B. The study is parked with no decision; the game keeps its flight of
today. The [technical study](docs/planet-transition-study.md) gives the numbers, the
options, the decisions to make and the steps to start again.

Run `node studies/planet-transition-study/transition-study-smoke.mjs "path/to/chrome.exe"` against port 5174 for
the score table, the charts, a dive with each option, a free-flight climb, export checks,
and 390/320 px screenshots. An optional second argument sets the server origin.

## Screen study

Visit `/studies/ui-simplify-study.html` for **Fewer buttons, more sky**, a study of the
controls on the flight screen. A working drawing of the screen compares **Today**,
**A — Two switches** (Star pictures and Orbit paths in Settings), **B — Grown-up corner**
(A, plus World speed and the credits in Settings, and no dead or debug parts) and
**C — Four buttons** (B, plus Sound and the keys in Settings) on a computer and a phone.
The game now uses option C, without **Guide me home**: the Blossom Haven picture in
**Worlds** starts the flower guide. The [technical study](docs/ui-simplify-study.md) gives
the findings, the options and what changed.

Run `node studies/ui-simplify-study/ui-study-smoke.mjs "path/to/chrome.exe"` against port 5174 to check the
game controls, each option of the study, export, and 390/320 px layouts.

## World book study

Visit `/studies/world-book-study.html` for **Every world, one book**, a study that merges
**Worlds** and **My space stickers** into one book, and opens the solar system as the fairy
discovers it. A working drawing of the dialog compares **Today** (two dialogs),
**A — One book** (the merge), **B — The map fills in** (mystery worlds until the first
arrival), **C — Earn the way** ("Fly here" only for a world with its sticker, and for Earth
and Blossom Haven) and **D — Next door** (C, plus one open mystery: the next door of the
book). Pretend flights fill the book; pretend free flights find a world with no guide.
Its controls do not change the game.

From Earth most worlds are 1° to 3° wide in the view, but Ceres and Vesta are 0.18°. C
asks for eleven free flights, and a child who cannot find a small world cannot go on. The
recommendation is D, and the game now uses it; see [Sticker book](#sticker-book). The
[technical study](docs/world-book-study.md) gives the distances, the options and what
changed.

Run `node studies/world-book-study/world-book-study-smoke.mjs "path/to/chrome.exe"` against
port 5174 to check each option, the pretend flights, export, and 390/320 px layouts.

## Feature ideas study

Visit `/studies/feature-ideas-study.html` for **Ten ideas, seen in flight**, a study of ten
features that the game does not have: search stars, spoken facts, creature hello, sparkle
rings, a postcard camera, a song for each world, a game controller, comets and shooting
stars, a bedtime timer, and install and fly offline. Each idea has a clip from the engine
of the game: the real worlds, the fairy and the screen of the game, with the idea added by
study code. **Sound** plays the chimes, the voice and the songs in step with the clip, and
**Fly it live** runs the idea in live 3D. Pick the ideas at the end of the page. Its
controls do not change the game.

The recommendation is F1, F2, F3 and F5 first. The [technical study](docs/feature-ideas-study.md)
gives the findings, the place of each change, the limits and how the clips were made. The
clips are in `public/studies/feature-ideas/`. Run
`node studies/feature-ideas-study/feature-ideas-study-capture.mjs "path/to/chrome.exe" F1,F2`
against port 5174 to record the clips of F1 and F2 again.

## Seasons study

Visit `/studies/seasons-study.html` for **A year on two worlds**, a study of seasons on
Earth and on Blossom Haven. Earth gets the seasons of the real world, and the place
changes the season: the north has summer while the south has winter, the equator has no
season, and the poles have one long day and one long night. Blossom Haven gets four magic
seasons of its own, each with its own plants: **Blossom time** (blossom trees and giant
flowers), **Bubble time** (bubble blooms), **Lantern time** (giant toadstools that glow)
and **Crystal time** (sugar crystals). A magic season starts at the cottage and goes out
over the planet in a ring. Eight clips from the engine of the game show the two worlds
from space and from one place. **Try it live** gives you the world, the place, the year
and free flight. Its controls do not change the game.

For Earth the study compares **A — Real tilt** (the axis leans 23.4° and the orbit makes
the year) with **B — Painted year** (no tilt; a season clock paints each latitude). The
game now uses A, with the year started at the real date; see [Seasons](#seasons). For
Blossom Haven the decision is the four magic seasons with no tilt, and the next season at
each hop of the planet. The game now has them too. The [technical study](docs/seasons-study.md) gives the findings, the model,
the change for each part and the limits. The clips are in `public/studies/seasons/`. Run
`node studies/seasons-study/seasons-study-capture.mjs "path/to/chrome.exe" E1,E2` against
port 5174 to record the clips of E1 and E2 again.

## Foliage study

Visit `/studies/foliage-study.html` for **Each plant, a place to grow**, a study of the
trees and the small plants of Earth and of Blossom Haven. Before the study, Earth had one
cone tree, and Blossom Haven had one mix of candy. The study has 25 kinds of plants and three looks
for each world. Earth: **A — Mixed wood**, **B — Climate belts** (jungle, savanna, desert,
leaf forest, pine forest, snow line) and **C — Four seasons**. Blossom Haven:
**A — Sweet shop**, **B — Four gardens** (lollipop grove, cotton candy orchard, mushroom
glade, crystal peaks) and **C — Blossom orchard**. Each look has a clip from the engine of
the game, on the real terrain, next to the plants from before on the same flight path.
**Fly it live** runs a look in live 3D, with a switch for each of the five levers: woods
and glades, size and colour, wind, ground colours and night. Its controls do not change
the game.

The game now uses B for both worlds, with all the levers. The study keeps the plants
from before as **Before**. The [technical study](docs/foliage-study.md) gives the
findings, each plant, the rule of each zone, the cost and what changed in the game. The clips are in
`public/studies/foliage/`. Run
`node studies/foliage-study/foliage-study-capture.mjs "path/to/chrome.exe" E2,H2` against
port 5174 to record the clips of E2 and H2 again.

## Earth landmarks study

Visit `/studies/earth-landmarks-study.html` for **Twelve wonders, on one small Earth**, a
study of famous landscapes of the real Earth on the Earth of the game: the Grand Canyon,
Mount Fuji, the dunes of the Sahara, Ha Long Bay, a coral atoll, the ice of Antarctica,
Angel Falls, Monument Valley, the Giant's Causeway, a fjord, a rainbow hot spring and the
rainbow mountains. Each landmark has a clip from the engine of the game, next to a photo
of the real place. **Fly it live** runs the Earth of the study in live 3D. Each landmark
is a patch of fine ground at a place that a search finds, with objects on it: trees, stone
columns, penguins, a lagoon, waterfalls, steam and a geyser. Its controls do not change
the game.

The recommendation is the patch method first, then eight landmarks. The
[technical study](docs/earth-landmarks-study.md) gives the findings, the method, each
landmark, the cost and the photo credits. The clips are in
`public/studies/earth-landmarks/`. Run
`node studies/earth-landmarks-study/earth-landmarks-study-capture.mjs "path/to/chrome.exe" L1,L2`
against port 5174 to record the clips of L1 and L2 again.

## Fairy wing study

Visit `/studies/fairy-wing-study.html` for **Wings that catch the light**, a study of
twenty new wings for the fairy and of six changes to how the game draws a wing. Before the
study, the game had three wings (Petal, Luna and Flutter), each a flat shape of one pale
colour; the study shows them as **Before**. The twenty wings are in five families: glass (Dew glass,
Glitter vein, Leaf glass, Dragonfly), butterfly (Rainbow cells, Swirl and gems, Monarch,
Peacock eye, Moon moth, Swallowtail), fabric (Silk pleats, Feather), nature (Frost, Petal
bloom, Autumn leaf) and magic (Stained glass, Starlight, Soap bubble, Candy swirl,
Aurora). Each wing has a clip from the engine of the game. **See it live** runs a wing in
live 3D, with the ten wing colours of the menu, day and night, and a switch for each of
the six changes: painted membrane, veins and edges, colour shift, glitter, light through
the wing and soft wing beat. Its controls do not change the game.

Twelve wings are selected for the game: Dew glass, Glitter vein, Leaf glass, Silk pleats,
Rainbow cells, Swirl and gems, Monarch, Swallowtail, Frost, Starlight, Autumn leaf and
Aurora. The game now has these twelve wings with the new rendering, in place of the three
wings from before. The other eight wings stay in the study. The
[technical study](docs/fairy-wing-study.md) gives the findings, each wing, the method,
the cost and the limits. The clips are in `public/studies/fairy-wings/`. Run
`node studies/fairy-wing-study/fairy-wing-study-capture.mjs "path/to/chrome.exe" dew,glitter http://localhost:5174`
to record the clips of Dew glass and Glitter vein again.

## Weather study

Visit `/studies/weather-study.html` for **A sky that changes**, a study of weather on
Earth: rain, snow that falls from a cloud, wind, morning mist, a rainbow and thunder far
away, with new clouds in place of the puffs of the game. In the study, four things make the weather of a place: the
place (the climate belts of the game), the season, the hour and the fronts that move
around the planet. So the jungle has warm rain, the desert has a clear sky, the rain belt
of the tropics follows the Sun, and rain becomes snow in the cold. One small weather map
holds the cloud, the rain and the wet ground of each place. The clouds, the light, the
fog, the ground, the water, the plants and the stars read it. The new clouds are solid heap clouds, high wisps, a grey
layer under a front and rain curtains. Ten clips from the engine
of the game show the weather from space and from the ground. **Try it live** gives you
the place, the day, the hour, the sky and free flight. Its controls do not change the
game. The study does not include Blossom Haven.

The study compares **A — A weather map** (each place has its own weather) with
**B — One sky** (the whole planet has one weather at a time). The decision of 3 October 2026 is A, with
all six kinds of weather and all the new clouds; the game now has them, see [Weather](#weather). The
[technical study](docs/weather-study.md) gives the findings, the model, the change for
each part, the cost and the limits. The clips are in `public/studies/weather/`. Run
`node studies/weather-study/weather-study-capture.mjs "path/to/chrome.exe" W1,W2` against
port 5174 to record the clips of W1 and W2 again, and
`node studies/weather-study/weather-study-smoke.mjs "path/to/chrome.exe"` for the browser
check of the page.


## Browser checks

Each feature has a browser check in `scripts/`. One command runs them all at the same time:

```
node scripts/run-checks.mjs "path/to/chrome.exe"
```

The command starts its own dev server on a free port, runs the 20 checks (4 at the same
time), and prints one line for each check with its time and its error. All the checks take
about 3.5 minutes, or about 2 minutes with `--jobs 8`. The full output of each check is in
`artifacts.local/checks/<name>.log`. `npm run checks -- "path/to/chrome.exe"` is the same
command, and the variable `CHROME_PATH` can give the browser path.

| Option | Effect |
| --- | --- |
| `--changed [base]` | Only the checks for the files that changed from `base` (default `master`), with the files that are not committed. |
| `--files a,b` | Only the checks for these files. |
| `--only a,b` | Only these checks, by name. |
| `--list` | Shows each check and the files that it covers. |
| `--dry-run` | Shows the selected checks, and stops. |
| `--jobs n` | The number of checks at the same time. The default is 4. |
| `--origin url` | Uses a dev server that runs already. |
| `--swiftshader` | Software graphics, for a machine with no graphics card. |

While you work on one feature, run `--changed`. A change to `src/rings.ts` runs only the
sparkle rings check; a change to `src/main.ts`, `src/worlds.ts` or another core file runs all
the checks, and so does a game file that no check covers. A change to a document or a study
runs no check. The list of the files of each check is `CHECKS` in `scripts/run-checks.mjs`:
add a new check and its files there. Run all the checks before a merge into `master`.

The checks use the graphics card. With software graphics a check that takes 30 s can take
30 minutes, because the worlds have many plants. `FAIRY_SWIFTSHADER=1` selects software
graphics for one script; `--swiftshader` does the same for the runner and for the three
scripts that have this option. Each script starts its own Chrome on a free debug port, so
many checks can run at the same time.

One check alone runs against a dev server:

With the dev server at `http://127.0.0.1:5174`, run
`node scripts/browser-smoke.mjs "path/to/chrome.exe"` using an installed Chromium
browser. This checks low flight, ascent, return generation and the mobile layout;
screenshots are written to `artifacts.local/`.

Run `node scripts/sky-dancer-smoke.mjs "path/to/chrome.exe"` for cruise, boost,
recovery, appearance controls, and mobile screenshots.
