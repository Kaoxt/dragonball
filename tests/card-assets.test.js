import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cardAsset, parseRange } from '../src/card-assets.js';

const bytes = Buffer.from('original lossless card bytes');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const path = '/assets/cards/downloads/test.webp';
const asset = { sha256, key: `sha256/${sha256}.webp`, size: bytes.length };
const manifest = { [path]: asset };
function setup() {
  const calls = [];
  const bucket = {
    head: async key => { calls.push(key); return { size: bytes.length }; },
    get: async (key, options) => {
      calls.push(key);
      const r = options?.range;
      return { size: bytes.length, body: r ? bytes.subarray(r.offset, r.offset + r.length) : bytes };
    },
  };
  const run = (options = {}, url = path + '?v=original') => cardAsset(new Request('https://dragonballocg.com' + url, options), bucket, manifest);
  return { calls, bucket, run };
}
test('original image and download URLs return byte-identical files with security and cache headers', async () => {
  const { run, calls } = setup();
  const response = await run();
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('etag'), `"${sha256}"`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.deepEqual(calls, [asset.key]);
});
test('HEAD and conditional requests preserve ordinary image HTTP behavior', async () => {
  const { run, calls } = setup();
  const head = await run({ method: 'HEAD' });
  assert.equal(head.headers.get('content-length'), String(bytes.length));
  assert.equal(await head.text(), '');
  for (const tag of [`"${sha256}"`, `W/"${sha256}"`, '*', `"other", "${sha256}"`]) {
    const response = await run({ headers: { 'If-None-Match': tag } });
    assert.equal(response.status, 304); assert.equal(await response.text(), '');
  }
  assert.equal((await run({ headers: { 'If-Match': '"wrong"' } })).status, 412);
  assert.equal(calls.length, 1);
});
test('ranges and If-Range return exact requested bytes or the complete current file', async () => {
  const { run } = setup();
  const response = await run({ headers: { Range: 'bytes=2-7' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Content-Range'), `bytes 2-7/${bytes.length}`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(2, 8));
  const suffix = await run({ headers: { Range: 'bytes=-4' } });
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-4));
  const changed = await run({ headers: { Range: 'bytes=0-1', 'If-Range': '"old"' } });
  assert.equal(changed.status, 200); assert.deepEqual(Buffer.from(await changed.arrayBuffer()), bytes);
  for (const range of ['bytes=999-', 'bytes=2-1', 'bytes=-0', 'bytes=0-1,4-5', 'bytes=9007199254740999-']) {
    assert.equal((await run({ headers: { Range: range } })).status, 416);
  }
  assert.deepEqual(parseRange('bytes=2-999', 10), { offset: 2, length: 8 });
});
test('unknown paths and unsupported methods never expose arbitrary R2 keys', async () => {
  const { run, calls } = setup();
  for (const url of ['/assets/cards/private.webp', '/assets/cards/%zz', '/assets/cards/%2e%2e/secrets', '/assets/cards/__proto__']) {
    assert.ok([400, 404].includes((await run({}, url)).status));
  }
  assert.equal((await run({ method: 'POST' })).status, 405);
  assert.equal(calls.length, 0);
});
test('missing or corrupted objects fail without caching a broken card', async () => {
  for (const value of [null, { size: 1, body: 'wrong' }]) {
    const response = await cardAsset(new Request('https://example.com' + path), { get: async () => value }, manifest);
    assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
test('the edge cache is keyed by content and never mixes full and range responses', async () => {
  const { bucket, calls } = setup(); const entries = new Map(); const tasks = [];
  const cache = { match: async key => entries.get(key.url)?.clone(), put: async (key, response) => { entries.set(key.url, response); } };
  const run = (m = manifest, headers = {}) => cardAsset(new Request('https://example.com' + path, { headers }), bucket, m, { waitUntil: p => tasks.push(p) }, cache);
  await (await run()).arrayBuffer(); await Promise.all(tasks);
  await (await run()).arrayBuffer(); assert.equal(calls.length, 1);
  assert.equal((await run(manifest, { Range: 'bytes=0-1' })).status, 206); assert.equal(calls.length, 2);
  const next = { [path]: { ...asset, sha256: 'b'.repeat(64), key: 'sha256/next.webp' } };
  await (await run(next)).arrayBuffer(); assert.equal(calls.length, 3);
});
