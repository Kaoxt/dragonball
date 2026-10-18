---
name: artifact-template-dragon-ball-ocg-combat-production
description: "Create Dragon Ball OCG combat cards with the permanent approved Orange and Red templates: original dark softly blurred colored backgrounds, colored Toku Waza symbols on black badges, fixed thin vector borders, consistent typography, and retained artwork. Use when the user selects Dragon Ball OCG Combat Production or requests new combat cards using the approved permanent October 15 designs."
---

# Dragon Ball OCG Combat Production

Use the approved October 17, 2026 black textured title/footer design with the retained orange and red decoration for new combat cards. Preserve the retained references unchanged.

The user's October 16 production standard applies to ALL future card templates, including Dragon Balls and Main Personalities: use native SVG geometry and outlined font paths for every label, rule, border, level, PUR, power stage and footer. Read `dragon-ball-ocg-vector-production` for the shared policy and the Dragon Ball and Main Personality renderers. Keep this package's existing combat geometry. Do not regenerate a completed card with AI to change its typography or frame.

Use the approved October 16 charcoal center footer and cap-height effect icons. Put crossed swords beside attacks and a solid shield beside stop-attack effects, including both physical and energy stops, on all future cards. Read the icon/footer section in `references/combat-production.md`.

## Original colored outer background — retained October 16, 2026 decision

Retain the original dark, softly blurred Orange or Red decorative background around the power box and footer as well as the title. Do not add a solid-black lower-background rectangle. Keep the separate charcoal center footer panel behind the brand and disclaimer. Preserve all artwork, symbols, panels and native borders. This supersedes the earlier solid-black lower-background trial.

Current references are `assets/orange-restored-footer-aligned-reference.png` and `assets/red-restored-footer-aligned-reference.png`. Earlier black-background references remain historical.

## Approved black textured panels — October 17, 2026

Use the approved Orange Standing Fist Punch black textured title and footer as the current Combat master. `assets/orange-black-textured-reference.png` is the primary reference; it reproduces the live approved card pixel for pixel. Earlier references are historical. Keep a black #000000 base with the existing 14-unit diamond geometry, #101113 lines and 1-unit stroke on the title and both footer side compartments. Keep the original dark badge and colored combat category bar unchanged. Keep the shaped black inset above the footer and the center brand/disclaimer panel with its #08090a-to-#000000 gradient. Keep the original Orange/Red outer decoration, all artwork, outlined type, thin silver borders, and rarity/number centers at y=1397.5. Never add a rectangular black lower background.

Use `native/render.py` and its retained inputs for new Combat cards. Both physical and energy Combat use this treatment. The renderer's pattern geometry, not a flattened image recolor, is authoritative. The Red reference is `assets/red-black-textured-reference.png`.

## Read first

- Read `artifact-template.json` for the primary orange reference.
- Inspect the current Orange reference named in `artifact-template.json` and `assets/red-restored-footer-aligned-reference.png` for the approved visual designs.
- Read `references/combat-production.md` before composing or editing cards.
- Read the user-supplied current CRD; `references/Expanded-CRD.txt` is the retained October 15 source and must not be assumed newer than a future user-supplied replacement.

## Production workflow

1. Verify set, number, name, rarity, style, category, and rules from the original card and applicable CRD. Preserve effect timing and whether damage depends on success. Never invent card text.
2. Copy the entire `native` directory into a new working directory. Keep the installed skill and references unchanged.
3. Edit the working copy of `cards-001-010.json` for the requested cards; the batch may contain any number of Orange and/or Red cards. Read the input-field rules below before changing set, category, or rarity. Supply each retained art image in `artwork/saiyan-NNN.png` at 1060 × 794; preserve its original aspect ratio. Keep the source image separately.
4. Reuse the native SVG frame, fonts, icons, footer placement, and approved decoration. Run `python render.py` in the copied production directory. It produces outlined SVG masters, 2120 × 2968 PNG and lossless WebP files, 1060 × 1484 previews, and a verification report. Requirements: Pillow, fontTools, NumPy, SciPy, and Inkscape CLI.
5. Use imagegen only when new raster artwork or an explicitly requested raster edit is needed. Generate artwork separately from text and frame; do not repeatedly regenerate complete cards to change borders, lettering, icons, or background color. When image editing is required, follow the current imagegen instructions and retain the reference images.
6. Visually check every card, including power lines and footer numbers. Confirm shared geometry within each style, correct rarity, and lossless exports. Never describe embedded raster illustration or symbols as vector artwork.
7. Save requested card artifacts persistently. Publishing to the website is separate from producing cards; use the user's current publishing authorization and established repository workflow.

## Retained variants

- Orange: `assets/orange-restored-footer-aligned-reference.png`; orange 橙 strokes matched to the Red main-stroke weight on a dark circle. Keep `assets/reference.png` as the historical original.
- Red: `assets/red-restored-footer-aligned-reference.png`; red 赤 symbol strokes on a dark circle.
- Both use the same fixed panels, typography, footer, borders, and geometry.

The dark circle background must not be recolored. Keep the original colored decorative background around the entire card while character art, type, symbols, and border contours remain sharp.

## Centered footer rarity and number — October 16, 2026

Center the rarity Dragon Ball and card number at y=1397.5 in the 1060 × 1484 design, the midpoint of the horizontal footer silver rails at y=1355 and y=1440. Use `FOOTER_SIDE_CENTER_Y` for both. Position the sphere from its visible alpha bounds and the number from its actual outlined glyph bounds; do not align padded raster canvases or text baselines. Keep the star centered in the sphere and retain the existing group center and spacing for single- and double-digit numbers. This supersedes the old y=1401 placement.

Current references: `assets/orange-restored-footer-aligned-reference.png` and `assets/red-restored-footer-aligned-reference.png`. Earlier references are retained unchanged.
