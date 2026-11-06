import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../public/cards/catalog.js';
import {isHiTech,isUltraRare,finishForImage,cardGeometry} from '../public/card-surface.js';
import {ultraRareMask} from '../public/ultra-rare-profiles.js';
import {existsSync, readFileSync} from 'node:fs';

test('all 17 current Hi-Tech cards are recognized from metadata or the legacy HT identifier', () => {
  const cards=catalog.filter(isHiTech);
  assert.equal(cards.filter(c=>c.set==='Saiyan Saga').length,7);
  assert.equal(cards.filter(c=>c.set==='Trunks Saga').length,10);
  for(const card of cards){
    assert.equal(finishForImage(card.image)?.id,card.id);
    assert.equal(finishForImage(card.image.split('?')[0]+ '?v=older')?.id,card.id);
    assert.equal(finishForImage(card.image.replace('.webp','.jpg'))?.id,card.id);
    assert.equal(finishForImage(card.downloadImage)?.id,card.id);
  }
});
test('standard art, private backs, and external custom art never acquire a rarity finish', () => {
  for(const c of catalog.filter(c=>!isHiTech(c)&&!isUltraRare(c)))assert.equal(finishForImage(c.image),null,c.id);
  for(const src of ['',null,'/assets/dragon-ball-online-card-back.webp?v=burnt-red-1','https://example.com/assets/cards/trunks-195-vegeta.webp','javascript:alert(1)','data:image/svg+xml,test'])assert.equal(finishForImage(src),null);
  assert.equal(finishForImage('https://dragonballocg.com/assets/cards/trunks-195-vegeta.webp')?.id,'trunks-195-vegeta');
});

test('all 17 Ultra Rares use their catalog identity, including four confirmed Saiyan cards', () => {
  const cards = catalog.filter(isUltraRare);
  assert.equal(cards.length, 17);
  assert.deepEqual(Object.fromEntries(['Saiyan Saga','Frieza Saga','Trunks Saga','Android Saga','Cell Saga'].map(set => [set,cards.filter(c=>c.set===set).length])),
    {'Saiyan Saga':4,'Frieza Saga':2,'Trunks Saga':5,'Android Saga':2,'Cell Saga':4});
  for (const card of cards) {
    for (const src of [card.image,card.downloadImage,card.image.split('?')[0]+'?v=old',card.image.replace('.webp','.jpg')]) {
      assert.equal(finishForImage(src)?.id,card.id);
    }
    const mask = new URL('../public'+ultraRareMask(card),import.meta.url);
    assert.ok(existsSync(mask), card.id);
    assert.match(readFileSync(mask,'utf8'), /fill="black"/, 'rules panel protected');
    assert.match(readFileSync(mask,'utf8'), /fill="#0d0d0d"/, 'character protection');
    assert.equal(finishForImage('https://example.com'+card.image),null);
    assert.match(ultraRareMask({...card,image:card.image+'new'}), /generic-v[23]\.svg$/, 'revised art never gets an old silhouette');
  }
  assert.equal(isUltraRare({name:'Ultra Rare Goku',rarity:'Rare'}),false);
});


test('physical card corners stay circular in both orientations and depth scales with short edge', () => {
  for (const [width,height,displayedWidth] of [[1060,1484,360],[1484,1060,504],[1060,1484,180]]) {
    const {radiusX,radiusY,depth} = cardGeometry(width,height,displayedWidth);
    const displayedHeight = displayedWidth * height / width;
    const short = Math.min(displayedWidth,displayedHeight);
    assert.ok(Math.abs(displayedWidth * radiusX / 100 - short * .05) < 1e-9);
    assert.ok(Math.abs(displayedHeight * radiusY / 100 - short * .05) < 1e-9);
    assert.ok(Math.abs(depth - short * .0125) < 1e-9);
    assert.ok(depth < short * .015, 'thinner than the approved initial preview');
  }
});
