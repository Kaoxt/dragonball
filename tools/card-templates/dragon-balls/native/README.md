# Native Dragon Ball production

This source uses the approved October 17 black textured title, category and footer panels, the Combat footer geometry, and seven native category orbs. Retains Shenron at the outside edges. The two-star sphere uses the earlier retained illustration clipped into its approved placement.

Render with:

```sh
python scripts/render.py --cards references/cards-015-016.json --output /absolute/output
```

Requires Pillow, fontTools and Inkscape. Outputs outlined SVG, 2120 × 2968 PNG and lossless WebP, 1060 × 1484 quality-92 WebP previews, plus geometry and pixel-equality checks. Raster artwork is retained; larger exports do not invent illustration detail.
