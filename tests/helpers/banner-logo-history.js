// Validate current files, then follow the isolated banner-logo revision backward.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const file=path.join(root,'tools/card-corrections/v3-cell-games-banner-logo/release.json');
export const bannerRelease=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const revisions=new Map((bannerRelease?.cards??[]).flatMap(r=>[r.source,...r.exports].filter(Boolean)).map(r=>[r.path,r]));
const name=p=>path.relative(root,p instanceof URL?fileURLToPath(p):path.resolve(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
function current(p){const bytes=fs.readFileSync(p),revision=revisions.get(name(p));if(revision)assert.equal(hash(bytes),revision.after_sha256,`Current banner-logo revision changed: ${p}`);return{bytes,revision};}
export function beforeBannerHash(p){const{bytes,revision}=current(p);return revision?.before_sha256??hash(bytes);}
export function beforeBannerFile(p){
 const{bytes,revision}=current(p);
 if(!revision?.old_emblem_group)return bytes;
 let text=bytes.toString('utf8');assert.equal(text.split(revision.new_emblem_group).length,2);
 text=text.replace(revision.new_emblem_group,revision.old_emblem_group);
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
