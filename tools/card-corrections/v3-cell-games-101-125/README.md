# Cell Games 101–125 publication

The exact supplied cards complete the numbered Cell Games set through 125.
`release.json` and the `package/` handoff describe preparation history;
`publication.json` records repository integration and the preserved baseline.
Every supplied source, export and audit remains byte-identical to the package.

Five explicit Arena charts also serve saved deck snapshots. New deck IDs are
appended. Historical catalog and chart checks retain their original state via
`tests/helpers/pre-cell-games-101-125.js`; earlier evidence is not rewritten.
The two Ultra Rares use the existing rules-only V3 fallback mask.

The package verifier independently renders the native SVGs and compares all
50 exports. Source-scan limitations and CRD decisions remain in the supplied
per-card records. Publication status is verified from the deployed site.
