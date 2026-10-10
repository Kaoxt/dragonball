# Shared personality production design

Approved October 10, 2026: blue comic burst and halftone background for heroes;
crimson/red comic burst and black halftone background for villains. The Goku
villain preview was a color demonstration only; Goku remains a Hero in production.

All 49 Saiyan Saga personalities, including high-tech variants and P1–P7, use
the same layout. Do not print HIGH TECH on the card. Preserve each card's level,
PUR, eleven power stages, number, and current rules data.

Character art is isolated on actual transparent pixels, restored with imagegen
from the original scans in ../original-personality-references. This is restored
illustration, not a claim of pixel-exact extraction. The original pose and all
visible parts should remain recognizable. Remove scenery and faded duplicate
portraits. Do not introduce an aura where the source has none.

The backgrounds use the approved darker royal blue and crimson palette.
Frame geometry is rendered separately from SVG. Titles use the established
Teko Bold 700 at 92 px with a 4 px black outline, centered at x=530. Other
typography uses Nimbus Sans Bold. Power text is 46 px at 1060×1484, with the panel expanding for long text.
The renderer uses measured glyph bounds to center the PUR label and value.
Art is framed as a closer portrait, with clear space below the title. Measure
visible alpha above 8/255 (with a two-pixel antialias margin), so invisible
extraction specks cannot shrink or offset the character. Center the silhouette
at x=428 within the artwork area, left of the power stages. Fit proportionally
to 800 pixels wide and 1.38 times the visible artwork height; lower legs may
continue behind the rules panel. Clip the art layer behind that panel so it
cannot reappear below the bottom rail. Never stretch the character.

Production output is lossless WebP. Only the 49 matching catalog image versions
are updated. No other card catalog fields are changed.

Run from repository root:

```
python tools/card-frames/render-comic-personalities.py
python tools/card-frames/verify-comic-personalities.py
```

The verification script checks integrity, dimensions, coverage, catalog scope,
text preservation and placement constraints, and renders contact sheets under
docs/previews/comic-personalities for visual inspection.
