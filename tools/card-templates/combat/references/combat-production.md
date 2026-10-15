# Combat card production rules

Use the unmarked `assets/reference.png` as the approved visual master. Use
`assets/combat-master-frame.svg` for reusable panel and border geometry and
`assets/combat-border-vectors.svg` for linework alone. Both SVGs contain actual
vector shapes; the reference artwork and lettering are raster. The frame has an
empty transparent art opening and no card-specific text or emblems.

## Fixed design

- Keep the 1060 × 1484 canvas and the same geometry across combat cards. Scale all
  coordinates proportionally for larger exports; never stretch width and height
  independently. The reference is the design authority, not an earlier mockup.
- Keep the title capsule, art separators, combat bar, style badge, rules box,
  and mirrored footer rails thin, clean and continuous. Reuse vector paths for
  native composition; do not run already-clean border layers through repeated AI edits.
- Match the fine, regular dark diamond texture on the title/bar/badge and both
  footer panels. Match the approved reference's separate dark charcoal-gray
  marbled outer-card texture, with restrained gray highlights and clean flowing
  detail. Avoid bright silver streaks, blurry smears and noisy AI texture.
  Never add a rectangular block or vertical seams below the title. Keep the
  illustration's own background independent of the outer-card texture.
- Use the Toku Waza style symbol in the combat circle, centered on both axes.
  For Black style use the regular-weight white 黒 glyph, without outline or glow.
  For other styles use the user's approved symbols and palette references; do
  not substitute a set logo, attack icon, or an unverified glyph in this circle.
- Keep the Saiyan Saga set logo small and centered in the bottom-left footer.
  Change only the set emblem when producing another set. Preserve white and blue
  artwork and adequate clearance from the footer rails.
- Keep the rarity Dragon Ball to the left of the card number in the bottom-right
  footer. Align their visible vertical centers, then center their combined bounds
  horizontally inside the panel. Leave a clear gap and balanced vertical padding.
  Use the set's verified rarity star count, not the example's count universally.
- The reference card is Uncommon with three stars. Common is one star in the
  user's requested convention; verify other rarities and set-specific conventions.
- Keep `DRAGON BALL Z` centered between footer panels and preserve the disclaimer
  `Not endorsed by Toei Animation or Funimation` without squeezing or clipping.

## Typography

Match the reference's wide geometric uppercase title and combat-label lettering.
Center each line vertically and horizontally within its available bar, with even
positive tracking and clear gaps between letters and words. Preserve the title
family and weight across cards; reduce size for long titles instead of compressing
letter shapes or using negative spacing. Keep the rules text bold and condensed,
with consistent weight and line spacing. Reflow longer rules within the safe box;
never crop words or distort glyphs to fit. Align the icon to the first rule line.

No original font files were supplied. Do not claim the reference text is editable
font text or that an approximate font is the exact original. For native production,
use the project's established fonts when available, keep an editable text copy,
and export a copy with text converted to vector paths once the layout is checked.

## Variable card content

Replace the artwork, title, category, rules, style symbol/colors, set emblem, rarity
and number from verified card data. Use `PHYSICAL COMBAT` or `ENERGY COMBAT` as
appropriate; use `EVENT` for combat events. Retain the user's broader naming
conventions `SETUP` and `DRILL` if this design is later adapted to those types.
Use crossed swords for physical attack rules, a burst for energy attack rules,
and a shield for stops. Keep burst and shield approximately the same visual size
as the swords. Put them at the start of the relevant power sentence, not in the
style badge. Use supplied icon references when exact silhouettes are required.

Consult the user's latest Expanded CRD and the source card before rewriting powers.
Keep costs, timing, conditions, damage, targets and effects intact. Follow the
project's consistent modern wording. Do not treat this example's rules or rarity
as defaults for other cards. Do not invent missing card content.

## Final check

Inspect the full card and enlarged title/combat/footer regions. Confirm continuous
lines, constant stroke weight, smooth curves, matched mirrored footer angles,
clean diagonal patterns, centered symbols, aligned rarity/number, clear tracking,
correct text, star count and number, and absence of annotations or new image
artifacts. Keep high-quality PNG/SVG masters. Prepare gameplay WEBP or print
outputs only when requested. This template does not itself publish any cards.
