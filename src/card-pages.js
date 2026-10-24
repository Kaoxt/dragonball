import {catalog} from '../public/cards/catalog.js';
import {catalogRoute, catalogSets} from '../public/cards/card-links.js';

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export async function cardPage(request, assets) {
  const url = new URL(request.url);
  const route = catalogRoute(url.pathname, catalog);
  if (!route) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}});
  if (route.path && url.pathname !== route.path) {
    url.pathname = route.path;
    return Response.redirect(url.href, 308);
  }
  const response = await assets.fetch(new Request(new URL('/cards/', url), {method:'GET'}));
  if (!response.ok) return response;
  let html = await response.text();
  const card = route.card;
  const sets = catalogSets(catalog);
  const set = sets.find(set => set.name === route.set);
  const isDirectory = ['sets','missing'].includes(route.kind);
  const title = card ? `${card.name} · ${card.set} #${card.number} | Dragon Ball OCG`
    : route.kind === 'missing' ? 'Cards not found | Dragon Ball OCG'
    : isDirectory ? 'Card sets | Dragon Ball OCG' : `${route.set || 'All cards'} | Dragon Ball OCG`;
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHTML(title)}</title>`);
  const rows = sets.map(set => `<tr><th scope="row"><a class="set-entry" href="${set.path}">${set.image ? `<span class="set-logo set-logo--${set.slug}" aria-hidden="true"><img class="set-logo-symbol" src="${set.image}" alt="" width="2172" height="724"><img class="set-logo-lettering" src="${set.image}" alt="" width="2172" height="724"></span>` : ''}<span class="set-name">${escapeHTML(set.name)}</span></a></th><td><a class="set-count" href="${set.path}" aria-label="${set.count} cards in ${escapeHTML(set.name)}">${set.count}</a></td></tr>`).join('');
  html = html.replace('<!-- SET_ROWS -->', rows);
  html = html.replace('<select id="set"><option value="">All sets</option></select>', `<select id="set"><option value=""${!set?' selected':''}>All sets</option>${sets.map(item => `<option value="${escapeHTML(item.name)}"${item.name===route.set?' selected':''}>${escapeHTML(item.name)}</option>`).join('')}</select>`);
  if (!isDirectory) {
    html = html.replace('id="set-directory"', 'id="set-directory" hidden').replace('id="card-browser" hidden', 'id="card-browser"');
    html = html.replace('id="breadcrumb-current" aria-current="page">All cards', `id="breadcrumb-current" aria-current="page">${escapeHTML(route.set||'All cards')}`);
  }
  if (route.kind !== 'missing') {
    const canonical = new URL(route.path, url).href;
    const description = card ? `${card.name}, card #${card.number} from ${card.set}. ${card.type} · ${card.style}. View and download this Dragon Ball OCG card.`
      : set ? `Browse ${set.count} ${set.name} cards in the Dragon Ball OCG card database.` : 'Browse Dragon Ball OCG sets and cards, view artwork, and download cards.';
    const image = new URL(card?.image || set?.image || '/assets/dragon-ball-online-logo.webp', url).href;
    html = html.replace('</head>', `<link rel="canonical" href="${escapeHTML(canonical)}"><meta name="description" content="${escapeHTML(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${escapeHTML(canonical)}"><meta property="og:image" content="${escapeHTML(image)}"><meta property="og:image:alt" content="${escapeHTML(card?.name || route.set || 'Dragon Ball OCG')}"><meta name="twitter:card" content="summary_large_image"></head>`);
  } else {
    html = html.replace('</head>', '<meta name="robots" content="noindex"></head>');
    html = html.replace('id="card-link-error" hidden', 'id="card-link-error"');
  }
  const headers = new Headers(response.headers);
  for (const key of ['etag', 'content-length', 'content-encoding', 'last-modified']) headers.delete(key);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=60');
  return new Response(request.method === 'HEAD' ? null : html, {status:route.kind==='missing'?404:200, headers});
}
