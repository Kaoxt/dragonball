// Validate the published centering revision before exposing earlier audit data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const centeringRelease=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/personality-centering-20261115/publication.json',import.meta.url),'utf8'));
const files=new Map(centeringRelease.revisions.map(r=>[r.path,r]));
const hash=b=>createHash('sha256').update(b).digest('hex');
const verified=new Set();
function current(p){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const name=path.relative(root,absolute),revision=files.get(name);
 if(revision&&!verified.has(name)){
  assert.equal(hash(fs.readFileSync(absolute)),revision.after_sha256,`Current personality centering changed: ${name}`);
  verified.add(name);
 }
 return {absolute,revision};
}
export function beforeCenteringHash(p){
 const {absolute,revision}=current(p);
 return revision?.before_sha256??hash(fs.readFileSync(absolute));
}
export function beforeCenteringFile(p,encoding){
 const {absolute,revision}=current(p);
 let bytes;
 if(revision?.before_file){
  const stored=fs.readFileSync(path.join(root,revision.before_file));
  bytes=revision.before_encoding==='gzip'?gunzipSync(stored):stored;
  assert.equal(hash(bytes),revision.before_sha256,`Historical centering snapshot changed: ${absolute}`);
 }else{
  // As in the older artwork adapters, raster reads expose current image bytes
  // for format/dimension checks. Historical raster identity uses the hash API.
  bytes=fs.readFileSync(absolute);
 }
 return encoding?bytes.toString(typeof encoding==='string'?encoding:encoding.encoding):bytes;
}
const changes=new Map(centeringRelease.cards.map(c=>[c.id,c]));
export const catalog=currentCatalog.map(c=>{
 const revision=changes.get(c.id);
 if(!revision)return c;
 assert.deepEqual(c,revision.after_card,`Current centered card changed: ${c.id}`);
 return revision.before_card;
});
