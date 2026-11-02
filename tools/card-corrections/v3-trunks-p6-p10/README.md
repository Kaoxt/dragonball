# Trunks Saga V3 completion: P6–P10

The five remaining promos complete the 210-card Trunks catalog: 1–200 plus P1–P10. They use the existing V3 native Combat/Setup frame, fixed category outlines, two-star promo balls verified from the scans, mirrored footer centers and lossless 1060×1484 / 2120×2968 WebP exports. The other 894 catalog records are unchanged.

Original printed text, the supplied Expanded CRD check, corrected effects and final wording are retained separately. Showdown prohibits every use of an Ally, including taking over Combat, paying costs, powers and redirected damage. The existing display wording already expresses the broad prohibition and is retained.

P6 and P10 receive masked sky corrections. P8 restores the long-sleeved Trunks jacket and Goku's Yardrat outfit and removes excess clouds; the original face and sword/raised-hand cores remain protected in the coherent corrected illustration. P9 restores the small sweat mark and pale backdrop. P7 retains its original modern illustration. `artwork-review.json` records the actual display/download review and the unresolved microdetails of the small printed scans; these limitations are not fidelity passes.

Rebuild with `python3 tools/card-templates/v3/build_trunks_p6_p10.py --retained <extracted-source>`. The source archive identity and hashes are in `source-provenance.json`. Run `verify_trunks_p6_p10.py`, `verify_trunks_p6_p10_repairs.py`, and `node --test tests/card-v3-trunks-p6-p10.test.js`. The independent render checks verify title-brush clearance, native references, lossless decoded-pixel equality and zero changes outside the native repair masks plus antialias footprint.
