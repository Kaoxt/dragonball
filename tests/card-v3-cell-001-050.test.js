import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-cell-001-050/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Cell 001–050 exports retain every rule line, fixed V3 geometry and correct rarity',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+1));assert.equal(checks.length,50);
 assert.equal(catalog.filter(c=>c.set==='Cell Saga'&&c.templateVersion===3).length,50);
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Cell Saga"/);
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.ok(r.rules.length<=5);assert.equal(check.visible_rules.length,r.rules.length);
  for(const line of check.visible_rules)assert.ok(line.visible_dark_pixels>50);
  assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=40?1:3);
  assert.match(svg,new RegExp('id="footer-rarity"[^>]*data-star-count="'+r.rarity_stars+'"'));
  const b=r.native_geometry.bounds;
  for(const [id,x,y]of[['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const id of ['footer-rarity','card-number'])near(b[id][1]+b[id][3]/2,1409.5);
  assert.ok(r.current_preview_revision.footer_idempotent);
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.ok(e.lossless_round_trip);
   const verified=check.exports.find(x=>x.path===e.path);assert.equal(verified.sha256,e.after_sha256);assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('Cell 001–050 preserve original effects, retained artwork and bounded repairs',()=>{
 const reviews=json(base+'artwork-review.json'),checks=json(base+'render-verification.json'),crd=json(base+'crd-review.json');
 const retained=json(base+'retained-art-verification.json');assert.equal(retained.length,50);assert.equal(reviews.length,50);assert.equal(crd.reviewed_cards,50);
 for(const r of retained){assert.equal(r.final_native_sha256,rows.find(c=>c.number===r.number).native_source_sha256);assert.ok(r.original_image_bytes_unchanged);assert.ok(r.original_mapping_unchanged);}
 for(const r of reviews){
  assert.ok(r.source_reviewed&&r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>50);assert.ok(r.unresolved);
  for(const e of r.exports)assert.equal(hash(e.path),e.sha256);
 }
 for(const n of [1,47]){const p=checks.find(r=>r.number===n).localized_patch;assert.ok(p.pixels_changed>0);assert.equal(p.pixels_changed_outside_mask,0);assert.equal(p.display_pixels_changed_outside_mask,0);}
 const rule=n=>data.find(c=>c.number===n).modern_rules;
 for(const n of[11,22])assert.match(rule(n),/^\(Limit 8 per deck\.\) Namekian Heritage only\./);
 assert.equal(data.find(c=>c.number===17).name,'Blue Backflip');assert.match(rule(18),/AT stages \+3 life cards/);
 assert.match(rule(24),/HIT: Raise your anger 1 level/);assert.match(rule(43),/HIT: Gain 2 stages/);
 assert.match(rule(30),/2 life cards and 2 stages/);assert.match(rule(40),/You may shuffle a Dragon Ball in play into its owner's Life Deck/);
 assert.match(rule(49),/bottom 2 cards of your discard pile on the bottom of your Life Deck/);
 for(const n of [39,40]){
  const r=rows.find(c=>c.number===n),svg=read(r.native_source_path);assert.ok(r.artwork.approved_artwork_exception);assert.deepEqual(r.artwork.mapping_matrix,[1,0,0,1,0,0]);
  assert.match(svg,new RegExp('id="dragon-ball-left-emblem"[^>]*data-star-count="'+(n-38)+'"'));assert.doesNotMatch(svg,/id="seven-dragon-ball-cluster-vector"/);
 }
 for(const d of data)assert.equal(crd.cards.find(c=>c.number===d.number).modern_rules,d.modern_rules);
});
