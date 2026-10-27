(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let accountEpoch = 0;
  let config, box = '', folder = 'inbox', offset = 0, current = null, generation = 0, listRequest = 0, syncing = false, sendId = '', replyId = '', searchTimer;
  const notice = (text, error = false) => { $('mail-notice').textContent = text; $('mail-notice').classList.toggle('error', error); };
  function clearPrivateView() {
    accountEpoch++; generation++; config = null; box = ''; current = null;
    $('mail-app').hidden = true; $('mail-list').replaceChildren(); $('message-body').textContent = '';
    $('message-detail').hidden = true; ['message-subject','message-from','message-to','message-date','message-warning'].forEach(id => { $(id).textContent = ''; }); $('message-attachments').replaceChildren(); $('download-source').removeAttribute('href'); $('managed-mailboxes').replaceChildren(); $('blocks-list').replaceChildren();
    $('compose-form').reset(); document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    $('mail-gate').hidden = false; $('gate-title').textContent = 'Log in to your inbox';
    $('gate-copy').textContent = 'Use your Dragon Ball OCG account to access your assigned email addresses.';
  }
  async function api(path = '', options = {}) {
    const epoch = accountEpoch;
    const response = await fetch(path.startsWith('/api/') ? path : '/api/mail' + path, {credentials:'same-origin',cache:'no-store',...options});
    const data = await response.json().catch(() => ({}));
    if (epoch !== accountEpoch) throw Error('Your session has changed. Log in again to continue.');
    if (response.status === 401) clearPrivateView();
    if (!response.ok) throw Error(data.error || 'This request could not be completed. Please try again.');
    return data;
  }
  const post = (path, data = {}) => api(path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const date = value => new Date(value).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  function resetReader() {
    current = null; $('message-detail').hidden = true; $('reader-empty').hidden = false;
    $('mail-app').classList.remove('reading'); $('message-body').textContent = '';
  }
  async function loadConfig() {
    config = await api();
    $('mail-gate').hidden = true; $('mail-app').hidden = false;
    $('manage-mailboxes').hidden = !config.isAdmin; $('admin-return').hidden = !config.isAdmin;
    $('mailbox-select').innerHTML = config.mailboxes.map(item => `<option value="${esc(item.id)}">${esc(item.address)}</option>`).join('');
    if (!config.mailboxes.some(item => item.id === box)) box = config.mailboxes[0]?.id || '';
    $('mailbox-select').value = box;
    $('mailbox-select').disabled = !box; $('refresh-mail').disabled = !box || !config.storageReady;
    $('compose-mail').disabled = !box || !config.sendReady; $('blocked-senders').disabled = !box;
    $('sending-status').textContent = config.sendReady ? 'Send from your selected address. Messages you delete stay in Trash.' : 'Receiving is available when storage is connected. Sending will be available after Cloudflare Email Sending is activated.';
    if (!box) notice(config.isAdmin ? 'Create your personal address with Manage inboxes.' : 'No inbox is assigned to this account yet. Contact the site administrator.');
    else if (!config.storageReady) notice('Mail storage needs to be connected before messages can be loaded.', true);
  }
  async function list() {
    const version = generation, sequence = ++listRequest, target = box;
    if (!box) { $('mail-list').innerHTML = '<li class="list-empty">No inbox assigned.</li>'; return; }
    const result = await api(`/${box}/messages?folder=${folder}&offset=${offset}&q=${encodeURIComponent($('mail-search').value.trim())}`);
    if (version !== generation || sequence !== listRequest || target !== box) return;
    $('mail-list').innerHTML = result.messages.length ? result.messages.map(message => `<li><button type="button" class="message-row ${message.read ? '' : 'unread'} ${current?.id === message.id ? 'selected' : ''}" data-message="${esc(message.id)}"><span class="row-top"><span class="row-sender">${esc(message.direction === 'outgoing' ? message.to : message.fromName || message.from || 'Unknown sender')}</span><time>${esc(date(message.receivedAt))}</time></span><span class="row-subject">${esc(message.subject)}${message.attachmentCount ? ' · 📎' : ''}</span><span class="row-preview">${esc(message.sendStatus && message.sendStatus !== 'sent' ? 'Delivery ' + message.sendStatus + ' · ' : '')}${esc(message.preview || 'No preview available')}</span></button></li>`).join('') : `<li class="list-empty">${$('mail-search').value ? 'No messages match your search.' : 'This folder is empty.'}</li>`;
    $('next-page').disabled = !result.more; $('previous-page').disabled = offset === 0; $('mail-page-number').textContent = String(offset / 50 + 1);
    $('message-count').textContent = String(result.counts.find(item => item.folder === folder)?.count || 0);
    document.querySelectorAll('[data-folder]').forEach(button => {
      const count = result.counts.find(item => item.folder === button.dataset.folder);
      button.querySelector('span').textContent = count?.unread ? String(count.unread) : '';
      if (button.dataset.folder === folder) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
  }
  async function refresh() {
    if (syncing || !box || !config.storageReady) return;
    const version = generation, target = box;
    syncing = true; $('refresh-mail').disabled = true; notice('Checking for new mail…');
    try {
      let more = false;
      for (let page = 0; page < 8; page++) {
        const result = await post(`/${target}/sync`); more = result.more;
        if (version !== generation || target !== box) return;
        if (!more) break;
      }
      await list();
      if (version === generation) notice(more ? 'More stored mail is available. Select Refresh to continue importing.' : '');
    } catch (error) { if (version === generation) notice(error.message, true); }
    finally { syncing = false; $('refresh-mail').disabled = !box || !config?.storageReady; }
  }
  async function openMessage(id) {
    const version = ++generation, target = box;
    const result = await api(`/${box}/messages/${id}`);
    if (version !== generation || target !== box) return;
    current = result.message;
    $('reader-empty').hidden = true; $('message-detail').hidden = false; $('mail-app').classList.add('reading');
    $('message-subject').textContent = current.subject;
    $('message-from').textContent = (current.fromName ? current.fromName + ' · ' : '') + current.from;
    $('message-to').textContent = current.to; $('message-date').textContent = new Date(current.receivedAt).toLocaleString();
    $('message-body').textContent = current.body || 'No text preview is available. You can download the original email below.';
    const warnings = [...current.reasons];
    if (current.sendStatus && current.sendStatus !== 'sent') warnings.push('Delivery ' + current.sendStatus + '. Check delivery logs before sending this message again.');
    $('message-warning').hidden = !warnings.length; $('message-warning').textContent = warnings.join(' · ');
    $('message-attachments').innerHTML = current.attachments.map(item => `<li><a href="/api/mail/${target}/messages/${id}/attachment/${item.index}" download>${esc(item.name)} <span>(${Math.ceil(item.size / 1024)} KB)</span></a></li>`).join('');
    $('download-source').hidden = !current.hasSource; $('download-source').href = `/api/mail/${target}/messages/${id}/source`;
    $('message-actions').querySelectorAll('button').forEach(button => {
      const action = button.dataset.action, outgoing = current.direction === 'outgoing';
      button.hidden = action === current.folder || (outgoing && ['reply','archive','spam','inbox','block','unread'].includes(action)) || (!outgoing && action === 'sent');
      button.disabled = action === 'reply' && !config.sendReady;
    });
    await post(`/${target}/messages/${id}`, {read:true});
    if (version === generation) await list();
  }
  function compose(reply = false) {
    if (!config?.sendReady || !box) return;
    $('compose-form').reset(); $('compose-notice').textContent = '';
    $('compose-title').textContent = reply ? 'Reply' : 'New message';
    $('compose-from').textContent = 'From ' + config.mailboxes.find(item => item.id === box).address;
    sendId = crypto.randomUUID(); replyId = reply ? current.id : '';
    if (reply) { $('compose-to').value = current.replyTo || current.from; $('compose-subject').value = /^re:/i.test(current.subject) ? current.subject : 'Re: ' + current.subject; }
    $('compose-dialog').showModal(); $(reply ? 'compose-body' : 'compose-to').focus();
  }
  async function manage() {
    const result = await api('/api/admin/mailboxes');
    $('managed-mailboxes').innerHTML = result.mailboxes.map(item => `<li><strong>${esc(item.address)}</strong><span>${esc(item.owner)}</span></li>`).join('');
    $('new-owner').value ||= config.username;
  }
  async function blocks() {
    const result = await api(`/${box}/blocks`);
    $('blocks-list').innerHTML = result.blocked.length ? result.blocked.map(sender => `<li><span>${esc(sender)}</span><button type="button" data-unblock="${esc(sender)}">Unblock</button></li>`).join('') : '<li>No blocked senders.</li>';
  }
  async function run(fn) { try { await fn(); } catch (error) { notice(error.message, true); } }
  $('refresh-mail').onclick = refresh;
  $('compose-mail').onclick = () => compose();
  $('mailbox-select').onchange = () => run(async () => { generation++; box = $('mailbox-select').value; offset = 0; resetReader(); $('mail-search').value = ''; await list(); await refresh(); });
  $('mail-folders').onclick = event => { const button = event.target.closest('[data-folder]'); if (!button) return; run(async () => { generation++; folder = button.dataset.folder; offset = 0; resetReader(); $('folder-title').textContent = folder[0].toUpperCase() + folder.slice(1); await list(); }); };
  $('mail-list').onclick = event => { const row = event.target.closest('[data-message]'); if (row) run(() => openMessage(row.dataset.message)); };
  $('mail-search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { offset = 0; run(list); }, 250); };
  $('previous-page').onclick = () => { offset = Math.max(0, offset - 50); run(list); };
  $('next-page').onclick = () => { offset += 50; run(list); };
  $('back-to-list').onclick = () => { generation++; resetReader(); };
  $('message-actions').onclick = event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action || !current) return;
    if (action === 'reply') { compose(true); return; }
    run(async () => {
      const target = box, message = current, version = generation;
      if (action === 'block') await post(`/${target}/blocks`, {sender: message.from, blocked:true});
      else await post(`/${target}/messages/${message.id}`, action === 'unread' ? {read:false} : {folder:action});
      if (version !== generation) return;
      resetReader(); await list(); notice(action === 'block' ? 'Sender blocked. Their inbox messages were moved to Spam.' : 'Message updated.');
    });
  };
  $('compose-form').onsubmit = async event => {
    event.preventDefault(); const target = box, version = generation;
    const data = {id:sendId,to:$('compose-to').value,subject:$('compose-subject').value,text:$('compose-body').value,replyId};
    const controls = [...$('compose-form').elements]; controls.forEach(control => { control.disabled = true; });
    $('compose-notice').textContent = 'Sending…';
    try { await post(`/${target}/send`, data); if (version !== generation) return; $('compose-dialog').close(); $('compose-form').reset(); notice('Message sent.'); await list(); }
    catch (error) { $('compose-notice').textContent = error.message; }
    finally { controls.forEach(control => { control.disabled = false; }); }
  };
  $('manage-mailboxes').onclick = () => run(async () => { await manage(); $('mailboxes-dialog').showModal(); });
  $('mailbox-form').onsubmit = async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true;
    try {
      const result = await post('/api/admin/mailboxes', {address:$('new-address').value,username:$('new-owner').value});
      $('mailbox-create-notice').textContent = `Inbox created: ${result.mailbox.address}. Receiving requires this address to route to dragonball-ocg-mail in Cloudflare (or the configured catch-all).`;
      $('new-address').value = ''; await manage(); await loadConfig(); await list();
    } catch (error) { $('mailbox-create-notice').textContent = error.message; }
    finally { button.disabled = false; }
  };
  $('blocked-senders').onclick = () => run(async () => { await blocks(); $('blocks-dialog').showModal(); });
  $('blocks-list').onclick = event => { const button = event.target.closest('[data-unblock]'); if (button) run(async () => { await post(`/${box}/blocks`, {sender:button.dataset.unblock,blocked:false}); await blocks(); $('blocks-notice').textContent = 'Sender unblocked. You can move earlier messages from Spam to Inbox.'; }); };
  document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => $(button.dataset.close).close(); });
  window.addEventListener('dragon:auth-signed-out', () => { clearPrivateView(); notice('You have been signed out.'); });
  window.addEventListener('pagehide', clearPrivateView);
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  window.addEventListener('beforeunload', event => { if ($('compose-dialog').open && $('compose-body').value) { event.preventDefault(); event.returnValue = ''; } });
  run(async () => { await loadConfig(); await list(); await refresh(); });
})();
