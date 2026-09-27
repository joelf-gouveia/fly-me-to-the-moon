# Star scenery data

The game sky has four parts:

| Part | File | Shows |
| --- | --- | --- |
| 2,887 catalog stars | `src/star-catalog.ts` (generated) | Always |
| Milky Way glow | `src/stars.ts` (procedural shader) | Always |
| 24 star pictures and 29 star names | `src/star-data.ts` | With the **Star pictures** button |
| 10 James Webb Space Telescope pictures | `src/star-data.ts`, `public/sky/webb/` | With the **Star pictures** button |

The **Star pictures** button shows or hides the lines, the names and the Webb
pictures together. It is off at the start. The stars and the Milky Way do not change.

## Stars

`src/star-catalog.ts` holds every star with V magnitude 5.5 or brighter from the
Bright Star Catalog, 5th Revised Edition (Preliminary Version), Hoffleit, D. and
Warren, Jr., W. H. (1991), as served by NASA HEASARC's BSC5P table. Each row has
the HR number, RA and declination (J2000 degrees), V magnitude, and B-V colour
index. A missing B-V is stored as 0.6. The file also maps each Bayer designation
(for example `Alp Ori`) to its HR number. A double star keeps its brighter row:
`Zet Ori` is HR 1948 (Alnitak), not its companion HR 1949.

- [NASA catalog documentation](https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html)
- [NASA dataset and license metadata](https://data.nasa.gov/dataset/bright-star-catalog)
- [Government-works reuse guidance linked by that metadata](https://www.usa.gov/government-works)

The dataset metadata identifies its access level as public and links the
government-works guidance as its license. This numeric extract includes
attribution to both the original catalog authors and NASA's service.

`node scripts/star-map-data.mjs` regenerates the file. It queries the public TAP
endpoint `https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync` (REQUEST=doQuery,
LANG=ADQL) with:

```sql
SELECT hr, name, alt_name, ra, dec, vmag, bv_color FROM bsc5p WHERE vmag <= 5.5 ORDER BY hr
```

The service returns a binary VOTable, which the script decodes. The rows were
checked on 2026-09-26. The generated file adds about 126 KB (53 KB gzipped) to
the shared sky chunk of the build.

## Star pictures and names

`starPictures` in `src/star-data.ts` has 19 constellations and 5 asterisms (Big
Dipper, Summer Triangle, Winter Triangle, Teapot, The Pointers). An asterism is
a well-known pattern inside or across constellations. The outlines are original,
simplified connections by catalog designation. They are not copies of a
published figure set. The earlier Orion, Big Dipper and Cassiopeia lines are all
still present; Orion also has a head through Meissa.

Asterism lines are lilac and fainter than constellation lines. The star names
are IAU Working Group on Star Names proper names. Names show over the canvas in
HTML (`src/sky-labels.ts`) and fade with the stars. On screens narrower than
720 px, only the picture and Webb names show.

## James Webb Space Telescope pictures

The ten pictures are ESA/Webb releases under the Creative Commons Attribution
4.0 International license ([usage terms](https://esawebb.org/copyright/)). The
terms require the full credit line of each image, visible and next to the image,
with an active link. The game meets this in two places:

- The Webb picture nearest the centre of the view shows a caption with its title, a short fact, the full credit and a link to its ESA/Webb page.
- The **Worlds** dialog has a **Pictures in the sky: credits** section with every credit and link.

`public/sky/webb/` holds the 300-pixel-high ESA/Webb previews (about 370 KB in
total). The game loads them only when a player first turns the **Star pictures**
button on. The game shows them with a soft oval edge and does not use the ESA/Webb logo.

The pictures are 2 to 10 arcminutes wide in the real sky. The game shows each
one 6 degrees wide, which is about 40 to 170 times larger. Each picture keeps
clear of the lines, the brightest stars and the other pictures
(`placeWebbPictures()` in `src/star-map.ts`). A small ring marks the true
position; a line points to the picture when it moved. Four pictures move:
the Horsehead Nebula, Crab Nebula, Ring Nebula and Rho Ophiuchi. The top of each
picture points to celestial north; the orientation values on the image pages are
not applied. Positions come from each ESA/Webb image page. The Ring Nebula page
gives none, so it uses the CDS Sesame position of M57.

## Limits

This is not an observing simulator. Relative catalog directions are retained,
but the camera-centred sphere uses an arbitrary game alignment (RA 0 faces +X,
celestial north faces +Y). There is no date, latitude, precession, proper
motion, parallax, or physical star distance. Brightness, point sizes and colours
are stylized for young players; the point size is set in CSS pixels, so it does
not change with the mobile render ratio. The Milky Way glow is procedural, not a
photograph. The game never requests catalog data or images from an external
service at run time. The solar-system picture map is a separate travel aid.

Run `node scripts/star-sky-smoke.mjs "path/to/chrome.exe"` against the dev server
on port 5174 to check the sky, the toggle, the caption credit and the Worlds credits.
