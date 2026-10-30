# Dragon Ball OCG Version 3 — shared production standard

Approved scope: Personality and Combat brush-theme masters, October 30, 2026, including the wider footer brush. Apply the quality rules below to every card family: Main/Hi-Tech Personality, Combat, Dragon Ball, Mastery, Sensei, Location, Battleground, Setup, Event, Drill, Allies, Freestyle and future types. Dragon Ball V3 has now been approved with an orange middle bar, the retained seven-ball style emblem and full artwork. Setup cards 001–050 inherit the Combat V3 frame and their existing category/style marks. Mastery V3 remains pending. A shared quality rule is not approval of an uncreated family layout or of unverified game data.

## Precedence and retained versions

Use the native V3 files for new Personality/Combat V3 work. Keep V1/V2 masters and existing website cards intact. Never run a V2 panel, title, badge or frame finalizer on V3: it would restore the old geometry. Retain V2's quality, reference fidelity, CRD and export checks while using V3's approved visual coordinates. For an explicitly requested V2 card, use V2 geometry and these version-independent quality checks.

The retained Goku example's Level 1/PUR 1 and its values are design-demonstration data. Verify actual set, number, Level, PUR, stages, rules and rarity from the original plus CRD for each production card. Do not infer values or rarity from a preview.

## Native structure and texture

Render titles, labels, rules, numbers, icons, frame rails, contours, clipping paths and rarity stars as native SVG paths or outlined fonts. Use one shared definition for repeated stage boxes and common panels. Do not ask image generation to redraw complete cards, lettering, borders, logos or alignment. Retain illustration and decorative grain as clearly identified raster layers; an SVG containing a flattened card is not a vector template.

Keep the approved single standalone background image at native scale. Let it show through true alpha at both ends of every brushstroke. Do not tile, mirror, repeat or stretch narrow frame strips; do not hide seams with opaque rectangles, source-card crops or compressed extra brush copies. Preserve the recovered blue and red assets. Their direct reuse is verified; do not claim pixel identity to a current website export without a comparison.

Remove wobbled, doubled, discontinuous, fuzzy or jagged structural lines. Intentional distressed paint is decoration, not an excuse for duplicated borders or geometric seams. Keep raster texture clipped beneath clean native structure. Preserve the real artwork around stage gaps, the thin original art border and the recovered continuous outer texture.

## Locked shared V3 geometry

Canvas 1060 × 1484; lossless export 2120 × 2968. The retained SVGs and shared-layout.json are authoritative.

- Title: y12–146; single name only; Teko SemiBold 86.0349127182045; visible center (529.5,79). Keep cap size and fit long titles horizontally within the safe region without moving panels. The title sits on top of the art's top border.
- Image: x14–1047, y146–852. Preserve original camera distance and width-relative subject scale.
- Middle: y852–965; label visible center (529.5,908.5); Michroma 38.4, retained weight/tracking/width factor. Hero is blue; Combat charcoal is exactly the title/footer paint. Preserve the card's actual style color in its Toku Waza symbol, with no circle. Do not infer style from card category.
- Rules: shared native outer path `M45 965H1013L1034 986V1318L1013 1339H45L24 1318V986Z`. Use the same light paper, contours and family-accent details for Personality and Combat.
- Footer: y1353–1466; content center y1409.5. The wider shared brush maps source x0–180 to 0–145, x180–880 to 145–915, and x880–1060 to915–1060. This widens the dense body 10%, retaining feathered ends without enlarging typography or logos. Use this fuller footer for every V3 family as their layout is created.
- Footer text, saga mark, rarity ball, stars and number use actual visible bounds for vertical centering. Keep title/footer paint color identical between families. Keep the smaller saga mark and nonbold disclaimer.
- Personality: retain the floating left LEVEL stack, no divider; number-only full-height horizontal PUR brush on the left of the middle bar. Do not restore a PUR label, circle or plated badge. Hero/Villain share geometry, with their established blue/red theme.
- Stages: rectangular dark-grey fields; x813.75–1047, y146–852, 11 rows in the Goku example. Do not stagger ends or reset the distressed rims/gap overlays. Keep flush edge placement and opaque fill. Right-align values; align their digit bodies optically, excluding comma tails so commas do not lift the digits. Actual count/values are card-specific.

## One consistent power-icon system

Use the bundled native swords, shield and infinity shapes. One effect icon maximum: attack swords for attacks (including an attack that also blocks); shield for a non-attack that stops attacks; infinity for constant effects. Damage reduction alone does not imply a shield. Toku Waza/category/set/rarity marks are separate and do not count as power icons.

Size by the visible capital-letter band, not font em size, padded viewBox or full mixed-case line. Default Barlow Condensed Bold 49 has a 34.3-unit cap height: make swords, shield and infinity approximately that visible height, with natural widths and their approved weight/orientation. Do not enlarge an icon because it is the only content on the card. Keep the standard 12-unit text gap at size 49, scaled proportionally for deliberately approved text scaling. Center the combined icon plus associated line horizontally as a group.

Align the actual filled/stroked symbol to the adjacent capital-letter band after all layout changes. Descenders in words such as Physical do not define the center. For infinity plus colon, measure and move the infinity separately; keep the colon's geometry and text placement intact. Use scripts/align_power_icon.py, then run it again and require zero movement within 0.01 native units. It handles a retained nested SVG viewport by adjusting its parent-coordinate x/y, rather than incorrectly scaling the offset. Inspect normal-size exports as well as numerical bounds.

