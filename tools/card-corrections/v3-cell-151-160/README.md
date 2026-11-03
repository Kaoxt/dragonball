# Cell Saga complete — V3 cards 151–160

These final ten complete all 160 Cell Saga cards in current V3. Both lossless sizes (1060 × 1484 display and 2120 × 2968 download) match independent native renders. All ten retain existing catalog rules. Rarity is five stars for 151–156 and six for 157–160.

The three Hero Personalities retain independently transcribed Level/PUR and thirteen power-stage rows, including zero. Their digit bodies share a centered baseline independent of comma tails and right ink edge x1031. Native outlined text, Hero reference blue, title/LEVEL clearance, category components, aligned icons and mirrored footer groups use current standards.

Z Warriors Gather retains the approved October 28 eight-character user attachment, recovered from the original 1536 × 1024 JPEG. Uniform fill preserves all original visible heads and feet, with approximately 30.35 source pixels cropped from each side and no vertical crop. Its reconstructed old artwork window differs from the prior published lossless download by at most two channel units from decoding/rendering, with mean absolute difference 0.00086. The original JPEG bytes are retained. This approved scene supersedes strict printed-art fidelity.

CRD review preserves Namekian Energy Focus's removed Restricted status and Saiyan Rapid Fire's four-stage loss to opposing Allies on HIT (not damage). Android 16's Rage deals fixed seven-stage damage. Cell's Presence retains its two-copy limit. Original scans, printed text, corrected effects and modern wording remain separate evidence.

The four Ultra Rare profiles are pinned to their new images. Reviewed masks follow all eight Z Warriors, Android 18 in Cell's Presence, Vegeta and Goku; they are clipped to the art window and exclude the exact V3 rules panel. The shared brushed material and animation are unchanged.

Rebuild using `build_cell_151_160.py --first <Cell-Saga-111-160> --next-batch <Cell-Saga-111-160>`, then run `verify_cell_151_160_sources.py` with the same arguments and `verify_cell_151_160.py`. Card 157 uses `recovered-source-157.svg` for its approved image and Cell emblem; the other nine use the retained archive identified in `source-provenance.json`. Native masters are in `../../card-templates/v3/cell-151-160/`; their portable dependencies are content-addressed in the shared assets directory. Fine details unresolved in the original scans are explicitly recorded per card.

Validation: all 192 tests across 23 applicable site/batch files passed, plus six card-type terminology tests and `npm run check` (syntax checks and Wrangler deployment dry run). Independent source and render verifiers passed all ten cards. Historical fixtures excluded from this sparse checkout are checked by the full repository CI deployment gate.
