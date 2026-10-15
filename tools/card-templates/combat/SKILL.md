---
name: artifact-template-dragon-ball-ocg-combat-master
description: "Create an image using the Dragon Ball OCG Combat Master template and its retained reference file. Use when the user selects this template, selects this personal skill, or names Dragon Ball OCG Combat Master. Create consistent Dragon Ball OCG combat cards with clean thin borders, centered style and set symbols, aligned rarity and card number, and crisp evenly spaced typography."
---

# Dragon Ball OCG Combat Master

Create an image from this template. Keep the reference file unchanged.

## Workflow

1. Read `artifact-template.json` and resolve its paths relative to this skill directory.
2. Read `references/combat-production.md` and `assets/combat-layout.json` before composing a card. Retain the clean SVG assets for any native vector output.
3. Invoke $imagegen with the retained PNG as a reference image and the user's requested content as the edit or generation brief.
4. Treat the user's prompt and available sources as the content input. Do not invent factual claims merely to fill the composition.
5. Preserve the reference's visual language unless the user explicitly requests a deviation.
6. Visually inspect the generated image for fidelity and defects, then return the final image.

## Fidelity

Preserve the reference image's composition, visual hierarchy, palette, typography, material treatment, lighting, and recurring brand elements.

User instructions control requested content and explicit deviations. The retained reference controls layout and formatting where the user has not requested a change.

## Reusable assets

- `assets/reference.png`: approved, cleaned master example.
- `assets/combat-master-frame.svg`: text-free vector frame and panel surfaces.
- `assets/combat-border-vectors.svg`: transparent vector linework only.
- `assets/combat-layout.json`: geometry, alignments and reference-card metadata.
- `references/combat-production.md`: fonts, colors, icons, rarity and QA rules.

Use this master for both physical and energy combat cards. Preserve the same design while substituting verified card-specific content.
