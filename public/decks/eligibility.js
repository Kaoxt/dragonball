import {catalog} from '../cards/catalog.js';
import {isPersonality} from '../cards/card-types.js';

const byId = new Map(catalog.map(card => [card.id, card]));
const allyZones = ['cards', 'senseiDeck'];
export const HI_TECH_ALLY_ERROR = 'Hi-Tech Personality cards cannot be used as Allies. Add them to the Main Personality stack instead.';

export function isHiTechPersonality(card) {
  // Saved snapshots and arena exports may omit rarity or contain stale type data.
  const current = byId.get(card?.id) || card;
  return isPersonality(current) && (/hi(?:gh)?[\s-]?tech/i.test(current.rarity || '') || /(?:^|-)ht(?:-|$)/i.test(current.id || ''));
}
export const blocksHiTechAlly = (card, destination) => allyZones.includes(destination) && isHiTechPersonality(card);
export function hiTechAllies(deck) {
  return allyZones.flatMap(zone => (Array.isArray(deck?.[zone]) ? deck[zone] : []).filter(isHiTechPersonality).map(card => ({card, zone})));
}
export function assertNoHiTechAllies(deck) {
  if (hiTechAllies(deck).length) throw new Error(HI_TECH_ALLY_ERROR);
}
export function assertNoHiTechAllyAdditions(deck, previous) {
  const quantities = value => {
    const counts = new Map();
    for (const {card, zone} of hiTechAllies(value)) {
      const key = `${zone}:${card.id}`;
      counts.set(key, (counts.get(key) || 0) + (card.qty || 1));
    }
    return counts;
  };
  // Keep old decks editable so owners can remove invalid Allies without data loss.
  const before = quantities(previous);
  for (const [key, quantity] of quantities(deck)) {
    if (quantity > (before.get(key) || 0)) throw new Error(HI_TECH_ALLY_ERROR);
  }
}
