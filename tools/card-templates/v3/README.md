## Personality title clearance and dark Villain bar — November 2, 2026

Read `tools/card-templates/v3/references/personality-title-and-color.md`. Personality titles (including Hi-Tech) use a maximum 640-unit visible width at x209.5–849.5, reduce font size uniformly as needed, and remain visibly centered at (529.5,79). Preserve at least 40 units of LEVEL-number clearance and inspect staggered brush notches. Shorter fitting titles stay unchanged. Villain middle paint is now dark crimson `#a61122`, sampled to match the darker V2 Cell reference, with existing grain/contours and white VILLAIN lettering retained. This supersedes scarlet `#cc2119`. The current repair covers 61 Villain bars and 15 oversized titles across 66 cards; preserve the historical category revision and follow `personality_finish_revision` for current hashes.

## Personality middle labels — November 2, 2026

All 134 current V3 Personalities (49 Saiyan, 24 Frieza, 61 Trunks, including Hi-Tech) use only `HERO` or `VILLAIN` in the middle bar. Preserve Michroma 38.4, four-unit tracking, weight, and visible center (529.5,908.5). Use the fixed `hero.svg` / `villain.svg` components. `middle_label_v3.py` maps former long labels to these components; gameplay category data remains unchanged.

The label-only revision is recorded in `tools/card-corrections/v3-personality-short-labels/`. Both existing export sizes are independently patched losslessly, with zero changed pixels outside the old/new label ink and antialias footprint. Artwork, titles, stages, rules, colors, PUR and footers remain unchanged. Preserve historical artwork/footer audits and follow the current audit row's `category_label_revision` before/after hashes. Do not rerender whole published cards for this repair. Verify idempotence with `python3 tools/card-templates/v3/patch_personality_labels.py <work> --apply`; current files remain byte-identical.

# Dragon Ball OCG Master Templates V3

## Trunks Saga 001–005 and upcoming Mastery cards

`trunks-001-005/` retains the current V3 sources for the first five Trunks cards. The original native double-C set mark keeps its 54-unit height and is centered by its actual visible ink at (211.75,1409.5); its open right edge is included in the measurement. The complete rarity-ball/number group is centered at (847.25,1409.5), with the standard 12.2-unit gap. All five use fixed native category text and measured title clearance.

Namek Dragon Ball 2 retains the approved front-facing Porunga from `Namek-Dragon-Balls-Porunga-Update.zip`, with unchanged full-card scale and color, both hands visible, and the current single-left two-star orb. It is an explicit original-scene exception. The other four illustrations retain their approved source bytes. Original scans, CRD checks, per-card observations and lossless export evidence are in `../../card-corrections/v3-trunks-001-005/`.

The user selected the new Mastery template for the remainder of this set. Read `references/mastery-v3.md` when reaching those cards: it supersedes historical pending-Mastery statements below and identifies the approved November 1 native source, inset sides, continuous Shenron surround, shared text geometry and mirrored footer. This five-card batch contains no Mastery cards and does not migrate them early.

## Current footer spacing — November 1

Use `scripts/footer_spacing.py` after footer data is complete. Center the visible set logo at x211.75 and the complete visible rarity-ball-plus-number group at x847.25, mirrored around the fixed endorsement center x529.5. Measure the ball and number together, including visible stroke; move them by the same horizontal amount. Do not anchor the number at x880 or the ball at x844. Preserve the existing 12.2-unit ball-to-number gap, all sizes, vertical positions, star layouts, brush material, title, artwork and rules. For new-card composition after replacing a number or rarity group, pass `--normalize-gap` to restore the standard gap before centering; omit it for a spacing-only repair of existing cards. Require an unchanged second run. This applies to every V3 family: Combat, Personality, Hi-Tech, Dragon Ball, Mastery, Sensei, Location/Battleground, Setup, Event, Drill, Ally, Freestyle and future types. It does not approve an otherwise unfinished family layout. Patch existing display and download images independently, and require zero changed pixels outside the old/new footer ink and antialias footprints.

All 257 Saiyan Saga cards (001–250 and P1–P7) have this footer-only patch. Frieza Saga 001–050 also have the current footer alignment; other cards retain their published spacing until separately requested. Evidence is in `../../card-corrections/v3-saiyan-001-050-footer-centering/` and `../../card-corrections/v3-saiyan-051-100-footer-centering/`, and `../../card-corrections/v3-saiyan-101-150-footer-centering/`, and `../../card-corrections/v3-saiyan-151-200-footer-centering/`, and `../../card-corrections/v3-saiyan-201-250-promos-footer-centering/`. To repeat the final batch verification, run `python3 patch_footer_001_050.py <work-directory> --range 201-250-promos`; already-current sources and exports remain byte-identical.

