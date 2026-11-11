# World Games Shenron artwork revision

The user approved the final downward right-facing pose on November 11, 2026.
The current catalog contains one World Games Dragon Ball, #15 Earth Dragon
Ball 3. Both its display and download exports use the new illustration;
future World Games Dragon Balls select it through the shared set helper.

`release.json` records the retained original artwork bytes, exact before/after
hashes, reversible one-href native edit, cache keys and pixel checks.
No game data or other catalog entries change. Historical audits remain intact.

Both resolutions were checked against before/after native renders. Renderer
rounding differences from the earlier published exports are recorded rather
than claimed to be zero. Only the artwork delta is applied, preserving the
published fully opaque lettering, panels, orb and footer pixels verbatim.
Pixels outside the permitted delta remain identical. Both WebPs round-trip
losslessly. The full-art layer retains its exact mapping and existing gain.

The final normal-size card was visually reviewed: the head, horns and
whiskers remain above the middle bar; title, orange label, three-star orb,
rules, centered World Games emblem and card number 15 remain legible and
correct. The final illustration is a user-approved alternate pose.

Recheck the saved artifact hashes without rewriting files:

```sh
python3 tools/card-templates/v3/patch_world_games_shenron.py
node --test tests/card-world-games-shenron.test.js
```

Live publication is verified separately from these source/export checks.
