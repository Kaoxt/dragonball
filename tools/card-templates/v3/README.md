# Dragon Ball OCG Master Templates V3

Saiyan Saga 001–050 use the approved native SVG brush-theme system. The 48 Combat/Setup cards reuse the recent site illustrations; Earth Dragon Balls 1 and 2 use the approved full-art V3 adaptations. The retained V1/V2 sources remain independent.

Use `references/version-3-standard.md` and the inherited artwork, facial-expression, anatomy, wording and icon references before editing. The title center is (529.5,79), middle label center (529.5,908.5), and footer content center y1409.5. Rules use outlined Barlow Condensed Bold49 with natural spacing. V2 typography finalizers must not run on these files.

`saiyan-001-050/` contains editable native SVGs. `assets/` contains deduplicated, content-addressed illustration and decorative raster layers. Keep relative paths intact. Text, symbols, frame rails and clipping contours remain native paths. Raster art and grain are intentionally raster; a vector template does not mean autotracing illustrations.

The continuous recovered V3 frame texture replaces the historical masked full-card backing. Retained native palette filters preserve Orange, Red, Blue, Saiyan and Freestyle themes. Brush ends use genuine transparency. No tiled strips, donor-card fragments or opaque rectangular seam patches are used. Title and footer charcoal are shared across families. Only Personality and Dragon Ball middle bars are colored.

Localized artwork corrections are limited to #004's undershirt, #008's gaze, and #036's boot. The original illustration bytes remain embedded as a separate layer beneath native clipped patches. Per-card review records distinguish actual original comparisons from retained-source review and explicitly record unavailable originals and inherited crop limitations.

To render a card, run Inkscape against its SVG at 2120px width. Validate the PNG before encoding the lossless full-size WebP; create the 1060×1484 display image from that final PNG. Verify outlined-text bounds and run `scripts/align_power_icon.py` twice, requiring an unchanged second run. Do not replace typography with generated text or regenerate complete cards for a localized artwork repair.

Release evidence is in `../../card-corrections/v3-saiyan-001-050/`. `tests/card-v3.test.js` checks the native sources, all raster dependencies, both export hashes, catalog cache keys and measured alignment. Original source files and historical V2 audits are retained for provenance; they are not evidence that an inaccessible original has been visually verified.
