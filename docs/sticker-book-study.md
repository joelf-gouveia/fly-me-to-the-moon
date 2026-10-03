# Every world, a sticker: sticker book study

Status: option A is in the game on 27 September 2026, without the voice. The
voice, the Portuguese book, the search stars (B) and the poster (C) stay in the
study for later. Open `/studies/sticker-book-study.html` on the Vite server. The study
controls do not change the game or saved game data. The study saves its own book
as `fairy-sticker-book-study-v1`.

Later on 27 September 2026 the book moved into **Worlds**, and the worlds open one at a
time: option D of [the world book study](world-book-study.md). The table below records
option A as it was built.

On 3 October 2026 the English voice came into the game: F2 of
[the feature ideas study](feature-ideas-study.md), in `src/spoken-facts.ts`. A new sticker plays
its hello line after the chime, and the note lights each word. The Portuguese voice stays in
the study.

## What the game now does

| Area | Implementation |
| --- | --- |
| `src/stickers.ts` | The 13 stickers, their facts, the book, `parseBook()`, `earnsSticker()` and `suggestNext()`. The study re-exports them |
| `src/sticker-book.ts` | The toolbar button, the **My space stickers** dialog, the new-sticker note, and the star marks in **Worlds** |
| `src/main.ts`, `updateNearestWorld()` | The "near" test of the flight panel calls `stickerBook.arrive()` |
| `src/main.ts`, `bookOpen` | Flight waits while the book is open, as for **Worlds** |
| `src/main.ts`, `playChime()` | The home chime, also for each new sticker when the sound is on |
| `src/mobile-ui.ts` | **Stickers** and **Settings** in the touch Menu |
| `src/settings.ts` | **Reset sticker book** in **Settings**, with a confirmation; after a reset, the current world gives no sticker until the fairy leaves it |
| `localStorage` | `fairy-sticker-book`. A saved `fairy-home-found` gives no sticker: every player visits Blossom Haven |
| Earth | The fairy starts on Earth, so `earnsSticker()` needs a return from space (`World.visit` 2). The book suggests Earth last |

The game has no voice: the note and the book show each fact as text. The new
sticker note shows above the toolbar on a computer, and below the top buttons on
a touch screen, so it does not cover the fairy.

The game is for children of age 5 and more. After the child finds Blossom Haven,
the game has no goal. It also teaches almost nothing directly: a world shows only
its name. This study gives three options for a sticker book. The book rewards
each world that the fairy visits, and a voice says one fact about the world.

## What to review

- **Compare options** switches between A, B and C in the same book.
- **Pretend flight** selects a world. **Arrive** acts as the first arrival
  of the fairy. In option B, **Find** acts as the search task on that world.
- **The book** is the view of the child. Tap an earned sticker to hear its
  fact again. Tap an empty space to hear where to fly. The **Next** button
  says which empty space is nearest.
- **Read aloud**, **Chime** and **Show the words** test the book for a child
  who cannot read. Turn off **Show the words** to use the book by voice only.
- **Language of the book** switches the view of the child and the voice
  between English and European Portuguese. The study controls stay in English.
- **Voice** compares the recorded neural voice with the browser voice.
  **Voice speed** plays the recordings at their slow speed, or 12% faster.
- **Fill the book** and **Empty the book** show the two end states.
- **The words** table has every spoken line, the search task, and the check
  that the game needs for it. Press a speaker button to hear a line.
- **Save study** exports the settings, the book, the costs and all the lines as JSON.

## What the code does today

| Area | Current behavior | Consequence for a book |
| --- | --- | --- |
| `src/main.ts`, `fairy-home-found` | The game saves one discovery: the home | The book is the first record of other worlds |
| `src/main.ts`, `fairy-look` | The look is saved with a try/catch and a parser | The book uses the same pattern |
| `src/main.ts`, `updateNearestWorld()` | The flight panel says "near" when the fairy is closer than the larger of 85 m and 1.5 × the atmosphere | The arrival test exists. The book calls `arrive()` at the same place |
| `src/main.ts`, sound button | Sound starts only after a tap, and stops on pause and when the page hides | The voice follows the same rules |
| `src/adventure.ts`, Worlds dialog | Each world has a picture, a name and "Fly here" | The dialog can show the earned stickers, and it already starts a guided flight |
| `src/worlds.ts`, `createWorlds()` | Thirteen worlds, including the Sun, the Moon and Blossom Haven | The book has thirteen spaces |
| `src/worlds.ts`, orbits | All worlds spin upright | The book does not use the Uranus tilt fact |

## Finding 1: a child who cannot read needs a voice

The game shows all help as text: "NEAREST WORLD", "GLIDE SPEED m/s", "Asteroid
belt". Many children of age 5 cannot read these words. Each sticker in the
study speaks its fact. The words also show on the page, for a parent who reads
with the child.

