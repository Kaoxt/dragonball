# Forums caption texture and shadow correction

Correct the too-clean GAMEPLAY DISCUSSION lettering to match the worn Flipside finish in the supplied ENTER THE ARENA reference. Retain the existing glyph bounds, baseline, size, and solid bottom edges. The texture uses the original Flipside glyph wear, preserving fine fractures and softening tiny speckles; no bottom fade is applied.

Remove the hard leftover BUILD YOUR DECK shadow silhouettes from the prior title swap. Use localized imagegen background restoration only inside retained feathered caption/shadow masks, then a subtle soft shadow following the current lettering. The mobile character sleeve fragment is explicitly protected. Each original responsive image is patched independently and saved losslessly.

Run `python tools/banner-corrections/gameplay-discussion-texture-shadow/render.py` to reproduce all eight exports and `pixel-audit.json`. Requires Pillow and NumPy. Original assets and the previous source/audit are retained untouched. Every decoded pixel outside the local caption/shadow footprint, including Goku and the logo, is preserved. Banner geometry, placement and destination are unchanged.
