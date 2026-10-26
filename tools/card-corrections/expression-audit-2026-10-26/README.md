# Original-expression corrections — October 26, 2026

This batch corrects the nine confirmed expression mismatches from the 603-card review. The 125 unresolved comparisons remain unresolved; they were not changed by this batch.

Each card directory retains a transparent expression-only patch and the original face reference. `manifest.json` records the exact original reference, before/after image hashes, patch placement, changed-pixel counts, and zero changed pixels outside the allowed facial footprint for both the display and full-size download.

The full card was not regenerated. Image generation was used only to obtain the corrected facial feature. The accepted patch was aligned, composited through a compact feathered mask, and exported losslessly into the retained card images. All nine final comparisons were checked against the original at enlarged and normal card size.

When regenerating one of these cards from its matching retained native artwork, apply its patch after layout and before export:

```sh
python tools/card-corrections/expression-audit-2026-10-26/apply_native_patch.py CARD_ID INPUT.svg OUTPUT.svg
```

Use only a native source whose artwork and coordinates match the reviewed version. Check the existing card ID, title, canvas and artwork before applying. The helper preserves native elements and adds or replaces a single illustration patch; repeated application must not duplicate it. Do not apply these coordinates to a newly posed or differently cropped illustration.

For future production, follow `docs/facial-expression-fidelity.md`. Keep identification, correction, visual acceptance and live verification as separate statuses.
