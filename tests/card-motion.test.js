import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupCardMotion} from '../public/card-motion.js';

function preview(t, reduced = false) {
  class Target {
    handlers = new Map();
    dataset = {}; children = []; attributes = new Map();
    style = {setProperty(name, value) {this[name] = value;}, removeProperty(name) {delete this[name];}};
    append(...nodes) {for (const node of nodes) {node.parentElement = this;this.children.push(node);}}
    replaceWith(node) {const parent = this.parentElement;parent.children[parent.children.indexOf(this)] = node;node.parentElement = parent;}
    setAttribute(name, value) {this.attributes.set(name, value);}
    getAttribute(name) {return this.attributes.get(name) || null;}
    addEventListener(type, handler, options) {
      const entries = this.handlers.get(type) || [];
      entries.push({handler, options}); this.handlers.set(type, entries);
    }
    fire(type, values = {}) {
      const event = {type, isPrimary: true, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0,
        clientX: 300, clientY: 350, cancelable: true, preventDefault() {this.defaultPrevented = true;}, ...values};
      for (const {handler} of this.handlers.get(type) || []) handler(event);
      return event;
    }
  }
  const stage = new Target(), image = new Target(), dialog = new Target(), document = new Target(), window = new Target(), preference = new Target();
  document.createElement = () => {const el = new Target();el.ownerDocument = document;return el;};
  image.ownerDocument = document;stage.append(image);
  image.setAttribute('src', '/assets/cards/saiyan-155-goku.webp');
  preference.matches = reduced;
  window.matchMedia = () => preference;
  const captures = new Set(), classes = new Set(), frames = new Map();
  let nextFrame = 0;
  stage.dataset = {};
  stage.querySelector = () => image;
  stage.closest = () => dialog;
  stage.classList = {add: name => classes.add(name), remove: name => classes.delete(name)};
  stage.focus = () => {};
  stage.getBoundingClientRect = () => ({left: 100, top: 50, width: 400, height: 600});
  stage.setPointerCapture = id => captures.add(id);
  stage.hasPointerCapture = id => captures.has(id);
  stage.releasePointerCapture = id => {captures.delete(id);stage.fire('lostpointercapture', {pointerId: id});};
  image.offsetWidth = 360; image.offsetHeight = 560;
  image.style = {removeProperty(name) {delete this[name];}};
  // A transformed bounding box must never be used as the input coordinate space.
  image.getBoundingClientRect = () => {throw Error('Unstable image measurement');};
  const observations = [];
  const replacements = {window, document,
    requestAnimationFrame: callback => {frames.set(++nextFrame, callback);return nextFrame;},
    cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class {constructor(callback) {this.callback = callback;} observe(target, options) {observations.push({target, options, callback: this.callback});}}
  };
  for (const [key, value] of Object.entries(replacements)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {configurable: true, writable: true, value});
    t.after(() => {if (previous) Object.defineProperty(globalThis, key, previous);else delete globalThis[key];});
  }
  const controller = setupCardMotion(stage);
  return {stage, image, surface: controller.surface.element, effects: controller.surface.effects, dialog, document, window, preference, captures, classes, observations, controller,
    flush() {const callbacks = [...frames.values()];frames.clear();callbacks.forEach(fn => fn());},
    pending: () => frames.size};
}

test('mouse and captured touch tilt the image using a stable area and reset on release', t => {
  const p = preview(t);
  assert.equal(p.image.draggable, false);
  p.stage.fire('pointermove', {clientX: 450, clientY: 100}); p.flush();
  const tilt = p.surface.style.transform;
  assert.match(tilt, /rotateX\([^0][^)]*deg\) rotateY\([^0]/);
  p.stage.fire('pointermove', {clientX: 450, clientY: 100}); p.flush();
  assert.equal(p.surface.style.transform, tilt);
  p.stage.fire('pointerleave'); assert.equal(p.surface.style.transform, undefined);
  p.stage.fire('pointerdown', {pointerType: 'touch'});
  assert.equal(p.captures.has(1), true);
  p.stage.fire('pointermove', {pointerType: 'touch', clientX: 9999, clientY: -9999}); p.flush();
  assert.equal(p.surface.style.transform, 'translate3d(14px, -14px, 0) rotateX(30deg) rotateY(30deg) rotateZ(4deg)');
  p.stage.fire('pointerleave'); assert.ok(p.surface.style.transform);
  p.stage.fire('pointerup', {pointerType: 'touch'}); p.flush();
  assert.equal(p.captures.size, 0);
  assert.equal(p.surface.style.transform, undefined);
  assert.equal(p.classes.has('is-interacting'), false);
});

