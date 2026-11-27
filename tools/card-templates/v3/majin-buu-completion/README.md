# Majin Buu Saga — remaining-card handoff

This combined package contains **15 ready cards: 14 newly completed cards plus the latest approved #131**. It does not complete the whole set. Three cards still need replacement artwork: **#32, #116 and #160**. This package has not been published to the website.

Ready: #117, #131, #146, #175, #201, and promos P1–P10.

Included together:

- `display/`: 15 lossless WebP card previews, 1060 × 1484.
- `downloads/`: 15 lossless WebP downloads, 2120 × 2968.
- `png/`: 15 PNG exports, 2120 × 2968, pixel-identical to their download WebPs.
- `native/masters/`: outlined SVG card masters with native type, numbers, symbols, rules and borders.
- `native/assets/`, `native/fonts/`, scripts and donor templates: supporting artwork and reproducible source.
- `ready-cards.json`: the only publication allowlist, with card text, numbers, source references and export paths.
- `pending-cards.json`: #32, #116 and #160, with the source references and failure status. No replacement card images are supplied for these three.
- `originals/`, `ocr/`, `Expanded-CRD.txt`, `audit/` and `verification.json`: source and validation records.
- `previews/`: contact sheet and source comparisons.
- `CODEX-HANDOFF.md`: publication instructions.

The image service rejected both attempts for each remaining artwork gap during this pass. These cards were not substituted with other artwork or marked ready.

## Retained choices

#131 keeps the user's selected closed-smile illustration and the latest lighter silver-gray Freestyle background. Its retained SVG is identical to the approved source, and both export sizes match the approved pixels.

#175 uses the approved portrait Hi-Tech format. #201 uses the approved full-art Earth/Shenron master and a three-star left orb. It is not an alternate Dende Dragon Ball.

P4 includes the CRD restriction against a Red Tokui-Waza. P2 retains its printed Energy Combat category and its printed physical attack effect; the mismatch is present on the original and was not silently changed. P6's default energy cost is explicitly 2 stages, per the supplied CRD.

## Rebuild

Use Python 3 with the packages in `native/requirements.txt` and Inkscape on PATH:

```bash
python native/build_new_cards.py
python native/verify_completion.py
```

To rebuild selected ready cards, append their card numbers, for example `python native/build_new_cards.py P7 201`. The builder skips unfinished records and preserves #131's approved SVG. The verifier checks text, title and card numbers, at most five rules rows, effect icon count, rarity, stage values, local image dependencies, dimensions, checksums and lossless PNG/WebP equality.
