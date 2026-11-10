import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from './helpers/pre-world-games-catalog.js';
import {beforeNamekianWeightStrokeFile,beforeNamekianWeightStrokeHash} from './helpers/namekian-weight-history.js';
import {namekianStrokeRelease as release,beforeNamekianStrokeFile,beforeNamekianStrokeHash} from './helpers/namekian-stroke-history.js';
const hash=b=>createHash('sha256').update(b).digest('hex');

test('Namekian uses the matching rounded stroke family with unrelated pixels preserved',()=>{
 assert.ok(release);assert.equal(release.corrected_card_count,59);assert.equal(release.export_count,118);
 assert.deepEqual(release.cards.map(r=>r.id).sort(),catalog.filter(c=>c.style==='Namekian').map(c=>c.id).sort());
 assert.equal(release.glyph_after,'瑪');assert.equal(release.glyph_before,'瑪');
 const asset=fs.readFileSync(release.symbol_asset,'utf8');assert.equal(hash(Buffer.from(asset)),release.symbol_asset_sha256);
 const glyphs=[...asset.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]);assert.equal(glyphs.length,14);
 assert.equal(release.cards.filter(r=>r.type==='Mastery').length,2);
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id),raw=beforeNamekianWeightStrokeFile(r.source.path).toString('utf8');
  assert.equal(hash(Buffer.from(raw)),r.source.after_sha256);
  assert.match(raw,/aria-label="Namekian (?:瑪|&#x746[Aa];|&#29802;)"/);assert.match(raw,/data-symbol-revision="namekian-strokes-v3"/);
  for(const glyph of glyphs)assert.ok(raw.includes(glyph));assert.ok(r.helper_idempotent);
  assert.match(raw,/stroke-width="7.69230769"/);assert.match(raw,/stroke-linecap="round"/);assert.match(raw,/stroke-linejoin="round"/);
  assert.equal(hash(beforeNamekianStrokeFile(r.source.path)),r.source.before_sha256);
  for(const e of r.source.reversible_edits){
   assert.ok(['tokui-waza-symbol','tokui-waza-smoky-backing'].includes(e.id));
   assert.notEqual(e.before,e.after);
  }
  for(const e of r.exports){
   assert.equal(beforeNamekianWeightStrokeHash(e.path),e.after_sha256);
   assert.equal(beforeNamekianStrokeHash(e.path),e.before_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(e.pixels_changed_outside_symbol_delta,0);assert.ok(e.lossless_round_trip);
   assert.ok(e.changed_pixels>0);assert.ok(e.old_native_max_channel_error<=4);
   const s=e.field==='image'?1:2;
   assert.deepEqual(e.size,[1060*s,1484*s]);
   assert.ok(e.changed_bounds[2]<360*s&&e.changed_bounds[1]>650*s&&e.changed_bounds[3]<1050*s);
  }
 }
});
