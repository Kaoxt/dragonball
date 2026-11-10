# Namekian symbol stroke weight

Prepared for publication; this work does not deploy the site.

All 65 current Namekian cards retain the exact native 瑪 paths, teal color,
rounded terminals, black outline, smoky backing, transforms and total size.
Only the teal stroke width changes from 7.69230769 to 7.3076923055: a 5%
reduction, approximately 10.32 to 9.80 pixels at the standard card placement.
Red has tapered strokes; 9.8 is the approximate typical weight, not a uniform
measurement of every Red stroke. Both Mastery symbols retain their enlargement.
Six World Games cards are included, alongside the 59 earlier cards.

Both existing exports are patched independently from the exact old/new native
render delta. They remain lossless, with zero decoded pixel changes outside
that delta, including its antialias/downsampling footprint. Only one SVG
opening-tag stroke-width attribute changes on each of the 65 native cards.
No text, art, borders, gameplay data, color, placement or other style changes.

`release.json` records before/after hashes, reversible native edits, per-export
pixel checks and cache revisions. Earlier audit records remain immutable.
`tests/helpers/namekian-weight-history.js` reconstructs the preceding state for
the existing Saiyan, World Games and older Namekian audit chains. The corrected
Trunks #7 donor and `namekian_symbol.py` prevent future cards restoring the old
weight. The KanjiVG source paths and original license attribution are retained.

From the repository root:

```sh
python3 tools/card-templates/v3/patch_namekian_symbol_weight.py /tmp/namekian-weight --workers 4 --apply
node --test tests/card-namekian-stroke-weight.test.js tests/card-namekian-stroke-match.test.js tests/card-namekian-reference-symbols.test.js tests/card-namekian-symbols.test.js
```

With a release present, repeating the correction verifies all current hashes,
cache keys and idempotence without changing files. Publication remains separate.
