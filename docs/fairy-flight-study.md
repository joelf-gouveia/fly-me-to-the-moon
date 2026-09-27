# Fairy flight: normal and boost pose study

Open `/fairy-flight-study.html` on the project's dev server. The interactive
artifact has three pose pairs, synchronized rear / three-quarter / side views,
adjustable body lean and camera elevation, silhouette and approximate gameplay
size checks, three background colors, pause, slow motion, and a JSON export of
the selected direction. Study controls only affect the preview. The game now
uses the selected **B — Sky Dancer**, sharing its rig with this artifact.

## Selected direction: B — Sky Dancer

The selected pose uses a 32° forward lean from upright in normal flight and
66° during boost. These are art direction values, not measurements from the
reference films or insect research. Hair, wing shape, and palette choices remain
available in the game's customizer.

| | Normal flight | Boost |
| --- | --- | --- |
| Body | Buoyant 32° lean | Stronger 66° lean into travel |
| Arms | Open away from torso | Hands reaching diagonally forward |
| Legs | Relaxed and staggered | Straighter, still slightly separated |
| Wings | Broad, soft strokes framing the back | Faster, narrower strokes; upper/lower lobes offset |
| Motion | Very small bob and sway | Less bob; purposeful posture |
| Effects | Restrained dust below/behind the body | Longer trail, without whitening the torso |

The two alternatives deliberately expose different tradeoffs:

- **A — Petal glide:** 18° / 52°, a more upright cruise and arms swept toward
  the hips in boost. The original readability-first recommendation.
- **C — Pixie dart:** 48° / 80°, compact limbs and a nearly horizontal boost.
  Strong speed impression; more foreshortening. Try the camera at 30–35°.

The original game model was built lengthwise along its travel axis. From directly
behind, the skirt, feet and torso overlapped. Its additive wings could also become
bright shapes that dominated the body. The shared game/study rig uses an articulated upright
body, a separated limb silhouette, and translucent wings with visible edges.
It retains the game's simple geometry, pink clothing and dark hair.

Flight heading is separate from visual body lean: changing the displayed pose
does not change where the player steers. The game blends into boost over
0.25 seconds and eases back over 0.4 seconds. Wing phase stays continuous while
its rate changes from 2.5 to 5.2 cycles per second. The artifact displays the two
endpoint loops side by side. Sky Dancer's hands can overlap the wings from a
directly rear camera; translucent membranes keep the body readable.

## Research and interpretation

Checked 25 September 2026. Fairies are fictional; these are visual conventions
and animation principles, not a biological specification. The interactive rig
is original procedural geometry. No film footage, character models or copied
reference artwork is included.

1. [Disney — Meet Vidia](https://video.disney.com/watch/meet-vidia-4d75c7f6a3be681318c01c5f)
   and [Disney Fairies](https://fairies.disney.com/movies) explicitly identify
   Vidia with fast flight. These are references for different fairy flight
   personalities, not evidence for the proposed pose angles.
2. [Disney Dreamlight Valley — Jungle Getaway patch notes](https://disneydreamlightvalley.com/news/update-oct-9-2024)
   describe wing gliders replacing a surfing animation with a fluttering one.
   This supports using wing motion as a recognizable fairy-flight cue. The study's
   relaxed cruise / committed boost distinction is our design interpretation.
3. [Lund University — Butterfly wing clap explains mystery of flight](https://www.biology.lu.se/node/246)
   describes flexible wings cupping during the upward stroke and producing thrust
   through a clap. This informs the idea of a lively, non-rigid stroke. The study
   only approximates that feel through hinge rotation and phase offset; it does
   not simulate wing deformation or insect aerodynamics. No biological wingbeat
   frequency is claimed for the animation.
4. [Animation Mentor — Building Appealing Character Poses](https://www.animationmentor.com/blog/tutorial-building-appealing-character-poses-for-animation/)
   presents Anthony Wong's advice about silhouette, negative space, line of
   action, and staging for the destination camera. The rear view, silhouette
   toggle and alternate cameras directly support evaluating those principles.

The interactive notes and this brief paraphrase the sources. All exact angles,
timing, wingbeat settings, and relative suitability ratings are proposals for
this game rather than source findings.

## Making a choice

1. Start from the rear view and choose A, B or C.
2. Toggle silhouette and gameplay size. Confirm that you can still distinguish
   the head, torso and separated feet in both states.
3. Switch to the side view to judge the forward lean.
4. Try the sky and forest backdrops to judge contrast.
5. Save the direction as JSON, or report the letter and your preferred angles.

The exported JSON records the pose pair, camera settings and wingbeat rates.
It is a review artifact; exporting does not override the game's selected Sky Dancer pose.
