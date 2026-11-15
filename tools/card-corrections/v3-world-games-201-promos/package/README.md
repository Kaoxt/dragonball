# World Games Saga — promos, previews and Videl #201

This release adds 18 completed cards: Videl #201 Hi-Tech, promos P1–P10, and seven Babidi Saga previews originally distributed with World Games. Preview numbers are stored as PR1–PR7 to avoid colliding with P1–P7. Original printed numbers are retained in `sourceNumber`; preview provenance is retained in `subset`. All cards use the World Games set emblem for this site's set grouping.

Each card includes the complete native V3 template and illustration, a display lossless WebP, a full-resolution lossless WebP, the reference scan, reviewed game data, hashes and geometry evidence. These are finished cards, not artwork-only files. Portrait outputs are 1060×1484 and 2120×2968; Celestial Battleground uses 1484×1060 and 2968×2120.

## Import into the current repository

From an extracted copy of this package:

```sh
python3 verify_final.py
python3 apply_to_repo.py /path/to/dragonball
python3 apply_to_repo.py /path/to/dragonball --apply
```

The importer preflights hashes and collisions before writing. It appends catalog rows and permanent deck IDs without changing their prior order, adds four personality power charts, and copies only this release's payload. A differing existing card, file or chart stops the import. It preserves the current module code around the data arrays. It does not commit, push or deploy.

## Rules and unusual details

The included original scans and supplied Expanded CRD were checked before modernization. Quick Recovery Drill uses the **opponent's** discard pile. Saiyan Crush counts both Setup and Drill cards. Face Off's original standalone Combat category becomes Event. Supreme Kai's Power Hold has the default energy cost of 2 stages and 4 life cards of damage, established in the supplied CRD.

Supreme Kai PR6 has **eleven Z stages and then zero**. The explicit chart addition preserves `Z` as a string, so Arena shows Z and permits 11 stages above zero. The existing numeric-only fallback is not used for this card. The current Arena readout accepts a string from its explicit chart table. Under the CRD, a Physical Attack Table comparison involving a Z rating produces 2; apply that rule during play. This package does not add automatic resolution of card effects or attack damage.

Regular exports contain no baked foil. Videl uses the shared Hi-Tech viewer finish through `rarity: "Hi-Tech"`; her native title, brush contour, footer-width clips and LEVEL label were compared with the current corrected Hi-Tech header. They match. Keep the site's latest title-mask fix when publishing.

## Validation and publication

All 18 cards were visually reviewed against their source scans for pose, expression, clothing and composition. Native rules, stages, star counts, title and footer alignment were checked. All 36 WebPs match their intended decoded pixels, and each full-resolution WebP matches its PNG render. The package import was exercised on an isolated copy of current catalog, deck-ID and chart modules, then rerun to verify idempotence. Existing rows and deck positions were preserved.

Before deployment, run the repository's current required checks, including `python3 tools/card-effects/hi-tech-title-mask.py --check` and the focused card-surface/Hi-Tech tests documented in `docs/hi-tech-title-foil-mask.md`. Check all new card routes and both image resolutions after deployment. This release is **prepared for Codex; it has not been published**.

## Editable sources and reproduction

`files/tools/card-templates/v3/world-games-201-promos/` contains the final SVGs. Their image dependencies are in the sibling `assets/` directory. Text, geometry, stage boxes and icons remain native SVG paths.

For a standalone rebuild, copy `files/` into a fresh directory, then overlay `build-context/` into the same directory. Run `python3 tools/card-templates/v3/build_world_games_completion.py 201 P1 P2 P3 P4 P5 P6 P7 P8 P9 P10 PR1 PR2 PR3 PR4 PR5 PR6 PR7` there. Dependencies are Inkscape, Pillow, lxml and fontTools. The fonts and production helpers are included. Do not run the historical donor builders; only `build_world_games_completion.py` is this release's entrypoint.
