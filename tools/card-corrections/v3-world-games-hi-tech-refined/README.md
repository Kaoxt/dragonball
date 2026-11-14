# World Games Hi-Tech framing revision

The November 14, 2026 package updates #165 Vegeta, #169 Gohan, #177 Goten,
#181 Kid Trunks, #185 Maraikoh, #189 Olibu, #193 Pikkon and #197 Piccolo.
The supplied native SVGs and sixteen lossless WebPs are retained byte-for-byte
at their existing repository paths. Catalog changes are limited to the sixteen
image version references. Rules, Level, PUR, all stages, IDs, deck-code positions
and all other cards are unchanged.

The package explicitly says to preserve the destination's newer Goku choice.
The separately published halo-and-staff Goku #173 from `cc3291d` is therefore
unchanged. Neither the package's alternate halo-and-staff framing nor its Super
Saiyan alternate is selected. Those alternatives remain intact in the original
ZIP; its checksum and all 106 manifest checks are recorded in `release.json`.
The package's nine-card preview includes its Goku variant and is archival, not
a representation of this deployment.

Vegeta and Gohan now show their arms, torsos and clothing with the supplied
smaller framing. The other six foregrounds retain their individual placements
and painted eye backgrounds. Pikkon's small open-mouth patch is retained.
No artwork was regenerated, recolored, stretched or automatically cropped.
Regular uses the supplied unfoiled exports; Foil uses the site's dynamic effect.

All protected native groups were compared against the actual destination with
linked and embedded raster references normalized by their decoded SHA-256.
Every protected group matches. `layout-comparison.json` records those checks.
Goten's destination exports were not listed among the package's earlier hashes;
its unchanged native UI and gameplay were verified before deliberately applying
the supplied artwork update. No other destination changes were overwritten.

`render-verification.json` records independent Inkscape renders at 2120 × 2968,
followed by Lanczos downsampling to 1060 × 1484. Both supplied WebPs match their
supplied PNGs and the native render pixels. The export uses RGB, matching the
package and existing retained-source rebuild process; the native Maraikoh source
contains transparent edge pixels before this existing RGB conversion.

The authoritative sources embed all raster dependencies. The updated batch
audit and per-card records enumerate the embedded image hashes and retained
foreground/background sources. The existing builder uses its retained-native
path for all eight cards, preserving the exact composition on future rebuilds.

`release.json` records each before/after catalog and audit row, changed-file
hashes, and the unchanged Goku files. Exact earlier source/JSON snapshots are in
`history/`; their original relative links describe the original source paths.
They support historical checks, not standalone rendering from the history
directory. Earlier image hashes remain in the revision record and Git history.
`tests/helpers/world-games-hi-tech-history.js` validates current files before
exposing those earlier audits. The new release tests verify the current catalog,
native sources, exports, card routes, finishes, power charts and deck round trips.

Run the focused checks with:

```sh
node --test tests/card-world-games-hi-tech-refined.test.js tests/card-v3-world-games-151-200.test.js tests/card-v3-cell-191-200.test.js
```

For a retained-source rebuild, use `world_games_retained_native.rebuild` with
the current card record, repository root and a temporary work directory, as
the batch builder does. It verifies the approved source and export hashes and
does not substitute generic artwork placement.
