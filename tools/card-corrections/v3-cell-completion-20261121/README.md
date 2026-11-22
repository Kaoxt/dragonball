# Cell previews and Cell Games promos/previews — November 21, 2026

This release prepares 22 additional playable cards. It has not been deployed.

| Set | Included | Remaining |
| --- | --- | --- |
| Cell Saga | PR1–PR6 | None from the audited checklist |
| Cell Games Saga | P1–P4, P6–P10 and PR1–PR7 | P5, Goku Charges: replacement artwork pending |
| World Games Saga | No changes needed | None from the audited checklist |

Cell Games P5 has reviewed source text and its original scan in this folder,
but no finished illustration, SVG, export, catalog record or permanent deck ID.
Image generation rejected the illustration request and a safer non-graphic
revision. The user has been asked whether to permit the original illustration
as a one-card exception. No exception has been assumed or applied.

## Production

The 22 native SVGs use current V3 components, outlined type and proportional
artwork placement. There are two landscape Battlegrounds and 20 portrait cards.
The artwork is redrawn against the retained original scans; it is not a scan
upscale or a pixel-identical reproduction. Small source scans limit certainty
about fine finger contours, background spectators and texture. Original scans,
source URLs, reviewed effects, CRD input and generated illustrations are retained.

Display exports are 1060×1484 (landscape 1484×1060); downloads are 2120×2968
(landscape 2968×2120). Both are lossless WebP. Illustration source dimensions
and uniform mapping matrices are recorded per card. The 2× export size does
not imply that every illustration was generated at 2× source resolution.

Titles, middle labels, rules, icons, footer emblems and rarity/number groups
remain native vector components. The reviewed printed rarity stars are retained
separately from the catalog's Promo classification. Card numbers P and PR are
distinct. Cell's Style retains the Cell-only performer restriction. Gathering
of Warriors uses the CRD Planning Step restriction. Default energy cost is 2
stages; Combat/Non-combat and removal wording use the current project terms.

## Integration and verification

The catalog adds exactly 22 cards to the previous 1,292; all previous records
and permanent deck-code positions are unchanged. Totals become Cell 216,
Cell Games 141 (142 after the pending P5) and World Games 218.

Earlier immutable audits use `tests/helpers/pre-cell-completion.js` before
the existing remaining-personality history. Do not rewrite their manifests.
`before/` contains exact compressed snapshots of the two integration files.

Verified locally:

- All 22 final cards individually viewed at native and normal reading size.
- Native title/category/footer centers and rarity gap measured; footer layout
  and power-icon alignment are idempotent; no SVG text or duplicate IDs.
- All 44 supplied exports independently re-rendered and compared pixel by
  pixel. There are zero changed pixels (`pixel-verification.json`).
- 44 card integration, page, browser, deck-code and Arena preview tests passed.
- `npm run check` passed, including Wrangler's dry run.
- `npm audit --audit-level=high` found no vulnerabilities.

The complete historical source suite and CodeQL are still required before
deployment. The local full asset checkout stalled and was cancelled; missing
old assets were not replaced, deleted or re-created to make historical tests pass.

## Publish handoff

Use the exact supplied native SVGs, linked assets and both export sizes.
Preserve all existing artwork and historical evidence. Never regenerate the
supplied WebPs while publishing. Apply the append-only catalog/deck additions,
retain the new history helper, and run the complete tests and security workflow
from a fully materialized source checkout. Follow `docs/small-deployments.md`.
Do not claim live publication until the deployment and live asset checks pass.

The builder is `tools/card-templates/v3/build_cell_completion_20261121.py`.
The independent pixel verifier is
`tools/card-templates/v3/verify_cell_completion_20261121.py`.
