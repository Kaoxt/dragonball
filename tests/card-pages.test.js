import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {catalog} from '../public/cards/catalog.js';
import {cardPath, cardFromPath, catalogSets, catalogRoute} from '../public/cards/card-links.js';
import {cardPage} from '../src/card-pages.js';

const html = readFileSync(new URL('../public/cards/index.html', import.meta.url), 'utf8');
const assets = {fetch: async request => {
  assert.equal(new URL(request.url).pathname, '/cards/');
  return new Response(html, {headers:{'Content-Type':'text/html', 'X-Content-Type-Options':'nosniff', etag:'old-index'}});
}};

test('every catalog card has a unique share link that resolves across sets and promo numbers', () => {
  assert.equal(new Set(catalog.map(cardPath)).size, catalog.length);
  for (const card of catalog) assert.equal(cardFromPath(cardPath(card), catalog), card);
  assert.equal(cardFromPath('/cards/frieza-saga/011', catalog).name, 'Saiyan Rapid Deflection');
  assert.notEqual(cardFromPath('/cards/saiyan-saga/011', catalog).id, cardFromPath('/cards/frieza-saga/011', catalog).id);
  assert.equal(cardFromPath('/cards/saiyan-saga/P1', catalog).number, 'P1');
  assert.equal(cardFromPath('/cards/frieza-saga/%zz', catalog), null);
});

test('fresh card URLs serve the database with card-specific sharing metadata', async () => {
  for (const path of ['/cards/frieza-saga/011', '/cards/saiyan-saga/p1']) {
    const response = await cardPage(new Request('https://dragonballocg.com'+path), assets);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.ok(body.includes('id="card-grid"'));
    assert.ok(body.includes('rel="canonical" href="https://dragonballocg.com'+path+'"'));
    assert.ok(body.includes('property="og:image"'));
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('etag'), null);
  }
  const apostrophe = catalog.find(c => c.name.includes("'"));
  const body = await (await cardPage(new Request('https://dragonballocg.com'+cardPath(apostrophe)), assets)).text();
  assert.ok(body.includes('&#39;'));
});

test('card aliases redirect; missing cards return a useful 404; assets remain untouched', async () => {
  const redirect = await cardPage(new Request('https://dragonballocg.com/cards/Frieza-Saga/11/'), assets);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://dragonballocg.com/cards/frieza-saga/011');
  const missing = await cardPage(new Request('https://dragonballocg.com/cards/frieza-saga/999'), assets);
  assert.equal(missing.status, 404);
  assert.ok((await missing.text()).includes('id="card-link-error" role="status"'));
  assert.equal(await cardPage(new Request('https://dragonballocg.com/cards/cards.js'), assets), null);
  assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/'), assets)).status, 200);
  const head = await cardPage(new Request('https://dragonballocg.com/cards/frieza-saga/011',{method:'HEAD'}), assets);
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/frieza-saga/011',{method:'POST'}), assets)).status,405);
});

test('set directory lists every published set with its logo, count and permanent URL', async () => {
  const response = await cardPage(new Request('https://dragonballocg.com/cards/'), assets);
  const body = await response.text();
  assert.equal(response.status,200);
  assert.ok(body.includes('id="card-browser" hidden'));
  assert.ok(!body.includes('id="set-directory" hidden'));
  for(const set of catalogSets(catalog)) {
    assert.ok(body.includes(`class="set-entry" href="${set.path}"`));
    assert.ok(body.includes(`${set.count} cards in ${set.name}`));
    assert.ok(body.includes(set.image));
    assert.equal(catalogRoute(set.path,catalog).set,set.name);
  }
});

test('fresh requests and refreshes retain the URL-selected set and show set breadcrumbs', async () => {
  for(const path of ['/cards/frieza-saga/', '/cards/saiyan-saga/']) {
    const name=catalogRoute(path,catalog).set;
    for(let visit=0;visit<2;visit++) {
      const response=await cardPage(new Request('https://dragonballocg.com'+path),assets);
      const body=await response.text();
      assert.equal(response.status,200);
      assert.ok(body.includes(`<option value="${name}" selected>`));
      assert.ok(body.includes(`id="breadcrumb-current" aria-current="page">${name}`));
      assert.ok(body.includes('id="set-directory" hidden'));
      assert.ok(!body.includes('id="card-browser" hidden'));
      assert.ok(body.includes(`rel="canonical" href="https://dragonballocg.com${path}"`));
    }
  }
  const alias=await cardPage(new Request('https://dragonballocg.com/cards/Frieza-Saga'),assets);
  assert.equal(alias.status,308);
  assert.equal(alias.headers.get('location'),'https://dragonballocg.com/cards/frieza-saga/');
  assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/missing-set/'),assets)).status,404);
  assert.equal((await cardPage(new Request('https://dragonballocg.com/cards/all/'),assets)).status,200);
});

test('actual Worker dispatch routes card links and still delegates database assets', async () => {
  const source = readFileSync(new URL('../src/worker.js', import.meta.url),'utf8')
    .replace(/^export \{ Community \}[^\n]*\n/m,'').replace(/^import [^\n]*\n/gm,'')
    .replace('export default {','const worker = {').replace('export class GameRoom','class GameRoom');
  const context = vm.createContext({URL,Request,Response,cardPage,DurableObject:class{}});
  vm.runInContext(source+'\nglobalThis.worker = worker;',context);
  const result = await context.worker.fetch(new Request('https://dragonballocg.com/cards/frieza-saga/011'),{ASSETS:assets});
  assert.equal(result.status,200);
  const plain = await context.worker.fetch(new Request('https://dragonballocg.com/cards/cards.js'),{ASSETS:{fetch:async()=>new Response('module')}});
  assert.equal(await plain.text(),'module');
});
