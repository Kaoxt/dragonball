// Expose the reviewed state before World Games Videl, promos and previews.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog,codeCardIds as currentCodeIds,beforeCellPromosFile} from './pre-cell-promos.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-world-games-201-promos/publication.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids),files=new Map(release.integration_files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentCodeIds.filter(id=>!added.has(id));
export function beforeWorldGamesPromosFile(p,encoding){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const revision=files.get(path.relative(root,absolute));
 if(!revision)return beforeCellPromosFile(absolute,encoding);
 assert.equal(hash(beforeCellPromosFile(absolute)),revision.after_sha256,`Current World Games promo integration changed: ${p}`);
 const bytes=gunzipSync(fs.readFileSync(path.join(root,revision.before_file)));
 assert.equal(hash(bytes),revision.before_sha256,'Historical World Games baseline changed');
 return encoding?bytes.toString(encoding):bytes;
}
