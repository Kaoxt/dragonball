# Saiyan Saga 051–100 footer centering

All 50 native sources and 100 display/download files now use the approved mirrored side-group centers: set mark x211.75; complete rarity ball and number x847.25; endorsement x529.5. The existing 12.2-unit ball/number gap, vertical positions, glyph sizes and rarity stars remain unchanged.

Every published resolution was patched independently against the immutable baseline commit recorded in release.json. Only native footer transforms changed. The original and new footer renders define the moved-ink footprint, including antialiasing. Their pixel delta is applied to the existing decoded image, retaining tiny pre-existing renderer rounding. Each output is lossless and passes zero changes outside that footprint, including all artwork, backgrounds, borders, titles, middle bars and rules.

pixel-checks.json contains before/after source and image hashes, actual changed-pixel bounds, preserved-component checks, measured centers, renderer residuals and byte-idempotence results for each card. The batch’s current audit and catalog cache keys point to the new files; historical title repair records remain unchanged. The shared V3 standard is unchanged. Cards 001–050 retain their previous verified patch; no other published card is changed by this release.
