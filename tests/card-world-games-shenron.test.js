import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {catalog as beforeCatalog,shenronRelease,beforeWorldGamesShenronFile} from './helpers/world-games-shenron-history.js';
import {beforeSaiyanStrokeHash} from './helpers/saiyan-stroke-history.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=cards=>'export const catalog = '+JSON.stringify(cards,null,2)+';\n';

test('every current World Games Dragon Ball uses the approved artwork and only its image URLs change',()=>{
 const affected=catalog.filter(c=>c.set==='World Games Saga'&&c.type==='Dragon Ball');
 assert.deepEqual(affected.map(c=>c.id),shenronRelease.cards.map(c=>c.id));
 assert.equal(hash(Buffer.from(json(beforeCatalog))),shenronRelease.baseline_catalog_sha256);
 assert.equal(hash(fs.readFileSync('public/cards/catalog.js')),shenronRelease.catalog_sha256);
 assert.equal(hash(fs.readFileSync(shenronRelease.artwork.path)),shenronRelease.artwork.sha256);
 assert.deepEqual(shenronRelease.artwork.native_mapping,[0,0,1060,1484]);
 for(const row of shenronRelease.cards){
  const source=fs.readFileSync(row.source.path,'utf8');
  assert.ok(source.includes('../assets/'+shenronRelease.artwork.sha256+'.png'));
  assert.equal(row.source.reversible_edits.length,1);
  assert.equal(hash(beforeWorldGamesShenronFile(row.source.path)),row.source.before_sha256);
  assert.equal(beforeSaiyanStrokeHash(row.source.path),row.source.before_sha256);
 }
});

test('both lossless exports preserve opaque UI and the historical export chain',()=>{
 for(const row of shenronRelease.cards)for(const e of row.exports){
  const bytes=fs.readFileSync(e.path);
  assert.equal(hash(bytes),e.after_sha256);
  assert.equal(beforeSaiyanStrokeHash(e.path),e.before_sha256);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.includes(Buffer.from('VP8L')));
  const scale=e.field==='image'?1:2;assert.deepEqual(e.size,[1060*scale,1484*scale]);
  assert.ok(e.changed_pixels>100000);assert.ok(e.opaque_ui_pixels_checked>100000);
  assert.equal(e.pixels_changed_in_opaque_ui,0);assert.equal(e.pixels_changed_outside_artwork_delta,0);
  assert.equal(e.lossless_round_trip,true);
 }
});

test('both World Games builders select the set-specific artwork for Dragon Balls',()=>{
 for(const batch of ['001_050','051_100']){
  const source=fs.readFileSync(`tools/card-templates/v3/build_world_games_${batch}.py`,'utf8');
  assert.match(source,/from world_games_dragon_ball import apply as world_games_dragon_ball/);
  assert.match(source,/art=world_games_dragon_ball\(r\) if db else/);
 }
});
