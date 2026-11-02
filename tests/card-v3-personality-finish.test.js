import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const folder='tools/card-corrections/v3-personality-finish/';

test('all V3 Personality titles retain room around LEVEL and the brush ends',()=>{
 const previous=json('tools/card-corrections/v3-personality-short-labels/pixel-checks.json');
 assert.equal(previous.length,134);
 for(const c of previous){
  const row=json(c.audit_path).find(r=>r.id===c.id);
  const [x,y,w,h]=row.native_geometry.bounds['card-title'];
  assert.ok(x>=209.49&&x+w<=849.51,c.id);
  assert.ok(Math.abs(x+w/2-529.5)<.01&&Math.abs(y+h/2-79)<.01,c.id);
  const svg=fs.readFileSync(row.native_source_path,'utf8');
  if(c.label==='VILLAIN')assert.match(svg,/id="shared-category-material"[^]*?<[^>]*rect[^>]*fill="#a61122"/);
 }
});

test('the dark paint and title repair preserve every unrelated pixel and historical audit',()=>{
 const release=json(folder+'release.json'),checks=json(folder+'pixel-checks.json');
 assert.equal(release.cards,66);assert.equal(release.villains,61);assert.equal(release.titles,15);
 assert.equal(checks.length,66);assert.equal(release.exports,132);
 assert.equal(release.pixels_changed_outside_edited_native_ink,0);
 for(const check of checks){
  const row=json(check.audit_path).find(r=>r.id===check.id),card=catalog.find(c=>c.id===check.id);
  assert.deepEqual(row.personality_finish_revision,check);
  assert.equal(check.before_native_sha256,row.category_label_revision.after_native_sha256);
  assert.equal(hash(check.native_source_path),check.after_native_sha256);
  assert.equal(row.native_source_sha256,check.after_native_sha256);
  assert.ok(check.unrelated_native_elements_unchanged&&check.category_paths_unchanged&&check.helper_idempotent);
  if(check.title_changed){
   assert.ok(check.title_bounds_before[2]>640.01);
   assert.ok(check.title_bounds_after[2]<=640.01);
   const [bx,,bw]=row.native_geometry.bounds['v3-level-number'];
   assert.ok(check.title_bounds_after[0]-bx-bw>=40);
   assert.equal(check.title_fit.visible_center[1],79);
  }else assert.deepEqual(check.title_bounds_after,check.title_bounds_before);
  for(const e of check.exports){
   assert.equal(e.before_sha256,row.category_label_revision.exports.find(x=>x.path===e.path).after_sha256);
   assert.equal(hash(e.path),e.after_sha256);
   assert.equal(row.exports.find(x=>x.path===e.path).after_sha256,e.after_sha256);
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.ok(e.lossless_round_trip&&e.changed_pixels>0);
   assert.equal(e.pixels_changed_outside_edited_native_ink,0);
   assert.ok(e.regions.every(r=>r.old_render_max_channel_difference<=4));
  }
 }
});
