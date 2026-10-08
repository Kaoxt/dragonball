// Modernized user-supplied cards. Repeated cards are for testing, not tournament play.
export const sampleCards = [
  ['krillin-heat-seeking-blast', 'Krillin’s Heat Seeking Blast'],
  ['goku-battle-ready', 'Goku’s Battle Ready'],
  ['namek-dragon-ball-5', 'Namek Dragon Ball 5'],
  ['goku-super-saiyan-3', 'Goku, Super Saiyan 3'],
  ['red-style-mastery', 'Red Style Mastery'],
  ['majin-buu', 'Majin Buu'],
  ['master-roshi-sensei', 'Master Roshi Sensei'],
  ['piccolo-sensei', 'Piccolo Sensei'],
  ['eternal-dragons-quest', 'The Eternal Dragon’s Quest'],
  ['nail-combat-drill', 'Nail Combat Drill'],
  ['red-king-cold-observation', 'Red King Cold Observation'],
  ['orange-energy-dan-drill', 'Orange Energy Dan Drill'],
  ['orange-junction-energy-blast', 'Orange Junction Energy Blast'],
].map(([id, name]) => ({ id, name, image: `/assets/cards/${id}.webp` }));

export function practiceDeck(opponent = false) {
  const lookup = id => ({ ...sampleCards.find(c => c.id === id) });
  const character = opponent ? 'Majin Buu' : 'Goku';
  const personality = lookup(opponent ? 'majin-buu' : 'goku-super-saiyan-3');
  return {
    personalities: [1, 2, 3, 4].map(n => ({
      id: `PRACTICE-${opponent ? 'BUU' : 'GOKU'}-${n}`,
      name: `${character} · level ${n} placeholder`, image: personality.image, pur: 2,
    })).concat({ ...personality, pur: opponent ? 5 : 6 }),
    mastery: lookup('red-style-mastery'),
    sensei: lookup(opponent ? 'piccolo-sensei' : 'master-roshi-sensei'),
    cards: [
      'krillin-heat-seeking-blast', 'goku-battle-ready', 'namek-dragon-ball-5',
      'eternal-dragons-quest', 'nail-combat-drill', 'red-king-cold-observation',
      'orange-energy-dan-drill', 'orange-junction-energy-blast',
    ].map((id, i) => ({ ...lookup(id), qty: i < 2 ? 7 : 6 })),
  };
}
