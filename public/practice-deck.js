import { catalog } from './cards/catalog.js';
const byId = new Map(catalog.map(card => [card.id, card]));
const lookup = id => {
  const card = byId.get(id);
  if (!card) throw new Error(`Practice card is missing from the catalog: ${id}`);
  return {id:card.id, name:card.name, image:card.image, ...(card.pur !== undefined ? {pur:card.pur} : {})};
};
// Catalog artwork and printed data; repeated Life Deck cards make every board area easy to try.
const lifeCards = [
  'saiyan-006-red-lunge-punch', 'saiyan-007-red-reverse-punch',
  'frieza-004-red-energy-suspension', 'frieza-005-red-energy-disk', 'frieza-006-red-energy-disk-blasting',
  'frieza-p9-red-blocking-hand', 'frieza-014-gokus-righteous-force', 'frieza-085-straining-outburst-move',
  'frieza-013-empowerment', 'frieza-019-powerful-followers',
  'frieza-065-red-energy-defense-drill', 'frieza-069-red-phasing-drill', 'frieza-073-red-implosion-drill',
  'cell-091-tien-s-tri-beam', 'trunks-137-nail-combat-drill',
];
const singleCards = ['trunks-025-namek-dragon-ball-1', 'android-008-gravity-chamber',
  'android-007-blasted-land', 'trunks-154-krillin', 'frieza-030-time-is-a-warriors-tool'];
const heroMP = ['saiyan-158-goku','saiyan-159-goku','saiyan-160-goku','saiyan-0P1-goku-silver-variant'];
const villainMP = ['saiyan-173-vegeta','saiyan-174-vegeta','saiyan-175-vegeta','saiyan-0P3-vegeta-silver-variant'];
const mastery = 'trunks-144-red-style-mastery';
const senseis = ['majin-buu-153-master-roshi-sensei','world-games-140-north-kai-sensei'];
export const sampleCards = [...new Set([...lifeCards,...singleCards,...heroMP,...villainMP,mastery,...senseis])].map(lookup);

export function practiceDeck(opponent = false) {
  return {
    personalities:(opponent ? villainMP : heroMP).map((id,index)=>({...lookup(id),level:index+1,pur:opponent?[2,4,4,4][index]:index+1})),
    mastery:lookup(mastery), sensei:lookup(senseis[opponent ? 1 : 0]),
    cards:[...lifeCards.map(id=>({...lookup(id),qty:3})), ...singleCards.map(lookup)],
  };
}
