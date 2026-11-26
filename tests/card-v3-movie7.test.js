import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {catalog as prior,codeCardIds as priorIds} from './helpers/pre-movie7.js';
import {catalogRoute,catalogSets,cardPath} from '../public/cards/card-links.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart} from '../public/personality-power.js';
import {parseDeck} from '../public/game.js';
import release from '../tools/card-corrections/v3-movie7/release-manifest.json' with {type:'json'};
import checksums from '../tools/card-corrections/v3-movie7/checksums.json' with {type:'json'};

const ready=release.filter(c=>c.release_status==='ready');
const added=catalog.slice(prior.length);
const sha=b=>createHash('sha256').update(b).digest('hex');

test('Movie 7 appends 34 playable cards without changing earlier cards or permanent IDs',()=>{
 assert.equal(release.length,34);assert.equal(added.length,34);
 assert.deepEqual(catalog.slice(0,prior.length),prior);
 assert.deepEqual(added.map(c=>c.id),ready.map(c=>c.id));
 assert.deepEqual(codeCardIds,[...priorIds,...ready.filter(c=>c.number!=='M16').map(c=>c.id),'movie7-m16-super-saiyan-goku']);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.deepEqual(added.map(c=>c.number),Array.from({length:34},(_,i)=>`M${i+1}`));
 assert.equal(catalogRoute('/cards/movie-7-super-android-13/m16',catalog).card.id,'movie7-m16-super-saiyan-goku');
 assert.equal(release.find(c=>c.number==='M16').release_status,'ready');
 const set=catalogSets(catalog).find(s=>s.name==='Movie 7: Super Android 13');
 assert.equal(set.group,'promos-subsets');assert.equal(set.parentSet,'Babidi Saga');
 assert.equal(set.count,34);assert.equal(set.totalCards,34);
});

test('every released card resolves, has both verified exports and keeps the audited native geometry',()=>{
 for(const c of added){
  const original=ready.find(r=>r.id===c.id);
  assert.equal(catalogRoute(cardPath(c),catalog).card,c);
  assert.equal(c.rules,original.modern_rules);assert.equal(c.rarity,'Promo');
  for(const field of ['image','downloadImage']){
   const [path,version]=c[field].split('?v=');
   assert.equal(sha(readFileSync('public'+path)),checksums['public'+path]);
   assert.equal(version,checksums['public'+path].slice(0,12));
  }
  const native='tools/card-templates/v3/movie7/masters/'+c.id+'.svg';
  assert.ok(existsSync(native));const svg=readFileSync(native,'utf8');
  assert.ok(!/<(?:\w+:)?text\b/.test(svg));
  assert.equal((svg.match(/id="power-icon"/g)||[]).length,original.power_icon?1:0);
  const audit=JSON.parse(readFileSync(`tools/card-corrections/v3-movie7/audit/${c.number}.json`));
  assert.ok(audit.rules.length<=5);
  for(const row of audit.rules)assert.ok(row.width<=890);
  assert.ok(audit.exports.every(e=>e.lossless_verified));
  assert.deepEqual(audit.exports.map(e=>e.size),[[1060,1484],[2120,2968]]);
  const [x,y,w,h]=audit.bounds['saga-emblem'];
  assert.ok(Math.abs(x+w/2-211.75)<.03&&Math.abs(y+h/2-1409.5)<.03);
 }
});

test('Movie 7 personalities preserve levels, PUR and all eleven printed stages through deck codes',async()=>{
 const personalities=added.filter(c=>c.type==='Main Personality');assert.equal(personalities.length,10);
 for(const c of personalities){
  const original=ready.find(r=>r.id===c.id),deck=createDeck();
  deck.personalities[c.level-1]=snapshot(c);
  const result=(await decodeDeck(await encodeDeck(deck),catalog)).personalities[c.level-1];
  assert.deepEqual([result.level,result.pur],[original.level,original.pur]);
  assert.deepEqual(powerChart(result),[...original.stages].reverse());
  assert.equal(c.powerStages.length,11);assert.equal(c.powerStages.at(-1),0);
 }
 const stack=added.filter(c=>['M1','M2','M3'].includes(c.number)).map(snapshot);
 const arena=parseDeck({personalities:stack,cards:[{...snapshot(added.find(c=>c.number==='M25')),qty:1}],tokui:''});
 for(const [i,c] of arena.personalities.entries())assert.deepEqual(c.powerLevels,powerChart(stack[i]));
});

test('CRD timing, repeatability, ownership, restriction and fixed damage survive modernization',()=>{
 const byNumber=n=>added.find(c=>c.number===`M${n}`).rules;
 assert.match(byNumber(2),/during your Attacker Attacks phase/);
 assert.match(byNumber(7),/repeatedly discard/);
 assert.match(byNumber(29),/from your banished pile/);
 assert.match(byNumber(34),/^Limit 1 per deck\./);
 assert.match(byNumber(3),/DAMAGE: 5 stages\./);
 assert.match(byNumber(26),/DAMAGE: 5 life cards\./);
 assert.match(byNumber(33),/DAMAGE: AT stages \+5 life cards\./);
});
