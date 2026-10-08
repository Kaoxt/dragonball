import {test,expect} from '@playwright/test';
for(const width of [320,390,1280]) test(`database browsing at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/cards/');
 await expect(page.locator('.catalog-card')).toHaveCount(16);
 for(const img of await page.locator('.catalog-card img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);}
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`/tmp/arena-database-${width}.png`,fullPage:true});
 await page.locator('#set').selectOption('Saiyan Saga');
 await expect(page.locator('.catalog-card')).toHaveCount(1);
 await page.locator('.catalog-card').click();
 await expect(page.locator('#card-detail')).toBeVisible();
 await expect(page.locator('#detail-name')).toHaveText('Orange Standing Fist Punch');
 await expect(page.locator('#detail-image')).toHaveJSProperty('complete',true);
 expect(await page.locator('#detail-image').evaluate(i=>i.naturalWidth)).toBeGreaterThan(1000);
 await expect(page.locator('#download')).toHaveAttribute('href',/saiyan-001.*webp/);
 await page.keyboard.press('Escape');
 await page.locator('#clear').click();
 await page.locator('#query').fill('no-such-card');
 await expect(page.locator('#no-results')).toBeVisible();
 await page.locator('#clear').click();
 await page.locator('#type').selectOption('Non-Combat Drill');
 await expect(page.locator('.catalog-card')).toHaveCount(3);
 await page.locator('.catalog-card').first().click();
 await expect(page.locator('#source')).toBeHidden();
 await page.locator('#close-detail').click();
 for(const path of ['/cards/','/','/rulebook/']){
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
});
