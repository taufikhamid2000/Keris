# Keris: Malaysian history storyline (DRAFT, nothing built yet)

Status: discussion draft. No game code has changed. Every fact below must be checked against a named source before it goes into the game (list at the end).

## Premise

You are **Anak Arkib**, a young keeper at a forgotten archive. A heirloom keris leads you through the Kitab, and each chapter drops you into one era. You are always a fictional bystander. **Real people appear only as they are recorded**, and anything dramatised is labelled "Rekaan" (fiction) in the Kitab. The existing connected world becomes the **Lorong Masa** hub: each gate opens onto one era, and unlocked eras stay open to revisit.

Language: Malay by default, English in Settings (every line goes through one string table, so both languages ship together).

## Chapters

| # | Era | Real anchor | Play style | Replaces / reuses |
|---|---|---|---|---|
| 1 | Prasejarah | Perak Man, Lenggong (found 1991, roughly 11,000 years old, buried with care despite a disability); Tambun cave art | Explore, no enemies. Read the cave, find tools, learn how people lived | Gua Lanun cave geometry reused as a quiet cave |
| 2 | Melaka 1511 | Fall of Melaka to the Portuguese (Aug 1511) | Existing stealth missions, kept. Hang Tuah stays marked "legenda", not fact | Harbour, Kampung, Plans, Jungle, Ledang, Wayang, Penjara, Kota, Masjid |
| 3 | Jalan ke Merdeka | Baling talks (1955), London talks (1956), Reid Commission, Merdeka at Stadium Merdeka, 31 Aug 1957 | Gather documents and testimonies, choose what to ask, follow the day | New map, no combat |
| 4 | Malaysia 1963 | Cobbold Commission (1962), Malaysia Agreement (9 Jul 1963), formation 16 Sep 1963 | Travel Malaya, Sabah and Sarawak, listen to people's views, collect evidence | New map, no combat |
| 5 | 1969 | General election 10 May, 13 May riots, Rukunegara (1970) | Reading and reflection only. No playable violence | Kitab scenes, archive room |
| 6 | 2020 | Political change of Feb 2020 (the "Langkah Sheraton") | Short, neutral timeline of what is on the public record | Kitab scenes |

## Story thread

Each era the keris is hidden or passed on, and a diary page turns up in the Kitab. Ch.1: the cave, where people looked after one another. Ch.2: a keris smith's family caught in the fall. Ch.3 and 4: that family's grandchildren take part in the nation being built. Ch.5 and 6 close the loop in the archive room: the player decides what to preserve. The thread is fiction and is labelled so.

## Mechanics

- Stealth and takedowns stay **only** in chapter 2.
- Chapters 3 to 6 use new verbs: collect, ask, read, choose. Choices change which testimonies you hear, not the real outcome.
- Peta, Kitab and Hikayat stay. Hikayat entries become "Sumber" (source) cards that cite where the fact comes from.
- Chapter 1 and the modern chapters have no fail state, only discovery.

## Schools vs general

Build for general players with a school-safe tone: no gore, neutral wording, sourced facts. Schools later add a teacher mode (progress, quiz export) and a syllabus map (KSSM Sejarah topics per chapter). That is extra work, so keep it as a later phase.

## Sensitive points

- 1969: no violence on screen, no reconstructed deaths, no blame language. Use official records and published scholarship, with the sources shown.
- 2020 and any recent politics: facts and dates only, no judgement. Consider whether to include it at all.
- No invented quotes from real people.

## Facts to verify before writing (with the source to use)

- Perak Man: age, site (Gua Gunung Runtuh), find year, disability. Source: Lenggong Valley World Heritage listing, Jabatan Warisan Negara.
- 1511: exact dates and who commanded. Source: Sejarah Melayu plus Portuguese chronicles, noting where they disagree.
- 1955 to 1957: Baling talks, London talks, Reid Commission members and findings, Merdeka day events. Source: Arkib Negara Malaysia.
- 1962 to 1963: Cobbold findings, the Malaysia Agreement text, Singapore's exit in 1965. Source: Arkib Negara and the published agreement.
- 1969: election results and the National Operations Council. Source: official records, scholarly histories.
- 2020: dates of the resignation and appointments. Source: official announcements and major news archives.

## Decisions (from the owner)

1. Keep **all** Melaka missions in chapter 2.
2. Chapter 6 (2020) **is included**.
3. The heirloom-keris thread **stays**.
4. Sourcing pass is done by research agents (fact sheets in `docs/sources/`); a **human reviewer** must still read chapters 5 and 6 before any public or school release.

## Suggested build order

1. Chapter framework: string table (BM/EN), Lorong Masa hub, chapter progress in the save.
2. Chapter 2 re-framed with sourced Kitab text (cheap, uses what exists).
3. Chapter 1 (cave exploration).
4. Chapters 3 and 4 (new map and documents mechanic).
5. Chapters 5 and 6 (reading scenes) after the sourcing and review step.
