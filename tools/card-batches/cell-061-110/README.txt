CELL SAGA 061–110

50 cards continuing the approved Dragon Ball OCG set.

Cards package: PNG and lossless WebP at 2120 × 2968; display WebP at
1060 × 1484; five preview sheets; catalog entries and review notes.

Editable package: 50 native SVG masters, retained frame templates, separate
artwork, fonts and native glyph assets, original reference scans, card data,
build scripts and per-card verification reports.

Clothing, accessories, poses and expressions were compared with the original
cards. Clothing details are recorded individually in clothing-review.txt.
Corrections include the utensils on #067, Android 19's ivory chest fastening
on #098 and Bulma's open smile on #109. Dende Dragon Balls 3–5 continue the
already-approved Dende summoning artwork used by Dragon Balls 1 and 2.

All 13 personalities retain their original printed stage values. Android 19's
three cards have 13 values including zero; all are retained in the artwork
and Arena charts. Bulma's printed 2,100 value is preserved.

Typography follows the October 28 retained vector standards. All titles are
Teko SemiBold at 77.43142144638405, centered by visible bounds. Power text is
Barlow Condensed Bold at 49 with the approved spacing. Hero/Villain labels
use the fixed retained native outlines. Native glyphs and both export sizes
were measured; PNG/high-resolution WebP decode identically. Display WebP is
also lossless after the 50% downsample. Actual final artwork comparisons and
high-resolution lettering crops were reviewed.

These are initial exports, not typography repairs. The release audit uses
equal before/after hashes as the initial baseline and separately records
native-source checks, glyph measurements and raster comparisons.

Rules use the supplied Expanded CRD and established OCG wording. #065 uses
the corrected Blue Flip title; #077 includes defender timing; #100 uses its
once-per-turn timing; #107 is a Setup. #106 retains the original phrase
"Combat cards": the original and supplied CRD did not unambiguously resolve
whether this means Events only or the broader family. The semantic review
is recorded rather than inventing a narrower or broader effect.

Rebuild from the editable package with Python 3, Pillow, NumPy, SciPy,
fontTools, lxml and Inkscape:
  python source/build.py
  python source/verify_release.py
Use --only NUMBER with build.py for a single card. Templates are already
prepared; prepare_templates.py is the historical assembly recipe and does
not need to run. Generated-artwork JSON files preserve generation provenance;
the portable current artwork is in source/artwork/ and embedded in masters/.

Validation: 139 site/game tests, 6 card-type tests, and the 4 unchanged
typography/category tests scoped to these 50 additions passed. The 799 prior
catalog entries and their audit records were preserved. Existing raster
assets were not downloaded en masse or re-audited in this limited checkout.
