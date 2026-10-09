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
  const rows=topics=>topics.length?topics.map(t=>{
    const latest={member_id:t.latest_member_id||t.member_id,author:t.latest_author||t.author,avatar_url:t.latest_avatar_url??t.avatar_url,avatar_color:t.latest_avatar_color||t.avatar_color};
    const latestAt=t.latest_posted_at||t.created_at;
    return `<article class="issue-row forum-topic-row"><div class="issue-row-main"><h3>${flags(t)}<a href="/forums/#topic/${t.id}${t.first_unread?'?reply='+t.first_unread:''}">${esc(t.title)}</a>${t.unread_count?`<span class="issue-badge">${t.unread_count} new</span>`:''}</h3><div class="issue-meta forum-topic-started">By <a href="/forums/#member/${encodeURIComponent(t.member_id)}">${esc(t.author)}</a><span>·</span><time datetime="${esc(t.created_at)}">${date(t.created_at)}</time></div><div class="forum-topic-counts"><span>${Number(t.reply_count)||0} ${t.reply_count===1?'reply':'replies'}</span><span>${Number(t.view_count)||0} ${t.view_count===1?'view':'views'}</span></div></div><aside class="forum-topic-latest" aria-label="Latest post">${author(latest)}<a class="forum-latest-time" href="/forums/#topic/${t.id}${t.latest_reply_id?'?reply='+t.latest_reply_id:''}" title="View latest post"><time datetime="${esc(latestAt)}">${date(latestAt)}</time></a></aside></article>`;
  }).join(''):'<div class="issue-empty">No discussions yet.</div>';
  async function submit(form,fn){
    if(form.dataset.busy)return;form.dataset.busy='1';const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    const status=form.querySelector('[data-status]');if(status)status.textContent='';
    try{await fn();}catch(e){if(status){status.textContent=e.message;status.focus();}else throw e;}finally{delete form.dataset.busy;buttons.forEach(b=>b.disabled=false);}
  }
  window.DragonForum={esc,api,date,author,flags,rows,submit};
})();

