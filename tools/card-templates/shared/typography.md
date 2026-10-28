# Card typography — October 28, 2026

This is the current title standard. It supersedes the older fixed 86.0349 title size and baseline-only alignment. The user requested slightly smaller titles, vertically aligned to fit their panels.

## Titles

Use the retained Teko SemiBold font at native size **77.43142144638405**, a 10% reduction. Use white native outlines without added stroke or tracking. Vertically center each title's actual visible bounds at **y72**, including ascenders, accents and descenders; do not align only the baseline or capital band.

Preserve the approved horizontal centers: **x526** for ordinary portrait cards, **x529.5** for all regular and Hi-Tech Personalities, and **x738** for the shared landscape Location/Battleground frame. Preserve natural glyph proportions unless a long title requires horizontal fitting. Safe visible widths are 920, 655.5 and 1344 native units respectively. Personality titles must leave at least **24 units after the LEVEL panel's right edge at x177.75**. Never resize or move a panel to accommodate a title.

Run `python tools/card-templates/shared/title_typography.py INPUT.svg OUTPUT.svg` after all other title/layout operations. It replaces only the native title group and leaves unrelated SVG bytes unchanged. Run a second time with `--check`; it must pass without further movement. Preserve the existing title wording exactly.

Verify the actual display and high-resolution download: same font and weight, fixed native size, visible center y72, correct horizontal center, LEVEL clearance, no clipping, no exposed former lettering and no unrelated pixel changes. For existing images, patch only the old/new title footprints and antialiasing margin; save losslessly. Verify the decoded image round trip and refresh both asset revisions. Do not regenerate artwork.

## Power text

Use the retained Barlow Condensed Bold at native size **49**, natural glyph widths, no additional stroke or tracking, ordinary space advance **9.8** and line pitch **59**. Keep approved line centering and wording. Never justify lines or stretch their glyphs to fill the power panel.

An inline power icon replaces an ordinary space with the icon plus **12-unit gaps on each side**. The intentional advance increase is `visible icon width + 24 - 9.8`; include the infinity's colon in horizontal width but measure the infinity alone for vertical alignment. Ordinary text spaces must remain 9.8. Preserve the separate approved infinity alignment rule.

Audit glyph shapes as well as declared font names and centering. The October 28 audit covers 799 current cards, all native power glyphs and both published export sizes. Older editable sources may have different line wrapping; compare glyphs independently rather than treating that as a different font. Preserve correct power text unchanged.

## Personality categories

Continue using `../main-personalities/category-typography.md` and its fixed Hero/Villain outline assets. Run that category finalizer after generic category operations. Title changes must preserve the already-verified category crop exactly.

## Release checks

Keep every catalog card covered in the typography export audit. Verify current hashes, image revisions, dimensions, native title metrics, lossless preservation and power-font evidence before publishing. Hash updates alone do not prove typography was inspected. Record original label repairs, subsequent title revisions and live verification separately.
