import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'tools/card-corrections/v3-frieza-011-060');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b,t=.01)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);

test('Frieza 11–60 have current native sources, unchanged reviewed rules and both lossless exports',()=>{
 const rows=read('audit.json'),checks=read('render-verification.json'),cards=read('cards.json'),art=read('artwork-review.json');
 const selected=catalog.filter(c=>c.set==='Frieza Saga'&&Number(c.number)>=11&&Number(c.number)<=60);
 assert.equal(rows.length,50);assert.equal(checks.length,50);assert.equal(art.length,50);
 assert.deepEqual(selected.map(c=>Number(c.number)),Array.from({length:50},(_,i)=>i+11));
 for(const c of selected){
  assert.equal(c.templateVersion,3);const row=rows.find(r=>r.id===c.id),data=cards.find(r=>r.id===c.id),check=checks.find(r=>r.number===row.number);
  assert.equal(hash(row.native_source_path),row.native_source_sha256);assert.equal(check.native_source_sha256,row.villain_corner_revision?.before_native_sha256 ?? row.footer_spacing_revision?.before_native_sha256 ?? row.native_source_sha256);
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');assert.ok(!/<(?:\w+:)?text[\s>]/.test(svg));
  assert.equal(c.rules,row.rules.map(r=>r.text).join(' '));assert.equal(c.rules,data.modern_rules);assert.ok(row.rules.length<=5);
  assert.ok(row.current_preview_revision.title_fit.max_width<=(row.personality_values?700:760));
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);assert.ok(check.title_helper_idempotent);
  for(const [id,cx,cy] of [['card-title',529.5,79],['card-category',529.5,908.5],['saga-emblem',211.75,1409.5]]){
   const [x,y,w,h]=row.native_geometry.bounds[id];near(x+w/2,cx);near(y+h/2,cy);
  }
  near(row.native_geometry.bounds['saga-emblem'][2],53.7814);assert.ok(row.set_emblem.native_vector);
  assert.equal(row.native_geometry.icons.length,row.power_icon?1:0);for(const icon of row.native_geometry.icons)near(icon.center_error,0);
  assert.equal(row.tokui_waza_backing.applies,!row.personality_values);
  for(const a of row.assets)assert.equal(hash(a.path),a.sha256);
  assert.ok(row.assets.some(a=>a.sha256===row.artwork.source_sha256));assert.equal(row.artwork.additional_zoom,false);
  for(const e of row.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.ok(e.lossless_round_trip);
   const verified=check.exports.find(x=>x.path===e.path);assert.ok(verified.decoded_pixels_match_render);assert.ok(verified.category_rendered);
   assert.equal(verified.sha256,row.villain_corner_revision?.exports.find(x=>x.path===e.path).before_sha256 ?? row.footer_spacing_revision?.exports.find(x=>x.path===e.path).before_sha256 ?? e.after_sha256);
   near(verified.footer_ink_center[0],211.75,.51);near(verified.footer_ink_center[1],1409.5,.51);
  }
  const review=art.find(a=>a.id===c.id);assert.ok(review.display_reviewed);assert.equal(hash(review.original_scan),review.original_scan_sha256);assert.ok(review.observations.length>40);
 }
 assert.equal(rows.filter(r=>r.personality_values).length,12);assert.equal(rows.filter(r=>r.tokui_waza_backing.applies).length,38);
});

test('Frieza 1–50 use the current mirrored footer without changing unrelated pixels',()=>{
 const folder=path.join(root,'tools/card-corrections/v3-frieza-001-050-footer-centering');
 const checks=JSON.parse(fs.readFileSync(path.join(folder,'pixel-checks.json')));
 const release=JSON.parse(fs.readFileSync(path.join(folder,'release.json')));
 const rows=[...JSON.parse(fs.readFileSync(path.join(root,'tools/card-corrections/v3-frieza-001-010/audit.json'))),...read('audit.json')];
 assert.equal(release.cards,50);assert.equal(release.independently_verified_exports,100);
 assert.equal(release.pixels_changed_outside_footer_ink_footprint,0);
 assert.deepEqual(checks.map(c=>c.number),Array.from({length:50},(_,i)=>i+1));
 assert.equal(rows.filter(r=>r.footer_spacing_revision).length,50);
 for(const check of checks){
  const row=rows.find(r=>r.id===check.id),card=catalog.find(c=>c.id===row.id);
  assert.equal(card.templateVersion,3);assert.deepEqual(row.footer_spacing_revision,check);
  assert.equal(hash(row.native_source_path),check.after_native_sha256);
  assert.equal(row.native_source_sha256,check.after_native_sha256);
  assert.ok(check.helper_idempotent&&check.unrelated_native_elements_unchanged);
  near(check.saga_center_x,211.75,.002);near(check.right_group_center_x,847.25,.002);
  const bounds=row.native_geometry.bounds,ball=bounds['footer-rarity'],num=bounds['card-number'];
  near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,847.25,.002);
  near(num[0]-ball[0]-ball[2],12.2,.002);
  for(const id of ['saga-emblem','footer-rarity','card-number']){const [x,y,w,h]=bounds[id];near(y+h/2,1409.5);}
  for(const e of check.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.ok(e.changed_pixels>0&&e.lossless_round_trip&&e.old_render_max_channel_difference<=3);
   assert.equal(e.pixels_changed_outside_footer_ink_footprint,0);assert.equal(e.pixels_changed_above_footer,0);
  }
 }
});

test('Frieza Personalities preserve LEVEL, PUR, stage values and Guldo eye correction',()=>{
 const rows=read('audit.json'),cards=read('cards.json');
 for(const row of rows.filter(r=>r.personality_values)){
  const c=cards.find(c=>c.id===row.id);assert.deepEqual(row.personality_values,{level:c.level,pur:c.pur,stages:c.stages});
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');
  assert.match(svg,new RegExp(`id="v3-level-number"[^>]*aria-label="${c.level}"`));
  assert.match(svg,new RegExp(`id="concept-pur-number"[^>]*aria-label="${c.pur}"`));
  for(const [i,n] of [...c.stages].reverse().entries()){
   assert.match(svg,new RegExp(`id="power-stage-value-${i}"[^>]*aria-label="${n.toLocaleString('en-US')}"`));
   const [x,y,w,h]=row.native_geometry.bounds[`power-stage-value-${i}`];near(x+w,1031,.02);
  }
 }
 assert.equal(rows.find(r=>r.number===45).artwork.expression_patch_retained,true);
 for(const n of [42,55])assert.equal(rows.find(r=>r.number===n).power_icon_revision,'approved-bold-infinity-colon-v16');
 const rules=n=>cards.find(c=>c.number===n).modern_rules;
 assert.match(rules(22),/HIT: End Combat\. Banish after use\./);assert.match(rules(24),/where X is 1-7/);
 assert.match(rules(37),/If stopped, your opponent discards 2 life cards/);assert.match(rules(48),/at the end of this Combat/);
 assert.match(rules(55),/Reduce damage from all attacks/);assert.equal(rows.find(r=>r.number===17).native_geometry.icons.length,1);
});
