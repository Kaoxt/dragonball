# Saiyan Saga continuation

## Latest approved test design: cards 1–10

The approved lower-corner cleanup is now applied to both sides of all ten cards. It removes the doubled gray rails and rough joins below the colored side tabs. Everything outside those corner regions is pixel-identical to the previous version. The renderer `tools/card-frames/apply-approved-corners-001-010.py` uses immutable source commit `f28f02145b9e1fde9fff21bdfb6a3820121948db` so it can be rerun safely.

Cards #1–10 now use the user-approved Orange Arm Bar test frame with the exact reference footer, one shared sword on the right, and card numerals vertically centered at y=1351. These exports are 1060 × 1484 lossless WebP and supersede the earlier fixed-design exports for #1–10 only. #11 onward is unchanged. The shared frame and sword were verified by pixel comparison. `saiyan-approved-frame-001-010.json` records their image hashes and rules. Use #5 from this batch as the current visual master; do not rerun older renderers over these assets.

## Latest fixed design upload

The recovered fixed-design exports are published for **cards 1–25 only**, in batches 1–10, 11–20, and 21–25. These supersede the earlier cleanup below. `saiyan-fixed-design.json` records their exact Git blob hashes. The user reduced this task from 70 to 25 cards; stop at 25. The renderer is pinned to the pre-update source commit so reruns cannot double-apply the frame.


The repository retains 266 recovered image exports, including alternate prints. The active catalog contains **257 unique cards**: #1–250 plus seven promos. Assets are 1070 × 1470 WebP. Additions and refreshes are committed in batches of at most 10. Do not duplicate set entries or restore archived duplicate variants to the active catalog.

The approved standard-frame cleanup is complete through **#70**. The next sequential batch starts at **#71**. Cards #21–70 contain no personalities. See `saiyan-approved-cleanup-001-020.json` and `saiyan-approved-cleanup-021-070.json` for asset versions.

Standard cards use clean vector borders, consistent 42 px ability text, shadowless card numbers, and gray Freestyle frames. Preserve the source artwork and exact rules. `tools/card-frames/render-standard-range.py` recreates #21–70 from immutable source commit `f960acd8795d3033a8a6a6a8c8c8b78c9fef8cbb`.

The latest approved personality design is documented in `tools/card-frames/personality-design.md`, with editable SVG reference and overlay. Use straight silver borders, a LEVEL badge without lower notches, and matte translucent scouter rows spaced clear of the right frame. Heroes are blue and villains deep red. Populate each card's own data. Restore Goku #158's character art and background when reaching that card. The older personality-theme progress file describes the previous design, not completion of this new design.

Deployment must be verified separately from repository commits.
