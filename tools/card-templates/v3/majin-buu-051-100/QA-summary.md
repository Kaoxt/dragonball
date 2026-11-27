# QA summary — Majin Buu Saga 51–100

## Completion

- Exactly 50 numbered cards, 51–100; 50 display exports, 50 full-size lossless downloads, and 50 native SVG masters.
- All final artwork and finished card layouts reviewed against the source scans. Selected art revisions address the hands in #68 and Babidi's identity in #79. #59 contains completed new artwork, with no source-scan placeholder.
- Technical verification passed for every card: unique SVG IDs, no live SVG text, local assets resolved, expected dimensions, export hashes, and PNG/WebP pixel equality.
- A second footer and power-icon alignment pass made no changes on all 50 cards. Native rules fit the fixed v3 typography and panel bounds. Text remains outlined vector geometry until final rendering.
- #72 uses level 2, PUR 3, and the source power stages ending in 0. #69 and #73 use the landscape location/battleground template.

## Rules review

Original card scans were checked with the supplied Expanded CRD before modernizing wording. OCR is retained for provenance and can contain errors; the scans and modernized rules are authoritative within this handoff.

| Card | Correction or clarification |
|---|---|
| #66 Goku Swiftly Moving | The CRD says attempting to stop an unstoppable attack still permits its copied attack in the next Attacker Attacks phase, if its cost can be paid. Retained as a rules clarification. |
| #72 Krillin, Z Warrior | The printed constant-power label is corrected to an activated energy attack. |
| #85 Orange Gambit | Explicitly preserves the original card's cost while ignoring costs imposed by other card effects. |
| #96 Red Joker Drill | Uses Rejuvenation Step, as corrected by the CRD, instead of the printed Discard Step. |

Default DBZ energy-attack cost is shown as 2 stages. Physical attacks use AT base damage where applicable; printed fixed stage damage is preserved. Physical attacks with additional life-card damage retain AT stages plus the specified life cards.

Terminology follows the current card conventions: Event, Setup, Drill, Planning Step, Banish, AT, and HIT. `MP` means Main Personality. `Tokui Waza versus [style]` means you declared a Tokui Waza and your opponent declared the named style. #99 retains the printed `Sensei Deck` restriction in compact wording. Each applicable power uses one attack, block, or constant-power icon.

## Resolution and source assets

Full-size portrait exports are 2120×2968, and full-size landscape exports are 2968×2120. Display versions are 1060×1484 and 1484×1060, respectively. Both output tiers are lossless WebP.

The source illustrations are raster artwork, approximately 1516–1518×1036–1037 for portraits and 2170–2172×724–725 for landscapes. Exact dimensions are recorded per card in `new-cards.json`. Artwork is placed proportionally into the native vector template; the final export size does not imply that the source artwork was natively generated at 2066×1412. Fonts, icons, title bars, rules text, and footer geometry are rendered directly from the native master at each output size.
