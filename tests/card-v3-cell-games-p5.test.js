import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog,codeCardIds} from './helpers/pre-babidi.js';
import {catalog as previousCatalog,codeCardIds as previousIds,beforeCellGamesP5File} from './helpers/pre-cell-games-p5.js';
import {beforeCellCompletionFile} from './helpers/pre-cell-completion.js';
const base='tools/card-corrections/v3-cell-games-p5-20261122/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const release=read(base+'publication.json'),expected=read(base+'catalog-addition.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
const parseArray=b=>JSON.parse(b.toString().slice(b.toString().indexOf('['),b.toString().lastIndexOf(']')+1));

test('P5 completes the catalog and preserves every prior card and permanent deck ID',()=>{
 assert.deepEqual(catalog.at(-1),expected);
 assert.deepEqual(catalog.slice(0,-1),parseArray(beforeCellGamesP5File('public/cards/catalog.js')));
 assert.deepEqual(catalog.slice(0,-1),previousCatalog);
 assert.deepEqual(codeCardIds.slice(0,-1),parseArray(beforeCellGamesP5File('public/decks/code-card-ids.js')));
 assert.deepEqual(codeCardIds.slice(0,-1),previousIds);
 assert.equal(codeCardIds.at(-1),expected.id);
 assert.equal(new Set(codeCardIds).size,codeCardIds.length);
 assert.equal(catalog.length,release.expected_catalog_count);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 for(const [set,count] of Object.entries(release.expected_set_counts))assert.equal(catalog.filter(c=>c.set===set).length,count);
 assert.deepEqual(release.remaining,[]);
});

test('P5 exact native source and both lossless exports match their reviewed identities',()=>{
 const svg=fs.readFileSync(release.native_source_path,'utf8');
 assert.equal(hash(svg),release.native_source_sha256);
 assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);
 assert.match(svg,/data-card-number="P5"/);
 assert.match(svg,/data-star-count="2"/);
 assert.equal((svg.match(/id="power-icon"/g)||[]).length,1);
 assert.equal(expected.rules,'Physical attack. DAMAGE: AT +4 stages. Raise your anger 1 level. Banish after use.');
 for(const e of release.exports){
  const b=fs.readFileSync(e.path);assert.equal(hash(b),e.sha256);
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8L');
  const bits=b.readUInt32LE(21);assert.deepEqual([(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1],e.size);
  assert.equal(expected[e.field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
 }
});

test('all earlier 22-card source, export and audit bytes survive the combined handoff',()=>{
 const original=read('tools/card-corrections/v3-cell-completion-20261121/audit.json');
 assert.equal(original.length,22);assert.equal(original.length+release.card_ids.length,23);
 for(const row of original){
  assert.equal(hash(fs.readFileSync(row.native_source_path)),row.native_source_sha256);
  for(const a of row.assets)assert.equal(hash(fs.readFileSync(a.path)),a.sha256);
  for(const e of row.exports)assert.equal(hash(fs.readFileSync(e.path)),e.sha256);
 }
 const oldRelease=read('tools/card-corrections/v3-cell-completion-20261121/publication.json');
 for(const r of oldRelease.integration_files)assert.equal(hash(beforeCellCompletionFile(r.path)),r.before_sha256);
});
