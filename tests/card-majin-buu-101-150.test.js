import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {catalog, codeCardIds} from './helpers/pre-majin-buu-151-200.js';
import {browserSets, cardPath, catalogRoute} from '../public/cards/card-links.js';
import {decodeDeck, encodeDeck} from '../public/decks/deck-code.js';
import {createDeck, snapshot} from '../public/decks/store.js';
import {powerChart} from '../public/personality-power.js';
import {parseDeck} from '../public/game.js';
import {catalog as previous, codeCardIds as previousIds} from './helpers/pre-majin-buu-101-150.js';
import ready from '../tools/card-templates/v3/majin-buu-101-150/ready-cards.json' with {type:'json'};
import manifest from '../tools/card-templates/v3/majin-buu-101-150/manifest.json' with {type:'json'};

const added = catalog.slice(previous.length);
const files = new Map(manifest.files.map(file => [file.path, file]));

test('the release adds exactly the finished Majin Buu cards and appends their permanent deck IDs', () => {
  assert.deepEqual(catalog.slice(0, previous.length), previous);
  assert.equal(ready.length, 46);
  assert.deepEqual(added.map(card => card.id), ready.map(card => card.id));
  assert.deepEqual(codeCardIds, [...previousIds, ...ready.map(card => card.id)]);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.equal(browserSets(catalog).find(set => set.slug === 'majin-buu-saga').count, 145);
  assert.deepEqual(manifest.artwork_pending, [116, 117, 131, 146]);
  for (const number of manifest.artwork_pending) {
    assert.equal(catalogRoute('/cards/majin-buu-saga/' + number, catalog).kind, 'missing');
  }
});

test('published pages preserve the supplied rules, orientation and both lossless artwork revisions', () => {
  for (const [index, card] of added.entries()) {
    const input = ready[index];
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    assert.equal(card.number, String(input.number));
    assert.equal(card.rules, input.authoritative_effect);
    assert.equal(card.rarity, {3:'Uncommon', 4:'Rare', 6:'Ultra Rare'}[input.rarity_stars]);
    const landscape = [110, 113].includes(input.number);
    assert.deepEqual([card.width, card.height], landscape ? [1484, 1060] : [1060, 1484]);
    for (const [field, file] of [['image', input.display_path], ['downloadImage', input.download_path]]) {
      const [path, revision] = card[field].split('?v=');
      const bytes = readFileSync('public' + path);
      const expected = files.get(file);
      assert.equal(bytes.length, expected.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
      assert.equal(revision, expected.sha256.slice(0, 12));
    }
  }
  const elderKai = added.find(card => card.number === '138');
  assert.deepEqual([elderKai.type, elderKai.rules, elderKai.senseiDeckSize], ['Sensei', '', 21]);
});

test('all eight finished personality charts survive deck sharing and Arena import', async () => {
  const personalities = ready.filter(card => ['HERO','VILLAIN'].includes(card.category));
  assert.equal(personalities.length, 8);
  for (const input of personalities) {
    const card = added.find(card => card.id === input.id);
    assert.deepEqual([card.type, card.level, card.pur], ['Main Personality', input.level, input.pur]);
    const deck = createDeck();
    deck.personalities[input.level - 1] = snapshot(card);
    const decoded = await decodeDeck(await encodeDeck(deck), catalog);
    const saved = decoded.personalities[input.level - 1];
    const stages = [...input.stages].reverse();
    assert.deepEqual(powerChart(saved), stages);
    const arena = parseDeck({personalities:[1, 2, 3].map(n => ({id:'test-' + n})), cards:[saved]});
    assert.deepEqual(arena.cards[0].powerLevels, stages);
  }
});
