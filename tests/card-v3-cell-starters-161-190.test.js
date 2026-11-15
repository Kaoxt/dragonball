import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog} from './helpers/pre-world-games-promos.js';
import {codeCardIds} from './helpers/pre-world-games-promos.js';
import {catalog as currentCatalog} from '../public/cards/catalog.js';
import {beforeRemainingFile,beforeRemainingHash} from './helpers/remaining-personality-history.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart,personalityPower} from '../public/personality-power.js';
import {isHiTechPersonality,blocksHiTechAlly} from '../public/decks/eligibility.js';
const base='tools/card-corrections/v3-cell-starters-161-190/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),audit=read('audit.json'),expected=read('cards.json');
const sources=read('source-cards.json');
const added=new Set(release.card_ids),cards=catalog.filter(c=>added.has(c.id));
const hash=b=>createHash('sha256').update(b).digest('hex');

test('adds all 30 Cell starter personalities and preserves existing cards and permanent deck codes',()=>{
 assert.deepEqual(cards,expected);
 assert.deepEqual(cards.map(c=>Number(c.number)),Array.from({length:30},(_,i)=>161+i));
 const old=catalog.filter(c=>!added.has(c.id));
 assert.equal(old.length,release.baseline_catalog_count);
 assert.equal(hash(JSON.stringify(old)),release.baseline_catalog_canonical_sha256);
 const previous=read('baseline-code-card-ids.json');
 assert.deepEqual(codeCardIds.slice(0,previous.length),previous);
 assert.deepEqual(codeCardIds.slice(previous.length),release.deck_code_append_ids);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 assert.equal(catalogSets(catalog).find(s=>s.name==='Cell Saga').count,200);
 assert.deepEqual(catalog.filter(c=>c.set==='Cell Saga'&&c.rarity==='Hi-Tech'),read('baseline-cell-hi-tech.json'));
});

test('all native sources, linked assets, references and both lossless exports match their verified hashes',()=>{
 assert.equal(audit.length,30);
 for(const row of audit){
  const c=cards.find(c=>c.id===row.id);
  for(const file of [row.native_source,row.original_reference,...row.assets]){
   assert.equal(beforeRemainingHash(file.path),file.sha256,file.path);
  }
  const svg=beforeRemainingFile(row.native_source.path,'utf8');
  assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
  for(const [,link] of svg.matchAll(/(?:\w+:)?href="(\.\.\/assets\/[^\"]+)"/g)){
   const resolved=path.normalize(path.join(path.dirname(row.native_source.path),link));
   assert.ok(row.assets.some(a=>a.path===resolved),resolved);
  }
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);
   assert.equal(beforeRemainingHash(e.path),e.sha256);
   assert.equal(bytes.toString('ascii',0,4),'RIFF');
   assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.equal(bytes.toString('ascii',12,16),'VP8L');
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);
   assert.equal(e.decoded_pixels_match_native_render,true);
  }
 }
});

test('Arena retains every original stage, Level and PUR, including irregular printed stage intervals',()=>{
 for(const c of cards){
  const source=sources.find(s=>s.id===c.id);
  assert.equal(c.level,source.level);assert.equal(c.pur,source.pur);
  assert.deepEqual(c.powerStages,source.stages);
  assert.deepEqual(powerChart(c),source.stages.toReversed());
  const personalities=Array(5).fill(null);personalities[c.level-1]=c;
  assert.equal(personalityPower({personalities,level:c.level,stages:0}),0);
  assert.equal(personalityPower({personalities,level:c.level,stages:source.stages.length-1}),source.stages[0]);
  const svg=fs.readFileSync(audit.find(a=>a.id===c.id).native_source.path,'utf8');
  assert.deepEqual([...svg.matchAll(/id="power-stage-\d+"[^>]*data-stage-value="(\d+)"/g)].map(m=>Number(m[1])),source.stages);
 }
 assert.equal(cards.find(c=>c.number==='180').rules,'Physical attack. DAMAGE: AT +4 stages. If The Car is in play, DAMAGE: AT +6 stages instead.');
});

test('starter personalities round-trip through deck codes in their matching Level slots',async()=>{
 for(const c of cards){
  assert.equal(c.rarity,'Starter');assert.ok(!isHiTechPersonality(c));
  assert.ok(!blocksHiTechAlly(c,'cards'));
  const deck=createDeck();deck.personalities[c.level-1]=snapshot(c);
  assert.deepEqual((await decodeDeck(await encodeDeck(deck),catalog)).personalities,deck.personalities);
 }
});

test('all 30 card routes resolve to the verified images, including Goku 162',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');
 const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const c of cards){
  assert.equal(cardPath(c),'/cards/cell-saga/'+c.number);
  assert.equal(cardFromPath(cardPath(c),catalog),c);
  const response=await cardPage(new Request('https://dragonballocg.com'+cardPath(c)),assets);
  assert.equal(response.status,200);assert.ok((await response.text()).includes(currentCatalog.find(card=>card.id===c.id).image));
 }
});
