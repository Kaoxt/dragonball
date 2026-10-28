// Load dependent community scripts in order; a failed dependency must not run its consumers.
(() => {
  const admin = location.pathname.startsWith('/forums/admin');
  const files = admin ? ['media', 'common', 'admin'] : ['media', 'common', 'editor', ...(location.pathname.startsWith('/forums') ? ['inbox'] : []), 'forum'];
  // Fetch in parallel, but execute only once each preceding dependency is ready.
  for (const name of files) {
    const preload = document.createElement('link');
    preload.rel = 'preload'; preload.as = 'script';
    preload.href = '/forum/' + name + '.js?v=20261028-news-image-preview';
    document.head.append(preload);
  }
  let next = 0, busy = false;
  function script(name) {
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = '/forum/' + name + '.js?v=20261028-news-image-preview';
      node.onload = () => resolve();
      node.onerror = () => { node.remove(); reject(new Error('Unable to load this page. Check your connection and try again.')); };
      document.head.append(node);
    });
  }
  async function start() {
    if (busy) return;
    busy = true;
    const root = document.getElementById('forum-content'), error = document.getElementById('forum-error');
    error.textContent = '';
    root.setAttribute('aria-busy', 'true');
    root.textContent = 'Loading…';
    try {
      while (next < files.length) {
        for (let attempt = 0; ; attempt++) {
          try { await script(files[next]); break; }
          catch (failure) { if (attempt === 2) throw failure; await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt)); }
        }
        next++;
      }
    } catch (failure) {
      root.removeAttribute('aria-busy');
      error.textContent = failure.message;
      const retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = 'Try again'; retry.onclick = start;
      root.replaceChildren(retry);
    } finally { busy = false; }
  }
  start();
})();
