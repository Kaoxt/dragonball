import { forumHandle, ensureMember, mayPost, limitForumWrites, IssueError } from './forum.js';
import { API_SECURITY_HEADERS } from './security.js';

export const FORUM_IMAGE_LIMIT = 500 * 1024;
const imagePath = /^\/api\/forum\/images\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

export function forumImageRequest(request, env) {
  const path = new URL(request.url).pathname;
  return forumHandle({ request, env }, request.method === 'POST', async ({ db, session, admin, reply }) => {
    const match = imagePath.exec(path);
    if (match && request.method === 'GET') {
      const row = await db.prepare('SELECT * FROM forum_images WHERE id=?').bind(match[1]).first();
      if (!row) throw new IssueError('Image not found.', 404);
      // Drafts belong to their uploader. Published images follow post visibility,
      // including replies whose parent topic has been hidden or deleted.
      if (!admin && session?.id !== row.user_id) {
        const reference = '](' + path + ')';
        const visible = await db.prepare(`SELECT 1 AS found FROM forum_topics WHERE hidden=0 AND instr(body,?)>0
          UNION ALL SELECT 1 FROM forum_replies r JOIN forum_topics t ON t.id=r.topic_id
          WHERE r.hidden=0 AND t.hidden=0 AND instr(r.body,?)>0 LIMIT 1`).bind(reference, reference).first();
        if (!visible) throw new IssueError('Image not found.', 404);
      }
      const object = await env.UPLOADS?.get('forum-images/' + row.id);
      if (!object) throw new IssueError('Image not found.', 404);
      return new Response(object.body, { headers: {
        ...API_SECURITY_HEADERS, 'Content-Type': 'image/jpeg', 'Content-Length': String(row.size),
        'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox",
      } });
    }
    if (path !== '/api/forum/images' || request.method !== 'POST') throw new IssueError('Not found.', 404);
    const member = await ensureMember(db, session, env);
    await mayPost(db, member, admin);
    if (!env.UPLOADS) throw new IssueError('Image uploads are temporarily unavailable.', 503);
    await limitForumWrites(db, session.id, 'image-upload', 20, 600);
    if (request.headers.get('Content-Type') !== 'image/jpeg') throw new IssueError('Choose a JPG, PNG, or WebP image.', 415);
    if (Number(request.headers.get('Content-Length')) > FORUM_IMAGE_LIMIT) throw new IssueError('Image is too large. Try a smaller image.', 413);
    const reader = request.body?.getReader();
    if (!reader) throw new IssueError('Choose an image to upload.');
    const chunks = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > FORUM_IMAGE_LIMIT) { await reader.cancel(); throw new IssueError('Image is too large. Try a smaller image.', 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = Buffer.concat(chunks);
    if (size < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes[size - 2] !== 255 || bytes[size - 1] !== 217) throw new IssueError('This image could not be read. Choose another image.');
    const id = crypto.randomUUID(), key = 'forum-images/' + id;
    // Reserve the record before the asynchronous object write, so concurrent
    // requests count toward the quota. A failed upload never leaves a record.
    const reserved = await db.prepare(`INSERT INTO forum_images(id,user_id,size,created_at)
      SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM forum_images WHERE user_id=?)<2000`)
      .bind(id, session.id, size, new Date().toISOString(), session.id).run();
    if (!reserved.meta.changes) throw new IssueError('Your image upload limit has been reached. Contact an administrator.', 409);
    try { await env.UPLOADS.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } }); }
    catch (error) { await db.prepare('DELETE FROM forum_images WHERE id=?').bind(id).run(); throw error; }
    return reply({ url: '/api/forum/images/' + id }, 201);
  });
}
