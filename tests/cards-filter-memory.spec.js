import {test,expect} from '@playwright/test';
import {catalog} from '../public/cards/catalog.js';

const storageKey='dbocg:cards:filters:v1';

test('Cards opens 60 cards and pagination, filters and refresh keep the URL state',async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({set:'Saiyan Saga',query:'goku',sort:'name'})),storageKey);
 await page.goto('/cards/');
 await expect(page.locator('#card-browser')).toBeVisible();
 await expect(page.locator('.catalog-card')).toHaveCount(60);
 await expect(page.locator('#set')).toHaveValue('');
 expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBeNull();
 await page.locator('#pagination-top').getByRole('link',{name:'Page 2',exact:true}).click();
 await expect(page).toHaveURL(/\/cards\/\?page=2$/);
 const href=await page.locator('.catalog-card').first().getAttribute('href');
 await page.reload();
 await expect(page.locator('.catalog-card')).toHaveCount(60);
 await expect(page.locator('.catalog-card').first()).toHaveAttribute('href',href);
 await page.locator('.catalog-card').first().click();
 await page.locator('#close-detail').click();
 await expect(page).toHaveURL(/\/cards\/\?page=2$/);
 await page.locator('#set').selectOption('Frieza Saga');
 await expect(page).toHaveURL(/\/cards\/frieza-saga\/$/);
 await page.locator('#query').fill('suspension');
 await expect(page.locator('.catalog-card h2')).toHaveText(['Red Energy Suspension']);
 await page.reload();
 await expect(page.locator('#query')).toHaveValue('suspension');
 await expect(page.locator('.catalog-card h2')).toHaveText(['Red Energy Suspension']);
 await page.locator('#clear').click();
 await expect(page.locator('#set')).toHaveValue('Frieza Saga');
 await page.getByRole('link',{name:'All cards',exact:true}).click();
 await expect(page.locator('.catalog-card')).toHaveCount(60);
});

test('card links open directly, survive refresh and support Back, Forward and closing',async({page})=>{
 await page.goto('/cards/frieza-saga/');
 await page.locator('#query').fill('rapid deflection');
 const card=page.getByRole('link',{name:'View Saiyan Rapid Deflection, card 11',exact:true});
 await expect(card).toHaveAttribute('href','/cards/frieza-saga/011');
 await card.click();
 await expect(page).toHaveURL(/\/cards\/frieza-saga\/011$/);
 await expect(page.locator('#detail-name')).toHaveText('Saiyan Rapid Deflection');
 await expect(page.locator('#share-url')).toHaveValue(/\/cards\/frieza-saga\/011$/);
 await page.goBack();
 await expect(page.locator('#card-detail')).not.toBeVisible();
 await expect(page.locator('#query')).toHaveValue('rapid deflection');
 await page.goForward();
 await expect(page.locator('#card-detail')).toBeVisible();
 await page.reload();
 await expect(page.locator('#detail-name')).toHaveText('Saiyan Rapid Deflection');
 await page.goto('/cards/saiyan-saga/p1');
 await expect(page.locator('#card-detail')).toBeVisible();
 await page.locator('#close-detail').click();
 await expect(page).toHaveURL(/\/cards\/saiyan-saga\/$/);
 await expect(page.locator('.catalog-card')).toHaveCount(Math.min(60,catalog.filter(c=>c.set==='Saiyan Saga').length));
});

test('filters, Reset and sharing fallback work with restricted browser storage and clipboard',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Clipboard blocked');}}});
 });
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/cards/frieza-saga/');
 await page.locator('#query').fill('suspension');
 await expect(page.locator('.catalog-card h2')).toHaveText(['Red Energy Suspension']);
 await page.locator('.catalog-card').click();
 await page.locator('#copy-link').click();
 await expect(page.locator('#share-status')).toHaveText('Select and copy the link above.');
 await expect(page.locator('#share-url')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('#card-detail')).not.toBeVisible();
 await page.locator('#clear').click();
 await expect(page.locator('#set')).toHaveValue('Frieza Saga');
 await expect(page.locator('.catalog-card')).toHaveCount(Math.min(60,catalog.filter(c=>c.set==='Frieza Saga').length));
 expect(errors).toEqual([]);
});
