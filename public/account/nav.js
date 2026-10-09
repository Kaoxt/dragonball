(() => {
 async function update(){
  const nav=document.getElementById('site-navigation');if(!nav)return;
  let link=document.getElementById('account-nav');
  if(!link){link=document.createElement('a');link.id='account-nav';link.className='account-nav-link';link.href='/account/';link.textContent='Log in / Register';nav.append(link);}
  if(location.pathname.startsWith('/account'))link.setAttribute('aria-current','page');
  try{
   const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const {user}=await r.json();
   link.replaceChildren();
   if(!user){link.textContent='Log in / Register';return;}
   const name=document.createElement('span');name.textContent=user.displayName;link.append(name);link.setAttribute('aria-label','Account: '+user.displayName);
   const nr=await fetch('/api/forum?view=notifications&summary=1',{cache:'no-store'});if(!nr.ok)return;const {unreadCount}=await nr.json();
   if(unreadCount){const badge=document.createElement('span');badge.className='account-badge';badge.textContent=String(unreadCount);link.append(badge);link.setAttribute('aria-label',`Account: ${user.displayName}, ${unreadCount} unread notifications`);}
  }catch{/* Keep the account link usable if the connection is interrupted. */}
 }
 window.addEventListener('dragon:auth-signed-in',update);window.addEventListener('dragon:auth-signed-out',update);update();
})();
