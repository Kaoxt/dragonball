# Secondary banner text standard

Use this approved style for future Dragon Ball Online banner captions, taglines and secondary headings. The reference is **GAMEPLAY DISCUSSION**, approved November 2, 2026, in [`gameplay-discussion-fitted-shadow`](../../banner-corrections/gameplay-discussion-fitted-shadow/). The user asked to reuse this typography on other banners, including the repaired solid letter bottoms.

## Appearance

- Use the actual **Flipside** font from the [provided font page](https://resourceboy.com/fonts/flipside-font/), in uppercase, at its original weight. Do not substitute a similar font, add a stroke, synthesize bold, or stretch the letters.
- Use near-white `#f9f9f9` lettering. Preserve the native upper texture and silhouette. Repair the lower erosion so the bottom strokes remain solid and readable, with no fading or transparent gradient.
- Put a soft, dark `#060505` shadow behind the words. Generate it from the **finished text mask for that exact phrase**. Its extent must follow the words, with the approved small halo, and must shrink when the wording becomes shorter. Never reuse the previous phrase's shadow or add a long rectangular backing.
- Keep primary logos and other established typography separate. During an existing-banner edit, preserve every unrelated pixel, including artwork, framing, colors, canvas dimensions and logo placement.

[`style.json`](style.json) records the exact font checksum, colors, lower-stroke repair and shadow settings. The font file is supplied separately; it is not bundled here. The approved desktop preset is 2179 × 330, font size 78, visible-ink origin (65, 258). The mobile preset is 1920 × 384, font size 69, visible-ink origin (58, 320).

## Reuse

Requires Python, Pillow, NumPy and SciPy. From the repository root:

```bash
python tools/banner-templates/secondary-text/render_secondary_text.py \
  --text "Gameplay Discussion" --font /absolute/path/to/Flipside.ttf \
  --preset desktop --output-dir /absolute/path/to/banner-work

python tools/banner-templates/secondary-text/render_secondary_text.py \
  --text "Gameplay Discussion" --font /absolute/path/to/Flipside.ttf \
  --preset mobile --output-dir /absolute/path/to/banner-work
```

Replace `--text` for another banner. The renderer writes separate grayscale lettering and backing alpha masks, plus provenance. It checks the font checksum and rejects text that would clip. For a different approved layout, explicitly set `--width`, `--height`, `--font-size`, `--x` and/or `--y`; the font is never stretched or automatically made bolder. Coordinates place the top-left of the visible lettering, not the font's baseline.

The lower repair is limited to the bottom portion of each line: a 5 × 5 closing operation feeds an opacity repair starting at 66% of the visible glyph height and reaching full strength at 84%. The upper two thirds retain the native font pixels. The shadow uses a 15 × 25 maximum filter, Gaussian sigma 6, and 90% opacity, derived anew from the repaired lettering mask.

Composite the backing in the shadow color first, then the lettering in the text color. For a replacement, restore the clean source beneath the **old text and old shadow** before adding the new layers. Do not place a new label over baked-in lettering or retain leftover backing from a longer phrase. Use the original clean artwork or retained restoration masks; do not regenerate the artwork.

For responsive exports, patch each existing size independently. Resize only the required masks/patches, and export losslessly. Compare decoded before/after pixels: require zero changes outside the union of the old and new text/shadow footprints. Inspect desktop and mobile, checking solid letter bottoms, original weight, exact phrase-sized shadow and intact artwork. Set the destination link separately for the requested banner; this standard does not prescribe one shared URL.

The reusable renderer reproduces all four approved Gameplay Discussion masks exactly. The historical correction masks, production renderer and pixel audit remain the immutable visual reference.
