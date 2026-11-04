import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readSession, assertSameOrigin } from './session.js';
import { API_SECURITY_HEADERS } from './security.js';

export const CHUNK_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const RESUME_MS = 6 * 86400000;
const TYPES = { zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-f]{64}$/;
class UploadError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const reply = (data, status = 200) => Response.json(data, { status, headers: { ...API_SECURITY_HEADERS, 'Cache-Control': 'no-store' } });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function uploadSchema(db) {
  db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_uploads (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, size INTEGER NOT NULL, mime TEXT NOT NULL,
      fingerprint TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, status TEXT NOT NULL,
      object_key TEXT NOT NULL, multipart_id TEXT, share_token TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_upload_parts (
      upload_id TEXT NOT NULL, number INTEGER NOT NULL, etag TEXT NOT NULL, size INTEGER NOT NULL,
      checksum TEXT NOT NULL, PRIMARY KEY(upload_id, number))`)
  ]);
}

// Serialize mutations to bound chunk memory and prevent complete/delete/part races.
async function serialized(env, fn) {
  const previous = env.UPLOAD_QUEUE || Promise.resolve();
  let release;
  env.UPLOAD_QUEUE = new Promise(resolve => { release = resolve; });
  await previous;
  try { return await fn(); } finally { release(); }
}
async function readBytes(request, limit) {
  const declared = request.headers.get('Content-Length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new UploadError('Request is too large.', 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), bytes = new Uint8Array(limit);
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (length + value.length > limit) { await reader.cancel(); throw new UploadError('Request is too large.', 413); }
      bytes.set(value, length); length += value.length;
    }
  } finally { reader.releaseLock(); }
  return bytes.subarray(0, length);
}
async function readJSON(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new UploadError('JSON required.', 415);
  try { return JSON.parse(new TextDecoder().decode(await readBytes(request, 4096))); }
  catch (error) { if (error instanceof UploadError) throw error; throw new UploadError('Invalid JSON.'); }
}
function rowFor(db, id) {
  const row = db.prepare('SELECT * FROM admin_uploads WHERE id=?').bind(id).first();
  if (!row) throw new UploadError('File not found.', 404);
  return row;
}
function partsFor(db, id) { return db.prepare('SELECT number,etag,size,checksum FROM admin_upload_parts WHERE upload_id=? ORDER BY number').bind(id).all().results; }
function describe(db, row, details = false) {
  const parts = partsFor(db, row.id);
  return { id: row.id, name: row.name, size: row.size, label: row.label, fingerprint: row.fingerprint,
    createdAt: row.created_at, updatedAt: row.updated_at, status: row.status === 'uploading' && Date.now() - row.created_at > RESUME_MS ? 'expired' : row.status,
    uploadedBytes: parts.reduce((n, part) => n + part.size, 0), shared: !!row.share_token,
    ...(details ? { parts: parts.map(({ number, size, checksum }) => ({ number, size, checksum })) } : {}) };
}
function verifyMagic(bytes, mime) {
  const match = values => values.every((value, index) => bytes[index] === value);
  const valid = mime === 'application/zip' ? match([80,75,3,4]) || match([80,75,5,6])
    : mime === 'image/png' ? match([137,80,78,71,13,10,26,10])
    : mime === 'image/jpeg' ? match([255,216,255])
    : match([82,73,70,70]) && new TextDecoder().decode(bytes.subarray(8,12)) === 'WEBP';
  if (!valid) throw new UploadError('File contents do not match the selected file type.');
}
async function begin(request, env, user) {
  const data = await readJSON(request);
  if (!data || typeof data !== 'object') throw new UploadError('Invalid upload.');
  const { id, name, size, fingerprint } = data;
  const mime = typeof name === 'string' ? TYPES[name.split('.').at(-1).toLowerCase()] : null;
  if (!ID.test(id || '') || !HASH.test(fingerprint || '')) throw new UploadError('Invalid upload identity.');
  if (!mime || name.length > 180 || /[\x00-\x1f\x7f/\\]/.test(name)) throw new UploadError('Choose a ZIP, PNG, JPG, or WebP file with a simple filename.');
  if (!Number.isSafeInteger(size) || size < 4 || size > MAX_FILE_BYTES) throw new UploadError('Files must be between 4 bytes and 2 GB.');
  const label = typeof data.label === 'string' ? data.label.trim().slice(0, 100) : '';
  const existing = env.DB.prepare('SELECT * FROM admin_uploads WHERE id=?').bind(id).first();
  if (existing) {
    if (existing.name !== name || existing.size !== size || existing.fingerprint !== fingerprint) throw new UploadError('This upload belongs to a different file.', 409);
    return reply({ file: describe(env.DB, existing, true), chunkBytes: CHUNK_BYTES });
  }
  const quota = env.DB.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(size),0) AS bytes,SUM(CASE WHEN status!='ready' THEN 1 ELSE 0 END) AS active FROM admin_uploads").first();
  if (quota.count >= 100 || quota.bytes + size > 20 * 1024 ** 3 || quota.active >= 10) throw new UploadError('Remove unused uploads before adding more files.', 409);
  const now = Date.now(), key = `admin-transfers/${id}/source`;
  const upload = await env.UPLOADS.createMultipartUpload(key, { httpMetadata: { contentType: mime }, customMetadata: { transferId: id } });
  try {
    env.DB.prepare('INSERT INTO admin_uploads(id,name,size,mime,fingerprint,label,created_by,created_at,updated_at,status,object_key,multipart_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, name, size, mime, fingerprint, label, user.id, now, now, 'uploading', key, upload.uploadId).run();
  } catch (error) { await upload.abort(); throw error; }
  return reply({ file: describe(env.DB, rowFor(env.DB, id), true), chunkBytes: CHUNK_BYTES }, 201);
}
async function putPart(request, env, row, partNumber) {
  if (row.status !== 'uploading') throw new UploadError('This upload is no longer accepting parts.', 409);
  if (Date.now() - row.created_at > RESUME_MS) throw new UploadError('This upload expired. Delete it and start again.', 410);
  const count = Math.ceil(row.size / CHUNK_BYTES);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > count) throw new UploadError('Invalid part number.');
  const expected = Math.min(CHUNK_BYTES, row.size - (partNumber - 1) * CHUNK_BYTES);
  const bytes = await readBytes(request, expected);
  if (bytes.length !== expected) throw new UploadError('Incomplete part. Please retry.');
  const checksum = sha(bytes);
  if (request.headers.get('X-Content-SHA256') !== checksum) throw new UploadError('Part checksum mismatch. Please retry.');
  if (partNumber === 1) verifyMagic(bytes, row.mime);
  const old = env.DB.prepare('SELECT checksum FROM admin_upload_parts WHERE upload_id=? AND number=?').bind(row.id, partNumber).first();
  if (old) {
    if (old.checksum !== checksum) throw new UploadError('The selected file differs from the original upload.', 409);
    return reply({ number: partNumber, checksum });
  }
  const part = await env.UPLOADS.resumeMultipartUpload(row.object_key, row.multipart_id).uploadPart(partNumber, bytes);
  env.DB.batch([
    env.DB.prepare('INSERT INTO admin_upload_parts(upload_id,number,etag,size,checksum) VALUES(?,?,?,?,?)').bind(row.id, partNumber, part.etag, expected, checksum),
    env.DB.prepare('UPDATE admin_uploads SET updated_at=? WHERE id=?').bind(Date.now(), row.id)
  ]);
  return reply({ number: partNumber, checksum });
}
async function complete(env, row) {
  if (row.status === 'ready') return reply({ file: describe(env.DB, row) });
  if (row.status !== 'uploading') throw new UploadError('This upload cannot be completed.', 409);
  const parts = partsFor(env.DB, row.id), count = Math.ceil(row.size / CHUNK_BYTES);
  if (parts.length !== count || parts.some((part, index) => part.number !== index + 1) || parts.reduce((n, p) => n + p.size, 0) !== row.size) throw new UploadError('Upload all parts before finishing.', 409);
  // Recover safely if R2 completed successfully but the response/database update was interrupted.
  let object = await env.UPLOADS.head(row.object_key);
  if (!object) {
    await env.UPLOADS.resumeMultipartUpload(row.object_key, row.multipart_id).complete(parts.map(p => ({ partNumber: p.number, etag: p.etag })));
    // R2's completion response can omit custom metadata. Verify the stored object,
    // which is immediately readable after completion, rather than that response.
    object = await env.UPLOADS.head(row.object_key);
  }
  if (!object || object.size !== row.size || object.customMetadata?.transferId !== row.id) throw new UploadError('Stored file verification failed.', 502);
  env.DB.prepare("UPDATE admin_uploads SET status='ready',updated_at=? WHERE id=?").bind(Date.now(), row.id).run();
  return reply({ file: describe(env.DB, rowFor(env.DB, row.id)) });
}
async function remove(env, row) {
  env.DB.prepare("UPDATE admin_uploads SET status='deleting',share_token=NULL WHERE id=?").bind(row.id).run();
  if (row.multipart_id) {
    try { await env.UPLOADS.resumeMultipartUpload(row.object_key, row.multipart_id).abort(); }
    catch (error) { if (!/NoSuchUpload|does not exist|not found|already (completed|aborted)|10024/i.test(String(error))) throw error; }
  }
  await env.UPLOADS.delete(row.object_key);
  env.DB.batch([env.DB.prepare('DELETE FROM admin_upload_parts WHERE upload_id=?').bind(row.id), env.DB.prepare('DELETE FROM admin_uploads WHERE id=?').bind(row.id)]);
  return reply({ deleted: true });
}
export function byteRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new UploadError('Invalid byte range.', 416);
  const offset = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end) || offset >= size || end < offset) throw new UploadError('Invalid byte range.', 416);
  return { offset, length: end - offset + 1 };
}
async function download(request, env, match) {
  if (!['GET', 'HEAD'].includes(request.method)) throw new UploadError('Method not allowed.', 405);
  const row = env.DB.prepare("SELECT * FROM admin_uploads WHERE id=? AND status='ready'").bind(match[1]).first();
  if (!row?.share_token || !timingSafeEqual(Buffer.from(row.share_token), Buffer.from(match[2]))) throw new UploadError('Download link is unavailable or has been revoked.', 404);
  if (!env.UPLOADS) throw new UploadError('File storage is unavailable.', 503);
  const head = await env.UPLOADS.head(row.object_key);
  if (!head) throw new UploadError('File not found.', 404);
  const headers = { ...API_SECURITY_HEADERS, 'Content-Type': row.mime, 'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Disposition': `attachment; filename="${row.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(row.name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}`,
    'Accept-Ranges': 'bytes', ETag: head.httpEtag, 'Content-Length': String(row.size) };
  let range;
  try { range = byteRange(request.headers.get('If-Range') && request.headers.get('If-Range') !== head.httpEtag ? null : request.headers.get('Range'), row.size); }
  catch (error) { return new Response(null, { status: 416, headers: { ...headers, 'Content-Length': '0', 'Content-Range': `bytes */${row.size}` } }); }
  if (range) { headers['Content-Length'] = String(range.length); headers['Content-Range'] = `bytes ${range.offset}-${range.offset + range.length - 1}/${row.size}`; }
  const object = request.method === 'HEAD' ? null : await env.UPLOADS.get(row.object_key, range ? { range } : undefined);
  if (request.method !== 'HEAD' && !object) throw new UploadError('File not found.', 404);
  return new Response(object?.body || null, { status: range ? 206 : 200, headers });
}
export async function uploadRequest(request, env) {
  try {
    const url = new URL(request.url);
    const link = /^\/api\/files\/([0-9a-f-]{36})\/([0-9a-f]{64})\/[^/]+$/.exec(url.pathname);
    if (url.pathname.startsWith('/api/files/')) {
      if (!link) throw new UploadError('File not found.', 404);
      return await download(request, env, link);
    }
    const user = await readSession(request, env);
    if (!user) throw new UploadError('Log in with your administrator account.', 401);
    if (user.role !== 'admin') throw new UploadError('Administrator access required.', 403);
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) throw new UploadError('Method not allowed.', 405);
    if (request.method !== 'GET' && !assertSameOrigin(request)) throw new UploadError('Same-origin requests only.', 403);
    if (url.pathname === '/api/admin/uploads' && request.method === 'GET') {
      const rows = env.DB.prepare('SELECT * FROM admin_uploads ORDER BY created_at DESC LIMIT 100').all().results;
      return reply({ storageReady: !!env.UPLOADS, maxFileBytes: MAX_FILE_BYTES, chunkBytes: CHUNK_BYTES, files: rows.map(row => describe(env.DB, row)) });
    }
    if (!env.UPLOADS) throw new UploadError('Upload storage is not connected yet.', 503);
    return await serialized(env, async () => {
      if (url.pathname === '/api/admin/uploads' && request.method === 'POST') return begin(request, env, user);
      const route = /^\/api\/admin\/uploads\/([0-9a-f-]{36})(?:\/(complete|share|revoke|parts\/([1-9]\d*)))?$/.exec(url.pathname);
      if (!route || !ID.test(route[1])) throw new UploadError('Not found.', 404);
      const row = rowFor(env.DB, route[1]), action = route[2];
      if (!action && request.method === 'GET') return reply({ file: describe(env.DB, row, true), chunkBytes: CHUNK_BYTES });
      if (!action && request.method === 'DELETE') return remove(env, row);
      if (route[3] && request.method === 'PUT') return putPart(request, env, row, Number(route[3]));
      if (action === 'complete' && request.method === 'POST') return complete(env, row);
      if (action === 'share' && request.method === 'POST') {
        if (row.status !== 'ready') throw new UploadError('Finish uploading before sharing.', 409);
        const token = row.share_token || randomBytes(32).toString('hex');
        env.DB.prepare('UPDATE admin_uploads SET share_token=? WHERE id=?').bind(token, row.id).run();
        return reply({ url: `${url.origin}/api/files/${row.id}/${token}/${encodeURIComponent(row.name)}` });
      }
      if (action === 'revoke' && request.method === 'POST') { env.DB.prepare('UPDATE admin_uploads SET share_token=NULL WHERE id=?').bind(row.id).run(); return reply({ revoked: true }); }
      throw new UploadError('Method not allowed.', 405);
    });
  } catch (error) {
    if (error instanceof UploadError) return reply({ error: error.message }, error.status);
    console.error('Upload storage operation failed:', error?.name || 'Error');
    return reply({ error: 'Storage could not finish this request. Your saved progress is kept; please retry.' }, 503);
  }
}
