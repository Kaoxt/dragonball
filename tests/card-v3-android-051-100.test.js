import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-android-051-100/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Android 51–100 use verified V3 sources and lossless exports in their original orientation',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+51));assert.equal(checks.length,50);
 assert.deepEqual(catalog.filter(c=>c.set==='Android Saga'&&c.templateVersion===3&&Number(c.number)>=51&&Number(c.number)<=100).map(c=>Number(c.number)),Array.from({length:50},(_,i)=>i+51));
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  const land=[92,93,94,95,96].includes(r.number),cx=land?741.5:529.5,cy=land?985.5:1409.5;
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Android Saga"/);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.ok(r.rules.length<=(land?2:5));assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);
  for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=88?3:5);
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

test('Android 51–100 preserve CRD mechanics and approved artwork with isolated repairs',()=>{
 const reviews=json(base+'artwork-review.json'),checks=json(base+'render-verification.json');assert.equal(reviews.length,50);
 for(const r of reviews){
  assert.ok(r.source_reviewed&&r.display_reviewed&&r.download_reviewed);
  assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>50);assert.ok(r.unresolved);
  for(const e of r.exports)assert.equal(hash(e.path),e.sha256);
 }
 for(const n of[65,76]){
  const p=checks.find(r=>r.number===n).localized_patch;assert.ok(p.pixels_changed>0);
  assert.equal(p.pixels_changed_outside_mask,0);assert.equal(p.display_pixels_changed_outside_mask,0);
 }
 assert.equal(rows.find(r=>r.number===76).artwork.android_76_approved_replacement_retained,true);
 const provenance=json(base+'source-provenance.json').approved_android_76;
 assert.equal(hash(base+provenance.extracted_path),provenance.extracted_sha256);
 const rule=n=>data.find(c=>c.number===n).modern_rules;
 assert.match(rule(55),/from their hand during their turn/);assert.match(rule(55),/other card effects do not count/);
 assert.match(rule(56),/AT \+1 stages/);assert.match(rule(57),/HIT: After damage, if any, end Combat/);
 assert.match(rule(62),/After taking damage/);assert.match(rule(62),/During your Attack Phase/);
 assert.match(rule(67),/becomes successful/);assert.match(rule(67),/during HIT effects/);
 assert.match(rule(73),/During Combat/);assert.match(rule(73),/pay costs, use powers/);
 assert.match(rule(74),/non-Red Style/);assert.match(rule(93),/only once per turn/);
 assert.match(rule(100),/^\(Limit 1 per deck/);assert.doesNotMatch(rule(100),/Banish after use/);
 for(const n of[72,99])assert.match(rule(n),/^\(Limit 1 per deck/);
 for(const n of[77,80])assert.match(rule(n),/^Stops /);
 assert.doesNotMatch(rule(91),/Limit 1/);
 const crd=json(base+'crd-review.json');assert.equal(Object.keys(crd.card_specific_entries).length,9);
 assert.match(crd.shared_deck_limit['90'],/Android 18/);
});
