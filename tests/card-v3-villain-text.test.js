import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-templates/v3/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const rows=['saiyan-001-050','saiyan-051-100','saiyan-101-150','saiyan-151-170','saiyan-171-220','saiyan-221-250-promos','frieza-001-010','frieza-011-060','frieza-051-100','frieza-101-125-promos','trunks-001-005'].flatMap(b=>json(`tools/card-corrections/v3-${b}/audit.json`));
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]).filter(([k])=>!k.startsWith('data-')&&!k.startsWith('xmlns')));
function category(svg){
 const match=svg.match(/<((?:\w+:)?g)\b[^>]*\bid="card-category"[^>]*>[\s\S]*?<\/\1>/);
 assert.ok(match,'missing native category SVG');
 return {group:attrs(match[0].slice(0,match[0].indexOf('>')+1)),paths:[...match[0].matchAll(/<(?:\w+:)?path\b[^>]*>/g)].map(m=>attrs(m[0]))};
}

test('all 398 V3 category labels use the retained fixed native text SVGs',()=>{
 const components=json(base+'assets/text/categories/manifest.json');
 assert.equal(rows.length,398);
 for(const row of rows){
  const actual=category(read(row.native_source_path));
  const spec=components[actual.group['aria-label']];assert.ok(spec,row.id);
  assert.deepEqual(actual,category(read(base+'assets/text/categories/'+spec.file)),row.id);
  for(const [id,cx,cy] of [['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5]]){
   const [x,y,w,h]=row.native_geometry.bounds[id];assert.ok(Math.abs(x+w/2-cx)<.02&&Math.abs(y+h/2-cy)<.02,row.id+' '+id);
  }
 }
});

test('the 24 previously repaired V3 Villains have four red power corners with unchanged text and artwork',()=>{
 const folder='tools/card-corrections/v3-villain-red-corners/';
 const release=json(folder+'release.json'),checks=json(folder+'pixel-checks.json');
 assert.equal(release.cards,24);assert.equal(release.independently_verified_exports,48);
 assert.equal(checks.length,24);assert.equal(new Set(checks.map(c=>c.id)).size,24);
 const villains=rows.filter(r=>r.villain_corner_revision);
 assert.deepEqual(checks.map(c=>c.id).sort(),villains.map(r=>r.id).sort());
 for(const check of checks){
  const row=rows.find(r=>r.id===check.id),card=catalog.find(c=>c.id===row.id);
  assert.deepEqual(row.villain_corner_revision,check);assert.equal(row.footer_spacing_revision?.before_native_sha256 ?? hash(row.native_source_path),check.after_native_sha256);
  assert.equal(hash(row.native_source_path),row.native_source_sha256);
  assert.ok(check.helper_idempotent&&check.unrelated_native_elements_unchanged&&check.all_text_and_artwork_unchanged);
  const svg=read(row.native_source_path);
  const panel=svg.slice(svg.indexOf('id="shared-rules-component"'),svg.indexOf('id="shared-rules-outer-rail"'));
  assert.equal((panel.match(/fill="#8e1722"/g)||[]).length,4);
  assert.equal((panel.match(/stroke="#4c1119"/g)||[]).length,2);
  assert.doesNotMatch(panel,/#0a4a96|#092b50/);
  for(const e of check.exports){
   const current=row.exports.find(x=>x.field===e.field);
   assert.equal(hash(e.path),current.after_sha256);assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+current.after_sha256.slice(0,12));
   assert.equal(row.footer_spacing_revision?.exports.find(x=>x.field===e.field).before_sha256 ?? current.after_sha256,e.after_sha256);
   assert.ok(e.changed_pixels>0&&e.lossless_round_trip&&e.old_render_max_channel_difference<=3);
   assert.equal(e.pixels_changed_outside_corner_footprint,0);
  }
 }
 const hero=rows.find(r=>category(read(r.native_source_path)).group['aria-label']==='HERO PERSONALITY');
 assert.match(read(hero.native_source_path),/fill="#0a4a96"/);
});
