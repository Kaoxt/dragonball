import { API_SECURITY_HEADERS } from './community/security.js';

// Keys come only from the release manifest; request paths never become R2 keys.
export async function cardAsset(request, bucket, manifest, context, cache) {
  const url = new URL(request.url);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return reply(400); }
  const asset = Object.hasOwn(manifest, path) ? manifest[path] : null;
  if (!asset) return reply(404);
  if (!['GET', 'HEAD'].includes(request.method)) return reply(405, { Allow: 'GET, HEAD' });
  const etag = `"${asset.sha256}"`;
  const headers = new Headers({ ...API_SECURITY_HEADERS,
    'Content-Type': 'image/webp', 'ETag': etag, 'Accept-Ranges': 'bytes',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
    // Keep existing URLs/revalidation behavior, including unversioned downloads.
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    'Content-Length': String(asset.size),
  });
  const tags = name => request.headers.get(name)?.split(',').map(s => s.trim());
  const match = tags('If-Match');
  if (match && !match.includes('*') && !match.includes(etag)) return reply(412);
  const none = tags('If-None-Match');
  if (none?.some(s => s === '*' || s.replace(/^W\//, '') === etag)) {
    headers.delete('Content-Length');
    return new Response(null, { status: 304, headers });
  }
  let range;
  if (request.method === 'GET' && request.headers.has('Range') &&
      (!request.headers.has('If-Range') || request.headers.get('If-Range') === etag)) {
    range = parseRange(request.headers.get('Range'), asset.size);
    if (!range) return reply(416, { 'Content-Range': `bytes */${asset.size}` });
  }
  // Hash-specific cache keys prevent old images surviving a release at the same URL.
  const cacheKey = new Request(`${url.origin}/__card_asset_cache/${asset.sha256}`);
  if (!range && cache) {
    const hit = await cache.match(cacheKey).catch(() => undefined);
    if (hit) return new Response(request.method === 'HEAD' ? null : hit.body, { headers });
  }
  try {
    const object = request.method === 'HEAD'
      ? await bucket.head(asset.key)
      : await bucket.get(asset.key, range ? { range } : undefined);
    if (!object || object.size !== asset.size) return reply(503, { 'Retry-After': '60' });
    if (range) {
      headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${asset.size}`);
      headers.set('Content-Length', String(range.length));
    }
    const response = new Response(request.method === 'HEAD' ? null : object.body, {
      status: range ? 206 : 200, headers,
    });
    if (!range && request.method === 'GET' && cache && context?.waitUntil) {
      context.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
    }
    return response;
  } catch { return reply(503, { 'Retry-After': '60' }); }
}

function reply(status, headers = {}) {
  return new Response(null, { status, headers: { ...API_SECURITY_HEADERS, 'Cache-Control': 'no-store', ...headers } });
}

export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return null;
    end = Math.min(end, size - 1);
  }
  return { offset: start, length: end - start + 1 };
}
