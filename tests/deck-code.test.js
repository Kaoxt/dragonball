import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog as liveCatalog} from '../public/cards/catalog.js';
const catalog=[...liveCatalog,...Array.from({length:5},(_,i)=>({id:'test-goku-'+i,name:'Goku',type:'Main Personality',level:i+1})),{id:'test-mastery',name:'Mastery',type:'Mastery'},{id:'test-sensei',name:'Sensei',type:'Sensei'}];
import {createDeck,snapshot,addCard} from '../public/decks/store.js';
import {isHiTechPersonality,assertNoHiTechAllies} from '../public/decks/eligibility.js';
import {parseDeck} from '../public/game.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import qrcode from '../public/decks/vendor/qrcode.js';
import jsQR from '../public/decks/vendor/jsQR.js';

function fixture(){const deck=createDeck();deck.name='悟空’s Dragon Ball deck';deck.visibility='public';deck.tokui='Saiyan';for(const c of catalog.filter(c=>c.type==='Main Personality'&&c.name==='Goku'))if(c.level>=1&&c.level<=5)deck.personalities[c.level-1]=snapshot(c);deck.mastery=snapshot(catalog.find(c=>c.type==='Mastery'));deck.sensei=snapshot(catalog.find(c=>c.type==='Sensei'));deck.cards=catalog.filter(c=>!['Main Personality','Mastery','Sensei'].includes(c.type)).slice(0,70).map(c=>({...snapshot(c),qty:1}));deck.senseiDeck=deck.cards.slice(0,10).map(c=>({...c,qty:2}));return deck;}
test('portable image code preserves all zones, Unicode and quantities as a new private deck',async()=>{const deck=fixture(),decoded=await decodeDeck(await encodeDeck(deck),catalog);assert.notEqual(decoded.id,deck.id);assert.equal(decoded.visibility,'private');for(const key of ['name','tokui','personalities','mastery','sensei','cards','senseiDeck'])assert.deepEqual(decoded[key],deck[key]);});
test('QR decoder reads a rendered exported code with quiet zone and surrounding dark theme',async()=>{const deck=fixture(),code=await encodeDeck(deck);const qr=qrcode(0,'M');qr.addData(code,'Byte');qr.make();const n=qr.getModuleCount(),scale=5,pad=50,width=(n+8)*scale+pad*2;const pixels=new Uint8ClampedArray(width*width*4);for(let y=0;y<width;y++)for(let x=0;x<width;x++){const row=Math.floor((y-pad)/scale)-4,col=Math.floor((x-pad)/scale)-4;const inside=x>=pad&&y>=pad&&x<width-pad&&y<width-pad;const dark=inside&&row>=0&&col>=0&&row<n&&col<n&&qr.isDark(row,col);const v=inside?(dark?17:255):25;const i=(y*width+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;}const scan=jsQR(pixels,width,width);assert.equal(scan?.data,code);assert.deepEqual((await decodeDeck(scan.data,catalog)).cards,deck.cards);});
test('unrecognized, corrupt and oversized codes are rejected',async()=>{for(const code of ['https://example.com','DBO2:abc','DBO1:!!!','DBO1:'+'A'.repeat(2200)])await assert.rejects(()=>decodeDeck(code,catalog));});
test('unknown card IDs and unsafe quantities fail without partial import',async()=>{const deck=fixture();deck.cards[0].id='missing-card';await assert.rejects(()=>decodeDeckCode(deck),/not in the current collection/);deck.cards[0]=snapshot(catalog[0]);deck.cards[0].qty=91;await assert.rejects(()=>decodeDeckCode(deck));});
test('duplicate rows are rejected and incomplete decks still round trip',async()=>{const deck=fixture();deck.cards.push(deck.cards[0]);await assert.rejects(()=>decodeDeckCode(deck));const blank=createDeck();assert.deepEqual((await decodeDeckCode(blank)).personalities,[null,null,null,null,null]);});
async function decodeDeckCode(deck){return decodeDeck(await encodeDeck(deck),catalog);}

test('every catalog Hi-Tech is blocked as an Ally but allowed in the starting stack',()=>{
 const hiTech=liveCatalog.filter(isHiTechPersonality);assert.ok(hiTech.length>=17);
 for(const card of hiTech){
  for(const destination of ['cards','senseiDeck']){
   for(const input of [card,snapshot(card),{id:card.id,name:card.name,type:'Setup'}]){
    const deck=createDeck(),before=structuredClone(deck);
    assert.throws(()=>addCard(deck,input,destination),/Hi-Tech.*cannot be used as Allies/,`${card.id}: ${destination}`);
    assert.deepEqual(deck,before);
   }
  }
  for(const destination of ['auto','personalities']){
   const deck=createDeck();addCard(deck,card,destination);
   assert.ok(deck.personalities.some(c=>c?.id===card.id));assertNoHiTechAllies(deck);
  }
 }
 const regular=liveCatalog.find(c=>c.type==='Main Personality'&&!isHiTechPersonality(c));
 const deck=createDeck();addCard(deck,regular,'cards');assert.equal(deck.cards[0].id,regular.id);
});

test('deck-image imports reject Hi-Tech Allies in either deck, including rarity-only Hi-Tech',async()=>{
 for(const card of [liveCatalog.find(c=>/-ht$/.test(c.id)),liveCatalog.find(c=>c.rarity==='Hi-Tech')]){
  for(const zone of ['cards','senseiDeck']){
   const deck=fixture();deck[zone]=[{...snapshot(card),qty:1}];
   await assert.rejects(()=>decodeDeckCode(deck),/Hi-Tech.*cannot be used as Allies/);
  }
 }
 const deck=fixture();deck.personalities[0]=snapshot(liveCatalog.find(c=>/-ht$/.test(c.id)));
 assert.equal((await decodeDeckCode(deck)).personalities[0].id,deck.personalities[0].id);
});

test('arena imports reject stripped Hi-Tech Ally snapshots and preserve regular Allies and Hi-Tech MPs',()=>{
 const input={personalities:[1,2,3].map(n=>({id:`test-mp-${n}`})),cards:[{id:liveCatalog[0].id}],sensei:{id:'test-sensei'}};
 const hiTech=liveCatalog.find(c=>c.rarity==='Hi-Tech');
 for(const zone of ['cards','senseiDeck'])assert.throws(()=>parseDeck({...input,[zone]:[{id:hiTech.id,type:'Setup'}]}),/Hi-Tech.*cannot be used as Allies/);
 const regular=liveCatalog.find(c=>c.type==='Main Personality'&&!isHiTechPersonality(c));
 const parsed=parseDeck({...input,personalities:[{id:hiTech.id},...input.personalities.slice(1)],cards:[{id:regular.id}]});
 assert.equal(parsed.personalities[0].id,hiTech.id);assert.equal(parsed.cards[0].id,regular.id);
});
