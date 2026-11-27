import test from 'node:test';
import {beforeDendeSummoningFile} from './helpers/pre-dende-summoning.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog, codeCardIds} from './helpers/pre-babidi-030.js';
import {catalogRoute, cardPath, browserSets} from '../public/cards/card-links.js';
import {addCard, createDeck, snapshot} from '../public/decks/store.js';
import {encodeDeck, decodeDeck} from '../public/decks/deck-code.js';
import {assertNoBannedCards} from '../public/decks/eligibility.js';
import {parseDeck} from '../public/game.js';
import {catalog as previous, codeCardIds as previousIds} from './helpers/pre-majin-buu.js';
import ready from '../tools/card-templates/v3/majin-buu-001-050/catalog-ready.json' with {type:'json'};
import manifest from '../tools/card-templates/v3/majin-buu-001-050/file-manifest.json' with {type:'json'};

const release = catalog.filter(card => card.set === 'Majin Buu Saga');
const hashes = new Map(manifest.map(row => [row.path, row.sha256]));
const hash = file => createHash('sha256').update(beforeDendeSummoningFile(file)).digest('hex');

test('the Majin Buu set uses its supplied logo and only the 49 cleared cards', () => {
  assert.deepEqual(catalog, [...previous, ...release]);
  assert.deepEqual(codeCardIds, [...previousIds, ...ready.map(card => card.id)]);
  assert.deepEqual(release.map(card => card.number), Array.from({length:50}, (_, i) => i + 1).filter(n => n !== 32).map(String));
  assert.equal(catalogRoute('/cards/majin-buu-saga/032', catalog).kind, 'missing');
  const set = browserSets(catalog).find(set => set.name === 'Majin Buu Saga');
  assert.equal(set.count, 49);
  const logo = set.image.split('?')[0];
  assert.equal(hash('public' + logo), hashes.get('set-logo/Majin-Buu-Saga-Logo.png'));
  for (const [i, card] of release.entries()) {
    const expected = {...ready[i]};
    if (expected.type === 'Personality') expected.type = 'Main Personality';
    assert.deepEqual(card, expected);
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    for (const [field, folder] of [['image', 'display'], ['downloadImage', 'downloads']]) {
      const [path, version] = card[field].split('?v=');
      const digest = hash('public' + path);
      assert.equal(digest, hashes.get(folder + '/' + card.id + '.webp'));
      assert.equal(version, digest.slice(0, 12));
    }
  }
});

test('Black Weakness Drill is collectible and blocked in all deck and Arena slots', async () => {
  const banned = release.find(card => card.number === '49');
  assert.equal(banned.banned, true);
  const error = /Black Weakness Drill.*Banned/i;
  for (const zone of ['auto', 'cards', 'senseiDeck', 'personalities', 'mastery', 'sensei']) {
    assert.throws(() => addCard(createDeck(), {id:banned.id}, zone), error);
  }
  const deck = createDeck();
  deck.cards = [{...snapshot(banned), qty:1}];
  assert.throws(() => assertNoBannedCards(deck), error);
  await assert.rejects(decodeDeck(await encodeDeck(deck), catalog), error);
  const personalities = [1,2,3].map(n => ({id:'example-' + n}));
  assert.throws(() => parseDeck({...deck, personalities}), error);
  assert.throws(() => parseDeck({personalities, cards:[{id:'other'}], senseiDeck:[{id:banned.id}]}), error);
});

test('Bee retains PUR zero and its stage chart through a deck code and Arena import', async () => {
  const bee = release.find(card => card.number === '41');
  const deck = createDeck();
  addCard(deck, bee, 'cards');
  const decoded = await decodeDeck(await encodeDeck(deck), catalog);
  const arena = parseDeck({...decoded, personalities:[1,2,3].map(n => ({id:'example-' + n}))});
  assert.equal(arena.cards[0].pur, 0);
  assert.deepEqual(arena.cards[0].powerLevels, [0,1,2,3,4,5,6,7,8,9,10]);
});
