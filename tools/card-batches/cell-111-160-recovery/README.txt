CELL SAGA #111–160 — RECOVERY CHECKPOINT

This branch is a recovery checkpoint, not a completed release.
49 cards were built locally before the execution environment became unavailable.
#157 Z Warriors Gather has no completed new artwork: image service rejected two benign group-portrait redraw attempts. It must remain unpublished.

This checkpoint preserves 72 already-uploaded WebP files: display and high-resolution download for 36 cards. uploaded-assets.json contains SHA-256, Git blob SHA and the original local path for each asset.
The remaining 13 completed cards had not uploaded when the environment failed:
111, 114, 121, 122, 132, 133, 134, 140, 141, 142, 156, 158, 159.
Do not add the incomplete batch to the live catalog or declare all 50 finished.

LOCAL RECOVERY LOCATIONS
Production: /dev/shm/Cell-Saga-111-160
Isolated integration checkout: /dev/shm/dragonball111
The workspace copy of Cell-Saga-111-160 is stale; prefer the /dev/shm project if it survives.
Base main at outage: b1ad2039b503d09e878f4b67463eb9726a7d8fa4.

Production contains source/cards.json (50 entries, 157 publish:false), source/build.py, source/verify_release.py, masters/49 native SVG, png/49, lossless-webp/49, display-webp/49, originals/50, qa/final-N.jpg, reports/N.json and reports/release-N.json.
Latest authoritative art selections: source/final-artwork-records.json and source/artwork/cell-N.png.
Do not rerun the historical prepare_data.py: later corrections to 132, 133 and 159 were made directly in cards.json.
All build/render commands need TMPDIR=/dev/shm because the ordinary filesystem was full.

REVIEW STATUS
All 50 originals and all 49 first-pass original/final comparisons were visually reviewed.
Final artwork corrections were seen and selected. The final eight native rerenders (111,114,134,140,141,142,156,158) need a final visual recheck; a verifier was launched for them immediately before the outage. Inspect its reports instead of assuming completion.
Check 141's normalized Namekian badge position and cyan plaque.
The corrected 121/122 Dragon Ball star layouts were rendered and viewed.
Do not replace audit hashes without inspecting and measuring both export sizes, per AGENTS.md.

CLOTHING AND ART CORRECTIONS
111 Piccolo closed eyes.
114 Chi-Chi ochre/brown-orange sash and cuffs.
126 Trunks tied-back high ponytail.
129 foreground Goku orange gi, navy undershirt, bare hands.
131 Red Style Mastery art successfully completed.
134 remove invented Gohan scratches.
136 Earth drawn in 2D anime style.
139 Krillin black boots with olive/tan cuffs.
140 less tightly cropped flying figure.
141 Cell horns fully visible.
142 remove extra arm at far right.
156 Krillin black boots without Goku's cords.
158 remove invented tears in Android 17/18 jeans.
Preserve source-card pose, costume, expression and background as reviewed.

DATA CORRECTIONS
111 is Uncommon (3 stars). 112–156 Rare (5); 157–160 Ultra Rare (6).
132 Piccolo: bottom 3 discard cards to bottom of Life Deck.
133 Android 18: physical AT+6 stages; plus 5 life cards if The Car is in play.
159 Vegeta: physical AT+9 stages.
13 personalities: 114,127,132,133,134,135,136,137,138,139,154,159,160.
159 power stages: 4,000,000 through 2,900,000 by 100,000, then zero (13 rows).
160 power stages: 4,500,000 through 3,400,000 by 100,000, then zero (13 rows).
Other irregular printed stage values are retained in source/cards.json.
116 CRD stunned clarification; 125 requires a Battleground; 147 maximum physical stage damage 3 does not affect direct life-card damage; 153 no extra CRD deck restriction; 155 each opposing Ally loses 4 stages, not damage.

REMAINING WORK
1. Recover local project or original generated images and masters; verify all latest outputs.
2. Upload remaining 26 assets (13 cards), and keep 157 pending.
3. Create release README, clothing review, card-type review, verification aggregate and archives.
4. Append 49 catalog entries, 13 personality stage charts (ascending zero-first), and measured title/power/category audits. Preserve existing 849 catalog and 157 personality audit entries.
5. Run applicable integration tests; current local batch verifiers do not substitute for site tests.
6. Save card downloads and editable source archives.
7. Publish through a checked atomic main update, then verify CI and live display/downloads.
No catalog, personality-power.js, audit or main-branch changes were made for this batch before the outage.
