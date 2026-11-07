# Personality stages: highest at top, zero at bottom

The isolated repair covers twelve Frieza and ten Android Personality cards.
All 172 Personality sources are audited, including Hi-Tech and thirteen-row
charts. The other 150 sources and their exports remain unchanged.

Only native stage-number groups change. Display and download images are
patched independently through the old/new rendered digit delta and saved
losslessly. Each export must have zero changed pixels outside that delta.
Full-canvas downsampling preserves the original preview rendering phase.

Android Saga #116's original scan prints 399,000, not 499,000. This correction
is synchronized in the image, catalog, Arena chart and editable source data.
The original scan and its digest are recorded in `release.json`.

The shared builder now accepts ascending or descending source arrays and
always prints descending stages. It rejects ambiguous or zero-less charts.

Run `python3 tools/card-templates/v3/patch_personality_stages.py` to apply or
verify the repair. It checkpoints each completed card and leaves a completed
release unchanged on a repeat run. `release.json` records all source and
export hashes, reversible native changes, the complete stage audit, and
protected-pixel results. Earlier production, title and emblem audits remain
immutable; test helpers validate the current files before reversing the
documented stage changes to check historical evidence.
