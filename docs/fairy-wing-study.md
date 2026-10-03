# Wings that catch the light: fairy wing study

Status: accepted on 3 October 2026. Joel selected twelve wings: 01 to 07, 11, 13, 14, 16
and 20. The game now has these twelve wings with the new rendering, in place of Petal,
Luna and Flutter. See "In the game" below. Open `/studies/fairy-wing-study.html` on the
Vite server. The controls of the study do not change the game. It saves its own
answers as `fairy-wing-study-v1`.

In this document, "today" and the line numbers describe the game before the change, at
commit `00af6ea`.
The study page shows that game as **Before**.

This study proposes twenty new wings for the fairy and six changes to how the game draws
a wing. Five wings start from the ideas in five reference pictures. The study uses no
reference picture: each wing is code. Each clip comes from the engine of the game: the
fairy rig, the wing beat, the Earth and the light of the game, with the new wings added
by study code.

## What to review

- **The player** shows the clip of the selected wing. The chips **Before** select Petal,
  Luna and Flutter. The chips **01** to **20** select the new wings. The arrows go to the
  wing before and to the next wing.
- Each clip has two parts. The first part is a close view that turns around the back of
  the fairy. The second part is the flight camera of the game, with a boost.
- **See it live** runs the wing in live 3D. A drag on the picture turns the camera. The
  controls select the camera, the speed, day or night, and one of the ten wing colours of
  the menu. Six switches turn the parts of the new rendering on and off.
- **01 / The twenty wings** shows a picture of each wing and its cost.
- **02 / The rendering** shows six pictures of one wing, with one more change in each.
- **03 / At night** shows the three wings that give their own light. Two of them are
  selected: Starlight and Aurora.
- **06 / Decisions to make** keeps your answers in this browser. **Copy answers** copies
  them for the chat. **Save study** exports them as JSON.

## What the game has today

1. **One flat colour.** All the wings use one `MeshStandardMaterial` with an opacity of
   0.57 and no picture (`src/fairy.ts:93`).
2. **The outline is 1 pixel wide.** The edge is a `LineLoop` (`src/fairy.ts:97`, `:130`).
   WebGL draws each line 1 pixel wide. On a phone with small pixels, the edge almost goes
   away.
3. **One vein, on one wing.** Petal has one vein for each panel (`src/fairy.ts:131`). Luna
   and Flutter have no vein and no pattern.
4. **Three shapes that look the same in flight.** Each wing is two smooth lobes. In
   flight, a wing is about 150 pixels tall in a window of 900 pixels.
5. **The colours go white.** The ten wing colours of the menu are pale. With an opacity
   of 0.57 and the Sun of the game, each colour is almost white on the sky.
6. **No answer to the light.** The wing has an own light of 12% of its colour
   (`src/fairy.ts:154`). It does not change with the view angle, it has no sparkle, and at
   night it is grey.
7. **A stiff wing.** The geometry has points only on the outline (`src/fairy.ts:127`). The
   wing turns on its pivot as one plate (`src/fairy.ts:187`).
8. **The menu shows three small shapes.** The buttons of the menu draw the wings with CSS
   (`src/style.css:336`). Each new wing needs a new CSS shape.

## The twenty wings

"Wing colour" means that the wing takes the wing colour of the menu. "Own colours" means
that the wing has fixed colours. The column "Picture" gives the reference picture that
the idea came from.

