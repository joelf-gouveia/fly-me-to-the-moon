# A sky full of stories: star map study

Status: implemented in the game on 26 September 2026. This page keeps the
original proposal. [What the game now does](#what-the-game-now-does) lists the
differences. Open `/star-map-study.html` on the Vite server. The study controls
do not change the game or saved game data.

## What to review

The prototype shows the game sky of today and the proposed sky in the same 3D view.

- **Compare** switches between *Before* (the sky before the change) and *The proposal* in one step.
- The finder chips turn the view to each of the 24 star pictures and each of the 10 Webb pictures.
- The controls change the pictures, the background stars, the faintest star, the Milky Way glow, and the Webb pictures.
- The flat whole-sky chart shows all pictures and the current view. Select a place on the chart to turn there.
- **Save study** exports the settings, the cost figures and the resolved figure data as JSON.

The *Before* baseline is a frozen copy of the old sky in
`src/star-map-study/legacy-sky.ts`. The proposal preview is in
`src/star-map-study/scene.ts`. It uses the same data and geometry as the game
(`src/star-data.ts`, `src/star-map.ts`), the same sky axes (`starDirection()`)
and the same sky radius (`STAR_SKY_RADIUS`).

## What the code did before the change

| Area | Current behavior | Consequence |
| --- | --- | --- |
| `src/stars.ts`, `createStarSky()` | Draws 3,000 seeded random stars and 22 catalog stars in 4 point batches | Most stars in the sky are not real stars |
| `src/star-data.ts`, `catalogStars` | 22 stars from the Bright Star Catalog, keyed by HR number | Only Orion, the Big Dipper and Cassiopeia have their real stars |
| `src/star-data.ts`, `starPictures` | 3 line pictures | The sky has no pictures south of Orion and none from RA 14 h to RA 23 h |
| `src/adventure.ts:70-73` | The **Star pictures** button calls `setConstellations()` | Pictures are optional; no names show |
| `src/main.ts:828` | `stars.update()` fades the whole sky with atmosphere density and daylight | New sky objects must use the same fade |
| `docs/star-data.md` | States that no source imagery is bundled | Webb pictures change this statement |

## Finding 1: new pictures need the real stars

A picture line must end on a visible star. The random stars do not follow the
real sky, so the new lines would join empty places. The 22 catalog stars today
cover only the three current pictures.

The Bright Star Catalog to magnitude 5.5 has 2,887 stars. The game draws 3,022
stars today. Thus the real sky costs almost the same number of points.

| Faintest magnitude | Stars | Use |
| --- | --- | --- |
| 3.0 | 174 | Too few; the sky looks empty |
| 4.0 | 518 | Clear pictures, sparse background |
| 4.5 | 904 | Good for a small phone screen |
| 5.0 | 1,630 | Dark country sky |
| 5.5 | 2,887 | Recommended; replaces the random stars |

The study shows each star with one point. The point size comes from the V
magnitude (2.4 px to 14 px). The colour comes from the B-V colour index. The
sizes and colours are stylized, as in the game today.

## Finding 2: a set of 24 pictures

The proposal has 19 constellations and 5 helper shapes (asterisms). An asterism
is a well-known pattern inside or across constellations, for example the Big
Dipper. The selection rules are:

1. Use bright stars that a child can find in a real sky.
2. Give each part of the sky at least one picture, in both hemispheres.
3. Use names with a simple picture meaning, for example "The Swan".
4. Keep the three current pictures with the same lines.

| Sky band | Constellations | Helper shapes |
| --- | --- | --- |
| North | Cassiopeia, Little Dipper, Draco, Cygnus, Lyra, Perseus, Auriga, Andromeda | Big Dipper |
| Around the middle | Orion, Pegasus, Boötes, Leo, Gemini, Taurus, Aquila, Canis Minor | Summer Triangle, Winter Triangle |
| South | Canis Major, Scorpius, Southern Cross | Teapot (in Sagittarius), The Pointers |

The 24 pictures have 147 line segments. The 19 constellations alone have 122.
The outlines are original, simplified teaching shapes. They do not copy a
published figure set. `src/star-data.ts` holds them as catalog
designations, for example `Alp Ori` for Alpha Orionis (Betelgeuse). The model
resolves each designation to an HR number.

A test proves that every current `starPictures` segment is also in the proposal.
The proposal adds the head to Orion: two lines through Meissa (Lambda Orionis).

**Double stars.** Some designations have two catalog rows. `Zet Ori` is HR 1948
and HR 1949. `Zet UMa` (Mizar) is HR 5054 and HR 5055. The resolver keeps the
brighter row. Without this rule, Orion and the Big Dipper join the faint companion.

**Southern sky.** Today the southernmost catalog star in the game is Sirius. The proposal adds
the Southern Cross, the Pointers (Rigil Kentaurus and Hadar), Scorpius and the
Teapot. Canopus and Achernar get names but no picture.

## Finding 3: names help children find a picture

Today the pictures have no names. The study shows the picture names and the
names of 29 bright stars. The star names come from the IAU Working Group on
Star Names. A tap on a line selects the picture and shows one short caption.

The study uses HTML labels over the canvas. The game can use the same method,
because its HUD is HTML. The labels must fade with the stars. Hide the labels
when the **Star pictures** button is off.

## Finding 4: James Webb Space Telescope pictures

### License and credit

ESA/Webb releases its images under the Creative Commons Attribution 4.0
International license. The rules from <https://esawebb.org/copyright/> are:

- Show the full credit line of each image, unchanged, visibly, next to the image.
- Make the link active when the credit is online.
- Do not use the ESA/Webb logo.
- Do not imply that ESA/Webb endorses the game.
- Mention significant changes after the credit. The study resizes each image and gives it a soft oval edge.

The study shows the credit in the caption when a child selects a picture. The
page also lists all ten credits with links. The game needs the same: a visible
credit in the caption, and a credits list in a menu.

### The ten pictures

Each picture sits near a picture in the proposal. The position is the image
centre from the ESA/Webb image page. The Ring Nebula page gives no position, so
the study uses the CDS Sesame position of M57.

| Image | Object | Near | True width | Credit |
| --- | --- | --- | --- | --- |
| weic2411a | Horsehead Nebula | Orion | 2.14′ | ESA/Webb, NASA, CSA, K. Misselt (University of Arizona) and A. Abergel (IAS/University Paris-Saclay, CNRS) |
| weic2417a | Crab Nebula | Taurus | 5.33′ | NASA, ESA, CSA, STScI, T. Temim (Princeton University) |
| weic2320b | Ring Nebula | Lyra | Not on the page | ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson |
| weic2330a | Cassiopeia A | Cassiopeia | 7.4′ | NASA, ESA, CSA, STScI, D. Milisavljevic (Purdue University), T. Temim (Princeton University), I. De Looze (University of Gent) |
| weic2316a | Rho Ophiuchi | Scorpius | 6.65′ | NASA, ESA, CSA, STScI, K. Pontoppidan (STScI), A. Pagan (STScI) |
| weic2216a | Pillars of Creation | Aquila, towards the Teapot | 4.22′ | NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI). |
| weic2208a | Stephan’s Quintet | Pegasus | 6.34′ | NASA, ESA, CSA, and STScI |
| weic2612a | Cigar Galaxy (M82) | Big Dipper | 9.48′ | NASA, ESA, CSA, A. Smercina (STScI), T. Williams (University of Manchester). Image processing: A. Pagan (STScI). |
| weic2205a | Cosmic Cliffs | Southern Cross | 7.29′ | NASA, ESA, CSA, and STScI |
| weic2212a | Tarantula Nebula | Large Magellanic Cloud | Not on the page | NASA, ESA, CSA, and STScI |

