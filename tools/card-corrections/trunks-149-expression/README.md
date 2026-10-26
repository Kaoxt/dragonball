# Blue Style Mastery expression correction

Restore Piccolo's original asymmetrical tooth-showing smirk. The prior artwork had a stern closed mouth. Keep all other approved artwork and every native card element unchanged.

`mouth-patch.png` is the transparent, localized imagegen illustration patch. Its position is **(1298, 949)** on the **2120 × 2968** download canvas; size **326 × 235**. Native SVG position is **(649, 474.5)**, size **163 × 117.5**, on the **1060 × 1484** master. `original-expression.png` is cropped from the user's original-card reference. It is a reference, not replacement modern artwork.

Run `python3 apply_native_patch.py INPUT.svg OUTPUT.svg` after the existing Trunks #149 builder to preserve this correction on future exports. The patch is illustration-only; the existing native frame and outlined text stay intact. The script rejects other titles/canvases and replaces its own overlay on repeat runs. The historical batch source stays independently recoverable in Library `libfile_aa97e5f4a4ec8191b952a05505db67d2`.

Published display and download images were patched separately against their existing decoded pixels and saved losslessly. `docs/trunks-149-expression-verification.json` records dimensions, resulting hashes and **zero changed pixels outside the mouth mask**. Do not regenerate the entire card or lossily recompress unrelated pixels for this correction.
