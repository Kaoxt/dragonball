# Majin Buu Saga — cards 51–100

50 completed cards, numbered 51 through 100, using the established v3 templates and the approved Majin Buu emblem. All 50 include finished artwork; there are no placeholders in this package.

Open `Gallery.html` for a local gallery, or view the contact sheets in `previews/`.

## Files

| Folder/file | Contents |
|---|---|
| `display/` | 50 lossless WebP display cards; portrait 1060×1484, landscape 1484×1060 |
| `downloads/` | 50 full-size lossless WebP cards; portrait 2120×2968, landscape 2968×2120 |
| `native/masters/` | 50 vector SVG masters with outlined type and relative asset links |
| `native/assets/` | Selected raster illustrations, textures, and retained template assets |
| `new-cards.json` | All 50 card records, modern rules, source links, and output paths |
| `card-checklist.csv` | Numbered handoff checklist |
| `originals/`, `ocr/` | Original scans and machine transcription for source comparison |
| `audit/` | Per-card bounds/export hashes and independent technical verification |
| `QA-summary.md` | Wording decisions, corrections, and image-resolution details |

## Site handoff

Use set ID `majin-buu-saga` and merge these 50 records by set and card number. Keep existing cards outside 51–100 intact. The card ID is the filename stem; paths in the metadata are relative to this package. Map display and download paths to the site's asset locations during import. There are 48 portrait cards and 2 landscape cards (#69 Location and #73 Battleground). #72 is Krillin, Z Warrior, level 2. This batch contains no Hi-Tech cards.

The images are finished regular card renders. This package has not been deployed to the live site.

## Rebuilding

Requires Python 3, Pillow, lxml, fontTools, NumPy, and Inkscape on PATH. Fonts and template dependencies are included.

```sh
python3 native/build_new_cards.py
python3 native/verify_batch.py
```

Pass a card number to rebuild only that card, for example `python3 native/build_new_cards.py 72`. Rebuilds create full-size PNG intermediates locally. PNG intermediates are omitted from this ZIP because the packaged lossless WebP downloads decode to identical pixels. The verification script renders directly from SVG if those PNGs are absent.

`native/assemble_batch.py` rebuilds metadata from source products and rules using the selected artwork already packaged in `native/assets/`. Generation histories are provenance; machine-local paths in those histories are not needed for rebuilding. Any substantive artwork or wording change should be visually reviewed again.