## Fixed native text and Villain accents — November 1, 2026

Use `assets/text/categories/manifest.json` and its retained native SVG components for category labels. `scripts/middle_label_v3.py` now reuses those exact outlined paths at (529.5,908.5); do not retype or independently offset Hero/Villain labels. The same components cover Combat, Setup, Event, Drill, Dragon Ball and other named families. A text component alone does not approve a new family layout.

Keep titles, rules, footer text, levels and stages as native outlined SVG groups. Use the shared title/rules/footer anchors and `scripts/text_layout_v3.py` to reject text drift before export. Titles retain complete visible-ink centering at (529.5,79), normal proportions, the current 760-unit maximum for non-Personalities, and the existing 700-unit Personality LEVEL clearance or narrower measured clearance. Preserve approved per-card wrapping and five-row power-box layout. Category components are fixed; content-dependent title and power text remain native SVG, never generated bitmap text.

Use `masters/Personality-Villain-Master-V3.svg` for the Villain family. It retains Raditz #170 as demonstration data and artwork; verify actual card identity and values independently. All four power-box corner decals use the established red fill `#8e1722`, with `#4c1119` shadow strokes. Preserve neutral highlights, outer rails and native paths. `scripts/personality_corners_v3.py` changes only those six paint attributes and is idempotent. `scripts/personality_middle_v3.py` also applies this rule during new-card composition. Hero accents stay blue. The Villain middle bar retains the approved scarlet `#cc2119`.

For localized repairs, keep every existing text path/position and artwork pixel unchanged. Patch each published image size independently and verify zero changed pixels outside the exact old/new edited ink and antialias footprint. Do not regenerate a complete card. The November 1 release corrects all 24 currently published V3 Villains, including Hi-Tech, and the Saiyan 101–150 footer groups.

## Current Tokui Waza backing — November 1

The current brighter V3 refresh covers Saiyan 001–170, including the newly migrated cards 151–170. Its 142 Tokui Waza cards use the reviewed soft charcoal backing; Dragon Balls 015–016 have no Tokui badge; Dragon Ball and Personality families are exempt. The native logo stays crisp and unchanged above a 90% charcoal silhouette (`#11171b`, 16-unit stroke, 4-unit Gaussian blur in the symbol coordinate system). The backing fills the Freestyle logo's counters and softly obscures the brush end without an opaque rectangular patch or circular badge.

Run `python3 scripts/tokui_backing.py <source.svg>` after choosing or replacing a style symbol, before rendering. The helper rebuilds the backing from the final symbol and is idempotent; both batch builders call it after their style selection. The Combat master includes it. The release evidence is `../../card-corrections/v3-saiyan-001-050-tokui/release.json`; only the badge footprint changes in display and full-size exports. The initial backing release covers 001–050; the 051–070 brighter release carries the same backing forward.

Saiyan Saga 001–170 use the approved native SVG brush-theme system. The released batches use retained site illustrations with localized corrections; Earth Dragon Ball cards use approved full-art V3 adaptations. The retained V1/V2 sources remain independent.

Use `references/version-3-standard.md` and the inherited artwork, facial-expression, anatomy, wording and icon references before editing. The title center is (529.5,79), middle label center (529.5,908.5), and footer content center y1409.5. Rules use outlined Barlow Condensed Bold49 with natural spacing. V2 typography finalizers must not run on these files.

`saiyan-001-050/` contains editable native SVGs. `assets/` contains deduplicated, content-addressed illustration and decorative raster layers. Keep relative paths intact. Text, symbols, frame rails and clipping contours remain native paths. Raster art and grain are intentionally raster; a vector template does not mean autotracing illustrations.

The continuous recovered V3 frame texture replaces the historical masked full-card backing. Retained native palette filters preserve Orange, Red, Blue, Saiyan and Freestyle themes. Brush ends use genuine transparency. No tiled strips, donor-card fragments or opaque rectangular seam patches are used. Title and footer charcoal are shared across families. Only Personality and Dragon Ball middle bars are colored.

