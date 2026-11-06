import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {newGame, addPlayer, act, view, cardImage} from '../public/game.js';
import {practiceDeck} from '../public/practice-deck.js';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const pileRendering = source.slice(source.indexOf('function cardHTML('), source.indexOf('const playZones='));
// Exercise the production selection, click and drag handlers with real game rules.
const handlers = source.slice(source.indexOf('function getSelected()'), source.indexOf("$('room-form').onsubmit"));
const closeHandler = source.slice(source.indexOf("$('card-zoom').addEventListener('close'"), source.lastIndexOf('restoreTable();'));
const labels = {deck:'Life Deck',hand:'Hand',combat:'Combat cards',noncombat:'Non-Combat',drills:'Drills',allies:'Allies',dragonballs:'Dragon Balls',location:'Battleground / Location',discard:'Discard',removed:'Banished',senseiDeck:'Sensei Deck',mp:'Main Personality',mastery:'Mastery',sensei:'Sensei'};
function arena() {
  const game = newGame();
  addPlayer(game, 'a', 'You'); addPlayer(game, 'b', 'Opponent');
  act(game, 0, {type:'load',deck:practiceDeck()}); act(game, 1, {type:'load',deck:practiceDeck(true)});
  act(game, 0, {type:'start'}); act(game, 0, {type:'ready'}); act(game, 1, {type:'ready'});
  act(game, 0, {type:'draw',count:3});
  const events = {}, timers = [];
  const node = () => ({open:false, hidden:false, value:'', innerHTML:'', dataset:{}, style:{},
    handlers:{}, getAttribute(name) {return this[name] ?? null;},
    addEventListener(type, fn) {this.handlers[type] = fn;},
    showModal() {this.open = true;}, close() {this.open = false; this.handlers.close?.();},
    classList:{toggle(){},add(){}}, removeAttribute(){}, remove(){}, cloneNode:() => node()});
  const ids = ['card-zoom','card-zoom-image','card-zoom-art','card-zoom-placeholder','inspect','pile-dialog','pile-title','pile-cards','pile-help','destination'];
  const elements = Object.fromEntries(ids.map(id => [id, node()]));
  elements['pile-dialog'].querySelector = () => elements['pile-help'];
  const document = {addEventListener:(type, handler) => {events[type] = handler;},querySelectorAll:() => [],body:{append(){}},elementFromPoint:() => null};
  const context = vm.createContext({selected:null, openPile:null, seat:0, game:view(game,0), labels, cardImage,
    $:id => elements[id], esc:value => String(value ?? '').replaceAll('<','&lt;'), document,
    setTimeout:fn => timers.push(fn), requestAnimationFrame(){}, window:{scrollBy(){}},
    send(action) {act(game, context.seat, action);context.game = view(game,context.seat);vm.runInContext('renderInspector()',context);}
  });
  vm.runInContext(pileRendering + '\n' + handlers + '\n' + closeHandler, context);
  const click = (selector, dataset = {}) => {
    const target = {...node(), dataset, closest:query => query === selector ? target : null};
    events.click({target, preventDefault(){}});
  };
  return {game, context, elements, events, timers, node, click,
    refresh() {context.game = view(game,context.seat);vm.runInContext('renderInspector()',context);},
    tap(zone, card, owner = 0) {click('[data-card]', {card:`${owner}:${zone}:${card.uid}`});}
  };
}

test('one tap immediately opens enlarged hand, Sensei, Mastery and current MP cards', () => {
  const a = arena(), p = a.game.players[0];
  for (const [zone, card] of [['hand',p.zones.hand[0]],['sensei',p.sensei],['mastery',p.mastery],['mp',p.personalities[0]]]) {
    a.tap(zone,card);
    assert.equal(a.elements['card-zoom'].open,true);
    assert.equal(a.elements['pile-dialog'].open,false);
    assert.equal(a.elements['card-zoom-image'].alt,card.name);
    assert.ok(a.elements['card-zoom-image'].src);
    assert.doesNotMatch(a.elements.inspect.innerHTML,/Enlarge card|preview-image/);
    assert.equal(a.timers.length,0,'no double-tap waiting period');
    a.elements['card-zoom'].close(); assert.equal(a.context.selected,null);
  }
});

