# Majin Buu Saga — cards 101–150

46 finished cards and 4 artwork-pending review cards, using the approved V3 templates and Majin Buu emblem. This is the next batch after cards 51–100. No cards have been published by this package.

Open `Gallery.html` for the local gallery. The five ten-card sheets in `previews/` show the whole numbered batch.

## Ready to import

Import only the 46 records in `ready-cards.json`. The main `display/` and `downloads/` folders contain only these finished cards. Merge by set ID `majin-buu-saga` and card number; preserve all existing cards outside this batch. Map the relative paths in metadata to the site's image locations.

These are regular card renders. This batch has no Hi-Tech cards. #150 is Ultra Rare and has its six-star rarity symbol; the image does not have a baked-in foil overlay.

| Files | Contents |
|---|---|
| `display/` | 46 lossless WebP display cards; portrait 1060×1484, landscape 1484×1060 |
| `downloads/` | 46 full-size lossless WebP cards; portrait 2120×2968, landscape 2968×2120 |
| `native/masters/` | All 50 outlined SVG layouts with relative asset links; four are marked review-only |
| `native/assets/` | Selected illustrations, retained textures and native category components |
| `new-cards.json` | All 50 records, wording, source URLs, dimensions and explicit readiness |
| `ready-cards.json` | The 46 finished records for import |
| `review-only/` | Four labeled source-art placeholders, their metadata and both export sizes |
| `originals/`, `ocr/` | Original source scans and machine OCR for comparison |
| `audit/` | Per-card geometry, export hashes and technical verification |
| `QA-summary.md` | Wording decisions and production notes |

## Still needs artwork

| Number | Card |
|---|---|
| 116 | Goku, Super Saiyan Ascended — Level 4 |
| 117 | Kid Trunks — Level 4 |
| 131 | Freestyle Mastery |
| 146 | Saiyan Style Mastery |

The image generator rejected both attempts for these four illustrations. Their native layouts and rules are prepared, but the source-art review images must not be treated as finished cards. Original references are included. No replacement illustration has been silently substituted.

## Rebuilding

Requires Python 3, Pillow, lxml, fontTools, NumPy, and Inkscape on PATH. Required fonts and template dependencies are included.

```sh
python3 native/build_new_cards.py
python3 native/verify_batch.py
```

Pass a number to rebuild one card, for example `python3 native/build_new_cards.py 125`. The builder creates full-size PNG intermediates locally. They are omitted from the ZIP because the lossless WebP downloads decode to identical pixels; the verifier can render directly from SVG when the intermediates are absent.

Keep all relative folders together. The selected artwork files are final inputs; generation histories are provenance, not rebuild dependencies. Review any substantive wording or artwork change again. The four blocked cards need selected replacement artwork and an explicit readiness change before they can enter the release folders.
