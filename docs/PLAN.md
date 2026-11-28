# Keris: plan

Written 2026-11-28. Builds on `docs/STORYLINE-DRAFT.md`, which still holds the eras, sourcing rules and sensitive points.

## Vision (from the owner's answers)

- **Direction:** the six-era storyline from the draft, with real freedom inside each era. The main missions stay in order. Between them, the player roams one large map per era with side content.
- **Melaka arc:** chapter 2 has three parts (2A Temasek, 2B the rise, 2C the fall of 1511). One keris passes from teacher to student. The 1511 hero is a new heir, a young woman; Hang Tuah is a legend. The enemy is a fictional faction. Details are in the draft.
- **The feeling:** all four at once. *I'm a pendekar* (stealth and silat in Melaka), *I learned something real* (sourced history), *I want to explore* (every corner hides something), *I care about these people* (villagers with names and problems).
- **Audience:** general players and schools. The tone stays school-safe, as the draft says.
- **Side content:** all four kinds:
  - helping villagers
  - artefact hunting
  - patrol bounties
  - random events
- **Buildings:** you can enter them to hide, to meet people and hear story, and to find loot and artefacts.
- **Hard rule:** no invented history. Fiction is always labelled *Rekaan*, and every artefact and fact card cites a source in `docs/sources/`.
- **Order:** a short story rewrite, then art style, the 1511 story, the big map and content. Temasek and the rise follow, then the other eras.

## How the work is split between models

| Kind of work | Model | Why |
|---|---|---|
| Systems: renderer, streaming, interiors, the side-content framework | Strong model (Opus) | Needs a lot of engine context and judgement |
| Content: one side job, one event, one interior layout, one artefact card, BM/EN text | Haiku | Only needs the schema, one finished example and the validator, about 2–5K tokens |
| Facts behind artefacts and cards | Research agents, then you | They need sources, and you or a reviewer checks them |

Every system ships with a **data schema, one finished example and a validator test** before any content is mass-produced. When Haiku makes a mistake, the test catches it, not a player.

## Phases

### 0. Story rewrite (documents only)
- [x] **Melaka arc in the storyline draft:** three parts, leads, working names and rules.
- [x] **Names approved:** *Waris Keris* and *Pakatan Bayang*.
- [ ] **Name the 1511 heir** (a young woman).
- [ ] **Source sheets** for Temasek, the founding and the 1420s (research agents, then you).

### 1. Art style
The goal is a strong, recognisable low-poly look, not realism. The browser and phones set the limit.
- [ ] **Art direction sheet (`docs/ART.md`):** palette per era and time of day, materials, what "Keris looks like". You approve it with reference images before any code is written.
- [ ] **Lighting and sky:**
  - gradient sky dome and sun or moon
  - height fog and colour grading per map
  - better shadow softness on the High setting
- [ ] **Post-processing on High only:**
  - outline or edge pass
  - ambient occlusion
  - bloom on lamps and fires
  - Low quality stays as it is today, for phones
- [ ] **Materials:** one shared palette texture and vertex-colour variation instead of flat colours, plus subtle wind on trees, grass and cloth.
- [ ] **Houses and props:**
  - richer procedural Malay houses: tiered roofs, carved panels, stairs and stilts, a lived-in clutter set
  - market stalls, boats and harbour props
- [ ] **Characters:** varied villager outfits and colours, so crowds don't look cloned.
- [ ] **Performance budget per quality tier**, checked on a mid-range Android phone: draw calls, triangles and frame time.
- **Review:** before and after screenshots of each map. You sign off before Phase 2.

### 2. Fall of Melaka (2C) story
- [ ] **New hero:** the heir replaces Hang Tuah in mission text, barks, title and credits (BM and EN).
- [ ] **Her character model, outfit and animations** replace the current hero's.
- [ ] **The keris and the Pakatan** woven into the existing missions, labelled *Rekaan*.
- [ ] **Hang Tuah as legend:** people mention the stories; a Kitab card marks them *legenda*.
- [ ] **Check against the fact sheet** (`docs/sources/ch2-melaka-1511.md`), including its "Do NOT claim" list.

