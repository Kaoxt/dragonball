# Strength Training: Goku character correction

Cell Games #30 originally depicts Super Saiyan Goku training with Gohan in white/gold Saiyan armor and blue undersuits. The initial modern artwork and review incorrectly used Vegeta and identified the child as Trunks.

The built-in image generator corrected the adult's head. The current native SVG retains the old illustration and adds a masked, softly joined head/neck insert from the separately retained generated asset. Goku's front bangs, face and hair silhouette replace Vegeta's widow's peak. His downward-left head angle, gaze and clenched-teeth expression remain. Gohan, the pushing hands, body pose, armor, boots, framing, typography, rules, rarity and satin set logo remain unchanged.

`release.json` chains the exact previous logo-release source/export hashes to this correction. Removing the exact `native-insert.svg.txt` fragment restores the previous native source byte-for-byte. Historical production and logo audits remain intact and are superseded only for this specific character identification and current export hashes.

Run `python tools/card-corrections/cell-games-030-goku/build.py` from the repository to reproduce the exports. It independently renders the previous/current native sources, copies only the changed head-region pixels into each original lossless export, checks zero changes beyond that region, and verifies decoded WebP pixels. The maximum remaining difference from the new full native render is two channel levels, confined to the already published satin-logo render rounding. It also refreshes both catalog revisions. The actual final display and high-resolution card were visually inspected against the retained original scan. That small scan still limits exact fine facial-detail comparisons.