test('secondary fingers and unpressed touch cannot take over an active card', t => {
  const p = preview(t);
  p.stage.fire('pointermove', {pointerType: 'touch', clientX: 450}); p.flush();
  assert.equal(p.surface.style.transform, undefined);
  p.stage.fire('pointerdown', {pointerType: 'touch', clientX: 420}); p.flush();
  const tilt = p.surface.style.transform;
  p.stage.fire('pointerdown', {pointerType: 'touch', pointerId: 2, isPrimary: false});
  p.stage.fire('pointermove', {pointerType: 'touch', pointerId: 2, clientX: 100}); p.flush();
  p.stage.fire('pointerup', {pointerType: 'touch', pointerId: 2});
  assert.deepEqual([...p.captures], [1]); assert.equal(p.surface.style.transform, tilt);
  assert.equal(p.stage.fire('touchmove').defaultPrevented, true);
  assert.equal(p.stage.handlers.get('touchmove')[0].options.passive, false);
  assert.equal(p.document.handlers.has('touchmove'), false);
  assert.equal(p.window.handlers.has('touchmove'), false);
});

test('closing, cancellation, focus loss and changing cards clear pending movement and capture', t => {
  const p = preview(t);
  const resets = [() => p.stage.fire('pointercancel'), () => p.stage.fire('lostpointercapture'),
    () => p.stage.fire('blur'), () => p.window.fire('blur'), () => p.window.fire('resize'),
    () => p.dialog.fire('close'), () => p.dialog.fire('cancel'), () => p.image.fire('load'),
    () => p.observations.find(o => o.target === p.image).callback(),
    () => p.observations.find(o => o.target === p.dialog).callback()];
  for (const reset of resets) {
    p.stage.fire('pointerdown', {clientX: 450}); assert.equal(p.pending(), 1);
    reset(); p.flush();
    assert.equal(p.pending(), 0); assert.equal(p.captures.size, 0);
    assert.equal(p.surface.style.transform, undefined);
  }
});

test('keyboard tilt is bounded, Home resets it, and Escape remains available to the dialog', t => {
  const p = preview(t);
  for (let i = 0; i < 10; i++) assert.equal(p.stage.fire('keydown', {key: 'ArrowRight'}).defaultPrevented, true);
  p.flush(); assert.match(p.surface.style.transform, /rotateY\(30deg\)/);
  assert.equal(p.stage.fire('keydown', {key: 'Escape'}).defaultPrevented, undefined);
  p.stage.fire('keydown', {key: 'Home'}); assert.equal(p.surface.style.transform, undefined);
});

test('reduced motion skips hover and limits deliberate movement without translation', t => {
  const p = preview(t, true);
  p.stage.fire('pointermove', {clientX: 500}); p.flush(); assert.equal(p.surface.style.transform, undefined);
  p.stage.fire('pointerdown', {clientX: 500, clientY: 100}); p.flush();
  assert.match(p.surface.style.transform, /^translate3d\(0px, 0px, 0\)/);
  assert.match(p.surface.style.transform, /rotateY\(4deg\)/);
  p.preference.fire('change'); assert.equal(p.surface.style.transform, undefined);
});

test('all three enlarged viewers load the shared physical card and catalog-controlled finish', () => {
  for (const [page, id] of [['cards', 'detail-image'], ['decks', 'preview-image'], ['arena', 'card-zoom-image']]) {
    const html = readFileSync(new URL(`../public/${page}/index.html`, import.meta.url), 'utf8');
    assert.match(html, /href="\/card-surface\.css\?v=/);
    assert.match(html, /href="\/card-motion\.css\?v=/);
    assert.match(html, /src="\/card-motion\.js\?v=/);
    assert.match(html, new RegExp(`data-card-motion[^>]+><img id="${id}"`));
    assert.doesNotMatch(html, /src="\/foil-test\/foil\.js/);
  }
});


test('switching between Hi-Tech, standard, and face-down previews resets foil without leaking card details', t => {
  const p = preview(t);
  const changed = () => p.observations.find(o => o.target === p.image).callback();
  for (const [source, finish] of [
    ['/assets/cards/trunks-195-vegeta.webp?v=old', 'hi-tech'],
    ['/assets/cards/dragonball-01-test.webp', 'standard'],
    ['/assets/cards/saiyan-179-goku-lvl-1-ht.jpg', 'hi-tech'],
    ['/assets/dragon-ball-online-card-back.webp?v=burnt-red-1', 'standard']
  ]) {
    p.stage.fire('pointerdown', {clientX:450});p.flush();
    p.image.setAttribute('src', source);changed();
    assert.equal(p.surface.dataset.finish, finish);
    assert.equal(p.effects.hidden, finish !== 'hi-tech');
    assert.equal(p.surface.style.transform, undefined);
    assert.equal(p.surface.style['--light-x'], '50%');
    assert.equal(p.captures.size, 0);
  }
});
