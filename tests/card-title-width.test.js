import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {readHistoricalCardFile} from './helpers/title-width-history.js';
const file='tools/card-corrections/v3-title-footer-width/release.json';
const digest=b=>createHash('sha256').update(b).digest('hex');
test('all published cards use the widened title and punctuation-safe alignment',()=>{
 const release=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(release.card_count,catalog.length);assert.equal(release.export_count,2*catalog.length);
 assert.equal(release.historical_audits_preserved,true);assert.equal(release.middle_bars_and_footers_unchanged,true);
 assert.equal(new Set(release.cards.map(c=>c.id)).size,catalog.length);
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id);assert.ok(c,r.id);
  const src=fs.readFileSync(r.source.path);assert.equal(digest(src),r.source.after_sha256);
  assert.equal(digest(readHistoricalCardFile(r.source.path)),r.source.before_sha256);
  assert.equal(r.helper_idempotent,true);
  assert.equal(r.alignment.horizontal_center,(c.width-1)/2);
  assert.equal(r.alignment.letter_vertical_center,79);
  assert.equal(r.alignment.punctuation_excluded_from_vertical_measurement,true);
  for(const edit of r.source.reversible_edits)assert.ok(['card-title','shared-title-material'].includes(edit.id));
  for(const e of r.exports){
   const bytes=fs.readFileSync(e.path);assert.equal(digest(bytes),e.after_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(e.pixels_changed_outside_native_header_delta,0);assert.equal(e.pixels_changed_below_header,0);assert.equal(e.lossless_round_trip,true);
   assert.ok(e.changed_pixels>0);assert.ok(e.changed_bounds[3]<=150*(e.field==='image'?1:2));
  }
 }
 const goku=release.cards.find(c=>c.id==='trunks-166-goku-the-protector');
 assert.ok(goku.alignment.dy>0,'comma no longer lifts the title letter band');
 for(const r of release.masters){assert.equal(digest(fs.readFileSync(r.path)),r.after_sha256);assert.equal(digest(readHistoricalCardFile(r.path)),r.before_sha256);}
});
