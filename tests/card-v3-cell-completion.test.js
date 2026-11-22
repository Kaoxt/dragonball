import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog,codeCardIds} from './helpers/pre-cell-games-p5.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {beforeCellCompletionFile} from './helpers/pre-cell-completion.js';
const base='tools/card-corrections/v3-cell-completion-20261121/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('publication.json'),audit=read('audit.json'),expected=read('catalog-additions.json');
const added=new Set(release.card_ids),cards=catalog.filter(c=>added.has(c.id));
const hash=b=>createHash('sha256').update(b).digest('hex');

test('Cell completion appends distinct previews/promos without altering prior cards or deck IDs',()=>{
 assert.equal(cards.length,22);assert.deepEqual(cards,expected);
 const old=catalog.filter(c=>!added.has(c.id));assert.deepEqual(old,read('baseline-catalog.json'));
 assert.equal(old.length,release.baseline_catalog_count);
 assert.equal(hash(JSON.stringify(old)),release.baseline_catalog_canonical_sha256);
 const previous=read('baseline-code-card-ids.json');
 assert.deepEqual(codeCardIds.slice(0,previous.length),previous);
 assert.deepEqual(codeCardIds.slice(previous.length),release.card_ids);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 const counts=new Map(catalogSets(catalog).map(s=>[s.name,s.count]));
 assert.equal(counts.get('Cell Saga'),216);assert.equal(counts.get('Cell Games Saga'),141);assert.equal(counts.get('World Games Saga'),218);
 assert.deepEqual(release.remaining.map(c=>c.number),['P5']);
 assert.ok(!cards.some(c=>c.set==='Cell Games Saga'&&c.number==='P5'));
 for(const f of release.integration_files)assert.equal(hash(beforeCellCompletionFile(f.path)),f.before_sha256);
});

test('all new native sources, linked artwork and 44 lossless exports have verified identities',()=>{
 assert.equal(audit.length,22);
 for(const row of audit){
  const card=cards.find(c=>c.id===row.id),svg=fs.readFileSync(row.native_source_path,'utf8');
  assert.ok(card);assert.equal(hash(svg),row.native_source_sha256);assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
  for(const asset of row.assets)assert.equal(hash(fs.readFileSync(asset.path)),asset.sha256,asset.path);
  for(const [,link] of svg.matchAll(/(?:\w+:)?href="(\.\.\/assets\/[^\"]+)"/g)){
   const resolved=path.normalize(path.join(path.dirname(row.native_source_path),link));
   assert.ok(row.assets.some(a=>a.path===resolved),resolved);
  }
  const land=card.type==='Battleground';
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);assert.equal(hash(bytes),e.sha256,e.path);
   assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.equal(bytes.toString('ascii',12,16),'VP8L');assert.equal(bytes[20],0x2f);
   const bits=bytes.readUInt32LE(21),size=[(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];
   assert.deepEqual(size,e.size);
   assert.deepEqual(size,e.field==='image'?(land?[1484,1060]:[1060,1484]):(land?[2968,2120]:[2120,2968]));
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
  }
 }
});

test('CRD-specific timing, performer restrictions and printed rarities remain explicit',()=>{
 const cell=n=>cards.find(c=>c.set==='Cell Saga'&&c.number===n),games=n=>cards.find(c=>c.set==='Cell Games Saga'&&c.number===n);
 assert.match(cell('PR6').rules,/Your attacks performed by Cell/);
 assert.match(games('PR4').rules,/Use during any Planning Step/);
 assert.match(cell('PR3').rules,/Energy attack costing 2 stages/);
 assert.match(games('P1').rules,/AT \+2 stages and \+1 life card per Cell Jr\./);
 assert.match(games('P4').rules,/HIT: Shuffle all Drills/);
 assert.match(games('P7').rules,/Personality, Setup or Drill/);
 assert.match(games('P8').rules,/Endurance 2/);assert.match(games('PR5').rules,/Endurance 3/);
 assert.deepEqual(audit.filter(c=>c.set==='Cell Saga').sort((a,b)=>a.number.localeCompare(b.number)).map(c=>c.rarity_stars),[1,1,3,3,5,5]);
 assert.deepEqual(audit.filter(c=>c.set==='Cell Games Saga'&&c.number.startsWith('PR')).sort((a,b)=>a.number.localeCompare(b.number)).map(c=>c.rarity_stars),[1,1,3,3,5,5,2]);
});

test('new routes resolve with either case of the card number and the correct social preview',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');
 const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const card of cards){
  const url=cardPath(card);assert.equal(cardFromPath(url.slice(0,url.lastIndexOf('/')+1)+card.number,catalog),card);
  const response=await cardPage(new Request('https://dragonballocg.com'+url),assets);
  assert.equal(response.status,200);assert.ok((await response.text()).includes(card.image));
 }
});

test('each added card round-trips through permanent deck codes',async()=>{
 for(const card of cards){
  const deck=createDeck();deck.cards.push({...snapshot(card),qty:1});
  const decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.deepEqual(decoded.cards,deck.cards);
 }
});
