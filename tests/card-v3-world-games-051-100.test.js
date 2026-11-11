import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
const base='tools/card-corrections/v3-world-games-051-100/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),audit=read('audit.json'),data=read('cards.json');
const cards=catalog.filter(c=>c.set==='World Games Saga'&&Number(c.number)>=51&&Number(c.number)<=100);
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=Array.from({length:50},(_,i)=>i+51);

test('all 50 ready cards are added without changing the existing catalog entries',()=>{
 assert.deepEqual(cards.map(c=>Number(c.number)),expected);assert.deepEqual(release.numbers,expected);
 assert.equal(audit.length,50);assert.equal(release.export_count,100);assert.deepEqual(release.pending,[]);
 const ids=new Set(cards.map(c=>c.id)),prior=catalog.filter(c=>!ids.has(c.id));
 assert.equal(hash(Buffer.from('export const catalog = '+JSON.stringify(prior,null,2)+';\n')),release.baseline_catalog_sha256);
 assert.deepEqual(prior.map(c=>c.id),read('baseline-card-ids.json'));
 for(const c of cards){const d=data.find(d=>d.id===c.id);assert.equal(c.rules,d.modern_rules);assert.equal(c.style,d.style);assert.equal(c.rarity,d.rarity);assert.equal(c.templateVersion,3);}
});

test('all native sources, shared assets and 100 actual exports match reviewed hashes',()=>{
 for(const row of audit){
  const c=cards.find(c=>c.id===row.id);assert.ok(c);
  for(const a of [{path:row.native_source_path,sha256:row.native_source_sha256},...row.assets])assert.equal(hash(fs.readFileSync(a.path)),a.sha256,a.path);
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path);assert.equal(hash(bytes),e.after_sha256);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));assert.deepEqual(e.size,[c.width*(e.field==='image'?1:2),c.height*(e.field==='image'?1:2)]);
  }
 }
});

test('new style symbols use the approved thinner strokes and special cards retain their data',()=>{
 const weights={Blue:['blue-style-symbol','7.403846151625'],Namekian:[null,'7.3076923055'],Orange:['orange-style-symbol','6.92307'],Freestyle:['freestyle-glyph','0.8']};
 for(const row of audit){
  const c=cards.find(c=>c.id===row.id),svg=fs.readFileSync(row.native_source_path,'utf8');
  if([91,99].includes(row.number)){assert.ok(!svg.includes('id="tokui-waza-symbol"'));continue;}
  if(c.style==='Red')continue;
  const [id,width]=weights[c.style];if(c.style==='Namekian'){assert.match(svg,/stroke="#21aaa5" stroke-width="7\.3076923055"/);continue;}const tag=svg.match(new RegExp('<(?:\\w+:)?g\\b[^>]*\\bid="'+id+'"[^>]*>'))?.[0];assert.ok(tag);assert.ok(tag.includes('stroke-width="'+width+'"'));
 }
 const k=cards.find(c=>c.number==='99');assert.equal(k.level,1);assert.equal(k.pur,2);assert.equal(k.powerStages.at(-1),0);assert.equal(k.powerStages[0],550000);
 assert.deepEqual([cards.find(c=>c.number==='91').width,cards.find(c=>c.number==='91').height],[1484,1060]);
});

test('100-card set and all 50 new public card routes work',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 assert.equal(catalogSets(catalog).find(s=>s.name==='World Games Saga').count,100);
 for(const card of cards){assert.equal(cardFromPath(cardPath(card),catalog),card);const page=await cardPage(new Request('https://dragonballocg.com'+cardPath(card)),assets);assert.equal(page.status,200);assert.ok((await page.text()).includes(card.image));}
 assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/world-games-saga/101'),assets)).status,404);
});

test('all new cards round-trip through portable deck codes',async()=>{
 const deck=createDeck();deck.name='World Games 051–100';deck.cards=cards.map(c=>({...snapshot(c),qty:1}));
 const decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.deepEqual(decoded.cards,deck.cards);
});
