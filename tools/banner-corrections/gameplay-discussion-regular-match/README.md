# Gameplay Discussion: match the News caption's regular Flipside

The user rejected the November 2 synthetic-bold treatment as too heavy and requested a direct comparison with the News / Enter the Arena caption. Restore the original `gameplay-banner-goku-fitted-shadow-*` exports and regular Flipside masks; do not thicken their outlines. Keep the repaired solid lower lettering and exact-phrase soft shadow.

The desktop comparison uses the published News asset `arena-banner-flipside-refined-trio-2179.webp`. The two captions are cropped by visible ink and shown at the same 64px letter height, without stretching. A matching comparison covers the mobile News asset `arena-banner-flipside-refined-duo-centered-1920.webp`. The different wording and source sizes are preserved on the actual pages.

Inspection of the shared E, A and N contours confirms the regular masks are closer to the News reference than the rejected synthetic-bold masks. At normalized glyph dimensions, texture-gap-smoothed contour intersection-over-union scores are E 0.814 vs 0.757, A 0.837 vs 0.768, and N 0.778 vs 0.773. These are comparisons of rasterized glyphs, not a claim of identical pixels across different words.

All eight restored exports must retain the SHA-256 values in `../gameplay-discussion-fitted-shadow/pixel-audit.json`. No image is regenerated or recompressed. The HTML replacement changes only the banner image URLs; artwork, logo, dimensions, responsive behavior, placement and category link stay unchanged.
