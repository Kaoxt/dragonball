import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {catalog} from '../public/cards/catalog.js';
import {powerChart} from '../public/personality-power.js';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
import {stageRelease,beforeStageFile,beforeStageHash} from './helpers/personality-stage-history.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const group=/<(?:\w+:)?g\b[^>]*\bid="power-stage-value-(\d+)"[^>]*>.*?<\/(?:\w+:)?g>/gs;
const stages=s=>[...s.matchAll(group)].map(m=>Number(m[0].match(/aria-label="([\d,]+)"/)[1].replaceAll(',','')));

test('all 172 Personality sources print the highest power at the top and zero at the bottom',()=>{
 assert.equal(stageRelease.audited_personality_count,172);
 assert.equal(stageRelease.audit.length,172);
 for(const r of stageRelease.audit){
  const c=catalog.find(c=>c.id===r.id);assert.ok(c,r.id);
  const values=stages(fs.readFileSync(r.source_path,'utf8'));
  assert.equal(values.at(-1),0,r.id);
  assert.ok(values[0]>0,r.id);
  assert.deepEqual(values,[...values].sort((a,b)=>b-a),r.id);
  const expected=r.before_values.map(v=>r.id==='android-116-android-18'&&v===499000?399000:v);
  assert.deepEqual([...values].sort((a,b)=>a-b),expected.sort((a,b)=>a-b),r.id);
  if(r.changed)assert.deepEqual([...values].sort((a,b)=>a-b),[...(c.powerStages??powerChart(c))].sort((a,b)=>a-b),r.id);
  assert.deepEqual(values,r.after_values);
 }
});
test('22 stage-only repairs retain reversible sources, lossless exports and current cache keys',()=>{
 assert.equal(stageRelease.cards.length,22);assert.equal(stageRelease.export_count,44);
 assert.equal(stageRelease.cards.filter(r=>r.id.startsWith('android-')).length,10);
 assert.equal(stageRelease.cards.filter(r=>r.id.startsWith('frieza-')).length,12);
 for(const r of stageRelease.cards){
  const c=catalog.find(c=>c.id===r.id),raw=fs.readFileSync(r.source.path,'utf8');
  assert.equal(hash(Buffer.from(raw)),r.source.after_sha256);
  assert.equal(hash(beforeStageFile(r.source.path)),r.source.before_sha256);
  assert.equal(hash(Buffer.from(raw.replace(group,''))),r.source.unchanged_outside_stage_groups_sha256);
  for(const e of r.exports){
   assert.equal(hash(fs.readFileSync(e.path)),e.after_sha256);
   assert.equal(beforeStageHash(e.path),e.before_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(e.pixels_changed_outside_stage_ink,0);assert.equal(e.lossless_round_trip,true);
   assert.ok(e.changed_pixels>0);assert.ok(e.old_native_max_channel_error<=4);
  }
 }
});
test('Android 18 uses the original 399,000 value in the image, catalog and Arena chart',()=>{
 const c=catalog.find(c=>c.id==='android-116-android-18');
 assert.ok(c.powerStages.includes(399000));assert.ok(!c.powerStages.includes(499000));
 const chart=fs.readFileSync('public/personality-power.js','utf8').split('\n').find(s=>s.includes('"'+c.id+'"'));
 assert.match(chart,/\b399000\b/);assert.doesNotMatch(chart,/\b499000\b/);
 const record=JSON.parse(fs.readFileSync('tools/card-corrections/v3-android-101-125-promos/cards.json','utf8')).find(r=>r.id===c.id);
 assert.deepEqual(record.stages,c.powerStages);
 const correction=stageRelease.value_correction;
 assert.equal(hash(fs.readFileSync(correction.original_scan)),correction.original_scan_sha256);
});
test('the two repaired Ultra Rares retain their exact character masks',()=>{
 assert.equal(stageRelease.foil_mask_revisions.length,2);
 for(const r of stageRelease.foil_mask_revisions){
  const c=catalog.find(c=>c.id===r.id);
  assert.equal(c.image,r.after_image);
  assert.equal('public'+ultraRareMask(c),r.mask_path);
  assert.equal(hash(fs.readFileSync(r.mask_path)),r.unchanged_mask_sha256);
 }
});
test('the shared builder accepts either ordered input and rejects ambiguous charts',()=>{
 execFileSync('python3',['-c',`
import sys
sys.path.insert(0,'tools/card-templates/v3/scripts')
from personality_stages import printed_stages
assert printed_stages([0,100,200]) == [200,100,0]
assert printed_stages([200,100,0]) == [200,100,0]
assert printed_stages([0,100,100]) == [100,100,0]
for values in ([0,200,100], [200,100], [0,0,100], [-1,0,100], [0,1.5]):
 try: printed_stages(values)
 except ValueError: pass
 else: raise AssertionError(values)
`]);
});
