# Rulebook typography

`glyphs.json` retains the native outlines used to build two small TrueType fonts.

- Navigation: existing site letter contours, normalized to the same 190-unit cap height and shared slant. The missing alphabet/punctuation follows the geometric construction already used by the site's extended heading wordmarks.
- Numerals: approved Personality LEVEL/PUR paths for 1–4 are unchanged. The supplied top-left 7 reference guides 7; the other chapter digits follow the same squared, slanted design. These extensions are scoped to the rulebook and do not modify card templates.

Run `python tools/rulebook-typography/build.py` with fontTools to rebuild the fonts. The fonts require no external service. The stylesheet applies them only to section headings and numeric badges; body copy and page wordmark placement keep their existing styling.

The navigation font uses contour-based OpenType kerning to remove false gaps in pairs such as RY and RD while preserving the original outlines. Section numbers are plain white text. Heading outlines use stroke-before-fill painting so the white glyph strokes retain their full weight; navigation image outlines use CSS drop shadows.
