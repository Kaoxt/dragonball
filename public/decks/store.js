export const STORAGE_KEY = 'score-builder-v1';
export function createDeck() {
  return {id: crypto.randomUUID(), name: 'Untitled deck', tokui: '', personalities: [null,null,null,null,null], mastery: null, sensei: null, cards: [], senseiDeck: []};
}
export function readDecks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {active: null, decks: []};
  const data = JSON.parse(raw);
  if (!Array.isArray(data.decks) || data.decks.some(d => !d || typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.personalities) || !Array.isArray(d.cards) || !Array.isArray(d.senseiDeck))) throw new Error('Saved decks could not be read.');
  return data;
}
export function snapshot(card) {
  return {id: card.id, name: card.name, image: card.image, type: card.type, number: card.number, set: card.set, ...(card.level ? {level:Number(card.level)} : {}), ...(card.pur !== undefined ? {pur:Number(card.pur)} : {})};
}
export function count(cards) { return cards.reduce((n,c) => n + (c.qty || 1), 0); }
export function exportDeck(deck) {
  const clean = c => ({id:c.id, name:c.name, image:c.image, ...(c.pur !== undefined ? {pur:c.pur} : {}), ...(c.qty ? {qty:c.qty} : {})});
  return {name:deck.name, tokui:deck.tokui, personalities:deck.personalities.filter(Boolean).map(clean), mastery:deck.mastery ? clean(deck.mastery) : null, sensei:deck.sensei ? clean(deck.sensei) : null, cards:deck.cards.map(clean), senseiDeck:deck.senseiDeck.map(clean)};
}
export function addCard(deck, card, destination = 'auto') {
  if (destination === 'auto') destination = card.type === 'Main Personality' ? 'personalities' : card.type === 'Mastery' ? 'mastery' : card.type === 'Sensei' ? 'sensei' : 'cards';
  const c = snapshot(card);
  if (destination === 'personalities') {
    const index = c.level ? c.level - 1 : deck.personalities.findIndex(x=>!x);
    if (index < 0 || index > 4) throw new Error('All five personality slots are filled. Remove a level first.');
    if (deck.personalities[index] && deck.personalities[index].id !== c.id) throw new Error(`Level ${index+1} is filled. Remove it before adding a different personality.`);
    deck.personalities[index] = c;
  } else if (destination === 'mastery' || destination === 'sensei') {
    if (deck[destination] && deck[destination].id !== c.id) throw new Error(`Remove the current ${destination} before adding another.`);
    deck[destination] = c;
  } else {
    if (!['cards','senseiDeck'].includes(destination)) throw new Error('Choose a deck area.');
    if (count(deck[destination]) >= 90) throw new Error('This area has reached the tabletop limit of 90 cards.');
    const entry = deck[destination].find(x=>x.id === c.id);
    if (entry) entry.qty++; else deck[destination].push({...c,qty:1});
  }
}
