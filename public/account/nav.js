(() => {
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=path=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
 const chevron=icon('m6 9 6 6 6-6'),message=icon('M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z'),bell=icon('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4');
 let busy=false,identity='';
 async function update(){
  const nav=document.getElementById('site-navigation');if(!nav||busy)return;busy=true;
  let actions=document.getElementById('account-nav-actions');
  if(!actions){actions=document.createElement('div');actions.id='account-nav-actions';actions.className='account-nav-actions';actions.innerHTML='<a id="account-nav" class="account-nav-link" href="/account/">Log In</a>';nav.append(actions);}
  try{
   const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;
   const {user}=await response.json();
   if(!user){identity='';actions.classList.remove('is-signed-in');actions.innerHTML='<a id="account-nav" class="account-nav-link" href="/account/">Log In</a>';document.getElementById('mobile-alert-count')?.remove();const fa=document.getElementById('forum-alerts');if(fa)fa.hidden=true;return;}
   actions.classList.add('is-signed-in');
   const raw=user.username||user.displayName||'',name=raw.charAt(0).toUpperCase()+raw.slice(1);
   const key=JSON.stringify([user.id,user.username,user.displayName,user.avatarUrl,user.isAdmin]);
   if(identity!==key){
    identity=key;
    let avatar='/assets/default-avatar-dragonball.webp';
    if(/^\/api\/avatars\/[0-9a-f-]{36}$/.test(user.avatarUrl||''))avatar=user.avatarUrl;
    else {try{const url=new URL(user.avatarUrl);if(url.protocol==='https:')avatar=url.href;}catch{}}
    actions.innerHTML='<details class="account-dropdown"><summary id="account-nav" aria-label="Account: '+esc(name)+'"><img class="account-trigger-avatar" src="'+esc(avatar)+'" width="30" height="30" alt="" referrerpolicy="no-referrer"><span class="account-trigger-name">'+esc(name)+'</span>'+chevron+'</summary><div class="account-dropdown-panel"><a class="account-menu-profile" href="/account/"><img src="'+esc(avatar)+'" width="48" height="48" alt="" referrerpolicy="no-referrer"><span><strong>'+esc(name)+'</strong><small>Profile: '+esc(user.displayName||name)+'</small></span>'+icon('m9 5 7 7-7 7')+'</a><div id="community-nav-alerts"></div><div class="account-menu-footer">'+(user.isAdmin?'<a class="account-menu-admin" href="/forums/admin/">Admin</a>':'')+'<button type="button" id="nav-logout">Log Out</button></div><p id="account-menu-error" role="alert" hidden></p></div></details>';
    actions.querySelectorAll('img').forEach(image=>{image.onerror=()=>{image.onerror=null;image.src='/assets/default-avatar-dragonball.webp';};});
    document.getElementById('nav-logout').onclick=async e=>{
     const button=e.currentTarget;button.disabled=true;const error=document.getElementById('account-menu-error');
     try{const r=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('Unable to log out. Please try again.');window.dispatchEvent(new Event('dragon:auth-signed-out'));}
     catch(e){error.hidden=false;error.textContent=e.message;button.disabled=false;}
    };
   }
   const nr=await fetch('/api/forum?view=alerts',{credentials:'same-origin',cache:'no-store'});
   const counts=nr.ok?await nr.json():{};
   const count=n=>Math.max(0,Math.floor(Number(n)||0));
   const badge=n=>count(n)?'<span class="account-badge">'+count(n)+'</span>':'';
   const markup='<a href="/forums/#messages">'+message+'<span>Messages</span>'+badge(counts.messages)+'</a><a href="/forums/#notifications">'+bell+'<span>Notifications</span>'+badge(counts.notifications)+'</a>';
   document.getElementById('community-nav-alerts').innerHTML=markup;
   const fa=document.getElementById('forum-alerts');if(fa){fa.hidden=false;fa.innerHTML=markup;}
   const toggle=document.getElementById('nav-toggle'),total=count(counts.messages)+count(counts.notifications);
   let mobile=document.getElementById('mobile-alert-count');if(toggle&&total){if(!mobile){mobile=document.createElement('span');mobile.id='mobile-alert-count';mobile.className='account-badge';toggle.append(mobile);}mobile.textContent=String(total);}else mobile?.remove();
  }catch{/* Preserve usable account controls during a temporary connection failure. */}
  finally{busy=false;}
 }
 document.addEventListener('click',e=>{if(!e.target.closest('.account-dropdown'))document.querySelector('.account-dropdown')?.removeAttribute('open');});
 document.addEventListener('keydown',e=>{const menu=document.querySelector('.account-dropdown[open]');if(e.key==='Escape'&&menu){e.stopImmediatePropagation();menu.open=false;menu.querySelector('summary').focus();}},true);
 window.addEventListener('dragon:alerts',update);window.addEventListener('dragon:auth-signed-in',update);window.addEventListener('dragon:auth-signed-out',update);
 setInterval(()=>{if(!document.hidden)update();},30000);update();
})();
