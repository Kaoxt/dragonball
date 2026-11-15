# Cell Saga promos P1–P10

Ten finished regular promotional cards, using current V3 native frames and new modern illustrations based on their original scans. This release adds P1–P10 to the existing Cell Saga 1–200. It does not replace the numbered cards, Hi-Tech cards, or Goku #162. The scope is the ten P-numbered playable promos; wrapper redemption items, preview C numbers and R-numbered reissues are not represented as extra cards.

## Contents

- Ten 1060×1484 display WebPs and ten 2120×2968 download WebPs, all encoded losslessly.
- Ten editable native SVGs with outlined title/rules/footer text and every linked raster asset.
- Current thin Freestyle symbols, two-star promo rarity, Cell Saga emblem and verified footer spacing.
- Exact catalog additions, original text, final wording, original scans, source URLs, generated illustration files and per-card checks.
- Additive integration script and SHA-256 manifest. Existing catalog entries and permanent deck ID positions are preserved.

The illustrations are raster artwork; the 2120×2968 exports render native card text and frames at full resolution while scaling the retained illustration. They are not a claim of original 2120-pixel illustration detail. No foil highlights are baked into the regular images.

## Apply in Codex

1. Start from the latest `Kaoxt/dragonball` checkout. Keep all newer user changes.
2. Unzip this folder outside the repository. From the extracted folder run `python3 integrate.py /absolute/path/to/dragonball` to verify hashes and conflicts without writing.
3. Run `python3 integrate.py /absolute/path/to/dragonball --apply`. It copies missing payload files, appends only missing promo entries to `public/cards/catalog.js`, and appends their permanent IDs to `public/decks/code-card-ids.js`. For an installed initial promo release, it accepts only the exact previous package hashes and exact previous P3 catalog entry, then updates P3's image revision without moving its permanent ID. Other conflicts stop before writing.
4. Review the diff. Confirm 210 Cell Saga entries: 1–200 and P1–P10. Check `/cards/cell-saga/P1` through `/cards/cell-saga/P10` using the site's existing route normalization; verify both image qualities, Cards filtering and deck-code round trips. The cards are Energy Combat, Drill, Setup or Event and require no new Personality stage charts.
5. Add a focused promo release check using the existing test conventions. Preserve earlier historical audit memberships; do not regenerate old audit hashes just to accept the new catalog size. Run the repository's appropriate card/deck/route checks and required build checks against the current branch.
6. Publish through the project's normal asset/deployment workflow after successful integration. Verify live previews and lossless downloads. **This package has not been deployed.**

The prepared baseline was repository commit `ecf893c25b31fd81d64d8f041b75376e71e449fd`. Integration is additive and does not require resetting to that commit. A local fixture check verifies an initial application and a byte-identical second application; it is not a full application/deployment test.

## Wording decisions

- P1 Cell's Self Destruct: default energy cost is 2 stages, verified from the supplied Expanded CRD. Preserve the Cell exception to its one-copy limit and the successful-attack loss condition. Banish after use remains last.
- P3 Kami's Idea: the power-stage comparison applies to raising the Main Personality and shuffling the bottom discard card. The final anger reduction remains independent.
- P7 It's All About Time: retains its use-when-needed timing, the 5-or-more anger trigger, reset to zero and one-copy limit.
- P8 Trunks Thinking: adds the CRD Restricted List's one-copy limit before its effect.
- P10 Piccolo's Fist Block: standalone old Combat cards become Event cards. This does not forbid Physical Combat or Energy Combat cards. It does not directly stop an attack, so it has no shield icon.

Artwork was compared to original card scans for identity, pose, framing, eyes, mouth and costume. P7's outside figure was corrected to lavender-haired Trunks, with Vegeta inside. P3 now uses the direct restoration explicitly selected by the user ("This one looks much better"). Its 1624×968 artwork is retained byte-for-byte, including both faces, their expression and translucent overlap, with a uniform fit to the native art-window width. A narrow generated lower-edge continuation fills the space below the selected image. A short transition blends only the bottom clothing and scenery edge; neither face nor the facial overlap is masked or redrawn. The attached original user reference and clearer PSA scan are included. The card frame, rules and other nine cards remain unchanged. The chosen image is a user-approved modern restoration, not a certified exact tracing. Small scanned details and foil-obscured P7 details retain the limits recorded in the per-card observations.

Use the supplied native SVGs and hashed assets as the canonical render sources. The composition builder is included for provenance and uses existing repository helpers and donors; it is not necessary to rebuild before publishing the verified exports.
