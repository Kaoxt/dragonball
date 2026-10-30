import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(root,'tools/card-corrections/typography-2026-10-28');
const audit=JSON.parse(fs.readFileSync(path.join(folder,'title-export-audit.json')));
const native=JSON.parse(fs.readFileSync(path.join(folder,'power-native-audit.json')));
const power=JSON.parse(fs.readFileSync(path.join(folder,'power-export-audit.json')));
const alignment=JSON.parse(fs.readFileSync(path.join(folder,'power-alignment-audit.json')));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('V2 catalog cards retain verified smaller, visibly centered title exports',()=>{
  assert.equal(hash(path.join(root,'tools/card-templates/shared/Teko-SemiBold.ttf')),'c6e312589232623060ab3d55b86d2b2978c5f5af958e96781acaf0f7043bc9b3');
  const records=new Map(audit.map(r=>[r.id,r]));
  assert.equal(records.size,audit.length);assert.equal(records.size,catalog.length);
  for(const card of catalog){
    // V3 is a complete frame migration with its own measured geometry/export audit.
    // The historical V2 pixel-preservation contract does not describe that change.
    if(card.templateVersion===3)continue;
    const row=records.get(card.id);assert.ok(row,`${card.id}: missing title audit`);
    const m=row.metrics;assert.ok(Math.abs(m.font_size-77.43142144638405)<1e-8);
    assert.ok(Math.abs((m.bounds[1]+m.bounds[3])/2-72)<1e-6);
    assert.ok(m.bounds[1]>22&&m.bounds[3]<122,`${card.id}: title exceeds panel`);
    const landscape=row.exports[0].size[0]>row.exports[0].size[1];
    const expectedCenter=card.type==='Main Personality'?529.5:landscape?738:526;
    assert.ok(Math.abs((m.bounds[0]+m.bounds[2])/2-expectedCenter)<1e-6);
    if(card.type==='Main Personality')assert.ok(m.level_clearance>=24-1e-6,`${card.id}: LEVEL clearance`);
    for(const field of ['image','downloadImage']){
      const e=row.exports.find(e=>e.field===field);assert.ok(e);
      const actual=hash(path.join(root,e.path));assert.equal(actual,e.after_sha256,`${card.id} ${field}: stale export audit`);
      assert.equal(card[field].split('?')[0],e.path.replace(/^public/,''));
      assert.ok(card[field].includes(`v=${actual.slice(0,12)}`));
      if(e.subsequent_artwork_revision){
        const revision=e.subsequent_artwork_revision;
        assert.equal(revision.before_sha256,e.typography_revision_sha256);
        assert.equal(revision.after_sha256,e.after_sha256);
        assert.equal(revision.pixels_changed_outside_costume_mask,0);
        assert.ok(revision.lossless_round_trip&&revision.title_crop_unchanged&&revision.category_crop_unchanged&&revision.power_text_unchanged);
      }
      assert.equal(e.pixels_changed_outside_title_mask,0);assert.ok(e.lossless_round_trip&&e.power_text_unchanged);
    }
  }
});

test('all power text retains the approved font and reviewed final export evidence',()=>{
  const nativeMap=new Map(native.map(r=>[r.id,r]));const exportMap=new Map(power.cards.map(r=>[r.id,r]));
  const alignmentMap=new Map(alignment.map(r=>[r.id,r]));assert.equal(alignmentMap.size,catalog.length);
  assert.equal(nativeMap.size,catalog.length);assert.equal(exportMap.size,catalog.length);
  assert.equal(power.unresolved_text_components,0);
  for(const card of catalog){
    if(card.templateVersion===3)continue;
    const n=nativeMap.get(card.id);assert.ok(n);assert.equal(n.issue_count,0);
    for(const line of n.lines)assert.equal(line.issues.length,0);
    const p=exportMap.get(card.id);assert.ok(p);assert.equal(p.exports.length,2);
    const aligned=alignmentMap.get(card.id);assert.ok(aligned);
    for(const e of aligned.exports)for(const line of e.lines)assert.ok(Math.abs(line.center_error)<=.5,`${card.id}: power line center`);
    for(const e of p.exports){
      assert.ok(e.matched_components>0);
      for(const component of e.unmatched){
        const review=power.reviewed_icon_exceptions.find(x=>x.id===card.id&&x.field===e.field&&x.component.x===component.x&&x.component.y===component.y);
        assert.ok(review?.resolved&&review.classification==='constant-power-icon-colon',`${card.id}: unresolved component`);
      }
    }
  }
});

