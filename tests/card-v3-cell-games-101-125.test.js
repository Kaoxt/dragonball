import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart,personalityPower} from '../public/personality-power.js';
import {isUltraRare,finishForImage} from '../public/card-surface.js';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
const base='tools/card-corrections/v3-cell-games-101-125/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('publication.json'),expected=read('catalog.json'),audit=read('audit.json');
const ids=new Set(release.card_ids),cards=catalog.filter(c=>ids.has(c.id));
const hash=b=>createHash('sha256').update(b).digest('hex');

test('adds exactly 25 cards and completes Cell Games 1–125 without changing existing records or deck positions',()=>{
 assert.deepEqual(cards,expected);
 assert.equal(catalog.length,release.baseline_catalog_count+25);
 assert.equal(hash(JSON.stringify(catalog.filter(c=>!ids.has(c.id)))),release.baseline_catalog_canonical_sha256);
 assert.deepEqual(codeCardIds.slice(0,release.baseline_code_id_count),release.baseline_code_ids);
 assert.deepEqual(codeCardIds.slice(release.baseline_code_id_count),release.card_ids);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 assert.equal(catalogSets(catalog).find(s=>s.name==='Cell Games Saga').count,125);
 assert.deepEqual(catalog.filter(c=>c.set==='Cell Games Saga').map(c=>Number(c.number)).sort((a,b)=>a-b),Array.from({length:125},(_,i)=>i+1));
});

test('all 25 native sources, linked artwork, original scans and 50 independently rendered exports retain package bytes',()=>{
 const manifest=read('package/SHA256SUMS.json'),verified=read('independent-verification.json');
 assert.equal(verified.cards,25);assert.equal(verified.exports,50);assert.equal(audit.length,25);
 for(const [name,digest] of Object.entries(manifest)){
  if(name.startsWith('files/'))assert.equal(hash(fs.readFileSync(name.slice(6))),digest,name);
 }
 for(const row of audit){
  const c=cards.find(c=>c.id===row.id),proof=verified.results.find(v=>v.id===row.id);
  assert.equal(hash(fs.readFileSync(row.native_source_path)),row.native_source_sha256);
  const svg=fs.readFileSync(row.native_source_path,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
  const nativeIds=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(nativeIds).size,nativeIds.length);
  for(const a of row.assets)assert.equal(hash(fs.readFileSync(a.path)),a.sha256);
  for(const [,link] of svg.matchAll(/(?:xlink:)?href="(\.\.\/assets\/[^\"]+)"/g))assert.ok(row.assets.some(a=>a.path===path.normalize(path.join(path.dirname(row.native_source_path),link))));
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path),check=proof.exports.find(x=>x.path===e.path);
   assert.equal(hash(bytes),e.after_sha256);assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(check.independent_render_pixel_differences,0);assert.equal(check.sha256,e.after_sha256);assert.deepEqual(check.size,e.size);
  }
 }
});

test('all printed personality stages work in Arena, including saved deck snapshots',()=>{
 for(const c of cards.filter(c=>c.level)){
  const chart=c.powerStages.toReversed();assert.deepEqual(c.powerLevels,chart);
  assert.deepEqual(powerChart(c),chart);assert.deepEqual(powerChart(snapshot(c)),chart);
  const deck=createDeck();deck.personalities[c.level-1]=snapshot(c);
  assert.equal(personalityPower({...deck,level:c.level,stages:0}),0);
  assert.equal(personalityPower({...deck,level:c.level,stages:chart.length-1}),chart.at(-1));
  const source=read('cards.json').find(v=>v.id===c.id);assert.deepEqual(c.powerStages,source.stages);
 }
 const rules=n=>cards.find(c=>c.number===String(n)).rules;
 assert.match(rules(101),/owned by your opponent/);assert.match(rules(108),/cannot win by Most Powerful Personality Victory/);
 assert.match(rules(111),/^Limit 2 per deck.*Personality, Dragon Ball, Sensei, or Mastery/);
 assert.match(rules(113),/\+4 stages.*remainder of Combat/);assert.match(rules(114),/redirect damage.*other Allies/);
 assert.match(rules(120),/^Limit 1 per deck.*Banish after use\.$/);assert.match(rules(121),/^Limit 0 per deck/);
 assert.match(rules(123),/^You must have 4 anger/);assert.equal(rules(125),'All your physical attacks do +5 stages of damage.');
});

test('all new routes, deck codes, landscape geometry and the two Ultra Rare finishes resolve correctly',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8'),assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const c of cards){
  const url='/cards/cell-games-saga/'+c.number;assert.equal(cardPath(c),url);assert.equal(cardFromPath(url,catalog),c);
  const response=await cardPage(new Request('https://dragonballocg.com'+url),assets);assert.equal(response.status,200);assert.ok((await response.text()).includes(c.image));
  const deck=createDeck();if(c.level)deck.personalities[c.level-1]=snapshot(c);else deck.cards.push({...snapshot(c),qty:1});
  const decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.deepEqual(decoded.personalities,deck.personalities);assert.deepEqual(decoded.cards,deck.cards);
  assert.deepEqual([c.width,c.height],c.number==='117'?[1484,1060]:[1060,1484]);
  if(Number(c.number)>=124){assert.ok(isUltraRare(c));assert.equal(ultraRareMask(c),'/card-effects/ultra-rare/generic-v3.svg');assert.equal(finishForImage(c.image)?.id,c.id);assert.equal(finishForImage(c.downloadImage)?.id,c.id);}
  else assert.equal(finishForImage(c.image),null);
 }
});
