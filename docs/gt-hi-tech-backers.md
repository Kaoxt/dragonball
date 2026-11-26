# GT Hi-Tech + Backer composition

Approved November 26, 2026. Keep the V3 card frame, real artwork, title, alignment, footer and printed data. Resolve only a Hi-Tech's explicitly blank fields. No GT catalog entries are introduced by this implementation; test fixtures and the approved layout example are synthetic and must never become playable cards.

The builder stores one `backer: {id, ...displaySnapshot}` alongside the MP stack. The server resolves that ID against the canonical catalog. Named and Styled restrictions both apply. A selected Backer fills all GT Hi-Tech levels and is excluded from deck size and copy counts. Copies used as ordinary Event/Setup cards remain normal deck entries. Draft decks can omit the selection; Arena loading requires it. Setup locks the deck, including the Backer. Selection survives account saves, public sharing, JSON Arena exports and optional eighth-field DBO1 image codes. Existing seven-field codes are unchanged. GT stacks support a sixth level.

## Authoring verified records

Add each real card normally to `public/cards/catalog.js` and append its ID to `public/decks/code-card-ids.js`. Retain its original Event/Setup/Personality type. Use `rarity: "Hi-Tech"` on GT Hi-Tech personalities. Keep source scans, CRD wording, native V3 production SVGs, blank display/download WebP exports and QA with the set's normal production files.

Hi-Tech metadata:

```js
gtHiTech: {
  verified: true, revision: 'reviewed-revision', character: 'goku',
  stages: [/* highest to zero, null only where explicitly inherited */],
  inherit: {pur: true, power: false, stages: [0, 2, 4]},
  power: {rules: 'Verified fixed power text.'},
  render: {
    stageSlots: [/* one {x,y,width,height} per printed row */],
    pur: {x, y, width, height}, power: {x, y, width, height}
  }
}
```

Stage indices are physical positions in the top six rows, starting at zero. Copy the same index from the Backer. Never sort stages, fill sequentially, overwrite a printed value, or treat zero as blank. Author the complete chart for each card; 17 rows in the concept is not a universal rule. Fixed PUR comes from the normal catalog `pur`; fixed power comes from `gtHiTech.power`.

Backer metadata:

```js
gtBacker: {
  verified: true, revision: 'reviewed-revision',
  characters: ['goku'], style: 'Saiyan', // [] for Styled-only; '' for Named-only
  pur: 4, stages: [/* six reviewed values in physical order */],
  power: {rules: 'Reviewed text.', attack: 'energy', cost: 1, damage: 3},
  native: {pur: component, stages: [/* six components */], power: component}
}
```

Each native component is `{text, bounds:[x,y,width,height], paths:[{d,fill,fillRule}]}` in the 1060×1484 master coordinate system. `text` must equal its semantic value (comma-formatted stages). Copy approved vector numerals, outlined type and attack/constant/block icons from production masters. Do not introduce fallback system fonts or use AI to redraw the complete card. `tools/gt-backers/extract-components.py` extracts selected outlined SVG groups, including their transforms, into this format. Its JSON selection file maps `pur`, six `stages`, and `power` to `{text,ids:["svg-group-id"]}`. Unsupported SVG treatments fail rather than disappearing silently; flatten them in the approved vector source first.

Use a clean artwork layer and the correct set's Hi-Tech treatment for the blank card. A flattened existing card is not a clean artwork/background layer. Inherited fields are genuinely empty in the base exports, while borders, brush strokes, panels and fixed values remain printed. Set accurate target bounds for each overlay; keep stage type consistent across filled and fixed rows and right-aligned. Preserve type sizes: overlays may shrink to fit, never enlarge; power text cannot shrink. Reflow longer native power text in the production SVG before verification. Check every compatible combination against the power-box dimensions before publishing. Never mark a record verified solely because its JSON is well formed.

## Rendering and checks

`/api/cards/gt-composite?hiTech=ID&backer=ID&tokui=STYLE&size=display|download` returns one self-contained SVG image. Display is 1060×1484; download is 2120×2968. It embeds the approved display or lossless base WebP and adds native vector paths only in inherited fields. This is SVG composition, not AI generation or an external image fetch. Revision/content-based caching avoids pre-generating every possible combination. Foil identity remains attached to the underlying Hi-Tech.

The endpoint accepts only catalog-owned asset paths and validated native paths, with no scripts, external resources or caller-provided markup. Verify the normal and lossless compositions, pixel changes outside inherited slots (must be zero), fixed values, whole-stack eligibility, source wording, symbols, silhouette/art placement, no AI judder, and thumbnail/full-size readability. Bump revisions whenever approved components or masks change.

Run `node --test tests/gt-backers.test.js tests/deck-code.test.js tests/game.test.js tests/community.test.js tests/arena-card-view.test.js tests/arena-session.test.js tests/arena-resume.test.js tests/card-surface.test.js`, plus the normal release suite. Fixtures are deliberately outside the catalog. Actual GT records must also include release tests for their verified sources and native artwork.
