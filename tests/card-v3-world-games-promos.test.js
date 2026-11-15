import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from './helpers/pre-cell-promos.js';
import {codeCardIds} from './helpers/pre-cell-promos.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart,personalityPower} from '../public/personality-power.js';
import {isHiTechPersonality,blocksHiTechAlly} from '../public/decks/eligibility.js';
const base='tools/card-corrections/v3-world-games-201-promos/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('publication.json'),audit=read('audit.json'),expected=read('catalog.json');
const added=new Set(release.card_ids),cards=catalog.filter(c=>added.has(c.id));
const hash=b=>createHash('sha256').update(b).digest('hex');

test('adds Videl, ten promos and seven distinct previews while preserving all previous cards and deck positions',()=>{
 assert.deepEqual(cards,expected);
 assert.deepEqual(cards.map(c=>c.number),['201',...Array.from({length:10},(_,i)=>'P'+(i+1)),...Array.from({length:7},(_,i)=>'PR'+(i+1))]);
 const old=catalog.filter(c=>!added.has(c.id));
 assert.equal(old.length,release.baseline_catalog_count);
 assert.equal(hash(JSON.stringify(old)),release.baseline_catalog_canonical_sha256);
 const previous=read('baseline-code-card-ids.json');
 assert.deepEqual(codeCardIds.slice(0,previous.length),previous);
 assert.deepEqual(codeCardIds.slice(previous.length),release.card_ids);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 assert.equal(catalogSets(catalog).find(s=>s.name==='World Games Saga').count,218);
 for(const c of cards.filter(c=>c.number.startsWith('PR'))){assert.equal(c.sourceNumber,'Preview '+c.number.slice(2));assert.match(c.subset,/Babidi Saga preview distributed with World Games/);}
});

test('native sources, linked assets and all 36 lossless exports preserve the approved handoff bytes',()=>{
 const manifest=read('package/SHA256SUMS.json');
 for(const [p,sha] of Object.entries(manifest).filter(([p])=>p.startsWith('files/')))assert.equal(hash(fs.readFileSync(p.slice(6))),sha,p);
 assert.equal(audit.length,18);
 for(const row of audit){
  const c=cards.find(c=>c.id===row.id),svg=fs.readFileSync(row.native_source_path,'utf8');
  assert.equal(hash(svg),row.native_source_sha256);assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);assert.equal(hash(bytes),e.after_sha256);
   assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.toString('ascii',12,16),'VP8L');
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,[c.width*(e.field==='image'?1:2),c.height*(e.field==='image'?1:2)]);
  }
 }
 const renders=read('publication-render-verification.json');assert.equal(renders.exports,36);
 assert.ok(renders.results.every(r=>r.exports.every(e=>e.independent_render_pixel_differences===0)));
 assert.deepEqual([cards.find(c=>c.number==='P1').width,cards.find(c=>c.number==='P1').height],[1484,1060]);
});

test('Arena snapshots preserve four exact charts including Supreme Kai eleven Z stages and zero',()=>{
 for(const c of cards.filter(c=>c.type==='Main Personality')){
  assert.deepEqual(powerChart(c),c.powerStages.toReversed());assert.deepEqual(powerChart(snapshot(c)),c.powerStages.toReversed());
  assert.equal(personalityPower({personalities:[snapshot(c)],level:1,stages:0}),0);
  assert.equal(personalityPower({personalities:[snapshot(c)],level:1,stages:c.powerStages.length-1}),c.powerStages[0]);
 }
 assert.deepEqual(powerChart(cards.find(c=>c.number==='PR6')),[0,...Array(11).fill('Z')]);
 const videl=cards.find(c=>c.number==='201');assert.ok(isHiTechPersonality(videl));
 assert.ok(blocksHiTechAlly(videl,'cards'));assert.ok(blocksHiTechAlly(videl,'senseiDeck'));assert.ok(!blocksHiTechAlly(videl,'personalities'));
});

test('reviewed rules retain discard ownership, Setup and Drill counting, and default energy damage',()=>{
 const card=n=>cards.find(c=>c.number===n);
 assert.match(card('P6').rules,/opponent's discard pile/);assert.match(card('P8').rules,/Setup or Drill/);
 assert.equal(card('PR1').type,'Setup');assert.match(card('PR1').rules,/Allies and Events/);
 assert.equal(card('PR3').type,'Event');assert.match(card('PR5').rules,/costing 2 stages.*DAMAGE: 4 life cards/);
});

test('all numbered, promo and preview routes are distinct and serve their approved images',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const c of cards){
  assert.equal(cardPath(c),'/cards/world-games-saga/'+c.number.toLowerCase());assert.equal(cardFromPath(cardPath(c),catalog),c);
  const response=await cardPage(new Request('https://dragonballocg.com'+cardPath(c)),assets);assert.equal(response.status,200);assert.ok((await response.text()).includes(c.image));
 }
});

test('all 18 cards round-trip through deck codes in their appropriate zones',async()=>{
 for(const c of cards){
  const deck=createDeck();if(c.level)deck.personalities[c.level-1]=snapshot(c);else deck.cards.push({...snapshot(c),qty:1});
  const decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.deepEqual(decoded.personalities,deck.personalities);assert.deepEqual(decoded.cards,deck.cards);
 }
});
