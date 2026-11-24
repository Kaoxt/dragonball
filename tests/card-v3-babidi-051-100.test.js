import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {catalog} from '../public/cards/catalog.js';
import {cardPath, catalogRoute} from '../public/cards/card-links.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {createDeck, snapshot} from '../public/decks/store.js';
import {encodeDeck, decodeDeck} from '../public/decks/deck-code.js';
import {act, newGame, addPlayer} from '../public/game.js';
import {powerChart} from '../public/personality-power.js';
import {firstBabidiCatalog, firstBabidiIds} from './helpers/pre-babidi.js';
import release from '../tools/card-corrections/v3-babidi-051-100/release-manifest.json' with {type:'json'};
import checksums from '../tools/card-corrections/v3-babidi-051-100/checksums.json' with {type:'json'};

const added = catalog.slice(firstBabidiCatalog.length);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('the second Babidi release appends exactly the 49 ready cards and their permanent deck IDs', () => {
  const ids = release.map(card => card.id);
  assert.deepEqual(added.map(card => card.id), ids);
  assert.deepEqual(catalog.slice(0, firstBabidiCatalog.length), firstBabidiCatalog);
  assert.deepEqual(codeCardIds, [...firstBabidiIds, ...ids]);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.deepEqual(added.map(card => Number(card.number)), Array.from({length:50}, (_, i) => 51 + i).filter(n => n !== 89));
  assert.equal(catalog.filter(card => card.set === 'Babidi Saga').length, 98);
  for (const n of ['030','089']) assert.equal(catalogRoute('/cards/babidi-saga/' + n, catalog).kind, 'missing');
});

test('share links, rules, native masters, illustrations and both WebPs match the handoff', () => {
  for (const [i, card] of added.entries()) {
    const original = release[i];
    assert.equal(card.name, original.name);
    assert.equal(card.rules, original.modern_rules);
    assert.equal(card.rarity, original.rarity_stars === 3 ? 'Uncommon' : 'Rare');
    assert.equal(catalogRoute(cardPath(card), catalog).card, card);
    for (const [field, src] of [['image', original.display_image], ['downloadImage', original.download_image]]) {
      const [pathname, version] = card[field].split('?v=');
      assert.equal(version, checksums[src].slice(0, 12));
      assert.equal(sha256(readFileSync('public' + pathname)), checksums[src]);
    }
  }
  const native = 'tools/card-templates/v3/babidi-051-100/';
  for (const [path, digest] of Object.entries(checksums)) {
    if (path.startsWith('production/')) assert.equal(sha256(readFileSync(native + path.slice('production/'.length))), digest, path);
  }
});

test('all 14 Babidi personalities retain printed stages, level and PUR in deck codes and the Arena', async () => {
  const personalities = release.filter(row => row.stages);
  assert.equal(personalities.length, 14);
  for (const original of personalities) {
    const card = added.find(c => c.id === original.id);
    assert.equal(card.type, 'Main Personality');
    assert.equal(card.alignment.toUpperCase(), original.category);
    const deck = createDeck();
    deck.personalities[original.level - 1] = snapshot(card);
    const decoded = await decodeDeck(await encodeDeck(deck), catalog);
    const mp = decoded.personalities[original.level - 1];
    assert.deepEqual([mp.level, mp.pur], [original.level, original.pur]);
    assert.deepEqual(powerChart(mp), [...original.stages].reverse());
  }
});

test('both Yakon levels copy the opposing active printed PUR at power-up', () => {
  const byNumber = n => snapshot(added.find(c => Number(c.number) === n));
  const game = newGame();
  for (const seat of [0, 1]) {
    addPlayer(game, String(seat), 'Player ' + seat);
    const levels = seat === 0 ? [70, 71, 99] : [56, 57, 70];
    act(game, seat, {type:'load', deck:{personalities:levels.map(byNumber), cards:[byNumber(51)], tokui:seat === 0 ? 'Black' : ''}});
  }
  act(game, 0, {type:'start'});
  for (const seat of [0, 1]) act(game, seat, {type:'ready'});
  const yakon = game.players[0];
  for (const [level, otherLevel, gain] of [[1,1,2], [2,2,4], [1,3,1]]) {
    yakon.level = level;
    game.players[1].level = otherLevel;
    yakon.stages = 0;
    act(game, 0, {type:'powerUp'});
    assert.equal(yakon.stages, gain);
    assert.equal(yakon.personalities[level - 1].pur, 'X');
  }
  assert.match(game.log.at(-1).text, /Both MPs have printed PUR X/);
});
