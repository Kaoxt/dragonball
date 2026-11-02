import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';

const base='tools/card-corrections/v3-trunks-p6-p10/';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rows=json(base+'audit.json'),data=json(base+'cards.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} differs from ${b}`);

test('Trunks is complete: all 200 numbered cards and P1–P10 use V3',()=>{
 const cards=catalog.filter(c=>c.set==='Trunks Saga');
 assert.equal(cards.length,210);assert.ok(cards.every(c=>c.templateVersion===3));
 assert.deepEqual(new Set(cards.map(c=>c.number)),new Set([...Array.from({length:200},(_,i)=>String(i+1)),...Array.from({length:10},(_,i)=>`P${i+1}`)]));
 assert.deepEqual(rows.map(r=>r.number),[206,207,208,209,210]);
 const checks=json(base+'render-verification.json');assert.equal(checks.length,5);
 for(const r of rows){
  const c=cards.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));assert.equal(d.rarity_stars,2);
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=fs.readFileSync(r.native_source_path,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);
  assert.match(svg,/data-set="Trunks Saga"/);assert.match(svg,/id="footer-rarity"[^>]*data-star-count="2"/);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);assert.ok(check.title_helper_idempotent);
  assert.ok(r.rules.length<=5);assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);
  for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);
  const b=r.native_geometry.bounds;
  for(const [id,x,y]of [['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((ball[0]+num[0]+num[2])/2,847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const ex of r.exports){
   assert.equal(hash(ex.path),ex.after_sha256);assert.equal(c[ex.field],ex.path.replace(/^public/,'')+'?v='+ex.after_sha256.slice(0,12));
   assert.deepEqual(ex.size,ex.field==='image'?[1060,1484]:[2120,2968]);assert.ok(ex.lossless_round_trip);
   const verified=check.exports.find(v=>v.path===ex.path);assert.equal(verified.sha256,ex.after_sha256);assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('Final promos retain original wording, CRD scope and reviewed illustration repairs',()=>{
 const reviews=json(base+'artwork-review.json'),wording=json(base+'rules-review.json');assert.equal(reviews.length,5);assert.equal(wording.length,5);
 for(const r of reviews){
  assert.ok(r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);
  assert.ok(r.observations.length>40);
  for(const e of r.exports)assert.equal(hash(e.path),e.sha256);
 }
 const showdown=wording.find(c=>c.number===210);assert.match(showdown.applicable_errata,/cannot take control of Combat/);assert.match(showdown.corrected_effect,/costs, powers and redirected damage/);
 assert.equal(data.find(c=>c.number===208).power_icon,'attack');assert.equal(data.find(c=>c.number===209).power_icon,null);
 assert.ok(data.filter(c=>c.category==='SETUP').every(c=>c.power_icon===null));
 const repairs=json(base+'artwork-repair-verification.json');assert.deepEqual(repairs.map(r=>r.number),[206,208,209,210]);
 for(const r of repairs)for(const e of r.exports)assert.equal(e.pixels_changed_outside_native_mask_and_antialias_footprint,0);
});
