# Keris: art direction (DRAFT, for the owner to approve)

Written 2026-11-28 from the owner's 2023 concept posters (three AI-generated images, not kept in the repo because they carry Ubisoft's logo) and the current game.

## In one line
**A busy port city at golden hour, seen through haze.** Low-poly shapes, painterly light.

## What we take from the posters
- **Light:** warm, low sun with long shadows. Dusk and golden hour, plus one hazy morning.
- **Depth:** atmospheric haze that turns distant things blue-grey and soft, giving three clear layers:
  - near: dark and detailed
  - middle: warm
  - far: pale silhouettes of mountains and masts
- **Sky:** big, dramatic clouds lit from below by the sun, taking up about a third of the frame in wide shots.
- **A busy harbour:** many hulls and sails at different distances, smoke, small fires and lamps along the jetties at dusk.
- **Stilt kampung over clear turquoise shallows,** with plank walkways, sampans, palms and a green hill behind (poster 2).
- **Silhouettes against the light:** masts, roofs and people dark against a bright sky.

## What we do not take
- **Anything from Assassin's Creed:** the logo, the emblem shapes and the title lettering.
- **Pagodas, Thai-style stupas and Chinese multi-tier towers as the local architecture.** Melaka was Malay (stilt houses, steep thatch or *atap* roofs, *bumbung panjang* ridges, carved panels and *tebar layar* gable boards). Chinese junks in the harbour are fine. Have a historian check the specific forms.
- **European galleons in Temasek (the 14th century).** In Melaka 1511, only the Portuguese fleet.
- **Photorealism.** We can't match it in a browser, and trying would look worse than a clean style.

## Palette
| Use | Colours |
|---|---|
| Sky at dusk | deep indigo, to coral, to pale gold at the horizon |
| Sun-lit surfaces | warm honey and terracotta |
| Shadows | cool violet-blue, never black |
| Water | teal in the shallows, slate-blue in the deep, gold where the sun reflects |
| Wood and thatch | warm browns and straw with lighter edges |
| Foliage | deep green in shadow, yellow-green where lit |
| Accents (use sparingly) | Melaka red (sails, cloth, flags) and lamp-fire orange |

The old screenshots are mostly one orange-brown. The fix is **contrast between warm light and cool shadow**, plus haze.

## Rendering targets (High quality; Low stays fast for phones)
1. **Sky:** a gradient dome, a sun disc with glow, and layered cloud cards lit by the sun.
2. **Fog:** height fog plus distance fog tinted toward the sky colour, so far things fade into the sky instead of into grey.
3. **Light:**
   - warm sun with soft shadows
   - cool sky-coloured ambient light
   - point lights on lamps and fires at dusk, with bloom on High
4. **Post-processing on High:** bloom, light ambient occlusion in corners and under roofs, gentle colour grading per map, a subtle vignette.
5. **Water:** colour by depth (shallow teal to deep slate), sun glints, and foam where it meets stilts and hulls.
6. **Materials:** flat-shaded low-poly stays, but each mesh gets subtle colour variation (vertex colour or palette texture). No large flat single-colour areas.
7. **Motion:** palms and sails sway, smoke and flags drift, birds over the harbour, ripples.

## Scenes to judge against
Each is a before and after screenshot from a fixed camera. You approve all four before Phase 2.
1. **Harbour at dusk:** jetty foreground, ships mid-ground, hills and sky behind (poster 1).
2. **Stilt kampung at midday:** walkways over turquoise water (poster 2).
3. **Overlook at sunrise:** the city and strait from high ground, haze layers (poster 3).
4. **Close gameplay view:** the hero with a guard in a lit street at night, to check that readability isn't hurt.

## Readability rules (gameplay wins over looks)
- **Guards, the hero and objectives stay readable** against every background, by brightness and outline, not by colour alone.
- **Mata Helang and its markers** keep working on top of the new grading.
- **Phones:** Low quality turns off post-processing and cloud layers but keeps the palette.

## Next concept art to make (ChatGPT or Gemini)
Ask for **"stylised low-poly game screenshot"**, not a poster, so the result matches what we can build. Use the same prompt for each, then pick:
- The four scenes above.
- **The heroine:** a young Malay woman, 1511, practical dark clothing for stealth, a keris at her waist, a *tengkolok* or head cloth. Front, side and back views.
- **A Portuguese soldier and a Melaka guard** in the same style, for contrast.
