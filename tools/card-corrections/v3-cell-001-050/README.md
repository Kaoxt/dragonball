# Cell Saga 001–050 V3

This release publishes all fifty cards with current native V3 text, mirrored footer groups and lossless 1060×1484 / 2120×2968 WebP exports. The existing catalog wording and game values remain unchanged; only these fifty template versions and image revision URLs change.

Retained illustrations keep their exact source bytes and image geometry. The common V3 artwork-window mapping introduces no additional zoom. Cards 20, 36 and 42 retain earlier approved artwork corrections. Dende Dragon Balls 1 and 2 retain the approved full-art exception and identity mapping; their approval and pose reference are under `approved-dende/`.

Two corrections are composed as native SVG layers: #1 removes isolated unsupported background flecks through 58 tiny circles; #47 restores the lower fist and wrist beneath the unchanged foreground tail. The generated repair assets are restricted to their documented masks. Independent renders verify zero changed pixels outside the repair footprint at each export size.

`cards.json` and `crd-review.json` retain original wording and the supplied Expanded CRD review. Original scans are in `originals/`. Artwork observations and unresolved scan limitations are recorded individually in `artwork-review.json`; `prior-artwork-review.json` preserves the earlier unfinished-session observations. `retained-art-verification.json` compares source raster bytes and SVG image attributes. Archive hashes are in `source-provenance.json`.

`audit.json` and `per-card/` contain measured geometry and export hashes. `render-verification.json` independently rerenders all fifty native sources, verifies both decoded exports, tests every rules line for visible ink, checks title/brush clearance and verifies the repair masks. Duplicate rules definitions are removed before composition so no new rules line can resolve to a hidden donor definition.

Rebuild with `tools/card-templates/v3/build_cell_001_050.py --first <extracted-001-010> --next-batch <extracted-011-060>`. Verify with `python3 tools/card-templates/v3/verify_cell_001_050.py` and `node --test tests/card-v3-cell-001-050.test.js`. Rendering requires Inkscape, Pillow, lxml, NumPy and SciPy, plus the checked-in V3 fonts and helpers.