| No. | Wing | Family | Colour | Shape | Pattern | Picture |
|---|---|---|---|---|---|---|
| 01 | Dew glass | Glass | Wing colour | The Petal shape of today | Clear membrane, fine veins with twigs | |
| 02 | Glitter vein | Glass | Wing colour | Tall, pointed, small scallops | Deep to pale, silver glitter veins, white dots | 1 |
| 03 | Leaf glass | Glass | Wing colour | Three lobes with wavy edges | Two hues, gold leaf veins, strong colour shift | 2 |
| 04 | Silk pleats | Fabric | Wing colour | Broad fans with scallops | Pleats, two rows of scallops, gold points | 3 |
| 05 | Rainbow cells | Butterfly | Wing colour | Pointed upper, small lower with a curl | Half a rainbow around the wing colour, dark cell lines, stars | 4 |
| 06 | Swirl and gems | Butterfly | Wing colour | Round butterfly | Pastel bands of the wing colour and its neighbour colours, swirls with gems | 5 |
| 07 | Monarch | Butterfly | Wing colour | Butterfly | Dark veins, dark border, white dots | |
| 08 | Peacock eye | Butterfly | Wing colour | Round butterfly | One large eye on each wing | |
| 09 | Dragonfly | Glass | Wing colour | Four long narrow wings | Almost clear, a net of cells, a dark mark | |
| 10 | Moon moth | Butterfly | Wing colour | Tall upper, lower with a long tail | Pale, small eyes, own light | |
| 11 | Swallowtail | Butterfly | Wing colour | Pointed upper, lower with a short tail | Dark stripes, dark border, dots | |
| 12 | Stained glass | Magic | Wing colour | Butterfly with a small point | Panes of near hues between dark lines | |
| 13 | Frost | Nature | Wing colour | Sharp points on the edge | White frost ferns, crystals, much glitter | |
| 14 | Starlight | Magic | Wing colour | Pointed upper, round lower | Night blue, stars with lines, edge in the wing colour | |
| 15 | Petal bloom | Nature | Wing colour | Four petals with a notch | White middle, colour at the edge, gold points | |
| 16 | Autumn leaf | Nature | Own colours | Pointed lobes | Gold to red, dark leaf veins | |
| 17 | Feather | Fabric | Wing colour | Tall, with feather tips | Three rows of feathers | |
| 18 | Soap bubble | Magic | Own colours | Round | Almost clear, a film of colours, a white rim | |
| 19 | Candy swirl | Magic | Wing colour | Round | Spiral stripes of a lollipop, sugar glitter | |
| 20 | Aurora | Magic | Wing colour | Tall, soft edge | Curtains of light in the wing colour and its neighbour colours | |

Joel selected twelve wings: Dew glass, Glitter vein, Leaf glass, Silk pleats, Rainbow
cells, Swirl and gems, Monarch, Swallowtail, Frost, Starlight, Autumn leaf and Aurora.
They include the five wings from the pictures. The menu shows three buttons in a row, so
twelve wings fill four rows. Autumn leaf has fixed colours; each other selected wing
takes the wing colour of the menu. The other eight wings stay in the study.

## The new rendering

### A panel in polar form

A wing has two to four panels for each side. A panel is a closed lobe around the root:
the point where the wing holds the back of the fairy (`shapes.ts`).

```
u    0 to 1 across the angles of the panel
rho  0 at the root, 1 at the outline
r(u) = length × sin(π × warp(u)) ^ round × scallops(u) + tip(u) + tail(u)
```

`round` below 1 gives a broad lobe, and above 1 a slim lobe. `scallop` adds round lobes or
sharp points along the edge. `tail` adds a tail. Each pattern is written in (u, rho), so a
vein, a band or a border follows the shape of its panel. A new shape needs one line of
numbers.

### Two pictures for each panel

`paint.ts` paints two pictures of 512 × 512 pixels for each panel, with the 2D canvas of
the browser.

- **The colour picture.** A function of the design gives the colour and the transparency
  of each pixel from (u, rho). The outline is in the transparency. Then the painter draws
  the layers: veins with twigs, leaf veins, a grid of rays and bands, spots, eyes, swirls
  with gems, stars, a curl and the edge line.
- **The data picture.** Red is the amount of glitter. Green is the amount of own light.
  Blue is the amount of colour shift. A drawn line removes the colour shift at its place
  and adds its own glitter and light.

The mesh of a panel is a plain square with 10 × 10 parts. The left wing is the mirror of
the right wing and uses the same pictures.

### The wing shader

`wings.ts` uses `MeshStandardMaterial` with `onBeforeCompile`, so the wing keeps the Sun
shadow of the planets (`src/sun-shading.ts`), the fog and the tone mapping of the game.
The shader adds five things:

1. **A deeper colour.** The colour goes to the power 1.4, and the wing colour of the menu
   becomes 16% darker with more saturation. A pale colour stays a colour in the Sun.
2. **Colour shift.** A rainbow colour from the view angle and the place on the wing mixes
   into the membrane.
3. **Light through the wing.** The wing adds a part of its own colour as light. The part
   follows the daylight, from 22% at night to 100% in the day.
4. **Own light.** The green of the data picture adds light that does not need the Sun.
5. **Glitter.** A grid of 70 × 70 cells holds one point each. A point shows where the red
   of the data picture is high, and it flashes with the time and the view angle.

In the vertex shader, the tip bends: `z += flex × (x² + y²)`. `flex` follows the speed of
the wing beat, so the tip is late in each beat.

### The six levers

