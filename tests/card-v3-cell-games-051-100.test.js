import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {createDeck} from '../public/decks/store.js';
const base='tools/card-corrections/v3-cell-games-051-100/';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,a+' differs from '+b);
const data=json(base+'cards.json'),rows=json(base+'audit.json'),checks=json(base+'render-verification.json');
const held=[70,72,73,81,83];
const released=Array.from({length:50},(_,i)=>i+51).filter(n=>!held.includes(n));

test('Cell Games second batch publishes only reviewed artwork and preserves complete source records',()=>{
 assert.deepEqual(data.map(c=>c.number),Array.from({length:50},(_,i)=>i+51));
 assert.deepEqual(rows.map(c=>c.number),released);
 assert.deepEqual(checks.map(c=>c.number),released);
 const live=catalog.filter(c=>c.set==='Cell Games Saga'&&Number(c.number)>50);
 assert.deepEqual(live.map(c=>Number(c.number)),released);
 for(const n of held)assert.equal(data.find(c=>c.number===n).release_status,'awaiting artwork');
 const artwork=json(base+'artwork-review.json');assert.deepEqual(artwork.map(c=>c.number),released);
 for(const r of artwork){
  assert.ok(r.full_size_export_individually_viewed);assert.ok(r.source_and_generated_artwork_individually_viewed);
  assert.equal(hash(r.artwork_source),r.artwork_sha256);assert.equal(hash(r.printed_reference),r.printed_reference_sha256);
  for(const e of r.exports)assert.equal(hash(e.path),e.sha256);
 }
 const crd=json(base+'crd-review.json');assert.equal(crd.reviewed_cards,50);assert.equal(hash(crd.crd_path),crd.crd_sha256);
 for(const c of data)assert.equal(crd.cards.find(r=>r.number===c.number).modern_rules,c.modern_rules);
});

test('Cell Games native source, readable exports and catalog agree',()=>{
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  const land=r.family==='LOCATION',cx=land?741.5:529.5,fy=land?985.5:1409.5;
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=fs.readFileSync(r.native_source_path,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.ok(check.visible_category_pixels>500);assert.ok(r.rules.length<=(land?3:5));
  for(const line of check.visible_rules)assert.ok(line.visible_dark_pixels>50);
  assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=92?3:5);
  assert.equal(c.rarity,r.number<=92?'Uncommon':'Rare');
  const b=r.native_geometry.bounds;
  for(const [id,x,y]of[['card-title',cx,79],['card-category',cx,land?685.166666667:908.5],['footer-text-block',cx,fy],['saga-emblem',land?296.55:211.75,fy]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,land?1186.45:847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const id of ['footer-rarity','card-number'])near(b[id][1]+b[id][3]/2,fy);
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?(land?[1484,1060]:[1060,1484]):(land?[2968,2120]:[2120,2968]));
   assert.ok(e.lossless_round_trip);assert.ok(check.exports.find(x=>x.path===e.path).decoded_pixels_match_render);
  }
 }
});

test('Cell Games rules retain restrictions, bonus damage, conditional scope and card types',()=>{
 const c=n=>data.find(c=>c.number===n),rule=n=>c(n).modern_rules;
 assert.match(rule(58),/^\(Limit 1 per deck\.\)/);
 assert.match(rule(61),/^\(Limit 8 per deck\.\)/);assert.match(rule(61),/4 life cards and 2 stages/);assert.doesNotMatch(rule(61),/\bAT\b/);
 assert.match(rule(67),/^\(Limit 8 per deck\.\)/);
 assert.ok(rule(63).indexOf('Lower your')<rule(63).indexOf('HIT:'));
 assert.doesNotMatch(rule(65),/Banish after use/);
 assert.equal(c(81).name,'Red Energy Gathering Drill');
 assert.match(rule(94),/Cell Jr\. 1 or Cell Jr\. 2/);assert.match(rule(94),/overlay an Ally above/);
 assert.match(rule(97),/Setup or Drill/);
 assert.match(rule(99),/^\(Limit 1 per deck\.\)/);assert.match(rule(99),/For this game: no MPPV/);assert.match(rule(99),/5\+ anger/);
 for(const n of [94,98]){
  const card=catalog.find(r=>r.id===c(n).id);assert.equal(card.type,'Main Personality');assert.equal(card.level,1);assert.equal(card.pur,2);assert.equal(card.alignment,'Villain');
  assert.deepEqual(card.powerStages,[3000000,2900000,2800000,2700000,2600000,2500000,2400000,2300000,2200000,2100000,0]);
 }
 for(const n of [79,100])assert.equal(c(n).category,'LOCATION');
});

test('All released Cell Games second-batch ids survive deck-code round trips',async()=>{
 const deck=createDeck();deck.name='Cell Games 51–100';deck.cards=catalog.filter(c=>rows.some(r=>r.id===c.id)).map(c=>({...c,qty:1}));
 const decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.deepEqual(decoded.cards.map(c=>c.id),deck.cards.map(c=>c.id));
});
