(() => {
 async function update(){
  const nav=document.getElementById('site-navigation');if(!nav)return;
  let actions=document.getElementById('account-nav-actions');
  if(!actions){
   actions=document.createElement('div');actions.id='account-nav-actions';actions.className='account-nav-actions';
   const signIn=document.createElement('a');signIn.id='account-nav';signIn.className='account-nav-link';signIn.href='/account/';signIn.textContent='Log In';
   actions.append(signIn);nav.append(actions);
  }
  const link=document.getElementById('account-nav');
  const signedOut=()=>{actions.classList.remove('is-signed-in');link.textContent='Log In';link.removeAttribute('aria-label');};
  link.removeAttribute('aria-current');
  if(location.pathname.startsWith('/account'))link.setAttribute('aria-current','page');
  try{
   const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const {user}=await r.json();
   if(!user){signedOut();return;}
   actions.classList.add('is-signed-in');
   if(location.pathname.startsWith('/account'))link.setAttribute('aria-current','page');
   link.replaceChildren();
   const rawName=user.displayName||user.username||'';
   const displayName=rawName.charAt(0).toUpperCase()+rawName.slice(1);
   const name=document.createElement('span');name.textContent=displayName;link.append(name);link.setAttribute('aria-label','Account: '+displayName);
   const nr=await fetch('/api/forum?view=notifications&summary=1',{cache:'no-store'});if(!nr.ok)return;const {unreadCount}=await nr.json();
   if(unreadCount){const badge=document.createElement('span');badge.className='account-badge';badge.textContent=String(unreadCount);link.append(badge);link.setAttribute('aria-label',`Account: ${displayName}, ${unreadCount} unread notifications`);}
  }catch{/* Keep the account links usable if the connection is interrupted. */}
 }
 window.addEventListener('dragon:auth-signed-in',update);window.addEventListener('dragon:auth-signed-out',update);update();
})();
