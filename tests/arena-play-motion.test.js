import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {newGame, addPlayer, act, view, cardImage} from '../public/game.js';
import {practiceDeck} from '../public/practice-deck.js';
import {catalog} from '../public/cards/catalog.js';
const source=fs.readFileSync(new URL('../public/arena-play-motion.js',import.meta.url),'utf8').replaceAll('export function','function');
function harness({reduced=false,hidden=false,offscreen=false,missing=false,loaded=true}={}) {
  const animations=[],ghosts=[],timers=new Map(),events={},classes=new Set();
  let now=0, nextTimer=0, scrolls=0;
  const rect={left:20,top:40,right:90,bottom:138,width:70,height:98};
  const node=()=>({hidden:false,style:{},classList:{values:new Set(),add(c){this.values.add(c);},remove(c){this.values.delete(c);}},
    setAttribute(){},removeAttribute(){},append(){},showPopover(){this.open=true;},hidePopover(){this.open=false;},
    remove(){this.removed=true;},getBoundingClientRect:()=>({left:60,top:150,right:330,bottom:528,width:270,height:378}),
    animate(frames,options){const a={frames,options,cancel(){this.oncancel?.();}};animations.push(a);return a;}});
  const ids=['arena-play-reveal','arena-play-reveal-panel','arena-play-reveal-image','arena-play-reveal-player','arena-play-reveal-name','arena-play-reveal-destination'];
  const elements=Object.fromEntries(ids.map(id=>[id,node()]));elements['arena-play-reveal'].hidden=true;
  const image=elements['arena-play-reveal-image'];Object.assign(image,{complete:loaded,naturalWidth:loaded?1060:0,cloneNode(){const g=node();ghosts.push(g);return g;}});
  const destination={...node(),getBoundingClientRect:()=>offscreen?{...rect,top:-200,bottom:-102}:rect,
    scrollIntoView(){scrolls++;offscreen=false;}};
  const document={hidden,addEventListener:(name,fn)=>{events[name]=fn;},getElementById:id=>elements[id],querySelector:()=>missing?null:destination,querySelectorAll:()=>[destination]};
  const context=vm.createContext({document,CSS:{escape:s=>s},matchMedia:()=>({matches:reduced}),innerHeight:900,innerWidth:390,
    setTimeout(fn,delay){const id=++nextTimer;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id)});
  vm.runInContext(source,context);
  const present=(game,seat=0)=>context.animatePlayMotion(context.capturePlayMotion(game,seat,cardImage));
  function advance(ms){const end=now+ms;for(;;){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at).find(([,t])=>t.at<=end);if(!entry)break;now=entry[1].at;timers.delete(entry[0]);entry[1].fn();}now=end;}
  return {context,document,elements,destination,animations,ghosts,events,timers,present,advance,scrolls:()=>scrolls};
}
function table(ids=['saiyan-006-red-lunge-punch']) {
  const g=newGame();addPlayer(g,'a','Alice');addPlayer(g,'b','Bob');
  const d=practiceDeck();d.cards=ids.map(id=>catalog.find(c=>c.id===id));
  act(g,0,{type:'load',deck:d});act(g,1,{type:'load',deck:practiceDeck(true)});act(g,0,{type:'start'});
  act(g,0,{type:'ready'});act(g,1,{type:'ready'});
  for(const id of ids) act(g,0,{type:'draw'});
  return g;
}
const reveal=h=>h.elements['arena-play-reveal'];
const text=(h,part)=>h.elements['arena-play-reveal-'+part].textContent;

test('both seats see the public card centered before its flight, once per confirmed play',()=>{
  const g=table(), h=harness(), opponent=harness();h.present(view(g,0));opponent.present(view(g,1),1);
  const c=g.players[0].zones.hand[0];act(g,0,{type:'play',uid:c.uid});
  h.present(view(g,0));opponent.present(view(g,1),1);
  for(const client of [h,opponent]){
    assert.equal(reveal(client).hidden,false);assert.equal(reveal(client).open,true);
    assert.equal(text(client,'name'),c.name);assert.equal(text(client,'destination'),'Next: Discard pile');
    assert.equal(client.elements['arena-play-reveal-image'].src,cardImage(c));
    assert.equal(client.destination.classList.values.has('arena-play-pending'),true);
    client.advance(2199);assert.equal(client.ghosts.length,0,'the full card stays up for a reading pause');
    client.advance(1);assert.equal(client.ghosts.length,1);assert.equal(client.animations.at(-1).options.duration,380);
    assert.deepEqual(Object.keys(client.animations.at(-1).frames[0]),['transform','opacity']);
    client.animations.at(-1).onfinish();assert.equal(reveal(client).hidden,true);assert.equal(client.ghosts[0].removed,true);
    assert.equal(client.destination.classList.values.has('arena-play-pending'),false);assert.equal(client.timers.size,0);
  }
  assert.equal(text(h,'player'),'You played');assert.equal(text(opponent,'player'),'Alice played');
  h.present(view(g,0));assert.equal(reveal(h).hidden,true,'repeated state never replays the event');
});

