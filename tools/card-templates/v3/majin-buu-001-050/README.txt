Majin Buu Saga — cards 001–050

49 completed card faces; #032 Saiyan Energy Deflection has an explicitly labeled source-art preview and still needs replacement artwork. No site changes or publication were made.

CONTENTS
display/: 49 ready WebP images, 1060×1484 (West City: 1484×1060).
downloads/: the same 49 cards as lossless WebP, 2120×2968 (West City: 2968×2120).
review-only/: #032 preview in both sizes. Never publish this as a finished image.
native/masters/: all 50 editable SVG masters with outlined type and linked artwork.
native/assets/: required linked artwork and retained template materials.
new-cards.json: source, rules, CRD review, placement and final card data.
catalog-ready.json: 49 proposed catalog entries with final file hashes.
card-checklist.csv/json: every card and its status.
previews/: all-card review sheets and a four-card preview.
originals/, ocr/, Expanded-CRD.txt: source evidence used for the wording review.
generation-history/: prompts and generation provenance, including corrections.
set-logo/: approved set lockup and emblem assets.

RELEASE NOTES
• #049 Black Weakness Drill is BANNED under the supplied Expanded CRD. Its artwork is complete and included for the collection, but retain the ban in deck legality. Do not assume a new metadata field alone enforces the website's deck rules; integrate with its existing ban mechanism.
• #032 is excluded from catalog-ready.json and the release image directories.
• The Buu card emblem uses the same 70-unit visible width as Babidi; its natural height is approximately 51.53 units. No shape distortion.
• Rules preserve Empower ordering and verified default energy costs. Non-Combat references become Setup/Drill references; AT, HIT and Banish after use follow the project conventions.
• #033 is Physical Combat according to the printed card, despite a retailer Energy Combat tag. Other source title discrepancies are recorded in new-cards.json.
• Five Dende Dragon Balls reuse the approved V3 Dende/Shenron illustration, with individual rules and correct star counts.
• Bee uses level 1, PUR 0 and power stages 10 down through 0, with the illustration centered left of the stage column.
• Type, borders, icons and rarity stars remain native SVG. Both image sizes were independently rendered and verified lossless. Most generated illustration sources are approximately 1517×1037; export dimensions do not imply that all illustration pixels originated at 2× resolution.

CODEX HANDOFF — WHEN PUBLICATION IS REQUESTED
1. Read the destination repository's current AGENTS.md and preserve unrelated changes.
2. Merge the 49 entries by id into the existing card catalog, using the set name Majin Buu Saga. This is a new set, source Score Buu Saga (2003).
3. Add display files at /assets/cards/ and download files at /assets/cards/downloads/, following the repository's current storage/object-upload convention. Preserve the per-file cache hashes in catalog-ready.json.
4. Add the supplied set logo through the existing set-branding mechanism. Preserve the approved icon-to-title gap and shadow styling.
5. Enforce the Black Weakness Drill ban and leave #032 out of the ready catalog until its illustration is replaced and checked.
6. Check card-page image links, both download sizes, set filters, counts and deck legality before deployment. This handoff itself does not publish anything.

REBUILD
Python 3 with Pillow, lxml, fontTools and numpy; Inkscape on PATH.
From this directory: python native/build_new_cards.py 41
Omit the number to rebuild all 50. The builder keeps #032 under review-only/.
Verify rendered text: python native/verify_export_ink.py
The selected artwork paths in new-cards.json point to the bundled native/assets files. SVG masters reference ../assets; retain this relative directory structure.
