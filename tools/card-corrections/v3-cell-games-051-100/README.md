# Cell Games Saga 51–100 — partial release

45 cards are prepared in the approved V3 native layout. Cards 70, 72, 73, 81 and 83 remain held for artwork: two image requests for each were blocked by the generator, and the original scans contain overlapping frame elements. No replacement or placeholder for these five is included in the catalog. All 50 source transcriptions, current CRD decisions and modern rules are retained for continuation.

The two Cell Jr. personalities retain Level 1, PUR 2 and all eleven printed power stages. Locations 79 and 100 use the landscape V3 master. Rarity remains three stars through 92 and five stars from 93. Card 63 uses a 730-unit title width after an independent raster check found clipping at a brush notch; other type geometry and native 49-unit rules text are unchanged. Card 52's two-arm/two-leg side kick and card 56's removal of an invented distant figure were reviewed before export.

`source-provenance.json` identifies the 50 original scans. `supplemental-sources.json` records larger/alternate scans examined. `crd-review.json` retains source and corrected mechanics; `card-type-review.json` documents legacy category migration, including broad Non-combat scope on 97. `generation-prompts/` preserves exact requests and blocked-card status. `artwork-review.json` records individual observations and explicit original-scan limits. `audit.json`, `per-card/`, and `render-verification.json` pin native SVGs, shared assets, both lossless exports and measured geometry.

Build available cards: `python tools/card-templates/v3/build_cell_games_051_100.py`. Verify exports: `python tools/card-templates/v3/verify_cell_games_051_100.py`. Tests: `node --test tests/card-v3-cell-games-051-100.test.js`, followed by `npm test` and `npm run check`.

Publication uses the existing main → verified production package → cloudflare-production workflow. Card assets upload to the existing private R2 bucket before Worker deployment. Do not deploy the full source branch directly or delete migration receipts.

Local validation passed: 277 Node tests, 6 Python tests, Wrangler dry run, 45 terminology checks, and independent native-pixel verification of all 90 exports. The original Expanded CRD text retains its supplied bytes and line endings.
