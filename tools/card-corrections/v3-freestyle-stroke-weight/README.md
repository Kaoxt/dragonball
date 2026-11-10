# Freestyle Tokui Waza stroke correction

All 374 currently published cards displaying the white 白 symbol receive the
same small weight correction. The standard nine-unit white stroke is reduced
to 8.2 glyph units: approximately 10.73 to 9.78 native card pixels, close to
Red's approximately 9.8-pixel typical stroke. Both symbols have variable-width
shapes; these are representative widths, not constant-width claims.

The original white paths, transforms, scale, placement, outer black silhouette
and smoky backing are retained. A 0.8-unit dark stroke on `freestyle-glyph`
insets its white edges by 0.4 glyph units. This exposes the existing outline
color without rescaling or replacing the character. The 207 Freestyle catalog
entries using Personality, Dragon Ball, Location or Battleground emblems keep
their source and both image files byte-identical. No other style changes.

| Set | Corrected cards |
| --- | ---: |
| Saiyan | 111 |
| Frieza | 76 |
| Trunks | 81 |
| Android | 45 |
| Cell | 31 |
| Cell Games | 25 |
| World Games | 5 |

## Pixel and native-source preservation

Each native source changes exactly one opening tag. `release.json` records
the reversible edit and original/current SHA-256 values. All 374 source
symbol subtrees are checked against the same original subtree before patching.
The helper is idempotent; current donors, including Saiyan #24, carry the
correction into future builds. Historical donors can be normalized with
`scripts/freestyle_symbol_weight.py` after style selection.

The standalone old/new native symbols have identical alpha silhouettes.
Every changed native symbol pixel is fully opaque, and the isolated symbol
delta exactly matches the full native card render. The shared delta is then
checked against each card's existing pixels before use. Display and download
images are patched independently, preserving the existing display downsampling
footprint. Every decoded pixel outside the exact delta remains identical.
Both exports remain lossless WebP and pass decoded-pixel round-trip checks.

The ten affected Ultra Rares retain their exact custom foil masks. Only their
image revision pins advance, because the card artwork and mask geometry stay
unchanged. The release records and tests all mask hashes and profile changes.
Earlier production and correction audits remain immutable; the new history
adapter validates current bytes and follows the explicit before/after chain.

## Reproduction

From the repository root:

```sh
python3 tools/card-templates/v3/patch_freestyle_symbol_weight.py /tmp/freestyle-weight --workers 4 --apply
node --test tests/card-freestyle-stroke-weight.test.js
```

Staging without `--apply` records a separate verification file for each card.
`--assemble --apply` validates those retained staged files before applying them.
With the release already present, repeating the command verifies all hashes,
catalog revisions, excluded cards, foil masks and idempotence without edits.
Repository publication and verified live availability are separate statuses.
