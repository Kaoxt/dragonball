// Standalone receiver for dragonball-ocg-mail. R2 is private; no HTTP reading API.
export default {
  async email(message, env) {
    const recipient = String(message.to || '').toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]*@dragonballocg\.com$/.test(recipient)) { message.setReject('Unknown recipient.'); return; }
    // Keep the existing support route working while the mailbox is activated.
    if (recipient !== 'support@dragonballocg.com' && !(await env.MAIL_STORAGE.head('mailbox-addresses/' + recipient + '.json'))) { message.setReject('Unknown recipient.'); return; }
    if (message.rawSize > 25 * 1024 * 1024) { message.setReject('Message is too large.'); return; }
    const id = crypto.randomUUID(), receivedAt = new Date().toISOString();
    // R2 requires a body of known length for this Email Worker stream.
    const raw = await new Response(message.raw).arrayBuffer();
    if (raw.byteLength > 25 * 1024 * 1024) { message.setReject('Message is too large.'); return; }
    await env.MAIL_STORAGE.put(`incoming/${Date.now()}-${id}.eml`, raw, {
      httpMetadata: {contentType: 'message/rfc822'},
      customMetadata: {id, sender: message.from, recipient, receivedAt}
    });
    // Do not log private senders, subjects, or message contents.
    console.log('Email stored successfully');
  },
  fetch() { return new Response('Not found.', {status: 404}); }
};
