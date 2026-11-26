import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {catalog} from '../public/cards/catalog.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {catalog as prior, codeCardIds as priorIds, beforeBabidi030File} from './helpers/pre-babidi-030.js';
import {beforeMovie7File} from './helpers/pre-movie7.js';
import {beforeMajinBuuFile} from './helpers/pre-majin-buu.js';
import {cardPath, catalogRoute} from '../public/cards/card-links.js';
import {createDeck, addCard} from '../public/decks/store.js';
import {encodeDeck, decodeDeck} from '../public/decks/deck-code.js';
import release from '../tools/card-corrections/v3-babidi-030/release.json' with {type:'json'};
import audit from '../tools/card-corrections/v3-babidi-030/audit/030.json' with {type:'json'};
import checksums from '../tools/card-corrections/v3-babidi-030/checksums.json' with {type:'json'};
import revisions from '../tools/card-corrections/v3-babidi-030/integration-files.json' with {type:'json'};
import movie7Revisions from '../tools/card-corrections/v3-movie7/integration-files.json' with {type:'json'};
import majinBuuRevisions from '../tools/card-corrections/v3-majin-buu-001-050/integration-files.json' with {type:'json'};

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const card = catalog.find(c => c.id === release.id);

function losslessWebpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    if (kind === 'VP8L') {
      assert.equal(bytes[offset + 8], 0x2f);
      const bits = bytes.readUInt32LE(offset + 9);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset += 8 + length + (length & 1);
  }
  assert.fail('The card export must contain lossless VP8L image data');
}

test('Saiyan Prepared Smash appends only #30 and preserves every earlier card and permanent ID', () => {
  assert.deepEqual(card, release.card);
  assert.deepEqual(catalog, [...prior, card]);
  assert.deepEqual(codeCardIds, [...priorIds, release.id]);
  assert.equal(prior.length, release.baseline.catalog_count);
  assert.equal(priorIds.length, release.baseline.code_card_ids_count);
  assert.equal(new Set(codeCardIds).size, codeCardIds.length);
  assert.equal(new Set(catalog.map(c => c.id)).size, catalog.length);
  assert.equal(catalogRoute('/cards/babidi-saga/030', prior).kind, 'missing');
  const babidi = catalog.filter(c => c.set === 'Babidi Saga');
  assert.equal(babidi.length, release.baseline.babidi_count + 1);
  assert.deepEqual(babidi.map(c => Number(c.number)).sort((a, b) => a - b), Array.from({length:100}, (_, i) => i + 1));
});

test('#30 retains its reviewed rules, rarity, card route and deck-code identity', async () => {
  assert.deepEqual([card.number, card.name, card.type, card.style, card.rarity], ['30', 'Saiyan Prepared Smash', 'Physical Combat', 'Saiyan', 'Common']);
  assert.equal(card.templateVersion, 3);
  assert.equal(card.rules, audit.rules.map(row => row.text).join(' '));
  assert.match(card.rules, /^Endurance X\. X = Dragon Balls you control\. Physical attack\. DAMAGE: AT \+4 stages\./);
  assert.match(card.rules, /When performing this attack, you may discard a card to double its base AT damage\./);
  assert.equal(cardPath(card), '/cards/babidi-saga/030');
  assert.equal(catalogRoute(cardPath(card), catalog).card, card);
  assert.equal(catalogRoute('/cards/babidi-saga/', catalog).set, card.set);
  const deck = createDeck();
  addCard(deck, card);
  addCard(deck, card);
  const decoded = await decodeDeck(await encodeDeck(deck), catalog);
  assert.deepEqual(decoded.cards, deck.cards);
});

test('both #30 lossless exports, native source and selected artwork match the reviewed production bytes', () => {
  for (const [file, digest] of Object.entries(checksums)) assert.equal(hash(readFileSync(file)), digest, file);
  for (const [field, size, prefix] of [['image', [1060,1484], 'display/'], ['downloadImage', [2120,2968], 'downloads/']]) {
    const [pathname, version] = card[field].split('?v=');
    const bytes = readFileSync('public' + pathname);
    const exported = audit.exports.find(row => row.path.startsWith(prefix));
    assert.equal(hash(bytes), exported.sha256);
    assert.equal(version, exported.sha256.slice(0, 12));
    assert.deepEqual(losslessWebpSize(bytes), size);
    assert.equal(exported.lossless_verified, true);
  }
  const svg = readFileSync(release.native_source, 'utf8');
  assert.equal(hash(Buffer.from(svg)), audit.source_svg_sha256);
  assert.doesNotMatch(svg, /<(?:\w+:)?text\b/);
  assert.match(svg, /data-template-version="3"/);
  assert.match(svg, /data-card-number="30"/);
  assert.equal((svg.match(/id="power-icon"/g) || []).length, 1);
  for (const [, href] of svg.matchAll(/(?:\w+:)?href="([^"]+)"/g)) {
    if (href.startsWith('#') || href.startsWith('data:')) continue;
    const referenced = path.resolve(path.dirname(release.native_source), href);
    assert.ok(existsSync(referenced), referenced);
  }
  const artwork = readFileSync(release.artwork_path);
  assert.equal(hash(artwork), audit.artwork_sha256);
  assert.deepEqual([artwork.readUInt32BE(16), artwork.readUInt32BE(20)], [2066,1412]);
  assert.deepEqual(audit.artwork_placement, {x:14, y:146, width:1033, height:706, preserveAspectRatio:'xMidYMid meet', aspect_ratio_preserved_during_assembly:true, additional_crop_pixels:0});
  assert.equal(audit.hand_correction.applied, false);
  assert.ok(audit.unchanged_frame_checks.every(check => check.changed_pixels_outside_artwork === 0));
});

test('the #30 revision restores exact historical inputs without changing prior release evidence', () => {
  for (const revision of revisions) {
    assert.equal(hash(readFileSync(revision.path)), revision.after_sha256, revision.path);
    assert.equal(hash(gunzipSync(readFileSync(revision.before_file))), revision.before_sha256, revision.before_file);
    assert.equal(hash(beforeBabidi030File(revision.path)), revision.before_sha256, revision.path);
  }
  for (const revision of majinBuuRevisions) {
    assert.equal(hash(beforeBabidi030File(revision.path)), revision.after_sha256, revision.path);
    assert.equal(hash(beforeMajinBuuFile(revision.path)), revision.before_sha256, revision.path);
  }
  for (const revision of movie7Revisions) {
    assert.equal(hash(beforeMajinBuuFile(revision.path)), revision.after_sha256, revision.path);
    assert.equal(hash(beforeMovie7File(revision.path)), revision.before_sha256, revision.path);
  }
});
