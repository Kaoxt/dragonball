# Set-logo banners: shared clearance and pixel preservation

Apply to all existing and future Dragon Ball OCG saga banners. On October 26, 2026, the user requested more space between Android's RR emblem and its text, consistent spacing across all set banners, and everything else unchanged pixel for pixel.

## Shared measurement

- Keep the Trunks brushed-purple banner as the visual-family reference. The reference attachment is `trunks-saga-logo-brushed-purple.webp`, Library `libfile_8b9419e195f88191a7f66c40bf15ba42`. Do not substitute an older emblem, wordmark, finish or color.
- Use **64 pixels of visible horizontal clearance at native canvas height 724 pixels** for the current increased-spacing versions. For another native height H, use `round(64 * H / 724)`. Compare all banners at equal height. This numerical target implements the user's spacing direction; it is not a claim that the user specified 64 pixels.
- Measure from the rightmost visible emblem edge to the leftmost visible wordmark edge, including meaningful colored bevels and outlines. Ignore isolated compression specks for measurement only; retain every original pixel in the actual output. Keep at least that clearance at pointed corners; do not let the A, T, F or S run beneath the emblem.
- Move the whole wordmark together. Preserve the spacing between the set name and SAGA. Preserve the original vertical alignment, component sizes, letter shapes, silver texture and set colors.
- Do not apply the same translation amount blindly: initial gaps differ. Calculate each translation from the common target gap. Extend the canvas width instead of squeezing or scaling the design. Display each banner at a common height so different output widths do not undo the consistency.

## Pixel-preserving correction

1. Resolve the current source. For site banners, inspect the current collection-branding map; do not select an old Library preview merely because its title matches. The October 26 map in `Kaoxt/dragonball/public/cards/cards.js` uses the brushed-blue, brushed-green and brushed-purple files under `public/assets/sets/`.
2. Use separate native layers where available. Otherwise establish and inspect an explicit seam through the background between the retained emblem and text. Preserve every source RGBA/RGB pixel on its side of the seam. Avoid cutting through filled artwork. Inspect touching outlines carefully; do not invent obscured artwork or silently repaint a contour.
3. Translate only by integer pixels, with no interpolation, relighting, denoising, sharpening, recoloring, alpha adjustment or image generation. Keep existing transparency and opaque backgrounds unchanged. Save PNG or lossless WebP.
4. Verify exact equality of all retained pixels after reversing the translation. Verify the decoded final export, not just in-memory data. Record the gap, translation, source identity and comparison result per set.
5. Inspect the final emblem corners, first letter, metallic texture and complete banner at native resolution and at its intended display height. A reversible pixel transform alone does not prove that the seam was correctly placed.
6. Keep corrected source/export delivery distinct from website publication. Do not claim the site changed unless the updated assets were actually published and verified.

## Future new sets

Use the same gap and comparison procedure from the start. Keep emblem and wordmark separable so later layout revisions require no artwork regeneration. Match the established banner family while preserving each set's approved emblem and accent color. Recheck spacing after every export, crop or layout operation.
