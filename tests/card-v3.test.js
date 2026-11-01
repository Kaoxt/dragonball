import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const batches=['001-050','051-100','101-150','151-170','171-220','221-250-promos'].map(range=>JSON.parse(fs.readFileSync(path.join(root,`tools/card-corrections/v3-saiyan-${range}/audit.json`))));
const audit=batches.flat();
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const near=(a,b,t=.25)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
for(const [range,start] of [['001-050',1],['051-100',51],['101-150',101]])test(`Saiyan ${range} footer centering retains every unrelated pixel in both exports`,()=>{
 const dir=path.join(root,`tools/card-corrections/v3-saiyan-${range}-footer-centering`);
 const release=JSON.parse(fs.readFileSync(path.join(dir,'release.json')));
 const checks=JSON.parse(fs.readFileSync(path.join(dir,'pixel-checks.json')));
 assert.equal(release.cards,50);assert.equal(release.independently_verified_exports,100);
 assert.equal(release.pixels_changed_outside_footer_ink_footprint,0);
 assert.deepEqual(checks.map(c=>c.number),Array.from({length:50},(_,i)=>i+start));
 assert.equal(audit.filter(r=>r.footer_spacing_revision).length,150);
 for(const c of checks){
  const row=audit.find(r=>r.id===c.id),card=catalog.find(r=>r.id===c.id);
  assert.deepEqual(row.footer_spacing_revision,c);assert.ok(c.helper_idempotent&&c.unrelated_native_elements_unchanged);
  near(c.saga_center_x,211.75,.002);near(c.right_group_center_x,847.25,.002);
  assert.equal(hash(path.join(root,c.native_source_path)),c.after_native_sha256);
  assert.equal(row.native_source_sha256,c.after_native_sha256);
  for(const a of row.assets)assert.equal(hash(path.join(root,a.path)),a.sha256);
  const svg=fs.readFileSync(path.join(root,c.native_source_path),'utf8');
  assert.match(svg,/data-footer-layout="mirrored-side-group-centers-v1"/);
  for(const e of c.exports){
   assert.equal(hash(path.join(root,e.path)),e.after_sha256);
   assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.ok(e.changed_pixels>0&&e.lossless_round_trip);
   assert.equal(e.pixels_changed_outside_footer_ink_footprint,0);assert.equal(e.pixels_changed_above_footer,0);
   assert.ok(e.old_render_max_channel_difference<=3);
   const scale=e.field==='image'?1:2;
   assert.ok(e.changed_pixel_bounds[1]>=1380*scale&&e.changed_pixel_bounds[3]<=1440*scale);
  }
 }
});
test('Frieza 1–10 retain their rules and artwork fixes with a centered native footer emblem',()=>{
 const dir=path.join(root,'tools/card-corrections/v3-frieza-001-010');
 const rows=JSON.parse(fs.readFileSync(path.join(dir,'audit.json')));
 const checks=JSON.parse(fs.readFileSync(path.join(dir,'render-verification.json')));
 const cards=JSON.parse(fs.readFileSync(path.join(dir,'cards.json')));
 const selected=catalog.filter(c=>c.set==='Frieza Saga'&&c.templateVersion===3&&Number(c.number)<=10);
 assert.deepEqual(selected.map(c=>Number(c.number)),Array.from({length:10},(_,i)=>i+1));
 assert.equal(rows.length,10);assert.equal(checks.length,10);
 for(const c of selected){
  const row=rows.find(r=>r.id===c.id),check=checks.find(r=>r.number===Number(c.number));
  const source=path.join(root,row.native_source_path),svg=fs.readFileSync(source,'utf8');
  assert.equal(hash(source),row.native_source_sha256);assert.equal(check.native_source_sha256,row.native_source_sha256);
  assert.ok(!/<(?:\w+:)?text[\s>]/.test(svg));assert.ok(svg.includes('data-set="Frieza Saga"'));
  assert.equal(c.rules,row.rules.map(r=>r.text).join(' '));assert.equal(c.rules,cards.find(r=>r.id===c.id).modern_rules);
  assert.ok(row.rules.length<=5);assert.equal(row.power_icon,'attack');assert.equal(row.native_geometry.icons.length,1);
  near(row.native_geometry.icons[0].center_error,0,.01);assert.ok(row.tokui_waza_backing.all_styles);
  for(const [id,cx,cy] of [['card-title',529.5,79],['card-category',529.5,908.5],['saga-emblem',211.75,1409.5]]){
   const [x,y,w,h]=row.native_geometry.bounds[id];near(x+w/2,cx,.01);near(y+h/2,cy,.01);
  }
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);assert.ok(check.title_helper_idempotent);
  for(const a of row.assets)assert.equal(hash(path.join(root,a.path)),a.sha256);
  for(const e of row.exports){
   assert.equal(hash(path.join(root,e.path)),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.ok(e.lossless_round_trip);
   assert.ok(check.exports.find(x=>x.path===e.path).decoded_pixels_match_render);
  }
 }
 assert.ok(rows.find(r=>r.number===4).artwork.current_approved_background_retained);
 assert.ok(rows.find(r=>r.number===4).artwork.localized_background_patch);
 assert.ok(rows.find(r=>r.number===7).artwork.expression_patch_retained);
 assert.match(cards.find(r=>r.number===5).modern_rules,/costing 3 stages/);
 assert.match(cards.find(r=>r.number===8).modern_rules,/^Saiyan Heritage only\./);
 assert.equal(catalog.filter(c=>c.templateVersion===3).length,317);
});
test('all 257 Saiyan Saga cards have complete verified V3 native sources and both exports',()=>{
 const selected=catalog.filter(c=>c.templateVersion===3&&c.set==='Saiyan Saga');
 assert.equal(selected.length,257);assert.equal(audit.length,257);
 assert.deepEqual(selected.map(c=>c.id).sort(),catalog.filter(c=>c.set==='Saiyan Saga').map(c=>c.id).sort());
 assert.deepEqual(batches.map(batch=>batch.length),[50,50,50,20,50,37]);
 assert.equal(new Set(audit.map(r=>r.id)).size,257);
 assert.deepEqual(audit.map(r=>r.number),[...Array.from({length:250},(_,i)=>i+1),...Array.from({length:7},(_,i)=>`P${i+1}`)]);
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

test('the final Saiyan cards and promos retain reviewed rules, level-four glyphs and verified exports',()=>{
 const rows=batches.at(-1),dir=path.join(root,'tools/card-corrections/v3-saiyan-221-250-promos');
 const cards=JSON.parse(fs.readFileSync(path.join(dir,'cards.json')));
 const checks=JSON.parse(fs.readFileSync(path.join(dir,'render-verification.json')));
 const artwork=JSON.parse(fs.readFileSync(path.join(dir,'artwork-review.json')));
 assert.equal(checks.length,37);assert.equal(artwork.length,37);
 const donor=fs.readFileSync(path.join(root,audit.find(r=>r.number===175).native_source_path),'utf8');
 const pathData=(svg,id)=>svg.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))[0].match(/\sd="([^"]+)"/)[1];
 const four=pathData(donor,'concept-pur-number');
 for(const row of rows){
  const c=cards.find(c=>c.id===row.id),check=checks.find(c=>c.number===row.number);
  assert.equal(check.native_source_sha256,row.villain_corner_revision?.before_native_sha256 ?? row.native_source_sha256);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);assert.ok(check.title_helper_idempotent);
  for(const e of check.exports){assert.equal(row.villain_corner_revision?.exports.find(x=>x.path===e.path).before_sha256 ?? hash(path.join(root,e.path)),e.sha256);assert.ok(e.decoded_pixels_match_render);}
  const a=artwork.find(a=>a.id===row.id);assert.ok(a.display_reviewed);assert.ok(a.observations.length>30);assert.equal(hash(path.join(root,a.original_scan)),a.original_scan_sha256);
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');
  assert.ok(svg.includes(`data-star-count="${c.rarity_stars}"`));
  if(c.level===4){assert.equal(pathData(svg,'v3-level-number'),four);assert.equal(pathData(svg,'v3-level-number-soft-shadow'),four);assert.equal(pathData(svg,'concept-pur-number'),four);}
 }
 const rules=n=>rows.find(r=>r.number===n).rules.map(x=>x.text).join(' ');
 assert.match(rules(228),/^\(Limit 1 per deck\.\)/);
 assert.match(rules(234),/unless you advance or lose a Personality level/);
 assert.match(rules(240),/shuffle their Life Deck/);assert.match(rules(241),/owners' Life Decks\. Do not use their powers/);
 assert.match(rules(246),/more than one Saibaimen is in play:/);
 assert.match(rules('P2'),/one after the other/);assert.match(rules('P2'),/AT stages each/);
 for(const n of [243,244,245])assert.equal(rows.find(r=>r.number===n).native_geometry.icons.length,0);
 for(const n of [247,'P7'])assert.equal(rows.find(r=>r.number===n).power_icon,'block');
 assert.equal(rows.find(r=>r.number===233).artwork.expression_patch_retained,true);
});

