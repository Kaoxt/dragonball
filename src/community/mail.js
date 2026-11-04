import PostalMime from 'postal-mime';
import { randomUUID } from 'node:crypto';
import { readSession, assertSameOrigin, hash } from './session.js';
import { API_SECURITY_HEADERS } from './security.js';
import { classifyMail, emailAddress, previewText, MAX_PREVIEW_BYTES, DOMAIN } from './mail-filter.js';

const PREFIX = '/api/mail';
const ID = /^[a-f0-9-]{36}$/;
const headers = { ...API_SECURITY_HEADERS, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' };
const reply = (data, status = 200) => Response.json(data, { status, headers });
class MailError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

export function mailSchema(db) {
  db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS mailboxes(id TEXT PRIMARY KEY,address TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL,created_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS mail_messages(id TEXT PRIMARY KEY,mailbox_id TEXT NOT NULL,object_key TEXT UNIQUE,direction TEXT NOT NULL DEFAULT 'incoming',folder TEXT NOT NULL DEFAULT 'inbox',sender TEXT NOT NULL DEFAULT '',sender_name TEXT NOT NULL DEFAULT '',envelope_sender TEXT NOT NULL DEFAULT '',recipient TEXT NOT NULL,subject TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',received_at INTEGER NOT NULL,is_read INTEGER NOT NULL DEFAULT 0,spam_score INTEGER NOT NULL DEFAULT 0,reasons TEXT NOT NULL DEFAULT '[]',attachments TEXT NOT NULL DEFAULT '[]',message_id TEXT NOT NULL DEFAULT '',reply_to TEXT NOT NULL DEFAULT '',send_status TEXT NOT NULL DEFAULT '')`),
    db.prepare('CREATE INDEX IF NOT EXISTS mail_list ON mail_messages(mailbox_id,folder,received_at DESC,id)'),
    db.prepare('CREATE TABLE IF NOT EXISTS mail_blocks(mailbox_id TEXT NOT NULL,sender TEXT NOT NULL,PRIMARY KEY(mailbox_id,sender))'),
    db.prepare('CREATE TABLE IF NOT EXISTS mail_sync(mailbox_id TEXT PRIMARY KEY,cursor TEXT NOT NULL DEFAULT \'\')'),
  ]);
  // Attach the original support inbox only to the established owner account.
  const owner = db.prepare("SELECT a.id FROM auth_accounts a JOIN auth_settings s ON s.value=a.id WHERE s.key IN ('2026-10-19-kaoxt-admin-access','owner_claimed') AND a.role='admin' ORDER BY CASE s.key WHEN '2026-10-19-kaoxt-admin-access' THEN 0 ELSE 1 END LIMIT 1").first();
  if (owner) db.prepare('INSERT OR IGNORE INTO mailboxes(id,address,owner_id,created_at) VALUES(?,?,?,0)').bind(randomUUID(), 'support@' + DOMAIN, owner.id).run();
}
async function serialized(env, fn) {
  const previous = env.MAIL_QUEUE || Promise.resolve();
  let release;
  env.MAIL_QUEUE = new Promise(resolve => { release = resolve; });
  await previous;
  try { return await fn(); } finally { release(); }
}
function rate(db, key, max, seconds) {
  const start = Math.floor(Date.now() / (seconds * 1000)) * seconds;
  const result = db.prepare(`INSERT INTO auth_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN auth_limits.window_start=excluded.window_start THEN auth_limits.count+1 ELSE 1 END WHERE auth_limits.window_start!=excluded.window_start OR auth_limits.count<?`).bind('mail:' + key, start, max).run();
  if (!result.meta.changes) throw new MailError('Too many requests. Please try again shortly.', 429);
}
async function input(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new MailError('JSON required.', 415);
  if (Number(request.headers.get('Content-Length')) > 60000) throw new MailError('Message is too large.', 413);
  const reader = request.body?.getReader();
  let size = 0, chunks = [];
  if (reader) try { for (;;) { const {value, done} = await reader.read(); if (done) break; size += value.length; if (size > 60000) { await reader.cancel(); throw new MailError('Message is too large.', 413); } chunks.push(value); } } finally { reader.releaseLock(); }
  try { const value = JSON.parse(await new Blob(chunks).text()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { throw new MailError('Invalid message.'); }
}
function mailboxFor(db, id, user) {
  const box = db.prepare('SELECT * FROM mailboxes WHERE id=? AND owner_id=?').bind(id, user.id).first();
  if (!box) throw new MailError('Mailbox not found.', 404);
  return box;
}
function messageFor(db, id, box) {
  const row = db.prepare("SELECT * FROM mail_messages WHERE id=? AND mailbox_id=? AND folder!='deleted'").bind(id, box.id).first();
  if (!row) throw new MailError('Message not found.', 404);
  return row;
}
function describe(row, detail = false) {
  return { id: row.id, folder: row.folder, direction: row.direction, from: row.sender, fromName: row.sender_name,
    to: row.recipient, subject: row.subject, preview: row.body.slice(0, 150), receivedAt: row.received_at,
    read: !!row.is_read, spamScore: row.spam_score, reasons: JSON.parse(row.reasons), sendStatus: row.send_status,
    attachmentCount: JSON.parse(row.attachments).length,
    ...(detail ? {body: row.body, replyTo: row.reply_to, attachments: JSON.parse(row.attachments), hasSource: !!row.object_key} : {}) };
}
async function registerAddress(env, box) {
  await env.MAIL_STORAGE.put('mailbox-addresses/' + box.address + '.json', JSON.stringify({ address: box.address }), { httpMetadata: {contentType: 'application/json'} });
}
async function sync(env, box) {
  if (!env.MAIL_STORAGE) throw new MailError('Mail storage is not connected yet.', 503);
  rate(env.DB, 'sync:' + box.id, 30, 60);
  await registerAddress(env, box);
  const cursor = env.DB.prepare('SELECT cursor FROM mail_sync WHERE mailbox_id=?').bind(box.id).first()?.cursor || '';
  const batch = await env.MAIL_STORAGE.list({ prefix: 'incoming/', limit: 25, include: ['customMetadata'], ...(cursor ? {cursor} : {}) });
  let added = 0;
  for (const item of batch.objects) {
    // The SMTP envelope from the receiver, NEVER the untrusted To/Cc headers,
    // determines ownership (including Bcc deliveries).
    const metadata = item.customMetadata || {};
    if (emailAddress(metadata.recipient) !== box.address) continue;
    const receivedAt = Date.parse(metadata.receivedAt) || new Date(item.uploaded).getTime();
    if (!Number.isFinite(receivedAt) || receivedAt < box.created_at) continue;
    if (env.DB.prepare('SELECT id FROM mail_messages WHERE object_key=?').bind(item.key).first()) continue;
    const object = await env.MAIL_STORAGE.get(item.key);
    if (!object) continue;
    // Recheck the object's own trusted metadata after list/get.
    if (emailAddress(object.customMetadata?.recipient) !== box.address) continue;
    let email = {}, parsingReason = '';
    if (object.size > MAX_PREVIEW_BYTES) parsingReason = 'Message exceeds the 10 MB preview limit; original email is available for download';
    else {
      try { email = await PostalMime.parse(await object.arrayBuffer()); }
      catch { parsingReason = 'Message format could not be safely previewed; original email is available for download'; }
    }
    const sender = emailAddress(email.from?.address) || emailAddress(metadata.sender);
    const blocked = !!env.DB.prepare('SELECT sender FROM mail_blocks WHERE mailbox_id=? AND sender=?').bind(box.id, sender).first();
    const verdict = classifyMail(email, metadata.sender, blocked);
    if (parsingReason) { verdict.spam = true; verdict.reasons.push(parsingReason); }
    const attachments = (email.attachments || []).map((a, index) => ({index, name: String(a.filename || 'attachment').slice(0, 180), size: a.content?.byteLength || 0}));
    env.DB.prepare(`INSERT INTO mail_messages(id,mailbox_id,object_key,sender,sender_name,envelope_sender,recipient,subject,body,received_at,folder,spam_score,reasons,attachments,message_id,reply_to) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(randomUUID(), box.id, item.key, sender, String(email.from?.name || '').slice(0, 200), emailAddress(metadata.sender), box.address,
        String(email.subject || '(No subject)').slice(0, 500), previewText(email), receivedAt, verdict.spam ? 'spam' : 'inbox', verdict.score,
        JSON.stringify(verdict.reasons), JSON.stringify(attachments), String(email.messageId || '').slice(0, 500), emailAddress(email.replyTo?.[0]?.address) || sender).run();
    added++;
  }
  const more = !!batch.truncated;
  env.DB.prepare('INSERT INTO mail_sync(mailbox_id,cursor) VALUES(?,?) ON CONFLICT(mailbox_id) DO UPDATE SET cursor=excluded.cursor').bind(box.id, more ? batch.cursor : '').run();
  return reply({added, more});
}
async function manage(request, env, user) {
  if (user.role !== 'admin') throw new MailError('Administrator access required.', 403);
  if (request.method === 'GET') {
    const boxes = env.DB.prepare('SELECT m.id,m.address,a.username AS owner FROM mailboxes m JOIN auth_accounts a ON a.id=m.owner_id ORDER BY m.address').all().results;
    return reply({mailboxes: boxes});
  }
  const data = await input(request);
  const local = String(data.address || '').trim().toLowerCase().replace(new RegExp('@' + DOMAIN.replaceAll('.', '\\.') + '$'), '');
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(local) || local.includes('..')) throw new MailError('Use letters, numbers, dots, underscores or hyphens for the address.');
  const owner = env.DB.prepare('SELECT id FROM auth_accounts WHERE username=? COLLATE NOCASE').bind(String(data.username || '').trim()).first();
  if (!owner) throw new MailError('That site account was not found. Ask the person to register first.');
  const address = local + '@' + DOMAIN;
  if (env.DB.prepare('SELECT id FROM mailboxes WHERE address=?').bind(address).first()) throw new MailError('That address already has an inbox.', 409);
  if (env.DB.prepare('SELECT COUNT(*) AS count FROM mailboxes').first().count >= 50) throw new MailError('The 50-mailbox limit has been reached.', 409);
  if (!env.MAIL_STORAGE) throw new MailError('Connect mail storage before creating an inbox.', 503);
  const box = {id: randomUUID(), address, owner_id: owner.id, created_at: Date.now()};
  // Reserve ownership before publishing the receiving address. A failed R2 write
  // is recoverable through the owner's next sync; it cannot transfer ownership.
  env.DB.prepare('INSERT INTO mailboxes(id,address,owner_id,created_at) VALUES(?,?,?,?)').bind(box.id, address, owner.id, box.created_at).run();
  try { await registerAddress(env, box); } catch { return reply({mailbox: box, routeSetupRequired: true, registrationPending: true}, 201); }
  return reply({mailbox: {id: box.id, address}, routeSetupRequired: true}, 201);
}
function sendReady(env) { return !!env.MAIL_OUTBOUND && env.MAIL_SEND_ENABLED === 'true'; }
async function send(request, env, box) {
  const data = await input(request);
  if (!ID.test(data.id || '')) throw new MailError('Invalid send request.');
  const prior = env.DB.prepare('SELECT * FROM mail_messages WHERE id=? AND mailbox_id=?').bind(data.id, box.id).first();
  if (prior) {
    if (prior.send_status === 'sent') return reply({sent: true, message: describe(prior)});
    throw new MailError('The earlier send has an uncertain result. Check Sent and Cloudflare delivery logs before sending again.', 409);
  }
  if (!sendReady(env)) throw new MailError('Email sending is not enabled yet. Incoming mail is available.', 503);
  const to = emailAddress(data.to);
  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!to || !subject || subject.length > 300 || /[\r\n\x00]/.test(subject) || !text || text.length > 30000) throw new MailError('Enter one recipient, a subject, and a message of up to 30,000 characters.');
  rate(env.DB, 'send:' + box.owner_id, 20, 3600);
  const customHeaders = {};
  if (data.replyId) {
    const parent = messageFor(env.DB, data.replyId, box);
    if (/^<[^<>\s]{1,450}>$/.test(parent.message_id)) customHeaders['In-Reply-To'] = parent.message_id;
  }
  env.DB.prepare("INSERT INTO mail_messages(id,mailbox_id,direction,folder,sender,recipient,subject,body,received_at,is_read,send_status) VALUES(?,?,'outgoing','sent',?,?,?,?,?,1,'sending')").bind(data.id, box.id, box.address, to, subject, text, Date.now()).run();
  try {
    const result = await env.MAIL_OUTBOUND.send({from: box.address, to, subject, text, ...(Object.keys(customHeaders).length ? {headers: customHeaders} : {})});
    env.DB.prepare("UPDATE mail_messages SET send_status='sent',message_id=? WHERE id=? AND mailbox_id=?").bind(String(result?.messageId || ''), data.id, box.id).run();
  } catch {
    env.DB.prepare("UPDATE mail_messages SET send_status='uncertain' WHERE id=? AND mailbox_id=?").bind(data.id, box.id).run();
    throw new MailError('Sending could not be confirmed. Your message is saved in Sent with an uncertain status; check delivery logs before retrying.', 502);
  }
  return reply({sent: true});
}
export async function mailRequest(request, env) {
  try {
    const url = new URL(request.url);
    const user = await readSession(request, env);
    if (!user) throw new MailError('Log in to open your mailbox.', 401);
    if (!['GET', 'POST'].includes(request.method)) throw new MailError('Method not allowed.', 405);
    if (request.method === 'POST' && !assertSameOrigin(request)) throw new MailError('Same-origin requests only.', 403);
    rate(env.DB, 'api:' + user.id, 120, 60);
    if (url.pathname === '/api/admin/mailboxes') return await serialized(env, () => manage(request, env, user));
    if (url.pathname === PREFIX && request.method === 'GET') return reply({mailboxes: env.DB.prepare('SELECT id,address FROM mailboxes WHERE owner_id=? ORDER BY address').bind(user.id).all().results, isAdmin: user.role === 'admin', username: user.username, storageReady: !!env.MAIL_STORAGE, sendReady: sendReady(env)});
    const route = /^\/api\/mail\/([a-f0-9-]{36})(?:\/(sync|send|blocks|messages)(?:\/([a-f0-9-]{36})(?:\/(source|attachment\/([0-9]+)))?)?)?$/.exec(url.pathname);
    if (!route) throw new MailError('Not found.', 404);
    const box = mailboxFor(env.DB, route[1], user);
    const action = route[2], messageId = route[3];
    if (action === 'sync' && request.method === 'POST') return await serialized(env, () => sync(env, box));
    if (action === 'send' && request.method === 'POST') return await serialized(env, () => send(request, env, box));
    if (action === 'blocks') {
      if (request.method === 'GET') return reply({blocked: env.DB.prepare('SELECT sender FROM mail_blocks WHERE mailbox_id=? ORDER BY sender').bind(box.id).all().results.map(row => row.sender)});
      const data = await input(request), sender = emailAddress(data.sender);
      if (!sender || typeof data.blocked !== 'boolean') throw new MailError('Enter a valid sender address.');
      if (data.blocked) env.DB.prepare('INSERT OR IGNORE INTO mail_blocks(mailbox_id,sender) VALUES(?,?)').bind(box.id, sender).run();
      else env.DB.prepare('DELETE FROM mail_blocks WHERE mailbox_id=? AND sender=?').bind(box.id, sender).run();
      if (data.blocked) env.DB.prepare("UPDATE mail_messages SET folder='spam' WHERE mailbox_id=? AND sender=? AND direction='incoming' AND folder='inbox'").bind(box.id, sender).run();
      return reply({ok: true});
    }
    if (action !== 'messages') throw new MailError('Not found.', 404);
    if (!messageId && request.method === 'GET') {
      const folder = url.searchParams.get('folder') || 'inbox';
      if (!['inbox','spam','trash','sent','archive'].includes(folder)) throw new MailError('Invalid folder.');
      const query = (url.searchParams.get('q') || '').slice(0, 100);
      const offset = Math.max(0, Math.min(100000, parseInt(url.searchParams.get('offset'), 10) || 0));
      const rows = env.DB.prepare('SELECT * FROM mail_messages WHERE mailbox_id=? AND folder=? AND (instr(lower(subject),lower(?))>0 OR instr(lower(sender),lower(?))>0 OR instr(lower(body),lower(?))>0) ORDER BY received_at DESC,id DESC LIMIT 51 OFFSET ?').bind(box.id, folder, query, query, query, offset).all().results;
      const counts = env.DB.prepare("SELECT folder,COUNT(*) AS count,SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) AS unread FROM mail_messages WHERE mailbox_id=? AND folder!='deleted' GROUP BY folder").bind(box.id).all().results;
      return reply({messages: rows.slice(0,50).map(row => describe(row)), more: rows.length > 50, counts});
    }
    const row = messageFor(env.DB, messageId, box);
    if (route[4] && request.method === 'GET') {
      if (!row.object_key || !env.MAIL_STORAGE) throw new MailError('Original message unavailable.', 404);
      const object = await env.MAIL_STORAGE.get(row.object_key);
      if (!object || emailAddress(object.customMetadata?.recipient) !== box.address) throw new MailError('Original message unavailable.', 404);
      const downloadHeaders = {...headers, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Type': 'application/octet-stream'};
      if (route[4] === 'source') return new Response(object.body, {headers: {...downloadHeaders, 'Content-Disposition': 'attachment; filename="message.eml"'}});
      if (object.size > MAX_PREVIEW_BYTES) throw new MailError('Download the original email to access this attachment.', 413);
      const email = await PostalMime.parse(await object.arrayBuffer());
      const attachment = email.attachments?.[Number(route[5])];
      if (!attachment) throw new MailError('Attachment not found.', 404);
      const filename = String(attachment.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0,180);
      return new Response(attachment.content, {headers: {...downloadHeaders, 'Content-Disposition': `attachment; filename="${filename}"`}});
    }
    if (request.method === 'GET') return reply({message: describe(row, true)});
    const data = await input(request);
    if (typeof data.read === 'boolean') env.DB.prepare('UPDATE mail_messages SET is_read=? WHERE id=? AND mailbox_id=?').bind(data.read ? 1 : 0, row.id, box.id).run();
    if (data.folder) {
      const allowed = row.direction === 'outgoing' ? ['sent','trash'] : ['inbox','spam','trash','archive'];
      if (!allowed.includes(data.folder)) throw new MailError('Invalid destination folder.');
      env.DB.prepare('UPDATE mail_messages SET folder=? WHERE id=? AND mailbox_id=?').bind(data.folder, row.id, box.id).run();
    }
    return reply({ok: true});
  } catch (error) {
    if (error instanceof MailError) return reply({error: error.message}, error.status);
    console.error('Mailbox request failed:', error?.name || 'Error');
    return reply({error: 'Mail could not finish this request. Please retry.'}, 503);
  }
}
