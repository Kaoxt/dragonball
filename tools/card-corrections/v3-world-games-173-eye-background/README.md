# Goku #173 matching eye background

The user requested that Goku's background silhouette match the other World
Games Hi-Tech cards after the eight-card framing release. This revision changes
only the local background portrait on Goku #173. It preserves the previously
published halo-and-staff foreground, its exact PNG bytes and placement, every
original native element, all gameplay fields and all other cards.

`Goku-173-Eye-Background.png` is isolated background artwork produced with the
built-in image tool using the retained Goku background and the approved Vegeta
and Gohan eye backgrounds as references. `generation-prompt.json` retains the
prompt. The new layer uses the existing native art-window clip and a local
gradient mask; the original continuous full-card background remains beneath it.
There is no regenerated foreground, lettering, stage column, frame or footer.

The new image is placed at `(0, -160, 1060, 1484)` in the retained SVG, before
`cleaned-goku-foreground`. The mask blends into the original paint and confines
changed pixels to x350–1060, y146–852. `pixel-verification.json` records zero
changed pixels outside that region in each published resolution independently.
Both exports are rendered at their own native size, preserving the preceding
export method, and saved as lossless WebP with identical decoded PNG pixels.

Removing the inserted image, two gradients and two masks restores the exact
previous SVG bytes. The finished display card was visually compared with the
other Hi-Tech backgrounds: one oversized eye/brow/hair portrait replaces the
small full face, while Goku's expression, halo, two hands and staff remain.
The same native source is used by the retained-source rebuild helper.

`release.json` retains before/after records and hashes; exact preceding native
and JSON snapshots are in `history/`. The historical test chain follows this
revision before the eight-card framing release, the Cell Hi-Tech release, and
the earlier World Games revisions. Earlier records saying Goku was unchanged
describe their own publication, before this explicit background correction.

```sh
node --test tests/card-world-games-goku-eye-background.test.js tests/card-world-games-hi-tech-refined.test.js tests/card-v3-world-games-151-200.test.js
```
