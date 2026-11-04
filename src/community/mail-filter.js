// Conservative, explainable quarantine. Never treat sender-supplied authentication
// or spam headers as a trusted verdict. Cloudflare applies authentication at SMTP.
export const MAX_PREVIEW_BYTES = 10 * 1024 * 1024;
export const DOMAIN = 'dragonballocg.com';
export function emailAddress(value) {
  const address = String(value || '').trim().toLowerCase();
  return address.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(address) ? address : '';
}
export function previewText(email) {
  // This is text extraction, not HTML sanitization. Render ONLY as textContent.
  const text = email.text || String(email.html || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/(?:p|div|h[1-6]|li|tr)>|<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/&amp;/gi, '&');
  return text.replace(/\u0000/g, '').trim().slice(0, 200000);
}
export function classifyMail(email, envelopeSender, blocked = false) {
  const reasons = [];
  let score = 0;
  const add = (points, reason) => { score += points; reasons.push(reason); };
  if (blocked) add(100, 'Sender is on your blocked list');
  const from = emailAddress(email.from?.address);
  if (!from) add(5, 'Missing or invalid From address');
  if (from.endsWith('@' + DOMAIN) && !emailAddress(envelopeSender).endsWith('@' + DOMAIN)) add(5, 'Site address has a different envelope sender');
  const subject = String(email.subject || '');
  const content = (subject + '\n' + previewText(email).slice(0, 12000)).toLowerCase();
  if (/\b(?:claim (?:your )?(?:prize|winnings)|lottery winner|unclaimed inheritance|guaranteed (?:profit|returns)|free money)\b/.test(content)) add(4, 'Common unsolicited offer language');
  if (/\b(?:verify|confirm|reset|update) (?:your )?(?:password|bank account|payment details)\b/.test(content) && /https?:\/\//.test(content)) add(3, 'Account or payment request containing a link');
  if ((subject.match(/[A-Z]/g) || []).length / Math.max(subject.length, 1) > .8 && subject.length > 15) add(1, 'Mostly uppercase subject');
  if (/!!!|\$\$\$/.test(subject)) add(1, 'Repeated urgency or money punctuation');
  if ((email.attachments || []).some(a => /\.(exe|com|scr|bat|cmd|ps1|vbs|js|jar|hta|lnk|iso)(?:\s|$)/i.test(a.filename || ''))) add(5, 'Potentially executable attachment');
  return { score, reasons, spam: score >= 5 };
}
