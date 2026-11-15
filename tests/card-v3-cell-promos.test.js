import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog} from './helpers/personality-centering-history.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {beforeCellPromosFile} from './helpers/pre-cell-promos.js';
const base='tools/card-corrections/v3-cell-promos-p1-p10/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('publication.json'),audit=read('audit.json'),expected=read('catalog-additions.json');
const added=new Set(release.card_ids),cards=catalog.filter(c=>added.has(c.id));
const hash=b=>createHash('sha256').update(b).digest('hex');

test('Cell promos extend the set to 210 without changing previous cards or permanent deck positions',()=>{
 assert.deepEqual(cards,expected);
 assert.deepEqual(cards.map(c=>c.number),Array.from({length:10},(_,i)=>'P'+(i+1)));
 const old=catalog.filter(c=>!added.has(c.id));
 assert.deepEqual(old,read('baseline-catalog.json'));
 assert.equal(old.length,release.baseline_catalog_count);
 assert.equal(hash(JSON.stringify(old)),release.baseline_catalog_canonical_sha256);
 const previous=read('baseline-code-card-ids.json');
 assert.deepEqual(codeCardIds.slice(0,previous.length),previous);
 assert.deepEqual(codeCardIds.slice(previous.length),release.card_ids);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 assert.equal(catalogSets(catalog).find(s=>s.name==='Cell Saga').count,210);
 for(const f of release.integration_files)assert.equal(hash(beforeCellPromosFile(f.path)),f.before_sha256);
});

test('all supplied source files and twenty lossless exports retain the package hashes and dimensions',()=>{
 const manifest=read('package/manifest.json');
 for(const f of manifest.files)assert.equal(hash(fs.readFileSync(f.path)),f.sha256,f.path);
 assert.equal(audit.length,10);
 for(const row of audit){
  const card=cards.find(c=>c.id===row.id),svg=fs.readFileSync(row.native_source_path,'utf8');
  assert.equal(hash(svg),row.native_source_sha256);assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
  for(const [,link] of svg.matchAll(/(?:\w+:)?href="(\.\.\/assets\/[^\"]+)"/g)){
   const resolved=path.normalize(path.join(path.dirname(row.native_source_path),link));
   assert.ok(row.assets.some(a=>a.path===resolved),resolved);
  }
  assert.equal(row.rarity_stars,2);
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);
   assert.equal(hash(bytes),e.sha256);assert.equal(bytes.toString('ascii',0,4),'RIFF');
   assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.toString('ascii',12,16),'VP8L');
   assert.equal(bytes[20],0x2f);const bits=bytes.readUInt32LE(21);
   const size=[(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];
   assert.deepEqual(size,e.size);assert.deepEqual(size,e.field==='image'?[1060,1484]:[2120,2968]);
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
  }
 }
 const p3=audit.find(c=>c.number==='P3');assert.equal(p3.artwork.mode,'user-selected direct restoration');
 assert.equal(p3.artwork.additional_zoom,false);assert.equal(p3.artwork.source_sha256,'d6852a98cf21b8c48844a7f4d1e77bb6fbf39fbca3d37d85b8289f07086fa1fa');
});

test('reviewed promo wording retains CRD costs, timing, restrictions and Event terminology',()=>{
 const card=n=>cards.find(c=>c.number===n);
 assert.match(card('P1').rules,/Limit 1 per deck unless your Main Personality is Cell/);
 assert.match(card('P1').rules,/Energy attack costing 2 stages/);assert.match(card('P1').rules,/Banish after use\.$/);
 assert.match(card('P3').rules,/highest stage and shuffle the bottom card/);
 assert.match(card('P3').rules,/Life Deck\. Lower your opponent's anger 2 levels\.$/);
 assert.match(card('P7').rules,/Limit 1 per deck\. Use when needed\./);assert.match(card('P7').rules,/5 or more anger/);
 assert.match(card('P8').rules,/^Limit 1 per deck\./);
 assert.equal(card('P10').type,'Event');assert.match(card('P10').rules,/cannot use Event cards/);
});

test('all ten case-normalized promo routes resolve to their approved social previews',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');
 const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const c of cards){
  assert.equal(cardPath(c),'/cards/cell-saga/'+c.number.toLowerCase());
  assert.equal(cardFromPath('/cards/cell-saga/'+c.number,catalog),c);
  const response=await cardPage(new Request('https://dragonballocg.com'+cardPath(c)),assets);
  assert.equal(response.status,200);assert.ok((await response.text()).includes(c.image));
 }
});

test('each promo round-trips through permanent deck codes',async()=>{
 for(const c of cards){
  const deck=createDeck();deck.cards.push({...snapshot(c),qty:1});
  const decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.deepEqual(decoded.cards,deck.cards);
 }
});
