# Shared card layout — October 18, 2026

Use this current standard for Personality (including High Tech), Combat and Dragon Ball masters. It supersedes earlier size and placement rules.

| Element | Canonical layout on 1060 × 1484 canvas |
| --- | --- |
| Title panel | x36, y26, width988, height101, radius50.5; dark stroke10.5, light stroke5.5 |
| Category bar | M184 954 H976 A47 47 0 0 1 976 1048 H184Z; dark stroke9.5, light stroke5 |
| Category text | Michroma Regular size50, tracking4, width factor0.84, white stroke2.5; center607,1001 |
| Title text | Same font/settings with default size50; shrink long titles to fit 900 units (750 for Personality) |
| Title text center | y76.5; x530 for Combat/Dragon Ball, x590 for Personality to accommodate its Level badge |
| Power box | x25, y1054, width1010, height286, radius44; dark stroke3 |
| Footer frame and inset | Exact native paths from shared-layout-parts.svg; rails y1355 and1440 |
| Rarity/number group | Absolute scale0.81 about907,1397.5; do not compound this reduction |
| Rarity sphere canvas | 44.064 × 44.064 after group scaling; stars scale with the sphere |
| Card number | Michroma effective size34.425; original42.5 inside scale0.81 group |
| Set emblem | x107, y1365, width84, height66 |
| Footer brand | Rajdhani SemiBold size30, tracking6, center530,1400 |
| Disclaimer | Barlow Condensed Regular size25, center530,1439 |

Keep type-specific category colors, PUR/Level, Toku Waza and seven-ball emblems, original artwork and power wording. Personality and Combat share the PUR/Toku circle center123,995.5 and radius83.5; Dragon Balls retain the seven-ball cluster. Title, category, power and footer panel geometry must be identical, including border widths and inset paths. Footer ball x coordinates vary with number width to preserve combined center907; both visible vertical centers remain1397.5.

Use the bundled shared_layout.py and shared-layout-parts.svg. The module sets absolute sizes and is safe to apply to an already-normalized master. Its three copies in the Vector, Combat Production and Combat Master packages must stay byte-identical. Both Combat renderers and the Dragon Ball renderer invoke it before output. Edit the retained Personality SVG and apply the same module after content changes. Keep titles, numbers and all structural lines outlined vectors.

The title and category font size are independent of the number size. HERO PERSONALITY is size50, matching PHYSICAL COMBAT, ENERGY COMBAT and DRAGON BALL. The smaller footer standard applies to all three types. This master update does not publish or migrate existing website cards.
