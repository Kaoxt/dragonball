CELL SAGA 111–160

49 completed cards: #111–156 and #158–160.
#157 Z Warriors Gather awaits user-supplied replacement artwork.
Requested replacement: 2054 × 1426 PNG, landscape, artwork only.
Preserve the original characters, arrangement, poses and clothing; the native
card frame, title, category, rules, rarity and footer are added separately.
The original #157 scan is retained with the editable package.

Cards package: 49 PNG and lossless WebP files at 2120 × 2968, 49 display
WebP files at 1060 × 1484, five preview sheets and review notes.
Editable package: 49 native SVG masters, prepared frame templates, separate
artwork, fonts, vector assets, all 50 original reference scans, card data,
build scripts and actual export verification reports.

Clothing, accessories, poses and expressions were compared individually with
the original scans. See source/clothing-review.txt (or clothing-review.txt in
the cards archive). Corrections include Chi-Chi's ochre sash/cuffs, Trunks'
ponytail, Goku's orange gi, Krillin's boots, intact Android 18 denim and the
extra arm in Red Feint. Dende Dragon Balls 6 and 7 continue the approved
shared Dende summoning artwork, with native star counts distinguishing them.

All 13 personalities preserve the printed power-stage values, including zero.
The same values are included in the site's Arena power charts. Level and PUR
numerals use the retained squared italic family; the new 5 path was recovered
from the official FB11-121 reference, retained in source/assets/.

Rules use the original scans, supplied Expanded CRD and current OCG wording.
Card-specific CRD notes remain in source/cards.json. Notable checks include
Stunned, Run Away, Saiyan Style Mastery, Orange Haulting Drill, Namekian Energy
Focus and Saiyan Rapid Fire. Piccolo #132 uses the bottom 3 discard cards;
Android 18 #133 uses AT +6; Vegeta #159 uses AT +9. Raw OCR is explicitly
unverified; the original scans remain the source for printed wording.

Titles use Teko SemiBold at 77.43142144638405 native units, visibly centered
at y72. Power text uses Barlow Condensed Bold at 49. Personality categories
use the retained compact native Hero/Villain outlines. Both export sizes were
measured against native glyphs; all 98 files passed. PNG and high-resolution
WebP decode identically. Display WebP is lossless after the 50% downsample.
The audits record initial-publication baselines, not historical repair claims.

Recovery retained 34 completed cards byte-for-byte. Thirteen missing cards
were rebuilt, and #136/#160 were rendered again with the recovered native 5.
The editable masters and all artwork were restored from retained sources.

Validation: 157 site/game tests passed (the practice-image test was rerun
successfully after restoring its sparse-checkout fixtures); 6 card-type tests
and the 4 unchanged typography/category tests scoped to this batch passed.
The prior 849 catalog records and their audit objects are preserved.
Existing raster assets outside this batch were not re-audited locally.

Rebuild with Python 3, Pillow, NumPy, SciPy, fontTools, lxml and Inkscape:
  python source/build.py
  python source/verify_release.py
Use --only NUMBER with build.py for individual cards. Templates are already
prepared. #157 remains excluded until its artwork is reviewed and its data
record is switched to publish=true. The publication helper additionally
requires the website checkout at ../dragonball-resume and is a one-time
append operation; it must not be rerun against an already-published catalog.
