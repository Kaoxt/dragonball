import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-android-101-125-promos/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Android 101–125 and all promos use verified V3 sources and lossless exports in their original orientation',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),[...Array.from({length:25},(_,i)=>i+101),...Array.from({length:11},(_,i)=>'P'+(i+1))]);assert.equal(checks.length,36);
 assert.equal(catalog.filter(c=>c.set==='Android Saga'&&c.templateVersion===3).length,136);
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  const land=r.number==='P10',cx=land?741.5:529.5,cy=land?985.5:1409.5;
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Android Saga"/);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.ok(r.rules.length<=(land?2:5));assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);
  for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,typeof r.number==='string'?2:r.number<=123?5:6);
  assert.match(svg,new RegExp('id="footer-rarity"[^>]*data-star-count="'+r.rarity_stars+'"'));
  const b=r.native_geometry.bounds;
  for(const [id,x,y]of[['card-title',cx,79],['card-category',cx,land?685.166666667:908.5],['footer-text-block',cx,cy],['saga-emblem',land?296.55:211.75,cy]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,land?1186.45:847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const id of ['footer-rarity','card-number'])near(b[id][1]+b[id][3]/2,cy);
  assert.ok(r.current_preview_revision.footer_idempotent);
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?(land?[1484,1060]:[1060,1484]):(land?[2968,2120]:[2120,2968]));assert.ok(e.lossless_round_trip);
   const verified=check.exports.find(x=>x.path===e.path);assert.equal(verified.sha256,e.after_sha256);assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('Android completion preserves original values, CRD mechanics and isolated artwork repairs',()=>{
 const reviews=json(base+'artwork-review.json'),checks=json(base+'render-verification.json'),crd=json(base+'crd-review.json');
 const retained=json(base+'retained-art-verification.json');assert.equal(retained.length,36);
 for(const r of retained){
  assert.equal(r.final_native_sha256,rows.find(c=>c.number===r.number).native_source_sha256);
  assert.ok(r.retained_elements['card-illustration'].unchanged);
 }
 for(const id of ['mouth-expression-correction','mouth-correction-clip'])assert.ok(retained.find(c=>c.number===118).retained_elements[id].unchanged);
 assert.equal(reviews.length,36);assert.equal(crd.reviewed_cards,36);
 for(const r of reviews){
  assert.ok(r.source_reviewed&&r.display_reviewed&&r.download_reviewed);
  assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>50);assert.ok(r.unresolved);
  for(const e of r.exports)assert.equal(hash(e.path),e.sha256);
 }
 for(const n of [102,106,111,114,115]){
  const p=checks.find(r=>r.number===n).localized_patch;
  assert.ok(p.pixels_changed>0);assert.equal(p.pixels_changed_outside_mask,0);assert.equal(p.display_pixels_changed_outside_mask,0);
 }
 const mouth=rows.find(r=>r.number===118);assert.ok(mouth.artwork.approved_118_mouth_patch_retained);
 assert.match(read(mouth.native_source_path),/id="mouth-expression-correction"/);
 const rule=n=>data.find(c=>c.number===n).modern_rules;
 assert.match(rule(101),/^During Combat/);assert.match(rule(103),/those Allies/);
 assert.match(rule(107),/first card in Combat/);assert.doesNotMatch(rule(112),/Banish after use/);
 assert.match(rule(118),/Lower Android 20 by 5 stages/);assert.match(rule(118),/at 5 stages above 0/);
 assert.match(rule(119),/^POWER: Choose an opponent's personality/);assert.match(rule(119),/current level/);
 assert.match(rule('P2'),/on top of your Life Deck/);assert.match(rule('P2'),/Banish after use/);
 assert.match(rule('P4'),/^\(Limit 1 per deck\.\)/);assert.doesNotMatch(rule('P11'),/Banish after use/);
 for(const d of data)assert.equal(crd.cards.find(c=>c.number===d.number).modern_rules,d.modern_rules);
 const personalities=data.filter(c=>c.category.includes('PERSONALITY'));assert.equal(personalities.length,10);
 for(const d of personalities){
  const r=rows.find(c=>c.number===d.number),svg=read(r.native_source_path),b=r.native_geometry.bounds;
  const label=d.category.startsWith('HERO')?'HERO':'VILLAIN';
  assert.match(svg,new RegExp('id="card-category"[^>]*aria-label="'+label+'"'));
  if(label==='HERO'){assert.match(svg,/#258bc9/);assert.match(svg,/#15639d/);}else assert.match(svg,/#a61122/);
  for(const [id,value]of[['v3-level-number',d.level],['concept-pur-number',d.pur]])assert.match(svg,new RegExp('id="'+id+'"[^>]*aria-label="'+value+'"'));
  assert.ok(b['card-title'][2]<=640.01);assert.ok(b['card-title'][0]-b['v3-level-number'][0]-b['v3-level-number'][2]>=40);
  assert.equal(d.stages.length,11);
  [...d.stages].reverse().forEach((value,i)=>{
   const id='power-stage-value-'+i;
   assert.match(svg,new RegExp('id="'+id+'"[^>]*aria-label="'+value.toLocaleString('en-US')+'"'));
   near(b[id][0]+b[id][2],1031);
  });
 }
 assert.deepEqual(data.find(c=>c.number===115).stages,[1500000,1425000,1350000,1275000,1200000,1000000,899000,699000,399000,299000,0]);
 for(const n of[120,122,123])assert.equal(data.find(c=>c.number===n).level,4);
});