test('game actions are available in the large view and moving a card closes its old selection', () => {
  const a = arena(), card = a.game.players[0].zones.hand[0];
  a.tap('hand',card); assert.match(a.elements.inspect.innerHTML,/id="move-selected"/);
  a.elements.destination.value = 'combat'; a.click('#move-selected');
  assert.ok(a.game.players[0].zones.combat.some(c => c.uid === card.uid));
  assert.equal(a.elements['card-zoom'].open,false); assert.equal(a.context.selected,null);
  a.tap('combat',card); a.click('[data-card-action]',{cardAction:'rest'});
  assert.equal(a.game.players[0].zones.combat[0].rested,true);
  assert.equal(a.elements['card-zoom'].open,true); assert.match(a.elements.inspect.innerHTML,/Mark unused/);
  a.click('[data-card-action]',{cardAction:'flip'});
  assert.equal(a.game.players[0].zones.combat[0].faceDown,true);
  assert.equal(a.elements['card-zoom-image'].alt,card.name,'owner retains access to own card');
});

test('opponent face-down cards show only a back and never expose private details or controls', () => {
  const a = arena(), card = a.game.players[0].zones.hand[0];
  act(a.game,0,{type:'move',from:'hand',uid:card.uid,to:'combat'});
  act(a.game,0,{type:'flip',from:'combat',uid:card.uid});
  a.context.seat = 1; a.refresh(); a.tap('combat',card,0);
  assert.equal(a.elements['card-zoom'].open,true);
  assert.match(a.elements['card-zoom-image'].src,/card-back/);
  assert.equal(a.elements['card-zoom-image'].alt,'Face-down card');
  assert.ok(!a.elements.inspect.innerHTML.includes(card.name));
  assert.ok(!a.elements.inspect.innerHTML.includes(card.id));
  assert.doesNotMatch(a.elements.inspect.innerHTML,/id="destination"|data-card-action|move-selected/);
});

test('all MP levels remain reachable and selecting another level previews the correct artwork', () => {
  const a = arena(), p = a.game.players[0];
  a.tap('mp',p.personalities[0]); a.click('#view-mp-levels');
  assert.equal(a.elements['card-zoom'].open,false); assert.equal(a.elements['pile-dialog'].open,true);
  a.click('[data-mp-preview]',{mpPreview:'0:2'});
  assert.equal(a.elements['pile-dialog'].open,false); assert.equal(a.elements['card-zoom'].open,true);
  assert.equal(a.elements['card-zoom-image'].src,cardImage(p.personalities[2]));
  assert.match(a.elements.inspect.innerHTML,/Level 3/);
  assert.equal(p.level,1,'inspecting another level never changes gameplay');
});

test('an open preview closes when its card becomes unavailable and missing artwork stays readable', () => {
  const a = arena(), p = a.game.players[0], card = p.zones.hand[0];
  card.id = 'custom'; card.name = 'Custom card'; card.image = '';
  a.refresh(); a.tap('hand',card);
  assert.equal(a.elements['card-zoom-placeholder'].hidden,false);
  assert.equal(a.elements['card-zoom-art'].hidden,true);
  assert.match(a.elements.inspect.innerHTML,/Custom card/);
  a.context.selected = '0:hand:missing'; a.refresh();
  assert.equal(a.elements['card-zoom'].open,false); assert.equal(a.context.selected,null);
});

test('dragging still suppresses the following click instead of opening a preview', () => {
  const a = arena(), card = a.game.players[0].zones.hand[0];
  const target = {...a.node(),dataset:{card:`0:hand:${card.uid}`}};
  target.closest = selector => selector === '[data-movable]' ? target : null;
  a.events.pointerdown({target,button:0,pointerId:1,clientX:50,clientY:50});
  a.events.pointermove({pointerId:1,clientX:150,clientY:150,preventDefault(){}});
  a.events.pointerup({pointerId:1,clientX:150,clientY:150});
  a.tap('hand',card); assert.equal(a.elements['card-zoom'].open,false);
  a.timers.forEach(fn => fn()); a.tap('hand',card); assert.equal(a.elements['card-zoom'].open,true);
});

