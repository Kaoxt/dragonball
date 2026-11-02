# Android Saga 001–050

These fifty cards migrate to the current V3 native SVG system. The four landscapes (7, 8, 43, 44) retain the approved Location/Battleground master and horizontal exports. All other cards use the matching fixed style components. Typography, rules, symbols, borders and footer geometry remain native outlined vectors. The retained Android RR set mark keeps its shape and size; footer side groups use mirrored visible-ink centers and a 12.2-unit ball/number gap.

Original scans establish one-star rarity for 1–36 and three-star rarity for 37–50. The rules review includes the supplied Expanded CRD: #24 lasts for the current Combat, and #44 explicitly includes Dende Dragon Balls. #6 retains four life cards plus three/five stages; #26 retains its two-stage cost and fixed six-life-card damage. #25 is an activated power and has no shield icon.

The original retained illustration bytes are separate assets. Local clipped corrections restore #20's RR badge, #34's bent hand at Vegeta's temple, #37's open near hand, and #39's exposed cranial dome. #38 retains its separately approved expression correction. No additional illustration zoom is introduced. The original scans, per-card artwork observations and unresolved small/obscured details are retained in `artwork-review.json`; those limits are not claimed as fidelity passes.

`audit.json` binds each native source, raster dependency, measured geometry, reviewed rules and both lossless WebP exports to hashes. `render-verification.json` independently rerenders every source, compares both decoded exports, measures title-to-brush clearance, resolves local SVG references, and verifies zero changed pixels beyond each correction mask at both resolutions. Every display image and high-resolution detail sample was visually inspected.

Rebuild with `tools/card-templates/v3/build_android_001_050.py --retained <Android archive extraction> --landscape <landscape archive extraction>`, then run `tools/card-templates/v3/verify_android_001_050.py` and `npm test`. The retained archives and exact hashes are identified in `source-provenance.json`. Final SVGs resolve portable content-addressed assets through `../assets/`.
