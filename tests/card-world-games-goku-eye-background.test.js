import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {cardPage} from '../src/card-pages.js';
import {isHiTech,finishForImage} from '../public/card-surface.js';
const base='tools/card-corrections/v3-world-games-173-eye-background/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const release=read('release.json'),pixels=read('pixel-verification.json'),renders=read('render-verification.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
const fileHash=p=>hash(fs.readFileSync(p));

test('only Goku 173 image versions change; gameplay, the other eight Hi-Techs and every prior card remain intact',()=>{
 const current=catalog.find(c=>c.id===release.id);assert.deepEqual(current,release.after_catalog);
 const before=catalog.map(c=>c.id===release.id?{...c,image:release.before_catalog.image,downloadImage:release.before_catalog.downloadImage}:c);
 assert.equal(hash(JSON.stringify(before)),release.baseline_catalog_canonical_sha256);
 assert.equal(fileHash('public/decks/code-card-ids.js'),release.baseline_code_ids_sha256);
 assert.equal(fileHash('public/personality-power.js'),release.baseline_power_charts_sha256);
 assert.ok(isHiTech(current));assert.equal(finishForImage(current.image)?.id,current.id);assert.equal(finishForImage(current.downloadImage)?.id,current.id);
});

test('removing the local eye overlay restores the exact previous native source including foreground and UI',()=>{
 const row=release.after_audit,revision=release.files.find(f=>f.path===row.native_source_path);
 let svg=fs.readFileSync(row.native_source_path,'utf8');
 assert.equal(hash(svg),row.native_source_sha256);
 const overlay=svg.match(/<ns0:image\b[^>]*\bid="goku-matching-eye-background"[^>]*\/>/g);
 assert.equal(overlay?.length,1);
 assert.match(overlay[0],/x="0" y="-160" width="1060" height="1484"/);
 assert.match(overlay[0],/clip-path="url\(#goku-source-cleanup-art-window\)"/);
 assert.match(overlay[0],/mask="url\(#goku-eye-background-mask\)"/);
 const encoded=overlay[0].match(/xlink:href="data:image\/png;base64,([^\"]+)"/)[1];
 assert.equal(hash(Buffer.from(encoded,'base64')),release.source_artwork.sha256);
 assert.equal(fileHash(release.source_artwork.path),release.source_artwork.sha256);
 svg=svg.replace(overlay[0],'');
 for(const [tag,id] of [['linearGradient','goku-eye-horizontal-fade'],['linearGradient','goku-eye-vertical-fade'],['mask','goku-eye-horizontal-mask'],['mask','goku-eye-background-mask']]){
  const regex=new RegExp(`<ns0:${tag}\\b[^>]*id="${id}"[\\s\\S]*?<\\/ns0:${tag}>`,'g');
  assert.equal([...svg.matchAll(regex)].length,1);svg=svg.replace(regex,'');
 }
 assert.equal(hash(svg),revision.before_sha256);
 assert.equal(fileHash(revision.before_file),revision.before_sha256);
 assert.equal(fileHash(row.artwork.source),release.before_audit.artwork.source_sha256);
 assert.deepEqual(row.artwork.foreground_native_placement,release.before_audit.artwork.foreground_native_placement);
});

test('both lossless native-size exports preserve every pixel outside the localized background',()=>{
 assert.equal(pixels.length,2);assert.equal(renders.length,2);
 for(const e of release.after_audit.exports){
  assert.equal(fileHash(e.path),e.after_sha256);
  const p=pixels.find(p=>p.field===e.field),r=renders.find(r=>r.field===e.field);
  assert.equal(p.changed_pixels_outside_background_region,0);assert.ok(p.changed_pixels>200000);
  const scale=e.field==='image'?1:2;assert.deepEqual(p.pixel_diff_bbox,[350*scale,146*scale,1060*scale,852*scale]);
  assert.deepEqual(e.size,[1060*scale,1484*scale]);assert.equal(e.render_mode,'native-size');
  assert.ok(r.native_render_pixel_match&&r.lossless_png_equality);assert.equal(r.sha256,e.after_sha256);
  assert.equal(release.after_catalog[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
 }
 for(const f of release.files){assert.equal(fileHash(f.path),f.after_sha256);if(f.before_file)assert.equal(fileHash(f.before_file),f.before_sha256);}
 const audit=JSON.parse(fs.readFileSync('tools/card-corrections/v3-world-games-151-200/audit.json','utf8'));
 assert.deepEqual(audit.find(r=>r.number===173),release.after_audit);
});

test('the live Goku route uses the corrected image',async()=>{
 const html=fs.readFileSync('public/cards/index.html','utf8');
 const response=await cardPage(new Request('https://dragonballocg.com/cards/world-games-saga/173'),{fetch:async()=>new Response(html,{headers:{'Content-Type':'text/html'}})});
 assert.equal(response.status,200);assert.ok((await response.text()).includes(release.after_catalog.image));
});