test('Sensei Deck opens its Sensei first and every owned deck card with working previews', () => {
  const a = arena(), p = a.game.players[0];
  p.zones.senseiDeck = [{uid:'side-a',id:'side-a',name:'First side card'}, {uid:'side-b',id:'side-b',name:'Second side card'}];
  a.refresh(); a.click('[data-pile]', {pile:'0:senseiDeck'});
  assert.equal(a.elements['pile-dialog'].open,true);
  assert.equal(a.elements['pile-title'].textContent,'Your Sensei Deck · 2');
  const html = a.elements['pile-cards'].innerHTML;
  assert.ok(html.indexOf(`0:sensei:${p.sensei.uid}`) < html.indexOf('0:senseiDeck:side-b'));
  assert.match(html,/First side card/); assert.match(html,/Second side card/);
  assert.doesNotMatch(html,/data-movable/);
  a.tap('sensei',p.sensei);
  assert.equal(a.elements['card-zoom'].open,true); assert.equal(a.elements['pile-dialog'].open,false);
  assert.equal(a.elements['card-zoom-image'].alt,p.sensei.name);
  a.elements['card-zoom'].close();
  a.click('[data-pile]', {pile:'0:senseiDeck'}); a.tap('senseiDeck',p.zones.senseiDeck[0]);
  assert.match(a.elements.inspect.innerHTML,/First side card/);
  a.elements.destination.value = 'hand'; a.click('#move-selected');
  assert.equal(p.zones.senseiDeck.length,1);
  assert.ok(p.zones.hand.some(c=>c.name==='First side card'));
});

test('opponent Sensei Deck reveals its public Sensei and count without private cards', () => {
  const a = arena(), p = a.game.players[1];
  p.zones.senseiDeck = [{uid:'private-side',id:'secret-id',name:'Secret Sensei card',image:'https://example.com/private.webp'}];
  a.refresh(); a.click('[data-pile]', {pile:'1:senseiDeck'});
  assert.equal(a.elements['pile-dialog'].open,true);
  assert.match(a.elements['pile-title'].textContent,/Sensei Deck · 1/);
  assert.match(a.elements['pile-help'].textContent,/1 Sensei Deck card is hidden/);
  assert.ok(a.elements['pile-cards'].innerHTML.includes(p.sensei.name));
  assert.doesNotMatch(a.elements['pile-cards'].innerHTML,/Secret Sensei card|secret-id|private-side|private.webp/);
  const dock = vm.runInContext('zoneHTML(game.players[1],1,"senseiDeck")',a.context);
  assert.match(dock,/data-pile="1:senseiDeck"/);
  assert.doesNotMatch(dock,/Secret Sensei card|secret-id|private-side|private.webp/);
});

test('empty Sensei Deck still opens its Sensei and works when no Sensei is loaded', () => {
  const a = arena(), p = a.game.players[0];
  a.click('[data-pile]', {pile:'0:senseiDeck'});
  assert.ok(a.elements['pile-cards'].innerHTML.includes(p.sensei.name));
  assert.match(a.elements['pile-cards'].innerHTML,/No cards in this Sensei Deck/);
  p.sensei = null; a.refresh(); a.click('[data-pile]', {pile:'0:senseiDeck'});
  assert.match(a.elements['pile-cards'].innerHTML,/No cards in this Sensei Deck/);
  assert.doesNotMatch(a.elements['pile-cards'].innerHTML,/data-card=/);
});

test('compact play rows resize without collisions, clipped cards or altered game positions', () => {
  const layout = source.slice(source.indexOf('function layoutPlayedCards()'), source.indexOf("window.addEventListener('resize'"));
  for (const [width, cardWidth] of [[240,35],[304,47],[720,70]]) {
    for (const count of [0,1,3,12,25]) {
      const cards = Array.from({length:count},(_,i)=>({dataset:{card:`0:combat:card-${i}`},style:{}}));
      const gameCards = cards.map((_,i)=>({uid:`card-${i}`,position:{x:0.5,y:0.5}}));
      const original = structuredClone(gameCards);
      const table = {clientWidth:width,style:{},dataset:{},querySelectorAll:()=>cards,parentElement:{querySelector:()=>({getBoundingClientRect:()=>({width:cardWidth})})}};
      const context = vm.createContext({document:{querySelectorAll:()=>[table]},game:{players:[{zones:{combat:gameCards}}]}});
      vm.runInContext(layout+'\nlayoutPlayedCards();',context);
      const positions = new Set();
      for (const card of cards) {
        const x=parseFloat(card.style.left),y=parseFloat(card.style.top),w=parseFloat(card.style.width),h=parseFloat(card.style.height);
        assert.ok(x>=0 && x+w<=width && y>=0 && y+h<=parseFloat(table.style.height),'card remains inside its mat');
        assert.ok(x+(w-h)/2>=0 && x+(w+h)/2<=width,'sideways card remains inside its column');
        positions.add(`${x}:${y}`);
      }
      assert.equal(positions.size,count,'every card has its own position');
      assert.deepEqual(gameCards,original,'layout never rewrites saved game positions');
      if(count<=1)assert.ok(parseFloat(table.style.height)<=114,'one compact open row above the dock');
      if(count===25)assert.ok(parseFloat(table.style.height)>114,'additional cards remain visible');
    }
  }
});
