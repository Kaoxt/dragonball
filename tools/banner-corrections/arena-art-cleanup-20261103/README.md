# Enter the Arena artwork cleanup — November 3, 2026

The user requested removal of accumulated AI judder from the desktop and mobile News banner. Both illustrations were cleaned with the built-in image editor using their own current full-resolution banners as edit targets. The cleanup addresses doubled/wobbly character contours, faces, hands, armor and clothing with clean anime linework and cel shading. Desktop retains Piccolo, Vegeta and Goku; mobile retains the centered Vegeta/Goku duo. Poses, framing, colors and banner layout are retained.

The retained PNGs are the clean artwork candidates, trimmed to remove generated white letterboxing and fitted to the exact existing master dimensions. They are not the published composites: `export.cjs` preserves the existing logo and caption from each previous responsive export independently. The center columns are byte-identical after decoding, including the actual approved lettering, distress and shadow. A narrow feather joins the artwork outside those protected columns. The source background outside the protected center receives the same cleanup pass as the characters.

## Reproduce

With Node and Sharp available, run `node tools/banner-corrections/arena-art-cleanup-20261103/export.cjs` from the repository root. The eight outputs use lossless WebP, existing dimensions, and new `arena-banner-art-clean-*` URLs so cached images cannot hide the repair. The homepage change replaces only those asset filenames; media queries, image dimensions, sizing hints, alt text, height, crops and Arena destination are unchanged.

`pixel-audit.json` records input/output hashes, dimensions, byte sizes, changed pixel counts, zero changed pixels in protected center columns, and an exact decoded lossless roundtrip. Full-size desktop/mobile and the 480-pixel mobile export were inspected for clean character outlines, intact lettering and seamless center joins.

## Edit brief

Restore each supplied banner without redesigning it. Preserve exact character identities, attacking poses, expressions, clothing, scale, crop and layout; remove uneven doubled contours, lumpy forms and malformed small facial/hand/clothing marks. Use confident smooth black anime ink and clean flat Dragon Ball Super-style cel shading. Preserve the green/blue/red energy composition and the original central logo and ENTER THE ARENA caption. Do not add characters, zoom, add texture, or add sharpening halos. Desktop includes Piccolo; mobile does not.

The published files retain the old center pixels regardless of the generated candidate's lettering. Do not substitute the candidate's generated typography in future revisions.
