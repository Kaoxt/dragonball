import {test,expect} from '@playwright/test';

const storageKey='dbocg:cards:filters:v1';

test('card filters, search and sort survive reload; Reset clears saved choices',async({page})=>{
 await page.goto('/cards/');
 await page.locator('#set').selectOption('Frieza Saga');
 await page.locator('#type').selectOption('Energy Combat');
 await page.locator('#style').selectOption('Red');
 await page.locator('#query').fill('suspension');
 await page.locator('#sort').selectOption('number');
 await expect(page.locator('.catalog-card h2')).toHaveText(['Red Energy Suspension']);
 await page.reload();
 for(const [key,value] of Object.entries({set:'Frieza Saga',type:'Energy Combat',style:'Red',query:'suspension',sort:'number'})){
  await expect(page.locator('#'+key)).toHaveValue(value);
 }
 await expect(page.locator('.catalog-card h2')).toHaveText(['Red Energy Suspension']);
 await expect(page.locator('#collection-logo-frieza')).toBeVisible();
 await expect(page.locator('#collection-logo')).toBeHidden();
 await page.locator('#clear').click();
 await expect(page.locator('#query')).toBeFocused();
 await page.reload();
 for(const key of ['query','set','type','style'])await expect(page.locator('#'+key)).toHaveValue('');
 await expect(page.locator('#sort')).toHaveValue('name');
 await expect(page.locator('#collection-logo-frieza')).toBeHidden();
 expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBeNull();
});

test('invalid saved filters do not prevent browsing',async({page})=>{
 await page.goto('/cards/');
 for(const stored of ['broken JSON',JSON.stringify({set:'Missing Saga',type:'Missing Type',style:42,sort:'Missing Sort',query:[]})]){
  await page.evaluate(([key,value])=>localStorage.setItem(key,value),[storageKey,stored]);
  await page.reload();
  await expect(page.locator('#set')).toHaveValue('');
  await expect(page.locator('#type')).toHaveValue('');
  await expect(page.locator('#style')).toHaveValue('');
  await expect(page.locator('#sort')).toHaveValue('name');
  await expect(page.locator('#query')).toHaveValue('');
  await expect(page.locator('.catalog-card').first()).toBeVisible();
 }
});

test('filters and Reset still work when browser storage is blocked',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}});
 });
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/cards/');
 await page.locator('#set').selectOption('Frieza Saga');
 await page.locator('#query').fill('suspension');
 await expect(page.locator('.catalog-card h2')).toHaveText(['Red Energy Suspension']);
 await page.locator('#clear').click();
 await expect(page.locator('#set')).toHaveValue('');
 await expect(page.locator('#query')).toHaveValue('');
 expect(errors).toEqual([]);
});
