# Cell Saga Hi-Tech 191–200

This release adds the ten user-supplied Level 3 Hi-Tech cards from
`Cell-Saga-Hi-Tech-Tight-Crop-Drafts.zip`, authorized for publication on
November 14, 2026. All ten were absent from the baseline catalog. The package's
instruction to replace only Goku #191 describes its final artwork revision;
it does not imply that the other nine cards were already published.

The exact native SVGs are in `tools/card-templates/v3/cell-191-200/`, with their
unchanged relative references to the shared `../assets/` directory. The twenty
supplied lossless WebPs are copied byte-for-byte to the public display and
download paths. No illustration, text, color, crop or geometry was altered.
Regular uses these unfoiled images; Foil uses the existing dynamic treatment.

`audit.json` maps each retained source, linked asset, original scan and export
to its actual repository path and checksum. `cards.json` records the catalog
values. Level, PUR, all stages and effects were checked against the ten original
scans. `rules-review.json` records the retained Expanded CRD review. There are
170 Cell Saga cards after this addition; #161–190 are outside this release.

The original package manifest, checksum inventory, prompts, artwork sources,
references, contact sheets and reviews are retained unchanged in `package/`.
Their old draft/unpublished labels and historical source paths are provenance,
not current deployment status. In particular, some manifest source paths for
#192–200 predate the package's `native/` layout, and #191 retains an older
`data-production-status` attribute. Use the normalized paths in `audit.json`.
The original ZIP checksum is recorded in `release.json`; duplicate PNG renders
are not added to the repository. Their original hashes remain in the inventory
and audit. The selected Goku colors and Gohan face repair are preserved.

The independent Inkscape verification renders the retained sources at
2120 × 2968 and downsamples with Lanczos to 1060 × 1484, matching the package's
export method. It compares every decoded pixel of both supplied WebPs without
rewriting them:

```sh
python3 tools/card-templates/v3/verify_cell_191_200.py --work /tmp/cell-hi-tech-verify
node --test tests/card-v3-cell-191-200.test.js
```

The ten permanent deck IDs are appended, and Arena charts run from zero to the
highest printed stage. Tests preserve all 1,199 earlier catalog records and
417 prior permanent deck positions. Historical audits retain their reviewed
membership through `tests/helpers/pre-cell-hi-tech-catalog.js`; the new release
tests exercise the actual current catalog, routes and deck exports separately.
