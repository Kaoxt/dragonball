import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog,beforeEyeHash,beforeEyeFile} from './helpers/goku-eye-background-history.js';
import {cardPath,cardFromPath} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';
import {createDeck,snapshot} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {powerChart} from '../public/personality-power.js';
import {isHiTechPersonality,blocksHiTechAlly} from '../public/decks/eligibility.js';
import {isHiTech,finishForImage} from '../public/card-surface.js';
const base='tools/card-corrections/v3-world-games-hi-tech-refined/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),rendered=read('render-verification.json'),layout=read('layout-comparison.json');
const manifest=read('package/manifest.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
const fileHash=p=>beforeEyeHash(p);
const ids=new Set(release.cards.map(r=>r.id));

test('updates only eight approved Hi-Tech images and preserves every gameplay field and permanent deck index',()=>{
 assert.deepEqual(release.numbers,[165,169,177,181,185,189,193,197]);assert.equal(release.cards.length,8);
 assert.equal(catalog.length,1209);assert.equal(catalog.filter(c=>c.set==='World Games Saga').length,200);
 const old=catalog.map(c=>{
  const r=release.cards.find(r=>r.id===c.id);
  if(!r)return c;
  assert.deepEqual(c,r.after_catalog);
  const {image,downloadImage,...gameplay}=c;
  const {image:beforeImage,downloadImage:beforeDownload,...before}=r.before_catalog;
  assert.deepEqual(gameplay,before);assert.notEqual(image,beforeImage);assert.notEqual(downloadImage,beforeDownload);
  return {...c,image:beforeImage,downloadImage:beforeDownload};
 });
 assert.equal(hash(JSON.stringify(old)),release.baseline_catalog_canonical_sha256);
 assert.equal(fileHash('public/decks/code-card-ids.js'),release.baseline_code_ids_sha256);
 assert.equal(fileHash('public/personality-power.js'),release.baseline_power_charts_sha256);
});

test('the earlier Hi-Tech release retained its then-current Goku choice exactly',()=>{
 const goku=release.retained_goku;
 assert.ok(!ids.has(goku.catalog.id));assert.deepEqual(catalog.find(c=>c.id===goku.catalog.id),goku.catalog);
 for(const f of goku.files)assert.equal(fileHash(f.path),f.sha256,f.path);
});

test('native sources and all sixteen exports retain package bytes and independently verified rendering',()=>{
 const audit=JSON.parse(beforeEyeFile('tools/card-corrections/v3-world-games-151-200/audit.json','utf8'));
 const data=JSON.parse(beforeEyeFile('tools/card-corrections/v3-world-games-151-200/cards.json','utf8'));
 for(const r of release.cards){
  const row=audit.find(a=>a.id===r.id),d=data.find(c=>c.id===r.id),check=rendered.find(v=>v.id===r.id);
  assert.deepEqual(row,r.after_audit);assert.equal(d.retained_native_source_path,row.native_source_path);
  assert.deepEqual(JSON.parse(fs.readFileSync(`tools/card-corrections/v3-world-games-151-200/per-card/${r.number}.json`,'utf8')),row);
  assert.equal(fileHash(row.native_source_path),manifest['payload/'+row.native_source_path].sha256);
  assert.equal(check.native_source_sha256,row.native_source_sha256);
  assert.ok(layout.find(c=>c.number===r.number).all_protected_groups_match);
  const svg=fs.readFileSync(row.native_source_path,'utf8');
  assert.doesNotMatch(svg,/<(?:\w+:)?text\b/);assert.match(svg,/id="source-faithful-framing"/);
  const embedded=[...svg.matchAll(/(?:xlink:)?href="data:image\/[^;]+;base64,([^\"]+)"/g)].map(m=>hash(Buffer.from(m[1],'base64')));
  assert.equal(embedded.length,row.embedded_images.length);
  assert.deepEqual(embedded,row.embedded_images.map(i=>i.sha256));
  assert.equal(fileHash(row.artwork.source),row.artwork.source_sha256);assert.ok(embedded.includes(row.artwork.source_sha256));
  assert.equal(fileHash(row.artwork.background_source),row.artwork.background_sha256);assert.ok(embedded.includes(row.artwork.background_sha256));
  assert.deepEqual(row.assets,[]);
  for(const e of row.exports){
   assert.equal(fileHash(e.path),e.after_sha256);assert.equal(e.after_sha256,manifest['payload/'+e.path].sha256);
   const verified=check.exports.find(v=>v.field===e.field);
   assert.equal(verified.sha256,e.after_sha256);assert.ok(verified.native_render_pixel_match&&verified.supplied_png_pixel_match);
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);
   assert.equal(r.after_catalog[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
  }
 }
 const pikkon=release.cards.find(r=>r.number===193).after_audit.artwork.localized_correction;
 assert.equal(fileHash(pikkon.source),pikkon.sha256);
});

test('all recorded revision files and exact historical snapshots are intact',()=>{
 for(const f of release.files){
  assert.equal(fileHash(f.path),f.after_sha256,f.path);
  if(f.before_file)assert.equal(fileHash(f.before_file),f.before_sha256,f.before_file);
 }
});

test('updated cards retain Hi-Tech finishes, Arena charts, Ally restrictions, routes and deck round trips',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');const assets={fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})};
 for(const c of catalog.filter(c=>ids.has(c.id))){
  assert.ok(isHiTech(c)&&isHiTechPersonality(c));
  assert.equal(finishForImage(c.image)?.id,c.id);assert.equal(finishForImage(c.downloadImage)?.id,c.id);
  assert.ok(blocksHiTechAlly(c,'cards'));assert.ok(blocksHiTechAlly(c,'senseiDeck'));assert.ok(!blocksHiTechAlly(c,'personalities'));
  assert.deepEqual(powerChart(c),c.powerStages.toReversed());
  assert.equal(cardFromPath(cardPath(c),catalog),c);
  const response=await cardPage(new Request('https://dragonballocg.com'+cardPath(c)),assets);
  assert.equal(response.status,200);assert.ok((await response.text()).includes(c.image));
  const deck=createDeck();deck.personalities[c.level-1]=snapshot(c);
  assert.deepEqual((await decodeDeck(await encodeDeck(deck),catalog)).personalities,deck.personalities);
 }
});
