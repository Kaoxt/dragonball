# Learn The Rules banner

The Forums banner reads LEARN THE RULES and links to `/rulebook/`. The lettering is rendered directly with the actual Flipside.ttf supplied at https://resourceboy.com/fonts/flipside-font/, at the earlier 78 px desktop and 69 px mobile font sizes. No stroke, dilation, synthetic bold, substituted font, or other glyph-shape modification is applied. The font's native worn texture is retained.

The latest broad soft shadow is retained without any change. Goku, the logo, dimensions, placement, layout, and every image pixel outside the old/new lettering and its antialias footprint remain identical to the published arena-match version. Each of the eight lossless exports is checked independently. The renderer also reconstructs the prior published image and requires a complete pixel match before substituting the new lettering layer.

Run `python tools/banner-corrections/learn-the-rules-banner/render.py` from the repository root to reproduce the eight exports from the retained native alpha masks. Requires Pillow and NumPy. `prepare_lettering.py /absolute/path/to/Flipside.ttf` recreates the masks from the actual font; its checksum and source URL are recorded in `lettering-provenance.json`. The font itself is not redistributed. Original images and historical audits remain unchanged.
