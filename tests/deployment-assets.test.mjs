import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { syncAssets, validateManifest, cloudflareStorage } from '../tools/deployment/sync-card-assets.mjs';

const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
function fixture() {
  const files = new Map([['/assets/cards/a.webp', Buffer.from('first original card')], ['/assets/cards/downloads/a.webp', Buffer.from('full resolution original')]]);
  const manifest = { schema: 1, repository: 'Kaoxt/dragonball', sourceCommit: 'a'.repeat(40), assets: {} };
  for (const [path, bytes] of files) manifest.assets[path] = { sha256: hash(bytes), key: `sha256/${hash(bytes)}.webp`, size: bytes.length };
  const objects = new Map(); const writes = [];
  const storage = { get: async key => objects.get(key) || null, put: async (key, bytes) => {
    writes.push(key); objects.set(key, bytes); return { etag: `"${hash(bytes, 'md5')}"` };
  } };
  return { files, manifest, objects, storage, writes };
}
const options = { log: () => {} };
test('migration preserves exact bytes and subsequent releases skip unchanged objects', async () => {
  const { files, manifest, objects, storage, writes } = fixture();
  await syncAssets(manifest, storage, async path => files.get(path), options);
  for (const [path, asset] of Object.entries(manifest.assets)) assert.deepEqual(objects.get(asset.key), files.get(path));
  writes.length = 0;
  await syncAssets(manifest, storage, async () => { throw new Error('unchanged images must not download'); }, options);
  assert.equal(writes.filter(k => k.startsWith('sha256/')).length, 0);
});
test('source checksum failures cannot mark an image or release as verified', async () => {
  const { manifest, objects, storage } = fixture();
  await assert.rejects(syncAssets(manifest, storage, async () => Buffer.from('modified artwork'), options), /checksum mismatch/);
  assert.equal([...objects.keys()].filter(k => k.startsWith('sha256/')).length, 0);
  assert.equal([...objects.keys()].filter(k => k.startsWith('_releases/')).length, 0);
});
test('an interrupted batch checkpoints successful objects and retry uploads only the remainder', async () => {
  const { files, manifest, objects, storage, writes } = fixture();
  let fail = true;
  const download = async path => { if (fail && path.includes('downloads')) throw new Error('interrupted'); return files.get(path); };
  await assert.rejects(syncAssets(manifest, storage, download, options), /interrupted/);
  assert.equal(Object.keys(JSON.parse(objects.get('_migration/verified-v1.json')).verified).length, 1);
  assert.equal(objects.has(`_releases/${manifest.sourceCommit}.json`), false);
  fail = false; writes.length = 0;
  await syncAssets(manifest, storage, download, options);
  assert.equal(writes.filter(k => k.startsWith('sha256/')).length, 1);
});
test('read-back verification detects damaged storage when no valid ETag is returned', async () => {
  const { files, manifest, storage } = fixture();
  const put = storage.put;
  storage.put = async (...args) => { await put(...args); return {}; };
  await syncAssets(manifest, storage, async path => files.get(path), options);
  const bad = { get: async key => key.startsWith('sha256/') ? Buffer.from('corrupted') : null, put: async () => ({}) };
  await assert.rejects(syncAssets(manifest, bad, async path => files.get(path), options), /R2 checksum mismatch/);
});
test('invalid manifests cannot redirect uploads, fetch unpinned sources, or escape image paths', () => {
  const { manifest } = fixture();
  for (const patch of [{ repository: 'attacker/repo' }, { sourceCommit: 'main' }, { assets: { '/assets/cards/../secret.webp': Object.values(manifest.assets)[0] } }]) {
    assert.throws(() => validateManifest({ ...manifest, ...patch }), /Invalid/);
  }
  assert.throws(() => cloudflareStorage({ accountId: 'a'.repeat(32), bucket: 'cards' }), /CLOUDFLARE_API_TOKEN/);
});
test('a migration time limit stops before publication and leaves a clear retry instruction', async () => {
  const { files, manifest, objects, storage } = fixture();
  await assert.rejects(syncAssets(manifest, storage, async path => files.get(path), { ...options, budgetMs: 0 }), /Retry this build/);
  assert.equal(objects.size, 0);
});
