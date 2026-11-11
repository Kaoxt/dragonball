import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from './helpers/pre-world-games-051-100-catalog.js';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
import {freestyleStrokeRelease as release,beforeFreestyleStrokeFile,beforeFreestyleStrokeHash} from './helpers/freestyle-stroke-history.js';
const hash=b=>createHash('sha256').update(b).digest('hex');

test('Freestyle repair covers every white symbol and preserves other native bytes',()=>{
 assert.ok(release);
 assert.equal(release.corrected_card_count,374);assert.equal(release.export_count,748);
 assert.equal(release.excluded_card_count,207);
 assert.ok(release.shared_symbol_proof.outer_alpha_silhouette_unchanged);
 assert.ok(release.shared_symbol_proof.changed_native_pixels_fully_opaque);
 assert.ok(release.shared_symbol_proof.isolated_symbol_delta_equals_full_native_delta);
 assert.deepEqual([...release.cards,...release.excluded_cards].map(r=>r.id).sort(),catalog.filter(c=>c.style==='Freestyle').map(c=>c.id).sort());
 assert.ok(Math.abs(release.typical_white_stroke_after_native-9.8)<.03);
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id);assert.equal(c.style,'Freestyle');
  assert.ok(['Physical Combat','Energy Combat','Setup','Event','Drill'].includes(c.type));
  const raw=fs.readFileSync(r.source.path,'utf8');
  assert.equal(hash(Buffer.from(raw)),r.source.after_sha256);
  assert.equal(hash(beforeFreestyleStrokeFile(r.source.path)),r.source.before_sha256);
  assert.equal(r.source.reversible_edits.length,1);
  const e=r.source.reversible_edits[0];assert.equal(e.id,'freestyle-glyph');
  assert.equal(e.after,e.before.slice(0,-1)+' stroke="#080b0d" stroke-width="0.8" stroke-linejoin="round">');
  assert.ok(r.helper_idempotent);
 }
});

test('all 748 Freestyle exports preserve pixels outside the measured symbol delta',()=>{
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id);
  for(const e of r.exports){
   assert.equal(hash(fs.readFileSync(e.path)),e.after_sha256);
   assert.equal(beforeFreestyleStrokeHash(e.path),e.before_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(e.pixels_changed_outside_symbol_delta,0);assert.ok(e.lossless_round_trip);
   assert.ok(e.changed_pixels>0);assert.ok(e.old_native_max_channel_error<=4);
   const s=e.field==='image'?1:2;
   assert.deepEqual(e.size,[1060*s,1484*s]);
   assert.ok(e.changed_bounds[0]>40*s&&e.changed_bounds[2]<160*s&&e.changed_bounds[1]>840*s&&e.changed_bounds[3]<980*s);
  }
 }
});

test('Freestyle personalities, Dragon Balls and location emblems stay byte-identical',()=>{
 for(const r of release.excluded_cards){
  assert.ok(['Main Personality','Dragon Ball','Location','Battleground'].includes(r.type));
  for(const f of r.files)assert.equal(hash(fs.readFileSync(f.path)),f.sha256);
 }
});

test('symbol-only revisions retain the exact custom Ultra Rare masks',()=>{
 const profiles=release.foil_profiles;
 assert.equal(hash(fs.readFileSync(profiles.path)),profiles.after_sha256);
 assert.equal(profiles.masks.length,10);
 assert.deepEqual(profiles.masks.map(m=>m.id).sort(),catalog.filter(c=>c.rarity==='Ultra Rare'&&release.cards.some(r=>r.id===c.id)).map(c=>c.id).sort());
 let original=fs.readFileSync(profiles.path,'utf8');
 for(const m of profiles.masks){
  const c=catalog.find(c=>c.id===m.id);
  assert.equal(c.image,m.image_after);
  assert.equal(ultraRareMask(c),m.path.replace(/^public/,''));
  assert.equal(hash(fs.readFileSync(m.path)),m.sha256);
  assert.ok(m.artwork_pixels_unchanged);
  original=original.replace(m.image_after,m.image_before);
 }
 assert.equal(hash(Buffer.from(original)),profiles.before_sha256);
});