The first batch includes localized artwork corrections to #004's undershirt, #008's gaze, and #036's boot. The original illustration bytes remain embedded as a separate layer beneath native clipped patches. Per-card review records distinguish actual original comparisons from retained-source review and explicitly record unavailable originals and inherited crop limitations.

To render a card, run Inkscape against its SVG at 2120px width. Validate the PNG before encoding the lossless full-size WebP; create the 1060×1484 display image from that final PNG. Verify outlined-text bounds and run `scripts/align_power_icon.py` twice, requiring an unchanged second run. Do not replace typography with generated text or regenerate complete cards for a localized artwork repair.

Release evidence is in `../../card-corrections/v3-saiyan-001-050/`. `tests/card-v3.test.js` checks the native sources, all raster dependencies, both export hashes, catalog cache keys and measured alignment. Original source files and historical V2 audits are retained for provenance; they are not evidence that an inaccessible original has been visually verified.

## Saiyan 051–100 release

The second batch includes 6 Personalities, 3 Dragon Balls and 41 Combat/Setup/Event cards. Native sources are in `saiyan-051-100/`; per-card data, actual-original visual review, localized corrections, and export verification are in `../../card-corrections/v3-saiyan-051-100/`. #91 retains the original 4-stage cost and 7-life-card damage, with banishment after use. Character-source bytes and the earlier Yamcha expression and Tien placement corrections remain separate native layers. New side extensions preserve source-visible hands, headwear and footwear. The composite viewBox must be mapped into the full V3 artwork window before rendering. The batch builder isolates font objects between render processes.

## Saiyan 101–150 release

The third batch contains 4 Personalities, 3 Setups, 4 Events, 12 Combat cards and 27 Drills. Native sources are in `saiyan-101-150/`; original scans, current Expanded CRD text, per-card visual notes, localized edge corrections and measured export evidence are in `../../card-corrections/v3-saiyan-101-150/`. #105 retains banishment as an attack cost. Full-height Personality artwork is centered left of the stage column using background continuation; native retained image layers protect the approved faces, poses and costumes. Cards with continuous damage reduction use infinity, while actual attack blocks use the shield. That release used a shared number left edge; the current November 1 footer standard supersedes it for future composition.

## Saiyan 001–010 brighter-background refresh — October 31

Cards 1–10 now use the user's reviewed current V3 preview: one 1.20 sRGB brightness gain on the continuous frame background, original dark brush paint, original Michroma with four-unit tracking, and uniformly fitted titles within x179.5–879.5. The middle paint uses `translate(0 848) scale(1 1.17)` clipped to y852–965 while the label remains centered at (529.5,908.5). Title and footer anchors are unchanged. Artwork groups, including #4's undershirt and #8's gaze corrections, remain byte-identical to the previous native sources. All ten powers use the native attack swords. Exact fine-expression checks for #1 and #6 remain unresolved at available original-scan resolution; they are not fidelity passes. Current export hashes, cache keys, native bounds and per-card notes are retained in `../../card-corrections/v3-saiyan-001-010-brighter/` and the updated first-batch audit.

## Saiyan 011–030 brighter-background refresh — October 31

Cards 11–30 use the same current brighter V3 frames, uniformly fitted titles and tracked Michroma middle labels as cards 1–10. Earth Dragon Balls 1 and 2 use the approved full-art Shenron without a central ball and a single left orb at (130,887), radius 118; star counts are one and two, with the retained diagonal two-star orientation. Rules and game data are unchanged. Fourteen attacks use swords; #28 and #30 use shields; the two activated Setups and two Dragon Balls have no constant icon. Seventeen actual character originals were compared, while #17's original remains unavailable. Fine-expression and inherited-crop limits are recorded explicitly in `../../card-corrections/v3-saiyan-011-030-brighter/artwork-review.json`.

## Saiyan 031–050 brighter-background refresh — October 31

Cards 31–50 use the current brighter V3 frames, uniformly fitted titles and tracked Michroma middle labels. Character artwork and rules remain unchanged, including #36's repaired boot and the approved replacements for #37 and #44. Six attacks use swords, eight blocks use shields, and six triggered/activated effects need no constant icon. Ten original scans were directly compared; original retrieval for #41–50 is unavailable. Known fine-detail and source-crop limitations are recorded in `../../card-corrections/v3-saiyan-031-050-brighter/artwork-review.json`.

