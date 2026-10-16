# Permanent combat production rules

Approved October 15, 2026 in the Dragon Ball Online project. These Orange and Red designs replace earlier white-symbol or colored-circle experiments for these styles.

## Geometry and typography

Use the renderer's 1060 × 1484 coordinate system. All cards have identical outer dimensions. The title uses Michroma, centered by actual glyph bounds; the category uses the same face. Power text uses Barlow Condensed Bold at a shared size. Footer text uses Barlow Condensed Regular. The fonts are native matches to the approved appearance, not claimed original Score fonts. Retain bundled OFL licenses.

Keep thin silver/black outlines, joined footer rails, smooth circular badges, opaque white power panels, and native text paths. The artwork window is x=0, y=156, width=1060, height=794. Keep the set emblem lower left. Keep the rarity Dragon Ball and number grouped and centered lower right, including double-digit numbers. The approved number location supersedes older bottom-left instructions. The one-star sphere and numeral retain the approved smaller scale. Center the star within the sphere.

Do not change title fonts, create random letter spacing, move text panels, increase border shine, or use translucent power panels. Do not soften text or artwork when adjusting the outer decorative texture.

## Symbols and color

Orange uses orange 橙 strokes on the BLACK crosshatched badge. Red uses red 赤 strokes on the BLACK crosshatched badge. The matching category bar carries the style color. Keep the footer set icon independent of the style icon; keep the rarity Dragon Ball orange on all styles.

Use the retained darker, softly blurred frame colors. The two approved full-card base layers retain those decorations; opaque native panels and art replace variable content. Do not feed a finished card through repeated full-image generative edits.

The Orange style glyph derives from KanjiVG, copyright 2009–2011 Ulrich Apel, https://kanjivg.tagaini.net, licensed CC BY-SA 3.0. Its source notice is retained in `native/assets/orange-kanji-source.svg`. The orange adaptation retains that license. The red symbol is a retained raster asset from the approved red preview. Do not claim it is a vector glyph.

## Rules and sources

Read the current Expanded CRD before new sets or new card powers. The retained CRD contains no named overrides for Saiyan Saga cards 1–10. Their original wording and display wording are stored in `cards-001-010.json`. Preserve physical attack damage bonuses: +1 for 2 and 3; +3 for 5, 7, 8, and 9; ordinary physical attacks for 1, 4, 6, and 10. All raise your anger 1 level. The anger effect is separate from attack success.

Use the established modern wording: “Physical attack.” and “Raise your anger 1 level.” Expand stages to power stages where needed without changing effects. Do not discard the original text used for comparison. Use Event, Setup, and Drill as the user's modern category names when those card types are produced; this package currently demonstrates Physical Combat.

Cards 1–10 are Common and use one red star. Original names, numbering, rarity, and card scans are referenced by the existing project source at https://retrodbzccg.com/card-images/saiyan-saga-commons/. Confirm other rarities from their actual source; do not copy a one-star marker to all future cards.

Retain existing illustrations. The approved Orange Standing Fist Punch and Red Lunge Punch artwork is included; the remaining first-ten artwork is retained from the project. Preserve it without repainting. An SVG master contains raster illustration layers plus vector panels and type; larger exports improve vector edges, not original raster detail.

## Renderer input fields

`set`, `category`, `rarity`, and `rarity_stars` can be supplied at the batch level and overridden on individual cards. Supported category labels are Physical Combat and Energy Combat. Other card categories require their matching approved template. Supply a verified integer `rarity_stars` from 1 to 7; the renderer does not infer rarity from a card number. For a different set, supply `set_emblem` as a path relative to the copied production directory. The bundled filename convention remains `saiyan-NNN` and should be changed in the working renderer when producing another set. The preview grid automatically grows to include every card, including single-color or one-card batches.

## Release checks

Verify exact titles, card numbers, attack values, CRD corrections, rarity stars, text fit, centered symbols, aligned footer groups, and clean continuous rails. Confirm all output dimensions and lossless WebP decoding. Review one full contact sheet and inspect each multi-line power block at readable size. Keep the native renderer and its input assets together for reproducibility.

## October 16 symbol weight standard

Use the approved Red symbol as the weight reference for every Toku Waza style. Read `native/assets/style-symbol-standard.json`: the shared main-stroke target is 9.0 pixels on the 1060 × 1484 design canvas. Red has tapered brush terminals; the measured central stroke median is approximately 8.94 pixels. Preserve that approved Red silhouette. Orange uses a 9.0 / 1.17 SVG stroke before its existing 1.17 scale, giving exactly 9.0 canvas pixels. Apply the same effective main-stroke target to future style symbols, with clean negative spaces and centered alignment. Never use the old thin 3.8-unit Orange stroke.

The current primary Orange reference is `assets/orange-matched-symbol-reference.png`; retain `assets/reference.png` unchanged as the historical October 15 source. Keep the existing black badge, orange color, card geometry, type, rules, and artwork unchanged. For web publication use the renderer's quality-92 1060 × 1484 preview WebP; preserve the 2120 × 2968 lossless WebP as the separate download file.

## October 16 shared Goku letter spacing

Use 4.0 design units of letter spacing for card titles and combat category labels, matching the approved GOKU and HERO PERSONALITY preview. Use the renderer constants `TITLE_TRACKING` and `CATEGORY_TRACKING`. Keep actual glyph bounds centered at the existing title and category centers. Retain the title's 900-unit fit limit, reducing only long titles' font size when required. Do not change power text, symbols, artwork, borders or footer spacing.

The current spacing references are `assets/orange-spaced-reference.png` and `assets/red-spaced-reference.png`. The primary reference in `artifact-template.json` is authoritative. Retain earlier references as historical sources.

## October 16 approved effect icons and charcoal footer

Use the native crossed-sword silhouette in `native/icons.py` for attack effects and the solid shield for effects that stop physical, energy, or either kind of attack. This rule applies to every future card, not only this five-card batch. Retain the downward blade orientation and curved guards from Black Hug Maneuver, and the solid scalloped-top shield from Black Knee Catch; the supplied examples are retained in `references/icon-sources/`.

Size both icons to the adjacent font's visible capital P height (34.349 design units at 49-unit Barlow Condensed Bold), aligning their tops and bottoms to the capital top and baseline. Use a 12-unit gap at this font size. Center the combined icon-and-wording group. Never use oversized em-height icons. Preserve all wording, timing and damage conditions.

The renderer recognizes unambiguous rows beginning Physical attack, Energy attack, Stop/Stops a physical attack, Stop/Stops an energy attack, or Stop/Stops any/all attacks. For other verified wording use `rule_icons`, one entry per rules row: `attack`, `block`, or `none`. Put separately labeled effects (such as Endurance) on their own row, so the icon sits next to the corresponding attack/stop text. Do not give a shield to wording saying an attack cannot be stopped.

Use `native/assets/footer-center.svg` for the charcoal center panel behind both footer lines. Use Rajdhani SemiBold at size 30 with 6-unit tracking for DRAGON BALL Z; keep the disclaimer in unstroked Barlow Condensed Regular at size 25, including the word Not. Retain the existing silver rails, side panels, symbol positions and card number. The new panel hides the old baked-in footer lettering.

The current references are `assets/orange-footer-icons-reference.png` and `assets/red-footer-icons-reference.png`. Earlier references are historical. Render a subset with `python render.py --only 1,2,3,4,5 --output /absolute/output`; alternate verified data can be supplied with `--cards /absolute/cards.json`.
