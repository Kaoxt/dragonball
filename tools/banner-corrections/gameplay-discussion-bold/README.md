# Gameplay Discussion: bolder Flipside

The November 2, 2026 request explicitly increases the forum caption's weight to match the stronger News / Enter the Arena treatment. This is a banner-specific exception to the regular-weight secondary-text preset.

The current Flipside masks retain their font size, position and spacing. A supersampled contour expansion adds 2 native pixels on desktop and 1.75 on mobile; original interior scratches remain visible and the lower strokes stay solid. A soft shadow is generated from the finished words using the existing fitted-shadow settings. No artwork is regenerated.

Run `python3 tools/banner-corrections/gameplay-discussion-bold/render.py` from the repository root. The renderer first reconstructs every prior published image pixel-for-pixel, then exports all eight sizes losslessly. `pixel-audit.json` records source/output hashes and verifies zero changes outside the old/new lettering and fitted shadow. Goku, the logo, framing, dimensions, banner link and page layout remain unchanged. Historical masks and exports are retained.
