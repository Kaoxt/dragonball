import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {newGame, addPlayer, act, view, cardImage} from '../public/game.js';
import {practiceDeck} from '../public/practice-deck.js';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
// Exercise the production selection, click and drag handlers with real game rules.
const handlers = source.slice(source.indexOf('function getSelected()'), source.indexOf("$('room-form').onsubmit"));
const closeHandler = source.slice(source.indexOf("$('card-zoom').addEventListener('close'"), source.lastIndexOf('restoreTable();'));
const labels = {deck:'Life Deck',hand:'Hand',combat:'Combat cards',noncombat:'Non-Combat',drills:'Drills',allies:'Allies',dragonballs:'Dragon Balls',location:'Battleground / Location',discard:'Discard',removed:'Removed',senseiDeck:'Sensei Deck',mp:'Main Personality',mastery:'Mastery',sensei:'Sensei'};
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
  const ids = ['card-zoom','card-zoom-image','card-zoom-art','card-zoom-placeholder','inspect','pile-dialog','destination'];
  const elements = Object.fromEntries(ids.map(id => [id, node()]));
  const document = {addEventListener:(type, handler) => {events[type] = handler;},querySelectorAll:() => [],body:{append(){}},elementFromPoint:() => null};
  const context = vm.createContext({selected:null, openPile:null, seat:0, game:view(game,0), labels, cardImage,
    $:id => elements[id], esc:value => String(value ?? '').replaceAll('<','&lt;'), document,
    renderPile(){}, setTimeout:fn => timers.push(fn), requestAnimationFrame(){}, window:{scrollBy(){}},
    send(action) {act(game, context.seat, action);context.game = view(game,context.seat);vm.runInContext('renderInspector()',context);}
  });
  vm.runInContext(handlers + '\n' + closeHandler, context);
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
