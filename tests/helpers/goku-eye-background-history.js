// Validate the current Goku background before exposing the previous publication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from './pre-cell-games-101-125.js';
import {beforeCellGamesHash,beforeCellGamesFile} from './pre-cell-games-101-125.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const eyeRelease=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-world-games-173-eye-background/release.json',import.meta.url),'utf8'));
const files=new Map(eyeRelease.files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
const verified=new Set();
function current(p){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const name=path.relative(root,absolute),revision=files.get(name);
 if(revision&&!verified.has(name)){
  assert.equal(beforeCellGamesHash(absolute),revision.after_sha256,`Current Goku background file changed: ${name}`);
  verified.add(name);
 }
 return {absolute,revision};
}
export function beforeEyeHash(p){const {absolute,revision}=current(p);return revision?.before_sha256??beforeCellGamesHash(absolute);}
export function beforeEyeFile(p,encoding){
 const {absolute,revision}=current(p);
 if(!revision)return beforeCellGamesFile(absolute,encoding);
 assert.ok(revision.before_file,`Historical image bytes are not retained; use beforeEyeHash: ${absolute}`);
 const bytes=fs.readFileSync(path.join(root,revision.before_file));
 assert.equal(hash(bytes),revision.before_sha256,'Historical Goku snapshot changed');
 return encoding?bytes.toString(encoding):bytes;
}
export const catalog=currentCatalog.map(c=>{
 if(c.id!==eyeRelease.id)return c;
 for(const field of ['image','downloadImage'])assert.equal(c[field],eyeRelease.after_catalog[field]);
 return {...c,image:eyeRelease.before_catalog.image,downloadImage:eyeRelease.before_catalog.downloadImage};
});
