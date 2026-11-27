BABIDI SAGA — 41 NEW READY CARDS

Contains #101–123, P1–P10 and Pre1–Pre8, in display and full-size lossless WebP,
with editable native SVG sources, artwork, original references and card data.
This is the smaller incremental package; the earlier 98 ready cards are in the
full Babidi-Saga-Publish-Package.zip and previous batch archives.

SET STATUS: 139 ready out of 141. #30 Saiyan Prepared Smash and #89 Saiyan Aura
Blast remain unfinished because the image tool rejected the replacement-artwork
retries through its automated safety filter, without a specific explanation.
They are not included in this package's publication manifest.

NOT PUBLISHED. Main #1–123, promos P1–P10 and previews Pre1–Pre8 are the scope;
the Movie 7 subset is excluded.

Portrait: display 1060×1484; download 2120×2968.
Landscape: display 1484×1060; download 2968×2120.
Both WebP sizes are lossless. Download pixels match the PNG production renders.
PNG duplicates are omitted to keep the download smaller. Native geometry/text
are outlined SVG; illustration and texture layers are identified raster assets.

Rebuild only this batch with Python 3, Pillow, lxml, fontTools and Inkscape:
  python3 production/build_new_cards.py
Optional arguments select numbers, for example 122 123 Pre8.
Keep production/masters beside production/assets when opening native SVGs.

Use publication-manifest.json for the 41 new site entries; match by set_slug
and number, preserve current site schema, existing card revisions and unrelated
sets. Read the repository's current AGENTS.md and publication workflow. Do not
publish #30/#89 or treat the complete set as finished. Run required repository
checks and verify both image sizes live after an authorized deployment.
