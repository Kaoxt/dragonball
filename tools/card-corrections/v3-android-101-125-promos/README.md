# Android Saga completion: 101–125 and P1–P11

The final 36 Android Saga cards use current V3, completing all 136 published cards. There are 35 portrait cards and one landscape Location, Planet Vegeta (P10). Ten Personalities retain original Level/PUR/stages, short HERO/VILLAIN labels, reference Hero blue, dark Villain crimson, and the native bold Level 4 outline. Original rarity is five stars for 101–123, six for 124–125, and two for every promo.

`cards.json` and `crd-review.json` record original text, supplied Expanded CRD evidence, reviewed rules and intentional line breaks. Krillin’s Search P4 gains the Restricted List limit of one per deck. Severe Bruises has no banishment; Piccolo the Trained has an activated power; Foreboding Evidence returns Hero cards to the top of the Life Deck. Android 17 retains the corrected 399,000 stage.

`artwork-review.json` records individual observations and source-scan limitations. Original figure pixels, framing and uniform artwork mapping are retained. Five separate sky masks remove unsupported scattered clouds on 102/106/111/114/115; native color filtering adapts an independently generated blue gradient, with zero changed pixels outside the mask footprint at either export size. Android 20 #118 retains the exact previously approved mouth patch and clip from the editable archive. No other artwork is redrawn.

`audit.json` and `per-card/` record native geometry, source/assets hashes and both lossless exports. `render-verification.json` independently compares every decoded export with the native render, checks title brush clearance, resolves SVG references and verifies localized masks. Display exports are 1060×1484 (P10: 1484×1060); downloads are 2120×2968 (P10: 2968×2120). Footer group centers and their 12.2-unit gap remain fixed.

Rebuild using `build_android_101_125_promos.py --retained <remaining-source-directory> --landscape <Location-Battleground-V3-directory>`, then run `verify_android_101_125_promos.py`. The source archive identity is in `source-provenance.json`. Final SVG raster dependencies are portable content-addressed assets. Historical batches and their audits remain unchanged.
