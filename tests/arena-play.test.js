import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../public/cards/catalog.js';
import {cardPlayPlan} from '../public/card-play.js';
import {practiceDeck, sampleCards} from '../public/practice-deck.js';
import {newGame, addPlayer, act, view} from '../public/game.js';
const lookup = id => {const c=catalog.find(c=>c.id===id);assert.ok(c,id);return c;};
const cases = [
 ['saiyan-006-red-lunge-punch','discard'],
 ['saiyan-029-yajirobes-physical-attack','removed'],
 ['frieza-014-gokus-righteous-force','removed'],
 ['frieza-013-empowerment','noncombat'],
 ['frieza-065-red-energy-defense-drill','drills'],
 ['trunks-025-namek-dragon-ball-1','dragonballs'],
 ['android-008-gravity-chamber','location'],
 ['android-007-blasted-land','location'],
 ['trunks-154-krillin','allies'],
 ['frieza-030-time-is-a-warriors-tool','discard'],
 ['cell-091-tien-s-tri-beam','combat'],
 ['saiyan-025-gokus-physical-attack','combat'],
 ['cell-games-118-vegetas-surprised','combat'],
 ['trunks-043-blue-thrusting-fist-strike','combat'],
 ['majin-buu-005-black-floating-popo-defense','combat'],
 ['majin-buu-106-saiyan-onslaught','combat'],
];
function table(id) {
 const g=newGame();addPlayer(g,'a','Alice');addPlayer(g,'b','Bob');
 const d=practiceDeck();d.cards=[lookup(id)];
 act(g,0,{type:'load',deck:d});act(g,1,{type:'load',deck:practiceDeck(true)});act(g,0,{type:'start'});
 act(g,0,{type:'ready'});act(g,1,{type:'ready'});act(g,0,{type:'draw'});return g;
}
test('Play routes every supported card family using authoritative catalog data, and Undo restores it',()=>{
 for(const [id,to] of cases){
  const g=table(id),uid=g.players[0].zones.hand[0].uid;
  const version=g.version;
  act(g,0,{type:'play',uid,to:'deck'});
  assert.equal(g.version,version+1,'one transaction per play');
  assert.equal(g.players[0].zones.hand.length,0,id);
  assert.equal(g.players[0].zones[to][0].id,id);
  assert.deepEqual(view(g,1).lastPlay,{version:g.version,owner:0,uid,from:'hand',to});
  assert.match(g.log.at(-1).text,/played/);
  act(g,0,{type:'undo'});
  assert.equal(g.players[0].zones.hand[0].uid,uid);
  assert.equal(g.players[0].zones[to].length,0);
  assert.equal(view(g,0).lastPlay,null,'undo never replays an old animation');
 }
});
test('Setups enter play first and banish only when their power is used; repeat-use attacks finish separately',()=>{
 for(const [id,from] of [['frieza-013-empowerment','noncombat'],['cell-091-tien-s-tri-beam','combat']]){
  const g=table(id),uid=g.players[0].zones.hand[0].uid;
  act(g,0,{type:'play',uid});assert.equal(g.players[0].zones.removed.length,0);
  act(g,0,{type:'resolve',from,uid});assert.equal(g.players[0].zones.removed[0].uid,uid);
  assert.match(g.log.at(-1).text,/used/);
  act(g,0,{type:'undo'});assert.equal(g.players[0].zones[from][0].uid,uid);
 }
});
test('conditional destinations, other-card banishment, and non-catalog cards are not guessed',()=>{
 assert.equal(cardPlayPlan(lookup('saiyan-156-allys-sacrifice')).to,'discard');
 assert.equal(cardPlayPlan(lookup('trunks-043-blue-thrusting-fist-strike')).resolve,false);
 assert.equal(cardPlayPlan(lookup('majin-buu-005-black-floating-popo-defense')).resolve,false);
 assert.equal(cardPlayPlan(catalog.find(c=>/Hi-Tech/i.test(c.rarity||''))),null);
 assert.equal(cardPlayPlan({id:'custom',type:'Energy Combat',rules:'Banish after use.'}),null);
 assert.equal(cardPlayPlan({id:'saiyan-006-red-lunge-punch',type:'Setup',rules:'Banish after use.'}).to,'discard');
 const g=table('trunks-043-blue-thrusting-fist-strike'),uid=g.players[0].zones.hand[0].uid;
 act(g,0,{type:'play',uid});assert.throws(()=>act(g,0,{type:'resolve',from:'combat',uid}));
 act(g,0,{type:'move',from:'combat',to:'removed',uid});assert.equal(g.players[0].zones.removed[0].uid,uid);
});
test('Play validates ownership and phase, rejects stale double clicks, and hides events after private movement',()=>{
 const g=table(cases[0][0]),uid=g.players[0].zones.hand[0].uid;
 assert.throws(()=>act(g,1,{type:'play',uid}));assert.equal(g.players[0].zones.hand.length,1);
 g.status='setup';assert.throws(()=>act(g,0,{type:'play',uid}));g.status='playing';
 act(g,0,{type:'play',uid});assert.throws(()=>act(g,0,{type:'play',uid}));
 assert.equal(g.players[0].zones.discard.length,1);
 act(g,0,{type:'move',from:'discard',to:'hand',uid});
 assert.equal(view(g,1).lastPlay,null);assert.deepEqual(view(g,1).players[0].zones.hand,{count:1});
 assert.ok(!JSON.stringify(view(g,1)).includes(g.players[0].zones.hand[0].uid));
});
test('all practice slots and artwork come from the current public catalog with 50 Life Deck cards',()=>{
 for(const opponent of [false,true]){
  const d=practiceDeck(opponent);
  assert.equal(d.cards.reduce((n,c)=>n+(c.qty||1),0),50);
  for(const c of [...d.personalities,d.mastery,d.sensei,...d.cards]){
   const source=lookup(c.id);assert.equal(c.image,source.image);assert.equal(c.name,source.name);assert.equal(source.status,'Ready');
  }
 }
 assert.ok(sampleCards.every(c=>lookup(c.id).image===c.image));
});
