(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bytes = n => n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2)} GiB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
  let files = [], config, selected, resumeId = null, active = false, paused = false, controller = null, transferId = null, userId = '';
  const hash = async data => [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('');
  const notice = (text, error = false) => { $('notice').textContent = text; $('notice').classList.toggle('error', error); };
  function fail(message, status = 0) { const error = new Error(message); error.status = status; return error; }
  async function api(path = '', options = {}) {
    const response = await fetch('/api/admin/uploads' + path, { credentials: 'same-origin', cache: 'no-store', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw fail(data.error || 'Could not complete the request. Please retry.', response.status);
    return data;
  }
  const post = (path, data) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {}) });
  function renderFiles() {
    const query = $('search-files').value.toLowerCase().trim();
    const shown = files.filter(file => `${file.name} ${file.label}`.toLowerCase().includes(query));
    $('file-count').textContent = `${files.length} ${files.length === 1 ? 'file' : 'files'}`;
    $('file-list').innerHTML = shown.length ? shown.map(file => {
      const status = file.status === 'ready' ? 'Ready' : file.status === 'expired' ? 'Expired' : file.status === 'deleting' ? 'Deletion pending' : `${Math.floor(file.uploadedBytes / file.size * 100)}% uploaded`;
      return `<li class="file-row"><div class="file-symbol" aria-hidden="true">${file.name.toLowerCase().endsWith('.zip') ? 'ZIP' : 'IMG'}</div><div class="file-details"><h3>${esc(file.name)}</h3><p>${esc(file.label || 'Unlabelled upload')} <span>·</span> ${bytes(file.size)} <span>·</span> ${new Date(file.createdAt).toLocaleDateString()}</p><span class="file-state ${file.status === 'ready' ? 'ready' : ''}">${esc(status)}${file.shared ? ' · Link enabled' : ''}</span></div><div class="file-actions">${file.status === 'ready' ? `<button type="button" data-action="share" data-id="${file.id}">Copy link</button>${file.shared ? `<button type="button" data-action="revoke" data-id="${file.id}">Revoke link</button>` : ''}` : file.status === 'uploading' ? `<button type="button" data-action="resume" data-id="${file.id}" ${active ? 'disabled' : ''}>Resume</button>` : ''}<button type="button" class="danger" data-action="delete" data-id="${file.id}" ${active && file.id === transferId ? 'disabled' : ''}>Delete</button></div></li>`;
    }).join('') : `<li class="empty-state"><strong>${query ? 'No matching files' : 'Your uploads will appear here'}</strong><p>${query ? 'Try another filename or batch label.' : 'Upload a card ZIP, then copy its link to share in chat.'}</p></li>`;
  }
  async function refresh() {
    config = await api(); files = config.files; renderFiles();
    $('storage-status').textContent = config.storageReady ? 'Storage connected' : 'Storage setup needed';
    $('storage-status').classList.toggle('offline', !config.storageReady);
    $('start-upload').disabled = !config.storageReady || !selected || active;
    if (!config.storageReady) notice('The upload storage is not connected yet. Uploading will be available after setup.', true);
  }
  async function fingerprint(file) {
    const sample = new Uint8Array(await new Blob([file.name, String(file.size), file.slice(0,65536), file.slice(Math.max(0,file.size-65536))]).arrayBuffer());
    return hash(sample);
  }
  function selectFile(file) {
    if (active || !file) return;
    if (!/\.(zip|png|jpe?g|webp)$/i.test(file.name)) { notice('Choose a ZIP, PNG, JPG, or WebP file.', true); return; }
    if (file.size < 4 || file.size > (config?.maxFileBytes || 2 * 1024 ** 3)) { notice('Choose a file smaller than 2 GiB.', true); return; }
    selected = file;
    $('selected-name').textContent = `${file.name} · ${bytes(file.size)}`;
    $('start-upload').textContent = resumeId ? 'Resume upload' : 'Upload file';
    $('start-upload').disabled = !config?.storageReady;
    $('progress-panel').hidden = true; $('share-panel').hidden = true;
    notice(resumeId ? 'The saved parts will be checked against this file before resuming.' : 'Ready to upload.');
  }
  function progress(value, total, message) {
    $('progress-panel').hidden = false;
    $('upload-progress').value = value; $('upload-progress').max = total;
    $('progress-percent').textContent = `${Math.floor(value / total * 100)}%`;
    $('progress-text').textContent = message || `${bytes(value)} of ${bytes(total)}`;
  }
  function pause() { paused = true; controller?.abort(); }
  function checkPaused() { if (paused) throw new DOMException('Upload paused.', 'AbortError'); }
  function sendPart(id, number, body, checksum, before, total) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); controller = { abort: () => xhr.abort() };
      xhr.open('PUT', `/api/admin/uploads/${id}/parts/${number}`);
      xhr.timeout = 120000;
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-Content-SHA256', checksum);
      xhr.upload.onprogress = event => { if (event.lengthComputable) progress(before + event.loaded, total); };
      xhr.onload = () => {
        let data = {}; try { data = JSON.parse(xhr.responseText); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(fail(data.error || 'Part upload failed.', xhr.status));
      };
      xhr.onerror = () => reject(fail('Connection interrupted.'));
      xhr.ontimeout = () => reject(fail('Connection timed out.'));
      xhr.onabort = () => reject(new DOMException('Upload paused.', 'AbortError'));
      xhr.send(body);
    });
  }
  async function upload() {
    if (active || !selected) return;
    const file = selected; active = true; paused = false; transferId = null;
    $('start-upload').disabled = true; $('choose-file').disabled = true; $('batch-label').disabled = true;
    $('pause-upload').hidden = false; $('pause-upload').disabled = false; $('share-panel').hidden = true;
    try {
      const fp = await fingerprint(file); checkPaused();
      let existing = resumeId ? files.find(f => f.id === resumeId) : files.find(f => f.fingerprint === fp && f.name === file.name && f.size === file.size && ['ready','uploading'].includes(f.status));
      if (existing && (existing.fingerprint !== fp || existing.name !== file.name || existing.size !== file.size)) throw fail('Select the original file shown in the upload list to resume.');
      const savedKey = `dragon:upload:${userId}:${fp}`;
      let id = existing?.id;
      if (!id) { try { id = localStorage.getItem(savedKey); } catch {} }
      id ||= crypto.randomUUID();
      try { localStorage.setItem(savedKey, id); } catch {}
      const result = await post('', { id, name: file.name, size: file.size, fingerprint: fp, label: $('batch-label').value });
      transferId = id; const record = result.file; checkPaused();
      if (record.status === 'ready') { notice('This file is already uploaded. Use Copy link below.'); await refresh(); return; }
      if (record.status !== 'uploading') throw fail('This saved upload has expired or is being deleted. Delete it and start again.');
      const partSize = result.chunkBytes;
      const savedParts = new Map(record.parts.map(part => [part.number, part]));
      let confirmed = 0;
      progress(record.uploadedBytes, file.size, record.uploadedBytes ? 'Checking saved parts…' : 'Starting upload…');
      for (let offset = 0, number = 1; offset < file.size; offset += partSize, number++) {
        checkPaused();
        const body = await file.slice(offset, Math.min(file.size, offset + partSize)).arrayBuffer();
        const checksum = await hash(body); checkPaused();
        const saved = savedParts.get(number);
        if (saved) {
          if (saved.checksum !== checksum || saved.size !== body.byteLength) throw fail('This file differs from the saved upload. Select the original file or start a separate upload.');
        } else {
          for (let attempt = 0; ; attempt++) {
            try { checkPaused(); await sendPart(id, number, body, checksum, confirmed, file.size); break; }
            catch (error) {
              if (paused || error.name === 'AbortError' || attempt >= 3 || (error.status && error.status < 500 && ![408,429].includes(error.status))) throw error;
              notice(`Connection interrupted. Retrying this part (${attempt + 1}/3)…`);
              await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
            }
          }
        }
        confirmed += body.byteLength; progress(confirmed, file.size);
      }
      checkPaused(); notice('Verifying the completed file…'); $('pause-upload').disabled = true;
      await post(`/${id}/complete`);
      try { localStorage.removeItem(savedKey); } catch {}
      notice('Upload complete. Copy the link below and paste it into chat.');
      resumeId = null; selected = null; $('file-input').value = ''; $('selected-name').textContent = 'No file selected';
      await refresh();
    } catch (error) {
      notice(error.name === 'AbortError' ? 'Paused. Your uploaded parts are saved. Select Resume to continue.' : `${error.message} Your uploaded parts are saved.`, error.name !== 'AbortError');
      try { await refresh(); } catch {}
    } finally {
      active = false; controller = null; $('pause-upload').hidden = true;
      $('start-upload').disabled = !selected || !config?.storageReady; $('start-upload').textContent = transferId && selected ? 'Resume upload' : 'Upload file';
      $('choose-file').disabled = false; $('batch-label').disabled = false; renderFiles();
    }
  }
  async function share(id) {
    const result = await post(`/${id}/share`);
    $('share-panel').hidden = false; $('share-url').value = result.url;
    try { await navigator.clipboard.writeText(result.url); notice('Download link copied. Paste it into chat.'); }
    catch { $('share-url').focus(); $('share-url').select(); notice('Your link is ready below. Select it to copy.'); }
    await refresh();
  }
  function confirmDelete(file) {
    return new Promise(resolve => {
      $('delete-name').textContent = file.name;
      const dialog = $('delete-dialog'); dialog.returnValue = '';
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'delete'), { once: true });
      dialog.showModal();
    });
  }
  $('file-list').addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const { id, action } = button.dataset, file = files.find(f => f.id === id); if (!file) return;
    button.disabled = true;
    try {
      if (action === 'resume') { if (active) return; resumeId = id; $('batch-label').value = file.label; $('file-input').value = ''; $('file-input').click(); notice(`Select ${file.name} to resume.`); }
      if (action === 'share') await share(id);
      if (action === 'revoke') { await post(`/${id}/revoke`); $('share-panel').hidden = true; notice('The old link no longer works.'); await refresh(); }
      if (action === 'delete' && await confirmDelete(file)) {
        await api(`/${id}`, { method: 'DELETE' });
        try { localStorage.removeItem(`dragon:upload:${userId}:${file.fingerprint}`); } catch {}
        if (resumeId === id) resumeId = null;
        $('share-panel').hidden = true; notice('Temporary upload deleted.'); await refresh();
      }
    } catch (error) { notice(error.message, true); }
    finally { button.disabled = false; }
  });
  $('choose-file').onclick = () => { resumeId = null; $('file-input').value = ''; $('file-input').click(); };
  $('file-input').onchange = () => selectFile($('file-input').files[0]);
  $('upload-form').onsubmit = event => { event.preventDefault(); upload(); };
  $('pause-upload').onclick = pause;
  $('search-files').oninput = renderFiles;
  $('refresh-files').onclick = () => refresh().catch(error => notice(error.message, true));
  $('copy-share').onclick = async () => { try { await navigator.clipboard.writeText($('share-url').value); notice('Download link copied.'); } catch { $('share-url').select(); notice('Select and copy the link.'); } };
  const drop = $('drop-zone');
  for (const name of ['dragenter','dragover']) drop.addEventListener(name, event => { event.preventDefault(); if (!active) drop.classList.add('dragging'); });
  for (const name of ['dragleave','drop']) drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('dragging'); });
  drop.addEventListener('drop', event => { resumeId = null; selectFile(event.dataTransfer.files[0]); });
  window.addEventListener('dragon:auth-signed-out', () => { pause(); $('admin-tools').hidden = true; $('auth-shell').hidden = false; $('auth-message').textContent = 'Log in with your administrator account to continue.'; $('admin-login').hidden = false; });
  async function init() {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw Error('Unable to check your session. Reload to try again.');
      const { user } = await response.json();
      if (!user) { $('auth-message').textContent = 'Log in with your Dragon Ball OCG administrator account.'; $('admin-login').hidden = false; return; }
      if (!user.isAdmin) { $('auth-message').textContent = 'This account does not have administrator access.'; $('admin-account').hidden = false; return; }
      userId = user.id; $('signed-in-name').textContent = user.displayName || user.username;
      await refresh(); $('auth-shell').hidden = true; $('admin-tools').hidden = false;
    } catch (error) { $('auth-message').textContent = error.message; }
  }
  init();
})();
