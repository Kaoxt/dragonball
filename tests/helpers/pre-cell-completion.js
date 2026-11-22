// Expose the immutable catalog/deck state preceding the new previews and promos.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,codeCardIds as currentIds,beforeCellGamesP5File} from './pre-cell-games-p5.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-completion-20261121/publication.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids), files=new Map(release.integration_files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentIds.filter(id=>!added.has(id));
export function beforeCellCompletionFile(p,encoding){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p),revision=files.get(path.relative(root,absolute));
 let bytes=beforeCellGamesP5File(absolute);
 if(revision){
  assert.equal(hash(bytes),revision.after_sha256,`Current Cell completion integration changed: ${p}`);
  bytes=gunzipSync(fs.readFileSync(path.join(root,revision.before_file)));
  assert.equal(hash(bytes),revision.before_sha256,`Historical Cell completion baseline changed: ${p}`);
 }
 return encoding?bytes.toString(typeof encoding==='string'?encoding:encoding.encoding):bytes;
}
export const beforeCellCompletionHash=p=>hash(beforeCellCompletionFile(p));
