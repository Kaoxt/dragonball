import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {catalog} from '../public/cards/catalog.js';
import {browserSets, cardPath, catalogRoute} from '../public/cards/card-links.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {decodeDeck, encodeDeck} from '../public/decks/deck-code.js';
import {createDeck, snapshot} from '../public/decks/store.js';
import {powerChart} from '../public/personality-power.js';
import {parseDeck} from '../public/game.js';
import {catalog as previous, codeCardIds as previousIds} from './helpers/pre-majin-buu-051-100.js';
import release from '../tools/card-templates/v3/majin-buu-051-100/new-cards.json' with {type:'json'};
import manifest from '../tools/card-templates/v3/majin-buu-051-100/manifest-sha256.json' with {type:'json'};

test('Majin Buu cards 051–100 append permanent IDs and resolve through the existing set', () => {
  const added = catalog.slice(previous.length);
  assert.deepEqual(catalog.slice(0, previous.length), previous);
  assert.deepEqual(release.map(card => card.number), Array.from({length:50}, (_, i) => i + 51));
  assert.deepEqual(added.map(card => card.id), release.map(card => card.id));
  assert.deepEqual(codeCardIds, [...previousIds, ...added.map(card => card.id)]);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.equal(browserSets(catalog).find(set => set.slug === 'majin-buu-saga').count, 99);
  for (const [index, card] of added.entries()) {
    const source = release[index];
    assert.equal(card.number, String(source.number));
    assert.equal(card.set, source.set);
    assert.equal(card.rules, source.authoritative_effect);
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    const landscape = [69, 73].includes(source.number);
    assert.deepEqual([card.width, card.height], landscape ? [1484, 1060] : [1060, 1484]);
    for (const [field, file] of [['image', source.display_path], ['downloadImage', source.download_path]]) {
      const [path, version] = card[field].split('?v=');
      const hash = manifest[file].sha256;
      assert.equal(version, hash.slice(0, 12));
      assert.equal(createHash('sha256').update(readFileSync('public' + path)).digest('hex'), hash);
    }
  }
});

test('Krillin retains his level, PUR and printed power stages through deck sharing and Arena', async () => {
  const card = catalog.find(card => card.id === 'majin-buu-072-krillin-z-warrior');
  assert.deepEqual([card.type, card.alignment, card.level, card.pur], ['Main Personality', 'Hero', 2, 3]);
  const stages = [...release.find(card => card.number === 72).stages].reverse();
  const deck = createDeck();
  deck.personalities[1] = snapshot(card);
  const decoded = await decodeDeck(await encodeDeck(deck), catalog);
  assert.deepEqual(powerChart(decoded.personalities[1]), stages);
  const arena = parseDeck({personalities:[1, 2, 3].map(n => ({id:'test-' + n})), cards:[decoded.personalities[1]]});
  assert.deepEqual(arena.cards[0].powerLevels, stages);
});
