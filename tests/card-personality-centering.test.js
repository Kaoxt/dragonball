import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog,beforeRemainingFile,beforeRemainingHash} from './helpers/remaining-personality-history.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart} from '../public/personality-power.js';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
import {centeringRelease as release,catalog as historicalCatalog,beforeCenteringHash,beforeCenteringFile} from './helpers/personality-centering-history.js';
const base='tools/card-corrections/personality-centering-20261115/';
const manifest=JSON.parse(fs.readFileSync(base+'manifest.json','utf8'));
const review=JSON.parse(fs.readFileSync(base+'review.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fileHash=beforeRemainingHash;

test('centering changes exactly the approved 45 cards and preserves all gameplay and deck identities',async()=>{
 assert.equal(release.cards.length,45);assert.equal(review.rows.length,98);
 assert.equal(hash(JSON.stringify(historicalCatalog)),release.baseline_catalog_canonical_sha256);
 assert.equal(fileHash('public/decks/code-card-ids.js'),release.baseline_code_ids_sha256);
 assert.equal(fileHash('public/personality-power.js'),release.baseline_power_charts_sha256);
 for(const row of release.cards){
  const card=catalog.find(c=>c.id===row.id);
  assert.deepEqual(card,row.after_card);
  const {image,downloadImage,...gameplay}=card;
  const {image:oldImage,downloadImage:oldDownload,...before}=row.before_card;
  assert.deepEqual(gameplay,before);assert.notEqual(image,oldImage);assert.notEqual(downloadImage,oldDownload);
  const deck=createDeck();deck.personalities[card.level-1]=snapshot(card);
  const decoded=await decodeDeck(await encodeDeck(deck),catalog);
  assert.deepEqual(decoded.personalities,deck.personalities);
  assert.deepEqual(powerChart(card),card.powerStages.toReversed());
 }
 const unchanged=review.rows.filter(r=>!release.cards.some(c=>c.id===r.card.id));
 assert.equal(unchanged.length,53);
 for(const row of unchanged){
  assert.deepEqual(catalog.find(c=>c.id===row.card.id),row.card);
  assert.equal(fileHash(row.native),row.native_sha256);
  for(const field of ['image','downloadImage']){
   const [url,revision]=row.card[field].split('?v=');
   assert.equal(fileHash('public'+url).slice(0,12),revision);
  }
 }
});

test('all supplied assets remain exact and both export sizes retain lossless format and verified protected pixels',()=>{
 for(const file of manifest.files)assert.equal(fileHash(file.path),file.sha256,file.path);
 for(const [file,digest] of Object.entries(manifest.retained_dependencies))assert.equal(fileHash(file),digest,file);
 const checks=JSON.parse(fs.readFileSync(base+'pixel-verification.json','utf8'));
 assert.equal(checks.length,90);
 for(const row of manifest.cards){
  for(const e of row.exports){
   const bytes=fs.readFileSync(e.path),bits=bytes.readUInt32LE(21);
   assert.equal(bytes.toString('ascii',12,16),'VP8L');assert.equal(bytes[20],0x2f);
   assert.deepEqual([(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1],e.size);
   assert.equal(beforeCenteringHash(e.path),e.baseline_sha256);
   const check=checks.find(c=>c.path===e.path);
   assert.equal(check.sha256,e.sha256);assert.equal(check.protected_pixels_changed,0);
   const card=catalog.find(c=>c.id===row.id),field=e.scale===1?'image':'downloadImage';
   assert.equal(card[field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
   const svg=beforeRemainingFile(e.native,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
   for(const [,href] of svg.matchAll(/(?:\w+:)?href="([^\"]+)"/g)){
    if(href.startsWith('#')||href.startsWith('data:'))continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(e.native),href)),href);
   }
  }
 }
});

test('historical native and integration snapshots remain intact without changing earlier evidence',()=>{
 for(const row of release.revisions){
  assert.equal(fileHash(row.path),row.after_sha256,row.path);
  assert.equal(beforeCenteringHash(row.path),row.before_sha256);
  if(row.before_file)assert.equal(hash(beforeCenteringFile(row.path)),row.before_sha256);
 }
});

test('translated Ultra Rare masks stay pinned to the matching new artwork and cache revisions',()=>{
 for(const id of ['frieza-125-super-saiyan-goku','trunks-156-krillin-the-warrior']){
  const card=catalog.find(c=>c.id===id),maskURL=ultraRareMask(card);
  assert.ok(maskURL.includes('?v='));
  const [mask,revision]=maskURL.split('?v=');
  assert.equal(fileHash('public'+mask).slice(0,12),revision);
  assert.equal(ultraRareMask({...card,image:card.image+'-stale'}),'/card-effects/ultra-rare/generic-v3.svg');
 }
});
