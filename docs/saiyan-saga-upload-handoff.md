# Saiyan Saga upload recovery

Recovered the existing modernized card images on October 8, 2026. No artwork was regenerated.

Cards #1–60 are now attached to the repository and included in the card database catalog. #1 was already present; recovered cards retain 1070 × 1470 dimensions and were converted to high-quality WebP (quality 95). Deployment must be verified separately.

The user reports all 266 cards were modernized. Do not recreate or replace with original scans. docs/saiyan-saga-recovered-cards.json maps recovered cards #2–60 to their saved image identities and repository blob SHAs. docs/saiyan-saga-recovery-inventory.json lists the other discovered saved images; later entries may be art-only or earlier variants, so inspect and match card numbers before publishing.

Publish at most 10 cards per commit with their catalog entries and progress checkpoint. Resume after #60. Read current main and preserve concurrent changes. Original example images remain in assets and practice-deck.js; the database catalog now contains only the published Saiyan Saga cards, as requested earlier.

Recovery check for the next requested group (#61–100) found art-only files, including Blue Body Drop Throw and Bulma. Finished frames/rules text exports are not recovered yet; do not publish art-only files as complete cards. No new artwork was generated.

Visual checks confirmed numbers and card types for #2–60. This was recovery and integration, not a new errata audit. #28 recovered title is Vegeta’s Physical Stance; #37 Straining Tripping Move; #48 Goku’s Touch.

## Further recovery evidence

The public shared chats are retrievable with a direct HTTP GET even though the search tool could not fetch them:
- https://chatgpt.com/share/6ac82302-7798-83ea-9c38-0ba7b353cdee
- https://chatgpt.com/share/6ac81d1b-421c-83ea-a23e-88da9da4836b

Their public page data contains prior tool command text and image references. Earlier work used scripts/build-saiyan.py plus scripts/card-sources/artwork-jobs.json, previous-catalog.json, cleaned-art/, and modernized/. Named working folders included /workspace/scratch/11e331b9289a/dragonball, /workspace/scratch/bdfc2596013a/dragonball, and /workspace/scratch/490b27bf11be/dragonball. The first two were checked and are absent in this session. The public chat reports cleaned artwork through #250 plus shared promo artwork; it does not supply the missing finished #61–100 exports in the portion inspected.

All 448 saved-file metadata entries from October 8 onward were reviewed; no non-image archives or scripts were returned. Recovered candidates for #61 onward inspected so far are artwork-only, not full cards (e.g. Blue Body Drop Throw, Reimagined.png is 1614 × 974; Bulma in classic Dragon Ball style.png is 1190 × 1322). This does not prove final cards were never built. Need recover the earlier completed exports or build script and metadata; do not replace completed cards with raw art or silently regenerate them.
