import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {catalog, codeCardIds} from './helpers/pre-majin-buu-completion.js';
import {browserSets, cardPath, catalogRoute} from '../public/cards/card-links.js';
import {finishForImage, isHiTech, isUltraRare} from '../public/card-surface.js';
import {decodeDeck, encodeDeck} from '../public/decks/deck-code.js';
import {createDeck, snapshot} from '../public/decks/store.js';
import {blocksHiTechAlly} from '../public/decks/eligibility.js';
import {parseDeck} from '../public/game.js';
import {catalog as previous, codeCardIds as previousIds} from './helpers/pre-majin-buu-151-200.js';
import records from '../tools/card-templates/v3/majin-buu-151-200/new-cards.json' with {type:'json'};
import manifest from '../tools/card-templates/v3/majin-buu-151-200/file-manifest.json' with {type:'json'};

const ready = records.filter(card => card.release_status === 'ready');
const added = catalog.slice(previous.length);
const files = new Map(manifest.map(file => [file.path, file]));

test('only ready cards enter the Majin Buu catalog and permanent ID list', () => {
  assert.deepEqual(catalog.slice(0, previous.length), previous);
  assert.equal(ready.length, 48);
  assert.deepEqual(added.map(card => card.id), ready.map(card => card.id));
  assert.deepEqual(codeCardIds, [...previousIds, ...ready.map(card => card.id)]);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.equal(browserSets(catalog).find(set => set.slug === 'majin-buu-saga').count, 193);
  const pending = records.filter(card => card.release_status === 'artwork_pending');
  assert.deepEqual(pending.map(card => card.number), [160, 175]);
  for (const card of pending) {
    assert.equal(catalogRoute('/cards/majin-buu-saga/' + card.number, catalog).kind, 'missing');
  }
});

test('each card retains its rules, artwork and printed rarity, including the separate Hi-Tech levels', () => {
  assert.equal(added.filter(isHiTech).length, 18);
  assert.deepEqual(added.filter(isUltraRare).map(card => card.number), ['151', '152', '153']);
  for (const [index, card] of added.entries()) {
    const input = ready[index];
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    assert.equal(card.number, String(input.number));
    assert.equal(card.rules, input.authoritative_effect);
    assert.equal(card.rarityStars, input.rarity_stars);
    assert.equal(isHiTech(card), input.high_tech);
    assert.equal(blocksHiTechAlly(card, 'cards'), input.high_tech);
    if (input.original_gatefold_pair) assert.deepEqual(card.originalGatefoldPair, input.original_gatefold_pair);
    for (const [field, folder] of [['image', 'display'], ['downloadImage', 'downloads']]) {
      const [path, revision] = card[field].split('?v=');
      const expected = files.get(folder + '/' + card.id + '.webp');
      const bytes = readFileSync('public' + path);
      assert.equal(bytes.length, expected.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
      assert.equal(revision, expected.sha256.slice(0, 12));
      if (input.high_tech || isUltraRare(card)) assert.equal(finishForImage(card[field]).id, card.id);
    }
  }
  const roshi = added.find(card => card.number === '153');
  assert.deepEqual([roshi.type, roshi.senseiDeckSize], ['Sensei', 9]);
});

test('all 47 ready personalities preserve their power charts through deck sharing and Arena setup', async () => {
  const personalities = added.filter(card => card.type === 'Main Personality');
  assert.equal(personalities.length, 47);
  for (const card of personalities) {
    const input = ready.find(record => record.id === card.id);
    const deck = createDeck();
    const slot = input.level - 1;
    deck.personalities[slot] = snapshot(card);
    const decoded = await decodeDeck(await encodeDeck(deck), catalog);
    const saved = decoded.personalities[slot];
    assert.deepEqual([saved.id, saved.level, saved.pur], [input.id, input.level, input.pur]);
    const stack = Array.from({length:Math.max(input.level, 3)}, (_, index) => ({id:'test-level-' + (index + 1)}));
    stack[slot] = saved;
    const arena = parseDeck({personalities:stack, cards:[snapshot(previous[0])]});
    assert.deepEqual(arena.personalities[slot].powerLevels, [...input.stages].reverse());
  }
});
