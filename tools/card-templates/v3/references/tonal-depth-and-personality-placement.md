# Tonal depth, personality character placement and approved views

Latest user direction: October 25, 2026. Apply this before historical artwork instructions.

## Tonal depth for every card family

Apply the plain-background treatment to all future DB OCG cards and templates: Combat, Personality, Hi-Tech, Dragon Ball, Setup, Event, Drill, Mastery, Sensei, Location and Battleground. When an illustration has a plain or abstract backdrop, use restrained smooth tonal gradients, broad soft color transitions and subtle layered depth within the original palette. The treatment must be perceptible at normal card size without competing with the character. Fine noise or grain alone is insufficient; avoid a flat chroma-key/solid-color-screen appearance.

Keep the original scene, negative space and palette. Preserve scenery and clouds when present; do not add clouds, terrain, stars, lightning, particles, glows or auras merely to fill empty space. Preserve approved Hi-Tech painted treatments rather than replacing them with a generic gradient. Red Lunge Punch retains muted blue/teal; Red Energy Suspension retains green/yellow. Saiyan Vegeta P3 should retain cyan/teal, and Saiyan Tien #83 should retain a dark charcoal/near-black palette. Their current nearly flat examples are not proof that the depth requirement was satisfied.

For a background-only edit, keep the approved character and native UI pixels unchanged. Generate an independent background layer, composite only through a verified background-only mask, and preserve antialiased contours. Do not redraw, relight, resize, sharpen, denoise or stretch the character. Check the finished card at normal size and 100%; reject halos, jagged edges and changed pixels outside the permitted background area.

## Center personality characters in the space left of the stages

Apply to Hero, Villain and Hi-Tech Personality artwork. Use the area between the inside of the left artwork border and the LEFT visible edge of the power-stage stack as the composition reference. Do not center the character on the full card, full raster canvas, title panel, category label or region behind the stages.

On the current 1060-wide V2 frame the art starts at x16 and the stage path starts at x815 (visible border approximately x813.75). The usable midpoint is approximately x415, not x529.5. Measure the actual visible edges on other frames; never blindly reuse these coordinates at another scale. The approximate midpoint is a visual composition target, not a rigid pixel tolerance for every action pose.

Judge the main character's visual mass, face and torso, then check the entire silhouette and balance of visible empty space. Exclude background texture, aura, energy blasts, cape extensions and secondary portrait overlays from the main-character center measurement. Preserve the original pose, camera angle, expression, scale and action direction. Keep important hands, head and limbs clear of the stage column where the source allows. For asymmetric action scenes, use optical centering within the available region instead of blindly centering all non-background pixels or the raster bounding box. Do not zoom, stretch, clip limbs or invent body parts to force a fit. Record unavoidable source/framing constraints honestly.

Saiyan Tien #83 is the completed placement example in the latest Personality-Numerals-Native-Source.zip (Library libfile_bdd1500c5df88191b7b611b6a3b1df0c): retained character pixels shift115 native units left with y and scale unchanged. Its visible silhouette center is414.863, compared with usable midpoint414.875. The native retained-tien-character layer has translate(-115 0). The old flattened source without this layer is historical. This example is not a blanket shift for other cards. Its placement correction does not claim a new tonal-depth treatment.

For an existing-card placement correction, translate the retained character layer without redrawing it. Preserve its pixel colors, scale, y-position and antialiased contours; prefer an integer-pixel translation at each target raster size. Reveal or extend only background where necessary. If the art is flattened, isolate it with a verified mask; do not invent hidden limbs or accept halos. Verify translated character pixels against the source at the same offset and require zero changes to every unrelated UI/frame/text pixel. A future production prompt should reserve the right stage area and compose the subject into the left usable region from the outset.

## Keep artwork placement separate from typography

The character target near x415 does not move the name/title or HERO/VILLAIN PERSONALITY label. Preserve their latest approved artwork-centered alignment at x529.5 on this shared frame, and the approved centered category labels for Combat, Setup, Event and Drill. Do not run historical finalizers that restore older left alignment or x600.25/x604.1 centers. Preserve all full-height stage geometry, right-aligned values and digit-only vertical centering: comma tails do not determine the vertical center. Keep text, panels, badges, borders, game data and footer unchanged during artwork adjustments.

Current completed title/label and comma-centering examples are in Personality-Stage-and-Goku-Art-Correction-Source.zip (Library libfile_028d535940408191a5ef179bab99c702); the October 24 source references below are historical when they conflict with those final examples.

## Preserve approved original-pose exceptions

For Frieza Saga #125, Super Saiyan Goku (`frieza-125-super-saiyan-goku`), retain the CURRENT rear-facing view. The user explicitly selected it and reconfirmed it on October 25, 2026. Its difference from the original front/low-angle pose is an approved design choice, not a defect. Never change its view, pose or costume while auditing fidelity, applying tonal depth, or adjusting placement unless the user explicitly asks for that change. Record it as an approved exception in reports. Use the current production image at commit 643bf87fe326d611cdbb6a088583c07d0feb3c20 as the retained view reference.

Continue comparing other personalities with their actual original scans and the finished cards. Keep the corrected Saiyan Goku #159 and #160 poses. The separate Frieza #89 Vegeta raised-arm mismatch remains an unresolved audit finding; the Goku approval does not approve that difference.

## Required production review

Record separately: (1) original pose/view fidelity or explicit approved exception; (2) character centering in the left usable area, including any optical adjustment; (3) background tonal-depth adequacy at normal card size; (4) head/hand/limb clearance and clean full-resolution edges; and (5) unchanged native UI and protected pixels. Do not call a batch verified based only on source dimensions, hashes, an image-generation prompt, or an earlier generated illustration. Inspect the actual finished card. Do not report an existing card corrected merely because this guideline was saved.
