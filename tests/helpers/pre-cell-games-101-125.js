// Expose the exact earlier release state without rewriting historical evidence.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {catalog as currentCatalog} from '../../public/cards/catalog.js';
import {codeCardIds as currentCodeIds} from '../../public/decks/code-card-ids.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const release=JSON.parse(fs.readFileSync(new URL('../../tools/card-corrections/v3-cell-games-101-125/publication.json',import.meta.url),'utf8'));
const added=new Set(release.card_ids),files=new Map(release.files.map(f=>[f.path,f]));
const hash=b=>createHash('sha256').update(b).digest('hex');
export const catalog=currentCatalog.filter(c=>!added.has(c.id));
export const codeCardIds=currentCodeIds.filter(id=>!added.has(id));
export function beforeCellGamesFile(p,encoding){
 const absolute=p instanceof URL?fileURLToPath(p):path.resolve(p);
 const revision=files.get(path.relative(root,absolute));
 if(!revision)return fs.readFileSync(absolute,encoding);
 assert.equal(hash(fs.readFileSync(absolute)),revision.after_sha256,`Current integration changed: ${p}`);
 const stored=fs.readFileSync(path.join(root,revision.before_file));
 const bytes=revision.before_encoding==='gzip'?gunzipSync(stored):stored;
 assert.equal(hash(bytes),revision.before_sha256,'Historical baseline changed');
 return encoding?bytes.toString(encoding):bytes;
}
export const beforeCellGamesHash=p=>hash(beforeCellGamesFile(p));
