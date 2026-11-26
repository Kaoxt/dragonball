// Restore the exact release inputs for historical audits after Movie 7 is added.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {beforeMajinBuuFile} from './pre-majin-buu.js';
import revisions from '../../tools/card-corrections/v3-movie7/integration-files.json' with {type:'json'};

const root=fileURLToPath(new URL('../../',import.meta.url));
const files=new Map(revisions.map(row=>[row.path,row]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function beforeMovie7File(file){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file);
 const current=beforeMajinBuuFile(absolute),revision=files.get(path.relative(root,absolute));
 if(!revision)return current;
 assert.equal(sha(current),revision.after_sha256,revision.path);
 const previous=gunzipSync(readFileSync(path.join(root,revision.before_file)));
 assert.equal(sha(previous),revision.before_sha256,revision.before_file);
 return previous;
}
function array(file){const text=beforeMovie7File(path.join(root,file)).toString();return JSON.parse(text.slice(text.indexOf('['),text.lastIndexOf(']')+1));}
export const catalog=array('public/cards/catalog.js');
export const codeCardIds=array('public/decks/code-card-ids.js');
