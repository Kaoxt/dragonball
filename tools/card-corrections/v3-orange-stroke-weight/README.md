# Orange Tokui Waza stroke correction

Prepared from the approved handoff and integrated with the published Blue and Black corrections.

All 82 Orange cards at base commit `d25f83ad53345def2f7722c5945f452cc994d4e0` are covered: Saiyan 18, Frieza 8, Trunks 11, Android 13, Cell 18, Cell Games 10 and World Games 4. Both Masteries retain their existing enlargement. No affected card has a pinned custom Ultra Rare foil mask.

Only the `orange-style-symbol` colored stroke changes, from `7.6923` to `6.92307`, a 10% reduction. At standard scale `1.05 × 1.3502719759360762`, nominal orange ink weight changes from 10.9060 to 9.8154 native pixels. This matches the established approximately 9.8-pixel typical Red weight; Red has tapered strokes, not a uniform stroke thickness. Preserve the original 橙 paths, `#f29216`, rounded caps and joins, dark outline, transforms, total size, position and smoky backing.

The 79 available complete native cards each change by one reversible attribute edit. Cell Games #70, #72 and #73 still lack their complete native sources from the earlier release. Their existing exports are patched using the identical retained Orange symbol, with exact baseline matching at every affected pixel in each export size. The old/new shared-symbol delta is independently proven fully opaque, with unchanged alpha and identical colors to the full native donor render, so no donor artwork or background is copied. `symbol-reference-before.svg` and `symbol-reference-after.svg` are isolated symbol references only, never reconstructed full card masters. Preserve this explicit provenance distinction.

Every display/download export is patched independently and remains lossless. All pixels outside the native symbol delta and its resampling footprint remain identical, including art, text, borders, layout, rarity and footer. `release.json` records hashes, reversible native edits, pixel bounds, exact native baseline comparisons and cache revisions. `independent-verification.json` records a separate comparison of all exports. Catalog membership, order, game data and all non-Orange rows are unchanged.

Future Orange cards must reuse corrected Saiyan #49, the donor selected by current production builders. `scripts/orange_symbol_weight.py` is idempotent and can normalize a separately retained older Orange donor. Do not compound the reduction or resize the symbol. The generic Combat master uses a different style and is not an Orange source.

Historical audits stay immutable. `tests/helpers/orange-stroke-history.js` is placed ahead of the Blue/Black/Freestyle/Namekian/Saiyan revision chain. The Python card-type-reference audit also recognizes Orange and the published Blue revision without changing its original wording-review evidence.

Validation:

```sh
node --test tests/card-orange-stroke-weight.test.js
python3 tools/test_card_type_references.py
python3 tools/card-templates/v3/patch_orange_symbol_weight.py /path/to/orange-work
```

With `release.json` present, the last command verifies the prepared release without rewriting images. The handoff was reconstructed against its recorded base with before/payload/after checksums, then merged into the current source. Independent publication checks confirm all 164 image-pair hashes, exact changed-pixel counts and bounds, unchanged alpha, 79 reversible single-attribute SVG edits, and unchanged catalog game data. All published Blue and Black sources, exports and cache revisions remain exact. The original three missing full SVG sources remain explicitly recorded. Full repository CI and live publication verification are required before claiming a successful deployment.

Integration validation: full `npm test` passed all 341 Node tests and 6 Python tests; `npm audit --audit-level=high` reported 0 vulnerabilities; `npm run check` passed including the Wrangler deployment dry run. The repeat Orange verifier passed for all 82 cards and 164 exports without rewriting them.
