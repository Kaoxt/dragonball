# Card-type references — October 25, 2026

Apply this check to every card family and set before outlining rules text, exporting images or publishing catalog entries. Read the supplied original card and the current Expanded CRD first. Modernize references inside the power as well as the printed category and database type. Keep source quotations verbatim.

## Resolve meaning before changing words

| Meaning in the corrected source | Current wording |
| --- | --- |
| The old standalone **Combat** card category | **Event** |
| **Event Combat** as a category | **Event** |
| **Physical Combat** or **Energy Combat** category | Preserve the full category name |
| Combat step, entering/end of Combat, once per Combat, control of Combat | Preserve **Combat** and its timing |
| Broad Combat-card family, explicitly including all three categories | Preserve its scope; prefer **Event, Physical Combat, or Energy Combat cards** for clarity |
| The old Non-Combat card category that excludes Drills | **Setup** |
| Non-Combat Drill category | **Drill** |
| Broad Non-Combat reference that includes both kinds | **Setup or Drill** (adjust number and conjunction to preserve the effect) |

Never apply a global `Combat` → `Event` or `Non-Combat` → `Setup` replacement. Capitalization alone does not establish meaning. An old reference to a single Combat card type is not automatically the broad Combat family defined in later rules. Use set-era wording, explicit lists, CRD corrections and card-specific rulings to distinguish them. If unresolved, record the ambiguity and leave the effect unchanged until it is resolved.

The supplied `Expanded CRD.odt.txt` defines the broad Combat family as Physical Combat, Energy Combat and Events (Card Section and Glossary), and broad Non-Combat as Setups and Drills. Its Trunks Energy Sphere #84 correction expressly says Event; preserve that narrower correction. Never use the family definition to override a card-specific ruling.

## Concrete examples

- Trunks Saga #98 **Black Scout Maneuver**, supplied original: “Name any Combat, Physical Combat or Energy Combat card.” The explicit list distinguishes the standalone type. Write **“Name an Event, Physical Combat, or Energy Combat card.”** Preserve all opponents, all copies, Life Deck search and banishment. Apply CRD before finalizing the rest of the power. Do not create or publish #98 merely because it is a guideline example.
- A verified standalone “Search your Life Deck for 1 Combat card” becomes “Search your Life Deck for 1 Event,” not a search for all three types. Frieza #87 Krillin's Concentration already uses Event in current production.
- “HIT: No other Physical Combat cards can be played for the rest of this Combat.” keeps both instances: one names a specific card type and the other describes duration.
- “Name a Non-Combat card” that includes Drills becomes “Name a Setup or Drill card.” Saiyan #198 already uses this wording; do not change it to Setup alone.
- Preserve card titles, named-card references, historical scans, original_rules fields and quoted CRD text verbatim. Do not rewrite a title merely because it contains Combat.

## Required production gate

1. Classify every Combat/Non-Combat reference as category, broad family, phase/timing, constant-power terminology or a proper name. Record original text, relevant CRD/ruling, interpretation, and final wording.
2. Keep eligible cards, counts, targets, costs, timing, restrictions, optionality and duration identical. Renaming a type is not a balance change.
3. Update the editable display wording, outlined SVG rules and catalog rules/type together. Preserve original source wording separately. Check that search filters and detail pages use the current category names.
4. Run `tools/check_card_type_references.py` on final card data and native SVGs. It flags legacy types and potentially ambiguous references for review; it does not decide mechanics or rewrite text. Use explicit enumeration for verified broad-family references in final display text so the check remains unambiguous.
5. For an existing card, edit native typography only, preserve current font size and panels, and composite only old/new lettering footprints into retained exports. Verify zero changed pixels elsewhere, lossless equality, readable line breaks and the finished card image. Never regenerate artwork for terminology edits.
6. When auditing existing sets, check all published cards, including those with no rules text in the catalog. Inspect current card images or native outlined aria-label text; do not treat absent catalog rules as proof that a card is clear. Review OCR matches visually and investigate failed/empty extractions.

Use current categories in public data: Event, Setup, Drill, Physical Combat, Energy Combat, Dragon Ball, Main Personality (or the project's supported Hero/Villain/Hi-Tech variant), Mastery, Sensei, Location and Battleground. Keep legacy aliases only in explicitly historical source data or compatibility translation code.

## Unresolved references and checker limits

Frieza #46 and #47 Guldo currently say “This attack cannot be stopped by combat card defenses.” The original scans and supplied CRD do not establish whether this means Event alone or the three-type family. Preserve both powers until a card-specific ruling or explicit design decision resolves the scope. Do not infer it from the attack type. Both proposed replacements pass the terminology checker; a clean result is not proof that mechanics were preserved.

The checker reports recognized rule/category field counts. Exit 1 means wording needs review; exit 2 means no rule wording was extracted from at least one input and manual/extraction review is required. For a mixed catalog, review records individually for missing rules too. It recognizes current rules/power JSON fields and native rules-line, power-line, rules-text and power-text SVG identifiers; other schemas require an extraction adapter or visual review. Never treat zero findings or OCR alone as semantic approval.

## Repository checks

`npm test` runs the terminology fixtures and catalog gate. The audit JSON records the two unchanged Guldo exceptions by exact text and the existing 257 image-only rule reviews by card ID and image revision. New legacy references, changed ambiguous powers, and new or changed images without catalog rules require review. Add current display rules for new cards so their wording can be checked automatically. The historical audit is not approval to change card effects.
