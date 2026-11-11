// Validate the current Freestyle repair before reading immutable earlier audits.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,beforeBlackStrokeFile,beforeBlackStrokeHash} from './black-stroke-history.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const file=path.join(root,'tools/card-corrections/v3-freestyle-stroke-weight/release.json');
export const freestyleStrokeRelease=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const revisions=new Map((freestyleStrokeRelease?.cards??[]).flatMap(r=>[r.source,...r.exports]).map(r=>[r.path,r]));
const name=p=>path.relative(root,p instanceof URL?fileURLToPath(p):path.resolve(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
function current(p){
 const bytes=beforeBlackStrokeFile(p),revision=revisions.get(name(p));
 if(revision)assert.equal(beforeBlackStrokeHash(p),revision.after_sha256,`Current Freestyle stroke revision changed: ${p}`);
 return{bytes,revision};
}
export function beforeFreestyleStrokeHash(p){const{bytes,revision}=current(p);return revision?.before_sha256??beforeBlackStrokeHash(p);}
export function beforeFreestyleStrokeFile(p){
 const{bytes,revision}=current(p);
 if(!revision?.reversible_edits)return bytes;
 let text=bytes.toString('utf8');
 for(const e of revision.reversible_edits){
  assert.equal(text.split(e.after).length,2,`Freestyle stroke edit must be unique: ${p}`);
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
