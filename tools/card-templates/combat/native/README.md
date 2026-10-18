# Current approved master — October 17, 2026

The title and footer side panels use a black base with the preserved subtle diamond texture. The center footer gradient is #08090a to #000000. Orange Standing Fist Punch reproduces the live approved card pixel for pixel. Native frame geometry, artwork and symbols remain unchanged.

# Current native combat production

The October 17 confirmation uses `assets/red-lunge-punch-confirmed-master.png` as the visual authority. The native frame includes the shaped solid-black area between the white power box and the footer rails, while retaining the colored outer decoration. Red Lunge Punch uses the cleaned Goku illustration from that reference through a native artwork clip. Other illustrations remain unchanged.

The October 16, 2026 production master uses the approved Orange and Red decoration, 4-unit title/category tracking, matched Toku Waza weight, charcoal center footer, Rajdhani brand lettering, regular-weight disclaimer, and cap-height SVG attack/block icons.

Run from the repository root:

Keep the original colored outer background. Center the rarity Dragon Ball and card number at y=1397.5, halfway between the footer silver rails. Use visible sphere alpha bounds and outlined numeral bounds for alignment.

```sh
python tools/card-templates/combat/native/render.py --only 1,2,3,4,5
```

Requires Python with Pillow, fontTools, NumPy and SciPy, plus Inkscape CLI. The renderer reads `cards-001-010.json`; use `--cards` for other verified input and `--output` for another output directory. Supply artwork for any new card at `artwork/saiyan-NNN.png`, preserving its aspect ratio. The optional `artwork_reference` field retains a complete approved reference image, exposing only its illustration window through an SVG clip.

Outputs: native outlined SVG, 2120 × 2968 PNG and pixel-identical lossless WebP, plus 1060 × 1484 quality-92 preview WebP. Publishing is a separate step: copy only selected card previews and downloads to their public paths, then update their hash tokens in `public/cards/catalog.js`. The renderer does not publish automatically.

For every future card, use crossed swords for attack effects and a solid shield for stop-attack effects. Both physical and energy stops are supported. Icons match the capital P height, align to the capital top/baseline, and use a 12-unit gap at the current 49-unit rules size. Use `rule_icons` overrides (`attack`, `block`, `none`) for wording that is not automatically recognized. See `../references/combat-production.md` for the complete standard.

Text and frames are native vector outlines; character art, approved background textures, set emblem and rarity sphere remain retained raster assets. OFL font licenses are bundled. The Orange 橙 glyph is adapted from KanjiVG (Ulrich Apel, CC BY-SA 3.0); its full source notice is retained in `assets/orange-kanji-source.svg`.
