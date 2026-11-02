import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(read(p)).digest('hex');
const base='tools/card-corrections/v3-personality-short-labels/';

test('all current V3 Personalities have short native labels and independently verified lossless exports',()=>{
 const cards=catalog.filter(c=>c.templateVersion===3&&c.type.includes('Personality'));
 const checks=json(base+'pixel-checks.json'),release=json(base+'release.json');
 assert.equal(cards.length,134);assert.equal(checks.length,134);
 assert.equal(release.cards,134);assert.equal(release.independently_verified_exports,268);
 assert.deepEqual(checks.map(c=>c.id).sort(),cards.map(c=>c.id).sort());
 assert.equal(release.pixels_changed_outside_category_ink_footprint,0);
 for(const check of checks){
  const card=cards.find(c=>c.id===check.id),row=json(check.audit_path).find(r=>r.id===check.id);
  assert.deepEqual(row.category_label_revision,check);
  const finish=row.personality_finish_revision,blue=row.hero_blue_revision;
  assert.equal(finish?.before_native_sha256 ?? blue?.before_native_sha256 ?? hash(check.native_source_path),check.after_native_sha256);
  assert.equal(hash(check.native_source_path),row.native_source_sha256);
  assert.equal(row.native_source_sha256,blue?.after_native_sha256 ?? finish?.after_native_sha256 ?? check.after_native_sha256);
  assert.ok(check.unrelated_native_elements_unchanged&&check.helper_idempotent);
  assert.ok(['HERO','VILLAIN'].includes(check.label));
  assert.equal(check.before_label,check.label+' PERSONALITY');
  const svg=read(check.native_source_path).toString();
  assert.match(svg,new RegExp('id="card-category"[^>]*aria-label="'+check.label+'"'));
  const [x,y,w,h]=row.native_geometry.bounds['card-category'];
  assert.ok(Math.abs(x+w/2-529.5)<.002&&Math.abs(y+h/2-908.5)<.002);
  for(const a of row.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(check.exports.length,2);
  for(const e of check.exports){
   const blueExport=blue?.exports.find(r=>r.path===e.path);
   const later=finish?.exports.find(r=>r.path===e.path) ?? blueExport,current=row.exports.find(r=>r.path===e.path);
   assert.equal(later?.before_sha256 ?? hash(e.path),e.after_sha256);
   assert.equal(hash(e.path),current.after_sha256);
   assert.equal(current.after_sha256,blueExport?.after_sha256 ?? later?.after_sha256 ?? e.after_sha256);
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+current.after_sha256.slice(0,12));
   assert.ok(e.lossless_round_trip&&e.changed_pixels>0);
   assert.equal(e.pixels_changed_outside_category_ink_footprint,0);
   assert.ok(e.old_render_max_channel_difference<=3);
   const scale=e.field==='image'?1:2;
   assert.ok(e.changed_pixel_bounds[1]>880*scale&&e.changed_pixel_bounds[3]<937*scale);
  }
 }
});

test('the two Personality masters retain the approved fixed short labels',()=>{
 const folder='tools/card-templates/v3/';
 const manifest=json(folder+'assets/text/categories/manifest.json');
 for(const [file,label] of [['Personality-Master-V3.svg','HERO'],['Personality-Villain-Master-V3.svg','VILLAIN']]){
  assert.match(read(folder+'masters/'+file).toString(),new RegExp('id="card-category"[^>]*aria-label="'+label+'"'));
  const g=manifest[label].geometry;assert.deepEqual(g.visible_center,[529.5,908.5]);
  assert.equal(g.font,'Michroma');assert.equal(g.font_size,38.4);assert.equal(g.tracking,4);
 }
});
