import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { restoreMetadata, runFromEnvironment } from '../tools/cloudflare-build-metadata.mjs';

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'cloudflare-metadata-test-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const origin = join(base, 'origin'), work = join(base, 'work');
  mkdirSync(origin); mkdirSync(work);
  git(origin, 'init', '-q', '-b', 'main');
  git(origin, 'config', 'uploadpack.allowFilter', 'true');
  git(origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  writeFileSync(join(origin, 'old-image.webp'), randomBytes(1024 * 1024));
  git(origin, 'add', '.');
  git(origin, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'old revision');
  rmSync(join(origin, 'old-image.webp'));
  mkdirSync(join(origin, 'public')); mkdirSync(join(origin, 'tools'));
  writeFileSync(join(origin, 'public', 'card.webp'), randomBytes(1024 * 1024));
  writeFileSync(join(origin, 'tools', 'native.svg'), '<svg>retained native source</svg>');
  writeFileSync(join(origin, 'wrangler.jsonc'), '{"name":"dragonball"}\n');
  writeFileSync(join(origin, '.gitignore'), 'node_modules/\n');
  git(origin, 'add', '-A');
  git(origin, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'current cards');
  const commit = git(origin, 'rev-parse', 'HEAD');
  for (const name of readdirSync(origin).filter(n => n !== '.git')) cpSync(join(origin, name), join(work, name), { recursive: true });
  mkdirSync(join(work, 'node_modules')); writeFileSync(join(work, 'node_modules', 'installed.txt'), 'preserve dependency');
  return { base, origin, work, commit, url: pathToFileURL(origin).href };
}
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');

test('recovery preserves the real commit, files and clean index without fetching image blobs', t => {
  const f = fixture(t), card = join(f.work, 'public', 'card.webp'), native = join(f.work, 'tools', 'native.svg');
  const before = [hash(card), hash(native)];
  assert.equal(restoreMetadata(f.work, f.commit, f.url), true);
  assert.deepEqual([hash(card), hash(native)], before);
  assert.equal(git(f.work, 'rev-parse', 'HEAD'), f.commit);
  assert.equal(git(f.work, 'symbolic-ref', '--short', 'HEAD'), 'main');
  assert.equal(git(f.work, 'rev-parse', '@{upstream}'), f.commit);
  assert.equal(git(f.work, 'rev-list', '--count', 'HEAD'), '1');
  assert.equal(git(f.work, 'status', '--porcelain', '--untracked-files=no'), '');
  const objects = git(f.work, 'count-objects', '-v');
  assert.ok(Number(objects.match(/^size-pack: (\d+)$/m)[1]) < 64);
  // Status and metadata must continue working even without a remote connection.
  git(f.work, 'remote', 'set-url', 'origin', pathToFileURL(join(f.base, 'unavailable')).href);
  assert.equal(git(f.work, 'status', '--porcelain'), '');
  assert.equal(git(f.work, 'log', '-1', '--format=%s'), 'current cards');
  assert.equal(readFileSync(join(f.work, 'node_modules', 'installed.txt'), 'utf8'), 'preserve dependency');
  assert.equal(restoreMetadata(f.work, f.commit, f.url), false);
});

test('a changed tracked file aborts recovery without overwriting it', t => {
  const f = fixture(t), path = join(f.work, 'tools', 'native.svg');
  writeFileSync(path, '<svg>changed source</svg>');
  assert.throws(() => restoreMetadata(f.work, f.commit, f.url));
  assert.equal(readFileSync(path, 'utf8'), '<svg>changed source</svg>');
});

test('invalid commit is rejected before Git metadata is created', t => {
  const f = fixture(t);
  assert.throws(() => restoreMetadata(f.work, '--invalid', f.url), /invalid/);
  assert.equal(existsSync(join(f.work, '.git')), false);
});

test('an existing linked Git directory is never replaced', t => {
  const f = fixture(t);
  symlinkSync(join(f.origin, '.git'), join(f.work, '.git'));
  assert.throws(() => restoreMetadata(f.work, f.commit, f.url), /linked/);
  assert.equal(git(f.origin, 'rev-parse', 'HEAD'), f.commit);
});

test('failed fetch cannot report success and preserves source files', t => {
  const f = fixture(t), path = join(f.work, 'public', 'card.webp'), before = hash(path);
  assert.throws(() => restoreMetadata(f.work, f.commit, pathToFileURL(join(f.base, 'missing')).href));
  assert.equal(hash(path), before);
});

test('local and GitHub test runs skip the recovery hook', () => {
  assert.equal(runFromEnvironment({}, process.cwd()), false);
});

test('the CLI refuses a Cloudflare flag outside the exact build directory', () => {
  assert.throws(() => runFromEnvironment({ WORKERS_CI: '1' }, tmpdir()), /restricted/);
});
