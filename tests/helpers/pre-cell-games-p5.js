// Preserve the exact 22-card release for earlier immutable audits.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,codeCardIds as currentIds,beforeBabidiFile} from './pre-babidi.js';
import integrationHistory from '../../tools/card-corrections/v3-cell-games-p5-20261122/integration-history/revisions.json' with {type: 'json'};
const root=fileURLToPath(new URL('../../',import.meta.url));
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-games-p5-20261122/publication.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids);
const revisions=[...release.integration_files,...integrationHistory.cellGamesP5];
const files=new Map(revisions.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentIds.filter(id=>!added.has(id));
export function beforeCellGamesP5File(p,encoding){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p),revision=files.get(path.relative(root,absolute));
 let bytes=beforeBabidiFile(absolute);
 if(revision){
  assert.equal(hash(bytes),revision.after_sha256,`Current P5 integration changed: ${p}`);
  bytes=gunzipSync(fs.readFileSync(path.join(root,revision.before_file)));
  assert.equal(hash(bytes),revision.before_sha256,`Historical pre-P5 state changed: ${p}`);
 }
 return encoding?bytes.toString(typeof encoding==='string'?encoding:encoding.encoding):bytes;
}
export const beforeCellGamesP5Hash=p=>hash(beforeCellGamesP5File(p));
