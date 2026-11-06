import {historicalCardHash, historicalCardSize, historicalCardGitHash, readHistoricalCardFile} from './helpers/title-width-history.js';
import {beforeCategoryNative, beforeCategoryExport} from './helpers/card-category-revision.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from './helpers/title-width-history.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-frieza-101-125-promos/';
const read=p=>readHistoricalCardFile(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>historicalCardHash(path.join(root,p));
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Frieza 101–125 and P1–P11 preserve reviewed rules and use verified V3 sources and exports',()=>{
 const checks=json(base+'render-verification.json');
 assert.equal(rows.length,36);assert.equal(checks.length,36);
 assert.deepEqual(rows.map(r=>String(r.number)).sort(),[...Array.from({length:25},(_,i)=>String(i+101)),...Array.from({length:11},(_,i)=>'P'+(i+1))].sort());
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.templateVersion,3);assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,beforeCategoryNative(r));
  assert.doesNotMatch(read(r.native_source_path),/<(?:\w+:)?text[\s>]/);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);assert.ok(check.title_helper_idempotent);
  assert.ok(r.rules.length<=5);assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);
  for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.ok(r.assets.some(a=>a.sha256===r.artwork.source_sha256));assert.equal(r.artwork.additional_zoom,false);
  const b=r.native_geometry.bounds;
  for(const [id,x,y] of [['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const id of ['footer-rarity','card-number'])near(b[id][1]+b[id][3]/2,1409.5);
  assert.ok(r.current_preview_revision.footer_idempotent);
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.ok(e.lossless_round_trip);
   const verified=check.exports.find(x=>x.path===e.path);assert.equal(verified.sha256,beforeCategoryExport(r,e));assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('new Personalities retain original game values, rarity and red Villain corners',()=>{
 const personalities=rows.filter(r=>r.personality_values);assert.equal(personalities.length,4);
 assert.equal(personalities.filter(r=>r.family==='VILLAIN PERSONALITY').length,1);
 for(const r of personalities){
  const d=data.find(c=>c.id===r.id),svg=read(r.native_source_path);
  assert.deepEqual(r.personality_values,{level:d.level,pur:d.pur,stages:d.stages});
  assert.match(svg,new RegExp(`id="v3-level-number"[^>]*aria-label="${d.level}"`));
  assert.match(svg,new RegExp(`id="concept-pur-number"[^>]*aria-label="${d.pur}"`));
  for(const [i,n] of [...d.stages].reverse().entries())assert.match(svg,new RegExp(`id="power-stage-value-${i}"[^>]*aria-label="${n.toLocaleString('en-US')}"`));
  assert.match(svg,new RegExp(`data-star-count="${d.rarity_stars}"`));
  if(r.family==='VILLAIN PERSONALITY'){
   const panel=svg.slice(svg.indexOf('id="shared-rules-component"'),svg.indexOf('id="shared-rules-outer-rail"'));
   assert.equal((panel.match(/fill="#8e1722"/g)||[]).length,4);assert.equal((panel.match(/stroke="#4c1119"/g)||[]).length,2);assert.doesNotMatch(panel,/#0a4a96|#092b50/);
  }
 }
 const rules=n=>data.find(c=>c.number===n).modern_rules;
 assert.match(rules(111),/floating effect.*Attack Phases/);assert.match(rules(113),/all Earth Dragon Balls/);
 assert.match(rules(119),/Use as a defense/);assert.match(rules(122),/Setup or Drill/);
});

test('all 36 final cards have original-based visual reviews and localized corrections are bounded',()=>{
 const reviews=json(base+'artwork-review.json'),checks=json(base+'render-verification.json');assert.equal(reviews.length,36);
 for(const r of reviews){
  assert.ok(r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>40);
  for(const e of r.exports)assert.equal(beforeCategoryExport(rows.find(x=>x.id===r.id),e),e.sha256);
 }
 for(const n of ['P11']){
  const p=checks.find(c=>c.number===n).localized_patch;assert.ok(p.pixels_changed>0&&p.original_raster_bytes_retained);
  assert.equal(p.pixels_changed_outside_mask,0);assert.equal(p.display_pixels_changed_outside_mask,0);
 }
 const goku=rows.find(r=>r.number===125);assert.equal(goku.artwork.approved_artwork_exception,true);
 assert.equal(goku.artwork.source_sha256,'7bccbcf69bd4ba7b7746dd2d612ec02b7c614e7d087a3aba35080997279127d6');
 assert.equal(goku.artwork.published_artwork_overlay_sha256,'a2d65da2c8157913e85129ae26be9aad4fb026caefc9a564511b12b73a513b4c');
 assert.ok(goku.assets.some(a=>a.sha256===goku.artwork.published_artwork_overlay_sha256));
 assert.ok(!goku.assets.some(a=>a.sha256==='d82f1c13c9dd87adcd2fd3ae898cfa51f87e4edb798c51cb46a0b8dae7b9d1f7'));
 assert.ok(reviews.some(r=>r.verdict.includes('unresolved')||r.observations.includes('unresolved')));
});

test('the complete 136-card Frieza Saga uses V3',()=>{
 const cards=catalog.filter(c=>c.set==='Frieza Saga');assert.equal(cards.length,136);assert.ok(cards.every(c=>c.templateVersion===3));
 assert.deepEqual(cards.map(c=>c.number).sort(),[...Array.from({length:125},(_,i)=>String(i+1)),...Array.from({length:11},(_,i)=>'P'+(i+1))].sort());
});
