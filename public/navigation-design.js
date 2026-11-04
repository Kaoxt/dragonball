// The approved brush-and-charcoal design is now the permanent site theme.
const root = document.documentElement;
root.dataset.siteDesign = 'v2';
try { localStorage.removeItem('dragon:site-design'); } catch { /* Storage is optional. */ }
const current = new URL(location.href);
if (current.searchParams.has('design')) {
  current.searchParams.delete('design');
  history.replaceState(history.state, '', current.pathname + current.search + current.hash);
}

const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = '/navigation-design.css?v=20261104-permanent-theme';
document.head.append(stylesheet);

const surfaces = document.createElement('link');
surfaces.rel = 'stylesheet';
surfaces.href = '/surfaces-design.css?v=20261104-cards-news-border';
document.head.append(surfaces);

const header = document.querySelector('.site-header');
if (header && !header.querySelector('.site-header-brush')) {
  const brush = document.createElement('span');
  brush.className = 'site-header-brush';
  brush.setAttribute('aria-hidden', 'true');
  header.prepend(brush);
}

window.dispatchEvent(new Event('dragon:design-change'));

