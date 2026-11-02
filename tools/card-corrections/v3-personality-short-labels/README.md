# V3 Personality short labels — November 2, 2026

All 134 current V3 Personalities use the fixed native HERO or VILLAIN label: 49 Saiyan, 24 Frieza and 61 Trunks, including Hi-Tech. Both repository Personality masters and the shared label helper use the same components. Gameplay category data remains unchanged.

The existing Michroma 38.4 lettering, four-unit tracking, weight and visible center (529.5, 908.5) are retained. Only the old/new label ink and its antialias footprint change. Artwork, colors, title, stages, PUR, rules, frame and footer are pixel-identical to the baseline in both existing export sizes.

`pixel-checks.json` records each native source, the original and resulting file hashes, measured label bounds, idempotence and both lossless image checks. `independent-verification.json` independently compares all 268 exports against their retained originals and verifies those originals against the baseline Git objects. Existing artwork, footer and typography records remain unchanged as historical evidence; the current production audits carry the label revision chain.

The patcher derives its complete target set from the current catalog, including the older Saiyan audits without a family field. Verify the current release without changing its bytes:

```sh
python3 tools/card-templates/v3/patch_personality_labels.py /tmp/v3-label-check --apply
npm test
npm run check
```
