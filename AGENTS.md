# Card production

V3: Saiyan Saga cards 001–050 now use the approved brush-theme masters. Read `tools/card-templates/v3/README.md` before any V3 edit. Preserve the native V3 coordinates, outlined fonts, genuine brush transparency, and shared title/category/rules/footer geometry. Do not run V2 title or category finalizers on V3. V3 release evidence is in `tools/card-corrections/v3-saiyan-001-050/audit.json`; `tests/card-v3.test.js` verifies both exports and their native sources. `templateVersion: 3` explicitly distinguishes migrated cards; all others retain their established version.

## Retained V2 cards

For every new or revised card, read `tools/card-templates/shared/typography.md`. Titles now use Teko SemiBold at 77.43142144638405 native units (10% smaller), with the visible lettering vertically centered at y72. Apply `tools/card-templates/shared/title_typography.py` after other title operations and require idempotence. Preserve approved horizontal centers, the minimum Personality LEVEL clearance, wording and unrelated pixels. This supersedes older title size/baseline rules. Power text remains Barlow Condensed Bold at 49 with normal spacing and the approved inline-icon gaps. Keep all catalog cards covered by the title and power export audits.

For any new or revised Main Personality or Hi-Tech card, read `tools/card-templates/main-personalities/category-typography.md`. Use the retained compact Hero/Villain vector labels; Saiyan P3 Vegeta's silver variant is the Villain reference. Run `lock_personality_category.py` after other layout/category operations and before export. Never substitute the general category typography or fit these labels to a different width.

Verify both the display image and high-resolution download, including shape, weight, spacing, dimensions and center. Preserve all unrelated pixels during a typography repair and leave already-correct exports byte-identical. Keep all current personalities covered by the category export audit; `npm test` rejects missing or stale verification. Do not update audit hashes without inspecting and measuring the final exports.

