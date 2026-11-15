REMAINING PERSONALITY FIXES - NOVEMBER 15, 2026

This is a new correction package following the 190-card remaining-personality audit.
It supplements the earlier 45-card Frieza / Trunks / Android / Pikkon package.
The earlier 45 corrections are not duplicated here. No deployment is performed.

DOWNLOAD BOTH ZIP FILES
Remaining-Personality-Fixes-Codex-Handoff.zip contains the installer, native
sources, all 114 final WebPs, audit evidence, source scans and review previews.
Remaining-Personality-Fixes-Artwork-Assets.zip contains the retained artwork
and masks required by the native SVG sources. Extract BOTH ZIPs to the same
directory, merging their Remaining-Personality-Fixes folder. Keep its paths.
Both parts are required; the installer rejects missing assets before writing.

SCOPE
56 placement corrections: Saiyan 16, Cell 11, Cell Games 2, World Games 27.
Saiyan 184 Vegeta Hi-Tech: "Stop an energy attack." becomes "Stops an energy attack."
Saiyan 160 Goku: Arena's first two nonzero stages become 8,000 and 8,500,
matching its unchanged printed card. There are 58 unique affected card records,
57 image cards and 114 supplied lossless WebP exports.

ARTWORK POLICY
52 cards use integer horizontal translations of retained artwork. Characters,
faces, costumes, poses, linework and connected auras are not regenerated.
The usable art center lies halfway between x14 and the stage column at x813.75.
Optical balancing respects leaning, reaching and intentionally cropped poses.
Four proportional framing exceptions use the same artwork without distortion:
World Games 172 Goku: 1.25x, restoring its tighter source-card lower-leg crop.
World Games 153 Arqua: 1.18x; World Games 185 Maraikoh: 1.20x;
Cell 176 Android 16: 1.20x. These three already meet the left image edge;
proportional reframing prevents exposing a severed fin/arm edge when centering.
Narrow exposed background strips reuse existing character-free background.
They are rendered from continuous native SVG mappings; no generated artwork.
Saiyan 85 Yamcha had duplicate fingertip fragments hidden under the stages.
Those fragments were removed with adjacent empty blue background. The actual
hand and every valid fingertip are retained. No anatomical detail is invented.

QUALITY / LIMITS
Every corrected art window was compared with its retained original scan and
the before/after export. Framing exceptions were inspected at native detail.
All 114 exports preserve every pixel outside their allowed artwork/wording mask.
Fixed titles, printed stages, borders, counters, footer and other text remain
pixel-identical. Translated opaque main artwork is pixel-identical to its
retained raster, excluding edge extension, masking/antialiasing and Yamcha's
explicit fragment cleanup. The four uniform resizes necessarily resample.
Native vector elements and previous artwork correction layers are retained;
only Vegeta 184's wording and centered shield/text group are revised.
WebP lossless decoding is checked against rendered PNG pixels at both sizes.
Sizes: 1060 x 1484 preview and 2120 x 2968 download.
Cell 159's foil subject mask and exact artwork pin move with the character.
The shared Hi-Tech title-mask geometry remains fixed.
Tiny eye details remain unresolved in the glare/low-detail original scans of
Saiyan 163 Piccolo and Cell 185 Android 20. Their eyes were not redrawn, and
this package does not claim those source details are independently verified.

INSTALL INTO AN EXISTING CHECKOUT
0. Extract both ZIP parts into the same directory as described above.
1. python3 apply_fix.py /absolute/path/to/dragonball
   This is a read-only validation / dry-run by default.
2. python3 apply_fix.py /absolute/path/to/dragonball --apply
   Writes only after every file, dependency and semantic revision guard passes.
   Reapplying an already-installed package performs no writes.
3. Integrate the new audit evidence with the current repository's historical
   audit chain, run the current required checks, and inspect served previews.
   Do not rewrite earlier audit manifests or treat their old hashes as new ones.
4. Commit / publish only when instructed. This package does neither.

The installer preserves unrelated catalog changes. Stage and foil-profile
updates patch only their specific entries and coexist with the earlier package.
If a targeted card or dependency changed since the baseline, it stops with no
writes. Reconcile the newer source instead of bypassing its guards.

Canonical SVGs use retained 2x artwork. The -web-1x.svg companion uses native 1x
artwork. Existing repository source dependencies are hash-guarded. Do not
globally re-render the supplied WebPs, flatten native type, remove older repair
layers, or replace original historical sources. Supplied WebPs preserve the
published UI raster exactly; native re-renderers can differ in antialiasing.

The manifest includes export hashes, baseline hashes, transforms, retained
dependency hashes and narrow semantic changes. Correction-List.csv lists all
58 affected cards. Before/after previews and the review PDF accompany the ZIP.
