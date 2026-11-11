// Validate the current artwork before exposing the immutable earlier state.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const shenronRelease=JSON.parse(fs.readFileSync(path.join(root,'tools/card-corrections/v3-world-games-shenron/release.json'),'utf8'));
const revisions=new Map(shenronRelease.cards.flatMap(r=>[r.source,...r.exports]).map(r=>[r.path,r]));
const hash=b=>createHash('sha256').update(b).digest('hex');
function current(p){
 const name=path.relative(root,p instanceof URL?fileURLToPath(p):path.resolve(p));
 const bytes=fs.readFileSync(p),revision=revisions.get(name);
 if(revision)assert.equal(hash(bytes),revision.after_sha256,`Current World Games Shenron changed: ${name}`);
 return {bytes,revision};
}
export function beforeWorldGamesShenronHash(p){const {bytes,revision}=current(p);return revision?.before_sha256??hash(bytes);}
export function beforeWorldGamesShenronFile(p){
 const {bytes,revision}=current(p);
 if(!revision?.reversible_edits)return bytes;
 let text=bytes.toString('utf8');
 for(const edit of revision.reversible_edits){
  assert.equal(text.split(edit.after).length,2);
  text=text.replace(edit.after,edit.before);
 }
 assert.equal(hash(Buffer.from(text)),revision.before_sha256,'Unrelated native card content changed');
 return Buffer.from(text);
}
export const catalog=currentCatalog.map(c=>{
 const result={...c};
 for(const field of ['image','downloadImage']){
  if(!c[field])continue;
  const r=revisions.get('public'+c[field].split('?')[0]);
  if(r){assert.equal(c[field],r.path.replace(/^public/,'')+'?v='+r.after_sha256.slice(0,12));result[field]=r.path.replace(/^public/,'')+'?v='+r.before_sha256.slice(0,12);}
 }
 return result;
});
