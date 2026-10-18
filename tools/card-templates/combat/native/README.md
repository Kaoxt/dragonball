# Unified layout and AT wording — October 18, 2026

Saiyan Saga cards 001–020 use the shared title/category/power/footer geometry, the 0.81 rarity-and-number group, flat-white set mark, and current AT/DAMAGE wording. Original artwork and attack mechanics are retained. Read `references/shared-layout.md` and `references/card-wording.md`.

Reproduce this batch with `python tools/card-templates/combat/native/render-unified.py`. This reads the updated `cards-001-010.json`, uses `shared_layout.py` and `icons_unified.py`, and exports SVG, 2120 × 2968 PNG/lossless WebP and smaller previews. The unified renderer now supports Orange, Red, Blue, Saiyan and Freestyle. Use it for new work; `render.py` is historical. For cards 11–20, pass `--cards tools/card-templates/combat/native/cards-011-020.json`; render the two Dragon Balls separately through their native renderer.

The public catalog uses the full-resolution lossless files for these twenty cards, with cache-versioned URLs. Artwork and fonts are retained from the existing native source assets.

# Current approved master — October 17, 2026

The title, Toku Waza badge and footer side panels share one black diamond pattern: #000000 base, #101113 lines, 14-unit repeat and 1-unit stroke. The center footer gradient is #08090a to #000000. The October 17 badge update preserves all artwork, colored symbols, typography and border geometry.

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

For every future card, use at most one power icon: crossed swords for an attack (including attack/block alternatives), a single shield for a non-attack stop effect, or infinity for a constant power. Do not add a shield after an attack icon. Put applicable `Banish after use.` at the end of the power. Both physical and energy stops are supported. Icons match the capital P height, align to the capital top/baseline, and use a 12-unit gap at the current 49-unit rules size. Use `rule_icons` overrides (`attack`, `block`, `none`) for wording that is not automatically recognized. See `../references/combat-production.md` for the complete standard.

Text and frames are native vector outlines; character art, approved background textures, set emblem and rarity sphere remain retained raster assets. OFL font licenses are bundled. The Orange 橙 glyph is adapted from KanjiVG (Ulrich Apel, CC BY-SA 3.0); its full source notice is retained in `assets/orange-kanji-source.svg`.

