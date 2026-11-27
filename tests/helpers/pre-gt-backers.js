// Restore exact inputs before GT Backers without rewriting published card audits.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {beforeDendeSummoningFile} from './pre-dende-summoning.js';
import revisions from '../../tools/card-corrections/gt-backers-integration/integration-files.json' with {type:'json'};

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = new Map(revisions.map(row => [row.path, row]));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function beforeGtBackersFile(file) {
  const absolute = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const current = beforeDendeSummoningFile(absolute);
  const revision = files.get(path.relative(root, absolute));
  if (!revision) return current;
  assert.equal(sha256(current), revision.after_sha256, revision.path);
  const previous = gunzipSync(readFileSync(path.join(root, revision.before_file)));
  assert.equal(sha256(previous), revision.before_sha256, revision.before_file);
  return previous;
}
