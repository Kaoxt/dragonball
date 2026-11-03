import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-cell-101-150/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Cell 101–150 exports retain every rule line, fixed V3 geometry and correct rarity',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+101));assert.equal(checks.length,50);
 assert.equal(catalog.filter(c=>c.set==='Cell Saga'&&c.templateVersion===3&&Number(c.number)>=101&&Number(c.number)<=150).length,50);
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
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=111?3:5);
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

test('Cell 101–150 preserve original values, art, categories and CRD timing',()=>{
 const retained=json(base+'retained-art-verification.json'),reviews=json(base+'artwork-review.json'),crd=json(base+'crd-review.json');
 assert.equal(retained.length,50);assert.equal(reviews.length,50);assert.equal(crd.reviewed_cards,50);
 assert.deepEqual(crd.specific_errata_cards,[116,125,130,147]);assert.deepEqual(crd.category_transcription_corrections,[]);
 for(const a of retained){assert.ok(a.original_image_bytes_unchanged&&a.original_mapping_unchanged);assert.equal(a.final_native_sha256,rows.find(r=>r.number===a.number).native_source_sha256);assert.equal(hash(a.retained_asset),a.original_image_sha256);}
 for(const r of reviews){assert.ok(r.source_reviewed&&r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>50);assert.ok(r.unresolved);for(const e of r.exports)assert.equal(hash(e.path),e.sha256);}
 const card=n=>catalog.find(c=>c.set==='Cell Saga'&&c.number===String(n)),rule=n=>card(n).rules;
 assert.match(rule(110),/^Krillin only\. POWER:/);assert.match(rule(106),/Combat cards/);
 assert.match(rule(116),/Krillin, Piccolo, and Trunks.*personality powers.*Banish after use/);
 assert.match(rule(125),/Banish a Battleground in play/);assert.match(rule(130),/When entering Combat, discard the top card/);
 assert.match(rule(147),/^Limit 1 per deck\. Physical attacks against you deal a maximum of 3 stages/);
 assert.doesNotMatch(rule(147),/maximum of 3 life/);assert.match(rule(135),/DAMAGE: 5 stages and 3 life cards/);assert.doesNotMatch(rule(135),/AT/);
 assert.match(rule(136),/Energy attack costing 0 stages.*12 life cards/);
 assert.match(rule(138),/Energy attack costing 0 stages.*4 life cards and 4 stages/);
 assert.match(rule(145),/Physical attack costing 2 stages.*AT \+2 stages.*HIT:/);
 assert.match(rule(149),/bottom of your Life Deck\. Banish after use\./);
 for(const d of data)assert.equal(crd.cards.find(r=>r.number===d.number).modern_rules,d.modern_rules);
 const values=json(base+'personality-values.json');assert.equal(values.length,12);
 for(const v of values){
  assert.ok(v.verified);const row=rows.find(r=>r.number===v.number),svg=read(row.native_source_path),d=data.find(c=>c.number===v.number);
  assert.deepEqual([d.level,d.pur,d.stages],[v.level,v.pur,v.stages]);assert.equal(v.stages.length,[127,132,134,135,136,137,138].includes(v.number)?13:11);
  assert.equal(v.stages.at(-1),0);for(const r of v.rows){near(r.right_ink_edge,1031);near(r.digit_center_error,0);}
  const stages=[...svg.matchAll(/id="power-stage-\d+"[^>]*data-stage-value="(\d+)"/g)].map(m=>Number(m[1]));assert.deepEqual(stages,v.stages);
  assert.match(svg,new RegExp('id="card-category"[^>]*aria-label="'+(d.category.startsWith('VILLAIN')?'VILLAIN':'HERO')+'"'));
  const title=row.native_geometry.bounds['card-title'],level=row.native_geometry.bounds['v3-level-number'];assert.ok(title[2]<=640.021);assert.ok(title[0]-level[0]-level[2]>=40);
  if([133,136,137].includes(v.number)){assert.match(svg,/#a61122/);assert.match(svg,/#8e1722/);}else{assert.match(svg,/#258bc9/);assert.match(svg,/#15639d/);}
 }
 for(const n of[121,122]){const row=rows.find(r=>r.number===n),svg=read(row.native_source_path);assert.ok(row.artwork.approved_artwork_exception);assert.deepEqual(row.artwork.mapping_matrix,[1,0,0,1,0,0]);assert.match(svg,new RegExp('id="dragon-ball-left-emblem"[^>]*data-star-count="'+(n-115)+'"'));assert.doesNotMatch(svg,/id="seven-dragon-ball-cluster-vector"/);}
});

test('Cell Masteries retain the approved pointed window and continuous V3 surround',()=>{
 const masters=rows.filter(r=>r.family==='MASTERY');assert.deepEqual(masters.map(r=>r.number),[126,129,130,131,140,141]);
 for(const r of masters){const svg=read(r.native_source_path);assert.match(svg,/10948151b2cb82fa190ec88cdf52e8ab8db469acf4c3c7baaf13096f1a17a78c/);assert.match(svg,/M16 146H1043V600L529.5 852L16 600Z/);assert.match(svg,/id="v2-card-illustration"/);assert.deepEqual(r.artwork.mapping_matrix,[1,0,0,1,0,0]);}
});
