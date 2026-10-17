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
- The ✿ Blossom Haven card in **My book**, then **Fly there**, starts the flower guide. It shows
  the flower marker and the guiding fireflies to Blossom Haven. While the guide
  is on, **Stop following** shows under **My book** and returns to free flight.
- The flower cottage is always on Blossom Haven, with or without the guide.
  The first arrival shows the discovery celebration.

- W / Up: climb; S / Down: descend.
- A / Left and D / Right: turn.
- Release the controls near a planet to cruise along its curvature.
- Shift: faster flight; Q: hover; Space or the pause button: pause.
- On a computer the screen has **My book** at the top left, with the sticker
  count, and four round buttons at the bottom right: **Your fairy**, the camera
  (**Postcard**), **Settings** and pause. **Settings** has the sound, the sky switches,
  World speed and the keys. See [Postcard camera](#postcard-camera).
- Open **My book**, tap a world, then **Fly there** for a guided journey. A new book
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
white streaks. Neptune has the pale blue of the pictures that NASA processed again in 2024. Mars has dark regions, ice caps and a long canyon; Mercury has dark
plains and bright ray craters. Mercury and Mars have half the relief, so they are
round from space; the flight ground is lower too. Each planet has its real axial
tilt, and Uranus lies on its side. Saturn's rings are on its equator, with the
Cassini gap and a shadow on the planet; Uranus has thin rings. From far away the
night sides are dark, the air is a thin rim, and the clouds show only inside
the air (see [Living worlds](#living-worlds)). A new visit to a giant gives new storms. The maps are 2048 × 1024 on a
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
fades and comes back after 30 s of flight. There is no score and no fail.

The rings count with the child (F12 of the [learn and play study](#learn-and-play-study)).
Each ring of a count line shows its number as gold dots on a dark plate over the ring. When
the fairy flies through a ring, the number shows large at the left of the screen for about
one second of flight, with the same number of dots, and the ring plays its note of the C
major scale (C5 for 1 to B5 for 7) with the fifth above it. The last ring of a line adds the
high C. On a phone the number shows at the top, under the buttons.

- The number of a ring is the count that the child gets when she flies to it from her place
  and takes each ring on the way. The ring nearest to the fairy is always the next number. So
  a line counts from each end, and from its middle, and the first ring that she takes is 1.
- The count is the number of rings that she took: 1, 2, 3. When she flies past a ring, the
  rings in front of her count on from the last ring that she took. The ring that she flew
  past counts on too, if she turns back.
- The count of a line starts again at 1 after 12 s of flight with no ring of that line
  (`RING.countGap`), and after the full count of the line. No number is above the length of
  the line. The count is not saved, and it is not a score.
- The number stays in a pause, as the flight does. It goes away at once behind Worlds, the
  menu, Settings, the look menu and the postcard.
- With reduced motion, the number shows with no bounce.

Some lines are shape lines. The rule is `shapeLine()`: the second and the fourth line of a
world. So Earth has two shape lines, and Blossom Haven and the Moon have one each. The first
line of each world, such as the line at the start meadow of Earth, is a count line.

- Each ring of a shape line has a shape, in this order: circle, triangle, square, star and
  heart. A line of six or seven rings starts the order again. The second shape line of Earth
  starts at the triangle.
- The plate over the ring shows the picture of the shape in gold, not dots. So the child
  reads the shape two times before she arrives: the ring and its plate.
- When the fairy flies through the ring, the picture and the name of the shape show in the
  place of the number, for example a gold triangle and the word **Triangle**. Each shape has
  its own two notes (C for the circle to G for the heart). The last ring of the line adds
  the high C.
- The first shape line of a world starts after the last ring of the first line, 42 m or more
  from it, in the direction of that line. The child who flies on from the count line comes
  to the shapes. If the land there has no room, the line can be at a different place.
- Each shape is about the size of the round ring (`ringShapePoints()`). The ring test is the
  same disc for each ring, so a corner of a shape is never more than 0.15 m outside the disc,
  and the middle of each shape has room for the fairy.

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
- One ring geometry, one glow quad, one plate and four materials serve all rings: three draw
  calls for each world. The ring geometry holds the torus and the tube of each other shape,
  and the shader keeps one of them for each ring, so a shape line adds no draw call. The dots
  of the seven numbers and the pictures of the five shapes are one picture. A phone gets 24
  sparkles in a burst instead of 48.
- The plate of a near ring covers the plates of the rings behind it. A pale rim shows the
  plate against a dark sky.

The placement and the ring test are in `src/rings.ts`; the tests are in
`tests/rings.test.ts`. Run `node scripts/sparkle-rings-smoke.mjs "path/to/chrome.exe"`
against the dev server for the rings on each world, the number of each ring, a pass with
the number, the chime, the burst and the longer trail, the count after a ring that she flew
past, the place of the number in three windows, a pause and Worlds while the number shows,
a shape line on each world with the picture and the name of each shape, a pass at boost
speed, the return after 30 s, the rings that move with Blossom Haven, new rings after a new
Earth landscape, the rings at night, in the rain and against the pink sky, reduced motion,
and the phone layout with its draw calls. An optional second argument sets the server
origin.

## Asteroid belt

The asteroid belt fills the space between Mars and Jupiter, 12,125 to 13,875 m from
the Sun. From far away it is a ring of dust and a faint glow, with the dark
Kirkwood gaps where Jupiter clears the orbits. Inside the belt, tumbling rocks
come and go around the fairy, and the flight panel says **Asteroid belt**.
The rocks have no collisions: a rock that comes near the fairy or the camera
shrinks away. The belt turns with the planets and fades inside atmospheres,
as the stars do. Phones draw half of the dust and rocks.

**Ceres** and **Vesta**, two small airless worlds, orbit inside the belt at their
real distances. Both are in **My book**. Ceres has the bright salt spots of
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
in **My book**, and the fairy flies through it.

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
is in **My book** after Earth; a guided trip from the meadow takes about 16 s.

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

## Moon diary

The Moon diary (F14 of the [learn and play study](#learn-and-play-study)) keeps each shape of the
Moon that the child sees from Earth. It has five places: **New Moon**, **Crescent**, **Half Moon**,
**Almost full** and **Full Moon**. A new shape gives a note in the flight, in the look and at the
place of the sticker note: a drawing of the shape, its name and one short line, for example
"One half is bright." A soft chime plays when the sound is on. The note waits while a sticker
note shows, and a search star waits for the note. No strip shows in the flight.

The diary is in **My book**, below the cards: one place for each shape, with the count next to the
sticker count ("2 of 5 Moon shapes"). An empty place shows its shape as a faint drawing. A tap
on a place gives its line, or a hint for an empty place. While a place is empty, the line of
the diary says where the Moon is now: "The Moon is in the sky now. Look up!" or "The Moon is on
the other side of Earth now. It comes back soon." The diary saves in the browser
(`fairy-moon-diary` in `localStorage`), and **Reset sticker book** in Settings removes it.

The shape comes from the lit part of the disc of the Moon that the fairy sees:

| Shape | Lit part | Line |
| --- | --- | --- |
| New Moon | less than 10%: the Moon is less than about 37° from the Sun | The Moon hides today. |
| Crescent | 10% to 35% | A thin curve of light. |
| Half Moon | 35% to 65% | One half is bright. |
| Almost full | 65% to 88% | Almost a full circle. |
| Full Moon | 88% or more | A round, bright Moon! |

A shape counts when the child sees it for 0.8 s of flight with no break:

- The fairy is in the air of Earth, and Earth is the nearest world.
- The middle of the Moon is in the picture of the camera, not at its edge.
- The Moon is above the horizon: Earth does not hide it.
- The clouds do not hide the sky: the cloud cover over the camera is below 0.5. Above the
  clouds the cover is 0.
- The Moon shows through the air. The air of the game is thick along the horizon, as the picture
  shows it, so near the ground a Moon on the horizon is faint and does not count. A Moon higher
  in the sky counts, and from above the clouds each Moon above the horizon counts.
- The shadow of Earth does not touch the Moon. In an eclipse the full Moon is dark, so it gives
  no shape. 8 of the 12 full Moons of a game year have an eclipse of 21 s to 39 s; the Moon is
  full before it and after it.
- The new Moon has no light to see. It counts when the Sun is up and the place of the Moon next
  to the Sun is in the picture. The thick air changes nothing for it.

The day and the night count the same. By day the dark side of the Moon shows as a grey ball, so
the shape is easier to read at night. The Moon is near Earth, so the lit part changes a little
with the place of the fairy on Earth.

A lunar month is 300 s at 1× World speed. From the middle of Earth, each month has 29 s or more
of the new Moon, 36 s or more of the full Moon outside the eclipse, and 56 s or more of each
other shape. `month` as a third argument of the check flies scripted children for 900 s with
the real weather. One run on 13 October 2026 gave these counts at the end of the first, second
and third month. The game is not the same at each run, so a second run changes a count by one
or two.

| The child | Shapes after 1, 2 and 3 months | The first note |
| --- | --- | --- |
| She does not steer: a low, level flight | 1, 2, 2 | 151 s |
| She turns, climbs and dives at random, flight 1 | 3, 3, 3 | 23 s |
| The same, flight 2 | 0, 4, 5 | 329 s |
| The same, flight 3 | 3, 3, 3 | 2 s |
| She flies to the Moon when it is in the sky | 5, 5, 5 | 2 s |

A child who looks for the Moon fills the diary in one month. A child who does not look at the
sky gets 0 to 3 shapes in one month: the camera looks along the flight, and the Moon is in the
picture for 3% to 10% of the time.

The game starts with a half Moon high in the morning sky, above the picture. A climb brings it
into the picture: with W or ↑ from the start, the note of the half Moon comes after 1.5 s. A
guided flight from Earth to the Moon can also give a shape on the way. With 8× World speed in
Settings a month is 38 s.

The rules and the saved diary are in `src/moon-diary.ts`, with no browser code. The note and the
diary in Worlds are in `src/moon-diary-ui.ts`. Run
`node scripts/moon-diary-smoke.mjs "path/to/chrome.exe"` against the dev server for the rules,
the five notes, the wait for a sticker note, the saved diary, the diary in Worlds, the reset,
reduced motion and the 390/320 px phone layouts. An optional second argument sets the server
origin. On the dev server, `?test&moon=190` starts the game at 190 s of the orbits: a full
Moon. 75 is a new Moon, 105 a crescent, 150 a half Moon and 172 an almost full Moon;
`&weather=clear` removes the clouds. The Moon is not above the horizon of the meadow at each of
these times. The test hook `__fairyTest.spin(seconds)` turns Earth to a later time of the day,
and `__fairyTest.faceMoon()` turns the fairy to the Moon and holds her in a hover.

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

A visit starts in Blossom time. Each hop of the planet (each 2 minutes) brings the next
season, so a magic year is 8 minutes, and the look changes in about 20 s. A new season
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
the weather, the creatures and the sticker tasks are the next step. The other worlds with
air have their own skies (see [Living worlds](#living-worlds)).

Run `node scripts/weather-smoke.mjs "path/to/chrome.exe"` against the dev server for the
browser check. `/?test&weather=rain` gives the whole planet one weather (`clear`, `rain`, `shower`,
`storm` or `mist`) on the dev server.

## Living worlds

Each world has the clouds that it really has, and real things move and happen there (option B
of the [living worlds study](#living-worlds-study)). The puffs of before are gone.

| World | The clouds | What happens |
| --- | --- | --- |
| Jupiter | White zones of ammonia ice, gaps over the belts with brown clouds deeper down | The Great Red Spot turns where the map paints it. Storm towers rise from the South Equatorial Belt, and lightning lights them from inside. |
| Saturn | Soft cream bands under a haze | Storm towers with lightning in "storm alley", near 35° N. |
| Uranus | A pale haze with almost nothing in it, and a few bright clouds | The clouds blow backwards at the equator. |
| Neptune | A pale blue deck, and high white streaks with their shadows on it | The Great Dark Spot turns where the map paints it, with bright clouds at its south edge. The winds are the fastest of all. |
| Venus | The closed deck, with dark streaks and chevrons on top | The deck goes around the planet fast. Under it, acid rain falls and goes back to gas before the ground. Faint flashes show in the deck. |
| Mars | Thin wisps of water ice in patches | Dust devils turn and walk slowly over the low plains. |
| The Moon, Mercury | None: the sky stays black | On the night side, small stones from space hit the ground and make a short spark. |

- **The winds.** The bands of the giants and the deck of Venus move with the real jets of each latitude,
  at 7% of their real speed (`WIND_SCALE` in `src/skies/data.ts`): the bands of Jupiter go in opposite
  directions, and the equators of Uranus and Neptune go backwards.
- **How they draw.** A cloud layer is one sphere with a shader (one draw call). The near clouds are
  tufts of a few joined balls with a flat base, as the heap clouds of Earth, in one InstancedMesh for
  each set. The clouds show only inside the air; from far away the painted maps show. Each new visit
  gives new places for the storm towers and the dust devils.
- **The friend.** Once in each visit, after 4 s in the air of a world (or at the first spark on the
  Moon or Mercury), a note gives a true fact about its sky, from the fairy friend. The note of Venus
  says that scientists are not sure that Venus has lightning. The note is in the place of the
  thermometer note, and it never shows with a different note (`src/sky-note.ts`).
- **Reduced motion and phones.** With reduced motion the skies stand still: no flash, no spark. A phone
  gets half the tufts, fewer storm towers and dust devils, and fewer points in each dust devil.

The code is in `src/skies/`: `data.ts` has the jets and the layers, `giants.ts`, `venus.ts`, `mars.ts`
and `airless.ts` have the skies, and `buildClouds()` in `src/worlds.ts` builds them. Run
`node scripts/living-worlds-smoke.mjs "path/to/chrome.exe"` against the dev server for the browser
check: no puffs, the clouds only inside the air, the lightning of Jupiter, the dust devils of Mars, the
sparks on the night side of the Moon only, the notes, reduced motion and the phone. The pictures are in
`artifacts.local/living-worlds/`.

## Blossom Haven

The flower button leads to a candy home with half Earth's diameter (radius 137.5,
diameter 275 game metres), with mint-blue soda water and bubbles, and a flower cottage.
It has four gardens (look B of the [foliage study](#foliage-study)): a lollipop grove
with spiral lollipops and candy canes, also around the cottage; a cotton candy orchard
with ice cream trees; a mushroom glade with toadstools as tall as trees; and crystal
peaks on the high ground. The toadstools and the crystals glow at night. Fairytale
creatures live there, each in its garden (see [Animals](#animals)): unicorns, dragonlings and
gummy bear cubs in the lollipop grove, kitsune kits, candy-floss lambs and bubble fish in the
orchard, story caterpillars and lantern moths in the mushroom glade, crystal deer, griffin chicks
and sugar owlets on the crystal peaks, Frog Princes, gummy jellyfish and the soda serpent in the
soda, a phoenix chick high in the sky, and five pegasus foals that circle over the cottage garden.
One creature comes with each magic season: honey-drop bees in Blossom time, bubble fish in Bubble
time, lantern moths in Lantern time and sugar owlets in Crystal time.

The clouds are cotton candy: 50 round tufts of pink, blue and lilac floss with
spun-sugar strands, in one draw call (half on a phone). The mist in the cloud
layer is candy pink, and the sky over the cottage stays clear. The clouds are in
`src/cotton-candy.ts`; see the cotton candy cloud study below.

Home starts about **28 km from Earth** in the game's compressed solar system,
not beside it. The flower marks the cottage on Blossom Haven, including when
exploring its surface; fireflies show the safe route around intervening terrain.
Home hops every **two minutes of active, unguided play** (the
[wandering home study](#wandering-home-study)). Each hop does three things:

- **A nova.** A white flash with four spikes and a shell of light that grows and turns blue
  and violet, at the old place and at the new place (`src/hop-nova.ts`). The home moves at
  the peak of the flash. A nova far away keeps 14 px on the screen, so the child sees from
  across the system where her home went. On the home, a soft light fills her sky. With
  reduced motion, only a soft glow shows.
- **A new size.** Any of ten sizes, each the size of a real world: Ceres, the Moon, Mercury,
  the first size of Blossom Haven, Mars, Venus, Earth, Neptune, Saturn and Jupiter (radius 33 m
  to 588 m). The air and the clouds grow with the square root of the radius. The plants keep
  their density up to the count of an Earth-size home, then a bigger home gets wider meadows.
  A new size is a new build of the same landscape (`resizeHome()` in `src/worlds.ts`): the
  hills keep their places, and the animals are new.
- **A new place.** At random, a path around the Sun, or a path as a moon of Earth, Saturn,
  Uranus or Neptune: each planet with room for the size has the same chance as the Sun. A
  moon path is tilted 20° and takes 4 minutes for one turn. It is clear of the planet, its
  air and rings, the Moon, the belt, the whole path of the comet and the circles of the other
  planets (`moonHomeDistance()` in `src/relocation.ts`). Mars has no room: the belt is too
  near. While she is at a moon home, the planet in her sky has no fog, as the Moon has.

A place around the Sun avoids other planets, their atmospheres, Saturn's rings, the Sun, the
path and the tails of the comet, and a nearby fairy. The clock stops for the flower guide,
including temporary steering overrides while that guide remains enabled. Use **Stop
following** to return to manual flight and resume the relocation clock. Manual approach does
not stop relocation.

When she is visiting (inside the atmosphere plus a small margin), the fairy, camera, trail,
and home move together. At a new size she keeps her direction from the middle and her height
over the ground. The terrain seed, cottage, and discovery remain unchanged. The flower guide
updates immediately, and a gentle note says the new size and the planet ("Blossom Haven is as
big as Mars now, a moon of Saturn"). No countdown or deadline is shown. Pause, customization,
the world map, and background tabs do not advance the clock. Reloading starts a fresh interval
and the initial distant location at the first size; discovery stays saved.

### Build mode: her own home

Near her cottage (25 m or less), a button **Build your home** shows. Build mode stops the flight,
as the fairy panel does, and the camera turns slowly around the home; a drag turns it and the
wheel moves it nearer. The panel has four tabs: **Roof** (petal crown, toadstool, acorn cap, star
spire, frosting swirl, leaf thatch), **Walls** (flower cottage, tree stump, teapot, pumpkin, pebble
tower, honey hive), **Door** (round, plank arch, heart, leaf curtain, star) and **Yard** (flower ring,
fairy ring, path and fence, lantern garden, lily pond, candy garden). Each tab has twelve colour
dots for that part. A new shape comes in its own colour (a cherry toadstool, an apricot pumpkin),
and then she can paint it. **Surprise me** gives a whole new home: half the time a home of the
stories (toadstool house, teapot house, candy house and five more), half the time a mix. A
change pops with a small bounce, a puff of petals in its colour and a soft chime; with reduced
motion it changes at once. A soft light from the camera shows the true colours, because the Sun
stays low at the south pole. **Done**, the close button or Escape ends build mode.

All the options are open from the start. The home saves at each change (`fairy-home` in the
browser storage), and each build of Blossom Haven, also a new size, builds the saved home. The
parts are in `src/home.ts` and build mode is in `src/home-build.ts` (the
[fairy home study](#fairy-home-study)). Each roof fits each walls with one rule, every home stays
under the flower of the guide (7.5 m) and inside the 12 m that the animals keep free, and a
home has at most 17 draw calls. The pictures of the panel are in `public/home/`.

A new size takes 0.3 to 0.7 s to build on a computer, and the hop does the build at the peak
of the flash, so the view stops for that time. A slow phone can stop for 1 to 2 s.

Run `node scripts/blossom-smoke.mjs "path/to/chrome.exe"` against the dev server
for the two-minute clock, guided lock, arrival, visitor/camera carry, a hop to a moon of
Saturn at the size of Ceres and a hop to the size of Jupiter, and mobile browser checks.
Pure simulation tests cover placement, the sizes, the moon paths and relocation safety
(`tests/relocation.test.ts`, `tests/wandering-home.test.ts`).

## Animals

Earth and Blossom Haven have many animals, each one in the place where it belongs (option B of the
[animals study](#animals-study), with the small life of option C). Earth has 31 kinds that follow the
real world, and Blossom Haven 17 creatures from stories and candy, about 3,900 and 800 animals in
herds. Nothing hunts, chases or eats another animal: the fox trots and sits, and the bears pick
berries.

| Place | Kinds |
| --- | --- |
| Palm beach and shore | flamingo, sea turtle, capybara (also the river banks of the jungle) |
| Jungle | monkey, parrot (loops over the trees), elephant |
| Savanna | zebra, giraffe, elephant, meerkat, stork in winter |
| Desert | camel, meerkat |
| Leaf forest | cow, sheep, rabbit, deer, fox, duck on the rivers, beaver, stork in summer, butterflies in spring and summer, fireflies on summer nights, geese in spring and autumn |
| Pine forest | moose, brown bear and cub, beaver, fox, arctic hare |
| Snow line | reindeer, arctic hare (white in the snow, brown in summer), seal, penguin (south only) |
| The sea and the sky | dolphin, whale (deep sea), silver fish (they show when they jump), seagull |
| Blossom Haven | see [Blossom Haven](#blossom-haven): the gardens, the soda, the sky and one creature for each magic season |

- **Rules, not places.** Each kind has a rule (`src/creatures/catalog.ts`, `src/creatures/rules.ts`):
  the climate belts of Earth or the gardens of Blossom Haven of `zoneAt()`, a surface (land, shore,
  river, sea, deep sea), a half of the planet, the seasons of `src/seasons.ts` or the magic seasons
  of `src/magic-seasons.ts`, and a flight height. `placeHerds()` in `src/creatures/herds.ts` makes a
  survey of the planet and puts the herds of each kind where its rule allows, with a gap between the
  herds. Each animal and each point of its short route is on good ground and in a place of its rule,
  also at the edge of two belts. Each new Earth gets new herds; Blossom Haven keeps its landscape.
  A few herds start near the meadow of Earth and near the cottage.
- **Seasons.** The storks spend the summer in the leaf forest and the winter in the savanna; the geese
  cross the sky in spring and autumn; the butterflies come in spring and summer; the fireflies glow
  on summer nights; the coat of the arctic hare follows the snow of its place. On Blossom Haven the
  honey-drop bees fly in Blossom time, the bubble fish in Bubble time, the lantern moths in Lantern
  time and the sugar owlets sit by the crystals in Crystal time.
- **How they draw.** Each kind is one joined model (`src/creatures/shapes.ts`,
  `src/creatures/joined.ts`): one InstancedMesh draws all the animals of a kind in one draw call, and
  a shader moves the legs, the head, the tail, the wings and the fins. The near model shows to 45 m
  (32 m on a phone), a simple far model to 170 m. At most 260 animals show (130 on a phone), each one
  culled against the view, and the animal models take at most 37 draw calls (17 on a phone). The
  small life is a tiny model near the fairy and a point to 220 m: all the points are one draw call,
  and the lights of the fireflies and the lantern moths one more (`src/creatures/points.ts`). The
  limit of the draw calls of the animals is 40 on a computer and 20 on a phone (TODO item 4). The far
  herds get a new pose ten times a second, and a resting herd keeps its pose. With reduced motion the
  herds still walk, but the legs and the wings stand still.
- **Hello.** Each animal says hello (see [Creature hello](#creature-hello)), and its first hello puts
  its card in the [animal book](#fairy-friend).
- **Test hooks.** The snapshot gives `wildlife` with the herds, the near animals (`visible`), the
  hellos and `stats` (the animals and the draw calls of the frame). `herdPlaces(kind, count, zone)`
  gives the places of the herds of a kind, with their season and if they show; `wildlifeAudit()`
  checks the place of each drawn animal; `wildlifeCalls()` renders the view with and without the
  animals; `wildlifeOn(false)` turns the animals off for a bench.

Run `node scripts/wildlife-smoke.mjs "path/to/chrome.exe"` (with `FAIRY_TEST_URL` for the server) to
check the animals in the game: the herds of both worlds, the motion and the pause, the creatures of
Blossom Haven and the pegasus foals, the storks and the bees in their seasons, a picture in the note of
a new card, in the gift note and in each of the 48 cards of the book, and five views (the
start, low over a savanna herd, 30 m over the savanna, a herd of the leaf forest and the lollipop
grove) at 1280 px and on a phone of 390 px with the limits of the draw calls and a check of the place
of each drawn animal. `node scripts/animals-bench.mjs "path/to/chrome.exe"` is a tool, not a check: it
measures the draw calls and the frame time of the five views with and without the animals, on a
computer page, a phone page and a phone page with the CPU 4 times slower.

## Sticker book

**My book** is the button at the top left (at the top on a touch screen) with the sticker count. Its
name was **Worlds** until 14 October 2026. It opens one book with two tabs: **Worlds** (the map, the
cards of the worlds with their stickers and thermometers, and the Moon diary) and **Animals** (the
animal book of the fairy friend). The book always opens at its **Worlds** tab.


Each of the 13 worlds gives a sticker the first time the fairy arrives: the
Sun, the eight planets, the Moon, Ceres, Vesta and Blossom Haven. A world counts
as reached when the flight panel says the fairy is near it: closer than 85 m, or
1.5 times the atmosphere, whichever is larger. The fairy starts on Earth, so the
Earth sticker comes when she flies out to space and comes back: the same new
visit that makes a new landscape. A note shows the new sticker and one short fact, and the chime plays
when the sound is on. Every fourth sticker has a bigger note.

The stickers are in **My book**, under the map. The **My book** button shows the count,
for example "3/13". Flight waits while **My book** is open, and Escape closes it. Tap a
card to read its fact or a hint, then **Fly there** for a guided flight. The card of a world
says "You are here" only when the fairy is near that world, as the flight panel says. In open
space each open world has **Fly there**, also the nearest one, so Earth is always a way home. A card with its
sticker looks like a sticker.

The worlds open one at a time. A new book opens Earth, Blossom Haven and the Moon. The
other worlds are mysteries: a grey "?" on the map and in the book, with no path. Each
new sticker opens the next door: the nearest empty space on the poster (`nextDoor()` in
`src/stickers.ts`). The order is the Moon, Venus, Mercury, the Sun, Mars, Vesta, Ceres,
Jupiter, Saturn, Uranus, Neptune, then Earth. A fairy who finds a world in free flight
gets its sticker, and that world opens too. The note at the top of **My book** always
says what is next. Earth and Blossom Haven are always open: the way home, and the flower
guide. The Sun is on the map from the start, but it opens in its turn.

Each world also has one search star (F1 of the [feature ideas study](docs/feature-ideas-study.md),
option B of the sticker book study). The note of a new sticker gives one small task on that
world, for example "Find the big red storm." In **My book**, the card of the world gives the
task as its hint, and a dashed star shows on its picture. When the fairy does the task, a gold
star pops up in the world with sparkles, the note says "SEARCH STAR" and the found line, a gold
star goes on the sticker picture, and a brighter chime plays when the sound is on. There is no
score, no timer and no fail. A search counts only after the hello sticker of that world, and it
waits until the last note is gone. The tasks:

| Check | World | Task | The fairy |
|---|---|---|---|
| through | Sun | Fly through a loop of fire. | Is under the arch of one of the five prominences, in the plane of the loop |
| place | Mercury | Find a crater with bright rays. | Is less than 20 m above the bright middle of one of the four ray craters |
| lap | Venus | Fly all the way around Venus. | Flies one lap in the air of Venus: to the far side and back to the start |
| weather | Earth | Find a rainbow. | Is near Earth while the rainbow of the weather shows |
| terrain | Moon | Find the dark seas on the Moon. | Is less than 20 m above a dark sea |
| place | Mars | Fly along the long canyon. | Is less than 20 m above the canyon on the equator |
| place | Vesta | Find the giant hole at the bottom. | Is near Vesta, over its south pole |
| place | Ceres | Find the bright white spots. | Is near Ceres, within 0.12 rad of Occator crater (the salt spots) |
| place | Jupiter | Find the big red storm. | Flies below the cloud height, over the Great Red Spot |
| place | Saturn | Fly over the rings. | Is 1.3 to 2.02 radii from the centre, less than 40 m from the ring plane |
| place | Uranus | Find the thin rings of the planet that lies on its side. | Is 1.64 to 2 radii from the centre, less than 40 m from the ring plane |
| place | Neptune | Find the dark storm and its white cloud. | Flies below the cloud height, over the Great Dark Spot |
| through | Blossom Haven | Pop a soda bubble. | Is within 1.5 m of a soda bubble |

The first tasks had six "fly low" tasks. The player selected these tasks on 4 October 2026, so
that each world asks for its own scenery.

- A rainbow needs rain in front of the fairy, sunshine, and a Sun lower than 42°. The weather is
  mostly sunny, so this task can take some time.
- A lap can go in each direction, also over the poles. It starts where the fairy comes into the
  air of Venus, and it starts again when she leaves the air.
- The soda bubbles rise 8 m from the soda rivers of Blossom Haven. A bubble pops when the fairy
  touches it: it goes away until its next rise, a few drops fly out, and a soft high note
  plays. This occurs at each touch, also after the star (`popSodaBubble()` in `src/candy.ts`).
  With reduced motion, the drops do not show.

The checks are `searchDone()` in `src/stickers.ts`. `searchProbe()` and the gold star are in
`src/search-stars.ts`. The places of the storms, the canyon and the loops of fire are in
`src/search-places.ts`; `src/planet-paint.ts` paints the storms and the canyon from the same
numbers. The ray craters are `rayCraters()` in `src/planet-paint.ts`, and the Occator direction
is an export of `src/terrain.ts`.

The book is saved in this browser as `fairy-sticker-book`, with the search stars. Every player earns the
Blossom Haven sticker with a visit, also a player who found the home before. The
stickers, their facts and the rule of the open worlds are in `src/stickers.ts`; the book
is `src/sticker-book.ts`, and **My book** draws it (`src/adventure.ts`). This is option A of
the sticker book study below, without the voice, in the one book of option D of the world
book study.

Run `node scripts/sticker-book-smoke.mjs "path/to/chrome.exe"` against the dev
server for no sticker at the start, the book in **My book**, the next door and the
locks, **Fly there** to the Moon, the Earth sticker after the return, the saved book
and the phone layout. An optional second argument sets the server origin, for example a server
without file watching.

Run `node scripts/search-stars-smoke.mjs "path/to/chrome.exe"` against the dev server for the
search stars: no star before the hello sticker, the task in the note and in **My book**, a find
on twelve worlds, the gold star in the world and on the sticker, the saved book, the reset and
the phone layout. A test move puts the fairy at each place, and the check uses
`/?test&weather=shower` for the rainbow. The check also reads the paint of the ground: it is
dark in the canyon of Mars and bright at the middle of each ray crater of Mercury. An optional
second argument sets the server origin.

## Picture thermometer

A thermometer with a face shows if a world is hot or cold. It has no numbers: the level in
the tube, the colour, the face in the bulb and one word give the answer. The colour is never
the only sign. The faces are drawings of the game, not emoji, because an emoji looks different
on each device. This is idea F16 of the [learn and play study](#learn-and-play-study).

| Word | Face | Colour | Worlds, from the hottest |
| --- | --- | --- | --- |
| HOT | Red cheeks, an open mouth, a sweat drop | Red | The Sun, Venus, Mercury |
| WARM | Small cheeks, a small smile | Orange | No world now |
| NICE | Happy eyes, a wide smile | Green | Earth, Blossom Haven |
| COOL | A flat mouth | Teal | The Moon, Mars, Vesta, Ceres |
| COLD | A mouth that shivers, a snowflake, shiver lines | Blue | Jupiter, Saturn, Neptune, Uranus |

Each world has one level, from 0 to 1 (`WARMTH` in `src/warmth.ts`). A world has no day level
and no night level. The order follows the real temperatures, and the Sun is the top. Venus
is the hottest planet and Uranus the coldest, below Neptune, as their sticker facts say. The
five colours have a contrast of 3 or more with the dark panel of **My book** and with the pink
sticker card, and the lines of the thermometer are dark on a sticker card.

The thermometer is in two places. It is not a permanent part of the flight screen.

- **Worlds.** The card of each known world shows its thermometer and its word, under the name.
  A mystery world, the grey "?", shows no thermometer.
- **The arrival.** When the fairy arrives at a world, a small note shows the thermometer, the
  name of the world and the word for 5 seconds, and the level goes up in the tube. With reduced
  motion the level does not move. The note makes no sound.

The rule of the arrival note is `warmthNoteStep()` in `src/warmth.ts`:

- An arrival is the moment when the flight panel says that the fairy is near a world: the
  same test as for a sticker. The start on Earth is no arrival.
- The note shows at each arrival, not only at the first visit. The same world shows again
  only after 10 seconds away from it, so a short flight out and back gives no new note.
- One note at a time. The thermometer waits while the sticker note, the search-star note, the
  note of the found home or the note of a hop shows. It comes when that note is gone, if the
  fairy is still near the world. It leaves at once when one of those notes comes.
- The note and its time wait behind **My book**, Settings, Menu and the pause.
- With a mouse and keys the note is in the place of the sticker note, above the toolbar. On a
  touch screen it is at the right edge, below the place of the "A new world to explore" note
  and above **Boost**, because that note can show at the same time.

`src/warmth.ts` has the levels, the steps, the SVG and the rule. `src/warmth-note.ts` has the
arrival note, and `src/warmth.css` has the styles. Run
`node scripts/thermometer-smoke.mjs "path/to/chrome.exe"` against the dev server for the
thermometers in **My book**, the arrival note at Venus and at the Moon, its rule and the phone
layout at 390 px and 320 px. An optional second argument sets the server origin. The pictures
are in `artifacts.local/thermometer/`.

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
  **My book** map always shows its paths. The two switches stay after a reload
  (`fairy-settings` in `localStorage`); World speed starts at 1× at each visit.
- **How to fly**: the keys on a computer, the touch buttons on a touch screen.
- **Sticker book**: the reset below.
- **Pictures in the sky: credits**: the star data and the ten Webb pictures.

**Reset sticker book** shows how many stickers the book has, then asks for a
confirmation before it removes them: "Remove all 5 stickers? This cannot be
undone." The reset removes the search stars too: "Remove all 5 stickers and 2 search
stars?" **Keep the stickers** has the focus, so an extra Enter changes nothing.
The reset also removes the Moon diary, and the question counts its shapes: "Remove the
sticker, and the Moon shape?" With no sticker, a diary with a shape can also be reset.
After a reset, the world where the fairy is gives no sticker until she leaves it.
The reset also closes the worlds again: only Earth, Blossom Haven and the Moon stay
open. The fairy look and the home discovery stay. The reset also removes the
[fairy friend](#fairy-friend), the kinds that she met and the count of the hellos;
with an empty book and a friend, the question is "Remove the fairy friend?".

Run `node scripts/settings-smoke.mjs "path/to/chrome.exe"` against the dev server
for the panel, the confirmation, the reset at the Moon, Escape, the four toolbar
buttons, the sky switches, World speed, the sound, the saved switches and the phone menu.
An optional second argument sets the server origin.

## Character customization

Choose **Choose your look** on the welcome card, or the palette button during
flight. Pick one of nine hair styles (Bun, Bob, Tails, Space buns, Cloud curls,
Ponytail, Long braid, Twin braids, Long waves) and one of twelve wings (Dew glass,
Glitter vein, Leaf glass, Silk pleats, Rainbow cells, Swirl and gems, Monarch,
Swallowtail, Frost, Starlight, Autumn leaf, Aurora). Then pick one of ten colors each for the hair, dress, wings and skin,
and one of four sparkle trails (Pixie dust, Comet tail, Sparkle halo, Shimmer steps).
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
with Petal, Luna or Flutter gets Dew glass, Glitter vein or Swirl and gems.

The sparkle trail is in `src/fairy-trail.ts` (see the [fairy trail study](#fairy-trail-study)).
Pixie dust is fine dust that twinkles and falls slowly behind her. Comet tail is a cone of
sparkles that is fixed to her back. Sparkle halo has no trail: stars flash around her.
Shimmer steps is a faint shimmer from her two feet that becomes strong in a boost. Each
trail uses the sparkle colour of the wing color. The points of Pixie dust and of Shimmer
steps stay with the world that carries her, so the trail is on the path that she flew. A
sparkle ring and a comet tail make each trail stronger for 4 s. With reduced motion the
points do not twinkle. A look that was saved with no trail gets Pixie dust. While the
look menu is open, the trail of the look continues behind the fairy, so each trail shows
when you select it.

The hair
styles are in `src/fairy-hair.ts`. The Ponytail, Long braid, Twin braids and Long
waves swing gently with the flight and straighten along her body in boost. The six
newer styles stay clear of the wings and the pointed ears in every wing shape.

Run `node scripts/browser-smoke.mjs "path/to/chrome.exe" --customization`
for the focused desktop/mobile check, including saved selections after reload.

## Fairy friend

A small friend flies with the fairy (F19 of the [learn and play study](#learn-and-play-study)), and
the animal book in Worlds shows each kind that she met (design A of the
[friend book study](#friend-book-study)). The friend has no task and no health: it is company. The
game has no score, no timer and no fail.

- **The animal book.** **My book** has two tabs: **Worlds** (the map, the cards of the worlds and the
  Moon diary) and **Animals**. The Animals page has a card for each of the 48 kinds of
  [Animals](#animals), on one page for each world: **Earth** (31 real animals) and **Blossom Haven**
  (17 story creatures). Two buttons with the world pictures and the count of each page change the
  page; the book opens at the page of the world where she is. A page has a row for each place, with
  a small picture of the place: Palm beach, Jungle, Savanna, Desert, Leaf forest, Pine forest, Snow
  line, The sea and The sky on Earth; Lollipop grove, Cotton candy orchard, Mushroom glade, Crystal
  peaks, Soda water and The sky on Blossom Haven. A card of a kind that she met is a sticker card: a
  picture rendered from the model of the friend, the name and three picture facts. A kind that she
  did not meet is a soft shadow of its model, with the picture of its world and of its place, for
  example Earth and the snow line. The tab shows the size of the book, for example "4/48". The book
  is the list of the kinds that she met, so it fills from the first hello.
- **The note at the top.** A tap on a card shows it in the note at the top of the page: the
  picture, the name and the three facts with a short word each. A shadow card shows "Who is it?"
  with its world and its place. The note stays at the top of the dialog while the cards scroll.
  There is no voice: a grown-up reads the words.
- **The new card in the flight.** The first hello of a kind shows a note for 4 s of flight: the
  picture, "NEW IN YOUR ANIMAL BOOK", the name and the three picture facts. A hello to a kind that
  she met shows no note. A soft chime plays when Sound is on.
- **The way to the gift.** The friend comes at the fifth hello of a creature. A school or a swarm (the
  silver fish, the butterflies, the fireflies, the honey-drop bees) gets its card at its first hello,
  but its hello adds no heart, because it is many small animals and cannot be the friend. Before the gift, the
  note of a new card and the note of the Animals page show five hearts: one pink heart for each
  hello, and the heart of this hello swells. These are the hearts that float over a creature at its
  hello. The hearts are the only count of the hellos: the game shows no number of hellos.
- **The gift.** At the fifth hello the gift note shows for 6 s: the picture, "A NEW FRIEND", the
  name, "A friend flies with you now" and five full hearts. At the fifth hello of a new kind, the
  gift note takes the place of the note of the card. The first friend is the kind of the fifth
  hello, and it comes out of the sky with its note.
- **Fly with me.** After the gift, the note of a met card has **Fly with me ↗** (a school or a swarm
  has none: its note says "Many little friends"). The tap closes
  Worlds, and the swap plays in the flight: the old friend turns to her and waves (0.9 s), then it
  flies home, up, forward and out to her right, faster and faster, and goes in a puff of sparkles
  (2.1 s). A friend in a bubble floats home in its bubble. 1.5 s after the start, the new friend
  comes out of a puff in the sky ahead of her, flies to its place at her side in 1.5 s, and makes
  the happy loop with two high notes. The card of the friend has a gold ring and the mark
  "✦ Flies with me".
- **No friend.** The note of the card of the friend has a small button **No friend**: the friend
  waves and flies home, and the note shows an empty bubble. A met card brings a friend back.
  **Your fairy** is only about her look: it has no friend row.
- **The notes wait for each other.** The note of a card and the gift note wait while a different
  note shows: a new sticker, a search star, the home card, a new landscape, the Moon note or the
  thermometer note. The Moon note, the thermometer note and a search star wait for the note of the
  friend. The time of a note runs only in the flight.
- **How a cow flies.** A kind with wings flies with its wings: the pegasus foal, the dragonling,
  the duck, the stork, the parrot, the seagull, the goose, the griffin chick, the phoenix chick, the
  lantern moth and the sugar owlet. Each other kind rides in a soap bubble that the fairy made, also
  a whale and a giraffe. The bubble and its fairy dust have the sparkle colour of her wings, so the
  bubble is her magic. The friend is small: its body is 1.1 m across, whatever the size of its kind.
  The pegasus foals over the cottage garden say hello too.
- **Reduced motion.** With `prefers-reduced-motion` the change of friend is at once, the first
  friend is at its place at once, and the hearts do not swell.
- **Reset.** **Reset sticker book** in Settings also removes the friend, the book and the count of
  the hellos. The text of the reset says so.

How the friend flies:

- **It keeps up at each speed.** In each frame the friend takes the full move of the fairy, and
  then it comes to its place at her side (`createFriendFollow()` in `src/friend.ts`). The move
  includes the orbit and the spin of a world that carries her, a boost and a guided flight. Thus
  the friend is never behind her, at 11 m/s and at 2,226 m/s. It comes a little late only in a
  turn. The friend is never more than 2.5 m from her; the limit of the tests is 4 m. In a swap the
  two friends move in the frame of the fairy, so a swap works at each speed.
- **A jump.** A move of the fairy of more than 150 m in one frame without a world, or a turn of
  more than 0.5 radians in one frame, puts the friend at its place at once. This is the case for
  a hop of Blossom Haven and for the test hooks.
- **Its place.** The friend is at her right side: 2.2 m to the right and 0.5 m up on a wide
  screen. A phone in portrait shows less than 2 m to each side of her, so there the place is
  1.2 m to the right and 1.3 m up, and the friend is 20% smaller (`friendPlace()`).
- **The ground and the camera.** The middle of the friend stays 1.05 m over the ground and the
  water. The friend stays 0.95 m from the line between the camera and the fairy, and 2.2 m from
  the camera, so it does not cover her.
- **Life.** The wings beat, faster in a boost and in open space. A friend in a bubble floats in
  it, and the bubble wobbles. The friend looks where she flies, with its nose a little toward
  her, and looks back at her for 2 s in each 12 s. It makes a happy loop around her after a
  sparkle ring, a hello, a new sticker or a search star, not more often than each 20 s, and never
  in a swap. With reduced motion the friend makes no loop, no bob and no wing beat.
- **Hover, pause and the menus.** In a hover the friend stays at her side. In a pause it holds
  its pose. While Worlds is open the flight waits: the worlds still move, the friend stays with
  her, and a swap waits too. In **Your fairy** on a computer the friend comes near and turns to
  the camera.
- **Not a resident.** The friend is not part of the creatures of a world. It says no hello, and
  the search tasks do not see it. The friend is in each postcard.

The friend is three draw calls on a phone and on a computer: the body with its parts joined,
the two wings or the bubble, and the fairy dust (`createFriendModel()`). The puff of sparkles of a
swap uses the points of the dust, so it adds no draw call. In a swap two friends are in the scene
for 1.5 s: up to 6 draw calls. The joined model stands still: it has no walk and no magic
particles. A new kind is the joined model of its herd (`friendParts()` in
`src/creatures/joined.ts`), split into the body and the wings.

- The saved state, the follow rule, the model, the pictures and the swap are in `src/friend.ts`
  (`swapAt()` gives the parts of a swap, `helloNotes()` the notes of the hellos). The notes, the
  storage and the friend in the game are in `src/friend-ui.ts` and `src/friend.css`. The cards,
  the small drawings of the facts and the note of the page are in `src/animal-book.ts`; the
  Animals page is in `src/animal-book-ui.ts` and `src/animal-book.css`; the tabs are in
  `src/adventure.ts`.
- The state is `fairy-friend` in `localStorage`, as in F19: the count of the hellos to five, the
  kinds that she met (the book) and the friend. The book needs no data of its own, so the saved
  data of F19 loads with no change. A missing or broken value gives an empty book and no friend.
- The pictures of the cards are renders of the joined model with a clear background
  (`friendPicture(renderer, kind, size, 'clear')`); a shadow is the same render in one soft lilac
  colour (`'shadow'`). The page renders them one at a time when it opens for the first time. The
  picture facts are small drawings of the game, not emoji, because an emoji looks different on
  each device.
- The tabs are a `tablist` with two `tab` buttons and two `tabpanel` pages. Tab and Enter work, the
  arrow keys go from one tab to the other, and Escape closes Worlds. Worlds opens at its Worlds tab.
- `greet()` of the population (`src/creatures/population.ts`) gives the kind of each creature
  that starts a hello. `greetFoals()` in `src/candy.ts` is the hello of the pegasus foals.
- The test snapshot gives `friend` (the state, the place on the screen, the distance to the
  fairy, the largest distance since the last snapshot, the note, its hearts, the waiting notes,
  and the friend that goes home in a swap), `animalBook` (the tapped card and the look of each
  card) and `foalHellos`. The test hooks are `meet(...kinds)`, `chooseFriend(kind)` (as
  **Fly with me** and **No friend**), `cheer()` and `friendCalls()`, which renders the view of
  one moment with no friend and with the friends and gives the two draw-call counts.
- On the dev server, `?friend=all` gives a hello of each kind at the start, with no note: the
  book is full, and the deer flies with her at once.

Run `node scripts/friend-smoke.mjs "path/to/chrome.exe" [origin]` against the dev server to
check the friend in the game: the notes of new cards with their hearts, the Animals page before the
gift, five hellos on Earth and the gift note, the friend is no resident, a happy loop, the Animals
page with a met card, a shadow card and the card of the friend, the tabs with the keyboard,
**Fly with me** and the swap in the flight, **No friend**, Escape, a reload, a broken saved value,
the nine kinds of the first book and eleven new kinds, a low flight with turns, a climb from the meadow to open space with a swap
in a boost and a guided flight back, reduced motion, the reset in Settings, the hello of a pegasus
foal, notes that wait for each other, a hop of Blossom Haven, and phones of 390 px and 320 px. The
check prints the draw calls with and without the friend, and in a swap. The screenshots go to
`artifacts.local/friend/`.

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

The four animals of this study now live in the leaf forest of Earth, in herds with many more
kinds (see [Animals](#animals)): cows, sheep and rabbits on its meadows, and ducks on its rivers.

The study remains an independent place to try optional features; its settings
do not change the game. [Design and habitat rules](docs/creature-study.md)
describe both versions.

Run `node studies/creature-study/creature-smoke.mjs "path/to/chrome.exe"` for its browser checks.

### Creature hello

The creatures say hello to the fairy. Fly low near an animal on Earth or a
fairytale creature on Blossom Haven. When the fairy is 6 m or nearer, or comes that near in the next second, the
creature turns to her and hops two times on its ground. Ducks, Frog Princes and jellyfish
bob on the water, and a flier makes a small jump in the air. Each animal of a herd says hello as
one animal; a school or a swarm says hello as one group. Two or three small pink hearts float up from the head, sway
and fade. A soft two-note chime plays when Sound is on. Hellos that come close
together share one chime. Each creature says hello again only after 8 s. The
pegasus foals in the air say hello too: a foal turns to the fairy, makes two
small jumps in the air and sends up hearts (`greetFoals()` in `src/candy.ts`).
The hellos bring the [fairy friend](#fairy-friend).

- `greet()` of the population (`src/creatures/population.ts`) runs after
  `update()`, because `update()` puts each animal back on its route. The hop changes the matrix of
  the instance of the animal. The hop goes
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
Haven, a Frog Prince bob when one is near, and a phone at 390 px. The names of the creatures are
`creature-<kind>-<index>`: empty markers of the near animals in the group `wildlife`. The
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
the relocation rules above, not the original 20-minute proposal.
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
**My book** starts the flower guide. The [technical study](docs/ui-simplify-study.md) gives
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

The study is kept, and the landmarks are not built: fixed landmarks make an Earth that
is new at each visit more rigid. The game keeps its Earth of today. The
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

## Fairy trail study

Visit `/studies/fairy-trail-study.html` for **A trail that stays behind her**, a study of
the sparkle trail of the fairy. The trail of the game goes off at an angle: near a world,
the game carries the fairy with the spin and the orbit of that world, and the dots of the
trail stay in space. The study gives five rules for a trail that is the same on each
screen, at each speed and on each world, and fifteen options for its look: No trail,
Today repaired, Pixie dust, Star glints, Ribbon of light, Wing-tip streams, Comet tail,
Sparkle halo, Ribbon and stars, Rainbow dust, Blossom confetti (a magic trail for Blossom
Haven), Only when it counts, Shimmer to sparkle, Shimmer from her feet and Shimmer from her wings. Each option has a clip of the same
flight of 14 s from
the engine of the game: a cruise, two turns, a boost, a hover and the 4 s after a sparkle
ring. **See it live** runs an option in live 3D, with the flight, the camera, day and
night, the ten sparkle colours and a switch that stops the motion of the world. Its
controls do not change the game.

On 4 October 2026 four options were selected for the game: Pixie dust, Comet tail,
Sparkle halo and Shimmer from her feet. The player selects one of them in the look menu
(see [Character customization](#character-customization)); the study keeps the trail from
before as **The trail of today**. The
[technical study](docs/fairy-trail-study.md) gives the cause, the rules, each option, the
cost and the limits. The clips are in `public/studies/fairy-trail/`. Run
`node studies/fairy-trail-study/fairy-trail-study-capture.mjs "path/to/chrome.exe" today,pixie http://localhost:5174`
to record the clips of the trail of today and of Pixie dust again.

## Learn and play study

Visit `/studies/learn-and-play-study.html` for **Ten ideas to learn and to come back**, a study
of ten features for a child of 5 and up (F11 to F20). Six teach: an animal book, rings that
count, a size line-up of the worlds, a diary of the Moon shapes, nature stamps for the climate
belts, and a picture thermometer. Four give a reason to come back: a garden at the cottage, looks
to earn, a fairy friend and a postcard album. Each idea has a clip from the engine of the game,
with the idea added by study code, and the pictures in the cards come from the engine too.
**Fly it live** runs the idea in live 3D. Each idea has its own study on the page: three moments
of its clip, what the game has today, three decisions and a build plan
(`studies/learn-and-play-study/studies.ts`). Pick the ideas at the end of the page. Its controls
do not change the game.

The study uses the lab and the page look of the [feature ideas study](#feature-ideas-study). The
recommendation is F12, F15, F11 and F17 first. The
[technical study](docs/learn-and-play-study.md) gives the rules that each idea obeys, the
findings, the place of each change, the limits and how the clips were made. The clips are in
`public/studies/learn-and-play/`. Run
`node studies/learn-and-play-study/learn-and-play-study-capture.mjs "path/to/chrome.exe" F11,F12`
against port 5174 to record the clips of F11 and F12 again.

## Friend book study

Visit `/studies/friend-book-study.html` for **One friend book**, a study of how the Animal book
(F11) and the [fairy friend](#fairy-friend) (F19) become one thing: the child sees the animals that
she met and changes the animal that flies with her. It compares three options with a clip from the
engine of the game for each: **A** the book in Worlds, with "Fly with me" on each card that she
met; **B** the book in the first row of Your fairy; **C** an offer "Fly with me?" over a creature at
a hello. Each clip shows a real swap in the flight with the real friend models: the old friend
waves and flies home, or its bubble pops, and the new friend comes and makes the happy loop. Two
more clips show the gift before the fifth hello (five hearts on each new card) and the Animals
page on a phone of 390 px and of 320 px. The page also has the nine cards, the saved data, the
list of the changes to F19 and eight decisions. Its controls do not change the game.

The study uses the lab and the page look of the [learn and play study](#learn-and-play-study).
The panels in the clips are DOM with the real CSS of the game: `scope-css.mjs` puts that CSS under
one class and makes its narrow-screen rules container queries, so the phone frames get the phone
rules. The recommendation is option A. The [technical study](docs/friend-book-study.md) gives the
findings, the options, the rules of the swap, the changes to F19 and how the clips were made. The
clips are in `public/studies/friend-book/`. Run
`node studies/friend-book-study/friend-book-study-capture.mjs "path/to/chrome.exe" A,B` against a
dev server with no hot reload to record the clips of A and B again, and add `--moments` for their
moment pictures.

The player selected option A with the recommended option of each decision, and it is in the game:
see [Fairy friend](#fairy-friend).

## Animals study

Visit `/studies/animals-study.html` for **More animals**, a study of many more animals for Earth
and Blossom Haven, each one in the place where it belongs. A catalog gives each kind a rule that
reads only values of the game: the climate belt or the garden of `zoneAt()`, land, shore, river,
sea or deep sea, the half of the planet, the season and the magic season. Earth gets real animals
(zebras and giraffes on the savanna, a camel in the desert, penguins only in the south); Blossom
Haven gets creatures from stories and candy (gummy bear cubs, candy-floss lambs, crystal deer,
gummy jellyfish, lantern moths in Lantern time). It compares three options: **A** a few kinds for
each place with the models of today, **B** herds of 27 + 13 kinds as one instanced joined model for
each kind, moved by a shader, and **C** few models with points for the far animals and the small
life. Seven clips from the engine of the game show the options on one route across the belts, a
herd on the savanna, the sea and the shore, the gardens and Lantern time. A bench measures the draw
calls and the frame time of each option with the real renderer, on a computer page and on a phone
page of 390 px. The page also has the catalog, the animal book with 40 cards, the friend, the plan
and ten decisions. Its controls do not change the game.

The recommendation is built in the game (see [Animals](#animals)); the technical study says what
changed. The study uses the lab of the [feature ideas study](#feature-ideas-study) (with a new option
`mobile` of `createLab()` for the phone bench) and the page look of the
[learn and play study](#learn-and-play-study). The recommendation is option B, then the points of C
for the small life. The [technical study](docs/animals-study.md) gives the findings, the rules, the
models, the measurements and the plan. The clips are in `public/studies/animals/`. Against a dev
server with no hot reload, run
`node studies/animals-study/animals-study-capture.mjs "path/to/chrome.exe" [A,B,...]` for the clips
(add `--moments` for the moment pictures, or `--cards` for the card pictures), and
`node studies/animals-study/animals-study-bench.mjs "path/to/chrome.exe"` for the measurements.

## Wandering home study

Visit `/studies/wandering-home-study.html` for **The wandering home**, a study of four changes to
the hop of Blossom Haven: a hop each 2 minutes in place of each 5, a small nova at each hop, a
place as a moon of a planet, and a new size from Ceres to Jupiter. It compares three looks of the
nova with a clip from the engine of the game for each: **A** a Blossom nova of petals and rings,
**B** a Star nova with a shell of light, **C** the glow of today, brighter. Three more clips show
Blossom Haven as a moon of Saturn, the sizes, and a hop with the fairy on board (the home grows to
the size of Earth and Saturn rises in her sky). The page also has the two clocks, a table of the
planets with room for a moon home at each size, a bench of each size, eight findings, the plan and
twelve decisions. Its controls do not change the game.

The study uses the lab of the [feature ideas study](#feature-ideas-study) and the page look of the
[learn and play study](#learn-and-play-study). The recommendation is look A at the old place and
at the new place, a moon home around Earth, Saturn, Uranus or Neptune in one hop of two, a size
walk of one or two steps, and a new home built before the hop. The
[technical study](docs/wandering-home-study.md) gives the findings, the rules, the measurements
and the plan. The clips are in `public/studies/wandering-home/`. Against a dev server with no hot
reload, run `node studies/wandering-home-study/wandering-home-study-capture.mjs "path/to/chrome.exe"`
for the clips (add `--moments` for the moment pictures), and
`node studies/wandering-home-study/wandering-home-study-bench.mjs "path/to/chrome.exe"` for the
measurements.

The player answered the twelve decisions, and the hop is in the game: see
[Blossom Haven](#blossom-haven), and "Built in the game" in the technical study. The
player selected look B (the star nova), any size at each hop, a moon home also when it is bigger
than its planet, and a magic season at each hop.

## Living worlds study

Visit `/studies/living-worlds-study.html` for **Living worlds**, a study of the real clouds of each
world and of real things that move and happen there. The airless worlds (Mercury, the Moon, Ceres
and Vesta) had no clouds; Venus, Mars and the four giants all had the same white puffs. The study
compares three options: **A** the real kind of cloud of each world (cloud shells and soft tufts, with
bands that move with the real jets), **B** A and one or two real events on each world, and **C** B and
the floaters that Carl Sagan and Edwin Salpeter imagined in the clouds of Jupiter. Eight clips from the
engine of the game fly the same route on Jupiter today and with each option, and option B on Venus,
Mars, Neptune and the Moon. A bench measures the draw calls and the frame time on a computer page and
on a phone page of 390 px. The page also gives each world with its real clouds, its events, a true fact
for a child and the sources, the real jets, eight findings, the plan and six decisions. Its controls do
not change the game.

Option B is built in the game (see [Living worlds](#living-worlds)), with the answers to the decisions:
no floaters, the friend says when scientists are not sure, all the giants first, faster winds, and the
pale blue Neptune. The [technical study](docs/living-worlds-study.md) gives the findings, the research,
the prototypes, the measurements and what was built. The study uses the lab of the
[feature ideas study](#feature-ideas-study). The clips are in `public/studies/living-worlds/`. Against a
dev server with no hot reload, run
`node studies/living-worlds-study/living-worlds-study-capture.mjs "path/to/chrome.exe" [T,A,...]` for
the clips (add `--moments` for the moment pictures), and
`node studies/living-worlds-study/living-worlds-study-bench.mjs "path/to/chrome.exe"` for the measurements.

## Fairy home study

Visit `/studies/fairy-home-study.html` for **The fairy home**, a study of a simple build mode for
the cottage of Blossom Haven. The study looks at how fairy homes look (eight homes of stories,
gardens and games), finds the parts that make sense, and builds them with the engine of the game:
**roof**, **walls**, **door** and **yard**, with one colour for each part from twelve colours. The
windows go with the walls, and a topper (a star, a cherry) goes with its roof. Each roof fits each
walls with one rule, the socket of the walls (`studies/fairy-home-study/parts.ts`). Seven clips show
the build mode and each part, and **Build it yourself** runs the build mode live with the real
worlds. The page has nine decisions; the answers save in the browser, and **Save study** exports
them. The [technical study](docs/fairy-home-study.md) gives the findings, the rules, the numbers
and the plan. The study uses the lab of the [feature ideas study](#feature-ideas-study) and the
page look of the [learn and play study](#learn-and-play-study). The clips are in
`public/studies/fairy-home/`. Against a dev server with no hot reload, run
`node studies/fairy-home-study/fairy-home-study-capture.mjs "path/to/chrome.exe" --sheets` first
for the pictures of the options and the homes, then the same script with no flag for the clips
and with `--moments` for the moment pictures.

## Browser checks

Each feature has a browser check in `scripts/`. One command runs them all at the same time:

```
node scripts/run-checks.mjs "path/to/chrome.exe"
```

The command starts its own dev server on a free port, runs the 24 checks (4 at the same
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