| Lever | What it changes | Where |
|---|---|---|
| Painted membrane | The colour picture in place of one flat colour; the deeper colour | `paint.ts`, shader |
| Veins, spots and edges | The drawn layers of the colour picture | `paint.ts` |
| Colour shift | The rainbow mix from the view angle | shader |
| Glitter | The points that flash | shader |
| Light through the wing | The light through the wing and the own light | shader |
| Soft wing beat | The bend of the tip | vertex shader |

With all six levers off, a wing of the study has the look of today in its new shape.

## Cost

The numbers come from the capture of the clips, in headless Chrome on a computer
(`public/studies/fairy-wings/stats.json`).

| | Today | A wing of the study |
|---|---|---|
| Draw calls for the wings | 8 (Petal: 12) | 4 with two panels, 6 with three, 8 with four |
| Triangles for the wings | About 160 | 800 with two panels |
| Pictures | None | 4 with two panels (5.3 MB with mipmaps) |
| Time to paint | None | 80 ms to 220 ms, one time for each wing and colour |
| Shader | The standard shader | The standard shader plus one picture read and about 30 lines |

Leaf glass has three panels (8 MB). Petal bloom has four panels (10.7 MB). The game
paints only the wing of the look, so it holds the pictures of one wing.

## In the game

- **The module.** The wing code is in `src/fairy-wings/`. `createFairyRig()` makes the
  wings with `createFairyWings()`, and `applyLook()` paints the wing of the look. The
  same wing and colour paint one time only.
- **The wing beat.** `pose()` turns the four wing pivots as before. It gives the speed of
  the beat to the wings, for the bend of the tips.
- **The menu.** `wingOptions` in `src/customization.ts` has the twelve wings, in four
  rows of three. Each button shows a small picture of the wing in the wing colour of the
  look (`src/fairy-wings/icon.ts`), in place of the CSS shapes.
- **Saved looks.** Petal, Luna and Flutter are not in the menu. A saved look with Petal
  gets Dew glass, Luna gets Glitter vein, and Flutter gets Swirl and gems.
- **The daylight.** `updateEnvironment()` of `src/main.ts` gives the daylight to the
  wings, for the light through the wing.
- **The three wings of before.** Their meshes stay in the rig, hidden. Their pivots are
  the wing pivots. The hair study measures them, and this study shows them as **Before**.
- **The silhouette.** `setSilhouette()` shows each wing as a plain shape, with the
  outline from its picture.
- **Not done.** The menu does not show that the wing colour has no effect on Autumn leaf.
  The study did not measure a phone.

## Limits and risks

- **A picture, not a mesh.** The outline has the sharpness of 512 pixels. In the
  postcard camera, very near the wing, the edge is soft.
- **Dark edges.** A canvas keeps no colour in a clear pixel, so the edge of a wing with no
  edge line can get a thin dark line. Each wing but Aurora has an edge line that hides it.
- **The order of clear panels.** The panels do not write depth. Where two clear panels
  overlap, the study draws the lower panel first. The game does the same today.
- **Long tails.** The tails of Moon moth and Swallowtail can go through the skirt or the
  long hair in a turn. The study did not measure this.
- **Phones.** The study did not measure a phone. The time to paint and the picture memory
  are the two numbers to measure.
- **The wing colour.** Two wings do not use the wing colour of the menu: Autumn leaf
  and Soap bubble. Autumn leaf is in the selection. When the player selects it, the menu
  must show that the colour has no effect, or it must hide the colour.
- **Blossom Haven.** The clips show Earth. Blossom Haven is pink, so pink wings have less
  contrast there.

## Files

| File | Content |
|---|---|
| `src/fairy-wings/shapes.ts` | The panel in polar form, and the colour helpers |
| `src/fairy-wings/designs.ts` | The twelve wings of the game |
| `src/fairy-wings/paint.ts` | The painter of the two pictures |
| `src/fairy-wings/wings.ts` | The meshes, the shader and the six levers |
| `src/fairy-wings/icon.ts` | The small picture of a wing for the menu |
| `studies/fairy-wing-study/designs.ts` | The eight wings that stay in the study, and the order of the twenty |
| `studies/fairy-wing-study/wings.ts` | The wings of the study and the wings of before on the rig |
| `studies/fairy-wing-study/shots.ts` | The clips, the pictures and the live view |
| `studies/fairy-wing-study/model.ts` | The text of the page |
| `studies/fairy-wing-study/model.test.ts` | The tests |
| `public/studies/fairy-wings/` | The clips, the pictures and `stats.json` |

Run `node studies/fairy-wing-study/fairy-wing-study-capture.mjs "path/to/chrome.exe"
dew,glitter http://localhost:5174` to record the clips of two wings again. Add `--still`
for the pictures only.
