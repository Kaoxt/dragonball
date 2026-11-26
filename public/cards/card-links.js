// Shared by the database and Worker so copied URLs resolve to the same card.
export const setSlug = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const numberSlug = value => /^\d+$/.test(String(value)) ? String(Number(value)).padStart(3, '0') : String(value).toLowerCase();
export const cardPath = card => `/cards/${setSlug(card.set)}/${encodeURIComponent(numberSlug(card.number))}`;
export const setPath = name => `/cards/${setSlug(name)}/`;
const logos = {
  'saiyan-saga':'/assets/sets/saiyan-saga-logo-brushed-blue.webp?v=20261026-set-banners',
  'frieza-saga':'/assets/sets/frieza-saga-logo-brushed-green.webp?v=20261026-set-banners',
  'trunks-saga':'/assets/sets/trunks-saga-logo-brushed-purple.webp?v=20261026-set-banners',
  'android-saga':'/assets/sets/android-saga-logo-brushed-crimson.webp?v=20261026-set-banners',
  'cell-saga':'/assets/sets/cell-saga-logo-brushed-blue.png?v=20261028-cell-banner',
  'cell-games-saga':'/assets/sets/cell-games-saga-logo-brushed-green.webp?v=20261104-cell-games-banner',
  'world-games-saga':'/assets/sets/world-games-saga-logo-brushed-blue-spaced.svg?v=20261107-world-games-spaced'
};
// Subsets have their own numbering and URLs, while retaining their parent saga.
export const subsetCollections = {
  'Movie 7: Super Android 13': {
    group: 'promos-subsets', category: 'Movie 7', parentSet: 'Babidi Saga', totalCards: 34,
    image: '/assets/sets/movie-7-emblem.svg?v=20261124'
  }
};
export function catalogSets(catalog) {
  const sets = new Map();
  for (const card of catalog) {
    if (!sets.has(card.set)) sets.set(card.set, {name:card.set, slug:setSlug(card.set), path:setPath(card.set), image:logos[setSlug(card.set)] || '', group:'saga', ...subsetCollections[card.set], count:0});
    sets.get(card.set).count++;
  }
  return [...sets.values()];
}
// Promotional Cards is a browsing collection. Original sets and card URLs
// remain stable so existing shared links and saved decks keep their identity.
export const PROMOTIONAL_SET = 'Promotional Cards';
export function promoCategory(card) {
  if (card.promoCategory) return card.promoCategory;
  const subset = subsetCollections[card.set];
  if (subset?.group === 'promos-subsets') return subset.category || card.set;
  if (/^PR\d+$/i.test(card.number)) {
    const previewSet = card.subset?.match(/^(.+?) preview\b/i)?.[1];
    return `${previewSet || card.set} Previews`;
  }
  if (card.rarity === 'Promo' || /^P\d+$/i.test(card.number)) return `${card.set} Promos`;
  return '';
}
export const cardInSet = (card, set) => !set || (set === PROMOTIONAL_SET ? !!promoCategory(card) : card.set === set);
export function browserSets(catalog) {
  const sets = catalogSets(catalog).filter(set => set.group !== 'promos-subsets');
  const count = catalog.filter(card => promoCategory(card)).length;
  if (count) sets.push({name:PROMOTIONAL_SET, slug:setSlug(PROMOTIONAL_SET), path:setPath(PROMOTIONAL_SET), image:'', group:'promotional', count});
  return sets;
}
export function comparePromoCategories(a, b) {
  // Named releases such as Movie 7 come first, followed by saga promos/previews.
  const aSubset = subsetCollections[a.set]?.group === 'promos-subsets';
  const bSubset = subsetCollections[b.set]?.group === 'promos-subsets';
  return Number(bSubset) - Number(aSubset) || promoCategory(a).localeCompare(promoCategory(b));
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
  if (/^\/cards\/?$/.test(pathname) || pathname === '/cards/index.html' || /^\/cards\/all\/?$/i.test(pathname)) return {kind:'all', path:'/cards/', set:''};
  const card = cardFromPath(pathname, catalog);
  if (card) return {kind:'card', path:cardPath(card), card, set:card.set};
  const match = /^\/cards\/([^/.]+)\/?$/.exec(pathname);
  if (match) {
    try {
      const set = [...browserSets(catalog), ...catalogSets(catalog)].find(set => set.slug === decodeURIComponent(match[1]).toLowerCase());
      if (set) return {kind:'set', path:set.path, set:set.name};
    } catch { /* Malformed URLs become a useful not-found page. */ }
    return {kind:'missing'};
  }
  if (/^\/cards\/[^/]+\/[^/]+\/?$/.test(pathname)) return {kind:'missing'};
  return null;
}