## Saiyan 051–070 brighter-background refresh — October 31

Cards 51–70 use the current brighter V3 frame, uniformly fitted titles, tracked Michroma middle labels and the approved soft translucent Tokui Waza backing for every style. Black cards 65–70 restore the approved medium-charcoal base palette with the current frame brightness gain. Artwork and rules remain unchanged, preserving the earlier corrections on 53, 57 and 65. Eight attacks use swords and twelve blocks use shields; there are no constant powers. All twenty actual printed scans were compared. Fine and obscured details are documented individually in `../../card-corrections/v3-saiyan-051-070-brighter/artwork-review.json`. Dragon Ball and Personality cards remain exempt from Tokui backing; neither type occurs in this range.

## Saiyan 071–120 brighter-background refresh — October 31

All 50 cards use the brighter V3 frame, fitted titles, tracked middle labels and aligned footer content. All 37 applicable cards have the soft Tokui Waza backing; Dragon Balls 75–77 and ten Personalities remain exempt. Dragon Balls use one left orb with 3/4/5 stars, including the approved staggered four-star layout. Personality stages, LEVEL and PUR values remain intact. Yamcha 85 shifts 25 native units left at identical scale to uncover his extended fingertips; the original scene remains behind the stages. Saiyan Armor (81) and King Kai Uniform (88) use the approved bold infinity with a separate colon. Earth Dragon Ball 3 restores the printed optional draw; the other effects retain the reviewed CRD wording. All 50 original scans and final renders were reviewed; see `../../card-corrections/v3-saiyan-071-120-brighter/`.

## Saiyan 121–170 brighter V3 release — November 1

Cards 121–170 now share the brighter V3 frame, tracked middle labels and footer anchors. Cards 151–170 migrate from their retained V2 website exports; all 13 Personality cards retain verified LEVEL, PUR and stage values and remain exempt from Tokui backing. All 37 other cards have the soft backing. The reviewed powers use 12 swords, 6 shields, 26 bold infinity/colon symbols, and 6 effects without an icon. Retained illustration bytes remain intact; only the chest insignia on Gohan 165/166 uses a clipped costume patch. Original scans, wording checks, visual notes and exact export evidence are retained in `../../card-corrections/v3-saiyan-121-170-brighter/`.

### Long title clearance — current user direction

Titles use a maximum visible width of **760 native units**, x149.5–909.5, following the reviewed wider #125 example. Keep the **complete visible ink**, including descenders, centered at **(529.5,79)** at every font size. Teko SemiBold stays at its nominal 86.0349127182045 size unless a long title needs a uniform reduction. Never compress letters horizontally or apply a separate optical/baseline offset. This supersedes the older 620/700-unit limits for the current V3 cards and future composition.

Inspect each final glyph against the distressed brush contour. Where a letter approaches a notch, supply a slightly narrower safe region to `scripts/title_fit_v3.py` and retain at least one native unit of measured clearance. The helper retains that measured limit in `data-brush-safe-width` for the same title wording; replacing the wording requires a fresh clearance check. Personality titles retain their separate 700-unit maximum for LEVEL clearance. Require helper idempotence and inspect both display and full-size exports.

The title-only repair covers Saiyan 001–170: 53 titles changed; 117 already-correct cards remain byte-identical. Evidence is in `../../card-corrections/v3-saiyan-001-170-titles/`. For a typography-only repair, patch each published resolution independently. Require an exact match between the old rendered title pixels and the baseline, then compare the final lossless exports pixel by pixel. No pixels outside the old/new title lettering and its antialias footprint may change. Do not re-render or resample the rest of the card.

The 171–220 migration is recorded in `tools/card-corrections/v3-saiyan-171-220/`, including retained Hi-Tech portraits and per-card original/CRD review. Cards 001–220 now use V3; the 001–170 title-only repair remains an independent immutable audit.

## Complete Saiyan Saga and current Personality bars

All 250 numbered cards plus P1–P7 now use V3. The final 37-card source/review/export evidence is in `../../card-corrections/v3-saiyan-221-250-promos/`. Retain original LEVEL/PUR values; level-four glyphs use the native four from the verified PUR reference, not another card’s level label.

