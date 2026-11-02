# Trunks Saga 156–200 and P1–P5 V3 release

This batch migrates exactly 50 cards: 43 Personalities (ten Hi-Tech), one Setup, three Combat cards, one Event and two Drills. Internal sequence 201–205 maps to printed promos P1–P5. The catalog total becomes 598 V3 cards, including 205 Trunks Saga cards.

`cards.json` retains source archive paths, original printed data, approved correction sources, modern wording and native line breaks. `originals/` contains identity-checked original scans; `current-Expanded-CRD.txt` is the unchanged attached CRD. `rules-review.json` records each rule conversion, including Goku #164/#165 Attack Phase timing, #166's separate constant restriction, #185's first-attack condition, and promo restrictions. Krillin #156 has six-star Ultra Rare rarity. All 43 Personality LEVEL/PUR/stage sets were checked, with #192 retaining the previously approved 1,200,000/1,100,000 top-stage correction.

The native masters preserve fixed outlined text, shared brush geometry, red Villain rules corners, Hi-Tech middle-bar isolation and mirrored footer centers. #159 includes its separately retained hand/wrist/cuff layer, #166 retains approved close framing, and #195 retains the white-armor/blue-sleeve costume patch. Content-addressed assets make the final SVGs portable; original archive paths are provenance inputs rather than dependencies of the finished masters.

Fourteen cards have masked illustration repairs: eyes/expression on #156/#165/#200, distant onlookers on #172, foreground/costume on Hi-Tech #191/#196/#197/#199, and sky/cloud groups on #185/#186/#189/P2/P3/P4. The P3/P4 sky masks protect the foreground through their silhouette and extend through the distant sky/horizon transition. Generated illustration inputs and exact sky masks are retained in `artwork-corrections/`. Small original scans cannot establish every distant face, foil detail or fine costume line; the individual limitations remain in `artwork-review.json`. Approved full-art Hi-Tech background portraits remain intact.

Verification:

- `audit.json` and `per-card/`: native sources, portable asset hashes, measured geometry, title/footer idempotence and both export hashes.
- `render-verification.json`: all 50 titles remain within their brush and all 100 lossless WebP exports decode to the intended render. Display images are 1060×1484; downloads are 2120×2968.
- `retained-art-baseline-check.json`: 40 standard illustrations match retained published interior art within two channel levels before the explicitly documented repairs. Ten Hi-Tech compositions have separate source/composition review.
- `artwork-repair-verification.json`: both resolutions of all 14 repaired cards change zero pixels outside their native masks and a three-pixel separable LANCZOS antialias footprint. #185's display has four one-level channel differences at the outer antialias boundary.
- `artwork-review.json`: individual original/final observations and reviewed display/download hashes.
- `title-clearance-preflight.json`: per-title maximum-width and brush clearance measurements before final export.

Reproduction uses `build_trunks_156_200_p1_p5.py`, `verify_trunks_156_200_p1_p5.py`, and `verify_trunks_156_200_repairs.py` under `tools/card-templates/v3/`. The builder requires the retained source archives recorded in `cards.json`; finished masters need only their committed asset references. Regression coverage is in `tests/card-v3-trunks-156-200-p1-p5.test.js` and the full repository test suite. Historical release evidence remains unchanged.
