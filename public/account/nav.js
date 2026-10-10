(() => {
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=path=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
 const chevron=icon('m6 9 6 6 6-6'),message=icon('M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z'),bell=icon('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4');
 const mobileMenu=window.matchMedia('(max-width:899px), (max-width:1200px) and (orientation:portrait)');
 const syncAccountMode=()=>{const menu=document.querySelector('.account-dropdown');if(menu)menu.open=mobileMenu.matches;};
 mobileMenu.addEventListener('change',syncAccountMode);
 const cacheKey='dragon:nav-preview';
 let busy=false,identity='',authVersion=0,refreshQueued=false;
 const cachePreview=value=>{try{if(value)sessionStorage.setItem(cacheKey,JSON.stringify(value));else sessionStorage.removeItem(cacheKey);}catch{}};
 const safeAvatar=value=>{if(/^\/api\/avatars\/[0-9a-f-]{36}$/.test(value||''))return value;try{const url=new URL(value);if(url.protocol==='https:')return url.href;}catch{}return '/assets/default-avatar-dragonball.webp';};
 function initialPreview(){
  let cached;try{cached=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
  const name=typeof cached?.name==='string'?cached.name.slice(0,100):'Account';
  return '<a class="account-loading-preview" href="/account/" aria-label="Checking account" aria-busy="true"><img src="'+esc(safeAvatar(cached?.avatar))+'" width="30" height="30" alt="" referrerpolicy="no-referrer"><span>'+esc(name)+'</span>'+chevron+'</a>';
 }
 async function update(){
  const nav=document.getElementById('site-navigation');if(!nav)return;if(busy){refreshQueued=true;return;}busy=true;const version=authVersion;
  let actions=document.getElementById('account-nav-actions');
  if(!actions){actions=document.createElement('div');actions.id='account-nav-actions';actions.className='account-nav-actions';actions.innerHTML=initialPreview();nav.append(actions);}
  try{
   const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(version!==authVersion)return;if(!response.ok)return;
   const {user}=await response.json();if(version!==authVersion)return;
   if(!user){cachePreview(null);identity='';actions.classList.remove('is-signed-in');actions.innerHTML='<a id="account-nav" class="account-nav-link" href="/account/">Log In</a>';document.getElementById('mobile-alert-count')?.remove();const fa=document.getElementById('forum-alerts');if(fa)fa.hidden=true;return;}
   actions.classList.add('is-signed-in');
   const raw=user.username||user.displayName||'',name=raw.charAt(0).toUpperCase()+raw.slice(1);
   cachePreview({name,avatar:safeAvatar(user.avatarUrl)});
   const key=JSON.stringify([user.id,user.username,user.displayName,user.avatarUrl,user.isAdmin]);
   if(identity!==key){
    identity=key;
    let avatar='/assets/default-avatar-dragonball.webp';
    if(/^\/api\/avatars\/[0-9a-f-]{36}$/.test(user.avatarUrl||''))avatar=user.avatarUrl;
    else {try{const url=new URL(user.avatarUrl);if(url.protocol==='https:')avatar=url.href;}catch{}}
    actions.innerHTML='<details class="account-dropdown"><summary id="account-nav" aria-label="Account: '+esc(name)+'"><img class="account-trigger-avatar" src="'+esc(avatar)+'" width="30" height="30" alt="" referrerpolicy="no-referrer"><span class="account-trigger-name">'+esc(name)+'</span>'+chevron+'</summary><div class="account-dropdown-panel"><a class="account-menu-profile" href="/account/"><img src="'+esc(avatar)+'" width="48" height="48" alt="" referrerpolicy="no-referrer"><span><strong>'+esc(name)+'</strong></span>'+icon('m9 5 7 7-7 7')+'</a><div id="community-nav-alerts"></div><div class="account-menu-footer">'+(user.isAdmin?'<a class="account-menu-admin" href="/forums/admin/">Admin</a>':'')+'<button type="button" id="nav-logout">Log Out</button></div><p id="account-menu-error" role="alert" hidden></p></div></details>';
    syncAccountMode();
    actions.querySelectorAll('img').forEach(image=>{image.onerror=()=>{image.onerror=null;image.src='/assets/default-avatar-dragonball.webp';};});
    document.getElementById('nav-logout').onclick=async e=>{
     const button=e.currentTarget;button.disabled=true;const error=document.getElementById('account-menu-error');
     try{const r=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('Unable to log out. Please try again.');window.dispatchEvent(new Event('dragon:auth-signed-out'));}
     catch(e){error.hidden=false;error.textContent=e.message;button.disabled=false;}
    };
   }
   const nr=await fetch('/api/forum?view=alerts',{credentials:'same-origin',cache:'no-store'});
   const counts=nr.ok?await nr.json():{};if(version!==authVersion)return;
   const count=n=>Math.max(0,Math.floor(Number(n)||0));
   const badge=n=>count(n)?'<span class="account-badge">'+count(n)+'</span>':'';
   const markup='<a href="/forums/#messages">'+message+'<span>Messages</span>'+badge(counts.messages)+'</a><a href="/forums/#notifications">'+bell+'<span>Notifications</span>'+badge(counts.notifications)+'</a>';
   document.getElementById('community-nav-alerts').innerHTML=markup+'<a href="/account/">'+icon('M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0')+'<span>Account</span></a>';
   const fa=document.getElementById('forum-alerts');if(fa){fa.hidden=false;fa.innerHTML=markup;}
   const toggle=document.getElementById('nav-toggle'),total=count(counts.messages)+count(counts.notifications);
   let mobile=document.getElementById('mobile-alert-count');if(toggle&&total){if(!mobile){mobile=document.createElement('span');mobile.id='mobile-alert-count';mobile.className='account-badge';toggle.append(mobile);}mobile.textContent=String(total);}else mobile?.remove();
  }catch{/* Preserve usable account controls during a temporary connection failure. */}
  finally{busy=false;const preview=actions.querySelector('.account-loading-preview');if(preview){preview.removeAttribute('aria-busy');preview.setAttribute('aria-label','Account');}if(refreshQueued){refreshQueued=false;queueMicrotask(update);}}
 }
 document.addEventListener('click',e=>{if(!mobileMenu.matches&&!e.target.closest('.account-dropdown'))document.querySelector('.account-dropdown')?.removeAttribute('open');});
 document.addEventListener('keydown',e=>{const menu=document.querySelector('.account-dropdown[open]');if(e.key==='Escape'&&menu&&!mobileMenu.matches){e.stopImmediatePropagation();menu.open=false;menu.querySelector('summary').focus();}},true);
 window.addEventListener('dragon:alerts',update);window.addEventListener('dragon:auth-signed-in',()=>{authVersion++;update();});window.addEventListener('dragon:auth-signed-out',()=>{authVersion++;cachePreview(null);identity='';const actions=document.getElementById('account-nav-actions');if(actions){actions.classList.remove('is-signed-in');actions.innerHTML='<a id="account-nav" class="account-nav-link" href="/account/">Log In</a>';}update();});
 setInterval(()=>{if(!document.hidden)update();},30000);update();
})();
