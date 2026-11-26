// Restore the exact source inputs preceding the single-card Babidi #30 release.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {beforeGtBackersFile} from './pre-gt-backers.js';
import revisions from '../../tools/card-corrections/v3-babidi-030/integration-files.json' with {type:'json'};

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = new Map(revisions.map(row => [row.path, row]));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function beforeBabidi030File(file) {
  const absolute = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const current = beforeGtBackersFile(absolute);
  const revision = files.get(path.relative(root, absolute));
  if (!revision) return current;
  assert.equal(sha256(current), revision.after_sha256, revision.path);
  const previous = gunzipSync(readFileSync(path.join(root, revision.before_file)));
  assert.equal(sha256(previous), revision.before_sha256, revision.before_file);
  return previous;
}

function readArray(file) {
  const text = beforeBabidi030File(path.join(root, file)).toString();
  return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
}

export const catalog = readArray('public/cards/catalog.js');
export const codeCardIds = readArray('public/decks/code-card-ids.js');