Rules use Barlow Condensed Bold49, natural width, no extra tracking/stroke, #060606, and 59-unit line pitch. Fit text by sensible line breaks in the approved panel. Do not move/resize the panel or silently shrink the font to hide an overflow. Preserve single-icon positioning when wrapping.

## Original artwork is the visual authority

Read the original-reference review documents in this package before generating or revising art. Compare the actual original and the finished card at equal illustration width, then inspect both at normal size and enlarged. Earlier AI redraws, prompts, successful renders, dimensions and hashes do not establish fidelity.

- Preserve pose, camera angle, subject scale, original crop and all visible hands/arms/legs. Do not zoom or crop-to-fill, stretch the drawing, arbitrarily shrink characters or add unrelated scenery. An original close-up stays a close-up. Extend only necessary edges coherently for a changed window.
- Check each character's clothing: garment type, sleeves, armor shape/panels, shoulder pads, undersuit, sash/belt, boots, gloves, cape/scarf, insignia, colors and damage/tears. Match the original saga/form rather than a generic familiar outfit. Trace both arms and all visible hands to the correct body.
- Compare each eye independently: open/closed, gaze and pupil; brows, mouth opening, teeth, smirk direction, sweat/tears and head tilt. Preserve subtle expressions and foreshortening. Do not turn a relaxed smirk into a stern face, sweat into lightning, or hair into a limb.
- Retain the approved crisp modern cel shading and richer palette. Preserve original background structure, clouds, terrain, negative space and palette; keep an abstract teal scene abstract. Record separately approved full-art or other departures as explicit exceptions.
- Reuse correct retained artwork. For a local correction, use the smallest necessary isolated artwork patch and protect unrelated pixels. Never regenerate the entire card to repair a face or clothing detail.
- Mark obscured or unclear features unresolved. Resolve confirmed mismatches and recheck final display and full-size exports before calling the card ready. Keep per-card results; one approved example does not establish a whole set passed.

## Wording and game-data checks

Read card-wording.md. Check the current user-supplied Expanded CRD before modernizing printed text. Retain original text, applicable errata, corrected effect and final wording separately. Preserve mechanics, costs, damage, timing, targets and optionality. Use AT, generic attack wording followed by DAMAGE, the appropriate single native icon, and conditional/unconditional banishment accurately. Put applicable `Banish after use.` at the end; special deck limits at the start. Attach signs to their numbers (`+3`). Do not infer icons, rarity or game values from appearance.

## Release checks

1. Check card identity, all values, star count, wording/CRD and correct style/category/set marks.
2. Check shared panel coordinates/colors, native glyph outlines, clean contours and absence of square brush backings; use the same rules box across matching families.
3. Measure title/category/footer centers, icon cap alignment/idempotence and stage digit centers. Verify no clipping, oversize icons, arbitrary offsets or comma-induced shifts.
4. Compare original and finished artwork for pose/zoom, anatomy, expression, costume and background. Record reviewed reference and final asset hash; unresolved is not a pass.
5. Render and visually inspect normal-size and 2120×2968 PNG. Export lossless WebP with identical decoded pixels. Preserve native source and fonts. For isolated edits, verify zero changed pixels outside the permitted footprint.
6. Save masters and previews. Publishing or migrating existing website cards is a separate action; template approval does not publish a set. Report saved, visually reviewed and published/verified status separately.

## Footer side-group spacing and rarity stars — October 30, 2026

Use the updated native masters and `scripts/footer_spacing.py`. Leave the endorsement/brand centered. Place the saga mark and the complete ball/number group inward with approximately 96 native units of visible clearance from either end of the endorsement. The current whole-pixel translations are +78 for the saga mark and -38 for the ball and number; the resulting gaps are 95.6596 and 95.5. Keep sizes, glyphs, ball-to-number gap (12.2), vertical centers and the brush material unchanged. Use the same anchors across Personality and Combat. Do not position a three-digit number out in the thin distressed brush tips.

For the four-star ball, follow the supplied `Goku-179-Rarity-Reference.jpg`: two horizontal rows with the lower row offset right, not a regular square grid. Star-center offsets as fractions of the ball radius are (-0.40,-0.22), (0.20,-0.22), (-0.14,0.22), (0.46,0.22). Retain the existing native upright star shapes, their size and red fill; move the centers only. Keep one-star balls centered. Verify other star counts against their own approved originals rather than copying the four-star layout. This layout correction does not change Goku's current card number, rarity count, artwork or game text.

Run the helper once after footer data is complete, then require a second run to make no changes. Compare final PNG pixels and require all changes to be restricted to the old/new saga, ball and number footprints.

## Genuine brush transparency — October 30, 2026

The shared charcoal material now uses `clean-native-brush-paint-contour`; the personality PUR material uses `clean-native-pur-paint-contour`. These native SVG contours remove faint retained edge paint and the previous stepped rectangular cutoffs. The same shared definition controls title, middle and footer ends, including the wider footer mapping. Keep the retained raster paint and single full-card background bytes unchanged. No background fragment, colored rectangle, copied strip or smudged fill may be added behind a brush end.

Use `scripts/clean_brush_alpha.py` for an older master lacking these contours; require an unchanged second run. Preserve the current contours for new card data. The helper requires lxml, Pillow, numpy, scipy and contourpy. The `transparent-overlays` examples show the actual middle layer on RGBA transparency. Render that layer separately and compare its fully clear pixels against the original background at the same coordinates in the final card. The supplied report tested 40,549 Personality and 54,349 Combat pixels with zero differences. All unrelated native components and image bytes were unchanged. Pixel changes were confined to brush panels; 44 Personality and 53 Combat interior pixels had at most two channel levels of raster rounding from clipping. Preserve intentional texture while removing structural seams.