The current user direction is a stronger scarlet Villain middle bar, `#cc2119`, retaining neutral black paper grain. Run `scripts/personality_middle_v3.py` after choosing the Personality family and artwork. For Hi-Tech cards, pass `high_tech=True`: the helper adds a soft charcoal silhouette of the native brush contour beneath the colored bar, clipped to the existing y852–965 middle region. This explicit Hi-Tech exception removes colored artwork bleed while preserving the distressed paint and avoids square patches. It supersedes the earlier unrestricted transparent-middle-edge rule only for these Hi-Tech bars. Hero blue, all lettering, PUR geometry and artwork are unchanged. The helper must be idempotent.

All 19 V3 Villain cards use the scarlet paint, and all seven Saiyan Hi-Tech cards use the backing. The localized revisions to 16 already-published cards have zero changed pixels outside y849–968 at either resolution. Small pre-existing Inkscape rounding differences are preserved by applying the old/new native material pixel delta to each published image independently. The checks record these differences explicitly. See `../../card-corrections/v3-personality-middle-bars/`.

## Frieza Saga 001–010

The first ten Frieza cards now use the current V3 system. `build_frieza_001_010.py` reuses retained artwork, the approved current #4 backdrop and #7 mouth patch. The white native Frieza mark uses its actual stroked bounds, uniformly scaled to 53.7814 units wide and centered at (211.75,1409.5). Both exported resolutions are verified. Per-card originals, current CRD review, measured title clearances and footer evidence are in `../../card-corrections/v3-frieza-001-010/`.

Frieza Saga 011–060 now use current V3, recorded in `../../card-corrections/v3-frieza-011-060/`. Preserve the twelve verified Personality LEVEL/PUR/stage sets and Guldo #45’s native front-eye correction. All fifty retain the same stroked-ink Frieza footer center (211.75,1409.5). Both display and download are lossless and independently checked. The next migrated range is documented below.

## Frieza 001–050 current footer alignment

Cards 001–050 retain their approved V3 frames, fixed native SVG text, original reviewed artwork and red Villain corners, with the updated mirrored footer centers. The Frieza set emblem remains at (211.75,1409.5); the complete rarity-ball/number group is centered at x847.25. Preserve its 12.2-unit inner gap and all vertical positions, sizes and rarity stars. Both published resolutions were patched independently with zero unrelated pixel changes. Evidence is in `../../card-corrections/v3-frieza-001-050-footer-centering/`. Repeat verification with `python3 patch_footer_001_050.py <work> --set frieza --range 001-050`. Cards 051–060 now use the same centers; see `../../card-corrections/v3-frieza-051-060-footer-centering/`. Future composition continues to apply the current footer helper automatically.

## Frieza Saga 051–100

`build_frieza_061_100.py` migrates forty retained cards with current native text, V3 brush geometry, normal-proportion title fitting, and automatically centered footer groups. Cards 051–060 receive an independently verified footer-only patch. All 100 published exports are lossless and tied to source hashes. The 27 current V3 Villains, including the three new Personalities, use red power-box corner decals.

Evidence in `../../card-corrections/v3-frieza-051-100/` includes all fifty original scans, individual visual/CRD reviews, source data, and exact render checks. Preserve sky-only overlays on 85/87/97/100, the original raised-arm pose replacement on 89, and the retained Nail 96 expression patch. Small original facial details that cannot be resolved are explicitly recorded rather than marked as expression passes. Titles 64/72/74 use measured narrower clearances. The remaining cards are covered by the completion release below.

## Frieza Saga completion

All 136 Frieza cards (001–125 and P1–P11) now have native V3 sources. `build_frieza_101_125_promos.py` finishes the remaining 36 with the shared fixed SVG text, mirrored footer groups, 12.2-unit ball/number gap, and red Villain power corners. It sets absolute ball/number coordinates after replacing donor content, then checks the measured bounds and footer helper idempotence. Titles 106, 109 and P2 retain measured 740-unit limits for brush-notch clearance. `verify_frieza_101_125_promos.py` verifies final render/export equality, asset hashes, outlined title clearance and the bounded retained P11 expression patch.

Evidence: `../../card-corrections/v3-frieza-101-125-promos/`. Keep #125’s approved rear-facing Goku: original visible artwork pixels come from the pre-migration published download, with its native rear-view source supplying only former UI occlusions. No front-view illustration may replace this exception. The selected artwork, original rules/values, Level 4/PUR 4 and six-star rarity are retained. Preserve P11’s already approved smirk. All 36 were individually reviewed against original scans; unreadable small or foil-obscured facial details remain explicitly unresolved. This completes Frieza; no later set is implicitly migrated.


