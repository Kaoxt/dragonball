import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../public/cards/catalog.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {createDeck} from '../public/decks/store.js';

const release=JSON.parse(fs.readFileSync('tools/card-corrections/v3-cell-games-final-five/release.json','utf8'));
const source=JSON.parse(fs.readFileSync('tools/card-corrections/v3-cell-games-051-100/cards.json','utf8'));
const expected=[
 [70,'c76a0bda02106c07579700d4c257f5a34eb4a810','bef777a759df27582dadbcd1b46d80b6bd98d1b5'],
 [72,'94499e432ca5db936dd66018607b78528bd585bb','013bd73a6eee6dfa31c55381ecf7b5c970de67f3'],
 [73,'83d263e5dbe31855d0e4211c9cb79eff32bb71c7','a9f30903356bf4cc630d22f7e3a97d5a3b9fec01'],
 [81,'23e3de44c5ce669034a5186083cdda86e8c72af7','c45f8d2dec53b395338227b36f8f9152c50ae759'],
 [83,'3ce1b7b0fea6505fe54a2bc171b031e59c471a9c','648b92685eeffebf2a654528c3629946b5cee065'],
];
const digest=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');

test('Cell Games 001–100 has no missing or duplicate card identities',()=>{
 const cards=catalog.filter(c=>c.set==='Cell Games Saga');
 assert.deepEqual(cards.map(c=>Number(c.number)),Array.from({length:100},(_,i)=>i+1));
 assert.equal(new Set(cards.map(c=>c.id)).size,100);
 assert.deepEqual(release.cards.map(c=>c.number),expected.map(c=>c[0]));
});

for(const [number,imageBlob,downloadBlob] of expected)test(`Cell Games ${number} publishes the exact approved lossless pair and reviewed card data`,()=>{
 const row=release.cards.find(c=>c.number===number),card=catalog.find(c=>c.id===row.id),original=source.find(c=>c.number===number);
 assert.equal(card.name,original.name);assert.equal(card.rules,original.modern_rules);
 assert.equal(card.type,original.category.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()));
 assert.equal(card.style,original.style);assert.equal(card.source,original.source);
 assert.equal(card.rarity,'Uncommon');assert.equal(card.templateVersion,3);assert.equal(card.status,'Ready');
 assert.deepEqual([card.width,card.height],[1060,1484]);
 assert.equal(row.exports.length,2);
 for(const [index,field] of ['image','downloadImage'].entries()){
  const e=row.exports.find(e=>e.field===field),bytes=fs.readFileSync(e.path);
  assert.equal(bytes.length,e.size_bytes);
  assert.equal(digest(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]),'sha1'),[imageBlob,downloadBlob][index]);
  assert.equal(digest(bytes),e.sha256);
  assert.equal(card[field],e.path.replace(/^public/,'')+'?v='+e.sha256.slice(0,12));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  let offset=12,dimensions;
  while(offset+8<=bytes.length){
   const tag=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
   if(tag==='VP8L'){
    assert.equal(bytes[offset+8],0x2f);const bits=bytes.readUInt32LE(offset+9);
    dimensions=[(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];break;
   }
   offset+=8+size+(size&1);
  }
  assert.deepEqual(dimensions,index?[2120,2968]:[1060,1484],'expected a full-size lossless WebP');
 }
});

test('all five recovered cards survive a deck-code round trip',async()=>{
 const deck=createDeck();deck.name='Cell Games final five';
 deck.cards=release.cards.map(r=>({...catalog.find(c=>c.id===r.id),qty:1}));
 const decoded=await decodeDeck(await encodeDeck(deck),catalog);
 assert.deepEqual(decoded.cards.map(c=>c.id),deck.cards.map(c=>c.id));
});
