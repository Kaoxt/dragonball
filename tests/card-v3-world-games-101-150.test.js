import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {catalog as beforeShenronCatalog} from './helpers/world-games-shenron-history.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {cardPath,cardFromPath,catalogSets} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart,personalityPower} from '../public/personality-power.js';
const base='tools/card-corrections/v3-world-games-101-150/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),audit=read('audit.json'),source=read('cards.json');
const pending=[];
const expected=Array.from({length:50},(_,i)=>i+101).filter(n=>!pending.includes(n));
const cards=catalog.filter(c=>c.set==='World Games Saga'&&Number(c.number)>=101&&Number(c.number)<=150);
const hash=b=>createHash('sha256').update(b).digest('hex');

test('publishes all 50 finished cards with no pending artwork',()=>{
 assert.deepEqual(cards.map(c=>Number(c.number)),expected);
 assert.deepEqual(release.numbers,expected);assert.equal(audit.length,50);assert.equal(release.export_count,100);
 assert.equal(source.length,50);assert.deepEqual(release.pending.map(c=>c.number),pending);
 for(const d of source){const c=cards.find(c=>c.id===d.id);assert.equal(Boolean(c),d.publish_ready);
  if(c){assert.equal(c.rules,d.modern_rules);assert.equal(c.style,d.style);assert.equal(c.rarity,d.rarity);assert.equal(c.templateVersion,3);}
 }
});

test('earlier catalog records and all permanent deck-code positions are unchanged',()=>{
 const prior=beforeShenronCatalog.filter(c=>!(c.set==='World Games Saga'&&Number(c.number)>=101));
 assert.equal(hash(Buffer.from('export const catalog = '+JSON.stringify(prior,null,2)+';\n')),release.baseline_catalog_sha256);
 assert.deepEqual(prior.map(c=>c.id),read('baseline-card-ids.json'));
 const ids=read('baseline-code-card-ids.json');assert.deepEqual(codeCardIds.slice(0,ids.length),ids);
 const previous=read('previous-handoff-code-card-ids.json');assert.deepEqual(codeCardIds.slice(0,previous.length),previous);assert.deepEqual(codeCardIds.slice(previous.length),[cards.find(c=>c.number==='131').id]);assert.equal(new Set(codeCardIds).size,codeCardIds.length);
});

test('native sources, retained assets and 100 WebP exports match the reviewed hashes',()=>{
 for(const row of audit){const c=cards.find(c=>c.id===row.id);assert.ok(c);
  for(const a of [{path:row.native_source_path,sha256:row.native_source_sha256},...row.assets])assert.equal(hash(fs.readFileSync(a.path)),a.sha256,a.path);
  assert.equal(hash(fs.readFileSync(row.artwork.source)),row.artwork.source_sha256);
  const svg=fs.readFileSync(row.native_source_path,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);assert.ok(!svg.includes('PLACEHOLDER'));
  assert.ok(row.rules.length<=5);assert.ok(row.current_preview_revision.footer_idempotent);
  for(const icon of row.native_geometry.icons)assert.ok(Math.abs(icon.center_error)<0.02);
  for(const e of row.exports){const bytes=fs.readFileSync(e.path);assert.equal(hash(bytes),e.after_sha256,e.path);
   assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(e.lossless_round_trip);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,[c.width*(e.field==='image'?1:2),c.height*(e.field==='image'?1:2)]);
  }
 }
});

test('personality stages descend to zero on cards and index upward correctly in Arena',()=>{
 for(const c of cards.filter(c=>c.type==='Main Personality')){
  const d=source.find(d=>d.id===c.id),row=audit.find(r=>r.id===c.id);assert.deepEqual(c.powerStages,d.stages);
  assert.equal(c.powerStages.at(-1),0);assert.deepEqual(powerChart(c),[...c.powerStages].reverse());
  assert.equal(personalityPower({personalities:[c],level:1,stages:0}),0);
  assert.equal(personalityPower({personalities:[c],level:1,stages:c.powerStages.length-1}),c.powerStages[0]);
  const svg=fs.readFileSync(row.native_source_path,'utf8');
  const stageRows=[...svg.matchAll(/<(?:\w+:)?g\b[^>]*id="power-stage-\d+"[^>]*data-stage-value="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(stageRows,d.stages.map(String));
  if(c.number!=='132')assert.ok(c.powerStages.every((v,i,a)=>i===0||a[i-1]>v));
 }
 assert.deepEqual(cards.find(c=>c.number==='132').powerStages,[...Array(10).fill('Z'),0]);
 assert.equal(cards.find(c=>c.number==='130').powerStages[9],3250000);
 for(const [n,size] of [['125',10],['140',13],['149',5]])assert.equal(cards.find(c=>c.number===n).senseiDeckSize,size);
 const location=cards.find(c=>c.number==='121');assert.equal(location.type,'Location');assert.deepEqual([location.width,location.height],[1484,1060]);
});

test('CRD changes and fixed physical damage remain explicit',()=>{
 const rule=n=>cards.find(c=>Number(c.number)===n).rules;
 for(const [n,damage] of [[122,4],[124,3],[137,5]]){assert.ok(rule(n).includes('DAMAGE: '+damage+' stages.'));assert.ok(!rule(n).includes('AT +'));}
 assert.match(rule(148),/When entering Combat.*first attack.*this Combat/);
 assert.match(rule(150),/4.*Life Deck.*2.*3/s);
 assert.match(rule(127),/Events/);assert.match(rule(119),/Setup or Drill/);
});

test('all new public card routes work and the next unavailable card stays out',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 assert.equal(catalogSets(catalog).find(s=>s.name==='World Games Saga').count,150);
 for(const card of cards){assert.equal(cardFromPath(cardPath(card),catalog),card);const page=await cardPage(new Request('https://dragonballocg.com'+cardPath(card)),assets);assert.equal(page.status,200);assert.ok((await page.text()).includes(card.image));}
 for(const n of [...pending,151])assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/world-games-saga/'+n),assets)).status,404);
});

test('all 50 new cards round-trip through portable deck codes',async()=>{
 const deck=createDeck();deck.name='World Games 101–150';deck.cards=cards.map(c=>({...snapshot(c),qty:1}));
 assert.deepEqual((await decodeDeck(await encodeDeck(deck),catalog)).cards,deck.cards);
});
