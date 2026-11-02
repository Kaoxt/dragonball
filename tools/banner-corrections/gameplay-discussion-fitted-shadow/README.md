# Gameplay Discussion: solid lower lettering and fitted shadow

The Forums banner again reads GAMEPLAY DISCUSSION and links to the exact requested category URL:
`https://dragonballocg.com/forums/?design=v2#list?category=1`.

It uses the actual Flipside font at the existing 78 px desktop and 69 px mobile sizes. Only the faded lower erosion is repaired: small gaps are closed and lower-stroke opacity restored. The upper two thirds retain the native font pixels and texture, without synthetic bold or global dilation. The soft shadow is derived from this exact phrase with restrained padding; it no longer extends across the empty area left by a shorter caption.

Every image pixel outside the union of the old/new lettering and shadow footprints is unchanged. Goku, the logo, canvas size, artwork framing, page layout, and unrelated markup are preserved. Each of the eight responsive exports is independently lossless and audited. The renderer first reconstructs the prior published Learn The Rules image and requires a complete pixel match before changing the text/shadow layers.

Run `python tools/banner-corrections/gameplay-discussion-fitted-shadow/render.py` from the repository root to reproduce the exports and audit from the retained alpha masks. Requires Pillow and NumPy. `prepare_lettering.py /absolute/path/to/Flipside.ttf` recreates the native text and fitted-shadow masks, requiring SciPy as well. Font provenance is retained without redistributing the font file. Historical sources and images remain untouched.
