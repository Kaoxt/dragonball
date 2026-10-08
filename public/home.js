// Keep previously shared room invitations working at the original root URL.
if(/^#[a-f0-9]{32}$/i.test(location.hash))location.replace('/play/'+location.hash);
for(const button of document.querySelectorAll('.read-more'))button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));document.getElementById(button.getAttribute('aria-controls')).hidden=!open;button.firstChild.textContent=open?'Show less ':'Show more ';});
