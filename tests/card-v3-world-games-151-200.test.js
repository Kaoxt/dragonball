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
import {isHiTechPersonality,blocksHiTechAlly} from '../public/decks/eligibility.js';
const base='tools/card-corrections/v3-world-games-151-200/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),audit=read('audit.json'),source=read('cards.json');
const pending=[];
const expected=Array.from({length:50},(_,i)=>i+151).filter(n=>!pending.includes(n));
const cards=catalog.filter(c=>c.set==='World Games Saga'&&Number(c.number)>=151&&Number(c.number)<=200);
const hash=b=>createHash('sha256').update(b).digest('hex');

test('includes all 50 ready cards with no artwork gaps',()=>{
 assert.deepEqual(cards.map(c=>Number(c.number)),expected);assert.deepEqual(release.numbers,expected);
 assert.equal(audit.length,50);assert.equal(release.export_count,100);assert.equal(source.length,50);
 assert.deepEqual(release.pending.map(c=>c.number),pending);assert.equal(release.published,false);
 for(const d of source){const c=cards.find(c=>c.id===d.id);assert.equal(Boolean(c),d.publish_ready);if(c){assert.equal(c.rules,d.modern_rules);assert.equal(c.rarity,d.rarity);assert.equal(c.templateVersion,3);}else assert.ok(!codeCardIds.includes(d.id));}
});
test('preserves every earlier catalog field and permanent deck-code index',()=>{
 const ids=new Set(cards.map(c=>c.id));assert.deepEqual(beforeShenronCatalog.filter(c=>!ids.has(c.id)),read('baseline-catalog.json'));
 const old=read('baseline-code-card-ids.json');assert.deepEqual(codeCardIds.slice(0,old.length),old);
 const previous=read('previous-47-code-card-ids.json');assert.deepEqual(codeCardIds.slice(0,previous.length),previous);
 const previous49=read('previous-49-code-card-ids.json');assert.deepEqual(codeCardIds.slice(0,previous49.length),previous49);assert.deepEqual(codeCardIds.slice(previous49.length),['world-games-171-goku-the-competitor']);
 assert.deepEqual(codeCardIds.slice(previous.length),['world-games-160-gokus-blinding-strike','world-games-177-goten','world-games-171-goku-the-competitor']);assert.deepEqual(new Set(codeCardIds.slice(old.length)),new Set(cards.map(c=>c.id)));assert.equal(new Set(codeCardIds).size,codeCardIds.length);
});
test('native geometry, assets and both export sizes match their reviewed checksums',()=>{
 for(const row of audit){const c=cards.find(c=>c.id===row.id);assert.ok(c);
  for(const a of [{path:row.native_source_path,sha256:row.native_source_sha256},...row.assets])assert.equal(hash(fs.readFileSync(a.path)),a.sha256,a.path);
  assert.equal(hash(fs.readFileSync(row.artwork.source)),row.artwork.source_sha256);
  const svg=fs.readFileSync(row.native_source_path,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);assert.ok(!svg.includes('PLACEHOLDER'));
  assert.ok(row.rules.length<=5);assert.ok(row.current_preview_revision.footer_idempotent);
  for(const icon of row.native_geometry.icons)assert.ok(Math.abs(icon.center_error)<0.02);
  for(const e of row.exports){const bytes=fs.readFileSync(e.path);assert.equal(hash(bytes),e.after_sha256,e.path);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(e.lossless_round_trip);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));assert.deepEqual(e.size,[c.width*(e.field==='image'?1:2),c.height*(e.field==='image'?1:2)]);}
 }
});
test('all Personality charts run highest-to-zero on cards and zero-to-highest in Arena',()=>{
 for(const c of cards.filter(c=>c.type==='Main Personality')){
  const d=source.find(d=>d.id===c.id),row=audit.find(r=>r.id===c.id);assert.deepEqual(c.powerStages,d.stages);assert.equal(c.powerStages.at(-1),0);assert.ok(c.powerStages.every((v,i,a)=>i===0||a[i-1]>v));assert.deepEqual(powerChart(c),[...c.powerStages].reverse());
  assert.equal(personalityPower({personalities:[c],level:1,stages:0}),0);assert.equal(personalityPower({personalities:[c],level:1,stages:c.powerStages.length-1}),c.powerStages[0]);
  const svg=fs.readFileSync(row.native_source_path,'utf8');assert.deepEqual([...svg.matchAll(/<(?:\w+:)?g\b[^>]*id="power-stage-\d+"[^>]*data-stage-value="([^"]+)"/g)].map(m=>m[1]),d.stages.map(String));
 }
 assert.equal(cards.find(c=>c.number==='156').senseiDeckSize,7);
 assert.deepEqual([cards.find(c=>c.number==='157').width,cards.find(c=>c.number==='157').height],[1484,1060]);
});
test('Hi-Tech cards use full artwork and cannot enter either Ally zone',()=>{
 for(const d of source.filter(c=>c.publish_ready&&c.high_tech)){
  const c=cards.find(c=>c.id===d.id);assert.equal(c.rarity,'Hi-Tech');assert.ok(isHiTechPersonality(c));assert.ok(blocksHiTechAlly(c,'cards'));assert.ok(blocksHiTechAlly(c,'senseiDeck'));assert.ok(!blocksHiTechAlly(c,'personalities'));
  assert.match(fs.readFileSync(audit.find(r=>r.id===d.id).native_source_path,'utf8'),/data-artwork-treatment="full-bleed-high-tech"/);
 }
});
test('CRD replacements and fixed damage retain their original mechanics',()=>{
 const rule=n=>cards.find(c=>Number(c.number)===n).rules;
 for(const n of [151,152])assert.match(rule(n),/defender.*no other|defender.*not used another/);
 assert.match(rule(151),/6.*Life Deck.*3.*4/);assert.match(rule(152),/8.*Life Deck.*3.*5/);
 assert.match(rule(167),/Allies in play cannot be banished/);assert.match(rule(196),/empty when you first use/);
 for(const [n,damage] of [[154,4],[174,9],[180,9],[183,8],[192,6]]){assert.match(rule(n),new RegExp('DAMAGE: '+damage+' stages'));assert.ok(!rule(n).includes('AT +'));}
 for(const n of [168,195,196])assert.match(rule(n),/DAMAGE: 8 life cards/);
 assert.equal(rule(171),'Your first physical attack each Combat does +1 stage of damage per Setup or Drill you have in play.');
 assert.match(rule(159),/1 life card per Setup or Drill/);assert.match(rule(198),/AT \+2.*AT \+5/);
});
test('all ready routes work and pending cards remain unavailable',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 assert.equal(catalogSets(catalog).find(s=>s.name==='World Games Saga').count,200);
 for(const c of cards){assert.equal(cardFromPath(cardPath(c),catalog),c);const p=await cardPage(new Request('https://dragonballocg.com'+cardPath(c)),assets);assert.equal(p.status,200);assert.ok((await p.text()).includes(c.image));}
 for(const n of [...pending,201])assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/world-games-saga/'+n),assets)).status,404);
});
test('all cards round-trip through deck codes in their appropriate zones',async()=>{
 const deck=createDeck();deck.name='World Games 151–200';deck.cards=cards.filter(c=>!isHiTechPersonality(c)).map(c=>({...snapshot(c),qty:1}));assert.deepEqual((await decodeDeck(await encodeDeck(deck),catalog)).cards,deck.cards);
 for(const c of cards.filter(isHiTechPersonality)){const d=createDeck();d.personalities[0]=snapshot(c);assert.deepEqual((await decodeDeck(await encodeDeck(d),catalog)).personalities,d.personalities);}
});

