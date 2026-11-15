CELL SAGA: COMPLETE REMAINING 30 CARDS — CODEX PUBLICATION HANDOFF
Prepared 2026-11-14. Repository: Kaoxt/dragonball.

WHAT TO PUBLISH
Cell Saga #161–190 inclusive, 30 regular Starter Personality cards. This includes
the approved Goku, the Saiyan #162, enlarged 35% to match the original subject
size. All card framing, text, power stages, Level and PUR remain native SVG.
This is Cell Saga, not Cell Games Saga. The already-present Cell Hi-Tech cards
#191–200 are preserved and are not replaced by this package.

CONTENTS
- 30 display WebPs: 1060 x 1484, lossless encoding.
- 30 download WebPs: 2120 x 2968, lossless encoding.
- 30 editable native SVGs and every linked asset, plus original reference scans.
- Goku #162 PNG previews at both sizes, approved source and framing evidence.
- A contact sheet of all 30 included cards.
- Catalog/source records, hashes, native/export audits and integration tests.
- integration.patch for the current catalog, permanent deck IDs, Arena stages,
  test registration and earlier-release history adapters.

CURRENT BASELINE
Commit: 396005a8c719f42f6b97cdb86efebbc6e58bfac9
Before: 1234 catalog cards total, 170 Cell Saga cards, 452 permanent deck IDs.
After: 1264 total, all 200 Cell Saga numbered cards, 482 permanent deck IDs.
The prior 29-card handoff and the standalone Goku handoff are superseded by this
combined package. Do not import older Cell #191–200 artwork from a progress ZIP.

INTEGRATION
Use the real current publishing checkout and follow its AGENTS.md/deployment
instructions. The ZIP is a handoff; no remote commit or deployment has been made.

1. Verify this package from its extracted root:
     sha256sum -c checksums.sha256
2. In a clean repository checkout, set handoff to this extracted directory:
     handoff=/absolute/path/to/Cell-Saga-30-Cards-Codex-Handoff
     git apply --check "$handoff/integration.patch"
3. If the check passes, copy the new assets, native sources, metadata and tests,
   then apply the integration patch:
     cp -R "$handoff/public/." public/
     cp -R "$handoff/tools/." tools/
     cp -R "$handoff/tests/." tests/
     git apply "$handoff/integration.patch"
4. Run the checks below, then the full repository-required checks. Review the
   diff and card previews. Publish through the project's established asset and
   site workflow when the user requests publication. Upload both WebP sizes.
   Native sources/reference files are production inputs, not public URLs.

IF MAIN HAS CHANGED OR AN EARLIER HANDOFF WAS APPLIED
Do not replace the entire catalog or reset the repository to this baseline.
Reconcile the 30 records in tools/card-corrections/v3-cell-starters-161-190/
cards.json by ID, preserving every unrelated record. Existing permanent deck IDs
must never be reordered or duplicated. Add only absent IDs at the end. The
deck_code_append_ids field retains the prior 29-card order and adds Goku #162
last, while the new catalog entries themselves are in card-number order.
Reconcile the Arena charts by ID. Rebase historical test adapters and record the
actual pre-integration state/hashes rather than weakening preservation checks.
If any included shared asset already exists, its bytes must match its filename
hash. Reconcile any conflict rather than overwriting unrelated work.

VALIDATION COMMANDS
node --test tests/card-v3-cell-starters-161-190.test.js tests/card-pages.test.js tests/deck-code.test.js
node --test --test-name-pattern='adds exactly|Hi-Tech cards round|Cell Hi-Tech routes' tests/card-v3-cell-191-200.test.js
node --test --test-name-pattern='adds exactly 25' tests/card-v3-cell-games-101-125.test.js
node --check public/cards/catalog.js
node --check public/decks/code-card-ids.js
node --check public/personality-power.js

AFTER PUBLICATION
Verify Cell Saga count 200 and direct routes /cards/cell-saga/161 through /190.
Verify both image URLs and their version hashes, particularly Goku #162. Confirm
#191–200 still use the existing Hi-Tech images and that pre-existing deck codes
decode identically. See validation-results.txt for what was checked locally.

ARTWORK AND QUALITY NOTES
The 29 earlier cards retain their previously reviewed native sources and exports
byte-for-byte. Their retained audit records describe their prior rendering and
visual review; this packaging pass did not regenerate those illustrations.
Goku #162 uses the user's selected 1536 x 1050 JPEG as its illustration. The
2120 x 2968 file is a lossless card export with crisp native text and borders;
it does not claim newly recovered illustration detail. Its artwork placement
is recorded in cell-162-approved-artwork/source-card.json. Preserve that framing.
