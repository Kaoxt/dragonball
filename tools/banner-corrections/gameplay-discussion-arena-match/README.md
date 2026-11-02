# Gameplay Discussion: Arena lettering match

Completes the requested heavier Flipside caption and broader soft dark backing. The established glyph masks are made taller and their strokes thickened; the wear field is sampled from the approved Arena caption. The bottom edges remain solid. Text stays at the bottom left. The shadow spans the words with a feathered, letter-following edge.

This is a native layer revision: no character or background art is regenerated. It reuses the previously approved clean-background patches and caption masks. Each of the eight existing responsive images is patched independently and saved losslessly. The mobile sleeve fragment remains explicitly protected. `pixel-audit.json` records the original and revised hashes, dimensions, and zero changed pixels outside the caption/shadow area, including Goku and the logo.

Run `python tools/banner-corrections/gameplay-discussion-arena-match/render.py` from the repository root to reproduce the retained masks and eight exports. Requires Pillow, NumPy and SciPy. Original assets and historical audits are retained. The Forums HTML switches only the eight image URLs; layout, dimensions, links and navigation are unchanged.
