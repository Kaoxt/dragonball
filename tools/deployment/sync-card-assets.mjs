import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export function validateManifest(manifest) {
  if (manifest.schema !== 1 || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
      manifest.repository !== 'Kaoxt/dragonball' || !manifest.assets || !Object.keys(manifest.assets).length) {
    throw new Error('Invalid release manifest');
  }
  for (const [path, asset] of Object.entries(manifest.assets)) {
    if (!/^\/assets\/cards\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.webp$/.test(path) ||
        path.split('/').some(s => s === '.' || s === '..') ||
        !/^[a-f0-9]{64}$/.test(asset.sha256) || asset.key !== `sha256/${asset.sha256}.webp` ||
        !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > 25 * 1024 * 1024) {
      throw new Error(`Invalid card asset: ${path}`);
    }
  }
  return manifest;
}

// Only publish after upload bytes have been checked. Existing verified objects are immutable.
export async function syncAssets(manifest, storage, download, {
  concurrency = 6, budgetMs = 14 * 60 * 1000, log = console.log,
} = {}) {
  validateManifest(manifest);
  const started = Date.now();
  const receiptKey = '_migration/verified-v1.json';
  const saved = await storage.get(receiptKey);
  const receipt = saved ? JSON.parse(Buffer.from(saved).toString('utf8')) : { schema: 1, verified: {} };
  if (receipt.schema !== 1 || !receipt.verified || typeof receipt.verified !== 'object') throw new Error('Invalid R2 checkpoint');
  const unique = new Map(Object.entries(manifest.assets).map(([path, asset]) => [asset.key, { path, ...asset }]));
  const pending = [...unique.values()].filter(a => receipt.verified[a.sha256] !== a.size);
  log(`Card storage: ${unique.size - pending.length}/${unique.size} objects already verified; ${pending.length} to upload.`);
  let completed = 0;
  for (let i = 0; i < pending.length; i += 24) {
    if (Date.now() - started >= budgetMs) throw new Error('Image migration checkpoint saved. Retry this build to resume; production has not changed.');
    const batch = pending.slice(i, i + 24);
    let next = 0;
    let failure;
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (next < batch.length) {
        const asset = batch[next++];
        try {
          const bytes = Buffer.from(await download(asset.path));
          if (bytes.length !== asset.size || hash(bytes) !== asset.sha256) throw new Error(`Source checksum mismatch: ${asset.path}`);
          const uploaded = await storage.put(asset.key, bytes, 'image/webp');
          // Single-part R2 object ETags are MD5. Fall back to a read-back if absent.
          if (uploaded?.etag?.replaceAll('"', '') !== hash(bytes, 'md5')) {
            const check = await storage.get(asset.key);
            if (!check || hash(check) !== asset.sha256) throw new Error(`R2 checksum mismatch: ${asset.path}`);
          }
          receipt.verified[asset.sha256] = asset.size;
          completed++;
        } catch (error) { failure ||= error; }
      }
    }));
    // Preserve progress even when one transfer fails; retries never start from zero.
    await storage.put(receiptKey, Buffer.from(JSON.stringify(receipt)), 'application/json');
    log(`Card storage: verified ${completed}/${pending.length} new objects.`);
    if (failure) throw failure;
  }
  await storage.put(`_releases/${manifest.sourceCommit}.json`, Buffer.from(JSON.stringify(manifest)), 'application/json');
  log(`Card storage ready: all ${unique.size} unique objects verified.`);
}

export function cloudflareStorage({ accountId, bucket, token, fetcher = fetch }) {
  if (!/^[a-f0-9]{32}$/.test(accountId || '') || !token || !/^[a-z0-9-]+$/.test(bucket || '')) {
    throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN with R2 edit permission in the build environment.');
  }
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
  let nextRequest = 0;
  async function request(url, init = {}) {
    for (let attempt = 0; attempt < 5; attempt++) {
      // Stay below the standard Cloudflare API request limit during the initial migration.
      const delay = Math.max(0, nextRequest - Date.now());
      nextRequest = Math.max(nextRequest, Date.now()) + 300;
      await sleep(delay);
      let response;
      try {
        response = await fetcher(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers },
          redirect: 'error', signal: AbortSignal.timeout(120000) });
      } catch {
        if (attempt === 4) throw new Error('Cloudflare storage network request failed. Retry to resume.');
        await sleep(1000 * 2 ** attempt); continue;
      }
      if (response.status === 429 || response.status >= 500) {
        await response.body?.cancel();
        if (attempt === 4) throw new Error(`Cloudflare storage temporarily unavailable (${response.status}). Retry to resume.`);
        const retry = Number(response.headers.get('Retry-After'));
        await sleep(Math.min(60000, Math.max(1000 * 2 ** attempt, Number.isFinite(retry) ? retry * 1000 : 0)));
        continue;
      }
      if (!response.ok && response.status !== 404) {
        await response.body?.cancel();
        throw new Error(`Cloudflare storage request failed (${response.status}); check the build token's R2 permissions.`);
      }
      return response;
    }
  }
  const objectUrl = key => `${base}/${bucket}/objects/${key.split('/').map(encodeURIComponent).join('/')}`;
  return {
    async ensureBucket() {
      const existing = await request(`${base}/${bucket}`);
      if (existing.status !== 404) { await existing.body?.cancel(); return; }
      await existing.body?.cancel();
      const response = await request(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: bucket }) });
      if (!response.ok) throw new Error('Unable to create the private card-assets bucket');
      await response.body?.cancel();
    },
    async get(key) {
      const response = await request(objectUrl(key));
      if (response.status === 404) { await response.body?.cancel(); return null; }
      return Buffer.from(await response.arrayBuffer());
    },
    async put(key, bytes, contentType) {
      const response = await request(objectUrl(key), { method: 'PUT', headers: { 'Content-Type': contentType, 'Content-Length': String(bytes.length) }, body: bytes });
      if (!response.ok) throw new Error('Card-assets bucket does not exist');
      const etag = response.headers.get('ETag');
      await response.body?.cancel();
      return { etag };
    },
  };
}

async function main() {
  const manifest = validateManifest(JSON.parse(await readFile(new URL('../../deployment/card-assets.json', import.meta.url))));
  const storage = cloudflareStorage({ accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'c258dd1982f4b993816f209b2b7b57b5',
    bucket: 'dragonball-card-assets', token: process.env.CLOUDFLARE_API_TOKEN });
  await storage.ensureBucket();
  await syncAssets(manifest, storage, async path => {
    const url = `https://raw.githubusercontent.com/${manifest.repository}/${manifest.sourceCommit}/public${path}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(120000) });
        if (!response.ok) { await response.body?.cancel(); throw new Error(`GitHub image download failed (${response.status})`); }
        return Buffer.from(await response.arrayBuffer());
      } catch (error) { if (attempt === 3) throw error; await sleep(1000 * 2 ** attempt); }
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
