# Saiyan Saga 001–050 — V3 release review

All 50 cards have native V3 sources, a 1060×1484 display WebP and a lossless 2120×2968 download. Every final illustration was visually inspected individually, enlarged and at normal size. All 100 exports decode, match their PNG-derived pixels and are covered by exact hashes and catalog cache keys. The release has no missing illustrations.

The artwork is retained from the recently updated source packages. Three confirmed discrepancies against available originals were corrected with native clipped artwork patches: #004's navy undershirt, #008's viewer-left gaze, and #036's complete white boot tip. The correction records include the imagegen prompts, footprints and zero-change-outside-mask verification. Existing original illustration bytes remain separate from the patch assets.

Framing improvements retain #017's hanging fist, #027's full head and #042's hanging fist. #045's lower fist is more visible while preserving the mask crown. No horizontal crop or global character zoom was introduced. #015/#016 retain the separately approved full-art Dragon Ball treatment and correct one/two-star large balls.

The archived source packages include actual original scans for #001–005, #007–010 and #036, plus the user-provided #006 artwork reference. Other original URLs were inaccessible during this pass. Older redraws were not misidentified as originals. Detailed original fidelity for those cards remains unverified; the review establishes source retention, coherent rendering and absence of newly missing artwork, not a blanket original-fidelity pass.

Remaining inherited limitations are recorded explicitly: #031's face/mouth edge crop, #038's ambiguous hand overlap, #041's lowest shoe-tip crop (framing protects Piccolo's antenna), and #045's lowest fist/source-antenna crop. No speculative anatomy or costume edits were made to these. Fine facial detail in low-resolution originals is also marked unresolved where appropriate.

`audit.json` contains native visible bounds, raster dependency hashes, source provenance and both final export hashes. The two `review-*.json` files contain card-by-card artwork evidence and final reviewed PNG/WebP hashes. Paths beginning `sources/` describe archived input-package locations; final editable sources and all runtime dependencies are retained under `tools/card-templates/v3/`.

Validation: `node --test tests/card-v3.test.js`; JavaScript syntax checks for the catalog and retained V2 typography test. The full application suite was not run in the asset-only working checkout. Existing V2 tests remain applicable to unmigrated cards; V3 has its own measured geometry and complete-frame export checks, rather than the old isolated-title pixel-mask contract.
