import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackerSystem} from '../public/cards/gt-backers.js';
import {createDeck,snapshot,selectBacker,exportDeck,deckSize,addCard} from '../public/decks/store.js';
import {encodeDeck,decodeDeck} from '../public/decks/deck-code.js';
import {parseDeck,newGame,addPlayer,act,view,cardImage} from '../public/game.js';
import {powerChart} from '../public/personality-power.js';
import {gtCompositeRequest,renderGTComposite} from '../src/gt-composite.js';
import {gtFixture} from './support/gt-backer-fixture.js';
const fixture=()=>{const f=gtFixture();return {...f,system:createBackerSystem(f.catalog)};};

test('Backer fills explicit physical slots, preserving interleaved printed values and zero',()=>{
 const f=fixture(),before=structuredClone(f.high),r=f.system.resolve(f.high,f.backer,'Saiyan');
 assert.deepEqual(r.stages,[8400000,7500000,7600000,0,6800000,6400000,5000000,4000000,0]);
 assert.deepEqual(r.powerLevels,[...r.stages].reverse());assert.equal(r.pur,4);assert.equal(r.power.attack,'energy');assert.deepEqual(f.high,before);
 f.high.gtHiTech.inherit.pur=false;f.high.gtHiTech.inherit.power=false;
 const fixed=f.system.resolve(f.high,f.backer,'Saiyan');assert.equal(fixed.pur,0);assert.equal(fixed.power.rules,'Fixed power.');
});
test('Named and Styled restrictions are cumulative and every GT level must match',()=>{
 const f=fixture();assert.equal(f.system.choices(f.deck).length,1);
 assert.throws(()=>f.system.resolve(f.high,f.backer,'Red'));
 f.high.gtHiTech.character='vegeta';assert.equal(f.system.choices(f.deck).length,0);
 f.backer.gtBacker.characters=[];assert.equal(f.system.choices(f.deck).length,1);
 f.backer.gtBacker.style='';assert.equal(f.system.choices(f.deck).length,0);
 f.backer.gtBacker.characters=['vegeta'];assert.equal(f.system.choices({...f.deck,tokui:''}).length,1);
 f.regular.gtHiTech=structuredClone(f.high.gtHiTech);f.regular.gtHiTech.character='goku';
 assert.equal(f.system.choices(f.deck).length,0);
});
test('unverified, malformed, missing or mismatched native data cannot enable a combination',()=>{
 const mutations=[f=>f.high.banned=true,f=>f.backer.banned=true,f=>f.high.gtHiTech.verified=false,f=>f.backer.gtBacker.verified=false,f=>f.high.gtHiTech.stages[0]=1,f=>f.high.gtHiTech.stages[1]=null,f=>f.high.gtHiTech.inherit.stages.push(6),f=>f.high.gtHiTech.stages[8]=1,f=>f.backer.gtBacker.native.pur.text='5',f=>f.backer.gtBacker.native.stages[0].text='1',f=>f.backer.gtBacker.native.power.text='Wrong power',f=>f.high.image='https://example.com/card.webp'];
 for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>f.system.resolve(f.high,f.backer,'Saiyan'));assert.deepEqual(f.system.choices(f.deck),[]);}
});
test('one selected Backer persists as identity only, excludes deck size, and ordinary copies remain cards',async()=>{
 const f=fixture();selectBacker(f.deck,{id:f.backer.id,pur:99,image:'javascript:alert(1)'},f.system);
 assert.deepEqual(f.deck.backer,snapshot(f.backer));assert.equal(deckSize(f.deck),50);
 addCard(f.deck,f.backer,'cards');assert.equal(deckSize(f.deck),51);assert.equal(f.deck.cards.at(-1).id,f.backer.id);
 const json=exportDeck(f.deck);assert.equal(json.backer.id,f.backer.id);assert.equal(json.backer.gtBacker,undefined);
 const decoded=await decodeDeck(await encodeDeck(f.deck),f.catalog);assert.deepEqual(decoded.backer,snapshot(f.backer));assert.equal(decoded.visibility,'private');
 f.deck.backer=null;assert.equal(f.system.validateDeck(f.deck),null);assert.throws(()=>f.system.validateDeck(f.deck,{required:true}),/Select one Backer/);
 for(const backer of [[{id:f.backer.id}],{id:'unknown'}])assert.throws(()=>f.system.validateDeck({...f.deck,backer}));
 assert.throws(()=>f.system.validateDeck({...createDeck(),backer:{id:f.backer.id}}),/requires a GT/);
});
test('six-level GT image codes round trip and old five-slot codes remain supported',async()=>{
 const f=fixture();f.deck.personalities.push({...f.high,level:6});
 assert.equal((await decodeDeck(await encodeDeck(f.deck),f.catalog)).personalities.length,6);
 const blank=createDeck();assert.equal((await decodeDeck(await encodeDeck(blank),f.catalog)).personalities.length,5);
 blank.personalities.push(null);await assert.rejects(()=>encodeDeck(blank).then(code=>decodeDeck(code,f.catalog)));
});
test('Arena uses canonical Backer data, shares resolved card with both players, and locks it at setup',()=>{
 const f=fixture();f.deck.personalities=f.deck.personalities.filter(Boolean);f.deck.backer={id:f.backer.id,gtBacker:{pur:99}};f.deck.personalities[0]={id:f.high.id,pur:99,powerLevels:[0,1]};
 const parsed=parseDeck(f.deck,{backers:f.system}),mp=parsed.personalities[0];
 assert.equal(mp.pur,4);assert.equal(mp.maxStages,8);assert.equal(mp.gtPower.damage,3);assert.equal(mp.powerLevels.at(-1),8400000);
 assert.equal(cardImage(mp,f.system),f.system.imageURL(f.high,f.backer,'Saiyan'));
 assert.equal(powerChart({...mp,id:'saiyan-158-goku'})[1],4000000);
 const g=newGame();for(const [id,name] of [['a','A'],['b','B']])addPlayer(g,id,name);
 for(const p of g.players){Object.assign(p,structuredClone(parsed),{loaded:true});p.zones.deck=parsed.cards.map(c=>({...c}));}
 act(g,0,{type:'start'});const a=view(g,0),b=view(g,1);
 assert.deepEqual(a.players[0].personalities,b.players[0].personalities);assert.equal(b.players[0].backer.id,f.backer.id);
 assert.throws(()=>act(g,0,{type:'load',deck:{...f.deck,backer:null}}),/lock/);
 act(g,0,{type:'ready'});act(g,1,{type:'ready'});const before=g.players[0].stages;act(g,0,{type:'powerUp'});assert.equal(g.players[0].stages,Math.min(8,before+5));act(g,0,{type:'undo'});assert.equal(g.players[0].stages,before);
 assert.equal(view(g,1).players[0].backer.id,f.backer.id);
 assert.throws(()=>parseDeck({...f.deck,backer:null},{backers:f.system}),/Select one Backer/);
});
test('native renderer changes only inherited slots, escapes labels, and rejects executable vector input',()=>{
 const f=fixture(),r=f.system.resolve(f.high,f.backer,'Saiyan');r.card.name='<script>&';
 const svg=renderGTComposite(r,'data:image/webp;base64,AAAA');assert.match(svg,/&lt;script&gt;&amp;/);assert.equal((svg.match(/<path /g)||[]).length,6);assert.match(svg,/width="1060" height="1484"/);
 r.inherit.pur=false;r.inherit.power=false;assert.equal((renderGTComposite(r,'data:image/webp;base64,AAAA').match(/<path /g)||[]).length,4);
 r.native.stages[0].paths[0].d='M0 0<script>';assert.throws(()=>renderGTComposite(r,'data:image/webp;base64,AAAA'));
 r.native.stages[0].paths[0].d='M0 0H1V1Z';r.inherit.power=true;r.native.power.bounds[2]=1000;assert.throws(()=>renderGTComposite(r,'data:image/webp;base64,AAAA'),/does not fit/);
});
test('image endpoint trusts catalog assets, caches revisions, supports downloads, HEAD and ETags',async()=>{
 const f=fixture(),cacheData=new Map(),pending=[];let loads=0,lastSource='';
 const options={system:f.system,cache:{match:async k=>cacheData.get(k.url)?.clone(),put:async(k,v)=>cacheData.set(k.url,v)},context:{waitUntil:p=>pending.push(p)},loadAsset:async req=>{loads++;lastSource=req.url;return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/webp'}});}};
 const request=(params={},init={})=>new Request('https://dragonball.test/api/cards/gt-composite?'+new URLSearchParams({hiTech:f.high.id,backer:f.backer.id,tokui:'Saiyan',...params}),init);
 const first=await gtCompositeRequest(request(),options);assert.equal(first.status,200);const etag=first.headers.get('ETag');assert.match(await first.text(),/data:image\/webp;base64,AQID/);await Promise.all(pending);
 assert.equal((await gtCompositeRequest(request(),options)).status,200);assert.equal(loads,1);
 assert.equal((await gtCompositeRequest(request({}, {headers:{'If-None-Match':etag}}),options)).status,304);
 const head=await gtCompositeRequest(request({}, {method:'HEAD'}),options);assert.equal(await head.text(),'');assert.equal(loads,1);
 const download=await gtCompositeRequest(request({size:'download'}),options);assert.match(await download.text(),/width="2120" height="2968"/);assert.match(lastSource,/assets\/cards\/downloads\//);
 f.backer.gtBacker.revision='2';assert.notEqual((await gtCompositeRequest(request(),options)).headers.get('ETag'),etag);
 assert.equal((await gtCompositeRequest(request({hiTech:'https://evil.test/'}),options)).status,400);
 assert.equal((await gtCompositeRequest(request({}, {method:'POST'}),options)).status,405);
 assert.equal((await gtCompositeRequest(request(),{...options,cache:null,loadAsset:async()=>new Response('missing',{status:404})})).status,503);
});
