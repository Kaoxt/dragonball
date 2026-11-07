# Reference-confirmed Namekian style symbol

The large teal-backed icon on the user-provided Namekian Masteries is 瑪.
Score's original rulebook page 29 (PDF page index 5) confirms the same outline:
https://www.lackeyccg.com/dbzccg/dbzccg_rules.pdf

The previous replacement used 龍 from a separate small bottom-right mark.
That identification was incorrect. The earlier 無 font outline was also wrong.
Use the outlined `namekian-score.svg` asset and its provenance JSON for future
cards, retaining the current teal color, Noto Bold weight, height and center.

All 59 cards, including both Masteries, receive only the native symbol/backing
pixel delta in both existing lossless exports. Artwork, text, borders, footer
and all other pixels remain unchanged. The release records reversible native
edits, independent export hashes and zero changes outside the glyph delta.
The previous symbol release is preserved as historical evidence.

Reproduce with `python3 tools/card-templates/v3/patch_namekian_symbols.py WORK --apply`.
A repeat run verifies the current release without modifying anything.
