import {historicalCardHash, historicalCardSize, historicalCardGitHash, readHistoricalCardFile} from './helpers/title-width-history.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from './helpers/title-width-history.js';
import {cellGamesGokuCorrection as release,cellGamesLogoRelease,afterCellGamesLogoHash,sourceBeforeCellGamesArtwork} from './helpers/cell-games-logo.js';
const hash=p=>historicalCardHash(p);

test('Strength Training retains its native frame and approved emblem around the isolated Goku correction',()=>{
 const previous=cellGamesLogoRelease.cards.find(c=>c.id===release.id);
 const source=readHistoricalCardFile(release.source.path,'utf8');
 assert.equal(hash(release.source.path),afterCellGamesLogoHash(release.source.path,previous.source.after_sha256));
 const original=sourceBeforeCellGamesArtwork(release.source.path,source);
 assert.doesNotMatch(original,/cell-games-030-goku-head-correction/);
 assert.match(source,/id="goku-head-local-mask"/);
 assert.equal(hash(release.asset.path),release.asset.sha256);
 assert.ok(source.includes(release.asset.sha256+'.png'));
 assert.equal(release.review.display_reviewed,true);assert.equal(release.review.download_reviewed,true);
 assert.equal(release.number,30);
});

test('Both corrected Strength Training exports use fresh hashes and preserve pixels beyond Goku’s head',()=>{
 const card=catalog.find(c=>c.id===release.id);
 const data=JSON.parse(readHistoricalCardFile('tools/card-corrections/v3-cell-games-001-050/cards.json','utf8')).find(c=>c.id===release.id);
 assert.equal(card.name,'Strength Training');assert.equal(card.number,'30');assert.equal(card.rules,data.modern_rules);
 assert.equal(card.rarity,'Common');assert.equal(card.type,'Event');
 assert.equal(release.exports.length,2);
 for(const e of release.exports){
  assert.equal(hash(e.path),e.after_sha256);assert.notEqual(e.before_sha256,e.after_sha256);
  assert.equal(card[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
  assert.equal(e.outside_patch_changed_pixels,0);assert.ok(e.native_max_channel_error<=2);assert.equal(e.lossless,true);
  const scale=e.field==='image'?1:2,[x0,y0,x1,y1]=e.changed_bounds;
  assert.ok(x0>=450*scale&&y0>=142*scale&&x1<=750*scale&&y1<=405*scale);
  const bytes=readHistoricalCardFile(e.path);assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.toString('ascii',12,16),'VP8L');
  const bits=bytes.readUInt32LE(21);
  assert.deepEqual([(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1],e.field==='image'?[1060,1484]:[2120,2968]);
 }
});
