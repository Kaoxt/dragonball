# Black Tokui Waza stroke correction

All 90 Black cards across seven sets, including
15 World Games cards and both Masteries, retain their original 黒 paths, gray
#777d85, dark outline, rounded caps, placement, size, and backing. Only the gray
stroke changes from 7.69230769 to 6.923076921: a 10% reduction, or about 10.90 to
9.81 native pixels at standard placement. The Mastery enlargement stays intact.

Both existing image sizes are patched independently and saved losslessly. All
180 native baselines match exactly at the affected pixels. All other pixels,
card data, artwork, text, borders, set marks, rarity and existing corrections
remain unchanged. No Black card uses a pinned Ultra Rare custom mask.

Use the corrected Saiyan #65 donor for new Black cards. The two older builders
apply scripts/black_symbol_weight.py as well. That helper is byte-idempotent and
changes exactly one native paint attribute. Reversing the retained edit restores
each original native file byte for byte. Historical audits are immutable;
tests/helpers/black-stroke-history.js adds the new revision to the existing chain.

The two shared native symbols (standard and Mastery) were rendered and checked
independently: unchanged alpha silhouettes, all changed pixels fully opaque,
and identical deltas between isolated and full native renders. Display patches
use each card's own download context for resampling. Never borrow another card's
surrounding pixels. release.json records every source and export hash, exact
changed bounds and changed pixel count. independent-verification.json records
the second comparison against original Git bytes. The nine comparison examples
cover all seven sets and both Masteries.

The preparation task passed 29 focused Node tests; see focused-tests.log.
Publication verification reconstructed all 180 exports with byte-identical
release hashes and independently checked their changed-pixel counts and bounds,
all 90 reversible native edits, and unchanged catalog game data. The complete
checkout passed 335 Node tests, all six Python card-type checks, the dependency
audit, and the Wrangler dry run. The Python historical image-review check now
follows the Black revision before its earlier title audit, retaining the
original wording-review evidence.

Publish through the normal Security checks and Publish Cloudflare package
workflow. Verify live catalog revisions and all display/download hashes against
release.json before claiming live. Never overwrite newer work or force-push.
