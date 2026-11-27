import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {catalog} from '../public/cards/catalog.js';
import {codeCardIds} from '../public/decks/code-card-ids.js';
import {cardPath, catalogRoute} from '../public/cards/card-links.js';
import {catalog as before, codeCardIds as beforeIds, beforeDendeSummoningFile} from './helpers/pre-dende-summoning.js';
import release from '../tools/card-corrections/v3-majin-buu-dende-summoning/release.json' with {type:'json'};
import checksums from '../tools/card-corrections/v3-majin-buu-dende-summoning/checksums.json' with {type:'json'};
import revisions from '../tools/card-corrections/v3-majin-buu-dende-summoning/integration-files.json' with {type:'json'};

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function losslessSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(offset + 4);
    if (bytes.toString('ascii', offset, offset + 4) === 'VP8L') {
      assert.equal(bytes[offset + 8], 0x2f);
      const bits = bytes.readUInt32LE(offset + 9);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset += 8 + length + (length & 1);
  }
  assert.fail('Expected lossless VP8L data');
}

test('only five existing Majin Buu image pairs change; gameplay and all permanent IDs stay intact', () => {
  assert.deepEqual(release.cards.map(row => row.number), ['1', '2', '38', '39', '40']);
  const changed = new Map(release.cards.map(row => [row.id, row]));
  assert.equal(catalog.length, before.length);
  assert.equal(catalog.length, release.catalog_count);
  assert.deepEqual(codeCardIds, beforeIds);
  assert.equal(hash(readFileSync('public/decks/code-card-ids.js')), release.code_card_ids_sha256);
  for (let i = 0; i < catalog.length; i++) {
    const row = changed.get(catalog[i].id);
    if (!row) { assert.deepEqual(catalog[i], before[i]); continue; }
    assert.deepEqual(before[i], row.before_card);
    assert.deepEqual(catalog[i], row.card);
    assert.deepEqual({...catalog[i], image:before[i].image, downloadImage:before[i].downloadImage}, before[i]);
    assert.notEqual(catalog[i].image, before[i].image);
    assert.notEqual(catalog[i].downloadImage, before[i].downloadImage);
    assert.equal(catalogRoute(cardPath(catalog[i]), catalog).card, catalog[i]);
  }
});

test('ten published files match approved lossless exports and portable native sources', () => {
  for (const [file, digest] of Object.entries(checksums)) assert.equal(hash(readFileSync(file)), digest, file);
  for (const [index, row] of release.cards.entries()) {
    const audit = JSON.parse(readFileSync(row.audit));
    assert.equal(audit.all_non_artwork_native_layers_identical, true);
    for (const [field, folder, size] of [['image','display',[1060,1484]],['downloadImage','downloads',[2120,2968]]]) {
      const [pathname, version] = row.card[field].split('?v=');
      const bytes = readFileSync('public' + pathname);
      const exportRow = audit.exports.find(e => e.path.startsWith(folder + '/'));
      const delivery = release.delivery_containers?.find(e => e.path === 'public' + pathname);
      const approved = delivery ? readFileSync(delivery.approved_source) : bytes;
      if (delivery) {
        assert.equal(hash(approved), delivery.approved_sha256);
        assert.equal(hash(bytes), delivery.published_sha256);
        assert.equal(bytes.length, approved.length + 8);
        assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
        assert.deepEqual(bytes.subarray(0, 4), approved.subarray(0, 4));
        assert.deepEqual(bytes.subarray(8, -8), approved.subarray(8));
        assert.deepEqual(bytes.subarray(-8), Buffer.from('4a554e4b00000000', 'hex'));
      }
      assert.equal(hash(approved), exportRow.sha256);
      assert.equal(version, hash(bytes).slice(0, 12));
      assert.deepEqual(losslessSize(bytes), size);
      assert.equal(exportRow.lossless_verified, true);
      assert.equal(exportRow.opaque_overlay_pixels_changed_above_two_levels, 0);
    }
    const svg = readFileSync(row.native_source, 'utf8');
    assert.equal(hash(Buffer.from(svg)), audit.source_svg_sha256);
    assert.doesNotMatch(svg, /<(?:\w+:)?text\b/);
    assert.match(svg, new RegExp('data-dragon-ball-number="' + (index + 1) + '"'));
    assert.match(svg, /Dende-Summoning-Background-Extension\.png/);
    for (const [, href] of svg.matchAll(/(?:\w+:)?href="([^"]+)"/g)) {
      if (!href.startsWith('#') && !href.startsWith('data:')) assert.ok(existsSync(path.resolve(path.dirname(row.native_source), href)), href);
    }
  }
});

test('earlier inputs are restored exactly instead of rewriting historical audit hashes', () => {
  for (const row of revisions) {
    assert.equal(hash(readFileSync(row.path)), row.after_sha256, row.path);
    assert.equal(hash(beforeDendeSummoningFile(row.path)), row.before_sha256, row.path);
  }
});
