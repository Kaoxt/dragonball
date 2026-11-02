# Hero middle-bar blue — approved November 2, 2026

Use the approved reference blue for every future V3 Hero Personality, including Hero Hi-Tech cards. This supersedes the saturated solid `#0058dc` paint only; retain the Villain dark crimson `#a61122`.

In `shared-category-material`, set the native rectangle fill to `url(#hero-reference-blue)`. Define that linear gradient in local material coordinates with `gradientUnits="userSpaceOnUse"`, x1=0, y1=0, x2=0, y2=100. Use `#258bc9` at offset 0 and `#15639d` at offset 1. Retain the group's `translate(0 852) scale(1 1.13)`, neutral grain at opacity .55, existing genuine alpha mask, contours, and applicable Hi-Tech backing. Do not flatten the texture or repaint the surrounding background.

Use `scripts/personality_middle_v3.py` when composing Personality cards; it applies this gradient to Heroes and preserves the separate Villain treatment. Require an unchanged second application. The native `masters/Personality-Master-V3.svg` contains the approved gradient and short HERO label.

Keep every other component unchanged: HERO paths and alignment, PUR number/brush, title/LEVEL, artwork, stages, borders, blue power-box corner decals, rules and footer. For existing-image edits, patch each export size independently and require zero changed pixels outside the middle paint. This main-template update does not migrate or publish existing website cards.

Approved source preview: `Personality-Hero-V3-Reference-Blue-Source.zip`, Library ID `libfile_859bf85402308191b614245ed5312796`. Approved PNG: `libfile_b94c10ca04e08191ae8a43aee90bf0b0`. The source is retained natively in this package; the Library items record approval provenance.
