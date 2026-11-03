# Cell Saga 051–100 — V3

Fifty native V3 cards retain the approved illustrations, current CRD effects, three-star Uncommon rarity and the Cell emblem. Black Dodge #51 is Physical Combat and Ally Rescue #83 is Setup, corrected against their printed categories. The effect of Black Dodge still stops an energy attack. Blue Flip #65, Trunks Prepares #77 and Speaking with the King Drill #100 retain their CRD title/timing corrections; #52's Energy Combat prohibition retains the documented secondary-effect ruling.

The eleven Personalities preserve the independently transcribed Level, PUR and power stages. Android 19 #90/#95/#98 have thirteen printed rows including zero. Their boxes use the same column footprint, with a 42-unit outlined stage font for the thirteen-row layout; eleven-row cards retain size 49. All digit bodies are centered independently of comma tails and share the right ink edge x1031. Hero bars use the approved reference blue, and Villain bars use dark crimson with red rules-box corners.

Dende Dragon Balls #73–75 retain the approved summoning illustration at identity mapping and unchanged colors. Their left orbs have three, four and five stars respectively. The four-star arrangement is staggered; five stars follow the original pentagonal arrangement. The prior artwork corrections on #67 and #98 remain in the retained image bytes. No new illustration edits were required.

`source-observations.json` records the actual scan/art comparisons. `artwork-review.json` ties visual review to the exact final exports, with fine-detail limitations stated per card. Small or obscured source details are unresolved, not expression-fidelity passes. The native files are in `../../card-templates/v3/cell-051-100/`; all raster dependencies are portable, content-addressed files in the shared assets directory.

`retained-art-verification.json` checks the illustration bytes and original image mapping. `personality-values.json` records original values and digit geometry. `crd-review.json` keeps printed text, corrected effect and modern wording separately. `render-verification.json` records an independent native render matching both published lossless exports, every visible rule line and title clearance. The builder also verifies native fixed labels, icon alignment, mirrored footer centers and footer-helper idempotence.

Rebuild with `build_cell_051_100.py --first <Cell-Saga-011-060> --next-batch <Cell-Saga-061-110>`, then run `verify_cell_051_100_sources.py` with the same inputs and `verify_cell_051_100.py`. The exact input archives are identified in `source-provenance.json`.

The migration is limited to Cell 51–100. Cards 1–50 keep their previous V3 sources, and cards after 100 keep their existing versions.

Validation: all 186 tests across the 21 applicable site and Cell batch test files passed, as did all six card-type terminology tests and `npm run check`. The complete historical `npm test` suite was attempted but older source/audit/assets excluded by this sparse checkout were unavailable; no historical checks were weakened. The original CRD text is retained byte-for-byte, including its original CRLF line endings.
