
const card=document.getElementById('card'),stage=document.getElementById('stage'),strength=document.getElementById('strength'),value=document.getElementById('value'),tilt=document.getElementById('tilt'),foil=document.getElementById('foil'),status=document.getElementById('status');
let x=.5,y=.5,active=false,motionEnabled=false;
function render(){const intensity=Number(strength.value)/100;card.style.setProperty('--active',foil.checked?(active?intensity:intensity*.28):0);card.style.setProperty('--posx',(x*100)+'%');card.style.setProperty('--posy',(y*100)+'%');card.style.setProperty('--angle',((x-.5)*70)+'deg');card.style.transform=tilt.checked?'rotateY('+((x-.5)*18)+'deg) rotateX('+((.5-y)*18)+'deg)':'none';value.textContent=strength.value+'%'}
function point(e){const r=card.getBoundingClientRect();x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));active=true;render()}
stage.addEventListener('pointermove',point,{passive:true});stage.addEventListener('pointerdown',point,{passive:true});
stage.addEventListener('pointerleave',()=>{if(!motionEnabled){x=.5;y=.5;active=false;render()}});
stage.addEventListener('pointerup',()=>{if(!motionEnabled){active=false;render()}});
strength.addEventListener('input',render);tilt.addEventListener('change',render);foil.addEventListener('change',render);
document.getElementById('reset').addEventListener('click',()=>{strength.value=65;tilt.checked=true;foil.checked=true;x=.5;y=.5;active=false;render()});
document.getElementById('motion').addEventListener('click',async()=>{try{if(typeof DeviceOrientationEvent==='undefined')throw Error('Device motion is unavailable in this browser.');if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted')throw Error('Motion permission was not granted.')}if(!motionEnabled){window.addEventListener('deviceorientation',e=>{if(e.gamma==null||e.beta==null)return;x=Math.max(0,Math.min(1,.5+e.gamma/80));y=Math.max(0,Math.min(1,.5+(e.beta-45)/80));active=true;render()},{passive:true});motionEnabled=true}status.textContent='Device tilt enabled. Tilt your phone to move the foil.'}catch(e){status.textContent=e.message}});
render();