Other candidates from the ESA/Webb archive are the Helix Nebula (weic2601a),
the Southern Ring Nebula (weic2207b), the Orion Bar (weic2315b) and Centaurus A
(weic2615a). The captions in `figures.ts` are short, simple facts. Review them
before release.

### Size and position

The real pictures are 2 to 10 arcminutes wide. At that size a picture is one or
two pixels in the game. The study enlarges them to 6 degrees by default, which
is about 40 to 170 times the true size.

At 6 degrees, some pictures cover the lines. The Horsehead Nebula is 0.5 degrees
from Alnitak in Orion's belt. `placePostcards()` tries the true position first.
If the picture touches a line, a bright star or another picture, it tries rings
of positions around the true position. In *Beside the lines* mode, a small ring
marks the true position and a line points to the picture.

| Placement at 6° | Result |
| --- | --- |
| Horsehead Nebula, Crab Nebula, Ring Nebula, Rho Ophiuchi | Moved 6° to a clear place |
| The other six | At the true position |

Recommend *Beside the lines* for the game. The *At the true position* mode is
for comparison.

### Things to know about the images

- Each image has its own stars, with the six-point Webb spikes. These stars are not at the catalog positions. At 6 degrees they look like texture, not like sky stars.
- The study turns each image so that its top points to celestial north. The image pages give an orientation value. The study does not apply it yet.
- The images have different shapes. The Tarantula image is wide; the Horsehead image is square. The oval edge follows the image shape.
- The proposal assumed 512-pixel textures: ten of them with mipmaps use about 13.3 MB of GPU memory. The game uses the 300-pixel-high previews (about 370 KB of files), which use less.

## Finding 5: the Milky Way

The study draws a procedural Milky Way glow on the sky sphere. The glow follows
the galactic equator (J2000 galactic north pole RA 192.859°, Dec 27.128°). It is
brighter towards the galactic centre in Sagittarius. It costs one draw call and
no texture.

An all-sky photo map is an alternative. Each map has its own license terms.
This study did not examine one.

## Cost in the game

| Item | Before | Proposal |
| --- | --- | --- |
| Star points | 3,022 in 4 draw calls | 2,887 in 1 draw call |
| Star data in the bundle | 22 rows in `star-data.ts` | About 45 KB as a typed array (4 floats per star) |
| Picture lines | 3 objects | 24 objects, or 1 merged object with a highlight range |
| Milky Way | None | 1 sphere, 1 draw call |
| Webb pictures | None | 10 quads, about 13.3 MB GPU memory, loaded after the flight starts |
| Total sky draw calls | 4, and 3 more with **Star pictures** on | 36 with all options (the pointer lines are extra); 3 with merged lines and no Webb pictures |

