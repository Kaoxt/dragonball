# Power icon vertical alignment — October 22, 2026

Attack and block icons align to the visible cap band. The October 24 correction additionally measures constant infinity separately: its colon made the combined group appear centered while the infinity itself was too high. Apply the current helper to all card types and future batches.

- Center the icon's actual visible filled/stroked bounds vertically on the visible capital-letter band of its associated rule line. Never align to the full mixed-case line bounds, line box, or a padded SVG viewBox: descenders such as the y in Physical pull that center downward.
- Keep the approved icon silhouette, weight, size, orientation, gap and horizontal position. Move the existing icon as native geometry; do not replace it with a font glyph, emoji, regenerated raster, or older icon design.
- For the native outlined renderer, the first capital path supplies the visible cap band. Run `python scripts/align_power_icon.py INPUT.svg OUTPUT.svg --icon ICON_ID --line rules-line-1` after final text placement. The line must contain one outlined path per visible glyph. The helper selects the capital to the right of the icon, including when a deck-limit prefix precedes it. For other structures, measure the actual capital band after all transforms rather than guessing an offset.
- The helper measures rendered ink with Inkscape, translates only the icon, verifies the center within 0.01 native units, and preserves its shape, dimensions and horizontal placement. Re-running it must produce no further shift.
- Check attack, block and constant-power examples at normal card size. On Saiyan Saga 001–005, the previously centered swords are approximately 4.165 native units too low; this is an observed example, not a universal hard-coded shift.

Fix this in the current requested batch. The standing rule does not mean previously published cards have been changed. Publishing or expanding the repair to other existing batches requires the relevant user request.

## Constant power — October 24 correction

For infinity-plus-colon groups, move only the infinity path. Keep colon geometry and placement unchanged. Measure the shape independently, accounting for every nested SVG transform. Do not use the colon or padded group height as the infinity center. The helper recomputes the needed translation each time and does nothing once centered within 0.01 native units. Preserve shape, weight, size and horizontal position.

Existing-card corrections must preserve every decoded pixel outside the union of old/new infinity ink plus antialiasing margin. Keep current lossy-preview pixels outside that region, save the corrected preview losslessly, and verify full-resolution PNG/lossless-WebP equality. No AI redraw, contour tracing, resampling of the full card or blanket icon offset.

## Final export enforcement — October 26, 2026

Frieza the Master (Trunks #191) exposed a stale-export failure: its infinity alone needed +2.1431 native units while Bulma (Frieza #42) was already centered. The audit found 93 affected published cards (38 Saiyan and 55 Trunks); 20 Frieza examples were aligned. These numbers are audit results, not a universal offset or a claim about later releases.

Run the native alignment check after **all** text/layout operations and require a second pass with zero movement. Check the actual display and high-resolution download exports separately against the final native bounds. Never infer that published pixels are correct merely because a source or an earlier report is correct. Retain per-file before/after hashes, the native center error, idempotence result, and zero changed pixels outside the old/new infinity footprint plus antialiasing margin. Keep the colon unchanged. Bulma #42 is the visual reference for centering the infinity on adjacent capital letters.

Publication must use revised URLs for both exported sizes and must fail if either is stale, still misaligned, or lacks preservation verification. Where a user requests an audit of other cards, inspect the complete relevant catalog and distinguish corrected cards from already aligned examples.
