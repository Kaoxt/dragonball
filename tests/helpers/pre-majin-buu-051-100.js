// Restore exact inputs before the second Majin Buu release.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import revisions from '../../tools/card-corrections/v3-majin-buu-051-100/integration-files.json' with {type:'json'};

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = new Map(revisions.map(row => [row.path, row]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function beforeMajinBuu051File(file) {
  const absolute = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const current = readFileSync(absolute);
  const revision = files.get(path.relative(root, absolute));
  if (!revision) return current;
  assert.equal(hash(current), revision.after_sha256, revision.path);
  const previous = gunzipSync(readFileSync(path.join(root, revision.before_file)));
  assert.equal(hash(previous), revision.before_sha256, revision.before_file);
  return previous;
}

function readArray(file) {
  const text = beforeMajinBuu051File(path.join(root, file)).toString();
  return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
}
export const catalog = readArray('public/cards/catalog.js');
export const codeCardIds = readArray('public/decks/code-card-ids.js');
