# Native combat card production

This source reproduces the updated Saiyan Saga cards 1–5 using the current combat
master geometry, retained artwork, native font outlines and the smaller rarity
ball/number treatment. It does not require image generation.

The orange-and-black outer background matches the broad diagonal streak style
of the user's Red Lunge Punch reference (October 15, 2026). It is a separate
Imagegen texture layer in `assets/orange-base.png`; the title, white rules panel,
footer rails, borders, typography, symbols and retained character artwork are
assembled from their existing sources. The combat bar uses an orange palette.
All five cards share the same background placement and native frame geometry.

Run from the repository root:

```sh
python tools/card-templates/combat/native/render.py
```

Dependencies: Python with Pillow, NumPy, SciPy and fontTools, plus Inkscape CLI.
Edit titles, original powers and approved display wording in `cards-001-005.json`.
The renderer produces self-contained SVG masters, 2120 × 2968 PNG masters,
1060 × 1484 website WebP images and lossless 2120 × 2968 download WebP images.
It updates only those five cards' cache tokens in `public/cards/catalog.js`.
Generated intermediates in `output/` need not be committed.

Typography uses Michroma and Barlow Condensed; OFL licenses are included. These
are native matches to the approved appearance, not claimed original Score fonts.
Text is converted into SVG paths at export, with explicit glyph advances and
positive title tracking. The powers all use the same 49-unit bold condensed size
and 59-unit line spacing. Titles reduce font size for length without individually
stretching glyphs. The title/category width design factor is fixed at 0.84.

All five cards are Common: one centered red star in the approved amber sphere.
The ball/number sizes retain the user's 0.85 reduction. The pair is centered by
its combined visible bounds at (907, 1401), with a 15.3-unit gap. Card artwork
is retained raster artwork from the source commit, cropped at its existing art
window without repainting or stretching. A larger export improves vector text
and frame detail, not the underlying illustration resolution.

The source card powers were compared with `tools/card-frames/rules-001-020.json`
and the user-supplied Expanded CRD. No card-specific CRD entries override #1–5.
Display wording uses the approved “Raise your anger 1 level” convention, expands
“stage” to “power stage,” and preserves every attack value and condition. The
separate anger effect is not conditional on a successful attack. Source references
and original wording are retained in the JSON.

The Orange style glyph is 橙. Its vector stroke data comes from
[KanjiVG](https://kanjivg.tagaini.net), copyright 2009–2011 Ulrich Apel,
[source](https://github.com/KanjiVG/kanjivg/blob/master/kanji/06a59.svg),
under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The adapted glyph (white strokes, no stroke numbers, scaled and centered) remains
under that license. The full original notice is retained in
`assets/orange-kanji-source.svg`. The style glyph is separate from the native
crossed-swords attack icon in the power box.

`docs/saiyan-native-001-005.json` records render dimensions, text placement and
SHA-256 hashes. The shared frame gives every card identical panel/border geometry.
