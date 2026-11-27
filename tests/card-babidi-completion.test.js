import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {browserSets, cardPath, catalogRoute, promoCategory} from '../public/cards/card-links.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {createDeck, snapshot} from '../public/decks/store.js';
import {encodeDeck, decodeDeck} from '../public/decks/deck-code.js';
import {powerChart} from '../public/personality-power.js';
import {parseDeck} from '../public/game.js';
import {catalog as previous, codeCardIds as previousIds} from './helpers/pre-babidi-completion.js';
import release from '../tools/card-templates/v3/babidi-101-123-promos-previews/publication-manifest.json' with {type:'json'};

const added = catalog.slice(previous.length);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('Babidi completes 123 numbered cards, ten promos and eight previews with append-only deck IDs', () => {
  const numbers = Array.from({length:123}, (_, i) => String(i+1));
  const promos = Array.from({length:10}, (_, i) => 'P'+(i+1));
  const previews = Array.from({length:8}, (_, i) => 'Pre'+(i+1));
  const set = catalog.filter(c => c.set === 'Babidi Saga');
  assert.equal(set.length, 141);
  assert.deepEqual(new Set(set.map(c => c.number)), new Set([...numbers, ...promos, ...previews]));
  assert.deepEqual(catalog.slice(0,previous.length), previous);
  assert.deepEqual(added.map(c => c.id), release.map(c => c.id));
  assert.deepEqual(codeCardIds, [...previousIds, ...added.map(c => c.id)]);
  for (const card of added.filter(c => promos.includes(c.number))) assert.equal(promoCategory(card), 'Babidi Saga Promos');
  for (const card of added.filter(c => previews.includes(c.number))) assert.equal(promoCategory(card), 'Majin Buu Saga Previews');
  const brand = browserSets(catalog).find(s => s.name === 'Babidi Saga');
  assert.equal(brand.count,141);
  assert.match(brand.image,/babidi-saga-logo/);
});

test('all 41 cards preserve their published artwork revisions, dimensions, and reviewed rules', () => {
  for (const [i, card] of added.entries()) {
    const r = release[i];
    assert.equal(card.number, String(r.number));
    assert.deepEqual(catalogRoute(cardPath(card),catalog).card,card);
    assert.deepEqual([card.name,card.style,card.rules,card.crd],[r.name,r.style,r.modern_rules,r.crd]);
    assert.deepEqual([card.width,card.height],r.display_size);
    for (const [field,prefix] of [['image','display'],['downloadImage','download']]) {
      const [file,version]=card[field].split('?v=');
      const bytes=readFileSync('public'+file);
      assert.equal(hash(bytes),r[prefix+'_sha256']);
      assert.equal(version,r[prefix+'_sha256'].slice(0,12));
      assert.equal(bytes.toString('ascii',0,4),'RIFF');
      assert.equal(bytes.toString('ascii',8,12),'WEBP');
    }
  }
});

test('all ten personality charts survive deck codes and Arena, including variable PUR and printed Z stages', async () => {
  const personalities=added.filter(c => c.type==='Main Personality');
  assert.equal(personalities.length,10);
  for (const card of personalities) {
    const r=release.find(r => r.id===card.id);
    const deck=createDeck();
    deck.personalities[r.level-1]=snapshot(card);
    const decoded=await decodeDeck(await encodeDeck(deck),catalog);
    const saved=decoded.personalities[r.level-1];
    assert.deepEqual([saved.level,saved.pur],[r.level,r.pur]);
    const expected=[...r.stages].reverse();
    assert.deepEqual(powerChart(saved),expected);
    const arena=parseDeck({personalities:[1,2,3].map(n=>({id:'test-'+n})), cards:[saved]});
    assert.deepEqual(arena.cards[0].powerLevels,expected);
    assert.equal(arena.cards[0].maxStages,expected.length-1);
  }
});
