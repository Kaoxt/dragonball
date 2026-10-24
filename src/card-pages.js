import {catalog} from '../public/cards/catalog.js';
import {cardFromPath, cardPath} from '../public/cards/card-links.js';

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export async function cardPage(request, assets) {
  const url = new URL(request.url);
  if (!/^\/cards\/[^/]+\/[^/]+\/?$/.test(url.pathname)) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}});
  const card = cardFromPath(url.pathname, catalog);
  if (card && url.pathname !== cardPath(card)) {
    url.pathname = cardPath(card);
    return Response.redirect(url.href, 308);
  }
  const index = new URL('/cards/', url);
  const response = await assets.fetch(new Request(index, {method:'GET'}));
  if (!response.ok) return response;
  let html = await response.text();
  const title = card ? `${card.name} · ${card.set} #${card.number} | Dragon Ball OCG` : 'Card not found | Dragon Ball OCG';
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHTML(title)}</title>`);
  if (card) {
    const canonical = new URL(cardPath(card), url).href;
    const description = `${card.name}, card #${card.number} from ${card.set}. ${card.type} · ${card.style}. View and download this Dragon Ball OCG card.`;
    const image = new URL(card.image, url).href;
    html = html.replace('</head>', `<link rel="canonical" href="${escapeHTML(canonical)}"><meta name="description" content="${escapeHTML(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${escapeHTML(canonical)}"><meta property="og:image" content="${escapeHTML(image)}"><meta property="og:image:alt" content="${escapeHTML(card.name)}"><meta name="twitter:card" content="summary_large_image"></head>`);
  } else {
    html = html.replace('</head>', '<meta name="robots" content="noindex"></head>');
    html = html.replace('id="card-link-error" hidden', 'id="card-link-error"');
  }
  const headers = new Headers(response.headers);
  for (const key of ['etag', 'content-length', 'content-encoding', 'last-modified']) headers.delete(key);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=60');
  return new Response(request.method === 'HEAD' ? null : html, {status:card ? 200 : 404, headers});
}
