# Forums banner: Gameplay Discussion

Replace only the baked-in BUILD YOUR DECK title. Original desktop/mobile artwork is retained in public/assets/deck-banner-goku-*.webp. Each target resolution is patched independently and saved losslessly, preserving every decoded pixel outside the union of old/new lettering, bevel, shadow and antialias footprints. Goku and the logo have zero changed pixels.

The replacement uses the existing Flipside typeface at 78 px (desktop) and 69 px (mobile), with solid lower glyphs. Retained lettering alpha masks avoid regenerating typography. Localized imagegen background patches restore only areas hidden by the old title. All banner geometry, responsive crops, and the existing destination remain unchanged.

Run `python tools/banner-corrections/gameplay-discussion/render.py` to reproduce and verify all eight exports. Requires Pillow, NumPy. `pixel-audit.json` records dimensions, hashes and zero changes outside the allowed footprint.
