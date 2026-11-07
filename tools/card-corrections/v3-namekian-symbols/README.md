# Namekian style symbol correction

All 59 Namekian cards use the 龍 style mark, including the two Masteries.
The earlier 無 glyph was taken from the rules-area diamond rather than the
bottom-right style mark on the original Score cards.

The replacement uses Noto Sans CJK JP Bold, the exact font whose 無 outline
matched the old native path byte for byte. The retained asset records the
font source/hash, OFL license, reference scan and glyph bounds. Preserve the
teal ink, dark contour, 130-unit outlined height, visible center and existing
Mastery scale. Preserve each card's existing backing treatment.

`release.json` records all 59 native edits and 118 lossless image revisions.
Each image was compared independently with its old native render before
applying only the old/new symbol and backing pixel delta. No pixels outside
that delta changed. Artwork, borders, titles, rules, game data and footers
remain unchanged. Existing production audits are immutable; the test helper
reverses these native edits and follows the earlier export hash chain.

Reproduce and verify with:

```sh
python3 tools/card-templates/v3/patch_namekian_symbols.py /absolute/work --apply
```

After application, the same command verifies all hashes and performs no
further changes. `--ids` can stage an individual preview without applying it.
The shared Trunks #7 donor and its builder also use the corrected mark.
