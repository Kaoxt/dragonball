// Reconstruct the immutable reviewed state before Cell Saga P1–P10.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
import {codeCardIds as currentCodeIds} from '../../public/decks/code-card-ids.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-promos-p1-p10/publication.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids),files=new Map(release.integration_files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentCodeIds.filter(id=>!added.has(id));
export function beforeCellPromosFile(p,encoding){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p),revision=files.get(path.relative(root,absolute));
 if(!revision)return fs.readFileSync(absolute,encoding);
 assert.equal(hash(fs.readFileSync(absolute)),revision.after_sha256,`Current Cell promo integration changed: ${p}`);
 const bytes=gunzipSync(fs.readFileSync(path.join(root,revision.before_file)));
 assert.equal(hash(bytes),revision.before_sha256,'Historical Cell promo baseline changed');
 return encoding?bytes.toString(encoding):bytes;
}
