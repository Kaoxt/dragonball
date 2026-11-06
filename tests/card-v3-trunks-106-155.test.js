import {historicalCardHash, historicalCardSize, historicalCardGitHash, readHistoricalCardFile} from './helpers/title-width-history.js';
import {beforeCategoryNative, beforeCategoryExport} from './helpers/card-category-revision.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {catalog} from './helpers/title-width-history.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-trunks-106-155/';
const read=p=>readHistoricalCardFile(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>historicalCardHash(path.join(root,p));
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Trunks 106–155 use reviewed game data and retained artwork with current V3 text, footer and exports',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+106));assert.equal(checks.length,50);
 assert.deepEqual(catalog.filter(c=>c.set==='Trunks Saga'&&c.templateVersion===3&&Number(c.number)>=106&&Number(c.number)<=155).map(c=>Number(c.number)),Array.from({length:50},(_,i)=>i+106));
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,beforeCategoryNative(r));
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Trunks Saga"/);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);assert.ok(check.title_helper_idempotent);
  assert.ok(r.rules.length<=5);assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);
  for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  if(r.artwork.source_sha256)assert.ok(r.assets.some(a=>a.sha256===r.artwork.source_sha256));assert.equal(r.artwork.additional_zoom,false);
  const b=r.native_geometry.bounds;
  for(const [id,x,y] of [['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const id of ['footer-rarity','card-number'])near(b[id][1]+b[id][3]/2,1409.5);
  assert.ok(r.current_preview_revision.footer_idempotent);
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.ok(e.lossless_round_trip);
   const verified=check.exports.find(x=>x.path===e.path);assert.equal(verified.sha256,beforeCategoryExport(r,e));assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('Trunks 106–155 preserve original values, reviewed rules, three Porunga cards and the approved Mastery family',()=>{
 const reviews=json(base+'artwork-review.json'),rules=json(base+'rules-review.json');assert.equal(reviews.length,50);assert.equal(rules.length,50);
 for(const r of reviews){
  assert.ok(r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>40);
  for(const e of r.exports){
   const row=rows.find(x=>x.exports.some(current=>current.path===e.path));assert.ok(row);
   assert.equal(row.category_label_revision?beforeCategoryExport(row,e):hash(e.path),e.sha256);
  }
 }
 const value=n=>data.find(c=>c.number===n);assert.equal(value(109).pur,2);assert.equal(value(110).pur,1);
 assert.match(value(133).modern_rules,/bottom of your Life Deck/);assert.doesNotMatch(value(129).modern_rules,/Limit/);
 assert.match(value(118).modern_rules,/When entering Combat powers/);assert.match(value(140).modern_rules,/additional card during the Rejuvenation Step/);
 assert.doesNotMatch(value(155).modern_rules,/Destructo-Disk|COST:/);assert.match(value(155).modern_rules,/DAMAGE: 5 life cards/);
 for(const n of [150,151])assert.match(value(n).modern_rules,/all damage from physical attacks against you is reduced to 1 stage/);
 const personalities=data.filter(c=>c.category.includes('PERSONALITY'));assert.equal(personalities.length,12);
 for(const d of personalities){const r=rows.find(r=>r.number===d.number),c=catalog.find(c=>c.id===d.id),svg=read(r.native_source_path);assert.deepEqual(r.personality_values,{level:d.level,pur:d.pur,stages:d.stages});assert.equal(c.pur,d.pur);assert.equal(c.level,d.level);assert.deepEqual(c.powerStages,d.stages);
  const values=[...svg.matchAll(/id="power-stage-value-\d+"[^>]* aria-label="([^"]+)"/g)].map(m=>Number(m[1].replaceAll(',','')));assert.deepEqual(values,d.stages);
  if(d.category.startsWith('VILLAIN')){const panel=svg.slice(svg.indexOf('id="shared-rules-component"'),svg.indexOf('id="shared-rules-outer-rail"'));assert.equal((panel.match(/fill="#8e1722"/g)||[]).length,4);assert.doesNotMatch(panel,/#0a4a96|#092b50/);}
 }
 for(const [n,stars]of [[113,6],[114,7],[136,5]]){const r=rows.find(r=>r.number===n),svg=read(r.native_source_path);assert.ok(r.artwork.approved_artwork_exception);assert.equal(r.artwork.background_gain,1);assert.match(svg,/id="porunga-full-art"/);assert.match(svg,new RegExp('id="dragon-ball-left-emblem"[^>]*data-star-count="'+stars+'"'));const p=json(base+'artwork-preservation.json').find(x=>x.number===n);assert.equal(p.changed_artwork_pixels,0);assert.ok(p.checked_artwork_pixels>2000000);}
 for(const n of json(base+'native-personality-numerals.json')){const svg=read(rows.find(r=>r.number===n.number).native_source_path);const tag=svg.match(new RegExp('<[^>]*id="'+n.id+'"[^>]*>'))[0];const d=tag.match(/ d="([^"]+)"/)[1];assert.equal(createHash('sha256').update(d).digest('hex'),n.reference_outline_sha256);assert.ok(n.original_retained_outline_matches);}
 const masteryHash='10948151b2cb82fa190ec88cdf52e8ab8db469acf4c3c7baaf13096f1a17a78c';const sourceBase='tools/card-templates/v3/masters/mastery-v3-source/';const source=json(sourceBase+'manifest.json');const chunks=source.parts.map(p=>{assert.equal(hash(sourceBase+p.file),p.sha256);return readHistoricalCardFile(path.join(root,sourceBase+p.file));});assert.equal(createHash('sha256').update(gunzipSync(Buffer.concat(chunks))).digest('hex'),masteryHash);
 for(const n of [144,145,146,147,148,149]){const r=rows.find(r=>r.number===n),svg=read(r.native_source_path);assert.equal(r.family,'MASTERY');assert.equal(r.artwork.mastery_approved_source_sha256,masteryHash);assert.match(svg,/M16 146H1043V600L529.5 852L16 600Z/);assert.match(svg,/M36.5 610.06037V953.4L48 965/);assert.match(svg,/M1022.5 610.06037V952.4L1010 965/);assert.match(svg,/mastery-surround-painted-edge-mask/);assert.match(svg,/translate\(249.5 868\) scale\(0?\.5283018867\d* 0?\.81\)/);}
 assert.match(read(rows.find(r=>r.number===147).native_source_path),/id="namekian-frame-hue"/);
 const blue=rows.find(r=>r.number===149);assert.ok(blue.artwork.expression_patch_retained);assert.match(read(blue.native_source_path),/id="retained-149-approved-mouth"/);const mouth=json(base+'artwork-preservation.json').find(x=>x.number===149);assert.equal(mouth.changed_artwork_pixels,0);
 for(const d of data){assert.equal(d.rarity_stars,d.number<=111?2:3);assert.match(read(rows.find(r=>r.number===d.number).native_source_path),new RegExp('id="footer-rarity"[^>]*data-star-count="'+d.rarity_stars+'"'));}
 const baseline=json(base+'retained-art-baseline-check.json').filter(r=>r.checked_pixels);assert.equal(baseline.length,47);assert.ok(baseline.every(r=>r.pixels_with_difference_above_2===0));
 assert.equal(catalog.filter(c=>c.set==='Trunks Saga'&&c.templateVersion===3&&Number(c.number)<=155).length,155);
});
