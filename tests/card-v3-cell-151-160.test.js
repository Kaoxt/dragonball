import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-cell-151-160/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Cell 151–160 exports retain every rule line, fixed V3 geometry and correct rarity',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:10},(_,i)=>i+151));assert.equal(checks.length,10);
 assert.equal(catalog.filter(c=>c.set==='Cell Saga'&&c.templateVersion===3&&Number(c.number)>=151&&Number(c.number)<=160).length,10);
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
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=156?5:6);
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

test('Cell Saga is complete and the final ten retain original rules, values and artwork',()=>{
 const all=catalog.filter(c=>c.set==='Cell Saga');assert.equal(all.length,160);assert.ok(all.every(c=>c.templateVersion===3));
 const retained=json(base+'retained-art-verification.json'),reviews=json(base+'artwork-review.json'),crd=json(base+'crd-review.json');
 assert.equal(retained.length,10);assert.equal(reviews.length,10);assert.equal(crd.reviewed_cards,10);assert.deepEqual(crd.specific_errata_cards,[153,155]);
 for(const a of retained){assert.ok(a.original_image_bytes_unchanged&&a.original_mapping_unchanged);assert.equal(a.final_native_sha256,rows.find(r=>r.number===a.number).native_source_sha256);assert.equal(hash(a.retained_asset),a.original_image_sha256);}
 for(const r of reviews){assert.ok(r.source_reviewed&&r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>50&&r.unresolved);for(const e of r.exports)assert.equal(hash(e.path),e.sha256);}
 const rule=n=>all.find(c=>c.number===String(n)).rules;
 assert.match(rule(152),/DAMAGE: 7 stages/);assert.doesNotMatch(rule(152),/AT/);
 assert.doesNotMatch(rule(153),/Limit|Restricted/);assert.match(rule(153),/bottom card of your discard pile/);
 assert.match(rule(155),/Energy attack costing 2 stages\. DAMAGE: 4 life cards\. HIT: Each Ally your opponent has in play loses 4 stages/);
 assert.match(rule(156),/until the beginning of their next turn/);
 assert.match(rule(157),/up to 7 Allies.*3 stages above 0.*Banish after use/);
 assert.match(rule(158),/^Limit 2 per deck\. POWER: Banish all Allies in play\. Banish after use/);
 assert.match(rule(159),/AT \+9 stages/);assert.match(rule(160),/AT \+5 stages and 5 life cards/);
 const expected={154:[4,4,Array.from({length:12},(_,i)=>3600000-i*125000).concat(0)],159:[5,5,Array.from({length:12},(_,i)=>4000000-i*100000).concat(0)],160:[5,5,Array.from({length:12},(_,i)=>4500000-i*100000).concat(0)]};
 const values=json(base+'personality-values.json');assert.equal(values.length,3);
 for(const v of values){
  assert.ok(v.verified);assert.deepEqual([v.level,v.pur,v.stages],expected[v.number]);
  const row=rows.find(r=>r.number===v.number),svg=read(row.native_source_path),d=data.find(c=>c.number===v.number);
  assert.deepEqual([d.level,d.pur,d.stages],expected[v.number]);
  for(const r of v.rows){near(r.right_ink_edge,1031);near(r.digit_center_error,0);}
  const stages=[...svg.matchAll(/id="power-stage-\d+"[^>]*data-stage-value="(\d+)"/g)].map(m=>Number(m[1]));assert.deepEqual(stages,v.stages);
  assert.match(svg,/id="card-category"[^>]*aria-label="HERO"/);assert.match(svg,/#258bc9/);assert.match(svg,/#15639d/);
  const title=row.native_geometry.bounds['card-title'],level=row.native_geometry.bounds['v3-level-number'];assert.ok(title[2]<=640.021);assert.ok(title[0]-level[0]-level[2]>=40);
 }
 const recovered=rows.find(r=>r.number===157);assert.ok(recovered.artwork.approved_artwork_exception);
 assert.equal(hash(base+'1000032915.jpg'),json(base+'source-provenance.json')['157_user_attachment'].sha256);
});

test('the four final Cell Ultra Rares retain reviewed, revision-pinned subject masks',()=>{
 const masks=json(base+'foil-mask-review.json');assert.deepEqual(masks.map(m=>m.number),[157,158,159,160]);
 for(const m of masks){
  const c=catalog.find(c=>c.id===m.id);assert.equal(c.image,m.image);assert.equal(ultraRareMask(c),m.mask.replace(/^public/,''));
  assert.equal(hash(m.mask),m.after_sha256);assert.ok(m.visual_overlay_reviewed);assert.match(read(m.mask),/clip-path="url\(#art-window\)"/);assert.match(read(m.mask),/fill="black"/);
  assert.match(ultraRareMask({...c,image:c.image+'changed'}),/generic-v3\.svg$/);
 }
});
