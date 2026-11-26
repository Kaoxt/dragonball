# Movie 7: Super Android 13

The Cards page now has a **Promos & Subsets** section linking to the separate Movie 7 collection. Movie 7 and Babidi Saga link to each other. Existing saga URLs, card IDs and 52-card pagination remain unchanged.

The package contains **34 finished cards**: M1–M34. M16, Super Saiyan Goku, now uses the user-approved modern dual portrait sized to 2066×1412. Its native frame, game data and rules remain unchanged.

Each finished card has 1060×1484 display and 2120×2968 download lossless WebPs, native outlined text and geometry, one power icon at most, the Movie 7 RR emblem and original M-numbering. M16 artwork is 2066×1412, upscaled from the approved 1516×1037 generation. The other 33 illustration files retain their original dimensions of approximately 1517×1037.

Production files are in `tools/card-templates/v3/movie7/`; original scans, artwork, card data, CRD source and audit reports are in `tools/card-corrections/v3-movie7/`. The original foil scans limit fine-detail and color comparisons; these are modernized illustrations, not pixel-identical restorations.

CRD changes cover M2's Attacker Attacks timing, M7's repeatable attack and unrestricted control actions, M29's own banished pile, and M34's one-copy restriction. M3 and M26 retain fixed damage rather than receiving an invented Attack Table component. Earlier catalog rows and permanent deck-code IDs are preserved exactly.

The 64 focused tests cover both Babidi releases, Movie 7, card routes, the card browser, deck codes and Arena behavior. Chromium checks at 390 and 1440 pixels verified navigation from the collection tile to all 34 cards, M16’s detail dialog and download link, and a deck-code round trip into the Arena with its printed power stages.

Deployment uses the repository’s existing card-storage and small-deployment pipeline.
