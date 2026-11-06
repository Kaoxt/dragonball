// Historical production audits describe the card before the isolated title revision.
// Validate current bytes first, then follow the explicit before/after chain. The
// current title release and its actual catalog are tested separately.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,beforeBannerFile,beforeBannerHash} from './banner-logo-history.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const releasePath=path.join(root,'tools/card-corrections/v3-title-footer-width/release.json');
const release=fs.existsSync(releasePath)?JSON.parse(fs.readFileSync(releasePath,'utf8')):null;
const rows=release?[...release.cards.flatMap(r=>[r.source,...r.exports]),...(release.masters||[])]:[];
const revisions=new Map(rows.map(r=>[r.path,r]));
const name=p=>path.relative(root,p instanceof URL?fileURLToPath(p):path.resolve(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
function current(p){const bytes=beforeBannerFile(p),revision=revisions.get(name(p));if(revision)assert.equal(beforeBannerHash(p),revision.after_sha256,`Current title revision changed: ${p}`);return{bytes,revision};}
export function historicalCardHash(p){const{bytes,revision}=current(p);return revision?.before_sha256??hash(bytes);}
export function historicalCardSize(p){const{bytes,revision}=current(p);return revision?.before_size_bytes??bytes.length;}
export function historicalCardGitHash(p){const{bytes,revision}=current(p);return revision?.before_git_blob_sha??createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');}
export function readHistoricalCardFile(p,encoding){
  const{bytes,revision}=current(p);let result=bytes;
  if(revision?.reversible_edits){
    let text=bytes.toString('utf8');
    for(const e of revision.reversible_edits){assert.equal(text.split(e.after).length,2,`Native title edit must be unique: ${p}`);text=text.replace(e.after,e.before);}
    result=Buffer.from(text);assert.equal(hash(result),revision.before_sha256,`Unrelated native content changed: ${p}`);
  }
  return encoding?result.toString(typeof encoding==='string'?encoding:encoding.encoding):result;
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
