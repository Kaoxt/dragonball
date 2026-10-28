const card=document.getElementById('card'),stage=document.getElementById('stage'),strength=document.getElementById('strength'),value=document.getElementById('value'),tilt=document.getElementById('tilt'),foil=document.getElementById('foil'),status=document.getElementById('status');
let x=.5,y=.5,active=false,motionEnabled=false,pointerId=null;
function render(){const intensity=Number(strength.value)/100;card.style.setProperty('--active',foil.checked?(active?intensity:intensity*.28):0);card.style.setProperty('--posx',(x*100)+'%');card.style.setProperty('--posy',(y*100)+'%');card.style.setProperty('--angle',((x-.5)*70)+'deg');card.style.transform=tilt.checked?'rotateY('+((x-.5)*18)+'deg) rotateX('+((.5-y)*18)+'deg)':'none';value.textContent=strength.value+'%'}
function point(e){
  // Measure the fixed stage and untransformed card, so tilting cannot move
  // the coordinate system under a stationary finger and feed back into itself.
  const r=stage.getBoundingClientRect(),width=card.offsetWidth,height=card.offsetHeight;
  x=Math.max(0,Math.min(1,(e.clientX-r.left-(r.width-width)/2)/width));
  y=Math.max(0,Math.min(1,(e.clientY-r.top-(r.height-height)/2)/height));
  active=true;card.classList.add('is-interacting');render();
}
function rest(center=false){
  card.classList.remove('is-interacting');
  if(center){x=.5;y=.5}
  active=false;render();
}
function release(e){
  if(pointerId===null||e.pointerId!==pointerId)return;
  const releasedId=pointerId;pointerId=null;
  if(stage.hasPointerCapture(releasedId))stage.releasePointerCapture(releasedId);
  rest(e.type!=='pointerup');
}
stage.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||pointerId!==null)return;
  pointerId=e.pointerId;
  stage.setPointerCapture(pointerId);
  point(e);
});
stage.addEventListener('pointermove',e=>{
  if(pointerId!==null?e.pointerId!==pointerId:e.pointerType!=='mouse')return;
  point(e);
});
stage.addEventListener('pointerleave',()=>{
  if(pointerId===null&&!motionEnabled)rest(true);
});
stage.addEventListener('pointerup',release);
stage.addEventListener('pointercancel',release);
stage.addEventListener('lostpointercapture',release);
// Explicitly cancel native touch panning as well as declaring touch-action:none.
// Keep this local to the preview so the rest of the page still scrolls normally.
function preventPan(e){if(e.cancelable)e.preventDefault()}
stage.addEventListener('touchstart',preventPan,{passive:false});
stage.addEventListener('touchmove',preventPan,{passive:false});
window.addEventListener('blur',()=>{
  if(pointerId!==null)release({pointerId,type:'pointercancel'});
  else rest(true);
});
strength.addEventListener('input',render);tilt.addEventListener('change',render);foil.addEventListener('change',render);
document.getElementById('reset').addEventListener('click',()=>{strength.value=65;tilt.checked=true;foil.checked=true;rest(true)});
document.getElementById('motion').addEventListener('click',async()=>{try{if(typeof DeviceOrientationEvent==='undefined')throw Error('Device motion is unavailable in this browser.');if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted')throw Error('Motion permission was not granted.')}if(!motionEnabled){window.addEventListener('deviceorientation',e=>{if(pointerId!==null||e.gamma==null||e.beta==null)return;x=Math.max(0,Math.min(1,.5+e.gamma/80));y=Math.max(0,Math.min(1,.5+(e.beta-45)/80));active=true;render()},{passive:true});motionEnabled=true}status.textContent='Device tilt enabled. Tilt your phone to move the foil.'}catch(e){status.textContent=e.message}});
render();
