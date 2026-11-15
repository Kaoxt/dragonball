// Validate the latest correction before exposing the preceding reviewed state.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
export const remainingRelease=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/remaining-personality-fixes-20261115/publication.json',import.meta.url),'utf8'));
const files=new Map(remainingRelease.revisions.map(r=>[r.path,r]));
const hash=b=>createHash('sha256').update(b).digest('hex');
const verified=new Set();
function current(p){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const name=path.relative(root,absolute),revision=files.get(name);
 if(revision&&!verified.has(name)){
  assert.equal(hash(fs.readFileSync(absolute)),revision.after_sha256,`Current remaining Personality correction changed: ${name}`);
  verified.add(name);
 }
 return {absolute,revision};
}
export function beforeRemainingHash(p){
 const {absolute,revision}=current(p);
 return revision?.before_sha256??hash(fs.readFileSync(absolute));
}
export function beforeRemainingFile(p,encoding){
 const {absolute,revision}=current(p);
 let bytes;
 if(revision?.before_file){
  const stored=fs.readFileSync(path.join(root,revision.before_file));
  bytes=revision.before_encoding==='gzip'?gunzipSync(stored):stored;
  assert.equal(hash(bytes),revision.before_sha256,`Historical remaining Personality snapshot changed: ${absolute}`);
 }else{
  // Raster dimension/format checks use current bytes; identity uses the hash API.
  bytes=fs.readFileSync(absolute);
 }
 return encoding?bytes.toString(typeof encoding==='string'?encoding:encoding.encoding):bytes;
}
const cards=new Map(remainingRelease.cards.map(c=>[c.id,c]));
export const catalog=currentCatalog.map(c=>{
 const revision=cards.get(c.id);
 if(!revision)return c;
 assert.deepEqual(c,revision.after_card,`Current remaining Personality card changed: ${c.id}`);
 return revision.before_card;
});
