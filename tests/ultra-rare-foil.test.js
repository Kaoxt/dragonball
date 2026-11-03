import test from 'node:test';
import assert from 'node:assert/strict';
import {createUltraRareFoil} from '../public/ultra-rare-foil.js';

function renderer(t) {
  const images=[],frames=new Map();let next=0,paints=0,now=100;
  const pixels = new Uint8ClampedArray(530*742*4);pixels.fill(130);
  const doc={hidden:false,createElement(){return {style:{},setAttribute(){},getContext(){return {
    drawImage(){},getImageData(){return {data:pixels};},createImageData(){return {data:new Uint8ClampedArray(pixels.length)};},putImageData(){paints++;}
  };}};}};
  const globals={Image:class {constructor(){images.push(this);}},requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),performance:{now:()=>now}};
  for (const [key,value] of Object.entries(globals)) {
    const old=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
    t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key]);
  }
  const effects={hidden:false,children:[],append(node){this.children.push(node);}};
  const foil=createUltraRareFoil({ownerDocument:doc},effects);
  return {foil,images,effects,doc,paints:()=>paints,pending:()=>frames.size,
    flush(ms=40){now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));}};
}
const a={id:'frieza-125-super-saiyan-goku',type:'Main Personality',image:'/goku.webp'};
const b={id:'android-125-trunks-guardian-drill',type:'Drill',image:'/trunks.webp'};

test('late image loads cannot paint a previous card or reveal a hidden back',t=>{
  const p=renderer(t);p.foil.refresh(a);const oldLoad=p.images[1].onload;
  p.foil.refresh(b);oldLoad();assert.equal(p.paints(),0);
  p.images[2].onload();assert.equal(p.paints(),1);
  p.foil.reflect(.4,.2);assert.equal(p.pending(),1);
  p.foil.clear();assert.equal(p.pending(),0);assert.equal(p.effects.children[0].hidden,true);
  oldLoad();assert.equal(p.paints(),1);
  p.images[0].onload();assert.equal(p.paints(),1,'texture completion cannot reveal a cleared card');
});
test('latest movement is eventually drawn, unchanged input is idle, and reset cancels pending work',t=>{
  const p=renderer(t);p.foil.refresh(a);p.images[1].onload();
  p.foil.reflect(.2,.1);p.foil.reflect(.7,.4);assert.equal(p.pending(),1);
  p.flush(10);assert.equal(p.paints(),1);assert.equal(p.pending(),1);
  p.flush(30);assert.equal(p.paints(),2);assert.equal(p.pending(),0);
  p.foil.reflect(.7,.4);assert.equal(p.pending(),0);
  p.foil.reflect(-.4,.1);p.foil.reflect();assert.equal(p.pending(),0);assert.equal(p.paints(),3);
  p.foil.refresh(a);assert.equal(p.images.length,2,'same source is not decoded again');
});
test('failed images and hidden pages stop rendering safely',t=>{
  const p=renderer(t);p.foil.refresh(a);p.images[1].onload();
  p.foil.reflect(.5,.2);p.doc.hidden=true;p.flush();assert.equal(p.pending(),0);assert.equal(p.paints(),1);
  p.foil.refresh(b);p.images[2].onerror();assert.equal(p.effects.children[0].hidden,true);
  p.foil.reflect(.7,.8);assert.equal(p.pending(),0);
});
