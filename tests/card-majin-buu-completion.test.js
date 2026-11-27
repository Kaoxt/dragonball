import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {cardPath, catalogRoute, browserSets, promoCategory} from '../public/cards/card-links.js';
import {isHiTech} from '../public/card-surface.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {encodeDeck, decodeDeck} from '../public/decks/deck-code.js';
import {createDeck, addCard, snapshot} from '../public/decks/store.js';
import {assertDeckEligible, assertTokuiRestrictions} from '../public/decks/eligibility.js';
import {parseDeck} from '../public/game.js';
import {catalog as previous, codeCardIds as previousIds} from './helpers/pre-majin-buu-completion.js';
import ready from '../tools/card-templates/v3/majin-buu-completion/ready-cards.json' with {type:'json'};
import manifest from '../tools/card-templates/v3/majin-buu-completion/manifest.json' with {type:'json'};

const added = catalog.slice(previous.length);
const files = new Map(manifest.files.map(file => [file.path, file]));
const byNumber = new Map(added.map(card => [card.number, card]));

test('the remaining-card release appends exactly 15 playable IDs and retains the three artwork gaps', () => {
  assert.deepEqual(catalog.slice(0, previous.length), previous);
  assert.deepEqual(added.map(card => card.id), ready.map(card => card.id));
  assert.deepEqual(codeCardIds, [...previousIds, ...added.map(card => card.id)]);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.equal(added.length, 15);
  assert.equal(browserSets(catalog).find(set => set.slug === 'majin-buu-saga').count, 208);
  for (const n of [32, 116, 160]) {
    assert.equal(catalogRoute('/cards/majin-buu-saga/' + String(n).padStart(3,'0'), catalog).kind, 'missing');
  }
  const promos = added.filter(card => card.number.startsWith('P'));
  assert.equal(promos.length, 10);
  for (const card of promos) assert.equal(promoCategory(card), 'Majin Buu Saga Promos');
  assert.equal(byNumber.get('201').name, 'Earth Dragon Ball 3');
});

test('all ready routes use the supplied rules, exact exports and approved native masters', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const [i, card] of added.entries()) {
    const entry = ready[i];
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    assert.equal(card.rules, entry.authoritative_effect);
    assert.equal(card.originalHeadshotCharacter, entry.original_headshot_character);
    for (const [field, source] of [['image', entry.display_path], ['downloadImage', entry.download_path]]) {
      const [path, revision] = card[field].split('?v=');
      const expected = files.get(source);
      const bytes = readFileSync('public' + path);
      assert.equal(bytes.length, expected.bytes);
      assert.equal(hash(bytes), expected.sha256);
      assert.equal(revision, expected.sha256.slice(0,12));
    }
    assert.equal(hash(readFileSync('tools/card-templates/v3/majin-buu-completion/' + entry.native_path)), files.get(entry.native_path).sha256);
  }
  assert.deepEqual([byNumber.get('P2').type, byNumber.get('P2').originalHeadshotCharacter], ['Energy Combat', 'Goku']);
  assert.match(byNumber.get('P2').rules, /Endurance 3/i);
  assert.match(byNumber.get('P2').rules, /physical attack/i);
  assert.equal(byNumber.get('P3').originalHeadshotCharacter, 'Majin Babidi');
  assert.equal(byNumber.get('P7').originalHeadshotCharacter, 'Supreme Kai');
});

test('three personalities keep their level, PUR and exact stages through a shared deck and Arena', async () => {
  const personalities = ready.filter(card => card.category === 'HERO');
  assert.equal(personalities.length, 3);
  assert.ok(isHiTech(byNumber.get('175')));
  for (const input of personalities) {
    const deck = createDeck();
    const slot = input.level - 1;
    deck.personalities[slot] = snapshot(byNumber.get(String(input.number)));
    const decoded = await decodeDeck(await encodeDeck(deck), catalog);
    const saved = decoded.personalities[slot];
    assert.deepEqual([saved.id,saved.level,saved.pur],[input.id,input.level,input.pur]);
    const stack = Array.from({length:Math.max(3,input.level)}, (_, i) => ({id:'level-' + (i+1)}));
    stack[slot] = saved;
    const arena = parseDeck({personalities:stack,cards:[snapshot(previous[0])]});
    assert.deepEqual(arena.personalities[slot].powerLevels, [...input.stages].reverse());
  }
});

test('Deceptive Moves checks the declared Tokui-Waza in both deck zones, deck codes and Arena', async () => {
  const moves = byNumber.get('P4');
  for (const zone of ['cards','senseiDeck']) {
    const deck = createDeck();
    deck.tokui = 'Blue';
    addCard(deck, moves, zone);
    assert.doesNotThrow(() => assertDeckEligible(deck));
    assert.throws(() => assertTokuiRestrictions(deck, 'Red'), /Deceptive Moves.*Red Tokui-Waza/);
    deck.tokui = 'Red';
    const error = /Deceptive Moves.*Red Tokui-Waza/;
    assert.throws(() => addCard(deck, {id:moves.id}, zone), error);
    assert.throws(() => assertDeckEligible(deck), error);
    await assert.rejects(decodeDeck(await encodeDeck(deck), catalog), error);
    assert.throws(() => parseDeck({...deck, personalities:[1,2,3].map(n => ({id:'level-' + n}))}), error);
    deck[zone] = [];
    assert.doesNotThrow(() => assertDeckEligible(deck));
  }
});
