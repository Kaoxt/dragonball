# Frieza Saga 051–100: V3 release

This release updates fifty cards. Cards 051–060 retain their approved V3 artwork and receive only the corrected footer spacing. Cards 061–100 migrate from retained editable masters into the current V3 layout, with native outlined SVG text, current category components, red Villain power-box corners, and mirrored footer groups.

All fifty original scans and the current Expanded CRD were reviewed. Eight new Personality cards retain their original LEVEL, PUR and eleven power stages. Rules remain identical to the published catalog after checking current corrections and renamed card types. Titles 64, 72 and 74 use measured narrower widths to clear the actual brush notches.

Artwork corrections:
- 85, 87, 97 and 100 remove added cloud details through transparent sky-only overlays. The underlying illustration bytes and foreground remain intact. `localized-corrections/sky-patch-verification.json` records source-mask protection; `render-verification.json` verifies protected pixels independently in both final sizes.
- Vegeta 89 replaces the isolated illustration to restore the original raised-arm pose. The native frame, text, data, and layout are composed independently.
- Nail 96 retains the earlier expression correction from `expression-audit-2026-10-26` without redrawing it.

`artwork-review.json` records every original/final comparison, specific observations, final export hashes and unresolved fine details in small scans. A technical render pass is not an assertion of exact expression fidelity where the original is too small to resolve it.

`audit.json` and `per-card/` retain forty source/export/geometry records. `render-verification.json` checks title contours, source assets, lossless display/download pixels and bounded corrections. The separate `../v3-frieza-051-060-footer-centering/` folder contains twenty independent footer pixel checks and a baseline-source/catalog check. Both output sizes are lossless WebP: 1060×1484 and 2120×2968.

The reproducible composer is `../../card-templates/v3/build_frieza_061_100.py`, with the retained 041–080 and 081–120 archive folders as inputs. Run the corresponding verifier after composition. Continue the set with card 101.
