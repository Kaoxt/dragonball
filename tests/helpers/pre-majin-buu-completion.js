// Restore exact inputs before the Majin Buu remaining-card release.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import revisions from '../../tools/card-corrections/v3-majin-buu-completion/integration-files.json' with {type:'json'};
import sourceInputs from '../../tools/card-corrections/v3-majin-buu-completion/source-inputs.json' with {type:'json'};

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = new Map(revisions.map(row => [row.path, row]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Files changed independently of card publication are read at the release under audit.
export function sourceFileAt(commit, file, fallback) {
  const absolute = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const relative = path.relative(root, absolute);
  const snapshot = sourceInputs.find(row => row.commit === commit && row.path === relative);
  if (!snapshot) return fallback(absolute);
  const bytes = gunzipSync(readFileSync(path.join(root, snapshot.archive)));
  assert.equal(hash(bytes), snapshot.sha256, snapshot.archive);
  return bytes;
}

export function beforeMajinBuuCompletionFile(file) {
  const absolute = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  const current = sourceFileAt('d7bc0f9c73c8d7c935f7da4610189671e4848620', absolute, readFileSync);
  const revision = files.get(path.relative(root, absolute));
  if (!revision) return current;
  assert.equal(hash(current), revision.after_sha256, revision.path);
  const previous = gunzipSync(readFileSync(path.join(root, revision.before_file)));
  assert.equal(hash(previous), revision.before_sha256, revision.before_file);
  return previous;
}

function readArray(file) {
  const text = beforeMajinBuuCompletionFile(path.join(root, file)).toString();
  return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
}
export const catalog = readArray('public/cards/catalog.js');
export const codeCardIds = readArray('public/decks/code-card-ids.js');
