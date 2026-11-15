# Remaining Personality corrections

This publication merges both user-supplied Drive ZIPs and installs their exact
607 payload files: 56 artwork placement corrections, Vegeta 184's wording and
Goku 160's Arena stage correction. There are 58 affected card records, 57 image
cards and 114 lossless display/download exports. `README.txt` and `manifest.json`
retain the supplied instructions, exceptions, dependencies and immutable hashes.

`publication.json` records the checked repository baseline, both archive hashes,
before/after card records and exact historical native/integration snapshots.
The earlier 45-card centering release and all prior audit manifests are retained
unchanged. The new history adapter validates current files before exposing the
preceding reviewed state; raster identity uses its hash API and native/text
reads restore the retained gzip snapshots.

Independent integration comparisons decoded all 114 before/after exports and
verified zero changed pixels outside the supplied masks. The masks themselves
were checked against the permitted art window or Vegeta's wording rectangle.
`pixel-verification.json` records those results. No export was rerendered or
recompressed during publication, and a second installer run changed zero files.

Local checks cover every payload hash, native dependency, lossless format and
dimension, catalog/deck identity, Goku's chart, Vegeta's sentence, Cell 159's foil
pin, historical snapshot and the Worker dry-run build. Browser checks are
recorded separately in `browser-verification.json`. The standard GitHub Security
checks run the complete source suite and CodeQL before the existing production
package workflow can publish to Cloudflare.

The four documented proportional framing exceptions and the original scan
limitations for Piccolo 163 and Android 20 185 remain as supplied. This update
does not claim new artwork generation or independent resolution of those eyes.
