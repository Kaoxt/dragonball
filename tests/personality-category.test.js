import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'tools/card-corrections/personality-category-2026-10-28/audit.json')));
const template=path.join(root,'tools/card-templates/main-personalities/category-labels');
const standard=JSON.parse(fs.readFileSync(path.join(template,'standard.json')));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('approved compact category references retain their reviewed outlines',()=>{
  assert.equal(standard.center_x,529.5);
  assert.equal(standard.source_glyph_stroke_width,225);
  for(const family of Object.values(standard.families)) assert.equal(hash(path.join(template,family.file)),family.sha256);
});

test('retained V2 Personalities have verified display and download lettering',()=>{
  const personalities=catalog.filter(c=>c.type==='Main Personality');
  const records=new Map(audit.map(r=>[r.id,r]));
  assert.equal(records.size,audit.length,'duplicate audit entries');
  assert.equal(records.size,personalities.length,'audit must cover the current complete Personality catalog');
  for(const card of personalities){
    // V3 is a whole-frame migration, validated by card-v3.test.js.
    // Preserve historical V2 audit evidence without imposing V2 geometry on V3.
    if(card.templateVersion===3)continue;
    const row=records.get(card.id);
    assert.ok(row,`${card.id}: run the category export audit before publication`);
    assert.ok(row.idempotent);
    assert.ok(['HERO PERSONALITY','VILLAIN PERSONALITY'].includes(row.category));
    const b=row.native.after??row.native.before;
    assert.ok(Math.abs(b[0]+b[2]/2-529.5)<.005,`${card.id}: category center`);
    assert.ok(Math.abs(b[1]+b[3]/2-918.3378378)<.005,`${card.id}: category vertical center`);
    assert.ok(Math.abs(b[2]-(row.category==='HERO PERSONALITY'?533.985:591.132))<.005,`${card.id}: category width`);
    assert.ok(Math.abs(b[3]-34.21875)<.005,`${card.id}: category height`);
    assert.equal(row.exports.length,2);
    for(const field of ['image','downloadImage']){
      const image=row.exports.find(e=>e.field===field);
      assert.ok(image,`${card.id}: missing ${field}`);
      const actual=hash(path.join(root,image.path));
      assert.equal(actual,image.after_sha256,`${card.id}: ${field} needs typography verification`);
      assert.equal(card[field].split('?')[0],image.path.replace(/^public/,''));
      assert.ok(card[field].includes(`v=${actual.slice(0,12)}`),`${card.id}: stale image revision`);
      assert.equal(image.pixels_changed_outside_mask,0);
      if(row.native.changed) assert.ok(image.lossless_round_trip);
      else assert.equal(image.before_sha256,image.category_revision_sha256??image.after_sha256);
      if(image.subsequent_artwork_revision){
        const revision=image.subsequent_artwork_revision;
        assert.equal(revision.before_sha256,image.typography_revision_sha256);
        assert.equal(revision.after_sha256,image.after_sha256);
        assert.equal(revision.pixels_changed_outside_costume_mask,0);
        assert.ok(revision.lossless_round_trip&&revision.category_crop_unchanged&&revision.title_crop_unchanged&&revision.power_text_unchanged);
      }
      if(image.subsequent_title_revision){
        assert.ok(image.subsequent_title_revision.category_crop_unchanged);
        assert.equal(image.subsequent_title_revision.before_sha256,image.category_revision_sha256);
        assert.equal(image.subsequent_title_revision.after_sha256,image.typography_revision_sha256??image.after_sha256);
      }
    }
  }
});
