# Cell Games Saga #101–125 — Codex publishing handoff

This package completes the 25 remaining numbered main-set cards after #1–100. It contains finished V3 cards, new illustrations based on the printed cards, reviewed rules, native SVG sources and 50 lossless WebP exports. The two Ultra Rares are #124 Trunks, the Battler and #125 Piccolo, the Defender. No live deployment has been performed by this handoff.

## Import

Work from the current `Kaoxt/dragonball` repository and read its current AGENTS.md. Do not replace the repository with this package.

```bash
python3 /path/to/Cell-Games-101-125-Codex-Handoff/apply_to_repo.py /path/to/dragonball
python3 /path/to/Cell-Games-101-125-Codex-Handoff/apply_to_repo.py /path/to/dragonball --apply
```

The first command preflights all file checksums and collisions. The second imports only the new release files, appends catalog rows and appends permanent deck IDs without reordering existing IDs. A differing existing card or file stops the import. Existing cards #1–100, other sets, shared viewer code and historical audits are untouched.

`catalog-additions.json` contains current cache-busted image paths. Personality metadata includes printed top-to-bottom `powerStages` and ascending `powerLevels` beginning with zero, which the current Arena `powerChart()` fallback accepts. `power-chart-additions.json` is supplied for explicit chart-table integration if preferred. Do not reverse the printed card columns: zero belongs at the bottom.

## Contents

- `files/public/assets/cards/`: 25 display images, portrait 1060×1484; #117 landscape 1484×1060.
- `files/public/assets/cards/downloads/`: 25 lossless double-size downloads, 2120×2968 or 2968×2120.
- `files/tools/card-templates/v3/cell-games-101-125/`: 25 editable SVG cards, with native vector text and linked artwork under `../assets/`.
- `files/tools/card-corrections/v3-cell-games-101-125/`: source scans, reviewed card data, per-card production audits, independent render verification and source/CRD notes.
- `build-context/`: the retained donor cards, fonts and helper versions used for this build. Reference/reproduction only. Never overwrite newer shared repository files with this snapshot.
- `Cell-Games-101-125-Preview.jpg`: overview of all 25 finished cards.

The illustration PNGs are stored once as content-addressed native assets. Each `cards.json` entry identifies its `artwork_asset`; the new builder reads that path. No original printed scan is used as the final artwork.

## Validation and publishing

All 25 final layouts were visually reviewed. All 50 exports were compared pixel-for-pixel with independent Inkscape renders, including the separately downsampled display images. SVG ID uniqueness, linked assets, current title alignment, style-symbol weight, Level placement and power stages were checked. The supplied source review records scan limitations and CRD interpretation.

Before publishing, integrate the new batch into current repository tests and the historical-audit membership helpers without rewriting earlier evidence. Run the repository's required test/check/deployment steps. The full application test suite was not run in this isolated asset workspace. Use the current repository's card-asset/R2 deployment flow and verify all 25 routes, previews and downloads on the deployed site; confirm the numbered Cell Games set is 1–125 without gaps.

The original regular rasters contain no simulated foil. Rarity metadata selects the existing live Ultra Rare effect for #124/#125. The current V3 rules-only fallback mask is used; no custom character silhouettes are claimed. Keep the Regular/Foil switch and the existing shared finish unchanged.

Key gameplay details: #101 uses Dragon Ball ownership, #108 uses its CRD replacement text, #111 has Limit 2 and the forbidden card-type names, #113's +4 lasts for Combat, #120 has Limit 1 and banishment, #121 has Limit 0, and #123 requires 4 anger before use. #114 is damage redirection to another Ally; #125 grants +5 stages.

To recheck the supplied sources and exports with Inkscape, Pillow, lxml and fontTools installed:

```bash
python3 /path/to/Cell-Games-101-125-Codex-Handoff/verify_final.py --repo /path/to/dragonball
```

Importing this package does not authorize unrelated artwork, rules, symbol, interface or deployment changes.
