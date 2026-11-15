import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {powerChart} from '../public/personality-power.js';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {remainingRelease as release,catalog as historicalCatalog,beforeRemainingFile,beforeRemainingHash} from './helpers/remaining-personality-history.js';

const base='tools/card-corrections/remaining-personality-fixes-20261115/';
const manifest=JSON.parse(fs.readFileSync(base+'manifest.json','utf8'));
const checks=JSON.parse(fs.readFileSync(base+'pixel-verification.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fileHash=p=>hash(fs.readFileSync(p));

test('the 58-card correction changes only approved catalog image URLs and preserves deck identities',async()=>{
 assert.equal(release.cards.length,58);
 assert.equal(new Set(release.cards.map(c=>c.id)).size,58);
 assert.equal(release.cards.filter(c=>c.exports?.length).length,57);
 assert.equal(hash(JSON.stringify(historicalCatalog)),release.baseline_catalog_canonical_sha256);
 assert.equal(fileHash('public/decks/code-card-ids.js'),release.baseline_code_ids_sha256);
 for(const row of release.cards){
  const card=catalog.find(c=>c.id===row.id);
  assert.deepEqual(card,row.after_card);
  const {image,downloadImage,...gameplay}=card;
  const {image:oldImage,downloadImage:oldDownload,...before}=row.before_card;
  assert.deepEqual(gameplay,before);
  if(!row.data_only){assert.notEqual(image,oldImage);assert.notEqual(downloadImage,oldDownload);}
  else{assert.equal(image,oldImage);assert.equal(downloadImage,oldDownload);}
  const deck=createDeck();deck.personalities[(card.level??1)-1]=snapshot(card);
  const decoded=await decodeDeck(await encodeDeck(deck),catalog);
  assert.deepEqual(decoded.personalities,deck.personalities);
 }
});

test('all supplied native sources, retained dependencies and 114 lossless exports are exact',()=>{
 for(const f of manifest.files)assert.equal(fileHash(f.path),f.sha256,f.path);
 for(const [file,digest] of Object.entries(manifest.retained_dependencies))assert.equal(fileHash(file),digest,file);
 assert.equal(checks.length,114);
 for(const row of manifest.cards){
  for(const e of row.exports??[]){
   const bytes=fs.readFileSync(e.path),bits=bytes.readUInt32LE(21);
   assert.equal(bytes.toString('ascii',12,16),'VP8L');assert.equal(bytes[20],0x2f);
   assert.deepEqual([(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1],e.size);
   assert.equal(beforeRemainingHash(e.path),e.baseline_sha256);
   const check=checks.find(c=>c.path===e.path);
   assert.equal(check.sha256,e.sha256);assert.equal(check.protected_pixels_changed,0);
   assert.ok(check.changed_pixels>0);
   const card=catalog.find(c=>c.id===row.id),field=e.scale===1?'image':'downloadImage';
   assert.equal(card[field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
   const svg=fs.readFileSync(e.native,'utf8');assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
   for(const [,href] of svg.matchAll(/(?:\w+:)?href="([^"]+)"/g)){
    if(href.startsWith('#')||href.startsWith('data:'))continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(e.native),href)),`${e.native}: ${href}`);
   }
  }
 }
});

test('exact historical snapshots remain available without rewriting older audits',()=>{
 for(const row of release.revisions){
  assert.equal(fileHash(row.path),row.after_sha256,row.path);
  assert.equal(beforeRemainingHash(row.path),row.before_sha256);
  if(row.before_file)assert.equal(hash(beforeRemainingFile(row.path)),row.before_sha256);
 }
});

test('Goku 160 Arena chart, Vegeta 184 wording and Cell 159 foil pin match the supplied corrections',()=>{
 const goku=catalog.find(c=>c.id==='saiyan-160-goku');
 assert.deepEqual(powerChart(goku),[0,8000,8500,9000,9500,10000,10500,11000,11500,12000,12500]);
 const oldPower=beforeRemainingFile('public/personality-power.js','utf8');
 const stage=manifest.semantic_text_changes.find(c=>c.path==='public/personality-power.js');
 assert.equal(fs.readFileSync(stage.path,'utf8'),oldPower.replace(stage.before,stage.after));
 const wording=manifest.cards.find(c=>c.id==='saiyan-184-vegeta-lvl-1-ht');
 for(const e of wording.exports){
  assert.match(fs.readFileSync(e.native,'utf8'),/aria-label="Stops an energy attack\."/);
 }
 const card=catalog.find(c=>c.id==='cell-159-vegeta-the-revitalized');
 const [url,revision]=ultraRareMask(card).split('?v=');
 assert.equal(fileHash('public'+url).slice(0,12),revision);
 assert.equal(ultraRareMask({...card,image:card.image+'-stale'}),'/card-effects/ultra-rare/generic-v3.svg');
});
