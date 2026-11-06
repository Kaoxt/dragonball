# Approved Cell Games banner emblem

This revision applies the emblem from the approved November 6 preview to all 100 Cell Games cards and both existing image sizes. It follows the title-width revision and preserves every pixel outside the old/new emblem ink and antialias footprint. Artwork, titles, frames, rules, rarity and card numbers are unchanged.

The visible emblem remains centered at (211.75,1409.5) on portrait cards and (296.55,985.5) on landscape cards, with width 73.9635 and height 64.62830097087378 native units. The retained clipped group uses the exact approved banner asset.

Run `python3 tools/card-templates/v3/patch_cell_games_banner_logo.py`. It independently checks each original footer against its native render, applies only the emblem delta, verifies lossless decoded-pixel equality and records zero unrelated pixel changes. A second run verifies the saved source/export hashes without modifying files.

The five final cards (70,72,73,81,83) still lack complete native source. Their footer baselines are matched against a retained native footer before applying the same delta. Their approved artwork and reconstructed header-only sources remain intact. Historical audits remain immutable; the test helpers validate current bytes before reversing the banner and title revisions.
