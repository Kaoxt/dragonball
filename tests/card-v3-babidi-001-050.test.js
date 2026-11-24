import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {firstBabidiCatalog as catalog, firstBabidiIds as codeCardIds} from './helpers/pre-babidi.js';
import {cardPath, catalogRoute} from '../public/cards/card-links.js';
import {createDeck, addCard, snapshot} from '../public/decks/store.js';
import {encodeDeck, decodeDeck} from '../public/decks/deck-code.js';
import {powerChart} from '../public/personality-power.js';
import {catalog as priorCatalog, codeCardIds as priorIds} from './helpers/pre-babidi.js';
import release from '../tools/card-corrections/v3-babidi-001-050/publication-manifest.json' with {type:'json'};

const added = catalog.filter(card => card.set === release.set);
const ids = release.cards.map(card => card.id);

test('the first Babidi release appends exactly the 49 cleared cards and permanent deck IDs', () => {
  assert.deepEqual(added.map(card => card.id), ids);
  assert.deepEqual(catalog, [...priorCatalog, ...added]);
  assert.deepEqual(codeCardIds, [...priorIds, ...ids]);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.deepEqual(added.map(card => Number(card.number)), Array.from({length:50}, (_, i) => i + 1).filter(n => n !== 30));
  assert.equal(catalogRoute('/cards/babidi-saga/', catalog).set, 'Babidi Saga');
  assert.equal(catalogRoute('/cards/babidi-saga/030', catalog).kind, 'missing');
});

test('each share link and both WebP exports match the publication manifest', () => {
  for (const [i, card] of added.entries()) {
    const original = release.cards[i];
    assert.equal(card.name, original.name);
    assert.equal(cardPath(card), '/cards/babidi-saga/' + String(original.number).padStart(3, '0'));
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    for (const [field, digest] of [['image', original.display_sha256], ['downloadImage', original.download_sha256]]) {
      const [pathname, version] = card[field].split('?v=');
      assert.equal(version, digest.slice(0, 12));
      assert.equal(createHash('sha256').update(readFileSync('public' + pathname)).digest('hex'), digest);
    }
  }
  const ship = added.find(card => card.number === '35');
  assert.deepEqual([ship.type, ship.width, ship.height], ['Battleground', 1484, 1060]);
  assert.match(added.find(card => card.number === '29').rules, /^Limit 1 per deck\./);
});

test('Majin Vegeta retains his printed chart in the Arena and the new cards round-trip through deck codes', async () => {
  const vegeta = added.find(card => card.number === '47');
  assert.deepEqual([vegeta.type, vegeta.alignment, vegeta.level, vegeta.pur], ['Main Personality', 'Villain', 1, 2]);
  const deck = createDeck();
  for (const card of added) addCard(deck, card);
  const imported = await decodeDeck(await encodeDeck(deck), catalog);
  assert.deepEqual(imported.personalities[0], snapshot(vegeta));
  assert.deepEqual(powerChart(imported.personalities[0]), [0, 825000, 900000, 975000, 1050000, 1125000, 1200000, 1275000, 1350000, 1425000, 1500000]);
  assert.deepEqual(imported.cards, deck.cards);
});
