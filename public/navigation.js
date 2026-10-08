const toggle=document.getElementById('nav-toggle'),nav=document.getElementById('site-navigation');
if(toggle&&nav){
 const close=()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');nav.classList.remove('is-open');};
 toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('is-open',open);};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle.focus();}});
 document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))close();});
}
