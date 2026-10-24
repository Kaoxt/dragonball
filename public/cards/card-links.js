// Shared by the database and Worker so copied URLs resolve to the same card.
export const setSlug = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const numberSlug = value => /^\d+$/.test(String(value)) ? String(Number(value)).padStart(3, '0') : String(value).toLowerCase();
export const cardPath = card => `/cards/${setSlug(card.set)}/${encodeURIComponent(numberSlug(card.number))}`;
export const setPath = name => `/cards/${setSlug(name)}/`;
const logos = {
  'saiyan-saga':'/assets/sets/saiyan-saga-logo-brushed-blue.webp',
  'frieza-saga':'/assets/sets/frieza-saga-logo-brushed-green.webp'
};
export function catalogSets(catalog) {
  const sets = new Map();
  for (const card of catalog) {
    if (!sets.has(card.set)) sets.set(card.set, {name:card.set, slug:setSlug(card.set), path:setPath(card.set), image:logos[setSlug(card.set)] || '', count:0});
    sets.get(card.set).count++;
  }
  return [...sets.values()];
}
export function cardFromPath(pathname, catalog) {
  const match = /^\/cards\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    const set = decodeURIComponent(match[1]).toLowerCase();
    const number = numberSlug(decodeURIComponent(match[2]));
    return catalog.find(card => setSlug(card.set) === set && numberSlug(card.number) === number) || null;
  } catch { return null; }
}

export function catalogRoute(pathname, catalog) {
  if (/^\/cards\/?$/.test(pathname) || pathname === '/cards/index.html') return {kind:'sets', path:'/cards/'};
  if (/^\/cards\/all\/?$/i.test(pathname)) return {kind:'all', path:'/cards/all/', set:''};
  const card = cardFromPath(pathname, catalog);
  if (card) return {kind:'card', path:cardPath(card), card, set:card.set};
  const match = /^\/cards\/([^/.]+)\/?$/.exec(pathname);
  if (match) {
    try {
      const set = catalogSets(catalog).find(set => set.slug === decodeURIComponent(match[1]).toLowerCase());
      if (set) return {kind:'set', path:set.path, set:set.name};
    } catch { /* Malformed URLs become a useful not-found page. */ }
    return {kind:'missing'};
  }
  if (/^\/cards\/[^/]+\/[^/]+\/?$/.test(pathname)) return {kind:'missing'};
  return null;
}
