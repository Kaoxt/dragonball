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
const base='tools/card-corrections/v3-trunks-006-055/';
const read=p=>readHistoricalCardFile(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>historicalCardHash(path.join(root,p));
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Trunks 6–55 use reviewed game data and retained artwork with current V3 text, footer and exports',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+6));assert.equal(checks.length,50);
 assert.deepEqual(catalog.filter(c=>c.set==='Trunks Saga'&&c.templateVersion===3&&Number(c.number)>=6&&Number(c.number)<=55).map(c=>Number(c.number)),Array.from({length:50},(_,i)=>i+6));
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,beforeCategoryNative(r));
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Trunks Saga"/);
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

test('Trunks reviews preserve the approved Porunga exception and original-based scene checks',()=>{
 const reviews=json(base+'artwork-review.json');assert.equal(reviews.length,50);
 for(const r of reviews){
  assert.ok(r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>40);
  for(const e of r.exports)assert.equal(beforeCategoryExport(rows.find(x=>x.id===r.id),e),e.sha256);
 }
 const r=rows.find(r=>r.number===25),svg=read(r.native_source_path);
 assert.equal(r.artwork.approved_artwork_exception,true);assert.equal(r.artwork.background_gain,1);
 assert.match(svg,/id="porunga-full-art"/);assert.doesNotMatch(svg,/id="retained-shenron-full-art"/);
 assert.match(svg,/id="dragon-ball-left-emblem"[^>]*data-star-count="1"/);
 assert.match(svg,/id="footer-rarity"[^>]*data-star-count="1"/);
 const preserved=json(base+'artwork-preservation.json');assert.equal(preserved.porunga_changed_artwork_pixels,0);assert.ok(preserved.porunga_checked_artwork_pixels>2000000);
 const patch=json(base+'render-verification.json').find(r=>r.number===52).localized_patch;
 assert.equal(patch.pixels_changed_outside_mask,0);assert.equal(patch.display_pixels_changed_outside_mask,0);assert.ok(patch.pixels_changed>0);
 assert.match(data.find(c=>c.number===25).modern_rules,/top 2 cards/);
 const preservedSources=json(base+'retained-art-baseline-check.json').filter(r=>r.number!==25);
 assert.equal(preservedSources.length,49);assert.ok(preservedSources.every(r=>r.changed_pixels===0));
 for(const d of data){
  const svg=read(rows.find(r=>r.number===d.number).native_source_path);
  assert.match(svg,new RegExp('id="footer-rarity"[^>]*data-star-count="'+d.rarity_stars+'"'));
  if(d.style==='Namekian'){assert.match(svg,/id="tokui-waza-symbol" data-style="Namekian"/);assert.match(svg,/#21aaa5/);assert.match(svg,/id="namekian-background-hue"/);}
 }
 assert.deepEqual(catalog.filter(c=>c.set==='Trunks Saga'&&c.templateVersion===3&&Number(c.number)<=55).map(c=>Number(c.number)),Array.from({length:55},(_,i)=>i+1));
 assert.match(read('tools/card-templates/v3/references/mastery-v3.md'),/10948151b2cb82fa190ec88cdf52e8ab8db469acf4c3c7baaf13096f1a17a78c/);
});
