import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog,beforeNamekianHash} from './helpers/namekian-symbol-history.js';
import {bannerRelease as release,beforeBannerFile,beforeBannerHash} from './helpers/banner-logo-history.js';
const hash=p=>beforeNamekianHash(p);
test('all 100 Cell Games cards retain the approved centered banner logo and exact protected pixels',()=>{
 assert.ok(release);assert.equal(release.published_card_count,100);assert.equal(release.export_count,200);
 assert.equal(hash(release.asset.path),release.asset.sha256);
 assert.deepEqual(release.cards.map(r=>Number(r.number)),Array.from({length:100},(_,i)=>i+1));
 const titles=JSON.parse(fs.readFileSync('tools/card-corrections/v3-title-footer-width/release.json','utf8'));
 const previous=new Map(titles.cards.flatMap(c=>[c.source,...c.exports]).map(e=>[e.path,e]));
 for(const r of release.cards){
  const c=catalog.find(c=>c.id===r.id);assert.ok(c);assert.equal(r.exports.length,2);
  const landscape=c.width>c.height;assert.deepEqual(r.visible_center,landscape?[296.55,985.5]:[211.75,1409.5]);
  assert.equal(r.visible_width,73.9635);assert.equal(r.visible_height,64.62830097087378);
  if(r.source){
   assert.equal(hash(r.source.path),r.source.after_sha256);
   assert.equal(beforeBannerHash(r.source.path),previous.get(r.source.path).after_sha256);
   beforeBannerFile(r.source.path);
   assert.match(fs.readFileSync(r.source.path,'utf8'),/data-emblem-finish="banner-emblem-v1"/);
  }else{assert.ok([70,72,73,81,83].includes(Number(r.number)));assert.ok(r.footer_baseline_max_channel_error<=3);}
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(e.before_sha256,previous.get(e.path).after_sha256);
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.ok(e.lossless_round_trip);assert.equal(e.outside_logo_changed_pixels,0);assert.ok(e.changed_pixels>1000);
   assert.ok(e.old_native_roi_max_channel_error<=3);assert.ok(e.final_native_roi_max_channel_error<=3);
   const scale=e.field==='downloadImage'?2:1,[left,top,right,bottom]=e.changed_bounds;
   assert.ok(left/scale>=r.visible_center[0]-43&&right/scale<=r.visible_center[0]+43);
   assert.ok(top/scale>=r.visible_center[1]-39&&bottom/scale<=r.visible_center[1]+39);
  }
 }
});
