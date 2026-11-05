import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const folder='tools/card-corrections/v3-hero-reference-blue/';

test('all 73 V3 Heroes use the approved blue with unchanged native layout and lossless exports',()=>{
 const checks=json(folder+'pixel-checks.json'),release=json(folder+'release.json');
 const transparency=json(folder+'transparency-verification.json');
 const heroes=json('tools/card-corrections/v3-personality-short-labels/pixel-checks.json').filter(c=>c.label==='HERO');
 assert.equal(release.cards,73);assert.equal(release.exports,146);
 assert.equal(transparency.length,73);
 assert.deepEqual(checks.map(c=>c.id).sort(),heroes.map(c=>c.id).sort());
 assert.deepEqual(release.hero_blue_stops,['#258bc9','#15639d']);
 assert.equal(release.pixels_changed_outside_middle_paint,0);
 for(const c of checks){
  const row=json(c.audit_path).find(r=>r.id===c.id),card=catalog.find(r=>r.id===c.id);
  const previous=row.personality_finish_revision ?? row.category_label_revision;
  const alpha=transparency.find(a=>a.id===c.id);assert.ok(alpha.alpha_identical);
  assert.deepEqual(row.hero_blue_revision,c);
  assert.equal(c.before_native_sha256,previous.after_native_sha256);
  const level=row.level_numeral_revision;
  assert.equal(level?.before_native_sha256 ?? hash(c.native_source_path),c.after_native_sha256);
  assert.equal(hash(c.native_source_path),row.native_source_sha256);
  assert.equal(row.native_source_sha256,level?.after_native_sha256 ?? c.after_native_sha256);
  assert.ok(c.unrelated_native_elements_unchanged&&c.helper_idempotent&&c.assets_unchanged);
  const svg=fs.readFileSync(c.native_source_path,'utf8');
  assert.match(svg,/id="shared-category-material"[^]*?<[^>]*rect[^>]*fill="url\(#hero-reference-blue\)"/);
  assert.match(svg,/#258bc9/);assert.match(svg,/#15639d/);
  assert.match(svg,/id="card-category"[^>]*aria-label="HERO"/);
  for(const e of c.exports){
   const clear=alpha.exports.find(a=>a.path===e.path);
   assert.equal(clear.sha256,e.after_sha256);assert.equal(clear.changed_clear_pixels,0);assert.ok(clear.fully_clear_pixels>0);
   assert.equal(e.before_sha256,previous.exports.find(p=>p.path===e.path).after_sha256);
   const levelExport=level?.exports.find(p=>p.path===e.path);
   assert.equal(levelExport?.before_sha256 ?? hash(e.path),e.after_sha256);
   const currentHash=levelExport?.after_sha256 ?? e.after_sha256;
   assert.equal(hash(e.path),currentHash);
   assert.equal(row.exports.find(p=>p.path===e.path).after_sha256,currentHash);
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+currentHash.slice(0,12));
   assert.equal(e.pixels_changed_outside_middle_paint,0);
   assert.ok(e.lossless_round_trip&&e.changed_pixels>0&&e.old_render_max_channel_difference<=4);
   const scale=e.size[0]/1060;
   assert.ok(e.changed_pixel_bounds[1]>=848*scale&&e.changed_pixel_bounds[3]<=970*scale);
  }
 }
});

test('the Hero master uses the approved native gradient while Villain crimson is retained',()=>{
 const root='tools/card-templates/v3/masters/';
 const hero=fs.readFileSync(root+'Personality-Master-V3.svg','utf8');
 assert.match(hero,/id="hero-reference-blue"[^>]*x1="0"[^>]*y1="0"[^>]*x2="0"[^>]*y2="100"[^>]*gradientUnits="userSpaceOnUse"/);
 assert.match(hero,/#258bc9/);assert.match(hero,/#15639d/);
 const villain=fs.readFileSync(root+'Personality-Villain-Master-V3.svg','utf8');
 assert.match(villain,/id="shared-category-material"[^]*?<[^>]*rect[^>]*fill="#a61122"/);
});