test('banishment and every persistent area are announced, including Setup use',()=>{
  for(const [id,destination] of [['frieza-014-gokus-righteous-force','Banished pile'],['frieza-013-empowerment','Setups'],['frieza-065-red-energy-defense-drill','Drills'],['trunks-025-namek-dragon-ball-1','Dragon Balls'],['android-008-gravity-chamber','Battleground / Location'],['trunks-154-krillin','Allies']]){
    const g=table([id]),h=harness();h.present(view(g,1),1);
    const uid=g.players[0].zones.hand[0].uid;act(g,0,{type:'play',uid});h.present(view(g,1),1);
    assert.equal(text(h,'destination'),'Next: '+destination);
    if(destination==='Setups'){
      h.advance(2750);act(g,0,{type:'resolve',from:'noncombat',uid});h.present(view(g,1),1);
      assert.equal(text(h,'player'),'Alice used');assert.equal(text(h,'destination'),'Next: Banished pile');
    }
  }
});

test('rapid consecutive plays are shown in order without interrupting the first reveal',()=>{
  const g=table(['saiyan-006-red-lunge-punch','frieza-014-gokus-righteous-force']),h=harness();h.present(view(g,0));
  const [a,b]=g.players[0].zones.hand;
  act(g,0,{type:'play',uid:a.uid});h.present(view(g,0));
  act(g,0,{type:'play',uid:b.uid});h.present(view(g,0));
  assert.equal(text(h,'name'),a.name);h.advance(2750);assert.equal(text(h,'name'),b.name);
  h.advance(2750);assert.equal(reveal(h).hidden,true);assert.equal(h.timers.size,0);
});

test('Undo and moving a card privately cancel its reveal and restore the destination',()=>{
  for(const undo of [true,false]){
    const g=table(),h=harness();h.present(view(g,1),1);const uid=g.players[0].zones.hand[0].uid;
    act(g,0,{type:'play',uid});h.present(view(g,1),1);
    act(g,0,undo?{type:'undo'}:{type:'move',from:'discard',to:'hand',uid});h.present(view(g,1),1);
    assert.equal(reveal(h).hidden,true);h.advance(5000);assert.equal(h.ghosts.length,0);
    assert.equal(h.destination.classList.values.has('arena-play-pending'),false);
  }
});

test('reduced motion still shows the readable announcement, without zoom or flight',()=>{
  const g=table(),h=harness({reduced:true});h.present(view(g,0));
  act(g,0,{type:'play',uid:g.players[0].zones.hand[0].uid});h.present(view(g,0));
  assert.equal(reveal(h).hidden,false);h.advance(2200);assert.equal(reveal(h).hidden,true);
  assert.equal(h.animations.length,0);assert.equal(h.ghosts.length,0);
});

test('restoring a game, hidden tabs and leaving the table never replay old cards',()=>{
  const g=table(),h=harness();act(g,0,{type:'play',uid:g.players[0].zones.hand[0].uid});
  h.present(view(g,0));assert.equal(reveal(h).hidden,true);
  const fresh=table();h.context.resetPlayMotion();h.present(view(fresh,0));
  act(fresh,0,{type:'play',uid:fresh.players[0].zones.hand[0].uid});h.present(view(fresh,0));
  assert.equal(reveal(h).hidden,false);h.document.hidden=true;h.events.visibilitychange();
  assert.equal(reveal(h).hidden,true);h.advance(5000);assert.equal(h.ghosts.length,0);
  h.document.hidden=false;h.present(view(fresh,0));assert.equal(reveal(h).hidden,true);
  h.context.resetPlayMotion();h.present(view(fresh,0));assert.equal(reveal(h).hidden,true);
});

test('an offscreen receiving pile scrolls into view only after the center reveal',()=>{
  const g=table(),h=harness({offscreen:true});h.present(view(g,1),1);
  act(g,0,{type:'play',uid:g.players[0].zones.hand[0].uid});h.present(view(g,1),1);
  assert.equal(h.scrolls(),0);h.advance(2200);assert.equal(h.scrolls(),1);assert.equal(h.ghosts.length,1);
});

test('missing destinations and slow/broken images still show the card name and clean up',()=>{
  for(const options of [{missing:true},{loaded:false}]){
    const g=table(),h=harness(options);h.present(view(g,0));
    const card=g.players[0].zones.hand[0];act(g,0,{type:'play',uid:card.uid});h.present(view(g,0));
    assert.equal(text(h,'name'),card.name);assert.equal(reveal(h).hidden,false);
    h.advance(5000);assert.equal(reveal(h).hidden,true);assert.equal(h.timers.size,0);
  }
});
