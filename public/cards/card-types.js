// Keep existing catalog IDs, saved decks and filter URLs compatible.
export const cardTypeLabel = type => type === 'Main Personality' ? 'Personality' : type;
export const isPersonality = card => cardTypeLabel(card?.type) === 'Personality';