The browser voice (`speechSynthesis`) has limits:

- Each device has a different voice. Many of them sound robotic.
- Some devices have no English voice.
- Browsers speak only after a tap. The study shows its first line as a caption only.

Thus the study plays recorded lines. `studies/sticker-book-study/sticker-voice.mjs` records every
line in `LINES` with Kokoro-82M, an open neural voice (Apache-2.0). It runs on
the computer, with no account and no cost. The recordings sound the same on all
devices, and they work offline after the first load.

| Item | Value |
| --- | --- |
| Lines | 153 for each language, one MP3 file for each line |
| File size | About 18 KB for each line, about 2.5 MB for each language |
| Voice in the study | `af_heart`, in English and in European Portuguese |
| Folder | `public/voice/<language>/<voice>/<key>.mp3`, and `public/voice/manifest.json` |
| Speed | 0.9 of normal speech. **Normal** plays 12% faster |
| Time to record | About 6 seconds for each line on a computer, about 15 minutes for each voice |

The page says one to three lines in a row, for example the hello line and then
the search line. A line has no recording when its text changes after the
recording. The page then uses the browser voice for it, and the **Voice** status
tells you to run the script again. The script records only the changed lines.

To record again after a change of text:

```sh
npm install --no-save kokoro-js @breezystack/lamejs @echogarden/espeak-ng-emscripten
node studies/sticker-book-study/sticker-voice.mjs                   # English and Portuguese, af_heart
node studies/sticker-book-study/sticker-voice.mjs --lang pt         # Portuguese only
node studies/sticker-book-study/sticker-voice.mjs bf_emma --lang en # another voice
```

The game needs one voice for each language, so it ships about 2.5 MB of audio
for each language.

## Finding 2: European Portuguese needs a different path

Kokoro has no European Portuguese voice. Its Portuguese voices speak Brazilian
Portuguese, and `kokoro-js` supports English only. Thus the script does this:

1. `@echogarden/espeak-ng-emscripten` (espeak-ng in WebAssembly, voice `pt`)
   turns each phrase into European Portuguese phonemes. espeak-ng drops the
   punctuation, so the script phonemizes each phrase alone and puts the
   punctuation back for the intonation.
2. The script corrects two espeak-ng outputs: an English `ɹ` in clusters such as
   "prego" becomes `ɾ`, and the extra `ə` after `ɾ` before a consonant goes
   ("Marte" is `maɾtɨ`, not `maɾətɨ`).
3. The script normalizes the phonemes to NFD. The Kokoro tokenizer drops a
   precomposed `ũ`, but it knows the combining tilde.
4. `generate_from_ids()` says the phonemes with the English voice `af_heart`.

The result is an English voice that says European Portuguese sounds. An accent
can remain. A person who speaks European Portuguese must listen to the lines
before the book ships. If the accent is too strong, other paths are:

| Path | Voices | Cost |
| --- | --- | --- |
| Piper `pt_PT-tugão-medium` | One male voice, medium quality, CC0 data | Free, local, needs Python |
| Azure neural voices | Raquel, Fernanda, Duarte | A free Azure Speech key covers this book |
| Google Cloud TTS | WaveNet and Chirp HD pt-PT voices | A project with billing; the free tier covers this book |
| A person reads the lines | Any | 153 lines to record |

Each path needs only one MP3 file for each key in `LINES.pt`.

### The Portuguese words

The words are European Portuguese, for a child, in the "tu" form: "Voa até à
Terra para ganhares este autocolante." The rules:

- "Autocolante" for sticker, and "cartaz" for poster.
- European spelling: "Vénus", "Úrano", "Neptuno", "Dezasseis".
- The article gives the contractions: "do Sol", "da Terra", "de Marte";
  "até ao Sol", "até à Terra", "até Marte". `PT` in the model holds the article
  of each world.
- Blossom Haven is "Refúgio das Flores" (decided on 26 September 2026). The game uses the
  English name.

A test checks the contractions, the European words, and that no Brazilian form
("Vênus", "Netuno", "Dezesseis", "você") is in the lines. The same rules as in
English apply: no numbers, and a maximum of 12 words in a sentence.

## Finding 3: the arrival test already exists

`updateNearestWorld()` in `src/main.ts` finds the nearest world on each frame.
It already decides when a world is "near" for the flight panel. The book needs
one call to `arrive()` at that place. This works in both play modes, **Begin
your flight** and **Follow the sparkle**. The Sun counts as a world.

| World | Arrival distance above the surface |
| --- | --- |
| Sun, Mercury, Moon, Vesta, Ceres, Mars, Blossom Haven | 85 m |
| Earth | 117 m |
| Venus | 142.5 m |
| Uranus | 150 m |
| Neptune | 157.5 m |
| Saturn | 195 m |
| Jupiter | 217.5 m |

