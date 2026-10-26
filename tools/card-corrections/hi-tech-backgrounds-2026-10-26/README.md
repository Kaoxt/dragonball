# Hi-Tech background portrait cleanup

Eight background-only patches remove the secondary portraits identified by the 17-card review. Each patch has transparent protected regions over the foreground and outside the repair area. Native UI layers remain above it.

Image generation supplied the seven illustration edits and one abstract texture for Gohan. Only the allowed background mask from each generated result is used. Existing display and download WebP files are patched losslessly; the manifest records hashes and zero changes outside the allowed background area. The display originals used compression that differs from native renders, so their unrelated pixels are explicitly retained.

For the matching 1060 × 1484 native card:

```sh
python tools/card-corrections/hi-tech-backgrounds-2026-10-26/apply_native_patch.py CARD_ID INPUT.svg OUTPUT.svg
```

Do not use these coordinates with newly posed or cropped artwork. Verify the input illustration visually. Follow `docs/hi-tech-background-portraits.md` for new production.
