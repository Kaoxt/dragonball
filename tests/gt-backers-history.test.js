import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {beforeGtBackersFile} from './helpers/pre-gt-backers.js';
import {beforeBabidi030File} from './helpers/pre-babidi-030.js';
import {beforeMajinBuuFile} from './helpers/pre-majin-buu.js';
import {beforeMovie7File} from './helpers/pre-movie7.js';
import revisions from '../tools/card-corrections/gt-backers-integration/integration-files.json' with {type:'json'};
import repairs from '../tools/card-corrections/gt-backers-integration/repair-files.json' with {type:'json'};
import release from '../tools/card-corrections/gt-backers-integration/release.json' with {type:'json'};
import babidi030 from '../tools/card-corrections/v3-babidi-030/integration-files.json' with {type:'json'};
import majinBuu from '../tools/card-corrections/v3-majin-buu-001-050/integration-files.json' with {type:'json'};
import movie7 from '../tools/card-corrections/v3-movie7/integration-files.json' with {type:'json'};

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('GT Backers restores each changed pre-existing input and keeps a separate repair record', () => {
  for (const file of ['AGENTS.md', 'package.json', 'public/personality-power.js', 'public/game.js', 'public/decks/store.js']) {
    assert.ok(revisions.some(row => row.path === file), file);
  }
  for (const revision of revisions) {
    assert.equal(hash(readFileSync(revision.path)), revision.after_sha256, revision.path);
    assert.equal(hash(gunzipSync(readFileSync(revision.before_file))), revision.before_sha256, revision.before_file);
    assert.equal(hash(beforeGtBackersFile(revision.path)), revision.before_sha256, revision.path);
  }
  for (const repair of repairs) {
    assert.equal(hash(readFileSync(repair.path)), repair.after_sha256, repair.path);
    assert.equal(hash(gunzipSync(readFileSync(repair.before_file))), repair.before_sha256, repair.before_file);
  }
});

test('GT history preserves the published Babidi #30, Majin Buu and Movie 7 hash boundaries', () => {
  for (const [rows, current, before] of [
    [babidi030, beforeGtBackersFile, beforeBabidi030File],
    [majinBuu, beforeBabidi030File, beforeMajinBuuFile],
    [movie7, beforeMajinBuuFile, beforeMovie7File],
  ]) {
    for (const revision of rows) {
      assert.equal(hash(current(revision.path)), revision.after_sha256, revision.path);
      assert.equal(hash(before(revision.path)), revision.before_sha256, revision.path);
    }
  }
  for (const [file, digest] of Object.entries(release.unchanged_catalog_files)) {
    assert.equal(hash(readFileSync(file)), digest, file);
  }
});
