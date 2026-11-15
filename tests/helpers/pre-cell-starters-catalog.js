// Expose the exact reviewed state preceding the complete Cell 161–190 release.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,codeCardIds as currentCodeIds,beforeWorldGamesPromosFile,beforeWorldGamesPromosHash} from './pre-world-games-promos.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-starters-161-190/release.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids),files=new Map(release.integration_files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentCodeIds.filter(id=>!added.has(id));
export function beforeCellStartersFile(p,encoding){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const revision=files.get(path.relative(root,absolute));
 if(!revision)return beforeWorldGamesPromosFile(absolute,encoding);
 assert.equal(beforeWorldGamesPromosHash(absolute),revision.after_sha256,`Current Cell starter integration changed: ${p}`);
 const stored=fs.readFileSync(path.join(root,revision.before_file));
 const bytes=gunzipSync(stored);
 assert.equal(hash(bytes),revision.before_sha256,'Historical Cell baseline changed');
 return encoding?bytes.toString(encoding):bytes;
}
export function beforeCellStartersHash(p){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 return files.has(path.relative(root,absolute))?hash(beforeCellStartersFile(absolute)):beforeWorldGamesPromosHash(absolute);
}
