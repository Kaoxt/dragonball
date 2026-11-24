// Reconstruct the exact inputs of each Babidi publication for historical audits.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import firstRelease from '../../tools/card-corrections/v3-babidi-001-050/integration-files.json' with {type:'json'};
import secondRelease from '../../tools/card-corrections/v3-babidi-051-100/integration-files.json' with {type:'json'};

const root = fileURLToPath(new URL('../../', import.meta.url));
const first = new Map(firstRelease.map(row => [row.path, row]));
const second = new Map(secondRelease.map(row => [row.path, row]));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function restore(current, revision) {
  if (!revision) return current;
  assert.equal(sha256(current), revision.after_sha256, revision.path);
  const previous = gunzipSync(readFileSync(path.join(root, revision.before_file)));
  assert.equal(sha256(previous), revision.before_sha256, revision.before_file);
  return previous;
}

function firstReleaseFile(absolute) {
  return restore(readFileSync(absolute), second.get(path.relative(root, absolute)));
}

export function beforeBabidiFile(file) {
  const absolute = file instanceof URL ? fileURLToPath(file) : path.resolve(file);
  return restore(firstReleaseFile(absolute), first.get(path.relative(root, absolute)));
}

function readArray(file, reader) {
  const text = reader(path.join(root, file)).toString();
  return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
}

export const catalog = readArray('public/cards/catalog.js', beforeBabidiFile);
export const codeCardIds = readArray('public/decks/code-card-ids.js', beforeBabidiFile);
export const firstBabidiCatalog = readArray('public/cards/catalog.js', firstReleaseFile);
export const firstBabidiIds = readArray('public/decks/code-card-ids.js', firstReleaseFile);