## Trunks Saga 006–055

The next 50 cards use current V3 in `trunks-006-055/`, with per-card rules, original scans, expression/composition notes and export evidence in `../../card-corrections/v3-trunks-006-055/`. The Namekian component introduced here preserves the retained teal-green frame hue and native 無 silhouette, centered at (100,908.5), with 130-unit outlined height and the shared soft backing. Use #7 as the Namekian V3 donor for subsequent cards. Its middle brush remains common charcoal; its four rules corners retain the Namekian hue.

All cards retain fixed native text, one effect icon maximum and the saga/rarity-number footer centers (211.75,1409.5)/(847.25,1409.5), with a 12.2-unit inner gap. #25 retains approved frontal Porunga at unchanged scale and color, with a single one-star category orb; its rules now correctly return the top **2** discard-pile cards, as printed. #40 retains its corrected crop; #52 retains its isolated open-mouth patch. #41 starts two-star Uncommon rarity. No Mastery cards occur here; use the approved source in `references/mastery-v3.md` when reaching them.

Run `build_trunks_006_055.py --retained <retained-source-directory>` and `verify_trunks_006_055.py` for this batch. The original source range 001–010 and current Porunga inputs remain in the preceding Trunks source directory; editable masters point only to portable content-addressed assets after composition. Historical releases remain immutable.


## Trunks Saga 056–105

`trunks-056-105/` contains the next 50 native V3 masters. Evidence in `../../card-corrections/v3-trunks-056-105/` retains originals, the current attached CRD, individual artwork observations, native geometry and export hashes. All 50 retain two-star Uncommon rarity. Namek Dragon Balls #79/#80 keep frontal Porunga and separate three/four-star category orbs. The six Villains #100–105 retain independently checked Level/PUR/stages, red corners, scarlet middle bars and fixed native labels.

Preserve the earlier artwork corrections to #58 (victim behind impact) and #89 (Goku hand). The common art mapping adds no crop or zoom; Dragon Ball full-art colors and scale remain unchanged. Title ink clearance is measured before rendering. Footer centers remain (211.75,1409.5) and (847.25,1409.5), with a 12.2-unit ball/number gap.

Run `build_trunks_056_105.py --retained <retained-source-directory>` and `verify_trunks_056_105.py`. The 031–080 archive remains in the preceding batch directory; 081–130 is the new retained input. Source archives are converted to portable content-addressed assets. No Masteries occur in this batch; the approved future Mastery source remains in `references/mastery-v3.md`.

### Trunks 106–155

The 50-card migration includes 12 Personalities, six Masteries and three approved full-art Porunga Dragon Balls. Native sources are in `trunks-106-155/`; original/CRD, geometry, artwork and export evidence is in `../../card-corrections/v3-trunks-106-155/`. `masters/mastery-v3-source/` retains the exact approved source in gzip parts, with its original hash from `references/mastery-v3.md`. Use `scripts/mastery_source_v3.py <output.svg>` to recover the original SVG byte for byte. Style variants preserve its pointed artwork and inset continuous surround. The unused legacy pattern with a dangling reference is removed only in working card copies. Blue Mastery retains the previously published mouth correction as a local image layer.

Use `build_trunks_106_155.py` with the retained 081–130 and 131–180 archive paths recorded in the card inputs, followed by `verify_trunks_106_155.py`. Retain corrected original PUR values (109=2, 110=1), #133 bottom-of-Life-Deck placement, #129 without an unsupported deck limit, and native bold 4/5 outlines. Native 2x exports are lossless and display images derive from those renders.

## Trunks Saga 156–200 and P1–P5

`trunks-156-200-p1-p5/` contains the fifty native V3 sources: 43 Personalities (including ten Hi-Tech), one Setup, three Combat cards, one Event and two Drills. Each source retains its own original Level/PUR/stages and printed number; Hi-Tech Goku retains the separately approved top-stage correction. Use the masked repairs and retained correction layers listed in the repository card-production instructions. The original scans, current CRD, per-card visual observations, rules review, title/geometry measurements and both lossless export checks are in `../../card-corrections/v3-trunks-156-200-p1-p5/`. Hi-Tech backgrounds retain their approved full-art exception and original brightness; all Villains retain red corners and the scarlet isolated middle brush. Rarity follows the original scans, including six stars for Krillin #156 and two stars for the five promos.
