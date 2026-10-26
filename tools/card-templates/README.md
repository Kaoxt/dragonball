# Dragon Ball OCG card templates

Use `catalog.json` to locate each approved template. The current Combat production master is version 1.2.0, approved October 17, 2026. Its native source is in `combat/native`, with current Orange and Red reference previews in `combat/assets`. Older reference images and frames remain historical sources.

The Combat master now includes the approved black textured title and footer side panels, a near-black center footer, revised brand lettering, regular disclaimer, approved title/category spacing and style-symbol weight, and shared attack/block icons. Start from `combat/SKILL.md` and `combat/references/combat-production.md`; use the native renderer rather than repainting complete cards.

For all future card categories, crossed swords mark attack effects and a solid shield marks effects that stop attacks, including physical and energy stops. Match the visible capital-letter height and baseline of the adjacent rules text. Never use a shield for text stating that an attack cannot be stopped. Reuse the approved paths from `combat/native/icons.py`.

Keep titles, rules, numbers, levels, PUR values and borders as native geometry and outlined fonts. Keep illustration pixels intact. Verify effects and rarity against the source card and current CRD. Use Event, Setup and Drill for the modern categories.

Compare every finished character expression with the original scan before publication: mouth shape, visible teeth, smirk direction, eyes, gaze and eyebrows. Follow `docs/facial-expression-fidelity.md`; mark unclear faces unresolved rather than passing them. Preserve approved artwork exceptions. Localized expression fixes must leave all unrelated pixels unchanged; the Trunks #149 correction is retained in `tools/card-corrections/trunks-149-expression`.

After approval, synchronize the personal production skill, native source, reference previews and catalog metadata. Source templates live under `tools/`; only requested card exports under `public/` are served by the website. Preview WebPs are high-resolution 1060 × 1484 at quality 92; separate downloads remain 2120 × 2968 lossless WebP.

The other template entries retain their existing status in the catalog. Template source updates do not publish any additional card exports.

The shared-layout Setup implementation used by Saiyan Saga cards 22, 23 and 30 is documented in `setups/README.md`. It uses the common native geometry; no separate template approval is implied.
