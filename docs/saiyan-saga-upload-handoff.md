# Saiyan Saga continuation

## Latest completed task: cards 81–130

The user requested the next 50 cards after 31–80. Cards 81–130 now use the approved bold-title vector frames, and the ten heroes use the approved matte scouter personality template with individually checked levels, PUR, power stages and abilities. All exports are lossless WebP at 1060 × 1484. The checked source transcription is `tools/card-frames/rules-081-130.json`; personality values are in `personality-data-081-130.json`. Renderers pin their source commits and use vector frame geometry. Dense rules use the same font with minimal size adjustment to avoid clipping. Publication uses five ten-card batches. **Stop after 130; next sequential card is 131.** Verify the final Cloudflare build and all 50 live image hashes separately.

## Current task: cards 31–80 approved for publication

The user requested the next 50 cards after the linked chat completed 11–30. The five batches are 31–40, 41–50, 51–60, 61–70 and 71–80. All use the approved 1060 × 1484 master, identical SVG silver rails, Teko Bold 700 titles (74 px with 5 px black outline), fixed 50 px body type, and lossless WebP. Renderer: `tools/card-frames/render-approved-range-031-080.py`. Each batch has its own `docs/saiyan-approved-vector-NNN-NNN.json` manifest. Cards 71–80 rules were transcribed from the existing published images; 31–70 retain reviewed rules JSON. Existing source artwork is fitted proportionally once. No cards outside 31–80 or catalog entries were changed.

The user explicitly authorized publishing all 50 cards to `Kaoxt/dragonball` main in five ten-card batches on October 9, 2026. This approval resolves the earlier automatic-review block. Verify Cloudflare deployment and all 50 live image hashes after publishing. Previous live head: `4209d2696ca98cec21d090cdd48bfc7ea1fac720`.

## Approved next batches: cards 11–30

Cards 11–30 now use the approved 1060 × 1484 frame and judder-free SVG silver rails from cards 1–10, with blue, green, gray and gold accents. Dragon Ball labels have no sword; all Physical Combat cards share the approved sword and type strip. The immutable-source renderer `render-approved-range-011-030.py` fits existing artwork proportionally and uses the reviewed rules JSON with one 50px Nimbus Sans Bold body font. `saiyan-approved-vector-011-020.json` and `saiyan-approved-vector-021-030.json` record exact assets and rules. User has explicitly authorized publishing cards 11–30 in this conversation; both ten-card batches are complete. Stop after 30; the next sequential card is 31.

## Latest approved test design: cards 1–10

Silver rails were subsequently rebuilt as uniform vector paths in `judder-free-silver-rails.svg`, exported by `render-judder-free-rails.py`. This fixes the user-reported wobbly edges and mottled shading above the title and under the artwork, and applies the same correction to the other silver rails. The renderer preserves all pixels outside its narrow overlay, including the fresh Raditz portrait, title glyphs, rules and numbers. Do not rerun the older connected-frame renderer over these corrected exports.

The latest approved #1–10 export uses connected silver title/footer rails and a continuous colored stepped stripe beside Physical Combat. Orange Arm Bar #5 has a fresh clean Raditz portrait. All ten are assembled from `tools/card-frames/approved-connected-frame-raditz.png` by `tools/card-frames/render-connected-frame-001-010.py`, preserving the published rules, existing title glyphs and artwork on the other nine cards. Frame pixels are identical within each color group. This supersedes the lower-corner-only renderer below; do not rerun the older renderer over these assets.

The approved lower-corner cleanup is now applied to both sides of all ten cards. It removes the doubled gray rails and rough joins below the colored side tabs. Everything outside those corner regions is pixel-identical to the previous version. The renderer `tools/card-frames/apply-approved-corners-001-010.py` uses immutable source commit `f28f02145b9e1fde9fff21bdfb6a3820121948db` so it can be rerun safely.

Cards #1–10 now use the user-approved Orange Arm Bar test frame with the exact reference footer, one shared sword on the right, and card numerals vertically centered at y=1351. These exports are 1060 × 1484 lossless WebP and supersede the earlier fixed-design exports for #1–10 only. #11 onward is unchanged. The shared frame and sword were verified by pixel comparison. `saiyan-approved-frame-001-010.json` records their image hashes and rules. Use #5 from this batch as the current visual master; do not rerun older renderers over these assets.

## Latest fixed design upload

The recovered fixed-design exports are published for **cards 1–25 only**, in batches 1–10, 11–20, and 21–25. These supersede the earlier cleanup below. `saiyan-fixed-design.json` records their exact Git blob hashes. The user reduced this task from 70 to 25 cards; stop at 25. The renderer is pinned to the pre-update source commit so reruns cannot double-apply the frame.


The repository retains 266 recovered image exports, including alternate prints. The active catalog contains **257 unique cards**: #1–250 plus seven promos. Assets are 1070 × 1470 WebP. Additions and refreshes are committed in batches of at most 10. Do not duplicate set entries or restore archived duplicate variants to the active catalog.

The approved standard-frame cleanup is complete through **#70**. The next sequential batch starts at **#71**. Cards #21–70 contain no personalities. See `saiyan-approved-cleanup-001-020.json` and `saiyan-approved-cleanup-021-070.json` for asset versions.

Standard cards use clean vector borders, consistent 42 px ability text, shadowless card numbers, and gray Freestyle frames. Preserve the source artwork and exact rules. `tools/card-frames/render-standard-range.py` recreates #21–70 from immutable source commit `f960acd8795d3033a8a6a6a8c8c8b78c9fef8cbb`.

The latest approved personality design is documented in `tools/card-frames/personality-design.md`, with editable SVG reference and overlay. Use straight silver borders, a LEVEL badge without lower notches, and matte translucent scouter rows spaced clear of the right frame. Heroes are blue and villains deep red. Populate each card's own data. Restore Goku #158's character art and background when reaching that card. The older personality-theme progress file describes the previous design, not completion of this new design.

Deployment must be verified separately from repository commits.
