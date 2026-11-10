# Saiyan Tokui Waza stroke correction

All 70 current Saiyan-style cards retain 緑 and its original paths, color,
position, scale, rounded caps, dark outline and smoky backing. Only the green
group's `stroke-width` changes from `7.69230769` to `6.73076922875` (12.5%
thinner). At the standard placement this is approximately 11.21 → 9.81 native
pixels, matching the approximately 9.8-pixel typical Red stroke in the reviewed
comparison. Red uses tapered shapes, so this is a visual-weight match rather
than a claim that every Red stroke has one exact width.

The two Mastery symbols retain their existing enlargement. World Games #34 is
included. No other style changes. Current donors, including Saiyan #18, carry
the correction for future composition; `scripts/saiyan_symbol_weight.py`
provides the idempotent native helper when choosing a different retained donor.

## Preservation and reproduction

`release.json` records one reversible opening-tag replacement per native SVG,
before/after hashes and independent checks for all 140 existing exports.
Display and download images are patched separately using the old/new native
render delta. All decoded pixels outside that delta remain exactly unchanged;
WebP is lossless. The permitted delta covers only green stroke edges, including
antialiasing and the existing display downsampling footprint. The unchanged
outline preserves the logo's total size. Text, artwork and borders are retained.

Run from the repository root:

```sh
python3 tools/card-templates/v3/patch_saiyan_symbol_weight.py /tmp/saiyan-weight --workers 4 --apply
node --test tests/card-saiyan-stroke-weight.test.js
```

With the release present, repeating the repair verifies hashes, URL revisions
and idempotence without changing any file. Earlier production and correction
audits remain immutable; `tests/helpers/saiyan-stroke-history.js` validates the
new files and reconstructs the preceding native state for historical checks.
The World Games and earlier Namekian audit chains explicitly pass through it.
