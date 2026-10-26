# Infinity alignment correction — October 26, 2026

The constant-power infinity was visibly high on Frieza the Master (Trunks #191). The adjacent capital A has a native vertical center of 1032.04; the infinity alone was centered at 1029.8969. Its native path moves down 2.1431 units. The colon stays fixed. Bulma (Frieza #42) already follows the approved alignment.

The full catalog audit inspected 603 published display images and found 113 constant-power icons. Of those, 38 Saiyan Saga and 55 Trunks Saga icons needed correction; 20 Frieza Saga icons were already centered. Every affected display and high-resolution download receives its individually measured adjustment.

## Required production rule

- Measure the visible infinity path independently of its colon, using the final native SVG with every parent transform applied.
- Center its ink on the visible capital-letter band immediately to its right. Exclude descenders, line-box padding, punctuation, and any deck-limit prefix before the icon.
- Preserve the approved shape, weight, size, orientation, horizontal position, colon, text, and artwork. Translate only the infinity path. Do not apply a blanket numerical offset.
- Run `align_power_icon.py` after the final text/layout operation. Require a center error no greater than 0.01 native units and a second pass with no movement.
- Export only after that check. Inspect the actual display image and high-resolution download separately; a corrected source does not prove an older export was replaced. The exported icon must agree with the measured native geometry and Bulma #42's letter-centered treatment.
- For a repair to an existing card, composite the native correction only within the union of old/new infinity ink and a two-output-pixel antialiasing margin. Require zero changed decoded pixels elsewhere. Save WebP losslessly and verify decoded pixel equality.
- Before publishing, verify that each affected catalog URL points to its new display/download revision. Fail the release if either image is stale, any icon is still high, or a source, pixel-preservation, or idempotence check fails.

`native-symbols/` retains each corrected editable infinity with its original nested transforms. These are symbol patches, not replacement full-card masters; apply the alignment helper to the latest full master so prior art and layout corrections remain intact. `manifest.json` records native bounds, corrections and export hashes. `catalog-audit.json` records the entire catalog scan and unchanged Frieza examples.

Rendering used native SVG geometry, not generated or traced artwork. No card wording, numbers, power effects, portraits, or other layout elements changed.
