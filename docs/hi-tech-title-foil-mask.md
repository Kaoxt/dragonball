# Hi-Tech title foil correction — November 14, 2026

The Hi-Tech foil masks still excluded the old angular title panel ending at
y124. Current V3 title paint extends to y146 and has a different distressed
right edge. Foil therefore created a striped band along the title bottom and
an angular patch behind its right end. This is a live viewer effect; the
Regular display image and lossless download do not contain the added band.

All 36 current Hi-Tech cards share the same native title contour and width
mapping. The three shared masks now use that exact contour, the November 6
title/footer mapping, and native LEVEL lettering/numerals. Other exclusions,
subject attenuation, foil textures, renderer behavior and artwork stay intact.
Cards, Decks, Arena and the foil preview load revisioned mask and stylesheet
URLs. No catalog, native card, display image or download image is replaced.

`python3 tools/card-effects/hi-tech-title-mask.py --check` compares every
catalog Hi-Tech native header with the shared mask. Run the script without
`--check` to rebuild after an approved shared-header change. It rejects a
divergent native header instead of silently applying a mismatched shape.

Focused regression checks:

```sh
node --test tests/card-hi-tech-title-mask.test.js tests/card-surface.test.js tests/card-motion.test.js tests/card-finish-preference.test.js
```
