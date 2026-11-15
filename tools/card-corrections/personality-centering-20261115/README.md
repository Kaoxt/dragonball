# Personality artwork centering publication

This revision installs the exact 45-card patch supplied in the linked Drive
handoff. The package reviewed 98 cards; 53 retain their existing placement.
See `Card-Review.csv` and the unchanged `REVIEW-NOTES.txt` for individual
choices and the narrow Piccolo #169 background/cape-tip edge exception.

`manifest.json` retains every supplied asset hash and unchanged dependency.
`publication.json` records the repository baseline, exact before/after catalog
entries, native revisions and historical integration snapshots. Earlier
artwork, typography and gameplay audits remain unchanged.

Independent integration checks compared all 90 original/final WebPs and found
zero changed pixels outside x14–814, y146–852, scaled for the 2x downloads.
All original native element IDs and attributes remain present and unchanged.
The actual Cards, authenticated local Decks and solo Arena previews were
inspected, including Regular/Foil switching, mobile layout and rounded edges.
Representative display/download responses matched the supplied SHA-256 values.
These local checks are recorded in `pixel-verification.json`,
`native-preservation.json` and `browser-verification.json`.

The history adapter validates each current file before exposing the prior
revision. Native/integration file reads restore exact retained bytes. Raster
identity checks must use the hash API: raster file reads expose current bytes
for container/dimension checks, following the existing artwork adapter contract.
The prior raster files remain in the baseline Git commit; no duplicate raster
archive is added to this revision.

Original source limitations documented in the handoff remain unresolved where
scans are low-resolution or foil-obscured. No new illustration or game-text
changes were made during integration. The supplied WebPs were not rerendered
or recompressed.
