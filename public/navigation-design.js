// Version 1 remains in navigation.css; Version 2 is a reversible, scoped layer.
const root = document.documentElement;
const storageKey = 'dragon:site-design';
const valid = value => value === 'v1' || value === 'v2';
let saved = null;
try { saved = localStorage.getItem(storageKey); } catch { /* Private storage can be unavailable. */ }
const requested = new URL(location.href).searchParams.get('design');
let selected = valid(requested) ? requested : valid(saved) ? saved : 'v2';

const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = '/navigation-design.css?v=20261029-v2-shared-dark-brush';
document.head.append(stylesheet);

const surfaces = document.createElement('link');
surfaces.rel = 'stylesheet';
surfaces.href = '/surfaces-design.css?v=20261029-matching-topic-actions';
document.head.append(surfaces);

const header = document.querySelector('.site-header');
if (header && !header.querySelector('.site-header-brush')) {
  const brush = document.createElement('span');
  brush.className = 'site-header-brush';
  brush.setAttribute('aria-hidden', 'true');
  header.prepend(brush);
}

const chooser = document.createElement('nav');
chooser.className = 'site-design-switch';
chooser.setAttribute('aria-label', 'Site design');
const label = document.createElement('span');
label.textContent = 'Site design';
chooser.append(label);
const choices = new Map();
for (const [value, title] of [['v1', 'Version 1'], ['v2', 'Version 2']]) {
  const link = document.createElement('a');
  const url = new URL(location.href);
  url.searchParams.set('design', value);
  link.href = url.pathname + url.search + url.hash;
  link.textContent = title;
  link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    apply(value);
    const current = new URL(location.href);
    current.searchParams.set('design', value);
    history.replaceState(history.state, '', current.pathname + current.search + current.hash);
  });
  choices.set(value, link);
  chooser.append(link);
}
document.body.append(chooser);

function apply(value) {
  selected = value;
  root.dataset.siteDesign = value;
  try { localStorage.setItem(storageKey, value); } catch { /* The URL still supports switching. */ }
  for (const [choice, link] of choices) {
    if (choice === value) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  window.dispatchEvent(new Event('dragon:design-change'));
}
apply(selected);

// Explicit links also retain the choice when browser storage is disabled.
document.addEventListener('click', event => {
  const link = event.target.closest?.('.site-header a[href]');
  if (!link || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return;
  url.searchParams.set('design', selected);
  link.href = url.pathname + url.search + url.hash;
}, true);