test('the 39 cards outside approved Hi-Tech refinements remain unchanged',()=>{
 const previous49=read('previous-49-ready-audit.json');assert.equal(previous49.length,49);for(const row of previous49)assert.deepEqual(audit.find(current=>current.id===row.id),row);
 const previous=read('previous-47-ready-audit.json');assert.equal(previous.length,47);
 const revised=new Set(read('supplement-integration.json').updated_cards);
 const retained=previous.filter(row=>!revised.has(row.number));assert.equal(retained.length,39);
 for(const row of retained)assert.deepEqual(audit.find(current=>current.id===row.id),row);
});
test('approved standalone cards and Hi-Tech refinements retain their native sources',()=>{
 const update=read('supplement-integration.json');assert.deepEqual(update.new_cards,[160,177]);assert.deepEqual(update.pending,[171]);
 for(const n of [...update.new_cards,...update.updated_cards]){
  const d=source.find(c=>c.number===n),row=audit.find(c=>c.number===n);
  assert.ok(d.publish_ready);assert.equal(d.retained_native_source_path,row.native_source_path);
  assert.ok(row.artwork.supplement_render_pixel_match || row.current_preview_revision.native_export_repairs_verified);assert.equal(row.artwork.source_sha256,hash(fs.readFileSync(row.artwork.source)));
 }
 assert.equal(cards.find(c=>c.number==='177').rarity,'Hi-Tech');
 assert.equal(cards.find(c=>c.number==='160').rarity,'Ultra Rare');
 const old=read('previous-47-catalog.json');
 for(const before of old){const after=catalog.find(c=>c.id===before.id);const {image:a,downloadImage:b,...oldFields}=before;const {image:c,downloadImage:d,...newFields}=after;assert.deepEqual(newFields,oldFields);}
});
