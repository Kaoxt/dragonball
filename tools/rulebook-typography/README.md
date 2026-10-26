# Rulebook typography

`glyphs.json` retains the native outlines used to build two small TrueType fonts.

- Navigation: existing site letter contours, normalized to the same 190-unit cap height and shared slant. The missing alphabet/punctuation follows the geometric construction already used by the site's extended heading wordmarks.
- Numerals: approved Personality LEVEL/PUR paths for 1–4 are unchanged. The supplied top-left 7 reference guides 7; the other chapter digits follow the same squared, slanted design. These extensions are scoped to the rulebook and do not modify card templates.

Run `python tools/rulebook-typography/build.py` with fontTools to rebuild the fonts. The fonts require no external service. Rules section headings use the regular site font, Google Sans Flex, with each word capitalized. Chapter numbers and numeric badges use the Personality numeral font. The navigation font remains retained for the site's custom lettering.

The navigation font uses contour-based OpenType kerning to remove false gaps in pairs such as RY and RD while preserving the original outlines. Section numbers are plain white text. Heading outlines use stroke-before-fill painting so the white glyph strokes retain their full weight; navigation image outlines use CSS drop shadows.

Navigation glyph advances include the complete slanted ink bounds, keeping words and line ends separate. The build removes trace stair steps with a maximum 5/1000-em deviation and uses 90/1000-em minimum contour spacing. The original SVG outline data stays retained. Chapter numbers use ordinary decimal numbering with a white fill and black outline.

The build converts SVG even-odd counters to TrueType nonzero winding: outer contours are clockwise and inner openings counterclockwise. This keeps P and other enclosed letters open. Q uses one joined exterior with a separate counter, avoiding overlapping tail artifacts. Chapter numerals receive an additional 12-degree slant in CSS; card-template numeral outlines remain unchanged.

The rulebook 0 has a wider inner opening toward the right: its right counter boundary extends by 3 source units. Its outer contour, advance width and side bearings are preserved, and digits 1–9 retain their existing outlines. Keep this refinement in the retained `numerals["0"]` path when rebuilding.

