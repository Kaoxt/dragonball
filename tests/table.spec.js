import {test,expect} from '@playwright/test';
test('two browsers play Score, keep private cards hidden, and resume',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext(),c=await browser.newContext();const p=await a.newPage(),q=await b.newPage(),r=await c.newPage();
 await p.goto('/');await p.locator('#name').fill('Alice');await p.locator('#create').click();await expect(p.locator('#table')).toBeVisible();const url=p.url();
 await q.goto(url);await q.locator('#name').fill('Bob');await q.locator('#join-form button').click();await expect(q.locator('#table')).toBeVisible();
 for(const page of [p,q]){await page.locator('#open-deck').click();await page.locator('#demo-deck').click();await page.locator('#deck-form button[type=submit]').click();}
 await p.getByRole('button',{name:'Shuffle & start setup'}).click();await expect(p.locator('#hand .card')).toHaveCount(0);await p.locator('#first-player').selectOption('1');await expect(q.locator('#setup-bar')).toContainText('Bob goes first');
 await p.getByRole('button',{name:'Finish setup',exact:true}).click();await q.getByRole('button',{name:'Finish setup',exact:true}).click();
 await q.getByRole('button',{name:'Draw 3',exact:true}).click();await expect(q.locator('#hand .card')).toHaveCount(3);await expect(p.locator('.opponent [data-zone=hand] .pile')).toContainText('3');
 await q.locator('#hand .card').first().click();await q.locator('#destination').selectOption('combat');await q.locator('#move-selected').click();await expect(p.locator('.opponent [data-zone=combat] .card')).toHaveCount(1);
 await q.locator('.player-field:not(.opponent) [data-zone=combat] .card').click();await q.getByRole('button',{name:'Flip',exact:true}).click();await expect(p.locator('.opponent [data-zone=combat] .card')).toHaveAttribute('aria-label','Face-down card');
 await q.getByRole('button',{name:'Search Life Deck',exact:true}).click();await expect(q.locator('#search-panel')).toBeVisible();await expect(p.locator('#search-panel')).toBeHidden();await q.getByRole('button',{name:'Finish search & shuffle'}).click();
 await q.getByRole('button',{name:'Increase Anger',exact:true}).click();await expect(p.locator('.opponent .counter').nth(1)).toContainText('1');
 await p.locator('#chat').fill('<img src=x onerror=alert(1)>');await p.locator('#chat-form button').click();await expect(q.locator('#log')).toContainText('<img src=x onerror=alert(1)>');await expect(q.locator('#log img')).toHaveCount(0);
 await r.goto(url);await r.locator('#join-form button').click();await expect(r.locator('#toast')).toContainText('full');await q.reload();await q.locator('#join-form button').click();await expect(q.locator('#hand .card')).toHaveCount(2);
 await q.screenshot({path:'test-results/score-desktop.png',fullPage:true});await a.close();await b.close();await c.close();
});
test('mobile Score practice supports personality counters and moving cards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#lobby h1')).toContainText('Score DBZ CCG');await page.locator('#practice').click();await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.locator('#switch-seat').click();await page.getByRole('button',{name:'Finish setup',exact:true}).click();
 await page.getByRole('button',{name:'Draw 3',exact:true}).click();await page.locator('#hand .card').first().click();await page.locator('#destination').selectOption('allies');await page.locator('#move-selected').click();await expect(page.locator('.player-field:not(.opponent) [data-zone=allies] .card')).toHaveCount(1);
 await page.getByRole('button',{name:'Increase MP level',exact:true}).click();await expect(page.locator('.player-field:not(.opponent) .counter').first()).toContainText('2');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'test-results/score-mobile.png',fullPage:true});
});
