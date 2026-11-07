# Match Namekian symbol stroke weight

The user noticed that the corrected Namekian 瑪 logo looked bolder and different.
Its Noto Sans Bold outline used heavy, square terminals; the other style symbols
use rounded drawn strokes. This revision retains 瑪 and uses KanjiVG's 0746a
paths, with the same stroke widths, round caps and joins as Blue, Orange,
Saiyan and Black. Keep the teal color, 130-unit outlined height, visible center,
Mastery enlargement and every unrelated pixel unchanged.

The source SVG includes attribution to Ulrich Apel / KanjiVG and the CC BY-SA
3.0 license. `namekian-strokes.json` records source hashes and exact geometry.
Only the 59 Namekian native files and 118 existing exports are corrected.
All earlier releases remain reversible historical evidence.

## Other five styles

All 366 live previews passed an independent glyph-core comparison against
native renders at their displayed positions. Their complete downloaded bytes
match the published catalog image hash revisions. The 361 available native
sources contain exactly the expected five glyphs in standard or Mastery
placements. The final five Cell Games cards lack complete native sources;
their actual live glyph pixels were checked against the corresponding current
donor and inspected visually. No other style needs a symbol replacement.

| Style | Correct symbol | Cards |
| --- | --- | ---: |
| Red | 赤 | 75 |
| Blue | 青 | 72 |
| Orange | 橙 | 78 |
| Saiyan | 緑 | 66 |
| Black | 黒 | 75 |

The card-level results are in `other-styles-audit.json`.
