import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {blueStrokeRelease as release,beforeBlueStrokeFile,beforeBlueStrokeHash} from './helpers/blue-stroke-history.js';
import {beforeFreestyleStrokeFile,beforeFreestyleStrokeHash,catalog as historicalCatalog} from './helpers/freestyle-stroke-history.js';
const hash=b=>createHash('sha256').update(b).digest('hex');

test('all Blue cards use thinner blue strokes with every other source byte preserved',()=>{
 assert.ok(release);assert.equal(release.corrected_card_count,81);assert.equal(release.export_count,162);
 assert.deepEqual(release.cards.map(r=>r.id).sort(),catalog.filter(c=>c.style==='Blue').map(c=>c.id).sort());
 assert.equal(release.colored_stroke_ratio,0.9625);
 assert.equal(release.cards.filter(r=>r.type==='Mastery').length,2);
 assert.equal(release.cards.filter(r=>r.set==='World Games Saga').length,9);
 for(const r of release.cards){
  const raw=fs.readFileSync(r.source.path,'utf8');
  assert.equal(hash(Buffer.from(raw)),r.source.after_sha256);
  assert.equal(hash(beforeBlueStrokeFile(r.source.path)),r.source.before_sha256);
  assert.equal(r.source.reversible_edits.length,1);
  const e=r.source.reversible_edits[0];
  assert.equal(e.id,'blue-style-symbol');
  assert.equal(e.after,e.before.replace('stroke-width="7.69230769"','stroke-width="7.403846151625"'));
  assert.ok(r.helper_idempotent);
 }
});

test('earlier audit readers see the exact pre-Blue sources and image revisions',()=>{
 for(const r of release.cards){
  assert.equal(hash(beforeFreestyleStrokeFile(r.source.path)),r.source.before_sha256);
  const c=historicalCatalog.find(c=>c.id===r.id);
  for(const e of r.exports){
   assert.equal(beforeFreestyleStrokeHash(e.path),e.before_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.before_sha256.slice(0,12));
  }
 }
});

test('both lossless exports have verified logo-only deltas and refreshed cache keys',()=>{
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id);
  for(const e of r.exports){
   assert.equal(hash(fs.readFileSync(e.path)),e.after_sha256);
   assert.equal(beforeBlueStrokeHash(e.path),e.before_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(e.pixels_changed_outside_symbol_delta,0);assert.ok(e.lossless_round_trip);
   assert.ok(e.changed_pixels>0);assert.ok(e.old_native_max_channel_error<=4);
   const s=e.field==='image'?1:2;
   assert.deepEqual(e.size,[1060*s,1484*s]);
   assert.ok(e.changed_bounds[0]>=0&&e.changed_bounds[2]<360*s&&e.changed_bounds[1]>650*s&&e.changed_bounds[3]<1050*s);
  }
 }
});
