# Rules page refresh — October 25, 2026

The rules page now reads as a handbook with paper-colored chapters inside the existing dark site theme, grouped contents, search, all rules open by default, a print layout, and a separate Score GT comparison.

## Restore the prior page

A full repository snapshot is retained on `backup/rulebook-before-format-refresh-2026-10-25`, pointing to `7303d3e710b926832a83b578314e09ef2c02362e`.

Restore only these page files from that branch, review, commit, and deploy through the normal Cloudflare integration:

- `public/rulebook/index.html`
- `public/rulebook/rulebook.css`
- `public/rulebook/rulebook.js`

Do not reset the entire main branch. Shared styles and unrelated site work were not changed by this refresh.

## Rules scope and sources

The original 17 chapters retain identical content. Chapters 1–15 remain the Buu Saga baseline. The added overview distinguishes historical Score Expanded (Z + GT) and GT-era Focused (GT card pool); the appendix compares the supplied Expanded CRD against the existing guide. No game engine or deck validator changes were made, and this is not a claim that the Arena automatically supports all GT mechanics.

- Score Expanded Current Rulings v11.24.04: https://lackeyccg.com/dbzccg/dbzcrd.pdf
- Score Buu Saga rulebook: https://lackeyccg.com/dbzccg/dbzccg_rules.pdf
- Format history: https://retrodbzccg.com/2012/02/02/the-history-of-the-dragonball-z-ccg/
- Supplied project file: Expanded CRD.odt.txt.

The November 24, 2004 appendix (printed p.45 / PDF p.48) supersedes the older level 1–3 Ally entry with level 1–2. The supplied compilation identifies TopTierGaming additions/removals using colors absent from the text export; it must not be treated as an unmodified official Score document. A complete dated GT Focused CRD has not been verified. Do not copy Expanded restrictions into Focused without a matching source or explicit house-rule decision.

## Validation

- Exact content comparison: all original 17 chapter bodies retained (only running heads and details open attributes added).
- No duplicate IDs; every internal anchor resolves; 19 total sections.
- JavaScript syntax check.
- Browser checks: search/no results/clear, disclosure state restoration, expand/collapse, chapter navigation and PAT calculations (ordinary and Z ratings).
- Responsive browser frame: 375px content width without horizontal page overflow; readable turn chapter.

The existing Playwright spec was updated for the new heading, chapter count, source links and default-open state. This environment used the browser checks above; the standalone Playwright suite was not run.
