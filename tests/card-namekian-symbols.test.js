import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {namekianRelease as release,beforeNamekianFile,beforeNamekianHash} from './helpers/namekian-symbol-history.js';
const hash=b=>createHash('sha256').update(b).digest('hex');

test('every Namekian card uses the dragon style mark, including both Masteries',()=>{
 assert.ok(release);assert.equal(release.corrected_card_count,59);assert.equal(release.export_count,118);
 assert.deepEqual(release.cards.map(r=>r.id).sort(),catalog.filter(c=>c.style==='Namekian').map(c=>c.id).sort());
 assert.equal(release.glyph_after,'龍');assert.equal(release.glyph_before,'無');
 const asset=fs.readFileSync(release.symbol_asset,'utf8');assert.equal(hash(Buffer.from(asset)),release.symbol_asset_sha256);
 const glyph=asset.match(/ d="([^"]+)"/)[1];
 assert.equal(release.cards.filter(r=>r.type==='Mastery').length,2);
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id),raw=fs.readFileSync(r.source.path,'utf8');
  assert.equal(hash(Buffer.from(raw)),r.source.after_sha256);
  assert.match(raw,/aria-label="Namekian (?:龍|&#x9[Ff]8[Dd];|&#40845;)"/);assert.match(raw,/data-symbol-revision="namekian-dragon-v1"/);
  assert.ok(raw.includes(glyph));assert.ok(r.helper_idempotent);
  assert.equal(hash(beforeNamekianFile(r.source.path)),r.source.before_sha256);
  for(const e of r.source.reversible_edits){
   assert.ok(['tokui-waza-symbol','tokui-waza-smoky-backing'].includes(e.id));
   assert.notEqual(e.before,e.after);
  }
  for(const e of r.exports){
   assert.equal(hash(fs.readFileSync(e.path)),e.after_sha256);
   assert.equal(beforeNamekianHash(e.path),e.before_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.equal(e.pixels_changed_outside_symbol_delta,0);assert.ok(e.lossless_round_trip);
   assert.ok(e.changed_pixels>0);assert.ok(e.old_native_max_channel_error<=4);
   const s=e.field==='image'?1:2;
   assert.deepEqual(e.size,[1060*s,1484*s]);
   assert.ok(e.changed_bounds[2]<360*s&&e.changed_bounds[1]>650*s&&e.changed_bounds[3]<1050*s);
  }
 }
});
