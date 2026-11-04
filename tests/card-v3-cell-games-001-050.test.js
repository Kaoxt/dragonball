import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {catalog} from '../public/cards/catalog.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {createDeck} from '../public/decks/store.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='tools/card-corrections/v3-cell-games-001-050/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.021,`${a} differs from ${b}`);
const rows=json(base+'audit.json'),data=json(base+'cards.json');

test('Cell Games cards survive a deck-code export and import with their new catalog ids',async()=>{
 const deck=createDeck();deck.name='Cell Games first 50';deck.cards=catalog.filter(c=>c.set==='Cell Games Saga').map(c=>({...c,qty:1}));
 const imported=await decodeDeck(await encodeDeck(deck),catalog);
 assert.deepEqual(imported.cards.map(c=>c.id),deck.cards.map(c=>c.id));
 assert.ok(imported.cards.every(c=>c.qty===1));
});

test('Cell Games 001–050 exports retain every rule line, fixed V3 geometry and correct rarity',()=>{
 const checks=json(base+'render-verification.json');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:50},(_,i)=>i+1));assert.equal(checks.length,50);
 assert.equal(catalog.filter(c=>c.set==='Cell Games Saga'&&c.templateVersion===3&&Number(c.number)<=50).length,50);
 for(const r of rows){
  const c=catalog.find(c=>c.id===r.id),d=data.find(c=>c.id===r.id),check=checks.find(c=>c.number===r.number);
  assert.equal(c.rules,d.modern_rules);assert.equal(c.rules,r.rules.map(x=>x.text).join(' '));
  assert.equal(hash(r.native_source_path),r.native_source_sha256);assert.equal(check.native_source_sha256,r.native_source_sha256);
  const svg=read(r.native_source_path);assert.doesNotMatch(svg,/<(?:\w+:)?text[\s>]/);assert.match(svg,/data-set="Cell Games Saga"/);
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  assert.equal(check.title_pixels_outside_brush,0);assert.ok(check.minimum_brush_clearance>=1);
  assert.ok(check.visible_category_pixels>500);
  assert.ok(r.rules.length<=5);assert.equal(check.visible_rules.length,r.rules.length);
  for(const line of check.visible_rules)assert.ok(line.visible_dark_pixels>50);
  assert.equal(r.native_geometry.icons.length,r.power_icon?1:0);for(const icon of r.native_geometry.icons)near(icon.center_error,0);
  for(const a of r.assets)assert.equal(hash(a.path),a.sha256);
  assert.equal(r.artwork.additional_zoom,false);assert.equal(r.rarity_stars,r.number<=31?1:3);
  assert.match(svg,new RegExp('id="footer-rarity"[^>]*data-star-count="'+r.rarity_stars+'"'));
  const b=r.native_geometry.bounds;
  for(const [id,x,y]of[['card-title',529.5,79],['card-category',529.5,908.5],['footer-text-block',529.5,1409.5],['saga-emblem',211.75,1409.5]]){
   const [left,top,w,h]=b[id];near(left+w/2,x);near(top+h/2,y);
  }
  const ball=b['footer-rarity'],num=b['card-number'];near((Math.min(ball[0],num[0])+Math.max(ball[0]+ball[2],num[0]+num[2]))/2,847.25);near(num[0]-ball[0]-ball[2],12.2);
  for(const id of ['footer-rarity','card-number'])near(b[id][1]+b[id][3]/2,1409.5);
  assert.ok(r.current_preview_revision.footer_idempotent);
  for(const e of r.exports){
   assert.equal(hash(e.path),e.after_sha256);assert.equal(c[e.field],e.path.replace(/^public/,'')+'?v='+e.after_sha256.slice(0,12));
   assert.deepEqual(e.size,e.field==='image'?[1060,1484]:[2120,2968]);assert.ok(e.lossless_round_trip);
   const verified=check.exports.find(x=>x.path===e.path);assert.equal(verified.sha256,e.after_sha256);assert.ok(verified.decoded_pixels_match_render);
  }
 }
});

test('Cell Games sources, original effects and CRD corrections are retained',()=>{
 const reviews=json(base+'artwork-review.json'),crd=json(base+'crd-review.json'),sources=json(base+'source-provenance.json');
 assert.equal(reviews.length,50);assert.equal(crd.reviewed_cards,50);assert.equal(sources.length,50);
 assert.equal(hash(crd.crd_path),crd.crd_sha256);
 assert.ok(data.every(c=>c.category!=='SENSEI'));
 for(const c of data){
  const source=sources.find(r=>r.number===c.number),review=reviews.find(r=>r.number===c.number);
  assert.equal(hash(source.printed_reference),source.sha256);
  assert.equal(hash(review.artwork_path),review.artwork_sha256);
  assert.ok(review.source_reviewed&&review.display_reviewed&&review.download_reviewed);
  assert.ok(review.observations.length>30);assert.ok(review.unresolved);
  assert.equal(crd.cards.find(r=>r.number===c.number).modern_rules,c.modern_rules);
  const entry=catalog.find(r=>r.id===c.id);assert.equal(entry.rarity,c.number<=31?'Common':'Uncommon');
  if(c.endurance!==null)assert.ok(c.modern_rules.startsWith(`ENDURANCE ${c.endurance}.`));
  for(const e of review.exports)assert.equal(hash(e.path),e.sha256);
 }
 const rule=n=>data.find(c=>c.number===n).modern_rules;
 assert.match(rule(8),/neither player/);assert.match(rule(8),/stop all physical attacks, or stop all energy attacks/);
 assert.match(rule(16),/does not use your Attacker Attacks action/);
 assert.doesNotMatch(rule(38),/Banish|Remove from/);
 assert.match(data.find(c=>c.number===38).original_rules,/Remove from the game after use/);
 assert.match(rule(11),/Namekian Heritage only/);
 assert.match(rule(17),/all physical attacks/);assert.doesNotMatch(rule(17),/your physical attacks/);
 assert.match(rule(50),/Energy attacks deal at most 2 life cards and 0 stages/);
 for(const n of [32,39,45,48])assert.match(rule(n),/Defense Shield/);
 assert.equal(data.find(c=>c.number===27).power_icon,null);
 const expected={5:'Blue Thrusted Blast',13:'Namekian Foot Lunge',31:'Time to Party!',34:'Black Double Attack Drill',36:'Black Face Slap'};
 for(const [n,name]of Object.entries(expected))assert.equal(data.find(c=>c.number===Number(n)).name,name);
});
