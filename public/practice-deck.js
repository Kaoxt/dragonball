import { catalog } from './cards/catalog.js';
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
  ['super-android-17-ki-intensity', 'Super Android 17’s Ki Intensity'],
  ['farewell-drill', 'Farewell Drill'],
].map(([id, name]) => ({ id, name, image: `/assets/cards/${id}.webp` }));

export function practiceDeck(opponent = false) {
  const lookup = id => ({ ...sampleCards.find(c => c.id === id) });
  const ids = opponent
    ? ['saiyan-173-vegeta','saiyan-174-vegeta','saiyan-175-vegeta','saiyan-0P3-vegeta-silver-variant']
    : ['saiyan-158-goku','saiyan-159-goku','saiyan-160-goku','saiyan-0P1-goku-silver-variant'];
  const personalities=ids.map((id,index)=>{
    const c=catalog.find(card=>card.id===id);
    return {id:c.id,name:c.name,image:c.image,level:index+1,pur:opponent?[2,4,4,4][index]:index+1};
  });
  return {
    personalities,
    mastery: lookup('red-style-mastery'),
    sensei: lookup(opponent ? 'piccolo-sensei' : 'master-roshi-sensei'),
    cards: [
      'krillin-heat-seeking-blast', 'goku-battle-ready', 'namek-dragon-ball-5',
      'eternal-dragons-quest', 'nail-combat-drill', 'red-king-cold-observation',
      'orange-energy-dan-drill', 'orange-junction-energy-blast',
    ].map(id => ({ ...lookup(id), qty: 6 })).concat([
      { ...lookup('super-android-17-ki-intensity'), qty: 1 },
      { ...lookup('farewell-drill'), qty: 1 },
    ]),
  };
}
