# Majin Buu alternate Dende summoning artwork

Replaces only the five existing alternate Dende Dragon Ball images: Dragon Balls 1–5, set cards 1, 2, 38, 39 and 40. Nine published WebPs are copied exactly. Card #40’s preview preserves its exact approved VP8L payload and pixels with an empty RIFF JUNK chunk appended for successful GitHub publication; the exact supplied original is retained in `production/display/`. Matching cache hashes identify the current delivery bytes. Catalog identity, game data, rarity, deck IDs and unrelated cards are unchanged.

`production/` contains the exact five supplied native SVGs and all linked assets, the selected landscape source, its continuous portrait extension, artwork choice for the future 6/7 cards, and per-card export/foreground checks. Native card overlays match the previous sources; the supplied raster verification found at most one channel level of renderer rounding in opaque overlay pixels. No card image data is regenerated or recompressed during publication. The delivery-container exception is explicitly recorded in `release.json`.

The initial first-50 batch and previous audits remain immutable history. `integration-files.json` and `before/` restore the exact pre-update images and integration files. Historical readers call `beforeDendeSummoningFile` before the GT Backers chain. `checksums.json` verifies the current sources and exports; `release.json` pairs every previous/current card record.

Deployment follows the existing Security checks → verified production package → Cloudflare workflow. Read the workflow results and verify live page URLs plus display/download SHA-256 before claiming publication.
