# Card production

For any new or revised Main Personality or Hi-Tech card, read `tools/card-templates/main-personalities/category-typography.md`. Use the retained compact Hero/Villain vector labels; Saiyan P3 Vegeta's silver variant is the Villain reference. Run `lock_personality_category.py` after other layout/category operations and before export. Never substitute the general category typography or fit these labels to a different width.

Verify both the display image and high-resolution download, including shape, weight, spacing, dimensions and center. Preserve all unrelated pixels during a typography repair and leave already-correct exports byte-identical. Keep all current personalities covered by the category export audit; `npm test` rejects missing or stale verification. Do not update audit hashes without inspecting and measuring the final exports.
