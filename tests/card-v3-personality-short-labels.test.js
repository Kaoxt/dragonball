import {historicalCardHash, historicalCardSize, historicalCardGitHash, readHistoricalCardFile} from './helpers/title-width-history.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from './helpers/title-width-history.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readHistoricalCardFile(path.join(root,p));
const json=p=>JSON.parse(read(p));
const hash=p=>historicalCardHash(path.join(root,p));
const base='tools/card-corrections/v3-personality-short-labels/';

test('the original 134 V3 Personalities retain short native labels and independently verified lossless exports',()=>{
 const cards=catalog.filter(c=>c.templateVersion===3&&c.type.includes('Personality')&&['Saiyan Saga','Frieza Saga','Trunks Saga'].includes(c.set));
 const checks=json(base+'pixel-checks.json'),release=json(base+'release.json');
 assert.equal(cards.length,134);assert.equal(checks.length,134);
 assert.equal(release.cards,134);assert.equal(release.independently_verified_exports,268);
 assert.deepEqual(checks.map(c=>c.id).sort(),cards.map(c=>c.id).sort());
 assert.equal(release.pixels_changed_outside_category_ink_footprint,0);
 for(const check of checks){
  const card=cards.find(c=>c.id===check.id),row=json(check.audit_path).find(r=>r.id===check.id);
  assert.deepEqual(row.category_label_revision,check);
  const finish=row.personality_finish_revision,blue=row.hero_blue_revision,level=row.level_numeral_revision;
  assert.equal(finish?.before_native_sha256 ?? blue?.before_native_sha256 ?? level?.before_native_sha256 ?? hash(check.native_source_path),check.after_native_sha256);
  assert.equal(hash(check.native_source_path),row.native_source_sha256);
  assert.equal(row.native_source_sha256,level?.after_native_sha256 ?? blue?.after_native_sha256 ?? finish?.after_native_sha256 ?? check.after_native_sha256);
  assert.ok(check.unrelated_native_elements_unchanged&&check.helper_idempotent);
  assert.ok(['HERO','VILLAIN'].includes(check.label));
  assert.equal(check.before_label,check.label+' PERSONALITY');
  const svg=read(check.native_source_path).toString();
  assert.match(svg,new RegExp('id="card-category"[^>]*aria-label="'+check.label+'"'));
  const [x,y,w,h]=row.native_geometry.bounds['card-category'];
  assert.ok(Math.abs(x+w/2-529.5)<.002&&Math.abs(y+h/2-908.5)<.002);
  for(const a of row.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(check.exports.length,2);
  for(const e of check.exports){
   const levelExport=level?.exports.find(r=>r.path===e.path);
   const blueExport=blue?.exports.find(r=>r.path===e.path);
   const later=finish?.exports.find(r=>r.path===e.path) ?? blueExport,current=row.exports.find(r=>r.path===e.path);
   assert.equal(later?.before_sha256 ?? levelExport?.before_sha256 ?? hash(e.path),e.after_sha256);
   assert.equal(hash(e.path),current.after_sha256);
   assert.equal(current.after_sha256,levelExport?.after_sha256 ?? blueExport?.after_sha256 ?? later?.after_sha256 ?? e.after_sha256);
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+current.after_sha256.slice(0,12));
   assert.ok(e.lossless_round_trip&&e.changed_pixels>0);
   assert.equal(e.pixels_changed_outside_category_ink_footprint,0);
   assert.ok(e.old_render_max_channel_difference<=3);
   const scale=e.field==='image'?1:2;
   assert.ok(e.changed_pixel_bounds[1]>880*scale&&e.changed_pixel_bounds[3]<937*scale);
  }
 }
});

test('the two Personality masters retain the approved fixed short labels',()=>{
 const folder='tools/card-templates/v3/';
 const manifest=json(folder+'assets/text/categories/manifest.json');
 for(const [file,label] of [['Personality-Master-V3.svg','HERO'],['Personality-Villain-Master-V3.svg','VILLAIN']]){
  assert.match(read(folder+'masters/'+file).toString(),new RegExp('id="card-category"[^>]*aria-label="'+label+'"'));
  const g=manifest[label].geometry;assert.deepEqual(g.visible_center,[529.5,908.5]);
  assert.equal(g.font,'Michroma');assert.equal(g.font_size,38.4);assert.equal(g.tracking,4);
 }
});

test('each published Personality has the verified card number, Level, and matching numeral and shadow',()=>{
 const components=json('tools/card-templates/v3/assets/text/personality-levels.json');
 const cards=new Map(catalog.filter(card=>card.type.includes('Personality')).map(card=>[card.id,card]));
 const checked=new Set();
 for(const directory of fs.readdirSync(path.join(root,'tools/card-corrections'))){
  const folder='tools/card-corrections/'+directory+'/';
  if(!directory.startsWith('v3-')||!fs.existsSync(path.join(root,folder+'cards.json'))||
     !fs.existsSync(path.join(root,folder+'audit.json')))continue;
  const rows=json(folder+'audit.json');
  if(!Array.isArray(rows))continue;
  const targets=rows.filter(row=>row.native_source_path&&cards.has(row.id));
  if(!targets.length)continue;
  const source=new Map(json(folder+'cards.json').map(card=>[card.id,card]));
  for(const row of targets){
   const card=cards.get(row.id),record=source.get(row.id);
   assert.ok(record,card.id);
   assert.equal(String(record.number),String(card.number),card.id);
   const svg=read(row.native_source_path).toString();
   const tag=id=>svg.match(new RegExp('<[^<>]*\\bid="'+id+'"[^<>]*>'))?.[0]??'';
   const attribute=(node,key)=>node.match(new RegExp('\\b'+key+'="([^"]*)"'))?.[1];
   assert.equal(attribute(tag('card-number'),'aria-label'),String(card.number),card.id);
   for(const id of ['v3-level-number','v3-level-number-soft-shadow']){
    const node=tag(id);
    assert.equal(attribute(node,'aria-label'),String(record.level),card.id);
    for(const [key,value] of Object.entries(components[record.level])){
     assert.equal(attribute(node,key),value,card.id+' '+id+' '+key);
    }
   }
   if(row.level_numeral_revision){
    const revision=row.level_numeral_revision;
    assert.equal(hash(row.native_source_path),revision.after_native_sha256,card.id);
    assert.equal(revision.exports.length,2);
    for(const image of revision.exports){
     assert.equal(hash(image.path),image.after_sha256,card.id);
     assert.equal(image.pixels_changed_outside_level_ink,0,card.id);
     assert.ok(image.changed_pixels>0&&image.lossless_round_trip);
    }
   }
   assert.ok(!checked.has(card.id),card.id);
   checked.add(card.id);
  }
 }
 assert.deepEqual(checked,new Set(cards.keys()));
});
