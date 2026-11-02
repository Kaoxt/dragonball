import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-android-001-050/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Android 1–50 use verified V3 sources and lossless exports in their original orientation',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+1));assert.equal(checks.length,50);
 assert.deepEqual(catalog.filter(c=>c.set==='Android Saga'&&c.templateVersion===3).map(c=>Number(c.number)),Array.from({length:50},(_,i)=>i+1));
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  const land=[7,8,43,44].includes(r.number),cx=land?741.5:529.5,cy=land?985.5:1409.5;
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Android Saga"/);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.ok(r.rules.length<=(land?2:5));assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);
  for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=36?1:3);
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

test('Android original/CRD reviews retain mechanics, artwork corrections and scan limitations',()=>{
 const reviews=json(base+'artwork-review.json'),checks=json(base+'render-verification.json');assert.equal(reviews.length,50);
 for(const r of reviews){
  assert.ok(r.source_reviewed&&r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>50);assert.ok(r.unresolved);
  for(const e of r.exports)assert.equal(hash(e.path),e.sha256);
 }
 for(const n of[20,34,37,39]){
  const p=checks.find(r=>r.number===n).localized_patch;assert.ok(p.pixels_changed>0);assert.equal(p.pixels_changed_outside_mask,0);assert.equal(p.display_pixels_changed_outside_mask,0);
 }
 assert.equal(rows.find(r=>r.number===38).artwork.android_38_approved_correction_retained,true);
 const rule=n=>data.find(c=>c.number===n).modern_rules;
 assert.match(rule(6),/4 life cards and 3 stages, or 4 life cards and 5 stages/);
 assert.match(rule(24),/For this Combat/);assert.match(rule(44),/including Dende Dragon Balls/);
 assert.equal(data.find(c=>c.number===17).category,'PHYSICAL COMBAT');assert.match(rule(17),/Stops an energy attack/);
 assert.match(rule(26),/costing 2 stages\. DAMAGE: 6 life cards/);assert.equal(data.find(c=>c.number===25).power_icon,null);
 assert.match(rule(37),/skip their next Attack Phase/);
 for(const n of[21,22,23,24])assert.match(rule(n),/^\(Limit 8 per deck\.\)/);
 const crd=json(base+'crd-review.json');assert.equal(Object.keys(crd.card_specific_entries).length,2);
});
