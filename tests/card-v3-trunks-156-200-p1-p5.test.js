import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-trunks-156-200-p1-p5/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Trunks 156–200 and P1–P5 use reviewed game data and retained artwork with current V3 text, footer and exports',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+156));assert.equal(checks.length,50);
 assert.deepEqual(catalog.filter(c=>data.some(d=>d.id===c.id)&&c.templateVersion===3).map(c=>c.id).sort(),data.map(d=>d.id).sort());
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
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
   const verified=check.exports.find(x=>x.path===e.path);assert.equal(verified.sha256,e.after_sha256);assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('Trunks final numbered cards and P1–P5 preserve original game values, CRD timing and masked repairs',()=>{
 const reviews=json(base+'artwork-review.json'),rules=json(base+'rules-review.json');assert.equal(reviews.length,50);assert.equal(rules.length,50);
 for(const r of reviews){assert.ok(r.display_reviewed&&r.download_reviewed);assert.equal(hash(r.original_scan),r.original_scan_sha256);assert.ok(r.observations.length>40);for(const e of r.exports)assert.equal(hash(e.path),e.sha256);}
 const value=n=>data.find(c=>c.number===n);const personalities=data.filter(d=>d.category.includes('PERSONALITY'));assert.equal(personalities.length,43);
 for(const d of personalities){const r=rows.find(r=>r.number===d.number),c=catalog.find(c=>c.id===d.id),svg=read(r.native_source_path);assert.deepEqual(r.personality_values,{level:d.level,pur:d.pur,stages:d.stages});assert.equal(c.level,d.level);assert.equal(c.pur,d.pur);assert.deepEqual(c.powerStages,d.stages);
  const values=[...svg.matchAll(/id="power-stage-value-\d+"[^>]* aria-label="([^"]+)"/g)].map(m=>Number(m[1].replaceAll(',','')));assert.deepEqual(values,d.stages);
  if(d.category.startsWith('VILLAIN')){const panel=svg.slice(svg.indexOf('id="shared-rules-component"'),svg.indexOf('id="shared-rules-outer-rail"'));assert.equal((panel.match(/fill="#8e1722"/g)||[]).length,4);assert.doesNotMatch(panel,/#0a4a96|#092b50/);}
  if(d.high_tech){assert.match(svg,/id="middle-foil-isolation"/);assert.match(svg,/retained-full-bleed-high-tech/);assert.equal(r.current_preview_revision.background_gain,1);}
 }
 assert.deepEqual(value(192).stages.slice(0,2),[1200000,1100000]);assert.equal(value(156).pur,5);assert.equal(value(159).level,4);assert.equal(value(160).level,4);
 assert.match(value(164).modern_rules,/Use during your Attack Phase/);assert.match(value(164).modern_rules,/you may search/);
 assert.match(value(165).modern_rules,/Use during your Attack Phase/);assert.match(value(165).modern_rules,/while at this level during this Combat/);
 assert.equal(value(166).power_icon,'block');assert.match(value(166).modern_rules,/Your anger cannot be lowered more than 1 level/);
 assert.doesNotMatch(value(180).modern_rules,/Kamino/);assert.match(value(185).modern_rules,/first attack in Combat/);assert.match(value(185).modern_rules,/2 cards or effects/);
 assert.match(value(195).modern_rules,/top card of your discard pile on the bottom of your Life Deck/);
 assert.equal(value(201).power_icon,null);assert.match(value(201).modern_rules,/Prevent the first 3 stages or life cards/);assert.match(value(202).modern_rules,/Heroes only/);
 assert.match(value(204).modern_rules,/Neither player/);assert.match(value(205).modern_rules,/AT \+5 stages\. Banish after use/);
 for(const d of data){const expected=d.number<=160?6:d.number<=200?4:2;assert.equal(d.rarity_stars,expected);const svg=read(rows.find(r=>r.id===d.id).native_source_path);assert.match(svg,new RegExp('id="footer-rarity"[^>]*data-star-count="'+expected+'"'));assert.match(svg,new RegExp('data-card-number="'+d.printed_number+'"'));}
 const repairs=json(base+'artwork-repair-verification.json');assert.equal(repairs.length,14);for(const r of repairs)for(const e of r.exports)assert.equal(e.pixels_changed_outside_native_mask_and_antialias_footprint,0);
 const baseline=json(base+'retained-art-baseline-check.json').filter(r=>r.checked_pixels);assert.equal(baseline.length,40);assert.ok(baseline.every(r=>r.max_channel_difference<=2));
 assert.equal(catalog.filter(c=>c.set==='Trunks Saga'&&c.templateVersion===3).length,205);
});
