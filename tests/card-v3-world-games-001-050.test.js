import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {catalog as beforeStrokeCatalog,beforeSaiyanStrokeHash} from './helpers/saiyan-stroke-history.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
const base='tools/card-corrections/v3-world-games-001-050/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const audit=read('audit.json'),data=read('cards.json'),release=read('release.json');
const completionBase='tools/card-corrections/v3-world-games-034/';
const completion=JSON.parse(fs.readFileSync(completionBase+'release.json','utf8'));
const completedCard=JSON.parse(fs.readFileSync(completionBase+'audit.json','utf8'));
const cards=catalog.filter(c=>c.set==='World Games Saga'&&Number(c.number)<=50);
const digest=b=>createHash('sha256').update(b).digest('hex');
const expected=Array.from({length:50},(_,i)=>i+1);

test('World Games publishes cards 1–50 and preserves the initial 49-card release',()=>{
 assert.deepEqual(cards.map(c=>Number(c.number)),expected);
 assert.deepEqual(release.numbers,expected.filter(n=>n!==34));
 assert.equal(audit.length,49);assert.equal(release.export_count,98);
 assert.deepEqual(release.pending.map(c=>c.number),[34]);
 assert.deepEqual(completion.numbers,[34]);assert.deepEqual(completion.pending,[]);
 assert.equal(completion.completed_card_count,50);
 const beforeCompletion=beforeStrokeCatalog.filter(c=>c.id!==completedCard.id);
 assert.equal(digest(Buffer.from('export const catalog = '+JSON.stringify(beforeCompletion,null,2)+';\n')),completion.baseline_catalog_sha256);
 const prior=beforeStrokeCatalog.filter(c=>c.set!=='World Games Saga');
 assert.deepEqual(prior.map(c=>c.id),read('baseline-card-ids.json'));
 assert.equal(digest(Buffer.from('export const catalog = '+JSON.stringify(prior,null,2)+';\n')),release.baseline_catalog_sha256);
 assert.equal(cardFromPath('/cards/world-games-saga/034',catalog)?.id,completedCard.id);
 for(const c of cards){
  const source=data.find(r=>r.id===c.id);
  assert.equal(c.rules,source.modern_rules);assert.equal(c.style,source.style);
  assert.equal(c.type,source.category.toLowerCase().replace(/\b\w/g,s=>s.toUpperCase()));
  assert.equal(c.rarity,source.rarity_stars===1?'Common':'Uncommon');
  assert.equal(cardFromPath(cardPath(c),catalog),c);
 }
});

test('card 34 uses the approved native source and both reviewed lossless exports',()=>{
 const card=cards.find(c=>c.id===completedCard.id);assert.ok(card);
 assert.equal(card.number,'34');assert.equal(card.name,'Saiyan Readied Attack');
 const entries=[{path:completedCard.native_source_path,sha256:completedCard.native_source_sha256},...completedCard.assets];
 for(const entry of entries) assert.equal(beforeSaiyanStrokeHash(entry.path),entry.sha256,entry.path);
 assert.equal(digest(fs.readFileSync(completedCard.artwork.source)),completedCard.artwork.source_sha256);
 for(const e of completedCard.exports){
  const bytes=fs.readFileSync(e.path);assert.equal(beforeSaiyanStrokeHash(e.path),e.after_sha256,e.path);
  assert.equal(beforeStrokeCatalog.find(c=>c.id===card.id)[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  const scale=e.field==='image'?1:2;assert.deepEqual(e.size,[1060*scale,1484*scale]);
 }
});

test('every World Games native source, dependency and both exports match the saved archive',()=>{
 const manifest=read('archive-MANIFEST.json');
 for(const row of audit){
  const card=cards.find(c=>c.id===row.id);assert.ok(card);
  const entries=[{path:row.native_source_path,sha256:row.native_source_sha256},...row.assets];
  for(const entry of entries){
   assert.equal(beforeSaiyanStrokeHash(entry.path),entry.sha256,entry.path);
   assert.equal(manifest[entry.path].sha256,entry.sha256);
  }
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);
   assert.equal(beforeSaiyanStrokeHash(e.path),e.after_sha256,e.path);
   assert.equal(manifest[e.path].sha256,e.after_sha256);
   assert.equal(beforeStrokeCatalog.find(c=>c.id===card.id)[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
   const scale=e.field==='image'?1:2;
   assert.deepEqual(e.size,[card.width*scale,card.height*scale]);
  }
 }
 assert.deepEqual([cards.find(c=>c.number==='38').width,cards.find(c=>c.number==='38').height],[1484,1060]);
});

test('World Games set and all 50 card pages work at their public URLs',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');
 const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 const set=catalogSets(catalog).find(s=>s.name==='World Games Saga');
 assert.equal(set.count,150);assert.match(set.image,/world-games-saga-logo-brushed-blue-spaced.svg/);
 const page=await cardPage(new Request('https://dragonballocg.com'+set.path),assets);
 assert.equal(page.status,200);assert.match(await page.text(),/World Games Saga/);
 for(const card of cards){
  const page=await cardPage(new Request('https://dragonballocg.com'+cardPath(card)),assets);
  assert.equal(page.status,200);
  const body=await page.text();assert.ok(body.includes(card.image));
 }
 assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/world-games-saga/151'),assets)).status,404);
});

test('all 50 World Games cards round-trip through portable deck codes',async()=>{
 const deck=createDeck();deck.name='World Games Saga';
 deck.cards=cards.map(c=>({...snapshot(c),qty:1}));
 const result=await decodeDeck(await encodeDeck(deck),catalog);
 assert.deepEqual(result.cards,deck.cards);
});
