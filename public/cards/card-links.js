// Shared by the database and Worker so copied URLs resolve to the same card.
export const setSlug = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const numberSlug = value => /^\d+$/.test(String(value)) ? String(Number(value)).padStart(3, '0') : String(value).toLowerCase();
export const cardPath = card => `/cards/${setSlug(card.set)}/${encodeURIComponent(numberSlug(card.number))}`;
export function cardFromPath(pathname, catalog) {
  const match = /^\/cards\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    const set = decodeURIComponent(match[1]).toLowerCase();
    const number = numberSlug(decodeURIComponent(match[2]));
    return catalog.find(card => setSlug(card.set) === set && numberSlug(card.number) === number) || null;
  } catch { return null; }
}
