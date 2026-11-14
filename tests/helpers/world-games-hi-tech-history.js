// Validate the latest Hi-Tech revision, then expose the preceding reviewed state.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const hiTechRelease=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-world-games-hi-tech-refined/release.json',import.meta.url),'utf8'));
const files=new Map(hiTechRelease.files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
const verified=new Set();
function current(p){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const name=path.relative(root,absolute),revision=files.get(name);
 if(revision&&!verified.has(name)){
  assert.equal(hash(fs.readFileSync(absolute)),revision.after_sha256,`Current Hi-Tech file changed: ${name}`);
  verified.add(name);
 }
 return {absolute,revision};
}
export function beforeHiTechHash(p){
 const {absolute,revision}=current(p);
 return revision?.before_sha256??hash(fs.readFileSync(absolute));
}
export function beforeHiTechFile(p,encoding){
 const {absolute,revision}=current(p);
 if(!revision)return fs.readFileSync(absolute,encoding);
 assert.ok(revision.before_file,`Historical image bytes are not retained; use beforeHiTechHash: ${absolute}`);
 const bytes=fs.readFileSync(path.join(root,revision.before_file));
 assert.equal(hash(bytes),revision.before_sha256,'Historical snapshot changed');
 return encoding?bytes.toString(encoding):bytes;
}
const cards=new Map(hiTechRelease.cards.map(r=>[r.id,r]));
export const catalog=currentCatalog.map(c=>{
 const revision=cards.get(c.id);
 if(!revision)return c;
 for(const field of ['image','downloadImage'])assert.equal(c[field],revision.after_catalog[field]);
 return {...c,image:revision.before_catalog.image,downloadImage:revision.before_catalog.downloadImage};
});
