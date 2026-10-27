# Set footer logo alignment

Use visible emblem bounds when centering a set logo in the footer. The approved portrait footer's usable inner edges are y=1354.575 and y=1450.575, including line thickness. Their midpoint is **y=1402.575**. The corresponding landscape midpoint is **y=978.575**.

Android Saga uses the approved transform `translate(97.1525 1363.74375) scale(.776625)`, retaining the landscape master’s existing -424 y translation. This is 5% smaller than the prior enlarged emblem. Its visible size is 88.53525 × 77.6625 native units and its upper and lower clearances are both 9.16875. Horizontal center remains x=143.75.

Saiyan, Frieza and Trunks retain their existing emblem sizes, shapes, colors and horizontal placement. Their visible centers move from y=1406.25 to y=1402.575. Measure the retained Saiyan raster mask, Frieza's stroked paths and Trunks' paths by visible ink rather than padded SVG rectangles.

Run `python tools/align_set_footer_logo.py INPUT.svg OUTPUT.svg` on recognized existing native masters. The helper changes only the matching transform and is idempotent. It refuses unknown transforms so they can be measured rather than silently moved twice. Native footer-layer references are stored beside this document in `set-footer-layers/`.

For published raster corrections, verify the original native footer against the retained export, render the exact old/new emblem at the actual output dimensions, and patch only the combined emblem footprint with its antialiasing margin. Preserve every decoded pixel elsewhere and encode losslessly. Inspect nonmatching historical exports separately; do not overwrite an entire footer to force a template match. Refresh both display and download asset URLs after changing the files.

This alignment concerns the set emblem in the bottom-left compartment. It does not reposition typography, card numbers, rarity spheres or other footer elements.