## The three options

| Measure | A · Stamp card | B · Hello and search | C · Space poster |
| --- | --- | --- | --- |
| Stickers to collect | 13 | 26 | 13, then 13 placements |
| Spoken lines (`linesFor()`) | 57 | 100 | 107 |
| New checks in flight | None | 13 | None |
| New screens | 1 | 1 | 2 |
| What the child learns | One fact for each world | To look closely at each world | The order of the planets |

**A · Stamp card.** The first arrival at a world gives its hello sticker. The
sticker says one fact. The thirteen spaces show the child where to go next. A
child can fill the book in two or three sessions. After that, the book gives no
new reason to fly.

**B · Hello and search.** A, plus a shiny star for one search task on each world.
The task points to a thing that the game shows, for example the rings of Saturn
or the salt spots of Ceres. A search also counts as an arrival. Each task needs
one check in the flight loop:

| Check | Worlds | What the game tests |
| --- | --- | --- |
| altitude | Sun, Venus, Mars, Jupiter, Uranus, Neptune | The fairy is below the cloud height, or close to the ground |
| place | Vesta, Ceres, Saturn | The fairy is over the south pole, near the Occator direction, or over the rings |
| creature | Earth, Blossom Haven | The fairy is within 12 m of a duck or a unicorn in `creatures.residents` |
| terrain | Mercury, Moon | The fairy is low over a deep crater of `createTerrain()`, or over a dark sea (`TerrainSample.mare` above 0.5) |

The Occator direction is a local constant in `buildGround()` in
`src/worlds.ts`. The crater term is a local value in `createTerrain()`. Both
must be exported for the checks.

**C · Space poster.** The stickers of A. The child then puts each sticker on
its path around the Sun. A wrong path gives a hint, "Try a bigger path", and the
sticker stays in the tray. After two wrong tries, the correct path glows.
Blossom Haven wanders, so it can go anywhere. Vesta and Ceres share path 5, the
asteroid belt. The Moon shares path 3 with Earth, because it goes around Earth.

## The words

Every line obeys three rules. A test in `studies/sticker-book-study/model.test.ts`
checks each rule.

- A line has no numbers.
- A sentence has a maximum of 12 words.
- A fact has a maximum of two sentences.

The facts are from the NASA Science Solar System pages and the NASA Dawn mission.
Blossom Haven says that it is a pretend world, so the child can tell the real
worlds from the story world. The full list is in `STICKERS` in
`studies/sticker-book-study/model.ts` and in the **The words** table on the page.

## Steps to bring the book into the game

1. **Save the book.** Save `{ arrived, found, placed }` in `localStorage` as
   `fairy-sticker-book`, in a try/catch. Read it with `parseBook()`. A saved
   `fairy-home-found` gives no sticker: every player earns Blossom Haven with a visit.
2. **Earn on arrival.** Call `arrive()` in `updateNearestWorld()`. Show the
   new sticker as the home celebration shows, and play the home chime.
3. **Add the voice.** Copy one voice folder for each language from `public/voice/`. Play the
   lines with one `Audio` element, as the study does, so that mobile browsers
   play each line after the first tap. Speak only when the sound button is on.
   Stop the voice on pause, on the customizer, and when the page hides.
4. **Open the book.** Add a book button to the toolbar, beside the palette. Open
   the book as the customizer opens: flight waits, and Escape closes it. In
   **Worlds**, show a small sticker on each picture that the child has. The
   **Next** hint can start the guided flight of the Worlds dialog.
5. **Option B only.** Add the checks one world at a time. Start with the six
   altitude checks, because they need no new exports.

## Recommendation

B, in two steps. Ship A first: the book, the voice and the hello stickers. Then
add the search stars one world at a time. Each check can ship alone. C can come
later, as a calm activity at the end of a session.

## Decisions to make

- **The Portuguese voice.** Listen to Heart in Portuguese. If the accent is too
  strong, choose one of the paths in Finding 2. The page needs only one MP3 file
  for each key in `LINES.pt`, so the files can change later.
- **A reward for a full book.** The study shows a celebration only. A new item
  for the fairy look is also possible. It must be a new item, so that no current
  look is locked.
- **Review of the words.** Ask a parent or a teacher to read every line aloud
  before the book ships.

## Checks

- `npm test` runs `studies/sticker-book-study/model.test.ts`.
- `node studies/sticker-book-study/sticker-book-study-smoke.mjs "path/to/chrome.exe"` checks the
  study against port 5174: every recorded line of every voice, the order of the
  lines, the browser voice, the three options, the poster hints, the saved book
  after a reload, the export, and the 390 px and 320 px layouts.
  Screenshots go to `artifacts.local/sticker-book-study/`.