test('scarlet Villain paint and all seven Hi-Tech bars preserve unrelated published pixels',()=>{
 const checks=JSON.parse(fs.readFileSync(path.join(root,'tools/card-corrections/v3-personality-middle-bars/pixel-checks.json')));
 assert.equal(checks.length,16);assert.equal(checks.filter(c=>c.treatment.hi_tech_isolated).length,7);
 let villains=0,highTech=0;
 for(const row of audit){
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');
  if(svg.includes('aria-label="VILLAIN PERSONALITY"')){villains++;assert.match(svg,/fill="#cc2119"/);}
  if(row.high_tech){highTech++;assert.match(svg,/id="middle-foil-isolation"/);}
 }
 assert.equal(villains,19);assert.equal(highTech,7);
 for(const c of checks){
  const row=audit.find(r=>r.id===c.id);assert.equal(c.after_native_sha256,row.villain_corner_revision?.before_native_sha256 ?? hash(path.join(root,row.native_source_path)));
  assert.deepEqual(row.middle_bar_revision,c);assert.ok(c.native_components_outside_middle_unchanged);assert.ok(c.helper_idempotent);
  for(const e of c.exports){assert.equal(e.after_sha256,row.villain_corner_revision?.exports.find(x=>x.path===e.path).before_sha256 ?? hash(path.join(root,e.path)));assert.equal(e.pixels_changed_outside_middle_band,0);assert.ok(e.pixels_changed>0);assert.ok(e.lossless_round_trip);assert.ok(e.old_render_max_channel_difference<=3);}
 }
});
test('V3 titles, category labels, footer content and icons share the approved geometry',()=>{
 for(const row of audit){
  const v=row.native_geometry;assert.equal(v.native_outlined_text,true);
  for(const [id,x,y] of [['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5]]){
   const [bx,by,w,h]=v.bounds[id];near(bx+w/2,x);near(by+h/2,y);
  }
  const num=v.bounds['card-number'],ball=v.bounds['footer-rarity'];near(num[1]+num[3]/2,1409.5);near(ball[1]+ball[3]/2,1409.5);
  if(row.footer_spacing_revision){
   near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,847.25,.002);
   near(num[0]-ball[0]-ball[2],12.2,.002);
  }else{near(num[0],880);near(ball[0]+ball[2]/2,844);}
  assert.ok(v.icons.length<=1);
  for(const icon of v.icons){near(icon.center_error,0,.01);near(icon.new_visible_bounds[3],row.power_icon_revision==='approved-bold-infinity-colon-v16'?19.29375:34.3,.1);}
  for(const [id,b] of Object.entries(v.bounds))if(id.startsWith('rules-line-'))assert.ok(b[1]>=1000&&b[1]+b[3]<1310);
  if(![15,16,75,76,77].includes(row.number)){if(row.artwork.subject_crop!==undefined)assert.equal(row.artwork.subject_crop,0);else assert.equal(row.artwork.horizontal_source_crop,0);assert.equal(row.artwork.artwork_bytes_retained,true);}
 }
});

test('V3 Personality numerals and stage digits keep their approved positions',()=>{
 const personalities=audit.filter(r=>(r.number>=82&&r.number<=87)||(r.number>=104&&r.number<=107)||(r.number>=158&&r.number<=185)||(r.number>=243&&r.number<=246)||/^P[1-7]$/.test(r.number));
 assert.equal(personalities.length,49);
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

// Current approved refresh contains mixed card families and a constant-icon size exception.
test('Saiyan 71–120 preserves family exceptions and the reviewed Dragon Ball mechanics',()=>{
 const rows=audit.filter(r=>r.number>=71&&r.number<=120);assert.equal(rows.length,50);
 assert.equal(rows.filter(r=>r.tokui_waza_backing?.all_styles===true).length,37);
 for(const n of [75,76,77]){
  const row=rows.find(r=>r.number===n);assert.equal(row.artwork.approved_replacement,'Shenron-No-Central-Ball.png');
  assert.equal(row.current_preview_revision.dragon_ball.count,n-72);
  assert.deepEqual(row.current_preview_revision.dragon_ball.center,[130,887]);
  assert.equal(row.tokui_waza_backing.applies,false);
 }
 for(const n of [81,88]){
  const row=rows.find(r=>r.number===n);assert.equal(row.power_icon_revision,'approved-bold-infinity-colon-v16');
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');
  assert.ok(svg.includes('id="constant-infinity-symbol"'));assert.ok(svg.includes('approved-bold-infinity-colon-v16'));
 }
 const three=rows.find(r=>r.number===75).rules.map(r=>r.text).join(' ');
 assert.equal(three,'You may draw 3 cards. Place the top card of your discard pile on the bottom of your Life Deck.');
});


test('Saiyan 121–170 keeps long titles inside the brush and uses reviewed family icons',()=>{
 const rows=audit.filter(r=>r.number>=121&&r.number<=170);assert.equal(rows.length,50);
 assert.equal(rows.filter(r=>r.tokui_waza_backing?.all_styles).length,37);
 assert.equal(rows.filter(r=>r.power_icon_revision==='approved-bold-infinity-colon-v16').length,26);
 for(const row of rows){
  const fit=row.current_preview_revision.title_fit;assert.ok(fit.visible_width<=760.001);
  assert.deepEqual(fit.visible_center,[529.5,79]);assert.ok(fit.font_size<=fit.nominal_font_size);
  const [x,y,w,h]=row.native_geometry.bounds['card-title'];assert.ok(x>=149.49&&x+w<=909.51);near(y+h/2,79,.01);
  if(row.number>=158)assert.equal(row.tokui_waza_backing.applies,false);
 }
 const long=rows.find(r=>r.number===125);near(long.current_preview_revision.title_fit.font_size,64.96837066165156,.00001);
 const rules=n=>rows.find(r=>r.number===n).rules.map(r=>r.text).join(' ');
 assert.equal(rules(153),'Stops a physical attack. Banish after use.');
 assert.equal(rules(154),'Stops an energy attack. Banish after use.');
 assert.match(rules(170),/Reduce damage from an energy attack against you to 2 life cards/);
 for(const n of [160,164,169,170])assert.equal(rows.find(r=>r.number===n).native_geometry.icons.length,0);
 for(const n of [165,166]){
  const row=rows.find(r=>r.number===n);const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');
  assert.ok(svg.includes(`id="gohan-${n}-demon-badge-patch"`));
  const correction=row.artwork.current_costume_correction;assert.equal(hash(path.join(root,correction.patch_asset)),correction.patch_sha256);
 }
});

test('all 170 V3 titles use complete visible-ink centering and preserve unrelated pixels',()=>{
 const dir=path.join(root,'tools/card-corrections/v3-saiyan-001-170-titles');
 const release=JSON.parse(fs.readFileSync(path.join(dir,'release.json')));
 const checks=JSON.parse(fs.readFileSync(path.join(dir,'title-checks.json')));
 const pixels=JSON.parse(fs.readFileSync(path.join(dir,'pixel-checks.json')));
 assert.equal(checks.length,170);assert.equal(pixels.length,53);
 assert.equal(release.cards_byte_identical,117);assert.equal(release.pixel_preservation.pixels_changed_outside_title_footprint,0);
 for(const c of checks){
  const row=audit.find(r=>r.id===c.id);assert.ok(row);
  const f=c.fit;assert.ok(f.visible_width<=f.max_width+.00001&&f.max_width<=760);
  near(c.after_center[0],529.5,.00001);near(c.after_center[1],79,.00001);
  assert.equal(c.helper_idempotent,true);assert.equal(c.unrelated_native_elements_unchanged,true);
  assert.equal(c.after_native_sha256,row.middle_bar_revision?.before_native_sha256 ?? row.footer_spacing_revision?.before_native_sha256 ?? row.villain_corner_revision?.before_native_sha256 ?? row.native_source_sha256);
  near(f.font_size,row.current_preview_revision.title_fit.font_size,.00001);
  if(!c.needs_smaller_font)near(f.font_size,f.nominal_font_size,.00001);
  else {assert.ok(f.font_size<f.nominal_font_size);near(f.visible_width,f.max_width,.00001);}
  for(const e of c.exports){assert.equal(row.middle_bar_revision?.exports.find(x=>x.field===e.field).before_sha256 ?? row.footer_spacing_revision?.exports.find(x=>x.field===e.field).before_sha256 ?? row.villain_corner_revision?.exports.find(x=>x.field===e.field).before_sha256 ?? hash(path.join(root,e.path)),e.after_sha256);assert.equal(e.byte_identical,!c.visual_change);}
  if(!c.visual_change){assert.equal(c.before_native_sha256,c.after_native_sha256);continue;}
  const p=pixels.find(p=>p.id===c.id);assert.ok(p);assert.equal(p.new_title_pixels_outside_brush_contour,0);assert.ok(p.minimum_brush_clearance_native_units>=1);
  const svg=fs.readFileSync(path.join(root,row.native_source_path),'utf8');assert.ok(svg.includes('data-title-vertical-alignment="complete-visible-ink-bounds"'));
  assert.equal(p.before_native_sha256,c.before_native_sha256);assert.equal(p.after_native_sha256,c.after_native_sha256);
  for(const e of p.exports){
   assert.equal(e.old_render_matches_published_title_pixels,true);assert.equal(e.lossless_round_trip,true);
   assert.equal(e.pixels_changed_outside_title_footprint,0);assert.equal(e.pixels_changed_below_header,0);
   assert.equal(e.after_sha256,c.exports.find(x=>x.field===e.field).after_sha256);
   const scale=e.field==='image'?1:2;near(e.visible_ink_center[0]/scale,529.5,.51);near(e.visible_ink_center[1]/scale,79,.51);
  }
 }
});


test('Saiyan 171–220 keeps original artwork, effect types, current restrictions and both verified exports',()=>{
 const rows=audit.filter(r=>r.number>=171&&r.number<=220);
 assert.equal(rows.length,50);assert.equal(rows.filter(r=>r.high_tech).length,7);
 assert.equal(rows.filter(r=>r.tokui_waza_backing?.all_styles).length,33);
 const dir=path.join(root,'tools/card-corrections/v3-saiyan-171-220');
 const checks=JSON.parse(fs.readFileSync(path.join(dir,'render-verification.json')));
 const artwork=JSON.parse(fs.readFileSync(path.join(dir,'artwork-review.json')));
 assert.equal(checks.length,50);assert.equal(artwork.length,50);
 for(const row of rows){
  const check=checks.find(c=>c.number===row.number);assert.ok(check);
  assert.equal(check.native_source_sha256,row.middle_bar_revision?.before_native_sha256 ?? row.villain_corner_revision?.before_native_sha256 ?? row.native_source_sha256);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.equal(check.title_helper_idempotent,true);
  for(const e of check.exports){assert.equal(row.middle_bar_revision?.exports.find(x=>x.path===e.path).before_sha256 ?? row.villain_corner_revision?.exports.find(x=>x.path===e.path).before_sha256 ?? hash(path.join(root,e.path)),e.sha256);assert.equal(e.decoded_pixels_match_render,true);}
  const f=row.current_preview_revision.title_fit;assert.ok(f.visible_width<=f.max_width+.00001);
  assert.ok(f.max_width<=760);assert.ok(f.font_size<=f.nominal_font_size);
  const a=artwork.find(a=>a.id===row.id);assert.ok(a.display_reviewed);assert.ok(a.observations.length>30);
  assert.equal(hash(path.join(root,a.original_scan)),a.original_scan_sha256);
 }
 for(const n of [186,187]){
  const r=rows.find(r=>r.number===n);assert.deepEqual(r.artwork.center,[130,887]);assert.equal(r.artwork.dragon_ball_number,n-180);
  assert.equal(r.tokui_waza_backing.applies,false);
 }
 const rules=n=>rows.find(r=>r.number===n).rules.map(x=>x.text).join(' ');
 assert.match(rules(183),/During Combat, in place of an attack/);
 assert.match(rules(192),/^\(Limit 1 per deck\.\)/);
 assert.match(rules(198),/Each opponent/);
 assert.match(rules(217),/costing 0 stages and banishing an Ally in play/);
 assert.ok(!rules(217).includes('Banish after use'));
 for(const n of [188,220])assert.equal(rows.find(r=>r.number===n).native_geometry.icons.length,0);
 for(const n of [184,212])assert.equal(rows.find(r=>r.number===n).power_icon,'block');
 assert.equal(rows.find(r=>r.number===215).power_icon_revision,'approved-bold-infinity-colon-v16');
 assert.equal(rows.find(r=>r.number===183).artwork.later_portrait_correction_retained,true);
 assert.equal(rows.find(r=>r.number===208).artwork.expression_patch_retained,true);
 for(const n of [197,209]){
  const c=checks.find(c=>c.number===n).localized_patch;
  assert.equal(c.pixels_changed_outside_mask,0);assert.equal(c.display_pixels_changed_outside_mask,0);
  assert.equal(c.original_raster_bytes_retained,true);assert.ok(c.pixels_changed>0);
 }
});
