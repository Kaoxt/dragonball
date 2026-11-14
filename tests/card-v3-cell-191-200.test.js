import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {catalog as beforeWorldGamesRefinement} from './helpers/world-games-hi-tech-history.js';
import {codeCardIds} from './helpers/pre-cell-games-101-125.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart,personalityPower} from '../public/personality-power.js';
import {isHiTechPersonality,blocksHiTechAlly} from '../public/decks/eligibility.js';
const base='tools/card-corrections/v3-cell-191-200/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),audit=read('audit.json'),expected=read('cards.json');
const added=new Set(release.card_ids),cards=catalog.filter(c=>added.has(c.id));
const hash=b=>createHash('sha256').update(b).digest('hex');
const descending=(top,step,count)=>Array.from({length:count},(_,i)=>top-i*step).concat(0);
const stages=[descending(3200000,200000,12),descending(3800000,200000,11),
 descending(3000000,200000,12),descending(3000000,200000,12),descending(3500000,200000,12),
 descending(3045000,5000,10),descending(2045000,5000,10),descending(1500000,10000,10),
 descending(1400000,100000,10),descending(3500000,200000,12)];

test('adds exactly the ten Cell Hi-Tech cards while preserving every previous record and deck index',()=>{
 assert.deepEqual(cards,expected);
 assert.deepEqual(cards.map(c=>Number(c.number)),Array.from({length:10},(_,i)=>191+i));
 const old=beforeWorldGamesRefinement.filter(c=>!added.has(c.id));
 assert.equal(old.length,release.baseline_catalog_count);
 assert.equal(hash(JSON.stringify(old)),release.baseline_catalog_canonical_sha256);
 const previous=read('baseline-code-card-ids.json');
 assert.deepEqual(codeCardIds.slice(0,previous.length),previous);
 assert.deepEqual(codeCardIds.slice(previous.length),release.card_ids);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 assert.equal(catalogSets(catalog).find(s=>s.name==='Cell Saga').count,170);
});

test('the ten sources, original references, linked assets and twenty exports retain approved bytes',()=>{
 const rendered=read('render-verification.json');
 assert.equal(audit.length,10);assert.equal(rendered.length,10);
 for(const row of audit){
  const c=cards.find(c=>c.id===row.id),check=rendered.find(r=>r.id===row.id);
  for(const file of [{path:row.native_source_path,sha256:row.native_source_sha256},row.original_reference,...row.assets]){
   assert.equal(hash(fs.readFileSync(file.path)),file.sha256,file.path);
  }
  const svg=fs.readFileSync(row.native_source_path,'utf8');
  assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
  assert.match(svg,/data-set="Cell Saga"/);
  assert.match(svg,/data-artwork-treatment="cell-hexagon-ghost-portrait-hi-tech"/);
  for(const [,link] of svg.matchAll(/(?:xlink:)?href="(\.\.\/assets\/[^\"]+)"/g)){
   const resolved=path.normalize(path.join(path.dirname(row.native_source_path),link));
   assert.ok(row.assets.some(a=>a.path===resolved),resolved);
  }
  assert.equal(check.native_source_sha256,row.native_source_sha256);
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);
   assert.equal(hash(bytes),e.sha256);assert.equal(bytes.toString('ascii',0,4),'RIFF');
   assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);
   assert.ok(check.exports.find(x=>x.path===e.path&&x.sha256===e.sha256)?.decoded_pixels_match_render);
  }
 }
});

test('original Level 3, PUR, alignment and every printed stage work in Arena',()=>{
 cards.forEach((c,i)=>{
  assert.equal(c.level,3);assert.equal(c.pur,[3,3,3,3,3,3,2,2,2,3][i]);
  assert.equal(c.alignment,i<5?'Hero':'Villain');assert.deepEqual(c.powerStages,stages[i]);
  const svg=fs.readFileSync(audit[i].native_source_path,'utf8');
  assert.deepEqual([...svg.matchAll(/id="power-stage-\d+"[^>]*data-stage-value="(\d+)"/g)].map(m=>Number(m[1])),stages[i]);
  assert.deepEqual(powerChart(c),stages[i].toReversed());
  assert.equal(personalityPower({personalities:[null,null,c],level:3,stages:0}),0);
  assert.equal(personalityPower({personalities:[null,null,c],level:3,stages:stages[i].length-1}),stages[i][0]);
 });
 const rule=n=>cards.find(c=>c.number===String(n)).rules;
 assert.match(rule(191),/draw a card and reveal it.*Physical Combat or Energy Combat.*top 3/);
 assert.equal(rule(192),'Physical attack. DAMAGE: AT +5 stages. You may banish a Setup or Drill in play.');
 assert.match(rule(193),/discard 1 non-Dragon Ball card/);
 assert.match(rule(194),/top card.*bottom.*Draw a card/);
 assert.match(rule(195),/Stops an energy attack.*twice per Combat/);
 assert.match(rule(196),/attacker.*loses 3 stages/);
 assert.match(rule(197),/Draw a card.*The Car.*draw another/);
 assert.equal(rule(198),'Energy attack costing 2 stages. DAMAGE: 6 life cards. If The Car is in play, this attack also deals 4 stages of damage.');
 assert.equal(rule(199),'Energy attack costing 0 stages. DAMAGE: 8 life cards.');
 assert.match(rule(200),/AT \+5 stages\. HIT: Raise your anger 1 level/);
});

test('Hi-Tech cards round-trip in their Level 3 deck slots and cannot be Allies',async()=>{
 for(const c of cards){
  assert.ok(isHiTechPersonality(c));assert.equal(c.rarity,'Hi-Tech');
  assert.ok(blocksHiTechAlly(c,'cards'));assert.ok(blocksHiTechAlly(c,'senseiDeck'));
  assert.ok(!blocksHiTechAlly(c,'personalities'));
  const deck=createDeck();deck.personalities[2]=snapshot(c);
  assert.deepEqual((await decodeDeck(await encodeDeck(deck),catalog)).personalities,deck.personalities);
 }
});

test('new Cell routes display their exact images and the unprovided range remains absent',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');
 const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const c of cards){
  assert.equal(cardPath(c),'/cards/cell-saga/'+c.number);assert.equal(cardFromPath(cardPath(c),catalog),c);
  const response=await cardPage(new Request('https://dragonballocg.com'+cardPath(c)),assets);
  assert.equal(response.status,200);assert.ok((await response.text()).includes(c.image));
 }
 for(const n of [161,175,190,201])assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/cell-saga/'+n),assets)).status,404);
});
