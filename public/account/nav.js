(() => {
 async function update(){
  const nav=document.getElementById('site-navigation');if(!nav)return;
  let actions=document.getElementById('account-nav-actions');
  if(!actions){
   actions=document.createElement('div');actions.id='account-nav-actions';actions.className='account-nav-actions';
   const signIn=document.createElement('a');signIn.id='account-nav';signIn.className='account-nav-link';signIn.href='/account/';signIn.textContent='Sign In';
   const register=document.createElement('a');register.id='register-nav';register.className='account-register-link';register.href='/account/?mode=register';register.textContent='Register';
   actions.append(signIn,register);nav.append(actions);
  }
  const link=document.getElementById('account-nav'),register=document.getElementById('register-nav');
  const signedOut=()=>{actions.classList.remove('is-signed-in');register.hidden=false;link.textContent='Sign In';link.removeAttribute('aria-label');};
  link.removeAttribute('aria-current');register.removeAttribute('aria-current');
  if(location.pathname.startsWith('/account'))(new URLSearchParams(location.search).get('mode')==='register'?register:link).setAttribute('aria-current','page');
  try{
   const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const {user}=await r.json();
   if(!user){signedOut();return;}
   actions.classList.add('is-signed-in');register.hidden=true;register.removeAttribute('aria-current');
   if(location.pathname.startsWith('/account'))link.setAttribute('aria-current','page');
   link.replaceChildren();
   const name=document.createElement('span');name.textContent=user.displayName;link.append(name);link.setAttribute('aria-label','Account: '+user.displayName);
   const nr=await fetch('/api/forum?view=notifications&summary=1',{cache:'no-store'});if(!nr.ok)return;const {unreadCount}=await nr.json();
   if(unreadCount){const badge=document.createElement('span');badge.className='account-badge';badge.textContent=String(unreadCount);link.append(badge);link.setAttribute('aria-label',`Account: ${user.displayName}, ${unreadCount} unread notifications`);}
  }catch{/* Keep the account links usable if the connection is interrupted. */}
 }
 window.addEventListener('dragon:auth-signed-in',update);window.addEventListener('dragon:auth-signed-out',update);update();
})();
