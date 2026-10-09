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
  const signedOut=()=>{document.getElementById('community-nav-alerts')?.remove();document.getElementById('mobile-alert-count')?.remove();const fa=document.getElementById('forum-alerts');if(fa)fa.hidden=true;actions.classList.remove('is-signed-in');link.textContent='Log In';link.removeAttribute('aria-label');};
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
   const nr=await fetch('/api/forum?view=alerts',{cache:'no-store'});if(!nr.ok)return;const counts=await nr.json();
   let alerts=document.getElementById('community-nav-alerts');if(!alerts){alerts=document.createElement('span');alerts.id='community-nav-alerts';actions.append(alerts);}
   const markup=`<a class="account-nav-link" href="/forums/#messages">Messages${counts.messages?` <span class="account-badge">${counts.messages}</span>`:''}</a> <a class="account-nav-link" href="/forums/#notifications">Notifications${counts.notifications?` <span class="account-badge">${counts.notifications}</span>`:''}</a>`;
   alerts.innerHTML=markup;
   const forumAlerts=document.getElementById('forum-alerts');if(forumAlerts){forumAlerts.hidden=false;forumAlerts.innerHTML=markup;}
   const toggle=document.getElementById('nav-toggle');if(toggle){let badge=document.getElementById('mobile-alert-count');const total=counts.messages+counts.notifications;if(total){if(!badge){badge=document.createElement('span');badge.id='mobile-alert-count';badge.className='account-badge';toggle.append(badge);}badge.textContent=String(total);}else badge?.remove();}

  }catch{/* Keep the account links usable if the connection is interrupted. */}
 }
 window.addEventListener('dragon:alerts',update);setInterval(()=>{if(!document.hidden)update();},30000);window.addEventListener('dragon:auth-signed-in',update);window.addEventListener('dragon:auth-signed-out',update);update();
})();
