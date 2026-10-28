# Personality category lettering — approved October 28, 2026

Use Saiyan P3 Vegeta's silver variant as the fixed VILLAIN PERSONALITY reference. Use the corresponding compact HERO PERSONALITY outlines retained from the approved Saiyan Hi-Tech master. Apply these two label assets to every regular and Hi-Tech Personality in every set. Preserve the different natural widths of HERO and VILLAIN; never stretch one phrase to the other's width.

## Exact native standard

Use `category-labels/villain.svg` and `category-labels/hero.svg` as the source of truth. `category-labels/standard.json` records their hashes. These are editable Michroma Regular outlines with the approved compact proportions, heavier white stroke and 2.75-native-unit extra tracking. Preserve every glyph and its spacing. On the 1060 × 1484 canvas:

| Property | Required value |
| --- | --- |
| Visible horizontal center | 529.5, centered on the illustration |
| Visible vertical center | 918.3378378 |
| Visible height, including stroke | 34.21875 |
| Villain visible width | approximately 591.132 |
| Hero visible width | approximately 533.985 |
| Glyph-to-canvas scale | x 0.016603287; y 0.01875 |
| White stroke in retained glyph coordinates | 225, round joins |
| Fill / stroke | white / white |

The exact retained vectors govern any subpixel rounding. Keep the full label at the fixed height and center; do not move individual words, change kerning, fit to the category bar, resize to a new text length, or apply the general category font treatment. Keep the title, PUR badge, panels and all other typography independent.

## Required production sequence

1. Fill card-specific data and complete all existing frame, artwork, numeral, title and power operations.
2. Run `python tools/card-templates/main-personalities/lock_personality_category.py INPUT.svg OUTPUT.svg`. The helper restores only `card-category`, checks the retained outlined bounds, and preserves every other SVG byte. It rejects unfamiliar canvas sizes or parent transforms for manual review.
3. Run the helper again with `--check`; require success. A second apply must leave the source byte-identical. Do not run a generic category builder afterward.
4. Export the current native source to both the display and high-resolution download. Inspect both exports against their respective retained reference glyphs. Check shape, thickness, spacing, width, height and center, not just centering or the SVG source.
5. For repairs, verify the old native lettering matches the current image, patch only the old/new glyph footprints with a small antialiasing margin, save losslessly, and require zero decoded-pixel changes elsewhere. Leave already-correct exports byte-for-byte unchanged.
6. Refresh both catalog asset revisions. Record all published personality cards in the export audit and run `node --test tests/personality-category.test.js`; the release fails if a card is missing, an image hash is stale, a label reference changes unexpectedly, or an export lacks its verification.

For future cards, add a new verification record only after measuring and inspecting the actual final exports. Do not bypass the release check by updating hashes without checking the typography. This rule changes personality category lettering only; other card families retain their own approved typography.

## Cause and scope of this repair

The general category builder used Michroma at size 39.9 with stroke 3.32 and normal width for personality labels. Some Trunks sources also applied a separate horizontal fit. Those treatments were centered correctly but did not match Vegeta's compact, heavier native outlines. Earlier centering-only checks could not detect the mismatch.

The October 28 audit covers every current Main Personality entry in the catalog, including regular cards, silver variants and Hi-Tech cards, in Saiyan, Frieza, Trunks and Android. Current Cell cards contain no personalities. Native patches are reproducible with the helper, using the latest full-card master so unrelated later artwork corrections remain intact. See `../../card-corrections/personality-category-2026-10-28/audit.json` for per-card and per-export evidence.
