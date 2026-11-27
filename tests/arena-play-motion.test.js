import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/arena-play-motion.js',import.meta.url),'utf8').replaceAll('export function','function');
function harness({reduced=false,hidden=false}={}){
 const animations=[],ghosts=[];
 const rect={left:10,top:30,right:80,bottom:128,width:70,height:98};
 const image={cloneNode(){const ghost={style:{},setAttribute(){},removeAttribute(){},removed:false,remove(){this.removed=true;},animate(frames,options){const a={frames,options,cancel(){this.oncancel?.();}};animations.push(a);return a;}};ghosts.push(ghost);return ghost;}};
 const card={getBoundingClientRect:()=>rect,querySelector:()=>image};
 const context=vm.createContext({document:{hidden,querySelector:()=>card,body:{append(){}}},CSS:{escape:s=>s},Element:{prototype:{animate(){}}},matchMedia:()=>({matches:reduced}),innerHeight:900,innerWidth:390});
 vm.runInContext(source,context);
 return {context,animations,ghosts,run:code=>vm.runInContext(code,context)};
}
test('play animation runs once per confirmed event, uses transform/opacity only, and releases its image',()=>{
 const h=harness();h.run('capturePlayMotion({lastPlay:null},0)');
 h.run('var event={version:2,owner:0,from:"hand",to:"discard",uid:"card"}; animatePlayMotion(capturePlayMotion({lastPlay:event},0))');
 assert.equal(h.animations.length,1);assert.equal(h.animations[0].options.duration,260);
 assert.deepEqual(Object.keys(h.animations[0].frames[0]),['transform','opacity']);
 h.run('animatePlayMotion(capturePlayMotion({lastPlay:event},0))');assert.equal(h.animations.length,1);
 h.animations[0].onfinish();assert.equal(h.ghosts[0].removed,true);
 h.run('event.version=3;animatePlayMotion(capturePlayMotion({lastPlay:event},0))');
 h.run('event.version=4;animatePlayMotion(capturePlayMotion({lastPlay:event},0))');
 assert.equal(h.ghosts[1].removed,true,'a new play cancels the previous image');
});
test('restored sessions, reduced motion and hidden tabs never start animations',()=>{
 for(const options of [{},{reduced:true},{hidden:true}]){
  const h=harness(options);
  h.run('var event={version:2,owner:0,from:"hand",to:"discard",uid:"card"};animatePlayMotion(capturePlayMotion({lastPlay:event},0))');
  assert.equal(h.animations.length,0,'initial/restored state is static');
  if(options.reduced||options.hidden){h.run('event.version=3;animatePlayMotion(capturePlayMotion({lastPlay:event},0))');assert.equal(h.animations.length,0);}
 }
});
