// The approved brush-and-charcoal design is now the permanent site theme.
const root = document.documentElement;
root.dataset.siteDesign = 'v2';
try { localStorage.removeItem('dragon:site-design'); } catch { /* Storage is optional. */ }
const current = new URL(location.href);
if (current.searchParams.has('design')) {
  current.searchParams.delete('design');
  history.replaceState(history.state, '', current.pathname + current.search + current.hash);
}

// Theme styles and the header brush are part of the initial HTML.
window.dispatchEvent(new Event('dragon:design-change'));
