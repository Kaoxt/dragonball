import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../public/cards/catalog.js';
import {isHiTech,finishForImage} from '../public/card-surface.js';

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
test('standard art, private backs, and external custom art never acquire a Hi-Tech finish', () => {
  for(const c of catalog.filter(c=>!isHiTech(c)))assert.equal(finishForImage(c.image),null,c.id);
  for(const src of ['',null,'/assets/dragon-ball-online-card-back.webp?v=burnt-red-1','https://example.com/assets/cards/trunks-195-vegeta.webp','javascript:alert(1)','data:image/svg+xml,test'])assert.equal(finishForImage(src),null);
  assert.equal(finishForImage('https://dragonballocg.com/assets/cards/trunks-195-vegeta.webp')?.id,'trunks-195-vegeta');
});
