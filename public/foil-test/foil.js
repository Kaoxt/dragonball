import {setupCardSurface} from '/card-surface.js?v=20261028-firefox-performance';
const $ = id => document.getElementById(id);
const stage=$('stage'),strength=$('strength'),value=$('value'),tilt=$('tilt'),foil=$('foil'),status=$('status'),animate=$('animate'),motion=$('motion');
const surface=setupCardSurface(stage.querySelector('img')),card=surface.element;card.id='card';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let x=.5,y=.5,pointerId=null,auto=false,motionEnabled=false,frame=0,start=0;
const clamp=n=>Math.max(0,Math.min(1,n));
function render(){
  card.style.setProperty('--foil-strength',foil.checked?Number(strength.value)/100:0);
  surface.reflect(x*2-1,y*2-1);
  const angle=reduced.matches?8:48;
  card.style.transform=tilt.checked?`rotateY(${(x-.5)*angle}deg) rotateX(${(.5-y)*angle}deg)`:'none';
  value.textContent=`${strength.value}%`;
}
function tick(time){
  frame=0;
  if(!auto||document.hidden)return;
  if(!start)start=time;
  const t=(time-start)/1800;
  x=.5+Math.sin(t)*.36;y=.5+Math.sin(t*.73+.5)*.26;
  render();frame=requestAnimationFrame(tick);
}
function setAuto(enabled){
  auto=enabled;start=0;
  if(frame)cancelAnimationFrame(frame);frame=0;
  animate.textContent=auto?'Pause preview':'Play preview';
  animate.setAttribute('aria-pressed',String(auto));
  card.classList.toggle('is-interacting',auto||pointerId!==null);
  if(auto){motionEnabled=false;motion.textContent='Use device tilt';frame=requestAnimationFrame(tick);}
}
function center(){x=.5;y=.5;card.classList.remove('is-interacting');render();}
function stopMotion(){motionEnabled=false;motion.textContent='Use device tilt';}
function point(e){
  const r=stage.getBoundingClientRect(),width=card.offsetWidth,height=card.offsetHeight;
  if(!width||!height)return;
  x=clamp((e.clientX-r.left-(r.width-width)/2)/width);
  y=clamp((e.clientY-r.top-(r.height-height)/2)/height);
  card.classList.add('is-interacting');render();
}
function release(e){
  if(pointerId===null||e.pointerId!==pointerId)return;
  const released=pointerId;pointerId=null;
  if(stage.hasPointerCapture(released))stage.releasePointerCapture(released);
  card.classList.remove('is-interacting');
  if(e.type!=='pointerup')center();
}
stage.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||pointerId!==null)return;
  setAuto(false);stopMotion();pointerId=e.pointerId;
  stage.setPointerCapture(pointerId);stage.focus({preventScroll:true});point(e);
});
stage.addEventListener('pointermove',e=>{
  if(!e.isPrimary)return;
  if(pointerId!==null){if(e.pointerId!==pointerId)return;}
  else if(e.pointerType!=='mouse'||e.buttons||auto||motionEnabled||reduced.matches)return;
  point(e);
});
stage.addEventListener('pointerleave',()=>{if(pointerId===null&&!auto&&!motionEnabled)center();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,release);
// Pointer events and touch-action:none own the card gesture without blocking touch listeners.
stage.addEventListener('dragstart',e=>e.preventDefault());
stage.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  const d={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]}[e.key];
  if(e.key==='Home'){e.preventDefault();setAuto(false);stopMotion();center();return;}
  if(!d)return;
  e.preventDefault();setAuto(false);stopMotion();x=clamp(x+d[0]);y=clamp(y+d[1]);card.classList.add('is-interacting');render();
});
function cancelPointer(){if(pointerId!==null)release({pointerId,type:'pointercancel'});}
window.addEventListener('blur',()=>{cancelPointer();if(!auto)center();});
window.addEventListener('pagehide',()=>{cancelPointer();setAuto(false);stopMotion();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelPointer();if(frame)cancelAnimationFrame(frame);frame=0;}
  else if(auto){start=0;frame=requestAnimationFrame(tick);}
});
reduced.addEventListener('change',()=>{setAuto(false);center();});
strength.addEventListener('input',render);tilt.addEventListener('change',render);foil.addEventListener('change',render);
animate.addEventListener('click',()=>setAuto(!auto));
$('reset').addEventListener('click',()=>{setAuto(false);stopMotion();strength.value=70;tilt.checked=true;foil.checked=true;center();status.textContent='Preview reset. Drag the card or play the light sweep.';});
function orientation(e){
  if(!motionEnabled||pointerId!==null||e.gamma==null||e.beta==null||document.hidden)return;
  x=clamp(.5+e.gamma/80);y=clamp(.5+(e.beta-45)/80);card.classList.add('is-interacting');render();
}
window.addEventListener('deviceorientation',orientation,{passive:true});
motion.addEventListener('click',async()=>{
  if(motionEnabled){stopMotion();center();status.textContent='Device tilt is off. Touch and mouse controls are ready.';return;}
  try{
    if(typeof DeviceOrientationEvent==='undefined')throw Error('Device tilt is unavailable here. Drag the card or play the preview.');
    if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted')throw Error('Motion permission was not granted. Touch and mouse controls still work.');
    setAuto(false);motionEnabled=true;motion.textContent='Stop device tilt';status.textContent='Device tilt enabled. Tilt your device to catch the light.';
  }catch(e){status.textContent=e.message;}
});
render();if(!reduced.matches)setAuto(true);
