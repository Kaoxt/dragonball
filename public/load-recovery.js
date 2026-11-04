// Load asynchronously or deferred so recovery cannot block the page HTML.
(() => {
  const nativeFetch = window.fetch.bind(window);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const transient = new Set([502, 503, 504]);
  window.DragonNetwork = {
    async fetch(input, options = {}) {
      const method = (options.method || input?.method || 'GET').toUpperCase();
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
      // Mutations are never replayed: a lost response may still mean a saved post/deck.
      if (method !== 'GET' || url.origin !== location.origin) return nativeFetch(input, options);
      for (let attempt = 0; attempt < 3; attempt++) {
        const signal = options.signal || input?.signal;
        if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
        const controller = new AbortController();
        const abort = () => controller.abort(signal.reason);
        signal?.addEventListener('abort', abort, {once:true});
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await nativeFetch(input, {...options, signal:controller.signal});
          if (!transient.has(response.status) || attempt === 2) return response;
          await response.body?.cancel();
        } catch (error) {
          if (signal?.aborted) throw error;
          if (attempt === 2) throw new Error('Unable to connect. Check your connection and try again.');
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
        }
        await pause(400 * 2 ** attempt);
      }
    }
  };
  const retries = new WeakMap();
  const pending = new WeakSet();
  function recover(node) {
    const stylesheet = node?.tagName === 'LINK' && node.rel === 'stylesheet';
    const image = node?.tagName === 'IMG';
    if (!stylesheet && !image) return;
    if (pending.has(node) || (stylesheet && node.sheet)) return;
    if (image && node.complete && node.naturalWidth) return;
    // Keep existing avatar/card fallback handlers in charge of their images.
    if (image && (node.onerror || node.srcset)) return;
    const original = stylesheet ? node.href : node.src;
    if (!original) return;
    const url = new URL(original, location.href);
    if (url.origin !== location.origin) return;
    const count = retries.get(node) || 0;
    if (count >= 2) return;
    pending.add(node);
    setTimeout(() => {
      pending.delete(node);
      if (!node.isConnected) return;
      // A slow request may have succeeded while this retry was waiting.
      if (stylesheet && node.sheet) return;
      if (image && node.complete && node.naturalWidth) return;
      // A fallback handler may have supplied another image since the error.
      if ((stylesheet ? node.href : node.src) !== original) return;
      retries.set(node, count + 1);
      url.searchParams.set('_load_retry', String(count + 1));
      if (stylesheet) node.href = url.href; else node.src = url.href;
    }, 500 * 2 ** count);
  }
  document.addEventListener('error', event => recover(event.target), true);
  function recoverAssets() {
    document.querySelectorAll('link[rel=stylesheet]').forEach(node => { if (!node.sheet) recover(node); });
    document.querySelectorAll('img').forEach(node => { if (node.complete && !node.naturalWidth) recover(node); });
  }
  // Catch failures that preceded this script without waiting for slow images.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', recoverAssets, {once:true});
  else recoverAssets();
  window.addEventListener('load', recoverAssets, {once:true});
  window.addEventListener('pageshow', recoverAssets);
  // A stalled stylesheet can also hold up DOMContentLoaded. Bound these scans
  // and the per-asset retry count so a persistent outage cannot loop forever.
  setTimeout(recoverAssets, 5000);
  setTimeout(recoverAssets, 15000);
})();
