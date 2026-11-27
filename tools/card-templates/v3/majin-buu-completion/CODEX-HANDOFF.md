# Publish these ready Majin Buu Saga cards

Publish only the **15 entries in `ready-cards.json`**. Match existing records by original set and card number; retain the site's established promotional set/subset routing for P1–P10. Upsert matching cards without creating duplicate listings.

Newly completed: #117 Kid Trunks, #146 Saiyan Style Mastery, #175 Goten Hi-Tech, #201 Earth Dragon Ball 3, and P1–P10. #131 Freestyle Mastery is included for convenience with its latest approved artwork and lighter frame; do not replace it with an older version.

Use the exact files in each record's `display_path` and `download_path`. Full-size PNGs and portable native SVG source are included in this same ZIP. Keep the lossless downloads lossless. Use existing Regular/Foil behavior and do not bake foil into Regular images.

Do not publish or clear artwork-pending flags for #32 Saiyan Energy Deflection, #116 Goku, Super Saiyan Ascended, or #160 Goku Hi-Tech. Their original scans are reference material, not new card exports. They are excluded from `ready-cards.json`.

Preserve these mechanics and identity details:

- P4 Deceptive Moves cannot be in a Life Deck or Sensei Deck with a declared Red Tokui-Waza. The JSON contains the restriction and source CRD entry.
- P2 Goku's Power Strike is printed as Energy Combat but performs a physical attack. Preserve both facts and its Endurance 3.
- P1 Outburst Drill uses the original headshot identity, not the character depicted in the main illustration. The promo metadata records `original_headshot_character`; P3 is Majin Babidi and P7 is Supreme Kai despite the main scene featuring other characters.
- #201 is Earth Dragon Ball 3, with three-star rarity and the approved Earth/Shenron full-art template; it is separate from alternate Dende balls.
- #175 is Level 2, PUR 3, with the native stage sequence in the JSON. It uses the approved portrait Hi-Tech conversion.

Before deploying, run the repository's relevant catalog/asset validation and inspect the updated card detail pages and downloads. Preserve other previously published cards and artwork. This handoff supplies assets and data; it has not modified the repository or deployed the site.
