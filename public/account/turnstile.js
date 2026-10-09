(() => {
 let current=null,scriptPromise=null;
 function loadScript(){
  if(window.turnstile)return Promise.resolve();
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   const timer=setTimeout(()=>{script.remove();scriptPromise=null;reject(Error('Security check took too long to load. Please try again.'));},15000);
   window.dragonTurnstileReady=()=>{clearTimeout(timer);resolve();};
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=dragonTurnstileReady';script.async=true;
   script.onerror=()=>{clearTimeout(timer);script.remove();scriptPromise=null;reject(Error('Security check could not load. Please check your connection and try again.'));};
   document.head.append(script);
  });return scriptPromise;
 }
 function remove(){const old=current;current=null;if(old?.widget!==undefined)window.turnstile?.remove(old.widget);}
 function canSubmit(){return !!current?.ready;}
 function validate(){if(!canSubmit())throw Error('Please complete the security check.');}
 function reset(){const state=current;if(!state?.required||state.widget===undefined)return;state.ready=false;state.button.disabled=true;window.turnstile.reset(state.widget);}
 async function mount(form){
  remove();const box=form.querySelector('#registration-security'),button=form.querySelector('[type=submit]');
  const state=current={box,button,ready:false,required:true,widget:undefined};button.disabled=true;
  box.innerHTML='<span class="security-label">Security check</span><p class="security-message" role="status">Loading security check…</p><div class="security-widget"></div><button type="button" class="security-retry" hidden>Retry security check</button>';
  const message=box.querySelector('.security-message'),retry=box.querySelector('.security-retry');
  retry.onclick=()=>mount(form);
  const update=(ready,text)=>{if(current!==state)return;state.ready=ready;button.disabled=!ready;message.textContent=text;};
  try{
   const response=await fetch('/api/auth/config',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('Security check is unavailable. Please try again.');
   const {turnstile:config}=await response.json();if(current!==state)return;
   if(config?.required===false){state.required=false;update(true,'');box.hidden=true;return;}
   if(!config?.ready||!config.siteKey)throw Error('Registration security check is temporarily unavailable. Please try again later.');
   box.hidden=false;await loadScript();if(current!==state)return;
   state.widget=window.turnstile.render(box.querySelector('.security-widget'),{
    sitekey:config.siteKey,action:'register',theme:'dark',size:'flexible',
    callback:()=>{update(true,'Security check complete.');retry.hidden=true;},
    'expired-callback':()=>update(false,'Security check expired. Please verify again.'),
    'timeout-callback':()=>{update(false,'Security check timed out. Please retry.');retry.hidden=false;},
    'error-callback':()=>{update(false,'Security check could not load. Please retry.');retry.hidden=false;}
   });
   message.textContent='Complete the security check to create your account.';
  }catch(error){if(current===state){update(false,error.message);retry.hidden=false;}}
 }
 window.DragonSecurity={mount,remove,reset,validate,canSubmit};
})();