### 3. One big map per era (the biggest technical risk)
- [ ] **World streaming:** the map is split into chunks that load and unload around the player, with LOD and instancing for trees and houses.
- [ ] **Merge the Melaka 1511 maps into one open map:** harbour, kampung, plans, jungle, Ledang, kota and masjid.
  - Missions become zones within the map.
  - Existing gates become roads.
  - Wayang and Penjara stay as their own scenes.
- [ ] **Navigation per chunk:** guards and villagers path across chunk edges.
- [ ] **Save:** world position, the state of each zone, and what you have discovered.
- [ ] **Map, fog of war and Peta** work on the large map.
- [ ] **Phone fallback:** a shorter draw distance and fewer active NPCs on Low.
- **Risk:** if phones can't hold 30 fps, fall back to "current maps, made denser" for Low quality.

### 4. Interiors
- [ ] **Enter and exit:** doors are seamless where possible, and bigger buildings load a separate interior scene.
- [ ] **Stealth inside:**
  - back rooms, windows to slip out of, hiding spots
  - guards follow you in, and doors block sight
- [ ] **People:** NPCs at home, conversations you can overhear, mission scenes.
- [ ] **Loot:** chests and shelves hold tools, tangkal and artefacts.
- [ ] **Interior generator:** a layout comes from a house size and a type (home, shop, surau, warehouse), plus optional hand-placed details. Ships with a schema, an example and a validator.

### 5. Side-content framework
All side content is data, not code.
- [ ] **Activity schema:**
  - `villagerJob`, `bounty` or `artefactHunt`
  - giver, location, steps, reward
  - Rekaan or sourced label, BM and EN text
- [ ] **Random-event system:** a spawner with conditions (zone, time of day, alert level, story progress), cooldowns and one-off events.
  - Events: a thief running past, a guard harassing a trader, a fire, a lost child.
- [ ] **Journal:** active and completed side content in the Kitab. Artefacts become *Sumber* cards that cite their source.
- [ ] **Map markers and discovery:** some content is marked, and some is found only by exploring.
- [ ] **Validator tests:**
  - every key exists in both languages
  - every location is reachable on the navigation graph
  - every artefact has a source file
  - nothing is labelled as fact without a source

### 6. Fill Melaka 1511 with content (Haiku, with your review)
The numbers are targets, adjusted after the first batch.
- [ ] **Research agents** write fact sheets for about 15 real 1511-era artefacts and practices into `docs/sources/`.
- [ ] **Haiku writes a first batch:**
  - 10 villager jobs
  - 6 bounties
  - 15 artefact hunts
  - 12 random events
  - interior detail sets
- [ ] **You review that first batch for quality.** A good five beats a filler twenty: cut, rewrite, then generate the rest.
- [ ] **Named villagers:** people you meet again across jobs, so the player cares about them.

### 7. Temasek and the rise of Melaka
- [ ] **2A Temasek:** one map and missions, using the same systems.
- [ ] **2B Rise of Melaka:** one map and missions, using the same systems.

### 8. The other eras
Following the draft, each era gets one map built with the same systems.
- [ ] **Chapter 1:** Prasejarah (Lenggong).
- [ ] **Chapter 3:** Jalan ke Merdeka.
- [ ] **Chapter 4:** Malaysia 1963.
- [ ] **Chapters 5 and 6:** Kitab and archive scenes only. Per the draft, a human reviewer reads these before any public or school release.
- [ ] **Side content per era** uses that era's verbs (collect, ask, read, choose) instead of bounties.

### 9. Schools (later)
- [ ] **Teacher mode:** progress and quiz export.
- [ ] **KSSM Sejarah syllabus map** for each chapter.

## Open questions (answer when we get there)
1. **Civilians:** can the player harm villagers in Melaka, or are civilians untouchable? "School-safe" suggests untouchable.
2. **Blood:** none at all, or stylised hit flashes only?
3. **Monetisation:** you didn't rule out paid extras. Revisit this after the game is fun.

## What this plan doesn't promise
GTA-level graphics. That needs thousands of artists and a custom engine. Keris aims for a distinctive art style that runs in a browser and on phones.
