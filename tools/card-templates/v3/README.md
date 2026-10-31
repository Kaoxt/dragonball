# Dragon Ball OCG Master Templates V3

Saiyan Saga 001–150 use the approved native SVG brush-theme system. The released batches use retained site illustrations with localized corrections; Earth Dragon Ball cards use approved full-art V3 adaptations. The retained V1/V2 sources remain independent.

Use `references/version-3-standard.md` and the inherited artwork, facial-expression, anatomy, wording and icon references before editing. The title center is (529.5,79), middle label center (529.5,908.5), and footer content center y1409.5. Rules use outlined Barlow Condensed Bold49 with natural spacing. V2 typography finalizers must not run on these files.

`saiyan-001-050/` contains editable native SVGs. `assets/` contains deduplicated, content-addressed illustration and decorative raster layers. Keep relative paths intact. Text, symbols, frame rails and clipping contours remain native paths. Raster art and grain are intentionally raster; a vector template does not mean autotracing illustrations.

The continuous recovered V3 frame texture replaces the historical masked full-card backing. Retained native palette filters preserve Orange, Red, Blue, Saiyan and Freestyle themes. Brush ends use genuine transparency. No tiled strips, donor-card fragments or opaque rectangular seam patches are used. Title and footer charcoal are shared across families. Only Personality and Dragon Ball middle bars are colored.

Localized artwork corrections are limited to #004's undershirt, #008's gaze, and #036's boot. The original illustration bytes remain embedded as a separate layer beneath native clipped patches. Per-card review records distinguish actual original comparisons from retained-source review and explicitly record unavailable originals and inherited crop limitations.

To render a card, run Inkscape against its SVG at 2120px width. Validate the PNG before encoding the lossless full-size WebP; create the 1060×1484 display image from that final PNG. Verify outlined-text bounds and run `scripts/align_power_icon.py` twice, requiring an unchanged second run. Do not replace typography with generated text or regenerate complete cards for a localized artwork repair.

Release evidence is in `../../card-corrections/v3-saiyan-001-050/`. `tests/card-v3.test.js` checks the native sources, all raster dependencies, both export hashes, catalog cache keys and measured alignment. Original source files and historical V2 audits are retained for provenance; they are not evidence that an inaccessible original has been visually verified.

## Saiyan 051–100 release

The second batch includes 6 Personalities, 3 Dragon Balls and 41 Combat/Setup/Event cards. Native sources are in `saiyan-051-100/`; per-card data, actual-original visual review, localized corrections, and export verification are in `../../card-corrections/v3-saiyan-051-100/`. #91 retains the original 4-stage cost and 7-life-card damage, with banishment after use. Character-source bytes and the earlier Yamcha expression and Tien placement corrections remain separate native layers. New side extensions preserve source-visible hands, headwear and footwear. The composite viewBox must be mapped into the full V3 artwork window before rendering. The batch builder isolates font objects between render processes.

## Saiyan 101–150 release

The third batch contains 4 Personalities, 3 Setups, 4 Events, 12 Combat cards and 27 Drills. Native sources are in `saiyan-101-150/`; original scans, current Expanded CRD text, per-card visual notes, localized edge corrections and measured export evidence are in `../../card-corrections/v3-saiyan-101-150/`. #105 retains banishment as an attack cost. Full-height Personality artwork is centered left of the stage column using background continuation; native retained image layers protect the approved faces, poses and costumes. Cards with continuous damage reduction use infinity, while actual attack blocks use the shield. Three-digit footer numbers retain the shared left edge.
