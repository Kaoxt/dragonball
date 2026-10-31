import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const batches=['001-050','051-100','101-150'].map(range=>JSON.parse(fs.readFileSync(path.join(root,`tools/card-corrections/v3-saiyan-${range}/audit.json`))));
const audit=batches.flat();
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const near=(a,b,t=.25)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
test('all 150 V3 catalog cards have complete verified native sources and both exports',()=>{
 const selected=catalog.filter(c=>c.templateVersion===3);
 assert.equal(selected.length,150);assert.equal(audit.length,150);
 for(const batch of batches)assert.equal(batch.length,50);
 assert.equal(new Set(audit.map(r=>r.id)).size,150);
 assert.deepEqual(audit.map(r=>r.number),Array.from({length:150},(_,i)=>i+1));
 for(const c of selected){
  const row=audit.find(r=>r.id===c.id);assert.ok(row,c.id);
  const source=path.join(root,row.native_source_path);assert.equal(hash(source),row.native_source_sha256);
  const svg=fs.readFileSync(source,'utf8');assert.ok(!/<(?:\w+:)?text[\s>]/.test(svg));
  assert.ok(svg.includes('data-template-version="3"'));
  for(const a of row.assets)assert.equal(hash(path.join(root,a.path)),a.sha256,`${c.id}: missing or stale raster layer`);
  assert.ok(row.assets.length>=3,`${c.id}: illustration/texture layers missing`);
  for(const e of row.exports){
   const digest=hash(path.join(root,e.path));assert.equal(digest,e.after_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+digest.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.equal(e.lossless_round_trip,true);
  }
 }
});
test('V3 titles, category labels, footer content and icons share the approved geometry',()=>{
 for(const row of audit){
  const v=row.native_geometry;assert.equal(v.native_outlined_text,true);
  for(const [id,x,y] of [['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5],['footer-rarity',844,1409.5]]){
   const [bx,by,w,h]=v.bounds[id];near(bx+w/2,x);near(by+h/2,y);
  }
  const num=v.bounds['card-number'];near(num[0],880);near(num[1]+num[3]/2,1409.5);
  assert.ok(v.icons.length<=1);
  for(const icon of v.icons){near(icon.center_error,0,.01);near(icon.new_visible_bounds[3],34.3,.1);}
  for(const [id,b] of Object.entries(v.bounds))if(id.startsWith('rules-line-'))assert.ok(b[1]>=1000&&b[1]+b[3]<1310);
  if(![15,16].includes(row.number)){if(row.artwork.subject_crop!==undefined)assert.equal(row.artwork.subject_crop,0);else assert.equal(row.artwork.horizontal_source_crop,0);assert.equal(row.artwork.artwork_bytes_retained,true);}
 }
});

test('V3 Personality numerals and stage digits keep their approved positions',()=>{
 const personalities=audit.filter(r=>(r.number>=82&&r.number<=87)||(r.number>=104&&r.number<=107));
 assert.equal(personalities.length,10);
 for(const row of personalities){
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');
  assert.ok(svg.includes('id="v3-level-number"'));assert.ok(svg.includes('id="concept-pur-number"'));
  assert.ok(svg.includes('data-digit-center-y="27"'));
  assert.ok(svg.includes('data-treatment="Native translucent tint over current card artwork"'));
  assert.ok(!svg.includes('earlier-stage-gap-source'),'stage gaps must not contain donor-card artwork');
  const stageBounds=Object.entries(row.native_geometry.bounds).filter(([id])=>id.startsWith('power-stage-value-'));
  assert.equal(stageBounds.length,11);
  for(const [id,b] of stageBounds){
   const index=Number(id.split('-').at(-1));
   near(b[0]+b[2],1031);near(b[1],160.009+index*64.6818181818182,.01);
  }
 }
});
test('Saiyan Energy Throw retains its original energy attack and current wording conversion',()=>{
 const row=audit.find(r=>r.number===91);const rules=row.rules.map(r=>r.text).join(' ');
 assert.equal(rules,'Saiyan Heritage only. Energy attack costing 4 stages. DAMAGE: 7 life cards. Banish after use.');
 assert.ok(!rules.includes('AT stages')&&!rules.includes('next phase'));
});

test('Chiaotzu banishment stays an attack cost and drill effects keep their timing',()=>{
 const rules=n=>audit.find(r=>r.number===n).rules.map(r=>r.text).join(' ');
 assert.match(rules(105),/costing 2 stages/);assert.match(rules(105),/banishing Chiaotzu/i);assert.ok(!rules(105).includes('Banish after use'));
 assert.match(rules(126),/Once per Combat/);assert.match(rules(126),/in place of an attack/);
 assert.match(rules(135),/any Orange Drill/);assert.match(rules(136),/any other Black Drill/);
 assert.match(rules(139),/do not carry over between attacks/);
});
