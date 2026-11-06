import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {cellGamesLogoRelease as release,currentCellGamesHash,afterCellGamesLogoHash,sourceBeforeCellGamesArtwork} from './helpers/cell-games-logo.js';
const hashBytes=b=>createHash('sha256').update(b).digest('hex');
const hash=p=>hashBytes(fs.readFileSync(p));
function withoutLogo(raw){
 const at=raw.indexOf('id="saga-emblem"'),start=raw.lastIndexOf('<',at),tag=raw.slice(start).match(/^<([\w:]+)/)[1];
 const tokens=new RegExp('</?'+tag+'(?=[\\s>])[^>]*>','g');let depth=0;
 for(const m of raw.slice(start).matchAll(tokens)){
  if(m[0].startsWith('</'))depth--;else if(!m[0].endsWith('/>'))depth++;
  if(depth===0)return raw.slice(0,start)+raw.slice(start+m.index+m[0].length);
 }
 throw new Error('Unclosed emblem');
}
test('The original 95-card Cell Games satin-emblem migration retains its verified revision chain',()=>{
 const cards=catalog.filter(c=>c.set==='Cell Games Saga');
 assert.equal(release.published_card_count,95);assert.equal(release.cards.length,95);
 assert.equal(cards.length,100);
 assert.deepEqual(release.cards.map(c=>c.id),cards.filter(c=>!release.held_numbers.includes(Number(c.number))).map(c=>c.id));
 assert.deepEqual(release.held_numbers,[70,72,73,81,83]);
 assert.ok(release.historical_audits_preserved);assert.equal(hash(release.asset.path),release.asset.sha256);
 for(const r of release.cards){
  const c=cards.find(c=>c.id===r.id),source=sourceBeforeCellGamesArtwork(r.source.path,fs.readFileSync(r.source.path,'utf8'));
  assert.equal(hash(r.source.path),afterCellGamesLogoHash(r.source.path,r.source.after_sha256));
  assert.equal(hashBytes(withoutLogo(source)),r.source.unchanged_outside_emblem_sha256);
  assert.match(source,/data-emblem-finish="android-satin-v1"/);assert.ok(source.includes(release.asset.sha256+'.png'));
  const land=r.family==='LOCATION';assert.deepEqual(r.visible_center,land?[296.55,985.5]:[211.75,1409.5]);
  const [x,y,w,h]=r.visible_bounds;assert.ok(Math.abs(x+w/2-r.visible_center[0])<.002);assert.ok(Math.abs(y+h/2-r.visible_center[1])<.002);assert.ok(Math.abs(w-73.9635)<.002);
  assert.equal(r.exports.length,2);
  for(const e of r.exports){
   assert.equal(hash(e.path),currentCellGamesHash(e.path,e.before_sha256));
   assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+afterCellGamesLogoHash(e.path,e.after_sha256).slice(0,12));
   assert.ok(e.lossless_round_trip);assert.equal(e.outside_logo_changed_pixels,0);assert.ok(e.changed_pixels>1000);
   assert.ok(e.old_native_roi_max_channel_error<=3);assert.ok(e.final_native_roi_max_channel_error<=3);
   const scale=e.field==='downloadImage'?2:1,[left,top,right,bottom]=e.changed_bounds;
   assert.ok(left/scale>=r.visible_center[0]-41 && right/scale<=r.visible_center[0]+41);
   assert.ok(top/scale>=r.visible_center[1]-36 && bottom/scale<=r.visible_center[1]+36);
  }
 }
});
