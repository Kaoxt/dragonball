// Validate the current stage repair before reading immutable earlier audits.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,beforeNamekianFile,beforeNamekianHash} from './namekian-symbol-history.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const file=path.join(root,'tools/card-corrections/v3-personality-stages/release.json');
export const stageRelease=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const revisions=new Map([
 ...(stageRelease?.cards??[]).flatMap(r=>[r.source,...r.exports]),
 ...(stageRelease?.data_revisions??[]),
].map(r=>[r.path,r]));
const name=p=>path.relative(root,p instanceof URL?fileURLToPath(p):path.resolve(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
function current(p){
 const bytes=beforeNamekianFile(p),revision=revisions.get(name(p));
 if(revision)assert.equal(beforeNamekianHash(p),revision.after_sha256,`Current stage revision changed: ${p}`);
 return{bytes,revision};
}
export function beforeStageHash(p){const{revision}=current(p);return revision?.before_sha256??beforeNamekianHash(p);}
export function beforeStageFile(p){
 const{bytes,revision}=current(p);
 if(!revision?.reversible_edits)return bytes;
 let text=bytes.toString('utf8');
 for(const e of revision.reversible_edits){
  assert.equal(text.split(e.after).length,2,`Stage edit must be unique: ${p}`);
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
 const correction=stageRelease?.value_correction;
 if(c.id===correction?.id)result.powerStages=c.powerStages.map(v=>v===correction.after?correction.before:v);
 return result;
});
