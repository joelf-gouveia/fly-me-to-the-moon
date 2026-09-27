# Phone and iPad compatibility study

**Implementation update:** The accepted brief has now been implemented. Read
[Mobile play](mobile-play.md) for the controls, home Wi-Fi instructions, graphics
budget and remaining physical-device checks. The audit below records the
pre-change game and its original findings.

Reviewed 26 September 2026. Scope: the flight game at `/`, with its current
day/night cycle, wildlife, world travel and customization. The study page is
`/mobile-study.html`. It collects preferences; it does not modify the game.

## Verdict

**Changes are needed for dependable phone and iPad play.** This is a feasible
browser adaptation of the current Three.js game. Nothing found so far requires
a native app or a different game engine. That is an architectural assessment,
not a performance guarantee for unspecified devices.

Phone portrait has a useful touch foundation. The strongest blocker is that
steering arrows only appear at viewport widths at or below 720 CSS pixels.
Typical full-screen iPad layouts and many landscape phones therefore have no
manual touch steering. Choosing a guided destination still works independently
of that control. Boost and hover have no touch equivalent at any width.

### Current behavior by screen

These widths are representative CSS viewports, not promises about exact device
models. Browser bars, page zoom and iPad windowing can change the viewport.

| Example viewport | Steering arrows from current CSS | Assessment |
| --- | --- | --- |
| Phone portrait, 390 × 844 | Shown | Partial touch support; no boost or hover |
| Small phone, 320 × 568 | Shown | Check welcome card and all overlays for fit |
| Phone landscape, 844 × 390 | Hidden | Manual touch flight blocked; short-height layout also needs attention |
| iPad portrait, 820 × 1180 | Hidden | Manual touch flight blocked |
| iPad landscape, 1180 × 820 | Hidden | Manual touch flight blocked |
| Narrow iPad window, 600 × 820 | Shown | Width happens to trigger phone controls; this is not tablet support |

## Evidence in the code

| Area | Finding | Source |
| --- | --- | --- |
| Touch availability | `.touch-controls` defaults to `display: none`; only `@media (max-width: 720px)` shows it | `src/style.css`, touch controls and final media queries |
| Input | Pointer capture, pointer up/cancel/lost-capture release and `touch-action: none` already exist | `src/main.ts`, `.touch-controls button` handlers; `src/style.css` |
| Target sizes | Both stylesheets define arrow tracks: 38 px in base CSS and 44 px in adventure CSS. Development and production audits computed 44 × 44 px; consolidate the duplicate rules | `src/style.css`, `src/adventure.css` |
| Boost | `boosted` reads ShiftLeft/ShiftRight; markup contains four direction buttons only | `src/main.ts`, `updateFlight` and touch markup |
| Hover | ControlLeft/ControlRight toggles `hoverHeld`; there is no touch toggle | `src/main.ts`, keydown and hover branch |
| Onboarding | Welcome and flight hints still describe WASD / arrow keys / Shift | `src/main.ts` |
| Short screens | Welcome is vertically centered, has no max-height or internal scroll; the enclosing page hides overflow | `src/style.css`, `.welcome-card` and root sizing |
| Safe areas | No `env(safe-area-inset-*)` in game styles; game viewport lacks `viewport-fit=cover`. Current browser default insetting may help, but edge-to-edge layout needs deliberate safe-area support | `index.html`, `src/style.css`, `src/adventure.css` |
| Menus | Worlds uses native dialog; Worlds/customization have dynamic-viewport max-heights, and customization explicitly scrolls | `src/adventure.ts`, `src/adventure.css`, `src/style.css` |
| Graphics | Three.js 0.186.1 WebGLRenderer requires WebGL 2; initial renderer creation has no application-level fallback message | `package-lock.json`, `src/main.ts`, installed `three/src/renderers/WebGLRenderer.js` |
| Resolution | Antialiasing, high-performance preference and pixel ratio capped at 1.8 for every device; no adaptive quality tiers | `src/main.ts`, renderer creation and resize |
| Scene cost | Living-world ground uses 512 × 256 sphere segments; worlds are generated at startup; terrain regeneration is synchronous | `src/worlds.ts`, `buildGround`, `createWorlds`, `regenerateWorld` |
| Existing optimizations | Instanced scenery, distant wildlife culling and capped pixel ratio are already present | `src/worlds.ts`, `src/creatures/population.ts`, `src/main.ts` |
| Lighting cost | Atmosphere sampling and planetary eclipse shading add shader work; scene materials are traversed each frame | `src/worlds.ts`, `src/sun-shading.ts`, `src/main.ts` |
| Backgrounding | Simulation gates on `document.hidden`; Three Timer connects to document; blur clears input. Rendering is still scheduled each frame when possible | `src/main.ts`, `animate`, key handlers |
| Audio | Sound starts from a button gesture and calls AudioContext.resume. Interruption recovery and background muting are not explicitly handled by the game | `src/main.ts`, sound toggle |
| Context loss | Three.js includes internal context loss/restoration handlers; the game has no visible recovery state. Do not confuse this with no engine recovery at all | Installed WebGLRenderer; `src/main.ts` |
| Saves | Appearance and home discovery use guarded localStorage; no account sync or saved flight position | `src/main.ts` |
| Delivery | Vite static build; no offline service worker or app manifest. Fonts are requested from Google with local fallbacks | `vite.config.ts`, `index.html`, `src/style.css` |