The generated `src/star-catalog.ts` adds about 126 KB (53 KB gzipped) to the
build, more than the 45 KB estimate for a typed array.

**Pixel ratio.** `PointsMaterial` sizes in `src/stars.ts` are in drawing-buffer
pixels. `createMobileQuality()` changes the pixel ratio at run time. The study
multiplies the point size by the pixel ratio, so a star keeps its size on the
screen. The game must update that value when the ratio changes.

## Proposed implementation

Do the steps in this order. Each step can ship alone.

1. **Real stars.** Move the generator to produce `src/star-catalog.ts` with a `Float32Array` of RA, Dec, magnitude and B-V. Replace the random stars in `createStarSky()` with one `ShaderMaterial` point cloud. Keep `catalogStars` for the named stars. Update `docs/star-data.md` with the new ADQL query and row count.
2. **More pictures.** Add the new outlines to `starPictures` with HR numbers. Keep the test in `src/stars.test.ts` that every endpoint is in the catalog. Add the test that each segment is shorter than 40 degrees.
3. **Names.** Add figure and star labels to the HUD. Show them only with **Star pictures** on. Fade them with `stars.update()`.
4. **Tap a picture.** Select the nearest line under a tap. Show one caption. Do not pause the flight.
5. **Milky Way.** Add the glow sphere to the star group. Add its material to the fade list.
6. **Webb pictures.** Put the 512-pixel images in `public/`. Load them after the first frame of flight. Add the credit to the caption and a **Credits** entry to the menu. Update `docs/star-data.md`.

Keep these rules from the game today:

- The sky follows the camera position and does not rotate (`src/stars.ts`).
- Atmosphere and daylight fade the whole sky (`src/main.ts:828`).
- The game never requests data from an external service at run time. Bundle the images with the game.
- Pictures stay optional scenery. No task or reward needs them.

## What the game now does

Steps 1, 2, 3, 5 and 6 are in the game. The **Star pictures** button still
controls the optional parts, as requested: it shows or hides the lines, the
names and the Webb pictures together. It is off at the start.

| Proposal | In the game |
| --- | --- |
| Compact typed array | Flat number rows plus a designation map in `src/star-catalog.ts` |
| Pictures by HR number | Pictures by designation in `src/star-data.ts`, resolved by `src/star-map.ts` |
| 24 line objects or 1 merged object | 2 merged objects: constellations and asterisms |
| Tap a picture (step 4) | Not implemented. Taps steer the fairy on touch screens |
| Caption after a tap | The Webb picture nearest the centre of the view shows its caption and credit |
| Credits entry in the menu | **Pictures in the sky: credits** in the **Worlds** dialog |
| 512-pixel compressed textures | 300-pixel-high JPEG previews, loaded when the button first turns on |
| Pixel ratio | `stars.update()` takes `renderer.getPixelRatio()` every frame |

`scripts/star-sky-smoke.mjs` checks the sky in the running game.

## Decisions for review

| Question | Recommendation |
| --- | --- |
| How many pictures? | All 24. The list can grow later without a code change. |
| Show helper shapes? | Yes, with a dashed or lighter line. |
| Names on by default? | On when **Star pictures** is on. |
| Webb placement? | Beside the lines, with a pointer to the true position. |
| Webb size? | 6 degrees. Test 4 to 8 degrees on a phone. |
| Faintest star on phones? | 5.5; drop to 4.5 if the mobile budget needs it. |

## What this study does not check

- Frame rate on a physical phone or iPad. The smoke check uses SwiftShader.
- The real orientation of each Webb image (see above).
- Screen reader access to the 3D canvas. The chips give keyboard access to each picture.
- Whether the caption facts are right for the youngest players.

## Reproduce

```sh
node scripts/star-map-data.mjs
npm test
node scripts/star-map-study-smoke.mjs "path/to/chrome.exe"
```

`scripts/star-map-data.mjs` queries the public NASA HEASARC TAP service with:

```sql
SELECT hr, name, alt_name, ra, dec, vmag, bv_color FROM bsc5p WHERE vmag <= 5.5 ORDER BY hr
```

The service returns a binary VOTable. The script decodes it, writes
`src/star-catalog.ts`, and downloads the 300-pixel-high previews to
`public/sky/webb/`. The smoke check needs the Vite server on port
5174. It writes screenshots to `artifacts.local/star-map-study/`.

## Sources

- Bright Star Catalog, 5th Revised Edition (Preliminary Version), Hoffleit, D. and Warren, Jr., W. H. (1991), [NASA HEASARC BSC5P](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html). See `docs/star-data.md` for the license notes.
- [ESA/Webb usage of images](https://esawebb.org/copyright/) and the image pages at `https://esawebb.org/images/<id>/`.
- [CDS Sesame](https://cds.unistra.fr/cgi-bin/nph-sesame/-oI/A?M57) for the M57 position.
- IAU Working Group on Star Names, for the star names.
