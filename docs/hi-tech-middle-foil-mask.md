# Hi-Tech middle-bar foil correction

The old foil exclusion began at y878, while the current V3 middle paint begins
at y852. This exposed a narrow band of the HERO/VILLAIN bar to the foil texture.
The old circular PUR exclusion also differed from the current horizontal brush.

All 37 catalog Hi-Tech cards share the same native middle brush, soft backing,
artwork-edge clip and PUR shape. The three shared masks now use those contours
and their native transforms. The corrected title mask, stage/rules/footer
exclusions, subject attenuation and renderer behavior are unchanged. Card
artwork and both display/download exports are unchanged.

Cards, Decks, Arena and the foil preview load the revisioned masks through
`card-surface.css?v=20261115-middle-contour`. The correction covers both the
full foil renderer and the lightweight Firefox renderer.

`python3 tools/card-effects/hi-tech-middle-mask.py --check` compares every
catalog Hi-Tech native source with the shared exclusions and rejects the old
rectangle/circle. Run without `--check` to regenerate after an approved native
middle-bar change. The title generator remains independent.

Run `node --test tests/card-hi-tech-title-mask.test.js tests/card-surface.test.js
tests/card-motion.test.js tests/card-finish-preference.test.js` for viewer
regressions. The Cards browser uses 50 cards per page; its existing pagination,
URL/history and set-boundary checks are in `tests/card-browser.test.js`.
