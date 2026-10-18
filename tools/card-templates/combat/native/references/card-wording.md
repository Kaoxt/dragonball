# Card wording standard — October 18, 2026

Apply this standard to powers on every card type, including Combat and Personalities. This supersedes older examples that use named attack introductions or PAT. Preserve original source text separately for provenance.

## CRD first, then modern wording — October 18, 2026

1. Identify the original card by set, number and title. Check the current user-supplied Expanded CRD for applicable errata, card-specific updates and clarifications before rewriting its power. Use the retained `Expanded-CRD.txt` in the Combat Production skill only when no newer source has been supplied.
2. Apply any CRD correction to establish the authoritative effect first. Then modernize that corrected text using the wording rules below. Never modernize only the obsolete printed text and append a CRD correction afterward.
3. Retain the original text, applicable CRD entry (or the checked source and no matching update), corrected effect and final display wording separately in editable card data or release notes. Preserve costs, damage, targets, conditions, timing, duration and optionality.
4. Convert an unconditional self-removal instruction such as `Remove from the game after use.` to exactly `Banish after use.` Place it at the end of the card power, after all attack, damage and other effect text. Keep any special card-specific deck limit at the beginning as previously approved. Do not put Banish after use in the leading restriction block.
5. Apply that conversion whether the instruction comes from the printed card or a CRD update. Preserve conditional or differently timed removal instructions and their scope; do not turn them into an unconditional Banish after use or invent banishment on cards without it. Placing the wording at the end does not change its after-use timing.

This is the user's DB OCG wording convention inspired by Panini. Preserve the project's Score/CRD mechanics; do not import Panini mechanical changes.

## Order and labels

1. Keep any special restrictions and existing ENDURANCE value in the leading block, before the effect text. Put applicable `Banish after use.` last, after all effect text. Do not add default deck limits or invent Endurance.
2. Introduce an attack with `Energy attack` or `Physical attack`. Omit decorative technique names in this introduction, such as Kamehameha. Preserve card titles and mechanically relevant named references or traits.
3. Put an attack's cost immediately after its type: `Energy attack costing 1 stage.` or `Physical attack costing 2 stages.` Include all other actual costs in that same opening sentence. For ordinary physical attacks with no cost, use `Physical attack.` Do not invent a cost. Make an energy attack's cost explicit, using the verified rules default only when the original omits it.
4. Follow immediately with `DAMAGE:` and the damage amount/formula plus units. Use digits and `stage`/`stages` as the short form of power stage(s), or `life card`/`life cards`. Do not change damage types or convert extra life-card damage into stage damage.
5. Keep independent additional effects outside `HIT:`. Use `HIT:` only for effects explicitly requiring a successful attack. Preserve timing, targets, conditions, optionality and duration.

Use `POWER:` for activated non-attack effects, not before an attack introduction. Retain the native crossed swords for attacks, shield for effects that stop attacks, and infinity for constant powers; do not substitute text or emoji for those symbols in production.

## AT terminology

Use `AT` for **Attack Table** everywhere in new game-facing wording. Rename the existing PAT term only: retain the game's existing lookup table, power-rating comparisons, values and modifiers. AT in a damage formula means the resulting table value; it is not a random roll. Keep `PAT` only in original-source quotations or migration notes.

Write base physical damage as `DAMAGE: AT stages.` Write a stage bonus as `DAMAGE: AT +4 stages.` Keep one space between AT and the modifier; attach the plus sign directly to its number (`AT +3 stages`, never `AT + 3 stages`). Keep the sign and number together on one line. AT plus a bonus is a total in stages, so use plural `stages` even for `AT +1 stages`. A fixed one-stage amount or cost uses singular `1 stage`. Preserve separate life-card components where applicable.

## Approved examples

- Goku #158: `Energy attack costing 1 stage. DAMAGE: 3 life cards.`
- Ordinary physical: `Physical attack. DAMAGE: AT stages.`
- Illustrative physical with a four-stage bonus: `Physical attack. DAMAGE: AT +4 stages.` This example does not add that bonus to other cards.
- Red Lunge Punch #6: `Physical attack. DAMAGE: AT stages. Raise your anger 1 level.` Its anger gain stays independent of HIT.

Preserve the approved fonts, power-box geometry and icon sizing. Line breaks may fit the existing text area without changing wording or mechanics. Do not add DAMAGE or AT to non-attack powers.

## One power icon per card — October 18 correction

Use at most one effect icon anywhere in a card power. For an attack that also stops attacks, prevents attacks, or offers a block alternative, use only the attack icon beside the attack introduction. Do not add a shield to the later block text. For a non-attack card, use the appropriate single shield or infinity icon; keep the remaining effects as text. Preserve the native icon shape, cap-height sizing, alignment and gap. Do not count Toku Waza, Dragon Ball category emblems, or footer rarity symbols as power icons. This rule supersedes earlier examples containing multiple power icons.

## Card type names — October 18, 2026

Use the following names in card-type bars and modern game-facing rules:

| Original type | DB OCG type |
| --- | --- |
| Non-Combat | Setup |
| Non-Combat Drill | Drill |
| Combat Event | Event |

Apply the specific Non-Combat Drill mapping before the broader Non-Combat mapping. Preserve Physical Combat and Energy Combat as attack types. Update type references inside modernized powers consistently, while preserving original-source quotations and the underlying Score/CRD mechanics. These names supersede older template labels.

