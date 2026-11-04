# Approved Cell Games emblem — November 4, 2026

All 95 published Cell Games cards use the approved green wreath, gray hexagonal
rim, and black angular C, with the Android Saga emblem's restrained satin finish.
The approved PNG is retained as a content-addressed native SVG dependency.

Keep the visible width at 73.9635 native units. Center the visible alpha contour
at (211.75, 1409.5) for portrait cards and (296.55, 985.5) for landscape cards.
The source group clips away transparent canvas margins, so native bounds and
visible ink share the same center. Future Cell Games cards must reuse this exact
`saga-emblem` group and asset from a current source rather than the historical
circle/C constructor in the original batch reproduction scripts.

`release.json` records both export sizes independently, exact source/export
before and after hashes, unchanged source bytes outside the emblem, measured
native bounds, and zero changed pixels outside the old/new logo footprint.
Inkscape's small regional-render rounding (at most three channel levels) is
carried forward from the existing image. Downloads remain lossless at 2x;
display images remain lossless at their original dimensions. Cache keys change
for every revised image and download. Historical batch audits remain unchanged
and tests follow the explicit revision chain.

Five cards (70, 72, 73, 81, 83) remain unpublished awaiting artwork. This logo
release neither changes that status nor adds new cards.

Re-run `python3 tools/card-templates/v3/patch_cell_games_logo.py` to verify an
already-applied release without changing source or export bytes.
