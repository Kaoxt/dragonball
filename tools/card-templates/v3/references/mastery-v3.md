# Approved Mastery V3 master

Use the retained `Mastery-Master-V3.svg`, approved November 1, 2026 after the user's side-border review and shared-footer alignment request. Copy it into a fresh card workspace. The retained example is Red Style Mastery, Trunks Saga #144, with three upright rarity stars in a triangular arrangement. Retain its existing artwork for revisions; verify original card data and CRD independently for new cards. This approval does not publish or migrate website cards.

## Family geometry

- Keep the 1060 × 1484 canvas and 2120 × 2968 lossless export.
- Keep the shared title, rules box and footer. The pointed art path is `M16 146H1043V600L529.5 852L16 600Z`; retain the original thin art rails and diagonal red accents.
- Keep the compact dark Mastery brush at bounds `(249.5,868,560,81)`. The uppercase Michroma label uses the shared size, weight and tracking, centered at `(529.5,908.5)`.
- Keep the enlarged native Red emblem at `translate(64.36 745) scale(1.55)`. For other styles change the actual emblem and palette deliberately, preserving the approved family composition.
- Preserve original image bytes, transforms, crop and full-card red texture. Keep the faded Shenron head and coils as retained layers; do not flatten or regenerate the card.

## Approved inset sides and continuous surround

Use the same dark shadow as the first path in `v2-mastery-gt-offset-backing`, beneath the diagonal red accents: stroke `#08090e`, width `11`, stroke opacity `0.5`, miter joins, no fill. Keep the side paths `M36.5 610.06037V953.4L48 965` and `M1022.5 610.06037V952.4L1010 965`. Retain the adjoining warm dark `#180a0e` paint tapers at `.40` and `.22` opacity.

The Shenron field must fill to the sides with no exposed gap. Its opaque perimeter mask follows `M36.5 610.06037L529.5 852L1022.5 610.06037V952.4L1010 965H48L36.5 953.4Z`. Preserve internal artistic fades without restoring a perimeter fade. Do not restore the rejected dark-gray metal bands, silver inner/outer side rails, dotted lines or side gaps. Do not change the approved diagonal art rails while modifying the sides.

## Shared footer and validation

Keep visible set-logo center x211.75 and complete rarity-ball-plus-number center x847.25, mirrored around the endorsement at x529.5. Content center y1409.5; retain sizes, star positions and the 12.2-unit ball-to-number gap. Use `scripts/footer_spacing.py` after card data is filled; pass `--normalize-gap` only after replacing a number or rebuilding a footer group. Require an unchanged second application.

Render and inspect normal and full-size exports. Require PNG/lossless-WebP pixel equality. For localized changes compare unchanged native groups and image payloads, then require pixel changes to stay within the edited elements' old/new footprints. The adoption check is retained in `mastery-v3-verification.json`; its footer-only change left all other pixels unchanged.

## Resolve the retained native source

The approved Mastery source is saved as `Mastery-V3-Master-Source.zip` in the user's Library (library_file_id `libfile_62b4597af7848191b5da9400fc07b349`, approved version 13, file_id `file_00000000aef481f6b45e33fa9ab0981e`). Use the Library skill to materialize this exact approved source. Extract `Mastery-V3-Master/Mastery-Master-V3.svg` into a fresh working folder. The archive also retains fonts, rebuild scripts, native source dependencies, full-size PNG, lossless WebP and validation. Do not substitute an older Mastery layout or a raster preview.

Verify the extracted SVG SHA-256 is `10948151b2cb82fa190ec88cdf52e8ab8db469acf4c3c7baaf13096f1a17a78c` before making a new working copy. If the source is inaccessible or differs, do not invent approval or reconstruct the card; resolve the retained approved version first. Use the bundled V3 footer/text/icon helpers on the working copy as needed.

The full-size preview is `Red-Style-Mastery-V3-Preview.png`, library_file_id `libfile_32245f9488948191bd3dea6143adbd6b`, approved version 13. Native artwork and linework must remain unchanged during footer or layout-only fixes; use image generation only for an explicit isolated artwork request.
