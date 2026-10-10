# Approved personality frame

The user approved `personality-approved-reference.svg` on October 9, 2026,
and requested this design for personalities in subsequent card batches.
`personality-approved-overlay.svg` holds its editable vector frame geometry
at 1070 × 1470. The reference contains the current Goku #158 artwork solely
to show the approved layout; that artwork still needs restoration when #158
is reached.

- Use blue for heroes and deep red for villains, never pink.
- Keep the straight silver borders, clean corner joins, and an angular number panel with a separate, narrower LEVEL tab beneath it, per the October 10 reference. Keep the number bold and slightly oblique; center the label within the tab.
- Keep the power-stage boxes toward the right, with visible clearance from
  the outer frame and separate, evenly spaced rows.
- Use a restrained, matte scouter appearance with translucent dark panels.
  Avoid bright gloss, heavy glow, and overlapping borders.
- Set each card's own title, level, PUR, stage values, alignment, ability,
  and card number. Goku's values are reference content, not template defaults.
- Preserve artwork when replacing a frame. Clean up Goku #158's character
  art and background separately when updating that card.
- Work from vector geometry and immutable source images so repeated edits
  do not accumulate distorted lines.
- Artwork framing: use `restore-personality-framing.py` for the existing
  personalities. The recovered 721 × 579 illustration fits the 761 × 593
  visible window beside the scouter. Never enlarge that crop to the full
  994px artwork-plus-scouter width: it zooms and truncates the character.
  Keep a matte backing behind the stage column, render the existing SVG
  paths on top, and preserve every pixel outside the artwork mask.

Cards #21–70 contain no personalities. Their renderer rejects personality
cards, so this template must be applied deliberately in later batches.
This reference supersedes the earlier glossy personality frame; the older
`docs/saiyan-personality-theme-progress.json` records the previous rollout.