## Browser compatibility is more than “Chrome”

Chrome on Apple mobile devices follows the WebKit path, while Chrome on Android
and desktop follows Blink. Chrome-only support still needs Apple and Android
testing if both are desired. Desktop device emulation checks layout and some
input behavior; it does not run the iPad browser engine or reproduce its GPU,
memory, audio interruptions or thermal limits.
[Chromium architecture](https://www.chromium.org/developers/design-documents/profile-architecture/)

Three.js WebGLRenderer uses WebGL 2 and no longer supports WebGL 1. Confirm an
actual WebGL 2 context on the target devices and show a useful explanation when
creation fails. A successful context alone says nothing about acceptable speed.
[Three.js renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html)

The installed Vite 8.3.1 defaults to `baseline-widely-available`, resolved locally
to Chrome 111, Edge 111, Firefox 114 and Safari 16.4 in
`node_modules/vite/dist/node/chunks/node.js`. That is a build syntax target,
**not a tested minimum device/OS support promise**. Runtime APIs and hardware
still need validation. Decide the oldest device before changing targets or
adding polyfills. Shipping the production build is the compatibility test;
the development server alone is insufficient.

If adopting edge-to-edge rendering, use `viewport-fit=cover` with safe-area
insets for essential controls, including landscape. Also test normal browser
bars and dynamic viewport resizing; do not depend on forced fullscreen or
orientation lock for basic play.
[WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

Keep gesture suppression scoped to game controls and intentional interaction
surfaces, so menus can scroll. Browser gesture handling can cancel pointer
input, so preserve release/cancel handling and test interruptions.
[Pointer gesture behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)

## Proposed implementation sequence

1. **Restore the complete touch path.** Detect touch capability using pointer
   media queries / maxTouchPoints and provide an explicit show-controls option
   for iPads with keyboards/trackpads. Size and position the HUD separately from
   deciding whether controls exist. Retain keyboard input. Add the selected
   boost and hover behaviors; replace desktop-only hints. Start with existing
   arrows unless the questionnaire favors a joystick prototype.
2. **Fit the browser viewport.** Test both orientations and iPad narrow windows;
   constrain/scroll the welcome card, keep menus reachable, apply safe areas
   where appropriate, and consolidate arrow sizing. Use comfortably spaced
   48–56 CSS pixel primary controls as a proposed touch target. Check turn plus
   climb plus boost simultaneously, thumb reach and scene occlusion.
3. **Handle interruptions.** Clear all held touch/key actions when hidden,
   canceled or overlaid. Implement the chosen return-to-game policy. Exercise
   audio suspend/resume and WebGL context loss; show recovery/error feedback.
4. **Measure on real devices, then tune.** Record startup time, representative
   frame times, stalls during planet regeneration, repeated visits, memory
   stability and heat over the requested session length. Trial a lower render
   scale and reduced scenery/terrain detail if needed. Preserve terrain collision
   agreement and the day/night visual rules. Do not infer that a high triangle
   count alone proves bad performance.
5. **Deliver a browser link.** Build the static site and use an appropriate
   HTTPS host for access away from home. Add offline caching, home-screen
   installation or cross-device saves only if requested; these are distinct
   product features, not prerequisites for normal online browser play.

## Questions for the owner

The interactive study asks these without preselecting recommendations. Answers
are saved locally, can be cleared to “undecided”, and exported as Markdown.

1. Exact phone/iPad models, OS/browser versions, and oldest device to support?
2. Who plays: adults/children, rough ages, experience and access needs?
3. Portrait, landscape, or both?
4. One hand, two thumbs, tablet on a table, or movable control positions?
5. Existing arrows, joystick, mostly guided travel, or a comparison prototype?
6. Boost held down, toggled, or omitted in favor of automatic speed?
7. Separate hover control, or is pause sufficient?
8. Minimal HUD, current information, or large labelled controls?
9. Consistent 30+ fps, a 60 fps target, or preserving current visual detail?
10. Typical session: 5–10 minutes, 15–30, or an hour or more?
11. Home Wi-Fi access, private access away from home, or a public shared link?
12. Ordinary online tab, home-screen shortcut, or offline play?
13. Existing local saves, resume flight position, or sync across devices?
14. Stay paused after switching apps, automatically resume, or ask on return?

Optional: non-negotiables and sources of frustration. No answer is treated as
approval of a completed implementation; this is the brief for the next work.

## Acceptance matrix for the eventual mobile change

Run on the named physical phone and iPad in Chrome, plus Android Chrome if that
is a target. Safari on the iPad is a useful additional diagnostic, not a substitute
for checking the requested Chrome app. Test the production build.

| Scenario | Pass condition |
| --- | --- |
| Fresh launch, portrait and landscape | Visible scene or actionable compatibility error; all welcome actions reachable |
| Manual flight | Climb, descend and both turns work without a keyboard at every supported size |
| Multiple fingers | Turn + climb + selected boost work together; each release clears only its own action |
| Canceled touch | Drag off, rotate, open menu, switch apps, or lose capture; no stuck steering/boost |
| Complete play loop | Both start modes, follow/stop home, Worlds destination, manual takeover, arrival and discovery |
| Appearance | Open/scroll/close customization; selections persist after reload on the same device |
| HUD | No collision with browser bars/notches/home indicator; primary controls are comfortably tappable |
| iPad | Portrait, landscape and narrow window; optional keyboard/trackpad does not remove needed touch control |
| Audio | Starts after a tap; follows chosen background policy; can recover after screen lock/app interruption |
| Long session | Meet agreed frame-time target in meadows, clouds, night, space, wildlife and home; no sustained degradation |
| Repeated visits | Leave and return to natural planets repeatedly; no unbounded resource growth or unacceptable rebuild stalls |
| Recovery | Context loss/background return does not silently strand the player; no simulation jump while hidden |
| Network/storage | Clear loading/error behavior; blocked fonts have fallback; unavailable storage does not prevent play |

## Validation and reproducibility

Source inspection and official documentation establish the control availability
gap. Physical phone/iPad hardware is not accessible in this workspace; no real
device frame rate, battery life, audio recovery or WebKit pass is claimed.

The local Chrome audit passed initialization without JavaScript exceptions and
confirmed the six control-visibility results in the table above. At 844 × 390,
the welcome card measured about 512 px tall, extending from y = −61 to y = 451:
the top and bottom are clipped. At 320 × 568 it fit, with little spare vertical
space. Computed visible arrow targets were 44 × 44 px in both development and
production. The production build repeated the same six layout findings with no
JavaScript exceptions. A dispatched touch on the
up arrow produced pointerdown, pointerup and lostpointercapture. These events
confirm wiring, not comfortable steering or multi-touch gameplay certification.

The first two sandboxed Chrome attempts stalled before page evaluation. Running
the same local audit with permission outside that sandbox succeeded; the stalls
are tooling limitations and are not recorded as game compatibility failures.

`scripts/mobile-audit.mjs` records six viewport layouts, computed arrow sizes,
welcome geometry, WebGL 2 availability, and dispatched touch event evidence.
It uses desktop Chromium with SwiftShader and advances animation once per layout
after initial rendering. This is deliberately **not a performance benchmark**. Output and
screenshots go to `artifacts.local/mobile-audit/`.

Run with the dev server on port 5174:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5174
node scripts/mobile-audit.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"
node scripts/mobile-audit.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe" --study
```

For a built-site audit, run `npm.cmd run build` and
`npm.cmd run preview -- --host 127.0.0.1 --port 5175`, then set
`$env:FAIRY_TEST_URL = "http://127.0.0.1:5175/"` before the audit commands.

Validation of the added study: TypeScript and production build passed; all 59
existing tests passed. The browser study checks passed for no preselected
answers, current/proposed iPad controls, answer counting, persistence after
reload, clearing an answer, Markdown export, and the optional capability check.
No horizontal overflow was found at 1440 × 1000, 390 × 844, 320 × 568,
844 × 390, or 820 × 1180. These are emulated layout checks. Questionnaire
screenshots and results are in `artifacts.local/mobile-study/`.

For a phone/iPad on the same trusted Wi-Fi, open
`http://<computer-LAN-IP>:5174/mobile-study.html`. The computer must stay on,
the devices must be able to reach each other, and the firewall must allow the
development server. Do not use `localhost` on the phone to reach the computer.
No router port forwarding is needed for this local test. A public deployment
has not been created by this study.

The study's optional capability check runs only when pressed. It reports the
current browser's context availability and input/viewport information. This
information is included in the export, and is not sent anywhere automatically.
