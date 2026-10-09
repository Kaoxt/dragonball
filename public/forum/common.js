(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(params={},data){
    const response=await fetch('/api/forum?'+new URLSearchParams(params),{credentials:'same-origin',cache:'no-store',...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Unable to connect. Please try again.');return result;
  }
  const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const author=m=>`<a class="forum-author" href="/forums/#member/${encodeURIComponent(m.member_id)}">${window.DragonIssueMedia.avatar(m.author,m.avatar_url,m.avatar_color)}<span>${esc(m.author)}</span></a>`;
  const flagIcon=(label,path)=>`<span class="forum-status-icon" role="img" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg></span>`;
  const flags=t=>`${t.pinned?flagIcon('Pinned','<path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6"/>'):''}${t.locked?flagIcon('Locked','<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'):''}${t.hidden?'<span class="issue-badge">Hidden</span>':''}`;
  const icons={
    posts:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    views:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    likes:'<path d="M7 10v10H3V10h4Zm0 0 4-8a3 3 0 0 1 3 3v4h5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17.6 20H7"/>'
  };
  const statIcon=kind=>`<svg class="forum-stat-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[kind]}</svg>`;
  const stat=(kind,value,label)=>`<span class="forum-icon-stat" title="${esc(label)}" aria-label="${Number(value)||0} ${esc(label)}">${statIcon(kind)}<span>${Number(value)||0}</span></span>`;
  const rows=topics=>topics.length?topics.map(t=>`<article class="issue-row forum-topic-row"><a class="forum-topic-avatar" href="/forums/#member/${encodeURIComponent(t.member_id)}" aria-label="${esc(t.author)}">${window.DragonIssueMedia.avatar(t.author,t.avatar_url,t.avatar_color)}</a><div class="issue-row-main"><h3>${flags(t)}<a href="/forums/#topic/${t.id}${t.first_unread?'?reply='+t.first_unread:''}">${esc(t.title)}</a>${t.unread_count?`<span class="issue-badge">${t.unread_count} new</span>`:''}</h3><div class="issue-meta forum-topic-started"><a href="/forums/#member/${encodeURIComponent(t.member_id)}">${esc(t.author)}</a><span>·</span><time datetime="${esc(t.created_at)}">${date(t.created_at)}</time></div></div><div class="forum-topic-counts">${stat('views',t.view_count,'views')}${stat('posts',t.reply_count,'replies')}</div></article>`).join(''):'<div class="issue-empty">No discussions yet.</div>';
  async function submit(form,fn){
    if(form.dataset.busy)return;form.dataset.busy='1';const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    const status=form.querySelector('[data-status]');if(status)status.textContent='';
    try{await fn();}catch(e){if(status){status.textContent=e.message;status.focus();}else throw e;}finally{delete form.dataset.busy;buttons.forEach(b=>b.disabled=false);}
  }
  window.DragonForum={esc,api,date,author,flags,rows,submit,stat};
})();

