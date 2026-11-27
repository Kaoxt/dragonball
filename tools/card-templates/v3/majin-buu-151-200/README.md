# Majin Buu Saga — cards 151–200

48 finished cards, plus 2 explicitly labeled review cards awaiting replacement artwork: **#160 Goku (Hi-Tech Level 2)** and **#175 Goten (Hi-Tech Level 2)**. The image generator rejected both the initial attempt and retry for those two. Their original scans, verified rules, stages, PUR, and native layouts are included; they are not publication eligible.

This batch continues after cards 101–150. It does not include the earlier pending cards 116, 117, 131, or 146. It has not been published to the site.

## Download packages

The handoff is split into three ZIP files. `Cards.zip` contains the display/lossless WebP exports and metadata. `Native-Source.zip` contains editable masters, source artwork, original scans and production scripts. `PNG.zip` contains matching PNG exports. Extract all three to the same folder for the complete reproducible project. The 48 finished cards can be imported using `Cards.zip` alone.

## Files

- `display/`: 48 finished 1060×1484 WebP cards.
- `downloads/`: 48 finished 2120×2968 lossless WebP cards.
- `png/`: matching 2120×2968 PNG cards.
- `review-only/`: two clearly marked unfinished cards; do not import these as finished cards.
- `native/masters/`: 50 editable native SVG masters, with outlined text and retained template components. Keep the complete native folder together so relative image links resolve.
- `new-cards.json`: verified card metadata, exact stages, modernized wording, source links, applied CRD corrections and original OCR.
- `card-checklist.csv`: export filenames and readiness for every number.
- `originals/`, `ocr/`, `Expanded-CRD.txt`: original source evidence and the supplied CRD. OCR is provenance, not authoritative transcription.
- `previews/`: five 10-card review sheets and a source comparison.
- `audit/`: per-card export hashes, layout checks, and batch validation.
- `generation-history/`, `artwork-prompts.json`: illustration prompts and revision history.

## Hi-Tech format

Uses the approved portrait adaptation, with original card numbers and verified values for each level. Original paired Hi-Tech cards are represented as separate portrait cards: 159/160, 164/165, 169/170, 174/175, 187/188, 192/193, 197/198, and 199/200. Cards 154, 155, 179 and 183 are single-level entries in this batch. Each card retains its own power, level and PUR.

## Native source and rebuild

Artwork is raster illustration within native vector templates. Export dimensions are not a claim that the source illustration was generated at that resolution. All rules, title glyphs, levels, stage values, footer symbols and number placement are native SVG components.

Requires Python 3, Pillow, lxml, fontTools, svgpathtools and Inkscape. Use the included fonts and scripts. From the extracted batch folder:

```bash
python3 native/assemble_batch.py
python3 native/build_new_cards.py
python3 native/verify_batch.py
python3 native/create_previews.py
```

Pass card numbers to `build_new_cards.py` to rebuild selected cards. `new-cards.json` is the authoritative input; assembly refreshes artwork and OCR status without replacing verified rules or placements.

## Publishing handoff

Import only records whose `release_status` is `ready`. Match set ID `majin-buu-saga` and each numeric card number. The display and download paths are enumerated in `card-checklist.csv`. Preserve the separate Hi-Tech levels and do not add the original gatefold scan as a playable card. Do not overwrite prior completed batches or their alternate Dende Dragon Ball artwork.
