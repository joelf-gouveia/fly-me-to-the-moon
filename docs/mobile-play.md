# Mobile play

Implemented from the owner's 26 September 2026 brief: ages 5+, two thumbs,
both orientations, four arrows, held boost, a hover toggle, minimal HUD,
60 fps as the target, 15–30 minute sessions, home Wi-Fi access, ordinary online
browser use, existing local saves, and explicit resume after backgrounding.

## Playing

On touch devices the arrows sit on the left. Hold **Boost** on the right to fly
faster; releasing it returns to normal speed. **Hover** stops flight; its label
changes to **Fly** so you can start moving again. **Worlds**, **Menu**, and pause
stay at the top. Menu contains appearance, sound, world speed, star/orbit toggles,
home guidance in adventure mode, and flight details. Opening the menu pauses
flight and the home relocation clock; closing it returns to the preceding pause
state. Switching apps, losing focus or losing the graphics context pauses the
game until **Keep flying** is tapped. Sound is muted while paused/backgrounded.

Appearance and home discovery remain saved in this browser. Flight location is
not saved, and progress is not synchronized across devices. Keyboard controls
still work. The viewport picks the layout: a coarse primary pointer or a width of
720 CSS pixels or less shows the touch controls. There is no manual switch.

## Home Wi-Fi

Start `npm.cmd run play:lan` on Windows (or `npm run play:lan` elsewhere).
Open the Network URL printed by Vite on your phone/iPad, such as
`http://192.168.1.73:5174/` on this machine when reviewed. Use the current LAN IP
if it changes. The computer must remain on, and both devices must be on a network
that allows them to communicate. The system firewall may need to allow the
server on your private network. Do not use the phone's `localhost` address.

This shares the game with devices that can reach the computer; it is not a
password-protected account. No public hosting, router forwarding, offline cache,
installation requirement or account service was added.

## Graphics and support limits

“All mobile devices” is implemented as broad touch-device support within the
game's WebGL 2 and modern-browser requirements, not a hardware guarantee.
WebGL initialization failure now shows a useful retry/help screen. Context loss
shows recovery feedback and keeps flight paused after restoration. Apple Chrome
still needs physical Apple-device testing in addition to Android.

Touch devices start with antialiasing off, a maximum pixel ratio of 1.25 and a
1.5-million-pixel render budget. Sustained frame rates below 55 lower render
resolution in steps to a 0.65 scale floor; four fast measurement windows permit
a small increase. Pauses/background gaps are excluded. This aims for 60 fps;
it cannot promise that every device's CPU or GPU can meet it.

Mobile worlds have roughly half the decorative clouds, Earth vegetation and
candy objects, simpler candy curves, and at most 14 visible wildlife models
instead of 28. Residents still exist when not drawn. Ground geometry, terrain
sampling, collision rules, cottage placement and day/night mechanics retain
their existing precision. The mobile scenery budget survives planet regeneration.
Paused/welcome/menu rendering is limited to roughly 10 fps; hidden tabs skip
scene work. Customization and the moving Worlds map remain animated.

## Validation

`npm test` covers the existing simulation plus input ownership and adaptive
resolution. `npm run build` checks TypeScript and the complete production site.
With the development server on port 5174, run:

```powershell
node scripts/mobile-play-smoke.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"
```

The test uses desktop Chromium touch emulation at 390×844, 320×568, 844×390,
568×320, 820×1180, 1180×820 and 600×820. It verifies welcome fit and controls
of at least 48 CSS pixels within the viewport, multiple simultaneous fingers,
independent release/cancel, hover, menu pause, customization, Worlds travel,
background pause and explicit resume. It also tests saved appearance, simulated
WebGL context loss/restoration and a WebGL-unavailable startup.

The desktop flight check (`scripts/browser-smoke.mjs`) also passes: climb to
space, a guided return to Earth, and a new landscape. This check found a fault
from before the mobile work: a guided journey to a planet circled it without
descent. `journeyHeading` in `src/journey.ts` now descends to a planet core
target, and `src/journey.test.ts` covers it.

Screenshots and results are in `artifacts.local/mobile-play/`. The original audit
and questionnaire remain in `/studies/mobile-study.html` as a record of the earlier gap.

Still required on physical hardware: Apple Chrome/WebKit, audio interruption
recovery, browser bars/notches, comfortable thumb reach for children, thermal
and battery behavior, and a 15–30 minute session including repeated world visits.
No measured 60 fps or real-device pass is claimed by desktop emulation.
