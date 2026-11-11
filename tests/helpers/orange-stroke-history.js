// Validate the current Orange repair before reading immutable earlier audits.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from './pre-world-games-051-100-catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const file=path.join(root,'tools/card-corrections/v3-orange-stroke-weight/release.json');
export const orangeStrokeRelease=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const revisions=new Map((orangeStrokeRelease?.cards??[]).flatMap(r=>[r.source,...r.exports].filter(Boolean)).map(r=>[r.path,r]));
const name=p=>path.relative(root,p instanceof URL?fileURLToPath(p):path.resolve(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
function current(p){
 const bytes=fs.readFileSync(p),revision=revisions.get(name(p));
 if(revision)assert.equal(hash(bytes),revision.after_sha256,`Current Orange stroke revision changed: ${p}`);
 return{bytes,revision};
}
export function beforeOrangeStrokeHash(p){const{bytes,revision}=current(p);return revision?.before_sha256??hash(bytes);}
export function beforeOrangeStrokeFile(p){
 const{bytes,revision}=current(p);
 if(!revision?.reversible_edits)return bytes;
 let text=bytes.toString('utf8');
 for(const e of revision.reversible_edits){
  assert.equal(text.split(e.after).length,2,`Orange stroke edit must be unique: ${p}`);
  text=text.replace(e.after,e.before);
 }
 assert.equal(hash(Buffer.from(text)),revision.before_sha256,`Unrelated native content changed: ${p}`);
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
