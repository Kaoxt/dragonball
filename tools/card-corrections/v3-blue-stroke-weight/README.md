# Blue Tokui Waza stroke correction

Prepared sources and publication verification for the Blue symbol correction.

Scope: all 81 Blue cards in the catalog at base commit `d284be4bd159da744fe16ec7ee41c94ff38563c5`: Saiyan 18, Frieza 5, Trunks 9, Android 12, Cell 16, Cell Games 12, World Games 9. Both Masteries retain their existing enlargement. No affected card has a pinned custom Ultra Rare foil mask.

Only the `blue-style-symbol` colored stroke width changes, from `7.69230769` to `7.403846151625`, a 3.75% reduction. The standard placement's scale of `1.05 × 1.259909674167975` changes nominal blue ink weight from approximately 10.1762 to 9.7946 native pixels, matching the established approximately 9.8-pixel Red reference. Preserve the original 青 paths, blue `#3b9cde`, rounded caps and joins, dark width-13 outline, all transforms, symbol placement, outer footprint and smoky backing.

Each SVG changes by one reversible attribute edit. Existing card artwork, rules, title, category, borders, rarity and footer are unchanged. Both export sizes are patched independently and saved as lossless WebP. Native before/after crops are rendered for every card using that card's own background. This matters at a tiny antialiased crossing where reducing the inner blue paint can alter composited alpha by one level; the process does not assume the entire delta is opaque or reuse a different card's background.

`release.json` records exact before/after source and export hashes, reversible edits, affected pixel bounds, native baseline comparisons and catalog revision keys. `independent-verification.json` records a separate decoded-pixel comparison for every export. Historical audit files are immutable; `tests/helpers/blue-stroke-history.js` reverses this revision before the existing Black/Freestyle/Namekian/Saiyan audit chain. The Python wording-review check likewise follows Blue before earlier revisions.

Future cards should use the corrected Saiyan #13 Blue donor, which the current builders already select. `scripts/blue_symbol_weight.py` provides idempotent normalization for a separately retained older donor. Do not compound the reduction or run historical typography/frame finalizers.

Validation in the prepared checkout:

```sh
node --test tests/card-blue-stroke-weight.test.js
python3 tools/card-templates/v3/patch_blue_symbol_weight.py /path/to/blue-work
```

The second command verifies the prepared release and makes no changes when the release already exists. In a pristine base checkout, it prepares results; `--assemble --apply` applies a complete already-verified work directory.

The publishing handoff includes exact PNG patches, native sources, code, audit evidence and a checksum-guarded application script. It does not require image generation or SVG rendering to reconstruct the prepared exports. Publication reconstructed and checked all 162 exports against their exact release hashes, independently compared their decoded pixel counts and bounds, verified all 81 reversible native edits, and retained unchanged catalog game data. Integration preserves the published Black sources, all 180 Black exports, and their image revision keys.

The complete checkout passed 338 Node tests, six Python card-type checks, the dependency audit with zero vulnerabilities, and the Wrangler dry run.

Publish through the existing Security checks and Publish Cloudflare package workflows. Verify the live catalog and all 162 served Blue image hashes before reporting the correction as live. Never overwrite newer work or force-push.
